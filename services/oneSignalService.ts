
import OneSignal from 'react-onesignal';

// Substitua pelo seu App ID do OneSignal
const ONESIGNAL_APP_ID = '83c07f22-1313-4007-a64a-7aac3c2069ab';
const ONESIGNAL_REST_API_KEY = 'os_v2_app_qpah6iqtcnaapjskpkwdyidjvpuzucdduerentfjiciqp5dsap5sjhevdm6mhhzonmyp2m2l4agcfwafl366l3v3goat5hsmlti73ci';

export const sendPushNotification = async (userId: string | string[], title: string, message: string, url?: string) => {
    const userIds = Array.isArray(userId) ? userId : [userId];

    const options = {
        method: 'POST',
        headers: {
            accept: 'application/json',
            'content-type': 'application/json',
            Authorization: `Basic ${ONESIGNAL_REST_API_KEY}`
        },
        body: JSON.stringify({
            app_id: ONESIGNAL_APP_ID,
            include_aliases: { external_id: userIds },
            target_channel: "push",
            headings: { en: title, pt: title },
            contents: { en: message, pt: message },
            url: url // Optional URL to open
        })
    };

    try {
        const response = await fetch('https://onesignal.com/api/v1/notifications', options);
        const data = await response.json();
        console.log('✅ Push Notification sent:', data);
    } catch (err) {
        console.error('❌ Error sending Push Notification:', err);
    }
};

export const initOneSignal = async () => {
    try {
        await OneSignal.init({
            appId: ONESIGNAL_APP_ID,
            allowLocalhostAsSecureOrigin: true, // Permite testar em localhost
            // notifyButton: { enable: true }, // Removido para simplificar e evitar erros de tipo, configure pelo painel do OneSignal
            // Configurações para PWA
            serviceWorkerParam: { scope: '/' },
            serviceWorkerPath: 'OneSignalSDKWorker.js',
        });

        console.log("✅ OneSignal inicializado com sucesso!");
    } catch (error) {
        console.error("❌ Erro ao inicializar OneSignal:", error);
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
