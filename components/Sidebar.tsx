
import React from 'react';
import { SheetNames } from '../types';

interface SidebarProps {
  activeView: SheetNames;
  setActiveView: (view: SheetNames) => void;
  fileLoaded: boolean;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  handleClearSession: () => Promise<void>;
  handleFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  isLoading: boolean;
  fileName: string;
  uploadTimestamp: Date | null;
}

const NavItem: React.FC<{
  label: SheetNames;
  activeView: SheetNames;
  setActiveView: (view: SheetNames) => void;
  fileLoaded: boolean;
  Icon: React.FC<React.SVGProps<SVGSVGElement>>;
}> = ({ label, activeView, setActiveView, fileLoaded, Icon }) => {
  const isActive = activeView === label;
  return (
    <li
      onClick={() => fileLoaded && setActiveView(label)}
      className={`flex items-center p-3 my-1 rounded-lg cursor-pointer transition-all duration-200 ${
        isActive
          ? 'bg-accent text-white font-bold shadow-inner'
          : fileLoaded 
          ? 'text-white hover:bg-secondary'
          : 'text-gray-500 cursor-not-allowed'
      }`}
    >
      <Icon className="w-6 h-6 mr-3" />
      {label}
    </li>
  );
};

const Sidebar: React.FC<SidebarProps> = ({ 
    activeView, 
    setActiveView, 
    fileLoaded, 
    isOpen, 
    setIsOpen,
    handleClearSession,
    handleFileUpload,
    isLoading,
    fileName,
    uploadTimestamp 
}) => {
    const navItems = [
        SheetNames.Dashboard,
        SheetNames.InternalFleets,
        SheetNames.JobCard,
        SheetNames.DriverOperator,
        SheetNames.ExternalFleets,
        SheetNames.FleetManagement,
        SheetNames.Summary,
    ];

  return (
    <nav className={`flex-shrink-0 h-screen bg-primary text-white flex flex-col shadow-2xl z-40 transition-all duration-300 ease-in-out overflow-y-auto ${isOpen ? 'w-64 p-4' : 'w-0 p-0'}`}>
      <div className="flex justify-between items-center mb-4 border-b border-accent opacity-80 pb-4">
        <span className="text-2xl font-bold">Navigation</span>
         <button 
            onClick={() => setIsOpen(false)} 
            className="p-1 rounded-full text-gray-300 hover:bg-secondary hover:text-white transition-colors"
            aria-label="Close navigation"
        >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>
      
      {/* Logo */}
      <div className="flex items-center justify-center gap-1.5 my-4">
          <svg width="20" height="24" viewBox="0 0 20 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M0 24V0L20 12L0 24Z" fill="#d71920"/>
          </svg>
          <div className="flex flex-col items-start leading-tight">
            <span className="text-white text-2xl font-bold tracking-tighter font-display">elegancia</span>
            <span className="text-sm text-red-600 self-end -mt-1 font-sans">resources</span>
          </div>
      </div>
      
      <ul className="space-y-2">
        {navItems.map(item => (
            <NavItem
                key={item}
                label={item}
                activeView={activeView}
                setActiveView={setActiveView}
                fileLoaded={fileLoaded}
                Icon={IconMap[item]}
            />
        ))}
      </ul>

      <div className="mt-auto pt-4 border-t border-secondary">
        <div className="space-y-2">
            <label className="w-full block bg-mute-pink hover:bg-mute-pink-hover text-white font-bold py-2 px-4 rounded-lg cursor-pointer transition-colors duration-300 text-sm text-center">
              <span>{isLoading ? 'Loading...' : 'Upload New'}</span>
              <input type="file" accept=".xlsx" className="hidden" onChange={handleFileUpload} disabled={isLoading} />
            </label>

            {fileLoaded && (
              <>
                <button
                  onClick={handleClearSession}
                  className="w-full bg-mute-pink hover:bg-mute-pink-hover text-white font-bold py-2 px-4 rounded-lg cursor-pointer transition-colors duration-300 text-sm"
                  title="Clear stored data and start over"
                >
                  Reset
                </button>

                {uploadTimestamp && fileName && (
                    <div className="mt-4 text-xs text-gray-400 text-center">
                        <p className="font-bold truncate" title={fileName}>{fileName}</p>
                        <p>{uploadTimestamp.toLocaleString()}</p>
                    </div>
                )}
              </>
            )}
        </div>
      </div>
    </nav>
  );
};

// SVG Icons for better visual distinction
// FIX: Added missing icons for Salary Cost Detail and CTC Cost Detail to satisfy the IconMap type.
const IconMap: { [key in SheetNames]: React.FC<React.SVGProps<SVGSVGElement>> } = {
  [SheetNames.Dashboard]: (props) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
  ),
  [SheetNames.Summary]: (props) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V7a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
  ),
  [SheetNames.FleetManagement]: (props) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
  ),
  [SheetNames.DriverOperator]: (props) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
  ),
  [SheetNames.JobCard]: (props) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
  ),
  [SheetNames.InternalFleets]: (props) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" /></svg>
  ),
  [SheetNames.ExternalFleets]: (props) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 012-2h2a2 2 0 012 2v1m-4 0h4" /></svg>
  ),
  [SheetNames.SalaryCostDetail]: (props) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8v1m0 6v1m-2-1a2 2 0 00-2 2h8a2 2 0 00-2-2h-4zM9 12h6" /></svg>
  ),
  [SheetNames.CtcCostDetail]: (props) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
  ),
};

export default Sidebar;
