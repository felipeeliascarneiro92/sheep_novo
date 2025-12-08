
import { supabase } from './supabase';
import { Conversation, Message, Booking } from '../types';
import { getBookingsForClient, getBookingsForPhotographer, getBookingsByDate, bookingFromDb } from './scheduleService';

// --- CONVERSATIONS ---

export const getTodayConversationsForUser = async (userId: string, role: string): Promise<Conversation[]> => {
    const today = new Date().toISOString().split('T')[0];

    // 1. Find bookings for today involving this user
    let bookings: Booking[] = [];

    if (role === 'admin') {
        // Admin sees ALL bookings for today
        bookings = await getBookingsByDate(today);
    } else if (role === 'client') {
        const allClientBookings = await getBookingsForClient(userId);
        bookings = allClientBookings.filter(b => b.date === today && b.status !== 'Cancelado');
    } else if (role === 'photographer') {
        const allPhotoBookings = await getBookingsForPhotographer(userId);
        bookings = allPhotoBookings.filter(b => b.date === today && b.status !== 'Cancelado');
    }

    if (bookings.length === 0) return [];

    // 2. Fetch or Create Conversation for each booking
    //    We do this in parallel. If a conversation doesn't exist, we construct a "Virtual" one or create it on DB.
    //    To ensure Realtime works, best practice is to ensure DB record exists. 
    //    However, to avoid spamming DB with empty conversations, we can just check if they exist.

    const bookingIds = bookings.map(b => b.id);

    // Batch fetch existing conversations
    const { data: existingConversations } = await supabase
        .from('conversations')
        .select('*, messages(*)')
        .in('booking_id', bookingIds);

    const existingMap = new Map<string, Conversation>();
    if (existingConversations) {
        existingConversations.forEach((c: any) => existingMap.set(c.booking_id, c));
    }

    const results: Conversation[] = [];

    for (const booking of bookings) {
        let conv = existingMap.get(booking.id);

        if (!conv) {
            // Create new conversation if it doesn't exist
            // We do this individually as it's a rare case (once per booking)
            const { data: newConv } = await supabase
                .from('conversations')
                .insert([{ booking_id: booking.id }])
                .select()
                .single();

            if (newConv) {
                conv = { ...newConv, messages: [] } as Conversation;
            }
        }

        if (conv) {
            // Sort messages
            const sortedMessages = (conv.messages || []).sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

            // Calculate unread count
            const unreadCount = sortedMessages.filter((m: Message) => !m.read_at && m.sender_id !== userId).length;

            results.push({
                ...conv,
                messages: sortedMessages,
                booking, // Attach booking details for UI
                unreadCount
            } as Conversation);
        }
    }

    return results;


};

// --- MESSAGES ---

export const uploadChatAttachment = async (file: File): Promise<string | null> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { data, error } = await supabase.storage
        .from('chat-attachments')
        .upload(filePath, file);

    if (error) {
        console.error('Error uploading chat attachment:', error);
        return null;
    }

    const { data: { publicUrl } } = supabase.storage
        .from('chat-attachments')
        .getPublicUrl(filePath);

    return publicUrl;
};

export const sendMessage = async (
    conversationId: string,
    senderId: string,
    senderRole: string,
    content: string,
    type: 'text' | 'image' | 'audio' | 'file' = 'text',
    mediaUrl?: string
) => {
    const { error } = await supabase.from('messages').insert([{
        conversation_id: conversationId,
        sender_id: senderId,
        sender_role: senderRole,
        content,
        type,
        media_url: mediaUrl
    }]);

    if (!error) {
        // Update conversation 'updated_at' to bump it to top of lists if we implemented sorting
        await supabase.from('conversations').update({ updated_at: new Date().toISOString() }).eq('id', conversationId);
    }

    return error;
};

export const markMessagesAsRead = async (conversationId: string, userId: string) => {
    // Mark all messages not sent by me as read
    await supabase.from('messages')
        .update({ read_at: new Date().toISOString() })
        .eq('conversation_id', conversationId)
        .neq('sender_id', userId)
        .is('read_at', null);
};

// --- REALTIME SUBSCRIPTION HELPER ---

export const subscribeToConversation = (conversationId: string, onMessage: (msg: Message) => void) => {
    const channel = supabase.channel(`chat:${conversationId}`)
        .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
            (payload) => {
                onMessage(payload.new as Message);
            }
        )
        .subscribe();

    return () => {
        supabase.removeChannel(channel);
    };
};
