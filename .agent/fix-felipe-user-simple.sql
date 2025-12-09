-- Fix user: felipeeliascarneiro@gmail.com
-- SQL simplificado com apenas campos essenciais

INSERT INTO clients (
    id,
    name,
    email,
    person_type,
    is_active
) VALUES (
    'c4682bb8-1368-4547-be94-6459f500849b',
    'Felipe Elias Carneiro',
    'felipeeliascarneiro@gmail.com',
    'Pessoa Física',
    true
)
ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    is_active = EXCLUDED.is_active;
