
import React, { useState, useEffect, useMemo, useRef } from 'react';
// FIX: Import getBrokers from bookingService instead of the deprecated brokerService.
import { createBooking, getServices, getClients, getPhotographers, getPhotographerById, getDailySlotsForPhotographer, isSlotFree, loadGoogleMapsScript, confirmPrepaidBooking, getBrokers, calculateDistanceKm, getClientById } from '../services/bookingService';
import { Service, ServiceCategory, Broker, Client, Photographer, Booking } from '../types';
import { MapPinIcon, CheckCircleIcon, ClockIcon, XIcon, CameraIcon, UserIcon, CalendarIcon, DollarSignIcon, ArrowLeftIcon, BarcodeIcon, SearchIcon, AlertTriangleIcon, LinkIcon, CopyIcon, SparklesIcon } from './icons';
import Calendar from './Calendar';
import WeatherWidget from './WeatherWidget';
import ServiceAddons, { ADDONS } from './ServiceAddons';
import PhotographerRecommendationList from './PhotographerRecommendationList';
import PhotographerMap from './PhotographerMap';
import PhotographerAgendaModal from './PhotographerAgendaModal';

const serviceCategories: ServiceCategory[] = ['Foto', 'Vídeo', 'Aéreo', 'Pacotes', 'Outros'];

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
    const [step, setStep] = useState(1);

    // Data stores
    const [allClients, setAllClients] = useState<Client[]>([]);
    const [allServices, setAllServices] = useState<Service[]>([]);
    const [allPhotographers, setAllPhotographers] = useState<Photographer[]>([]);
    const [brokers, setBrokers] = useState<Broker[]>([]);

    // Step 1 State
    const [selectedClient, setSelectedClient] = useState<Client | null>(null);
    const [clientSearchQuery, setClientSearchQuery] = useState('');
    const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
    const [addons, setAddons] = useState<string[]>([]);

    // Step 2 State
    const [address, setAddress] = useState<string>("");
    const [selectedLocation, setSelectedLocation] = useState<{ lat: number, lng: number } | null>(null);
    const [isAddressValid, setIsAddressValid] = useState<boolean>(false);
    // Travel Fee State
    const [hasTravelFee, setHasTravelFee] = useState(false);
    const [googleApiLoaded, setGoogleApiLoaded] = useState(false);

    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [selectedPhotographerId, setSelectedPhotographerId] = useState<string>('');
    const [availableSlots, setAvailableSlots] = useState<string[]>([]);
    const [loadingSlots, setLoadingSlots] = useState<boolean>(false);
    const [selectedSlot, setSelectedSlot] = useState<string>('');

    // Step 3 State
    const [isAccompanied, setIsAccompanied] = useState<string>('no');
    const [selectedBroker, setSelectedBroker] = useState<string>('');
    const [customBrokerName, setCustomBrokerName] = useState('');
    const [unitDetails, setUnitDetails] = useState<string>('');

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
        if (step !== 2) return;

        const initAutocomplete = () => {
            if (!autocompleteInputRef.current || !(window as any).google || autocompleteInstanceRef.current) return;
            autocompleteInstanceRef.current = new (window as any).google.maps.places.Autocomplete(autocompleteInputRef.current, { types: ['address'], componentRestrictions: { country: 'br' } });
            autocompleteInstanceRef.current.addListener('place_changed', () => {
                const place = autocompleteInstanceRef.current.getPlace();
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
        };

        loadGoogleMapsScript().then(() => {
            setGoogleApiLoaded(true);
            initAutocomplete();
        }).catch(error => {
            console.error("Could not load Google Maps script for admin booking", error);
            setGoogleApiLoaded(false);
        });

    }, [step]);

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
            const dist = calculateDistanceKm(selectedLocation.lat, selectedLocation.lng, p.baseLat!, p.baseLng!);
            return dist <= p.radiusKm;
        });
    }, [allPhotographers, selectedLocation, isAddressValid]);

    // Fetch available slots when dependencies change
    useEffect(() => {
        if (step !== 2 || !selectedPhotographerId || !selectedDate || totalDuration <= 0 || !isAddressValid) {
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
    }, [selectedPhotographerId, selectedDate, totalDuration, step, isAddressValid]);

    const handleConfirmBooking = async () => {
        if (!selectedClient || !selectedPhotographer || !selectedLocation || !selectedSlot) {
            alert("Erro: Dados incompletos para o agendamento.");
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
                brokerId
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
        // Force recalculation of Travel Fee based on new client's custom prices if already selected
        // This is handled automatically by the useMemo dependency
    };

    // --- RENDER LOGIC ---

    const renderStep1 = () => (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
            <h2 className="text-xl font-bold text-slate-700 dark:text-slate-200 mb-1">Passo 1: Cliente e Serviços</h2>
            <p className="text-slate-500 dark:text-slate-400 mb-6 text-sm">Selecione para qual cliente é este agendamento e os serviços desejados.</p>
            <div className="space-y-6">
                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Cliente</label>
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
                                <p className="text-sm text-purple-600 dark:text-purple-400">{selectedClient.email} • {selectedClient.phone}</p>
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
                                placeholder="Buscar por nome, email ou telefone..."
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
                                                    <p className="text-sm text-slate-500 dark:text-slate-400">{client.email} • {client.phone}</p>
                                                </div>
                                                {client.paymentType === 'Pré-pago' ? (
                                                    <span className="flex items-center gap-1 text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-2 py-1 rounded-full border border-green-200 dark:border-green-800">
                                                        <DollarSignIcon className="w-3 h-3" /> Pré
                                                    </span>
                                                ) : (
                                                    <span className="flex items-center gap-1 text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 px-2 py-1 rounded-full border border-amber-200 dark:border-amber-800">
                                                        <ClockIcon className="w-3 h-3" /> Pós
                                                    </span>
                                                )}
                                            </button>
                                        </li>
                                    )) : <li className="p-3 text-sm text-slate-500 dark:text-slate-400 text-center">Nenhum cliente encontrado.</li>}
                                </ul>
                            )}
                        </div>
                    )}
                </div>
                <div>
                    <h3 className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Serviços</h3>
                    <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
                        {allServices.map(service => (
                            <label key={service.id} htmlFor={`service-${service.id}`} className={`p-3 border rounded-lg flex items-center justify-between transition-colors cursor-pointer ${service.id === 'deslocamento' ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800' : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}>
                                <div className="flex items-center gap-3">
                                    <input
                                        type="checkbox"
                                        id={`service-${service.id}`}
                                        checked={selectedServiceIds.includes(service.id)}
                                        onChange={() => { if (service.id !== 'deslocamento') setSelectedServiceIds(prev => prev.includes(service.id) ? prev.filter(id => id !== service.id) : [...prev, service.id]) }}
                                        className="h-5 w-5 rounded border-gray-300 dark:border-slate-600 text-purple-600 focus:ring-purple-500 dark:bg-slate-700"
                                        disabled={service.id === 'deslocamento'}
                                    />
                                    <div><span className="font-semibold text-slate-800 dark:text-slate-200">{service.name}</span><p className="text-xs text-slate-500 dark:text-slate-400">{service.duration_minutes} min</p></div>
                                </div>
                                <div className="text-right">
                                    <p className="font-bold text-purple-700 dark:text-purple-400">
                                        {/* Display price considering client's custom price list if client selected */}
                                        R$ {(selectedClient?.customPrices?.[service.id] ?? service.price).toFixed(2)}
                                    </p>
                                </div>
                            </label>
                        ))}
                    </div>
                </div>

                <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
                    <ServiceAddons
                        selectedAddons={addons}
                        onToggle={(addonId) => setAddons(prev => prev.includes(addonId) ? prev.filter(id => id !== addonId) : [...prev, addonId])}
                        title="Adicionais (Opcional)"
                    />
                </div>
                <div className="flex justify-end">
                    <button onClick={() => setStep(2)} disabled={!selectedClient || selectedServiceIds.length === 0} className="font-semibold text-white bg-purple-600 px-6 py-2.5 rounded-lg shadow-md hover:bg-purple-700 transition-shadow disabled:opacity-50">Próximo</button>
                </div>
            </div>
        </div>
    );

    // Dynamic classes for address input validation
    const addressInputClasses = `w-full pl-10 pr-10 py-2 border rounded-lg shadow-sm transition-all outline-none focus:ring-2 dark:bg-slate-700 dark:text-white ${isAddressValid
        ? 'border-green-500 focus:border-green-500 focus:ring-green-200 dark:border-green-600'
        : address.length > 0
            ? 'border-red-500 focus:border-red-500 focus:ring-red-200 dark:border-red-600'
            : 'border-slate-300 dark:border-slate-600 focus:border-purple-500 focus:ring-purple-200'
        }`;

    const renderStep2 = () => (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
            <h2 className="text-xl font-bold text-slate-700 dark:text-slate-200 mb-1">Passo 2: Local, Data e Fotógrafo</h2>
            <p className="text-slate-500 dark:text-slate-400 mb-6 text-sm">Defina os detalhes da sessão e escolha o profissional.</p>

            <div className="space-y-6">
                {/* ADDRESS SECTION - FULL WIDTH */}
                <div>
                    <label htmlFor="address" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Endereço do Imóvel</label>
                    <div className="relative">
                        <MapPinIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 dark:text-slate-500" />
                        <input
                            ref={autocompleteInputRef}
                            type="text"
                            id="address"
                            value={address}
                            onChange={(e) => {
                                setAddress(e.target.value);
                                if (!googleApiLoaded) {
                                    const isValid = e.target.value.length > 5;
                                    setIsAddressValid(isValid);
                                    if (isValid) {
                                        setSelectedLocation({ lat: -25.4284, lng: -49.2733 });
                                    } else {
                                        setSelectedLocation(null);
                                    }
                                } else {
                                    setIsAddressValid(false);
                                    setSelectedLocation(null);
                                }
                                setHasTravelFee(false);
                            }}
                            className={addressInputClasses}
                            placeholder="Digite o endereço..."
                        />
                        {isAddressValid && address.length > 0 && <CheckCircleIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-green-500" />}
                        {!isAddressValid && address.length > 0 && <AlertTriangleIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-red-500" />}
                    </div>
                    {!isAddressValid && address.length > 0 && googleApiLoaded && (
                        <p className="text-xs text-red-600 dark:text-red-400 mt-1 font-semibold flex items-center gap-1 animate-fade-in">
                            <AlertTriangleIcon className="w-3 h-3" /> Selecione uma opção da lista para validar o endereço.
                        </p>
                    )}
                    {/* TRAVEL FEE ALERT */}
                    {isAddressValid && hasTravelFee && (
                        <div className="mt-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg flex items-start gap-2 animate-fade-in">
                            <DollarSignIcon className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                            <div>
                                <p className="text-sm font-bold text-amber-800 dark:text-amber-300">Taxa de Deslocamento Aplicada</p>
                                <p className="text-xs text-amber-700 dark:text-amber-400">O endereço selecionado está fora de Curitiba. Uma taxa de R$ 40,00 foi adicionada.</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* DRAFT GENERATOR BUTTON */}
                {isAddressValid && (
                    <div className="p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg flex flex-col gap-3 animate-fade-in">
                        <div>
                            <h4 className="font-bold text-purple-800 dark:text-purple-300 flex items-center gap-2"><LinkIcon className="w-4 h-4" /> Convite Rápido</h4>
                            <p className="text-xs text-purple-600 dark:text-purple-400">Prefere que o cliente escolha o horário? Gere um link.</p>
                        </div>
                        <button
                            onClick={handleGenerateDraft}
                            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 rounded-md text-sm shadow-sm transition-colors"
                        >
                            Gerar Convite para Cliente
                        </button>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* LEFT COLUMN: Date & List */}
                    <div className="space-y-6">
                        <div className="flex flex-col gap-4">
                            <div>
                                <h3 className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Data da Sessão</h3>
                                <Calendar selectedDate={selectedDate} onDateChange={setSelectedDate} />
                            </div>
                            <div>
                                <h3 className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Previsão</h3>
                                <WeatherWidget date={selectedDate} location={selectedLocation} />
                            </div>
                        </div>

                        <div>
                            <h3 className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Fotógrafos Recomendados</h3>
                            <PhotographerRecommendationList
                                photographers={filteredPhotographers}
                                selectedLocation={selectedLocation}
                                selectedDate={selectedDate}
                                totalDuration={totalDuration}
                                selectedPhotographerId={selectedPhotographerId}
                                onSelectPhotographer={setSelectedPhotographerId}
                            />
                        </div>
                    </div>

                    {/* RIGHT COLUMN: Map & Slots */}
                    <div className="space-y-6">
                        <div>
                            <h3 className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Mapa de Disponibilidade</h3>
                            <PhotographerMap
                                photographers={filteredPhotographers}
                                selectedLocation={selectedLocation}
                                selectedPhotographerId={selectedPhotographerId}
                                onSelectPhotographer={setSelectedPhotographerId}
                            />
                        </div>

                        <div>
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200">Horários disponíveis para {selectedPhotographer?.name.split(' ')[0] || '...'}</h3>
                                {selectedPhotographer && (
                                    <button
                                        onClick={() => setShowAgendaModal(true)}
                                        className="text-xs font-bold text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-900/20 px-2 py-1 rounded border border-purple-200 dark:border-purple-800 transition-colors"
                                    >
                                        Ver Agenda Completa
                                    </button>
                                )}
                            </div>
                            <div className="min-h-[200px] bg-slate-50 dark:bg-slate-700/50 p-4 rounded-lg">
                                {loadingSlots && <p className="text-center text-slate-500 dark:text-slate-400 pt-10">Procurando horários...</p>}
                                {!loadingSlots && availableSlots.length > 0 && (
                                    <div className="grid grid-cols-3 gap-2">
                                        {availableSlots.map(slot => (
                                            <button key={slot} onClick={() => setSelectedSlot(slot)} className={`font-medium py-2 px-2 rounded-md text-center transition-all duration-200 ${selectedSlot === slot ? 'bg-purple-600 text-white shadow-lg' : 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-900/50'}`}>{slot}</button>
                                        ))}
                                    </div>
                                )}
                                {!loadingSlots && availableSlots.length === 0 && (
                                    <div className="text-center text-slate-500 dark:text-slate-400 pt-10"><p className="font-semibold">Nenhum horário encontrado</p><p className="text-sm">Selecione um fotógrafo e data.</p></div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex justify-between mt-6">
                <button onClick={() => setStep(1)} className="font-semibold text-slate-600 dark:text-slate-300 bg-slate-200 dark:bg-slate-700 px-6 py-2.5 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors">Voltar</button>
                <button onClick={() => setStep(3)} disabled={!selectedSlot} className="font-semibold text-white bg-purple-600 px-6 py-2.5 rounded-lg shadow-md hover:bg-green-600 transition-shadow disabled:opacity-50">Próximo</button>
            </div>
        </div>
    );

    const renderStep3 = () => (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
            <h2 className="text-xl font-bold text-slate-700 dark:text-slate-200 mb-1">Passo 3: Detalhes Finais e Confirmação</h2>
            <p className="text-slate-500 dark:text-slate-400 mb-6 text-sm">Revise todas as informações antes de confirmar.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200">Detalhes Adicionais</h3>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Alguém irá acompanhar a sessão?</label>
                        <div className="flex gap-4"><label className="flex items-center gap-2 text-slate-700 dark:text-slate-300"><input type="radio" name="accompaniment" value="yes" checked={isAccompanied === 'yes'} onChange={e => setIsAccompanied(e.target.value)} /> Sim</label><label className="flex items-center gap-2 text-slate-700 dark:text-slate-300"><input type="radio" name="accompaniment" value="no" checked={isAccompanied === 'no'} onChange={e => setIsAccompanied(e.target.value)} /> Não</label></div>
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
                        <textarea id="unit_details" value={unitDetails} onChange={e => setUnitDetails(e.target.value)} rows={3} className="mt-1 w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg shadow-sm focus:ring-purple-500 focus:border-purple-500" placeholder="Ex: Chave na portaria. Foco na suíte master."></textarea>
                    </div>
                </div>

                <div className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-lg border border-slate-200 dark:border-slate-700 space-y-3">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">Resumo do Agendamento</h3>
                    <p className="text-sm text-slate-700 dark:text-slate-300"><span className="font-semibold text-slate-600 dark:text-slate-400">Cliente:</span> {selectedClient?.name}</p>
                    <p className="text-sm text-slate-700 dark:text-slate-300"><span className="font-semibold text-slate-600 dark:text-slate-400">Fotógrafo:</span> {selectedPhotographer?.name}</p>
                    <p className="text-sm text-slate-700 dark:text-slate-300"><span className="font-semibold text-slate-600 dark:text-slate-400">Data:</span> {selectedDate.toLocaleDateString('pt-BR')} às {selectedSlot}</p>
                    <p className="text-sm text-slate-700 dark:text-slate-300"><span className="font-semibold text-slate-600 dark:text-slate-400">Endereço:</span> {address}</p>
                    <div>
                        <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">Serviços:</p>
                        <ul className="list-disc list-inside text-sm pl-2 text-slate-700 dark:text-slate-300">
                            {selectedServices.map(s => {
                                const customPrice = selectedClient?.customPrices?.[s.id];
                                const priceToDisplay = customPrice !== undefined ? customPrice : s.price;
                                return <li key={s.id}>{s.name} {s.id === 'deslocamento' && '(Automático)'} - R$ {priceToDisplay.toFixed(2)}</li>
                            })}
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
                    </div>
                    <div className="border-t border-slate-200 dark:border-slate-700 mt-2 pt-2 flex justify-between items-baseline">
                        <span className="font-bold text-slate-800 dark:text-slate-200">Total:</span>
                        <span className="text-2xl font-bold text-purple-700 dark:text-purple-400">R$ {totalPrice.toFixed(2)}</span>
                    </div>
                </div>
            </div>
            <div className="flex justify-between mt-6">
                <button onClick={() => setStep(2)} className="font-semibold text-slate-600 dark:text-slate-300 bg-slate-200 dark:bg-slate-700 px-6 py-2.5 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors">Voltar</button>
                <button onClick={handleConfirmBooking} className="font-semibold text-white bg-green-500 px-6 py-2.5 rounded-lg shadow-md hover:bg-green-600 transition-shadow">Confirmar Agendamento</button>
            </div>
        </div>
    );

    return (
        <div className="space-y-6 animate-fade-in">
            {paymentModalBooking && <PaymentModal booking={paymentModalBooking} onConfirm={handlePaymentConfirmed} onClose={() => setPaymentModalBooking(null)} />}
            {inviteLinkBookingId && <InviteLinkModal bookingId={inviteLinkBookingId} onClose={() => { setInviteLinkBookingId(null); onBookingCreated(); }} />}
            {showAgendaModal && selectedPhotographer && (
                <PhotographerAgendaModal
                    photographer={selectedPhotographer}
                    initialDate={selectedDate}
                    onClose={() => setShowAgendaModal(false)}
                />
            )}
            <header>
                <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Novo Agendamento (Admin)</h1>
                <p className="text-slate-500 dark:text-slate-400">Crie um novo agendamento para qualquer cliente e fotógrafo.</p>
            </header>

            {step === 1 && renderStep1()}
            {step === 2 && renderStep2()}
            {step === 3 && renderStep3()}
        </div>
    );
};

export default AdminBookingPage;
