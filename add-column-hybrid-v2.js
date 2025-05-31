#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const { Client } = require('pg');
require('dotenv').config();

// Get environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const dbPassword = process.env.SUPABASE_DB_PASSWORD;

console.log('🔧 Improved Hybrid Database Column Setup\n');

// Check what credentials we have
console.log('📋 Available credentials:');
console.log('   NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✅' : '❌');
console.log('   SUPABASE_SERVICE_ROLE_KEY:', serviceRoleKey ? '✅' : '❌');
console.log('   SUPABASE_DB_PASSWORD:', dbPassword ? '✅' : '❌');

if (!supabaseUrl) {
  console.log('\n❌ Missing NEXT_PUBLIC_SUPABASE_URL - cannot proceed');
  process.exit(1);
}

// Method 1: Try Service Role Key approach
async function tryServiceRoleApproach() {
  if (!serviceRoleKey) {
    console.log('\n⏭️  Skipping service role approach - no key provided');
    return false;
  }

  console.log('\n🔑 Attempting service role approach...');
  
  try {
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Check if column already exists
    const { data: existingData, error: existingError } = await supabaseAdmin
      .from('user_preferences')
      .select('forecast_overrides')
      .limit(1);
      
    if (!existingError) {
      console.log('✅ forecast_overrides column already exists!');
      return true;
    }
    
    if (!existingError.message.includes('does not exist')) {
      console.log('❌ Unexpected error:', existingError.message);
      return false;
    }
    
    console.log('📋 Column does not exist, adding it...');
    
    // Since exec_sql RPC doesn't exist, try a different approach
    // We'll test if we can insert with the new column
    console.log('🔄 Testing direct column addition via upsert...');
    const { data: testData, error: testError } = await supabaseAdmin
      .from('user_preferences')
      .upsert({
        user_id: '00000000-0000-0000-0000-000000000000',
        forecast_overrides: { test: 'value' }
      }, {
        onConflict: 'user_id'
      })
      .select();
      
    if (testError && testError.message.includes('does not exist')) {
      console.log('❌ Column still does not exist - service role cannot add columns');
      console.log('💡 Service role can read/write but cannot modify schema');
      return false;
    } else if (testError) {
      console.log('❌ Other error:', testError.message);
      return false;
    } else {
      console.log('✅ Column appears to exist and is working!');
      console.log('📋 Test data:', testData);
      
      // Clean up test record
      await supabaseAdmin
        .from('user_preferences')
        .delete()
        .eq('user_id', '00000000-0000-0000-0000-000000000000');
      console.log('🧹 Test record cleaned up');
      return true;
    }
  } catch (error) {
    console.log('❌ Service role approach failed:', error.message);
    return false;
  }
}

// Method 2: Try Direct Connection approach with multiple connection formats
async function tryDirectConnectionApproach() {
  if (!dbPassword) {
    console.log('\n⏭️  Skipping direct connection approach - no password provided');
    return false;
  }

  console.log('\n🔌 Attempting direct connection approach...');
  
  // Parse Supabase URL to get connection details
  const url = new URL(supabaseUrl);
  const host = url.hostname;
  const projectRef = host.split('.')[0];
  
  // Try multiple connection string formats
  const connectionStrings = [
    // Format 1: Pooler connection (most common)
    `postgresql://postgres.${projectRef}:${dbPassword}@aws-0-us-west-1.pooler.supabase.com:6543/postgres`,
    // Format 2: Direct connection
    `postgresql://postgres:${dbPassword}@db.${projectRef}.supabase.co:5432/postgres`,
    // Format 3: Alternative pooler
    `postgresql://postgres.${projectRef}:${dbPassword}@aws-0-us-east-1.pooler.supabase.com:6543/postgres`,
    // Format 4: IPv6 pooler
    `postgresql://postgres.${projectRef}:${dbPassword}@aws-0-us-west-1.pooler.supabase.com:5432/postgres`
  ];
  
  for (let i = 0; i < connectionStrings.length; i++) {
    const connectionString = connectionStrings[i];
    console.log(`\n🔗 Trying connection format ${i + 1}...`);
    
    try {
      const client = new Client({
        connectionString: connectionString,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 10000, // 10 second timeout
      });

      await client.connect();
      console.log('✅ Connected to database directly');
      
      // Check if column exists
      const checkResult = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'user_preferences' 
        AND column_name = 'forecast_overrides'
      `);
      
      if (checkResult.rows.length > 0) {
        console.log('✅ forecast_overrides column already exists!');
        await client.end();
        return true;
      }
      
      console.log('📋 Column does not exist, adding it...');
      
      // Add the column
      await client.query(`
        ALTER TABLE user_preferences 
        ADD COLUMN IF NOT EXISTS forecast_overrides JSONB DEFAULT '{}'::jsonb;
      `);
      
      // Add comment
      await client.query(`
        COMMENT ON COLUMN user_preferences.forecast_overrides 
        IS 'Stores forecast budget overrides as JSON';
      `);
      
      // Add index
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_user_preferences_forecast_overrides 
        ON user_preferences USING GIN (forecast_overrides);
      `);
      
      console.log('✅ Column added successfully via direct connection!');
      
      // Verify
      const verifyResult = await client.query(`
        SELECT column_name, data_type, column_default 
        FROM information_schema.columns 
        WHERE table_name = 'user_preferences' 
        AND column_name = 'forecast_overrides'
      `);
      
      if (verifyResult.rows.length > 0) {
        console.log('✅ Column verified:', verifyResult.rows[0]);
      }
      
      await client.end();
      return true;
      
    } catch (error) {
      console.log(`❌ Connection format ${i + 1} failed:`, error.message);
      
      if (error.message.includes('password authentication failed')) {
        console.log('💡 Password authentication failed - check your SUPABASE_DB_PASSWORD');
      } else if (error.message.includes('Tenant or user not found')) {
        console.log('💡 Connection string format issue - trying next format...');
      } else if (error.message.includes('timeout')) {
        console.log('💡 Connection timeout - trying next format...');
      }
      
      // Continue to next connection string format
      continue;
    }
  }
  
  console.log('\n❌ All connection formats failed');
  console.log('\n💡 To get the correct connection details:');
  console.log('1. Go to your Supabase dashboard');
  console.log('2. Go to Settings > Database');
  console.log('3. Look for "Connection string" or "Connection pooling"');
  console.log('4. Use the connection details shown there');
  
  return false;
}

// Method 3: Manual verification
async function checkIfColumnExists() {
  console.log('\n🔍 Checking if column already exists via service role...');
  
  if (!serviceRoleKey) {
    console.log('⏭️  No service role key - cannot check');
    return false;
  }
  
  try {
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    const { data, error } = await supabaseAdmin
      .from('user_preferences')
      .select('forecast_overrides')
      .limit(1);
      
    if (!error) {
      console.log('✅ Column exists and is accessible!');
      return true;
    } else if (error.message.includes('does not exist')) {
      console.log('❌ Column does not exist');
      return false;
    } else {
      console.log('❌ Other error:', error.message);
      return false;
    }
  } catch (error) {
    console.log('❌ Check failed:', error.message);
    return false;
  }
}

// Main execution
async function main() {
  let success = false;
  
  // First, check if column already exists
  const exists = await checkIfColumnExists();
  if (exists) {
    console.log('\n🎉 Great! The forecast_overrides column already exists and is working.');
    console.log('\n📋 Next steps:');
    console.log('1. Test the forecast override system in your app');
    console.log('2. Edit amounts in the forecast view');
    console.log('3. Refresh the page to verify persistence');
    return;
  }
  
  // Try service role first (for verification, not schema changes)
  success = await tryServiceRoleApproach();
  
  // If that fails, try direct connection
  if (!success) {
    success = await tryDirectConnectionApproach();
  }
  
  // Final result
  if (success) {
    console.log('\n🎉 Success! The forecast_overrides column has been added.');
    console.log('\n📋 Next steps:');
    console.log('1. Test the forecast override system in your app');
    console.log('2. Edit amounts in the forecast view');
    console.log('3. Refresh the page to verify persistence');
  } else {
    console.log('\n❌ All automated approaches failed. Manual setup required.');
    console.log('\n💡 Manual options:');
    console.log('1. Use Supabase dashboard SQL Editor (see MANUAL-DATABASE-UPDATE.md)');
    console.log('2. Check your database password is correct');
    console.log('3. Verify your Supabase project settings');
    console.log('\n📋 The forecast override system will still work with localStorage fallback!');
  }
}

main().catch(console.error); 