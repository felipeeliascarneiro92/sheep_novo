import { supabase } from './supabase';
import type { User } from '../App';

// --- AUTH HELPER ---
// --- AUTH HELPER ---

export const getUserProfile = async (userId: string, userEmail?: string): Promise<User | null> => {
    try {
        console.log(`🔍 [authService] Buscando perfil para ID: ${userId} (${userEmail})`);

        // Helper to query a table with 5s timeout
        const checkTable = async (table: string, role: string) => {
            const promise = (async () => {
                let query = supabase.from(table).select('*').eq('id', userId).maybeSingle();
                const { data: byId, error: errId } = await query;

                if (byId) return { ...byId, role };

                if (userEmail && !errId) {
                    const { data: byEmail } = await supabase.from(table).select('*').eq('email', userEmail).maybeSingle();
                    if (byEmail) return { ...byEmail, role };
                }
                return null;
            })();

            // 5 second timeout race to prevent hanging
            const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), 5000));
            return Promise.race([promise, timeout]);
        };

        // 1. FAST PATH: Check Clients First (Most common)
        console.log('🚀 [authService] Verificando Clients primeiro...');
        const clientProfile = await checkTable('clients', 'client');
        if (clientProfile) {
            console.log('✅ [authService] Encontrado como CLIENT (Fast Path):', clientProfile.id);
            return { role: 'client', id: clientProfile.id, name: clientProfile.name, profilePicUrl: clientProfile.profile_pic_url || undefined };
        }

        // 2. Slow Path: Check others in parallel
        console.log('🔄 [authService] Não é cliente. Verificando outros perfis...');
        const results = await Promise.all([
            checkTable('admins', 'admin'),
            checkTable('editors', 'editor'),
            checkTable('photographers', 'photographer'),
            checkTable('brokers', 'broker')
        ]);

        const found = results.find(r => r !== null);

        if (found) {
            console.log(`✅ [authService] Perfil encontrado na tabela '${found.role}s':`, found.name);

            if (found.role === 'broker') {
                return {
                    role: 'broker',
                    id: found.id,
                    clientId: found.client_id,
                    name: found.name,
                    profilePicUrl: found.profile_pic_url,
                    permissions: found.permissions
                };
            }

            return {
                role: found.role as any,
                id: found.id,
                name: found.name,
                profilePicUrl: found.profile_pic_url || undefined
            };
        }

        console.warn('⚠️ [authService] Usuário autenticado mas sem perfil nas tabelas.');
        return null;

    } catch (error) {
        console.error("❌ [authService] Erro fatal buscando perfil:", error);
        return null;
    }
};

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

        return await getUserProfile(data.user.id, data.user.email);
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

