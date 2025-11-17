import React, { useState, useMemo, useEffect, useRef } from 'react';
import type { DriverOperatorData } from '../types';
import { SheetNames } from '../types';
import DataTable from './DataTable';
import EmployeeSalaryCard from './EmployeeSalaryCard';
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


/**
 * Gets the abbreviated month name (e.g., "JAN") from a date value.
 * This is used as a fallback if a direct 'Month' column is not available.
 * @param value The value to process, expected to be a Date object.
 * @returns The month name as a string, or null if the value is not a valid date.
 */
const getMonthNameFromDate = (value: any): string | null => {
    if (value instanceof Date && !isNaN(value.getTime())) {
        return MONTH_NAMES[value.getUTCMonth()];
    }
    return null;
};

/**
 * Gets the year from a date value.
 * This is used as a fallback if a direct 'Year' column is not available.
 * @param value The value to process, expected to be a Date object.
 * @returns The year as a number, or null if the value is not a valid date.
 */
const getYearFromDate = (value: any): number | null => {
    if (value instanceof Date && !isNaN(value.getTime())) {
        return value.getUTCFullYear();
    }
    return null;
};

/**
 * Retrieves the Business Unit value from a data row, checking for multiple
 * common variations of the column name to handle inconsistencies in the source file.
 * @param item The data row object.
 * @returns The business unit as a string, or undefined if not found.
 */
const getBusinessUnit = (item: DriverOperatorData): string | undefined => {
    const anyItem = item as any;
    // Check for multiple common variations of the 'Business Unit' column name.
    return anyItem['BUSINESS UNITS']   // Plural, all caps
        ?? anyItem['Business Units']   // Plural, title case
        ?? anyItem['BUSINESS UNIT']    // Singular, all caps
        ?? anyItem['Business Unit']    // Singular, title case
        ?? anyItem['Client Company Name']; // Fallback
};

const getDesignation = (item: DriverOperatorData): string | undefined => {
    const anyItem = item as any;
    return anyItem.DESIGNATION ?? anyItem.Designation;
};

const TABS = {
    SUMMARY: 'Summary',
    DETAILS: 'Employee Details',
    EARNINGS: 'EHRC Earnings',
    PAYROLL: 'EHRC Payroll Breakdown',
    DEDUCTIONS: 'CTC Deductions & Benefits',
} as const;

type DriverOperatorTab = typeof TABS[keyof typeof TABS];

const baseHeaders = ['CTC NO.', 'SAP NO.', 'Employee Name', 'Designation', 'Business Units', 'Month', 'Year'];
const profitabilityHeaders = ['Revenue', 'Expense', 'Profit'];
const ehrcEarningsHeaders = ['Monthly', 'Hourly', 'N-Price', 'N-Hours', 'N-Amount', 'N-OTPrice', 'N-OTHours', 'N-OTAmount', 'H-OTPrice', 'H-OTHours', 'H-OTAmount', 'Net Amount'];
const ehrcPayrollHeaders = ['Basic Salary', 'Other Allowance', 'N-Price2', 'N-Hours2', 'N-Amount2', 'N-OTPrice2', 'N-OTHours2', 'N-OTAmount2', 'H-OTPrice2', 'H-OTHours2', 'H-OTAmount2', 'Net Amount2'];
const ctcDeductionsHeaders = ['Leave', 'TKT', 'ESB', 'Accom', 'FOOD', 'Uniform', 'RP+HC', 'MED INS', 'SAL TRF', 'WC INS', 'HO', 'Total'];
const summaryHeaders = ['CTC NO.', 'SAP NO.', 'Employee Name', 'Designation', 'Business Units', 'Month', 'Year', 'EHRC Earnings', 'EHRC Total', 'Payroll', 'CTC Cost', 'Total salary'];

interface DriverOperatorViewProps {
  data: DriverOperatorData[];
  sharedFilters: { month: string; year: string; businessUnit: string; designation: string; };
  setActiveView: (view: SheetNames) => void;
}

const DriverOperatorView: React.FC<DriverOperatorViewProps> = ({ data, sharedFilters, setActiveView }) => {
  const [filters, setFilters] = useState({
    Month: sharedFilters.month,
    Year: sharedFilters.year,
    'Business Units': sharedFilters.businessUnit,
    Designation: sharedFilters.designation,
  });
  const [sapFilter, setSapFilter] = useState('');
  const [activeTab, setActiveTab] = useState<DriverOperatorTab>(TABS.SUMMARY);
  const [selectedEmployee, setSelectedEmployee] = useState<DriverOperatorData | null>(null);
  const [highlightedColumn, setHighlightedColumn] = useState<string | null>(null);
  const tableRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setFilters(prev => ({
      ...prev,
      Month: sharedFilters.month,
      Year: sharedFilters.year,
      'Business Units': sharedFilters.businessUnit,
      Designation: sharedFilters.designation,
    }));
  }, [sharedFilters.month, sharedFilters.year, sharedFilters.businessUnit, sharedFilters.designation]);

  const handleMonthFilterClick = (month: string) => {
    const newMonth = filters.Month === month ? 'All' : month;
    setFilters(prev => ({ ...prev, Month: newMonth }));
  };

  const handleYearFilterClick = (year: string) => {
    const newYear = filters.Year === year ? 'All' : year;
    setFilters(prev => ({ ...prev, Year: newYear }));
  };
  
  const dynamicOptions = useMemo(() => {
    if (!data) return { businessUnits: ['All'], designations: ['All'] };
    const lowercasedSapFilter = sapFilter.toLowerCase().trim();

    const baseFilteredData = data.filter(item => {
        const itemMonthName = item.Month ? String(item.Month).toUpperCase().substring(0, 3) : getMonthNameFromDate(item['End Date']);
        const itemYear = item.Year ? String(item.Year) : String(getYearFromDate(item['End Date']) || '');
        const monthMatch = filters.Month === 'All' || (itemMonthName && itemMonthName === filters.Month);
        const yearMatch = filters.Year === 'All' || (itemYear && itemYear === filters.Year);
        const sapNo = (item as any)['SAP NO.'] ?? (item as any)['SAP NO:'];
        const sapMatch = !lowercasedSapFilter || String(sapNo).toLowerCase().includes(lowercasedSapFilter);
        return monthMatch && yearMatch && sapMatch;
    });

    const buData = baseFilteredData.filter(item => 
        filters.Designation === 'All' || getDesignation(item) === filters.Designation
    );
    const businessUnitsSet = new Set<string>();
    buData.forEach(item => {
        const bu = getBusinessUnit(item);
        if (bu) businessUnitsSet.add(String(bu));
    });
    const businessUnitsList = ['All', ...Array.from(businessUnitsSet).sort()];
    if (filters['Business Units'] !== 'All' && !businessUnitsList.includes(filters['Business Units'])) {
        businessUnitsList.push(filters['Business Units']);
        businessUnitsList.sort((a,b) => a === 'All' ? -1 : b === 'All' ? 1 : a.localeCompare(b));
    }

    const designationData = baseFilteredData.filter(item => {
        const itemBU = getBusinessUnit(item);
        return filters['Business Units'] === 'All' || String(itemBU) === filters['Business Units'];
    });
    const designationsSet = new Set<string>();
    designationData.forEach(item => {
        const designation = getDesignation(item);
        if (designation) designationsSet.add(String(designation));
    });
    const designationsList = ['All', ...Array.from(designationsSet).sort()];
    if (filters.Designation !== 'All' && !designationsList.includes(filters.Designation)) {
        designationsList.push(filters.Designation);
        designationsList.sort((a,b) => a === 'All' ? -1 : b === 'All' ? 1 : a.localeCompare(b));
    }

    return {
        businessUnits: businessUnitsList,
        designations: designationsList,
    };
  }, [data, filters.Month, filters.Year, filters['Business Units'], filters.Designation, sapFilter]);
  
  useEffect(() => {
    if (filters['Business Units'] !== 'All' && !dynamicOptions.businessUnits.includes(filters['Business Units'])) {
      setFilters(prev => ({ ...prev, 'Business Units': 'All' }));
    }
  }, [filters['Business Units'], dynamicOptions.businessUnits]);

  useEffect(() => {
      if (filters.Designation !== 'All' && !dynamicOptions.designations.includes(filters.Designation)) {
        setFilters(prev => ({ ...prev, Designation: 'All' }));
      }
  }, [filters.Designation, dynamicOptions.designations]);
  
  const filteredData = useMemo(() => {
    if (!data) return [];
    const lowercasedSapFilter = sapFilter.toLowerCase().trim();

    return data.filter(item => {
      const itemMonthName = item.Month ? String(item.Month).toUpperCase().substring(0, 3) : getMonthNameFromDate(item['End Date']);
      const itemYear = item.Year ? String(item.Year) : String(getYearFromDate(item['End Date']) || '');
      
      const monthMatch = filters.Month === 'All' || (itemMonthName && itemMonthName === filters.Month);
      const yearMatch = filters.Year === 'All' || (itemYear && itemYear === filters.Year);
      
      const itemBU = getBusinessUnit(item);
      const businessUnitMatch = filters['Business Units'] === 'All' || String(itemBU) === filters['Business Units'];
      
      const designationMatch = filters.Designation === 'All' || getDesignation(item) === filters.Designation;

      const sapNo = (item as any)['SAP NO.'] ?? (item as any)['SAP NO:'];
      const sapMatch = !lowercasedSapFilter || String(sapNo).toLowerCase().includes(lowercasedSapFilter);

      return monthMatch && yearMatch && businessUnitMatch && sapMatch && designationMatch;
    });
  }, [data, filters, sapFilter]);

  const summaryData = useMemo(() => {
    const totalRevenue = filteredData.reduce((acc, item) => acc + (item.Revenue ?? 0), 0);
    const totalExpense = filteredData.reduce((acc, item) => acc + (item.Expense ?? 0), 0);
    const totalProfit = filteredData.reduce((acc, item) => acc + (item.Profit ?? 0), 0);
    const recordCount = filteredData.length;
    const totalNAmount = filteredData.reduce((acc, item) => acc + (item['N-Amount'] ?? 0), 0);
    const totalNOTAmount = filteredData.reduce((acc, item) => acc + (item['N-OTAmount'] ?? 0), 0);
    const totalHOTAmount = filteredData.reduce((acc, item) => acc + (item['H-OTAmount'] ?? 0), 0);
    const totalNHours = filteredData.reduce((acc, item) => acc + (item['N-Hours'] ?? 0), 0);
    const totalNOTHours = filteredData.reduce((acc, item) => acc + (item['N-OTHours'] ?? 0), 0);
    const totalHOTHours = filteredData.reduce((acc, item) => acc + (item['H-OTHours'] ?? 0), 0);
    
    return { 
        totalRevenue, 
        totalExpense, 
        totalProfit, 
        recordCount,
        totalNAmount,
        totalNOTAmount,
        totalHOTAmount,
        totalNHours,
        totalNOTHours,
        totalHOTHours
    };
  }, [filteredData]);

  const tableHeaders = useMemo(() => {
    switch(activeTab) {
        case TABS.SUMMARY: return summaryHeaders;
        case TABS.EARNINGS: return [...baseHeaders, ...ehrcEarningsHeaders];
        case TABS.PAYROLL: return [...baseHeaders, ...ehrcPayrollHeaders];
        case TABS.DEDUCTIONS: return [...baseHeaders, ...ctcDeductionsHeaders];
        case TABS.DETAILS:
        default:
            return [...baseHeaders, ...profitabilityHeaders];
    }
  }, [activeTab]);

  const tableData = useMemo(() => {
    if (activeTab === TABS.SUMMARY) {
      return filteredData.map(item => {
        const anyItem = item as any;
        const ehrcEarnings = anyItem['Net Amount'] ?? 0;
        const payroll = anyItem['Net Amount2'] ?? 0;
        const ctcCost = anyItem['Total'] ?? 0;
        const ehrcTotal = ehrcEarnings - (payroll + ctcCost);
        const totalSalary = payroll;

        return {
          'CTC NO.': anyItem['CTC NO.'],
          'SAP NO.': anyItem['SAP NO.'] ?? anyItem['SAP NO:'],
          'Employee Name': anyItem['EMPLOYEE NAME'],
          'Designation': getDesignation(item),
          'Business Units': getBusinessUnit(item),
          'Month': anyItem['Month'],
          'Year': anyItem['Year'],
          'EHRC Earnings': ehrcEarnings,
          'EHRC Total': ehrcTotal,
          'Payroll': payroll,
          'CTC Cost': ctcCost,
          'Total salary': totalSalary,
        };
      });
    }

    // This part is for other tabs
    return filteredData.map(item => {
        const anyItem = item as any;

        const valueProvider = (header: string): any => {
            switch(header) {
                case 'CTC NO.': return anyItem['CTC NO.'];
                case 'SAP NO.': return anyItem['SAP NO.'] ?? anyItem['SAP NO:'];
                case 'Employee Name': return anyItem['EMPLOYEE NAME'];
                case 'Designation': return getDesignation(item);
                case 'Business Units': return getBusinessUnit(item);
                case 'Month': return anyItem['Month'];
                case 'Year': return anyItem['Year'];
                case 'Revenue': return item.Revenue;
                case 'Expense': return item.Expense;
                case 'Profit': return item.Profit;
                default: return anyItem[header];
            }
        };
        
        const row: {[key: string]: any} = {};
        for (const header of tableHeaders) {
            row[header] = valueProvider(header);
        }
        return row;
    });
  }, [filteredData, tableHeaders, activeTab]);

  const handleExport = () => {
    exportToExcel(tableData, `Driver_Operator_${activeTab.replace(/\s+/g, '_')}_Export`);
  };

  const handleRowDoubleClick = (rowData: any) => {
    const originalEmployeeData = filteredData.find(emp => {
        const anyEmp = emp as any;
        // Using == for loose comparison to handle potential type mismatches (string vs number) from Excel
        const sapNoMatch = (anyEmp['SAP NO.'] ?? anyEmp['SAP NO:']) == rowData['SAP NO.'];
        const ctcNoMatch = anyEmp['CTC NO.'] == rowData['CTC NO.'];
        const monthMatch = anyEmp['Month'] == rowData['Month'];
        const yearMatch = anyEmp['Year'] == rowData['Year'];

        return sapNoMatch && ctcNoMatch && monthMatch && yearMatch;
    });

    if (originalEmployeeData) {
        setSelectedEmployee(originalEmployeeData);
    } else {
        // As a fallback, try finding with just SAP/CTC if month/year fails
        const fallbackEmployeeData = filteredData.find(emp => {
            const anyEmp = emp as any;
            const sapNoMatch = (anyEmp['SAP NO.'] ?? anyEmp['SAP NO:']) == rowData['SAP NO.'];
            const ctcNoMatch = anyEmp['CTC NO.'] == rowData['CTC NO.'];
            return sapNoMatch && ctcNoMatch;
        });
        setSelectedEmployee(fallbackEmployeeData ?? rowData as DriverOperatorData);
    }
  };

    const handleHighlightColumn = (columnName: string) => {
        setHighlightedColumn(columnName);
        if (activeTab !== TABS.EARNINGS) {
            setActiveTab(TABS.EARNINGS);
        }
        setTimeout(() => {
            tableRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
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
                <h1 className="text-lg font-bold text-white whitespace-nowrap">Driver & Operator Details</h1>
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

          {/* Business Unit Filter */}
          <div className="bg-secondary flex flex-col justify-center p-2 ml-px flex-grow">
              <label htmlFor="Business Units" className="text-sm font-bold text-white mb-1 whitespace-nowrap">Business Unit</label>
              <SearchableDropdown
                id="Business Units"
                name="Business Units"
                options={dynamicOptions.businessUnits}
                value={filters['Business Units']}
                onChange={(value) => setFilters(prev => ({...prev, 'Business Units': value}))}
                variant="detail-view"
              />
          </div>
          
          {/* Designation Filter */}
          <div className="bg-secondary flex flex-col justify-center p-2 ml-px flex-grow">
              <label htmlFor="Designation" className="text-sm font-bold text-white mb-1 whitespace-nowrap">Designation</label>
              <SearchableDropdown
                id="Designation"
                name="Designation"
                options={dynamicOptions.designations}
                value={filters.Designation}
                onChange={(value) => setFilters(prev => ({...prev, Designation: value}))}
                variant="detail-view"
              />
          </div>
        </div>
      </div>
      
      {/* Content Area: Table + Summary/Chart */}
      <div className="flex-grow flex gap-4 mt-4 min-h-0">
        
        {/* Left Column: Data Table */}
        <div className="w-4/5 flex flex-col" ref={tableRef}>
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            {Object.values(TABS).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors duration-200 shadow-md transform active:scale-95 ${
                  activeTab === tab
                    ? 'bg-accent text-white'
                    : 'bg-secondary text-gray-300 hover:bg-primary'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
          <DataTable 
            data={tableData} 
            title={`Filtered Data: ${activeTab}`} 
            headers={tableHeaders} 
            actionButton={exportButton}
            onRowDoubleClick={handleRowDoubleClick}
            highlightedColumn={highlightedColumn}
          />
        </div>

        {/* Right Column: Summary */}
        <div className="w-1/5 flex flex-col gap-4">
          <div className="bg-secondary p-4 rounded-xl shadow-lg">
            <h4 className="text-sm font-medium text-blue-300">Total Revenue</h4>
            <p className="text-xl font-bold text-blue-100">
                QAR {summaryData.totalRevenue.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
            </p>
          </div>

          <div className="-mt-2 flex flex-col gap-2"> 
                <div onClick={() => handleHighlightColumn('N-Amount')} className="bg-secondary/80 p-2 rounded-lg shadow-md cursor-pointer hover:bg-primary transition-colors" title="Click to highlight 'N-Amount' column in the table">
                    <div className="grid grid-cols-2 gap-2 text-center">
                        <div>
                            <h5 className="text-xs font-medium text-gray-400">N-Hours</h5>
                            <p className="text-base font-bold text-white">
                                {summaryData.totalNHours.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                            </p>
                        </div>
                        <div>
                            <h5 className="text-xs font-medium text-gray-400">N-Amount</h5>
                            <p className="text-base font-bold text-white">
                                {summaryData.totalNAmount.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                            </p>
                        </div>
                    </div>
                </div>
                <div onClick={() => handleHighlightColumn('N-OTAmount')} className="bg-secondary/80 p-2 rounded-lg shadow-md cursor-pointer hover:bg-primary transition-colors" title="Click to highlight 'N-OTAmount' column in the table">
                    <div className="grid grid-cols-2 gap-2 text-center">
                        <div>
                            <h5 className="text-xs font-medium text-gray-400">N-OT Hours</h5>
                            <p className="text-base font-bold text-white">
                                {summaryData.totalNOTHours.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                            </p>
                        </div>
                        <div>
                            <h5 className="text-xs font-medium text-gray-400">N-OT Amount</h5>
                            <p className="text-base font-bold text-white">
                                {summaryData.totalNOTAmount.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                            </p>
                        </div>
                    </div>
                </div>
                <div onClick={() => handleHighlightColumn('H-OTAmount')} className="bg-secondary/80 p-2 rounded-lg shadow-md cursor-pointer hover:bg-primary transition-colors" title="Click to highlight 'H-OTAmount' column in the table">
                    <div className="grid grid-cols-2 gap-2 text-center">
                        <div>
                            <h5 className="text-xs font-medium text-gray-400">H-OT Hours</h5>
                            <p className="text-base font-bold text-white">
                                {summaryData.totalHOTHours.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                            </p>
                        </div>
                        <div>
                            <h5 className="text-xs font-medium text-gray-400">H-OT Amount</h5>
                            <p className="text-base font-bold text-white">
                                {summaryData.totalHOTAmount.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

          <div className="bg-secondary p-4 rounded-xl shadow-lg">
            <h4 className="text-sm font-medium text-red-300">Total Expense</h4>
            <p className="text-xl font-bold text-red-100">
                QAR {summaryData.totalExpense.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
            </p>
          </div>
          <div className="bg-secondary p-4 rounded-xl shadow-lg">
            <h4 className="text-sm font-medium text-green-300">Total Profit</h4>
            <p className="text-xl font-bold text-green-100">
                QAR {summaryData.totalProfit.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
            </p>
          </div>

           <div className="bg-secondary p-4 rounded-xl shadow-lg flex-grow flex flex-col gap-2">
                <h3 className="text-base font-semibold text-accent -mb-1">Analysis Tools</h3>
                <div>
                    <label htmlFor="sap-filter" className="block text-sm font-medium text-gray-300">Filter by SAP No:</label>
                    <input
                        id="sap-filter"
                        type="text"
                        value={sapFilter}
                        onChange={(e) => setSapFilter(e.target.value)}
                        placeholder="Enter SAP No..."
                        className="mt-1 block w-full pl-3 pr-2 py-1 text-base bg-primary border-gray-600 text-white focus:outline-none focus:ring-accent focus:border-accent sm:text-sm rounded-md"
                    />
                </div>

                <div className="grid grid-cols-1 gap-2 text-center mt-2">
                    <div className="p-2 bg-primary rounded-lg">
                        <p className="text-xs text-gray-400 font-medium">Record Count</p>
                        <p className="text-lg font-bold text-white">{summaryData.recordCount}</p>
                    </div>
                </div>
            </div>

        </div>
      </div>
      {selectedEmployee && (
        <EmployeeSalaryCard 
          data={selectedEmployee} 
          onClose={() => setSelectedEmployee(null)} 
        />
      )}
    </div>
  );
};

export default DriverOperatorView;