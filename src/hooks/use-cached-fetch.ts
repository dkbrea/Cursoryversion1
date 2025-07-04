"use client";

import { useState, useEffect } from 'react';
import { navigationCache } from '@/lib/utils/navigation-cache';

type FetchOptions = {
  cacheKey: string;
  cacheDuration?: number; // in milliseconds
  enabled?: boolean;
  onSuccess?: (data: any) => void;
  onError?: (error: Error) => void;
};

/**
 * A hook that fetches data with caching to improve navigation performance
 * 
 * @param fetchFn - The function that fetches the data
 * @param options - Options for caching and fetching behavior
 * @returns Object containing the data, loading state, error, and refetch function
 */
export function useCachedFetch<T>(
  fetchFn: () => Promise<T>,
  options: FetchOptions
) {
  const { 
    cacheKey, 
    cacheDuration = 60 * 1000, // 1 minute default
    enabled = true,
    onSuccess,
    onError
  } = options;
  
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Function to fetch data with caching
  const fetchData = async (skipCache = false) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Check cache first if not skipping cache
      if (!skipCache) {
        const cachedData = navigationCache.get<T>(cacheKey);
        if (cachedData) {
          setData(cachedData);
          setIsLoading(false);
          onSuccess?.(cachedData);
          return;
        }
      }
      
      // Fetch fresh data
      const result = await fetchFn();
      
      // Store in cache
      navigationCache.set(cacheKey, result, cacheDuration);
      
      // Update state
      setData(result);
      onSuccess?.(result);
      
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      onError?.(error);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch data on mount if enabled
  useEffect(() => {
    if (enabled) {
      fetchData();
    }
  }, [cacheKey, enabled]);

  // Function to manually refetch data
  const refetch = (skipCache = true) => {
    return fetchData(skipCache);
  };

  // Function to invalidate the cache for this key
  const invalidateCache = () => {
    navigationCache.clear(cacheKey);
  };

  return { data, isLoading, error, refetch, invalidateCache };
}
