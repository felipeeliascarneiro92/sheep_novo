import { supabase } from './supabase';
import { CrmAlert, ClientCrmMetrics, CrmActivity, Network, CrmActivityType, CrmActivityResult } from '../types';

// --- ALERTS ---

export const getCrmAlerts = async (): Promise<CrmAlert[]> => {
    // Fetch alerts that are PENDING and (snooze_until is null OR snooze_until <= today)
    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
        .from('crm_alerts')
        .select(`
            *,
            clients:client_id (name)
        `)
        .eq('status', 'PENDING')
        .or(`snooze_until.is.null,snooze_until.lte.${today}`)
        .order('priority', { ascending: false }) // High priority first
        .order('created_at', { ascending: true }); // Oldest first

    if (error) {
        console.error('Error fetching CRM alerts:', error);
        return [];
    }

    // Map joined client name
    return data.map((alert: any) => ({
        ...alert,
        client_name: alert.clients?.name || 'Cliente Desconhecido'
    }));
};

export const dismissAlert = async (alertId: string) => {
    const { error } = await supabase
        .from('crm_alerts')
        .update({ status: 'DISMISSED', updated_at: new Date().toISOString() })
        .eq('id', alertId);

    if (error) throw error;
};

export const snoozeAlert = async (alertId: string, days: number) => {
    const snoozeDate = new Date();
    snoozeDate.setDate(snoozeDate.getDate() + days);

    const { error } = await supabase
        .from('crm_alerts')
        .update({
            snooze_until: snoozeDate.toISOString().split('T')[0],
            updated_at: new Date().toISOString()
        })
        .eq('id', alertId);

    if (error) throw error;
};

// --- METRICS ---

export const getClientCrmMetrics = async (clientId: string): Promise<ClientCrmMetrics | null> => {
    const { data, error } = await supabase
        .from('client_crm_metrics')
        .select('*')
        .eq('client_id', clientId)
        .single();

    if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        console.error('Error fetching CRM metrics:', error);
        return null;
    }

    return data;
};

export const getAllClientMetrics = async (): Promise<(ClientCrmMetrics & { client_name: string })[]> => {
    const { data, error } = await supabase
        .from('client_crm_metrics')
        .select(`
            *,
            clients:client_id (name)
        `);

    if (error) {
        console.error('Error fetching all CRM metrics:', error);
        return [];
    }

    return data.map((m: any) => ({
        ...m,
        client_name: m.clients?.name || 'Desconhecido'
    }));
};

// --- ACTIVITIES ---

export const logCrmActivity = async (
    clientId: string,
    type: CrmActivityType,
    result: CrmActivityResult,
    notes: string,
    performedBy: string
) => {
    const { error } = await supabase
        .from('crm_activities')
        .insert({
            client_id: clientId,
            type,
            result,
            notes,
            performed_by: performedBy
        });

    if (error) throw error;

    // If result is SUCCESS (e.g. Reagendou), we should dismiss related CHURN alerts
    if (result === 'SUCCESS') {
        await supabase
            .from('crm_alerts')
            .update({ status: 'ACTIONED', updated_at: new Date().toISOString() })
            .eq('client_id', clientId)
            .eq('type', 'CHURN_RISK')
            .eq('status', 'PENDING');
    }
};

export const getClientActivities = async (clientId: string): Promise<CrmActivity[]> => {
    const { data, error } = await supabase
        .from('crm_activities')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching activities:', error);
        return [];
    }

    return data;
};

// --- NETWORKS ---

export const getNetworks = async (): Promise<Network[]> => {
    const { data, error } = await supabase
        .from('networks')
        .select('*')
        .order('name');

    if (error) {
        console.error('Error fetching networks:', error);
        return [];
    }
    return data;
};

export const getRecentActivities = async (limit = 50): Promise<(CrmActivity & { client_name: string })[]> => {
    const { data, error } = await supabase
        .from('crm_activities')
        .select(`
            *,
            clients:client_id (name)
        `)
        .order('created_at', { ascending: false })
        .limit(limit);

    if (error) {
        console.error('Error fetching recent activities:', error);
        return [];
    }

    return data.map((a: any) => ({
        ...a,
        client_name: a.clients?.name || 'Cliente Desconhecido'
    }));
};
