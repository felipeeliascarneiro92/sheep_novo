

export type ServiceCategory = 'Foto' | 'Vídeo' | 'Aéreo' | 'Pacotes' | 'Outros' | 'Edição';
export type BookingStatus = 'Confirmado' | 'Cancelado' | 'Pendente' | 'Realizado' | 'Concluído' | 'Rascunho';
export type PaymentStatus = 'Quitado' | 'Atrasado' | 'Pendente';
export type HistoryActor = 'Sistema' | 'Fotógrafo' | 'Cliente' | 'Admin' | 'Editor';

export interface BookingHistory {
  timestamp: string; // ISO Date string
  notes: string;
  actor: HistoryActor;
}

export interface BrokerPermissions {
  canSchedule: boolean;
  canViewAllBookings: boolean;
}

export interface Broker {
  id: string;
  clientId: string; // Link to the client (imobiliária)
  name: string;
  phone: string;
  email: string;
  hasLogin: boolean;
  password?: string; // Will be set when access is granted
  isActive: boolean;
  permissions: BrokerPermissions;
  profilePicUrl?: string;
}

export interface Booking {
  id: string;
  legacy_id?: number;
  client_id: string;
  client_name: string;
  client_phone: string;
  service_ids: string[];
  photographer_id?: string; // Optional in Draft
  photographer_name?: string; // Optional, populated via join
  date?: string; // "YYYY-MM-DD" - Optional in Draft
  start_time?: string; // "HH:MM" - Optional in Draft
  end_time?: string;   // "HH:MM" - Optional in Draft
  address: string;
  lat: number;
  lng: number;
  status: BookingStatus;
  total_price: number;
  servicePriceOverrides?: Record<string, number>;
  rating?: number; // 1-5 stars
  is_accompanied: boolean;
  accompanying_broker_name?: string;
  unit_details?: string;
  notes?: string; // General notes (visible to all usually)
  internalNotes?: string; // Internal notes (Photographer/Admin/Editor only)
  createdAt: string; // ISO Date string
  history: BookingHistory[];
  media_files?: string[]; // Array of uploaded file names
  brokerId?: string; // ID of the broker who made the booking
  invoiceId?: string;
  isFlash?: boolean; // New flag for Flash Bookings
  tipAmount?: number; // New: Tip amount given by client
  couponCode?: string; // NEW: Code of the coupon used
  discountAmount?: number; // NEW: Amount discounted

  // KEY TRACKER
  keyState?: 'WITH_PHOTOGRAPHER' | 'RETURNED';

  // PAYROLL / REPASSES
  isPaidToPhotographer: boolean;
  photographerPayout: number; // Amount due to photographer
  payoutDate?: string; // Date when payout was processed

  // COMMON AREA LINK
  commonAreaId?: string; // ID of the linked common area for photos

  // ASAAS INTEGRATION
  asaasPaymentId?: string; // The ID of the specific charge (pay_...)
  asaasInvoiceUrl?: string; // URL to the hosted invoice page
  asaasPixQrCodeUrl?: string; // URL for dynamic Pix QR Code

  // DROPBOX INTEGRATION
  dropboxFolderId?: string;
  dropboxFolderLink?: string;
  dropboxUploadLink?: string; // New field for photographer upload link
}

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  thumbnailLink?: string;
  webContentLink?: string;
  webViewLink?: string;
}

export interface Invoice {
  id: string;
  bookingId: string;
  clientName: string;
  description: string;
  dueDate: string; // "YYYY-MM-DD"
  amount: number;
  status: PaymentStatus;
}

export interface AdminInvoice {
  id: string;
  clientId: string;
  clientName: string;
  monthYear: string; // e.g., "Novembro 2025"
  issueDate: string; // "YYYY-MM-DD"
  dueDate: string; // "YYYY-MM-DD"
  amount: number;
  status: PaymentStatus;
  bookingIds: string[];

  // ASAAS INTEGRATION
  asaasPaymentId?: string; // Grouped charge ID
  asaasInvoiceUrl?: string;
  asaasBankSlipUrl?: string; // Link do Boleto PDF
}

export interface Service {
  id: string;
  name: string;
  duration_minutes: number;
  price: number;
  category: ServiceCategory;
  status: 'Ativo' | 'Inativo';
  description?: string;
  isVisibleToClient: boolean;
}

export type DayOfWeek = 'sunday' | 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday';

export interface PhotographerHistory {
  timestamp: string; // ISO Date string
  notes: string;
  actor: 'Sistema' | 'Admin';
}

export interface Photographer {
  id: string;
  name: string;
  email: string;
  phone: string;
  rg: string;
  baseAddress: string;
  baseLat: number;
  baseLng: number;
  radiusKm: number;
  services: string[]; // Service IDs
  slotDurationMinutes: number;
  availability: Partial<Record<DayOfWeek, string[]>>; // Array of "HH:MM" start times
  bookings: Booking[];
  profilePicUrl?: string;
  prices: Record<string, number>; // key: serviceId, value: price paid to photographer
  history: PhotographerHistory[];
  isActive: boolean;
  password?: string; // Added for auth simulation
  timeOffs?: TimeOff[]; // Added for availability check
}

// NEW: Editor Interface
export interface Editor {
  id: string;
  name: string;
  email: string;
  phone: string;
  profilePicUrl?: string;
  isActive: boolean;
  password?: string; // Added for auth simulation
}

// NEW: AdminUser Interface
export interface AdminUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  profilePicUrl?: string;
  role: 'Super Admin' | 'Admin'; // Simple role distinction
  permissions?: string[];
  isActive: boolean;
  password?: string; // Added for auth simulation
}

export interface ClientHistory {
  timestamp: string; // ISO Date string
  notes: string;
  actor: 'Sistema' | 'Admin';
}

export interface ClientAddress {
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
  zip: string;
  reference?: string;
  observation?: string;
  lat?: number;
  lng?: number;
}

export type TransactionType = 'Credit' | 'Debit';

export interface WalletTransaction {
  id: string;
  date: string; // ISO Date
  description: string;
  type: TransactionType;
  amount: number;
  relatedBookingId?: string;
  clientId: string;
}

export interface Client {
  id: string;
  // Main Details
  name: string; // Razão Social
  tradeName: string; // Nome Fantasia
  personType: 'Pessoa Jurídica' | 'Pessoa Física';
  isActive: boolean;
  profilePicUrl?: string;
  password?: string; // Added for auth simulation

  // Contact
  phone: string;
  commercialPhone: string;
  mobilePhone: string;
  email: string;
  marketingEmail1: string;
  marketingEmail2: string;

  // Financial
  cnpj: string;
  cpf?: string; // CPF for Pessoa Física (optional, stored in cnpj field too for backward compatibility)
  stateRegistration: string;
  dueDay: number; // 1-31
  paymentMethod: string;
  paymentType: 'Pré-pago' | 'Pós-pago';
  network: string;
  customPrices: Record<string, number>;
  balance: number;
  transactions: WalletTransaction[];

  // ASAAS INTEGRATION
  asaasCustomerId?: string; // The ID returned by Asaas (cus_...)

  // Address
  address: ClientAddress;
  billingAddress?: ClientAddress;

  // History & Notes
  history: ClientHistory[];
  notes: string; // Observacao Dados

  // Referral System
  referralCode?: string;
  referredBy?: string; // ID of the client who referred this client

  // Blocked Photographers
  blockedPhotographers?: string[]; // IDs of photographers this client does not want to work with

  // Notifications
  whatsappNotification1?: string;
  whatsappNotification2?: string;
  notificationPreferences?: {
    whatsapp: boolean;
    email: boolean;
    promotions: boolean;
  };
}

export interface CommonAreaAddress {
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
}

export interface CommonArea {
  id: string;
  name: string;
  fullAddress: string;
  address: CommonAreaAddress;
  media_link: string;
  notes?: string;
  createdAt: string; // ISO Date String
}

export interface TimeOff {
  id: string;
  blockId: string; // To group slots blocked at the same time
  photographer_id: string;
  start_datetime: string; // ISO String
  end_datetime: string;   // ISO String
  notes?: string;
}

export interface EligiblePhotographer {
  photographer: Photographer;
  distance: number;
  dailyBookingCount: number;
}

export type NotificationType = 'success' | 'info' | 'warning' | 'urgent';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  timestamp: string;
  read: boolean;
  link?: string;
}

export type CouponType = 'percentage' | 'fixed';

export interface Coupon {
  id: string;
  code: string;
  type: CouponType;
  value: number; // e.g., 10 for 10% or 10 for R$ 10.00
  expirationDate: string; // ISO Date YYYY-MM-DD
  maxUses: number;
  usedCount: number;
  serviceRestrictionId?: string; // If set, only applies if this service is in cart
  usedByClientIds: string[]; // To track one per client logic
  isActive: boolean;
  maxUsesPerClient?: number;
}

// --- EDITING REQUEST TYPES ---
export type EditingStatus = 'Pendente' | 'Em Andamento' | 'Concluído';

export interface EditingRequestItem {
  id: string;
  originalFileName: string;
  originalFileUrl: string; // In a real app this is a cloud URL, here it might be a dataURL or placeholder
  serviceIds: string[]; // e.g., 'day_to_dusk', 'virtual_staging'
  instructions?: string;
  editedFileUrl?: string; // Populated by editor
}

export interface EditingRequest {
  id: string;
  clientId: string;
  createdAt: string; // ISO Date
  status: EditingStatus;
  totalPrice: number;
  items: EditingRequestItem[];
  editorNotes?: string;
  completedAt?: string;
}

// --- TASK / WORKFLOW TYPES ---
export type TaskStatus = 'Pendente' | 'Em Andamento' | 'Concluído';

export interface TaskComment {
  id: string;
  text: string;
  author: string;
  createdAt: string;
}

export interface Task {
  id: string;
  bookingId: string;
  title: string;
  description?: string;
  status: TaskStatus;
  assigneeName: string; // e.g. "Reidiane", "Editor"
  payout: number; // Pay-per-task amount
  dueDate?: string; // ISO Date "YYYY-MM-DD"
  createdAt: string;
  completedAt?: string;
  relatedServiceId?: string; // Optional link to service that triggered it
  comments: TaskComment[];
  isPaid?: boolean;
  payoutDate?: string;
}

export interface PhotographerOpportunityCost {
  photographer: Photographer;
  blockedSlots: number;
  opportunityCost: number;
}

// --- GOVERNANCE & AUDIT TYPES ---
export type AuditActionType = 'CREATE' | 'UPDATE' | 'DELETE' | 'FINANCE' | 'STATUS_CHANGE' | 'LOGIN';

export interface AuditLog {
  id: string;
  timestamp: string; // ISO Date
  actorId: string;
  actorName: string;
  role: string; // 'Admin' | 'Cliente' | 'Corretor' | ...
  actionType: AuditActionType;
  category: string; // 'Agendamento', 'Preços', 'Usuário'
  details: string;
  metadata?: Record<string, any>;
}

export interface OptimizationSuggestion {
  bookingA: Booking;
  bookingB: Booking;
  photographerA: Photographer;
  photographerB: Photographer;
  savingKm: number;
}

export type MarketingPostType = 'promotion' | 'news' | 'tip' | 'upsell';

export interface MarketingPost {
  id: string;
  title: string;
  content: string;
  imageUrl?: string;
  type: MarketingPostType;
  isActive: boolean;
  createdAt: string;
  actionLink?: string;
  actionText?: string;
}

// --- CRM INTELLIGENT TYPES ---

export type CrmLifecycleStage = 'Lead' | 'Onboarding' | 'Active' | 'AtRisk' | 'Churned' | 'Recovery' | 'Discarded';

export type CrmAlertType = 'GHOST_ACTIVATION' | 'CHURN_RISK' | 'UPSELL_OPPORTUNITY' | 'LOW_PENETRATION' | 'BIRTHDAY';

export type CrmActivityType = 'WHATSAPP' | 'CALL' | 'EMAIL' | 'MEETING' | 'NOTE';

export type CrmActivityResult = 'SUCCESS' | 'SNOOZE' | 'NO_ANSWER' | 'LOST' | 'DO_NOT_DISTURB';

export interface Network {
  id: string;
  name: string;
  color: string;
}

export interface ClientCrmMetrics {
  client_id: string;
  lifecycle_stage: CrmLifecycleStage;
  signup_date?: string;
  first_booking_date?: string;
  last_booking_date?: string;
  days_since_last_booking: number;
  total_bookings_count: number;
  total_spent: number;
  avg_ticket: number;
  total_brokers_count: number;
  active_brokers_count: number;
  penetration_rate: number;
  health_score: number;
  updated_at: string;
}

export interface CrmActivity {
  id: string;
  client_id: string;
  performed_by: string; // User ID
  type: CrmActivityType;
  result?: CrmActivityResult;
  notes?: string;
  created_at: string;
}

export interface CrmAlert {
  id: string;
  client_id: string;
  type: CrmAlertType;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  status: 'PENDING' | 'ACTIONED' | 'DISMISSED';
  snooze_until?: string;
  created_at: string;
  client_name?: string; // Joined field
  client_lifecycle?: CrmLifecycleStage; // Joined field
}

// --- CHAT TYPES ---
export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_role: 'client' | 'photographer' | 'admin' | 'broker';
  content: string; // Text content or Caption
  type: 'text' | 'image' | 'audio' | 'file';
  media_url?: string;
  created_at: string;
  read_at?: string;
}

export interface Conversation {
  id: string;
  booking_id: string;
  booking?: Booking; // Expanded
  created_at: string;
  updated_at: string;
  messages?: Message[]; // Latest or all depending on fetch
  unreadCount?: number;
}