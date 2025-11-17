import React, { useState, useEffect, useRef, useMemo } from 'react';

interface SearchableDropdownProps {
  options: string[];
  value: string;
  onChange: (value: string) => void;
  id?: string;
  name?: string;
  variant?: 'dashboard' | 'detail-view' | 'summary';
}

const SearchableDropdown: React.FC<SearchableDropdownProps> = ({ options, value, onChange, id, name, variant = 'dashboard' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const theme = {
    dashboard: {
      button: 'bg-primary border border-gray-600 rounded-md py-1 px-3 text-white focus:outline-none focus:ring-1 focus:ring-accent w-full text-left min-h-[30px] flex items-center',
      dropdown: 'absolute top-full left-0 mt-1 w-full bg-secondary border border-gray-600 rounded-md shadow-lg z-20 max-h-60',
      searchInput: 'block w-full px-3 py-2 text-sm bg-primary border-b border-gray-600 text-white focus:outline-none focus:ring-1 focus:ring-accent',
      option: 'px-3 py-2 text-sm text-white hover:bg-primary cursor-pointer',
      noOptions: 'px-3 py-2 text-sm text-gray-400',
    },
    'detail-view': {
      button: 'bg-white text-black rounded-sm p-1 text-sm border-0 focus:ring-0 w-full text-left min-h-[28px] flex items-center',
      dropdown: 'absolute top-full left-0 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg z-20 max-h-60',
      searchInput: 'block w-full px-3 py-2 text-sm bg-gray-50 border-b border-gray-300 focus:outline-none focus:ring-1 focus:ring-accent',
      option: 'px-3 py-2 text-sm text-black hover:bg-gray-100 cursor-pointer',
      noOptions: 'px-3 py-2 text-sm text-gray-500',
    },
    summary: {
      button: 'bg-white border border-stone-300 rounded-md py-1 px-2 text-sm text-left w-full min-h-[30px] flex items-center',
      dropdown: 'absolute top-full left-0 mt-1 w-full bg-white border border-stone-300 rounded-md shadow-lg z-20 max-h-60',
      searchInput: 'block w-full px-3 py-2 text-sm bg-stone-50 border-b border-stone-300 focus:outline-none focus:ring-1 focus:ring-amber-500',
      option: 'px-3 py-2 text-sm text-stone-800 hover:bg-amber-100 cursor-pointer',
      noOptions: 'px-3 py-2 text-sm text-stone-500',
    }
  };

  const themeClasses = theme[variant];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const filteredOptions = useMemo(() => {
    if (!searchTerm) return options;
    const lowercasedSearchTerm = searchTerm.toLowerCase();
    return options.filter(option => option.toLowerCase().includes(lowercasedSearchTerm));
  }, [options, searchTerm]);

  const handleSelect = (option: string) => {
    onChange(option);
    setIsOpen(false);
    setSearchTerm('');
  };

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
    if (isOpen) {
      setSearchTerm('');
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        id={id}
        name={name}
        onClick={toggleDropdown}
        className={themeClasses.button}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        {value}
      </button>
      {isOpen && (
        <div className={themeClasses.dropdown}>
          <input
            type="text"
            placeholder="Search..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className={themeClasses.searchInput}
            autoFocus
          />
          <div className="overflow-y-auto max-h-48">
            {filteredOptions.length > 0 ? (
              filteredOptions.map(option => (
                <div
                  key={option}
                  onClick={() => handleSelect(option)}
                  className={themeClasses.option}
                  role="option"
                  aria-selected={value === option}
                >
                  {option}
                </div>
              ))
            ) : (
              <div className={themeClasses.noOptions}>No options found</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchableDropdown;
