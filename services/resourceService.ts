
import { supabase } from './supabase';
import { Service, CommonArea } from '../types';
import { v4 as uuidv4 } from 'uuid';

// Helper function to convert Service from TypeScript (camelCase) to Supabase (snake_case)
const serviceToDb = (service: any) => {
    const { isVisibleToClient, ...rest } = service;
    return {
        ...rest,
        is_visible_to_client: isVisibleToClient
    };
};

// Helper function to convert Service from Supabase (snake_case) to TypeScript (camelCase)
const serviceFromDb = (dbService: any): Service => {
    const { is_visible_to_client, ...rest } = dbService;
    return {
        ...rest,
        isVisibleToClient: is_visible_to_client
    };
};

export const getServices = async (): Promise<Service[]> => {
    const { data, error } = await supabase.from('services').select('*');
    if (error) return [];
    return data.map(serviceFromDb);
};

export const getServiceById = async (id: string): Promise<Service | undefined> => {
    const { data, error } = await supabase.from('services').select('*').eq('id', id).single();
    if (error || !data) return undefined;
    return serviceFromDb(data);
};

export const getCancellationServiceId = async (percentage: 50 | 100): Promise<string | null> => {
    // Try to find by name pattern "Cancelamento 50%" or similar
    const { data, error } = await supabase
        .from('services')
        .select('id')
        .ilike('name', `%cancelamento%${percentage}%`)
        .limit(1)
        .maybeSingle();

    if (error || !data) return null;
    return data.id;
};

export const addService = async (service: Omit<Service, 'id'>): Promise<boolean> => {
    try {
        const newService = { ...service, id: uuidv4() };
        const dbService = serviceToDb(newService);
        const { data, error } = await supabase.from('services').insert([dbService]).select();

        if (error) {
            console.error('Error adding service:', error);
            console.error('Data attempted:', dbService);
            return false;
        }

        console.log('Service added successfully:', data);
        return true;
    } catch (err) {
        console.error('Exception adding service:', err);
        return false;
    }
};

export const updateService = async (id: string, updates: Partial<Service>): Promise<boolean> => {
    try {
        const dbUpdates = serviceToDb(updates);
        const { data, error } = await supabase.from('services').update(dbUpdates).eq('id', id).select();

        if (error) {
            console.error('Error updating service:', error);
            console.error('Updates attempted:', dbUpdates);
            return false;
        }

        console.log('Service updated successfully:', data);
        return true;
    } catch (err) {
        console.error('Exception updating service:', err);
        return false;
    }
};

// --- COMMON AREAS ---
// Helper to map DB result to Type
const commonAreaFromDb = (dbArea: any): CommonArea => ({
    ...dbArea,
    fullAddress: dbArea.full_address || '',
    createdAt: dbArea.created_at || new Date().toISOString()
});

export const getCommonAreas = async (): Promise<CommonArea[]> => {
    const { data, error } = await supabase.from('common_areas').select('*');
    if (error) {
        console.error('Error fetching common areas:', error);
        return [];
    }
    return (data || []).map(commonAreaFromDb);
};

export const addCommonArea = async (data: Omit<CommonArea, 'id' | 'createdAt' | 'fullAddress'>) => {
    const newArea = {
        ...data,
        id: uuidv4(),
        full_address: `${data.address.street}, ${data.address.number} - ${data.address.neighborhood}, ${data.address.city} - ${data.address.state}`
    };

    const { error } = await supabase.from('common_areas').insert([newArea]);
    if (error) console.error('Error adding common area:', error);
};

export const updateCommonArea = async (id: string, updates: Partial<CommonArea>) => {
    const { error } = await supabase.from('common_areas').update(updates).eq('id', id);
    if (error) console.error('Error updating common area:', error);
};

export const deleteCommonAreas = async (ids: string[]) => {
    const { error } = await supabase.from('common_areas').delete().in('id', ids);
    if (error) console.error('Error deleting common areas:', error);
};

export const uploadCreativeStudioFile = async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${uuidv4()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
        .from('creative-studio')
        .upload(filePath, file);

    if (uploadError) {
        throw uploadError;
    }

    const { data } = supabase.storage.from('creative-studio').getPublicUrl(filePath);
    return data.publicUrl;
};
