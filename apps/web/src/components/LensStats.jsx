import React from 'react';

const LensStats = ({ stats }) => {
  const coveragePercent = stats.episode_coverage_percent || 0;
  
  return (
    <div className="lens-stats">
      <div className="stat-card">
        <div className="stat-number">{stats.total_lenses}</div>
        <div className="stat-label">Total Lenses</div>
      </div>
      
      <div className="stat-card">
        <div className="stat-number">{stats.episodes_with_lenses}</div>
        <div className="stat-label">Episodes Covered</div>
        <div className="stat-progress">
          <div 
            className="progress-bar" 
            style={{ width: `${coveragePercent}%` }}
          />
        </div>
        <div className="stat-sublabel">{coveragePercent}% coverage</div>
      </div>
      
      <div className="stat-card">
        <div className="stat-split">
          <div>
            <div className="stat-number-small">{stats.headline_lenses}</div>
            <div className="stat-label-small">Headlines</div>
          </div>
          <div>
            <div className="stat-number-small">{stats.weekly_lenses}</div>
            <div className="stat-label-small">Weekly</div>
          </div>
        </div>
      </div>
      
      <div className="stat-card">
        <div className="stat-number">{stats.episodes_with_both_types}</div>
        <div className="stat-label">Episodes with Both Types</div>
      </div>
    </div>
  );
};

export default LensStats;