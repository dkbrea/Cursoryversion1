#!/usr/bin/env node

const { Client } = require('pg');
require('dotenv').config();

// Parse Supabase URL to get connection details
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  console.error('Error: NEXT_PUBLIC_SUPABASE_URL not found in environment variables');
  process.exit(1);
}

// Extract database connection details from Supabase URL
const url = new URL(supabaseUrl);
const host = url.hostname;
const database = url.pathname.slice(1); // Remove leading slash

// For Supabase, we need to use the direct database connection
// The format is usually: postgresql://postgres:[password]@[host]:5432/postgres
const connectionString = `postgresql://postgres.${host.split('.')[0]}:${process.env.SUPABASE_DB_PASSWORD || '[YOUR_DB_PASSWORD]'}@aws-0-us-west-1.pooler.supabase.com:6543/postgres`;

async function runQuery(sql) {
  const client = new Client({
    connectionString: connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to Supabase database');
    
    const result = await client.query(sql);
    
    if (result.rows && result.rows.length > 0) {
      console.log('\nQuery Results:');
      console.table(result.rows);
      console.log(`\nRows returned: ${result.rows.length}`);
    } else {
      console.log('\nQuery executed successfully');
      if (result.rowCount !== undefined) {
        console.log(`Rows affected: ${result.rowCount}`);
      }
    }
    
  } catch (error) {
    console.error('Error executing query:', error.message);
    
    if (error.message.includes('password authentication failed')) {
      console.log('\nTo fix this, you need to:');
      console.log('1. Go to your Supabase dashboard');
      console.log('2. Go to Settings > Database');
      console.log('3. Copy your database password');
      console.log('4. Add it to your .env file as: SUPABASE_DB_PASSWORD=your_password');
    }
  } finally {
    await client.end();
  }
}

// Get SQL query from command line arguments
const sql = process.argv.slice(2).join(' ');

if (!sql) {
  console.log('Usage: node sql-query.js "SELECT * FROM your_table;"');
  console.log('Example: node sql-query.js "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = \'monthly_budget_overrides\';"');
  process.exit(1);
}

runQuery(sql); 