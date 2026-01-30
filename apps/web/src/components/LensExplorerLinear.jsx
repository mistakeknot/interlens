import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useLenses, useFrames, useLensContrasts } from './useLenses';
import { useBackgroundLoader } from '../hooks/useBackgroundLoader';
import debounce from 'lodash.debounce';
import { generateDeepLink, generateEpisodeUrl } from '../utils/episodePostIds';
import LensGraphView from './LensGraphView';
import LensGraphViewOptimized from './LensGraphViewOptimized';
import LensGraphViewSimple from './LensGraphViewSimple';
import './LensExplorerLinear.css';

const LensExplorerLinear = () => {
  const { lenses, loading, error, stats, searchLenses, fetchLenses } = useLenses();
  const { frames } = useFrames();
  const { getCacheStats } = useBackgroundLoader(); // Initialize background loader
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedFrames, setSelectedFrames] = useState([]); // for multi-select frame filtering
  const [selectedFrameDetails, setSelectedFrameDetails] = useState(null); // for expanded frame view
  const [selectedLens, setSelectedLens] = useState(null);
  // Fetch contrasts for selected lens
  const { contrasts: lensContrasts, loading: contrastsLoading } = useLensContrasts(selectedLens?.id);
  const [viewType, setViewType] = useState('grid'); // 'grid', 'table', or 'graph'
  const [displayedItems, setDisplayedItems] = useState(30);
  const [activeTab, setActiveTab] = useState('lenses'); // 'lenses', 'frames', or 'tags'
  const [selectedTag, setSelectedTag] = useState(null); // for tag filtering
  const [selectedTagDetails, setSelectedTagDetails] = useState(null); // for expanded tag view
  const [selectedTags, setSelectedTags] = useState([]); // for multi-select tag filtering
  const [showTooltip, setShowTooltip] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [graphControlsOpen, setGraphControlsOpen] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState(() => {
    // Load collapsed state from localStorage
    const saved = localStorage.getItem('lensExplorerCollapsedSections');
    return saved ? JSON.parse(saved) : { frames: false, tags: false };
  });
  const loadMoreRef = useRef(null);
  const itemsPerPage = 30;
  
  // React Router hooks
  const navigate = useNavigate();
  const params = useParams();
  const location = useLocation();

  // Toggle collapsed state and save to localStorage
  const toggleCollapsed = (section) => {
    setCollapsedSections(prev => {
      const newState = { ...prev, [section]: !prev[section] };
      localStorage.setItem('lensExplorerCollapsedSections', JSON.stringify(newState));
      return newState;
    });
  };

  // Create frame lookup map
  const frameMap = useMemo(() => {
    const map = {};
    frames.forEach(frame => {
      map[frame.id] = frame;
    });
    return map;
  }, [frames]);

  // Use frames from the frames hook instead of AI connections
  const allFrames = frames || [];
  
  // Compute all unique tags with their counts
  const allTags = useMemo(() => {
    const tagCounts = {};
    lenses.forEach(lens => {
      if (lens.related_concepts) {
        lens.related_concepts.forEach(concept => {
          if (!tagCounts[concept]) {
            tagCounts[concept] = { name: concept, count: 0, lens_ids: [] };
          }
          tagCounts[concept].count++;
          tagCounts[concept].lens_ids.push(lens.id);
        });
      }
    });
    
    // Convert to array and sort by count
    return Object.values(tagCounts).sort((a, b) => b.count - a.count);
  }, [lenses]);

  // Filter lenses by type, frame, and tags
  const filteredLenses = useMemo(() => {
    let filtered = lenses;
    
    // Filter by type
    if (selectedType !== 'all') {
      filtered = filtered.filter(lens => lens.lens_type === selectedType);
    }
    
    // Filter by frames (multi-select)
    if (selectedFrames.length > 0) {
      filtered = filtered.filter(lens => 
        lens.frame_ids && lens.frame_ids.some(frameId => selectedFrames.includes(frameId))
      );
    }
    
    // Filter by tags (multi-select)
    if (selectedTags.length > 0) {
      filtered = filtered.filter(lens => 
        lens.related_concepts && lens.related_concepts.some(concept => selectedTags.includes(concept))
      );
    }
    
    return filtered;
  }, [lenses, selectedType, selectedFrames, selectedTags]);

  // Filter frames based on search and size
  const filteredFrames = useMemo(() => {
    let filteredResults = allFrames;
    
    // Filter by search term
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filteredResults = filteredResults.filter(frame => 
        frame.name.toLowerCase().includes(searchLower) ||
        frame.description.toLowerCase().includes(searchLower) ||
        (frame.insights && frame.insights.toLowerCase().includes(searchLower)) ||
        (frame.applications && frame.applications.some(app => 
          app.toLowerCase().includes(searchLower)
        ))
      );
    }
    
    // Filter by size (when viewing frames)
    if (activeTab === 'frames' && selectedType !== 'all') {
      filteredResults = filteredResults.filter(frame => {
        const lensCount = frame.lens_count || frame.lens_ids?.length || 0;
        switch (selectedType) {
          case 'large':
            return lensCount >= 15;
          case 'medium':
            return lensCount >= 8 && lensCount < 15;
          case 'small':
            return lensCount < 8;
          default:
            return true;
        }
      });
    }
    
    return filteredResults;
  }, [allFrames, searchTerm, selectedType, activeTab]);
  
  // Filter tags based on search and popularity
  const filteredTags = useMemo(() => {
    let filtered = allTags;
    
    // Filter by search term
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(tag => 
        tag.name.toLowerCase().includes(searchLower)
      );
    }
    
    // Filter by popularity
    if (activeTab === 'tags' && selectedType !== 'all') {
      filtered = filtered.filter(tag => {
        if (selectedType === 'popular') {
          return tag.count >= 10;
        } else if (selectedType === 'common') {
          return tag.count >= 5 && tag.count < 10;
        } else if (selectedType === 'rare') {
          return tag.count < 5;
        }
        return true;
      });
    }
    
    return filtered;
  }, [allTags, searchTerm, selectedType, activeTab]);

  // Get displayed items based on active tab
  const displayedLenses = useMemo(() => {
    return filteredLenses.slice(0, displayedItems);
  }, [filteredLenses, displayedItems]);

  const displayedFrames = useMemo(() => {
    return filteredFrames.slice(0, displayedItems);
  }, [filteredFrames, displayedItems]);
  
  const displayedTags = useMemo(() => {
    return filteredTags.slice(0, displayedItems);
  }, [filteredTags, displayedItems]);

  const hasMore = activeTab === 'lenses' 
    ? displayedItems < filteredLenses.length
    : activeTab === 'frames'
    ? displayedItems < filteredFrames.length
    : displayedItems < filteredTags.length;

  // Fetch frame details with lenses
  const fetchFrameDetails = useCallback(async (frameId) => {
    try {
      const response = await fetch(`${process.env.REACT_APP_LENS_API_URL || 'http://localhost:5003/api/v1'}/frames?id=${frameId}`);
      if (response.ok) {
        const data = await response.json();
        setSelectedFrameDetails(data.frame);
      }
    } catch (error) {
      console.error('Error fetching frame details:', error);
    }
  }, []);
  
  // Show tag details with lenses
  const showTagDetails = useCallback((tag) => {
    // Get all lenses with this tag
    const tagLenses = lenses.filter(lens => 
      lens.related_concepts && lens.related_concepts.includes(tag.name)
    );
    setSelectedTagDetails({
      ...tag,
      lenses: tagLenses
    });
  }, [lenses]);

  // Handle URL parameters for deep linking
  useEffect(() => {
    if (location.pathname.startsWith('/lens/') && params.id && lenses.length > 0) {
      // Handle lens deep link
      const lens = lenses.find(l => l.id === params.id);
      if (lens) {
        setSelectedLens(lens);
        setActiveTab('lenses');
      }
    } else if (location.pathname.startsWith('/frame/') && params.id) {
      // Handle frame deep link
      fetchFrameDetails(params.id);
      setActiveTab('frames');
    } else if (location.pathname.startsWith('/tag/') && params.name) {
      // Handle tag deep link
      const tag = allTags.find(t => t.name === decodeURIComponent(params.name));
      if (tag) {
        showTagDetails(tag);
        setActiveTab('tags');
      } else {
        // Tag not found - redirect to home and show error
        console.warn(`Tag not found: ${decodeURIComponent(params.name)}`);
        navigate('/');
        // Could also show a toast notification here
      }
    } else if (location.pathname === '/') {
      // Clear all modals when navigating to root
      setSelectedLens(null);
      setSelectedFrameDetails(null);
      setSelectedTagDetails(null);
    }
  }, [params, location.pathname, lenses, frames, allTags, fetchFrameDetails, showTagDetails]);

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          const maxItems = activeTab === 'lenses' 
            ? filteredLenses.length 
            : activeTab === 'frames'
            ? filteredFrames.length
            : filteredTags.length;
          setDisplayedItems(prev => Math.min(prev + itemsPerPage, maxItems));
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [hasMore, loading, filteredLenses.length, filteredFrames.length, activeTab]);

  // Track if we're currently showing search results
  const [isSearchActive, setIsSearchActive] = useState(false);
  
  // Create debounced search function
  const debouncedSearch = useMemo(
    () => debounce((value) => {
      if (value.trim()) {
        setIsSearchActive(true);
        searchLenses(value);
      } else if (isSearchActive) {
        // When clearing search, fetch all lenses again but skip loading state
        setIsSearchActive(false);
        fetchLenses({}, true); // Pass true to skip loading state
      }
      // If no search was active, don't do anything
    }, 300),
    [searchLenses, fetchLenses, isSearchActive]
  );

  // Cancel debounced search on unmount
  useEffect(() => {
    return () => {
      debouncedSearch.cancel();
    };
  }, [debouncedSearch]);

  // Handle search
  const handleSearch = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    setDisplayedItems(30); // Reset infinite scroll
    debouncedSearch(value);
  };

  // Handle type filter
  const handleTypeFilter = (type) => {
    setSelectedType(type);
    setDisplayedItems(30); // Reset infinite scroll
    
    // For tags, we filter client-side, no API call needed
    if (activeTab === 'tags') {
      return;
    }
    
    // For lenses and frames, make API calls
    if (type === 'all') {
      fetchLenses();
    } else {
      fetchLenses({ type });
    }
  };

  // Keyboard navigation for modals
  useEffect(() => {
    const handleKeyPress = (e) => {
      // Don't handle if user is typing in an input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      if (selectedLens) {
        const currentIndex = filteredLenses.findIndex(l => l.id === selectedLens.id);
        if ((e.key === 'ArrowLeft' || e.key === 'k' || e.key === 'K') && currentIndex > 0) {
          navigate(`/lens/${filteredLenses[currentIndex - 1].id}`);
        } else if ((e.key === 'ArrowRight' || e.key === 'j' || e.key === 'J') && currentIndex < filteredLenses.length - 1) {
          navigate(`/lens/${filteredLenses[currentIndex + 1].id}`);
        } else if (e.key === 'Escape') {
          navigate('/');
        }
      } else if (selectedFrameDetails) {
        const currentIndex = filteredFrames.findIndex(f => f.id === selectedFrameDetails.id);
        if ((e.key === 'ArrowLeft' || e.key === 'k' || e.key === 'K') && currentIndex > 0) {
          navigate(`/frame/${filteredFrames[currentIndex - 1].id}`);
        } else if ((e.key === 'ArrowRight' || e.key === 'j' || e.key === 'J') && currentIndex < filteredFrames.length - 1) {
          navigate(`/frame/${filteredFrames[currentIndex + 1].id}`);
        } else if (e.key === 'Escape') {
          navigate('/');
        }
      } else if (selectedTagDetails) {
        const currentIndex = filteredTags.findIndex(t => t.name === selectedTagDetails.name);
        if ((e.key === 'ArrowLeft' || e.key === 'k' || e.key === 'K') && currentIndex > 0) {
          navigate(`/tag/${encodeURIComponent(filteredTags[currentIndex - 1].name)}`);
        } else if ((e.key === 'ArrowRight' || e.key === 'j' || e.key === 'J') && currentIndex < filteredTags.length - 1) {
          navigate(`/tag/${encodeURIComponent(filteredTags[currentIndex + 1].name)}`);
        } else if (e.key === 'Escape') {
          navigate('/');
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [selectedLens, selectedFrameDetails, selectedTagDetails, filteredLenses, filteredFrames, filteredTags, navigate]);

  // Close mobile menu when navigating
  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };
  
  // Copy link to clipboard
  const copyLinkToClipboard = async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      // Could add a toast notification here
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  };

  // Copy data as JSON
  const copyAsJSON = useCallback(() => {
    let dataToExport;
    let filename;
    
    switch (activeTab) {
      case 'lenses':
        dataToExport = {
          total: filteredLenses.length,
          lenses: filteredLenses.map(lens => ({
            id: lens.id,
            name: lens.lens_name,
            type: lens.lens_type,
            definition: lens.definition,
            episode: lens.episode,
            frames: lens.frame_ids || [],
            tags: lens.related_concepts || [],
            connections: lens.connected_lenses || []
          }))
        };
        filename = 'flux-lenses.json';
        break;
        
      case 'frames':
        dataToExport = {
          total: filteredFrames.length,
          frames: filteredFrames.map(frame => ({
            id: frame.id,
            name: frame.name,
            description: frame.description,
            insights: frame.insights,
            applications: frame.applications || [],
            lens_count: frame.lens_count || frame.lens_ids?.length || 0,
            lens_ids: frame.lens_ids || []
          }))
        };
        filename = 'flux-frames.json';
        break;
        
      case 'tags':
        dataToExport = {
          total: filteredTags.length,
          tags: filteredTags.map(tag => ({
            name: tag.name,
            count: tag.count,
            lens_ids: tag.lens_ids || []
          }))
        };
        filename = 'flux-tags.json';
        break;
        
      default:
        return;
    }
    
    try {
      const jsonString = JSON.stringify(dataToExport, null, 2);
      
      // Copy to clipboard
      navigator.clipboard.writeText(jsonString).then(() => {
        // Show success feedback (you could add a toast notification here)
        const button = document.querySelector('.copy-json-btn');
        if (button) {
          const originalText = button.querySelector('span').textContent;
          button.querySelector('span').textContent = 'Copied!';
          button.classList.add('success');
          
          setTimeout(() => {
            button.querySelector('span').textContent = originalText;
            button.classList.remove('success');
          }, 2000);
        }
      }).catch((err) => {
        console.error('Failed to copy to clipboard:', err);
        // Fallback: download as file
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      });
    } catch (error) {
      console.error('Error exporting data:', error);
    }
  }, [activeTab, filteredLenses, filteredFrames, filteredTags]);

  if (loading && lenses.length === 0) {
    return (
      <div className="linear-loading">
        <div className="linear-spinner"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="linear-error">
        <div className="error-icon">⚠️</div>
        <p>Unable to load lenses</p>
        <button onClick={() => window.location.reload()} className="retry-btn">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="linear-container">
      {/* Mobile Overlay */}
      <div 
        className={`mobile-overlay ${mobileMenuOpen ? 'active' : ''}`}
        onClick={() => setMobileMenuOpen(false)}
      />

      {/* Sidebar */}
      <aside className={`linear-sidebar ${mobileMenuOpen ? 'mobile-open' : ''}`}>
        {/* Logo/Brand */}
        <div className="sidebar-header">
          <div className="brand">
            <div className="brand-icon">🌀</div>
            <div className="brand-text">
              <h1>Linsenkasten</h1>
              <p>FLUX Lens Collection</p>
            </div>
          </div>
          {/* Mobile Close Button */}
          <button 
            className="mobile-close-button"
            onClick={closeMobileMenu}
            aria-label="Close menu"
          >
            ×
          </button>
        </div>

        {/* Search */}
        <div className="sidebar-section">
          <div className="search-wrapper">
            <svg className="search-icon" width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M11 11L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <input
              type="text"
              placeholder={
                activeTab === 'lenses' ? "Search lenses..." : 
                activeTab === 'frames' ? "Search frames..." :
                "Search tags..."
              }
              value={searchTerm}
              onChange={handleSearch}
              className="search-field"
            />
            {searchTerm && (
              <button 
                className="search-clear"
                onClick={() => {
                  setSearchTerm('');
                  setDisplayedItems(30);
                  setIsSearchActive(false);
                  // Clear search and restore all lenses without loading state
                  fetchLenses({}, true);
                }}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M3.5 3.5L10.5 10.5M3.5 10.5L10.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="sidebar-section">
          <h3>{activeTab === 'lenses' ? 'Type' : activeTab === 'frames' ? 'Size' : 'Popularity'}</h3>
          <div className="filter-group">
            {activeTab === 'lenses' ? (
              <>
                <button 
                  className={`filter-option ${selectedType === 'all' ? 'active' : ''}`}
                  onClick={() => {
                    handleTypeFilter('all');
                    closeMobileMenu();
                  }}
                >
                  <span className="filter-label">All lenses</span>
                  <span className="filter-count">{stats?.total_lenses || 0}</span>
                </button>
                <button 
                  className={`filter-option ${selectedType === 'headline' ? 'active' : ''}`}
                  onClick={() => {
                    handleTypeFilter('headline');
                    closeMobileMenu();
                  }}
                >
                  <span className="filter-label">Headlines</span>
                  <span className="filter-count">{stats?.headline_lenses || 0}</span>
                </button>
                <button 
                  className={`filter-option ${selectedType === 'weekly' ? 'active' : ''}`}
                  onClick={() => handleTypeFilter('weekly')}
                >
                  <span className="filter-label">Weekly</span>
                  <span className="filter-count">{stats?.weekly_lenses || 0}</span>
                </button>
              </>
            ) : activeTab === 'frames' ? (
              <>
                <button 
                  className={`filter-option ${selectedType === 'all' ? 'active' : ''}`}
                  onClick={() => handleTypeFilter('all')}
                >
                  <span className="filter-label">All frames</span>
                  <span className="filter-count">{allFrames.length}</span>
                </button>
                <button 
                  className={`filter-option ${selectedType === 'large' ? 'active' : ''}`}
                  onClick={() => handleTypeFilter('large')}
                >
                  <span className="filter-label">Large (15+ lenses)</span>
                  <span className="filter-count">{allFrames.filter(f => f.lens_count >= 15).length}</span>
                </button>
                <button 
                  className={`filter-option ${selectedType === 'medium' ? 'active' : ''}`}
                  onClick={() => handleTypeFilter('medium')}
                >
                  <span className="filter-label">Medium (8-14 lenses)</span>
                  <span className="filter-count">{allFrames.filter(f => f.lens_count >= 8 && f.lens_count < 15).length}</span>
                </button>
                <button 
                  className={`filter-option ${selectedType === 'small' ? 'active' : ''}`}
                  onClick={() => handleTypeFilter('small')}
                >
                  <span className="filter-label">Small (&lt; 8 lenses)</span>
                  <span className="filter-count">{allFrames.filter(f => f.lens_count < 8).length}</span>
                </button>
              </>
            ) : (
              <>
                <button 
                  className={`filter-option ${selectedType === 'all' ? 'active' : ''}`}
                  onClick={() => handleTypeFilter('all')}
                >
                  <span className="filter-label">All tags</span>
                  <span className="filter-count">{allTags.length}</span>
                </button>
                <button 
                  className={`filter-option ${selectedType === 'popular' ? 'active' : ''}`}
                  onClick={() => handleTypeFilter('popular')}
                >
                  <span className="filter-label">Popular (10+ lenses)</span>
                  <span className="filter-count">{allTags.filter(t => t.count >= 10).length}</span>
                </button>
                <button 
                  className={`filter-option ${selectedType === 'common' ? 'active' : ''}`}
                  onClick={() => handleTypeFilter('common')}
                >
                  <span className="filter-label">Common (5-9 lenses)</span>
                  <span className="filter-count">{allTags.filter(t => t.count >= 5 && t.count < 10).length}</span>
                </button>
                <button 
                  className={`filter-option ${selectedType === 'rare' ? 'active' : ''}`}
                  onClick={() => handleTypeFilter('rare')}
                >
                  <span className="filter-label">Rare (&lt; 5 lenses)</span>
                  <span className="filter-count">{allTags.filter(t => t.count < 5).length}</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Frame Filter - only show when viewing lenses */}
        {activeTab === 'lenses' && frames.length > 0 && (
          <div className="sidebar-section">
            <div className="collapsible-header" onClick={() => toggleCollapsed('frames')}>
              <h3>Filter by Frame</h3>
              <svg 
                className={`collapse-icon ${collapsedSections.frames ? 'collapsed' : ''}`} 
                width="12" 
                height="12" 
                viewBox="0 0 12 12" 
                fill="none"
              >
                <path d="M2 4L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            {!collapsedSections.frames && (
              <>
                <button 
                  className="clear-filters-btn"
                  onClick={() => {
                    setSelectedFrames([]);
                    setDisplayedItems(30);
                  }}
                  disabled={selectedFrames.length === 0}
                >
                  Clear filters ({selectedFrames.length})
                </button>
                <div className="filter-group scrollable-filter-list">
                  {frames.map(frame => (
                    <button 
                      key={frame.id}
                      className={`filter-option ${selectedFrames.includes(frame.id) ? 'active' : ''}`}
                      onClick={() => {
                        if (selectedFrames.includes(frame.id)) {
                          setSelectedFrames(selectedFrames.filter(id => id !== frame.id));
                        } else {
                          setSelectedFrames([...selectedFrames, frame.id]);
                        }
                        setDisplayedItems(30);
                      }}
                    >
                      <span className="filter-label">{frame.name}</span>
                      <span className="filter-count">{frame.lens_count}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* Tags Filter - only show when viewing lenses */}
        {activeTab === 'lenses' && allTags.length > 0 && (
          <div className="sidebar-section">
            <div className="collapsible-header" onClick={() => toggleCollapsed('tags')}>
              <h3>Filter by Tags</h3>
              <svg 
                className={`collapse-icon ${collapsedSections.tags ? 'collapsed' : ''}`} 
                width="12" 
                height="12" 
                viewBox="0 0 12 12" 
                fill="none"
              >
                <path d="M2 4L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            {!collapsedSections.tags && (
              <>
                <button 
                  className="clear-filters-btn"
                  onClick={() => {
                    setSelectedTags([]);
                    setDisplayedItems(30);
                  }}
                  disabled={selectedTags.length === 0}
                >
                  Clear filters ({selectedTags.length})
                </button>
                <div className="filter-group scrollable-filter-list">
                  {allTags.slice(0, 50).map(tag => (
                    <button 
                      key={tag.name}
                      className={`filter-option ${selectedTags.includes(tag.name) ? 'active' : ''}`}
                      onClick={() => {
                        if (selectedTags.includes(tag.name)) {
                          setSelectedTags(selectedTags.filter(t => t !== tag.name));
                        } else {
                          setSelectedTags([...selectedTags, tag.name]);
                        }
                        setDisplayedItems(30);
                      }}
                    >
                      <span className="filter-label">{tag.name}</span>
                      <span className="filter-count">{tag.count}</span>
                    </button>
                  ))}
                  {allTags.length > 50 && (
                    <div className="filter-note">Showing top 50 tags</div>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </aside>

      {/* Main Content */}
      <main className="linear-main">
        {/* Tab Navigation */}
        <div className="tab-navigation">
          {/* Mobile Menu Button */}
          <button 
            className={`mobile-menu-button ${mobileMenuOpen ? 'active' : ''}`}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            <div className="hamburger">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </button>
          
          <div className="tab-buttons">
            <button
              className={`tab-button ${activeTab === 'lenses' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('lenses');
                setSelectedType('all');
                setDisplayedItems(30);
              }}
            >
              <span className="tab-icon">◉</span>
              Lenses
              <span className="tab-count">{stats?.total_lenses || 0}</span>
            </button>
            <button
              className={`tab-button ${activeTab === 'frames' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('frames');
                setSelectedType('all');
                setDisplayedItems(30);
              }}
            >
              <span className="tab-icon">✨</span>
              Frames
              <span className="tab-count">{frames.length}</span>
            </button>
            <button
              className={`tab-button ${activeTab === 'tags' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('tags');
                setSelectedTag(null);
                setDisplayedItems(30);
              }}
            >
              <span className="tab-icon">🏷️</span>
              Tags
              <span className="tab-count">{allTags.length}</span>
            </button>
          </div>
          <a 
            href="https://read.fluxcollective.org" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flux-link-header"
            title="Visit FLUX Collective"
          >
            <span>FLUX Collective</span>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M6 3L11 8L6 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </a>
        </div>

        {/* Content Header */}
        <div className="content-header">
          {/* View Toggle */}
          <div className="view-toggle">
            <button 
              className={`view-btn ${viewType === 'grid' ? 'active' : ''}`}
              onClick={() => setViewType('grid')}
              title="Grid View"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <rect x="2" y="2" width="5" height="5" stroke="currentColor" strokeWidth="1.5"/>
                <rect x="9" y="2" width="5" height="5" stroke="currentColor" strokeWidth="1.5"/>
                <rect x="2" y="9" width="5" height="5" stroke="currentColor" strokeWidth="1.5"/>
                <rect x="9" y="9" width="5" height="5" stroke="currentColor" strokeWidth="1.5"/>
              </svg>
              <span>Grid</span>
            </button>
            <button 
              className={`view-btn ${viewType === 'table' ? 'active' : ''}`}
              onClick={() => setViewType('table')}
              title="Table View"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M2 4H14M2 8H14M2 12H14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              <span>Table</span>
            </button>
            <button 
              className={`view-btn ${viewType === 'graph' ? 'active' : ''}`}
              onClick={() => setViewType('graph')}
              title="Graph View"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <circle cx="5" cy="5" r="2" stroke="currentColor" strokeWidth="1.5"/>
                <circle cx="11" cy="5" r="2" stroke="currentColor" strokeWidth="1.5"/>
                <circle cx="8" cy="11" r="2" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M5 5L11 5M5 5L8 11M11 5L8 11" stroke="currentColor" strokeWidth="1.5"/>
              </svg>
              <span>Graph</span>
            </button>
            <button 
              className="view-btn copy-json-btn"
              onClick={copyAsJSON}
              title="Copy as JSON"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <rect x="5" y="5" width="9" height="9" rx="1" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M11 3H3C2.44772 3 2 3.44772 2 4V12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              <span>Copy JSON</span>
            </button>
          </div>
          
          <div className="results-info">
            {activeTab === 'lenses' ? (
              searchTerm ? 
                `Found ${filteredLenses.length} results for "${searchTerm}"` : 
                <>
                  <span 
                    className="lens-count-hover"
                    onMouseEnter={(e) => {
                      setShowTooltip(true);
                      const rect = e.currentTarget.getBoundingClientRect();
                      e.currentTarget.dataset.left = rect.left + rect.width / 2;
                      e.currentTarget.dataset.top = rect.bottom;
                    }}
                    onMouseLeave={() => setShowTooltip(false)}
                  >
                    {filteredLenses.length} lenses
                  </span>
                  {showTooltip && stats && (
                    <div 
                      className="coverage-tooltip-wrapper"
                      style={{
                        position: 'fixed',
                        left: document.querySelector('.lens-count-hover')?.dataset.left + 'px',
                        top: document.querySelector('.lens-count-hover')?.dataset.top + 'px',
                        zIndex: 99999
                      }}
                    >
                      <div className="coverage-tooltip">
                        <div className="tooltip-content">
                          <h4>Coverage Statistics</h4>
                          <div className="tooltip-stats">
                            <div className="tooltip-stat">
                              <span className="tooltip-value">{stats.episodes_with_lenses}</span>
                              <span className="tooltip-label">Episodes with lenses</span>
                            </div>
                            <div className="tooltip-stat">
                              <span className="tooltip-value">{stats.episode_coverage_percent}%</span>
                              <span className="tooltip-label">Episode coverage</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </>
            ) : activeTab === 'frames' ? (
              searchTerm ? 
                `Found ${filteredFrames.length} results for "${searchTerm}"` : 
                `${filteredFrames.length} frames`
            ) : (
              selectedTag ?
                `Showing lenses with tag "${selectedTag}"` :
                searchTerm ? 
                  `Found ${filteredTags.length} tags for "${searchTerm}"` : 
                  `${filteredTags.length} unique tags`
            )}
            {activeTab === 'lenses' && filteredLenses.length > displayedItems && (
              <span className="showing-count"> • Showing {displayedItems}</span>
            )}
            {activeTab === 'frames' && filteredFrames.length > displayedItems && (
              <span className="showing-count"> • Showing {displayedItems}</span>
            )}
            {activeTab === 'tags' && !selectedTag && filteredTags.length > displayedItems && (
              <span className="showing-count"> • Showing {displayedItems}</span>
            )}
          </div>
        </div>

        {/* Content View */}
        {viewType === 'graph' ? (
          <LensGraphViewOptimized 
            entityType={activeTab}
            onNodeClick={(node) => {
              if (activeTab === 'lenses') {
                // Find the full lens data
                const lens = lenses.find(l => l.id === node.id);
                if (lens) setSelectedLens(lens);
              } else if (activeTab === 'frames') {
                // Find and show frame details
                const frame = frames.find(f => f.id === node.id);
                if (frame) fetchFrameDetails(frame.id);
              } else if (activeTab === 'tags') {
                // Find and show tag details
                const tag = allTags.find(t => t.name === node.id);
                if (tag) navigate(`/tag/${encodeURIComponent(tag.name)}`);
              }
            }}
          />
        ) : viewType === 'grid' ? (
          <div className="lens-linear-grid">
            {activeTab === 'lenses' && !selectedTag ? (
              // Lens cards
              <>
                {displayedLenses.map((lens) => (
                  <div 
                    key={lens.id} 
                    className="lens-card"
                    onClick={() => navigate(`/lens/${lens.id}`)}
                  >
                    <div className="lens-card-header">
                      <h3 className="lens-name">{lens.lens_name}</h3>
                      <div className="lens-meta">
                        <span 
                          className={`type-tag ${lens.lens_type}`}
                          title={lens.lens_type === 'headline' ? 'Headline Lens' : 'Weekly Lens'}
                        >
                          {lens.lens_type === 'headline' ? 'H' : 'W'}
                        </span>
                        <a 
                          href={lens.source_url || generateDeepLink(lens.episode, lens.lens_name)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="episode-tag clickable"
                          onClick={(e) => e.stopPropagation()}
                          title="Read FLUX episode"
                        >
                          Episode #{lens.episode}
                        </a>
                      </div>
                    </div>
                    
                    <p className="lens-description">
                      {lens.definition.length > 150 
                        ? lens.definition.substring(0, 150) + '...' 
                        : lens.definition}
                    </p>
                    
                    {lens.related_concepts && lens.related_concepts.length > 0 && (
                      <div className="tag-badges">
                        {lens.related_concepts.slice(0, 3).map((tag, idx) => (
                          <span 
                            key={idx} 
                            className="tag-badge clickable"
                            onClick={(e) => {
                              e.stopPropagation();
                              const tagData = allTags.find(t => t.name === tag);
                              if (tagData) showTagDetails(tagData);
                            }}
                          >
                            {tag}
                          </span>
                        ))}
                        {lens.related_concepts.length > 3 && (
                          <span className="more-tags">+{lens.related_concepts.length - 3}</span>
                        )}
                      </div>
                    )}
                    
                    {lens.frame_ids && lens.frame_ids.length > 0 && (
                      <div className="frame-badges">
                        {lens.frame_ids.slice(0, 2).map(frameId => {
                          const frame = frameMap[frameId];
                          return frame ? (
                            <span 
                              key={frameId} 
                              className="frame-badge clickable" 
                              title={frame.description}
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveTab('frames');
                                fetchFrameDetails(frameId);
                              }}
                            >
                              {frame.name}
                            </span>
                          ) : null;
                        })}
                        {lens.frame_ids.length > 2 && (
                          <span className="more-frames">+{lens.frame_ids.length - 2}</span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </>
            ) : activeTab === 'lenses' && selectedTag ? (
              // Filtered lens cards by tag
              <>
                {displayedLenses.map((lens) => (
                  <div 
                    key={lens.id} 
                    className="lens-card"
                    onClick={() => navigate(`/lens/${lens.id}`)}
                  >
                    <div className="lens-card-header">
                      <h3 className="lens-name">{lens.lens_name}</h3>
                      <div className="lens-meta">
                        <span className={`type-tag ${lens.lens_type}`}>
                          {lens.lens_type === 'headline' ? 'Headline' : 'Weekly'}
                        </span>
                        <span className="episode-tag">Ep {lens.episode}</span>
                      </div>
                    </div>
                    
                    <p className="lens-definition">{lens.definition}</p>
                    
                    {lens.related_concepts && lens.related_concepts.length > 0 && (
                      <div className="concept-cloud">
                        {lens.related_concepts.map((concept, idx) => (
                          <span 
                            key={idx} 
                            className={`concept-tag ${concept === selectedTag ? 'highlighted' : ''} clickable`}
                            onClick={(e) => {
                              e.stopPropagation();
                              const tagData = allTags.find(t => t.name === concept);
                              if (tagData) showTagDetails(tagData);
                            }}
                          >
                            {concept}
                          </span>
                        ))}
                      </div>
                    )}
                    
                    {lens.frame_ids && lens.frame_ids.length > 0 && (
                      <div className="frame-badges">
                        {lens.frame_ids.slice(0, 2).map(frameId => {
                          const frame = frameMap[frameId];
                          return frame ? (
                            <span 
                              key={frameId} 
                              className="frame-badge clickable" 
                              title={frame.description}
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveTab('frames');
                                fetchFrameDetails(frameId);
                              }}
                            >
                              {frame.name}
                            </span>
                          ) : null;
                        })}
                        {lens.frame_ids.length > 2 && (
                          <span className="more-frames">+{lens.frame_ids.length - 2}</span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </>
            ) : activeTab === 'frames' ? (
              // Frame cards
              <>
                {displayedFrames.map((frame) => (
                  <div 
                    key={frame.id} 
                    className="thematic-frame-card"
                    onClick={() => navigate(`/frame/${frame.id}`)}
                  >
                    <div className="thematic-frame-header">
                      <h3 className="frame-name">{frame.name}</h3>
                      <span className="lens-count-badge">
                        {frame.lens_count} lenses
                      </span>
                    </div>
                    
                    <p className="frame-description">{frame.description}</p>
                    
                    {frame.metaphor && (
                      <p className="frame-metaphor-preview">{frame.metaphor}</p>
                    )}
                    
                    <div className="frame-applications">
                      <h4>Applications:</h4>
                      <ul>
                        {frame.applications && frame.applications.slice(0, 3).map((app, idx) => (
                          <li key={idx}>{app}</li>
                        ))}
                      </ul>
                    </div>
                    
                    <div className="frame-insights-preview">
                      <p>{frame.insights}</p>
                    </div>
                  </div>
                ))}
              </>
            ) : (
              // Tag cards
              <>
                {displayedTags.map((tag) => (
                  <div 
                    key={tag.name} 
                    className="tag-card"
                    onClick={() => navigate(`/tag/${encodeURIComponent(tag.name)}`)}
                  >
                    <h3 className="tag-name">{tag.name}</h3>
                    <div className="tag-stats">
                      <span className="tag-count">{tag.count} lenses</span>
                    </div>
                    <div className="tag-sample-lenses">
                      {tag.lens_ids.slice(0, 3).map(lensId => {
                        const lens = lenses.find(l => l.id === lensId);
                        return lens ? (
                          <div key={lensId} className="sample-lens">
                            <span className="sample-lens-name">{lens.lens_name}</span>
                            <span className="sample-lens-episode">Ep {lens.episode}</span>
                          </div>
                        ) : null;
                      })}
                      {tag.lens_ids.length > 3 && (
                        <div className="more-lenses">+{tag.lens_ids.length - 3} more</div>
                      )}
                    </div>
                  </div>
                ))}
              </>
            )}
            {/* Infinite scroll trigger */}
            {hasMore && (
              <div ref={loadMoreRef} className="load-more-trigger">
                <div className="spinner"></div>
                <p>Loading more...</p>
              </div>
            )}
          </div>
        ) : (
          // Table View
          <div className="lens-table-container">
            <table className="lens-table">
              <thead>
                <tr>
                  {activeTab === 'lenses' ? (
                    <>
                      <th>Name</th>
                      <th>Type</th>
                      <th>Episode</th>
                      <th>Definition</th>
                      <th>Tags</th>
                      <th>Frames</th>
                    </>
                  ) : activeTab === 'frames' ? (
                    <>
                      <th>Frame Name</th>
                      <th>Lenses</th>
                      <th>Description</th>
                      <th>Applications</th>
                    </>
                  ) : (
                    <>
                      <th>Tag Name</th>
                      <th>Lens Count</th>
                      <th>Example Lenses</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {activeTab === 'lenses' ? (
                  displayedLenses.map((lens) => (
                  <tr 
                    key={lens.id} 
                    onClick={() => navigate(`/lens/${lens.id}`)}
                    className="lens-row"
                  >
                    <td className="lens-name-cell" data-label="Lens Name">{lens.lens_name}</td>
                    <td data-label="Type">
                      <span 
                        className={`type-tag ${lens.lens_type}`}
                        title={lens.lens_type === 'headline' ? 'Headline Lens' : 'Weekly Lens'}
                      >
                        {lens.lens_type === 'headline' ? 'H' : 'W'}
                      </span>
                    </td>
                    <td className="episode-cell" data-label="Episode">
                      <a 
                        href={lens.source_url || generateDeepLink(lens.episode, lens.lens_name)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="episode-link"
                        onClick={(e) => e.stopPropagation()}
                        title="Read FLUX episode"
                      >
                        #{lens.episode}
                      </a>
                    </td>
                    <td className="definition-cell" data-label="Definition">
                      {lens.definition.length > 150 
                        ? lens.definition.substring(0, 150) + '...' 
                        : lens.definition}
                    </td>
                    <td className="tags-cell" data-label="Tags">
                      {lens.related_concepts && lens.related_concepts.length > 0 && (
                        <div className="tag-badges">
                          {lens.related_concepts.slice(0, 2).map((tag, idx) => (
                            <span 
                              key={idx} 
                              className="tag-badge clickable"
                              onClick={(e) => {
                                e.stopPropagation();
                                const tagData = allTags.find(t => t.name === tag);
                                if (tagData) showTagDetails(tagData);
                              }}
                            >
                              {tag}
                            </span>
                          ))}
                          {lens.related_concepts.length > 2 && (
                            <span className="more-tags">+{lens.related_concepts.length - 2}</span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="frames-cell" data-label="Frames">
                      {lens.frame_ids && lens.frame_ids.length > 0 && (
                        <div className="frame-badges">
                          {lens.frame_ids.slice(0, 2).map(frameId => {
                            const frame = frameMap[frameId];
                            return frame ? (
                              <span 
                                key={frameId} 
                                className="frame-badge clickable" 
                                title={frame.description}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveTab('frames');
                                  fetchFrameDetails(frameId);
                                }}
                              >
                                {frame.name}
                              </span>
                            ) : null;
                          })}
                          {lens.frame_ids.length > 2 && (
                            <span className="more-frames">+{lens.frame_ids.length - 2}</span>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))
                ) : activeTab === 'frames' ? (
                  displayedFrames.map((frame) => (
                    <tr 
                      key={frame.id} 
                      className="lens-row"
                    >
                      <td className="lens-name-cell" data-label="Frame Name">{frame.name}</td>
                      <td className="lens-count-cell" data-label="Lens Count">
                        <span className="lens-count-badge">
                          {frame.lens_count}
                        </span>
                      </td>
                      <td className="definition-cell" data-label="Description">{frame.description}</td>
                      <td className="concepts-cell" data-label="Applications">
                        <div className="applications-preview">
                          {frame.applications && frame.applications.slice(0, 2).map((app, idx) => (
                            <span key={idx} className="application-tag">{app}</span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  displayedTags.map((tag) => (
                    <tr 
                      key={tag.name} 
                      className="lens-row"
                      onClick={() => navigate(`/tag/${encodeURIComponent(tag.name)}`)}
                    >
                      <td className="lens-name-cell">{tag.name}</td>
                      <td className="lens-count-cell">
                        <span className="lens-count-badge">
                          {tag.count}
                        </span>
                      </td>
                      <td className="example-lenses-cell">
                        <div className="example-lenses">
                          {tag.lens_ids.slice(0, 3).map(lensId => {
                            const lens = lenses.find(l => l.id === lensId);
                            return lens ? (
                              <span key={lensId} className="example-lens-tag">
                                {lens.lens_name}
                              </span>
                            ) : null;
                          })}
                          {tag.lens_ids.length > 3 && (
                            <span className="more-tag">+{tag.lens_ids.length - 3} more</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            {/* Infinite scroll trigger for table */}
            {hasMore && (
              <div ref={loadMoreRef} className="load-more-trigger">
                <div className="spinner"></div>
                <p>Loading more...</p>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Modal */}
      {selectedLens && (
        <div className="linear-modal-overlay" onClick={() => navigate('/')}>
          <div className="linear-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-row">
                <h2>{selectedLens.lens_name}</h2>
                <div className="modal-nav-controls">
                  <button 
                    className="modal-nav-btn"
                    onClick={() => {
                      const currentIndex = filteredLenses.findIndex(l => l.id === selectedLens.id);
                      if (currentIndex > 0) {
                        navigate(`/lens/${filteredLenses[currentIndex - 1].id}`);
                      }
                    }}
                    disabled={filteredLenses.findIndex(l => l.id === selectedLens.id) === 0}
                    title="Previous lens (← or K)"
                  >
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <path d="M12 4L6 10L12 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                  <button 
                    className="modal-nav-btn"
                    onClick={() => {
                      const currentIndex = filteredLenses.findIndex(l => l.id === selectedLens.id);
                      if (currentIndex < filteredLenses.length - 1) {
                        navigate(`/lens/${filteredLenses[currentIndex + 1].id}`);
                      }
                    }}
                    disabled={filteredLenses.findIndex(l => l.id === selectedLens.id) === filteredLenses.length - 1}
                    title="Next lens (→ or J)"
                  >
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <path d="M8 4L14 10L8 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                  <button 
                    className="modal-nav-btn"
                    onClick={copyLinkToClipboard}
                    title="Copy link to this lens"
                  >
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <path d="M8 3H6C4.895 3 4 3.895 4 5V17C4 18.105 4.895 19 6 19H14C15.105 19 16 18.105 16 17V5C16 3.895 15.105 3 14 3H12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M8 3H12V1H8V3Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M8 7H12M8 11H12M8 15H10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                  <button className="modal-close-btn" onClick={() => navigate('/')}>
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <path d="M5 5L15 15M5 15L15 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                  </button>
                </div>
              </div>
              <div className="modal-metadata">
                <span className={`type-badge ${selectedLens.lens_type}`}>
                  {selectedLens.lens_type} lens
                </span>
                <span className="separator">•</span>
                <a 
                  href={selectedLens.source_url || generateDeepLink(selectedLens.episode, selectedLens.lens_name)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="episode-link"
                  onClick={(e) => e.stopPropagation()}
                >
                  Episode {selectedLens.episode}
                </a>
              </div>
            </div>

            <div className="modal-content">
              <section className="modal-section">
                <h4>Definition</h4>
                <p>{selectedLens.definition}</p>
              </section>

              {selectedLens.examples && selectedLens.examples.length > 0 && (
                <section className="modal-section">
                  <h4>Examples</h4>
                  <ul className="examples-list">
                    {selectedLens.examples.map((example, idx) => (
                      <li key={idx}>{example}</li>
                    ))}
                  </ul>
                </section>
              )}

              {selectedLens.related_concepts && selectedLens.related_concepts.length > 0 && (
                <section className="modal-section">
                  <h4>Tags</h4>
                  <div className="concept-cloud">
                    {selectedLens.related_concepts.map((concept, idx) => (
                      <span 
                        key={idx} 
                        className="concept-pill clickable"
                        onClick={() => {
                          const tagData = allTags.find(t => t.name === concept);
                          if (tagData) {
                            setSelectedLens(null);
                            showTagDetails(tagData);
                          }
                        }}
                      >
                        {concept}
                      </span>
                    ))}
                  </div>
                </section>
              )}

              {selectedLens.frame_ids && selectedLens.frame_ids.length > 0 && (
                <section className="modal-section">
                  <h4>Frames</h4>
                  <div className="modal-frames-list">
                    {selectedLens.frame_ids.map(frameId => {
                      const frame = frameMap[frameId];
                      return frame ? (
                        <div 
                          key={frameId} 
                          className="modal-frame-item clickable"
                          onClick={() => {
                            setSelectedLens(null);
                            fetchFrameDetails(frameId);
                          }}
                        >
                          <h5>{frame.name}</h5>
                          <p>{frame.description}</p>
                          {frame.metaphor && (
                            <p className="frame-metaphor">{frame.metaphor}</p>
                          )}
                        </div>
                      ) : null;
                    })}
                  </div>
                </section>
              )}

              {/* Dialectic Contrasts Section */}
              {(lensContrasts.length > 0 || contrastsLoading) && (
                <section className="modal-section contrasts-section">
                  <h4>
                    <span className="section-icon">⚖️</span>
                    Dialectic Contrasts
                  </h4>
                  {contrastsLoading ? (
                    <p className="loading-text">Loading contrasts...</p>
                  ) : (
                    <div className="contrasts-list">
                      {lensContrasts.map((contrast, idx) => (
                        <div
                          key={idx}
                          className="contrast-item clickable"
                          onClick={() => {
                            // Navigate to the contrasting lens
                            const contrastLens = lenses.find(l => l.id === contrast.id);
                            if (contrastLens) {
                              navigate(`/lens/${contrast.id}`);
                            }
                          }}
                        >
                          <div className="contrast-header">
                            <span className="contrast-arrow">↔</span>
                            <span className="contrast-name">{contrast.name}</span>
                            <span className="contrast-episode">Ep. {contrast.episode}</span>
                          </div>
                          <p className="contrast-definition">{contrast.definition?.slice(0, 150)}...</p>
                          {contrast.insight && (
                            <p className="contrast-insight">💡 {contrast.insight.slice(0, 200)}...</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Frame Detail Modal */}
      {selectedFrameDetails && (
        <div className="linear-modal-overlay" onClick={() => navigate('/')}>
          <div className="linear-modal frame-detail-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-row">
                <h2>{selectedFrameDetails.name}</h2>
                <div className="modal-nav-controls">
                  <button 
                    className="modal-nav-btn"
                    onClick={() => {
                      const currentIndex = filteredFrames.findIndex(f => f.id === selectedFrameDetails.id);
                      if (currentIndex > 0) {
                        navigate(`/frame/${filteredFrames[currentIndex - 1].id}`);
                      }
                    }}
                    disabled={filteredFrames.findIndex(f => f.id === selectedFrameDetails.id) === 0}
                    title="Previous frame (← or K)"
                  >
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <path d="M12 4L6 10L12 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                  <button 
                    className="modal-nav-btn"
                    onClick={() => {
                      const currentIndex = filteredFrames.findIndex(f => f.id === selectedFrameDetails.id);
                      if (currentIndex < filteredFrames.length - 1) {
                        navigate(`/frame/${filteredFrames[currentIndex + 1].id}`);
                      }
                    }}
                    disabled={filteredFrames.findIndex(f => f.id === selectedFrameDetails.id) === filteredFrames.length - 1}
                    title="Next frame (→ or J)"
                  >
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <path d="M8 4L14 10L8 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                  <button 
                    className="modal-nav-btn"
                    onClick={copyLinkToClipboard}
                    title="Copy link to this frame"
                  >
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <path d="M8 3H6C4.895 3 4 3.895 4 5V17C4 18.105 4.895 19 6 19H14C15.105 19 16 18.105 16 17V5C16 3.895 15.105 3 14 3H12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M8 3H12V1H8V3Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M8 7H12M8 11H12M8 15H10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                  <button className="modal-close-btn" onClick={() => navigate('/')}>
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <path d="M5 5L15 15M5 15L15 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                  </button>
                </div>
              </div>
              <div className="modal-metadata">
                <span className="frame-lens-count">
                  {selectedFrameDetails.lenses ? selectedFrameDetails.lenses.length : selectedFrameDetails.lens_count} lenses
                </span>
              </div>
            </div>

            <div className="modal-content">
              <section className="modal-section">
                <h4>Description</h4>
                <p>{selectedFrameDetails.description}</p>
                {selectedFrameDetails.metaphor && (
                  <p className="frame-metaphor">{selectedFrameDetails.metaphor}</p>
                )}
              </section>

              {selectedFrameDetails.insights && (
                <section className="modal-section">
                  <h4>Key Insights</h4>
                  <p>{selectedFrameDetails.insights}</p>
                </section>
              )}

              {selectedFrameDetails.applications && selectedFrameDetails.applications.length > 0 && (
                <section className="modal-section">
                  <h4>Applications</h4>
                  <ul className="applications-list">
                    {selectedFrameDetails.applications.map((app, idx) => (
                      <li key={idx}>{app}</li>
                    ))}
                  </ul>
                </section>
              )}

              {selectedFrameDetails.lenses && selectedFrameDetails.lenses.length > 0 && (
                <section className="modal-section">
                  <h4>Lenses in this Frame</h4>
                  <div className="frame-lenses-grid">
                    {selectedFrameDetails.lenses.map((lens) => (
                      <div 
                        key={lens.id} 
                        className="frame-lens-card"
                        onClick={() => {
                          setSelectedFrameDetails(null);
                          setSelectedLens(lens);
                        }}
                      >
                        <div className="frame-lens-header">
                          <h5>{lens.lens_name}</h5>
                          <span className={`type-tag ${lens.lens_type}`}>
                            {lens.lens_type === 'headline' ? 'H' : 'W'}
                          </span>
                        </div>
                        <p className="frame-lens-definition">
                          {lens.definition.length > 120 
                            ? lens.definition.substring(0, 120) + '...' 
                            : lens.definition}
                        </p>
                        <div className="frame-lens-meta">
                          <span className="episode-tag">Episode {lens.episode}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tag Detail Modal */}
      {selectedTagDetails && (
        <div className="linear-modal-overlay" onClick={() => navigate('/')}>
          <div className="linear-modal tag-detail-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-row">
                <h2>{selectedTagDetails.name}</h2>
                <div className="modal-nav-controls">
                  <button 
                    className="modal-nav-btn"
                    onClick={() => {
                      const currentIndex = filteredTags.findIndex(t => t.name === selectedTagDetails.name);
                      if (currentIndex > 0) {
                        navigate(`/tag/${encodeURIComponent(filteredTags[currentIndex - 1].name)}`);
                      }
                    }}
                    disabled={filteredTags.findIndex(t => t.name === selectedTagDetails.name) === 0}
                    title="Previous tag (← or K)"
                  >
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <path d="M12 4L6 10L12 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                  <button 
                    className="modal-nav-btn"
                    onClick={() => {
                      const currentIndex = filteredTags.findIndex(t => t.name === selectedTagDetails.name);
                      if (currentIndex < filteredTags.length - 1) {
                        navigate(`/tag/${encodeURIComponent(filteredTags[currentIndex + 1].name)}`);
                      }
                    }}
                    disabled={filteredTags.findIndex(t => t.name === selectedTagDetails.name) === filteredTags.length - 1}
                    title="Next tag (→ or J)"
                  >
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <path d="M8 4L14 10L8 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                  <button 
                    className="modal-nav-btn"
                    onClick={copyLinkToClipboard}
                    title="Copy link to this tag"
                  >
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <path d="M8 3H6C4.895 3 4 3.895 4 5V17C4 18.105 4.895 19 6 19H14C15.105 19 16 18.105 16 17V5C16 3.895 15.105 3 14 3H12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M8 3H12V1H8V3Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M8 7H12M8 11H12M8 15H10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                  <button className="modal-close-btn" onClick={() => navigate('/')}>
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <path d="M5 5L15 15M5 15L15 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                  </button>
                </div>
              </div>
              <div className="modal-metadata">
                <span className="tag-info">
                  {selectedTagDetails.count} {selectedTagDetails.count === 1 ? 'lens' : 'lenses'}
                </span>
              </div>
            </div>

            <div className="modal-content">
              <section className="modal-section">
                <h4>Lenses with this tag</h4>
                <div className="tag-lenses-grid">
                  {selectedTagDetails.lenses && selectedTagDetails.lenses.map((lens) => (
                    <div 
                      key={lens.id} 
                      className="tag-lens-card"
                      onClick={() => {
                        setSelectedTagDetails(null);
                        setSelectedLens(lens);
                      }}
                    >
                      <div className="tag-lens-header">
                        <h5>{lens.lens_name}</h5>
                        <span className={`type-tag ${lens.lens_type}`}>
                          {lens.lens_type === 'headline' ? 'H' : 'W'}
                        </span>
                      </div>
                      <p className="tag-lens-definition">
                        {lens.definition.length > 120 
                          ? lens.definition.substring(0, 120) + '...' 
                          : lens.definition}
                      </p>
                      <div className="tag-lens-meta">
                        <span className="episode-tag">Episode {lens.episode}</span>
                        {lens.frame_ids && lens.frame_ids.length > 0 && (
                          <div className="tag-lens-frames">
                            {lens.frame_ids.slice(0, 2).map(frameId => {
                              const frame = frameMap[frameId];
                              return frame ? (
                                <span 
                                  key={frameId} 
                                  className="mini-frame-badge clickable"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedTagDetails(null);
                                    setActiveTab('frames');
                                    fetchFrameDetails(frameId);
                                  }}
                                  title={frame.description}
                                >
                                  {frame.name}
                                </span>
                              ) : null;
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LensExplorerLinear;