require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL, 
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function addColumn() {
  try {
    console.log('Adding financial_tracking_start_date column to user_preferences table...');
    
    // First, check if column already exists
    const { data: checkData, error: checkError } = await supabase
      .from('user_preferences')
      .select('financial_tracking_start_date')
      .limit(1);
    
    if (!checkError) {
      console.log('Column already exists!');
      return;
    }
    
    // If we get here, the column doesn't exist, so let's add it
    if (checkError.code === '42703') { // Column doesn't exist error code
      console.log('Column does not exist, attempting to add it...');
      
      // Use raw SQL query
      const { data, error } = await supabase.rpc('exec_sql', {
        sql: 'ALTER TABLE user_preferences ADD COLUMN financial_tracking_start_date TIMESTAMPTZ;'
      });
      
      if (error) {
        console.error('Error adding column:', error);
        // Try alternative approach
        console.log('Trying alternative approach...');
        
        // Let's try using the REST API directly
        const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
            'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY
          },
          body: JSON.stringify({
            sql: 'ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS financial_tracking_start_date TIMESTAMPTZ;'
          })
        });
        
        if (response.ok) {
          console.log('Column added successfully via REST API!');
        } else {
          console.error('REST API error:', await response.text());
        }
      } else {
        console.log('Column added successfully!');
      }
    } else {
      console.error('Unexpected error checking column:', checkError);
    }
    
    // Verify the column was added
    console.log('Verifying column was added...');
    const { data: verifyData, error: verifyError } = await supabase
      .from('user_preferences')
      .select('financial_tracking_start_date')
      .limit(1);
    
    if (verifyError) {
      console.error('Verification failed:', verifyError);
    } else {
      console.log('Column verification successful!');
    }
    
  } catch (error) {
    console.error('Script error:', error);
  }
}

addColumn(); 