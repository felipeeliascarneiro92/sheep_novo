


import { supabase } from './supabase';
import { AdminInvoice, PaymentStatus, Coupon, Booking, Photographer, Client } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { getClientById } from './clientService';
import { getPhotographerById } from './photographerService';
import { logAction } from './auditService';

// --- INVOICES ---
export const getInvoicesForClient = async (clientId: string): Promise<AdminInvoice[]> => {
    const { data, error } = await supabase.from('invoices').select('*').eq('client_id', clientId);
    if (error) return [];
    return data.map((i: any) => ({
        id: i.id,
        clientId: i.client_id,
        clientName: i.client_name,
        monthYear: i.month_year,
        issueDate: i.issue_date,
        dueDate: i.due_date,
        amount: i.amount,
        status: i.status,
        bookingIds: i.booking_ids,
        asaasPaymentId: i.asaas_payment_id,
        asaasInvoiceUrl: i.asaas_invoice_url,
        asaasBankSlipUrl: i.asaas_bank_slip_url
    }));
};

export const getInvoicesForAdmin = async (): Promise<AdminInvoice[]> => {
    const { data, error } = await supabase.from('invoices').select('*');
    if (error) return [];
    return data.map((i: any) => ({
        id: i.id,
        clientId: i.client_id,
        clientName: i.client_name,
        monthYear: i.month_year,
        issueDate: i.issue_date,
        dueDate: i.due_date,
        amount: i.amount,
        status: i.status,
        bookingIds: i.booking_ids,
        asaasPaymentId: i.asaas_payment_id,
        asaasInvoiceUrl: i.asaas_invoice_url,
        asaasBankSlipUrl: i.asaas_bank_slip_url
    }));
};

export const getInvoiceById = async (id: string): Promise<{ invoice: AdminInvoice, bookings: Booking[] } | null> => {
    const { data: invoiceData, error } = await supabase.from('invoices').select('*').eq('id', id).single();
    if (error || !invoiceData) return null;

    const invoice: AdminInvoice = {
        id: invoiceData.id,
        clientId: invoiceData.client_id,
        clientName: invoiceData.client_name,
        monthYear: invoiceData.month_year,
        issueDate: invoiceData.issue_date,
        dueDate: invoiceData.due_date,
        amount: invoiceData.amount,
        status: invoiceData.status,
        bookingIds: invoiceData.booking_ids,
        asaasPaymentId: invoiceData.asaas_payment_id,
        asaasInvoiceUrl: invoiceData.asaas_invoice_url,
        asaasBankSlipUrl: invoiceData.asaas_bank_slip_url
    };

    // Fetch bookings linked to this invoice
    // Assuming bookings have invoiceId column
    const { data: bookings } = await supabase.from('bookings').select('*').eq('invoice_id', id);

    return { invoice, bookings: bookings || [] };
};

export const createManualInvoice = async (clientId: string, amount: number, dueDate: string, description: string) => {
    const client = await getClientById(clientId);
    if (!client) return;
    const invoice: AdminInvoice = {
        id: uuidv4(),
        clientId,
        clientName: client.name,
        amount,
        dueDate,
        issueDate: new Date().toISOString().split('T')[0],
        monthYear: 'Avulso',
        status: 'Pendente',
        bookingIds: [],
        asaasPaymentId: `pay_manual_${uuidv4().slice(0, 8)}`
    };
    await supabase.from('invoices').insert([invoice]);

    // 📧 Email Receipt
    import('./emailService').then(({ sendNewInvoice }) => {
        sendNewInvoice(client, '', amount, dueDate, description).catch(console.error);
    });
};

export const saveAsaasInvoice = async (clientId: string, charge: { id: string, invoiceUrl: string, value: number, dueDate: string, description: string }) => {
    const client = await getClientById(clientId);
    if (!client) return;

    const invoicePayload = {
        id: uuidv4(),
        client_id: clientId,
        client_name: client.name,
        amount: charge.value,
        due_date: charge.dueDate,
        issue_date: new Date().toISOString().split('T')[0],
        month_year: 'Avulso',
        status: 'Pendente',
        booking_ids: [],
        asaas_payment_id: charge.id,
        asaas_invoice_url: charge.invoiceUrl
    };

    const { error } = await supabase.from('invoices').insert([invoicePayload]);
    if (error) {
        console.error("Error saving invoice to DB:", error);
    } else {
        // 📧 Email Receipt
        import('./emailService').then(({ sendNewInvoice }) => {
            sendNewInvoice(client, charge.invoiceUrl, charge.value, charge.dueDate, charge.description).catch(console.error);
        });
    }
};

export const generateMonthlyInvoices = async (): Promise<AdminInvoice[]> => {
    const newInvoices: AdminInvoice[] = [];
    const { data: clients } = await supabase.from('clients').select('*');
    if (!clients) return [];

    const postPaidClients = clients.filter((c: any) => c.payment_type?.trim().toLowerCase() === 'pós-pago' && c.is_active);

    // Calculate Previous Month Range
    const now = new Date();
    const firstDayPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastDayPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    const startDateStr = firstDayPrevMonth.toISOString().split('T')[0];
    const endDateStr = lastDayPrevMonth.toISOString().split('T')[0];

    const monthLabel = firstDayPrevMonth.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });

    for (const client of postPaidClients) {
        // Find uninvoiced bookings in range
        // Status: Realizado OR (Cancelado AND total_price > 0)
        // Note: Supabase OR syntax is a bit tricky with mixed ANDs. 
        // Simplest way: Fetch all in date range + uninvoiced, then filter in JS.

        const { data: bookings } = await supabase.from('bookings').select('*')
            .eq('client_id', client.id)
            .gte('date', startDateStr)
            .lte('date', endDateStr)
            .is('invoice_id', null);

        if (!bookings) continue;

        const billableBookings = bookings.filter((b: any) =>
            b.status === 'Realizado' ||
            (b.status === 'Concluído') ||
            (b.status === 'Cancelado' && b.total_price > 0)
        );

        if (billableBookings.length > 0) {
            const totalAmount = billableBookings.reduce((sum: number, b: any) => sum + b.total_price, 0);

            // Calculate Due Date:
            // If today is Dec 4th, and dueDay is 10. Due Date is Dec 10th.
            // If today is Dec 15th, and dueDay is 10. Due Date is Jan 10th? 
            // User said: "start of next month I generate... due date 10 or 15".
            // So usually generation happens BEFORE due date.
            // We will assume Due Date is in the CURRENT month of generation.

            let dueDay = client.due_day || 10;
            let dueDate = new Date(now.getFullYear(), now.getMonth(), dueDay);

            // Safety: If we generate on the 12th and due date was 10th, should we push to next month?
            // For now, let's keep it simple: Current Month. If it's in the past, Asaas might complain or it will be overdue immediately.
            if (dueDate < now) {
                // Option: Push to next month if already passed?
                // dueDate = new Date(now.getFullYear(), now.getMonth() + 1, dueDay);
                // User said "sometimes just a few days ahead". Let's ensure at least 2 days?
                const twoDaysFromNow = new Date();
                twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2);
                if (dueDate < twoDaysFromNow) {
                    dueDate = twoDaysFromNow;
                }
            }

            const dueDateStr = dueDate.toISOString().split('T')[0];

            // 1. Ensure Asaas Customer
            let asaasId = client.asaas_customer_id;
            if (!asaasId) {
                // We need to import createAsaasCustomer here or move logic. 
                // Since this is financeService, we can import from asaasService.
                // But to avoid circular deps if asaasService imports financeService, be careful.
                // asaasService usually doesn't import financeService.
                const { createAsaasCustomer } = await import('./asaasService');
                asaasId = await createAsaasCustomer({ ...client, asaasCustomerId: null } as any); // Cast to avoid type mismatch if types differ slightly
                if (asaasId && !asaasId.startsWith('cus_error')) {
                    await supabase.from('clients').update({ asaas_customer_id: asaasId }).eq('id', client.id);
                }
            }

            // 2. Create Asaas Charge
            const { createAsaasCharge } = await import('./asaasService');
            let chargeData = { id: `temp_${uuidv4()}`, invoiceUrl: '', bankSlipUrl: '' };

            try {
                if (asaasId && !asaasId.startsWith('cus_error')) {
                    chargeData = await createAsaasCharge(
                        asaasId,
                        totalAmount,
                        dueDateStr,
                        `Fatura Mensal - ${monthLabel}`,
                        'BOLETO',
                        `monthly_${client.id}_${monthLabel}`
                    );
                }
            } catch (e) {
                console.error(`Failed to create Asaas charge for ${client.name}`, e);
                // Continue to create local invoice but mark as error? Or skip?
                // Let's create local invoice so admin can retry or fix.
            }

            const newInvoicePayload = {
                id: uuidv4(),
                client_id: client.id,
                client_name: client.name,
                month_year: monthLabel,
                issue_date: now.toISOString().split('T')[0],
                due_date: dueDateStr,
                amount: totalAmount,
                status: 'Pendente',
                booking_ids: billableBookings.map((b: any) => b.id),
                asaas_payment_id: chargeData.id,
                asaas_invoice_url: chargeData.invoiceUrl,
                asaas_bank_slip_url: chargeData.bankSlipUrl
            };

            // Link bookings to this invoice
            for (const b of billableBookings) {
                await supabase.from('bookings').update({ invoice_id: newInvoicePayload.id }).eq('id', b.id);
            }

            await supabase.from('invoices').insert([newInvoicePayload]);

            // Map back to AdminInvoice for return
            const newInvoice: AdminInvoice = {
                id: newInvoicePayload.id,
                clientId: newInvoicePayload.client_id,
                clientName: newInvoicePayload.client_name,
                monthYear: newInvoicePayload.month_year,
                issueDate: newInvoicePayload.issue_date,
                dueDate: newInvoicePayload.due_date,
                amount: newInvoicePayload.amount,
                status: 'Pendente',
                bookingIds: newInvoicePayload.booking_ids,
                asaasPaymentId: newInvoicePayload.asaas_payment_id,
                asaasInvoiceUrl: newInvoicePayload.asaas_invoice_url,
                asaasBankSlipUrl: newInvoicePayload.asaas_bank_slip_url
            };

            newInvoices.push(newInvoice);

            logAction(
                { id: 'system', name: 'Sistema', role: 'Sistema' },
                'FINANCE',
                'Faturamento',
                `Fatura mensal gerada para ${client.name}: R$ ${totalAmount.toFixed(2)} (${billableBookings.length} serviços)`,
                { invoiceId: newInvoice.id }
            );

            // 📧 Email Receipt
            import('./emailService').then(({ sendNewInvoice }) => {
                sendNewInvoice(client, newInvoice.asaasInvoiceUrl || '', totalAmount, dueDateStr, `Fatura Mensal - ${monthLabel}`).catch(console.error);
            });
        }
    }

    return newInvoices;
};

export const updateInvoiceStatus = async (id: string, status: PaymentStatus) => {
    await supabase.from('invoices').update({ status }).eq('id', id);
};

// --- NEW: MANUAL BILLING GENERATION LOGIC ---

export interface PendingBillable {
    client: Client;
    bookings: Booking[];
    total: number;
}

export const getPendingBillables = async (): Promise<PendingBillable[]> => {
    // Group all uninvoiced completed bookings by client
    const { data: bookings } = await supabase.from('bookings').select('*')
        .in('status', ['Realizado', 'Concluído'])
        .is('invoice_id', null);

    const uninvoicedBookings = bookings || [];

    const grouped: Record<string, Booking[]> = {};
    uninvoicedBookings.forEach((b: any) => {
        if (!grouped[b.client_id]) grouped[b.client_id] = [];
        grouped[b.client_id].push(b);
    });

    const result: PendingBillable[] = [];

    for (const [clientId, bookings] of Object.entries(grouped)) {
        const client = await getClientById(clientId);
        if (client) {
            const total = bookings.reduce((sum, b) => sum + b.total_price, 0);
            if (total > 0) {
                result.push({
                    client,
                    bookings: bookings.sort((a, b) => new Date(a.date || 0).getTime() - new Date(b.date || 0).getTime()),
                    total
                });
            }
        }
    }

    return result;
};

export const generateInvoiceForClient = async (clientId: string, bookingIds: string[], dueDateOverride?: string) => {
    const client = await getClientById(clientId);
    if (!client) return null;

    const { data: bookings } = await supabase.from('bookings').select('*')
        .in('id', bookingIds)
        .is('invoice_id', null);

    const bookingsToBill = bookings || [];
    if (bookingsToBill.length === 0) return null;

    const totalAmount = bookingsToBill.reduce((sum: number, b: any) => sum + b.total_price, 0);
    const now = new Date();
    const monthLabel = now.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });

    const calculatedDueDate = new Date(now.getFullYear(), now.getMonth() + 1, client.dueDay || 10);
    const finalDueDate = dueDateOverride || calculatedDueDate.toISOString().split('T')[0];

    const newInvoice: AdminInvoice = {
        id: uuidv4(),
        clientId: client.id,
        clientName: client.name,
        monthYear: monthLabel,
        issueDate: now.toISOString().split('T')[0],
        dueDate: finalDueDate,
        amount: totalAmount,
        status: 'Pendente',
        bookingIds: bookingsToBill.map((b: any) => b.id),
        asaasPaymentId: `pay_gen_manual_${uuidv4().slice(0, 8)}`
    };

    for (const b of bookingsToBill) {
        await supabase.from('bookings').update({ invoice_id: newInvoice.id }).eq('id', b.id);
    }

    await supabase.from('invoices').insert([newInvoice]);

    logAction(
        { id: 'current_user', name: 'Admin', role: 'Admin' },
        'FINANCE',
        'Faturamento',
        `Fatura manual gerada para ${client.name}: R$ ${totalAmount.toFixed(2)} (${bookingsToBill.length} itens)`,
        { invoiceId: newInvoice.id }
    );

    // 📧 Email Receipt (Async)
    import('./emailService').then(({ sendNewInvoice }) => {
        // Asaas URL might be empty for purely manual invoices if not integrated, 
        // normally generateInvoiceForClient logic should probably integrate Asaas too, 
        // but sticking to existing logic, we send what we have.
        sendNewInvoice(client, '', totalAmount, finalDueDate, `Faturamento Avulso - ${monthLabel}`).catch(console.error);
    });

    return newInvoice;
};


// --- COUPONS ---
export const getCoupons = async (): Promise<Coupon[]> => {
    const { data, error } = await supabase.from('coupons').select('*');
    if (error) return [];
    return data.map((c: any) => ({
        id: c.id,
        code: c.code,
        type: c.type,
        value: c.value,
        expirationDate: c.expiration_date,
        maxUses: c.max_uses,
        usedCount: c.used_count,
        isActive: c.is_active,
        serviceRestrictionId: c.service_restriction_id,
        usedByClientIds: c.used_by_client_ids,
        maxUsesPerClient: c.max_uses_per_client
    }));
};

export const addCoupon = async (data: Omit<Coupon, 'id' | 'usedCount' | 'usedByClientIds'>) => {
    const newCoupon = {
        id: uuidv4(),
        code: data.code,
        type: data.type,
        value: data.value,
        expiration_date: data.expirationDate,
        max_uses: data.maxUses,
        used_count: 0,
        is_active: data.isActive,
        service_restriction_id: data.serviceRestrictionId,
        used_by_client_ids: [],
        max_uses_per_client: data.maxUsesPerClient || 1 // Default to 1 if not provided
    };
    await supabase.from('coupons').insert([newCoupon]);
};

export const deleteCoupon = async (id: string) => {
    await supabase.from('coupons').delete().eq('id', id);
};

export const validateCoupon = async (code: string, clientId: string, total: number, serviceIds: string[]): Promise<{ valid: boolean, message: string, discountAmount: number }> => {
    const { data: coupon, error } = await supabase.from('coupons').select('*').eq('code', code).single();

    if (error || !coupon) return { valid: false, message: 'Cupom inválido', discountAmount: 0 };
    if (!coupon.isActive) return { valid: false, message: 'Cupom inativo', discountAmount: 0 };
    if (new Date(coupon.expirationDate) < new Date()) return { valid: false, message: 'Cupom expirado', discountAmount: 0 };
    if (coupon.usedCount >= coupon.maxUses) return { valid: false, message: 'Limite de uso atingido', discountAmount: 0 };
    if (coupon.serviceRestrictionId && !serviceIds.includes(coupon.serviceRestrictionId)) return { valid: false, message: 'Cupom não aplicável aos serviços selecionados', discountAmount: 0 };

    let discount = 0;
    if (coupon.type === 'percentage') discount = total * (coupon.value / 100);
    else discount = coupon.value;

    return { valid: true, message: 'Cupom aplicado com sucesso!', discountAmount: discount };
};

// --- PAYROLL & PAYOUTS (NEW) ---

export interface PendingPayout {
    photographer: Photographer;
    totalPending: number;
    bookings: Booking[];
}

import { bookingFromDb } from './scheduleService';

// ... (existing imports)

// ... (existing code)

export const calculatePendingPayouts = async (): Promise<PendingPayout[]> => {
    const { data: bookingsData } = await supabase.from('bookings').select('*')
        .in('status', ['Realizado', 'Concluído'])
        .eq('is_paid_to_photographer', false);

    const pendingBookings = (bookingsData || []).map(bookingFromDb);

    const grouped: Record<string, Booking[]> = {};
    pendingBookings.forEach((b) => {
        if (!grouped[b.photographer_id || '']) grouped[b.photographer_id || ''] = [];
        if (b.photographer_id) grouped[b.photographer_id].push(b);
    });

    const result: PendingPayout[] = [];
    for (const [photographerId, bookings] of Object.entries(grouped)) {
        const photographer = await getPhotographerById(photographerId);
        if (photographer) {
            const total = bookings.reduce((sum, b) => sum + (b.photographerPayout || 0), 0);
            result.push({
                photographer,
                totalPending: total,
                bookings: bookings.sort((a, b) => new Date(a.date || 0).getTime() - new Date(b.date || 0).getTime())
            });
        }
    }

    return result;
};

export const processPayout = async (photographerId: string, bookingIds: string[], actorName: string = 'Admin') => {
    const now = new Date().toISOString();
    let totalPaid = 0;

    // We can't update multiple rows with different values easily, but here we update all to same status
    const { data: bookingsData } = await supabase.from('bookings').select('*')
        .in('id', bookingIds)
        .eq('photographer_id', photographerId);

    if (bookingsData) {
        const bookings = bookingsData.map(bookingFromDb);
        for (const b of bookings) {
            totalPaid += (b.photographerPayout || 0);
        }

        await supabase.from('bookings').update({
            is_paid_to_photographer: true,
            payout_date: now
        }).in('id', bookingIds);
    }

    logAction(
        { id: 'current_user', name: actorName, role: 'Admin' },
        'FINANCE',
        'Repasse',
        `Realizado repasse de R$ ${totalPaid.toFixed(2)} para o fotógrafo (ID: ${photographerId}) referente a ${bookingIds.length} serviços.`,
        { photographerId, bookingIds, amount: totalPaid }
    );
};