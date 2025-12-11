import { Booking } from '../types';

// --- CONFIGURAÇÃO Z-API ---
// Para ativar o envio real, substitua as strings abaixo pelas suas credenciais do Z-API.
// DICA DE SEGURANÇA: Em produção, use variáveis de ambiente (ex: process.env.ZAPI_INSTANCE_ID)
const ZAPI_INSTANCE_ID = '3C9B5DDA9DFC508BDCD0D604DAF2BCF1';
const ZAPI_TOKEN = 'E4CFB5D4FB0A368932B217CC';
const ZAPI_CLIENT_TOKEN = 'F783bd8037b984076953132db525cab81S';

// Helper to sanitize phone numbers for Z-API (55 + DDD + Number)
export const formatPhoneForZApi = (phone: string): string => {
    let cleaned = phone.replace(/\D/g, '');

    // Check if it already has 55 (DDI Brazil) at the start
    // A standard mobile number with DDI is 13 digits (55 + 2 digit DDD + 9 digit number)
    // A standard landline with DDI is 12 digits (55 + 2 digit DDD + 8 digit number)

    // If it's a raw local number (e.g. 11999999999 - 11 digits)
    if (cleaned.length === 11 || cleaned.length === 10) {
        return `55${cleaned}`;
    }

    // If it seems to already have DDI (e.g. 5511999999999)
    if (cleaned.startsWith('55') && (cleaned.length === 13 || cleaned.length === 12)) {
        return cleaned;
    }

    // Fallback/Safety: If it's short, just add 55, otherwise return as is (might be international)
    if (cleaned.length < 12 && !cleaned.startsWith('55')) {
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
                headers: {
                    'Content-Type': 'application/json',
                    'Client-Token': ZAPI_CLIENT_TOKEN
                },
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
                headers: {
                    'Content-Type': 'application/json',
                    'Client-Token': ZAPI_CLIENT_TOKEN
                },
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

// 3. Action Button Message (Interactive)
// Documentation: https://developer.z-api.io/message/send-button-actions
// 3. Action Button Message (Interactive)
// Documentation: https://developer.z-api.io/message/send-button-actions
const sendZApiButtonActions = async (phone: string, message: string, title: string, buttons: { id: string, label: string, type: 'REPLY' | 'URL' | 'CALL', url?: string, phoneNumber?: string }[]): Promise<boolean> => {
    const formattedPhone = formatPhoneForZApi(phone);

    if (ZAPI_INSTANCE_ID && ZAPI_TOKEN) {
        try {
            console.log(`🚀 [Z-API REAL] Enviando Ações de Botão para ${formattedPhone}...`);
            const url = `https://api.z-api.io/instances/${ZAPI_INSTANCE_ID}/token/${ZAPI_TOKEN}/send-button-actions`;

            const buttonActions = buttons.map(b => {
                if (b.type === 'URL') {
                    return { id: b.id, type: 'URL', url: b.url, label: b.label };
                } else if (b.type === 'CALL') {
                    return { id: b.id, type: 'CALL', phoneNumber: b.phoneNumber, label: b.label };
                } else {
                    return { id: b.id, type: 'REPLY', label: b.label };
                }
            });

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Client-Token': ZAPI_CLIENT_TOKEN
                },
                body: JSON.stringify({
                    phone: formattedPhone,
                    message: message,
                    title: title,
                    footer: "Escolha uma opção abaixo:",
                    buttonActions: buttonActions
                })
            });
            if (!response.ok) { console.error('Erro Z-API ({Action Buttons):', await response.text()); return false; }
            return true;
        } catch (error) {
            console.error('Falha na requisição Z-API:', error);
            return false;
        }
    }

    // Simulation Mode
    console.group('📲 [Z-API SIMULATION] Enviando Ações de Botão...');
    console.log('Para:', formattedPhone);
    console.log('Título:', title);
    console.log('Msg:', message);
    buttons.forEach(b => console.log(`🔘 [AÇÃO - ${b.type}]: ${b.label} ${b.url ? `(Link: ${b.url})` : ''}`));
    console.groupEnd();
    await new Promise(resolve => setTimeout(resolve, 800));
    return true;
};

export const sendBookingConfirmation = async (booking: Booking, targetPhone?: string) => {
    const date = new Date(booking.date.replace(/-/g, '/')).toLocaleDateString('pt-BR');
    const phone = targetPhone || booking.client_phone;

    const message = `Olá *${booking.client_name}*! 👋
Seu agendamento foi confirmado com sucesso!

📝 *Resumo:*
📅 ${date} às ${booking.start_time}
📍 ${booking.address}
📸 Fotógrafo: ${booking.photographer_name || 'A definir'}

Acesse o link abaixo para gerenciar seu agendamento, ver fotos ou cancelar:
https://sheephouse.com/app/booking/${booking.id}`;

    return sendZApiMessage(phone, message);
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

export const sendInvoiceNotification = async (clientName: string, clientPhone: string, month: string, amount: number, invoiceUrl: string, bankSlipUrl: string) => {
    const message = `Olá *${clientName}*! 📄
    
Sua fatura de *${month}* está fechada.
💰 Valor Total: *R$ ${amount.toFixed(2)}*

Este link contém o relatório detalhado dos serviços realizados e as opções de pagamento.

Não deixe para a última hora! 😉`;

    // Priority: Invoice URL (Web View with Report) -> Bank Slip (PDF/Direct)
    const linkToSend = invoiceUrl || bankSlipUrl;

    if (!linkToSend) return false;

    return sendZApiLinkButton(
        clientPhone,
        message,
        "📄 Ver Fatura e Relatório",
        linkToSend,
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
