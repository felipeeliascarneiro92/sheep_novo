DO $$
DECLARE
    v_network_id UUID;
    v_count INTEGER;
BEGIN
    -- 1. Buscar o ID da rede "Remax" (case insensitive)
    -- Tenta encontrar qualquer rede que contenha "Remax" no nome
    SELECT id INTO v_network_id 
    FROM networks 
    WHERE name ILIKE '%Remax%' 
    LIMIT 1;

    -- Verifica se encontrou a rede
    IF v_network_id IS NULL THEN
        RAISE NOTICE 'Aviso: Rede "Remax" não encontrada. Crie a rede antes de rodar este script.';
        RETURN;
    END IF;

    -- 2. Atualizar todos os clientes com email @remax
    -- Vincula clientes que tem email terminando em @remax.com.br
    UPDATE clients
    SET network_id = v_network_id
    WHERE email ILIKE '%@remax.com.br'
    AND (network_id IS NULL OR network_id != v_network_id);

    GET DIAGNOSTICS v_count = ROW_COUNT;
    
    RAISE NOTICE 'Processo concluído! % clientes foram vinculados à rede Remax (ID: %).', v_count, v_network_id;
END $$;
