
import { supabase } from './supabase';
import { Network, NetworkPrice } from '../types';

export const networkService = {
    // --- REDES (NETWORKS) ---

    async getAllNetworks(): Promise<Network[]> {
        const { data, error } = await supabase
            .from('networks')
            .select('*')
            .order('name');

        if (error) throw error;
        return data || [];
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

    async getClientsInNetwork(networkId: string) {
        const { data, error } = await supabase
            .from('clients')
            .select('id, name, tradeName, email, phone')
            .eq('network_id', networkId);

        if (error) throw error;
        return data || [];
    }
};
