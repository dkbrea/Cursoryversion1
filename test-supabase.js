const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('Supabase URL:', supabaseUrl);
console.log('Supabase Key:', supabaseAnonKey ? 'Present' : 'Missing');

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testConnection() {
  try {
    console.log('Testing Supabase connection...');
    
    // Test basic connection
    const { data, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('Supabase connection error:', error);
    } else {
      console.log('Supabase connection successful');
      console.log('Session data:', data?.session ? 'Session exists' : 'No session');
    }
    
    // Test a simple query
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('count')
      .limit(1);
      
    if (userError) {
      console.error('Users table query error:', userError);
    } else {
      console.log('Users table accessible');
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testConnection(); 