
import React, { useState, useEffect, useMemo } from 'react';
import { getPhotographers, getBookingsByDate, getEligiblePhotographersForSwap, reassignBooking, getAllTimeOffs, getPhotographerAverageEarning, getServices } from '../services/bookingService';
import { Booking, Photographer, EligiblePhotographer, TimeOff, Service } from '../types';
import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon, ClockIcon, MapPinIcon, RefreshCwIcon, UserIcon, XIcon, CheckCircleIcon, AlertTriangleIcon, XCircleIcon, KeyIcon } from './icons';

interface VisualAgendaPageProps {
    onViewDetails: (bookingId: string) => void;
}

const statusStyles: Record<Booking['status'], { border: string, text: string, badge: string }> = {
    Confirmado: { border: "border-blue-500", text: "text-blue-700", badge: "bg-blue-100 text-blue-800" },
    Cancelado: { border: "border-slate-400", text: "text-slate-600", badge: "bg-slate-100 text-slate-600" },
    Pendente: { border: "border-yellow-500", text: "text-yellow-700", badge: "bg-yellow-100 text-yellow-800" },
    Realizado: { border: "border-green-500", text: "text-green-700", badge: "bg-green-100 text-green-800" },
    Concluído: { border: "border-purple-500", text: "text-purple-700", badge: "bg-purple-100 text-purple-800" },
    Rascunho: { border: "border-gray-400", text: "text-gray-600", badge: "bg-gray-100 text-gray-600" },
};

const SwapPhotographerModal: React.FC<{
    booking: Booking;
    photographers: Photographer[];
    onClose: () => void;
    onSwap: (newPhotographerId: string) => void;
}> = ({ booking, photographers, onClose, onSwap }) => {
    const [eligible, setEligible] = useState<EligiblePhotographer[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [isSwapping, setIsSwapping] = useState(false);

    useEffect(() => {
        const fetchEligible = async () => {
            if (!booking.date) return; // Safety check
            setLoading(true);
            try {
                const result = await getEligiblePhotographersForSwap(booking.id);
                setEligible(result);
            } catch (error) {
                console.error("Error fetching eligible photographers", error);
            } finally {
                setLoading(false);
            }
        };
        fetchEligible();
    }, [booking]);

    const handleConfirmSwap = () => {
        if (!selectedId) return;
        setIsSwapping(true);
        setTimeout(() => {
            onSwap(selectedId);
            setIsSwapping(false);
        }, 500);
    };

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 animate-fade-in-fast" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8 w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <header className="flex justify-between items-start">
                    <div>
                        <h3 className="text-xl font-bold text-slate-800">Disponibilidade de Prestadores</h3>
                        <p className="text-sm text-slate-500 mt-1">Selecione um novo prestador para este agendamento.</p>
                    </div>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-100 -mt-1 -mr-2"><XIcon className="w-5 h-5 text-slate-500" /></button>
                </header>

                <div className="my-6 p-4 rounded-lg bg-slate-50 border border-slate-200">
                    <div className="flex items-center gap-3">
                        <div className="bg-green-100 p-2 rounded-full"><CheckCircleIcon className="w-6 h-6 text-green-600" /></div>
                        <div>
                            <p className="font-bold text-slate-800">{booking.address}</p>
                            <p className="text-xs text-slate-500">
                                <strong>Corretor:</strong> {booking.accompanying_broker_name || 'N/A'} | <strong>Data:</strong> {booking.date ? new Date(booking.date.replace(/-/g, '/')).toLocaleDateString('pt-BR') : 'N/A'} {booking.start_time} | <strong>Prestador:</strong> {photographers.find(p => p.id === booking.photographer_id)?.name || 'N/A'}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto pr-2 space-y-3">
                    <h4 className="font-semibold text-slate-700">Prestadores disponíveis para {booking.date ? new Date(booking.date.replace(/-/g, '/')).toLocaleDateString('pt-BR') : 'N/A'} {booking.start_time} *</h4>
                    {loading && <p className="text-center text-slate-500 py-4">Verificando disponibilidade...</p>}
                    {!loading && eligible.length === 0 && <p className="text-center text-slate-500 py-4 bg-slate-100 rounded-md">Nenhum prestador elegível encontrado.</p>}
                    {!loading && eligible.map(({ photographer, distance, dailyBookingCount }) => (
                        <div key={photographer.id} onClick={() => setSelectedId(photographer.id)} className={`p-3 border rounded-lg flex items-center justify-between cursor-pointer transition-all ${selectedId === photographer.id ? 'border-purple-500 bg-purple-50 ring-2 ring-purple-200' : 'border-slate-200 hover:bg-slate-50'}`}>
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-slate-200 rounded-full flex items-center justify-center"><UserIcon className="w-6 h-6 text-slate-500" /></div>
                                <div>
                                    <p className="font-bold text-slate-800">{photographer.name}</p>
                                    <p className="text-sm text-slate-500">{photographer.email} | Distância: {distance.toFixed(2)}km</p>
                                    <p className="text-xs text-slate-500">Agendamentos no dia: {dailyBookingCount}</p>
                                </div>
                            </div>
                            <div className={`w-5 h-5 rounded-full border-2 transition-all ${selectedId === photographer.id ? 'bg-purple-600 border-purple-600' : 'border-slate-300 bg-white'}`}></div>
                        </div>
                    ))}
                </div>

                <footer className="mt-6 flex justify-end gap-3 border-t pt-6">
                    <button onClick={onClose} className="bg-slate-100 text-slate-700 font-semibold py-2 px-4 rounded-lg hover:bg-slate-200">Fechar</button>
                    <button onClick={handleConfirmSwap} disabled={!selectedId || isSwapping} className="bg-blue-500 text-white font-semibold py-2 px-4 rounded-lg hover:bg-blue-600 disabled:opacity-50">
                        {isSwapping ? 'Mudando...' : 'Mudar Fotógrafo'}
                    </button>
                </footer>
            </div>
        </div>
    );
};


import PhotographerAgendaModal from './PhotographerAgendaModal';

const SelectPhotographerModal: React.FC<{
    photographers: Photographer[];
    onSelect: (photographer: Photographer) => void;
    onClose: () => void;
}> = ({ photographers, onSelect, onClose }) => {
    const [search, setSearch] = useState('');

    const filtered = photographers.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 animate-fade-in-fast" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md flex flex-col max-h-[80vh]" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-slate-800">Gerenciar Bloqueios</h3>
                    <button onClick={onClose}><XIcon className="w-5 h-5 text-slate-500" /></button>
                </div>
                <p className="text-sm text-slate-500 mb-4">Selecione um fotógrafo para gerenciar seus bloqueios e folgas.</p>

                <div className="relative mb-4">
                    <input
                        type="text"
                        placeholder="Buscar fotógrafo..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full p-2 pl-9 border border-slate-300 rounded-lg text-sm"
                        autoFocus
                    />
                    <UserIcon className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                </div>

                <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                    {filtered.map(p => (
                        <button
                            key={p.id}
                            onClick={() => onSelect(p)}
                            className="w-full flex items-center gap-3 p-3 hover:bg-slate-50 rounded-lg border border-transparent hover:border-slate-200 transition-all text-left group"
                        >
                            <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center text-slate-500 group-hover:bg-purple-100 group-hover:text-purple-600 transition-colors">
                                <UserIcon className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="font-bold text-slate-700 group-hover:text-purple-700">{p.name}</p>
                                <p className="text-xs text-slate-500">{p.email}</p>
                            </div>
                        </button>
                    ))}
                    {filtered.length === 0 && (
                        <p className="text-center text-slate-400 py-4 text-sm">Nenhum fotógrafo encontrado.</p>
                    )}
                </div>
            </div>
        </div>
    );
};

const VisualAgendaPage: React.FC<VisualAgendaPageProps> = ({ onViewDetails }) => {
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [allBookings, setAllBookings] = useState<Booking[]>([]);
    const [allPhotographers, setAllPhotographers] = useState<Photographer[]>([]);
    const [allTimeOffs, setAllTimeOffs] = useState<TimeOff[]>([]);
    const [allServices, setAllServices] = useState<Service[]>([]);
    const [swappingBooking, setSwappingBooking] = useState<Booking | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    // Blocking Modal State
    const [showSelectPhotographer, setShowSelectPhotographer] = useState(false);
    const [blockingPhotographer, setBlockingPhotographer] = useState<Photographer | null>(null);

    const photographerAvgEarnings = useMemo(() => {
        const earningsMap = new Map<string, number>();
        allPhotographers.forEach(p => {
            earningsMap.set(p.id, getPhotographerAverageEarning(p.id));
        });
        return earningsMap;
    }, [allPhotographers]);

    const refreshData = async () => {
        // Fetch static/global data
        const [photographers, timeOffs, services] = await Promise.all([
            getPhotographers(),
            getAllTimeOffs(),
            getServices()
        ]);
        setAllPhotographers(photographers);
        setAllTimeOffs(timeOffs);
        setAllServices(services);
    };

    // New Effect: Fetch bookings whenever Date changes
    useEffect(() => {
        const fetchDailyBookings = async () => {
            const dateString = selectedDate.toISOString().split('T')[0];
            const bookings = await getBookingsByDate(dateString);
            setAllBookings(bookings);
        };
        fetchDailyBookings();
    }, [selectedDate]);

    useEffect(() => {
        refreshData();
    }, []);

    const eventsByPhotographer = useMemo(() => {
        const dateString = selectedDate.toISOString().split('T')[0];
        const grouped = new Map<string, (Booking | TimeOff & { type: 'timeoff' })[]>();

        allPhotographers.forEach(p => grouped.set(p.id, []));

        allBookings.forEach(b => {
            if (b.date === dateString) {
                if (grouped.has(b.photographer_id)) {
                    grouped.get(b.photographer_id)!.push(b);
                }
            }
        });

        allTimeOffs.forEach(to => {
            if (new Date(to.start_datetime).toISOString().split('T')[0] === dateString) {
                if (grouped.has(to.photographer_id)) {
                    grouped.get(to.photographer_id)!.push({ ...to, type: 'timeoff' });
                }
            }
        });

        grouped.forEach(events => events.sort((a, b) => {
            const getTime = (event: typeof events[0]) => {
                if ('type' in event && event.type === 'timeoff') {
                    return new Date(event.start_datetime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                }
                // It is a Booking
                return (event as Booking).start_time || '00:00';
            };

            const timeA = getTime(a);
            const timeB = getTime(b);
            return timeA.localeCompare(timeB);
        }));

        return grouped;
    }, [selectedDate, allBookings, allPhotographers, allTimeOffs]);

    const handleDateChange = (increment: number) => {
        setSelectedDate(prev => {
            const newDate = new Date(prev);
            newDate.setDate(prev.getDate() + increment);
            return newDate;
        });
    };

    const handleSwap = (newPhotographerId: string) => {
        if (!swappingBooking) return;
        reassignBooking(swappingBooking.id, newPhotographerId);
        // Refresh just the current view
        const dateString = selectedDate.toISOString().split('T')[0];
        getBookingsByDate(dateString).then(setAllBookings);

        setSwappingBooking(null);
    };

    return (
        <div className="space-y-8 animate-fade-in h-full flex flex-col">
            {swappingBooking && <SwapPhotographerModal booking={swappingBooking} photographers={allPhotographers} onClose={() => setSwappingBooking(null)} onSwap={handleSwap} />}

            {showSelectPhotographer && (
                <SelectPhotographerModal
                    photographers={allPhotographers.filter(p => p.isActive)}
                    onClose={() => setShowSelectPhotographer(false)}
                    onSelect={(p) => {
                        setBlockingPhotographer(p);
                        setShowSelectPhotographer(false);
                    }}
                />
            )}

            {blockingPhotographer && (
                <PhotographerAgendaModal
                    photographer={blockingPhotographer}
                    initialDate={selectedDate}
                    onClose={() => {
                        setBlockingPhotographer(null);
                        setBlockingPhotographer(null);
                        const dateString = selectedDate.toISOString().split('T')[0];
                        getBookingsByDate(dateString).then(setAllBookings);
                        refreshData(); // Refresh timeoffs
                    }}
                />
            )}

            <header className="flex flex-col xl:flex-row justify-between xl:items-center gap-4 flex-shrink-0 bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 sticky top-0 z-10">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Agenda Visual</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Gerencie a agenda diária dos seus fotógrafos.</p>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-4 w-full xl:w-auto">
                    {/* Search Bar */}
                    <div className="relative w-full sm:w-64">
                        <input
                            type="text"
                            placeholder="Buscar fotógrafo..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm focus:ring-purple-500 focus:border-purple-500 dark:bg-slate-800 dark:text-white"
                        />
                        <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        {searchTerm && (
                            <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                <XIcon className="w-3 h-3" />
                            </button>
                        )}
                    </div>

                    <div className="h-8 w-px bg-slate-300 dark:bg-slate-600 mx-2 hidden sm:block"></div>

                    <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start">
                        <button onClick={() => handleDateChange(-1)} className="p-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 border dark:border-slate-600 text-slate-600 dark:text-slate-300"><ChevronLeftIcon className="w-5 h-5" /></button>
                        <div className="relative flex-1 sm:flex-none">
                            <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                            <input
                                type="date"
                                value={selectedDate.toISOString().split('T')[0]}
                                onChange={e => setSelectedDate(new Date(e.target.value.replace(/-/g, '/')))}
                                className="w-full sm:w-auto p-2 pl-9 border border-slate-300 dark:border-slate-600 rounded-lg font-semibold text-slate-700 dark:text-slate-200 text-sm dark:bg-slate-800"
                            />
                        </div>
                        <button onClick={() => handleDateChange(1)} className="p-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 border dark:border-slate-600 text-slate-600 dark:text-slate-300"><ChevronRightIcon className="w-5 h-5" /></button>
                    </div>

                    <button
                        onClick={() => setShowSelectPhotographer(true)}
                        className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-lg font-semibold hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors shadow-sm text-sm whitespace-nowrap"
                    >
                        <AlertTriangleIcon className="w-4 h-4" />
                        Bloquear
                    </button>
                </div>
            </header>

            <div className="flex-1 overflow-y-auto pr-2">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6 pb-8">
                    {allPhotographers
                        .filter(p => p.isActive && p.name.toLowerCase().includes(searchTerm.toLowerCase()))
                        .map(photographer => {
                            const photographerEvents = eventsByPhotographer.get(photographer.id) || [];
                            return (
                                <div key={photographer.id} className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col h-[600px]">
                                    <div className="p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 rounded-t-xl flex items-center gap-3">
                                        <div className="w-10 h-10 bg-white dark:bg-slate-700 rounded-full flex items-center justify-center shadow-sm border border-slate-100 dark:border-slate-600">
                                            {photographer.profilePicUrl ? (
                                                <img src={photographer.profilePicUrl} alt={photographer.name} className="w-full h-full rounded-full object-cover" />
                                            ) : (
                                                <UserIcon className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-bold text-slate-700 dark:text-slate-200 text-base truncate" title={photographer.name}>{photographer.name}</h3>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{photographer.email}</p>
                                        </div>
                                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-700 px-2 py-1 rounded-full border border-slate-200 dark:border-slate-600 shadow-sm">
                                            {photographerEvents.length}
                                        </span>
                                    </div>

                                    <div className="flex-1 overflow-y-auto p-3 space-y-3 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-600 bg-slate-50/50 dark:bg-slate-900/20">
                                        {photographerEvents.map(event => {
                                            if ('type' in event && event.type === 'timeoff') {
                                                const cost = photographerAvgEarnings.get(photographer.id) || 0;
                                                return (
                                                    <div key={event.id} className="relative group animate-fade-in">
                                                        <div className="p-3 rounded-lg border-2 border-dashed border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/10 flex flex-col gap-1 transition-colors hover:border-red-300 dark:hover:border-red-800">
                                                            <div className="flex justify-between items-center text-red-600 dark:text-red-400">
                                                                <div className="flex items-center gap-1.5">
                                                                    <ClockIcon className="w-3.5 h-3.5" />
                                                                    <span className="font-mono text-xs font-bold">
                                                                        {new Date(event.start_datetime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} - {new Date(event.end_datetime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                                                    </span>
                                                                </div>
                                                                <XCircleIcon className="w-4 h-4 opacity-70" />
                                                            </div>
                                                            <div>
                                                                <p className="font-bold text-red-700 dark:text-red-300 text-xs uppercase">BLOQUEADO</p>
                                                                <p className="text-[10px] text-red-600/80 dark:text-red-400/80 italic truncate">{event.notes || 'Indisponível'}</p>
                                                            </div>
                                                            <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-2 -right-2 bg-white dark:bg-slate-800 shadow-md text-[10px] px-2 py-1 rounded-md text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900 whitespace-nowrap z-10">
                                                                Custo: R$ {cost.toFixed(2)}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            }

                                            const booking = event as Booking;
                                            const style = statusStyles[booking.status] || statusStyles['Pendente'];
                                            const hasKeyService = booking.service_ids.includes('retirar_chaves');

                                            return (
                                                <div key={booking.id} className={`bg-white dark:bg-slate-800 p-3 rounded-lg shadow-sm border-l-4 ${style.border} hover:shadow-md transition-all flex flex-col gap-2 relative group animate-fade-in`}>
                                                    <div className="flex justify-between items-start">
                                                        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${style.badge}`}>
                                                            {booking.status}
                                                        </span>
                                                        <div className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
                                                            <ClockIcon className="w-3 h-3" />
                                                            <span className="font-mono text-xs font-bold">{booking.start_time}</span>
                                                        </div>
                                                    </div>

                                                    <div>
                                                        <p className="font-bold text-slate-800 dark:text-slate-200 text-xs leading-tight mb-1 line-clamp-1" title={booking.client_name}>{booking.client_name}</p>
                                                        <div className="flex items-start gap-1.5 text-[10px] text-slate-500 dark:text-slate-400">
                                                            <MapPinIcon className="w-3 h-3 mt-0.5 flex-shrink-0" />
                                                            <span className="line-clamp-2 leading-tight" title={booking.address}>{booking.address}</span>
                                                        </div>
                                                    </div>

                                                    {/* Service Tags */}
                                                    {booking.service_ids && booking.service_ids.length > 0 && (
                                                        <div className="flex flex-wrap gap-1 mt-1">
                                                            {booking.service_ids.slice(0, 3).map(id => {
                                                                const serviceName = allServices.find(s => s.id === id)?.name;
                                                                return serviceName ? (
                                                                    <span key={id} className="text-[9px] font-medium text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-600 truncate max-w-full">
                                                                        {serviceName}
                                                                    </span>
                                                                ) : null;
                                                            })}
                                                            {booking.service_ids.length > 3 && (
                                                                <span className="text-[9px] font-medium text-slate-500 bg-slate-50 px-1 rounded border border-slate-200">+{booking.service_ids.length - 3}</span>
                                                            )}
                                                        </div>
                                                    )}

                                                    {hasKeyService && (
                                                        <div className="flex items-center gap-1 mt-1">
                                                            {booking.keyState === 'WITH_PHOTOGRAPHER' ? (
                                                                <span className="flex items-center gap-1 text-[9px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800 animate-pulse">
                                                                    <KeyIcon className="w-3 h-3" /> Com Fotógrafo
                                                                </span>
                                                            ) : booking.keyState === 'RETURNED' ? (
                                                                <span className="flex items-center gap-1 text-[9px] font-bold text-green-600 bg-green-50 dark:bg-green-900/20 px-2 py-0.5 rounded-full border border-green-200 dark:border-green-800">
                                                                    <CheckCircleIcon className="w-3 h-3" /> Devolvida
                                                                </span>
                                                            ) : (
                                                                <span className="flex items-center gap-1 text-[9px] font-bold text-slate-400 bg-slate-50 dark:bg-slate-700 px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-600">
                                                                    <KeyIcon className="w-3 h-3" /> Retirar
                                                                </span>
                                                            )}
                                                        </div>
                                                    )}

                                                    <div className="pt-2 mt-1 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                        {booking.status !== 'Cancelado' && booking.status !== 'Concluído' ? (
                                                            <button onClick={() => setSwappingBooking(booking)} className="text-[10px] font-semibold bg-slate-100 dark:bg-slate-700 hover:bg-purple-100 dark:hover:bg-purple-900/30 hover:text-purple-700 dark:hover:text-purple-300 text-slate-600 dark:text-slate-300 px-2 py-1 rounded flex items-center gap-1 transition-colors">
                                                                <RefreshCwIcon className="w-3 h-3" /> Trocar
                                                            </button>
                                                        ) : <span></span>}
                                                        <button onClick={() => onViewDetails(booking.id)} className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline">
                                                            Detalhes &rarr;
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        {photographerEvents.length === 0 && (
                                            <div className="h-full flex flex-col items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-lg opacity-50">
                                                <p className="text-slate-400 dark:text-slate-500 text-sm font-medium">Livre</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                </div>
            </div>
        </div>
    );
};

export default VisualAgendaPage;
