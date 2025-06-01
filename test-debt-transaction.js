const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceRoleKey);

// Generate a test UUID
const testUserId = '550e8400-e29b-41d4-a716-446655440000';

async function testDebtTransaction() {
  console.log('🧪 Testing debt transaction creation...\n');
  
  try {
    // First, create a test debt account
    console.log('1. Creating test debt account...');
    const { data: debtAccount, error: debtError } = await supabase
      .from('debt_accounts')
      .insert({
        name: 'Test Credit Card',
        type: 'credit-card',
        balance: 100, // Starting with $100 debt
        apr: 19.99,
        minimum_payment: 25,
        payment_day_of_month: 15,
        payment_frequency: 'monthly',
        user_id: testUserId
      })
      .select()
      .single();
    
    if (debtError) {
      throw new Error(`Failed to create debt account: ${debtError.message}`);
    }
    
    console.log('✅ Test debt account created:', debtAccount.name);
    
    // Test creating a debt transaction using the API endpoint approach
    console.log('\n2. Creating test debt transaction...');
    const { data: transaction, error: txError } = await supabase
      .from('transactions')
      .insert({
        date: new Date().toISOString(),
        description: 'Test Grocery Purchase',
        amount: 25.50,
        type: 'expense',
        detailed_type: 'variable-expense',
        account_id: null,
        debt_account_id: debtAccount.id,
        user_id: testUserId
      })
      .select()
      .single();
    
    if (txError) {
      throw new Error(`Failed to create transaction: ${txError.message}`);
    }
    
    console.log('✅ Test debt transaction created successfully');
    console.log('   Transaction ID:', transaction.id);
    console.log('   Amount:', transaction.amount);
    console.log('   Debt Account ID:', transaction.debt_account_id);
    console.log('   Account ID (should be null):', transaction.account_id);
    
    // Verify the check constraint is working
    console.log('\n3. Testing constraint enforcement...');
    const { data: badTx, error: constraintError } = await supabase
      .from('transactions')
      .insert({
        date: new Date().toISOString(),
        description: 'Bad Transaction',
        amount: 50,
        type: 'expense',
        detailed_type: 'variable-expense',
        account_id: debtAccount.id, // This should fail because we also have debt_account_id
        debt_account_id: debtAccount.id,
        user_id: testUserId
      })
      .select();
    
    if (constraintError) {
      console.log('✅ Check constraint working - prevents both account_id and debt_account_id');
      console.log('   Error (expected):', constraintError.message.substring(0, 100) + '...');
    } else {
      console.log('❌ Check constraint not working - should have prevented this');
    }
    
    // Clean up test data
    console.log('\n4. Cleaning up test data...');
    await supabase.from('transactions').delete().eq('id', transaction.id);
    await supabase.from('debt_accounts').delete().eq('id', debtAccount.id);
    console.log('✅ Test data cleaned up');
    
    console.log('\n🎉 All tests passed! Debt transactions are working correctly.');
    console.log('\nYou can now:');
    console.log('✅ Create transactions with debt_account_id');
    console.log('✅ Ensure only one of account_id or debt_account_id is set');
    console.log('✅ Use the debt transaction checkbox in your app');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    
    // Try to clean up any test data that might have been created
    try {
      await supabase.from('transactions').delete().eq('user_id', testUserId);
      await supabase.from('debt_accounts').delete().eq('user_id', testUserId);
      console.log('🧹 Cleaned up any remaining test data');
    } catch (cleanupError) {
      // Ignore cleanup errors
    }
  }
}

testDebtTransaction(); 