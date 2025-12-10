
import OneSignal from 'react-onesignal';

// Substitua pelo seu App ID do OneSignal
const ONESIGNAL_APP_ID = '83c07f22-1313-4007-a64a-7aac3c2069ab';

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
