// Script to check database tables using direct SQL
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Get Supabase URL and key from environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Supabase URL or key not found in environment variables.');
  console.error('Make sure you have NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your .env file.');
  process.exit(1);
}

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTables() {
  try {
    console.log('Checking database tables...');
    
    // Use a direct SQL query to get table names
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
      `
    });
    
    if (error) {
      console.error('Error checking database tables:', error);
      
      // Try another approach if the RPC fails
      console.log('Trying alternative approach...');
      const { data: tableData, error: tableError } = await supabase
        .from('profiles')
        .select('*')
        .limit(1);
      
      if (tableError) {
        console.error('Error checking profiles table:', tableError);
      } else {
        console.log('Profiles table exists and contains data:', tableData);
      }
      
      return;
    }
    
    console.log('Available tables:', data);
  } catch (error) {
    console.error('Error checking database tables:', error);
  }
}

// Run the check
checkTables();
