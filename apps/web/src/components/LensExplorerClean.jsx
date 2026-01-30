import React, { useState, useMemo } from 'react';
import { useLenses } from './useLenses';
import './LensExplorerClean.css';

const LensExplorerClean = () => {
  const { lenses, loading, error, stats, searchLenses, fetchLenses } = useLenses();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedLens, setSelectedLens] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 24;

  // Filter lenses by type
  const filteredLenses = useMemo(() => {
    if (selectedType === 'all') return lenses;
    return lenses.filter(lens => lens.lens_type === selectedType);
  }, [lenses, selectedType]);

  // Paginate lenses
  const paginatedLenses = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return filteredLenses.slice(start, end);
  }, [filteredLenses, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredLenses.length / itemsPerPage);

  // Handle search
  const handleSearch = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    if (value.trim()) {
      searchLenses(value);
    } else {
      fetchLenses();
    }
    setCurrentPage(1);
  };

  // Handle type filter
  const handleTypeFilter = (type) => {
    setSelectedType(type);
    setCurrentPage(1);
    if (type === 'all') {
      fetchLenses();
    } else {
      fetchLenses({ type });
    }
  };

  if (loading && lenses.length === 0) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading lenses...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <p>Error loading lenses: {error}</p>
        <button onClick={() => window.location.reload()}>Retry</button>
      </div>
    );
  }

  return (
    <div className="lens-explorer-clean">
      {/* Header */}
      <header className="explorer-header">
        <div className="header-content">
          <h1>Linsenkasten</h1>
          <p className="tagline">A curated collection of {stats?.total_lenses || 0} conceptual lenses from FLUX newsletters</p>
        </div>
      </header>

      {/* Stats Bar */}
      {stats && (
        <div className="stats-bar">
          <div className="stat-item">
            <span className="stat-value">{stats.total_lenses}</span>
            <span className="stat-label">Total Lenses</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">{stats.episodes_with_lenses}</span>
            <span className="stat-label">Episodes</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">{stats.headline_lenses}</span>
            <span className="stat-label">Headlines</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">{stats.weekly_lenses}</span>
            <span className="stat-label">Weekly</span>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="controls-section">
        <div className="search-container">
          <input
            type="text"
            placeholder="Search lenses..."
            value={searchTerm}
            onChange={handleSearch}
            className="search-input"
          />
          {searchTerm && (
            <button 
              className="clear-search"
              onClick={() => {
                setSearchTerm('');
                fetchLenses();
                setCurrentPage(1);
              }}
            >
              ✕
            </button>
          )}
        </div>

        <div className="filter-buttons">
          <button 
            className={`filter-btn ${selectedType === 'all' ? 'active' : ''}`}
            onClick={() => handleTypeFilter('all')}
          >
            All
          </button>
          <button 
            className={`filter-btn ${selectedType === 'headline' ? 'active' : ''}`}
            onClick={() => handleTypeFilter('headline')}
          >
            Headlines
          </button>
          <button 
            className={`filter-btn ${selectedType === 'weekly' ? 'active' : ''}`}
            onClick={() => handleTypeFilter('weekly')}
          >
            Weekly
          </button>
        </div>
      </div>

      {/* Results info */}
      <div className="results-info">
        <span>
          Showing {((currentPage - 1) * itemsPerPage) + 1}-
          {Math.min(currentPage * itemsPerPage, filteredLenses.length)} of {filteredLenses.length} 
          {searchTerm && ' matching'} lenses
        </span>
      </div>

      {/* Lens Grid */}
      <div className="lens-grid">
        {paginatedLenses.map((lens) => (
          <div 
            key={lens.id} 
            className="lens-tile"
            onClick={() => setSelectedLens(lens)}
          >
            <div className="lens-tile-header">
              <span className={`type-indicator ${lens.lens_type}`}>
                {lens.lens_type === 'headline' ? 'H' : 'W'}
              </span>
              <span className="episode-number">Ep {lens.episode}</span>
            </div>
            
            <h3 className="lens-title">{lens.lens_name}</h3>
            
            <p className="lens-preview">
              {lens.definition.length > 120 
                ? lens.definition.substring(0, 120) + '...' 
                : lens.definition}
            </p>
            
            {lens.related_concepts && lens.related_concepts.length > 0 && (
              <div className="concept-chips">
                {lens.related_concepts.slice(0, 2).map((concept, idx) => (
                  <span key={idx} className="concept-chip">{concept}</span>
                ))}
                {lens.related_concepts.length > 2 && (
                  <span className="more-chip">+{lens.related_concepts.length - 2}</span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pagination-clean">
          <button 
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="page-nav"
          >
            ← Previous
          </button>
          
          <div className="page-info">
            Page {currentPage} of {totalPages}
          </div>
          
          <button 
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="page-nav"
          >
            Next →
          </button>
        </div>
      )}

      {/* Modal */}
      {selectedLens && (
        <div className="modal-overlay" onClick={() => setSelectedLens(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setSelectedLens(null)}>
              ✕
            </button>
            
            <div className="modal-header">
              <div className="modal-meta">
                <span className={`type-badge ${selectedLens.lens_type}`}>
                  {selectedLens.lens_type} lens
                </span>
                <span className="episode-badge">Episode {selectedLens.episode}</span>
              </div>
              <h2>{selectedLens.lens_name}</h2>
            </div>

            <div className="modal-body">
              <div className="modal-section">
                <h3>Definition</h3>
                <p>{selectedLens.definition}</p>
              </div>

              {selectedLens.examples && selectedLens.examples.length > 0 && (
                <div className="modal-section">
                  <h3>Examples</h3>
                  <ul>
                    {selectedLens.examples.map((example, idx) => (
                      <li key={idx}>{example}</li>
                    ))}
                  </ul>
                </div>
              )}

              {selectedLens.related_concepts && selectedLens.related_concepts.length > 0 && (
                <div className="modal-section">
                  <h3>Related Concepts</h3>
                  <div className="concept-list">
                    {selectedLens.related_concepts.map((concept, idx) => (
                      <span key={idx} className="concept-badge">{concept}</span>
                    ))}
                  </div>
                </div>
              )}

              {selectedLens.source_url && (
                <div className="modal-footer">
                  <a 
                    href={selectedLens.source_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="source-link"
                  >
                    Read full episode →
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LensExplorerClean;