
import { createClient } from '@supabase/supabase-js';

// --- CONFIG -----
const SUPABASE_URL = 'https://ptwpsuvkrcbkfkutddnq.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB0d3BzdXZrcmNia2ZrdXRkZG5xIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDE3ODgxOCwiZXhwIjoyMDc5NzU0ODE4fQ.jkGe1unIcJ8sMO8IdXBJgcMToogdORTDCM_DzG_7Hik';

const ZAPI_INSTANCE_ID = '3C9B5DDA9DFC508BDCD0D604DAF2BCF1';
const ZAPI_TOKEN = 'E4CFB5D4FB0A368932B217CC';
const ZAPI_CLIENT_TOKEN = 'F783bd8037b984076953132db525cab81S';

const CLIENT_ID = '8ed8e682-9e3b-4810-b633-244ab16724fa'; // Adaiane
const TEMP_PASSWORD = 'SheepHouse@2025'; // Senha Provisória Forte

// --- HELPERS ---
const formatPhoneForZApi = (phone: string): string => {
    let cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 11 || cleaned.length === 10) return `55${cleaned}`;
    if (cleaned.length < 12 && !cleaned.startsWith('55')) return `55${cleaned}`;
    return cleaned;
};

const sendZApiMessage = async (phone: string, message: string) => {
    const formattedPhone = formatPhoneForZApi(phone);
    console.log(`🚀 [Z-API] Enviando para ${formattedPhone}...`);

    try {
        const response = await fetch(`https://api.z-api.io/instances/${ZAPI_INSTANCE_ID}/token/${ZAPI_TOKEN}/send-text`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Client-Token': ZAPI_CLIENT_TOKEN
            },
            body: JSON.stringify({ phone: formattedPhone, message })
        });

        if (!response.ok) {
            console.error('❌ Erro Z-API:', await response.text());
            return false;
        }
        return true;
    } catch (e) {
        console.error('❌ Exceção Z-API:', e);
        return false;
    }
};

// --- MAIN ---
const run = async () => {
    console.log('--- MIGRACAO VIA SENHA (TESTE ADAIANE) ---');

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    });

    // 1. Fetch Client
    console.log(`🔍 Buscando cliente ID: ${CLIENT_ID}...`);
    const { data: client, error: clientError } = await supabaseAdmin
        .from('clients')
        .select('*')
        .eq('id', CLIENT_ID)
        .single();

    if (clientError || !client) {
        console.error('❌ Cliente não encontrado na tabela public.clients');
        return;
    }
    console.log(`✅ Cliente: ${client.name} (${client.email})`);

    // 2. Manage Auth User
    console.log('🔐 Gerenciando Usuário no Auth...');

    // Check if user exists
    const { data: { users }, error: searchError } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = users.find(u => u.email === client.email);

    if (existingUser) {
        console.log(`ℹ️ Usuário já existe (ID: ${existingUser.id}). Atualizando senha...`);
        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
            existingUser.id,
            { password: TEMP_PASSWORD, email_confirm: true }
        );
        if (updateError) {
            console.error('❌ Erro ao atualizar senha:', updateError);
            return;
        }
        console.log('✅ Senha atualizada com sucesso.');
    } else {
        console.log('🆕 Criando novo usuário...');
        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
            email: client.email,
            password: TEMP_PASSWORD,
            email_confirm: true,
            user_metadata: { name: client.name, role: 'client' }
        });
        if (createError) {
            console.error('❌ Erro ao criar usuário:', createError);
            return;
        }
        console.log(`✅ Usuário criado com sucesso (ID: ${newUser.user.id}).`);
    }

    // 3. Send WhatsApp
    const message = `Olá *${client.name.split(' ')[0]}*! 👋
        
Seu acesso ao novo Painel SheepHouse está pronto! 🚀

Acesse: https://sheepnovo.vercel.app/

🔑 *Login:* ${client.email}
🔒 *Senha:* ${TEMP_PASSWORD}

(Recomendamos trocar sua senha no primeiro acesso)`;

    const success = await sendZApiMessage(client.phone, message);

    if (success) {
        console.log('✅ CREDENCIAIS ENVIADAS COM SUCESSO!');
    } else {
        console.error('❌ Falha no envio do WhatsApp.');
    }
};

run();
