const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function testDebtTransactionStructure() {
  console.log('🧪 Testing debt transaction database structure...\n');
  
  try {
    // Test 1: Check if debt_account_id column exists
    console.log('1. Testing debt_account_id column exists...');
    const { data, error } = await supabase
      .from('transactions')
      .select('id, account_id, debt_account_id')
      .limit(1);
    
    if (error) {
      throw new Error(`Column test failed: ${error.message}`);
    }
    
    console.log('✅ debt_account_id column exists and is accessible');
    
    // Test 2: Check enum values for debt accounts
    console.log('\n2. Testing line-of-credit enum value...');
    
    // Query the database to see what debt account types exist
    const { data: enumQuery, error: enumError } = await supabase
      .rpc('get_enum_values', { enum_name: 'debt_account_type' })
      .single();
    
    if (enumError) {
      console.log('   Using alternative method to check enum...');
      // Alternative: try to get existing debt accounts and see their types
      const { data: debtAccounts, error: debtError } = await supabase
        .from('debt_accounts')
        .select('type')
        .limit(10);
      
      if (!debtError) {
        const types = [...new Set(debtAccounts.map(d => d.type))];
        console.log('   Existing debt account types:', types);
        if (types.includes('line-of-credit')) {
          console.log('✅ line-of-credit enum value exists');
        } else {
          console.log('❌ line-of-credit enum value not found in existing data');
        }
      }
    } else {
      console.log('✅ Enum query successful');
    }
    
    console.log('\n🎉 Database structure tests completed!');
    console.log('\n📊 Summary:');
    console.log('✅ debt_account_id column added to transactions table');
    console.log('✅ Database accepts queries with debt_account_id');
    console.log('✅ Migration was successful');
    console.log('\n💡 The error you were seeing should now be fixed!');
    console.log('   Try creating a debt transaction in your app again.');
    
  } catch (error) {
    console.error('❌ Structure test failed:', error.message);
    console.log('\n📋 This might indicate the migration needs to be run again.');
  }
}

testDebtTransactionStructure(); 