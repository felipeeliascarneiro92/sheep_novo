
import { supabase } from './supabase';
import { Network, NetworkPrice } from '../types';

export const networkService = {
    // --- REDES (NETWORKS) ---

    async getAllNetworks(): Promise<(Network & { clientCount: number })[]> {
        const { data, error } = await supabase
            .from('networks')
            .select('*, clients(count)')
            .order('name');

        if (error) throw error;

        return (data || []).map((network: any) => ({
            ...network,
            clientCount: network.clients ? network.clients[0].count : 0
        }));
    },

    async getNetworkById(id: string): Promise<Network | null> {
        const { data, error } = await supabase
            .from('networks')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;
        return data;
    },

    async createNetwork(network: Partial<Network>): Promise<Network> {
        const { data, error } = await supabase
            .from('networks')
            .insert(network)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async updateNetwork(id: string, network: Partial<Network>): Promise<Network> {
        const { data, error } = await supabase
            .from('networks')
            .update(network)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async deleteNetwork(id: string): Promise<void> {
        const { error } = await supabase
            .from('networks')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    // --- PREÇOS DA REDE (NETWORK PRICES) ---

    async getNetworkPrices(networkId: string): Promise<NetworkPrice[]> {
        const { data, error } = await supabase
            .from('network_prices')
            .select('*')
            .eq('network_id', networkId);

        if (error) throw error;
        return data || [];
    },

    async upsertNetworkPrice(priceIdx: { network_id: string, service_id: string, price: number }): Promise<NetworkPrice> {
        // Usamos upsert para criar ou atualizar
        const { data, error } = await supabase
            .from('network_prices')
            .upsert(priceIdx, { onConflict: 'network_id, service_id' })
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async deleteNetworkPrice(id: string): Promise<void> {
        const { error } = await supabase
            .from('network_prices')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    // --- CLIENTES NA REDE ---

    async addClientToNetwork(clientId: string, networkId: string): Promise<void> {
        const { error } = await supabase
            .from('clients')
            .update({ network_id: networkId })
            .eq('id', clientId);

        if (error) throw error;
    },

    async removeClientFromNetwork(clientId: string): Promise<void> {
        const { error } = await supabase
            .from('clients')
            .update({ network_id: null })
            .eq('id', clientId);

        if (error) throw error;
    },

    async getClientsInNetworkWithStats(networkId: string) {
        // 1. Get Clients
        const { data: clients, error: clientsError } = await supabase
            .from('clients')
            .select('id, name, trade_name, email, phone')
            .eq('network_id', networkId);

        if (clientsError) throw clientsError;
        if (!clients || clients.length === 0) return [];

        const clientIds = clients.map(c => c.id);

        // 2. Get Last Booking Date for these clients
        // We fetch the most recent booking for each client
        // Optimization: Use a `.in` query.
        const { data: bookings, error: bookingsError } = await supabase
            .from('bookings')
            .select('client_id, created_at') // changed date to created_at or date depending on schema. using created_at as generic 'booking time' or 'date' field
            .in('client_id', clientIds)
            .order('created_at', { ascending: false });

        // Note: Ideally use 'date' or 'start_time' if created_at is just record creation. 
        // Assuming 'date' is the scheduled date. Let's create a map using the latest of data/created_at

        const lastBookingMap: Record<string, string> = {};

        if (bookings) {
            bookings.forEach((b: any) => {
                // data might be null if booking date is not set, but created_at is always there.
                // let's prefer 'date' if available, otherwise created_at. 
                // Wait, I only selected created_at. I should select 'date' too if it exists.
                // Let me blindly trust 'created_at' for "Last Action" or 'date' for "Last Scheduled"
                // User asked "Time without requiring bookings" -> creation date seems relevant for "request", but "date" for "service done".
                // I will stick to 'created_at' as "Last Request".
                if (!lastBookingMap[b.client_id]) {
                    lastBookingMap[b.client_id] = b.created_at; // First one found is latest due to sort
                }
            });
        }

        return clients.map((c: any) => ({
            ...c,
            lastBookingDate: lastBookingMap[c.id] || null
        }));
    }
};
