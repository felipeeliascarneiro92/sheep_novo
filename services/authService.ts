
import { supabase } from './supabase';
import { User } from '../App';

// --- AUTH HELPER ---
export const authenticateUser = async (email: string, password: string): Promise<User | null> => {
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error || !data.user) {
            console.error("Supabase auth error:", error);
            return null;
        }

        const userId = data.user.id;
        const userEmail = data.user.email;

        // 1. Check Admin
        let { data: admin } = await supabase.from('admins').select('*').eq('id', userId).maybeSingle();
        if (!admin && userEmail) {
            const { data: adminByEmail } = await supabase.from('admins').select('*').eq('email', userEmail).maybeSingle();
            admin = adminByEmail;
        }
        if (admin) {
            return { role: 'admin', id: admin.id, name: admin.name, profilePicUrl: admin.profile_pic_url };
        }

        // 2. Check Editor
        let { data: editor } = await supabase.from('editors').select('*').eq('id', userId).maybeSingle();
        if (!editor && userEmail) {
            const { data: editorByEmail } = await supabase.from('editors').select('*').eq('email', userEmail).maybeSingle();
            editor = editorByEmail;
        }
        if (editor) {
            return { role: 'editor', id: editor.id, name: editor.name, profilePicUrl: editor.profile_pic_url };
        }

        // 3. Check Clients
        let { data: client } = await supabase.from('clients').select('*').eq('id', userId).maybeSingle();
        if (!client && userEmail) {
            const { data: clientByEmail } = await supabase.from('clients').select('*').eq('email', userEmail).maybeSingle();
            client = clientByEmail;
        }
        if (client) {
            return { role: 'client', id: client.id, name: client.name, profilePicUrl: client.profile_pic_url || undefined };
        }

        // 4. Check Photographers
        let { data: photographer } = await supabase.from('photographers').select('*').eq('id', userId).maybeSingle();
        if (!photographer && userEmail) {
            const { data: photographerByEmail } = await supabase.from('photographers').select('*').eq('email', userEmail).maybeSingle();
            photographer = photographerByEmail;
        }
        if (photographer) {
            return { role: 'photographer', id: photographer.id, name: photographer.name, profilePicUrl: photographer.profile_pic_url };
        }

        // 5. Check Brokers
        let { data: broker } = await supabase.from('brokers').select('*').eq('id', userId).maybeSingle();
        if (!broker && userEmail) {
            const { data: brokerByEmail } = await supabase.from('brokers').select('*').eq('email', userEmail).maybeSingle();
            broker = brokerByEmail;
        }
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

        return null;
    } catch (error) {
        console.error("Unexpected auth error:", error);
        return null;
    }
};

export const getUserById = async (id: string): Promise<User | null> => {
    // Try to find user in all tables by ID

    // Admin
    const { data: admin } = await supabase.from('admins').select('*').eq('id', id).maybeSingle();
    if (admin) return { role: 'admin', id: admin.id, name: admin.name, profilePicUrl: admin.profile_pic_url };

    // Client
    const { data: client } = await supabase.from('clients').select('*').eq('id', id).maybeSingle();
    if (client) return { role: 'client', id: client.id, name: client.name, profilePicUrl: client.profile_pic_url || undefined };

    // Photographer
    const { data: photographer } = await supabase.from('photographers').select('*').eq('id', id).maybeSingle();
    if (photographer) return { role: 'photographer', id: photographer.id, name: photographer.name, profilePicUrl: photographer.profile_pic_url };

    // Broker
    const { data: broker } = await supabase.from('brokers').select('*').eq('id', id).maybeSingle();
    if (broker) return { role: 'broker', id: broker.id, clientId: broker.client_id, name: broker.name, profilePicUrl: broker.profile_pic_url, permissions: broker.permissions };

    // Editor
    const { data: editor } = await supabase.from('editors').select('*').eq('id', id).maybeSingle();
    if (editor) return { role: 'editor', id: editor.id, name: editor.name, profilePicUrl: editor.profile_pic_url };

    return null;
};
