// Cache service for storing API responses with TTL
class CacheService {
  constructor() {
    this.prefix = 'lens_cache_';
    this.defaultTTL = 3 * 24 * 60 * 60 * 1000; // 3 days default TTL
    this.versionKey = 'lens_cache_version';
    this.apiUrl = process.env.REACT_APP_LENS_API_URL || 'http://localhost:5001/api/v1';
  }

  // Generate a cache key with prefix
  getCacheKey(key) {
    return `${this.prefix}${key}`;
  }

  // Check server cache version and clear cache if changed
  async checkServerVersion() {
    try {
      const response = await fetch(`${this.apiUrl}/cache/version`);
      if (!response.ok) return;

      const { version: serverVersion } = await response.json();
      const storedVersion = localStorage.getItem(this.versionKey);

      if (storedVersion && parseInt(storedVersion) !== serverVersion) {
        console.log('Server cache version changed, clearing local cache');
        this.clearAll();
      }

      localStorage.setItem(this.versionKey, serverVersion.toString());
    } catch (error) {
      console.error('Error checking cache version:', error);
    }
  }

  // Set data in cache with optional TTL
  set(key, data, ttl = this.defaultTTL) {
    try {
      const cacheData = {
        data,
        timestamp: Date.now(),
        ttl
      };
      localStorage.setItem(this.getCacheKey(key), JSON.stringify(cacheData));
      return true;
    } catch (error) {
      console.error('Cache set error:', error);
      // If quota exceeded, try to clear old cache entries
      if (error.name === 'QuotaExceededError') {
        this.clearExpired();
        try {
          localStorage.setItem(this.getCacheKey(key), JSON.stringify({ data, timestamp: Date.now(), ttl }));
          return true;
        } catch (retryError) {
          console.error('Cache set retry failed:', retryError);
          return false;
        }
      }
      return false;
    }
  }

  // Get data from cache if valid
  get(key) {
    try {
      const cached = localStorage.getItem(this.getCacheKey(key));
      if (!cached) return null;

      const { data, timestamp, ttl } = JSON.parse(cached);
      
      // Check if cache is still valid
      if (Date.now() - timestamp > ttl) {
        this.remove(key);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  // Check if cache entry is valid
  isValid(key) {
    try {
      const cached = localStorage.getItem(this.getCacheKey(key));
      if (!cached) return false;

      const { timestamp, ttl } = JSON.parse(cached);
      
      // Check if cache has expired based on TTL
      if (Date.now() - timestamp > ttl) {
        return false;
      }
      
      // Additionally, invalidate cache if it's after Thursday 6pm Pacific
      // and the cache was created before the last Thursday 6pm
      const cachedDate = new Date(timestamp);
      const now = new Date();
      
      // Get last Thursday 6pm Pacific
      const lastThursday = this.getLastThursday6pmPacific(now);
      
      // If cache is from before last Thursday update, invalidate it
      if (cachedDate < lastThursday && now > lastThursday) {
        return false;
      }
      
      return true;
    } catch (error) {
      return false;
    }
  }
  
  // Get the most recent Thursday at 6pm Pacific
  getLastThursday6pmPacific(date) {
    const pacific = new Date(date.toLocaleString("en-US", {timeZone: "America/Los_Angeles"}));
    const dayOfWeek = pacific.getDay();
    const daysToLastThursday = dayOfWeek >= 4 ? dayOfWeek - 4 : dayOfWeek + 3;
    
    const lastThursday = new Date(pacific);
    lastThursday.setDate(pacific.getDate() - daysToLastThursday);
    lastThursday.setHours(18, 0, 0, 0); // 6pm
    
    // If we're past this week's Thursday 6pm, use this week's Thursday
    if (pacific > lastThursday && dayOfWeek === 4 && pacific.getHours() >= 18) {
      return lastThursday;
    }
    // If we haven't reached this week's Thursday 6pm yet, use last week's
    else if (pacific < lastThursday || (dayOfWeek === 4 && pacific.getHours() < 18)) {
      lastThursday.setDate(lastThursday.getDate() - 7);
    }
    
    return lastThursday;
  }

  // Remove specific cache entry
  remove(key) {
    try {
      localStorage.removeItem(this.getCacheKey(key));
      return true;
    } catch (error) {
      console.error('Cache remove error:', error);
      return false;
    }
  }

  // Clear all cache entries
  clear() {
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith(this.prefix)) {
          localStorage.removeItem(key);
        }
      });
      return true;
    } catch (error) {
      console.error('Cache clear error:', error);
      return false;
    }
  }

  // Clear only expired entries
  clearExpired() {
    try {
      const keys = Object.keys(localStorage);
      let cleared = 0;
      
      keys.forEach(key => {
        if (key.startsWith(this.prefix)) {
          try {
            const cached = localStorage.getItem(key);
            if (cached) {
              const { timestamp, ttl } = JSON.parse(cached);
              if (Date.now() - timestamp > ttl) {
                localStorage.removeItem(key);
                cleared++;
              }
            }
          } catch (error) {
            // Remove corrupted entries
            localStorage.removeItem(key);
            cleared++;
          }
        }
      });
      
      console.log(`Cleared ${cleared} expired cache entries`);
      return cleared;
    } catch (error) {
      console.error('Clear expired error:', error);
      return 0;
    }
  }

  // Get cache statistics
  getStats() {
    try {
      const keys = Object.keys(localStorage);
      const cacheKeys = keys.filter(key => key.startsWith(this.prefix));
      let totalSize = 0;
      let validEntries = 0;
      let expiredEntries = 0;

      cacheKeys.forEach(key => {
        try {
          const cached = localStorage.getItem(key);
          if (cached) {
            totalSize += cached.length;
            const { timestamp, ttl } = JSON.parse(cached);
            if (Date.now() - timestamp <= ttl) {
              validEntries++;
            } else {
              expiredEntries++;
            }
          }
        } catch (error) {
          // Skip corrupted entries
        }
      });

      return {
        totalEntries: cacheKeys.length,
        validEntries,
        expiredEntries,
        totalSizeKB: Math.round(totalSize / 1024)
      };
    } catch (error) {
      console.error('Get stats error:', error);
      return null;
    }
  }

  // Generate cache key for graph data
  getGraphCacheKey(entityType, params = {}) {
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}=${params[key]}`)
      .join('&');
    return `graph_${entityType}_${sortedParams}`;
  }
}

// Export singleton instance
export default new CacheService();