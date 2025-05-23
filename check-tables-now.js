// Script to check database tables using Supabase credentials
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Read .env.local file to get Supabase credentials
function getEnvVars() {
  try {
    const envPath = path.join(process.cwd(), '.env.local');
    const envContent = fs.readFileSync(envPath, 'utf8');
    const envVars = {};
    
    envContent.split('\n').forEach(line => {
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        const value = match[2].trim().replace(/^['"]|['"]$/g, '');
        envVars[key] = value;
      }
    });
    
    return envVars;
  } catch (error) {
    console.error('Error reading .env.local file:', error);
    process.exit(1);
  }
}

async function checkTables() {
  const envVars = getEnvVars();
  const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('Error: Supabase URL or key not found in .env.local file.');
    process.exit(1);
  }
  
  console.log('Connecting to Supabase at:', supabaseUrl);
  
  // Create Supabase client
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  try {
    console.log('Checking database tables...');
    
    // Query to get all tables in the public schema
    const { data, error } = await supabase.rpc('list_tables');
    
    if (error) {
      console.error('Error running RPC function:', error);
      
      // Fallback: Try direct SQL query
      console.log('Trying direct SQL query...');
      const { data: sqlData, error: sqlError } = await supabase.from('pg_tables')
        .select('tablename')
        .eq('schemaname', 'public');
      
      if (sqlError) {
        console.error('Error with direct SQL query:', sqlError);
        
        // Try another approach
        console.log('Trying another approach...');
        const { data: tableData, error: tableError } = await supabase
          .from('profiles')
          .select('id')
          .limit(1);
        
        if (tableError) {
          if (tableError.message && tableError.message.includes('does not exist')) {
            console.log('The "profiles" table does not exist.');
          } else {
            console.error('Error checking profiles table:', tableError);
          }
        } else {
          console.log('The "profiles" table exists.');
        }
        
        // Check for user_preferences table
        const { data: prefData, error: prefError } = await supabase
          .from('user_preferences')
          .select('id')
          .limit(1);
        
        if (prefError) {
          if (prefError.message && prefError.message.includes('does not exist')) {
            console.log('The "user_preferences" table does not exist.');
          } else {
            console.error('Error checking user_preferences table:', prefError);
          }
        } else {
          console.log('The "user_preferences" table exists.');
        }
        
        return;
      }
      
      console.log('Available tables:');
      sqlData.forEach(table => {
        console.log(`- ${table.tablename}`);
      });
      return;
    }
    
    console.log('Available tables:');
    data.forEach(table => {
      console.log(`- ${table}`);
    });
  } catch (error) {
    console.error('Error checking database tables:', error);
  }
}

// Run the check
checkTables();
