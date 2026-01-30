import React from 'react';

const LensCard = ({ lens, viewMode, onClick }) => {
  const truncateText = (text, maxLength) => {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };
  
  // Debug: Log first lens with AI connections
  if (lens.ai_connections && lens.ai_connections.length > 0 && !window._aiDebugLogged) {
    console.log('Lens with AI connections:', lens.lens_name, lens.ai_connections);
    window._aiDebugLogged = true;
  }

  if (viewMode === 'list') {
    return (
      <div className="lens-card-list" onClick={onClick}>
        <div className="lens-list-header">
          <span className={`lens-type-badge ${lens.lens_type}`}>
            {lens.lens_type}
          </span>
          <h3>{lens.lens_name}</h3>
          <span className="episode-badge">Ep {lens.episode}</span>
        </div>
        <p className="lens-definition">{truncateText(lens.definition, 200)}</p>
        {lens.related_concepts && lens.related_concepts.length > 0 && (
          <div className="concept-preview">
            {lens.related_concepts.slice(0, 3).map((concept, idx) => (
              <span key={idx} className="concept-tag-mini">{concept}</span>
            ))}
            {lens.related_concepts.length > 3 && (
              <span className="more-concepts">+{lens.related_concepts.length - 3}</span>
            )}
          </div>
        )}
        {lens.ai_connections && lens.ai_connections.length > 0 && (
          <span className="ai-connections-badge">
            ✨ {lens.ai_connections.length} AI Connection{lens.ai_connections.length > 1 ? 's' : ''}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="lens-card" onClick={onClick}>
      <div className="lens-card-header">
        <span className={`lens-type-badge ${lens.lens_type}`}>
          {lens.lens_type}
        </span>
        <span className="episode-badge">Ep {lens.episode}</span>
      </div>
      
      <h3 className="lens-name">{lens.lens_name}</h3>
      
      <p className="lens-definition">
        {truncateText(lens.definition, 150)}
      </p>
      
      {lens.examples && lens.examples.length > 0 && (
        <div className="lens-examples">
          <p className="example-preview">
            <strong>Example:</strong> {truncateText(lens.examples[0], 100)}
          </p>
        </div>
      )}
      
      {lens.related_concepts && lens.related_concepts.length > 0 && (
        <div className="lens-concepts">
          <span className="mini-label">Tags:</span>
          {lens.related_concepts.slice(0, 2).map((concept, idx) => (
            <span key={idx} className="concept-tag-mini">{concept}</span>
          ))}
          {lens.related_concepts.length > 2 && (
            <span className="more-concepts">+{lens.related_concepts.length - 2}</span>
          )}
        </div>
      )}
      
      {lens.ai_connections && lens.ai_connections.length > 0 && (
        <div className="ai-connections-preview" style={{border: '2px solid red', padding: '10px'}}>
          <div className="ai-badge">
            <span className="ai-icon">✨</span>
            {lens.ai_connections.length} AI Connection{lens.ai_connections.length > 1 ? 's' : ''}
          </div>
        </div>
      )}
    </div>
  );
};

export default LensCard;