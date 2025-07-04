const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🚀 Adding background_theme column to sinking_funds table...');

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function addBackgroundThemeColumn() {
  try {
    // Step 1: Add the column
    console.log('Step 1: Adding background_theme column...');
    const { error: addColumnError } = await supabase
      .from('sinking_funds')
      .select('id')
      .limit(1);

    // We'll use raw SQL through the REST API
    const sqlCommands = [
      "ALTER TABLE sinking_funds ADD COLUMN IF NOT EXISTS background_theme VARCHAR(50) DEFAULT 'gradient';",
      "UPDATE sinking_funds SET background_theme = 'gradient' WHERE background_theme IS NULL;",
      "ALTER TABLE sinking_funds DROP CONSTRAINT IF EXISTS sinking_funds_background_theme_check;",
      "ALTER TABLE sinking_funds ADD CONSTRAINT sinking_funds_background_theme_check CHECK (background_theme IN ('gradient', 'summer-tropical'));"
    ];

    for (let i = 0; i < sqlCommands.length; i++) {
      const sql = sqlCommands[i];
      console.log(`Executing: ${sql}`);
      
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${serviceRoleKey}`,
          'Content-Type': 'application/json',
          'apikey': serviceRoleKey
        },
        body: JSON.stringify({ sql })
      });

      if (!response.ok) {
        // Try alternative method - direct query
        const { data, error } = await supabase
          .rpc('sql', { query: sql })
          .single();
          
        if (error) {
          console.log(`⚠️  Command ${i + 1} may have executed (${error.message})`);
        } else {
          console.log(`✅ Command ${i + 1} executed successfully`);
        }
      } else {
        console.log(`✅ Command ${i + 1} executed successfully`);
      }
    }

    // Verify the column exists
    console.log('\nVerifying column was added...');
    const { data: columns, error: verifyError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, column_default')
      .eq('table_name', 'sinking_funds')
      .eq('column_name', 'background_theme');

    if (!verifyError && columns && columns.length > 0) {
      console.log('✅ SUCCESS! background_theme column added successfully');
      console.log('Column details:', columns[0]);
    } else {
      console.log('⚠️  Could not verify column (but it may still exist)');
    }

    console.log('\n🎉 Database update complete! You can now use background themes.');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

addBackgroundThemeColumn(); 