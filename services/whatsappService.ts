
import { Booking } from '../types';

// --- CONFIGURAÇÃO Z-API ---
// Para ativar o envio real, substitua as strings abaixo pelas suas credenciais do Z-API.
// DICA DE SEGURANÇA: Em produção, use variáveis de ambiente (ex: process.env.ZAPI_INSTANCE_ID)
const ZAPI_INSTANCE_ID = ''; // Ex: '3900F07665...'
const ZAPI_TOKEN = '';       // Ex: '460D6C220...'

// Helper to sanitize phone numbers for Z-API (55 + DDD + Number)
export const formatPhoneForZApi = (phone: string): string => {
    const cleaned = phone.replace(/\D/g, '');
    // Assume BR if no country code
    if (cleaned.length <= 11) {
        return `55${cleaned}`;
    }
    return cleaned;
};

// --- BASE SEND FUNCTIONS ---

// 1. Standard Text Message
const sendZApiMessage = async (phone: string, message: string): Promise<boolean> => {
    const formattedPhone = formatPhoneForZApi(phone);

    if (ZAPI_INSTANCE_ID && ZAPI_TOKEN) {
        try {
            console.log(`🚀 [Z-API REAL] Enviando Texto para ${formattedPhone}...`);
            const url = `https://api.z-api.io/instances/${ZAPI_INSTANCE_ID}/token/${ZAPI_TOKEN}/send-text`;
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone: formattedPhone, message: message })
            });
            if (!response.ok) { console.error('Erro Z-API:', await response.text()); return false; }
            return true;
        } catch (error) {
            console.error('Falha na requisição Z-API:', error);
            return false;
        }
    }

    // Simulation Mode
    console.group('📲 [Z-API SIMULATION] Enviando Texto...');
    console.log('Para:', formattedPhone);
    console.log('Msg:', message);
    console.groupEnd();
    await new Promise(resolve => setTimeout(resolve, 800));
    return true;
};

// 2. Link Button Message (CTA)
// Documentation: https://developer.z-api.io/message/send-link-button
const sendZApiLinkButton = async (phone: string, message: string, buttonLabel: string, buttonUrl: string, title: string = 'SheepHouse'): Promise<boolean> => {
    const formattedPhone = formatPhoneForZApi(phone);

    if (ZAPI_INSTANCE_ID && ZAPI_TOKEN) {
        try {
            console.log(`🚀 [Z-API REAL] Enviando Botão Link para ${formattedPhone}...`);
            const url = `https://api.z-api.io/instances/${ZAPI_INSTANCE_ID}/token/${ZAPI_TOKEN}/send-link-button`;
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    phone: formattedPhone,
                    message: message,
                    image: "https://cdn-icons-png.flaticon.com/512/2659/2659360.png", // Optional: Icon or Logo URL
                    linkUrl: buttonUrl,
                    title: title,
                    linkName: buttonLabel
                })
            });
            if (!response.ok) { console.error('Erro Z-API (Botão):', await response.text()); return false; }
            return true;
        } catch (error) {
            console.error('Falha na requisição Z-API:', error);
            return false;
        }
    }

    // Simulation Mode
    console.group('📲 [Z-API SIMULATION] Enviando Botão de Link...');
    console.log('Para:', formattedPhone);
    console.log('Título:', title);
    console.log('Msg:', message);
    console.log(`🔘 [BOTÃO]: ${buttonLabel} -> (Abre: ${buttonUrl})`);
    console.groupEnd();
    await new Promise(resolve => setTimeout(resolve, 800));
    return true;
};

// --- TEMPLATES ---

export const sendBookingConfirmation = async (booking: Booking) => {
    const date = new Date(booking.date.replace(/-/g, '/')).toLocaleDateString('pt-BR');
    const message = `Olá *${booking.client_name}*! 👋
Seu agendamento foi confirmado com sucesso!

📝 *Resumo:*
📅 ${date} às ${booking.start_time}
📍 ${booking.address}

Acesse o painel para ver detalhes completos.`;

    // Using Link Button to direct back to App
    return sendZApiLinkButton(
        booking.client_phone,
        message,
        "Ver no Painel",
        `https://sheephouse.com/app/booking/${booking.id}`,
        "Confirmação Agendamento"
    );
};

export const sendRescheduleNotification = async (booking: Booking) => {
    const date = new Date(booking.date.replace(/-/g, '/')).toLocaleDateString('pt-BR');
    const message = `⚠️ *Agendamento Atualizado*

Olá ${booking.client_name}, confirmamos a alteração.

📅 Nova Data: *${date}*
⏰ Novo Horário: *${booking.start_time}*`;

    return sendZApiMessage(booking.client_phone, message);
};

export const sendPhotographerSwapNotification = async (booking: Booking, newPhotographerName: string) => {
    const message = `Olá ${booking.client_name}.
    
Informamos uma atualização na sua equipe. 📷
Seu novo fotógrafo será: *${newPhotographerName}*.

Ele já possui todos os detalhes do serviço.`;

    return sendZApiMessage(booking.client_phone, message);
};

export const sendPhotographerEnRoute = async (booking: Booking, photographerName: string, etaMinutes: number) => {
    const message = `🚗 *A Caminho!*

O fotógrafo *${photographerName}* saiu para o local.
📍 Destino: ${booking.address}
⏱️ Chegada estimada: *${etaMinutes} min*.`;

    return sendZApiMessage(booking.client_phone, message);
};

export const sendMaterialReady = async (booking: Booking, downloadLink: string = 'https://sheephouse.com/downloads') => {
    const message = `Suas fotos estão prontas! 📸✨

O material do imóvel em *${booking.address}* já foi editado.
Clique abaixo para baixar em alta resolução.`;

    return sendZApiLinkButton(
        booking.client_phone,
        message,
        "Baixar Fotos Agora",
        downloadLink,
        "Entrega SheepHouse"
    );
};

export const sendInvoiceNotification = async (clientName: string, clientPhone: string, month: string, amount: number, link: string) => {
    const message = `Olá *${clientName}*!

Sua fatura de *${month}* fechou.
Valor Total: R$ ${amount.toFixed(2)}

Evite bloqueios, clique abaixo para pagar.`;

    return sendZApiLinkButton(
        clientPhone,
        message,
        "Visualizar Fatura",
        link,
        "Financeiro SheepHouse"
    );
};

// --- NEW: RAIN INSURANCE CHECK (Inactive/Pending Activation) ---
// Regra: Enviar 30 minutos antes do agendamento se o serviço 'seguro_chuva' estiver contratado.
export const sendRainInsuranceCheck = async (booking: Booking) => {
    const message = `Olá *${booking.client_name}*! 👋

Notei que temos uma sessão agendada para daqui a pouco (30 min) em:
📍 *${booking.address}*

Como você contratou o *Seguro Chuva* ☔, gostaria de verificar como está o tempo por aí.

Podemos confirmar o deslocamento do fotógrafo ou prefere acionar o seguro e reagendar sem custos?`;

    return sendZApiMessage(booking.client_phone, message);
};
