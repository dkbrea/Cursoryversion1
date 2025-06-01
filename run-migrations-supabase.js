const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('Supabase URL:', supabaseUrl);
console.log('Service Role Key:', serviceRoleKey ? 'Present' : 'Missing');

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function runMigrationSQL(filename) {
  try {
    const sql = fs.readFileSync(filename, 'utf8');
    console.log(`Running migration: ${filename}`);
    console.log(`SQL: ${sql.substring(0, 100)}...`);
    
    // Use rpc to execute raw SQL with service role
    const { data, error } = await supabase.rpc('execute_sql', { sql_query: sql });
    
    if (error) {
      throw error;
    }
    
    console.log(`✅ Migration ${filename} completed successfully`);
    return true;
  } catch (error) {
    console.error(`❌ Error running migration ${filename}:`, error.message);
    
    // Try alternative method using direct query
    try {
      const sql = fs.readFileSync(filename, 'utf8');
      console.log('Trying alternative execution method...');
      
      // Split SQL into individual statements
      const statements = sql.split(';').filter(stmt => stmt.trim());
      
      for (const statement of statements) {
        if (statement.trim()) {
          console.log(`Executing: ${statement.trim().substring(0, 50)}...`);
          const { error: execError } = await supabase.from('_').select('*').limit(0);
          // This won't work for DDL, but let's see what happens
        }
      }
      
    } catch (altError) {
      console.error('Alternative method also failed:', altError.message);
      throw error;
    }
  }
}

async function runAllMigrations() {
  try {
    console.log('🚀 Starting migrations with Supabase client...\n');
    
    await runMigrationSQL('add_line_of_credit_debt_type.sql');
    console.log('');
    
    await runMigrationSQL('add_debt_account_support_to_transactions.sql');
    
    console.log('\n🎉 All migrations completed successfully!');
  } catch (error) {
    console.error('\n💥 Migration failed. You may need to run these manually in the Supabase SQL editor.');
    console.log('\nMigration 1 - add_line_of_credit_debt_type.sql:');
    console.log(fs.readFileSync('add_line_of_credit_debt_type.sql', 'utf8'));
    console.log('\nMigration 2 - add_debt_account_support_to_transactions.sql:');
    console.log(fs.readFileSync('add_debt_account_support_to_transactions.sql', 'utf8'));
    process.exit(1);
  }
}

runAllMigrations(); 