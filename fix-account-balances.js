const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function analyzeAccountBalances() {
  console.log('🔍 Analyzing current account balances vs transaction history...\n');
  
  try {
    // Get all accounts
    const { data: accounts, error: accountsError } = await supabase
      .from('accounts')
      .select('*')
      .order('name');

    if (accountsError) {
      throw new Error(`Failed to fetch accounts: ${accountsError.message}`);
    }

    console.log(`Found ${accounts.length} accounts to analyze\n`);

    const results = [];
    
    for (const account of accounts) {
      // Get all transactions for this account
      const { data: transactions, error: txError } = await supabase
        .from('transactions')
        .select('*')
        .or(`account_id.eq.${account.id},to_account_id.eq.${account.id}`);

      if (txError) {
        console.error(`❌ Error fetching transactions for ${account.name}:`, txError.message);
        continue;
      }

      // Calculate the correct balance
      let calculatedBalance = 0;
      
      for (const tx of transactions || []) {
        if (tx.type === 'income' && tx.account_id === account.id) {
          calculatedBalance += tx.amount;
        } else if (tx.type === 'expense' && tx.account_id === account.id) {
          calculatedBalance -= tx.amount;
        } else if (tx.type === 'transfer') {
          if (tx.account_id === account.id) {
            calculatedBalance -= tx.amount; // Money leaving this account
          } else if (tx.to_account_id === account.id) {
            calculatedBalance += tx.amount; // Money coming into this account
          }
        }
      }

      const difference = calculatedBalance - account.balance;
      const isCorrect = Math.abs(difference) < 0.01; // Allow for small floating point differences

      results.push({
        account,
        currentBalance: account.balance,
        calculatedBalance,
        difference,
        isCorrect,
        transactionCount: transactions?.length || 0
      });

      const status = isCorrect ? '✅' : '❌';
      console.log(`${status} ${account.name}`);
      console.log(`   Current Balance: $${account.balance.toFixed(2)}`);
      console.log(`   Calculated Balance: $${calculatedBalance.toFixed(2)}`);
      console.log(`   Difference: $${difference.toFixed(2)}`);
      console.log(`   Transactions: ${transactions?.length || 0}`);
      console.log('');
    }

    const incorrectAccounts = results.filter(r => !r.isCorrect);
    
    console.log('\n' + '='.repeat(50));
    console.log('SUMMARY');
    console.log('='.repeat(50));
    console.log(`Total Accounts: ${results.length}`);
    console.log(`Correct Balances: ${results.length - incorrectAccounts.length}`);
    console.log(`Incorrect Balances: ${incorrectAccounts.length}`);
    
    if (incorrectAccounts.length > 0) {
      console.log('\n❌ ACCOUNTS NEEDING CORRECTION:');
      incorrectAccounts.forEach(result => {
        console.log(`   ${result.account.name}: $${result.difference.toFixed(2)} off`);
      });
    }

    return { results, incorrectAccounts };
    
  } catch (error) {
    console.error('❌ Error analyzing account balances:', error.message);
    return null;
  }
}

async function fixAccountBalances(dryRun = true) {
  const analysis = await analyzeAccountBalances();
  
  if (!analysis || analysis.incorrectAccounts.length === 0) {
    console.log('\n✅ All account balances are correct! No fixes needed.');
    return;
  }

  console.log(`\n🔧 ${dryRun ? 'DRY RUN - WOULD FIX' : 'FIXING'} ${analysis.incorrectAccounts.length} account balances...\n`);

  for (const result of analysis.incorrectAccounts) {
    if (dryRun) {
      console.log(`📝 WOULD UPDATE: ${result.account.name}`);
      console.log(`   ${result.currentBalance.toFixed(2)} → ${result.calculatedBalance.toFixed(2)}`);
    } else {
      console.log(`🔧 UPDATING: ${result.account.name}`);
      console.log(`   ${result.currentBalance.toFixed(2)} → ${result.calculatedBalance.toFixed(2)}`);
      
      const { error } = await supabase
        .from('accounts')
        .update({ balance: result.calculatedBalance })
        .eq('id', result.account.id);

      if (error) {
        console.error(`   ❌ Failed: ${error.message}`);
      } else {
        console.log(`   ✅ Success`);
      }
    }
    console.log('');
  }

  if (dryRun) {
    console.log('🚨 This was a DRY RUN. No changes were made.');
    console.log('🚨 To actually fix the balances, run: node fix-account-balances.js --fix');
  } else {
    console.log('✅ Account balance fixes completed!');
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const shouldFix = args.includes('--fix');
  const shouldAnalyze = args.includes('--analyze');

  if (shouldAnalyze) {
    await analyzeAccountBalances();
  } else {
    await fixAccountBalances(!shouldFix);
  }
}

main().catch(console.error); 