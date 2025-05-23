import { supabase } from './supabase';

/**
 * Ensures the user_preferences table exists in the database
 * This should be called when the application initializes
 */
export async function ensureUserPreferencesTable() {
  try {
    console.log('Checking if user_preferences table exists...');
    
    // First, check if the table exists
    const { data: tableExists, error: checkError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_name', 'user_preferences')
      .eq('table_schema', 'public')
      .single();
    
    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking if user_preferences table exists:', JSON.stringify(checkError));
      return { success: false, error: checkError };
    }
    
    // If table doesn't exist, create it
    if (!tableExists) {
      console.log('Creating user_preferences table...');
      
      // Create the table using raw SQL
      const { error: createError } = await supabase.rpc('create_table_and_policies', {
        table_sql: `
          CREATE TABLE IF NOT EXISTS public.user_preferences (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
            setup_progress JSONB DEFAULT '{"steps": {}}',
            currency TEXT DEFAULT 'USD',
            date_format TEXT DEFAULT 'MM/DD/YYYY',
            theme TEXT DEFAULT 'system',
            hide_balances BOOLEAN DEFAULT false,
            email_notifications BOOLEAN DEFAULT true,
            browser_notifications BOOLEAN DEFAULT true,
            mobile_notifications BOOLEAN DEFAULT false,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            CONSTRAINT user_preferences_user_id_key UNIQUE (user_id)
          );
          
          ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
          
          CREATE POLICY "Users can read their own preferences"
            ON public.user_preferences
            FOR SELECT
            USING (auth.uid() = user_id);
          
          CREATE POLICY "Users can insert their own preferences"
            ON public.user_preferences
            FOR INSERT
            WITH CHECK (auth.uid() = user_id);
          
          CREATE POLICY "Users can update their own preferences"
            ON public.user_preferences
            FOR UPDATE
            USING (auth.uid() = user_id);
        `
      });
      
      if (createError) {
        console.error('Error creating user_preferences table:', JSON.stringify(createError));
        return { success: false, error: createError };
      }
      
      console.log('Successfully created user_preferences table');
    } else {
      console.log('user_preferences table already exists');
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error ensuring user_preferences table exists:', error);
    return { success: false, error };
  }
}
