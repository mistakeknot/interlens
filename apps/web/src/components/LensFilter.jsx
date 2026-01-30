import React, { useState } from 'react';

const LensFilter = ({ onFilter }) => {
  const [filters, setFilters] = useState({
    type: 'all',
    episode: ''
  });
  const [isOpen, setIsOpen] = useState(false);

  const handleFilterChange = (key, value) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    
    // Build filter object for API
    const apiFilters = {};
    if (newFilters.type !== 'all') {
      apiFilters.type = newFilters.type;
    }
    if (newFilters.episode) {
      apiFilters.episode = newFilters.episode;
    }
    
    onFilter(apiFilters);
  };

  const clearFilters = () => {
    setFilters({ type: 'all', episode: '' });
    onFilter({});
  };

  const activeFilterCount = 
    (filters.type !== 'all' ? 1 : 0) + 
    (filters.episode ? 1 : 0);

  return (
    <div className="lens-filter">
      <button 
        className="filter-button"
        onClick={() => setIsOpen(!isOpen)}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z"/>
        </svg>
        Filters
        {activeFilterCount > 0 && (
          <span className="filter-count">{activeFilterCount}</span>
        )}
      </button>

      {isOpen && (
        <div className="filter-dropdown">
          <div className="filter-section">
            <label>Lens Type</label>
            <select 
              value={filters.type}
              onChange={(e) => handleFilterChange('type', e.target.value)}
            >
              <option value="all">All Types</option>
              <option value="headline">Headline Lenses</option>
              <option value="weekly">Weekly Lenses</option>
            </select>
          </div>

          <div className="filter-section">
            <label>Episode</label>
            <input
              type="number"
              placeholder="Episode number"
              value={filters.episode}
              onChange={(e) => handleFilterChange('episode', e.target.value)}
              min="1"
              max="196"
            />
          </div>

          {activeFilterCount > 0 && (
            <button className="clear-filters" onClick={clearFilters}>
              Clear Filters
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default LensFilter;