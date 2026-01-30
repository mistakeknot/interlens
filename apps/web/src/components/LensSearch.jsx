import React, { useState, useCallback, useMemo } from 'react';
import debounce from 'lodash.debounce';

const LensSearch = ({ onSearch }) => {
  const [searchTerm, setSearchTerm] = useState('');
  
  // Debounce search to avoid too many API calls
  const debouncedSearch = useMemo(
    () => debounce((term) => {
      if (term.trim()) {
        onSearch(term);
      } else {
        // If empty, reload all lenses
        onSearch('');
      }
    }, 300),
    [onSearch]
  );

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    debouncedSearch(value);
  };

  const handleClear = () => {
    setSearchTerm('');
    onSearch('');
  };

  return (
    <div className="lens-search">
      <div className="search-input-wrapper">
        <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <circle cx="11" cy="11" r="8"/>
          <path d="m21 21-4.35-4.35"/>
        </svg>
        
        <input
          type="text"
          placeholder="Search lenses by name, definition, or concept..."
          value={searchTerm}
          onChange={handleSearchChange}
          className="search-input"
        />
        
        {searchTerm && (
          <button className="clear-button" onClick={handleClear}>
            ×
          </button>
        )}
      </div>
    </div>
  );
};

export default LensSearch;