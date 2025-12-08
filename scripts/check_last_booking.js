import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env') });
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://izrquzkspbflnlgcyccl.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml6cnF1emtzcGJmbG5sZ2N5Y2NsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzE3OTc5NzUsImV4cCI6MjA0NzM3Mzk3NX0.cKL5l1qNIIZUQjPzfCEaHhNEW-KFkr8B6xAGSGsEf88';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkLastBooking() {
    console.log('🔍 Verificando último booking criado...');

    const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1);

    if (error) {
        console.error('❌ Erro:', error.message);
        return;
    }

    if (!data || data.length === 0) {
        console.log('⚠️ Nenhum booking encontrado.');
        return;
    }

    const booking = data[0];
    console.log('\n✅ Último Booking Encontrado:');
    console.log(`ID: ${booking.id}`);
    console.log(`Cliente: ${booking.client_name}`);
    console.log(`Data: ${booking.date} ${booking.start_time}`);
    console.log(`Endereço: ${booking.address}`);
    console.log(`Status: ${booking.status}`);
    console.log(`Criado em: ${booking.created_at}`);
}

checkLastBooking();
