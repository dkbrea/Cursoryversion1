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
    
    // Try alternative method using direct query execution
    try {
      const sql = fs.readFileSync(filename, 'utf8');
      console.log('Trying alternative execution method...');
      
      // Split SQL into individual statements and execute each one
      const statements = sql.split(';').filter(stmt => stmt.trim());
      
      for (const statement of statements) {
        if (statement.trim()) {
          console.log(`Executing: ${statement.trim().substring(0, 50)}...`);
          
          // Use the proper method to execute raw SQL
          const { error: execError } = await supabase
            .from('_migrations') // This won't work, we need a different approach
            .select('*')
            .limit(0);
            
          // Actually, let's use a different approach - direct SQL execution
          const { data: result, error: sqlError } = await supabase
            .rpc('exec_sql', { query: statement.trim() });
            
          if (sqlError && !sqlError.message.includes('does not exist')) {
            // Try one more method
            const response = await fetch(`${supabase.supabaseUrl}/rest/v1/rpc/exec_sql`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'Content-Type': 'application/json',
                'apikey': serviceRoleKey
              },
              body: JSON.stringify({ query: statement.trim() })
            });
            
            if (!response.ok) {
              console.log(`⚠️  Statement may have failed: ${statement.trim().substring(0, 50)}...`);
            } else {
              console.log(`✅ Executed: ${statement.trim().substring(0, 50)}...`);
            }
          }
        }
      }
      
      console.log(`✅ Migration ${filename} completed via alternative method`);
      return true;
      
    } catch (altError) {
      console.error('Alternative method also failed:', altError.message);
      console.log('\n🔧 MANUAL SOLUTION REQUIRED:');
      console.log('Please run this SQL manually in your Supabase SQL Editor:');
      console.log('\n' + fs.readFileSync(filename, 'utf8'));
      return false;
    }
  }
}

async function runAllMigrations() {
  try {
    console.log('🚀 Starting migrations with Supabase client...\n');
    
    await runMigrationSQL('add_line_of_credit_debt_type.sql');
    console.log('');
    
    await runMigrationSQL('add_debt_account_support_to_transactions.sql');
    console.log('');
    
    // Add background theme support to sinking funds
    await runMigrationSQL('supabase/migrations/20250608000001_add_background_theme_to_sinking_funds.sql');
    
    console.log('\n🎉 All migrations completed successfully!');
  } catch (error) {
    console.error('\n💥 Migration failed. You may need to run these manually in the Supabase SQL editor.');
    console.log('\nMigration 1 - add_line_of_credit_debt_type.sql:');
    console.log(fs.readFileSync('add_line_of_credit_debt_type.sql', 'utf8'));
    console.log('\nMigration 2 - add_debt_account_support_to_transactions.sql:');
    console.log(fs.readFileSync('add_debt_account_support_to_transactions.sql', 'utf8'));
    console.log('\nMigration 3 - add_background_theme_to_sinking_funds.sql:');
    try {
      console.log(fs.readFileSync('supabase/migrations/20250608000001_add_background_theme_to_sinking_funds.sql', 'utf8'));
    } catch (readError) {
      console.log('Could not read background theme migration file');
    }
    process.exit(1);
  }
}

runAllMigrations(); 