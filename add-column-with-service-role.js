#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Use service role key for admin operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.log('❌ Missing required environment variables:');
  console.log('   NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✅' : '❌');
  console.log('   SUPABASE_SERVICE_ROLE_KEY:', serviceRoleKey ? '✅' : '❌');
  console.log('\n💡 To get your service role key:');
  console.log('   1. Go to your Supabase dashboard');
  console.log('   2. Go to Settings > API');
  console.log('   3. Copy the "service_role" key (not the anon key)');
  console.log('   4. Add to your .env file: SUPABASE_SERVICE_ROLE_KEY=your_service_role_key');
  process.exit(1);
}

// Create admin client with service role key
const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function addForecastOverridesColumn() {
  console.log('🔧 Adding forecast_overrides column using service role...\n');
  
  try {
    // First check if column already exists
    console.log('1. Checking if column already exists...');
    const { data: existingData, error: existingError } = await supabaseAdmin
      .from('user_preferences')
      .select('forecast_overrides')
      .limit(1);
      
    if (!existingError) {
      console.log('✅ forecast_overrides column already exists!');
      return;
    }
    
    if (!existingError.message.includes('does not exist')) {
      console.log('❌ Unexpected error:', existingError.message);
      return;
    }
    
    console.log('📋 Column does not exist, adding it...');
    
    // Add the column using RPC
    console.log('2. Adding forecast_overrides column...');
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
      console.log('❌ RPC error:', error.message);
      
      // Try alternative approach using direct SQL
      console.log('3. Trying alternative approach...');
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
        console.log('💡 Manual steps required - see MANUAL-DATABASE-UPDATE.md');
      } else if (altError) {
        console.log('❌ Other error:', altError.message);
      } else {
        console.log('✅ Column appears to be working now!');
        
        // Clean up test record
        await supabaseAdmin
          .from('user_preferences')
          .delete()
          .eq('user_id', '00000000-0000-0000-0000-000000000000');
      }
    } else {
      console.log('✅ Column added successfully!');
      console.log('📋 SQL executed:', data);
    }
    
    // Verify the column was added
    console.log('4. Verifying column was added...');
    const { data: verifyData, error: verifyError } = await supabaseAdmin
      .from('user_preferences')
      .select('forecast_overrides')
      .limit(1);
      
    if (verifyError) {
      console.log('❌ Verification failed:', verifyError.message);
    } else {
      console.log('✅ Column verified successfully!');
      
      // Test insert
      console.log('5. Testing insert with new column...');
      const testUserId = '00000000-0000-0000-0000-000000000000';
      const { data: testData, error: testError } = await supabaseAdmin
        .from('user_preferences')
        .upsert({
          user_id: testUserId,
          forecast_overrides: { test: 'value' }
        }, {
          onConflict: 'user_id'
        })
        .select();
        
      if (testError) {
        console.log('❌ Test insert failed:', testError.message);
      } else {
        console.log('✅ Test insert successful!');
        console.log('📋 Test data:', testData);
        
        // Clean up
        await supabaseAdmin
          .from('user_preferences')
          .delete()
          .eq('user_id', testUserId);
        console.log('🧹 Test record cleaned up');
      }
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

addForecastOverridesColumn().catch(console.error); 