
import { supabase } from './supabase';
import { Photographer, Editor, AdminUser, TimeOff, Booking } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { logAction } from './auditService';

// Helper function to convert Photographer from TypeScript (camelCase) to Supabase (snake_case)
const photographerToDb = (photographer: any) => {
    const { isActive, profilePicUrl, slotDurationMinutes, baseAddress, baseLat, baseLng, radiusKm, ...rest } = photographer;
    return {
        ...rest,
        is_active: isActive,
        profile_pic_url: profilePicUrl,
        slot_duration_minutes: slotDurationMinutes,
        base_address: baseAddress,
        base_lat: baseLat,
        base_lng: baseLng,
        radius_km: radiusKm
    };
};

// Helper function to convert Photographer from Supabase (snake_case) to TypeScript (camelCase)
const photographerFromDb = (dbPhotographer: any): any => {

    const { is_active, profile_pic_url, slot_duration_minutes, base_address, base_lat, base_lng, radius_km, ...rest } = dbPhotographer;

    const result = {
        ...rest,
        isActive: is_active ?? true,
        profilePicUrl: profile_pic_url || '',
        slotDurationMinutes: slot_duration_minutes || 60,
        baseAddress: base_address || '',
        baseLat: base_lat || 0,
        baseLng: base_lng || 0,
        radiusKm: radius_km || 10
    };

    return result;
};

// --- PHOTOGRAPHERS ---
export const getPhotographers = async (): Promise<Photographer[]> => {
    const { data: photographers, error } = await supabase
        .from('photographers')
        .select('*');

    if (error) {
        console.error('Error fetching photographers:', error);
        return [];
    }

    // Fetch bookings for these photographers
    const { data: bookings } = await supabase.from('bookings').select('*');

    return photographers.map(p => ({
        ...photographerFromDb(p),
        bookings: bookings ? bookings.filter((b: any) => b.photographer_id === p.id) : []
    }));
};

export const getPhotographerById = async (id: string): Promise<Photographer | undefined> => {
    const { data: photographer, error } = await supabase
        .from('photographers')
        .select('*')
        .eq('id', id)
        .single();

    if (error || !photographer) return undefined;

    const { data: bookings } = await supabase
        .from('bookings')
        .select('*')
        .eq('photographer_id', id);

    const { data: timeOffs } = await supabase
        .from('time_offs')
        .select('*')
        .eq('photographer_id', id);

    return {
        ...photographerFromDb(photographer),
        bookings: bookings || [],
        timeOffs: timeOffs || []
    };
};

export const addPhotographer = async (data: Omit<Photographer, 'id' | 'bookings' | 'prices' | 'history'>): Promise<boolean> => {
    try {
        const newId = uuidv4();
        const newP = {
            ...data,
            id: newId,
            prices: {},
            created_at: new Date().toISOString()
        };

        const dbPhotographer = photographerToDb(newP);
        const { data: result, error } = await supabase.from('photographers').insert([dbPhotographer]).select();

        if (error) {
            console.error('Error adding photographer:', error);
            console.error('Data attempted:', dbPhotographer);
            return false;
        }

        // Log the action
        await logAction(
            { id: 'admin', name: 'Admin', role: 'Admin' },
            'CREATE',
            'Fotógrafos',
            `Fotógrafo "${data.name}" cadastrado`,
            { photographerId: newId, photographerName: data.name }
        );

        console.log('Photographer added successfully:', result);
        return true;
    } catch (err) {
        console.error('Exception adding photographer:', err);
        return false;
    }
};

export const updatePhotographer = async (id: string, updates: Partial<Photographer>): Promise<boolean> => {
    try {
        // Get current photographer data for comparison
        const { data: currentData } = await supabase
            .from('photographers')
            .select('*')
            .eq('id', id)
            .single();

        const dbUpdates = photographerToDb(updates);
        const { data, error } = await supabase
            .from('photographers')
            .update(dbUpdates)
            .eq('id', id)
            .select();

        if (error) {
            console.error('Error updating photographer:', error);
            console.error('Updates attempted:', dbUpdates);
            return false;
        }

        // Build detailed change log
        const changes: string[] = [];

        if (updates.name && updates.name !== currentData?.name) {
            changes.push(`Nome: "${currentData?.name}" → "${updates.name}"`);
        }

        if (updates.email && updates.email !== currentData?.email) {
            changes.push(`Email: "${currentData?.email}" → "${updates.email}"`);
        }

        if (updates.phone && updates.phone !== currentData?.phone) {
            changes.push(`Telefone: "${currentData?.phone}" → "${updates.phone}"`);
        }

        if (updates.rg && updates.rg !== currentData?.rg) {
            changes.push(`RG: "${currentData?.rg}" → "${updates.rg}"`);
        }

        if (updates.baseAddress && updates.baseAddress !== currentData?.base_address) {
            changes.push(`Endereço: "${currentData?.base_address || 'não definido'}" → "${updates.baseAddress}"`);
        }

        if (updates.radiusKm && updates.radiusKm !== currentData?.radius_km) {
            changes.push(`Raio de atendimento: ${currentData?.radius_km || 0} km → ${updates.radiusKm} km`);
        }

        if (updates.isActive !== undefined && updates.isActive !== currentData?.is_active) {
            changes.push(`Status: ${currentData?.is_active ? 'Ativo' : 'Inativo'} → ${updates.isActive ? 'Ativo' : 'Inativo'}`);
        }

        // Check for availability changes
        if (updates.availability) {
            const dayLabels: Record<string, string> = {
                monday: 'Segunda-feira',
                tuesday: 'Terça-feira',
                wednesday: 'Quarta-feira',
                thursday: 'Quinta-feira',
                friday: 'Sexta-feira',
                saturday: 'Sábado',
                sunday: 'Domingo'
            };

            const oldAvailability = currentData?.availability || {};
            const newAvailability = updates.availability;

            Object.keys(dayLabels).forEach(day => {
                const oldSlots = oldAvailability[day] || [];
                const newSlots = newAvailability[day] || [];

                // Check if day was added or removed
                if (oldSlots.length === 0 && newSlots.length > 0) {
                    changes.push(`${dayLabels[day]}: Adicionado (${newSlots.length} horários)`);
                } else if (oldSlots.length > 0 && newSlots.length === 0) {
                    changes.push(`${dayLabels[day]}: Removido`);
                } else if (oldSlots.length !== newSlots.length || JSON.stringify(oldSlots) !== JSON.stringify(newSlots)) {
                    changes.push(`${dayLabels[day]}: Horários alterados (${oldSlots.length} → ${newSlots.length} slots)`);
                }
            });
        }

        // Check for services changes
        if (updates.services) {
            const oldServices = currentData?.services || [];
            const newServices = updates.services;

            const added = newServices.filter(s => !oldServices.includes(s));
            const removed = oldServices.filter(s => !newServices.includes(s));

            if (added.length > 0 || removed.length > 0) {
                // Fetch service names
                const { data: allServices } = await supabase.from('services').select('id, name');
                const serviceMap = new Map(allServices?.map(s => [s.id, s.name]) || []);

                if (added.length > 0) {
                    const addedNames = added.map(id => serviceMap.get(id) || id).join(', ');
                    changes.push(`Serviços adicionados: ${addedNames}`);
                }
                if (removed.length > 0) {
                    const removedNames = removed.map(id => serviceMap.get(id) || id).join(', ');
                    changes.push(`Serviços removidos: ${removedNames}`);
                }
            }
        }

        const details = changes.length > 0
            ? `Fotógrafo "${updates.name || currentData?.name}" atualizado:\n${changes.join('\n')}`
            : `Fotógrafo "${updates.name || currentData?.name}" atualizado`;

        // Log the action
        await logAction(
            { id: 'admin', name: 'Admin', role: 'Admin' },
            'UPDATE',
            'Fotógrafos',
            details,
            {
                photographerId: id,
                changes: changes,
                oldValues: {
                    name: currentData?.name,
                    email: currentData?.email,
                    phone: currentData?.phone,
                    baseAddress: currentData?.base_address,
                    radiusKm: currentData?.radius_km,
                    isActive: currentData?.is_active
                },
                newValues: {
                    name: updates.name,
                    email: updates.email,
                    phone: updates.phone,
                    baseAddress: updates.baseAddress,
                    radiusKm: updates.radiusKm,
                    isActive: updates.isActive
                }
            }
        );

        console.log('Photographer updated successfully:', data);
        return true;
    } catch (err) {
        console.error('Exception updating photographer:', err);
        return false;
    }
};

export const updatePhotographerPrices = async (id: string, prices: Record<string, number>) => {
    const { error } = await supabase
        .from('photographers')
        .update({ prices })
        .eq('id', id);

    if (error) {
        console.error('Error updating prices:', error);
    } else {
        // Audit Log
        logAction(
            { id: 'admin_current', name: 'Admin', role: 'Admin' },
            'FINANCE',
            'Preços',
            `Tabela de preços atualizada para o fotógrafo ${id}`,
            { photographerId: id, newPrices: prices }
        );
    }
};

export const getPhotographerAverageEarning = (photographerId: string): number => {
    return 150;
};

export const getPhotographerPayoutForBooking = (booking: Booking): number => {
    // Return the stored payout amount (calculated at booking time) plus any tips
    return (booking.photographerPayout || 0) + (booking.tipAmount || 0);
};

// --- TIME OFF ---
export const getTimeOffsForPhotographer = async (photographerId: string): Promise<TimeOff[]> => {
    const { data, error } = await supabase
        .from('time_offs')
        .select('*')
        .eq('photographer_id', photographerId);

    if (error) {
        console.error('Error fetching time offs:', error);
        return [];
    }
    return data || [];
};

export const getAllTimeOffs = async (): Promise<TimeOff[]> => {
    const { data, error } = await supabase.from('time_offs').select('*');
    if (error) {
        console.error('Error fetching all time offs:', error);
        return [];
    }
    return data || [];
};

export const blockTimeOffSlots = async (photographerId: string, date: string, slots: string[], notes?: string, type: string = 'Bloqueio') => {
    const inserts = slots.map(slot => {
        // Convert date + slot time to timestamp
        // Assuming slot is "HH:MM"
        const startDateTime = new Date(`${date}T${slot}:00`).toISOString();
        // Assuming 1 hour duration for simplicity or we need to know duration.
        // The original code passed slots, which implies specific blocks.
        // Let's assume 1 hour for now as per previous logic or just store the slot start.
        // Actually, time_offs table has start_datetime and end_datetime.
        // We should probably calculate end time.
        const [hours, minutes] = slot.split(':').map(Number);
        const endDateTime = new Date(`${date}T${String(hours + 1).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`).toISOString();

        return {
            id: uuidv4(),
            photographer_id: photographerId,
            start_datetime: startDateTime,
            end_datetime: endDateTime,
            reason: notes || 'Bloqueio manual',
            type: type
        };
    });

    const { error } = await supabase.from('time_offs').insert(inserts);
    if (error) console.error('Error blocking time off slots:', error);
};

// --- EDITORS ---
// --- EDITORS ---
const mapDbEditor = (db: any): Editor => ({
    id: db.id,
    name: db.name,
    email: db.email,
    phone: db.phone,
    isActive: db.is_active,
    profilePicUrl: db.profile_pic_url
});

export const getEditors = async (): Promise<Editor[]> => {
    const { data, error } = await supabase.from('editors').select('*');
    if (error) {
        console.error('Error fetching editors:', error);
        return [];
    }
    return (data || []).map(mapDbEditor);
};

export const getEditorById = async (id: string): Promise<Editor | undefined> => {
    const { data, error } = await supabase.from('editors').select('*').eq('id', id).single();
    if (error) return undefined;
    return mapDbEditor(data);
};

export const addEditor = async (data: Omit<Editor, 'id'>) => {
    const newId = uuidv4();
    const dbData = {
        id: newId,
        name: data.name,
        email: data.email,
        phone: data.phone,
        is_active: data.isActive,
        profile_pic_url: data.profilePicUrl
    };
    const { error } = await supabase.from('editors').insert([dbData]);
    if (error) console.error('Error adding editor:', error);
};

export const updateEditor = async (id: string, updates: Partial<Editor>) => {
    const dbUpdates: any = { ...updates };

    if (updates.isActive !== undefined) {
        dbUpdates.is_active = updates.isActive;
        delete dbUpdates.isActive;
    }
    if (updates.profilePicUrl !== undefined) {
        dbUpdates.profile_pic_url = updates.profilePicUrl;
        delete dbUpdates.profilePicUrl;
    }

    const { error } = await supabase.from('editors').update(dbUpdates).eq('id', id);
    if (error) console.error('Error updating editor:', error);
};

// --- ADMINS ---
// --- ADMINS ---
const mapDbAdmin = (db: any): AdminUser => ({
    id: db.id,
    name: db.name,
    email: db.email,
    phone: db.phone,
    role: db.role,
    permissions: db.permissions,
    profilePicUrl: db.profile_pic_url,
    isActive: db.is_active
});

export const getAdmins = async (): Promise<AdminUser[]> => {
    const { data, error } = await supabase.from('admins').select('*');
    if (error) {
        console.error('Error fetching admins:', error);
        return [];
    }
    return (data || []).map(mapDbAdmin);
};

export const getAdminById = async (id: string): Promise<AdminUser | undefined> => {
    const { data, error } = await supabase.from('admins').select('*').eq('id', id).single();
    if (error) return undefined;
    return mapDbAdmin(data);
};

export const addAdmin = async (data: Omit<AdminUser, 'id'>) => {
    const newId = uuidv4();
    const dbData = {
        id: newId,
        name: data.name,
        email: data.email,
        phone: data.phone,
        role: data.role,
        permissions: data.permissions,
        profile_pic_url: data.profilePicUrl,
        is_active: data.isActive
    };
    const { error } = await supabase.from('admins').insert([dbData]);
    if (error) console.error('Error adding admin:', error);
};

export const updateAdmin = async (id: string, updates: Partial<AdminUser>) => {
    const dbUpdates: any = { ...updates };

    if (updates.profilePicUrl !== undefined) {
        dbUpdates.profile_pic_url = updates.profilePicUrl;
        delete dbUpdates.profilePicUrl;
    }
    if (updates.isActive !== undefined) {
        dbUpdates.is_active = updates.isActive;
        delete dbUpdates.isActive;
    }

    const { error } = await supabase.from('admins').update(dbUpdates).eq('id', id);
    if (error) console.error('Error updating admin:', error);
};

// --- GENERIC PROFILE PICTURE UPDATE ---
export const updateEntityProfilePicture = async (type: 'client' | 'photographer' | 'broker' | 'editor' | 'admin', id: string, file: File): Promise<string> => {
    try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `${type}s/${id}/${fileName}`; // e.g. clients/123/timestamp_random.jpg

        // 1. Upload to Supabase Storage
        const { error: uploadError } = await supabase.storage
            .from('avatars')
            .upload(filePath, file, {
                cacheControl: '3600',
                upsert: false
            });

        if (uploadError) {
            console.error('Error uploading to storage:', uploadError);
            throw uploadError;
        }

        // 2. Get Public URL
        const { data: { publicUrl } } = supabase.storage
            .from('avatars')
            .getPublicUrl(filePath);

        // 3. Update Database Record
        let table = '';
        if (type === 'client') table = 'clients';
        else if (type === 'photographer') table = 'photographers';
        else if (type === 'broker') table = 'brokers';
        else if (type === 'editor') table = 'editors';
        else if (type === 'admin') table = 'admins';

        if (table) {
            const { error: dbError } = await supabase
                .from(table)
                .update({ profile_pic_url: publicUrl })
                .eq('id', id);

            if (dbError) {
                console.error(`Error updating profile pic URL in DB for ${type}:`, dbError);
                throw dbError;
            }

            return publicUrl;
        } else {
            throw new Error('Invalid entity type');
        }

    } catch (error) {
        console.error('Exception in updateEntityProfilePicture:', error);
        throw error;
    }
};
