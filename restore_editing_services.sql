-- Restore default Creative Studio services
INSERT INTO services (id, name, description, price, duration_minutes, category, is_visible_to_client, status)
VALUES
    (uuid_generate_v4(), 'Remoção de Objetos', 'Remover itens indesejados da cena.', 15.00, 0, 'Edição', true, 'Ativo'),
    (uuid_generate_v4(), 'Tratamento de Céu (Blue Sky)', 'Substituir céu nublado por céu azul.', 10.00, 0, 'Edição', true, 'Ativo'),
    (uuid_generate_v4(), 'Crepúsculo Virtual (Day to Dusk)', 'Transformar foto diurna em noturna/pôr do sol.', 35.00, 0, 'Edição', true, 'Ativo'),
    (uuid_generate_v4(), 'Grama Virtual', 'Preencher áreas de terra/falhas com grama verde.', 20.00, 0, 'Edição', true, 'Ativo'),
    (uuid_generate_v4(), 'Móveis Virtuais (Staging)', 'Adicionar móveis realistas em ambientes vazios.', 60.00, 0, 'Edição', true, 'Ativo'),
    (uuid_generate_v4(), 'Limpeza de Piso', 'Remover manchas e sujeiras do piso.', 12.00, 0, 'Edição', true, 'Ativo');
