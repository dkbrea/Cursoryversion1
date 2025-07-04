"use client";

/**
 * A simple cache utility to store data between page navigations
 * This helps prevent unnecessary data refetching when navigating between pages
 */

type CachedData = {
  data: any;
  timestamp: number;
  expiresIn: number; // in milliseconds
};

class NavigationCache {
  private cache: Map<string, CachedData> = new Map();
  private readonly DEFAULT_EXPIRY = 60 * 1000; // 1 minute default

  /**
   * Set data in the cache with an optional expiration time
   */
  set(key: string, data: any, expiresIn: number = this.DEFAULT_EXPIRY): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      expiresIn,
    });
  }

  /**
   * Get data from the cache if it exists and hasn't expired
   */
  get<T>(key: string): T | null {
    const cached = this.cache.get(key);
    
    if (!cached) return null;
    
    // Check if the cached data has expired
    const now = Date.now();
    if (now - cached.timestamp > cached.expiresIn) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.data as T;
  }

  /**
   * Clear a specific item from the cache
   */
  clear(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clear all items from the cache
   */
  clearAll(): void {
    this.cache.clear();
  }

  /**
   * Check if a key exists in the cache and hasn't expired
   */
  has(key: string): boolean {
    const cached = this.cache.get(key);
    if (!cached) return false;
    
    const now = Date.now();
    if (now - cached.timestamp > cached.expiresIn) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }
}

// Create a singleton instance
export const navigationCache = new NavigationCache();
