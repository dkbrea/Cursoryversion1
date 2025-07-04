#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Supabase environment variables not found');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runQuery(sql) {
  try {
    console.log('Executing query:', sql);
    console.log('---');
    
    // Try using the rpc function if it exists
    const { data, error } = await supabase.rpc('exec_sql', { sql });
    
    if (error) {
      console.error('Error:', error.message);
      
      // If exec_sql doesn't exist, try a different approach
      if (error.message.includes('function') && error.message.includes('does not exist')) {
        console.log('\nThe exec_sql function is not available. Trying alternative approach...');
        
        // For simple SELECT queries, we can try to parse and use the from() method
        if (sql.trim().toLowerCase().startsWith('select')) {
          console.log('For SELECT queries, you can use the Supabase client methods instead.');
          console.log('Example: supabase.from("table_name").select("*")');
        }
      }
    } else {
      if (data && Array.isArray(data) && data.length > 0) {
        console.log('Query Results:');
        console.table(data);
        console.log(`\nRows returned: ${data.length}`);
      } else {
        console.log('Query executed successfully');
        console.log('Result:', data);
      }
    }
    
  } catch (error) {
    console.error('Error executing query:', error.message);
  }
}

// Get SQL query from command line arguments
const sql = process.argv.slice(2).join(' ');

if (!sql) {
  console.log('Usage: node query.js "SELECT * FROM your_table;"');
  console.log('');
  console.log('Examples:');
  console.log('  node query.js "SELECT * FROM monthly_budget_overrides LIMIT 5;"');
  console.log('  node query.js "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = \'monthly_budget_overrides\';"');
  console.log('  node query.js "DESCRIBE monthly_budget_overrides;"');
  process.exit(1);
}

runQuery(sql); 