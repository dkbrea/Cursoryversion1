// Simple script to run SQL migration directly using the Supabase REST API
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing Supabase URL or service role key in environment variables');
  process.exit(1);
}

async function runMigration(sqlFilePath) {
  try {
    // Read the SQL file
    const sql = fs.readFileSync(sqlFilePath, 'utf8');
    console.log(`Running migration from: ${sqlFilePath}`);
    
    // Execute SQL via REST API
    const response = await fetch(`${supabaseUrl}/rest/v1/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceRoleKey}`,
        'apikey': serviceRoleKey,
        'Prefer': 'params=single-object'
      },
      body: JSON.stringify({
        query: sql
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Migration error:', errorData);
      return false;
    }
    
    console.log(`Migration completed successfully`);
    return true;
  } catch (err) {
    console.error('Error running migration:', err);
    return false;
  }
}

// Get migration file from command line argument
const migrationFile = process.argv[2];

if (!migrationFile) {
  console.error('Please specify a migration file');
  process.exit(1);
}

// Run the migration
runMigration(migrationFile)
  .then(success => {
    if (!success) {
      console.error('Migration failed');
      process.exit(1);
    }
    console.log('Migration completed successfully');
  })
  .catch(err => {
    console.error('Unexpected error:', err);
    process.exit(1);
  });
