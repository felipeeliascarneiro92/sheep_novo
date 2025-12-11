
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { loadGoogleMapsScript, getAvailableSlots, createBooking, getServices, getClientById, confirmPrepaidBooking, getBrokersForClient, NEGATIVE_BALANCE_LIMIT, findNearestAvailablePhotographer, getBookingDuration, validateCoupon, getPhotographerById } from '../services/bookingService';
import { createAsaasCharge, createAsaasCustomer, cancelAsaasCharge } from '../services/asaasService';
import { supabase } from '../services/supabase';
import { Service, Booking, ServiceCategory, Broker, Client } from '../types';
import { MapPinIcon, CheckCircleIcon, ClockIcon, XIcon, CameraIcon, UserIcon, CalendarIcon, DollarSignIcon, BarcodeIcon, AlertTriangleIcon, RefreshCwIcon, TicketIcon, LoaderIcon, SparklesIcon, CopyIcon } from './icons';
import Calendar from './Calendar';
import WeatherWidget from './WeatherWidget';
import ServiceAddons, { ADDONS } from './ServiceAddons';

const serviceCategories: ServiceCategory[] = ['Foto', 'Vídeo', 'Aéreo', 'Pacotes', 'Outros'];
declare var google: any;

const upsellMap: Record<string, string[]> = {
    'foto_profissional': ['video_tour', 'tour_360', 'drone'],
    'video_tour': ['drone', 'foto_profissional'],
    'drone': ['video_tour', 'foto_profissional'],
    'tour_360': ['planta_baixa'],
    // Add mappings for potential new services if their IDs are known or standardized
    'foto_premium': ['video_tour', 'tour_360', 'drone'],
};

interface BookingUser {
    role: 'client' | 'broker';
    id: string; // client ID or broker ID
    clientId: string; // The parent client ID (imobiliária)
}

interface BookingPageProps {
    user: BookingUser;
    mode?: string; // 'flash' or undefined
    onBookingSuccess: (bookingId: string) => void; // Trigger navigation to details
}

const PaymentModal: React.FC<{ booking: Booking, user: BookingUser, onConfirm: () => void, onClose: () => void, amountToPay?: number }> = ({ booking, user, onConfirm, onClose, amountToPay }) => {
    const [loading, setLoading] = useState(true);
    const [paymentData, setPaymentData] = useState<{ id: string, pixQrCodeUrl?: string, pixPayload?: string, invoiceUrl: string } | null>(null);
    const [error, setError] = useState('');
    const [copied, setCopied] = useState(false);
    const chargeCreated = React.useRef(false);

    useEffect(() => {
        if (chargeCreated.current) return;
        chargeCreated.current = true;

        const initPayment = async () => {
            try {
                const client = await getClientById(user.clientId);
                if (!client) throw new Error("Cliente não encontrado");

                let asaasId = client.asaasCustomerId;
                if (!asaasId) {
                    asaasId = await createAsaasCustomer(client);
                }

                const value = amountToPay || booking.total_price;
                const charge = await createAsaasCharge(
                    asaasId,
                    value,
                    new Date().toISOString().split('T')[0],
                    `Pagamento Agendamento #${booking.id.slice(0, 8)}`,
                    'PIX'
                );

                setPaymentData(charge);
            } catch (err) {
                console.error("Erro ao gerar Pix:", err);
                setError("Erro ao gerar QR Code. Tente novamente.");
                chargeCreated.current = false; // Reset on error to allow retry
            } finally {
                setLoading(false);
            }
        };

        initPayment();
    }, [booking, user.clientId, amountToPay]);

    // Realtime Listener
    useEffect(() => {
        if (!paymentData) return;

        const subscription = supabase
            .channel('booking_payment_confirmation')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'transactions',
                    filter: `client_id=eq.${user.clientId}`
                },
                (payload) => {
                    console.log('Payment confirmed via Realtime:', payload);
                    // Check if amount matches roughly (optional but good)
                    // For now, assume any credit transaction means they paid.
                    if (payload.new.type === 'Credit') {
                        onConfirm();
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(subscription);
        };
    }, [paymentData, user.clientId, onConfirm]);

    const handleCancel = async () => {
        if (paymentData?.id) {
            setLoading(true);
            await cancelAsaasCharge(paymentData.id);
        }
        onClose();
    };

    const handleCopyPix = () => {
        if (paymentData?.pixPayload) {
            navigator.clipboard.writeText(paymentData.pixPayload);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-fade-in-fast p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6 sm:p-8 w-full max-w-md" onClick={e => e.stopPropagation()}>
                <div className="text-center">
                    <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Pagamento Pendente</h3>
                    <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Para confirmar seu agendamento, por favor, realize o pagamento via Pix.</p>
                </div>

                <div className="mt-6 flex flex-col items-center min-h-[250px] justify-center">
                    {loading ? (
                        <div className="flex flex-col items-center gap-3">
                            <LoaderIcon className="w-10 h-10 text-purple-600 animate-spin" />
                            <p className="text-sm text-slate-500">Gerando QR Code...</p>
                        </div>
                    ) : error ? (
                        <div className="text-red-500 text-center">
                            <AlertTriangleIcon className="w-10 h-10 mx-auto mb-2" />
                            <p>{error}</p>
                        </div>
                    ) : paymentData ? (
                        <>
                            <div className="p-4 bg-white border border-slate-200 rounded-lg shadow-sm">
                                {paymentData.pixQrCodeUrl ? (
                                    <img src={paymentData.pixQrCodeUrl} alt="QR Code Pix" className="w-48 h-48 object-contain" />
                                ) : (
                                    <div className="w-48 h-48 flex items-center justify-center bg-slate-100 text-slate-400 text-xs">QR Code Indisponível</div>
                                )}
                            </div>

                            {paymentData.pixPayload && (
                                <button
                                    onClick={handleCopyPix}
                                    className="mt-4 flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-200 transition-colors"
                                >
                                    {copied ? <CheckCircleIcon className="w-4 h-4 text-green-500" /> : <CopyIcon className="w-4 h-4" />}
                                    {copied ? 'Copiado!' : 'Copiar Código Pix'}
                                </button>
                            )}
                            <p className="mt-4 font-bold text-2xl text-slate-800 dark:text-slate-100">R$ {(amountToPay || booking.total_price).toFixed(2)}</p>
                            <p className="text-xs text-slate-400 mt-2 animate-pulse">Aguardando confirmação do pagamento...</p>
                            <div className="mt-4 w-full bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-3 rounded-lg text-left text-xs text-blue-800 dark:text-blue-200 flex gap-2">
                                <AlertTriangleIcon className="w-4 h-4 flex-shrink-0" />
                                <p>Assim que você pagar no banco, esta tela confirmará automaticamente.</p>
                            </div>

                            <button
                                onClick={async () => {
                                    setLoading(true);
                                    try {
                                        // Manual check: fetch client balance
                                        const client = await getClientById(user.clientId);
                                        if (client) {
                                            const deficit = (amountToPay || booking.total_price) - client.balance;
                                            // Tolerance of 1 real or just check if balance increased? 
                                            // Let's check if balance is sufficient now.
                                            if (client.balance >= (amountToPay || booking.total_price)) {
                                                onConfirm();
                                            } else {
                                                // Check for recent transaction
                                                const { data: recentTrans } = await supabase
                                                    .from('transactions')
                                                    .select('*')
                                                    .eq('client_id', user.clientId)
                                                    .order('date', { ascending: false })
                                                    .limit(1)
                                                    .single();

                                                if (recentTrans && new Date(recentTrans.date).getTime() > new Date().getTime() - 5 * 60000 && recentTrans.type === 'Credit') {
                                                    onConfirm();
                                                } else {
                                                    alert("Pagamento ainda não identificado. Aguarde alguns instantes e tente novamente.");
                                                }
                                            }
                                        }
                                    } catch (e) {
                                        console.error(e);
                                    } finally {
                                        setLoading(false);
                                    }
                                }}
                                className="mt-4 w-full bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-semibold py-2 rounded-lg transition-colors text-sm"
                            >
                                Já realizei o pagamento
                            </button>
                        </>
                    ) : null}
                </div>

                <div className="mt-6">
                    <button onClick={handleCancel} className="w-full inline-flex justify-center rounded-md border border-red-300 dark:border-red-800 shadow-sm px-4 py-2.5 bg-white dark:bg-slate-700 text-base font-medium text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20">
                        Cancelar
                    </button>
                </div>
            </div>
        </div>
    );
};


const BookingPage: React.FC<BookingPageProps> = ({ user, mode, onBookingSuccess }) => {
    const isFlashMode = mode === 'flash';
    const [address, setAddress] = useState<string>("");
    const [selectedLocation, setSelectedLocation] = useState<{ lat: number, lng: number } | null>(null);
    const [isAddressValid, setIsAddressValid] = useState<boolean>(false);
    const [addressError, setAddressError] = useState<string>("");
    // New state for travel fee
    const [hasTravelFee, setHasTravelFee] = useState(false);
    // New state for addons
    const [addons, setAddons] = useState<string[]>([]);
    const [isBadWeather, setIsBadWeather] = useState(false);

    const [googleApiLoaded, setGoogleApiLoaded] = useState(false);

    const [allServices, setAllServices] = useState<Service[]>([]);

    // Initialize services based on default or Flash mode
    const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);

    const [selectedDate, setSelectedDate] = useState<Date>(new Date());

    const [activeCategory, setActiveCategory] = useState<ServiceCategory>('Foto');
    const [loading, setLoading] = useState<boolean>(false);
    const [slotsResult, setSlotsResult] = useState<string[] | null>(null);
    // const [bookingConfirmation, setBookingConfirmation] = useState<Booking | null>(null); // Removed, now we redirect
    const [paymentModalBooking, setPaymentModalBooking] = useState<{ booking: Booking, amount: number } | null>(null);

    const [isAccompanied, setIsAccompanied] = useState<string>('no');
    const [brokers, setBrokers] = useState<Broker[]>([]);
    const [selectedBroker, setSelectedBroker] = useState<string>('');
    const [customBrokerName, setCustomBrokerName] = useState('');
    const [unitDetails, setUnitDetails] = useState<string>('');
    const [suggestedServices, setSuggestedServices] = useState<Service[]>([]);

    const autocompleteInputRef = useRef<HTMLInputElement>(null);
    const autocompleteInstanceRef = useRef<any>(null);

    const [isConfirmationModalOpen, setIsConfirmationModalOpen] = useState(false);
    const [bookingDetailsToConfirm, setBookingDetailsToConfirm] = useState<{ slot: string } | null>(null);
    const [paymentChoice, setPaymentChoice] = useState<'pay_now' | 'pay_later'>('pay_now');

    // Coupon States
    const [couponCode, setCouponCode] = useState('');
    const [appliedCoupon, setAppliedCoupon] = useState<{ code: string, discount: number } | null>(null);
    const [couponMessage, setCouponMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);


    const [client, setClient] = useState<Client | null>(null);

    useEffect(() => {
        const initData = async () => {
            const services = await getServices();
            setAllServices(services);

            // Auto-select default service (Fotografia Profissional) by NAME, not ID
            const defaultService = services.find(s => s.name === 'Fotografia Profissional') || services[0];
            const flashFee = services.find(s => s.id === 'taxa_flash' || s.name === 'Taxa Flash');

            if (defaultService) {
                let initialIds = [defaultService.id];
                if (isFlashMode && flashFee) {
                    initialIds.push(flashFee.id);
                }
                setSelectedServiceIds(initialIds);
            }

            const fetchedBrokers = await getBrokersForClient(user.clientId);
            setBrokers(fetchedBrokers);
            if (fetchedBrokers.length > 0) {
                setSelectedBroker(fetchedBrokers[0].name);
            }

            const c = await getClientById(user.clientId);
            setClient(c || null);
        };
        initData();
    }, [user.clientId, isFlashMode]);

    useEffect(() => {
        const initAutocomplete = async () => {
            if (!autocompleteInputRef.current) return;

            try {
                // Ensure Google Maps is loaded
                if (!(window as any).google || !(window as any).google.maps) {
                    await loadGoogleMapsScript();
                }

                const { Autocomplete } = await (window as any).google.maps.importLibrary("places") as google.maps.PlacesLibrary;

                autocompleteInstanceRef.current = new Autocomplete(
                    autocompleteInputRef.current, { types: ['address'], componentRestrictions: { country: 'br' } }
                );

                autocompleteInstanceRef.current.addListener('place_changed', () => {
                    const place = autocompleteInstanceRef.current.getPlace();
                    if (place?.geometry?.location) {
                        setAddress(place.formatted_address || '');
                        setSelectedLocation({ lat: place.geometry.location.lat(), lng: place.geometry.location.lng() });

                        // Address Validation Logic
                        const components = place.address_components || [];
                        const hasNumber = components.some((c: any) => c.types.includes('street_number'));

                        if (hasNumber) {
                            setIsAddressValid(true);
                            setAddressError('');
                        } else {
                            // Location is found but number is missing.
                            // We keep the location (lat/lng) but invalidate the form until user types the number.
                            setIsAddressValid(false);
                            setAddressError('⚠️ O número do imóvel é obrigatório. Digite-o no campo acima.');
                            // Focus back to input for better UX
                            autocompleteInputRef.current?.focus();
                        }

                        // --- TRAVEL FEE LOGIC ---
                        let city = '';
                        if (place.address_components) {
                            for (const component of place.address_components) {
                                if (component.types.includes('administrative_area_level_2')) {
                                    city = component.long_name;
                                    break;
                                }
                            }
                        }

                        // If city is found and NOT Curitiba, apply fee
                        if (city && !city.toLowerCase().includes('curitiba')) {
                            setHasTravelFee(true);
                            setSelectedServiceIds(prev => {
                                if (!prev.includes('deslocamento')) return [...prev, 'deslocamento'];
                                return prev;
                            });
                        } else {
                            setHasTravelFee(false);
                            setSelectedServiceIds(prev => prev.filter(id => id !== 'deslocamento'));
                        }
                        // ------------------------

                    } else {
                        setAddress(autocompleteInputRef.current?.value || '');
                        setIsAddressValid(false);
                        setSelectedLocation(null);
                        setHasTravelFee(false);
                    }
                });
            } catch (error) {
                console.error("Error initializing Google Maps Autocomplete:", error);
            }
        };

        loadGoogleMapsScript().then(() => {
            setGoogleApiLoaded(true);
            initAutocomplete();
        }).catch(error => {
            console.error("Could not load Google Maps script for booking page", error);
            setGoogleApiLoaded(false);
        });

    }, []);

    // Calculate target location for photographer search logic (property vs office)
    const targetLocation = useMemo(() => {
        if (selectedServiceIds.includes('retirar_chaves')) {
            if (client?.address.lat && client?.address.lng) {
                return { lat: client.address.lat, lng: client.address.lng };
            }
        }
        return selectedLocation;
    }, [selectedLocation, selectedServiceIds, client]);

    useEffect(() => {
        if (isFlashMode) return; // Flash mode uses different logic handled in confirm

        const fetchSlots = () => {
            if (!targetLocation || selectedServiceIds.length === 0 || !selectedDate || !isAddressValid) {
                setSlotsResult(null);
                return;
            }
            setLoading(true);
            const timer = setTimeout(async () => {
                const dateString = selectedDate.toISOString().split('T')[0];
                const result = await getAvailableSlots(targetLocation, selectedServiceIds, dateString, user.clientId);
                setSlotsResult(result);
                setLoading(false);
            }, 300);
            return () => clearTimeout(timer);
        };
        fetchSlots();
    }, [targetLocation, selectedServiceIds, selectedDate, isAddressValid, isFlashMode]);

    useEffect(() => {
        // Create a map of Name -> ID to handle dynamic IDs (UUIDs)
        const nameToId = new Map<string, string>();
        allServices.forEach(s => nameToId.set(s.name, s.id));

        const suggestions = new Set<string>();

        const addSuggestion = (name: string) => {
            // Try to find exact match
            let sId = nameToId.get(name);

            // If not found, try to find a service that CONTAINS the name (fuzzy match)
            if (!sId) {
                const found = allServices.find(s => s.name.toLowerCase().includes(name.toLowerCase()));
                if (found) sId = found.id;
            }

            if (sId && !selectedServiceIds.includes(sId)) {
                suggestions.add(sId);
            }
        };

        selectedServiceIds.forEach(id => {
            const service = allServices.find(s => s.id === id);
            if (!service) return;

            // Rule 1: Fotografia Profissional -> Vídeo Curto
            if (service.name === 'Fotografia Profissional') {
                addSuggestion('Vídeo Curto');
                addSuggestion('Vídeo Curto (Reels)'); // Try variation
            }

            // Rule 2: Fotografia Premium -> Reels
            if (service.name === 'Fotografia Premium') {
                addSuggestion('Reels');
                addSuggestion('Vídeo Reels'); // Try variation
            }

            // Rule 3: Aérea (Any aerial service) -> Vídeo Aéreo
            if (service.name.includes('Aérea') || service.name.includes('Drone')) {
                addSuggestion('Vídeo Aéreo');
            }

            // Rule 4: Pacotes -> Narração Extra, Demarcação de Terreno
            if (service.category === 'Pacotes') {
                addSuggestion('Narração Extra');
                addSuggestion('Demarcação de Terreno');
            }
        });

        // Filter out 'deslocamento' and 'taxa_flash' from suggestions just in case
        const suggested = allServices.filter(s => suggestions.has(s.id) && s.id !== 'deslocamento' && s.id !== 'taxa_flash');
        setSuggestedServices(suggested);
    }, [selectedServiceIds, allServices]);

    const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newVal = e.target.value;
        setAddress(newVal);

        if (!googleApiLoaded) {
            // Fallback: Allow manual entry if Google Maps fails to load
            const isValid = newVal.length > 5;
            setIsAddressValid(isValid);
            // Set dummy location so logic proceeds, using a central coordinate
            if (isValid) {
                setSelectedLocation({ lat: -25.4284, lng: -49.2733 });
            } else {
                setSelectedLocation(null);
            }
        } else {
            // Logic: If we have a location selected from maps, allow the user to edit the text (e.g. append number)
            // without losing the lat/lng immediately.
            if (selectedLocation) {
                // Check if there is a number in the string now
                const hasNumber = /\d+/.test(newVal);
                if (hasNumber) {
                    setIsAddressValid(true);
                    setAddressError('');
                } else {
                    setIsAddressValid(false);
                    setAddressError('⚠️ Adicione o número predial.');
                }

                // If user clears input significantly, reset location
                if (newVal.length < 5) {
                    setSelectedLocation(null);
                    setHasTravelFee(false);
                    setIsAddressValid(false);
                    setAddressError('');
                }
            } else {
                setIsAddressValid(false);
                setAddressError('');
            }
        }
    }

    const { selectedServices, totalPrice, totalDuration } = useMemo(() => {
        // Filter the services from the 'allServices' state which might be limited to "visible" ones
        // However, for hidden fees like 'deslocamento', we need to fetch from the full list if active
        let services = allServices.filter(s => selectedServiceIds.includes(s.id));

        // Manually add hidden services (like automatic fees) if they are in selectedServiceIds
        // but not in 'allServices' (because they are isVisibleToClient: false)
        // Note: getServices() is async now, so we can't call it here. 
        // We should assume allServices contains everything or we need another way.
        // Ideally, allServices should contain everything but we filter for display.
        // But line 110 filters: setAllServices(getServices().filter(s => s.isVisibleToClient));
        // So we might be missing hidden services.
        // FIX: We should probably fetch ALL services in initData and filter in render, or keep two lists.
        // For now, let's assume hidden services are not in allServices and we can't fetch them synchronously.
        // This is a problem. 
        // Solution: In initData, setAllServices to ALL services, and use a derived variable for display.

        // For this refactor step, I will assume allServices has what we need or I will fix initData later.
        // Actually, I should fix initData to store all services.

        const hiddenIds = ['deslocamento', 'taxa_flash'];
        hiddenIds.forEach(hiddenId => {
            if (selectedServiceIds.includes(hiddenId) && !services.find(s => s.id === hiddenId)) {
                // Manually add missing service with default fallbacks
                services.push({
                    id: hiddenId,
                    name: hiddenId === 'deslocamento' ? 'Taxa de Deslocamento' : 'Taxa Flash',
                    price: hiddenId === 'deslocamento' ? 40.00 : 80.00,
                    duration_minutes: 0,
                    category: 'Outros',
                    status: 'Ativo',
                    isVisibleToClient: false
                });
            }
        });

        // Temporary fix: If hidden service is selected but not in services, we create a dummy one or we need to ensure they are in allServices.
        // I'll update initData in next step to fetch ALL services.

        let price = services.reduce((sum, service) => {
            // CRITICAL: Check client's custom price table for EVERY service, including automatic fees.
            const customPrice = client?.customPrices?.[service.id];
            return sum + (customPrice !== undefined ? customPrice : service.price);
        }, 0);

        // Calculate ADDONS Price
        const addonsPrice = addons.reduce((sum, addonId) => {
            const addon = ADDONS.find(a => a.id === addonId);
            return sum + (addon ? addon.price : 0);
        }, 0);

        price += addonsPrice;

        const duration = services.reduce((sum, service) => sum + service.duration_minutes, 0);

        return { selectedServices: services, totalPrice: price, totalDuration: duration };
    }, [selectedServiceIds, allServices, client, addons]);

    // Calculate final price with coupon
    const finalPrice = useMemo(() => {
        if (appliedCoupon) {
            return Math.max(0, totalPrice - appliedCoupon.discount);
        }
        return totalPrice;
    }, [totalPrice, appliedCoupon]);

    const handleServiceToggle = (serviceId: string) => {
        // Prevent manually toggling hidden fees
        if (serviceId === 'deslocamento' || serviceId === 'taxa_flash') return;

        setSelectedServiceIds(prev =>
            prev.includes(serviceId)
                ? prev.filter(id => id !== serviceId)
                : [...prev, serviceId]
        );
    };

    const handleAddonToggle = (addonId: string) => {
        setAddons(prev => prev.includes(addonId) ? prev.filter(id => id !== addonId) : [...prev, addonId]);
    };

    const handleOpenConfirmationModal = (slot: string) => {
        setBookingDetailsToConfirm({ slot });
        setAppliedCoupon(null); // Reset coupon on new modal open
        setCouponCode('');
        setCouponMessage(null);

        if (client && client.paymentType === 'Pré-pago') {
            const deficit = totalPrice - client.balance;
            if (deficit > 0) setPaymentChoice('pay_now');
        }
        setIsConfirmationModalOpen(true);
    };

    const handleApplyCoupon = async () => {
        if (!couponCode.trim()) return;

        const result = await validateCoupon(couponCode, user.clientId, totalPrice, selectedServiceIds);

        if (result.valid) {
            setAppliedCoupon({ code: couponCode, discount: result.discountAmount });
            setCouponMessage({ type: 'success', text: result.message });
        } else {
            setAppliedCoupon(null);
            setCouponMessage({ type: 'error', text: result.message });
        }
    };

    const handleFlashSearch = async () => {
        if (!isAddressValid || !selectedLocation) {
            alert("Por favor, insira um endereço válido com número predial primeiro.");
            return;
        }

        // Calculate next available slot
        const result = await findNearestAvailablePhotographer(selectedLocation, totalDuration);

        if (result && result.slot) {
            handleOpenConfirmationModal(result.slot);
        } else {
            alert("Não encontramos nenhum fotógrafo com disponibilidade imediata ou próxima para hoje na sua região. Por favor, tente agendar para outro dia.");
        }
    }



    const handlePaymentConfirmed = async () => {
        if (!paymentModalBooking) return;
        const confirmedBooking = await confirmPrepaidBooking(paymentModalBooking.booking.id);
        if (confirmedBooking) {
            setPaymentModalBooking(null);
            onBookingSuccess(confirmedBooking.id);
        } else {
            alert("Erro ao confirmar pagamento.");
        }
    }

    // Filter slots to hide past times for today
    const filteredSlots = useMemo(() => {
        if (!slotsResult) return null;

        const today = new Date();
        const isToday = selectedDate.getDate() === today.getDate() &&
            selectedDate.getMonth() === today.getMonth() &&
            selectedDate.getFullYear() === today.getFullYear();

        if (!isToday) return slotsResult;

        const currentMinutes = today.getHours() * 60 + today.getMinutes();

        return slotsResult.filter(slot => {
            const [h, m] = slot.split(':').map(Number);
            const slotMinutes = h * 60 + m;
            return slotMinutes > currentMinutes;
        });
    }, [slotsResult, selectedDate]);

    const hasAvailableSlots = filteredSlots && filteredSlots.length > 0;

    // Determine border color based on validation state
    let inputBorderColor = 'border-slate-300 focus:border-purple-500 focus:ring-purple-200';
    if (isAddressValid) {
        inputBorderColor = 'border-green-500 focus:border-green-500 focus:ring-green-200';
    } else if (addressError) {
        inputBorderColor = 'border-red-500 focus:border-red-500 focus:ring-red-200';
    }

    const addressInputClasses = `w-full pl-10 pr-10 py-2 border rounded-lg shadow-sm transition-all outline-none focus:ring-2 ${inputBorderColor}`;

    const hasKeyPickup = selectedServiceIds.includes('retirar_chaves');

    const [bookingSuccessData, setBookingSuccessData] = useState<Booking | null>(null);

    // --- LOADING & SUCCESS STATES ---
    const [isProcessingBooking, setIsProcessingBooking] = useState(false);
    const [whatsappLink, setWhatsappLink] = useState('');



    const handleConfirmBooking = async () => {
        if (!bookingDetailsToConfirm || !selectedLocation) {
            alert("Erro: detalhes da reserva incompletos.");
            return;
        }

        setIsConfirmationModalOpen(false);
        setIsProcessingBooking(true);

        // Artificial delay for "nice animation" sensation if request is too fast
        const startTime = Date.now();

        try {
            const { slot } = bookingDetailsToConfirm;
            const brokerName = isAccompanied === 'yes' ? (selectedBroker === 'outro' ? customBrokerName : selectedBroker) : undefined;
            const isPrePaid = client?.paymentType === 'Pré-pago';
            let forcedStatus: 'Confirmado' | undefined = undefined;
            if (isPrePaid && paymentChoice === 'pay_later') {
                forcedStatus = 'Confirmado';
            }

            const finalServiceIds = [...selectedServiceIds, ...addons];

            const booking = await createBooking(
                finalServiceIds,
                isFlashMode ? new Date().toISOString().split('T')[0] : selectedDate.toISOString().split('T')[0],
                slot,
                address,
                selectedLocation,
                isAccompanied === 'yes',
                brokerName,
                unitDetails,
                user.clientId,
                user.role === 'broker' ? user.id : undefined,
                forcedStatus,
                isFlashMode,
                appliedCoupon?.code
            );

            // Ensure at least 1.5s of loading animation
            const elapsed = Date.now() - startTime;
            if (elapsed < 1500) await new Promise(r => setTimeout(r, 1500 - elapsed));

            if (booking) {
                // Fetch Photographer Details for WhatsApp Message
                let photographerRg = '';
                let photographerName = 'A definir';
                if (booking.photographer_id) {
                    try {
                        const p = await getPhotographerById(booking.photographer_id);
                        if (p) {
                            photographerRg = p.rg;
                            photographerName = p.name;
                        }
                    } catch (e) { console.error('Error fetching photographer', e); }
                } else if (booking.photographer_name) {
                    photographerName = booking.photographer_name;
                }

                // Construct WhatsApp Message
                const phone = "5541999999999";
                const dateFormatted = new Date(booking.date + 'T' + booking.start_time).toLocaleString('pt-BR');
                const msg = `Olá! Realizei um novo agendamento.\n\n` +
                    `Data: ${dateFormatted}\n` +
                    `Fotógrafo: ${photographerName}\n` +
                    `RG: ${photographerRg || 'N/A'}\n` +
                    `Local: ${booking.address}`;

                setWhatsappLink(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`);

                const deficit = isPrePaid && client ? Math.max(0, finalPrice - client.balance) : 0;

                if (booking.status === 'Pendente' && deficit > 0) {
                    // Go to Payment Flow
                    setIsProcessingBooking(false);
                    setPaymentModalBooking({ booking, amount: deficit });
                } else {
                    // Success! Show Success Modal
                    setIsProcessingBooking(false);
                    setBookingSuccessData(booking);
                }
            } else {
                setIsProcessingBooking(false);
                alert(isFlashMode ? "Erro ao confirmar o agendamento Flash. Tente novamente." : "Não foi possível criar o agendamento.");
            }
        } catch (error) {
            console.error(error);
            setIsProcessingBooking(false);
            alert("Ocorreu um erro inesperado.");
        }
    };

    return (
        <div className="space-y-8 animate-fade-in">
            {/* --- LOADING MODAL --- */}
            {isProcessingBooking && (
                <div className="fixed inset-0 bg-white/90 dark:bg-slate-900/90 flex flex-col items-center justify-center z-[60] animate-fade-in backdrop-blur-sm">
                    <div className="relative">
                        <div className="w-24 h-24 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
                        <div className="absolute inset-0 flex items-center justify-center">
                            {/* CAMERA ICON instead of Sparkles */}
                            <CameraIcon className="w-8 h-8 text-purple-600 animate-pulse" />
                        </div>
                    </div>
                    <h3 className="mt-8 text-2xl font-bold text-slate-800 dark:text-slate-100 animate-pulse">Processando Agendamento...</h3>
                    <p className="text-slate-500 dark:text-slate-400 mt-2">Estamos confirmando a disponibilidade do fotógrafo.</p>
                </div>
            )}

            {/* --- SUCCESS MODAL --- */}
            {bookingSuccessData && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] animate-fade-in p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-8 w-full max-w-md text-center transform transition-all scale-100">
                        <div className="mx-auto w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-6 animate-bounce-slow">
                            <CheckCircleIcon className="w-10 h-10 text-green-600 dark:text-green-400" />
                        </div>

                        <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Agendamento Realizado!</h2>
                        <p className="text-slate-600 dark:text-slate-300 mb-8">
                            Seu agendamento foi confirmado e já notificamos a equipe.
                        </p>

                        <div className="space-y-3">
                            <a
                                href={whatsappLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-center gap-2 w-full bg-[#25D366] hover:bg-[#128C7E] text-white font-bold py-3 rounded-xl transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                            >
                                {/* Simple WhatsApp Icon SVG inline if needed or imported */}
                                <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" /></svg>
                                Enviar Comprovante via WhatsApp
                            </a>

                            <button
                                onClick={() => onBookingSuccess(bookingSuccessData.id)} // Proceed to details
                                className="w-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-semibold py-3 rounded-xl transition-colors"
                            >
                                Ver Detalhes do Agendamento
                            </button>
                        </div>
                    </div>
                </div>
            )}


            {paymentModalBooking && <PaymentModal booking={paymentModalBooking.booking} user={user} amountToPay={paymentModalBooking.amount} onConfirm={handlePaymentConfirmed} onClose={() => setPaymentModalBooking(null)} />}

            {isConfirmationModalOpen && bookingDetailsToConfirm && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-fade-in-fast p-4" onClick={() => setIsConfirmationModalOpen(false)}>
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6 sm:p-8 w-full max-w-lg transform transition-all" onClick={e => e.stopPropagation()}>
                        <div className="flex items-start justify-between">
                            <div>
                                <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Confirmar Agendamento {isFlashMode && 'Flash ⚡'}</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Por favor, revise os detalhes abaixo.</p>
                            </div>
                            <button onClick={() => setIsConfirmationModalOpen(false)} className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 -mt-1 -mr-2"><XIcon className="w-5 h-5 text-slate-500 dark:text-slate-400" /></button>
                        </div>

                        <div className={`mt-6 space-y-4 p-4 rounded-lg border ${isFlashMode ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800' : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700'}`}>
                            <div className="flex items-start gap-3"><MapPinIcon className="w-5 h-5 text-slate-500 dark:text-slate-400 flex-shrink-0 mt-0.5" /><p className="font-semibold text-slate-700 dark:text-slate-200">{address}</p></div>
                            <div className="flex items-start gap-3">
                                <CalendarIcon className="w-5 h-5 text-slate-500 dark:text-slate-400 flex-shrink-0 mt-0.5" />
                                <p className="font-semibold text-slate-700 dark:text-slate-200">
                                    {isFlashMode ? 'HOJE' : selectedDate.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
                                </p>
                            </div>
                            <div className="flex items-start gap-3">
                                <ClockIcon className="w-5 h-5 text-slate-500 dark:text-slate-400 flex-shrink-0 mt-0.5" />
                                <p className="font-bold text-slate-800 dark:text-slate-100 text-lg">
                                    {bookingDetailsToConfirm.slot}
                                    {isFlashMode && <span className="text-xs font-normal text-amber-700 dark:text-amber-400 ml-2">(Próximo horário disponível)</span>}
                                </p>
                            </div>
                        </div>

                        {hasKeyPickup && (
                            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 dark:border-blue-400 text-blue-800 dark:text-blue-200 rounded-r-md text-sm flex items-start gap-3">
                                <ClockIcon className="w-5 h-5 flex-shrink-0 mt-0.5" />
                                <div>
                                    <span className="font-bold block">Retirada de Chaves</span>
                                    O prazo padrão para devolução das chaves é de até 48h após a sessão.
                                </div>
                            </div>
                        )}

                        <div className="mt-4">
                            <h4 className="font-semibold text-slate-600 dark:text-slate-300 mb-2">Serviços:</h4>
                            <ul className="space-y-1 text-sm text-slate-800 dark:text-slate-200">
                                {selectedServices.map(s => {
                                    const customPrice = client?.customPrices?.[s.id];
                                    const priceToDisplay = customPrice !== undefined ? customPrice : s.price;

                                    return (
                                        <li key={s.id} className="flex justify-between">
                                            <span>{s.name} {s.id === 'taxa_flash' ? '⚡' : ''}</span>
                                            <span className="font-medium">R$ {priceToDisplay.toFixed(2)}</span>
                                        </li>
                                    )
                                })}
                                {/* List Selected Addons */}
                                {addons.map(addonId => {
                                    const addon = ADDONS.find(a => a.id === addonId);
                                    if (!addon) return null;
                                    return (
                                        <li key={addon.id} className="flex justify-between text-purple-700 dark:text-purple-400">
                                            <span className="flex items-center gap-1"><SparklesIcon className="w-3 h-3" /> {addon.title}</span>
                                            <span className="font-medium">R$ {addon.price.toFixed(2)}</span>
                                        </li>
                                    );
                                })}
                            </ul>
                            {hasTravelFee && <p className="text-xs text-amber-600 dark:text-amber-400 mt-2 italic">* Inclui taxa de deslocamento.</p>}
                        </div>

                        <div className="mt-4 border-t border-slate-200 pt-4">
                            <ServiceAddons
                                selectedAddons={addons}
                                onToggle={handleAddonToggle}
                                filterIds={['entrega_express']}
                                title="Precisa de urgência na entrega?"
                            />
                        </div>

                        {/* COUPON SECTION */}
                        <div className="mt-4 py-3 border-t border-slate-200 dark:border-slate-700">
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                                <TicketIcon className="w-4 h-4 text-purple-600 dark:text-purple-400" /> Possui cupom de desconto?
                            </label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={couponCode}
                                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                                    placeholder="Digite o código"
                                    className="flex-1 p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm uppercase"
                                    disabled={!!appliedCoupon}
                                />
                                {appliedCoupon ? (
                                    <button onClick={() => { setAppliedCoupon(null); setCouponCode(''); setCouponMessage(null); }} className="px-3 py-2 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg text-sm font-bold hover:bg-red-200 dark:hover:bg-red-900/50">Remover</button>
                                ) : (
                                    <button onClick={handleApplyCoupon} className="px-3 py-2 bg-slate-800 dark:bg-slate-700 text-white rounded-lg text-sm font-bold hover:bg-slate-700 dark:hover:bg-slate-600">Aplicar</button>
                                )}
                            </div>
                            {couponMessage && (
                                <p className={`text-xs mt-1 font-medium ${couponMessage.type === 'success' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                    {couponMessage.text}
                                </p>
                            )}
                        </div>

                        <div className="border-t border-slate-200 dark:border-slate-700 mt-2 pt-4 flex flex-col gap-1">
                            {appliedCoupon && (
                                <div className="flex justify-between items-center text-sm text-green-600 dark:text-green-400">
                                    <span>Desconto:</span>
                                    <span>- R$ {appliedCoupon.discount.toFixed(2)}</span>
                                </div>
                            )}
                            <div className="flex justify-between items-baseline">
                                <span className="font-bold text-slate-800 dark:text-slate-100">Total Final:</span>
                                <span className="text-3xl font-bold gradient-text">R$ {finalPrice.toFixed(2)}</span>
                            </div>
                        </div>

                        {/* Wallet Payment Logic */}
                        {client?.paymentType === 'Pré-pago' && client && (
                            <div className="mt-4 border-t border-slate-200 dark:border-slate-700 pt-4">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-sm text-slate-600 dark:text-slate-400">Saldo em Carteira:</span>
                                    <span className={`font-bold ${client.balance < 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>R$ {client.balance.toFixed(2)}</span>
                                </div>

                                {client.balance >= finalPrice ? (
                                    <p className="text-sm text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 p-2 rounded border border-green-200 dark:border-green-800 font-medium text-center">Saldo suficiente. Débito automático.</p>
                                ) : (
                                    <div className="space-y-3">
                                        <p className="text-sm font-bold text-slate-700 dark:text-slate-200">Saldo insuficiente. Como deseja prosseguir?</p>
                                        {(() => {
                                            const deficit = finalPrice - client.balance;
                                            const projectedBalance = client.balance - finalPrice;
                                            const canPayLater = projectedBalance >= -NEGATIVE_BALANCE_LIMIT;

                                            return (
                                                <div className="flex flex-col gap-2">
                                                    <label className={`flex items-start p-3 border rounded-lg cursor-pointer transition-colors ${paymentChoice === 'pay_now' ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20' : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                                                        <input type="radio" name="payment_choice" value="pay_now" checked={paymentChoice === 'pay_now'} onChange={() => setPaymentChoice('pay_now')} className="mt-1 mr-3 h-4 w-4 text-purple-600 focus:ring-purple-500" />
                                                        <div>
                                                            <span className="block font-semibold text-slate-800 dark:text-slate-200">Pagar diferença agora</span>
                                                            <span className="text-sm text-slate-600 dark:text-slate-400">Pagar R$ {deficit.toFixed(2)} via Pix.</span>
                                                        </div>
                                                    </label>

                                                    <label className={`flex items-start p-3 border rounded-lg transition-colors ${!canPayLater ? 'opacity-50 cursor-not-allowed bg-slate-100 dark:bg-slate-800' : 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800'} ${paymentChoice === 'pay_later' && canPayLater ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20' : 'border-slate-200 dark:border-slate-700'}`}>
                                                        <input type="radio" name="payment_choice" value="pay_later" checked={paymentChoice === 'pay_later'} onChange={() => setPaymentChoice('pay_later')} disabled={!canPayLater} className="mt-1 mr-3 h-4 w-4 text-purple-600 focus:ring-purple-500" />
                                                        <div>
                                                            <span className="block font-semibold text-slate-800 dark:text-slate-200">Pagar no próximo agendamento</span>
                                                            <span className="text-sm text-slate-600 dark:text-slate-400">Seu saldo ficará negativo em <span className="text-red-600 dark:text-red-400 font-bold">R$ {projectedBalance.toFixed(2)}</span>.</span>
                                                            {!canPayLater && <span className="block text-xs text-red-500 dark:text-red-400 mt-1 font-bold flex items-center gap-1"><AlertTriangleIcon className="w-3 h-3" /> Limite de crédito excedido (Max: -R$ {NEGATIVE_BALANCE_LIMIT}).</span>}
                                                        </div>
                                                    </label>
                                                </div>
                                            );
                                        })()}
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="mt-6 flex flex-col sm:flex-row-reverse gap-3">
                            <button onClick={handleConfirmBooking} className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2.5 bg-purple-600 text-base font-medium text-white hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 sm:text-sm">
                                {isFlashMode ? 'SOLICITAR FOTÓGRAFO AGORA' : 'Confirmar Agendamento'}
                            </button>
                            <button onClick={() => setIsConfirmationModalOpen(false)} className="w-full inline-flex justify-center rounded-md border border-slate-300 dark:border-slate-600 shadow-sm px-4 py-2.5 bg-white dark:bg-slate-700 text-base font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 sm:mt-0 sm:text-sm">
                                Voltar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                <div className="lg:col-span-3 space-y-8">
                    {isFlashMode && (
                        <div className="bg-gradient-to-r from-amber-100 to-orange-100 border border-orange-300 p-4 rounded-xl flex items-center gap-4 animate-fade-in">
                            <div className="bg-white/50 p-2 rounded-full"><ClockIcon className="w-8 h-8 text-orange-600" /></div>
                            <div>
                                <h3 className="font-bold text-orange-800 text-lg">Modo Flash Ativado ⚡</h3>
                                <p className="text-orange-700 text-sm">Buscando o profissional mais próximo para o próximo horário disponível hoje.</p>
                            </div>
                        </div>
                    )}

                    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
                        <h2 className="text-xl font-bold text-slate-700 dark:text-slate-200 mb-1">1. Informações Básicas</h2>
                        <p className="text-slate-500 dark:text-slate-400 mb-6 text-sm">Selecione endereço {isFlashMode ? '' : 'e data'} para ver os horários</p>
                        <div className="space-y-6">
                            <div>
                                <label htmlFor="address" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Endereço do Imóvel</label>
                                <div className="relative">
                                    <MapPinIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                                    <input ref={autocompleteInputRef} type="text" id="address" value={address} onChange={handleAddressChange} className={`${addressInputClasses} dark:bg-slate-700 dark:border-slate-600 dark:text-white dark:placeholder-slate-400`} placeholder="Digite o endereço..." />
                                    {isAddressValid && address.length > 0 && <CheckCircleIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-green-500" />}
                                    {(!isAddressValid || addressError) && address.length > 0 && <AlertTriangleIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-red-500" />}
                                </div>

                                {addressError && (
                                    <p className="text-xs text-red-600 dark:text-red-400 mt-1 font-semibold flex items-center gap-1 animate-fade-in">
                                        <AlertTriangleIcon className="w-3 h-3" /> {addressError}
                                    </p>
                                )}

                                {!isAddressValid && !addressError && address.length > 0 && googleApiLoaded && (
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1">
                                        Selecione uma opção da lista para validar.
                                    </p>
                                )}

                                {isAddressValid && hasTravelFee && (
                                    <div className="mt-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg flex items-start gap-2 animate-fade-in">
                                        <DollarSignIcon className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                                        <div>
                                            <p className="text-sm font-bold text-amber-800 dark:text-amber-200">Taxa de Deslocamento Aplicada</p>
                                            <p className="text-xs text-amber-700 dark:text-amber-300">O endereço selecionado está fora de Curitiba. Uma taxa de R$ 40,00 foi adicionada.</p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {!isFlashMode && (
                                <div>
                                    <h3 className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Data da Sessão</h3>
                                    <Calendar selectedDate={selectedDate} onDateChange={setSelectedDate} />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* MOVED SLOTS SECTION HERE */}
                    {!isFlashMode && (
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
                            <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200 mb-4">Horários para {selectedDate.toLocaleDateString('pt-BR')}</h3>
                            {hasKeyPickup && (
                                <p className="text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 p-2 rounded mb-3 border border-blue-100 dark:border-blue-800">
                                    Buscando fotógrafos próximos à sua imobiliária para retirada de chaves.
                                </p>
                            )}
                            <div className="min-h-[100px]">
                                {loading && <p className="text-center text-slate-500 dark:text-slate-400 pt-4">Procurando horários...</p>}
                                {!loading && (
                                    hasAvailableSlots ? (
                                        <div className="space-y-4 animate-fade-in">
                                            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                                                {filteredSlots && filteredSlots.map(slot => (<button key={slot} onClick={() => handleOpenConfirmationModal(slot)} className="bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 font-medium py-2 px-2 rounded-md text-center hover:bg-purple-600 hover:text-white transition-all duration-200">{slot}</button>))}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-center text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900 p-4 rounded-lg animate-fade-in">
                                            <CameraIcon className="w-8 h-8 mx-auto text-slate-400 dark:text-slate-500 mb-2" />
                                            <p className="font-semibold text-sm">Nenhum horário encontrado</p>
                                            <p className="text-xs">Tente selecionar outra data ou serviços.</p>
                                        </div>
                                    )
                                )}
                            </div>
                        </div>
                    )}

                    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
                        <h2 className="text-xl font-bold text-slate-700 dark:text-slate-200 mb-1">2. Selecione os Serviços</h2>
                        <p className="text-slate-500 dark:text-slate-400 mb-6 text-sm">Escolha os serviços desejados para a sessão.</p>
                        <div className="border-b border-slate-200 dark:border-slate-700 mb-4"><div className="flex space-x-1 sm:space-x-4 overflow-x-auto pb-2">
                            {serviceCategories.map(cat => <button key={cat} onClick={() => setActiveCategory(cat)} className={`px-3 py-2 font-semibold text-sm rounded-t-md transition-colors whitespace-nowrap ${activeCategory === cat ? 'border-b-2 border-purple-600 dark:border-purple-400 text-purple-600 dark:text-purple-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}>{cat}</button>)}
                        </div></div>
                        <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                            {allServices.filter(s => s.category === activeCategory && s.isVisibleToClient).map(service => {
                                const customPrice = client?.customPrices?.[service.id];
                                const priceToDisplay = customPrice !== undefined ? customPrice : service.price;

                                return (
                                    <label key={service.id} htmlFor={`service-${service.id}`} className={`p-3 border rounded-lg flex items-center justify-between transition-colors cursor-pointer ${service.id === 'deslocamento' || service.id === 'taxa_flash' ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800' : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
                                        <div className="flex items-center gap-3">
                                            <input
                                                type="checkbox"
                                                id={`service-${service.id}`}
                                                checked={selectedServiceIds.includes(service.id)}
                                                onChange={() => handleServiceToggle(service.id)}
                                                className="h-5 w-5 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                                                disabled={service.id === 'deslocamento' || service.id === 'taxa_flash'}
                                            />
                                            <div>
                                                <span className="font-semibold text-slate-800 dark:text-slate-200">{service.name}</span>
                                            </div>
                                        </div>
                                        <div className="text-right"><p className="font-bold text-purple-700 dark:text-purple-400">R$ {priceToDisplay.toFixed(2)}</p></div>
                                    </label>
                                )
                            })}
                        </div>
                    </div>

                    {suggestedServices.length > 0 && <div className="bg-purple-50 dark:bg-purple-900/20 p-6 rounded-xl border border-purple-200 dark:border-purple-800 animate-fade-in">
                        <h2 className="text-xl font-bold text-purple-800 dark:text-purple-200 mb-4">✨ Que tal adicionar?</h2>
                        <div className="space-y-3">
                            {suggestedServices.map(service => {
                                const customPrice = client?.customPrices?.[service.id];
                                const priceToDisplay = customPrice !== undefined ? customPrice : service.price;

                                return (
                                    <button key={service.id} onClick={() => handleServiceToggle(service.id)} className="w-full p-3 border border-purple-200 dark:border-purple-800 rounded-lg flex items-center justify-between bg-white dark:bg-slate-800 hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-colors text-left">
                                        <div><span className="font-semibold text-slate-800 dark:text-slate-200">{service.name}</span></div>
                                        <p className="font-bold text-purple-700 dark:text-purple-300">+ R$ {priceToDisplay.toFixed(2)}</p>
                                    </button>
                                )
                            })}
                        </div>
                    </div>}



                    {isFlashMode && (
                        <div className="text-center">
                            <button onClick={handleFlashSearch} className="w-full bg-gradient-to-r from-orange-500 to-red-600 text-white font-bold py-4 rounded-lg shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all flex items-center justify-center gap-2">
                                <ClockIcon className="w-6 h-6 animate-pulse" />
                                BUSCAR PROFISSIONAL
                            </button>
                            <p className="text-xs text-slate-500 mt-2">Ao clicar, buscaremos o próximo horário disponível hoje com o fotógrafo mais próximo.</p>
                        </div>
                    )}
                </div>

                <div className="lg:col-span-2">
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 mb-6">
                        <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200 mb-4">3. Detalhes Adicionais</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Alguém irá acompanhar a sessão?</label>
                                <div className="flex gap-4"><label className="flex items-center gap-2 text-slate-700 dark:text-slate-300"><input type="radio" name="accompaniment" value="yes" checked={isAccompanied === 'yes'} onChange={e => setIsAccompanied(e.target.value)} className="h-4 w-4 text-purple-600 focus:ring-purple-500" /> Sim</label><label className="flex items-center gap-2 text-slate-700 dark:text-slate-300"><input type="radio" name="accompaniment" value="no" checked={isAccompanied === 'no'} onChange={e => setIsAccompanied(e.target.value)} className="h-4 w-4 text-purple-600 focus:ring-purple-500" /> Não</label></div>
                            </div>
                            {isAccompanied === 'yes' && <div className="animate-fade-in-fast space-y-2">
                                <label htmlFor="broker" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Corretor presente</label>
                                <select id="broker" value={selectedBroker} onChange={e => setSelectedBroker(e.target.value)} className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg shadow-sm focus:ring-purple-500 focus:border-purple-500">
                                    {brokers.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
                                    <option value="outro">Outro</option>
                                </select>
                                {selectedBroker === 'outro' && <input type="text" value={customBrokerName} onChange={e => setCustomBrokerName(e.target.value)} placeholder="Nome do corretor" className="mt-2 w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg shadow-sm focus:ring-purple-500 focus:border-purple-500" />}
                            </div>}
                            <div>
                                <label htmlFor="unit_details" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Bloco, Apto e Observações</label>
                                <textarea id="unit_details" value={unitDetails} onChange={e => setUnitDetails(e.target.value)} rows={3} className="mt-1 w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg shadow-sm focus:ring-purple-500 focus:border-purple-500" placeholder="Ex: Bloco A, Apto 123. Chave na portaria."></textarea>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 sticky top-8">
                        <h2 className="text-xl font-bold text-slate-700 dark:text-slate-200 mb-4">Resumo</h2>

                        {/* MOVED WEATHER WIDGET HERE */}
                        {!isFlashMode && (
                            <div className="mb-6 animate-fade-in-fast">
                                <WeatherWidget
                                    date={selectedDate}
                                    location={selectedLocation}
                                    onWeatherCheck={setIsBadWeather}
                                />
                                {isBadWeather && (
                                    <div className="mt-4">
                                        <ServiceAddons
                                            selectedAddons={addons}
                                            onToggle={handleAddonToggle}
                                            filterIds={['ceu_azul', 'seguro_chuva']}
                                            title="O tempo não está bom?"
                                        />
                                    </div>
                                )}
                            </div>
                        )}

                        {selectedServices.length > 0 || addons.length > 0 ? <>
                            <div className="space-y-2 mb-4">
                                {selectedServices.map(s => {
                                    const customPrice = client?.customPrices?.[s.id];
                                    const priceToDisplay = customPrice !== undefined ? customPrice : s.price;

                                    return (
                                        <div key={s.id} className={`flex justify-between items-center text-sm ${s.id === 'deslocamento' || s.id === 'taxa_flash' ? 'text-amber-700 dark:text-amber-300 font-semibold' : 'text-slate-700 dark:text-slate-300'}`}>
                                            <span>{s.name} {s.id === 'deslocamento' && '(Auto)'}</span>
                                            <span className="font-semibold">R$ {priceToDisplay.toFixed(2)}</span>
                                        </div>
                                    )
                                })}
                                {addons.map(addonId => {
                                    const addon = ADDONS.find(a => a.id === addonId);
                                    if (!addon) return null;
                                    return (
                                        <div key={addon.id} className="flex justify-between items-center text-sm text-purple-700 dark:text-purple-300 font-medium">
                                            <span className="flex items-center gap-1"><SparklesIcon className="w-3 h-3" /> {addon.title}</span>
                                            <span className="font-semibold">R$ {addon.price.toFixed(2)}</span>
                                        </div>
                                    )
                                })}
                            </div>
                            <div className="border-t border-slate-200 dark:border-slate-700 mt-3 pt-3 flex justify-between items-baseline">
                                <span className="font-bold text-slate-800 dark:text-slate-100">Total:</span><span className="text-2xl font-bold text-purple-700 dark:text-purple-400">R$ {totalPrice.toFixed(2)}</span>
                            </div>
                        </> : <p className="text-sm text-slate-500 dark:text-slate-400">Selecione um serviço para ver o preço.</p>}

                        <div className="border-t border-slate-200 dark:border-slate-700 my-6"></div>

                        <div className="animate-fade-in-fast">
                            <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200 mb-4">Detalhes Adicionais</h3>
                            <div className="space-y-4">
                                {hasKeyPickup && (
                                    <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400">
                                        <ClockIcon className="w-4 h-4" />
                                        <span>Retirada de chaves inclusa</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* MOBILE STICKY FOOTER */}
            <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] lg:hidden z-40 flex justify-between items-center">
                <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Total Estimado</p>
                    <p className="text-xl font-bold text-purple-700 dark:text-purple-400">R$ {totalPrice.toFixed(2)}</p>
                </div>
                <button
                    onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                    className="bg-purple-600 text-white px-6 py-2 rounded-lg font-bold shadow-md active:scale-95 transition-transform"
                >
                    Ver Horários
                </button>
            </div>
        </div>
    );
};

export default BookingPage;

