import { notifyClientBookingCreated, notifyClientBookingCancelled, notifyClientBookingCompleted, notifyPhotographerNewBooking, notifyPhotographerBookingCancelled, notifyClientBookingRescheduled } from './notificationService';
import { supabase } from './supabase';
import { setOptions, importLibrary } from "@googlemaps/js-api-loader";
import { Booking, BookingStatus, EligiblePhotographer, Photographer, Service, HistoryActor, OptimizationSuggestion, Client, Broker } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { getClientById, addFunds } from './clientService';
import { getPhotographerById } from './photographerService';
import { getServiceById, getServices } from './resourceService';
import { getCoupons } from './financeService';
import { generateTasksFromBooking } from './taskService';
import { logAction } from './auditService';

const GOOGLE_MAPS_API_KEY = 'AIzaSyCPd9TlVuf5GQlWi7d_Ddq5vNCx1BwMpWk';
export const NEGATIVE_BALANCE_LIMIT = 100;

// --- MAPPERS ---
export const bookingToDb = (booking: Booking) => {
    return {
        id: booking.id,
        legacy_id: booking.legacy_id,
        client_id: booking.client_id,
        photographer_id: booking.photographer_id,
        service_ids: booking.service_ids,
        date: booking.date,
        start_time: booking.start_time,
        end_time: booking.end_time,
        address: booking.address,
        lat: booking.lat,
        lng: booking.lng,
        status: booking.status,
        total_price: booking.total_price,
        service_price_overrides: booking.servicePriceOverrides,
        rating: booking.rating,
        is_accompanied: booking.is_accompanied,
        accompanying_broker_name: booking.accompanying_broker_name,
        unit_details: booking.unit_details,
        notes: booking.notes,
        internal_notes: booking.internalNotes,
        media_files: booking.media_files,
        broker_id: booking.brokerId,
        invoice_id: booking.invoiceId,
        is_flash: booking.isFlash,
        tip_amount: booking.tipAmount,
        coupon_code: booking.couponCode,
        discount_amount: booking.discountAmount,
        key_state: booking.keyState,
        is_paid_to_photographer: booking.isPaidToPhotographer,
        photographer_payout: booking.photographerPayout,
        payout_date: booking.payoutDate,
        common_area_id: booking.commonAreaId,
        asaas_payment_id: booking.asaasPaymentId,
        asaas_invoice_url: booking.asaasInvoiceUrl,
        asaas_pix_qr_code_url: booking.asaasPixQrCodeUrl,
        dropbox_folder_id: booking.dropboxFolderId,
        google_drive_folder_link: booking.dropboxFolderLink, // Map to DB column
        dropbox_upload_link: booking.dropboxUploadLink,
        history: booking.history,
        created_at: booking.createdAt
    };
};

export const bookingFromDb = (db: any): Booking => {
    return {
        id: db.id,
        legacy_id: db.legacy_id,
        client_id: db.client_id,
        client_name: db.clients?.name || 'Cliente Desconhecido',
        client_phone: db.clients?.phone || '',
        service_ids: db.service_ids || [],
        photographer_id: db.photographer_id,
        photographer_name: db.photographers?.name || 'Desconhecido',
        date: db.date,
        start_time: db.start_time,
        end_time: db.end_time,
        address: db.address,
        lat: db.lat,
        lng: db.lng,
        status: db.status,
        total_price: db.total_price,
        servicePriceOverrides: db.service_price_overrides,
        rating: db.rating,
        is_accompanied: db.is_accompanied,
        accompanying_broker_name: db.accompanying_broker_name,
        unit_details: db.unit_details,
        notes: db.notes,
        internalNotes: db.internal_notes,
        createdAt: db.created_at,
        history: db.history || [],
        media_files: db.media_files || [],
        brokerId: db.broker_id,
        invoiceId: db.invoice_id,
        isFlash: db.is_flash,
        tipAmount: db.tip_amount,
        couponCode: db.coupon_code,
        discountAmount: db.discount_amount,
        keyState: db.key_state,
        isPaidToPhotographer: db.is_paid_to_photographer,
        photographerPayout: db.photographer_payout,
        payoutDate: db.payout_date,
        commonAreaId: db.common_area_id,
        asaasPaymentId: db.asaas_payment_id,
        asaasInvoiceUrl: db.asaas_invoice_url,
        asaasPixQrCodeUrl: db.asaas_pix_qr_code_url,
        dropboxFolderId: db.dropbox_folder_id,
        dropboxFolderLink: db.google_drive_folder_link || db.dropbox_folder_link, // Support both for migration
        dropboxUploadLink: db.dropbox_upload_link,
        pending_services: db.pending_services || []
    };
};

// --- GOOGLE MAPS ---
export const loadGoogleMapsScript = async (): Promise<void> => {
    if ((window as any).google && (window as any).google.maps) return Promise.resolve();

    setOptions({
        key: GOOGLE_MAPS_API_KEY,
        v: "weekly",
        libraries: ["places", "marker"]
    });

    await importLibrary("maps");
    await importLibrary("marker");
    await importLibrary("places");
};

// --- HELPERS ---
export const calculateDistanceKm = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

const timeToMinutes = (time: string) => {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
};

// --- AVAILABILITY ---

export const getDailySlotsForPhotographer = async (photographerId: string, date: string): Promise<string[]> => {
    const p = await getPhotographerById(photographerId);
    if (!p) return [];
    const dateObj = new Date(date + 'T00:00:00');
    const dayIndex = dateObj.getDay();
    const days: (keyof typeof p.availability)[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayName = days[dayIndex];
    return p.availability[dayName] || [];
};

export const isSlotFree = (photographer: Photographer, date: string, time: string, duration: number, excludeBookingId?: string): boolean => {
    const startMins = timeToMinutes(time);
    const endMins = startMins + duration;

    // Check against bookings (Dynamically retrieved via getPhotographerById which filters db.bookings)
    const bookingConflict = photographer.bookings.some(b => {
        if (b.id === excludeBookingId || b.status === 'Cancelado' || b.date !== date || !b.start_time || !b.end_time) return false;
        const bStart = timeToMinutes(b.start_time);
        const bEnd = timeToMinutes(b.end_time);
        return (startMins < bEnd && endMins > bStart);
    });

    if (bookingConflict) return false;

    if (bookingConflict) return false;

    if (photographer.timeOffs) {
        const timeOffConflict = photographer.timeOffs.some(t => {
            const tStartObj = new Date(t.start_datetime);
            const tEndObj = new Date(t.end_datetime);

            const tDateStr = tStartObj.toISOString().split('T')[0];
            if (tDateStr !== date) return false;

            const tStart = tStartObj.getHours() * 60 + tStartObj.getMinutes();
            const tEnd = tEndObj.getHours() * 60 + tEndObj.getMinutes();

            return (startMins < tEnd && endMins > tStart);
        });
        if (timeOffConflict) return false;
    }

    return true;
};

export const getAvailableSlots = async (location: { lat: number, lng: number }, serviceIds: string[], date: string, clientId?: string): Promise<string[]> => {
    const allServices = await getServices();
    const services = allServices.filter(s => serviceIds.includes(s.id));
    const duration = services.reduce((acc, s) => acc + s.duration_minutes, 0);

    if (duration === 0 && serviceIds.length > 0) return [];

    const { data: photographers } = await supabase.from('photographers').select('*');
    if (!photographers) return [];

    // Check for Key Pickup Service
    const hasKeyPickup = serviceIds.includes('retirar_chaves');
    let searchLat = location.lat;
    let searchLng = location.lng;

    if (hasKeyPickup && clientId) {
        const { data: clientData } = await supabase.from('clients').select('address').eq('id', clientId).single();
        if (clientData && clientData.address && (clientData.address as any).lat && (clientData.address as any).lng) {
            console.log('[DEBUG] Switching radius center to Client/Agency Location (Key Pickup)');
            searchLat = (clientData.address as any).lat;
            searchLng = (clientData.address as any).lng;
        } else {
            console.log('[DEBUG] Key Pickup requested but Client has no geocoded address. using Property location.');
        }
    }

    // Fetch blocked photographers if clientId is provided
    let blockedPhotographerIds: string[] = [];
    if (clientId) {
        const { data: clientData } = await supabase.from('clients').select('blockedPhotographers').eq('id', clientId).single();
        if (clientData && clientData.blockedPhotographers) {
            blockedPhotographerIds = clientData.blockedPhotographers;
        }
    }

    const validPhotographers = photographers.filter((p: any) => {
        if (!p.is_active) return false;
        if (blockedPhotographerIds.includes(p.id)) {
            console.log(`[DEBUG] Photographer ${p.name} is BLOCKED for this client.`);
            return false;
        }
        if (!p.base_lat || !p.base_lng) return false;
        if (!Array.isArray(p.services)) return false;

        const essentialServices = serviceIds.filter(id => id !== 'deslocamento' && id !== 'taxa_flash');
        const hasServices = essentialServices.every(id => p.services.includes(id));

        // Use SEARCH Latitude/Longitude (which might be the Agency's)
        const dist = calculateDistanceKm(searchLat, searchLng, p.base_lat, p.base_lng);
        const isWithinRadius = dist <= p.radius_km;

        console.log(`[DEBUG] Photographer ${p.name}:`, {
            Active: p.is_active,
            HasServices: hasServices,
            Dist: `${dist.toFixed(2)}km`,
            Radius: `${p.radius_km}km`,
            Included: hasServices && isWithinRadius,
            RequiredServices: essentialServices,
            PhotographerServices: p.services,
            MissingServices: essentialServices.filter(id => !p.services.includes(id))
        });

        if (!hasServices) return false;
        return isWithinRadius;
    });

    if (validPhotographers.length === 0) {
        return [];
    }

    const availableSlotsSet = new Set<string>();

    for (const p of validPhotographers) {
        const potentialSlots = await getDailySlotsForPhotographer(p.id, date);
        const fullPhotographer = await getPhotographerById(p.id);

        potentialSlots.forEach(slot => {
            if (fullPhotographer && isSlotFree(fullPhotographer, date, slot, duration)) {
                availableSlotsSet.add(slot);
            }
        });
    }

    return Array.from(availableSlotsSet).sort((a, b) => timeToMinutes(a) - timeToMinutes(b));
};

export const findNearestAvailablePhotographer = async (location: { lat: number, lng: number }, duration: number): Promise<{ photographer: Photographer, slot: string } | null> => {
    const today = new Date().toISOString().split('T')[0];
    const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes() + 60;

    const { data: photographers } = await supabase.from('photographers').select('*');
    if (!photographers) return null;

    const candidates = photographers.filter((p: any) => {
        if (!p.is_active) return false;
        const dist = calculateDistanceKm(location.lat, location.lng, p.base_lat, p.base_lng);
        return dist <= p.radius_km;
    }).map((p: any) => ({
        photographer: p,
        distance: calculateDistanceKm(location.lat, location.lng, p.base_lat, p.base_lng)
    })).sort((a: any, b: any) => a.distance - b.distance);

    for (const candidate of candidates) {
        const p = await getPhotographerById(candidate.photographer.id);
        if (!p) continue;

        const dailySlots = await getDailySlotsForPhotographer(p.id, today);

        const nextSlot = dailySlots.find(slot => {
            const slotMinutes = timeToMinutes(slot);
            if (slotMinutes < nowMinutes) return false;
            return isSlotFree(p, today, slot, duration);
        });

        if (nextSlot) {
            return { photographer: p, slot: nextSlot };
        }
    }

    return null;
};

export const getEligiblePhotographersForSwap = async (bookingId: string): Promise<EligiblePhotographer[]> => {
    const booking = await getBookingById(bookingId);
    if (!booking || !booking.date || !booking.start_time) return [];

    const duration = await getBookingDuration(booking.service_ids);

    const { data: photographers } = await supabase.from('photographers').select('*');
    if (!photographers) return [];

    const eligible: EligiblePhotographer[] = [];

    for (const p of photographers) {
        if (!p.is_active || p.id === booking.photographer_id) continue;

        const essentialServices = booking.service_ids.filter(id => id !== 'deslocamento' && id !== 'taxa_flash');
        const hasServices = essentialServices.every((id: string) => p.services.includes(id));
        if (!hasServices) continue;

        const dist = calculateDistanceKm(booking.lat, booking.lng, p.base_lat, p.base_lng);
        if (dist > p.radius_km) continue;

        const fullP = await getPhotographerById(p.id);
        if (!fullP) continue;

        if (isSlotFree(fullP, booking.date!, booking.start_time!, duration)) {
            const bookings = await getBookingsForPhotographer(p.id);
            eligible.push({
                photographer: fullP,
                distance: dist,
                dailyBookingCount: bookings.filter(b => b.date === booking.date && b.status !== 'Cancelado').length
            });
        }
    }
    return eligible;
};

export const findRouteOptimizations = async (date: string): Promise<OptimizationSuggestion[]> => {
    const { data: bookings } = await supabase.from('bookings').select('*').eq('date', date).eq('status', 'Confirmado');
    if (!bookings) return [];

    const suggestions: OptimizationSuggestion[] = [];

    for (let i = 0; i < bookings.length; i++) {
        for (let j = i + 1; j < bookings.length; j++) {
            const b1 = bookings[i];
            const b2 = bookings[j];

            if (b1.start_time === b2.start_time && b1.photographer_id !== b2.photographer_id && b1.photographer_id && b2.photographer_id) {
                const p1 = await getPhotographerById(b1.photographer_id);
                const p2 = await getPhotographerById(b2.photographer_id);

                if (!p1 || !p2) continue;

                const p1CanDoB2 = b2.service_ids.every((sId: string) => (p1.services || []).includes(sId) || sId === 'deslocamento' || sId === 'taxa_flash');
                const p2CanDoB1 = b1.service_ids.every((sId: string) => (p2.services || []).includes(sId) || sId === 'deslocamento' || sId === 'taxa_flash');

                if (!p1CanDoB2 || !p2CanDoB1) continue;

                const d1Current = calculateDistanceKm(p1.baseLat!, p1.baseLng!, b1.lat, b1.lng);
                const d2Current = calculateDistanceKm(p2.baseLat!, p2.baseLng!, b2.lat, b2.lng);
                const currentTotal = d1Current + d2Current;

                const d1Swap = calculateDistanceKm(p1.baseLat!, p1.baseLng!, b2.lat, b2.lng);
                const d2Swap = calculateDistanceKm(p2.baseLat!, p2.baseLng!, b1.lat, b1.lng);
                const swapTotal = d1Swap + d2Swap;

                if (currentTotal - swapTotal > 5) {
                    suggestions.push({
                        bookingA: b1,
                        bookingB: b2,
                        photographerA: p1,
                        photographerB: p2,
                        savingKm: currentTotal - swapTotal
                    });
                }
            }
        }
    }
    return suggestions;
};

// --- BOOKING CRUD ---

export const getBookingsPaginated = async (
    page: number,
    pageSize: number,
    filters?: {
        status?: string;
        photographerId?: string;
        clientId?: string;
        brokerId?: string;
        startDate?: string;
        endDate?: string;
        searchQuery?: string;
    }
): Promise<{ data: Booking[]; count: number }> => {
    let query = supabase
        .from('bookings')
        .select('*, clients(name, phone), photographers(name)', { count: 'exact' });

    // Apply Filters
    if (filters?.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
    }

    // Filter out 'Rascunho' by default unless specifically asked (or handled by UI)
    // The UI currently filters it out, so let's do it here too if status is not Rascunho
    if (filters?.status !== 'Rascunho') {
        query = query.neq('status', 'Rascunho');
    }

    if (filters?.photographerId && filters.photographerId !== 'all') {
        query = query.eq('photographer_id', filters.photographerId);
    }

    if (filters?.clientId) {
        query = query.eq('client_id', filters.clientId);
    }

    if (filters?.brokerId) {
        query = query.eq('broker_id', filters.brokerId);
    }

    if (filters?.startDate) {
        query = query.gte('date', filters.startDate);
    }

    if (filters?.endDate) {
        query = query.lte('date', filters.endDate);
    }

    if (filters?.searchQuery) {
        // Search by ID (legacy or uuid) or Client Name (requires join filter which is tricky in simple query, 
        // but Supabase supports filtering on joined tables with !inner if needed, or we stick to simple fields)
        // For performance on large dataset, simple text search on specific columns is best.
        // Let's search legacy_id cast to text, or address.
        const isNumeric = /^\d+$/.test(filters.searchQuery);
        if (isNumeric) {
            query = query.eq('legacy_id', parseInt(filters.searchQuery));
        } else {
            query = query.ilike('address', `%${filters.searchQuery}%`);
        }
    }

    // Pagination
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, error, count } = await query
        .order('date', { ascending: false })
        .order('start_time', { ascending: false })
        .range(from, to);

    if (error) {
        console.error('Error fetching paginated bookings:', error);
        return { data: [], count: 0 };
    }

    return {
        data: data.map(bookingFromDb),
        count: count || 0
    };
};

export const getAllBookings = async (): Promise<Booking[]> => {
    // WARNING: This hits the default 1000 row limit. Use pagination or filtering where possible.
    const { data, error } = await supabase.from('bookings').select('*, clients(name, phone), photographers(name)');
    if (error) {
        console.error('Error fetching all bookings:', error);
        return [];
    }
    return data.map(bookingFromDb);
};

export const getBookingsByDate = async (date: string): Promise<Booking[]> => {
    const { data, error } = await supabase.from('bookings').select('*, clients(name, phone), photographers(name)').eq('date', date);
    if (error) {
        console.error('Error fetching bookings by date:', error);
        return [];
    }
    return data.map(bookingFromDb);
};

export const getBookingById = async (id: string): Promise<Booking | undefined> => {
    const { data, error } = await supabase.from('bookings').select('*, clients(name, phone), photographers(name)').eq('id', id).single();
    if (error || !data) return undefined;
    return bookingFromDb(data);
};

export const getBookingsForClient = async (clientId: string, brokerId?: string): Promise<Booking[]> => {
    let query = supabase.from('bookings').select('*, clients(name, phone), photographers(name)').eq('client_id', clientId);
    if (brokerId) {
        query = query.eq('broker_id', brokerId);
    }
    const { data, error } = await query;
    if (error) return [];
    return data.map(bookingFromDb);
};

export const getBookingsForPhotographer = async (photographerId: string): Promise<Booking[]> => {
    const { data, error } = await supabase.from('bookings').select('*, clients(name, phone), photographers(name)').eq('photographer_id', photographerId);
    if (error) return [];
    return data.map(bookingFromDb);
};

// --- PAYOUT HELPER ---
const calculatePayout = (serviceIds: string[], client: Client, photographer: Photographer | undefined, allServices: Service[]): number => {
    if (!photographer) return 0;

    let payout = 0;
    for (const serviceId of serviceIds) {
        // Pass-through services: Photographer gets exactly what the client pays
        if (serviceId === 'deslocamento' || serviceId === 'retirar_chaves') {
            const clientPrice = client.customPrices?.[serviceId] ?? allServices.find(s => s.id === serviceId)?.price ?? 0;
            payout += clientPrice;
        } else {
            // Standard services: Use photographer's defined price, or fallback to 60% of standard price
            const photographerPrice = photographer.prices?.[serviceId];
            if (photographerPrice !== undefined) {
                payout += photographerPrice;
            } else {
                // Fallback if no specific price is set for this photographer
                const standardPrice = allServices.find(s => s.id === serviceId)?.price ?? 0;
                payout += standardPrice * 0.6;
            }
        }
    }
    return payout;
};

export const createBooking = async (
    serviceIds: string[], date: string | null, time: string | null, address: string,
    location: { lat: number, lng: number }, isAccompanied: boolean,
    brokerName?: string, notes?: string, clientId?: string, brokerId?: string,
    forcedStatus?: BookingStatus, isFlash?: boolean, couponCode?: string
): Promise<Booking | null> => {
    const client = await getClientById(clientId || '');
    if (!client) return null;

    const allServices = await getServices();
    const services = allServices.filter(s => serviceIds.includes(s.id));
    let total = serviceIds.reduce((sum, sId) => {
        const service = allServices.find(s => s.id === sId);
        const clientPrice = client.customPrices?.[sId];

        if (clientPrice !== undefined) return sum + clientPrice;
        if (service) return sum + service.price;

        // Fallbacks for known service IDs if missing from DB
        if (sId === 'deslocamento') return sum + 40.00;
        if (sId === 'taxa_flash') return sum + 80.00;

        return sum;
    }, 0);

    // Addons Logic (Hardcoded to match ServiceAddons.tsx)
    if (serviceIds.includes('entrega_express')) total += 49.90;
    if (serviceIds.includes('ceu_azul')) total += 29.90;
    if (serviceIds.includes('seguro_chuva')) total += 19.90;
    let discountAmount = 0;

    if (couponCode) {
        const coupons = await getCoupons();
        const coupon = coupons.find(c => c.code === couponCode);
        if (coupon && coupon.isActive) {
            if (coupon.type === 'percentage') {
                discountAmount = total * (coupon.value / 100);
            } else {
                discountAmount = coupon.value;
            }
            total = Math.max(0, total - discountAmount);
        }
    }

    const duration = services.reduce((sum, s) => sum + s.duration_minutes, 0);

    let endTime: string | undefined = undefined;
    if (time) {
        const startMins = timeToMinutes(time);
        const endMins = startMins + duration;
        endTime = `${Math.floor(endMins / 60).toString().padStart(2, '0')}:${(endMins % 60).toString().padStart(2, '0')}`;
    }

    let photographerId: string | undefined = '1';
    let selectedPhotographer: Photographer | undefined = undefined;

    if (forcedStatus === 'Rascunho') {
        photographerId = undefined;
    } else if (isFlash) {
        const bestMatch = await findNearestAvailablePhotographer(location, duration);
        if (bestMatch) {
            photographerId = bestMatch.photographer.id;
            selectedPhotographer = bestMatch.photographer;
        } else {
            return null;
        }
    } else if (date && time) {
        const { data: photographers } = await supabase.from('photographers').select('*');
        if (!photographers) return null;

        // Check for Key Pickup Service
        const hasKeyPickup = serviceIds.includes('retirar_chaves');
        let searchLat = location.lat;
        let searchLng = location.lng;

        if (hasKeyPickup && clientId) {
            const { data: clientData } = await supabase.from('clients').select('address').eq('id', clientId).single();
            if (clientData && clientData.address && (clientData.address as any).lat && (clientData.address as any).lng) {
                console.log('[CREATE BOOKING] Switching radius center to Client/Agency Location (Key Pickup)');
                searchLat = (clientData.address as any).lat;
                searchLng = (clientData.address as any).lng;
            }
        }

        // Fetch blocked photographers
        let blockedPhotographerIds: string[] = [];
        if (clientId) {
            const { data: clientData } = await supabase.from('clients').select('blockedPhotographers').eq('id', clientId).single();
            if (clientData && clientData.blockedPhotographers) {
                blockedPhotographerIds = clientData.blockedPhotographers;
            }
        }

        const validPhotographers = [];
        for (const p of photographers) {
            if (!p.is_active) continue;
            if (blockedPhotographerIds.includes(p.id)) {
                console.log(`[CREATE BOOKING] Skipping blocked photographer: ${p.name}`);
                continue;
            }

            const dist = calculateDistanceKm(searchLat, searchLng, p.base_lat, p.base_lng);
            const fullP = await getPhotographerById(p.id);
            if (dist <= p.radius_km && fullP && isSlotFree(fullP, date, time, duration)) {
                // Fetch daily bookings count for load balancing
                const dailyBookings = fullP.bookings.filter(b => b.date === date && b.status !== 'Cancelado').length;
                validPhotographers.push({ photographer: fullP, dist, dailyBookings });
            }
        }

        if (validPhotographers.length > 0) {
            // SMART BALANCE LOGIC:
            validPhotographers.sort((a, b) => {
                const scoreA = a.dist + (a.dailyBookings * 5);
                const scoreB = b.dist + (b.dailyBookings * 5);
                return scoreA - scoreB;
            });

            const selected = validPhotographers[0];
            console.log(`[SMART BALANCE] Selected ${selected.photographer.name} (Score: ${(selected.dist + selected.dailyBookings * 5).toFixed(1)} | Dist: ${selected.dist.toFixed(1)}km | Jobs: ${selected.dailyBookings})`);

            photographerId = selected.photographer.id;
            selectedPhotographer = selected.photographer;
        } else {
            return null;
        }
    }

    // Calculate Payout using the helper
    const payoutAmount = calculatePayout(serviceIds, client, selectedPhotographer, allServices);

    const booking: Booking = {
        id: uuidv4(), // Use valid UUID
        client_id: client.id,
        client_name: client.name,
        client_phone: client.phone,
        service_ids: serviceIds,
        photographer_id: photographerId,
        date: date || undefined,
        start_time: time || undefined,
        end_time: endTime,
        address,
        lat: location.lat,
        lng: location.lng,
        status: forcedStatus || (client.paymentType === 'Pré-pago' ? 'Pendente' : 'Confirmado'),
        total_price: total,
        is_accompanied: isAccompanied,
        accompanying_broker_name: brokerName,
        unit_details: notes,
        createdAt: new Date().toISOString(),
        history: [{ timestamp: new Date().toISOString(), actor: 'Sistema', notes: forcedStatus === 'Rascunho' ? 'Rascunho criado' : 'Agendamento criado' }],
        brokerId,
        isFlash,
        couponCode,
        discountAmount,
        servicePriceOverrides: {},
        isPaidToPhotographer: false,
        photographerPayout: payoutAmount,
    };

    const dbBooking = bookingToDb(booking);
    const { data, error } = await supabase.from('bookings').insert([dbBooking]).select().single();

    if (error) {
        console.error('Error creating booking:', error);
        throw error;
    }

    const newBooking = bookingFromDb(data);

    // NOTIFICATION: WhatsApp to Client
    if (client && client.phone) {
        notifyClientBookingCreated(newBooking, client.name, client.phone);
    }

    // NOTIFICATION: Photographer
    if (newBooking.photographer_id && newBooking.status !== 'Rascunho') {
        notifyPhotographerNewBooking(newBooking, newBooking.photographer_id);
    }

    if (newBooking.status !== 'Rascunho') {
        generateTasksFromBooking(newBooking);
    }

    if (newBooking.status === 'Confirmado' && client.paymentType === 'Pré-pago') {
        // Debit
        await addFunds(client.id, total, 'Debit', `Agendamento #${newBooking.id.slice(0, 8)}`, 'Sistema');
    }

    return booking;
};

export const finalizeDraftBooking = async (
    bookingId: string,
    date: string,
    time: string,
    serviceIds: string[],
    addons: string[],
    unitDetails?: string,
    couponCode?: string
): Promise<Booking | null> => {
    const booking = await getBookingById(bookingId);
    if (!booking) {
        console.error('finalizeDraftBooking: Booking not found', bookingId);
        return null;
    }
    if (booking.status !== 'Rascunho') {
        console.error('finalizeDraftBooking: Booking status is not Rascunho', booking.status);
        return null;
    }

    const allServices = await getServices();
    const finalServiceIds = [...serviceIds, ...addons];

    const duration = finalServiceIds.reduce((sum, id) => {
        const s = allServices.find(service => service.id === id);
        return sum + (s ? s.duration_minutes : 0);
    }, 0);

    const { data: photographers } = await supabase.from('photographers').select('*');
    if (!photographers) {
        console.error('finalizeDraftBooking: No photographers found in DB');
        return null;
    }

    const validPhotographers = [];
    for (const p of photographers) {
        if (!p.is_active) continue;

        // 1. Check Service Capability
        const essentialServices = finalServiceIds.filter(id => id !== 'deslocamento' && id !== 'taxa_flash');
        const hasServices = essentialServices.every(id => p.services.includes(id));
        if (!hasServices) {
            // console.log(`Photographer ${p.name} rejected: Missing services`);
            continue;
        }

        // 2. Check Distance
        const dist = calculateDistanceKm(booking.lat, booking.lng, p.base_lat, p.base_lng);
        if (dist > p.radius_km) {
            // console.log(`Photographer ${p.name} rejected: Too far (${dist.toFixed(2)}km > ${p.radius_km}km)`);
            continue;
        }

        const fullP = await getPhotographerById(p.id);

        // 3. Check Slot Availability (passing bookingId to exclude self-conflict)
        const slotFree = fullP ? isSlotFree(fullP, date, time, duration, bookingId) : false;

        if (fullP && slotFree) {
            validPhotographers.push(fullP);
        } else {
            console.log(`Photographer ${p.name} rejected: Slot not free`, { date, time, duration });
        }
    }

    if (validPhotographers.length === 0) {
        console.error('finalizeDraftBooking: No valid photographers found.', {
            lat: booking.lat,
            lng: booking.lng,
            date,
            time,
            duration,
            serviceIds: finalServiceIds
        });
        return null;
    }

    const photographer = validPhotographers[0];

    booking.photographer_id = photographer.id;
    booking.date = date;
    booking.start_time = time;
    const startMins = timeToMinutes(time);
    const endMins = startMins + duration;
    booking.end_time = `${Math.floor(endMins / 60).toString().padStart(2, '0')}:${(endMins % 60).toString().padStart(2, '0')}`;

    const client = await getClientById(booking.client_id);
    let total = finalServiceIds.reduce((sum, sId) => {
        const service = allServices.find(s => s.id === sId);
        const customPrice = client?.customPrices?.[sId];

        if (customPrice !== undefined) return sum + customPrice;
        if (service) return sum + service.price;

        if (sId === 'entrega_express') return sum + 49.90;
        if (sId === 'ceu_azul') return sum + 29.90;
        if (sId === 'seguro_chuva') return sum + 19.90;
        if (sId === 'deslocamento') return sum + 40.00;
        if (sId === 'taxa_flash') return sum + 80.00;

        return sum;
    }, 0);

    if (couponCode) {
        const coupons = await getCoupons();
        const coupon = coupons.find(c => c.code === couponCode);
        if (coupon && coupon.isActive) {
            if (coupon.type === 'percentage') {
                const discount = total * (coupon.value / 100);
                total = Math.max(0, total - discount);
                booking.discountAmount = discount;
            } else {
                const discount = coupon.value;
                total = Math.max(0, total - discount);
                booking.discountAmount = discount;
            }
            booking.couponCode = couponCode;
        }
    }

    booking.total_price = total;
    booking.service_ids = finalServiceIds;
    booking.unit_details = unitDetails || booking.unit_details;

    const isPrePaid = client?.paymentType === 'Pré-pago';
    booking.status = isPrePaid ? 'Pendente' : 'Confirmado';

    booking.history.push({
        timestamp: new Date().toISOString(),
        actor: 'Cliente',
        notes: 'Agendamento finalizado pelo cliente via link'
    });

    // Calculate Payout using the helper
    booking.photographerPayout = calculatePayout(finalServiceIds, client!, photographer, allServices);

    // Update in Supabase
    await supabase.from('bookings').update(bookingToDb(booking)).eq('id', booking.id);

    generateTasksFromBooking(booking);

    return booking;
};

export const updateBookingStatus = async (id: string, status: BookingStatus, notes: string, actor: HistoryActor) => {
    const booking = await getBookingById(id);
    if (booking) {
        const oldStatus = booking.status;
        const originalPrice = booking.total_price;

        booking.status = status;

        // --- CANCELLATION LOGIC: ZERO VALUES & REFUND ---
        if (status === 'Cancelado') {
            // 1. Zero out values so they don't appear in future revenue reports
            booking.total_price = 0;
            booking.photographerPayout = 0;

            // 2. Refund Logic for Pre-paid Clients
            const client = await getClientById(booking.client_id);

            if (client && client.paymentType === 'Pré-pago' && oldStatus === 'Confirmado') {
                // If it was confirmed, money was taken. Give it back.
                await addFunds(client.id, originalPrice, 'Credit', `Reembolso Cancelamento #${booking.id.slice(0, 8)}`, actor);
                notes += " (Valor estornado para carteira)";
            }
        }

        booking.history.push({ timestamp: new Date().toISOString(), actor, notes });
        await supabase.from('bookings').update(bookingToDb(booking)).eq('id', id);

        if (status === 'Cancelado') {
            logAction(
                { id: 'current_user', name: actor, role: actor },
                'DELETE',
                'Agendamento',
                `Agendamento #${booking.id.slice(-6)} cancelado. Motivo: ${notes}`,
                { bookingId: booking.id, oldStatus }
            );

            // NOTIFICATION: WhatsApp to Client (Cancellation)
            const client = await getClientById(booking.client_id);
            if (client && client.phone) {
                notifyClientBookingCancelled(booking, client.name, client.phone);
            }

            // NOTIFICATION: Photographer (Cancellation)
            if (booking.photographer_id) {
                notifyPhotographerBookingCancelled(booking, booking.photographer_id);
            }
        }
    }
};

export const confirmPrepaidBooking = async (id: string): Promise<Booking | undefined> => {
    const booking = await getBookingById(id);
    if (booking && booking.status === 'Pendente') {
        const client = await getClientById(booking.client_id);
        if (client) {
            const deficit = booking.total_price - (client.balance || 0);
            if (deficit > 0) {
                // TODO: Handle deficit - maybe prevent confirmation?
                // For now, we allow negative balance but log it?
                // Or we could return undefined to signal failure.
            }

            // Deduct balance
            await addFunds(client.id, booking.total_price, 'Debit', `Confirmação Agendamento #${booking.id.slice(0, 8)}`, 'Sistema');
        }
        booking.status = 'Confirmado';
        booking.history.push({ timestamp: new Date().toISOString(), actor: 'Sistema', notes: 'Pagamento confirmado' });
        await supabase.from('bookings').update(bookingToDb(booking)).eq('id', id);
        return booking;
    }
    return undefined;
};

export const updateBookingFull = async (id: string, updates: Partial<Booking>, actor: HistoryActor) => {
    const booking = await getBookingById(id);
    if (!booking) return null;

    // Merge updates
    const updatedBooking = { ...booking, ...updates };

    // Capture names for logging if necessary
    let newPhotographerName = '';
    let oldServiceNamesStr = '';
    let newServiceNamesStr = '';

    // Recalculate payout if photographer or services changed
    if (updates.photographer_id || updates.service_ids) {
        const client = await getClientById(updatedBooking.client_id);
        const photographer = await getPhotographerById(updatedBooking.photographer_id || '');
        const allServices = await getServices();

        if (photographer) newPhotographerName = photographer.name;

        if (updates.service_ids) {
            const newServices = allServices.filter(s => updates.service_ids!.includes(s.id));
            newServiceNamesStr = newServices.map(s => s.name).join(', ');

            const oldServices = allServices.filter(s => booking.service_ids.includes(s.id));
            oldServiceNamesStr = oldServices.map(s => s.name).join(', ');
        }

        if (client) {
            updatedBooking.photographerPayout = calculatePayout(updatedBooking.service_ids, client, photographer, allServices);
        }
    }

    // Generate detailed change log
    const changes: string[] = [];
    if (updates.date && updates.date !== booking.date) changes.push(`Data: ${booking.date} -> ${updates.date}`);
    if (updates.start_time && updates.start_time !== booking.start_time) changes.push(`Hora: ${booking.start_time} -> ${updates.start_time}`);
    if (updates.status && updates.status !== booking.status) changes.push(`Status: ${booking.status} -> ${updates.status}`);
    if (updates.address && updates.address !== booking.address) changes.push(`Endereço: ${booking.address} -> ${updates.address}`);
    if (updates.total_price !== undefined && updates.total_price !== booking.total_price) changes.push(`Valor: R$ ${booking.total_price.toFixed(2)} -> R$ ${updates.total_price.toFixed(2)}`);

    if (updates.photographer_id && updates.photographer_id !== booking.photographer_id) {
        changes.push(`Fotógrafo: ${booking.photographer_name || 'N/A'} -> ${newPhotographerName || 'N/A'}`);
    }

    if (updates.service_ids && JSON.stringify(updates.service_ids) !== JSON.stringify(booking.service_ids)) {
        changes.push(`Serviços: [${oldServiceNamesStr}] -> [${newServiceNamesStr}]`);
    }

    const changeLog = changes.length > 0 ? `Edição: ${changes.join(' | ')}` : 'Detalhes do agendamento editados manualmente';

    // Add history entry
    updatedBooking.history.push({
        timestamp: new Date().toISOString(),
        actor: actor,
        notes: changeLog
    });

    const { error } = await supabase.from('bookings').update(bookingToDb(updatedBooking)).eq('id', id);

    if (error) {
        console.error("Error updating booking full:", error);
        throw error;
    }

    return updatedBooking;
};

export const rescheduleBooking = async (id: string, newDate: string, newTime: string) => {
    const booking = await getBookingById(id);
    if (booking) {
        const oldDate = booking.date || '';
        const oldTime = booking.start_time || '';

        booking.date = newDate;
        booking.start_time = newTime;
        booking.history.push({ timestamp: new Date().toISOString(), actor: 'Sistema', notes: `Reagendado para ${newDate} às ${newTime}` });
        await supabase.from('bookings').update(bookingToDb(booking)).eq('id', id);

        // 📧 Send Reschedule Email
        const client = await getClientById(booking.client_id);
        if (client) {
            import('./emailService').then(({ sendBookingReschedule }) => {
                console.log('📧 Sending reschedule email...');
                sendBookingReschedule(booking, client, oldDate, oldTime).catch(err => console.error('❌ Failed to send reschedule email:', err));
            });

            // 📱 WhatsApp Notification
            if (client.phone) {
                notifyClientBookingRescheduled(booking, client.name, client.phone);
            }
        }
    }
};

export const updateBookingServicesAndPrice = async (id: string, serviceIds: string[], actor: string, priceOverrides?: Record<string, number>) => {
    const booking = await getBookingById(id);
    if (booking) {
        const oldTotalPrice = booking.total_price;

        booking.service_ids = serviceIds;
        if (priceOverrides) booking.servicePriceOverrides = priceOverrides;

        const allServices = await getServices();

        const newTotal = serviceIds.reduce((sum, sId) => {
            const service = allServices.find(s => s.id === sId);
            const override = priceOverrides?.[sId];
            if (override !== undefined) return sum + override;
            if (service) return sum + service.price;
            return sum;
        }, 0);

        const client = await getClientById(booking.client_id);

        // Handle prepaid balance logic
        if (client && client.paymentType === 'Pré-pago' && booking.status === 'Confirmado') {
            const difference = newTotal - oldTotalPrice;
            if (difference > 0) {
                // Price increased, debit the difference
                await addFunds(client.id, difference, 'Debit', `Ajuste de Serviços (Acréscimo) #${booking.id.slice(0, 8)}`, actor);
            } else if (difference < 0) {
                // Price decreased, credit the difference (refund)
                await addFunds(client.id, Math.abs(difference), 'Credit', `Ajuste de Serviços (Reembolso) #${booking.id.slice(0, 8)}`, actor);
            }
        }

        booking.total_price = newTotal;

        // Recalculate Payout if photographer is assigned
        if (booking.photographer_id) {
            const client = await getClientById(booking.client_id);
            const photographer = await getPhotographerById(booking.photographer_id);
            if (client && photographer) {
                booking.photographerPayout = calculatePayout(serviceIds, client, photographer, allServices);
            }
        }

        booking.history.push({
            timestamp: new Date().toISOString(),
            actor: actor as HistoryActor,
            notes: `Serviços atualizados. Total: R$ ${oldTotalPrice.toFixed(2)} -> R$ ${newTotal.toFixed(2)}`
        });

        await supabase.from('bookings').update(bookingToDb(booking)).eq('id', id);
    }
};



export const uploadMaterialForBooking = async (id: string, fileNames: string[]) => {
    const booking = await getBookingById(id);
    if (booking) {
        booking.media_files = fileNames;
        booking.status = 'Concluído';
        booking.history.push({ timestamp: new Date().toISOString(), actor: 'Sistema', notes: 'Material entregue' });
        await supabase.from('bookings').update(bookingToDb(booking)).eq('id', id);

        // NOTIFICATION: WhatsApp to Client (Completion)
        const client = await getClientById(booking.client_id);
        if (client) {
            if (client.phone) {
                notifyClientBookingCompleted(booking, client.name, client.phone);
            }
            // 📧 Send Photo Delivery Email
            console.log('📧 Sending photo delivery email to:', client.email);
            // Verify if dropbox link exists, if not, use a fallback call-to-action or wait for it
            // For now, we assume the link is in booking.dropboxFolderLink or booking.media_files
            import('./emailService').then(({ sendPhotoDelivery }) => {
                sendPhotoDelivery(booking, client, booking.dropboxFolderLink || '').catch(err => console.error('❌ Failed to send delivery email:', err));
            });
        }
    }
    return booking!;
};

export const deliverAndCompleteBooking = async (id: string, fileNames: string[], actor: string) => {
    const booking = await getBookingById(id);
    if (booking) {
        booking.media_files = fileNames;
        booking.status = 'Concluído';
        booking.history.push({ timestamp: new Date().toISOString(), actor: actor as HistoryActor, notes: 'Material entregue e finalizado' });

        const client = await getClientById(booking.client_id);
        // TODO: Referral logic

        generateTasksFromBooking(booking);
        await supabase.from('bookings').update(bookingToDb(booking)).eq('id', id);
    }
};

export const addTipToBooking = async (id: string, amount: number) => {
    const booking = await getBookingById(id);
    if (booking) {
        booking.tipAmount = (booking.tipAmount || 0) + amount;
        booking.photographerPayout = (booking.total_price * 0.6) + booking.tipAmount;

        const client = await getClientById(booking.client_id);

        if (client && client.paymentType === 'Pré-pago' && booking.status === 'Confirmado') {
            await addFunds(client.id, amount, 'Debit', `Gorjeta Agendamento #${booking.id.slice(0, 8)}`, 'Sistema');
        }

        await supabase.from('bookings').update(bookingToDb(booking)).eq('id', id);
    }
    return booking;
};

export const updateKeyStatus = async (bookingId: string, status: 'WITH_PHOTOGRAPHER' | 'RETURNED') => {
    const booking = await getBookingById(bookingId);
    if (booking) {
        booking.keyState = status;
        const message = status === 'WITH_PHOTOGRAPHER' ? 'Chave retirada pelo fotógrafo' : 'Chave devolvida pelo fotógrafo';
        booking.history.push({ timestamp: new Date().toISOString(), actor: 'Fotógrafo', notes: message });
        await supabase.from('bookings').update(bookingToDb(booking)).eq('id', bookingId);
    }
};

export const reassignBooking = async (bookingId: string, newPhotographerId: string) => {
    const booking = await getBookingById(bookingId);
    if (booking) {
        booking.photographer_id = newPhotographerId;
        booking.history.push({ timestamp: new Date().toISOString(), actor: 'Admin', notes: `Fotógrafo alterado para ${newPhotographerId}` });
        await supabase.from('bookings').update(bookingToDb(booking)).eq('id', bookingId);

        // Notify new photographer
        notifyPhotographerNewBooking(booking, newPhotographerId);
    }
};

export const getContextualUpsells = async (booking: Booking): Promise<Service[]> => {
    const services = await getServices();
    return services.filter(s => !booking.service_ids.includes(s.id) && s.id === 'video_reels');
};

export const getBookingDuration = async (serviceIds: string[]): Promise<number> => {
    const services = await getServices();
    return services.filter(s => serviceIds.includes(s.id)).reduce((sum, s) => sum + s.duration_minutes, 0);
};

// --- AI ---
export const generateMarketingDescription = async (bookingId: string): Promise<string> => {
    const booking = await getBookingById(bookingId);
    if (!booking || !booking.media_files || booking.media_files.length === 0) {
        throw new Error("No media files found");
    }
    await new Promise(resolve => setTimeout(resolve, 2000));
    return "Descrição gerada por IA: Este imóvel espetacular conta com amplos espaços...";
};
