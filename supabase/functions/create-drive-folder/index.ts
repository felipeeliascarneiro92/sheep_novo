import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

// Helper to sign JWT for Google Auth
async function getGoogleAccessToken(serviceAccountEmail: string, privateKey: string) {
    const header = { alg: 'RS256', typ: 'JWT' };
    const now = Math.floor(Date.now() / 1000);
    const claimSet = {
        iss: serviceAccountEmail,
        scope: 'https://www.googleapis.com/auth/drive',
        aud: 'https://oauth2.googleapis.com/token',
        exp: now + 3600,
        iat: now,
    };

    const encodedHeader = btoa(JSON.stringify(header)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const encodedClaimSet = btoa(JSON.stringify(claimSet)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    const str = `${encodedHeader}.${encodedClaimSet}`;

    const pemContents = privateKey.replace(/-----BEGIN PRIVATE KEY-----|\n|-----END PRIVATE KEY-----/g, '');
    const binaryDerString = atob(pemContents);
    const binaryDer = new Uint8Array(binaryDerString.length);
    for (let i = 0; i < binaryDerString.length; i++) {
        binaryDer[i] = binaryDerString.charCodeAt(i);
    }

    const key = await crypto.subtle.importKey(
        "pkcs8",
        binaryDer,
        { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
        false,
        ["sign"]
    );

    const signature = await crypto.subtle.sign(
        "RSASSA-PKCS1-v1_5",
        key,
        new TextEncoder().encode(str)
    );

    const encodedSignature = btoa(String.fromCharCode(...new Uint8Array(signature))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const jwt = `${str}.${encodedSignature}`;

    const res = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
    });

    const data = await res.json();
    return data.access_token;
}

serve(async (req) => {
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    }

    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { action, booking, folderId, parentFolderId } = await req.json();

        const serviceAccountJson = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_JSON');
        if (!serviceAccountJson) {
            throw new Error('Missing GOOGLE_SERVICE_ACCOUNT_JSON secret');
        }
        const credentials = JSON.parse(serviceAccountJson);

        const accessToken = await getGoogleAccessToken(credentials.client_email, credentials.private_key);

        if (action === 'create') {
            const dateStr = booking.date || new Date().toISOString().split('T')[0];
            const safeAddress = booking.address.split(',')[0].replace(/[\/\\:*?"<>|]/g, '');
            const folderName = `${dateStr} - ${safeAddress}`;

            // 1. Create Folder
            const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: folderName,
                    mimeType: 'application/vnd.google-apps.folder',
                    parents: parentFolderId ? [parentFolderId] : undefined
                })
            });

            const createData = await createRes.json();
            if (createData.error) throw new Error(createData.error.message);

            const newFolderId = createData.id;

            // 2. Get Link
            const fieldsRes = await fetch(`https://www.googleapis.com/drive/v3/files/${newFolderId}?fields=webViewLink`, {
                headers: { 'Authorization': `Bearer ${accessToken}` }
            });
            const fieldsData = await fieldsRes.json();

            // 3. Permissions
            // Changed to 'writer' so photographers can upload files via the link without needing a login.
            await fetch(`https://www.googleapis.com/drive/v3/files/${newFolderId}/permissions`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ role: 'writer', type: 'anyone' })
            });

            return new Response(
                JSON.stringify({ folderId: newFolderId, webViewLink: fieldsData.webViewLink }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        else if (action === 'list') {
            if (!folderId) throw new Error('Missing folderId for list action');

            const q = `'${folderId}' in parents and mimeType contains 'image/' and trashed = false`;
            const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id, name, mimeType, thumbnailLink, webViewLink, webContentLink)`;

            const response = await fetch(url, {
                headers: { 'Authorization': `Bearer ${accessToken}` }
            });

            const data = await response.json();
            if (data.error) throw new Error(data.error.message);

            return new Response(
                JSON.stringify({ files: data.files || [] }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        throw new Error('Invalid action');

    } catch (error) {
        console.error(error);
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
