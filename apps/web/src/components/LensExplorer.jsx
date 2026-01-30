import React, { useState } from 'react';
import { useLenses } from './useLenses';
import LensCard from './LensCard';
import LensStats from './LensStats';
import LensSearch from './LensSearch';
import LensFilter from './LensFilter';
import './LensExplorer.css';

const LensExplorer = () => {
  const { lenses, loading, error, stats, searchLenses, fetchLenses } = useLenses();
  const [viewMode, setViewMode] = useState('grid'); // grid or list
  const [selectedLens, setSelectedLens] = useState(null);

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
    <div className="lens-explorer">
      <div className="lens-explorer-header">
        <h1>FLUX Lens Explorer</h1>
        <p className="subtitle">Explore {stats?.total_lenses || 0} conceptual lenses from FLUX newsletters</p>
      </div>

      {stats && <LensStats stats={stats} />}

      <div className="lens-explorer-controls">
        <LensSearch onSearch={searchLenses} />
        <LensFilter onFilter={fetchLenses} />
        
        <div className="view-toggle">
          <button 
            className={viewMode === 'grid' ? 'active' : ''}
            onClick={() => setViewMode('grid')}
          >
            Grid
          </button>
          <button 
            className={viewMode === 'list' ? 'active' : ''}
            onClick={() => setViewMode('list')}
          >
            List
          </button>
        </div>
      </div>

      <div className={`lens-container ${viewMode}`}>
        {lenses.map((lens) => (
          <LensCard
            key={lens.id}
            lens={lens}
            viewMode={viewMode}
            onClick={() => setSelectedLens(lens)}
          />
        ))}
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

// Modal component for detailed lens view
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

export default LensExplorer;