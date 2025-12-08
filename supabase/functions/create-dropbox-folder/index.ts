import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

// --- DROPBOX API HELPERS ---

async function getDropboxAccessToken(appKey: string, appSecret: string, refreshToken: string) {
    const params = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: appKey,
        client_secret: appSecret
    });

    const res = await fetch('https://api.dropbox.com/oauth2/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString()
    });

    const data = await res.json();
    if (data.error) throw new Error(`Auth Error: ${data.error_description || data.error}`);
    return data.access_token;
}

async function createFolder(accessToken: string, path: string) {
    const res = await fetch('https://api.dropboxapi.com/2/files/create_folder_v2', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ path: path, autorename: true })
    });
    const data = await res.json();
    if (data.error) {
        // Ignore if folder already exists
        if (data.error['.tag'] === 'path' && data.error.path['.tag'] === 'conflict') {
            return { path_display: path }; // Return assumed path
        }
        throw new Error(`Create Folder Error: ${JSON.stringify(data.error)}`);
    }
    return data.metadata;
}

async function createFileRequest(accessToken: string, title: string, destination: string) {
    const res = await fetch('https://api.dropboxapi.com/2/file_requests/create', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            title: title,
            destination: destination,
            open: true
        })
    });
    const data = await res.json();
    if (data.error) throw new Error(`Create File Request Error: ${JSON.stringify(data.error)}`);
    return data.url;
}

async function listFiles(accessToken: string, path: string) {
    const res = await fetch('https://api.dropboxapi.com/2/files/list_folder', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            path: path,
            limit: 100
        })
    });
    const data = await res.json();
    if (data.error) throw new Error(`List Files Error: ${JSON.stringify(data.error)}`);

    // Get temporary links for thumbnails/previews
    const files = await Promise.all(data.entries
        .filter((e: any) => e['.tag'] === 'file')
        .map(async (file: any) => {
            const linkRes = await fetch('https://api.dropboxapi.com/2/files/get_temporary_link', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ path: file.path_lower })
            });
            const linkData = await linkRes.json();

            return {
                id: file.id,
                name: file.name,
                webViewLink: linkData.link,
                thumbnailLink: linkData.link,
                webContentLink: linkData.link
            };
        })
    );

    return files;
}

async function createSharedLink(accessToken: string, path: string) {
    const res = await fetch('https://api.dropboxapi.com/2/sharing/create_shared_link_with_settings', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            path: path,
            settings: {
                requested_visibility: 'public'
            }
        })
    });
    const data = await res.json();
    if (data.error) {
        if (data.error['.tag'] === 'shared_link_already_exists') {
            return data.error.shared_link_already_exists;
        }
        throw new Error(`Create Shared Link Error: ${JSON.stringify(data.error)}`);
    }
    return data;
}



// --- MAIN HANDLER ---

serve(async (req) => {
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    }

    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // Clone request to avoid "body used already" issues if we need to read it multiple times (though here we don't)
        // But more importantly, handle the case where req.json() fails
        let body;
        try {
            body = await req.json();
        } catch (e) {
            throw new Error(`Invalid JSON body: ${e.message}`);
        }

        const { action, booking, folderPath, rootPath } = body;

        // Get Secrets
        const appKey = Deno.env.get('DROPBOX_APP_KEY');
        const appSecret = Deno.env.get('DROPBOX_APP_SECRET');
        const refreshToken = Deno.env.get('DROPBOX_REFRESH_TOKEN');

        if (!appKey || !appSecret || !refreshToken) {
            throw new Error('Missing Dropbox credentials in Secrets');
        }

        // 1. Get Access Token
        const accessToken = await getDropboxAccessToken(appKey, appSecret, refreshToken);

        if (action === 'create') {
            const prefix = booking.legacy_id ? booking.legacy_id : (booking.date || 'SEM_DATA');
            // Remove restricted characters but keep commas for address number
            const safeAddress = booking.address.replace(/[\/\\:*?"<>|]/g, '').trim();
            const folderName = `${prefix} - ${safeAddress}`;
            const fullPath = `${rootPath || ''}/${folderName}`;

            // 2. Create Folder
            const folderMeta = await createFolder(accessToken, fullPath);

            // 3. Create File Request (Upload Link)
            const uploadLink = await createFileRequest(accessToken, `Envio de Fotos - ${safeAddress}`, folderMeta.path_display);

            // 4. Create Shared Link (View Link)
            const sharedLinkMeta = await createSharedLink(accessToken, folderMeta.path_display);

            return new Response(
                JSON.stringify({
                    folderId: folderMeta.path_display,
                    webViewLink: sharedLinkMeta.url,
                    uploadLink: uploadLink
                }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        else if (action === 'list') {
            if (!folderPath) throw new Error('Missing folderPath');

            const files = await listFiles(accessToken, folderPath);

            return new Response(
                JSON.stringify({ files }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }



        throw new Error('Invalid action');

        throw new Error('Invalid action');

    } catch (error) {
        console.error(error);
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
