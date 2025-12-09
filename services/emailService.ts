import { supabase } from './supabase';
import { Booking, Client } from '../types';

/**
 * Serviço responsável por enviar emails transacionais via Supabase Edge Functions + Brevo.
 */

interface EmailRecipient {
    email: string;
    name: string;
}

const sendEmail = async (to: EmailRecipient[], subject: string, htmlContent: string, templateId?: number, params?: any) => {
    console.log('🚀 Iniciando envio de email para:', to.map(t => t.email));
    try {
        const { data, error } = await supabase.functions.invoke('send-email', {
            body: {
                to,
                subject,
                htmlContent,
                templateId,
                params,
            },
        });

        if (error) {
            console.error('❌ Erro retornado pela Edge Function:', error);
            // Se for erro de função (ex: 500), tenta ler o body se disponível
            if (error instanceof Error) console.error('Detalhes do erro:', error.message);
            throw error;
        }

        console.log('✅ Retorno da Edge Function:', data);

        if (data?.error) {
            console.error('❌ Brevo rejeitou o envio:', data.error);
            return { success: false, error: data.error };
        }

        console.log('📧 Email enviado com sucesso!');
        return { success: true, data };
    } catch (error) {
        console.error('❌ EXCEÇÃO ao enviar email:', error);
        return { success: false, error };
    }
};

/**
 * 1. Confirmação de Agendamento (Para Cliente + Marketing)
 */
export const sendBookingConfirmation = async (booking: Booking, client: Client) => {
    const recipients = [
        { email: client.email, name: client.name },
        client.marketingEmail1 ? { email: client.marketingEmail1, name: 'Marketing 1' } : null,
        client.marketingEmail2 ? { email: client.marketingEmail2, name: 'Marketing 2' } : null
    ].filter(Boolean) as EmailRecipient[];

    const dateFormatted = new Date(booking.date + 'T' + booking.start_time).toLocaleString('pt-BR');

    // Você pode usar HTML direto ou um Template ID do Brevo
    // Exemplo com HTML simples por segurança:
    const htmlContent = `
        <div style="font-family: Arial, sans-serif; color: #333;">
            <h1 style="color: #6d28d9;">Agendamento Confirmado! 📸</h1>
            <p>Olá <strong>${client.name}</strong>,</p>
            <p>Seu agendamento foi confirmado com sucesso. Abaixo estão os detalhes:</p>
            
            <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p><strong>📍 Data:</strong> ${dateFormatted}</p>
                <p><strong>🏠 Endereço:</strong> ${booking.address}</p>
                <p><strong>⚡ Serviços:</strong> ${booking.service_ids.join(', ')}</p>
                <p><strong>💰 Valor Estimado:</strong> R$ ${booking.total_price.toFixed(2)}</p>
            </div>

            <p>Se precisar reagendar, entre em contato conosco ou acesse seu painel.</p>
            <p>Atenciosamente,<br>Equipe SheepHouse</p>
        </div>
    `;

    return sendEmail(recipients, `Agendamento Confirmado - ${booking.address}`, htmlContent);
};

/**
 * 2. Entrega de Fotos (Para Cliente + Marketing + Corretores)
 */
export const sendPhotoDelivery = async (booking: Booking, client: Client, downloadLink: string) => {
    const recipients = [
        { email: client.email, name: client.name },
        client.marketingEmail1 ? { email: client.marketingEmail1, name: 'Marketing 1' } : null,
        client.marketingEmail2 ? { email: client.marketingEmail2, name: 'Marketing 2' } : null
        // Adicionar email do corretor se disponível no booking (precisaria buscar o Broker)
    ].filter(Boolean) as EmailRecipient[];

    const htmlContent = `
        <div style="font-family: Arial, sans-serif; color: #333;">
            <h1 style="color: #6d28d9;">Suas Fotos Estão Prontas! 🚀</h1>
            <p>Olá <strong>${client.name}</strong>,</p>
            <p>O material do imóvel <strong>${booking.address}</strong> já está disponível para download.</p>
            
            <div style="text-align: center; margin: 40px 0;">
                <a href="${downloadLink}" style="background-color: #6d28d9; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
                    BAIXAR FOTOS AGORA
                </a>
            </div>

            <p>Ou acesse pelo link direto:</p>
            <p><a href="${downloadLink}">${downloadLink}</a></p>
            
            <p>Atenciosamente,<br>Equipe SheepHouse</p>
        </div>
    `;

    return sendEmail(recipients, `Fotos Prontas: ${booking.address}`, htmlContent);
};

/**
 * 3. Boas-vindas (Novo Cadastro)
 */
export const sendWelcomeEmail = async (client: Client) => {
    const recipients = [{ email: client.email, name: client.name }];

    const htmlContent = `
        <div style="font-family: Arial, sans-serif; color: #333;">
            <h1 style="color: #6d28d9;">Bem-vindo à SheepHouse! 🐑</h1>
            <p>Olá <strong>${client.name}</strong>,</p>
            <p>Estamos muito felizes em ter você conosco.</p>
            <p>Agora você tem acesso à plataforma mais moderna de fotografia imobiliária.</p>
            
            <ul>
                <li>⚡ Agende sessões em segundos</li>
                <li>📸 Receba fotos em alta resolução</li>
                <li>💰 Gerencie suas faturas em um só lugar</li>
            </ul>

            <div style="margin-top: 30px;">
                <a href="https://app.sheephouse.com.br" style="color: #6d28d9; font-weight: bold;">Acessar Painel do Cliente</a>
            </div>
        </div>
    `;

    return sendEmail(recipients, 'Bem-vindo à SheepHouse!', htmlContent);
};

/**
 * 4. Cancelamento de Agendamento (Para Cliente + Admin + Fotógrafo se houver)
 */
export const sendBookingCancellation = async (booking: Booking, client: Client) => {
    // Tenta avisar todo mundo
    const recipients = [
        { email: client.email, name: client.name },
        client.marketingEmail1 ? { email: client.marketingEmail1, name: 'Marketing 1' } : null,
        // Idealmente avisar o fotógrafo também se já tiver um escalado
    ].filter(Boolean) as EmailRecipient[];

    const dateFormatted = new Date(booking.date + 'T' + (booking.start_time || '00:00')).toLocaleString('pt-BR');

    const htmlContent = `
        <div style="font-family: Arial, sans-serif; color: #333;">
            <h1 style="color: #ef4444;">Agendamento Cancelado ❌</h1>
            <p>Olá <strong>${client.name}</strong>,</p>
            <p>Informamos que o agendamento abaixo foi cancelado:</p>
            
            <div style="background: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #fee2e2;">
                <p><strong>📍 Data:</strong> ${dateFormatted}</p>
                <p><strong>🏠 Endereço:</strong> ${booking.address}</p>
            </div>

            <p>O reembolso será processado conforme nossa política (se aplicável).</p>
            <p>Atenciosamente,<br>Equipe SheepHouse</p>
        </div>
    `;

    return sendEmail(recipients, `Cancelamento: ${booking.address}`, htmlContent);
};

// ... Outros emails (Cancelamento, etc.) seguem o mesmo padrão
