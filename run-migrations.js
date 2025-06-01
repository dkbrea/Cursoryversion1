const fs = require('fs');
const { Client } = require('pg');
require('dotenv').config();

const connectionString = `postgresql://postgres.ezsfvsrdtljwgclpgivf:${process.env.SUPABASE_DB_PASSWORD}@aws-0-us-west-1.pooler.supabase.com:6543/postgres`;

async function runMigration(filename) {
  const client = new Client({
    connectionString: connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log(`Connected to database for migration: ${filename}`);
    
    const sql = fs.readFileSync(filename, 'utf8');
    console.log(`Running migration: ${filename}`);
    console.log(`SQL: ${sql.substring(0, 100)}...`);
    
    await client.query(sql);
    console.log(`✅ Migration ${filename} completed successfully`);
    
  } catch (error) {
    console.error(`❌ Error running migration ${filename}:`, error.message);
    throw error;
  } finally {
    await client.end();
  }
}

async function runAllMigrations() {
  try {
    // Run migrations in order
    console.log('🚀 Starting migrations...\n');
    
    await runMigration('add_line_of_credit_debt_type.sql');
    console.log('');
    
    await runMigration('add_debt_account_support_to_transactions.sql');
    
    console.log('\n🎉 All migrations completed successfully!');
  } catch (error) {
    console.error('\n💥 Migration failed:', error.message);
    process.exit(1);
  }
}

runAllMigrations(); 