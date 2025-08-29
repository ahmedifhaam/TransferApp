-- Create the database if it doesn't exist
-- This script will be run when the PostgreSQL container starts

-- The database 'transferapp' is already created by the POSTGRES_DB environment variable
-- This script can be used for any additional setup if needed

-- Grant necessary permissions
GRANT ALL PRIVILEGES ON DATABASE transferapp TO transferapp;

-- You can add any additional initialization SQL here if needed
-- For example, creating extensions, setting up specific configurations, etc.


