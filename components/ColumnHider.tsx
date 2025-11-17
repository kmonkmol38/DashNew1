import React, { useState, useEffect, useRef } from 'react';

// --- Reusable Column Hider Dropdown Component ---

const ColumnHider: React.FC<{
  allHeaders: string[];
  hiddenColumns: Set<string>;
  onToggleColumn: (header: string) => void;
  variant?: 'dark' | 'light';
}> = ({ allHeaders, hiddenColumns, onToggleColumn, variant = 'dark' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const isLight = variant === 'light';

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (allHeaders.length === 0) return null;
  
  const themeClasses = {
      button: isLight 
          ? 'flex items-center gap-2 bg-white border border-stone-300 rounded-md py-2 px-3 text-sm font-bold text-stone-700 hover:bg-stone-50 w-full justify-center' 
          : 'flex items-center gap-2 bg-primary border border-gray-600 rounded-md py-2 px-3 text-sm font-bold text-gray-300 hover:bg-secondary w-full justify-center',
      dropdown: isLight
          ? 'absolute top-full right-0 mt-2 z-30 bg-white border border-stone-300 rounded-md shadow-lg w-64 max-h-80 overflow-y-auto'
          : 'absolute top-full right-0 mt-2 z-30 bg-secondary border border-gray-600 rounded-md shadow-lg w-64 max-h-80 overflow-y-auto',
      dropdownHeader: isLight
          ? 'p-2 text-xs text-stone-500 border-b border-stone-200'
          : 'p-2 text-xs text-gray-400 border-b border-gray-700',
      label: isLight
          ? 'flex items-center p-2 hover:bg-amber-100 cursor-pointer text-sm'
          : 'flex items-center p-2 hover:bg-primary cursor-pointer text-sm',
      checkbox: isLight
          ? 'h-4 w-4 rounded text-amber-600 focus:ring-amber-500 border-stone-400'
          : 'h-4 w-4 rounded bg-gray-700 border-gray-500 text-accent focus:ring-accent',
      labelText: isLight
          ? 'ml-2 text-stone-800'
          : 'ml-2 text-white',
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(prev => !prev)}
        className={themeClasses.button}
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
            <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.022 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
        </svg>
        <span>Hide Columns</span>
         <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
      </button>
      {isOpen && (
        <div className={themeClasses.dropdown}>
          <div className={themeClasses.dropdownHeader}>Select columns to show/hide.</div>
          {allHeaders.map(header => (
            <label key={header} className={themeClasses.label}>
              <input
                type="checkbox"
                className={themeClasses.checkbox}
                checked={!hiddenColumns.has(header)}
                onChange={() => onToggleColumn(header)}
              />
              <span className={themeClasses.labelText}>{header}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
};

export default ColumnHider;