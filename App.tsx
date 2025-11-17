

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import type { ExcelData, ExternalFleetData, DriverOperatorData, JobCardData } from './types';
import { SheetNames } from './types';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import DataView from './components/DataView';
import Summary from './components/Summary';
import FleetManagement from './components/FleetManagement';
import DriverOperatorView from './components/DriverOperatorView';
import JobCardView from './components/JobCardView';
import InternalFleetsView from './components/InternalFleetsView';
import CostDetailView from './components/CostDetailView';

// XLSX is loaded from CDN
declare const XLSX: any;

// --- IndexedDB Utility Functions ---
// Using IndexedDB to support larger files that exceed localStorage quotas.

const DB_NAME = 'ExcelDataDB';
const STORE_NAME = 'fileDataStore';
const DB_VERSION = 1;

/**
 * Opens a connection to the IndexedDB database.
 * Handles database creation and upgrades.
 */
const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(new Error('Failed to open IndexedDB.'));
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
};

/**
 * Retrieves a value from IndexedDB by key.
 */
const idbGet = async <T,>(key: IDBValidKey): Promise<T | undefined> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(key);
    
    transaction.oncomplete = () => {
      db.close();
      resolve(request.result as T | undefined);
    };
    transaction.onerror = () => {
      db.close();
      reject(transaction.error);
    };
  });
};

/**
 * Sets a value in IndexedDB for a given key.
 */
const idbSet = async (key: IDBValidKey, value: any): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    store.put(value, key); // Using put to insert or update

    transaction.oncomplete = () => {
      db.close();
      resolve();
    };
    transaction.onerror = () => {
      db.close();
      reject(transaction.error);
    };
  });
};

/**
 * Clears all data from the IndexedDB object store.
 */
const idbClear = async (): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    store.clear();

    transaction.oncomplete = () => {
      db.close();
      resolve();
    };
    transaction.onerror = () => {
      db.close();
      reject(transaction.error);
    };
  });
};


// Inlined worker script to prevent cross-origin errors in sandboxed environments.
const workerScript = `
// Load the xlsx library from the CDN
importScripts('https://unpkg.com/xlsx/dist/xlsx.full.min.js');

// These enums/types need to be defined in the worker scope
const SheetNames = {
    Dashboard: 'Dashboard',
    FleetManagement: 'Fleet Management',
    DriverOperator: 'Driver & Operator',
    JobCard: 'Job Card',
    InternalFleets: 'Internal Fleets',
    ExternalFleets: 'External Fleets',
    Summary: 'Summary'
};

self.onmessage = async (e) => {
    const file = e.data;
    if (!file) {
        postMessage({ type: 'error', error: 'No file received by worker.' });
        return;
    }

    try {
        const data = new Uint8Array(await file.arrayBuffer());
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });

        const parsedData = {};
        const sheetsToParse = Object.values(SheetNames).filter(s => s !== SheetNames.Summary);
        const foundWarnings = [];
        const actualSheetNames = workbook.SheetNames;

        const normalizeSheetName = (name) =>
            name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '');

        sheetsToParse.forEach(expectedSheetName => {
            const normalizedExpected = normalizeSheetName(expectedSheetName);
            
            const actualSheetName = actualSheetNames.find(name => 
                normalizeSheetName(name) === normalizedExpected
            );

            if (actualSheetName) {
                const worksheet = workbook.Sheets[actualSheetName];
                let rawJson = XLSX.utils.sheet_to_json(worksheet);

                if (expectedSheetName === SheetNames.InternalFleets) {
                    rawJson = rawJson.filter(row => row['Reg No:'] && String(row['Reg No:']).trim() !== '');
                }

                const cleanedJson = rawJson.map((row) => {
                    const cleanedRow = {};
                    for (const key in row) {
                        if (Object.prototype.hasOwnProperty.call(row, key)) {
                            let cleanedKey = key.trim();
                            let value = row[key];

                            // Standardize all valid dates to UTC to prevent timezone shifts. This applies
                            // to dates from any column, including our manually parsed ones from above.
                            if (value instanceof Date && !isNaN(value.getTime())) {
                                cleanedRow[cleanedKey] = new Date(Date.UTC(
                                    value.getFullYear(),
                                    value.getMonth(),
                                    value.getDate()
                                ));
                            } else {
                                cleanedRow[cleanedKey] = value;
                            }
                        }
                    }
                    return cleanedRow;
                });
                parsedData[expectedSheetName] = cleanedJson;
            } else {
                foundWarnings.push(\`Sheet "\${expectedSheetName}" was not found. Corresponding views may be empty or show incomplete data.\`);
                parsedData[expectedSheetName] = [];
            }
        });

        postMessage({ type: 'success', data: parsedData, warnings: foundWarnings });

    } catch (err) {
        postMessage({ type: 'error', error: err.message || 'An unknown error occurred in the worker.' });
    }
};
`;

export interface SharedFilterState {
  month: string;
  year: string;
  businessUnit: string;
  internalType: 'All' | 'Rental' | 'Fuel';
  designation: string;
}

const App: React.FC = () => {
  const [excelData, setExcelData] = useState<ExcelData | null>(null);
  const [activeView, setActiveView] = useState<SheetNames>(SheetNames.Dashboard);
  const [fileName, setFileName] = useState<string>('');
  const [uploadTimestamp, setUploadTimestamp] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true); // Start true to check storage
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [sharedFilters, setSharedFilters] = useState<SharedFilterState>({
    month: 'All',
    year: 'All',
    businessUnit: 'All',
    internalType: 'All',
    designation: 'All',
  });
  const [costDetailData, setCostDetailData] = useState<DriverOperatorData[] | null>(null);

  // Effect to load data from IndexedDB on initial render
  useEffect(() => {
    const loadData = async () => {
      try {
        const storedSession = await idbGet<{
            excelData: ExcelData;
            fileName: string;
            uploadTimestamp: string;
        }>('sessionData');

        if (storedSession) {
          setExcelData(storedSession.excelData);
          setFileName(storedSession.fileName);
          setUploadTimestamp(new Date(storedSession.uploadTimestamp));
          setActiveView(SheetNames.Dashboard);
        }
      } catch (err) {
        setError('Failed to load data from previous session. Please upload a file.');
        await idbClear(); // Clear potentially corrupted data
      } finally {
        setIsLoading(false); // Finish initial loading
      }
    };
    
    loadData();
  }, []);

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setError(null);
    setWarnings([]);
    setFileName(file.name);
    setExcelData(null); // Clear old data immediately

    const workerBlob = new Blob([workerScript], { type: 'application/javascript' });
    const workerUrl = URL.createObjectURL(workerBlob);
    const worker = new Worker(workerUrl);

    worker.onmessage = async (e: MessageEvent) => {
      const { type, data, warnings, error } = e.data;
      const newTimestamp = new Date();

      if (type === 'success') {
        setExcelData(data as ExcelData);
        setWarnings(warnings);
        setUploadTimestamp(newTimestamp);
        setActiveView(SheetNames.Dashboard);
        
        // Persist data to IndexedDB
        try {
          const sessionData = {
            excelData: data,
            fileName: file.name,
            uploadTimestamp: newTimestamp.toISOString()
          };
          await idbSet('sessionData', sessionData);
        } catch (storageError) {
            setError('Could not save the file for future sessions due to a browser storage error. The app will work correctly for this session.');
        }

      } else if (type === 'error') {
        setError(`Error processing file: ${error}`);
        setExcelData(null);
        setFileName('');
        setUploadTimestamp(null);
      }
      
      setIsLoading(false);
      worker.terminate();
      URL.revokeObjectURL(workerUrl);
    };

    worker.onerror = (err) => {
      setError(`An unexpected worker error occurred: ${err.message}`);
      setExcelData(null);
      setFileName('');
      setUploadTimestamp(null);
      setIsLoading(false);
      worker.terminate();
      URL.revokeObjectURL(workerUrl);
    };

    worker.postMessage(file);
    event.target.value = '';
  }, []);
  
  const handleClearSession = useCallback(async () => {
    await idbClear();
    setExcelData(null);
    setFileName('');
    setUploadTimestamp(null);
    setError(null);
    setWarnings([]);
    setActiveView(SheetNames.Dashboard);
  }, []);

  const handleShowCostDetail = (
    view: SheetNames.SalaryCostDetail | SheetNames.CtcCostDetail,
    data: DriverOperatorData[]
  ) => {
    setCostDetailData(data);
    setActiveView(view);
  };

  const renderActiveView = () => {
    if (!excelData) return null;

    switch (activeView) {
      case SheetNames.Dashboard:
        return <Dashboard 
          data={excelData.Dashboard} 
          allData={excelData} 
          filters={sharedFilters}
          setFilters={setSharedFilters}
          setActiveView={setActiveView}
        />;
      case SheetNames.FleetManagement:
        return <FleetManagement 
          data={excelData['Fleet Management']} 
          sharedFilters={sharedFilters}
          setActiveView={setActiveView}
        />;
      case SheetNames.DriverOperator:
        return <DriverOperatorView 
          data={excelData['Driver & Operator']} 
          sharedFilters={sharedFilters}
          setActiveView={setActiveView}
        />;
      case SheetNames.JobCard:
        return <JobCardView 
          data={excelData['Job Card']} 
          sharedFilters={sharedFilters}
          setActiveView={setActiveView}
        />;
      case SheetNames.InternalFleets:
        return <InternalFleetsView 
          data={excelData['Internal Fleets']} 
          externalData={excelData['External Fleets']}
          jobCardData={excelData['Job Card']}
          sharedFilters={sharedFilters}
          setActiveView={setActiveView}
        />;
      case SheetNames.ExternalFleets:
        return <DataView 
          data={excelData['External Fleets']}
          sharedFilters={sharedFilters}
          setActiveView={setActiveView}
        />;
      case SheetNames.Summary:
        // FIX: Removed unused `externalData` prop. The Summary component does not use it.
        return <Summary 
          internalData={excelData['Internal Fleets']} 
          driverOperatorData={excelData['Driver & Operator']}
          jobCardData={excelData['Job Card']}
        />;
      case SheetNames.SalaryCostDetail:
        return <CostDetailView
            data={costDetailData || []}
            title="Salary Cost Details"
            headers={[
                'CTC NO.', 'SAP NO.', 'EMPLOYEE NAME', 'DESIGNATION',
                'Basic Salary', 'Other Allowance', 'N-Price2', 'N-Hours2',
                'N-Amount2', 'N-OTPrice2', 'N-OTHours2', 'N-OTAmount2',
                'H-OTPrice2', 'H-OTHours2', 'H-OTAmount2', 'Net Amount2'
            ]}
            parentView={SheetNames.DriverOperator}
            setActiveView={setActiveView}
        />;
      case SheetNames.CtcCostDetail:
        return <CostDetailView
            data={costDetailData || []}
            title="CTC Cost Details"
            headers={[
                'CTC NO.', 'SAP NO.', 'EMPLOYEE NAME', 'DESIGNATION',
                'Leave', 'TKT', 'ESB', 'Accom', 'FOOD', 'Uniform',
                'RP+HC', 'MED INS', 'SAL TRF', 'WC INS', 'HO', 'Total'
            ]}
            parentView={SheetNames.DriverOperator}
            setActiveView={setActiveView}
        />;
      default:
        return <Dashboard 
          data={excelData.Dashboard} 
          allData={excelData}
          filters={sharedFilters}
          setFilters={setSharedFilters}
          setActiveView={setActiveView}
        />;
    }
  };

  return (
    <div className="flex min-h-screen bg-primary font-sans text-white">
      <Sidebar
        activeView={activeView}
        setActiveView={setActiveView}
        fileLoaded={!!excelData}
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
        handleClearSession={handleClearSession}
        handleFileUpload={handleFileUpload}
        isLoading={isLoading}
        fileName={fileName}
        uploadTimestamp={uploadTimestamp}
      />
      
      <div className="flex-1 flex flex-col min-h-screen overflow-x-auto">
        <header className="flex-shrink-0 bg-primary shadow-lg p-2 z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
                <button 
                  onClick={() => setIsSidebarOpen(!isSidebarOpen)} 
                  className="p-2 rounded-md text-gray-300 hover:bg-secondary hover:text-white focus:outline-none focus:ring-2 focus:ring-inset focus:ring-accent transition-colors"
                  aria-label="Toggle navigation"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                </button>
            </div>
             <h1 className="text-xl font-display text-accent tracking-wide">{excelData ? activeView : "Monthly Fleets Report"}</h1>
             <div></div>
          </div>
        </header>
        
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-primary p-6">
          {error && <div className="bg-red-900 bg-opacity-50 border border-red-500 text-red-200 px-4 py-3 rounded-lg relative mb-4" role="alert">{error}</div>}
          
          {warnings.length > 0 && (
            <div className="bg-yellow-900 bg-opacity-50 border border-yellow-500 text-yellow-200 px-4 py-3 rounded-lg relative mb-4" role="alert">
              <strong className="font-bold block">Warnings:</strong>
              <ul className="list-disc list-inside">
                {warnings.map((warn, i) => <li key={i}>{warn}</li>)}
              </ul>
            </div>
          )}
          
          {!excelData && !isLoading && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center p-8 bg-secondary rounded-xl shadow-lg">
                <h2 className="text-2xl font-semibold text-gray-200 mb-4">Welcome!</h2>
                <p className="text-gray-400">Please upload an Excel (.xlsx) file to begin.</p>
                <p className="text-xs text-gray-500 mt-2">(Your file will be saved in your browser for the next visit)</p>
              </div>
            </div>
          )}

          {isLoading && (
             <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-accent"></div>
             </div>
          )}
          
          {excelData && renderActiveView()}
        </main>
        
        <footer className="flex-shrink-0 text-center py-2 px-6 text-xs text-gray-500 bg-primary border-t border-secondary">
          Created & Managed by ALI, m.nharakkat@eleganciagroup.com
        </footer>
      </div>
    </div>
  );
};

export default App;