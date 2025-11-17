
import React, { useState, useMemo, ReactNode, forwardRef } from 'react';

type SortDirection = 'asc' | 'desc' | null;

interface DataTableProps {
  data: any[];
  title?: string;
  headers?: string[];
  actionButton?: ReactNode;
  variant?: 'dark' | 'light';
  onRowDoubleClick?: (rowData: any) => void;
  highlightedColumn?: string | null;
}

const MONTH_NAMES_ABBR = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

// A robust cell formatter to prevent rendering raw Date objects or other objects.
const formatCellValue = (value: any, header: string): React.ReactNode => {
    // Explicitly handle null and undefined first.
    if (value === null || typeof value === 'undefined') {
        return '';
    }
    
    // Universal number formatting for currency-like columns across the app.
    // This improves readability by adding commas and fixing to 2 decimal places.
    if (
        [
            'Splited Amount', 'Revenue', 'Expense', 'Profit',
            'Total Amount w%', 'F-Revenue', 'R-Revenue', 'Vehicle Cost',
            'M-Cost', 'Fuel WPrC (F-Profit)', 'R-Profit', 'REVENUE', 'COST', 'PROFIT',
            'Total Amount', 'Total amount with Service Charge', 'Back Charge',
            'Rental/Prc', 'Act Fuel (F-Cost)', 'R-Total Cost',
            // Driver & Operator Summary Tab
            'EHRC Earnings', 'EHRC Total', 'Payroll', 'CTC Cost', 'Total salary',
            // Driver & Operator EHRC Earnings Tab
            'Monthly', 'Hourly', 'N-Price', 'N-Amount', 'N-OTPrice', 'N-OTAmount',
            'H-OTPrice', 'H-OTAmount', 'Net Amount',
            // Driver & Operator Payroll Tab
            'Basic Salary', 'Other Allowance', 'N-Price2', 'N-Amount2', 'N-OTPrice2',
            'N-OTAmount2', 'H-OTPrice2', 'H-OTAmount2', 'Net Amount2',
            // Driver & Operator CTC Deductions Tab
            'Leave', 'TKT', 'ESB', 'Accom', 'FOOD', 'Uniform', 'RP+HC',
            'MED INS', 'SAL TRF', 'WC INS', 'HO', 'Total'
        ].includes(header) && typeof value === 'number'
    ) {
        return value.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
    }

    // Handle Date objects, including invalid dates.
    if (value instanceof Date) {
        if (isNaN(value.getTime())) {
            return 'Invalid Date';
        }
        
        // FIX: Excel dates without times are often parsed as midnight UTC. In timezones
        // behind UTC, using local date methods (like .getDate()) can shift the date to
        // the previous day. Using UTC methods (.getUTCDate()) consistently retrieves
        // the correct date components regardless of the user's timezone.
        const year = value.getUTCFullYear();
        const monthIndex = value.getUTCMonth();

        // Specific formatting for 'Month' column to MMM-YY.
        if (header === 'Month') {
            const monthAbbr = MONTH_NAMES_ABBR[monthIndex];
            return `${monthAbbr}-${String(year).slice(-2)}`;
        }
        
        // Default date format to DD-MM-YYYY for other date columns.
        const day = String(value.getUTCDate()).padStart(2, '0');
        const month = String(monthIndex + 1).padStart(2, '0');
        return `${day}-${month}-${year}`;
    }
    // For any other object type, stringify it to be safe.
    if (typeof value === 'object') {
        return JSON.stringify(value);
    }
    // Fallback for primitives (string, number, boolean).
    return String(value);
};


// FIX: Wrapped component in forwardRef to allow parent components to pass a ref, which is needed for the PDF export functionality.
const DataTable = forwardRef<HTMLDivElement, DataTableProps>(({ data, title, headers: explicitHeaders, actionButton, variant = 'dark', onRowDoubleClick, highlightedColumn }, ref) => {
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: SortDirection }>({ key: '', direction: null });
  const isLight = variant === 'light';

  const themeClasses = {
      container: isLight ? 'h-full flex flex-col' : 'bg-secondary p-6 rounded-xl shadow-lg h-full flex flex-col',
      title: isLight ? 'text-xl font-semibold text-stone-800' : 'text-xl font-semibold text-accent',
      thead: isLight ? 'sticky top-0 z-10 border-b-2 border-amber-800/30' : 'bg-primary sticky top-0 z-10',
      th: isLight ? 'px-6 py-3 text-left text-xs font-medium text-stone-700 uppercase tracking-wider cursor-pointer select-none' : 'px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer select-none',
      sortIconDefault: isLight ? 'text-stone-500 opacity-50' : 'text-gray-500 opacity-50',
      tbody: isLight ? 'divide-y divide-amber-800/20' : 'bg-secondary divide-y divide-gray-700',
      tr: isLight ? 'hover:bg-amber-100/50 transition-colors duration-150 cursor-pointer' : 'hover:bg-primary transition-colors duration-150 cursor-pointer',
      td: isLight ? 'px-6 py-4 whitespace-nowrap text-sm text-stone-800' : 'px-6 py-4 whitespace-nowrap text-sm text-gray-200',
  };

  const headers = useMemo(() => {
    // If explicit headers are provided, use them. This guarantees column order.
    if (explicitHeaders) return explicitHeaders;

    if (!data || data.length === 0) return [];

    // Fallback to dynamic header generation with a stable order.
    // It collects all unique keys from the data, preserving the order of appearance.
    const allHeaders: string[] = [];
    data.forEach(row => {
        Object.keys(row).forEach(key => {
            if (!allHeaders.includes(key)) {
                allHeaders.push(key);
            }
        });
    });
    return allHeaders;
  }, [data, explicitHeaders]);

  // A more robust sorting algorithm that is type-aware
  const sortedData = useMemo(() => {
    if (!data || !sortConfig.key || !sortConfig.direction) {
        return data;
    }

    const sortableData = [...data];
    
    const getType = (value: any) => {
      if (value == null) return 'null';
      if (value instanceof Date && !isNaN(value.getTime())) return 'date';
      if (typeof value === 'number') return 'number';
      return 'string'; // Treat anything else as a string for sorting
    };
    
    sortableData.sort((a, b) => {
      const valA = a[sortConfig.key];
      const valB = b[sortConfig.key];
      
      const typeA = getType(valA);
      const typeB = getType(valB);
      
      const direction = sortConfig.direction === 'asc' ? 1 : -1;

      // Push nulls/undefined to the bottom
      if (typeA === 'null') return 1;
      if (typeB === 'null') return -1;
      
      // If types are the same, sort directly
      if (typeA === typeB) {
        switch (typeA) {
          case 'date':
            return (valA.getTime() - valB.getTime()) * direction;
          case 'number':
            return (valA - valB) * direction;
          case 'string':
            return String(valA).localeCompare(String(valB)) * direction;
        }
      }
      
      // If types are different, fall back to string comparison
      return String(valA).localeCompare(String(valB)) * direction;
    });

    return sortableData;
  }, [data, sortConfig]);

  const requestSort = (key: string) => {
    let direction: SortDirection = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    } else if (sortConfig.key === key && sortConfig.direction === 'desc') {
        direction = null; // Allow un-sorting
    }
    setSortConfig({ key, direction });
  };
  
  const getSortIcon = (key: string) => {
    if (sortConfig.key !== key || !sortConfig.direction) {
        return <span className={themeClasses.sortIconDefault}>↑↓</span>;
    }
    return sortConfig.direction === 'asc' ? '↑' : '↓';
  }

  if (!data || data.length === 0) {
    if (isLight) {
        return (
            <div className="flex items-center justify-center h-full border-2 border-dashed border-amber-300 rounded-lg bg-amber-50/50">
                <div className="text-center p-4">
                    <h3 className={themeClasses.title}>{title || 'Data Table'}</h3>
                    <p className="text-amber-800 mt-2">No data available to display for the selected filters.</p>
                    {actionButton && <div className="mt-4">{actionButton}</div>}
                </div>
            </div>
        );
    }
    return (
      <div className="bg-secondary p-6 rounded-xl shadow-lg h-full flex flex-col">
        <div className="flex justify-between items-center w-full mb-4">
            <h3 className="text-xl font-semibold text-accent">{title || 'Data Table'}</h3>
            {actionButton}
        </div>
        <div className="flex-grow flex items-center justify-center">
            <p className="text-gray-400">No data available to display for the selected filters.</p>
        </div>
      </div>
    );
  }

  return (
    <div ref={ref} className={themeClasses.container}>
      <div className="flex justify-between items-center w-full mb-4">
        <h3 className={themeClasses.title}>{title || 'Data Table'}</h3>
        {actionButton}
      </div>
      <div className="flex-grow overflow-auto">
        <table className="min-w-full">
          <thead className={themeClasses.thead}>
            <tr>
              {headers.map(header => (
                <th key={header} onClick={() => requestSort(header)} className={themeClasses.th}>
                  <div className="flex items-center">
                    {header}
                    <span className="ml-2 w-4 data-table-sort-icon">{getSortIcon(header)}</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className={themeClasses.tbody}>
            {sortedData.map((row, i) => (
              <tr 
                key={i} 
                className={themeClasses.tr}
                onDoubleClick={() => onRowDoubleClick && onRowDoubleClick(row)}
              >
                {headers.map(header => (
                  <td 
                    key={header} 
                    className={`${themeClasses.td} ${highlightedColumn === header ? 'bg-yellow-400 text-black font-bold' : ''} transition-colors duration-500`}
                  >
                    {formatCellValue(row[header], header)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
});

// FIX: Add default export to make the component available for import in other files.
export default DataTable;