
import { Client, Booking } from '../types';

// --- CONFIGURAÇÃO ---
// 1. Cole sua chave API aqui (Começa com $aact_...)
const ASAAS_API_KEY = '$aact_prod_000MzkwODA2MWY2OGM3MWRlMDU2NWM3MzJlNzZmNGZhZGY6OmMzM2E0NmNjLThjZjctNDZkNi05MTg1LTVlOGYzYzIxMTY5MTo6JGFhY2hfMWE2Nzg5MGUtMWE1My00OTU3LTllOGYtODNiNzRiMmUwOTYy';

// 2. Defina como false para usar o Asaas Real (Produção)
const IS_SANDBOX = false;

// --- BASE URLS ---
// Nota: Usamos um Proxy (corsproxy.io) para permitir chamadas direto do navegador sem Backend.
// Em produção real (Node.js), remova o proxy.
const PROXY_URL = 'https://corsproxy.io/?';
const BASE_URL = IS_SANDBOX ? 'https://sandbox.asaas.com/api/v3' : 'https://api.asaas.com/v3';

const getHeaders = () => ({
    'Content-Type': 'application/json',
    'access_token': ASAAS_API_KEY
});

/**
 * Verifica se o cliente já existe no Asaas pelo CPF/CNPJ ou Email
 */
const findCustomer = async (cpfCnpj: string, email: string): Promise<string | null> => {
    if (!ASAAS_API_KEY) return null; // Fallback to mock if no key

    try {
        // Try finding by CPF/CNPJ first
        const urlCpf = `${PROXY_URL}${encodeURIComponent(`${BASE_URL}/customers?cpfCnpj=${cpfCnpj}`)}`;
        const resCpf = await fetch(urlCpf, { headers: getHeaders() });
        const dataCpf = await resCpf.json();

        if (dataCpf.data && dataCpf.data.length > 0) {
            console.log(`✅ [Asaas] Cliente encontrado por CPF: ${dataCpf.data[0].id}`);
            return dataCpf.data[0].id;
        }

        // Try finding by Email
        const urlEmail = `${PROXY_URL}${encodeURIComponent(`${BASE_URL}/customers?email=${email}`)}`;
        const resEmail = await fetch(urlEmail, { headers: getHeaders() });
        const dataEmail = await resEmail.json();

        if (dataEmail.data && dataEmail.data.length > 0) {
            console.log(`✅ [Asaas] Cliente encontrado por Email: ${dataEmail.data[0].id}`);
            return dataEmail.data[0].id;
        }

        return null;
    } catch (error) {
        console.error("Erro ao buscar cliente Asaas:", error);
        return null;
    }
};

/**
 * Cria ou Recupera um cliente no Asaas
 */
export const createAsaasCustomer = async (client: Partial<Client>): Promise<string> => {
    // MOCK FALLBACK IF NO KEY
    if (!ASAAS_API_KEY) {
        console.log(`⚠️ [Asaas Mock] Sem chave API. Gerando ID falso para ${client.name}...`);
        return new Promise(r => setTimeout(() => r(`cus_mock_${Math.random().toString(36).substr(2, 8)}`), 1000));
    }

    try {
        // 1. Check if exists
        if (client.cnpj || client.email) {
            const existingId = await findCustomer(client.cnpj || '', client.email || '');
            if (existingId) return existingId;
        }

        // 2. Create new
        console.log(`🔄 [Asaas] Criando novo cliente: ${client.name}...`);
        const url = `${PROXY_URL}${encodeURIComponent(`${BASE_URL}/customers`)}`;

        const response = await fetch(url, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({
                name: client.name,
                cpfCnpj: client.cnpj,
                email: client.email,
                mobilePhone: client.phone, // Celular é importante para notificações SMS/Wpp do Asaas
                externalReference: client.id,
                notificationDisabled: false,
                // Address (Optional but good for Boleto)
                address: client.address?.street,
                addressNumber: client.address?.number,
                province: client.address?.neighborhood,
                postalCode: client.address?.zip,
                cityName: client.address?.city,
                state: client.address?.state,
            })
        });

        const data = await response.json();

        if (data.errors) {
            console.error('Asaas Error:', data.errors);
            throw new Error(data.errors[0].description);
        }

        console.log(`✅ [Asaas] Cliente criado com sucesso: ${data.id}`);
        return data.id;

    } catch (error) {
        console.error("Erro fatal integração Asaas:", error);
        // Return a mock ID just so the app doesn't crash in demo
        return `cus_error_fallback_${Date.now()}`;
    }
};

/**
 * Gera uma cobrança (Pix ou Boleto)
 */
export const createAsaasCharge = async (
    customerId: string,
    value: number,
    dueDate: string,
    description: string,
    billingType: 'PIX' | 'BOLETO' | 'CREDIT_CARD' = 'PIX',
    externalReference?: string
): Promise<{ id: string, invoiceUrl: string, pixQrCodeUrl?: string, pixPayload?: string, bankSlipUrl?: string }> => {

    // MOCK FALLBACK IF NO KEY
    if (!ASAAS_API_KEY) {
        console.log(`⚠️ [Asaas Mock] Sem chave API. Gerando cobrança falsa...`);
        return new Promise((resolve) => {
            setTimeout(() => {
                const mockId = `pay_${Math.random().toString(36).substr(2, 12)}`;
                resolve({
                    id: mockId,
                    invoiceUrl: `https://sandbox.asaas.com/i/${mockId}`,
                    pixQrCodeUrl: billingType === 'PIX' ? 'https://chart.googleapis.com/chart?chs=150x150&cht=qr&chl=pix_code_mock' : undefined,
                    bankSlipUrl: billingType === 'BOLETO' ? `https://sandbox.asaas.com/b/pdf/${mockId}` : undefined
                });
            }, 1500);
        });
    }

    try {
        console.log(`🔄 [Asaas] Gerando ${billingType} de R$ ${value} para ${customerId}...`);

        const url = `${PROXY_URL}${encodeURIComponent(`${BASE_URL}/payments`)}`;

        const payload = {
            customer: customerId,
            billingType: billingType,
            dueDate: dueDate,
            value: value,
            description: description,
            externalReference: externalReference || `booking_${Date.now()}`,
            postalService: false // Don't send via correios
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (data.errors) {
            console.error('Asaas Payment Error:', data.errors);
            throw new Error(data.errors[0].description);
        }

        const paymentId = data.id;
        let pixQrCodeUrl = undefined;
        let bankSlipUrl = data.bankSlipUrl; // Link do PDF do boleto

        // If Pix, fetch the QrCode Payload immediately
        let pixPayload = undefined;
        if (billingType === 'PIX') {
            const pixUrl = `${PROXY_URL}${encodeURIComponent(`${BASE_URL}/payments/${paymentId}/pixQrCode`)}`;
            const pixRes = await fetch(pixUrl, { headers: getHeaders() });
            const pixData = await pixRes.json();
            if (pixData.encodedImage) {
                pixQrCodeUrl = `data:image/png;base64,${pixData.encodedImage}`;
            }
            if (pixData.payload) {
                pixPayload = pixData.payload;
            }
        }

        return {
            id: paymentId,
            invoiceUrl: data.invoiceUrl, // Link da fatura web do Asaas
            pixQrCodeUrl,
            pixPayload,
            bankSlipUrl
        };

    } catch (error) {
        console.error("Erro ao criar cobrança Asaas:", error);
        throw error;
    }
};

/**
 * Cancela uma cobrança no Asaas
 */
export const cancelAsaasCharge = async (paymentId: string): Promise<boolean> => {
    if (!ASAAS_API_KEY) return true; // Mock always succeeds

    try {
        console.log(`🗑️ [Asaas] Cancelando cobrança: ${paymentId}...`);
        const url = `${PROXY_URL}${encodeURIComponent(`${BASE_URL}/payments/${paymentId}`)}`;

        const response = await fetch(url, {
            method: 'DELETE',
            headers: getHeaders()
        });

        const data = await response.json();
        if (data.deleted) {
            console.log(`✅ [Asaas] Cobrança cancelada: ${paymentId}`);
            return true;
        }
        return false;
    } catch (error) {
        console.error("Erro ao cancelar cobrança Asaas:", error);
        return false;
    }
};
