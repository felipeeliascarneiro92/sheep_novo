# 📧 Configurando a Edge Function de Envio de Email

Para que o `emailService.ts` funcione, você precisa criar e implantar esta função no Supabase.

## 🔑 PASSO 1: Obter API Key do Brevo
1. Acesse: https://app.brevo.com/settings/keys/api
2. Gere uma nova chave chamada `supabase-edge`.
3. Copie a chave (`xkeysib-...`).

---

## ⚙️ PASSO 2: Configurar Secret no Supabase
No terminal do seu projeto (ou no Dashboard em Settings > Edge Functions > Secrets):

```bash
supabase secrets set BREVO_API_KEY=xkeysib-sua-chave-aqui
```

---

## 📝 PASSO 3: O Código da Função
Crie o arquivo: `supabase/functions/send-email/index.ts`

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const BREVO_API_KEY = Deno.env.get('BREVO_API_KEY')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { to, subject, htmlContent, templateId, params } = await req.json()

    if (!to || !to.length) {
        throw new Error('Destinatário é obrigatório')
    }

    // Montar payload para Brevo
    const brevoPayload = {
        sender: { name: "SheepHouse", email: "fotografia@sheephouse.com.br" },
        to: to,
        subject: subject,
    };

    if (templateId) {
        brevoPayload['templateId'] = templateId;
        if (params) brevoPayload['params'] = params;
    } else {
        brevoPayload['htmlContent'] = htmlContent || '<p>Sem conteúdo</p>';
    }

    // Enviar request para Brevo API
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': BREVO_API_KEY ?? '',
      },
      body: JSON.stringify(brevoPayload),
    })

    const data = await res.json()

    if (!res.ok) {
        console.error('Erro Brevo:', data)
        return new Response(JSON.stringify({ error: data }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    }

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
```

---

## 🚀 PASSO 4: Deploy

```bash
supabase functions deploy send-email --no-verify-jwt
```

Pronto! Agora o site poderá enviar emails chamando `emailService.ts`.
