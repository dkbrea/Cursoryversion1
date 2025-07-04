const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

// Create Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase URL or service role key in environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function runMigration(migrationFile) {
  try {
    const filePath = path.join(__dirname, 'migrations', migrationFile);
    const sql = fs.readFileSync(filePath, 'utf8');
    
    console.log(`Running migration: ${migrationFile}`);
    
    // Execute the SQL
    const { error } = await supabase.rpc('pgmigrate', { query: sql });
    
    if (error) {
      console.error('Migration error:', error);
      return false;
    }
    
    console.log(`Migration ${migrationFile} completed successfully`);
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
  console.log('Usage: node run-migration.js <migration-file>');
  process.exit(1);
}

// Run the migration
runMigration(migrationFile)
  .then(success => {
    if (success) {
      console.log('Migration completed successfully');
      process.exit(0);
    } else {
      console.error('Migration failed');
      process.exit(1);
    }
  })
  .catch(err => {
    console.error('Unhandled error:', err);
    process.exit(1);
  });
