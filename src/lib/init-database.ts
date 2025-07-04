import { supabase } from './supabase';

/**
 * Initialize the database by creating necessary tables if they don't exist
 */
export async function initDatabase() {
  console.log('Initializing database...');
  
  try {
    // Create user_preferences table if it doesn't exist
    const { error: createTableError } = await supabase.rpc('create_user_preferences_if_not_exists');
    
    if (createTableError) {
      console.error('Error creating user_preferences table:', createTableError);
      
      // Fallback: Try direct SQL if RPC fails
      const { error: directSqlError } = await supabase.rpc('exec_sql', {
        sql: `
          -- Create user_preferences table
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

          -- Add RLS policies if table was just created
          DO $$
          BEGIN
            IF NOT EXISTS (
              SELECT 1 FROM pg_policies 
              WHERE tablename = 'user_preferences' AND policyname = 'Users can read their own preferences'
            ) THEN
              ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

              -- Policy for users to read their own preferences
              CREATE POLICY "Users can read their own preferences"
                  ON public.user_preferences
                  FOR SELECT
                  USING (auth.uid() = user_id);

              -- Policy for users to insert their own preferences
              CREATE POLICY "Users can insert their own preferences"
                  ON public.user_preferences
                  FOR INSERT
                  WITH CHECK (auth.uid() = user_id);

              -- Policy for users to update their own preferences
              CREATE POLICY "Users can update their own preferences"
                  ON public.user_preferences
                  FOR UPDATE
                  USING (auth.uid() = user_id);
            END IF;
          END $$;
        `
      });
      
      if (directSqlError) {
        console.error('Error creating user_preferences table with direct SQL:', directSqlError);
      } else {
        console.log('Successfully created user_preferences table with direct SQL');
      }
    } else {
      console.log('Successfully created user_preferences table with RPC');
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error initializing database:', error);
    return { success: false, error };
  }
}
