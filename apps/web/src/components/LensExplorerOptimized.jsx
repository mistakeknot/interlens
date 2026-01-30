import React, { useState, useMemo } from 'react';
import { useLenses } from './useLenses';
import LensCard from './LensCard';
import LensStats from './LensStats';
import LensSearch from './LensSearch';
import LensFilter from './LensFilter';
import './LensExplorerOptimized.css';

const LensExplorerOptimized = () => {
  const { lenses, loading, error, stats, searchLenses, fetchLenses } = useLenses();
  const [viewMode, setViewMode] = useState('grid');
  const [selectedLens, setSelectedLens] = useState(null);
  const [showStats, setShowStats] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Paginate lenses
  const paginatedLenses = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return lenses.slice(start, end);
  }, [lenses, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(lenses.length / itemsPerPage);

  if (loading && lenses.length === 0) {
    return (
      <div className="lens-explorer-loading">
        <div className="spinner"></div>
        <p>Loading lenses...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="lens-explorer-error">
        <p>Error loading lenses: {error}</p>
        <button onClick={() => window.location.reload()}>Retry</button>
      </div>
    );
  }

  return (
    <div className="lens-explorer-optimized">
      {/* Compact Header */}
      <header className="lens-header-compact">
        <div className="header-left">
          <h1>FLUX Lens Explorer</h1>
          <span className="lens-count">{stats?.total_lenses || 0} lenses</span>
        </div>
        
        <div className="header-right">
          <button 
            className="stats-toggle"
            onClick={() => setShowStats(!showStats)}
          >
            {showStats ? 'Hide' : 'Show'} Stats
          </button>
        </div>
      </header>

      {/* Collapsible Stats */}
      {showStats && stats && (
        <div className="stats-drawer">
          <LensStats stats={stats} />
        </div>
      )}

      {/* Sticky Controls Bar */}
      <div className="controls-bar">
        <div className="controls-left">
          <LensSearch onSearch={searchLenses} />
          <LensFilter onFilter={fetchLenses} />
        </div>
        
        <div className="controls-right">
          <div className="view-toggle">
            <button 
              className={viewMode === 'grid' ? 'active' : ''}
              onClick={() => setViewMode('grid')}
              title="Grid View"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <rect x="1" y="1" width="5" height="5"/>
                <rect x="9" y="1" width="5" height="5"/>
                <rect x="1" y="9" width="5" height="5"/>
                <rect x="9" y="9" width="5" height="5"/>
              </svg>
            </button>
            <button 
              className={viewMode === 'list' ? 'active' : ''}
              onClick={() => setViewMode('list')}
              title="List View"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <rect x="1" y="2" width="14" height="2"/>
                <rect x="1" y="7" width="14" height="2"/>
                <rect x="1" y="12" width="14" height="2"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Results Summary */}
      <div className="results-summary">
        <span>
          Showing {((currentPage - 1) * itemsPerPage) + 1}-
          {Math.min(currentPage * itemsPerPage, lenses.length)} of {lenses.length} lenses
        </span>
      </div>

      {/* Lens Grid with Pagination */}
      <div className={`lens-container-optimized ${viewMode}`}>
        {paginatedLenses.map((lens) => (
          <LensCard
            key={lens.id}
            lens={lens}
            viewMode={viewMode}
            onClick={() => setSelectedLens(lens)}
          />
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pagination">
          <button 
            onClick={() => setCurrentPage(1)}
            disabled={currentPage === 1}
            className="page-button"
          >
            First
          </button>
          <button 
            onClick={() => setCurrentPage(currentPage - 1)}
            disabled={currentPage === 1}
            className="page-button"
          >
            Previous
          </button>
          
          <div className="page-numbers">
            {[...Array(Math.min(5, totalPages))].map((_, i) => {
              let pageNum;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }
              
              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`page-number ${currentPage === pageNum ? 'active' : ''}`}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>
          
          <button 
            onClick={() => setCurrentPage(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="page-button"
          >
            Next
          </button>
          <button 
            onClick={() => setCurrentPage(totalPages)}
            disabled={currentPage === totalPages}
            className="page-button"
          >
            Last
          </button>
        </div>
      )}

      {/* Quick Jump */}
      <div className="quick-actions">
        <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          ↑ Back to Top
        </button>
      </div>

      {selectedLens && (
        <LensModal 
          lens={selectedLens} 
          onClose={() => setSelectedLens(null)} 
        />
      )}
    </div>
  );
};

// Modal component (same as before)
const LensModal = ({ lens, onClose }) => {
  return (
    <div className="lens-modal-overlay" onClick={onClose}>
      <div className="lens-modal" onClick={(e) => e.stopPropagation()}>
        <button className="close-button" onClick={onClose}>×</button>
        
        <div className="lens-modal-header">
          <span className={`lens-type-badge ${lens.lens_type}`}>
            {lens.lens_type}
          </span>
          <h2>{lens.lens_name}</h2>
          <p className="episode-info">Episode {lens.episode}</p>
        </div>

        <div className="lens-modal-content">
          <section>
            <h3>Definition</h3>
            <p>{lens.definition}</p>
          </section>

          {lens.examples && lens.examples.length > 0 && (
            <section>
              <h3>Examples</h3>
              <ul>
                {lens.examples.map((example, idx) => (
                  <li key={idx}>{example}</li>
                ))}
              </ul>
            </section>
          )}

          {lens.related_concepts && lens.related_concepts.length > 0 && (
            <section>
              <h3>Related Concepts</h3>
              <div className="concept-tags">
                {lens.related_concepts.map((concept, idx) => (
                  <span key={idx} className="concept-tag">{concept}</span>
                ))}
              </div>
            </section>
          )}

          {lens.ai_connections && lens.ai_connections.length > 0 && (
            <section className="ai-connections-section">
              <h3>
                <span className="ai-icon">✨</span>
                AI-Discovered Connections
              </h3>
              {lens.ai_connections.map((connection, idx) => (
                <div key={idx} className="ai-connection-item">
                  <div className="ai-connection-header">
                    <span className="ai-connection-target">
                      Connected to: {connection.target_name || connection.target_id}
                    </span>
                    <div>
                      <span className="ai-connection-type">{connection.type}</span>
                      <span className="ai-connection-weight">
                        {(connection.weight * 100).toFixed(0)}% match
                      </span>
                    </div>
                  </div>
                  <p className="ai-connection-insight">{connection.insight}</p>
                </div>
              ))}
            </section>
          )}

          {lens.source_url && (
            <section>
              <a 
                href={lens.source_url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="source-link"
              >
                Read full episode →
              </a>
            </section>
          )}
        </div>
      </div>
    </div>
  );
};

export default LensExplorerOptimized;