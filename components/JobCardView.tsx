import React, { useState, useMemo, useEffect } from 'react';
import type { JobCardData } from '../types';
import { SheetNames } from '../types';
import DataTable from './DataTable';
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

// Re-using constants and helpers from other views
const MONTH_NAMES = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
const YEARS = ["2024", "2025", "2026"];

interface JobCardViewProps {
  data: JobCardData[];
  sharedFilters: { month: string; year: string; businessUnit: string; };
  setActiveView: (view: SheetNames) => void;
}

const JobCardView: React.FC<JobCardViewProps> = ({ data, sharedFilters, setActiveView }) => {
  const [filters, setFilters] = useState({
    Month: sharedFilters.month,
    Year: sharedFilters.year,
    'Business Units': sharedFilters.businessUnit,
    'Cluster': 'All',
  });
  const [searchFilter, setSearchFilter] = useState('');

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
    if(!data) return { businessUnits: ['All'], clusters: ['All'] };
    const lowercasedSearchFilter = searchFilter.toLowerCase().trim();

    // Base filtering on non-dropdown filters
    const baseFilteredData = data.filter(item => {
        const itemMonthName = String(item.Month || '').toUpperCase().substring(0, 3);
        const itemYear = String(item.Year || '');
        
        const monthMatch = filters.Month === 'All' || itemMonthName === filters.Month;
        const yearMatch = filters.Year === 'All' || itemYear === filters.Year;
        
        const searchKey = (item as any)['Reg / Fleet No:'] ?? item['Plate #'];
        const searchMatch = !lowercasedSearchFilter || String(searchKey).toLowerCase().includes(lowercasedSearchFilter);
        
        return monthMatch && yearMatch && searchMatch;
    });

    // For Business Unit options, further filter by Cluster
    const buData = baseFilteredData.filter(item =>
        filters.Cluster === 'All' || String(item.Cluster) === filters.Cluster
    );
    const businessUnits = new Set<string>();
    buData.forEach(item => {
      if(item['Business Units']) businessUnits.add(String(item['Business Units']));
    });

    // For Cluster options, further filter by Business Unit
    const clusterData = baseFilteredData.filter(item =>
        filters['Business Units'] === 'All' || String(item['Business Units']) === filters['Business Units']
    );
    const clusters = new Set<string>();
    clusterData.forEach(item => {
      if(item.Cluster) clusters.add(String(item.Cluster));
    });
    
    return {
      businessUnits: ['All', ...Array.from(businessUnits).sort()],
      clusters: ['All', ...Array.from(clusters).sort()],
    }
  }, [data, filters.Month, filters.Year, filters['Business Units'], filters.Cluster, searchFilter]);

  useEffect(() => {
    if (filters['Business Units'] !== 'All' && !dynamicOptions.businessUnits.includes(filters['Business Units'])) {
      setFilters(prev => ({ ...prev, 'Business Units': 'All' }));
    }
  }, [filters['Business Units'], dynamicOptions.businessUnits]);

  useEffect(() => {
      if (filters.Cluster !== 'All' && !dynamicOptions.clusters.includes(filters.Cluster)) {
        setFilters(prev => ({ ...prev, Cluster: 'All' }));
      }
  }, [filters.Cluster, dynamicOptions.clusters]);

  const filteredData = useMemo(() => {
    if (!data) return [];
    const lowercasedSearchFilter = searchFilter.toLowerCase().trim();

    return data.filter(item => {
      const itemMonthName = String(item.Month || '').toUpperCase().substring(0, 3);
      const itemYear = String(item.Year || '');
      
      const monthMatch = filters.Month === 'All' || itemMonthName === filters.Month;
      const yearMatch = filters.Year === 'All' || itemYear === filters.Year;
      const businessUnitMatch = filters['Business Units'] === 'All' || String(item['Business Units']) === filters['Business Units'];
      const clusterMatch = filters['Cluster'] === 'All' || String(item.Cluster) === filters['Cluster'];
      
      const searchKey = (item as any)['Reg / Fleet No:'] ?? item['Plate #'];
      const searchMatch = !lowercasedSearchFilter || String(searchKey).toLowerCase().includes(lowercasedSearchFilter);

      return monthMatch && yearMatch && businessUnitMatch && searchMatch && clusterMatch;
    });
  }, [data, filters, searchFilter]);

  const summaryData = useMemo(() => {
    const totalAmount = filteredData.reduce((acc, item) => acc + ((item as any)['Total amount with Service Charge'] || item['Total Amount w%'] || 0), 0);
    const totalProfit = filteredData.reduce((acc, item) => acc + (item.Profit || 0), 0);
    const recordCount = filteredData.length;
    const averageAmount = recordCount > 0 ? totalAmount / recordCount : 0;
    
    return { totalAmount, totalProfit, recordCount, averageAmount };
  }, [filteredData]);

  const tableHeaders = [
    "JobCard No:",
    "Business Units",
    "Cluster",
    "Month",
    "Year",
    "Date",
    "Reg / Fleet No:",
    "Total amount with Service Charge",
    "Profit"
  ];

  const tableData = useMemo(() => {
    return filteredData.map(item => {
      return {
        'JobCard No:': item['JobCard No:'],
        'Business Units': item['Business Units'],
        'Cluster': (item as any)['Cluster'],
        'Month': item['Month'],
        'Year': item['Year'],
        'Date': item['DATE'],
        'Reg / Fleet No:': (item as any)['Reg / Fleet No:'] ?? item['Plate #'],
        'Total amount with Service Charge': (item as any)['Total amount with Service Charge'] || item['Total Amount w%'],
        'Profit': item.Profit,
      }
    });
  }, [filteredData]);

  const handleExport = () => {
    exportToExcel(tableData, 'Job_Card_Export');
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
                <h1 className="text-lg font-bold text-white whitespace-nowrap">Job Card Details</h1>
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

          {/* Cluster Filter */}
          <div className="bg-secondary flex flex-col justify-center p-2 ml-px flex-grow">
              <label htmlFor="Cluster" className="text-sm font-bold text-white mb-1 whitespace-nowrap">Cluster</label>
              <SearchableDropdown
                id="Cluster"
                name="Cluster"
                options={dynamicOptions.clusters}
                value={filters.Cluster}
                onChange={(value) => setFilters(prev => ({ ...prev, Cluster: value }))}
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
          <DataTable data={tableData} title="Filtered Job Card Data" headers={tableHeaders} actionButton={exportButton} />
        </div>

        {/* Right Column: Summary */}
        <div className="w-1/5 flex flex-col gap-4">
          <div className="bg-secondary p-4 rounded-xl shadow-lg">
            <h4 className="text-sm font-medium text-blue-300">Total Amount</h4>
            <p className="text-xl font-bold text-blue-100">
                QAR {summaryData.totalAmount.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
            </p>
          </div>
          <div className="bg-secondary p-4 rounded-xl shadow-lg">
            <h4 className="text-sm font-medium text-green-300">Total Profit</h4>
            <p className="text-xl font-bold text-green-100">
                QAR {summaryData.totalProfit.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
            </p>
          </div>

          {/* Additional Analysis Section */}
           <div className="bg-secondary p-4 rounded-xl shadow-lg flex-grow flex flex-col gap-4">
                <h3 className="text-base font-semibold text-accent -mb-2">Analysis Tools</h3>
                <div>
                    <label htmlFor="search-filter" className="block text-sm font-medium text-gray-300">Filter by Reg / Fleet No:</label>
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
                        <p className="text-xs text-gray-400 font-medium">Avg Amount</p>
                        <p className="text-lg font-bold text-white">
                            {summaryData.averageAmount.toLocaleString('en-US', { style: 'currency', currency: 'QAR', minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                    </div>
                </div>
            </div>

        </div>
      </div>
    </div>
  );
};

export default JobCardView;
