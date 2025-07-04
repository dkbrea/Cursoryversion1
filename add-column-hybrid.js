#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const { Client } = require('pg');
require('dotenv').config();

// Get environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const dbPassword = process.env.SUPABASE_DB_PASSWORD;

console.log('🔧 Hybrid Database Column Setup\n');

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
    
    // Try using RPC to execute SQL
    const { data, error } = await supabaseAdmin.rpc('exec_sql', {
      sql: `
        ALTER TABLE user_preferences 
        ADD COLUMN IF NOT EXISTS forecast_overrides JSONB DEFAULT '{}'::jsonb;
        
        COMMENT ON COLUMN user_preferences.forecast_overrides 
        IS 'Stores forecast budget overrides as JSON';
        
        CREATE INDEX IF NOT EXISTS idx_user_preferences_forecast_overrides 
        ON user_preferences USING GIN (forecast_overrides);
      `
    });
    
    if (error) {
      console.log('❌ RPC approach failed:', error.message);
      
      // Try alternative approach - direct upsert test
      console.log('🔄 Trying alternative test...');
      const { data: altData, error: altError } = await supabaseAdmin
        .from('user_preferences')
        .upsert({
          user_id: '00000000-0000-0000-0000-000000000000',
          forecast_overrides: {}
        }, {
          onConflict: 'user_id'
        });
        
      if (altError && altError.message.includes('does not exist')) {
        console.log('❌ Column still does not exist');
        return false;
      } else if (altError) {
        console.log('❌ Other error:', altError.message);
        return false;
      } else {
        console.log('✅ Column appears to be working now!');
        
        // Clean up test record
        await supabaseAdmin
          .from('user_preferences')
          .delete()
          .eq('user_id', '00000000-0000-0000-0000-000000000000');
        return true;
      }
    } else {
      console.log('✅ Column added successfully via RPC!');
      return true;
    }
  } catch (error) {
    console.log('❌ Service role approach failed:', error.message);
    return false;
  }
}

// Method 2: Try Direct Connection approach
async function tryDirectConnectionApproach() {
  if (!dbPassword) {
    console.log('\n⏭️  Skipping direct connection approach - no password provided');
    return false;
  }

  console.log('\n🔌 Attempting direct connection approach...');
  
  try {
    // Parse Supabase URL to get connection details
    const url = new URL(supabaseUrl);
    const host = url.hostname;
    
    // Build connection string
    const connectionString = `postgresql://postgres.${host.split('.')[0]}:${dbPassword}@aws-0-us-west-1.pooler.supabase.com:6543/postgres`;
    
    const client = new Client({
      connectionString: connectionString,
      ssl: { rejectUnauthorized: false }
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
    console.log('❌ Direct connection failed:', error.message);
    
    if (error.message.includes('password authentication failed')) {
      console.log('\n💡 To fix this:');
      console.log('1. Go to your Supabase dashboard');
      console.log('2. Go to Settings > Database');
      console.log('3. Copy your database password');
      console.log('4. Add to your .env file: SUPABASE_DB_PASSWORD=your_password');
    }
    
    return false;
  }
}

// Main execution
async function main() {
  let success = false;
  
  // Try service role first (preferred)
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
    console.log('\n❌ Both approaches failed. Manual setup required.');
    console.log('\n💡 Manual options:');
    console.log('1. Add service role key and try again');
    console.log('2. Add database password and try again');
    console.log('3. Use Supabase dashboard (see MANUAL-DATABASE-UPDATE.md)');
  }
}

main().catch(console.error); 