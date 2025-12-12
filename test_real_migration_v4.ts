
import { createClient } from '@supabase/supabase-js';

// --- CONFIG -----
const SUPABASE_URL = 'https://ptwpsuvkrcbkfkutddnq.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB0d3BzdXZrcmNia2ZrdXRkZG5xIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDE3ODgxOCwiZXhwIjoyMDc5NzU0ODE4fQ.jkGe1unIcJ8sMO8IdXBJgcMToogdORTDCM_DzG_7Hik';

const ZAPI_INSTANCE_ID = '3C9B5DDA9DFC508BDCD0D604DAF2BCF1';
const ZAPI_TOKEN = 'E4CFB5D4FB0A368932B217CC';
const ZAPI_CLIENT_TOKEN = 'F783bd8037b984076953132db525cab81S';

const CLIENT_ID = '8ed8e682-9e3b-4810-b633-244ab16724fa'; // Adaiane

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
    console.log('--- TESTE REAL V4: DEPLOY CONFIRMADO ---');

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    });

    // 1. Fetch Client
    const { data: client, error: clientError } = await supabaseAdmin
        .from('clients')
        .select('*')
        .eq('id', CLIENT_ID)
        .single();

    if (clientError || !client) { return; }
    console.log(`✅ Cliente: ${client.name}`);

    // 2. Generate Magic Link
    console.log('🔐 Gerando Link Mágico...');
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'magiclink',
        email: client.email,
        options: {
            redirectTo: 'https://sheepnovo.vercel.app/'
        }
    });

    if (linkError || !linkData) {
        console.error('❌ Erro ao gerar link:', linkError);
        return;
    }

    const magicLink = linkData.properties.action_link;
    console.log('🔗 Link Gerado:', magicLink);

    // 3. Send
    const message = `Olá *${client.name.split(' ')[0]}*! 👋
        
Agora sim! O sistema foi atualizado. 🚀

Clique no link abaixo para entrar no painel (Magic Link Final):

${magicLink}

Se funcionar, você será redirecionada para o Dashboard automaticamente.`;

    await sendZApiMessage(client.phone, message);
    console.log('✅ ENVIO V4 CONCLUÍDO.');
};

run();
