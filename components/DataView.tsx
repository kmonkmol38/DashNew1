import React, { useState, useMemo, useEffect, useRef } from 'react';
import type { ExternalFleetData } from '../types';
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

const MONTH_NAMES = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
const YEARS = ["2024", "2025", "2026"];

interface DataViewProps {
  data: ExternalFleetData[];
  sharedFilters: { month: string; year: string; businessUnit: string; };
  setActiveView: (view: SheetNames) => void;
}

const DataView: React.FC<DataViewProps> = ({ data, sharedFilters, setActiveView }) => {
  const [filters, setFilters] = useState({
    Month: sharedFilters.month,
    Year: sharedFilters.year,
    'Business Unit': sharedFilters.businessUnit,
    'Supplier': 'All',
    'Type of Service': new Set<string>(),
  });
  const [regNoFilter, setRegNoFilter] = useState('');
  const [transmittalFilter, setTransmittalFilter] = useState('');
  const [invoiceFilter, setInvoiceFilter] = useState('');
  const [isServiceDropdownOpen, setIsServiceDropdownOpen] = useState(false);
  const [serviceSearchTerm, setServiceSearchTerm] = useState('');
  const serviceDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setFilters(prev => ({
      ...prev,
      Month: sharedFilters.month,
      Year: sharedFilters.year,
      'Business Unit': sharedFilters.businessUnit,
    }));
  }, [sharedFilters]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (serviceDropdownRef.current && !serviceDropdownRef.current.contains(event.target as Node)) {
            setIsServiceDropdownOpen(false);
        }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
        document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);
  
  const handleTypeOfServiceChange = (service: string) => {
    setFilters(prev => {
        const newSet = new Set(prev['Type of Service']);
        if (newSet.has(service)) {
            newSet.delete(service);
        } else {
            newSet.add(service);
        }
        return { ...prev, 'Type of Service': newSet };
    });
  };

  const handleMonthFilterClick = (month: string) => {
    const newMonth = filters.Month === month ? 'All' : month;
    setFilters(prev => ({ ...prev, Month: newMonth }));
  };

  const handleYearFilterClick = (year: string) => {
    const newYear = filters.Year === year ? 'All' : year;
    setFilters(prev => ({ ...prev, Year: newYear }));
  };

  const dynamicOptions = useMemo(() => {
    if (!data) return { businessUnits: ['All'], suppliers: ['All'], typesOfService: [] };
    
    const lowercasedRegNoFilter = regNoFilter.toLowerCase().trim();
    const lowercasedTransmittalFilter = transmittalFilter.toLowerCase().trim();
    const lowercasedInvoiceFilter = invoiceFilter.toLowerCase().trim();

    const baseFilteredData = data.filter(item => {
        const monthMatch = filters.Month === 'All' || item.Month === filters.Month;
        const yearMatch = filters.Year === 'All' || String(item.Year) === filters.Year;
        const regNoMatch = !lowercasedRegNoFilter || String(item['Reg No:']).toLowerCase().includes(lowercasedRegNoFilter);
        const transmittalMatch = !lowercasedTransmittalFilter || String(item.Transmittal ?? '').toLowerCase().includes(lowercasedTransmittalFilter);
        const invoiceMatch = !lowercasedInvoiceFilter || String(item['Invoice Number:'] ?? '').toLowerCase().includes(lowercasedInvoiceFilter);
        return monthMatch && yearMatch && regNoMatch && transmittalMatch && invoiceMatch;
    });
    
    // For Business Unit options, filter by everything else
    const buData = baseFilteredData.filter(item => {
        const supplierMatch = filters.Supplier === 'All' || String(item['Supplier Name']) === filters.Supplier;
        const serviceMatch = filters['Type of Service'].size === 0 || filters['Type of Service'].has(String(item['Type of Service']));
        return supplierMatch && serviceMatch;
    });
    const businessUnits = new Set<string>();
    buData.forEach(item => { if (item['Business Units']) businessUnits.add(String(item['Business Units'])); });

    // For Supplier options, filter by everything else
    const supplierData = baseFilteredData.filter(item => {
        const buMatch = filters['Business Unit'] === 'All' || String(item['Business Units']) === filters['Business Unit'];
        const serviceMatch = filters['Type of Service'].size === 0 || filters['Type of Service'].has(String(item['Type of Service']));
        return buMatch && serviceMatch;
    });
    const suppliers = new Set<string>();
    supplierData.forEach(item => { if (item['Supplier Name']) suppliers.add(String(item['Supplier Name'])); });

    // For Type of Service options, filter by everything else
    const serviceData = baseFilteredData.filter(item => {
        const buMatch = filters['Business Unit'] === 'All' || String(item['Business Units']) === filters['Business Unit'];
        const supplierMatch = filters.Supplier === 'All' || String(item['Supplier Name']) === filters.Supplier;
        return buMatch && supplierMatch;
    });
    const typesOfService = new Set<string>();
    serviceData.forEach(item => { if (item['Type of Service']) typesOfService.add(String(item['Type of Service'])); });

    return {
        businessUnits: ['All', ...Array.from(businessUnits).sort()],
        suppliers: ['All', ...Array.from(suppliers).sort()],
        typesOfService: [...Array.from(typesOfService).sort()],
    };
  }, [data, filters.Month, filters.Year, filters.Supplier, filters['Business Unit'], filters['Type of Service'], regNoFilter, transmittalFilter, invoiceFilter]);

  const filteredServices = useMemo(() => {
    if (!serviceSearchTerm) return dynamicOptions.typesOfService;
    return dynamicOptions.typesOfService.filter(service => service.toLowerCase().includes(serviceSearchTerm.toLowerCase()));
  }, [dynamicOptions.typesOfService, serviceSearchTerm]);


  useEffect(() => {
    if (filters['Business Unit'] !== 'All' && !dynamicOptions.businessUnits.includes(filters['Business Unit'])) {
      setFilters(prev => ({ ...prev, 'Business Unit': 'All' }));
    }
  }, [filters['Business Unit'], dynamicOptions.businessUnits]);

  useEffect(() => {
    if (filters.Supplier !== 'All' && !dynamicOptions.suppliers.includes(filters.Supplier)) {
      setFilters(prev => ({ ...prev, 'Supplier': 'All' }));
    }
  }, [filters.Supplier, dynamicOptions.suppliers]);

  const filteredData = useMemo(() => {
    if (!data) return [];
    const lowercasedRegNoFilter = regNoFilter.toLowerCase().trim();
    const lowercasedTransmittalFilter = transmittalFilter.toLowerCase().trim();
    const lowercasedInvoiceFilter = invoiceFilter.toLowerCase().trim();

    return data.filter(item => {
      const monthMatch = filters.Month === 'All' || item.Month === filters.Month;
      const yearMatch = filters.Year === 'All' || String(item.Year) === filters.Year;
      const businessUnitMatch = filters['Business Unit'] === 'All' || String(item['Business Units']) === filters['Business Unit'];
      const supplierMatch = filters.Supplier === 'All' || String(item['Supplier Name']) === filters.Supplier;
      const serviceMatch = filters['Type of Service'].size === 0 || filters['Type of Service'].has(String(item['Type of Service']));
      
      const regNoMatch = !lowercasedRegNoFilter || String(item['Reg No:']).toLowerCase().includes(lowercasedRegNoFilter);
      const transmittalMatch = !lowercasedTransmittalFilter || String(item.Transmittal ?? '').toLowerCase().includes(lowercasedTransmittalFilter);
      const invoiceMatch = !lowercasedInvoiceFilter || String(item['Invoice Number:'] ?? '').toLowerCase().includes(lowercasedInvoiceFilter);

      return monthMatch && yearMatch && businessUnitMatch && supplierMatch && serviceMatch && regNoMatch && transmittalMatch && invoiceMatch;
    });
  }, [data, filters, regNoFilter, transmittalFilter, invoiceFilter]);

  const summaryData = useMemo(() => {
    const totalRevenue = filteredData.reduce((acc, item) => acc + ((item as any).REVENUE ?? (item as any).Revenue ?? 0), 0);
    const totalCost = filteredData.reduce((acc, item) => acc + ((item as any).COST ?? (item as any).Cost ?? 0), 0);
    const totalProfit = filteredData.reduce((acc, item) => acc + ((item as any).PROFIT ?? (item as any).Profit ?? 0), 0);
    const recordCount = filteredData.length;
    const averageRevenue = recordCount > 0 ? totalRevenue / recordCount : 0;
    
    const ehrcAmount = filteredData
      .filter(item => item['Business Units'] === 'PMV-ELEGANCIA HUMAN RESOURCES & CONT.')
      .reduce((acc, item) => acc + ((item as any).REVENUE ?? (item as any).Revenue ?? 0), 0);

    const invoiceNumbers = new Set<string | number>();
    filteredData.forEach(item => {
        const invoiceNo = item['Invoice Number:'];
        if (invoiceNo !== null && invoiceNo !== undefined && String(invoiceNo).trim() !== '') {
            invoiceNumbers.add(invoiceNo);
        }
    });
    const uniqueInvoiceCount = invoiceNumbers.size;
    const revenueMinusEhrc = totalRevenue - ehrcAmount;

    return { totalRevenue, totalCost, totalProfit, recordCount, averageRevenue, uniqueInvoiceCount, ehrcAmount, revenueMinusEhrc };
  }, [filteredData]);

  const tableHeaders = [
    "Month",
    "Year",
    "Reg No:",
    "Vehicle Description",
    "Date:",
    "Invoice Number:",
    "Supplier Name",
    "Type of Service",
    "Business Units",
    "REVENUE",
    "COST",
    "PROFIT",
    "Transmittal",
  ];

  const tableData = useMemo(() => {
    return filteredData.map(item => {
      const anyItem = item as any;
      return {
        'Month': item.Month,
        'Year': item.Year,
        'Reg No:': item['Reg No:'],
        'Vehicle Description': item['Vehicle Description'],
        'Date:': item['Date:'],
        'Invoice Number:': item['Invoice Number:'],
        'Supplier Name': item['Supplier Name'],
        'Type of Service': item['Type of Service'],
        'Business Units': item['Business Units'],
        'REVENUE': anyItem.REVENUE ?? anyItem.Revenue,
        'COST': anyItem.COST ?? anyItem.Cost,
        'PROFIT': anyItem.PROFIT ?? anyItem.Profit,
        'Transmittal': item.Transmittal,
      };
    });
  }, [filteredData]);
  
  const handleExport = () => {
    exportToExcel(tableData, 'External_Fleets_Export');
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
                <h1 className="text-lg font-bold text-white whitespace-nowrap">External Fleets Details</h1>
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

          {/* Supplier Filter */}
          <div className="bg-secondary flex flex-col justify-center p-2 ml-px flex-grow">
              <label htmlFor="Supplier" className="text-sm font-bold text-white mb-1 whitespace-nowrap">Supplier</label>
              <SearchableDropdown
                id="Supplier"
                name="Supplier"
                value={filters.Supplier}
                options={dynamicOptions.suppliers}
                onChange={(value) => setFilters(prev => ({...prev, Supplier: value}))}
                variant="detail-view"
              />
          </div>
          
          {/* Type of Service Filter */}
          <div className="bg-secondary flex flex-col justify-center p-2 ml-px flex-grow" ref={serviceDropdownRef}>
            <label className="text-sm font-bold text-white mb-1 whitespace-nowrap">Type of Service</label>
            <div className="relative">
                <button
                    onClick={() => setIsServiceDropdownOpen(prev => !prev)}
                    className="bg-white text-black rounded-sm p-1 text-sm border-0 focus:ring-0 w-full text-left"
                >
                    {filters['Type of Service'].size === 0 ? 'All' : `${filters['Type of Service'].size} selected`}
                </button>
                {isServiceDropdownOpen && (
                    <div className="absolute top-full left-0 mt-1 w-full bg-secondary border border-gray-600 rounded-md shadow-lg z-20 max-h-60 overflow-y-auto">
                        <input
                            type="text"
                            placeholder="Search services..."
                            value={serviceSearchTerm}
                            onChange={(e) => setServiceSearchTerm(e.target.value)}
                            className="block w-full sticky top-0 px-3 py-2 text-sm bg-primary border-b border-gray-600 text-white focus:outline-none focus:ring-1 focus:ring-accent"
                        />
                        {filteredServices.length > 0 ? filteredServices.map(service => (
                            <label key={service} className="flex items-center p-2 hover:bg-primary cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="h-4 w-4 rounded bg-gray-700 border-gray-500 text-accent focus:ring-accent"
                                    checked={filters['Type of Service'].has(service)}
                                    onChange={() => handleTypeOfServiceChange(service)}
                                />
                                <span className="ml-2 text-sm text-white">{service}</span>
                            </label>
                        )) : <div className="p-2 text-sm text-gray-400">No options found</div>}
                    </div>
                )}
            </div>
          </div>


          {/* Business Unit Filter */}
          <div className="bg-secondary flex flex-col justify-center p-2 ml-px flex-grow">
              <label htmlFor="Business Unit" className="text-sm font-bold text-white mb-1 whitespace-nowrap">Business Unit</label>
              <SearchableDropdown
                id="Business Unit"
                name="Business Unit"
                value={filters['Business Unit']}
                options={dynamicOptions.businessUnits}
                onChange={(value) => setFilters(prev => ({...prev, 'Business Unit': value}))}
                variant="detail-view"
              />
          </div>
        </div>
      </div>
      
      {/* Content Area: Table + Summary/Chart */}
      <div className="flex-grow flex gap-4 mt-4 min-h-0">
        
        {/* Left Column: Data Table */}
        <div className="w-4/5 flex flex-col">
          <DataTable data={tableData} title="Filtered External Fleets Data" headers={tableHeaders} actionButton={exportButton} />
        </div>

        {/* Right Column: Summary */}
        <div className="w-1/5 flex flex-col gap-4">
          <div className="bg-secondary p-4 rounded-xl shadow-lg">
            <h4 className="text-sm font-medium text-blue-300">Total Revenue</h4>
            <p className="text-xl font-bold text-blue-100">
                QAR {summaryData.totalRevenue.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
            </p>
          </div>
           <div className="bg-secondary p-3 rounded-xl shadow-lg">
            <h4 className="text-xs font-medium text-gray-400">EHRC Amount</h4>
            <p className="text-lg font-bold text-accent-secondary">
                QAR {summaryData.ehrcAmount.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
            </p>
          </div>
          <div className="bg-secondary p-4 rounded-xl shadow-lg">
            <h4 className="text-sm font-medium text-red-300">Total Cost</h4>
            <p className="text-xl font-bold text-red-100">
                QAR {summaryData.totalCost.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
            </p>
          </div>
          <div className="bg-secondary p-4 rounded-xl shadow-lg">
            <h4 className="text-sm font-medium text-green-300">Total Profit</h4>
            <p className="text-xl font-bold text-green-100">
                QAR {summaryData.totalProfit.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
            </p>
          </div>

          {/* Additional Analysis Section */}
           <div className="bg-secondary p-4 rounded-xl shadow-lg flex-grow flex flex-col gap-2">
                <h3 className="text-base font-semibold text-accent mb-2">Analysis Tools</h3>
                
                <div className="grid grid-cols-2 gap-2 text-center mb-2">
                    <div className="p-2 bg-primary rounded-lg">
                        <p className="text-xs text-gray-400 font-medium">Record Count</p>
                        <p className="text-lg font-bold text-white">{summaryData.recordCount}</p>
                    </div>
                    <div className="p-2 bg-primary rounded-lg">
                        <p className="text-xs text-gray-400 font-medium">Avg Revenue</p>
                        <p className="text-lg font-bold text-white">
                            {summaryData.averageRevenue.toLocaleString('en-US', { style: 'currency', currency: 'QAR', minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                    </div>
                </div>

                <div>
                    <label htmlFor="reg-no-filter" className="block text-xs font-medium text-gray-300">Filter by Reg No:</label>
                    <input
                        id="reg-no-filter"
                        type="text"
                        value={regNoFilter}
                        onChange={(e) => setRegNoFilter(e.target.value)}
                        placeholder="Enter No..."
                        className="mt-1 block w-full pl-2 pr-2 py-1 text-base bg-primary border-gray-600 text-white focus:outline-none focus:ring-accent focus:border-accent sm:text-sm rounded-md"
                    />
                </div>
                <div>
                    <label htmlFor="transmittal-filter" className="block text-xs font-medium text-gray-300">Filter by Transmittal:</label>
                    <input
                        id="transmittal-filter"
                        type="text"
                        value={transmittalFilter}
                        onChange={(e) => setTransmittalFilter(e.target.value)}
                        placeholder="Enter Transmittal..."
                        className="mt-1 block w-full pl-2 pr-2 py-1 text-base bg-primary border-gray-600 text-white focus:outline-none focus:ring-accent focus:border-accent sm:text-sm rounded-md"
                    />
                </div>
                <div>
                    <label htmlFor="invoice-filter" className="block text-xs font-medium text-gray-300">Filter by Invoice No:</label>
                    <input
                        id="invoice-filter"
                        type="text"
                        value={invoiceFilter}
                        onChange={(e) => setInvoiceFilter(e.target.value)}
                        placeholder="Enter Invoice No..."
                        className="mt-1 block w-full pl-2 pr-2 py-1 text-base bg-primary border-gray-600 text-white focus:outline-none focus:ring-accent focus:border-accent sm:text-sm rounded-md"
                    />
                </div>
                <div className="p-2 bg-primary rounded-lg text-center">
                    <p className="text-xs text-gray-400 font-medium">Invoice Count and Total</p>
                    <p className="text-lg font-bold text-accent-secondary">
                        {summaryData.uniqueInvoiceCount} | {summaryData.revenueMinusEhrc.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                    </p>
                </div>
            </div>

        </div>
      </div>
    </div>
  );
};

export default DataView;
