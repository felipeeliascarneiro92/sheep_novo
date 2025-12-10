
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const ONESIGNAL_APP_ID = '83c07f22-1313-4007-a64a-7aac3c2069ab';
const ONESIGNAL_REST_API_KEY = 'os_v2_app_qpah6iqtcnaapjskpkwdyidjvmywhm7bp26uze4olzge35zers6feisb4yh4wwmgm4gvv5rtk52ge2xjuvwqksd7lnfj2zez66aemdq';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { userIds, title, message, url } = await req.json()

        // Log para debug no painel Supabase
        console.log(`Sending push to: ${userIds} - Title: ${title}`);

        if (!userIds || !title || !message) {
            throw new Error("Missing required fields")
        }

        const payload = {
            app_id: ONESIGNAL_APP_ID,
            include_aliases: { external_id: Array.isArray(userIds) ? userIds : [userIds] },
            target_channel: "push",
            headings: { en: title, pt: title },
            contents: { en: message, pt: message },
            url: url || undefined
        };

        const response = await fetch('https://onesignal.com/api/v1/notifications', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${ONESIGNAL_REST_API_KEY}`
            },
            body: JSON.stringify(payload)
        })

        const data = await response.json()
        console.log("OneSignal Response:", data);

        return new Response(JSON.stringify(data), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })
    } catch (error) {
        console.error("Error:", error);
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400, // Retornar 400 em vez de 403 ajuda a diferenciar erros de lógica vs permissão
        })
    }
})
