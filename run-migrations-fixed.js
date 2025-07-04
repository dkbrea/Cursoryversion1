const fs = require('fs');
const { Client } = require('pg');
require('dotenv').config();

// Correct Supabase direct database connection format
const connectionString = `postgresql://postgres:${process.env.SUPABASE_DB_PASSWORD}@db.ezsfvsrdtljwgclpgivf.supabase.co:5432/postgres`;

async function runMigration(filename) {
  const client = new Client({
    connectionString: connectionString,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    console.log(`Connecting to database for migration: ${filename}`);
    await client.connect();
    console.log(`✅ Connected successfully`);
    
    const sql = fs.readFileSync(filename, 'utf8');
    console.log(`Running migration: ${filename}`);
    console.log(`SQL Preview: ${sql.substring(0, 150)}...`);
    
    // Split SQL into individual statements for better error handling
    const statements = sql.split(';').filter(stmt => stmt.trim().length > 0);
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i].trim();
      if (statement) {
        console.log(`  Executing statement ${i + 1}/${statements.length}: ${statement.substring(0, 80)}...`);
        await client.query(statement);
        console.log(`  ✅ Statement ${i + 1} completed`);
      }
    }
    
    console.log(`✅ Migration ${filename} completed successfully\n`);
    
  } catch (error) {
    console.error(`❌ Error running migration ${filename}:`, error.message);
    if (error.code) {
      console.error(`   Error Code: ${error.code}`);
    }
    if (error.detail) {
      console.error(`   Detail: ${error.detail}`);
    }
    throw error;
  } finally {
    try {
      await client.end();
    } catch (endError) {
      // Ignore connection ending errors
    }
  }
}

async function runAllMigrations() {
  try {
    console.log('🚀 Starting migrations with corrected connection...\n');
    
    console.log('Migration 1: Adding line-of-credit to debt account types');
    await runMigration('add_line_of_credit_debt_type.sql');
    
    console.log('Migration 2: Adding debt account support to transactions');
    await runMigration('add_debt_account_support_to_transactions.sql');
    
    console.log('Migration 3: Adding background_theme to sinking_funds');
    await runMigration('src/db/migrations/20250608000001_add_background_theme_to_sinking_funds.sql');
    
    console.log('🎉 All migrations completed successfully!');
    
    // Run verification
    console.log('\n🔍 Running verification...');
    await verifyMigrations();
    
  } catch (error) {
    console.error('\n💥 Migration failed:', error.message);
    console.error('\nPossible solutions:');
    console.error('1. Check if the database password is correct in .env');
    console.error('2. Verify network connectivity to Supabase');
    console.error('3. Ensure the project reference (ezsfvsrdtljwgclpgivf) is correct');
    process.exit(1);
  }
}

async function verifyMigrations() {
  const { createClient } = require('@supabase/supabase-js');
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  
  try {
    // Test line-of-credit enum value
    console.log('  Testing line-of-credit enum...');
    const { data: testData, error: testError } = await supabase
      .from('debt_accounts')
      .insert({
        name: 'Test Line of Credit',
        type: 'line-of-credit',
        balance: 0,
        apr: 10.5,
        minimum_payment: 25,
        payment_day_of_month: 15,
        payment_frequency: 'monthly',
        user_id: 'test-user-verification'
      })
      .select();
    
    if (testError) {
      console.log(`  ❌ Line-of-credit test failed: ${testError.message}`);
    } else {
      console.log(`  ✅ Line-of-credit enum working`);
      // Clean up
      await supabase.from('debt_accounts').delete().eq('id', testData[0].id);
    }
    
    // Test debt_account_id column
    console.log('  Testing debt_account_id column...');
    const { data: txData, error: txError } = await supabase
      .from('transactions')
      .select('id, account_id, debt_account_id')
      .limit(1);
    
    if (txError) {
      console.log(`  ❌ debt_account_id column test failed: ${txError.message}`);
    } else {
      console.log(`  ✅ debt_account_id column exists`);
    }
    
    // Test background_theme column
    console.log('  Testing background_theme column...');
    const { data: sinkingData, error: sinkingError } = await supabase
      .from('sinking_funds')
      .select('id, background_theme')
      .limit(1);
    
    if (sinkingError) {
      console.log(`  ❌ background_theme column test failed: ${sinkingError.message}`);
    } else {
      console.log(`  ✅ background_theme column exists`);
    }
    
    console.log('\n✅ Migration verification complete!');
    
  } catch (error) {
    console.error(`❌ Verification error: ${error.message}`);
  }
}

runAllMigrations(); 