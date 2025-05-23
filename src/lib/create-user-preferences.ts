import { supabase } from './supabase';
import { useAuth } from '@/contexts/auth-context';

/**
 * Creates the user_preferences table in Supabase if it doesn't exist
 * and sets up the necessary RLS policies
 */
export async function createUserPreferencesTable() {
  try {
    // Check if the user_preferences table exists by querying it
    const { error: checkError } = await supabase
      .from('user_preferences')
      .select('id')
      .limit(1);

    // If there's no error, the table exists
    if (!checkError) {
      console.log('user_preferences table already exists');
      return { success: true, message: 'Table already exists' };
    }

    // If there's an error and it's not a "relation does not exist" error, return the error
    if (checkError && !checkError.message.includes('relation "user_preferences" does not exist')) {
      console.error('Error checking user_preferences table:', checkError);
      return { success: false, error: checkError };
    }

    // Execute the SQL to create the table and set up RLS policies
    const { error } = await supabase.rpc('create_user_preferences_table');

    if (error) {
      console.error('Error creating user_preferences table:', error);
      return { success: false, error };
    }

    return { success: true, message: 'Table created successfully' };
  } catch (error) {
    console.error('Unexpected error creating user_preferences table:', error);
    return { success: false, error };
  }
}

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
      console.error('Error creating user preference:', error);
      return { success: false, error };
    }

    return { success: true, data: newData, message: 'User preference created successfully' };
  } catch (error) {
    console.error('Unexpected error creating user preference:', error);
    return { success: false, error };
  }
}
