const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTables() {
  console.log('Connecting to Supabase...');
  console.log('URL:', supabaseUrl);
  
  // List of tables we expect to exist in your app
  const tablesToCheck = [
    'accounts',
    'budget_categories',
    'categories', 
    'debt_accounts',
    'financial_goals',
    'recurring_items',
    'transactions',
    'users',
    'variable_expenses'
  ];
  
  console.log('\nChecking for table existence by attempting to query each table...\n');
  
  const existingTables = [];
  const nonExistentTables = [];
  
  for (const tableName of tablesToCheck) {
    try {
      const { data, error } = await supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true });
      
      if (error) {
        console.log(`❌ ${tableName}: ${error.message}`);
        nonExistentTables.push(tableName);
      } else {
        console.log(`✅ ${tableName}: exists (${data?.length || 0} rows visible)`);
        existingTables.push(tableName);
      }
    } catch (err) {
      console.log(`❌ ${tableName}: ${err.message}`);
      nonExistentTables.push(tableName);
    }
  }
  
  console.log('\n--- SUMMARY ---');
  console.log('Existing tables:', existingTables);
  console.log('Non-existent tables:', nonExistentTables);
  
  console.log('\n--- SPECIFIC CHECK FOR BUDGET SETUP ---');
  console.log('budget_categories exists:', existingTables.includes('budget_categories'));
  console.log('variable_expenses exists:', existingTables.includes('variable_expenses'));
  
  // If variable_expenses exists, let's check if it has data
  if (existingTables.includes('variable_expenses')) {
    try {
      const { count, error } = await supabase
        .from('variable_expenses')
        .select('*', { count: 'exact', head: true });
      
      if (!error) {
        console.log(`variable_expenses has ${count || 0} total rows`);
      }
    } catch (err) {
      console.log('Could not count variable_expenses rows');
    }
  }
}

checkTables(); 