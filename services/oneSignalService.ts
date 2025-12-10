import { supabase } from './supabase';
import OneSignal from 'react-onesignal';

const ONESIGNAL_APP_ID = '83c07f22-1313-4007-a64a-7aac3c2069ab';

export const sendPushNotification = async (userId: string | string[], title: string, message: string, url?: string) => {
    const userIds = Array.isArray(userId) ? userId : [userId];

    try {
        const { data, error } = await supabase.functions.invoke('send-push', {
            body: {
                userIds,
                title,
                message,
                url
            }
        });

        if (error) throw error;
        console.log('✅ Push Notification sent via Edge Function:', data);
    } catch (err) {
        console.error('❌ Error sending Push Notification:', err);
    }
};

export const initOneSignal = async () => {
    // Check if running on localhost to avoid "domain restricted" errors
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

    // Disable OneSignal on localhost to prevent "ServiceWorkerRegistration" console spam
    const shouldInit = !isLocalhost;

    if (!shouldInit) {
        console.log("🔕 OneSignal desativado no localhost para evitar erros de console.");
        return;
    }

    try {
        await OneSignal.init({
            appId: ONESIGNAL_APP_ID,
            allowLocalhostAsSecureOrigin: true, // Attempt to allow localhost
            serviceWorkerParam: { scope: '/' },
            serviceWorkerPath: 'sw.js',
        });

        console.log("✅ OneSignal inicializado com sucesso!");
    } catch (error: any) {
        // Suppress specific domain error on localhost
        if (isLocalhost && error?.message?.includes('can only be used on')) {
            console.warn("⚠️ OneSignal skipped: Domain restriction on localhost.");
        } else if (error?.message?.includes('SDK already initialized')) {
            // Ignore this warn
        } else {
            console.error("❌ Erro ao inicializar OneSignal:", error);
        }
    }
};

/**
 * Vincula o ID do usuário do nosso banco ao OneSignal.
 * Isso permite enviar notificações para "user_123" especificamente.
 */
export const identifyUserOnOneSignal = async (userId: string, email?: string) => {
    try {
        await OneSignal.login(userId);
        if (email) {
            await OneSignal.User.addEmail(email);
        }
        console.log(`👤 Usuário identificado no OneSignal: ${userId}`);
    } catch (error) {
        console.error("Erro ao identificar usuário no OneSignal:", error);
    }
};

/**
 * Desloga o usuário do OneSignal (ao fazer logout do app)
 */
export const logoutOneSignal = async () => {
    try {
        await OneSignal.logout();
    } catch (error) {
        console.error("Erro ao deslogar do OneSignal:", error);
    }
};
