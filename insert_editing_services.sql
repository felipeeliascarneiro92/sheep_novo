-- Add unique constraint to name if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'services_name_key') THEN
        ALTER TABLE public.services ADD CONSTRAINT services_name_key UNIQUE (name);
    END IF;
END $$;

-- Insert or Update default editing services
INSERT INTO public.services (id, name, description, price, duration_minutes, category, status, is_visible_to_client)
VALUES
  (uuid_generate_v4(), 'Tratamento de Imagem (Básico)', 'Correção de cor, brilho e contraste.', 5.00, 10, 'Edição', 'Ativo', true),
  (uuid_generate_v4(), 'Remoção de Objetos', 'Remoção de itens indesejados da cena.', 15.00, 20, 'Edição', 'Ativo', true),
  (uuid_generate_v4(), 'Troca de Céu (Day to Dusk)', 'Substituição do céu por um entardecer.', 25.00, 30, 'Edição', 'Ativo', true),
  (uuid_generate_v4(), 'Virtual Staging', 'Adição de móveis virtuais em ambientes vazios.', 80.00, 60, 'Edição', 'Ativo', true),
  (uuid_generate_v4(), 'Planta Baixa Humanizada', 'Criação de planta baixa a partir de rascunho.', 60.00, 45, 'Edição', 'Ativo', true),
  (uuid_generate_v4(), 'Tratamento HDR', 'Fusão de exposições para maior alcance dinâmico.', 10.00, 15, 'Edição', 'Ativo', true)
ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  duration_minutes = EXCLUDED.duration_minutes,
  category = EXCLUDED.category,
  status = EXCLUDED.status,
  is_visible_to_client = EXCLUDED.is_visible_to_client;
