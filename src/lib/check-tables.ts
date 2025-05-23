import { supabase } from './supabase';

/**
 * Utility function to check which tables exist in the database
 */
export async function checkDatabaseTables() {
  try {
    console.log('Checking database tables...');
    
    // Query the information_schema.tables to get a list of all tables
    const { data, error } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public');
    
    if (error) {
      console.error('Error checking database tables:', error);
      return { success: false, error };
    }
    
    console.log('Available tables:', data?.map(table => table.table_name));
    return { success: true, tables: data?.map(table => table.table_name) };
  } catch (error) {
    console.error('Error checking database tables:', error);
    return { success: false, error };
  }
}
