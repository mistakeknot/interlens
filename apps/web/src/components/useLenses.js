// Custom React hook for fetching and managing lens data
import { useState, useEffect, useCallback } from 'react';
import cacheService from '../services/cacheService';

const API_BASE_URL = process.env.REACT_APP_LENS_API_URL || 'http://localhost:5003/api/v1';
console.log('Using API URL:', API_BASE_URL);

export const useLenses = () => {
  const [lenses, setLenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(null);

  // Fetch all lenses
  const fetchLenses = useCallback(async (filters = {}, skipLoading = false) => {
    if (!skipLoading) setLoading(true);
    setError(null);
    
    try {
      const queryParams = new URLSearchParams(filters).toString();
      const cacheKey = queryParams ? `lenses_${queryParams}` : 'lenses_all';
      
      // Check cache first
      const cachedData = cacheService.get(cacheKey);
      if (cachedData) {
        console.log('Using cached lenses data');
        setLenses(cachedData.lenses);
        if (!skipLoading) setLoading(false);
        return;
      }
      
      const response = await fetch(`${API_BASE_URL}/lenses?${queryParams}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch lenses');
      }
      
      const data = await response.json();
      console.log('Fetched lenses:', data.lenses.length);
      console.log('Lenses with AI connections:', data.lenses.filter(l => l.ai_connections && l.ai_connections.length > 0).length);
      // Log first lens with AI connections
      const firstWithConnections = data.lenses.find(l => l.ai_connections && l.ai_connections.length > 0);
      console.log('First lens with AI connections:', firstWithConnections);
      
      // Cache the response
      cacheService.set(cacheKey, data);
      
      setLenses(data.lenses);
    } catch (err) {
      setError(err.message);
    } finally {
      if (!skipLoading) setLoading(false);
    }
  }, []);

  // Search lenses
  const searchLenses = useCallback(async (query) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_BASE_URL}/lenses/search?q=${encodeURIComponent(query)}`);
      
      if (!response.ok) {
        throw new Error('Search failed');
      }
      
      const data = await response.json();
      setLenses(data.results);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch statistics
  const fetchStats = useCallback(async () => {
    try {
      const cacheKey = 'lenses_stats';
      
      // Check cache first
      const cachedData = cacheService.get(cacheKey);
      if (cachedData) {
        setStats(cachedData.statistics);
        return;
      }
      
      const response = await fetch(`${API_BASE_URL}/lenses/stats`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch stats');
      }
      
      const data = await response.json();
      
      // Cache the response
      cacheService.set(cacheKey, data);
      
      setStats(data.statistics);
    } catch (err) {
      console.error('Stats fetch error:', err);
    }
  }, []);

  // Get lenses by episode
  const getLensesByEpisode = useCallback(async (episodeNum) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_BASE_URL}/lenses/episodes/${episodeNum}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch episode lenses');
      }
      
      const data = await response.json();
      return data.lenses;
    } catch (err) {
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchLenses();
    fetchStats();
  }, [fetchLenses, fetchStats]);

  return {
    lenses,
    loading,
    error,
    stats,
    fetchLenses,
    searchLenses,
    getLensesByEpisode,
    refetch: () => {
      fetchLenses();
      fetchStats();
    }
  };
};

// Hook for timeline data
export const useLensTimeline = () => {
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTimeline = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/lenses/timeline`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch timeline');
        }
        
        const data = await response.json();
        setTimeline(data.timeline);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchTimeline();
  }, []);

  return { timeline, loading, error };
};

// Hook for concepts
export const useConcepts = () => {
  const [concepts, setConcepts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchConcepts = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/lenses/concepts`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch concepts');
        }
        
        const data = await response.json();
        setConcepts(data.concepts);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchConcepts();
  }, []);

  return { concepts, loading, error };
};

// Hook for lens contrasts (dialectic pairs)
export const useLensContrasts = (lensId) => {
  const [contrasts, setContrasts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchContrasts = async () => {
      if (!lensId) {
        setContrasts([]);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // First get the lens name from the ID
        const lensResponse = await fetch(`${API_BASE_URL}/lenses/${lensId}`);
        if (!lensResponse.ok) {
          throw new Error('Lens not found');
        }
        const lensData = await lensResponse.json();
        const lensName = lensData.lens?.name || lensData.lens?.lens_name;

        if (!lensName) {
          setContrasts([]);
          setLoading(false);
          return;
        }

        // Then fetch contrasts using lens name
        const response = await fetch(`${API_BASE_URL}/creative/contrasts?lens=${encodeURIComponent(lensName)}`);

        if (!response.ok) {
          // No contrasts available is not an error
          if (response.status === 404) {
            setContrasts([]);
            setLoading(false);
            return;
          }
          throw new Error('Failed to fetch contrasts');
        }

        const data = await response.json();
        setContrasts(data.contrasts || []);
      } catch (err) {
        console.error('Contrasts fetch error:', err);
        setError(err.message);
        setContrasts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchContrasts();
  }, [lensId]);

  return { contrasts, loading, error };
};

// Hook for frames
export const useFrames = () => {
  const [frames, setFrames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchFrames = async () => {
      try {
        const cacheKey = 'frames_all';
        
        // Check cache first
        const cachedData = cacheService.get(cacheKey);
        if (cachedData) {
          setFrames(cachedData.frames);
          setLoading(false);
          return;
        }
        
        const response = await fetch(`${API_BASE_URL}/frames`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch frames');
        }
        
        const data = await response.json();
        
        // Cache the response
        cacheService.set(cacheKey, data);
        
        setFrames(data.frames);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchFrames();
  }, []);

  return { frames, loading, error };
};