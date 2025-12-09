import { supabase } from './supabase';
import type { User } from '../App';

// --- AUTH HELPER ---
export const authenticateUser = async (email: string, password: string): Promise<User | null> => {
    try {
        console.log('🔓 [authService] Iniciando autenticação para:', email);

        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error || !data.user) {
            console.error("❌ [authService] Supabase auth error:", error);
            return null;
        }

        console.log('✅ [authService] Auth bem-sucedido. User ID:', data.user.id);
        const userId = data.user.id;
        const userEmail = data.user.email;

        // 1. Check Admin
        console.log('🔍 [authService] Procurando em admins...');
        let { data: admin } = await supabase.from('admins').select('*').eq('id', userId).maybeSingle();
        if (!admin && userEmail) {
            const { data: adminByEmail } = await supabase.from('admins').select('*').eq('email', userEmail).maybeSingle();
            admin = adminByEmail;
        }
        if (admin) {
            console.log('✅ [authService] Encontrado como ADMIN:', admin.name);
            return { role: 'admin', id: admin.id, name: admin.name, profilePicUrl: admin.profile_pic_url };
        }

        // 2. Check Editor
        console.log('🔍 [authService] Procurando em editors...');
        let { data: editor } = await supabase.from('editors').select('*').eq('id', userId).maybeSingle();
        if (!editor && userEmail) {
            const { data: editorByEmail } = await supabase.from('editors').select('*').eq('email', userEmail).maybeSingle();
            editor = editorByEmail;
        }
        if (editor) {
            console.log('✅ [authService] Encontrado como EDITOR:', editor.name);
            return { role: 'editor', id: editor.id, name: editor.name, profilePicUrl: editor.profile_pic_url };
        }

        // 3. Check Clients
        console.log('🔍 [authService] Procurando em clients...');
        let { data: client } = await supabase.from('clients').select('*').eq('id', userId).maybeSingle();
        if (!client && userEmail) {
            console.log('🔍 [authService] Não encontrado por ID, tentando por email...');
            const { data: clientByEmail } = await supabase.from('clients').select('*').eq('email', userEmail).maybeSingle();
            client = clientByEmail;
            if (clientByEmail) {
                console.log('✅ [authService] Encontrado por email:', clientByEmail);
            }
        }
        if (client) {
            console.log('✅ [authService] Encontrado como CLIENT:', client.name);
            return { role: 'client', id: client.id, name: client.name, profilePicUrl: client.profile_pic_url || undefined };
        }

        // 4. Check Photographers
        console.log('🔍 [authService] Procurando em photographers...');
        let { data: photographer } = await supabase.from('photographers').select('*').eq('id', userId).maybeSingle();
        if (!photographer && userEmail) {
            const { data: photographerByEmail } = await supabase.from('photographers').select('*').eq('email', userEmail).maybeSingle();
            photographer = photographerByEmail;
        }
        if (photographer) {
            console.log('✅ [authService] Encontrado como PHOTOGRAPHER:', photographer.name);
            return { role: 'photographer', id: photographer.id, name: photographer.name, profilePicUrl: photographer.profile_pic_url };
        }

        // 5. Check Brokers
        console.log('🔍 [authService] Procurando em brokers...');
        let { data: broker } = await supabase.from('brokers').select('*').eq('id', userId).maybeSingle();
        if (!broker && userEmail) {
            const { data: brokerByEmail } = await supabase.from('brokers').select('*').eq('email', userEmail).maybeSingle();
            broker = brokerByEmail;
        }
        if (broker) {
            console.log('✅ [authService] Encontrado como BROKER:', broker.name);
            return {
                role: 'broker',
                id: broker.id,
                clientId: broker.client_id,
                name: broker.name,
                profilePicUrl: broker.profile_pic_url,
                permissions: broker.permissions
            };
        }

        console.warn('⚠️ [authService] Usuário autenticado no Auth mas não encontrado em nenhuma tabela!');
        console.warn('⚠️ [authService] User ID:', userId, 'Email:', userEmail);
        return null;
    } catch (error) {
        console.error("❌ [authService] Unexpected auth error:", error);
        return null;
    }
};

// --- GET USER BY ID (for impersonation) ---
export const getUserById = async (userId: string): Promise<User | null> => {
    try {
        console.log('🔍 [authService] Buscando usuário por ID:', userId);

        // 1. Check Admin
        const { data: admin } = await supabase.from('admins').select('*').eq('id', userId).maybeSingle();
        if (admin) {
            return { role: 'admin', id: admin.id, name: admin.name, profilePicUrl: admin.profile_pic_url };
        }

        // 2. Check Editor
        const { data: editor } = await supabase.from('editors').select('*').eq('id', userId).maybeSingle();
        if (editor) {
            return { role: 'editor', id: editor.id, name: editor.name, profilePicUrl: editor.profile_pic_url };
        }

        // 3. Check Clients
        const { data: client } = await supabase.from('clients').select('*').eq('id', userId).maybeSingle();
        if (client) {
            return { role: 'client', id: client.id, name: client.name, profilePicUrl: client.profile_pic_url || undefined };
        }

        // 4. Check Photographers
        const { data: photographer } = await supabase.from('photographers').select('*').eq('id', userId).maybeSingle();
        if (photographer) {
            return { role: 'photographer', id: photographer.id, name: photographer.name, profilePicUrl: photographer.profile_pic_url };
        }

        // 5. Check Brokers
        const { data: broker } = await supabase.from('brokers').select('*').eq('id', userId).maybeSingle();
        if (broker) {
            return {
                role: 'broker',
                id: broker.id,
                clientId: broker.client_id,
                name: broker.name,
                profilePicUrl: broker.profile_pic_url,
                permissions: broker.permissions
            };
        }

        console.warn('⚠️ [authService] Usuário não encontrado com ID:', userId);
        return null;
    } catch (error) {
        console.error("❌ [authService] Erro ao buscar usuário:", error);
        return null;
    }
};

