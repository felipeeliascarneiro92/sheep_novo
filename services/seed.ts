import { supabase } from './supabase';
import { v4 as uuidv4 } from 'uuid';

export const seedDatabase = async () => {
    console.log('Starting database seed...');

    // 1. SERVICES
    const { count: serviceCount } = await supabase.from('services').select('*', { count: 'exact', head: true });
    if (serviceCount === 0) {
        console.log('Seeding services...');
        const services = [
            { id: 'foto_profissional', name: 'Fotografia Profissional', duration_minutes: 60, price: 250.00, category: 'Foto', description: 'Sessão de fotos HDR profissional' },
            { id: 'video_tour', name: 'Vídeo Tour', duration_minutes: 60, price: 350.00, category: 'Vídeo', description: 'Vídeo cinematográfico do imóvel' },
            { id: 'drone', name: 'Imagens Aéreas (Drone)', duration_minutes: 30, price: 200.00, category: 'Aéreo', description: 'Fotos e vídeos aéreos' },
            { id: 'tour_360', name: 'Tour Virtual 360°', duration_minutes: 45, price: 300.00, category: 'Outros', description: 'Tour interativo 360 graus' },
            { id: 'planta_baixa', name: 'Planta Baixa Humanizada', duration_minutes: 30, price: 150.00, category: 'Outros', description: 'Desenho técnico humanizado' },
            { id: 'deslocamento', name: 'Taxa de Deslocamento', duration_minutes: 0, price: 40.00, category: 'Outros', description: 'Taxa para locais distantes', is_visible_to_client: false },
            { id: 'taxa_flash', name: 'Taxa Flash', duration_minutes: 0, price: 80.00, category: 'Outros', description: 'Taxa para agendamento imediato', is_visible_to_client: false },
        ];
        const { error } = await supabase.from('services').insert(services);
        if (error) console.error('Error seeding services:', error);
    }

    // 2. ADMIN
    const { count: adminCount } = await supabase.from('admins').select('*', { count: 'exact', head: true });
    if (adminCount === 0) {
        console.log('Seeding admin...');
        const admin = {
            id: uuidv4(),
            name: 'Admin Principal',
            email: 'admin@sheep.com',
            role: 'Super Admin',
            permissions: ['all']
        };
        const { error } = await supabase.from('admins').insert([admin]);
        if (error) console.error('Error seeding admin:', error);
    }

    // 3. PHOTOGRAPHER
    const { count: photographerCount } = await supabase.from('photographers').select('*', { count: 'exact', head: true });
    if (photographerCount === 0) {
        console.log('Seeding photographer...');
        const photographer = {
            id: uuidv4(),
            name: 'Fotógrafo Exemplo',
            email: 'foto@sheep.com',
            phone: '11999999999',
            base_address: 'Av. Paulista, 1000, São Paulo - SP',
            base_lat: -23.561684,
            base_lng: -46.655981,
            radius_km: 20,
            services: ['foto_profissional', 'video_tour', 'drone', 'tour_360', 'planta_baixa'],
            availability: {
                monday: ['09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00'],
                tuesday: ['09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00'],
                wednesday: ['09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00'],
                thursday: ['09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00'],
                friday: ['09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00']
            },
            is_active: true
        };
        const { error } = await supabase.from('photographers').insert([photographer]);
        if (error) console.error('Error seeding photographer:', error);
    }

    // 4. CLIENT
    const { count: clientCount } = await supabase.from('clients').select('*', { count: 'exact', head: true });
    if (clientCount === 0) {
        console.log('Seeding client...');
        const client = {
            id: uuidv4(),
            name: 'Imobiliária Modelo',
            trade_name: 'Modelo Imóveis',
            person_type: 'Pessoa Jurídica',
            email: 'contato@modelo.com.br',
            phone: '1133334444',
            cnpj: '12.345.678/0001-90',
            payment_type: 'Pós-pago',
            address: {
                street: 'Rua Funchal',
                number: '200',
                neighborhood: 'Vila Olímpia',
                city: 'São Paulo',
                state: 'SP',
                zip: '04551-060'
            },
            is_active: true,
            balance: 0
        };
        const { error } = await supabase.from('clients').insert([client]);
        if (error) console.error('Error seeding client:', error);
    }

    console.log('Database seed completed!');
};
