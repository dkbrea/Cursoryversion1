const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function verifyMigrations() {
  console.log('🔍 Verifying migration results...\n');
  
  try {
    // Check 1: Verify debt_account_type enum includes 'line-of-credit'
    console.log('1. Checking debt_account_type enum...');
    const { data: enumData, error: enumError } = await supabase
      .from('debt_accounts')
      .select('type')
      .limit(1);
    
    if (enumError) {
      console.log('   ❌ Could not query debt_accounts table:', enumError.message);
    } else {
      console.log('   ✅ debt_accounts table accessible');
    }
    
    // Check 2: Verify transactions table has debt_account_id column
    console.log('\n2. Checking transactions table structure...');
    const { data: txData, error: txError } = await supabase
      .from('transactions')
      .select('id, account_id, debt_account_id')
      .limit(1);
    
    if (txError) {
      console.log('   ❌ Error querying transactions table:', txError.message);
      if (txError.message.includes('debt_account_id')) {
        console.log('   📝 This suggests debt_account_id column does not exist yet');
      }
    } else {
      console.log('   ✅ transactions table has debt_account_id column');
      console.log('   ✅ Migration appears successful');
    }
    
    // Check 3: Try to create a test debt account with line-of-credit type
    console.log('\n3. Testing line-of-credit debt account creation...');
    const testDebtAccount = {
      name: 'Test Line of Credit',
      type: 'line-of-credit',
      balance: 0,
      apr: 10.5,
      minimum_payment: 25,
      payment_day_of_month: 15,
      payment_frequency: 'monthly',
      user_id: 'test-user-id'
    };
    
    const { data: insertData, error: insertError } = await supabase
      .from('debt_accounts')
      .insert(testDebtAccount)
      .select();
    
    if (insertError) {
      console.log('   ❌ Could not create line-of-credit debt account:', insertError.message);
      if (insertError.message.includes('invalid input value for enum')) {
        console.log('   📝 This suggests line-of-credit was not added to the enum');
      }
    } else {
      console.log('   ✅ line-of-credit debt account created successfully');
      
      // Clean up test record
      await supabase
        .from('debt_accounts')
        .delete()
        .eq('id', insertData[0].id);
      console.log('   🧹 Test record cleaned up');
    }
    
  } catch (error) {
    console.error('❌ Verification failed:', error.message);
  }
  
  console.log('\n📊 Migration verification complete');
}

verifyMigrations(); 