-- Check columns of clients table to diagnose 400 error
SELECT 
    column_name, 
    data_type, 
    udt_name
FROM 
    information_schema.columns 
WHERE 
    table_name = 'clients';
