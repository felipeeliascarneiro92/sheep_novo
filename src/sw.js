
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';
import { clientsClaim } from 'workbox-core';

// 1. Configuração padrão do Workbox (PWA Offline)
cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);
self.skipWaiting();
clientsClaim();

// 2. OneSignal - Descomente se necessário, mas pode causar conflitos em modo dev
// try {
//   importScripts('https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js');
// } catch (e) {
//   console.warn('Falha ao importar OneSignal no SW (normal em dev):', e);
// }
