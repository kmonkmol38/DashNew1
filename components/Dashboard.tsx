import React, { useMemo, useEffect } from 'react';
import type { ExcelData, DashboardData, DriverOperatorData } from '../types';
import { SheetNames } from '../types';
import InfoCard from './InfoCard';
import type { SharedFilterState } from '../App';
import DesignationSummary from './DesignationSummary';
import SearchableDropdown from './SearchableDropdown';

interface DashboardProps {
    data: DashboardData[];
    allData: ExcelData;
    filters: SharedFilterState;
    setFilters: React.Dispatch<React.SetStateAction<SharedFilterState>>;
    setActiveView: (view: SheetNames) => void;
}

const getBusinessUnit = (item: any): string | undefined => {
    // Check for multiple common variations of the 'Business Unit' column name
    // to handle inconsistencies in the source Excel file.
    return item['BUSINESS UNITS']
        ?? item['Business Units']
        ?? item['BUSINESS UNIT']
        ?? item['Business Unit']
        ?? item['Client Company Name']; // Fallback for Driver & Operator sheet
};

const MONTH_NAMES_ABBR = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
const YEARS = ["2024", "2025", "2026"];

const getItemDate = (item: any): Date | null => {
    // Check for common date fields across all sheets, prioritizing actual Date objects.
    if (item['End Date'] instanceof Date && !isNaN(item['End Date'].getTime())) return item['End Date'];
    if (item['Month'] instanceof Date && !isNaN(item['Month'].getTime())) return item['Month'];
    if (item['DATE'] instanceof Date && !isNaN(item['DATE'].getTime())) return item['DATE'];
    if (item['Date:'] instanceof Date && !isNaN(item['Date:'].getTime())) return item['Date:'];

    // Fallback for sheets that use separate Month (string) and Year (number/string) columns.
    // Handles 'Internal Fleets' using MONTH/YEAR and 'External Fleets' using Month/Year.
    const monthStr = item['MONTH'] ?? item['Month'];
    const yearVal = item['YEAR'] ?? item['Year'];
    
    if (typeof monthStr === 'string' && yearVal != null) {
        const yearNum = parseInt(String(yearVal), 10); // Coerce year to a number
        
        // Ensure year is a valid number before proceeding
        if (!isNaN(yearNum)) {
            const monthIndex = MONTH_NAMES_ABBR.indexOf(String(monthStr).toUpperCase().substring(0, 3));
            if (monthIndex > -1) {
                return new Date(Date.UTC(yearNum, monthIndex, 15)); // Use UTC to prevent timezone shifts
            }
        }
    }
    
    return null;
};


const Dashboard: React.FC<DashboardProps> = ({ allData, filters, setFilters, setActiveView }) => {

    const dynamicBusinessUnits = useMemo(() => {
        if (!allData) return ['All'];

        const buSet = new Set<string>();

        // Filter function for standard sheets, only by date
        const filterByDate = (item: any) => {
            if (filters.month === 'All' && filters.year === 'All') {
                return true;
            }
            const itemDate = getItemDate(item);
            if (!itemDate) return false;
            const itemMonthName = MONTH_NAMES_ABBR[itemDate.getUTCMonth()];
            const itemYear = itemDate.getUTCFullYear();
            const monthMatch = filters.month === 'All' || itemMonthName === filters.month;
            const yearMatch = filters.year === 'All' || String(itemYear) === filters.year;
            return monthMatch && yearMatch;
        };
        
        // Filter function for Job Card, only by date
        const filterJobCardByDate = (item: any) => {
            if (filters.month === 'All' && filters.year === 'All') {
                return true;
            }
            const itemMonthName = String(item.Month || '').toUpperCase().substring(0, 3);
            const itemYear = String(item.Year || '');
            if (!itemMonthName || !itemYear) return false;
            const monthMatch = filters.month === 'All' || itemMonthName === filters.month;
            const yearMatch = filters.year === 'All' || itemYear === filters.year;
            return monthMatch && yearMatch;
        };

        const sheetsToProcess: { [key in keyof ExcelData]?: (item: any) => boolean } = {
            'Driver & Operator': filterByDate,
            'Fleet Management': filterByDate,
            'Job Card': filterJobCardByDate,
            'Internal Fleets': filterByDate,
            'External Fleets': filterByDate,
        };

        for (const sheetName in sheetsToProcess) {
            const sheetData = allData[sheetName as keyof ExcelData] as any[];
            const filterFn = sheetsToProcess[sheetName as keyof typeof sheetsToProcess];
            if (sheetData && filterFn) {
                sheetData.filter(filterFn).forEach(item => {
                    const bu = getBusinessUnit(item);
                    if (bu) buSet.add(bu);
                });
            }
        }

        return ['All', ...Array.from(buSet).sort()];
    }, [allData, filters.month, filters.year]);

    useEffect(() => {
        // When the available business units change, if the currently selected one
        // is no longer in the list, reset the filter to 'All'.
        if (filters.businessUnit !== 'All' && !dynamicBusinessUnits.includes(filters.businessUnit)) {
            setFilters(prev => ({ ...prev, businessUnit: 'All' }));
        }
    }, [dynamicBusinessUnits, filters.businessUnit, setFilters]);

    const metrics = useMemo(() => {
        if (!allData) return null;

        // Generic filter for sheets that use a standard Date object column.
        const filterByBUAndDate = (item: any) => {
            const buMatch = filters.businessUnit === 'All' || getBusinessUnit(item) === filters.businessUnit;
            if (!buMatch) return false;

            if (filters.month === 'All' && filters.year === 'All') {
                return true;
            }
            
            const itemDate = getItemDate(item);
            if (!itemDate) return false;

            const itemMonthName = MONTH_NAMES_ABBR[itemDate.getUTCMonth()];
            const itemYear = itemDate.getUTCFullYear();
            
            const monthMatch = filters.month === 'All' || itemMonthName === filters.month;
            const yearMatch = filters.year === 'All' || String(itemYear) === filters.year;

            return monthMatch && yearMatch;
        };
        
        // Specific filter for the 'Job Card' sheet to use its dedicated Month and Year columns,
        // ignoring any other date-like columns as requested.
        const filterJobCardByBUAndDate = (item: any) => {
            const buMatch = filters.businessUnit === 'All' || getBusinessUnit(item) === filters.businessUnit;
            if (!buMatch) return false;

            if (filters.month === 'All' && filters.year === 'All') {
                return true;
            }
            
            const itemMonthName = String(item.Month || '').toUpperCase().substring(0, 3);
            const itemYear = String(item.Year || '');
            
            if (!itemMonthName || !itemYear) return false;
            
            const monthMatch = filters.month === 'All' || itemMonthName === filters.month;
            const yearMatch = filters.year === 'All' || itemYear === filters.year;

            return monthMatch && yearMatch;
        };

        const filtered = {
            driverOp: allData['Driver & Operator'].filter(filterByBUAndDate),
            fleetMgmt: allData['Fleet Management'].filter(filterByBUAndDate),
            jobCard: allData['Job Card'].filter(filterJobCardByBUAndDate),
            internal: allData['Internal Fleets'].filter(filterByBUAndDate),
            external: allData['External Fleets'].filter(filterByBUAndDate),
        };

        // Per user request, Job Card metrics are now derived directly from Total Amount and Profit.
        const jobCardRevenue = filtered.jobCard.reduce((sum, i) => {
            // Accommodate both possible column names for robust data handling.
            const totalAmount = (i as any)['Total amount with Service Charge'] || i['TOTAL AMOUNT WITH SERVICE CHARGE'] || 0;
            return sum + totalAmount;
        }, 0);
        
        const jobCardProfit = filtered.jobCard.reduce((sum, i) => sum + (i.Profit || 0), 0);
        
        // Cost is now calculated as the difference between revenue and profit.
        const jobCardCost = jobCardRevenue - jobCardProfit;

        // Helper to robustly get a value from an object, checking for both TitleCase and UPPERCASE keys.
        // This handles inconsistencies in the source Excel file's column naming.
        const getCaseInsensitiveValue = (item: any, keyTitleCase: string): number => {
            const keyUpperCase = keyTitleCase.toUpperCase();
            // Per user request, prioritize UPPERCASE keys (e.g., 'REVENUE') over TitleCase for Driver & Operator data.
            return item[keyUpperCase] ?? item[keyTitleCase] ?? 0;
        };
        
        // Fleet Management calculations including quantity and percentage
        const fleetManagementRevenue = filtered.fleetMgmt.reduce((sum, i) => sum + (i['Splited Amount'] || 0), 0);
        const fleetManagementQty = filtered.fleetMgmt.reduce((sum, i) => sum + (i['Fleets Qty'] || 0), 0);
        let fleetManagementPercentage = 0;
        
        if (filters.month !== 'All' && filters.businessUnit !== 'All' && allData['Fleet Management']) {
            const monthFilteredDataForPercentage = allData['Fleet Management'].filter(item => {
                const itemDate = getItemDate(item);
                if (!itemDate) return false;
                const itemMonthName = MONTH_NAMES_ABBR[itemDate.getUTCMonth()];
                const itemYear = itemDate.getUTCFullYear();
                const monthMatch = itemMonthName === filters.month;
                const yearMatch = filters.year === 'All' || String(itemYear) === filters.year;
                return monthMatch && yearMatch;
            });

            const totalMonthAmount = monthFilteredDataForPercentage.reduce((sum, i) => sum + (i['Splited Amount'] || 0), 0);
            if (totalMonthAmount > 0) {
                fleetManagementPercentage = (fleetManagementRevenue / totalMonthAmount) * 100;
            }
        }

        const revenueCards = {
            driverOperator: filtered.driverOp.reduce((sum, i) => sum + getCaseInsensitiveValue(i, 'Revenue'), 0),
            external: filtered.external.reduce((sum, i) => sum + getCaseInsensitiveValue(i, 'Revenue'), 0),
            internalRental: filtered.internal.reduce((sum, i) => sum + (i['R-Revenue'] || 0), 0),
            internalFuel: filtered.internal.reduce((sum, i) => sum + (i['F-Revenue'] || 0), 0),
            jobCard: jobCardRevenue,
            fleetManagement: fleetManagementRevenue,
        };
        const totalRevenue = Object.values(revenueCards).reduce((sum, val) => sum + val, 0);
        
        const costCards = {
            driverOperator: filtered.driverOp.reduce((sum, i) => sum + getCaseInsensitiveValue(i, 'Expense'), 0),
            external: filtered.external.reduce((sum, i) => sum + getCaseInsensitiveValue(i, 'Cost'), 0),
            internalRental: filtered.internal.reduce((sum, i) => sum + (i['Vehicle Cost'] || 0) + (i['M-Cost'] || 0), 0),
            internalFuel: filtered.internal.reduce((sum, i) => sum + (i['Act Fuel (F-Cost)'] || 0), 0),
            jobCard: jobCardCost,
            fleetManagement: 0,
        };
        const totalCost = Object.values(costCards).reduce((sum, val) => sum + val, 0);

        const profitCards = {
            driverOperator: filtered.driverOp.reduce((sum, i) => sum + getCaseInsensitiveValue(i, 'Profit'), 0),
            external: filtered.external.reduce((sum, i) => sum + getCaseInsensitiveValue(i, 'Profit'), 0),
            internalRental: filtered.internal.reduce((sum, i) => sum + (i['R-Profit'] || 0), 0),
            internalFuel: filtered.internal.reduce((sum, i) => sum + (i['Fuel WPrC (F-Profit)'] || 0), 0),
            jobCard: jobCardProfit,
            fleetManagement: revenueCards.fleetManagement - costCards.fleetManagement,
        };
        const totalProfit = Object.values(profitCards).reduce((sum, val) => sum + val, 0);
        
        const counts = {
            driverOperator: filtered.driverOp.length,
            externalInvoice: new Set(filtered.external.map(i => i['Invoice Number:'])).size,
            jobCards: filtered.jobCard.length,
        };

        return { 
            revenue: revenueCards, 
            cost: costCards, 
            profit: profitCards,
            counts,
            totalRevenue, 
            totalCost, 
            totalProfit,
            fleetManagementQty,
            fleetManagementPercentage,
            filteredDriverOp: filtered.driverOp,
        };

    }, [allData, filters.businessUnit, filters.month, filters.year]);

    const formatCurrency = (value: number | undefined) => {
        if (typeof value !== 'number' || isNaN(value)) return '-';
        return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    const businessUnitTitle = filters.businessUnit === 'All' ? 'All Business Units' : filters.businessUnit;

    const cardMappings: { [key: string]: { view: SheetNames, type?: 'Rental' | 'Fuel' } } = {
        "Driver & Operator": { view: SheetNames.DriverOperator },
        "External": { view: SheetNames.ExternalFleets },
        "Internal Rental": { view: SheetNames.InternalFleets, type: 'Rental' },
        "Internal Fuel": { view: SheetNames.InternalFleets, type: 'Fuel' },
        "Job Card": { view: SheetNames.JobCard },
        "Fleet Management Fees": { view: SheetNames.FleetManagement },
    };

    const handleDoubleClick = (mapping?: { view: SheetNames, type?: 'Rental' | 'Fuel' }) => {
        if (mapping) {
            // When navigating to Internal Fleets, set the specific type.
            // For all other views, or when no type is specified, reset it to 'All'.
            const newType = mapping.view === SheetNames.InternalFleets && mapping.type ? mapping.type : 'All';
            // Reset designation when navigating away from the dashboard to another view.
            setFilters(prev => ({ ...prev, internalType: newType, designation: 'All' }));
            setActiveView(mapping.view);
        }
    };
    
    const handleDesignationClick = (designation: string) => {
        setFilters(prev => ({ ...prev, designation: designation }));
        setActiveView(SheetNames.DriverOperator);
    };

    const cardData = {
        revenue: [
            { title: "Driver & Operator", value: formatCurrency(metrics?.revenue.driverOperator), subValue: `${metrics?.counts.driverOperator || 0} Drivers`, titleBgColor: "bg-theme-1" },
            { title: "External", value: formatCurrency(metrics?.revenue.external), subValue: `${metrics?.counts.externalInvoice || 0} Invoices`, titleBgColor: "bg-theme-2" },
            { title: "Internal Rental", value: formatCurrency(metrics?.revenue.internalRental), titleBgColor: "bg-theme-3" },
            { title: "Internal Fuel", value: formatCurrency(metrics?.revenue.internalFuel), titleBgColor: "bg-theme-4" },
            { title: "Job Card", value: formatCurrency(metrics?.revenue.jobCard), subValue: `${metrics?.counts.jobCards || 0} JobCards`, titleBgColor: "bg-theme-5", titleTextColor: "text-black" },
            { 
                title: "Fleet Management Fees", 
                value: formatCurrency(metrics?.revenue.fleetManagement), 
                titleBgColor: "bg-theme-6", 
                titleTextColor: "text-black",
                topLeftBadge: metrics?.fleetManagementQty,
                topRightBadge: (metrics?.fleetManagementPercentage ?? 0) > 0 ? `${metrics?.fleetManagementPercentage.toFixed(1)}%` : undefined,
            },
            { title: "Total Amount", value: formatCurrency(metrics?.totalRevenue), titleBgColor: "bg-[#CE8C68]", titleTextColor: "text-black" },
        ],
        cost: [
            { title: "Driver & Operator", value: formatCurrency(metrics?.cost.driverOperator), titleBgColor: "bg-theme-1" },
            { title: "External", value: formatCurrency(metrics?.cost.external), titleBgColor: "bg-theme-2" },
            { title: "Internal Rental", value: formatCurrency(metrics?.cost.internalRental), titleBgColor: "bg-theme-3" },
            { title: "Internal Fuel", value: formatCurrency(metrics?.cost.internalFuel), titleBgColor: "bg-theme-4" },
            { title: "Job Card", value: formatCurrency(metrics?.cost.jobCard), titleBgColor: "bg-theme-5", titleTextColor: "text-black" },
            { title: "Fleet Management Fees", value: formatCurrency(metrics?.cost.fleetManagement), titleBgColor: "bg-theme-6", titleTextColor: "text-black" },
            { title: "Total Amount", value: formatCurrency(metrics?.totalCost), titleBgColor: "bg-[#CE8C68]", titleTextColor: "text-black" },
        ],
        profit: [
            { title: "Driver & Operator", value: formatCurrency(metrics?.profit.driverOperator), titleBgColor: "bg-theme-1" },
            { title: "External", value: formatCurrency(metrics?.profit.external), titleBgColor: "bg-theme-2" },
            { title: "Internal Rental", value: formatCurrency(metrics?.profit.internalRental), titleBgColor: "bg-theme-3" },
            { title: "Internal Fuel", value: formatCurrency(metrics?.profit.internalFuel), titleBgColor: "bg-theme-4" },
            { title: "Job Card", value: formatCurrency(metrics?.profit.jobCard), titleBgColor: "bg-theme-5", titleTextColor: "text-black" },
            { title: "Fleet Management Fees", value: formatCurrency(metrics?.profit.fleetManagement), titleBgColor: "bg-theme-6", titleTextColor: "text-black" },
            { title: "Total Amount", value: formatCurrency(metrics?.totalProfit), titleBgColor: "bg-[#CE8C68]", titleTextColor: "text-black" },
        ]
    };

    return (
        <div className="flex flex-col h-full">
            {/* 10% Filter Section */}
            <div className="h-[10%] flex-shrink-0 flex items-center">
                <div className="w-full bg-secondary p-2 rounded-lg flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                        <label htmlFor="bu-dropdown-dash" className="font-medium text-gray-300 whitespace-nowrap">Business Unit:</label>
                        <div className="w-64">
                            <SearchableDropdown
                                id="bu-dropdown-dash"
                                options={dynamicBusinessUnits}
                                value={filters.businessUnit}
                                onChange={(value) => setFilters(prev => ({...prev, businessUnit: value}))}
                                variant="dashboard"
                            />
                        </div>
                    </div>
                    <div className="flex flex-col gap-1 items-end">
                         <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-300 text-xs">Month:</span>
                            <div className="flex gap-1">
                                {MONTH_NAMES_ABBR.map(month => (
                                    <button 
                                        key={month} 
                                        onClick={() => setFilters(prev => ({...prev, month: prev.month === month ? 'All' : month}))}
                                        className={`px-1.5 py-0.5 text-xs font-semibold rounded-md transition-colors ${
                                            filters.month === month ? 'bg-accent text-white' : 'bg-primary hover:bg-accent/50'
                                        }`}
                                    >
                                        {month}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-300 text-xs">Year:</span>
                            <div className="flex gap-1">
                                {YEARS.map(year => (
                                    <button 
                                        key={year} 
                                        onClick={() => setFilters(prev => ({...prev, year: prev.year === year ? 'All' : year}))}
                                        className={`px-3 py-0.5 text-xs font-semibold rounded-md transition-colors ${
                                            filters.year === year ? 'bg-accent text-white' : 'bg-primary hover:bg-accent/50'
                                        }`}
                                    >
                                        {year}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* 60% Metrics Section */}
            <div className="h-[60%] flex-shrink-0 flex flex-col justify-around">
                {/* Revenue Section */}
                <section>
                    <div className="flex justify-between items-center">
                        <h3 className="text-2xl font-bold text-accent font-display italic">Revenue</h3>
                        <h4 className="text-lg font-semibold text-gray-300 italic">{businessUnitTitle}</h4>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-1 p-1 bg-primary">
                        {cardData.revenue.map(card => <InfoCard key={card.title} {...card} onDoubleClick={() => handleDoubleClick(cardMappings[card.title])}/>)}
                    </div>
                </section>
                
                {/* Cost Section */}
                <section>
                    <div className="flex justify-between items-center">
                        <h3 className="text-2xl font-bold text-accent font-display italic">Cost</h3>
                            <h4 className="text-lg font-semibold text-gray-300 italic">{businessUnitTitle}</h4>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-1 p-1 bg-primary">
                            {cardData.cost.map(card => <InfoCard key={card.title} {...card} onDoubleClick={() => handleDoubleClick(cardMappings[card.title])}/>)}
                    </div>
                </section>

                {/* Profit Section */}
                <section>
                    <div className="flex justify-between items-center">
                        <h3 className="text-2xl font-bold text-accent font-display italic">Profit</h3>
                        <h4 className="text-lg font-semibold text-gray-300 italic">{businessUnitTitle}</h4>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-1 p-1 bg-primary">
                        {cardData.profit.map(card => <InfoCard key={card.title} {...card} onDoubleClick={() => handleDoubleClick(cardMappings[card.title])}/>)}
                    </div>
                </section>
            </div>

            {/* 30% Summary Section */}
            <div className="h-[30%] flex-shrink-0 overflow-y-auto">
                {metrics?.filteredDriverOp && <DesignationSummary data={metrics.filteredDriverOp} onDesignationClick={handleDesignationClick} />}
            </div>
        </div>
    );
};

export default Dashboard;
