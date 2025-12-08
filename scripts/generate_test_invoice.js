import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ptwpsuvkrcbkfkutddnq.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB0d3BzdXZrcmNia2ZrdXRkZG5xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQxNzg4MTgsImV4cCI6MjA3OTc1NDgxOH0.qtbyUmkDeorMw3SyqL2kXsTq7ndQvU7nYnYirEozLlA';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const ASAAS_API_KEY = '$aact_prod_000MzkwODA2MWY2OGM3MWRlMDU2NWM3MzJlNzZmNGZhZGY6OmMzM2E0NmNjLThjZjctNDZkNi05MTg1LTVlOGYzYzIxMTY5MTo6JGFhY2hfMWE2Nzg5MGUtMWE1My00OTU3LTllOGYtODNiNzRiMmUwOTYy';
const BASE_URL = 'https://api.asaas.com/v3';

const getHeaders = () => ({
    'Content-Type': 'application/json',
    'access_token': ASAAS_API_KEY
});

async function main() {
    const customerId = 'cus_000150950612';
    const value = 10.00;
    const description = 'Teste de Fatura - R$ 10,00';
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 3); // Due in 3 days
    const dueDateStr = dueDate.toISOString().split('T')[0];

    console.log(`Generating invoice for ${customerId}...`);

    // 1. Create Charge in Asaas
    const url = `${BASE_URL}/payments`;
    const payload = {
        customer: customerId,
        billingType: 'BOLETO',
        dueDate: dueDateStr,
        value: value,
        description: description,
        postalService: false
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (data.errors) {
            console.error('Asaas Error:', JSON.stringify(data.errors, null, 2));
            return;
        }

        console.log('Asaas Charge Created:', data.id);
        console.log('Invoice URL:', data.invoiceUrl);

        // 2. Save to Supabase
        // First get client ID from Supabase using Asaas ID
        let { data: client, error: clientError } = await supabase
            .from('clients')
            .select('id, name')
            .eq('asaas_customer_id', customerId)
            .single();

        if (!client) {
            console.log('Client not found by Asaas ID, trying by name "Sheep House"...');
            const { data: clientByName } = await supabase
                .from('clients')
                .select('id, name')
                .ilike('name', '%Sheep House%')
                .single();
            client = clientByName;
        }

        const clientId = client ? client.id : null;
        const clientName = client ? client.name : 'Sheep House (Manual)';

        if (!clientId) {
            console.error('Cannot save invoice locally: Client not found in Supabase.');
            return;
        }

        const invoicePayload = {
            client_id: clientId,
            client_name: clientName,
            amount: value,
            due_date: dueDateStr,
            issue_date: new Date().toISOString().split('T')[0],
            month_year: 'Teste Manual',
            status: 'Pendente',
            booking_ids: [],
            asaas_payment_id: data.id,
            asaas_invoice_url: data.invoiceUrl,
            asaas_bank_slip_url: data.bankSlipUrl
        };

        let { error: dbError } = await supabase.from('invoices').insert([invoicePayload]);

        if (dbError) {
            console.warn('Error saving to DB with full payload (likely missing columns):', dbError.message);
            console.log('Retrying without URL fields...');

            const fallbackPayload = { ...invoicePayload };
            delete fallbackPayload.asaas_invoice_url;
            delete fallbackPayload.asaas_bank_slip_url;

            const { error: retryError } = await supabase.from('invoices').insert([fallbackPayload]);
            if (retryError) {
                console.error('Final Error saving to DB:', retryError);
            } else {
                console.log('Invoice saved to Supabase successfully (without URL fields)!');
                console.log('IMPORTANT: Please run the SQL to add asaas_invoice_url and asaas_bank_slip_url to the invoices table.');
            }
        } else {
            console.log('Invoice saved to Supabase successfully!');
        }

    } catch (e) {
        console.error("Script error:", e);
    }
}

main();
