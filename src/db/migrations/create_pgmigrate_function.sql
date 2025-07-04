-- Create a function to execute SQL migrations
-- This function needs to be executed with service role permissions
CREATE OR REPLACE FUNCTION pgmigrate(query text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE query;
END;
$$;
