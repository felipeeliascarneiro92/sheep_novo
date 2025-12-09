# Chat - Status e Troubleshooting

## ✅ CORREÇÕES IMPLEMENTADAS

### 1. Chat agora disponível para CLIENTES
- ✅ Adicionado 'chat' ao tipo `ClientPage` e `BrokerPage` em `App.tsx`
- ✅ Importado `ChatPage` em `ClientApp.tsx`
- ✅ Adicionado botão "Chat do Dia" no `ClientSidebar.tsx`
- ✅ Renderização do `ChatPage` quando cliente navega para chat

### 2. Chat já estava disponível para:
- ✅ Admin (linha 217, 383 App.tsx)
- ✅ Fotógrafos (linha 423, 551 App.tsx)

## 🔧 POSSÍVEIS ERROS NO CONSOLE (Admin/Fotógrafos)

### Erro 1: Tabelas não existem no Supabase
**Sintoma:** Erro no console ao carregar conversas
**Solução:** Verificar se as tabelas existem:

```sql
-- Criar tabela conversations
CREATE TABLE IF NOT EXISTS conversations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(booking_id)
);

-- Criar tabela messages
CREATE TABLE IF NOT EXISTS messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  sender_role TEXT NOT NULL CHECK (sender_role IN ('client', 'broker', 'photographer', 'admin')),
  content TEXT NOT NULL,
  type TEXT DEFAULT 'text' CHECK (type IN ('text', 'image', 'audio', 'file')),
  media_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  read_at TIMESTAMPTZ
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_conversations_booking ON conversations(booking_id);
```

### Erro 2: Bucket de storage não existe
**Sintoma:** Erro ao fazer upload de anexos
**Solução:** Criar bucket no Supabase:

1. Ir no Supabase Dashboard > Storage
2. Criar novo bucket: `chat-attachments`
3. Configurar como **público** (public: true)
4. Configurar políticas (RLS):

```sql
-- Permitir INSERT para usuários autenticados
CREATE POLICY "Authenticated users can upload chat attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'chat-attachments');

-- Permitir SELECT público (para visualizar imagens)
CREATE POLICY "Public can view chat attachments"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'chat-attachments');
```

### Erro 3: Realtime não configurado
**Sintoma:** Mensagens não aparecem em tempo real
**Solução:** Habilitar Realtime no Supabase:

1. Ir no Supabase Dashboard > Database > Replication
2. Habilitar Realtime para a tabela `messages`
3. Ou executar:

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
```

## 📋 FUNCIONALIDADES DO CHAT

### Para CLIENTES:
- ✅ Ver conversas de agendamentos do dia
- ✅ Enviar mensagens de texto
- ✅ Enviar imagens e arquivos
- ✅ Receber mensagens em tempo real
- ✅ Contador de mensagens não lidas

### Para FOTÓGRAFOS:
- ✅ Ver todos agendamentos do dia
- ✅ Chat com clientes de cada agendamento
- ✅ Mesmo as funcionalidades dos clientes

### Para ADMIN:
- ✅ Ver TODOS os agendamentos do dia
- ✅ Pode participar de qualquer conversa
- ✅ Monitorar comunicação cliente-fotógrafo

## 🔍 COMO TESTAR

1. **Login como Cliente:**
   - Clicar em "Chat do Dia" no sidebar
   - Deve mostrar agendamentos confirmados para hoje
   - Selecionar uma conversa e enviar mensagem

2. **Login como Fotógrafo:**
   - Clicar em "Chat do Dia" no sidebar
   - Deve mostrar seus agendamentos de hoje
   - Responder mensagens dos clientes

3. **Login como Admin:**
   - Clicar em "Chat do Dia" no sidebar
   - Deve mostrar TODOS os agendamentos do dia
   - Pode participar de qualquer conversa

## ⚠️ LIMITAÇÕES ATUAIS

1. Chat mostra apenas agendamentos **do dia atual** (hoje)
2. Conversas antigas não ficam acessíveis após o dia passar
3. Não há busca de mensagens antigas
4. Não há notificações push (apenas contador de não lidas)

## 💡 MELHORIAS FUTURAS

1. Histórico de conversas (acessar chats de dias anteriores)
2. Notificações push quando receber mensagem
3. Busca de mensagens
4. Indicador de "digitando..."
5. Confirmação de leitura (check duplo)
6. Emojis e GIFs
