

import { supabase } from './supabase';
import { Client, Broker, AdminInvoice, WalletTransaction } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { createAsaasCustomer } from './asaasService';

// --- CLIENTS ---
// Helper to map DB client to Frontend client
const mapDbClientToClient = (dbClient: any): Client => ({
    ...dbClient,
    tradeName: dbClient.trade_name,
    personType: dbClient.person_type,
    isActive: dbClient.is_active,
    commercialPhone: dbClient.commercial_phone,
    mobilePhone: dbClient.mobile_phone,
    marketingEmail1: dbClient.marketing_email1,
    marketingEmail2: dbClient.marketing_email2,
    stateRegistration: dbClient.state_registration,
    dueDay: dbClient.due_day,
    paymentMethod: dbClient.payment_method,
    paymentType: dbClient.payment_type,
    customPrices: dbClient.custom_prices || {},
    referralCode: dbClient.referral_code,
    referredBy: dbClient.referred_by,
    asaasCustomerId: dbClient.asaas_customer_id,
    profilePicUrl: dbClient.profile_pic_url,
    billingAddress: dbClient.billing_address,
    transactions: [], // Placeholder
    whatsappNotification1: dbClient.whatsapp_notification1,
    whatsappNotification2: dbClient.whatsapp_notification2,
    notificationPreferences: dbClient.notification_preferences
});

export const getClients = async (): Promise<Client[]> => {
    const { data: clients, error } = await supabase.from('clients').select('*');
    if (error) {
        console.error('Error fetching clients:', error);
        return [];
    }

    return clients.map(mapDbClientToClient);
};

// ✅ PAGINAÇÃO: Versão paginada para melhor performance
export const getClientsPaginated = async (
    page: number = 1,
    pageSize: number = 50
): Promise<{ data: Client[], count: number }> => {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data: clients, error, count } = await supabase
        .from('clients')
        .select('*', { count: 'exact' })
        .order('name', { ascending: true })
        .range(from, to);

    if (error) {
        console.error('Error fetching clients:', error);
        return { data: [], count: 0 };
    }

    return {
        data: clients.map(mapDbClientToClient),
        count: count || 0
    };
};

// ✅ BUSCA GLOBAL: Busca clientes em todo o banco de dados
export const searchClients = async (
    searchQuery: string,
    page: number = 1,
    pageSize: number = 50
): Promise<{ data: Client[], count: number }> => {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    // Normalize search query
    const query = searchQuery.trim().toLowerCase();

    if (!query) {
        // If no search query, return paginated results
        return getClientsPaginated(page, pageSize);
    }

    // Search across multiple fields using OR condition
    const { data: clients, error, count } = await supabase
        .from('clients')
        .select('*', { count: 'exact' })
        .or(`name.ilike.%${query}%,phone.ilike.%${query}%,email.ilike.%${query}%,cnpj.ilike.%${query}%,commercial_phone.ilike.%${query}%,mobile_phone.ilike.%${query}%`)
        .order('name', { ascending: true })
        .range(from, to);

    if (error) {
        console.error('Error searching clients:', error);
        return { data: [], count: 0 };
    }

    return {
        data: clients.map(mapDbClientToClient),
        count: count || 0
    };
};

export const getClientById = async (id: string): Promise<Client | undefined> => {
    const { data: client, error } = await supabase.from('clients').select(`
        *,
        transactions (*)
    `).eq('id', id).single();

    if (error || !client) return undefined;

    const mappedClient = mapDbClientToClient(client);
    // Map transactions if they exist
    if (client.transactions) {
        mappedClient.transactions = client.transactions.map((t: any) => ({
            id: t.id,
            date: t.date,
            description: t.description,
            type: t.type,
            amount: t.amount,
            clientId: t.client_id
        }));
    }
    return mappedClient;
};

export const addClient = async (client: Client) => {
    try {
        // 1. Check if client already exists by email
        const { data: existingClients } = await supabase.from('clients').select('*').eq('email', client.email);

        if (existingClients && existingClients.length > 0) {
            const existingClient = existingClients[0];
            console.log('Client already exists, updating password/claiming account:', existingClient.name);

            // Update the existing client with the new password and ensure it's active
            // We also update other fields if they were empty, but primarily we want to set the password (auth simulation)
            const { error } = await supabase.from('clients').update({
                is_active: true,
                // Optionally update other fields if they are missing in the existing record
                phone: existingClient.phone || client.phone,
                name: existingClient.name || client.name
            }).eq('id', existingClient.id);

            if (error) throw error;
            return; // Exit, do not insert
        }

        // Try to create Asaas customer, but don't block if it fails (e.g. invalid CPF)
        if (!client.asaasCustomerId) {
            try {
                const asaasId = await createAsaasCustomer(client);
                client.asaasCustomerId = asaasId;
            } catch (asaasError) {
                console.error('Warning: Could not create Asaas customer:', asaasError);
                // Continue without Asaas ID
            }
        }

        // Ensure ID is UUID
        if (!client.id) client.id = uuidv4();

        // Map to snake_case for Supabase
        const dbClient = {
            id: client.id,
            name: client.name,
            trade_name: client.tradeName,
            person_type: client.personType,
            is_active: client.isActive,
            phone: client.phone,
            commercial_phone: client.commercialPhone,
            mobile_phone: client.mobilePhone,
            email: client.email,
            marketing_email1: client.marketingEmail1,
            marketing_email2: client.marketingEmail2,
            cnpj: client.cnpj,
            state_registration: client.stateRegistration,
            due_day: client.dueDay,
            payment_method: client.paymentMethod,
            payment_type: client.paymentType,
            custom_prices: client.customPrices,
            balance: client.balance,
            address: client.address,
            billing_address: client.billingAddress,
            notes: client.notes,
            referral_code: client.referralCode,
            referred_by: client.referredBy,
            asaas_customer_id: client.asaasCustomerId,
            profile_pic_url: client.profilePicUrl,
            history: client.history || [],
            whatsapp_notification1: client.whatsappNotification1,
            whatsapp_notification2: client.whatsappNotification2,
            notification_preferences: client.notificationPreferences
        };

        const { error } = await supabase.from('clients').insert([dbClient]);
        if (error) {
            console.error('Error adding client:', error);
            throw error;
        }
    } catch (err) {
        console.error('Exception in addClient:', err);
        throw err;
    }
};

export const updateClient = async (id: string, updates: Partial<Client>) => {
    // 1. Destructure to separate fields that need mapping or exclusion
    const {
        transactions,
        customPrices,
        balance,
        address,
        billingAddress,
        // CamelCase fields that need mapping
        tradeName,
        personType,
        commercialPhone,
        mobilePhone,
        marketingEmail1,
        marketingEmail2,
        stateRegistration,
        dueDay,
        paymentMethod,
        paymentType,
        asaasCustomerId,
        referralCode,
        referredBy,
        profilePicUrl,
        history, // Extract history to map it explicitly
        whatsappNotification1,
        whatsappNotification2,
        notificationPreferences,
        ...rest
    } = updates as any;

    // 2. Create the object for Supabase (snake_case)
    const dbUpdates: any = { ...rest };

    // 3. Map specific fields
    if (tradeName !== undefined) dbUpdates.trade_name = tradeName;
    if (personType !== undefined) dbUpdates.person_type = personType;
    if (commercialPhone !== undefined) dbUpdates.commercial_phone = commercialPhone;
    if (mobilePhone !== undefined) dbUpdates.mobile_phone = mobilePhone;
    if (marketingEmail1 !== undefined) dbUpdates.marketing_email1 = marketingEmail1;
    if (marketingEmail2 !== undefined) dbUpdates.marketing_email2 = marketingEmail2;
    if (stateRegistration !== undefined) dbUpdates.state_registration = stateRegistration;
    if (dueDay !== undefined) dbUpdates.due_day = dueDay;
    if (paymentMethod !== undefined) dbUpdates.payment_method = paymentMethod;
    if (paymentType !== undefined) dbUpdates.payment_type = paymentType;
    if (asaasCustomerId !== undefined) dbUpdates.asaas_customer_id = asaasCustomerId;
    if (referralCode !== undefined) dbUpdates.referral_code = referralCode;
    if (referredBy !== undefined) dbUpdates.referred_by = referredBy;
    if (profilePicUrl !== undefined) dbUpdates.profile_pic_url = profilePicUrl;
    if (customPrices !== undefined) dbUpdates.custom_prices = customPrices;
    if (history !== undefined) dbUpdates.history = history;
    if (whatsappNotification1 !== undefined) dbUpdates.whatsapp_notification1 = whatsappNotification1;
    if (whatsappNotification2 !== undefined) dbUpdates.whatsapp_notification2 = whatsappNotification2;
    if (notificationPreferences !== undefined) dbUpdates.notification_preferences = notificationPreferences;

    if (updates.isActive !== undefined) {
        dbUpdates.is_active = updates.isActive;
        delete dbUpdates.isActive;
    }

    // Fix: Ensure balance is included in the update payload
    if (balance !== undefined) dbUpdates.balance = balance;

    // 4. Handle Address (JSONB columns usually, or separate columns depending on schema)
    // Assuming 'address' and 'billing_address' are JSONB columns in Supabase based on typical usage
    if (address !== undefined) dbUpdates.address = address;
    if (billingAddress !== undefined) dbUpdates.billing_address = billingAddress;

    // 5. Perform the update
    const { error } = await supabase.from('clients').update(dbUpdates).eq('id', id);

    if (error) {
        console.error('Error updating client:', error);
        throw error;
    }
};

export const updateClientPrices = async (clientId: string, prices: Record<string, number>) => {
    const { error } = await supabase.from('clients').update({ custom_prices: prices }).eq('id', clientId);
    if (error) console.error('Error updating client prices:', error);
};

export const addFunds = async (clientId: string, amount: number, type: 'Credit' | 'Debit' = 'Credit', observation: string = '', actorName: string = 'Sistema') => {
    const client = await getClientById(clientId);
    if (client) {
        let newBalance = client.balance || 0;

        if (type === 'Credit') {
            newBalance += amount;
        } else {
            newBalance -= amount;
        }

        await updateClient(clientId, { balance: newBalance });

        const description = `${observation} (por ${actorName})`;

        const transaction = {
            id: uuidv4(),
            date: new Date().toISOString(),
            description: description,
            type: type,
            amount,
            client_id: clientId
        };
        const { error } = await supabase.from('transactions').insert([transaction]);
        if (error) console.error('Error adding transaction:', error);

        // 📧 Email Notification (Only for Credits/Deposits)
        if (type === 'Credit') {
            import('./emailService').then(({ sendCreditPurchaseConfirmation }) => {
                sendCreditPurchaseConfirmation(client, amount, newBalance).catch(console.error);
            });
        }
    }
};

export const getClientReferrals = async (clientId: string) => {
    const { data: referrals } = await supabase.from('clients').select('*').eq('referred_by', clientId);
    if (!referrals) return [];

    return referrals.map(c => ({
        client: c,
        status: 'Pendente', // Logic needs to be adapted based on history/bookings
        reward: 20.00
    }));
};

export const convertClientToBroker = async (clientId: string, targetClientId: string) => {
    const client = await getClientById(clientId);
    if (!client) return;

    await updateClient(clientId, { isActive: false });

    const newBroker = {
        id: uuidv4(),
        client_id: targetClientId, // snake_case
        name: client.name,
        email: client.email,
        phone: client.phone,
        has_login: true,
        is_active: true,
        permissions: { canSchedule: true, canViewAllBookings: false }
    };

    await supabase.from('brokers').insert([newBroker]);
};

// --- BROKERS ---
export const getBrokers = async (): Promise<Broker[]> => {
    const { data, error } = await supabase.from('brokers').select('*');
    if (error) return [];
    // Map snake_case to camelCase if needed, but types might need adjustment or we use 'as any'
    return data.map((b: any) => ({
        ...b,
        clientId: b.client_id,
        hasLogin: b.has_login,
        isActive: b.is_active,
        profilePicUrl: b.profile_pic_url
    }));
};

export const getBrokersForClient = async (clientId: string): Promise<Broker[]> => {
    const { data, error } = await supabase.from('brokers').select('*').eq('client_id', clientId);
    if (error) return [];
    return data.map((b: any) => ({
        ...b,
        clientId: b.client_id,
        hasLogin: b.has_login,
        isActive: b.is_active,
        profilePicUrl: b.profile_pic_url
    }));
};

export const getBrokerById = async (id: string): Promise<Broker | undefined> => {
    const { data: b, error } = await supabase.from('brokers').select('*').eq('id', id).single();
    if (error || !b) return undefined;
    return {
        ...b,
        clientId: b.client_id,
        hasLogin: b.has_login,
        isActive: b.is_active,
        profilePicUrl: b.profile_pic_url
    };
};

export const getBrokerByEmail = async (email: string): Promise<Broker | undefined> => {
    const { data: b, error } = await supabase.from('brokers').select('*').eq('email', email).single();
    if (error || !b) return undefined;
    return {
        ...b,
        clientId: b.client_id,
        hasLogin: b.has_login,
        isActive: b.is_active,
        profilePicUrl: b.profile_pic_url
    };
};

export const addBroker = async (name: string, phone: string, email: string, clientId: string) => {
    const newBroker = {
        id: uuidv4(),
        client_id: clientId,
        name,
        phone,
        email,
        has_login: true,
        is_active: true,
        permissions: { canSchedule: true, canViewAllBookings: false }
    };
    await supabase.from('brokers').insert([newBroker]);
};

export const updateBroker = async (id: string, updates: Partial<Broker>) => {
    // Need to map keys if they differ (clientId -> client_id)
    const dbUpdates: any = { ...updates };
    if (updates.clientId) { dbUpdates.client_id = updates.clientId; delete dbUpdates.clientId; }
    if (updates.hasLogin !== undefined) { dbUpdates.has_login = updates.hasLogin; delete dbUpdates.hasLogin; }
    if (updates.isActive !== undefined) { dbUpdates.is_active = updates.isActive; delete dbUpdates.isActive; }
    if (updates.profilePicUrl !== undefined) { dbUpdates.profile_pic_url = updates.profilePicUrl; delete dbUpdates.profilePicUrl; }

    const { error } = await supabase.from('brokers').update(dbUpdates).eq('id', id);
    if (error) console.error('Error updating broker:', error);
};

export const grantBrokerAccess = async (id: string) => {
    const broker = await getBrokerById(id);
    if (broker) {
        // In Supabase, we don't store password in the table. We should trigger an invite or something.
        // For now, we just set the flag.
        await updateBroker(id, { hasLogin: true });
        return { broker: { ...broker, hasLogin: true }, tempPassword: '123' }; // Mock password return
    }
    return null;
};

export const revokeBrokerAccess = async (id: string) => {
    await updateBroker(id, { hasLogin: false });
};

export const getBrokerRanking = async (clientId: string) => {
    // 1. Get Brokers
    const brokers = await getBrokersForClient(clientId);
    if (brokers.length === 0) return [];

    // 2. Get Bookings for this client
    const { data: bookings } = await supabase
        .from('bookings')
        .select('id, total_price, broker_id, status')
        .eq('client_id', clientId)
        .neq('status', 'cancelled');

    // 3. Aggregate
    const stats = brokers.map(broker => {
        const brokerBookings = bookings?.filter(b => b.broker_id === broker.id) || [];
        const totalBookings = brokerBookings.length;
        const totalValue = brokerBookings.reduce((sum, b) => sum + (b.total_price || 0), 0);

        // Calculate average ticket
        const averageTicket = totalBookings > 0 ? totalValue / totalBookings : 0;

        return {
            ...broker,
            totalBookings,
            totalValue,
            averageTicket
        };
    });

    // 4. Sort by Total Value descending
    return stats.sort((a, b) => b.totalValue - a.totalValue);
};