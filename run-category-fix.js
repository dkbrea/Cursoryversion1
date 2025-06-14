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

async function runCategoryFix() {
  try {
    console.log('🚀 Converting sinking fund category from enum to text...\n');
    
    await runMigration('convert_category_enum_to_text.sql');
    
    console.log('🎉 Category conversion completed successfully!');
    
    // Run verification
    console.log('\n🔍 Running verification...');
    await verifyMigration();
    
  } catch (error) {
    console.error('\n💥 Migration failed:', error.message);
    process.exit(1);
  }
}

async function verifyMigration() {
  const { createClient } = require('@supabase/supabase-js');
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  
  try {
    // Test vacation category constraint
    console.log('  Testing vacation category...');
    const { data: testData, error: testError } = await supabase
      .from('sinking_funds')
      .insert({
        name: 'Test Vacation Fund',
        target_amount: 1000,
        current_amount: 0,
        monthly_contribution: 100,
        category: 'vacation',
        is_recurring: false,
        contribution_frequency: 'monthly',
        is_active: true,
        user_id: 'test-user-verification'
      })
      .select();
    
    if (testError) {
      console.log(`  ❌ Vacation category test failed: ${testError.message}`);
    } else {
      console.log(`  ✅ Vacation category working!`);
      // Clean up test record
      if (testData && testData.length > 0) {
        await supabase.from('sinking_funds').delete().eq('id', testData[0].id);
      }
    }
    
    console.log('\n✅ Migration verification complete!');
    
  } catch (error) {
    console.error(`❌ Verification error: ${error.message}`);
  }
}

runCategoryFix(); 