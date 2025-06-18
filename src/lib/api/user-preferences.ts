import { supabase, handleSupabaseError } from '../supabase';
import type { PaycheckPreferences } from '@/types';

export interface UserPreferences {
  id: string;
  userId: string;
  currency: string;
  dateFormat: string;
  theme: 'light' | 'dark' | 'system';
  hideBalances: boolean;
  emailNotifications: boolean;
  browserNotifications: boolean;
  mobileNotifications: boolean;
  timezone?: string;
  financialTrackingStartDate?: Date;
  setupProgress: any;
  paycheckPreferences?: PaycheckPreferences;
  createdAt: string;
  updatedAt: string;
}

export const getUserPreferences = async (userId: string): Promise<{ preferences: UserPreferences | null; error?: string }> => {
  try {
    const { data, error } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      // If no preferences found, create default ones
      if (error.code === 'PGRST116') {
        return createDefaultUserPreferences(userId);
      }
      return { preferences: null, error: error.message };
    }

    // Transform from database format to application format
    const preferences: UserPreferences = {
      id: data.id,
      userId: data.user_id,
      currency: data.currency,
      dateFormat: data.date_format,
      theme: data.theme,
      hideBalances: data.hide_balances,
      emailNotifications: data.email_notifications,
      browserNotifications: data.browser_notifications,
      mobileNotifications: data.mobile_notifications,
      timezone: data.timezone || undefined,
      financialTrackingStartDate: data.financial_tracking_start_date ? new Date(data.financial_tracking_start_date) : undefined,
      setupProgress: data.setup_progress,
      paycheckPreferences: data.paycheck_preferences,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };

    return { preferences };
  } catch (error: any) {
    return { preferences: null, error: error.message };
  }
};

export const createDefaultUserPreferences = async (userId: string): Promise<{ preferences: UserPreferences | null; error?: string }> => {
  try {
    // Detect user's timezone
    const detectedTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    // Default paycheck preferences
    const defaultPaycheckPreferences: PaycheckPreferences = {
      timingMode: 'current-period', // Most intuitive for paycheck budgeters
      includeBufferDays: 3, // 3-day buffer for bill timing
      prioritizeSinkingFunds: false, // Start conservative
      sinkingFundStrategy: 'frequency-based' // Match their chosen frequency
    };

    const { data, error } = await supabase
      .from('user_preferences')
      .insert({
        user_id: userId,
        currency: 'USD',
        date_format: 'MM/DD/YYYY',
        theme: 'system',
        hide_balances: false,
        email_notifications: true,
        browser_notifications: true,
        mobile_notifications: false,
        timezone: detectedTimezone,
        setup_progress: { steps: {} },
        paycheck_preferences: defaultPaycheckPreferences
      })
      .select()
      .single();

    if (error) {
      return { preferences: null, error: error.message };
    }

    // Transform from database format to application format
    const preferences: UserPreferences = {
      id: data.id,
      userId: data.user_id,
      currency: data.currency,
      dateFormat: data.date_format,
      theme: data.theme,
      hideBalances: data.hide_balances,
      emailNotifications: data.email_notifications,
      browserNotifications: data.browser_notifications,
      mobileNotifications: data.mobile_notifications,
      timezone: data.timezone || undefined,
      financialTrackingStartDate: data.financial_tracking_start_date ? new Date(data.financial_tracking_start_date) : undefined,
      setupProgress: data.setup_progress,
      paycheckPreferences: data.paycheck_preferences,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };

    return { preferences };
  } catch (error: any) {
    return { preferences: null, error: error.message };
  }
};

export const updateUserPreferences = async (
  userId: string,
  updates: Partial<Pick<UserPreferences, 'currency' | 'dateFormat' | 'theme' | 'hideBalances' | 'emailNotifications' | 'browserNotifications' | 'mobileNotifications' | 'timezone' | 'financialTrackingStartDate' | 'paycheckPreferences'>>
): Promise<{ preferences: UserPreferences | null; error?: string }> => {
  try {
    // Transform from application format to database format
    const updateData: any = {};
    if (updates.currency !== undefined) updateData.currency = updates.currency;
    if (updates.dateFormat !== undefined) updateData.date_format = updates.dateFormat;
    if (updates.theme !== undefined) updateData.theme = updates.theme;
    if (updates.hideBalances !== undefined) updateData.hide_balances = updates.hideBalances;
    if (updates.emailNotifications !== undefined) updateData.email_notifications = updates.emailNotifications;
    if (updates.browserNotifications !== undefined) updateData.browser_notifications = updates.browserNotifications;
    if (updates.mobileNotifications !== undefined) updateData.mobile_notifications = updates.mobileNotifications;
    if (updates.timezone !== undefined) updateData.timezone = updates.timezone;
    if (updates.financialTrackingStartDate !== undefined) updateData.financial_tracking_start_date = updates.financialTrackingStartDate;
    if (updates.paycheckPreferences !== undefined) updateData.paycheck_preferences = updates.paycheckPreferences;

    const { data, error } = await supabase
      .from('user_preferences')
      .update(updateData)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      return { preferences: null, error: error.message };
    }

    // Transform back to application format
    const preferences: UserPreferences = {
      id: data.id,
      userId: data.user_id,
      currency: data.currency,
      dateFormat: data.date_format,
      theme: data.theme,
      hideBalances: data.hide_balances,
      emailNotifications: data.email_notifications,
      browserNotifications: data.browser_notifications,
      mobileNotifications: data.mobile_notifications,
      timezone: data.timezone || undefined,
      financialTrackingStartDate: data.financial_tracking_start_date ? new Date(data.financial_tracking_start_date) : undefined,
      setupProgress: data.setup_progress,
      paycheckPreferences: data.paycheck_preferences,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };

    return { preferences };
  } catch (error: any) {
    return { preferences: null, error: error.message };
  }
}; 