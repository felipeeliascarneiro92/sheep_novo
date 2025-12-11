
export * from './clientService';
export * from './photographerService';
export * from './resourceService';
export * from './financeService';
export * from './taskService';
export * from './authService';
export * from './auditService';
export * from './scheduleService';
export * from './asaasService';
export * from './notificationService';
export * from './storageService'; // New export

import { getBookingById, bookingToDb } from './scheduleService';
import { supabase } from './supabase';
import { HistoryActor, PendingService } from '../types';
import { createBookingFolder } from './storageService';
import { notifyClientBookingRescheduled, notifyClientBookingCancelled, notifyClientBookingCompleted } from './notificationService';
import { getClientById } from './clientService';
import { reportFailure } from './photographerFinanceService';

export const updateBookingObservations = async (id: string, newObservations: string, actor: HistoryActor) => {
    const booking = await getBookingById(id);
    if (booking) {
        const oldObs = booking.unit_details || '';
        booking.unit_details = newObservations;

        // Only log if changed
        if (oldObs !== newObservations) {
            booking.history.push({
                timestamp: new Date().toISOString(),
                actor: actor,
                notes: 'Observações/Detalhes do imóvel atualizados'
            });
            await supabase.from('bookings').update(bookingToDb(booking)).eq('id', id);
        }

        // NOTIFICATION: WhatsApp to Client (Reschedule)
        const client = await getClientById(booking.client_id);
        if (client && client.phone) {
            notifyClientBookingRescheduled(booking, client.name, client.phone);
        }

        return booking;
    }
    return null;
};

export const linkBookingToDropbox = async (bookingId: string, actor: HistoryActor) => {
    const booking = await getBookingById(bookingId);
    if (booking && !booking.dropboxFolderId) {
        try {
            const { folderId, webViewLink, uploadLink } = await createBookingFolder(booking);
            booking.dropboxFolderId = folderId;
            booking.dropboxFolderLink = webViewLink; // Shared Link (View)
            booking.dropboxUploadLink = uploadLink; // File Request (Upload)

            booking.history.push({
                timestamp: new Date().toISOString(),
                actor: actor,
                notes: 'Pasta de arquivos criada'
            });
            await supabase.from('bookings').update(bookingToDb(booking)).eq('id', bookingId);
            return booking;
        } catch (error) {
            console.error("Failed to create Dropbox folder", error);
            return null;
        }
    }
    return booking;
};


// ... (existing code)

// Updated to ASYNC to handle Drive creation
export const completeBooking = async (id: string, internalNotes: string, commonAreaId?: string, extraServices?: PendingService[]) => {
    const booking = await getBookingById(id);
    if (booking) {
        booking.status = 'Realizado';
        booking.internalNotes = internalNotes; // Save to internalNotes
        if (commonAreaId) booking.commonAreaId = commonAreaId;
        if (extraServices && extraServices.length > 0) {
            booking.pending_services = extraServices;
            booking.history.push({ timestamp: new Date().toISOString(), actor: 'Fotógrafo', notes: 'Serviços extras reportados' });
        }

        booking.history.push({ timestamp: new Date().toISOString(), actor: 'Fotógrafo', notes: 'Sessão realizada' });

        // AUTOMATION: Check for Late Delivery
        if (booking.photographer_id) {
            const deadline = new Date(`${booking.date}T23:59:59`);
            const now = new Date();

            if (now > deadline) {
                console.log("⚠️ Late delivery detected. Reporting failure...");
                reportFailure(
                    booking.id,
                    booking.photographer_id,
                    'ATRASO_ENTREGA',
                    'WARNING',
                    'Entrega de material realizada após o prazo limite (23:59 do dia do agendamento).',
                    booking.photographer_id // Self-reported by system enforcement
                ).catch(err => console.error("Failed to auto-report late delivery:", err));

                booking.history.push({
                    timestamp: new Date().toISOString(),
                    actor: 'Sistema',
                    notes: '⚠️ Atraso na entrega detectado: Falha registrada.'
                });
            }
        }

        // AUTOMATION: Create Drive Folder
        try {
            console.log("Auto-creating Dropbox folder for booking", id);
            const { folderId, webViewLink, uploadLink } = await createBookingFolder(booking);

            booking.dropboxFolderId = folderId;
            booking.dropboxFolderLink = webViewLink;
            booking.dropboxUploadLink = uploadLink;
            booking.history.push({ timestamp: new Date().toISOString(), actor: 'Sistema', notes: 'Pasta de arquivos criada automaticamente' });
        } catch (e) {
            console.error("Erro ao criar pasta automática no Dropbox", e);
            // We don't stop the completion flow if drive fails, just log it
        }

        await supabase.from('bookings').update(bookingToDb(booking)).eq('id', id);


    }
    return booking!;
};

export const approvePendingService = async (bookingId: string, serviceIndex: number, actor: HistoryActor) => {
    const booking = await getBookingById(bookingId);
    if (!booking || !booking.pending_services || !booking.pending_services[serviceIndex]) return null;

    const pending = booking.pending_services[serviceIndex];

    // Add to real services
    if (!booking.service_ids.includes(pending.serviceId)) {
        booking.service_ids.push(pending.serviceId);
        // Note: Prices are not automatically added here as custom overrides unless we decide to. 
        // For now, it falls back to standard pricing which calculates correctly in `calculatePayout`.
    }

    // Remove from pending
    booking.pending_services.splice(serviceIndex, 1);

    booking.history.push({
        timestamp: new Date().toISOString(),
        actor: actor,
        notes: `Serviço extra aprovado: ${pending.serviceId}`
    });

    await supabase.from('bookings').update(bookingToDb(booking)).eq('id', booking.id);
    return booking;
};

export const rejectPendingService = async (bookingId: string, serviceIndex: number, actor: HistoryActor) => {
    const booking = await getBookingById(bookingId);
    if (!booking || !booking.pending_services || !booking.pending_services[serviceIndex]) return null;

    const pending = booking.pending_services[serviceIndex];

    // Remove from pending
    booking.pending_services.splice(serviceIndex, 1);

    booking.history.push({
        timestamp: new Date().toISOString(),
        actor: actor,
        notes: `Serviço extra rejeitado: ${pending.serviceId}`
    });

    await supabase.from('bookings').update(bookingToDb(booking)).eq('id', booking.id);
    return booking;
};

// ... exports below remain unchanged, re-exporting them to ensure file integrity
export {
    uploadMaterialForBooking, deliverAndCompleteBooking, addTipToBooking,
    updateKeyStatus, reassignBooking, getContextualUpsells, getBookingDuration,
    generateMarketingDescription, updateBookingFull, loadGoogleMapsScript
} from './scheduleService';

export { uploadCreativeStudioFile } from './resourceService';
