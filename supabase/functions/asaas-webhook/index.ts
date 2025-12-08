import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
    try {
        // Create a Supabase client with the Auth context of the logged in user.
        const supabaseClient = createClient(
            // Supabase API URL - env var exported by default.
            Deno.env.get('SUPABASE_URL') ?? '',
            // Supabase API ANON KEY - env var exported by default.
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        const data = await req.json()
        console.log('Webhook received:', JSON.stringify(data, null, 2))

        const { event, payment } = data

        // Handle Payment Confirmation
        if (event === 'PAYMENT_RECEIVED' || event === 'PAYMENT_CONFIRMED') {
            const asaasCustomerId = payment.customer
            const value = payment.value
            const description = payment.description || 'Crédito via Asaas'
            const externalReference = payment.externalReference

            console.log(`Processing payment ${payment.id} for customer ${asaasCustomerId}`)

            // CHECK IF IT IS AN INVOICE PAYMENT (Post-Paid)
            const { data: invoice } = await supabaseClient
                .from('invoices')
                .select('id')
                .eq('asaas_payment_id', payment.id)
                .single()

            if (invoice) {
                console.log(`Payment ${payment.id} corresponds to Invoice ${invoice.id}. Marking as Paid.`)
                await supabaseClient
                    .from('invoices')
                    .update({ status: 'Quitado' })
                    .eq('id', invoice.id)

                // We don't add credits to wallet for post-paid invoices, as it pays off debt.
                // But we could log a transaction if needed. For now, just marking invoice as paid.
                return new Response(JSON.stringify({ received: true, message: 'Invoice Paid' }), { status: 200 })
            }

            // IF NOT INVOICE, IT IS WALLET CREDIT (Pre-Paid)

            // 1. Find Client
            let { data: client, error: clientError } = await supabaseClient
                .from('clients')
                .select('id, balance, name')
                .eq('asaas_customer_id', asaasCustomerId)
                .single()

            if (!client && externalReference) {
                const { data: clientByRef } = await supabaseClient
                    .from('clients')
                    .select('id, balance, name')
                    .eq('id', externalReference)
                    .single()

                if (clientByRef) {
                    client = clientByRef
                    await supabaseClient.from('clients').update({ asaas_customer_id: asaasCustomerId }).eq('id', client.id)
                }
            }

            if (!client) {
                console.error('Client not found for Asaas ID:', asaasCustomerId)
                return new Response(JSON.stringify({ error: 'Client not found', received: true }), { status: 200 })
            }

            // 2. Check if transaction already exists (Idempotency)
            const { data: existingTransaction } = await supabaseClient
                .from('transactions')
                .select('id')
                .eq('asaas_payment_id', payment.id)
                .single()

            if (existingTransaction) {
                return new Response(JSON.stringify({ received: true, message: 'Already processed' }), { status: 200 })
            }

            // 3. Add Transaction
            const { error: transError } = await supabaseClient
                .from('transactions')
                .insert({
                    client_id: client.id,
                    type: 'Credit',
                    amount: value,
                    description: `${description} (Pix Confirmado)`,
                    date: new Date().toISOString(),
                    asaas_payment_id: payment.id
                })

            if (transError) {
                console.error('Error creating transaction:', transError)
                return new Response(JSON.stringify({ error: 'Transaction failed' }), { status: 500 })
            }

            // 4. Update Balance
            const newBalance = (Number(client.balance) || 0) + Number(value)
            await supabaseClient
                .from('clients')
                .update({ balance: newBalance })
                .eq('id', client.id)

            // 5. Create Notification
            await supabaseClient.from('notifications').insert({
                user_id: client.id,
                role: 'client',
                title: 'Pagamento Confirmado',
                message: `Recebemos seu pagamento de R$ ${value.toFixed(2)}. Seu saldo foi atualizado.`,
                type: 'success',
                read: false
            })

            console.log(`Success: Added ${value} to client ${client.name} (${client.id})`)
        }

        // Handle Payment Viewed (Blue Eye Feature)
        if (event === 'PAYMENT_BANK_SLIP_VIEWED' || event === 'PAYMENT_VIEWED') {
            console.log(`Payment ${payment.id} viewed by customer.`)
            await supabaseClient
                .from('invoices')
                .update({ viewed_at: new Date().toISOString() })
                .eq('asaas_payment_id', payment.id)
        }

        // Handle Payment Overdue
        if (event === 'PAYMENT_OVERDUE') {
            console.log(`Payment ${payment.id} is overdue.`)
            await supabaseClient
                .from('invoices')
                .update({ status: 'Atrasado' })
                .eq('asaas_payment_id', payment.id)
        }

        // Handle Payment Deleted/Cancelled
        if (event === 'PAYMENT_DELETED' || event === 'PAYMENT_REFUNDED') {
            console.log(`Payment ${payment.id} was deleted or refunded.`)
            // Optionally mark invoice as Cancelled or update status
            // For now, let's just log it, or if you have a 'Cancelado' status:
            // await supabaseClient.from('invoices').update({ status: 'Cancelado' }).eq('asaas_payment_id', payment.id)
        }

        // Log unhandled events for debugging
        if (!['PAYMENT_RECEIVED', 'PAYMENT_CONFIRMED', 'PAYMENT_BANK_SLIP_VIEWED', 'PAYMENT_VIEWED', 'PAYMENT_OVERDUE', 'PAYMENT_DELETED', 'PAYMENT_REFUNDED'].includes(event)) {
            console.log(`Unhandled event type: ${event}`)
        }

        return new Response(JSON.stringify({ received: true }), {
            headers: { "Content-Type": "application/json" },
            status: 200,
        })
    } catch (error) {
        console.error('Webhook error:', error)
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { "Content-Type": "application/json" },
            status: 400,
        })
    }
})
