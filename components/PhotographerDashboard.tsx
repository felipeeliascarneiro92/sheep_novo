
import React, { useState, useEffect, useMemo } from 'react';
// FIX: Added missing function import from bookingService.ts.
import { getPhotographerById, getPhotographerPayoutForBooking, getTimeOffsForPhotographer, getPhotographerAverageEarning, calculateDistanceKm, getClientById } from '../services/bookingService';
import { Booking, Photographer } from '../types';
import { ClockIcon, CheckCircleIcon, DollarSignIcon, XCircleIcon, NavigationIcon, MapPinIcon, WalletIcon } from './icons';
import { User } from '../App';
import RecentFailuresWidget from './RecentFailuresWidget';



// A robust way to parse YYYY-MM-DD strings into local timezone dates
const parseDate = (dateString: string | undefined) => dateString ? new Date(dateString.replace(/-/g, '/')) : new Date(0);

// Helper to convert HH:MM string to total minutes
const timeToMinutes = (time: string) => {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
};

const MetricCard: React.FC<{ icon: React.ReactNode, title: string, value: string | number, subtext?: string, highlight?: boolean }> = ({ icon, title, value, subtext, highlight }) => (
    <div className={`bg-white dark:bg-slate-800 p-5 rounded-xl shadow-lg border ${highlight ? 'border-purple-300 dark:border-purple-700 ring-1 ring-purple-100 dark:ring-purple-900/30' : 'border-slate-200 dark:border-slate-700'}`}>
        <div className="flex items-center gap-4">
            <div className={`p-3 rounded-full ${highlight ? 'bg-purple-100 dark:bg-purple-900/20' : 'bg-slate-100 dark:bg-slate-700'}`}>{icon}</div>
            <div>
                <p className="text-sm text-slate-500 dark:text-slate-400 font-semibold">{title}</p>
                <p className={`text-2xl font-bold ${highlight ? 'text-purple-700 dark:text-purple-300' : 'text-slate-800 dark:text-slate-100'}`}>{value}</p>
                {subtext && <p className="text-xs text-slate-400 dark:text-slate-500">{subtext}</p>}
            </div>
        </div>
    </div>
);

const TodaysAgenda: React.FC<{ bookings: Booking[], onViewDetails: (id: string) => void, photographer: Photographer | null }> = ({ bookings, onViewDetails, photographer }) => {
    const todayStr = new Date().toISOString().split('T')[0];
    const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes();

    const todaysBookings = useMemo(() => {
        return bookings
            .filter(b => b.date === todayStr && b.status === 'Confirmado')
            .sort((a, b) => timeToMinutes(a.start_time || '00:00') - timeToMinutes(b.start_time || '00:00'));
    }, [bookings, todayStr]);

    const nextBooking = useMemo(() => {
        return todaysBookings.find(b => timeToMinutes(b.start_time || '00:00') >= nowMinutes);
    }, [todaysBookings, nowMinutes]);

    // Helper to calculate travel time from previous location
    // Heuristic: 25km/h avg speed + 10min buffer
    const calculateTravelTime = (fromLat: number, fromLng: number, toLat: number, toLng: number) => {
        const distKm = calculateDistanceKm(fromLat, fromLng, toLat, toLng);
        const minutes = Math.ceil((distKm / 25) * 60) + 10;
        return { minutes, distKm };
    };

    const [clientsMap, setClientsMap] = useState<Record<string, any>>({});

    useEffect(() => {
        const fetchClients = async () => {
            const map: Record<string, any> = {};
            for (const b of todaysBookings) {
                if (!map[b.client_id]) {
                    const c = await getClientById(b.client_id);
                    if (c) map[b.client_id] = c;
                }
            }
            setClientsMap(map);
        };
        fetchClients();
    }, [todaysBookings]);

    const handleOpenRoute = (booking: Booking) => {
        const url = `https://www.google.com/maps/dir/?api=1&destination=${booking.lat},${booking.lng}`;
        window.open(url, '_blank');
    };

    return (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 h-full">
            <h3 className="text-lg font-bold text-slate-700 dark:text-slate-200 mb-4">Agenda do Dia</h3>
            {nextBooking && (
                <div className="bg-purple-50 dark:bg-purple-900/10 border border-purple-200 dark:border-purple-800 p-4 rounded-lg mb-4">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-xs font-bold text-purple-700 dark:text-purple-300 uppercase">Próximo Compromisso</p>
                            <p className="font-bold text-slate-800 dark:text-slate-100 text-lg">{nextBooking.start_time} - {nextBooking.client_name}</p>
                        </div>
                        <button
                            onClick={() => handleOpenRoute(nextBooking)}
                            className="flex items-center gap-1 bg-purple-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm hover:bg-purple-700 transition-colors"
                        >
                            <NavigationIcon className="w-3 h-3" /> Rota
                        </button>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 truncate">{nextBooking.address}</p>
                </div>
            )}
            <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                {todaysBookings.length > 0 ? todaysBookings.map((b, index) => {
                    // Determine previous location for travel time calc
                    let prevLat = photographer?.baseLat || 0;
                    let prevLng = photographer?.baseLng || 0;

                    if (index > 0) {
                        prevLat = todaysBookings[index - 1].lat;
                        prevLng = todaysBookings[index - 1].lng;
                    }

                    const travelInfo = calculateTravelTime(prevLat, prevLng, b.lat, b.lng);
                    const isPast = timeToMinutes(b.start_time || '00:00') < nowMinutes;
                    const client = clientsMap[b.client_id];

                    return (
                        <div key={b.id} className={`p-3 rounded-lg border-l-4 relative group ${isPast ? 'bg-slate-50 dark:bg-slate-700 border-slate-300 dark:border-slate-600' : 'bg-white dark:bg-slate-800 border-purple-400 dark:border-purple-600 shadow-sm'}`}>
                            <div className="flex justify-between items-start">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className={`font-mono font-bold text-sm ${isPast ? 'text-slate-500 dark:text-slate-400 line-through' : 'text-slate-800 dark:text-slate-100'}`}>{b.start_time}</span>
                                        {!isPast && <span className="text-[10px] bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 px-1.5 py-0.5 rounded font-semibold">🚗 ~{travelInfo.minutes} min</span>}
                                    </div>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <p className="text-sm text-slate-700 dark:text-slate-200 font-semibold">{b.client_name}</p>
                                        {client && (
                                            client.paymentType === 'Pré-pago' ? (
                                                <span className="text-[10px] bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200 px-1.5 py-0.5 rounded-full border border-green-200 dark:border-green-800 font-bold" title="Pré-pago">$</span>
                                            ) : (
                                                <span className="text-[10px] bg-amber-100 dark:bg-amber-900/20 text-amber-800 dark:text-amber-200 px-1.5 py-0.5 rounded-full border border-amber-200 dark:border-amber-800 font-bold" title="Pós-pago">🕒</span>
                                            )
                                        )}
                                    </div>
                                    <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 mt-1">
                                        <MapPinIcon className="w-3 h-3" />
                                        <span className="truncate max-w-[180px]">{b.address}</span>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-2 items-end">
                                    <button onClick={() => onViewDetails(b.id)} className="text-xs font-bold text-purple-600 dark:text-purple-400 hover:underline">Detalhes</button>
                                    <button
                                        onClick={() => handleOpenRoute(b)}
                                        className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-bold transition-colors ${isPast ? 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400' : 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/30'}`}
                                    >
                                        <NavigationIcon className="w-3 h-3" /> Rota
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                }) : (
                    <p className="text-center text-slate-500 dark:text-slate-400 py-8">Nenhum agendamento para hoje.</p>
                )}
            </div>
        </div>
    );
};

const LastJobs: React.FC<{ bookings: Booking[], onViewDetails: (id: string) => void }> = ({ bookings, onViewDetails }) => (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
        <h3 className="text-lg font-bold text-slate-700 dark:text-slate-200 mb-4">Últimos Trabalhos Realizados</h3>
        <div className="space-y-3">
            {bookings.length > 0 ? bookings.map(b => (
                <div key={b.id} className="flex justify-between items-center">
                    <div>
                        <p className="font-semibold text-sm text-slate-800 dark:text-slate-100">{b.client_name}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{b.date ? new Date(b.date.replace(/-/g, '/')).toLocaleDateString('pt-BR') : 'N/A'}</p>
                    </div>
                    <div className="text-right">
                        <p className="font-bold text-green-600 dark:text-green-400">R$ {getPhotographerPayoutForBooking(b).toFixed(2)}</p>
                        <button onClick={() => onViewDetails(b.id)} className="text-xs font-semibold text-purple-600 dark:text-purple-400 hover:underline">Ver</button>
                    </div>
                </div>
            )) : <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-4">Nenhum trabalho realizado recentemente.</p>}
        </div>
    </div>
);

const PendingUploads: React.FC<{ bookings: Booking[], onViewDetails: (id: string) => void }> = ({ bookings, onViewDetails }) => (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
        <h3 className="text-lg font-bold text-slate-700 dark:text-slate-200 mb-4">Pendências de Upload</h3>
        <div className="space-y-3">
            {bookings.length > 0 ? bookings.map(b => (
                <div key={b.id} className="flex justify-between items-center bg-amber-50 dark:bg-amber-900/10 p-2 rounded-md">
                    <div>
                        <p className="font-semibold text-sm text-amber-900 dark:text-amber-100">{b.client_name}</p>
                        <p className="text-xs text-amber-700 dark:text-amber-300">{b.date ? new Date(b.date.replace(/-/g, '/')).toLocaleDateString('pt-BR') : 'N/A'} - {b.start_time}</p>
                    </div>
                    <button onClick={() => onViewDetails(b.id)} className="text-xs font-bold bg-amber-500 text-white px-2 py-1 rounded-md hover:bg-amber-600 transition-colors">
                        Enviar
                    </button>
                </div>
            )) : <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-4">Nenhuma pendência encontrada!</p>}
        </div>
    </div>
);




const PhotographerDashboard: React.FC<{ user: User, onViewDetails: (id: string) => void }> = ({ user, onViewDetails }) => {
    const [photographer, setPhotographer] = useState<Photographer | null>(null);
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [timeOffs, setTimeOffs] = useState<any[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            const photographerData = await getPhotographerById(user.id);
            if (photographerData) {
                setPhotographer(photographerData);
                const sortedBookings = photographerData.bookings.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                setBookings(sortedBookings);
            }
            const to = await getTimeOffsForPhotographer(user.id);
            setTimeOffs(to);
        };
        fetchData();
    }, [user.id]);

    const { pendingPayout, totalPaid, projectedEarnings, monthlyOpportunityCost } = useMemo(() => {
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        // 1. Saldo a Receber (Completed jobs not yet paid by admin)
        const pendingPayout = bookings
            .filter(b => (b.status === 'Realizado' || b.status === 'Concluído') && !b.isPaidToPhotographer)
            .reduce((sum, b) => sum + getPhotographerPayoutForBooking(b), 0);

        // 2. Total Recebido (Jobs marked as paid)
        const totalPaid = bookings
            .filter(b => b.isPaidToPhotographer)
            .reduce((sum, b) => sum + getPhotographerPayoutForBooking(b), 0);

        // 3. Previsto (Confirmed future jobs)
        const projectedEarnings = bookings
            .filter(b => b.status === 'Confirmado')
            .reduce((sum, b) => sum + getPhotographerPayoutForBooking(b), 0);

        // Calculate opportunity cost
        const allTimeOffs = timeOffs;
        const timeOffsThisMonth = allTimeOffs.filter(to => {
            const toDate = new Date(to.start_datetime);
            return toDate.getMonth() === currentMonth && toDate.getFullYear() === currentYear;
        });
        const averageEarning = getPhotographerAverageEarning(user.id);
        const monthlyOpportunityCost = timeOffsThisMonth.length * averageEarning;

        return { pendingPayout, totalPaid, projectedEarnings, monthlyOpportunityCost };
    }, [bookings, timeOffs, user.id]);

    const lastRealizedBookings = useMemo(() => {
        return bookings
            .filter(b => b.status === 'Realizado')
            .slice(0, 4);
    }, [bookings]);

    const pendingUploads = useMemo(() => {
        return bookings.filter(b => b.status === 'Realizado' && (!b.media_files || b.media_files.length === 0));
    }, [bookings]);

    if (!photographer) {
        return <div className="text-center p-8">Carregando dashboard...</div>
    }

    return (
        <div className="space-y-6 animate-fade-in text-slate-800 dark:text-slate-100">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <MetricCard
                    icon={<WalletIcon className="w-6 h-6 text-purple-600" />}
                    title="A Receber"
                    value={`R$ ${pendingPayout.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                    subtext="Trabalhos finalizados pendentes de repasse"
                    highlight={true}
                />
                <MetricCard
                    icon={<CheckCircleIcon className="w-6 h-6 text-green-500" />}
                    title="Total Recebido"
                    value={`R$ ${totalPaid.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                    subtext="Já pagos pela plataforma"
                />
                <MetricCard
                    icon={<ClockIcon className="w-6 h-6 text-amber-500" />}
                    title="Ganhos Previstos"
                    value={`R$ ${projectedEarnings.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                    subtext="Agendamentos confirmados"
                />
                <MetricCard
                    icon={<XCircleIcon className="w-6 h-6 text-red-500" />}
                    title="Custo de Ausência"
                    value={`R$ ${monthlyOpportunityCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                    subtext="Ganhos potenciais perdidos (Mês)"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <TodaysAgenda bookings={bookings} onViewDetails={onViewDetails} photographer={photographer} />
                </div>
                <div className="space-y-6">
                    <RecentFailuresWidget photographerId={user.id} limit={3} />
                    <LastJobs bookings={lastRealizedBookings} onViewDetails={onViewDetails} />
                    <PendingUploads bookings={pendingUploads} onViewDetails={onViewDetails} />
                </div>
            </div>
        </div>
    );
};

export default PhotographerDashboard;
