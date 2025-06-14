const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUserData() {
  console.log('Checking user data in variable_expenses...\n');
  
  try {
    // Get all variable expenses with user_id (using service role to bypass RLS)
    const { data: expenses, error } = await supabase
      .from('variable_expenses')
      .select('id, name, user_id, created_at');
    
    if (error) {
      console.error('Error fetching variable expenses:', error);
      return;
    }
    
    console.log('Variable expenses found:');
    expenses.forEach((expense, index) => {
      console.log(`${index + 1}. ${expense.name} (user_id: ${expense.user_id})`);
    });
    
    // Get unique user IDs
    const uniqueUserIds = [...new Set(expenses.map(e => e.user_id))];
    console.log('\nUnique user IDs in variable_expenses:', uniqueUserIds);
    
    // Check if we can get user info for these IDs
    console.log('\nChecking users table...');
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email, name');
      
    if (usersError) {
      console.error('Error fetching users:', usersError);
    } else {
      console.log('Users found:');
      users.forEach(user => {
        console.log(`- ${user.email || user.name || 'No name'} (id: ${user.id})`);
      });
    }
    
    // Test the same query that the setup guide would use (with RLS)
    console.log('\n--- Testing Setup Guide Query (with RLS) ---');
    
    // Create a client with anon key (like the frontend would use)
    const anonSupabase = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
    
    // This will fail because we're not authenticated, but let's see the error
    const { count: anonCount, error: anonError } = await anonSupabase
      .from('variable_expenses')
      .select('*', { count: 'exact', head: true });
      
    if (anonError) {
      console.log('Anon query error (expected):', anonError.message);
    } else {
      console.log('Anon query count:', anonCount);
    }
    
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

checkUserData(); 