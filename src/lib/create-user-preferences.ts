import { supabase } from './supabase';

/**
 * Creates a user preference record for the current user if one doesn't exist
 */
export async function createUserPreference(userId: string) {
  if (!userId) {
    console.error('No user ID provided to createUserPreference');
    return { success: false, error: 'No user ID provided' };
  }

  try {
    // Check if the user already has a preference record
    const { data, error: checkError } = await supabase
      .from('user_preferences')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    // If there's an error, the table might not exist or there's another issue
    if (checkError) {
      console.error('Error checking user preferences:', {
        message: checkError.message,
        code: checkError.code,
        details: checkError.details,
        hint: checkError.hint
      });
      return { success: false, error: checkError };
    }

    // If the user already has a preference record, return it
    if (data) {
      return { success: true, data, message: 'User preference already exists' };
    }

    // Create a new preference record for the user
    const { data: newData, error } = await supabase
      .from('user_preferences')
      .insert({
        user_id: userId,
        setup_progress: { steps: {} },
        currency: 'USD',
        date_format: 'MM/DD/YYYY',
        theme: 'system',
        hide_balances: false,
        email_notifications: true,
        browser_notifications: true,
        mobile_notifications: false
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating user preference:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      });
      return { success: false, error };
    }

    return { success: true, data: newData, message: 'User preference created successfully' };
  } catch (error) {
    console.error('Unexpected error creating user preference:', error);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}
