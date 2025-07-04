#!/bin/bash
# Script to run SQL schema against Supabase database

# Connection details
DB_HOST="db.ezsfvsrdtljwgclpgivf.supabase.co"
DB_PORT="5432"
DB_NAME="postgres"
DB_USER="postgres"
DB_PASSWORD="Jaedynng0510"

# Run the SQL schema file
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -d $DB_NAME -U $DB_USER -f /schema/supabase_schema.sql
