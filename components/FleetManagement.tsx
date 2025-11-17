import React, { useState, useMemo, useEffect } from 'react';
import type { FleetManagementData } from '../types';
import { SheetNames } from '../types';
import DataTable from './DataTable';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
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
const PIE_COLORS = ['#00BFFF', '#E000E0', '#32CD32', '#FFD700', '#FF6347', '#6A5ACD', '#20B2AA', '#FF4500'];


/**
 * Gets the abbreviated month name (e.g., "JAN") from a date value.
 * Uses UTC methods to prevent timezone shifts from affecting the result.
 * @param value The value to process, expected to be a Date object.
 * @returns The month name as a string, or null if the value is not a valid date.
 */
const getMonthName = (value: any): string | null => {
    if (value instanceof Date && !isNaN(value.getTime())) {
        return MONTH_NAMES[value.getUTCMonth()];
    }
    return null;
};

/**
 * Gets the year from a date value.
 * Uses UTC methods to prevent timezone shifts from affecting the result.
 * @param value The value to process, expected to be a Date object.
 * @returns The year as a number, or null if the value is not a valid date.
 */
const getYear = (value: any): number | null => {
    if (value instanceof Date && !isNaN(value.getTime())) {
        return value.getUTCFullYear();
    }
    return null;
};


// FIX: Define the props interface for the FleetManagement component.
interface FleetManagementProps {
  data: FleetManagementData[];
  sharedFilters: { month: string; year: string; businessUnit: string; };
  setActiveView: (view: SheetNames) => void;
}

const FleetManagement: React.FC<FleetManagementProps> = ({ data, sharedFilters, setActiveView }) => {
  const [filters, setFilters] = useState({
    Month: sharedFilters.month,
    Year: sharedFilters.year,
    'Business Units': sharedFilters.businessUnit,
  });

  useEffect(() => {
    setFilters(prev => ({
      ...prev,
      Month: sharedFilters.month,
      Year: sharedFilters.year,
      'Business Units': sharedFilters.businessUnit
    }));
  }, [sharedFilters]);

  const handleMonthFilterClick = (month: string) => {
    // If the user clicks the currently active month, toggle it off (back to 'All').
    const newMonth = filters.Month === month ? 'All' : month;
    setFilters(prev => ({ ...prev, Month: newMonth }));
  };

  const handleYearFilterClick = (year: string) => {
    const newYear = filters.Year === year ? 'All' : year;
    setFilters(prev => ({ ...prev, Year: newYear }));
  };

  const dynamicOptions = useMemo(() => {
    if (!data) return { businessUnits: ['All'] };
    
    const dateFilteredData = data.filter(item => {
        const itemMonthName = getMonthName(item.Month);
        const itemYear = getYear(item.Month);
        
        const monthMatch = filters.Month === 'All' || itemMonthName === filters.Month;
        const yearMatch = filters.Year === 'All' || String(itemYear) === filters.Year;
        return monthMatch && yearMatch;
    });

    const businessUnits = new Set<string>();
    dateFilteredData.forEach(item => {
      if(item['Business Units']) businessUnits.add(String(item['Business Units']));
    });
    
    return {
      businessUnits: ['All', ...Array.from(businessUnits).sort()],
    }
  }, [data, filters.Month, filters.Year]);
  
  useEffect(() => {
    if (filters['Business Units'] !== 'All' && !dynamicOptions.businessUnits.includes(filters['Business Units'])) {
      setFilters(prev => ({ ...prev, 'Business Units': 'All' }));
    }
  }, [filters['Business Units'], dynamicOptions.businessUnits]);

  const filteredData = useMemo(() => {
    if (!data) return [];
    return data.filter(item => {
      // Filter criteria matches
      const itemMonthName = getMonthName(item.Month);
      const itemYear = getYear(item.Month);
      
      const monthMatch = filters.Month === 'All' || itemMonthName === filters.Month;
      const yearMatch = filters.Year === 'All' || String(itemYear) === filters.Year;
      const businessUnitMatch = filters['Business Units'] === 'All' || String(item['Business Units']) === filters['Business Units'];

      return monthMatch && yearMatch && businessUnitMatch;
    });
  }, [data, filters]);

  const summaryData = useMemo(() => {
    const totalAmount = filteredData.reduce((acc, item) => acc + (item['Splited Amount'] || 0), 0);
    const totalFleetsQty = filteredData.reduce((acc, item) => acc + (item['Fleets Qty'] || 0), 0);

    let percentage = 0;
    let pieChartData: {name: string, value: number}[] = [];
    let percentageColor = '#E000E0'; // Default to accent-secondary

    // Only perform month-specific calculations if a month is selected to get the correct totals for the pie chart and percentage.
    if (filters.Month !== 'All' && data) {
      // First, get all data for the selected month/year, ignoring the Business Unit filter.
      // This is the basis for the pie chart and the denominator for the percentage calculation.
      const monthFilteredData = data.filter(item => {
        const itemMonthName = getMonthName(item.Month);
        const itemYear = getYear(item.Month);
        const monthMatch = itemMonthName === filters.Month;
        const yearMatch = filters.Year === 'All' || String(itemYear) === filters.Year;
        return monthMatch && yearMatch;
      });

      const totalMonthAmount = monthFilteredData.reduce((acc, item) => acc + (item['Splited Amount'] || 0), 0);

      // Calculate percentage only if a specific Business Unit is also selected.
      if (filters['Business Units'] !== 'All' && totalMonthAmount > 0) {
        percentage = (totalAmount / totalMonthAmount) * 100;
      }

      // Aggregate data by Business Unit for the pie chart.
      const aggregatedByBU = monthFilteredData.reduce((acc, item) => {
        const bu = String(item['Business Units']);
        const shortName = item['Short Name'] ? String(item['Short Name']) : bu;
        const amount = item['Splited Amount'] || 0;
        if (bu && amount > 0) { // Only include if there's an amount
            if (!acc[bu]) {
                acc[bu] = { value: 0, shortName: shortName };
            }
            acc[bu].value += amount;
        }
        return acc;
      }, {} as { [key: string]: { value: number, shortName: string } });

      pieChartData = Object.entries(aggregatedByBU)
        // FIX: Explicitly type the destructured `data` parameter to resolve TypeScript's `unknown` type inference
        // for values from Object.entries on an object with an index signature. This ensures type safety.
        .map(([fullName, data]: [string, { shortName: string; value: number }]) => ({ name: data.shortName, value: data.value }))
        .filter(item => item.value > 0) // Ensure no zero-value slices are in the pie chart data
        .sort((a, b) => b.value - a.value); // Sort descending

      // Determine the color for the percentage text based on the selected Business Unit's slice
      if (filters['Business Units'] !== 'All') {
        const selectedBUData = aggregatedByBU[filters['Business Units']];
        if (selectedBUData) {
            const selectedShortName = selectedBUData.shortName;
            const selectedIndex = pieChartData.findIndex(item => item.name === selectedShortName);
            if (selectedIndex !== -1) {
                percentageColor = PIE_COLORS[selectedIndex % PIE_COLORS.length];
            }
        }
      }
    }

    return { totalAmount, totalFleetsQty, percentage, pieChartData, percentageColor };
  }, [data, filteredData, filters]);


  const tableData = useMemo(() => {
    // Return a new array of objects containing only the desired columns and non-zero amounts.
    return filteredData
      .filter(item => item['Splited Amount'] > 0)
      .map(item => ({
        'Month': item.Month,
        'Business Units': item['Business Units'],
        'Fleets Qty': item['Fleets Qty'],
        'Splited Amount': item['Splited Amount'],
      }));
  }, [filteredData]);

  const handleExport = () => {
    exportToExcel(tableData, 'Fleet_Management_Export');
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

  const renderPieChart = () => {
    if (summaryData.pieChartData.length === 0) {
      return <p className="text-gray-400 h-full flex items-center justify-center">Select a month to see the breakdown.</p>;
    }

    return (
      <ResponsiveContainer width="100%" height="90%">
        <PieChart>
          <Tooltip
            cursor={{ fill: 'rgba(255, 255, 255, 0.1)' }}
            contentStyle={{ backgroundColor: '#14082E', border: '1px solid #4A3A6D', color: 'white' }}
            formatter={(value: number) => `QAR ${value.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`}
          />
          <Legend 
            layout="horizontal" 
            align="center" 
            verticalAlign="bottom" 
            wrapperStyle={{ fontSize: '10px', lineHeight: '1.2', paddingTop: '10px' }}
          />
          <Pie
            data={summaryData.pieChartData}
            cx="50%"
            cy="50%"
            innerRadius={75}
            outerRadius={119}
            fill="#8884d8"
            paddingAngle={5}
            dataKey="value"
            nameKey="name"
          >
            {summaryData.pieChartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    );
  };


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
                <h1 className="text-lg font-bold text-white whitespace-nowrap">Fleet Management Fees</h1>
          </div>
          
          {/* Month Filters */}
          <div className="bg-white/10 p-px">
            <div className="grid grid-cols-6 gap-px">
              {MONTH_NAMES.slice(0, 6).map(month => (
                <button
                  key={month}
                  onClick={() => handleMonthFilterClick(month)}
                  className={`px-3 py-1 text-center text-xs font-semibold transition-all duration-200 ${
                    filters.Month === month
                    ? 'bg-accent text-white'
                    : 'bg-secondary hover:bg-accent/50'
                  }`}
                >
                  {month}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-6 gap-px mt-px">
              {MONTH_NAMES.slice(6, 12).map(month => (
                <button
                  key={month}
                  onClick={() => handleMonthFilterClick(month)}
                  className={`px-3 py-1 text-center text-xs font-semibold transition-all duration-200 ${
                    filters.Month === month
                    ? 'bg-accent text-white'
                    : 'bg-secondary hover:bg-accent/50'
                  }`}
                >
                  {month}
                </button>
              ))}
            </div>
          </div>

          {/* Year Filters */}
          <div className="bg-white/10 p-px ml-px flex flex-col justify-center">
            <div className="grid grid-cols-3 gap-px">
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
          <div className="bg-secondary flex flex-col justify-center p-2 ml-px">
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
        <div className="w-2/3 flex flex-col">
          <DataTable data={tableData} title="Filtered Fleet Data" actionButton={exportButton} />
        </div>

        {/* Right Column: Summary & Chart */}
        <div className="w-1/3 flex flex-col gap-4">
          <div className="bg-secondary p-4 rounded-xl shadow-lg">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="text-sm font-medium text-gray-300">Total Filtered Amount</h4>
                <p className="text-2xl font-bold text-accent">
                  {summaryData.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
              <div className="text-right">
                <h4 className="text-sm font-medium text-gray-300">Fleet Qty</h4>
                <p className="text-2xl font-bold text-accent">
                  {summaryData.totalFleetsQty.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-secondary p-4 rounded-xl shadow-lg flex-grow flex flex-col min-h-0">
            <h3 className="text-base font-light italic tracking-tight text-accent mb-1 flex-shrink-0">
              Business Unit Breakdown ({filters.Month !== 'All' ? `${filters.Month}` : 'All Months'}
              {filters.Year !== 'All' ? ` ${filters.Year}` : ''})
            </h3>
            <div className="flex-grow min-h-0 relative flex items-center justify-center">
                {renderPieChart()}
                {filters.Month !== 'All' && filters['Business Units'] !== 'All' && summaryData.percentage > 0 && (
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none">
                    <p 
                      className="text-2xl font-bold" 
                      style={{ color: summaryData.percentageColor, textShadow: '0 0 5px rgba(0,0,0,0.7)' }}
                    >
                      {summaryData.percentage.toFixed(2)}%
                    </p>
                  </div>
                )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FleetManagement;
