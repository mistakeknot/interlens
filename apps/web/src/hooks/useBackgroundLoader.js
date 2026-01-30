// Hook for background loading and caching of graph data
import { useEffect, useRef } from 'react';
import cacheService from '../services/cacheService';

const API_BASE_URL = process.env.REACT_APP_LENS_API_URL || 'http://localhost:5003/api/v1';

export const useBackgroundLoader = () => {
  const loadingRef = useRef(false);
  const loadedRef = useRef(new Set());

  // Fetch and cache data
  const fetchAndCache = async (url, cacheKey, ttl = 3 * 24 * 60 * 60 * 1000) => {
    try {
      // Skip if already loaded in this session
      if (loadedRef.current.has(cacheKey)) {
        return;
      }

      // Check if valid cache exists
      if (cacheService.isValid(cacheKey)) {
        loadedRef.current.add(cacheKey);
        return;
      }

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch ${url}`);
      }

      const data = await response.json();
      cacheService.set(cacheKey, data, ttl);
      loadedRef.current.add(cacheKey);
      
      console.log(`Cached: ${cacheKey}`);
    } catch (error) {
      console.error(`Background loading error for ${cacheKey}:`, error);
    }
  };

  // Load only essential data in background (not graphs)
  const loadEssentialData = async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;

    // Only preload data needed for initial grid/table views
    const essentialEndpoints = [
      // Base data needed immediately
      {
        url: `${API_BASE_URL}/lenses`,
        key: 'lenses_all'
      },
      {
        url: `${API_BASE_URL}/frames`,
        key: 'frames_all'
      },
      {
        url: `${API_BASE_URL}/lenses/stats`,
        key: 'lenses_stats'
      }
    ];
    
    // Graph data will be loaded on-demand when user switches to graph view

    // Load data with staggered delays to avoid overwhelming the server
    for (let i = 0; i < essentialEndpoints.length; i++) {
      const endpoint = essentialEndpoints[i];
      
      // Add a small delay between requests
      if (i > 0) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      
      fetchAndCache(endpoint.url, endpoint.key);
    }

    loadingRef.current = false;
  };

  useEffect(() => {
    // Start background loading after a short delay
    const timer = setTimeout(() => {
      loadEssentialData();
    }, 1500); // 1.5 second delay after component mount

    // Cleanup expired cache entries on mount
    cacheService.clearExpired();

    return () => clearTimeout(timer);
  }, []);

  return {
    // Expose cache methods if needed
    getCachedData: (key) => cacheService.get(key),
    clearCache: () => cacheService.clear(),
    getCacheStats: () => cacheService.getStats()
  };
};