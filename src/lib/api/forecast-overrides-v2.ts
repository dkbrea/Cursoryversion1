import { supabase } from '../supabase';

export interface ForecastOverride {
  itemId: string;
  monthYear: string; // Format: 'YYYY-MM'
  overrideAmount: number;
  type: 'variable-expense' | 'goal-contribution' | 'debt-additional-payment';
  updatedAt: string;
}

export interface ForecastOverrides {
  [key: string]: ForecastOverride; // key format: `${itemId}-${monthYear}-${type}`
}

// Helper function to create override key
const createOverrideKey = (itemId: string, monthYear: string, type: string): string => {
  return `${itemId}-${monthYear}-${type}`;
};

// LocalStorage fallback functions
const STORAGE_KEY = 'forecast_overrides';

const getLocalStorageOverrides = (userId: string): ForecastOverrides => {
  if (typeof window === 'undefined') return {};
  
  try {
    const stored = localStorage.getItem(`${STORAGE_KEY}_${userId}`);
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    console.error('Error reading from localStorage:', error);
    return {};
  }
};

const saveLocalStorageOverrides = (userId: string, overrides: ForecastOverrides): void => {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(`${STORAGE_KEY}_${userId}`, JSON.stringify(overrides));
  } catch (error) {
    console.error('Error saving to localStorage:', error);
  }
};

// Helper function to check if database column exists
const checkDatabaseColumnExists = async (): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('user_preferences')
      .select('forecast_overrides')
      .limit(1);
    
    return !error || !error.message.includes('does not exist');
  } catch {
    return false;
  }
};

// Helper function to get user preferences with overrides
const getUserPreferences = async (userId: string): Promise<ForecastOverrides> => {
  try {
    const columnExists = await checkDatabaseColumnExists();
    
    if (!columnExists) {
      console.log('Database column not available, using localStorage fallback');
      return getLocalStorageOverrides(userId);
    }

    const { data, error } = await supabase
      .from('user_preferences')
      .select('forecast_overrides')
      .eq('user_id', userId)
      .maybeSingle();

    if (error && !error.message.includes('No rows')) {
      console.warn('Database error, falling back to localStorage:', error.message);
      return getLocalStorageOverrides(userId);
    }

    // Type assertion since we know the structure
    const dbOverrides = (data as any)?.forecast_overrides || {};
    
    // Merge with localStorage if needed (migration scenario)
    const localOverrides = getLocalStorageOverrides(userId);
    const mergedOverrides = { ...localOverrides, ...dbOverrides };
    
    // If we have local overrides that aren't in DB, save them
    if (Object.keys(localOverrides).length > 0 && Object.keys(dbOverrides).length === 0) {
      await saveUserPreferences(userId, mergedOverrides);
    }
    
    return mergedOverrides;
  } catch (error) {
    console.warn('Error getting user preferences, using localStorage:', error);
    return getLocalStorageOverrides(userId);
  }
};

// Helper function to save user preferences with overrides
const saveUserPreferences = async (userId: string, overrides: ForecastOverrides): Promise<void> => {
  try {
    const columnExists = await checkDatabaseColumnExists();
    
    if (!columnExists) {
      console.log('Database column not available, saving to localStorage');
      saveLocalStorageOverrides(userId, overrides);
      return;
    }

    const { error } = await supabase
      .from('user_preferences')
      .upsert({
        user_id: userId,
        forecast_overrides: overrides
      }, {
        onConflict: 'user_id'
      });

    if (error) {
      console.warn('Database save failed, falling back to localStorage:', error.message);
      saveLocalStorageOverrides(userId, overrides);
      return;
    }
    
    // Also save to localStorage as backup
    saveLocalStorageOverrides(userId, overrides);
  } catch (error) {
    console.warn('Error saving user preferences, using localStorage:', error);
    saveLocalStorageOverrides(userId, overrides);
  }
};

export const saveForecastOverride = async (
  userId: string,
  itemId: string,
  monthYear: string, // Format: 'YYYY-MM'
  overrideAmount: number,
  type: 'variable-expense' | 'goal-contribution' | 'debt-additional-payment'
): Promise<{ success: boolean; error?: string }> => {
  try {
    // Get current overrides
    const currentOverrides = await getUserPreferences(userId);
    
    // Create override key
    const key = createOverrideKey(itemId, monthYear, type);
    
    // Update overrides
    const updatedOverrides = {
      ...currentOverrides,
      [key]: {
        itemId,
        monthYear,
        overrideAmount,
        type,
        updatedAt: new Date().toISOString()
      }
    };
    
    // Save back to database/localStorage
    await saveUserPreferences(userId, updatedOverrides);
    
    return { success: true };
  } catch (error: any) {
    console.error('Error saving forecast override:', error);
    return { success: false, error: error.message };
  }
};

export const getForecastOverrides = async (
  userId: string,
  monthYear?: string
): Promise<{ overrides: ForecastOverride[]; error?: string }> => {
  try {
    const allOverrides = await getUserPreferences(userId);
    
    // Convert object to array and filter by month if specified
    const overrideArray = Object.values(allOverrides).filter((override: ForecastOverride) => {
      if (!monthYear) return true;
      return override.monthYear === monthYear;
    });
    
    return { overrides: overrideArray };
  } catch (error: any) {
    console.error('Error getting forecast overrides:', error);
    return { overrides: [], error: error.message };
  }
};

export const getForecastOverridesForMonth = async (
  userId: string,
  monthYear: string
): Promise<{ overrides: Record<string, number>; error?: string }> => {
  try {
    const { overrides, error } = await getForecastOverrides(userId, monthYear);
    
    if (error) {
      return { overrides: {}, error };
    }

    // Group overrides by itemId for easy lookup
    const groupedOverrides: Record<string, number> = {};
    
    overrides.forEach(override => {
      groupedOverrides[override.itemId] = override.overrideAmount;
    });

    return { overrides: groupedOverrides };
  } catch (error: any) {
    return { overrides: {}, error: error.message };
  }
};

export const deleteForecastOverride = async (
  userId: string,
  itemId: string,
  monthYear: string,
  type: 'variable-expense' | 'goal-contribution' | 'debt-additional-payment'
): Promise<{ success: boolean; error?: string }> => {
  try {
    // Get current overrides
    const currentOverrides = await getUserPreferences(userId);
    
    // Create override key
    const key = createOverrideKey(itemId, monthYear, type);
    
    // Remove the override
    const updatedOverrides = { ...currentOverrides };
    delete updatedOverrides[key];
    
    // Save back to database/localStorage
    await saveUserPreferences(userId, updatedOverrides);
    
    return { success: true };
  } catch (error: any) {
    console.error('Error deleting forecast override:', error);
    return { success: false, error: error.message };
  }
};

// Utility function to clear all overrides for a user (useful for testing/reset)
export const clearAllForecastOverrides = async (
  userId: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    await saveUserPreferences(userId, {});
    return { success: true };
  } catch (error: any) {
    console.error('Error clearing forecast overrides:', error);
    return { success: false, error: error.message };
  }
};

// Utility function to migrate localStorage data to database (call this after adding the column)
export const migrateForecastOverridesToDatabase = async (
  userId: string
): Promise<{ success: boolean; error?: string; migrated: number }> => {
  try {
    const localOverrides = getLocalStorageOverrides(userId);
    const localCount = Object.keys(localOverrides).length;
    
    if (localCount === 0) {
      return { success: true, migrated: 0 };
    }
    
    // Check if database column exists
    const columnExists = await checkDatabaseColumnExists();
    if (!columnExists) {
      return { success: false, error: 'Database column not available yet', migrated: 0 };
    }
    
    // Save to database
    const { error } = await supabase
      .from('user_preferences')
      .upsert({
        user_id: userId,
        forecast_overrides: localOverrides
      }, {
        onConflict: 'user_id'
      });
      
    if (error) {
      return { success: false, error: error.message, migrated: 0 };
    }
    
    return { success: true, migrated: localCount };
  } catch (error: any) {
    return { success: false, error: error.message, migrated: 0 };
  }
}; 