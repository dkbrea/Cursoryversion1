const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Connection details
const connectionString = 'postgresql://postgres:Jaedynng0510@db.ezsfvsrdtljwgclpgivf.supabase.co:5432/postgres';

// Read the SQL schema file
const schemaPath = path.join(__dirname, 'supabase_schema.sql');
const schemaSql = fs.readFileSync(schemaPath, 'utf8');

async function runSchema() {
  const client = new Client({
    connectionString,
  });

  try {
    console.log('Connecting to Supabase database...');
    await client.connect();
    console.log('Connected successfully!');

    console.log('Executing SQL schema...');
    await client.query(schemaSql);
    console.log('Schema executed successfully!');
  } catch (error) {
    console.error('Error executing schema:', error);
  } finally {
    await client.end();
    console.log('Connection closed');
  }
}

runSchema();
