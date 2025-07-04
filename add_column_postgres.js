const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🚀 Adding background_theme column using direct method...');

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function addBackgroundThemeColumn() {
  try {
    console.log('Testing connection...');
    
    // Test if we can access the table
    const { data: testData, error: testError } = await supabase
      .from('sinking_funds')
      .select('id')
      .limit(1);
      
    if (testError) {
      console.error('❌ Connection test failed:', testError.message);
      return;
    }
    
    console.log('✅ Connection successful');
    
    // Check if column already exists
    const { data: existingColumns, error: columnError } = await supabase
      .from('information_schema.columns')
      .select('column_name')
      .eq('table_name', 'sinking_funds')
      .eq('column_name', 'background_theme');
      
    if (existingColumns && existingColumns.length > 0) {
      console.log('✅ background_theme column already exists!');
      console.log('🎉 Database is ready for background themes.');
      return;
    }
    
    console.log('Column does not exist yet. We need to add it manually.');
    console.log('\n📋 COPY THIS SQL TO YOUR SUPABASE SQL EDITOR:');
    console.log('=====================================');
    console.log(`
ALTER TABLE sinking_funds 
ADD COLUMN background_theme VARCHAR(50) DEFAULT 'gradient';

UPDATE sinking_funds 
SET background_theme = 'gradient' 
WHERE background_theme IS NULL;

ALTER TABLE sinking_funds 
ADD CONSTRAINT sinking_funds_background_theme_check 
CHECK (background_theme IN ('gradient', 'summer-tropical'));
    `);
    console.log('=====================================');
    console.log('\n🌐 Go to: https://supabase.com/dashboard/project/ezsfvsrdtljwgclpgivf/sql/new');
    console.log('📝 Paste the SQL above and click "Run"');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

addBackgroundThemeColumn(); 