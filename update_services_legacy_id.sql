
-- 1. Add the legacy_id column if it doesn't exist
ALTER TABLE services 
ADD COLUMN IF NOT EXISTS legacy_id INTEGER;

-- 2. Update existing services with Legacy IDs based on Name matching
-- We use UPDATE ... WHERE name = ...

-- 6: Fotografia Profissional
UPDATE services SET legacy_id = 6 WHERE name = 'Fotografia Profissional';

-- 7: Vídeo Curto
UPDATE services SET legacy_id = 7 WHERE name = 'Vídeo Curto';

-- 8: Fotografia Premium
UPDATE services SET legacy_id = 8 WHERE name = 'Fotografia Premium';

-- 9: Deslocamento (Mapping 'Taxa de Deslocamento' as well just in case)
UPDATE services SET legacy_id = 9 WHERE name = 'Deslocamento';
UPDATE services SET legacy_id = 9 WHERE name = 'Taxa de Deslocamento';

-- 10: Retirar Chaves na Imobiliária
UPDATE services SET legacy_id = 10 WHERE name = 'Retirar Chaves na Imobiliária';

-- 11: Tour Virtual (Mapping 'Tour Virtual 360°' as well)
UPDATE services SET legacy_id = 11 WHERE name = 'Tour Virtual';
UPDATE services SET legacy_id = 11 WHERE name = 'Tour Virtual 360°';

-- 12: Fotografia Aérea (Mapping 'Imagens Aéreas (Drone)' as well if similar)
UPDATE services SET legacy_id = 12 WHERE name = 'Fotografia Aérea';
UPDATE services SET legacy_id = 12 WHERE name = 'Imagens Aéreas (Drone)';

-- 13: Vídeo Aéreo
UPDATE services SET legacy_id = 13 WHERE name = 'Vídeo Aéreo';

-- 14: Pacote Aéreo (Foto/Vídeo)
UPDATE services SET legacy_id = 14 WHERE name = 'Pacote Aéreo (Foto/Vídeo)';

-- 15: Pacote Completo
UPDATE services SET legacy_id = 15 WHERE name = 'Pacote Completo';

-- 16: Vídeo Profissional (Interno)
UPDATE services SET legacy_id = 16 WHERE name = 'Vídeo Profissional (Interno)';

-- 17: Narração para Vídeo
UPDATE services SET legacy_id = 17 WHERE name = 'Narração para Vídeo';

-- 18: Deslocamento (Duplicate in legacy, skipping or handling specific case if needed. Assuming 9 is primary)
-- If there is a specific 'Deslocamento Extra' or similar, we could map it here.

-- 19: Horário Adicional
UPDATE services SET legacy_id = 19 WHERE name = 'Horário Adicional';

-- 20: Demarcação de Terreno
UPDATE services SET legacy_id = 20 WHERE name = 'Demarcação de Terreno';

-- 21: Multa Cancelamento ( 50%)
UPDATE services SET legacy_id = 21 WHERE name = 'Multa Cancelamento ( 50%)';

-- 22: Multa Cancelamento ( 100%)
UPDATE services SET legacy_id = 22 WHERE name = 'Multa Cancelamento ( 100%)';

-- 23: Drone (FPV)
UPDATE services SET legacy_id = 23 WHERE name = 'Drone (FPV)';

-- 24: Vistoria de Entrada
UPDATE services SET legacy_id = 24 WHERE name = 'Vistoria de Entrada';

-- 25: Vistoria de Saída
UPDATE services SET legacy_id = 25 WHERE name = 'Vistoria de Saída';

-- 26: Revistoria
UPDATE services SET legacy_id = 26 WHERE name = 'Revistoria';

-- 27: Multa Cancelamento ( 100%) - Vistorias
UPDATE services SET legacy_id = 27 WHERE name = 'Multa Cancelamento ( 100%) - Vistorias';

-- 28: Multa Cancelamento ( 50%) - Vistorias
UPDATE services SET legacy_id = 28 WHERE name = 'Multa Cancelamento ( 50%) - Vistorias';

-- 29: Vídeo Reels
UPDATE services SET legacy_id = 29 WHERE name = 'Vídeo Reels';

-- 30: Inserção Apolar
UPDATE services SET legacy_id = 30 WHERE name = 'Inserção Apolar';

-- 31: Colocação de Placa
UPDATE services SET legacy_id = 31 WHERE name = 'Colocação de Placa';

-- 32: Edição Reclick.app
UPDATE services SET legacy_id = 32 WHERE name = 'Edição Reclick.app';

-- 33: Inserção Logo
UPDATE services SET legacy_id = 33 WHERE name = 'Inserção Logo';
