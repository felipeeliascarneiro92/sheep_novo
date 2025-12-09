-- Fix user: felipeeliascarneiro@gmail.com
-- User ID from Auth: c4682bb8-1368-4547-be94-6459f500849b

INSERT INTO clients (
    id,
    name,
    trade_name,
    person_type,
    email,
    phone,
    commercial_phone,
    mobile_phone,
    marketing_email_1,
    marketing_email_2,
    cnpj,
    cpf,
    state_registration,
    due_day,
    payment_method,
    payment_type,
    network,
    custom_prices,
    balance,
    address,
    billing_address,
    history,
    notes,
    is_active,
    created_at
) VALUES (
    'c4682bb8-1368-4547-be94-6459f500849b', -- ID do Auth
    'Felipe Elias Carneiro', -- Ajuste o nome se necessário
    'Felipe Elias Carneiro', -- Nome fantasia
    'Pessoa Física',
    'felipeeliascarneiro@gmail.com',
    '', -- Ajuste o telefone
    '',
    '', -- Ajuste o telefone
    'felipeeliascarneiro@gmail.com',
    '',
    '', -- CPF (ajuste se necessário)
    '', -- CPF
    '',
    10, -- Dia de vencimento
    'Pix',
    'Pré-pago',
    '',
    '{}',
    0,
    '{"street": "", "number": "", "complement": "", "neighborhood": "", "city": "Curitiba", "state": "PR", "zip": "", "lat": -25.4284, "lng": -49.2733}',
    '{"street": "", "number": "", "complement": "", "neighborhood": "", "city": "Curitiba", "state": "PR", "zip": ""}',
    '[{"timestamp": "' || NOW() || '", "actor": "Sistema", "notes": "Usuário sincronizado do Auth"}]',
    'Usuário criado automaticamente via Auth',
    true,
    NOW()
)
ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    is_active = EXCLUDED.is_active;
