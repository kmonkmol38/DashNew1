import React, { useState, useMemo, useEffect } from 'react';
import type { InternalFleetData, ExternalFleetData, JobCardData } from '../types';
import { SheetNames } from '../types';
import DataTable from './DataTable';
import type { SharedFilterState } from '../App';
import VehicleCard from './VehicleCard';
import SearchableDropdown from './SearchableDropdown';

declare const XLSX: any;

const exportToExcel = (data: any[], fileName: string) => {
    if (typeof XLSX === 'undefined') {
        console.error("XLSX library is not loaded.");
        alert("Excel export functionality is currently unavailable.");
        return;
    }
    try {
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Data");
        XLSX.writeFile(wb, `${fileName}.xlsx`);
    } catch (error) {
        console.error("Error exporting to Excel:", error);
        alert("An error occurred while exporting the data.");
    }
};

const MONTH_NAMES = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
const YEARS = ["2024", "2025", "2026"];

interface InternalFleetsViewProps {
  data: InternalFleetData[];
  externalData: ExternalFleetData[];
  jobCardData: JobCardData[];
  sharedFilters: SharedFilterState;
  setActiveView: (view: SheetNames) => void;
}

const InternalFleetsView: React.FC<InternalFleetsViewProps> = ({ data, externalData, jobCardData, sharedFilters, setActiveView }) => {
  const [filters, setFilters] = useState({
    Month: sharedFilters.month,
    Year: sharedFilters.year,
    'Business Units': sharedFilters.businessUnit,
    'Fleet_Category': 'All',
  });
  const [searchFilter, setSearchFilter] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState<InternalFleetData | null>(null);

  useEffect(() => {
    setFilters(prev => ({
      ...prev,
      Month: sharedFilters.month,
      Year: sharedFilters.year,
      'Business Units': sharedFilters.businessUnit
    }));
  }, [sharedFilters]);

  const handleMonthFilterClick = (month: string) => {
    const newMonth = filters.Month === month ? 'All' : month;
    setFilters(prev => ({ ...prev, Month: newMonth }));
  };

  const handleYearFilterClick = (year: string) => {
    const newYear = filters.Year === year ? 'All' : year;
    setFilters(prev => ({ ...prev, Year: newYear }));
  };

  const dynamicOptions = useMemo(() => {
    if (!data) return { businessUnits: ['All'], fleetCategories: ['All'] };
    const lowercasedSearchFilter = searchFilter.toLowerCase().trim();

    // Base filtering for date and search, which applies to both dynamic dropdowns
    const baseFilteredData = data.filter(item => {
        const itemMonthName = String((item as any)['MONTH'] || '').toUpperCase().substring(0, 3);
        const itemYear = String((item as any)['YEAR'] || '');

        const monthMatch = filters.Month === 'All' || itemMonthName === filters.Month;
        const yearMatch = filters.Year === 'All' || itemYear === filters.Year;
        const searchMatch = !lowercasedSearchFilter || String(item['Reg No:']).toLowerCase().includes(lowercasedSearchFilter);
        return monthMatch && yearMatch && searchMatch;
    });

    // For Business Unit options, further filter by the selected Fleet Category
    const buData = baseFilteredData.filter(item => 
        filters['Fleet_Category'] === 'All' || String(item.Fleet_Category) === filters['Fleet_Category']
    );
    const businessUnits = new Set<string>();
    buData.forEach(item => {
      if (item['Business Units']) businessUnits.add(String(item['Business Units']));
    });

    // For Fleet Category options, further filter by the selected Business Unit
    const fcData = baseFilteredData.filter(item => 
        filters['Business Units'] === 'All' || String(item['Business Units']) === filters['Business Units']
    );
    const fleetCategories = new Set<string>();
    fcData.forEach(item => {
      if (item.Fleet_Category) fleetCategories.add(String(item.Fleet_Category));
    });

    return {
        businessUnits: ['All', ...Array.from(businessUnits).sort()],
        fleetCategories: ['All', ...Array.from(fleetCategories).sort()],
    };
  }, [data, filters.Month, filters.Year, filters['Business Units'], filters['Fleet_Category'], searchFilter]);

  // This effect will run whenever the available options for Business Units change.
  // If the currently selected Business Unit is no longer a valid option, it resets the filter to 'All'.
  useEffect(() => {
    if (filters['Business Units'] !== 'All' && !dynamicOptions.businessUnits.includes(filters['Business Units'])) {
      setFilters(prev => ({ ...prev, 'Business Units': 'All' }));
    }
  }, [filters['Business Units'], dynamicOptions.businessUnits]);

  // This does the same for Fleet Category.
  useEffect(() => {
    if (filters['Fleet_Category'] !== 'All' && !dynamicOptions.fleetCategories.includes(filters['Fleet_Category'])) {
      setFilters(prev => ({ ...prev, 'Fleet_Category': 'All' }));
    }
  }, [filters['Fleet_Category'], dynamicOptions.fleetCategories]);

  const filteredData = useMemo(() => {
    if (!data) return [];
    const lowercasedSearchFilter = searchFilter.toLowerCase().trim();

    return data.filter(item => {
      // Direct string comparison for dedicated Month and Year columns.
      // Assumes item['MONTH'] is a string like "JAN" and item['YEAR'] is a number/string like 2024.
      const itemMonthName = String((item as any)['MONTH'] || '').toUpperCase().substring(0, 3);
      const itemYear = String((item as any)['YEAR'] || '');

      const monthMatch = filters.Month === 'All' || itemMonthName === filters.Month;
      const yearMatch = filters.Year === 'All' || itemYear === filters.Year;
      const businessUnitMatch = filters['Business Units'] === 'All' || String(item['Business Units']) === filters['Business Units'];
      const fleetCategoryMatch = filters['Fleet_Category'] === 'All' || String(item.Fleet_Category) === filters['Fleet_Category'];
      
      const searchKey = item['Reg No:'];
      const searchMatch = !lowercasedSearchFilter || String(searchKey).toLowerCase().includes(lowercasedSearchFilter);

      // New filter logic for internal type based on shared filter from Dashboard
      const internalTypeMatch = (() => {
        switch (sharedFilters.internalType) {
          case 'Rental':
            return (item['R-Revenue'] ?? 0) > 0;
          case 'Fuel':
            return (item['F-Revenue'] ?? 0) > 0;
          case 'All':
          default:
            return true;
        }
      })();

      return monthMatch && yearMatch && businessUnitMatch && searchMatch && fleetCategoryMatch && internalTypeMatch;
    });
  }, [data, filters, searchFilter, sharedFilters.internalType]);

  const summaryData = useMemo(() => {
    const totalAmount = filteredData.reduce((acc, item) => acc + (item['F-Revenue'] || 0) + (item['R-Revenue'] || 0), 0);
    const rentalBackCharge = filteredData.reduce((acc, item) => acc + (item['Tot Rent'] || 0), 0);
    const fuelBackCharge = filteredData.reduce((acc, item) => acc + (item['F-Revenue'] || 0), 0);
    const totalBackCharge = rentalBackCharge + fuelBackCharge;
    const recordCount = filteredData.length;
    const averageAmount = recordCount > 0 ? totalAmount / recordCount : 0;
    
    return { totalAmount, rentalBackCharge, fuelBackCharge, totalBackCharge, recordCount, averageAmount };
  }, [filteredData]);

  const tableHeaders = [
    "Reg No:",
    "Fleet No:",
    "Vehicle Description",
    "YOM",
    "Supplier Name",
    "Business Units",
    "Fleet_Category",
    "W Days",
    "Month",
    "Year",
    "Rental/Prc",
    "Back Charge",
    "F-Revenue",
    "Act Fuel (F-Cost)",
    "Fuel WPrC (F-Profit)",
    "R-Revenue",
    "Vehicle Cost",
    "M-Cost",
    "R-Total Cost",
    "R-Profit"
  ];

  const tableData = useMemo(() => {
    return filteredData.map(item => {
      const anyItem = item as any;
      return {
        'Reg No:': item['Reg No:'],
        'Fleet No:': item['Fleet No:'],
        'Vehicle Description': item['Vehicle Description'],
        'YOM': item.YOM,
        'Supplier Name': item['Supplier Name'],
        'Business Units': item['Business Units'],
        'Fleet_Category': item.Fleet_Category,
        'W Days': item['W Days'],
        'Month': anyItem['MONTH'],
        'Year': anyItem['YEAR'],
        'Rental/Prc': anyItem['Rent Or %'],
        'Back Charge': item['Tot Rent'],
        'F-Revenue': item['F-Revenue'],
        'Act Fuel (F-Cost)': item['Act Fuel (F-Cost)'],
        'Fuel WPrC (F-Profit)': anyItem['Fuel W% F-Profit'],
        'R-Revenue': item['R-Revenue'],
        'Vehicle Cost': item['Vehicle Cost'],
        'M-Cost': item['M-Cost'],
        'R-Total Cost': item['R-Total Cost'],
        'R-Profit': item['R-Profit'],
      }
    });
  }, [filteredData]);

  const handleExport = () => {
    exportToExcel(tableData, 'Internal_Fleets_Export');
  };
  
  const handleRowDoubleClick = (rowData: any) => {
    const originalVehicleData = data.find(vehicle => 
      vehicle['Reg No:'] === rowData['Reg No:'] &&
      String((vehicle as any)['YEAR'] || '') === String(rowData['Year'] ?? '') &&
      // Match month by abbreviation to be safe
      String((vehicle as any)['MONTH'] || '').toUpperCase().substring(0, 3) === String(rowData['Month'] || '').toUpperCase().substring(0, 3)
    );
    
    let vehicleToShow = originalVehicleData || (rowData as InternalFleetData);
    let augmentedVehicleData = { ...vehicleToShow };

    if (augmentedVehicleData.Fleet_Category === 'External Fleets') {
        const monthAbbr = String((augmentedVehicleData as any)['MONTH'] || '').toUpperCase().substring(0, 3);
        const year = String((augmentedVehicleData as any)['YEAR'] || '');

        const externalRecord = externalData.find(ext => 
            ext['Reg No:'] === augmentedVehicleData['Reg No:'] &&
            String(ext.Month || '').toUpperCase().substring(0, 3) === monthAbbr &&
            String(ext.Year || '') === year
        );

        if (externalRecord) {
            const anyExt = externalRecord as any;
            augmentedVehicleData = {
                ...augmentedVehicleData,
                'Back Charged': anyExt.REVENUE ?? anyExt.Revenue,
                'Paid Amount': anyExt.COST ?? anyExt.Cost,
            };
        }
    }

    // Augment with Job Card Data
    const regNo = String(augmentedVehicleData['Reg No:'] || '').toLowerCase();
    const fleetNo = String(augmentedVehicleData['Fleet No:'] || '').toLowerCase();
    const monthAbbr = String((augmentedVehicleData as any)['MONTH'] || '').toUpperCase().substring(0, 3);
    const year = String((augmentedVehicleData as any)['YEAR'] || '');

    if ((regNo || fleetNo) && monthAbbr && year) {
      const jobCardTotal = jobCardData.filter(jc => {
        const jcMonth = String(jc.Month || '').toUpperCase().substring(0, 3);
        const jcYear = String(jc.Year || '');
        if (jcMonth !== monthAbbr || jcYear !== year) return false;

        const jcRegOrFleet = String((jc as any)['Reg / Fleet No:'] || jc['Plate #'] || '').toLowerCase();
        if (!jcRegOrFleet) return false;

        const regNoMatch = regNo && jcRegOrFleet.includes(regNo);
        const fleetNoMatch = fleetNo && jcRegOrFleet.includes(fleetNo);
        return regNoMatch || fleetNoMatch;
      }).reduce((sum, jc) => sum + (Number((jc as any)['Total amount with Service Charge'] || jc['Total Amount w%'] || 0)), 0);

      augmentedVehicleData.jobCardAmount = jobCardTotal;
    }
    
    setSelectedVehicle(augmentedVehicleData);
  };


  const exportButton = (
    <button
      onClick={handleExport}
      disabled={tableData.length === 0}
      className="bg-green-700 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg cursor-pointer transition-colors duration-300 disabled:bg-gray-600 disabled:cursor-not-allowed"
      title="Save filtered data to an Excel file"
    >
      Save as Excel
    </button>
  );

  return (
    <div className="flex flex-col h-full">
      {/* Filter Bar */}
      <div className="flex-shrink-0">
        <div className="flex items-stretch bg-secondary/20">
          {/* Back Button and Title */}
           <div className="bg-secondary flex items-center justify-start p-2 gap-4">
                <button 
                    onClick={() => setActiveView(SheetNames.Dashboard)}
                    className="flex items-center justify-center bg-secondary text-white font-bold py-2 px-4 rounded-lg shadow-lg border-b-4 border-primary hover:bg-primary active:translate-y-0.5 active:border-b-2 active:shadow-md transition-all duration-150"
                    title="Return to Dashboard"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span>Back</span>
                </button>
                <h1 className="text-lg font-bold text-white whitespace-nowrap">Internal Fleets Details</h1>
          </div>
          
          {/* Month Filters */}
          <div className="bg-white/10 p-px">
            <div className="grid grid-cols-4 gap-px">
                {MONTH_NAMES.slice(0, 4).map(month => (
                    <button key={month} onClick={() => handleMonthFilterClick(month)} className={`px-3 py-1 text-center text-xs font-semibold transition-all duration-200 ${filters.Month === month ? 'bg-accent text-white' : 'bg-secondary hover:bg-accent/50'}`}>
                        {month}
                    </button>
                ))}
            </div>
             <div className="grid grid-cols-4 gap-px mt-px">
                {MONTH_NAMES.slice(4, 8).map(month => (
                    <button key={month} onClick={() => handleMonthFilterClick(month)} className={`px-3 py-1 text-center text-xs font-semibold transition-all duration-200 ${filters.Month === month ? 'bg-accent text-white' : 'bg-secondary hover:bg-accent/50'}`}>
                        {month}
                    </button>
                ))}
            </div>
             <div className="grid grid-cols-4 gap-px mt-px">
                {MONTH_NAMES.slice(8, 12).map(month => (
                    <button key={month} onClick={() => handleMonthFilterClick(month)} className={`px-3 py-1 text-center text-xs font-semibold transition-all duration-200 ${filters.Month === month ? 'bg-accent text-white' : 'bg-secondary hover:bg-accent/50'}`}>
                        {month}
                    </button>
                ))}
            </div>
          </div>

          {/* Year Filters */}
          <div className="bg-white/10 p-px ml-px flex flex-col justify-center">
            <div className="flex flex-col gap-px">
              {YEARS.map(year => (
                <button
                  key={year}
                  onClick={() => handleYearFilterClick(year)}
                  className={`px-3 py-1 text-center text-xs font-semibold transition-all duration-200 ${
                    filters.Year === year
                    ? 'bg-accent text-white'
                    : 'bg-secondary hover:bg-accent/50'
                  }`}
                >
                  {year}
                </button>
              ))}
            </div>
          </div>

          {/* Fleet Category Filter */}
          <div className="bg-secondary flex flex-col justify-center p-2 ml-px flex-grow">
              <label htmlFor="Fleet_Category" className="text-sm font-bold text-white mb-1 whitespace-nowrap">Fleet Category</label>
              <SearchableDropdown
                id="Fleet_Category"
                name="Fleet_Category"
                options={dynamicOptions.fleetCategories}
                value={filters.Fleet_Category}
                onChange={(value) => setFilters(prev => ({ ...prev, Fleet_Category: value }))}
                variant="detail-view"
              />
          </div>

          {/* Business Unit Filter */}
          <div className="bg-secondary flex flex-col justify-center p-2 ml-px flex-grow">
              <label htmlFor="Business Units" className="text-sm font-bold text-white mb-1 whitespace-nowrap">Business Unit</label>
              <SearchableDropdown
                id="Business Units"
                name="Business Units"
                options={dynamicOptions.businessUnits}
                value={filters['Business Units']}
                onChange={(value) => setFilters(prev => ({ ...prev, 'Business Units': value }))}
                variant="detail-view"
              />
          </div>
        </div>
      </div>
      
      {/* Content Area: Table + Summary/Chart */}
      <div className="flex-grow flex gap-4 mt-4 min-h-0">
        
        {/* Left Column: Data Table */}
        <div className="w-4/5 flex flex-col">
          <DataTable 
            data={tableData} 
            title="Filtered Internal Fleets Data" 
            headers={tableHeaders} 
            actionButton={exportButton}
            onRowDoubleClick={handleRowDoubleClick}
          />
        </div>

        {/* Right Column: Summary */}
        <div className="w-1/5 flex flex-col gap-4">
          <div className="bg-secondary p-4 rounded-xl shadow-lg">
            <h4 className="text-sm font-medium text-accent">Total Back Charge</h4>
            <p className="text-xl font-bold text-white">
                QAR {summaryData.totalBackCharge.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
            </p>
          </div>
          <div className="bg-secondary p-4 rounded-xl shadow-lg">
            <h4 className="text-sm font-medium text-yellow-300">Rental Back Charge</h4>
            <p className="text-xl font-bold text-yellow-100">
                QAR {summaryData.rentalBackCharge.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
            </p>
          </div>
          <div className="bg-secondary p-4 rounded-xl shadow-lg">
            <h4 className="text-sm font-medium text-orange-300">Fuel Back Charge</h4>
            <p className="text-xl font-bold text-orange-100">
                QAR {summaryData.fuelBackCharge.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
            </p>
          </div>

          {/* Additional Analysis Section */}
           <div className="bg-secondary p-4 rounded-xl shadow-lg flex-grow flex flex-col gap-4">
                <h3 className="text-base font-semibold text-accent -mb-2">Analysis Tools</h3>
                <div>
                    <label htmlFor="search-filter" className="block text-sm font-medium text-gray-300">Filter by Reg No:</label>
                    <input
                        id="search-filter"
                        type="text"
                        value={searchFilter}
                        onChange={(e) => setSearchFilter(e.target.value)}
                        placeholder="Enter No..."
                        className="mt-1 block w-full pl-3 pr-2 py-1 text-base bg-primary border-gray-600 text-white focus:outline-none focus:ring-accent focus:border-accent sm:text-sm rounded-md"
                    />
                </div>

                <div className="grid grid-cols-2 gap-2 text-center">
                    <div className="p-2 bg-primary rounded-lg">
                        <p className="text-xs text-gray-400 font-medium">Record Count</p>
                        <p className="text-lg font-bold text-white">{summaryData.recordCount}</p>
                    </div>
                    <div className="p-2 bg-primary rounded-lg">
                        <p className="text-xs text-gray-400 font-medium">Avg Revenue</p>
                        <p className="text-lg font-bold text-white">
                            {summaryData.averageAmount.toLocaleString('en-US', { style: 'currency', currency: 'QAR', minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                    </div>
                </div>
            </div>

        </div>
      </div>
      {selectedVehicle && (
        <VehicleCard 
          data={selectedVehicle} 
          onClose={() => setSelectedVehicle(null)} 
        />
      )}
    </div>
  );
};

export default InternalFleetsView;
