/**
 * Development-only logger utility
 * Logs only run in development mode to keep production clean
 */

const isDevelopment = process.env.NODE_ENV === 'development';

export const logger = {
  log: (...args: any[]) => {
    if (isDevelopment) {
      console.log('[DEV]', ...args);
    }
  },
  
  warn: (...args: any[]) => {
    if (isDevelopment) {
      console.warn('[DEV]', ...args);
    }
  },
  
  info: (...args: any[]) => {
    if (isDevelopment) {
      console.info('[DEV]', ...args);
    }
  },
  
  // Always log errors and important warnings even in production
  error: (...args: any[]) => {
    console.error(...args);
  },
  
  // Always log warnings for graceful degradation
  production_warn: (...args: any[]) => {
    console.warn(...args);
  }
};