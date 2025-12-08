
import { 
    Booking, Service, Photographer, Client, Broker, CommonArea, 
    AdminInvoice, TimeOff, Coupon, EditingRequest, Task, Editor, AdminUser, BookingStatus, HistoryActor, AuditLog, WalletTransaction 
} from '../types';
import { v4 as uuidv4 } from 'uuid';
import { createAsaasCustomer } from './asaasService';

const STORAGE_KEY = 'sheephouse_db_v1';

// --- STATE CONTAINER ---
export const db = {
    services: [] as Service[],
    clients: [] as Client[],
    photographers: [] as Photographer[],
    brokers: [] as Broker[],
    editors: [] as Editor[],
    admins: [] as AdminUser[],
    commonAreas: [] as CommonArea[],
    timeOffs: [] as TimeOff[],
    invoices: [] as AdminInvoice[],
    coupons: [] as Coupon[],
    editingRequests: [] as EditingRequest[],
    tasks: [] as Task[],
    bookings: [] as Booking[],
    auditLogs: [] as AuditLog[],
    transactions: [] as WalletTransaction[] // Centralized Transactions
};

// --- HELPER FUNCTIONS ---
const getRandomItem = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const getRandomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const addDays = (date: Date, days: number) => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
};

export const generateNextId = (list: {id: string}[]): string => {
    if (list.length === 0) return "1";
    
    // Filter only numeric IDs to avoid issues with old UUIDs if any exist mixed in
    const numericIds = list
        .map(item => parseInt(item.id, 10))
        .filter(n => !isNaN(n));
        
    if (numericIds.length === 0) return "1";
    
    const maxId = Math.max(...numericIds);
    return (maxId + 1).toString();
};

// --- MOCK GENERATOR ---
export const generateMockData = () => {
    // 0. Initialize Basic Lists if empty
    if(db.services.length === 0) {
        db.services = [
            { id: 'foto_profissional', name: 'Fotografia Profissional', duration_minutes: 60, price: 150, category: 'Foto', status: 'Ativo', isVisibleToClient: true },
            { id: 'foto_premium', name: 'Fotografia Premium (HDR)', duration_minutes: 90, price: 250, category: 'Foto', status: 'Ativo', isVisibleToClient: true },
            { id: 'video_reels', name: 'Vídeo Reels (Vertical)', duration_minutes: 45, price: 120, category: 'Vídeo', status: 'Ativo', isVisibleToClient: true },
            { id: 'video_profissional_interno', name: 'Vídeo Profissional (Horizontal)', duration_minutes: 60, price: 200, category: 'Vídeo', status: 'Ativo', isVisibleToClient: true },
            { id: 'foto_aerea', name: 'Fotografia Aérea (Drone)', duration_minutes: 30, price: 180, category: 'Aéreo', status: 'Ativo', isVisibleToClient: true },
            { id: 'video_aereo', name: 'Vídeo Aéreo (Drone)', duration_minutes: 30, price: 250, category: 'Aéreo', status: 'Ativo', isVisibleToClient: true },
            { id: 'pacote_completo', name: 'Pacote Foto + Vídeo + Drone', duration_minutes: 120, price: 550, category: 'Pacotes', status: 'Ativo', isVisibleToClient: true },
            { id: 'pacote_aereo', name: 'Pacote Aéreo (Foto + Vídeo)', duration_minutes: 45, price: 350, category: 'Pacotes', status: 'Ativo', isVisibleToClient: true },
            { id: 'tour_virtual', name: 'Tour Virtual 360°', duration_minutes: 60, price: 300, category: 'Outros', status: 'Ativo', isVisibleToClient: true },
            { id: 'retirar_chaves', name: 'Retirada de Chaves', duration_minutes: 30, price: 30, category: 'Outros', status: 'Ativo', isVisibleToClient: true },
            { id: 'deslocamento', name: 'Taxa de Deslocamento', duration_minutes: 0, price: 40, category: 'Outros', status: 'Ativo', isVisibleToClient: false },
            { id: 'taxa_flash', name: 'Taxa de Urgência (Flash)', duration_minutes: 0, price: 50, category: 'Outros', status: 'Ativo', isVisibleToClient: false },
            { id: 'edicao_avancada', name: 'Edição Avançada (Céu Azul)', duration_minutes: 0, price: 5, category: 'Edição', status: 'Ativo', isVisibleToClient: true },
            { id: 'day_to_dusk', name: 'Day to Dusk', duration_minutes: 0, price: 25, category: 'Edição', status: 'Ativo', isVisibleToClient: true },
            { id: 'virtual_staging', name: 'Virtual Staging', duration_minutes: 0, price: 45, category: 'Edição', status: 'Ativo', isVisibleToClient: true },
            { id: 'item_removal', name: 'Remoção de Objetos', duration_minutes: 0, price: 15, category: 'Edição', status: 'Ativo', isVisibleToClient: true },
            
            // ADDONS (Registered as Services so they appear in lists and invoices)
            { id: 'ceu_azul', name: 'Garantia Céu Azul', duration_minutes: 0, price: 29.90, category: 'Edição', status: 'Ativo', isVisibleToClient: true },
            { id: 'entrega_express', name: 'Entrega Express 12h', duration_minutes: 0, price: 49.90, category: 'Outros', status: 'Ativo', isVisibleToClient: true },
            { id: 'seguro_chuva', name: 'Seguro Chuva', duration_minutes: 0, price: 19.90, category: 'Outros', status: 'Ativo', isVisibleToClient: true },
        ];
    }

    // --- IMPORTED CLIENTS FROM LEGACY DB ---
    // FIX: Ensure 7 Imoveis (ID 42) is properly set as a Client (Agency)
    if(db.clients.length === 0) {
        db.clients = [
            {
                id: '3', name: 'Squall Robert', tradeName: 'Squall Robert', personType: 'Pessoa Física', isActive: true, password: '123',
                phone: '(41) 99999-0003', commercialPhone: '', mobilePhone: '', email: 'cliente3@migracao.com', marketingEmail1: '', marketingEmail2: '',
                cnpj: '054.860.829-67', stateRegistration: '', dueDay: 22, paymentMethod: 'Outros', paymentType: 'Pré-pago', network: '', customPrices: {}, balance: 0, transactions: [],
                address: { street: 'Endereço Migrado', number: 'SN', complement: '', neighborhood: 'Centro', city: 'Curitiba', state: 'PR', zip: '80000-000', lat: -25.4284, lng: -49.2733 },
                history: [], notes: '324234234', asaasCustomerId: undefined
            },
            {
                id: '5', name: 'Squall Robeert', tradeName: 'Squall Robeert', personType: 'Pessoa Jurídica', isActive: true, password: '123',
                phone: '(41) 99999-0005', commercialPhone: '', mobilePhone: '', email: 'cliente5@migracao.com', marketingEmail1: '', marketingEmail2: '',
                cnpj: '191.000.000-00', stateRegistration: '', dueDay: 10, paymentMethod: 'Outros', paymentType: 'Pré-pago', network: '', customPrices: {}, balance: 0, transactions: [],
                address: { street: 'Endereço Migrado', number: 'SN', complement: '', neighborhood: 'Centro', city: 'Curitiba', state: 'PR', zip: '80000-000', lat: -25.4284, lng: -49.2733 },
                history: [], notes: '', asaasCustomerId: undefined
            },
            {
                id: '15', name: 'Olimpia Imóveis', tradeName: 'Olímpia Imóveis', personType: 'Pessoa Jurídica', isActive: true, password: '123',
                phone: '(41) 99999-0015', commercialPhone: '', mobilePhone: '', email: 'cliente15@migracao.com', marketingEmail1: '', marketingEmail2: '',
                cnpj: '49.380.526/0001-33', stateRegistration: '0', dueDay: 10, paymentMethod: 'Outros', paymentType: 'Pré-pago', network: '', customPrices: {}, balance: 0, transactions: [],
                address: { street: 'Endereço Migrado', number: 'SN', complement: '', neighborhood: 'Centro', city: 'Curitiba', state: 'PR', zip: '80000-000', lat: -25.4284, lng: -49.2733 },
                history: [], notes: 'teste de observação', asaasCustomerId: undefined
            },
            {
                id: '26', name: 'Francisco José Teixeira Filho', tradeName: 'Francisco José', personType: 'Pessoa Física', isActive: true, password: '123',
                phone: '(41) 99999-0026', commercialPhone: '', mobilePhone: '', email: 'cliente26@migracao.com', marketingEmail1: '', marketingEmail2: '',
                cnpj: '054.860.829-67', stateRegistration: '', dueDay: 12, paymentMethod: 'Outros', paymentType: 'Pós-pago', network: '', customPrices: {}, balance: 0, transactions: [],
                address: { street: 'Endereço Migrado', number: 'SN', complement: '', neighborhood: 'Centro', city: 'Curitiba', state: 'PR', zip: '80000-000', lat: -25.4284, lng: -49.2733 },
                history: [], notes: 'daweqeqwe', asaasCustomerId: 'cus_000055370241'
            },
            {
                id: '27', name: 'Adaiane Imoveis', tradeName: 'Adaiane Imoveis', personType: 'Pessoa Física', isActive: true, password: '123',
                phone: '(41) 99999-0027', commercialPhone: '', mobilePhone: '', email: 'cliente27@migracao.com', marketingEmail1: '', marketingEmail2: '',
                cnpj: '079.960.649-97', stateRegistration: '', dueDay: 10, paymentMethod: 'Outros', paymentType: 'Pré-pago', network: '', customPrices: {}, balance: 0, transactions: [],
                address: { street: 'Endereço Migrado', number: 'SN', complement: '', neighborhood: 'Centro', city: 'Curitiba', state: 'PR', zip: '80000-000', lat: -25.4284, lng: -49.2733 },
                history: [], notes: '', asaasCustomerId: undefined
            },
            {
                id: '32', name: '7 IMOVEIS ASSESSORIA IMOBILIARIA LTDA', tradeName: '7 Imóveis', personType: 'Pessoa Jurídica', isActive: true, password: '123',
                phone: '(41) 99999-0032', commercialPhone: '', mobilePhone: '', email: 'cliente32@migracao.com', marketingEmail1: '', marketingEmail2: '',
                cnpj: '23.696.190/0001-29', stateRegistration: '', dueDay: 10, paymentMethod: 'Outros', paymentType: 'Pós-pago', network: '', customPrices: {}, balance: 0, transactions: [],
                address: { street: 'Endereço Migrado', number: 'SN', complement: '', neighborhood: 'Centro', city: 'Curitiba', state: 'PR', zip: '80000-000', lat: -25.4284, lng: -49.2733 },
                history: [], notes: 'FAZER SEMPRE VIDEO CURTO NA VERTICAL E HORIZONTAL\nSempre com  logo nos videos  no canto superior direito do video', asaasCustomerId: 'cus_000045664969'
            },
            // Rafael Camargo (ID 42) should be treated as the "Main Client" / "Imobiliária" account.
            // In the legacy system, 42 was a User, but tied to Grupo 44 (7 Imoveis). We map him as the Client Entity.
            {
                id: '42', name: 'Rafael Camargo (7 Imóveis)', tradeName: '7 Imóveis (Rafael)', personType: 'Pessoa Jurídica', isActive: true, password: '123',
                phone: '(41) 99999-0042', commercialPhone: '', mobilePhone: '', email: 'rafael.camargo@7imoveis.com.br', marketingEmail1: '', marketingEmail2: '',
                cnpj: '23.696.190/0001-29', stateRegistration: '', dueDay: 10, paymentMethod: 'Outros', paymentType: 'Pós-pago', network: '', customPrices: {}, balance: 0, transactions: [],
                address: { street: 'Endereço Migrado', number: 'SN', complement: '', neighborhood: 'Centro', city: 'Curitiba', state: 'PR', zip: '80000-000', lat: -25.4284, lng: -49.2733 },
                history: [], notes: 'Gestor 7 Imoveis', asaasCustomerId: 'cus_000045664969'
            },
            {
                id: '34', name: 'Leonardo O. Voigt', tradeName: '212 Imóveis', personType: 'Pessoa Jurídica', isActive: true, password: '123',
                phone: '(41) 99999-0034', commercialPhone: '', mobilePhone: '', email: 'cliente34@migracao.com', marketingEmail1: '', marketingEmail2: '',
                cnpj: '14.277.898/0001-54', stateRegistration: '', dueDay: 10, paymentMethod: 'Outros', paymentType: 'Pós-pago', network: '', customPrices: {}, balance: 0, transactions: [],
                address: { street: 'Endereço Migrado', number: 'SN', complement: '', neighborhood: 'Centro', city: 'Curitiba', state: 'PR', zip: '80000-000', lat: -25.4284, lng: -49.2733 },
                history: [], notes: '', asaasCustomerId: 'cus_000047584519'
            },
            {
                id: '36', name: 'ARK3 IMÓVEIS LTDA', tradeName: 'A3Mais Imóveis', personType: 'Pessoa Jurídica', isActive: true, password: '123',
                phone: '(41) 9834-9184', commercialPhone: '', mobilePhone: '', email: 'cliente36@migracao.com', marketingEmail1: '', marketingEmail2: '',
                cnpj: '47.347.967/0001-08', stateRegistration: '', dueDay: 10, paymentMethod: 'Outros', paymentType: 'Pós-pago', network: '', customPrices: {}, balance: 0, transactions: [],
                address: { street: 'Endereço Migrado', number: 'SN', complement: '', neighborhood: 'Centro', city: 'Curitiba', state: 'PR', zip: '80000-000', lat: -25.4284, lng: -49.2733 },
                history: [], notes: '(41) 9834-9184', asaasCustomerId: 'cus_000096100555'
            },
            {
                id: '37', name: 'B i Imoveis LTDA', tradeName: 'Baggio Imoveis', personType: 'Pessoa Jurídica', isActive: true, password: '123',
                phone: '(41) 99999-0037', commercialPhone: '', mobilePhone: '', email: 'cliente37@migracao.com', marketingEmail1: '', marketingEmail2: '',
                cnpj: '12.142.829/0001-08', stateRegistration: '', dueDay: 10, paymentMethod: 'Outros', paymentType: 'Pós-pago', network: '', customPrices: {}, balance: 0, transactions: [],
                address: { street: 'Endereço Migrado', number: 'SN', complement: '', neighborhood: 'Centro', city: 'Curitiba', state: 'PR', zip: '80000-000', lat: -25.4284, lng: -49.2733 },
                history: [], notes: '', asaasCustomerId: 'cus_000045664795'
            },
            {
                id: '46', name: 'Debonna Imóveis', tradeName: 'Debonna Imóveis', personType: 'Pessoa Jurídica', isActive: true, password: '123',
                phone: '(41) 99999-0046', commercialPhone: '', mobilePhone: '', email: 'cliente46@migracao.com', marketingEmail1: '', marketingEmail2: '',
                cnpj: '13.414.541/0001-08', stateRegistration: '', dueDay: 10, paymentMethod: 'Outros', paymentType: 'Pós-pago', network: '', customPrices: {}, balance: 0, transactions: [],
                address: { street: 'Endereço Migrado', number: 'SN', complement: '', neighborhood: 'Centro', city: 'Curitiba', state: 'PR', zip: '80000-000', lat: -25.4284, lng: -49.2733 },
                history: [], notes: '', asaasCustomerId: 'cus_000045664751'
            },
            {
                id: '49', name: 'Deck Imoveis LTDA', tradeName: 'Deck Imoveis', personType: 'Pessoa Jurídica', isActive: true, password: '123',
                phone: '(41) 99999-0049', commercialPhone: '', mobilePhone: '', email: 'cliente49@migracao.com', marketingEmail1: '', marketingEmail2: '',
                cnpj: '25.275.015/0001-93', stateRegistration: '', dueDay: 10, paymentMethod: 'Outros', paymentType: 'Pós-pago', network: '', customPrices: {}, balance: 133, transactions: [],
                address: { street: 'Endereço Migrado', number: 'SN', complement: '', neighborhood: 'Centro', city: 'Curitiba', state: 'PR', zip: '80000-000', lat: -25.4284, lng: -49.2733 },
                history: [], notes: '', asaasCustomerId: 'cus_000045664888'
            },
            // Keep the manually added test accounts for functionality consistency
            {
                id: '999', name: 'Imobiliária Sol Nascente (Teste)', tradeName: 'Sol Nascente', personType: 'Pessoa Jurídica', isActive: true, password: '123',
                phone: '(41) 99999-1111', commercialPhone: '', mobilePhone: '', email: 'contato@solnascente.com.br', marketingEmail1: '', marketingEmail2: '',
                cnpj: '12.345.678/0001-90', stateRegistration: '', dueDay: 10, paymentMethod: 'Saldo', paymentType: 'Pré-pago', network: '', customPrices: {}, balance: 450.00, transactions: [],
                address: { street: 'Rua das Flores', number: '100', complement: '', neighborhood: 'Centro', city: 'Curitiba', state: 'PR', zip: '80000-000', lat: -25.4284, lng: -49.2733 },
                history: [], notes: '', asaasCustomerId: 'cus_000005123001', referralCode: 'SOL1234'
            }
        ];
    }

    // --- IMPORTED PHOTOGRAPHERS & USERS FROM LEGACY DB ---
    if(db.photographers.length === 0) {
        db.photographers = [
            // Manually mapped from user dump (Type 2)
            {
                id: '7', name: 'Isaias Schneider', email: 'isaias.sheephouse@gmail.com', phone: '(41) 99999-9997', rg: '93735641', password: '123',
                base_address: 'Rua Chile, 123, Curitiba - PR', base_lat: -25.445, base_lng: -49.265, radius_km: 20,
                services: ['foto_profissional', 'foto_premium', 'video_reels', 'foto_aerea', 'pacote_completo', 'taxa_flash', 'deslocamento'], slot_duration_minutes: 60,
                availability: { monday: ['08:00', '10:30', '14:00'], tuesday: ['08:00', '10:30', '14:00'], wednesday: ['08:00', '10:30', '14:00'], thursday: ['08:00', '10:30', '14:00'], friday: ['08:00', '10:30', '14:00'] },
                bookings: [], prices: {}, history: [], isActive: true, profile_pic_url: 'upload/fotos_usuario/9071698320968.48'
            },
            {
                id: '9', name: 'Jonatan Aparecido da Motta', email: 'agenda09.sheephouse@gmail.com', phone: '(41) 99999-9909', rg: '94457688', password: '123',
                base_address: 'Centro Cívico, Curitiba - PR', base_lat: -25.417, base_lng: -49.269, radius_km: 15,
                services: ['foto_profissional', 'video_reels'], slot_duration_minutes: 60,
                availability: { monday: ['09:00', '11:00', '14:00', '16:00'], wednesday: ['09:00', '11:00', '14:00', '16:00'], friday: ['09:00', '11:00', '14:00', '16:00'] },
                bookings: [], prices: {}, history: [], isActive: true, profile_pic_url: 'upload/fotos_usuario/9071698329170.05'
            },
            {
                id: '10', name: 'James Ventura de Barros', email: 'sheephousepoa.norte@gmail.com', phone: '(41) 99999-9910', rg: '15690170', password: '123',
                base_address: 'Santa Felicidade, Curitiba - PR', base_lat: -25.407, base_lng: -49.334, radius_km: 15,
                services: ['foto_profissional'], slot_duration_minutes: 60,
                availability: { tuesday: ['09:00', '13:00'], thursday: ['09:00', '13:00'] },
                bookings: [], prices: {}, history: [], isActive: true, profile_pic_url: 'upload/fotos_usuario/81679861340.jpg'
            },
            {
                id: '13', name: 'Jeferson Perin', email: 'agenda05.sheephouse@gmail.com', phone: '(41) 99999-9913', rg: '131928742', password: '123',
                base_address: 'Pinheirinho, Curitiba - PR', base_lat: -25.513, base_lng: -49.294, radius_km: 20,
                services: ['foto_profissional', 'foto_premium'], slot_duration_minutes: 60,
                availability: { monday: ['08:00', '10:00', '13:00'], friday: ['08:00', '10:00', '13:00'] },
                bookings: [], prices: {}, history: [], isActive: true, profile_pic_url: 'upload/fotos_usuario/9071750965013.10'
            },
            {
                id: '14', name: 'Marco Aurélio Furquim Junior', email: 'agenda06.sheephouse@gmail.com', phone: '(41) 99999-9914', rg: '11044438', password: '123',
                base_address: 'Portão, Curitiba - PR', base_lat: -25.469, base_lng: -49.293, radius_km: 15,
                services: ['foto_profissional'], slot_duration_minutes: 60,
                availability: { wednesday: ['10:00', '14:00'] },
                bookings: [], prices: {}, history: [], isActive: true, profile_pic_url: 'upload/fotos_usuario/9071698320836.jpg'
            },
            {
                id: '15', name: 'Tiago de Moura Carvalho', email: 'agenda08.sheephouse@gmail.com', phone: '(41) 99999-9915', rg: '307599779', password: '123',
                base_address: 'Cajuru, Curitiba - PR', base_lat: -25.437, base_lng: -49.223, radius_km: 15,
                services: ['foto_profissional', 'video_profissional_interno'], slot_duration_minutes: 60,
                availability: { thursday: ['09:00', '15:00'] },
                bookings: [], prices: {}, history: [], isActive: true, profile_pic_url: 'upload/fotos_usuario/9071698329444.05'
            },
            {
                id: '16', name: 'Augusto de Andrade Cassimiro', email: 'agenda03.sheephouse@gmail.com', phone: '(41) 99999-9916', rg: '123060725', password: '123',
                base_address: 'Boqueirão, Curitiba - PR', base_lat: -25.501, base_lng: -49.241, radius_km: 20,
                services: ['foto_profissional', 'foto_aerea'], slot_duration_minutes: 60,
                availability: { monday: ['10:00', '14:00'], tuesday: ['10:00', '14:00'] },
                bookings: [], prices: {}, history: [], isActive: true, profile_pic_url: 'upload/fotos_usuario/9071750964724.05'
            },
            {
                id: '17', name: 'Gabriel Goulart Netto', email: 'agenda07.sheephouse@gmail.com', phone: '(41) 99999-9917', rg: '130232973', password: '123',
                base_address: 'Xaxim, Curitiba - PR', base_lat: -25.512, base_lng: -49.263, radius_km: 15,
                services: ['foto_profissional'], slot_duration_minutes: 60,
                availability: { friday: ['08:00', '12:00'] },
                bookings: [], prices: {}, history: [], isActive: true, profile_pic_url: 'upload/fotos_usuario/81679624467.31'
            },
            {
                id: '21', name: 'Eduardo Leardini', email: 'bcnorte.sheephouse@gmail.com', phone: '(41) 99999-9921', rg: '1234567', password: '123',
                base_address: 'Bacacheri, Curitiba - PR', base_lat: -25.397, base_lng: -49.236, radius_km: 15,
                services: ['foto_profissional'], slot_duration_minutes: 60,
                availability: { monday: ['13:00', '15:00'] },
                bookings: [], prices: {}, history: [], isActive: true, profile_pic_url: 'upload/fotos_usuario/9071698320921.jpg'
            },
            {
                id: '22', name: 'Paulo Henrique Coelho Madalena', email: 'sheephousepoa@gmail.com', phone: '(41) 99999-9922', rg: '85256769', password: '123',
                base_address: 'Boa Vista, Curitiba - PR', base_lat: -25.385, base_lng: -49.252, radius_km: 15,
                services: ['foto_profissional', 'video_reels'], slot_duration_minutes: 60,
                availability: { wednesday: ['09:00', '14:00'] },
                bookings: [], prices: {}, history: [], isActive: true, profile_pic_url: 'upload/fotos_usuario/9071698329415.09'
            },
            {
                id: '35', name: 'Thiago Marcondes', email: 'thimarcondes.tj@gmail.com', phone: '(41) 99999-9935', rg: '123456', password: '123',
                base_address: 'Uberaba, Curitiba - PR', base_lat: -25.475, base_lng: -49.213, radius_km: 15,
                services: ['foto_profissional'], slot_duration_minutes: 60,
                availability: { friday: ['10:00', '14:00'] },
                bookings: [], prices: {}, history: [], isActive: true, profile_pic_url: 'upload/fotos_usuario/81679624865.jpg'
            }
        ];
    }

    if(db.editors.length === 0) {
        db.editors = [
            { id: '1', name: 'Lucas Edições', email: 'lucas@sheephouse.com', phone: '(41) 99111-8888', isActive: true, password: '123' }
        ];
    }

    if(db.admins.length === 0) {
        db.admins = [
            // Default + Imported
            { id: '1', name: 'Squall (Master)', email: 'contato@squall.com.br', phone: '(41) 99999-0001', role: 'Super Admin', isActive: true, password: '123', profilePicUrl: 'upload/fotos_usuario/11679626001.png' },
            { id: '8', name: 'Felipe Elias Carneiro', email: 'sheeephouse@gmail.com', phone: '(41) 99999-0008', role: 'Admin', isActive: true, password: '123', profilePicUrl: 'upload/fotos_usuario/81700833359.41' }
        ];
    }

    if(db.brokers.length === 0) {
        db.brokers = [
            // Imported brokers (Type 3).
            { id: '2', clientId: '1', name: 'Felipe carneiro', phone: '96290578', email: 'felipeeliascarneiro@gmail.com', hasLogin: true, isActive: true, permissions: { canSchedule: true, canViewAllBookings: false }, password: '123', profilePicUrl: 'upload/fotos_usuario/11679624179.png' },
            { id: '19', clientId: '1', name: 'Jean Ivanki', phone: '123465', email: 'jeanivanki@hotmail.com', hasLogin: true, isActive: true, permissions: { canSchedule: true, canViewAllBookings: false }, password: '123', profilePicUrl: 'upload/fotos_usuario/81679624765.jpg' },
            // FIX: Williana Pedroso (ID 43) is a Broker for 7 Imoveis (ID 42)
            { id: '43', clientId: '42', name: 'Williana Pedroso', phone: '(41) 99999-0043', email: 'williana.pedroso@7imoveis.com.br', hasLogin: true, isActive: true, permissions: { canSchedule: true, canViewAllBookings: false }, password: '123', profilePicUrl: 'upload/fotos_usuario/81680258959.png' },
            // Keep mock
            { id: '99', clientId: '999', name: 'João Silva (Mock)', phone: '(41) 99911-2233', email: 'joao@solnascente.com.br', hasLogin: true, isActive: true, permissions: { canSchedule: true, canViewAllBookings: false }, password: '123' }
        ];
    }

    if(db.commonAreas.length === 0) {
        db.commonAreas = [
            {
                id: '1', 
                name: 'R. Augusto de Mari, 3834', 
                fullAddress: 'R. Augusto de Mari, 3834, Portão, Curitiba - PR',
                address: { street: 'R. Augusto de Mari', number: '3834', neighborhood: 'Portão', city: 'Curitiba', state: 'PR' },
                media_link: 'https://www.dropbox.com/scl/fo/omt2xq0svyinmyg5umdt1/h?dl=0&rlkey=3xi6et0lq1b2g798xa9911e96', 
                notes: 'Legado ID: 1', 
                createdAt: '2023-03-23T19:53:03'
            },
            {
                id: '2', 
                name: 'R. Ten. Luiz de Campos Valejo, 400', 
                fullAddress: 'R. Ten. Luiz de Campos Valejo, 400, Bacacheri, Curitiba - PR',
                address: { street: 'R. Ten. Luiz de Campos Valejo', number: '400', neighborhood: 'Bacacheri', city: 'Curitiba', state: 'PR' },
                media_link: 'https://www.dropbox.com/scl/fo/qndeghopx5p2fksqxxfo6/h?dl=0&rlkey=b0c261fhgoq7vsr0egoi4zozz', 
                notes: 'Legado ID: 2', 
                createdAt: '2023-03-23T19:53:03'
            },
            {
                id: '3', 
                name: 'Alameda Arpo, 1135', 
                fullAddress: 'Alameda Arpo, 1135, Ouro Fino, São José dos Pinhais - PR',
                address: { street: 'Alameda Arpo', number: '1135', neighborhood: 'Ouro Fino', city: 'São José dos Pinhais', state: 'PR' },
                media_link: 'https://www.dropbox.com/sh/brq0hj4c7hd5zra/AAA2czSFcuV5rPyZZ1MySV8Ca?dl=0', 
                notes: 'Legado ID: 3 (Excluído em 2025)', 
                createdAt: '2023-03-23T19:53:03'
            }
        ];
    }

    if(db.coupons.length === 0) {
        db.coupons = [
            { id: '1', code: 'BEMVINDO10', type: 'percentage', value: 10, expirationDate: '2025-12-31', maxUses: 100, usedCount: 15, usedByClientIds: [], isActive: true }
        ];
    }

    // --- MOCK AUDIT LOGS ---
    if (db.auditLogs.length === 0) {
        const now = new Date();
        db.auditLogs = [
            {
                id: '1',
                timestamp: now.toISOString(),
                actorId: '1',
                actorName: 'Squall (Master)',
                role: 'Admin',
                actionType: 'STATUS_CHANGE',
                category: 'Agendamento',
                details: 'Alterou status do agendamento #1234 de Pendente para Confirmado.',
                metadata: { bookingId: '1234' }
            }
        ];
    }

    // --- GENERATE BOOKINGS & TRANSACTIONS ---
    if (db.bookings.length === 0) {
        const today = new Date();
        let bookingIdCounter = 1;
        let transactionIdCounter = 1;
        
        for (let i = 0; i < 150; i++) {
            const offset = getRandomInt(-90, 30);
            const date = addDays(today, offset);
            const dateStr = date.toISOString().split('T')[0];
            const client = getRandomItem(db.clients.filter(c => c.isActive));
            const photographer = getRandomItem(db.photographers);
            
            let status: BookingStatus;
            if (offset < -2) {
                const rand = Math.random();
                if (rand > 0.9) status = 'Cancelado';
                else if (rand > 0.3) status = 'Concluído';
                else status = 'Realizado';
            } else if (offset < 0) {
                status = Math.random() > 0.5 ? 'Realizado' : 'Confirmado';
            } else {
                status = Math.random() > 0.8 ? 'Pendente' : 'Confirmado';
            }

            const numServices = getRandomInt(1, 3);
            const services = [];
            for (let j = 0; j < numServices; j++) services.push(getRandomItem(db.services));
            const serviceIds = [...new Set(services.map(s => s.id))];
            
            const total = services.reduce((sum, s) => sum + (client.customPrices[s.id] ?? s.price), 0);
            const payout = (total * 0.6); // Simple 60% logic

            const neighborhoods = ['Centro', 'Batel', 'Água Verde', 'Bigorrilho', 'Cabral', 'Ecoville', 'Santa Felicidade'];
            const streetNames = ['Rua XV', 'Av Silva Jardim', 'Rua Itupava', 'Av Batel', 'Rua Padre Anchieta'];
            const address = `${getRandomItem(streetNames)}, ${getRandomInt(10, 3000)}, ${getRandomItem(neighborhoods)}, Curitiba - PR`;

            const bookingId = `${bookingIdCounter++}`;
            
            // Simulate payment status for past bookings
            const isPaid = (status === 'Concluído' || status === 'Realizado') && Math.random() > 0.3;

            const booking: Booking = {
                id: bookingId,
                client_id: client.id,
                client_name: client.name,
                client_phone: client.phone,
                service_ids: serviceIds,
                photographer_id: photographer.id,
                date: dateStr,
                start_time: `${getRandomInt(8, 17)}:00`,
                end_time: `${getRandomInt(18, 19)}:00`,
                address: address,
                lat: -25.4284 + (Math.random() - 0.5) * 0.1,
                lng: -49.2733 + (Math.random() - 0.5) * 0.1,
                status: status,
                total_price: total,
                is_accompanied: Math.random() > 0.7,
                accompanying_broker_name: Math.random() > 0.7 ? 'Corretor Plantão' : undefined,
                createdAt: addDays(date, -getRandomInt(1, 10)).toISOString(),
                history: [
                    { timestamp: addDays(date, -5).toISOString(), actor: 'Sistema', notes: 'Agendamento criado' }
                ],
                media_files: status === 'Concluído' ? ['foto1.jpg', 'foto2.jpg'] : undefined,
                isFlash: Math.random() > 0.95,
                asaasPaymentId: status !== 'Pendente' ? `pay_mock_${uuidv4().slice(0,8)}` : undefined,
                
                // Payroll
                photographerPayout: payout,
                isPaidToPhotographer: isPaid,
                payoutDate: isPaid ? addDays(date, 5).toISOString() : undefined
            };

            db.bookings.push(booking);

            if (client.paymentType === 'Pré-pago' && (status === 'Confirmado' || status === 'Realizado' || status === 'Concluído')) {
                // Push to CENTRAL TRANSACTIONS array
                db.transactions.push({
                    id: `${transactionIdCounter++}`,
                    date: booking.createdAt,
                    description: `Agendamento #${booking.id}`,
                    type: 'Debit',
                    amount: total,
                    relatedBookingId: booking.id,
                    clientId: client.id
                });
            }
        }
    }

    // Generate Invoices
    if (db.invoices.length === 0) {
        const today = new Date();
        const postPaidClients = db.clients.filter(c => c.paymentType === 'Pós-pago');
        let invoiceIdCounter = 1;
        
        for (let i = 1; i <= 3; i++) {
            const targetDate = new Date(today.getFullYear(), today.getMonth() - i, 1);
            const monthYear = targetDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
            const monthEnd = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0);

            postPaidClients.forEach(client => {
                db.invoices.push({
                    id: `${invoiceIdCounter++}`,
                    clientId: client.id,
                    clientName: client.name,
                    monthYear: monthYear,
                    issueDate: monthEnd.toISOString().split('T')[0],
                    dueDate: addDays(monthEnd, client.dueDay).toISOString().split('T')[0],
                    amount: 1500, // Mock amount
                    status: i === 1 ? 'Pendente' : 'Quitado',
                    bookingIds: [],
                    asaasPaymentId: `pay_invoice_${uuidv4().slice(0,8)}`
                });
            });
        }
    }
};

// --- PERSISTENCE ---
export const saveChanges = () => {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
    } catch (e) {
        console.error("Failed to save state to localStorage", e);
    }
};

export const loadState = (): boolean => {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            const state = JSON.parse(saved);
            if (state.clients && state.clients.length > 0) {
                db.services = state.services || db.services;
                db.clients = state.clients;
                db.photographers = state.photographers;
                db.brokers = state.brokers;
                db.editors = state.editors;
                db.admins = state.admins;
                db.commonAreas = state.commonAreas;
                db.timeOffs = state.timeOffs;
                db.invoices = state.invoices;
                db.coupons = state.coupons;
                db.editingRequests = state.editingRequests;
                db.tasks = state.tasks;
                db.bookings = state.bookings;
                db.auditLogs = state.auditLogs || [];
                db.transactions = state.transactions || [];

                return true;
            }
        }
    } catch (e) {
        console.error("Failed to load state from localStorage", e);
        localStorage.removeItem(STORAGE_KEY);
    }
    return false;
};

// --- INITIALIZATION ---
if (!loadState()) {
    generateMockData();
    saveChanges();
}
