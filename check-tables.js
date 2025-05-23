// Script to check database tables
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
    
    // Query the information_schema.tables to get a list of all tables
    const { data, error } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public');
    
    if (error) {
      console.error('Error checking database tables:', error);
      return;
    }
    
    console.log('Available tables:');
    data?.forEach(table => {
      console.log(`- ${table.table_name}`);
    });
  } catch (error) {
    console.error('Error checking database tables:', error);
  }
}

// Run the check
checkTables();
