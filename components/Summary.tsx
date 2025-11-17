import React, { useState, useMemo, useEffect, useRef } from 'react';
import type { InternalFleetData, DriverOperatorData, JobCardData } from '../types';
import DataTable from './DataTable';
import SearchableDropdown from './SearchableDropdown';

interface SummaryProps {
  internalData: InternalFleetData[];
  driverOperatorData: DriverOperatorData[];
  jobCardData: JobCardData[];
}

const MONTH_NAMES = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
const YEARS = ["2024", "2025", "2026"];

// --- Data Accessor Helpers ---

const getDriverOperatorBU = (item: DriverOperatorData): string | undefined => {
    const anyItem = item as any;
    return anyItem['BUSINESS UNITS'] ?? anyItem['Business Units'] ?? anyItem['BUSINESS UNIT'] ?? anyItem['Business Unit'] ?? anyItem['Client Company Name'];
};

const getDesignation = (item: DriverOperatorData): string | undefined => {
    const anyItem = item as any;
    return anyItem.DESIGNATION ?? anyItem.Designation;
};

// --- Main Component ---

const Summary: React.FC<SummaryProps> = ({ internalData, driverOperatorData, jobCardData }) => {
  const [activeReportKey, setActiveReportKey] = useState<string | null>(null);
  
  // State for dropdown menus
  const [isDriverOperatorExpanded, setIsDriverOperatorExpanded] = useState(false);
  const [isJobCardExpanded, setIsJobCardExpanded] = useState(false);
  const [isInternalFleetsExpanded, setIsInternalFleetsExpanded] = useState(false);
  
  // State for filters
  const [selectedDesignation, setSelectedDesignation] = useState('All');
  const [selectedBusinessUnit, setSelectedBusinessUnit] = useState('All');
  const [selectedMonth, setSelectedMonth] = useState('All');
  const [selectedYear, setSelectedYear] = useState('All');
  const [selectedCluster, setSelectedCluster] = useState('All');
  const [selectedFleetCategory, setSelectedFleetCategory] = useState('All');

  const driverOpDropdownRef = useRef<HTMLDivElement>(null);
  const jobCardDropdownRef = useRef<HTMLDivElement>(null);
  const internalFleetsDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        const targetNode = event.target as Node;
        if (driverOpDropdownRef.current && !driverOpDropdownRef.current.contains(targetNode)) {
            setIsDriverOperatorExpanded(false);
        }
        if (jobCardDropdownRef.current && !jobCardDropdownRef.current.contains(targetNode)) {
            setIsJobCardExpanded(false);
        }
        if (internalFleetsDropdownRef.current && !internalFleetsDropdownRef.current.contains(targetNode)) {
            setIsInternalFleetsExpanded(false);
        }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Reset secondary filters when the main report type changes
  useEffect(() => {
    setSelectedDesignation('All');
    setSelectedBusinessUnit('All');
    setSelectedCluster('All');
    setSelectedFleetCategory('All');
  }, [activeReportKey]);

  // Memoized lists for all dropdowns across all report types
  const { 
    driverOpDesignations, 
    driverOpBUs,
    jobCardBUs,
    jobCardClusters,
    internalFleetBUs,
    internalFleetCategories
  } = useMemo(() => {
    const driverOpDesignationSet = new Set<string>();
    const driverOpBUSet = new Set<string>();
    driverOperatorData?.forEach(item => {
        const designation = getDesignation(item);
        const bu = getDriverOperatorBU(item);
        if (designation) driverOpDesignationSet.add(designation);
        if (bu) driverOpBUSet.add(bu);
    });

    const jobCardBUSet = new Set<string>();
    const jobCardClusterSet = new Set<string>();
    jobCardData?.forEach(item => {
        if (item['Business Units']) jobCardBUSet.add(item['Business Units']);
        if (item.Cluster) jobCardClusterSet.add(item.Cluster);
    });

    const internalFleetBUSet = new Set<string>();
    const internalFleetCategorySet = new Set<string>();
    internalData?.forEach(item => {
        if (item['Business Units']) internalFleetBUSet.add(item['Business Units']);
        if (item.Fleet_Category) internalFleetCategorySet.add(item.Fleet_Category);
    });

    return {
        driverOpDesignations: ['All', ...Array.from(driverOpDesignationSet).sort()],
        driverOpBUs: ['All', ...Array.from(driverOpBUSet).sort()],
        jobCardBUs: ['All', ...Array.from(jobCardBUSet).sort()],
        jobCardClusters: ['All', ...Array.from(jobCardClusterSet).sort()],
        internalFleetBUs: ['All', ...Array.from(internalFleetBUSet).sort()],
        internalFleetCategories: ['All', ...Array.from(internalFleetCategorySet).sort()],
    };
  }, [driverOperatorData, jobCardData, internalData]);
  
  // Memoized report details (data, headers, title, secondary filters)
  const reportDetails = useMemo(() => {
    if (!activeReportKey) {
        return { data: [], headers: [], title: '', secondaryFilter: null };
    }

    const baseProps = { 'data-testid': 'datatable' };
    
    // --- Internal Fleets Reports ---
    if (activeReportKey.startsWith('internal-fleets')) {
        const headers = ["Reg No:", "Fleet No:", "Vehicle Description", "Business Units", "Fleet_Category", "MONTH", "YEAR", "Back Charge", "F-Revenue", "R-Revenue", "R-Profit"];
        const filtered = internalData.filter(item => {
            const itemMonth = String((item as any)['MONTH'] || '').toUpperCase().substring(0, 3);
            const itemYear = String((item as any)['YEAR'] || '');
            const monthMatch = selectedMonth === 'All' || itemMonth === selectedMonth;
            const yearMatch = selectedYear === 'All' || itemYear === selectedYear;
            const categoryMatch = activeReportKey !== 'internal-fleets-category' || selectedFleetCategory === 'All' || item.Fleet_Category === selectedFleetCategory;
            const buMatch = activeReportKey !== 'internal-fleets-bu' || selectedBusinessUnit === 'All' || item['Business Units'] === selectedBusinessUnit;
            return monthMatch && yearMatch && categoryMatch && buMatch;
        });
        const tableData = filtered.map(item => ({
            'Reg No:': item['Reg No:'], 'Fleet No:': item['Fleet No:'], 'Vehicle Description': item['Vehicle Description'], 'Business Units': item['Business Units'],
            'Fleet_Category': item.Fleet_Category, 'MONTH': (item as any)['MONTH'], 'YEAR': (item as any)['YEAR'], 'Back Charge': item['Tot Rent'],
            'F-Revenue': item['F-Revenue'], 'R-Revenue': item['R-Revenue'], 'R-Profit': item['R-Profit'],
        }));

        const secondaryFilter = (
            <div className="flex items-center gap-4">
                {activeReportKey === 'internal-fleets-category' && (
                  <div className="flex items-center gap-2">
                    <label htmlFor="fc-filter" className="font-bold text-sm">Fleet Category:</label>
                    <div className="w-64">
                        <SearchableDropdown id="fc-filter" value={selectedFleetCategory} onChange={setSelectedFleetCategory} options={internalFleetCategories} variant="summary" />
                    </div>
                  </div>
                )}
                {activeReportKey === 'internal-fleets-bu' && (
                  <div className="flex items-center gap-2">
                    <label htmlFor="bu-filter-if" className="font-bold text-sm">Business Unit:</label>
                    <div className="w-64">
                      <SearchableDropdown id="bu-filter-if" value={selectedBusinessUnit} onChange={setSelectedBusinessUnit} options={internalFleetBUs} variant="summary" />
                    </div>
                  </div>
                )}
            </div>
        );
        return { data: tableData, headers, title: 'Internal Fleets Report', secondaryFilter, ...baseProps };
    }
    
    // --- Job Cards Reports ---
    if (activeReportKey.startsWith('job-card')) {
        const headers = ["JobCard No:", "Business Units", "Cluster", "Month", "Year", "Total amount with Service Charge", "Profit"];
        const filtered = jobCardData.filter(item => {
            const itemMonth = String(item.Month || '').toUpperCase().substring(0, 3);
            const itemYear = String(item.Year || '');
            const monthMatch = selectedMonth === 'All' || itemMonth === selectedMonth;
            const yearMatch = selectedYear === 'All' || itemYear === selectedYear;
            const clusterMatch = activeReportKey !== 'job-card-cluster' || selectedCluster === 'All' || item.Cluster === selectedCluster;
            const buMatch = activeReportKey !== 'job-card-bu' || selectedBusinessUnit === 'All' || item['Business Units'] === selectedBusinessUnit;
            return monthMatch && yearMatch && clusterMatch && buMatch;
        });
        const tableData = filtered.map(item => ({
            'JobCard No:': item['JobCard No:'], 'Business Units': item['Business Units'], 'Cluster': item.Cluster, 'Month': item.Month, 'Year': item.Year,
            'Total amount with Service Charge': (item as any)['Total amount with Service Charge'] || item['Total Amount w%'], 'Profit': item.Profit,
        }));
        
        const secondaryFilter = (
            <div className="flex items-center gap-4">
                {activeReportKey === 'job-card-cluster' && (
                  <div className="flex items-center gap-2">
                    <label htmlFor="cluster-filter" className="font-bold text-sm">Cluster:</label>
                    <div className="w-64">
                      <SearchableDropdown id="cluster-filter" value={selectedCluster} onChange={setSelectedCluster} options={jobCardClusters} variant="summary" />
                    </div>
                  </div>
                )}
                {activeReportKey === 'job-card-bu' && (
                  <div className="flex items-center gap-2">
                    <label htmlFor="bu-filter-jc" className="font-bold text-sm">Business Unit:</label>
                    <div className="w-64">
                      <SearchableDropdown id="bu-filter-jc" value={selectedBusinessUnit} onChange={setSelectedBusinessUnit} options={jobCardBUs} variant="summary" />
                    </div>
                  </div>
                )}
            </div>
        );

        return { data: tableData, headers, title: 'Job Cards Report', secondaryFilter, ...baseProps };
    }

    // --- Driver & Operator Reports ---
    if (activeReportKey.startsWith('driver-operator')) {
        const headers = ["SAP NO:", "EMPLOYEE NAME", "DESIGNATION", "BUSINESS UNITS", "REVENUE", "EXPENSE", "PROFIT"];
        const filtered = driverOperatorData.filter(item => {
            const itemMonth = item['End Date'] instanceof Date ? MONTH_NAMES[item['End Date'].getUTCMonth()] : null;
            const itemYear = item['End Date'] instanceof Date ? item['End Date'].getUTCFullYear() : null;
            const monthMatch = selectedMonth === 'All' || itemMonth === selectedMonth;
            const yearMatch = selectedYear === 'All' || String(itemYear) === selectedYear;
            const designationMatch = activeReportKey !== 'driver-operator-designation' || selectedDesignation === 'All' || getDesignation(item) === selectedDesignation;
            const buMatch = activeReportKey !== 'driver-operator-bu' || selectedBusinessUnit === 'All' || getDriverOperatorBU(item) === selectedBusinessUnit;
            return monthMatch && yearMatch && designationMatch && buMatch;
        });
        const tableData = filtered.map(item => ({
            'SAP NO:': (item as any)['SAP NO:'] ?? item['SAP No.'], 
            'EMPLOYEE NAME': item['EMPLOYEE NAME'], // FIX: Removed invalid fallback to `item.Name`
            'DESIGNATION': getDesignation(item),
            'BUSINESS UNITS': getDriverOperatorBU(item), 
            'REVENUE': item.Revenue, 
            'EXPENSE': item.Expense, 
            'PROFIT': item.Profit,
        }));
        
        const secondaryFilter = (
          <div className="flex items-center gap-4">
            {activeReportKey === 'driver-operator-designation' && (
              <div className="flex items-center gap-2">
                <label htmlFor="designation-filter" className="font-bold text-sm">Designation:</label>
                <div className="w-64">
                  <SearchableDropdown id="designation-filter" value={selectedDesignation} onChange={setSelectedDesignation} options={driverOpDesignations} variant="summary" />
                </div>
              </div>
            )}
            {activeReportKey === 'driver-operator-bu' && (
              <div className="flex items-center gap-2">
                <label htmlFor="bu-filter-do" className="font-bold text-sm">Business Unit:</label>
                <div className="w-64">
                  <SearchableDropdown id="bu-filter-do" value={selectedBusinessUnit} onChange={setSelectedBusinessUnit} options={driverOpBUs} variant="summary" />
                </div>
              </div>
            )}
          </div>
        );
        return { data: tableData, headers, title: 'Driver & Operator Report', secondaryFilter, ...baseProps };
    }

    return { data: [], headers: [], title: '', secondaryFilter: null };

  }, [
    activeReportKey, internalData, driverOperatorData, jobCardData, 
    selectedMonth, selectedYear, selectedDesignation, selectedBusinessUnit, 
    selectedCluster, selectedFleetCategory, 
    driverOpDesignations, driverOpBUs, jobCardBUs, jobCardClusters, 
    internalFleetBUs, internalFleetCategories
  ]);

  // --- Reusable UI Components ---

  const MenuItem: React.FC<{ label: string; onClick?: () => void; children?: React.ReactNode; isDropdown?: boolean; isExpanded?: boolean; }> = 
    ({ label, onClick, children, isDropdown = false, isExpanded = false }) => (
    <div onClick={onClick} className="text-stone-800 font-sans text-lg tracking-wide whitespace-nowrap font-bold cursor-pointer hover:text-amber-700 hover:underline relative">
      <span className="flex items-center gap-2">
        {label}
        {isDropdown && (
          <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
        )}
      </span>
      {children}
    </div>
  );

  const SubMenuItem: React.FC<{ label: string, onClick: () => void }> = ({ label, onClick }) => (
    <div onClick={onClick} className="px-4 py-2 text-sm text-stone-800 hover:bg-amber-100 cursor-pointer">
      {label}
    </div>
  );

  return (
    <div className="bg-stone-50 text-stone-800 font-sans h-full p-4 flex flex-col border border-amber-800/50 rounded-lg shadow-inner">
      <div className="flex-shrink-0">
        <h1 className="text-xl font-sans font-bold italic text-stone-900 mb-4 text-left">Report Creation</h1>
        <div className="flex flex-row justify-between items-start gap-4 w-full pb-4 border-b border-amber-800/30">
          <div className="flex flex-row items-center gap-6">
              
              <div ref={internalFleetsDropdownRef} className="relative">
                <MenuItem label="Internal Fleets" isDropdown isExpanded={isInternalFleetsExpanded} onClick={() => setIsInternalFleetsExpanded(prev => !prev)} />
                {isInternalFleetsExpanded && (
                  <div className="absolute top-full left-0 mt-2 z-20 bg-white border border-stone-300 rounded-md shadow-lg flex flex-col w-56">
                    <SubMenuItem label="Fleet Category wise" onClick={() => { setActiveReportKey('internal-fleets-category'); setIsInternalFleetsExpanded(false); }} />
                    <SubMenuItem label="Business Unit wise" onClick={() => { setActiveReportKey('internal-fleets-bu'); setIsInternalFleetsExpanded(false); }} />
                  </div>
                )}
              </div>

              <div ref={jobCardDropdownRef} className="relative">
                <MenuItem label="Job Cards" isDropdown isExpanded={isJobCardExpanded} onClick={() => setIsJobCardExpanded(prev => !prev)} />
                {isJobCardExpanded && (
                  <div className="absolute top-full left-0 mt-2 z-20 bg-white border border-stone-300 rounded-md shadow-lg flex flex-col w-56">
                    <SubMenuItem label="Cluster wise" onClick={() => { setActiveReportKey('job-card-cluster'); setIsJobCardExpanded(false); }} />
                    <SubMenuItem label="Business Unit wise" onClick={() => { setActiveReportKey('job-card-bu'); setIsJobCardExpanded(false); }} />
                  </div>
                )}
              </div>

              <div ref={driverOpDropdownRef} className="relative">
                <MenuItem label="Drivers & Operator" isDropdown isExpanded={isDriverOperatorExpanded} onClick={() => setIsDriverOperatorExpanded(prev => !prev)} />
                {isDriverOperatorExpanded && (
                  <div className="absolute top-full left-0 mt-2 z-20 bg-white border border-stone-300 rounded-md shadow-lg flex flex-col w-56">
                    <SubMenuItem label="Designation wise" onClick={() => { setActiveReportKey('driver-operator-designation'); setIsDriverOperatorExpanded(false); }} />
                    <SubMenuItem label="Business Unit wise" onClick={() => { setActiveReportKey('driver-operator-bu'); setIsDriverOperatorExpanded(false); }} />
                  </div>
                )}
              </div>

          </div>
            <div className="flex flex-col gap-1 items-end">
                <div className="flex items-center gap-2">
                    <span className="font-bold text-xs">Month:</span>
                    <div className="flex gap-1">
                        {MONTH_NAMES.map(month => (
                            <button key={month} onClick={() => setSelectedMonth(p => p === month ? 'All' : month)} className={`px-1.5 py-0.5 text-xs font-semibold rounded-md transition-colors border ${selectedMonth === month ? 'bg-amber-200 border-amber-500' : 'bg-white hover:bg-amber-50 border-stone-300'}`}>
                                {month}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <span className="font-bold text-xs">Year:</span>
                    <div className="flex gap-1">
                        {YEARS.map(year => (
                            <button key={year} onClick={() => setSelectedYear(p => p === year ? 'All' : year)} className={`px-3 py-0.5 text-xs font-semibold rounded-md transition-colors border ${selectedYear === year ? 'bg-amber-200 border-amber-500' : 'bg-white hover:bg-amber-50 border-stone-300'}`}>
                                {year}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
        {reportDetails.secondaryFilter && (
            <div className="pt-4">{reportDetails.secondaryFilter}</div>
        )}
      </div>

      <div className="flex-grow mt-4 rounded-lg overflow-hidden min-h-0">
        {activeReportKey ? (
            <DataTable {...reportDetails} variant="light" />
        ) : (
            <div className="flex items-center justify-center h-full border-2 border-dashed border-amber-300 rounded-lg bg-amber-50/50">
                <p className="text-amber-800 text-lg">Please select a report from the labels above to view data.</p>
            </div>
        )}
      </div>
    </div>
  );
};

export default Summary;
