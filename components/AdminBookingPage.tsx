
import React, { useState, useEffect, useMemo, useRef } from 'react';
// FIX: Import getBrokers from bookingService instead of the deprecated brokerService.
import { createBooking, getServices, getClients, getPhotographers, getPhotographerById, getDailySlotsForPhotographer, isSlotFree, loadGoogleMapsScript, confirmPrepaidBooking, getBrokers, calculateDistanceKm, getClientById } from '../services/bookingService';
import { Service, ServiceCategory, Broker, Client, Photographer, Booking } from '../types';
import { MapPinIcon, CheckCircleIcon, ClockIcon, XIcon, CameraIcon, UserIcon, CalendarIcon, DollarSignIcon, ArrowLeftIcon, BarcodeIcon, SearchIcon, AlertTriangleIcon, LinkIcon, CopyIcon, SparklesIcon, ChevronDownIcon, ChevronUpIcon, FilterIcon } from './icons';
import Calendar from './Calendar';
import WeatherWidget from './WeatherWidget';
import ServiceAddons, { ADDONS } from './ServiceAddons';
import PhotographerRecommendationList from './PhotographerRecommendationList';
import PhotographerMap from './PhotographerMap';
import PhotographerAgendaModal from './PhotographerAgendaModal';

const serviceCategories: ServiceCategory[] = ['Foto', 'Vídeo', 'Aéreo', 'Pacotes', 'Outros', 'Edição'];

const PaymentModal: React.FC<{ booking: Booking, onConfirm: () => void, onClose: () => void }> = ({ booking, onConfirm, onClose }) => (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-fade-in-fast p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="text-center">
                <h3 className="text-xl font-bold text-slate-800">Pagamento Pendente</h3>
                <p className="mt-2 text-sm text-slate-500">Este é um cliente pré-pago. Para confirmar o agendamento, simule o pagamento via Pix.</p>
            </div>
            <div className="mt-6 flex flex-col items-center">
                <div className="p-4 bg-white border-4 border-slate-200 rounded-lg">
                    <BarcodeIcon className="w-48 h-48 text-slate-800" />
                </div>
                <p className="mt-4 font-bold text-2xl text-slate-800">R$ {booking.total_price.toFixed(2)}</p>
            </div>
            <div className="mt-6 flex flex-col gap-3">
                <button onClick={onConfirm} className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2.5 bg-green-600 text-base font-medium text-white hover:bg-green-700">
                    Simular Confirmação de Pagamento
                </button>
                <button onClick={onClose} className="w-full inline-flex justify-center rounded-md border border-slate-300 shadow-sm px-4 py-2.5 bg-white text-base font-medium text-slate-700 hover:bg-slate-50">
                    Cancelar Agendamento
                </button>
            </div>
        </div>
    </div>
);

const InviteLinkModal: React.FC<{ bookingId: string, onClose: () => void }> = ({ bookingId, onClose }) => {
    // FIX: Use Hash routing for link generation to avoid server 404s
    const link = `${window.location.origin}/#/finish-booking/${bookingId}`;
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(link);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-fade-in-fast p-4">
            <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
                <div className="text-center mb-6">
                    <div className="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3">
                        <LinkIcon className="w-8 h-8 text-purple-600" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800">Convite Gerado!</h3>
                    <p className="mt-2 text-sm text-slate-500">Envie este link para o cliente finalizar o agendamento escolhendo data e horário.</p>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 mb-4 flex items-center gap-2">
                    <input
                        type="text"
                        value={link}
                        readOnly
                        className="bg-transparent w-full text-sm text-slate-600 outline-none"
                    />
                    <button onClick={handleCopy} className="text-purple-600 hover:text-purple-800">
                        {copied ? <CheckCircleIcon className="w-5 h-5" /> : <CopyIcon className="w-5 h-5" />}
                    </button>
                </div>

                <button onClick={onClose} className="w-full bg-slate-800 text-white font-bold py-3 rounded-lg hover:bg-slate-900 transition-colors">
                    Fechar
                </button>
            </div>
        </div>
    );
};


const AdminBookingPage: React.FC<{ onBookingCreated: () => void; }> = ({ onBookingCreated }) => {
    // Data stores
    const [allClients, setAllClients] = useState<Client[]>([]);
    const [allServices, setAllServices] = useState<Service[]>([]);
    const [allPhotographers, setAllPhotographers] = useState<Photographer[]>([]);
    const [brokers, setBrokers] = useState<Broker[]>([]);

    // Selection State
    const [selectedClient, setSelectedClient] = useState<Client | null>(null);
    const [clientSearchQuery, setClientSearchQuery] = useState('');
    const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
    const [addons, setAddons] = useState<string[]>([]);

    // Services UI State
    const [serviceSearchQuery, setServiceSearchQuery] = useState('');
    const [expandedCategories, setExpandedCategories] = useState<string[]>(serviceCategories);

    // Address & Location State
    const [address, setAddress] = useState<string>("");
    const [selectedLocation, setSelectedLocation] = useState<{ lat: number, lng: number } | null>(null);
    const [isAddressValid, setIsAddressValid] = useState<boolean>(false);
    // Travel Fee State
    const [hasTravelFee, setHasTravelFee] = useState(false);
    const [googleApiLoaded, setGoogleApiLoaded] = useState(false);

    // Values
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [selectedPhotographerId, setSelectedPhotographerId] = useState<string>('');
    const [availableSlots, setAvailableSlots] = useState<string[]>([]);
    const [loadingSlots, setLoadingSlots] = useState<boolean>(false);
    const [selectedSlot, setSelectedSlot] = useState<string>('');

    // Details State
    const [isAccompanied, setIsAccompanied] = useState<string>('no');
    const [selectedBroker, setSelectedBroker] = useState<string>('');
    const [customBrokerName, setCustomBrokerName] = useState('');
    const [unitDetails, setUnitDetails] = useState<string>('');
    const [godMode, setGodMode] = useState(false); // GOD MODE STATE

    const autocompleteInputRef = useRef<HTMLInputElement>(null);
    const autocompleteInstanceRef = useRef<any>(null);

    const [paymentModalBooking, setPaymentModalBooking] = useState<Booking | null>(null);
    const [inviteLinkBookingId, setInviteLinkBookingId] = useState<string | null>(null);
    const [showAgendaModal, setShowAgendaModal] = useState(false);


    // Initial data load
    useEffect(() => {
        const fetchData = async () => {
            try {
                const [clients, services, photographers, fetchedBrokers] = await Promise.all([
                    getClients(),
                    getServices(),
                    getPhotographers(),
                    getBrokers()
                ]);

                setAllClients(clients);
                setAllServices(services);
                // FIX: Filter photographers to show only active ones in the dropdown
                setAllPhotographers(photographers.filter(p => p.isActive));
                setBrokers(fetchedBrokers);

                if (fetchedBrokers.length > 0) setSelectedBroker(fetchedBrokers[0].name);
            } catch (error) {
                console.error('Error fetching initial data for AdminBookingPage:', error);
            }
        };

        fetchData();
    }, []);

    // Google Maps Autocomplete
    useEffect(() => {
        let isMounted = true;
        let intervalId: NodeJS.Timeout | null = null;

        const initializeAutocomplete = () => {
            if (autocompleteInstanceRef.current) return; // Already initialized

            const google = (window as any).google;
            if (!google || !google.maps || !google.maps.places || !autocompleteInputRef.current) {
                return; // Not ready yet
            }

            try {
                // Initialize Autocomplete
                const instance = new google.maps.places.Autocomplete(autocompleteInputRef.current, {
                    types: ['address'],
                    componentRestrictions: { country: 'br' }
                });

                instance.addListener('place_changed', () => {
                    const place = instance.getPlace();
                    if (place?.geometry?.location) {
                        setAddress(place.formatted_address || '');
                        setSelectedLocation({ lat: place.geometry.location.lat(), lng: place.geometry.location.lng() });
                        setIsAddressValid(true);

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
                        setIsAddressValid(false);
                        setSelectedLocation(null);
                        setHasTravelFee(false);
                    }
                });

                autocompleteInstanceRef.current = instance;

                // Stop polling if successful
                if (intervalId) clearInterval(intervalId);

            } catch (e) {
                console.error("Error initializing autocomplete:", e);
            }
        };

        if (googleApiLoaded) {
            // Try immediately
            initializeAutocomplete();

            // If failed (lib not ready), poll every 500ms
            if (!autocompleteInstanceRef.current) {
                intervalId = setInterval(initializeAutocomplete, 500);
            }
        } else {
            loadGoogleMapsScript().then(() => {
                if (isMounted) setGoogleApiLoaded(true);
            }).catch(error => {
                console.error("Could not load Google Maps script for admin booking", error);
            });
        }

        return () => {
            isMounted = false;
            if (intervalId) clearInterval(intervalId);
        };
    }, [googleApiLoaded]);




    // Derived state for summary and logic
    const { selectedServices, totalPrice, totalDuration } = useMemo(() => {
        // Filter the services from the 'allServices' state
        let services = allServices.filter(s => selectedServiceIds.includes(s.id));

        // Manually add hidden fees if they are selected but not in allServices
        const hiddenIds = ['deslocamento', 'taxa_flash'];
        hiddenIds.forEach(hiddenId => {
            if (selectedServiceIds.includes(hiddenId) && !services.find(s => s.id === hiddenId)) {
                const hiddenService = allServices.find(s => s.id === hiddenId);
                if (hiddenService) services.push(hiddenService);
            }
        });

        const price = services.reduce((sum, service) => {
            // CRITICAL: Check selectedClient's custom price table for EVERY service
            const customPrice = selectedClient?.customPrices?.[service.id];
            return sum + (customPrice !== undefined ? customPrice : service.price);
        }, 0);

        // Calculate ADDONS Price
        const addonsPrice = addons.reduce((sum, addonId) => {
            const addon = ADDONS.find(a => a.id === addonId);
            return sum + (addon ? addon.price : 0);
        }, 0);

        const duration = services.reduce((sum, service) => sum + service.duration_minutes, 0);

        return { selectedServices: services, totalPrice: price + addonsPrice, totalDuration: duration };
    }, [selectedServiceIds, allServices, selectedClient, addons]); // Dependent on selectedClient

    const clientSearchResults = useMemo(() => {
        if (!clientSearchQuery) return [];
        const lowerQuery = clientSearchQuery.toLowerCase();
        return allClients.filter(c =>
            (c.name || '').toLowerCase().includes(lowerQuery) ||
            (c.email || '').toLowerCase().includes(lowerQuery) ||
            (c.phone || '').includes(lowerQuery)
        );
    }, [clientSearchQuery, allClients]);

    const selectedPhotographer = useMemo(() => allPhotographers.find(p => p.id === selectedPhotographerId), [selectedPhotographerId, allPhotographers]);

    // FILTER PHOTOGRAPHERS BASED ON LOCATION
    const filteredPhotographers = useMemo(() => {
        if (!selectedLocation || !isAddressValid) return allPhotographers;

        return allPhotographers.filter(p => {
            if (godMode) return true; // GOD MODE: Bypass radius check
            const dist = calculateDistanceKm(selectedLocation.lat, selectedLocation.lng, p.baseLat!, p.baseLng!);
            return dist <= p.radiusKm;
        });
    }, [allPhotographers, selectedLocation, isAddressValid, godMode]);

    // GROUP SERVICES
    const servicesByCategory = useMemo(() => {
        const grouped: Record<string, Service[]> = {};
        const term = serviceSearchQuery.toLowerCase();

        // Initialize all categories (even if empty to maintain order)
        serviceCategories.forEach(cat => grouped[cat] = []);

        const filtered = allServices.filter(s =>
            s.isVisibleToClient !== false && // Only show visible
            (s.name.toLowerCase().includes(term) || s.category.toLowerCase().includes(term))
        );

        filtered.forEach(s => {
            if (!grouped[s.category]) grouped[s.category] = [];
            grouped[s.category].push(s);
        });

        return grouped;
    }, [allServices, serviceSearchQuery]);

    const toggleCategory = (cat: string) => {
        setExpandedCategories(prev =>
            prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
        );
    };

    // Fetch available slots when dependencies change
    useEffect(() => {
        if (!selectedPhotographerId || !selectedDate || totalDuration <= 0 || !isAddressValid) {
            setAvailableSlots([]);
            return;
        }

        const fetchSlots = async () => {
            setLoadingSlots(true);
            try {
                const photographer = await getPhotographerById(selectedPhotographerId);
                if (!photographer) {
                    setLoadingSlots(false);
                    return;
                }

                const dateString = selectedDate.toISOString().split('T')[0];
                const allDailySlots = await getDailySlotsForPhotographer(photographer.id, dateString);

                // Filter for slots that are genuinely free
                const freeSlots = allDailySlots.filter(slot =>
                    isSlotFree(photographer, dateString, slot, totalDuration)
                );

                setAvailableSlots(freeSlots);
            } catch (error) {
                console.error('Error fetching slots:', error);
                setAvailableSlots([]);
            } finally {
                setLoadingSlots(false);
            }
        };

        fetchSlots();
    }, [selectedPhotographerId, selectedDate, totalDuration, isAddressValid, godMode]); // Added godMode dependency for safety, though slots don't depend on it directly here (filteredPhotographers does)

    const handleConfirmBooking = async () => {
        if (!selectedClient || !selectedPhotographer || !selectedLocation || !selectedSlot) {
            alert("Erro: Dados incompletos para o agendamento. Verifique Cliente, Local, Fotógrafo e Horário.");
            return;
        }

        try {
            const brokerName = isAccompanied === 'yes' ? (selectedBroker === 'outro' ? customBrokerName : selectedBroker) : undefined;
            const broker = brokers.find(b => b.name === selectedBroker);
            const brokerId = isAccompanied === 'yes' && broker && broker.id !== 'outro' ? broker.id : undefined;

            const booking = await createBooking(
                [...selectedServiceIds, ...addons],
                selectedDate.toISOString().split('T')[0],
                selectedSlot,
                address,
                selectedLocation,
                isAccompanied === 'yes',
                brokerName,
                unitDetails,
                selectedClient.id,
                brokerId,
                undefined, // forcedStatus
                false, // isFlash
                undefined, // couponCode
                godMode // FORCE LOCATION (God Mode)
            );

            if (booking) {
                if (booking.status === 'Pendente') {
                    setPaymentModalBooking(booking);
                } else {
                    alert(`Agendamento #${booking.id} criado com sucesso para ${selectedClient.name}!`);
                    onBookingCreated();
                }
            } else {
                alert("Falha ao criar agendamento.");
            }
        } catch (error) {
            console.error('Error creating booking:', error);
            alert("Erro ao criar agendamento. Verifique o console.");
        }
    };

    const handleGenerateDraft = async () => {
        if (!selectedClient || !selectedLocation) {
            alert("Selecione um cliente e um endereço válido.");
            return;
        }

        try {
            // Create Draft Booking
            const booking = await createBooking(
                [...selectedServiceIds, ...addons],
                null, // No Date
                null, // No Time
                address,
                selectedLocation,
                isAccompanied === 'yes',
                undefined, // Broker not set yet
                unitDetails,
                selectedClient.id,
                undefined,
                'Rascunho' // FORCE DRAFT STATUS
            );

            if (booking) {
                setInviteLinkBookingId(booking.id);
            }
        } catch (error) {
            console.error('Error creating draft booking:', error);
            alert("Erro ao gerar convite. Verifique o console.");
        }
    };

    const handlePaymentConfirmed = async () => {
        if (!paymentModalBooking || !selectedClient) return;

        try {
            const confirmedBooking = await confirmPrepaidBooking(paymentModalBooking.id);
            if (confirmedBooking) {
                alert(`Agendamento #${confirmedBooking.id} confirmado com sucesso para ${selectedClient.name}!`);
                setPaymentModalBooking(null);
                onBookingCreated();
            } else {
                alert("Erro ao confirmar pagamento.");
            }
        } catch (error) {
            console.error('Error confirming payment:', error);
            alert("Erro ao confirmar pagamento. Verifique o console.");
        }
    };

    const handleSelectClient = (client: Client) => {
        setSelectedClient(client);
        setClientSearchQuery('');
    };

    // Address class
    const addressInputClasses = `w-full pl-10 pr-10 py-2 border rounded-lg shadow-sm transition-all outline-none focus:ring-2 dark:bg-slate-700 dark:text-white ${isAddressValid
        ? 'border-green-500 focus:border-green-500 focus:ring-green-200 dark:border-green-600'
        : address.length > 0
            ? 'border-red-500 focus:border-red-500 focus:ring-red-200 dark:border-red-600'
            : 'border-slate-300 dark:border-slate-600 focus:border-purple-500 focus:ring-purple-200'
        }`;

    return (
        <div className="space-y-6 animate-fade-in pb-12">
            {paymentModalBooking && <PaymentModal booking={paymentModalBooking} onConfirm={handlePaymentConfirmed} onClose={() => setPaymentModalBooking(null)} />}
            {inviteLinkBookingId && <InviteLinkModal bookingId={inviteLinkBookingId} onClose={() => { setInviteLinkBookingId(null); onBookingCreated(); }} />}
            {showAgendaModal && selectedPhotographer && (
                <PhotographerAgendaModal
                    photographer={selectedPhotographer}
                    initialDate={selectedDate}
                    onClose={() => setShowAgendaModal(false)}
                />
            )}

            <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Painel de Agendamento</h1>
                    <p className="text-slate-500 dark:text-slate-400">Gerencie agendamentos para qualquer cliente em uma única tela.</p>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

                {/* LEFT COLUMN: Client & Services (5 cols) */}
                <div className="lg:col-span-5 space-y-6">

                    {/* 1. SELEÇÃO DE CLIENTE */}
                    <div className="bg-white dark:bg-slate-800 p-5 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
                        <h2 className="text-lg font-bold text-slate-700 dark:text-slate-200 mb-4 flex items-center gap-2">
                            <UserIcon className="w-5 h-5 text-purple-600" />
                            Cliente
                        </h2>

                        {selectedClient ? (
                            <div className="p-3 border border-purple-300 bg-purple-50 dark:bg-purple-900/20 dark:border-purple-700 rounded-lg flex justify-between items-center animate-fade-in-fast">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <p className="font-bold text-purple-800 dark:text-purple-300">{selectedClient.name}</p>
                                        {selectedClient.paymentType === 'Pré-pago' ? (
                                            <span className="flex items-center gap-1 px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-800 rounded-full text-xs font-bold">
                                                <DollarSignIcon className="w-3 h-3" /> Pré
                                            </span>
                                        ) : (
                                            <span className="flex items-center gap-1 px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 rounded-full text-xs font-bold">
                                                <ClockIcon className="w-3 h-3" /> Pós
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-sm text-purple-600 dark:text-purple-400">{selectedClient.email}</p>
                                </div>
                                <button onClick={() => setSelectedClient(null)} className="text-sm font-semibold text-slate-600 dark:text-slate-400 hover:underline">Trocar</button>
                            </div>
                        ) : (
                            <div className="relative">
                                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 dark:text-slate-500 pointer-events-none" />
                                <input
                                    type="text"
                                    value={clientSearchQuery}
                                    onChange={(e) => setClientSearchQuery(e.target.value)}
                                    placeholder="Buscar cliente..."
                                    className="w-full p-2 pl-10 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg shadow-sm focus:ring-purple-500 focus:border-purple-500"
                                />
                                {clientSearchQuery && (
                                    <ul className="absolute z-10 w-full bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg mt-1 max-h-60 overflow-y-auto shadow-lg animate-fade-in-fast">
                                        {clientSearchResults.length > 0 ? clientSearchResults.map(client => (
                                            <li key={client.id}>
                                                <button
                                                    type="button"
                                                    onClick={() => handleSelectClient(client)}
                                                    className="w-full text-left p-3 hover:bg-slate-100 dark:hover:bg-slate-600 flex justify-between items-center"
                                                >
                                                    <div>
                                                        <p className="font-semibold text-slate-800 dark:text-slate-200">{client.name}</p>
                                                        <p className="text-xs text-slate-500 dark:text-slate-400">{client.email}</p>
                                                    </div>
                                                    {client.paymentType === 'Pré-pago' ? (
                                                        <span className="flex items-center gap-1 px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-800 rounded-full text-xs font-bold whitespace-nowrap ml-2">
                                                            <DollarSignIcon className="w-3 h-3" /> Pré
                                                        </span>
                                                    ) : (
                                                        <span className="flex items-center gap-1 px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 rounded-full text-xs font-bold whitespace-nowrap ml-2">
                                                            <ClockIcon className="w-3 h-3" /> Pós
                                                        </span>
                                                    )}
                                                </button>
                                            </li>
                                        )) : <li className="p-3 text-sm text-slate-500 dark:text-slate-400 text-center">Nenhum encontrado.</li>}
                                    </ul>
                                )}
                            </div>
                        )}
                    </div>

                    {/* 2. SELEÇÃO DE SERVIÇOS */}
                    <div className="bg-white dark:bg-slate-800 p-5 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                                <CameraIcon className="w-5 h-5 text-purple-600" />
                                Serviços
                            </h2>
                            <div className="relative w-48">
                                <input
                                    type="text"
                                    placeholder="Filtrar serviços..."
                                    value={serviceSearchQuery}
                                    onChange={(e) => setServiceSearchQuery(e.target.value)}
                                    className="w-full px-3 py-1 text-sm border border-slate-300 dark:border-slate-600 rounded-full dark:bg-slate-900 dark:text-white"
                                />
                                <FilterIcon className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
                            </div>
                        </div>

                        <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                            {serviceCategories.map(category => {
                                const services = servicesByCategory[category] || [];
                                if (services.length === 0) return null;

                                const isExpanded = expandedCategories.includes(category);

                                return (
                                    <div key={category} className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                                        <button
                                            onClick={() => toggleCategory(category)}
                                            className="w-full flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors"
                                        >
                                            <span className="font-semibold text-slate-700 dark:text-slate-200 text-sm">{category} ({services.length})</span>
                                            {isExpanded ? <ChevronUpIcon className="w-4 h-4 text-slate-500" /> : <ChevronDownIcon className="w-4 h-4 text-slate-500" />}
                                        </button>

                                        {isExpanded && (
                                            <div className="p-2 space-y-2 bg-white dark:bg-slate-800/50">
                                                {services.map(service => (
                                                    <label key={service.id} className={`p-2 border rounded-md flex items-center justify-between transition-all cursor-pointer ${selectedServiceIds.includes(service.id) ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/10' : 'border-slate-100 dark:border-slate-700 hover:border-purple-200'}`}>
                                                        <div className="flex items-center gap-3">
                                                            <input
                                                                type="checkbox"
                                                                checked={selectedServiceIds.includes(service.id)}
                                                                onChange={() => { if (service.id !== 'deslocamento') setSelectedServiceIds(prev => prev.includes(service.id) ? prev.filter(id => id !== service.id) : [...prev, service.id]) }}
                                                                className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                                                                disabled={service.id === 'deslocamento'}
                                                            />
                                                            <div>
                                                                <span className="text-sm font-medium text-slate-800 dark:text-slate-200 block">{service.name}</span>
                                                                <span className="text-xs text-slate-500 dark:text-slate-400">{service.duration_minutes} min</span>
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="text-sm font-bold text-purple-700 dark:text-purple-400">
                                                                R$ {(selectedClient?.customPrices?.[service.id] ?? service.price).toFixed(2)}
                                                            </p>
                                                        </div>
                                                    </label>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                            <ServiceAddons
                                selectedAddons={addons}
                                onToggle={(addonId) => setAddons(prev => prev.includes(addonId) ? prev.filter(id => id !== addonId) : [...prev, addonId])}
                                title="Adicionais"
                            />
                        </div>
                    </div>
                </div>

                {/* RIGHT COLUMN: Scheduler & Summary (7 cols) */}
                <div className="lg:col-span-7 space-y-6">

                    {/* 3. LOCALIZAÇÃO */}
                    <div className="bg-white dark:bg-slate-800 p-5 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
                        <h2 className="text-lg font-bold text-slate-700 dark:text-slate-200 mb-4 flex items-center gap-2">
                            <MapPinIcon className="w-5 h-5 text-purple-600" />
                            Local do Imóvel
                        </h2>
                        <div className="relative">
                            <input
                                ref={autocompleteInputRef}
                                type="text"
                                value={address}
                                onChange={(e) => {
                                    setAddress(e.target.value);
                                    if (!googleApiLoaded && e.target.value.length > 5) {
                                        // Fallback if google not loaded
                                        setIsAddressValid(true);
                                        setSelectedLocation({ lat: -25.4284, lng: -49.2733 }); // Curitiba default
                                    } else if (googleApiLoaded) {
                                        setIsAddressValid(false);
                                        setSelectedLocation(null);
                                    }
                                    setHasTravelFee(false);
                                }}
                                className={addressInputClasses}
                                placeholder="Digite o endereço completo..."
                            />
                            {!isAddressValid && address.length > 0 && googleApiLoaded && (
                                <p className="text-xs text-red-600 dark:text-red-400 mt-1 font-semibold flex items-center gap-1 animate-fade-in absolute -bottom-6 left-0">
                                    <AlertTriangleIcon className="w-3 h-3" /> Selecione uma opção da lista.
                                </p>
                            )}

                            {isAddressValid && hasTravelFee && (
                                <div className="absolute right-0 top-0 h-full flex items-center pr-12 pointer-events-none">
                                    <span className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded-full border border-amber-200 font-bold flex items-center gap-1">
                                        <DollarSignIcon className="w-3 h-3" /> + Taxa
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* 4. DATA E FOTÓGRAFO */}
                    <div className="bg-white dark:bg-slate-800 p-5 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-2 flex items-center gap-2"><CalendarIcon className="w-4 h-4" /> Data</h3>
                                <Calendar selectedDate={selectedDate} onDateChange={setSelectedDate} />
                                <div className="mt-4">
                                    <WeatherWidget date={selectedDate} location={selectedLocation} />
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <div className="flex justify-between items-center mb-2">
                                        <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                                            <CameraIcon className="w-4 h-4" /> Fotógrafo
                                        </h3>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                id="godMode"
                                                checked={godMode}
                                                onChange={(e) => setGodMode(e.target.checked)}
                                                className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                                            />
                                            <label htmlFor="godMode" className="text-xs font-semibold text-purple-700 dark:text-purple-400 cursor-pointer select-none">
                                                Fora da Rota
                                            </label>
                                        </div>
                                    </div>

                                    {/* Photographer Recommendations / List */}
                                    <PhotographerRecommendationList
                                        photographers={filteredPhotographers}
                                        selectedLocation={selectedLocation}
                                        selectedDate={selectedDate}
                                        totalDuration={totalDuration}
                                        selectedPhotographerId={selectedPhotographerId}
                                        onSelectPhotographer={setSelectedPhotographerId}
                                    />

                                    {isAddressValid && selectedLocation && (
                                        <div className="mt-4 h-40 w-full rounded-lg overflow-hidden border border-slate-200 relative">
                                            {/* Mini Map Preview */}
                                            <PhotographerMap
                                                photographers={filteredPhotographers}
                                                selectedLocation={selectedLocation}
                                                selectedPhotographerId={selectedPhotographerId}
                                                onSelectPhotographer={setSelectedPhotographerId}
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* TIME SLOTS */}
                        <div className="mt-6 border-t border-slate-100 dark:border-slate-700 pt-6">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                                    <ClockIcon className="w-4 h-4" />
                                    Disponibilidade
                                    {selectedPhotographer && <span className="font-normal text-slate-500">de {selectedPhotographer.name.split(' ')[0]}</span>}
                                </h3>
                                {selectedPhotographer && (
                                    <button
                                        onClick={() => setShowAgendaModal(true)}
                                        className="text-xs text-purple-600 hover:underline font-semibold"
                                    >
                                        Ver Agenda
                                    </button>
                                )}
                            </div>

                            <div className="min-h-[100px] bg-slate-50 dark:bg-slate-900/30 p-4 rounded-lg border border-dashed border-slate-300 dark:border-slate-700">
                                {loadingSlots && <p className="text-center text-slate-500 text-sm py-4">Verificando agenda...</p>}

                                {!loadingSlots && availableSlots.length > 0 && (
                                    <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
                                        {availableSlots.map(slot => (
                                            <button
                                                key={slot}
                                                onClick={() => setSelectedSlot(slot)}
                                                className={`text-sm font-medium py-1.5 px-2 rounded-md transition-all ${selectedSlot === slot ? 'bg-purple-600 text-white shadow-md transform scale-105' : 'bg-white text-slate-700 border border-slate-200 hover:border-purple-300 hover:text-purple-600'}`}
                                            >
                                                {slot}
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {!loadingSlots && availableSlots.length === 0 && (
                                    <div className="text-center text-slate-400 text-sm py-4">
                                        {(!selectedPhotographerId || !selectedDate) ? 'Selecione data e fotógrafo.' : 'Nenhum horário disponível.'}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* 5. DETALHES FINAIS E RESUMO */}
                    <div className="bg-white dark:bg-slate-800 p-5 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200">Detalhes do Acesso</h3>
                                <div>
                                    <label className="block text-xs font-medium text-slate-500 mb-1">Acompanhamento</label>
                                    <div className="flex gap-4">
                                        <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
                                            <input type="radio" name="accompaniment" value="yes" checked={isAccompanied === 'yes'} onChange={e => setIsAccompanied(e.target.value)} /> Sim
                                        </label>
                                        <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
                                            <input type="radio" name="accompaniment" value="no" checked={isAccompanied === 'no'} onChange={e => setIsAccompanied(e.target.value)} /> Não
                                        </label>
                                    </div>
                                </div>
                                {isAccompanied === 'yes' && (
                                    <div className="animate-fade-in-fast space-y-2">
                                        <label className="block text-xs font-medium text-slate-500">Corretor</label>
                                        <select value={selectedBroker} onChange={e => setSelectedBroker(e.target.value)} className="w-full p-2 text-sm border rounded-lg bg-white dark:bg-slate-700 dark:border-slate-600">
                                            {brokers.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
                                            <option value="outro">Outro</option>
                                        </select>
                                        {selectedBroker === 'outro' && <input type="text" value={customBrokerName} onChange={e => setCustomBrokerName(e.target.value)} placeholder="Nome" className="w-full p-2 text-sm border rounded-lg" />}
                                    </div>
                                )}
                                <div>
                                    <label className="block text-xs font-medium text-slate-500 mb-1">Observações / Unidade</label>
                                    <textarea value={unitDetails} onChange={e => setUnitDetails(e.target.value)} rows={2} className="w-full p-2 text-sm border rounded-lg bg-white dark:bg-slate-700 dark:border-slate-600" placeholder="Ex: Apto 302, Bloco A..."></textarea>
                                </div>
                            </div>

                            {/* SUMMARY BOX */}
                            <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-lg border border-slate-200 dark:border-slate-700 flex flex-col justify-between">
                                <div>
                                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-2">Resumo</h3>
                                    <div className="space-y-1 text-sm">
                                        <p><span className="text-slate-500">Serviços:</span> <span className="font-medium text-slate-700 dark:text-slate-300">{selectedServices.map(s => s.name).join(', ')}</span></p>
                                        <p><span className="text-slate-500">Duração:</span> <span className="font-medium text-slate-700 dark:text-slate-300">{totalDuration} min</span></p>
                                        <p><span className="text-slate-500">Data/Hora:</span> {selectedDate.toLocaleDateString()} - {selectedSlot || '--:--'}</p>
                                    </div>
                                </div>
                                <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700 flex justify-between items-baseline">
                                    <span className="font-bold text-slate-700 dark:text-slate-300">Total</span>
                                    <span className="text-2xl font-bold text-purple-700 dark:text-purple-400">R$ {totalPrice.toFixed(2)}</span>
                                </div>
                            </div>
                        </div>

                        {/* ACTIONS */}
                        <div className="mt-6 flex flex-col md:flex-row gap-3 pt-4 border-t border-slate-100 dark:border-slate-700">
                            <button
                                onClick={handleGenerateDraft}
                                disabled={!selectedClient || !isAddressValid}
                                className="flex-1 py-3 px-4 border border-purple-200 text-purple-700 font-bold rounded-lg hover:bg-purple-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                <LinkIcon className="w-4 h-4" /> Gerar Convite
                            </button>
                            <button
                                onClick={handleConfirmBooking}
                                disabled={!selectedClient || !selectedSlot}
                                className="flex-[2] py-3 px-4 bg-green-600 text-white font-bold rounded-lg shadow-md hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                <CheckCircleIcon className="w-5 h-5" /> Confirmar Agendamento
                            </button>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default AdminBookingPage;
