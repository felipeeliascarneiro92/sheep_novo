
import React, { useState, useEffect, useMemo } from 'react';
import { getBookingById, getServices, getAvailableSlots, finalizeDraftBooking, getClientById, validateCoupon } from '../services/bookingService';
import { Booking, Service, ServiceCategory } from '../types';
import { MapPinIcon, CalendarIcon, ClockIcon, CheckCircleIcon, TicketIcon, SparklesIcon, AlertTriangleIcon, CameraIcon } from './icons';
import Calendar from './Calendar';
import WeatherWidget from './WeatherWidget';
import ServiceAddons, { ADDONS } from './ServiceAddons';
import Skeleton from './Skeleton';
import { sendBookingConfirmation } from '../services/emailService';

interface ClientFinishBookingPageProps {
    bookingId: string;
}

const serviceCategories: ServiceCategory[] = ['Foto', 'Vídeo', 'Aéreo', 'Pacotes', 'Outros'];

const ClientFinishBookingPage: React.FC<ClientFinishBookingPageProps> = ({ bookingId }) => {
    const [booking, setBooking] = useState<Booking | null>(null);
    const [allServices, setAllServices] = useState<Service[]>([]);
    const [loading, setLoading] = useState(true);

    // User Input States
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [selectedSlot, setSelectedSlot] = useState<string>('');
    const [slotsResult, setSlotsResult] = useState<string[]>([]);
    const [isLoadingSlots, setIsLoadingSlots] = useState(false);
    const [addons, setAddons] = useState<string[]>([]);
    const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
    const [activeCategory, setActiveCategory] = useState<ServiceCategory>('Foto');
    const [unitDetails, setUnitDetails] = useState('');

    // Coupon
    const [couponCode, setCouponCode] = useState('');
    const [appliedCoupon, setAppliedCoupon] = useState<{ code: string, discount: number } | null>(null);
    const [couponMessage, setCouponMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const [isBadWeather, setIsBadWeather] = useState(false);
    const [isConfirmed, setIsConfirmed] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            const fetchedBooking = await getBookingById(bookingId);
            if (fetchedBooking) {
                setBooking(fetchedBooking);
                setSelectedServiceIds(fetchedBooking.service_ids);
                setUnitDetails(fetchedBooking.unit_details || '');
            }
            const services = await getServices();
            setAllServices(services);
            setLoading(false);
        };
        fetchData();
    }, [bookingId]);

    // Slot Fetching Logic
    useEffect(() => {
        if (!booking || !selectedDate) return;

        const fetchSlots = async () => {
            setIsLoadingSlots(true);
            // Combine base services + addons for duration calculation
            const finalIds = [...selectedServiceIds, ...addons];
            const dateStr = selectedDate.toISOString().split('T')[0];

            // Use mock location from booking
            const location = { lat: booking.lat, lng: booking.lng };

            const slots = await getAvailableSlots(location, finalIds, dateStr);
            setSlotsResult(slots);
            setIsLoadingSlots(false);
        };
        fetchSlots();
    }, [booking, selectedDate, selectedServiceIds, addons]);

    const handleAddonToggle = (addonId: string) => {
        setAddons(prev => prev.includes(addonId) ? prev.filter(id => id !== addonId) : [...prev, addonId]);
    };

    const handleServiceToggle = (serviceId: string) => {
        // Prevent manual toggle of hidden fees if needed, though admin should have set them
        if (serviceId === 'deslocamento' || serviceId === 'taxa_flash') return;

        setSelectedServiceIds(prev =>
            prev.includes(serviceId) ? prev.filter(id => id !== serviceId) : [...prev, serviceId]
        );
    };

    const [client, setClient] = useState<any>(null);
    useEffect(() => {
        if (booking) {
            getClientById(booking.client_id).then(setClient);
        }
    }, [booking]);

    const { totalPrice, totalDuration } = useMemo(() => {
        if (!booking || !client) return { totalPrice: 0, totalDuration: 0 };

        let services = allServices.filter(s => selectedServiceIds.includes(s.id));

        // Include hidden fees if present in draft
        ['deslocamento', 'taxa_flash'].forEach(id => {
            if (selectedServiceIds.includes(id) && !services.find(s => s.id === id)) {
                const s = allServices.find(sv => sv.id === id);
                if (s) services.push(s);
            }
        });

        let price = services.reduce((sum, service) => {
            const customPrice = client.customPrices?.[service.id];
            return sum + (customPrice !== undefined ? customPrice : service.price);
        }, 0);

        const addonsPrice = addons.reduce((sum, addonId) => {
            const addon = ADDONS.find(a => a.id === addonId);
            return sum + (addon ? addon.price : 0);
        }, 0);

        price += addonsPrice;
        const duration = services.reduce((sum, s) => sum + s.duration_minutes, 0);

        return { totalPrice: price, totalDuration: duration };
    }, [selectedServiceIds, addons, allServices, booking, client]);

    const finalPrice = useMemo(() => {
        if (appliedCoupon) {
            return Math.max(0, totalPrice - appliedCoupon.discount);
        }
        return totalPrice;
    }, [totalPrice, appliedCoupon]);

    const handleApplyCoupon = async () => {
        if (!couponCode.trim() || !booking) return;
        const result = await validateCoupon(couponCode, booking.client_id, totalPrice, selectedServiceIds);

        if (result.valid) {
            setAppliedCoupon({ code: couponCode, discount: result.discountAmount });
            setCouponMessage({ type: 'success', text: result.message });
        } else {
            setAppliedCoupon(null);
            setCouponMessage({ type: 'error', text: result.message });
        }
    };

    const handleConfirm = async () => {
        if (!selectedSlot) return;

        console.log('🔄 Tentando finalizar agendamento...');

        const dateStr = selectedDate.toISOString().split('T')[0];
        const result = await finalizeDraftBooking(
            bookingId,
            dateStr,
            selectedSlot,
            selectedServiceIds,
            addons,
            unitDetails,
            appliedCoupon?.code
        );

        console.log('🔄 Resultado do finalizeDraftBooking:', result);

        if (result) {
            console.log('✅ Sucesso no banco! Preparando envio de email...');
            setIsConfirmed(true);

            if (booking && client) {
                console.log('📧 Enviando email para:', client.email);

                const finalBookingData = {
                    ...booking,
                    date: dateStr,
                    start_time: selectedSlot,
                    service_ids: selectedServiceIds,
                    total_price: finalPrice,
                    address: booking.address
                };

                // Chamada direta
                sendBookingConfirmation(finalBookingData, client)
                    .then(res => console.log('📨 Resposta do envio:', res))
                    .catch(err => console.error('❌ ERRO CRÍTICO no envio:', err));

            } else {
                console.error('⚠️ IMPOSSÍVEL ENVIAR EMAIL: Booking ou Client nulos', { booking, client });
            }
        } else {
            console.error('❌ Falha ao finalizar agendamento');
            alert('Erro ao finalizar agendamento. Tente outro horário.');
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#f3f4f8] py-8 px-4">
                <div className="max-w-4xl mx-auto space-y-6">
                    <div className="text-center mb-8 space-y-3">
                        <Skeleton variant="rectangular" width={48} height={48} className="mx-auto rounded-lg" />
                        <Skeleton width={300} height={32} className="mx-auto" />
                        <Skeleton width={200} height={20} className="mx-auto" />
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 space-y-6">
                            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-6">
                                <Skeleton width="100%" height={60} />
                                <Skeleton width="40%" height={24} />
                                <Skeleton width="100%" height={300} />
                            </div>
                        </div>
                        <div className="lg:col-span-1">
                            <div className="bg-white p-6 rounded-xl shadow-lg border border-slate-200 space-y-4">
                                <Skeleton width="50%" height={24} />
                                <Skeleton width="100%" height={100} />
                                <Skeleton width="100%" height={40} />
                                <Skeleton width="100%" height={40} />
                                <Skeleton width="100%" height={50} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (!booking || booking.status !== 'Rascunho') {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-slate-100 p-4">
                <div className="bg-white p-8 rounded-xl shadow-lg text-center">
                    <AlertTriangleIcon className="w-16 h-16 text-amber-500 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-slate-800">Link Inválido ou Expirado</h2>
                    <p className="text-slate-500 mt-2">Este agendamento não existe ou já foi finalizado.</p>
                </div>
            </div>
        );
    }

    if (isConfirmed) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-slate-50 p-4 animate-fade-in">
                <div className="bg-white p-8 rounded-2xl shadow-xl text-center max-w-md w-full">
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircleIcon className="w-10 h-10 text-green-600" />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-800">Agendamento Confirmado!</h1>
                    <p className="text-slate-600 mt-2">
                        Obrigado, <strong>{booking.client_name}</strong>. Seu fotógrafo estará no local na data e hora combinadas.
                    </p>
                    <div className="mt-6 p-4 bg-slate-50 rounded-lg border border-slate-200 text-left">
                        <p className="text-sm text-slate-500">Data: <span className="font-semibold text-slate-800">{selectedDate.toLocaleDateString('pt-BR')}</span></p>
                        <p className="text-sm text-slate-500">Horário: <span className="font-semibold text-slate-800">{selectedSlot}</span></p>
                        <p className="text-sm text-slate-500">Endereço: <span className="font-semibold text-slate-800">{booking.address}</span></p>
                    </div>

                    <a
                        href={`https://wa.me/?text=${encodeURIComponent(
                            `*Detalhes do Agendamento - SheepHouse* 🐑\n\n` +
                            `📅 *Data:* ${selectedDate.toLocaleDateString('pt-BR')}\n` +
                            `⏰ *Horário:* ${selectedSlot}\n` +
                            `📍 *Endereço:* ${booking.address}\n` +
                            `👤 *Cliente:* ${booking.client_name}\n\n` +
                            `Acesse para mais detalhes!`
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-6 w-full bg-[#25D366] hover:bg-[#128C7E] text-white font-bold py-3 rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
                    >
                        <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" /></svg>
                        Compartilhar no WhatsApp
                    </a>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#f3f4f8] py-8 px-4">
            <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
                <header className="text-center mb-8">
                    <div className="bg-[#19224c] w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-3 shadow-md">
                        <span className="text-2xl">🐑</span>
                    </div>
                    <h1 className="text-2xl font-bold text-slate-800">Finalizar Agendamento</h1>
                    <p className="text-slate-500">Olá, <strong>{booking.client_name}</strong>! Falta pouco para confirmarmos suas fotos.</p>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column: Selection */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* 1. Location & Date */}
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                            <div className="flex items-start gap-3 mb-6 p-3 bg-purple-50 rounded-lg border border-purple-100">
                                <MapPinIcon className="w-5 h-5 text-purple-600 mt-0.5" />
                                <div>
                                    <p className="text-xs font-bold text-purple-600 uppercase">Local da Sessão</p>
                                    <p className="text-sm font-semibold text-slate-700">{booking.address}</p>
                                </div>
                            </div>

                            <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
                                <CalendarIcon className="w-5 h-5 text-slate-400" /> Escolha a Data
                            </h3>
                            <Calendar selectedDate={selectedDate} onDateChange={(d) => { setSelectedDate(d); setSelectedSlot(''); }} />

                            <div className="mt-6">
                                <h3 className="font-bold text-slate-700 mb-2 flex items-center gap-2">
                                    <ClockIcon className="w-5 h-5 text-slate-400" /> Horários Disponíveis
                                </h3>
                                {isLoadingSlots ? (
                                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                                        {Array.from({ length: 8 }).map((_, i) => (
                                            <Skeleton key={i} height={36} className="rounded-lg" />
                                        ))}
                                    </div>
                                ) : slotsResult.length > 0 ? (
                                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                                        {slotsResult.map(slot => (
                                            <button
                                                key={slot}
                                                onClick={() => setSelectedSlot(slot)}
                                                className={`py-2 px-1 rounded-lg text-sm font-bold transition-all ${selectedSlot === slot ? 'bg-purple-600 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-purple-100 hover:text-purple-700'}`}
                                            >
                                                {slot}
                                            </button>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center p-6 bg-slate-50 rounded-lg border border-dashed border-slate-300">
                                        <CameraIcon className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                                        <p className="text-sm text-slate-500">Nenhum horário disponível nesta data. Tente outro dia.</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* 2. Services & Addons */}
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                            <h3 className="font-bold text-slate-700 mb-4">Personalize seu Pacote</h3>

                            <div className="border-b border-slate-100 mb-4">
                                <div className="flex gap-2 overflow-x-auto pb-2">
                                    {serviceCategories.map(cat => (
                                        <button key={cat} onClick={() => setActiveCategory(cat)} className={`px-3 py-1.5 text-xs font-bold rounded-full transition-colors whitespace-nowrap ${activeCategory === cat ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                                            {cat}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-2 mb-6 max-h-60 overflow-y-auto">
                                {allServices.filter(s => s.category === activeCategory && s.isVisibleToClient).map(s => (
                                    <label key={s.id} className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${selectedServiceIds.includes(s.id) ? 'border-purple-500 bg-purple-50' : 'border-slate-200 hover:bg-slate-50'}`}>
                                        <div className="flex items-center gap-3">
                                            <input type="checkbox" checked={selectedServiceIds.includes(s.id)} onChange={() => handleServiceToggle(s.id)} className="h-4 w-4 text-purple-600 rounded" />
                                            <div>
                                                <p className="text-sm font-bold text-slate-700">{s.name}</p>
                                                <p className="text-xs text-slate-500">{s.duration_minutes} min</p>
                                            </div>
                                        </div>
                                        <span className="text-sm font-bold text-purple-700">R$ {s.price.toFixed(2)}</span>
                                    </label>
                                ))}
                            </div>

                            <ServiceAddons selectedAddons={addons} onToggle={handleAddonToggle} title="Extras Recomendados" />
                        </div>

                        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                            <h3 className="font-bold text-slate-700 mb-2">Observações</h3>
                            <textarea
                                value={unitDetails}
                                onChange={e => setUnitDetails(e.target.value)}
                                placeholder="Ex: Bloco A, Apto 123. Chave na portaria. Cuidado com o cachorro."
                                className="w-full p-3 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                                rows={3}
                            />
                        </div>
                    </div>

                    {/* Right Column: Summary */}
                    <div className="lg:col-span-1">
                        <div className="bg-white p-6 rounded-xl shadow-lg border border-slate-200 sticky top-6">
                            <h3 className="font-bold text-slate-800 text-lg mb-4">Resumo</h3>

                            {/* Weather Check */}
                            <div className="mb-4">
                                <WeatherWidget
                                    date={selectedDate}
                                    location={{ lat: booking.lat, lng: booking.lng }}
                                    onWeatherCheck={(isBad) => setIsBadWeather(isBad)}
                                />
                                {isBadWeather && !addons.includes('ceu_azul') && (
                                    <div className="mt-2 p-2 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-800 flex items-start gap-2">
                                        <SparklesIcon className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                        <p>Previsão de tempo fechado. Recomendamos adicionar <strong>Garantia Céu Azul</strong>.</p>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-2 mb-4 text-sm border-b border-slate-100 pb-4">
                                {allServices.filter(s => selectedServiceIds.includes(s.id)).map(s => (
                                    <div key={s.id} className="flex justify-between text-slate-600">
                                        <span>{s.name}</span>
                                        <span className="font-semibold">R$ {s.price.toFixed(2)}</span>
                                    </div>
                                ))}
                                {addons.map(id => {
                                    const a = ADDONS.find(ad => ad.id === id);
                                    return a ? (
                                        <div key={id} className="flex justify-between text-purple-600">
                                            <span>+ {a.title}</span>
                                            <span className="font-semibold">R$ {a.price.toFixed(2)}</span>
                                        </div>
                                    ) : null;
                                })}
                            </div>

                            <div className="mb-4">
                                <div className="flex gap-2 mb-2">
                                    <input
                                        type="text"
                                        placeholder="Cupom"
                                        value={couponCode}
                                        onChange={e => setCouponCode(e.target.value.toUpperCase())}
                                        className="w-full p-2 border rounded text-sm uppercase"
                                        disabled={!!appliedCoupon}
                                    />
                                    {appliedCoupon ? (
                                        <button onClick={() => { setAppliedCoupon(null); setCouponCode(''); setCouponMessage(null); }} className="px-3 bg-red-100 text-red-600 rounded text-xs font-bold">X</button>
                                    ) : (
                                        <button onClick={handleApplyCoupon} className="px-3 bg-slate-800 text-white rounded text-xs font-bold">OK</button>
                                    )}
                                </div>
                                {couponMessage && (
                                    <p className={`text-xs ${couponMessage.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>{couponMessage.text}</p>
                                )}
                            </div>

                            <div className="flex justify-between items-baseline mb-6">
                                <span className="font-bold text-slate-700">Total Final</span>
                                <span className="text-2xl font-bold text-purple-700">R$ {finalPrice.toFixed(2)}</span>
                            </div>

                            <button
                                onClick={handleConfirm}
                                disabled={!selectedSlot || selectedServiceIds.length === 0}
                                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl shadow-md transition-all transform active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Confirmar Agendamento
                            </button>
                            {!selectedSlot && <p className="text-xs text-center text-red-500 mt-2">Selecione um horário para continuar.</p>}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ClientFinishBookingPage;