# PowerShell script to run SQL schema against Supabase database

# Connection details
$DB_HOST = "db.ezsfvsrdtljwgclpgivf.supabase.co"
$DB_PORT = "5432"
$DB_NAME = "postgres"
$DB_USER = "postgres"
$DB_PASSWORD = "Jaedynng0510"

# Set environment variable for password
$env:PGPASSWORD = $DB_PASSWORD

# Check if psql is installed
try {
    $psqlVersion = & psql --version
    Write-Host "PostgreSQL client found: $psqlVersion"
} catch {
    Write-Host "PostgreSQL client (psql) not found. Please install PostgreSQL client tools."
    exit 1
}

# Run the SQL schema file
Write-Host "Executing SQL schema against Supabase database..."
& psql -h $DB_HOST -p $DB_PORT -d $DB_NAME -U $DB_USER -f "supabase_schema.sql"

# Clear password from environment
Remove-Item Env:\PGPASSWORD
