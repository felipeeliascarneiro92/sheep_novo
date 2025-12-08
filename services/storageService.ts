import { supabase } from './supabase';
import { Booking, DriveFile } from '../types';

/**
 * DROPBOX SERVICE (EDGE FUNCTION VERSION)
 * 
 * Calls Supabase Edge Function 'create-dropbox-folder' to handle Dropbox operations securely.
 */

// Root folder path in Dropbox (optional, can be empty for root)
// All bookings will be created inside this folder.
const ROOT_PATH = '/Agendamentos Pendentes';

export const createBookingFolder = async (booking: Booking): Promise<{ folderId: string, webViewLink: string, uploadLink: string }> => {
    console.log('📦 Invoking Edge Function: create-dropbox-folder (create)');

    const { data, error } = await supabase.functions.invoke('create-dropbox-folder', {
        body: {
            action: 'create',
            booking,
            rootPath: ROOT_PATH
        }
    });

    if (error) {
        console.error("Edge Function Invocation Error:", error);
        throw error;
    }

    if (data.error) {
        console.error("Edge Function Logic Error:", data.error);
        // Tenta mostrar o erro detalhado se for um objeto JSON
        const errorMsg = typeof data.error === 'object' ? JSON.stringify(data.error) : data.error;
        throw new Error(`Dropbox Error: ${errorMsg}`);
    }

    console.log('✅ Edge Function Success:', data);
    return data;
};

export const getBookingPhotos = async (folderPath: string): Promise<DriveFile[]> => {
    console.log('📦 Invoking Edge Function: create-dropbox-folder (list)');

    const { data, error } = await supabase.functions.invoke('create-dropbox-folder', {
        body: {
            action: 'list',
            folderPath
        }
    });

    if (error) {
        console.error("Edge Function Error:", error);
        return [];
    }
    if (data.error) {
        console.error("Dropbox API Error:", data.error);
        return [];
    }

    return (data.files || []).map((f: any) => ({
        id: f.id,
        name: f.name,
        mimeType: f.name.match(/\.(jpg|jpeg|png|gif)$/i) ? 'image/jpeg' : 'application/octet-stream',
        thumbnailLink: f.thumbnailLink,
        webViewLink: f.webViewLink,
        webContentLink: f.webContentLink
    }));
};

export const uploadInvoice = async (file: File, monthYear: string, userId: string): Promise<any> => {
    console.log('📦 Uploading Invoice to Supabase Storage');

    // Path structure: Notas Fiscais/{userId}/{monthYear}_{fileName}
    // We group by user ID as requested.
    // We also include monthYear in the filename or path for better organization if needed, 
    // but the user specifically asked for "agrupe por usuario".
    // Let's do: Notas Fiscais/{userId}/{fileName}
    // To avoid overwrites, maybe prepend timestamp or keep original name if unique enough.
    // Let's stick to simple grouping: {userId}/{fileName}

    // Sanitize filename
    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const path = `${userId}/${safeName}`;

    const { data, error } = await supabase.storage
        .from('invoices')
        .upload(path, file, {
            cacheControl: '3600',
            upsert: false
        });

    if (error) {
        console.error("Supabase Storage Error:", error);
        throw error;
    }

    console.log('✅ Invoice Uploaded to Storage:', data);
    return data;
};
