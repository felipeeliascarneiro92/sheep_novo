
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Setup environment
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testBrokerPermissions() {
    console.log('🚀 Starting Broker Permissions Test...');

    let clientId, brokerAId, brokerBId, booking1Id, booking2Id, booking3Id;

    try {
        // 1. Create Test Client
        console.log('Creating test client...');
        const { data: client, error: clientError } = await supabase
            .from('clients')
            .insert([{
                name: 'Test Client Permissions',
                email: 'test_permissions_client@example.com',
                is_active: true
            }])
            .select()
            .single();

        if (clientError) throw new Error(`Client creation failed: ${clientError.message}`);
        clientId = client.id;
        console.log(`✅ Client created: ${clientId}`);

        // 2. Create Broker A (View All)
        console.log('Creating Broker A (canViewAllBookings: true)...');
        const { data: brokerA, error: brokerAError } = await supabase
            .from('brokers')
            .insert([{
                client_id: clientId,
                name: 'Broker View All',
                email: 'broker_all@example.com',
                permissions: { canSchedule: true, canViewAllBookings: true }
            }])
            .select()
            .single();

        if (brokerAError) throw new Error(`Broker A creation failed: ${brokerAError.message}`);
        brokerAId = brokerA.id;
        console.log(`✅ Broker A created: ${brokerAId}`);

        // 3. Create Broker B (View Own Only)
        console.log('Creating Broker B (canViewAllBookings: false)...');
        const { data: brokerB, error: brokerBError } = await supabase
            .from('brokers')
            .insert([{
                client_id: clientId,
                name: 'Broker View Own',
                email: 'broker_own@example.com',
                permissions: { canSchedule: true, canViewAllBookings: false }
            }])
            .select()
            .single();

        if (brokerBError) throw new Error(`Broker B creation failed: ${brokerBError.message}`);
        brokerBId = brokerB.id;
        console.log(`✅ Broker B created: ${brokerBId}`);

        // 4. Create Bookings
        console.log('Creating test bookings...');
        const bookingsData = [
            { client_id: clientId, broker_id: brokerAId, status: 'Confirmado', address: 'Address 1', total_price: 100 },
            { client_id: clientId, broker_id: brokerBId, status: 'Confirmado', address: 'Address 2', total_price: 100 },
            { client_id: clientId, broker_id: null, status: 'Confirmado', address: 'Address 3', total_price: 100 } // Unassigned or other
        ];

        const { data: bookings, error: bookingsError } = await supabase
            .from('bookings')
            .insert(bookingsData)
            .select();

        if (bookingsError) throw new Error(`Bookings creation failed: ${bookingsError.message}`);
        booking1Id = bookings[0].id;
        booking2Id = bookings[1].id;
        booking3Id = bookings[2].id;
        console.log(`✅ Bookings created: ${bookings.length}`);

        // 5. Test Logic for Broker A (View All)
        console.log('\n🧪 Testing Broker A (View All)...');
        // Logic mimics AppointmentsPage.tsx: if canViewAllBookings, no brokerId filter
        let queryA = supabase.from('bookings').select('id').eq('client_id', clientId);
        // No extra filter
        const { data: resultsA, error: errorA } = await queryA;
        if (errorA) throw errorA;

        console.log(`   Broker A sees ${resultsA.length} bookings.`);
        if (resultsA.length === 3) {
            console.log('   ✅ PASS: Broker A sees all bookings.');
        } else {
            console.error('   ❌ FAIL: Broker A should see 3 bookings.');
        }

        // 6. Test Logic for Broker B (View Own Only)
        console.log('\n🧪 Testing Broker B (View Own Only)...');
        // Logic mimics AppointmentsPage.tsx: if !canViewAllBookings, filter by brokerId
        let queryB = supabase.from('bookings').select('id').eq('client_id', clientId);
        queryB = queryB.eq('broker_id', brokerBId);

        const { data: resultsB, error: errorB } = await queryB;
        if (errorB) throw errorB;

        console.log(`   Broker B sees ${resultsB.length} bookings.`);
        if (resultsB.length === 1 && resultsB[0].id === bookings.find(b => b.broker_id === brokerBId).id) {
            console.log('   ✅ PASS: Broker B sees only their own booking.');
        } else {
            console.error('   ❌ FAIL: Broker B should see exactly 1 booking (their own).');
        }

    } catch (error) {
        console.error('\n❌ Test Failed:', error);
    } finally {
        // Cleanup
        console.log('\n🧹 Cleaning up...');
        if (booking1Id || booking2Id || booking3Id) {
            await supabase.from('bookings').delete().in('id', [booking1Id, booking2Id, booking3Id].filter(Boolean));
        }
        if (brokerAId) await supabase.from('brokers').delete().eq('id', brokerAId);
        if (brokerBId) await supabase.from('brokers').delete().eq('id', brokerBId);
        if (clientId) await supabase.from('clients').delete().eq('id', clientId);
        console.log('✅ Cleanup complete.');
    }
}

testBrokerPermissions();
