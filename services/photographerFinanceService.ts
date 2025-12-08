import { supabase } from './supabase';

export type FeedbackCategory = 'ATRASO_ENTREGA' | 'LINK_INVERTIDO' | 'ENTREGA_INCOMPLETA' | 'FALTOU_AREA_COMUM' | 'QUALIDADE' | 'RECLAMACAO_ATENDIMENTO' | 'OUTROS';
export type FeedbackSeverity = 'INFO' | 'WARNING' | 'CRITICAL';

export interface PhotographerFeedback {
    id: string;
    booking_id: string;
    photographer_id: string;
    category: FeedbackCategory;
    severity: FeedbackSeverity;
    notes: string;
    reported_by: string;
    created_at: string;
}

export interface PhotographerTransaction {
    id: string;
    photographer_id: string;
    amount: number;
    type: 'DEBIT' | 'CREDIT';
    description: string;
    related_booking_id?: string;
    related_feedback_id?: string;
    created_at: string;
}

import { createNotification } from './notificationService';

// ... (existing interfaces)

export const reportFailure = async (
    bookingId: string,
    photographerId: string,
    category: FeedbackCategory,
    severity: FeedbackSeverity,
    notes: string,
    reporterId: string,
    penaltyAmount?: number
) => {
    // 1. Create Feedback
    const { data: feedback, error: feedbackError } = await supabase
        .from('photographer_feedbacks')
        .insert({
            booking_id: bookingId,
            photographer_id: photographerId,
            category,
            severity,
            notes,
            reported_by: reporterId
        })
        .select()
        .single();

    if (feedbackError) throw feedbackError;

    // 2. If Critical and Penalty Amount > 0, Create Transaction
    if (severity === 'CRITICAL' && penaltyAmount && penaltyAmount > 0) {
        const { error: transactionError } = await supabase
            .from('photographer_transactions')
            .insert({
                photographer_id: photographerId,
                amount: -penaltyAmount, // Negative for debit
                type: 'DEBIT',
                description: `Multa: ${category} - ${notes}`,
                related_booking_id: bookingId,
                related_feedback_id: feedback.id
            });

        if (transactionError) throw transactionError;
    }

    // 3. Add to Booking History (Direct SQL to avoid circular dependency)
    // First fetch current history
    const { data: booking } = await supabase
        .from('bookings')
        .select('history')
        .eq('id', bookingId)
        .single();

    if (booking) {
        const newEntry = {
            timestamp: new Date().toISOString(),
            actor: 'Admin', // Or fetch reporter name if needed, but 'Admin' is safe for now
            notes: `⚠️ Falha Reportada: ${category} - ${notes}`
        };
        const updatedHistory = [...(booking.history || []), newEntry];

        await supabase
            .from('bookings')
            .update({ history: updatedHistory })
            .eq('id', bookingId);
    }

    // 4. Send Notification to Photographer
    await createNotification(
        'Feedback Recebido ⚠️',
        `Você recebeu um reporte de falha do tipo "${category}" no agendamento. Clique para ver detalhes.`,
        severity === 'CRITICAL' ? 'urgent' : 'warning',
        'photographer',
        photographerId,
        `/appointments/${bookingId}`
    );

    return feedback;
};

export const getPhotographerTransactions = async (photographerId: string) => {
    const { data, error } = await supabase
        .from('photographer_transactions')
        .select('*')
        .eq('photographer_id', photographerId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching transactions:', error);
        return [];
    }
    return data;
};

export const getBookingFeedbacks = async (bookingId: string) => {
    const { data, error } = await supabase
        .from('photographer_feedbacks')
        .select('*')
        .eq('booking_id', bookingId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching feedbacks:', error);
        return [];
    }
    return data;
};

export const getRecentFeedbacks = async (limit = 10, photographerId?: string) => {
    let query = supabase
        .from('photographer_feedbacks')
        .select(`
            *,
            bookings (
                date,
                address
            )
        `)
        .order('created_at', { ascending: false })
        .limit(limit);

    if (photographerId) {
        query = query.eq('photographer_id', photographerId);
    }

    const { data, error } = await query;

    if (error) {
        console.error('Error fetching recent feedbacks:', error);
        return [];
    }
    return data;
};

export const getAllFeedbacks = async () => {
    const { data, error } = await supabase
        .from('photographer_feedbacks')
        .select(`
            *,
            bookings (
                date,
                address,
                client_name
            ),
            photographers (
                name
            )
        `)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching all feedbacks:', error);
        return [];
    }

    // Map to flatten structure if needed, or just return data
    return data.map((item: any) => ({
        ...item,
        photographer_name: item.photographers?.name || 'Desconhecido',
        client_name: item.bookings?.client_name || 'N/A',
        booking_date: item.bookings?.date,
        booking_address: item.bookings?.address
    }));
};
