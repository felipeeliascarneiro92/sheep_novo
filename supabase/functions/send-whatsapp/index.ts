import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

serve(async (req) => {
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    }

    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { phone, message, endpoint = 'send-text', payload = {} } = await req.json()

        const instanceId = Deno.env.get('ZAPI_INSTANCE_ID')
        const instanceToken = Deno.env.get('ZAPI_INSTANCE_TOKEN')
        const clientToken = Deno.env.get('ZAPI_CLIENT_TOKEN')

        if (!instanceId || !instanceToken || !clientToken) {
            throw new Error('Missing Z-API credentials in Secrets')
        }

        // Format phone number: remove non-digits
        // Z-API expects format like 5511999999999
        let cleanPhone = phone.replace(/\D/g, '')

        // Basic validation for Brazil numbers (add 55 if missing)
        if (cleanPhone.length <= 11) {
            cleanPhone = '55' + cleanPhone;
        }

        // Construct URL based on the requested endpoint (default: send-text)
        const url = `https://api.z-api.io/instances/${instanceId}/token/${instanceToken}/${endpoint}`

        console.log(`Sending WhatsApp (${endpoint}) to ${cleanPhone}...`)

        // Merge phone into payload
        const finalPayload = {
            phone: cleanPhone,
            message: message, // For simple text compatibility
            ...payload // Allow overriding or adding extra fields (like 'buttons', 'linkUrl', etc)
        }

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Client-Token': clientToken
            },
            body: JSON.stringify(finalPayload)
        })

        const data = await response.json()

        if (!response.ok) {
            console.error('Z-API Error:', data)
            throw new Error(`Z-API Error: ${JSON.stringify(data)}`)
        }

        return new Response(
            JSON.stringify(data),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    } catch (error) {
        console.error(error)
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
