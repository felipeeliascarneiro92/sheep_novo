
import { supabase } from './supabase';
import { Notification } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { sendPushNotification } from './oneSignalService';

export const getNotificationsForUser = async (role: string, userId?: string): Promise<Notification[]> => {
    let query = supabase.from('notifications').select('*').order('created_at', { ascending: false });

    // Logic: Fetch notifications for specific user OR broadcast to role
    if (userId) {
        query = query.or(`user_id.eq.${userId},role.eq.${role}`);
    } else {
        query = query.eq('role', role);
    }

    const { data, error } = await query.limit(50);

    if (error) {
        console.error('Error fetching notifications:', error);
        return [];
    }

    const notifications = data.map((n: any) => ({
        id: n.id,
        title: n.title,
        message: n.message,
        type: n.type,
        timestamp: n.created_at,
        read: n.read,
        link: n.link
    }));

    // Filter: Keep all unread, and only the most recent 5 read ones to avoid clutter
    const unread = notifications.filter((n: Notification) => !n.read);
    const read = notifications.filter((n: Notification) => n.read).slice(0, 5);

    // Combine and sort by date descending
    return [...unread, ...read].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
};

export const createNotification = async (
    title: string,
    message: string,
    type: 'success' | 'warning' | 'info' | 'urgent',
    role?: string,
    userId?: string,
    link?: string
) => {
    const newNotification = {
        id: uuidv4(),
        title,
        message,
        type,
        role,
        user_id: userId,
        link,
        read: false,
        created_at: new Date().toISOString()
    };

    const { error } = await supabase.from('notifications').insert([newNotification]);
    if (error) console.error('Error creating notification:', error);

    // 🔥 Trigger Push Notification (OneSignal)
    if (userId) {
        // Send to specific user
        const fullUrl = link ? `${window.location.origin}${link}` : undefined;
        sendPushNotification(userId, title, message, fullUrl).catch(e => console.error("Failed to trigger push", e));
    }
};

export const markNotificationAsRead = async (id: string) => {
    const { error } = await supabase.from('notifications').update({ read: true }).eq('id', id);
    if (error) console.error('Error marking notification as read:', error);
};

export const markAllNotificationsAsRead = async (role: string, userId?: string) => {
    // This is a bit tricky with RLS and "broadcast" messages. 
    // For now, let's just update where user_id matches or role matches, 
    // BUT updating broadcast messages affects everyone. 
    // Ideally, we need a separate "user_notifications" table for read status of broadcast messages.
    // For MVP, we'll just update specific user notifications.

    if (userId) {
        await supabase.from('notifications').update({ read: true }).eq('user_id', userId);
    }
};

/**
 * Sends a WhatsApp message using the Z-API via Supabase Edge Function.
 * @param phone The recipient's phone number (e.g., 5511999999999)
 * @param message The text message to send
 */
export const sendWhatsAppNotification = async (phone: string, message: string) => {
    console.log(`🚀 [WhatsApp DISABLED] Tentando enviar para: ${phone}`);
    console.log(`📝 [WhatsApp DISABLED] Mensagem: ${message}`);

    // SIMULATION MODE FOR TESTING
    console.log('✅ [WhatsApp] Simulação: Mensagem não enviada para evitar spam durante testes.');
    return true;

    /* 
    const { data, error } = await supabase.functions.invoke('send-whatsapp', {
        body: { phone, message }
    });

    if (error) {
        console.error('❌ [WhatsApp] Falha na Edge Function:', error);
        return false;
    }

    if (data && data.error) {
        console.error('❌ [WhatsApp] Erro retornado pela Z-API:', data.error);
        return false;
    }

    console.log('✅ [WhatsApp] Enviado com sucesso! Resposta:', data);
    return true;
    */
};

// --- BOOKING NOTIFICATIONS (CLIENT) ---

// --- BOOKING NOTIFICATIONS (CLIENT) ---

import { getClientById } from './clientService';

// Helper to send to multiple numbers if preferences allow
const sendClientWhatsApp = async (clientId: string, defaultPhone: string, message: string) => {
    const client = await getClientById(clientId);
    if (!client) {
        // Fallback if client fetch fails
        await sendWhatsAppNotification(defaultPhone, message);
        return;
    }

    // Check preferences (default to true if undefined)
    const prefs = client.notificationPreferences || { whatsapp: true, email: true, promotions: false };

    if (prefs.whatsapp) {
        // Send to main phone
        await sendWhatsAppNotification(defaultPhone, message);

        // Send to extra notification numbers
        if (client.whatsappNotification1) {
            await sendWhatsAppNotification(client.whatsappNotification1, message);
        }
        if (client.whatsappNotification2) {
            await sendWhatsAppNotification(client.whatsappNotification2, message);
        }
    }
};

// Helper to send email if preferences allow
const sendClientEmail = async (client: any, subject: string, htmlContent: string) => {
    // Check preferences (default to true if undefined)
    const prefs = client.notificationPreferences || { whatsapp: true, email: true, promotions: false };

    if (prefs.email) {
        const recipients = [client.email];
        if (client.marketingEmail1) recipients.push(client.marketingEmail1);
        if (client.marketingEmail2) recipients.push(client.marketingEmail2);

        console.log(`📧 [Email Simulator] Enviando para: ${recipients.join(', ')}`);
        console.log(`📝 [Assunto]: ${subject}`);
        // In the future, this will call supabase.functions.invoke('send-email', { ... })
    }
};

export const notifyClientBookingCreated = async (booking: any, clientName: string, clientPhone: string) => {
    const time = booking.start_time || booking.time || 'Horário a definir';
    const message = `Olá *${clientName}*! 👋\n\nSeu agendamento foi confirmado com sucesso! 🚀\n\n📅 *Data:* ${new Date(booking.date).toLocaleDateString('pt-BR')}\n⏰ *Horário:* ${time.slice(0, 5)}\n📍 *Local:* ${booking.address}\n\nQualquer dúvida, estamos à disposição!`;

    // 1. Send WhatsApp (respecting preferences and extra numbers)
    await sendClientWhatsApp(booking.client_id, clientPhone, message);

    // 2. Send Email (respecting preferences)
    const client = await getClientById(booking.client_id);
    if (client) {
        await sendClientEmail(
            client,
            'Confirmação de Agendamento - SheepHouse',
            `<p>Olá <strong>${clientName}</strong>,</p><p>Seu agendamento foi confirmado para <strong>${new Date(booking.date).toLocaleDateString('pt-BR')} às ${time.slice(0, 5)}</strong>.</p>`
        );
    }

    // 3. Create In-App Notification
    await createNotification(
        'Agendamento Confirmado',
        `Seu agendamento para ${new Date(booking.date).toLocaleDateString('pt-BR')} às ${time.slice(0, 5)} em ${booking.address} foi confirmado. Clique para ver detalhes.`,
        'success',
        'client',
        booking.client_id,
        `/appointments/${booking.id}`
    );
};

export const notifyClientBookingRescheduled = async (booking: any, clientName: string, clientPhone: string) => {
    const time = booking.start_time || booking.time || 'Horário a definir';
    const message = `Olá *${clientName}*! 🔄\n\nSeu agendamento foi reagendado.\n\n📅 *Nova Data:* ${new Date(booking.date).toLocaleDateString('pt-BR')}\n⏰ *Novo Horário:* ${time.slice(0, 5)}\n📍 *Local:* ${booking.address}\n\nContamos com você!`;

    await sendClientWhatsApp(booking.client_id, clientPhone, message);

    const client = await getClientById(booking.client_id);
    if (client) {
        await sendClientEmail(
            client,
            'Agendamento Reagendado - SheepHouse',
            `<p>Olá <strong>${clientName}</strong>,</p><p>Seu agendamento foi alterado para <strong>${new Date(booking.date).toLocaleDateString('pt-BR')} às ${time.slice(0, 5)}</strong>.</p>`
        );
    }

    await createNotification(
        'Agendamento Reagendado',
        `Seu agendamento foi alterado para ${new Date(booking.date).toLocaleDateString('pt-BR')} às ${time.slice(0, 5)}.`,
        'info',
        'client',
        booking.client_id,
        `/appointments/${booking.id}`
    );
};

export const notifyClientBookingCancelled = async (booking: any, clientName: string, clientPhone: string) => {
    const time = booking.start_time || booking.time || 'Horário a definir';
    const message = `Olá *${clientName}*. ❌\n\nInformamos que o agendamento previsto para *${new Date(booking.date).toLocaleDateString('pt-BR')}* às *${time.slice(0, 5)}* foi cancelado.\n\nSe precisar reagendar, entre em contato conosco.`;

    await sendClientWhatsApp(booking.client_id, clientPhone, message);

    const client = await getClientById(booking.client_id);
    if (client) {
        await sendClientEmail(
            client,
            'Agendamento Cancelado - SheepHouse',
            `<p>Olá <strong>${clientName}</strong>,</p><p>O agendamento previsto para <strong>${new Date(booking.date).toLocaleDateString('pt-BR')}</strong> foi cancelado.</p>`
        );
    }

    await createNotification(
        'Agendamento Cancelado',
        `O agendamento de ${new Date(booking.date).toLocaleDateString('pt-BR')} foi cancelado.`,
        'warning',
        'client',
        booking.client_id
    );
};

export const notifyClientBookingCompleted = async (booking: any, clientName: string, clientPhone: string) => {
    if (!booking.dropboxFolderLink) return;

    const message = `Olá *${clientName}*! ✨\n\nSuas fotos estão prontas! 📸\n\nAcesse o link abaixo para visualizar e baixar:\n\n🔗 ${booking.dropboxFolderLink}\n\nEsperamos que goste do resultado!`;

    await sendClientWhatsApp(booking.client_id, clientPhone, message);

    const client = await getClientById(booking.client_id);
    if (client) {
        await sendClientEmail(
            client,
            'Suas Fotos Estão Prontas! 📸 - SheepHouse',
            `<p>Olá <strong>${clientName}</strong>,</p><p>Suas fotos estão prontas para download!</p><p><a href="${booking.dropboxFolderLink}">Clique aqui para acessar suas fotos</a></p>`
        );
    }

    await createNotification(
        'Fotos Prontas! 📸',
        'Suas fotos estão prontas para download. Clique para acessar.',
        'success',
        'client',
        booking.client_id,
        booking.dropboxFolderLink
    );
};

// --- BOOKING NOTIFICATIONS (PHOTOGRAPHER) ---

export const notifyPhotographerNewBooking = async (booking: any, photographerId: string) => {
    const time = booking.start_time || booking.time || 'Horário a definir';
    await createNotification(
        'Novo Agendamento 📸',
        `Novo job em ${new Date(booking.date).toLocaleDateString('pt-BR')} às ${time.slice(0, 5)}. Local: ${booking.address}. Clique para aceitar/ver.`,
        'info',
        'photographer',
        photographerId,
        `/appointments/${booking.id}` // Photographer route
    );
};

export const notifyPhotographerBookingCancelled = async (booking: any, photographerId: string) => {
    await createNotification(
        'Agendamento Cancelado ❌',
        `O job de ${new Date(booking.date).toLocaleDateString('pt-BR')} foi cancelado.`,
        'warning',
        'photographer',
        photographerId
    );
};

export const notifyClientEditingCompleted = async (request: any, clientName: string, clientPhone: string) => {
    const message = `Olá *${clientName}*! ✨\n\nSua solicitação de edição no Creative Studio foi concluída! 🎨\n\nAcesse o portal para baixar as imagens editadas.\n\nEsperamos que goste do resultado!`;

    await sendClientWhatsApp(request.clientId || request.client_id, clientPhone, message);

    const client = await getClientById(request.clientId || request.client_id);
    if (client) {
        await sendClientEmail(
            client,
            'Edição Concluída! 🎨 - Creative Studio',
            `<p>Olá <strong>${clientName}</strong>,</p><p>Sua solicitação de edição foi concluída!</p><p>Acesse o portal para baixar seus arquivos.</p>`
        );
    }

    await createNotification(
        'Edição Concluída! 🎨',
        'Sua solicitação do Creative Studio foi finalizada. Clique para ver.',
        'success',
        'client',
        request.clientId || request.client_id,
        '/creative-studio'
    );
};
