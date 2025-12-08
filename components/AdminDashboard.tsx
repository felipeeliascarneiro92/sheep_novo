import React, { useMemo, useState, useEffect } from 'react';
import { getAllBookings, getPhotographers, getClients, findRouteOptimizations, getServices } from '../services/bookingService';
import { Booking, BookingStatus, OptimizationSuggestion, Photographer, Service, Client } from '../types';
import { DollarSignIcon, ListOrderedIcon, UsersIcon, CameraIcon, MapPinIcon, SearchIcon, CheckCircleIcon, ClockIcon, CalendarIcon, XCircleIcon, TrendingUpIcon, TrendingDownIcon, FilterIcon } from './icons';
import RouteOptimizerWidget from './RouteOptimizerWidget';
import RecentFailuresWidget from './RecentFailuresWidget';

interface AdminDashboardProps {
    onViewDetails: (bookingId: string) => void;
}

type DateRangeOption = 'today' | 'yesterday' | 'this_week' | 'this_month' | 'last_month' | 'this_year' | 'all_time';

const statusStyles: Record<BookingStatus, string> = {
    Confirmado: "bg-green-100 text-green-800",
    Cancelado: "bg-red-100 text-red-800",
    Pendente: "bg-yellow-100 text-yellow-800",
    Realizado: "bg-blue-100 text-blue-800",
    Concluído: "bg-purple-100 text-purple-800",
    Rascunho: "bg-gray-100 text-gray-800",
};

interface MetricData {
    current: number;
    previous: number;
    change: number; // Percentage
    trend: 'up' | 'down' | 'neutral';
}

// Helper to get start and end dates based on range option
const getDateRange = (option: DateRangeOption): { start: Date, end: Date, prevStart: Date, prevEnd: Date } => {
    const now = new Date();
    const start = new Date();
    const end = new Date();
    const prevStart = new Date();
    const prevEnd = new Date();

    // Reset times
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
    prevStart.setHours(0, 0, 0, 0);
    prevEnd.setHours(23, 59, 59, 999);

    switch (option) {
        case 'today':
            prevStart.setDate(now.getDate() - 1);
            prevEnd.setDate(now.getDate() - 1);
            break;
        case 'yesterday':
            start.setDate(now.getDate() - 1);
            end.setDate(now.getDate() - 1);
            prevStart.setDate(now.getDate() - 2);
            prevEnd.setDate(now.getDate() - 2);
            break;
        case 'this_week':
            const day = now.getDay();
            const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is sunday
            start.setDate(diff);
            prevStart.setDate(diff - 7);
            prevEnd.setDate(diff - 1);
            break;
        case 'this_month':
            start.setDate(1);
            prevStart.setMonth(now.getMonth() - 1);
            prevStart.setDate(1);
            prevEnd.setDate(0); // Last day of previous month
            break;
        case 'last_month':
            start.setMonth(now.getMonth() - 1);
            start.setDate(1);
            end.setDate(0);
            prevStart.setMonth(now.getMonth() - 2);
            prevStart.setDate(1);
            prevEnd.setMonth(now.getMonth() - 1);
            prevEnd.setDate(0);
            break;
        case 'this_year':
            start.setMonth(0, 1);
            prevStart.setFullYear(now.getFullYear() - 1);
            prevStart.setMonth(0, 1);
            prevEnd.setFullYear(now.getFullYear() - 1);
            prevEnd.setMonth(11, 31);
            break;
        case 'all_time':
            start.setFullYear(2000); // Far past
            prevStart.setFullYear(1900);
            prevEnd.setFullYear(1999);
            break;
    }

    return { start, end, prevStart, prevEnd };
};

const MetricCard: React.FC<{
    icon: React.ReactNode,
    title: string,
    value: string | number,
    subtext?: string,
    trend?: number, // Percentage
    trendLabel?: string
}> = ({ icon, title, value, subtext, trend, trendLabel }) => {
    const isPositive = trend !== undefined && trend >= 0;
    const isNeutral = trend === 0;

    return (
        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between mb-4">
                <div className="bg-slate-100 dark:bg-slate-700 p-3 rounded-full">{icon}</div>
                {trend !== undefined && (
                    <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${isNeutral ? 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300' : isPositive ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300' : 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300'}`}>
                        {isPositive ? <TrendingUpIcon className="w-3 h-3" /> : <TrendingDownIcon className="w-3 h-3" />}
                        <span>{Math.abs(trend).toFixed(1)}%</span>
                    </div>
                )}
            </div>
            <div>
                <p className="text-sm text-slate-500 dark:text-slate-400 font-semibold">{title}</p>
                <p className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-1">{value}</p>
                {subtext && <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{subtext}</p>}
                {trendLabel && <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{trendLabel}</p>}
            </div>
        </div>
    );
};

const StatusCard: React.FC<{ label: string, count: number, colorClass: string, icon: React.ReactNode }> = ({ label, count, colorClass, icon }) => (
    <div className={`p-4 rounded-xl border dark:border-slate-700 flex items-center justify-between ${colorClass}`}>
        <div>
            <p className="text-xs font-bold uppercase tracking-wider opacity-80 dark:opacity-90">{label}</p>
            <p className="text-2xl font-bold mt-1">{count}</p>
        </div>
        <div className="p-2 rounded-full bg-white/20 backdrop-blur-sm">
            {icon}
        </div>
    </div>
);

const AdminDashboard: React.FC<AdminDashboardProps> = ({ onViewDetails }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [dateRange, setDateRange] = useState<DateRangeOption>('this_month');
    const [optimizations, setOptimizations] = useState<OptimizationSuggestion[]>([]);

    const [allBookings, setAllBookings] = useState<Booking[]>([]);
    const [allPhotographers, setAllPhotographers] = useState<Photographer[]>([]);
    const [allServices, setAllServices] = useState<Service[]>([]);
    const [allClients, setAllClients] = useState<Client[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const refreshOptimizations = async () => {
        const todayStr = new Date().toISOString().split('T')[0];
        const suggestions = await findRouteOptimizations(todayStr);
        setOptimizations(suggestions);
    };

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const [bookings, photographers, services, clients] = await Promise.all([
                    getAllBookings(),
                    getPhotographers(),
                    getServices(),
                    getClients()
                ]);
                setAllBookings(bookings.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
                setAllPhotographers(photographers);
                setAllServices(services);
                setAllClients(clients);
                await refreshOptimizations();
            } catch (error) {
                console.error("Error fetching dashboard data:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, []);

    const analytics = useMemo(() => {
        const { start, end, prevStart, prevEnd } = getDateRange(dateRange);

        // Helper to check date range
        const isInRange = (dateStr: string | undefined, rangeStart: Date, rangeEnd: Date) => {
            if (!dateStr) return false;
            const d = new Date(dateStr.replace(/-/g, '/')); // Normalize date
            return d >= rangeStart && d <= rangeEnd;
        };

        // Current Period Data
        const currentBookings = allBookings.filter(b => isInRange(b.date, start, end));

        // Previous Period Data
        const previousBookings = allBookings.filter(b => isInRange(b.date, prevStart, prevEnd));

        // --- CALCULATE METRICS ---

        // 1. Revenue (Only 'Realizado')
        const currentRevenue = currentBookings.filter(b => b.status === 'Realizado').reduce((sum, b) => sum + b.total_price, 0);
        const prevRevenue = previousBookings.filter(b => b.status === 'Realizado').reduce((sum, b) => sum + b.total_price, 0);
        const revenueChange = prevRevenue === 0 ? (currentRevenue > 0 ? 100 : 0) : ((currentRevenue - prevRevenue) / prevRevenue) * 100;

        // 2. Total Bookings (All except 'Cancelado' usually, but let's count volume)
        const currentCount = currentBookings.length;
        const prevCount = previousBookings.length;
        const bookingsChange = prevCount === 0 ? (currentCount > 0 ? 100 : 0) : ((currentCount - prevCount) / prevCount) * 100;

        // 3. Active Photographers (Total in System)
        const currentPhotogs = allPhotographers.filter(p => p.isActive).length;
        // const prevPhotogs = new Set(previousBookings.map(b => b.photographer_id)).size;
        const photogsChange = 0; // Static metric for now

        // 4. Active Clients (Unique IDs in bookings)
        const currentClients = new Set(currentBookings.map(b => b.client_id)).size;
        const prevClients = new Set(previousBookings.map(b => b.client_id)).size;
        const clientsChange = prevClients === 0 ? 0 : ((currentClients - prevClients) / prevClients) * 100;

        // 5. Status Breakdown (Current Period)
        const statusBreakdown = currentBookings.reduce((acc, b) => {
            acc[b.status] = (acc[b.status] || 0) + 1;
            return acc;
        }, {
            Confirmado: 0,
            Pendente: 0,
            Realizado: 0,
            Concluído: 0,
            Cancelado: 0
        } as Record<BookingStatus, number>);

        return {
            revenue: { val: currentRevenue, change: revenueChange },
            bookings: { val: currentCount, change: bookingsChange },
            photographers: { val: currentPhotogs, change: photogsChange },
            clients: { val: currentClients, change: clientsChange },
            statusBreakdown,
            filteredList: currentBookings
        };

    }, [allBookings, dateRange, allPhotographers]);

    const displayedBookings = useMemo(() => {
        let filtered = analytics.filteredList; // Use the list filtered by date

        if (searchQuery.trim()) {
            const lowerQuery = searchQuery.toLowerCase();
            filtered = filtered.filter(b =>
                b.client_name.toLowerCase().includes(lowerQuery) ||
                b.address.toLowerCase().includes(lowerQuery) ||
                b.id.toLowerCase().includes(lowerQuery)
            );
        }

        return filtered.slice(0, 10);
    }, [analytics.filteredList, searchQuery]);

    const getRangeLabel = () => {
        switch (dateRange) {
            case 'today': return 'vs. Ontem';
            case 'yesterday': return 'vs. Anteontem';
            case 'this_week': return 'vs. Semana Anterior';
            case 'this_month': return 'vs. Mês Anterior';
            case 'last_month': return 'vs. 2 Meses Atrás';
            case 'this_year': return 'vs. Ano Anterior';
            default: return '';
        }
    };

    const getPhotographerName = (id?: string) => {
        if (!id) return 'Não atribuído';
        return allPhotographers.find(p => p.id === id)?.name || 'Desconhecido';
    };

    return (
        <div className="space-y-8 animate-fade-in">
            {/* ROUTE OPTIMIZATION WIDGET */}
            <RouteOptimizerWidget suggestions={optimizations} onRefresh={refreshOptimizations} />

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                <div>
                    <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Dashboard de Performance</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Acompanhe os indicadores chave do seu negócio.</p>
                </div>
                <div className="flex items-center gap-2">
                    <FilterIcon className="w-5 h-5 text-slate-400 dark:text-slate-500" />
                    <select
                        value={dateRange}
                        onChange={(e) => setDateRange(e.target.value as DateRangeOption)}
                        className="p-2 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-200 focus:ring-purple-500 focus:border-purple-500 outline-none"
                    >
                        <option value="today">Hoje</option>
                        <option value="yesterday">Ontem</option>
                        <option value="this_week">Esta Semana</option>
                        <option value="this_month">Este Mês</option>
                        <option value="last_month">Mês Passado</option>
                        <option value="this_year">Este Ano</option>
                        <option value="all_time">Todo o Período</option>
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <MetricCard
                    icon={<DollarSignIcon className="w-6 h-6 text-green-500" />}
                    title="Faturamento"
                    value={`R$ ${analytics.revenue.val.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                    subtext="Receita realizada"
                    trend={dateRange !== 'all_time' ? analytics.revenue.change : undefined}
                    trendLabel={getRangeLabel()}
                />
                <MetricCard
                    icon={<ListOrderedIcon className="w-6 h-6 text-blue-500" />}
                    title="Agendamentos"
                    value={analytics.bookings.val}
                    subtext="Volume total"
                    trend={dateRange !== 'all_time' ? analytics.bookings.change : undefined}
                    trendLabel={getRangeLabel()}
                />
                <MetricCard
                    icon={<CameraIcon className="w-6 h-6 text-pink-500" />}
                    title="Fotógrafos Ativos"
                    value={analytics.photographers.val}
                    subtext="Cadastrados e ativos"
                    trend={undefined}
                    trendLabel={getRangeLabel()}
                />
                <MetricCard
                    icon={<UsersIcon className="w-6 h-6 text-purple-500" />}
                    title="Clientes Ativos"
                    value={analytics.clients.val}
                    subtext="Que agendaram"
                    trend={dateRange !== 'all_time' ? analytics.clients.change : undefined}
                    trendLabel={getRangeLabel()}
                />
            </div>

            {/* Status Breakdown Section */}
            <div>
                <h3 className="text-lg font-bold text-slate-700 dark:text-slate-200 mb-4">Funil de Status ({dateRange === 'all_time' ? 'Total' : 'Neste Período'})</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                    <StatusCard
                        label="Pendentes"
                        count={analytics.statusBreakdown.Pendente}
                        colorClass="bg-amber-100 dark:bg-amber-900/20 text-amber-800 dark:text-amber-200 border-amber-200 dark:border-amber-800"
                        icon={<ClockIcon className="w-6 h-6" />}
                    />
                    <StatusCard
                        label="Confirmados"
                        count={analytics.statusBreakdown.Confirmado}
                        colorClass="bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 border-blue-200 dark:border-blue-800"
                        icon={<CalendarIcon className="w-6 h-6" />}
                    />
                    <StatusCard
                        label="Realizados"
                        count={analytics.statusBreakdown.Realizado}
                        colorClass="bg-purple-100 dark:bg-purple-900/20 text-purple-800 dark:text-purple-200 border-purple-200 dark:border-purple-800"
                        icon={<CameraIcon className="w-6 h-6" />}
                    />
                    <StatusCard
                        label="Concluídos"
                        count={analytics.statusBreakdown.Concluído}
                        colorClass="bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200 border-green-200 dark:border-green-800"
                        icon={<CheckCircleIcon className="w-6 h-6" />}
                    />
                    <StatusCard
                        label="Cancelados"
                        count={analytics.statusBreakdown.Cancelado}
                        colorClass="bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 border-red-200 dark:border-red-800"
                        icon={<XCircleIcon className="w-6 h-6" />}
                    />
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
                <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
                    <h2 className="text-xl font-bold text-slate-700 dark:text-slate-200">
                        Agendamentos do Período ({analytics.filteredList.length})
                    </h2>
                    <div className="relative w-full sm:w-72">
                        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 dark:text-slate-500 pointer-events-none" />
                        <input
                            type="text"
                            placeholder="Buscar cliente, endereço ou ID..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full p-2 pl-10 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg shadow-sm focus:ring-purple-500 focus:border-purple-500 transition-colors"
                        />
                    </div>
                </div>

                <div className="space-y-4">
                    {displayedBookings.length > 0 ? (
                        displayedBookings.map(booking => {
                            const bookingDate = booking.date ? new Date(booking.date.replace(/-/g, '/')) : null;
                            const client = allClients.find(c => c.id === booking.client_id);

                            return (
                                <div key={booking.id} className="bg-white dark:bg-slate-800 rounded-xl shadow-sm hover:shadow-md transition-shadow border border-slate-200 dark:border-slate-700 overflow-hidden animate-fade-in group">
                                    {/* Header: Date & Status */}
                                    <div className="bg-slate-50 dark:bg-slate-900/50 px-6 py-3 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                                        <div className="flex items-center gap-3">
                                            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-semibold">
                                                <CalendarIcon className="w-4 h-4 text-purple-500" />
                                                <span>{bookingDate ? bookingDate.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'long' }) : 'Data a definir'}</span>
                                            </div>
                                            <div className="h-4 w-px bg-slate-300 dark:bg-slate-600 mx-1"></div>
                                            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 text-sm">
                                                <ClockIcon className="w-4 h-4" />
                                                <span>{booking.start_time ? `${booking.start_time} - ${booking.end_time}` : 'Horário a definir'}</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500">#{booking.id.slice(0, 6)}</span>
                                            <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${statusStyles[booking.status]} `}>{booking.status}</span>
                                        </div>
                                    </div>

                                    <div className="p-6">
                                        <div className="flex flex-col md:flex-row justify-between gap-6">
                                            {/* Main Info */}
                                            <div className="flex-1 space-y-4">
                                                <div>
                                                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                                                        {booking.client_name}
                                                        {/* Payment Indicator */}
                                                        {client && (
                                                            client.paymentType === 'Pré-pago' ? (
                                                                <span className="text-[10px] bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200 px-1.5 py-0.5 rounded-full border border-green-200 dark:border-green-800 font-bold" title="Pré-pago">$</span>
                                                            ) : (
                                                                <span className="text-[10px] bg-amber-100 dark:bg-amber-900/20 text-amber-800 dark:text-amber-200 px-1.5 py-0.5 rounded-full border border-amber-200 dark:border-amber-800 font-bold" title="Pós-pago">🕒</span>
                                                            )
                                                        )}
                                                    </h3>
                                                    <div className="flex items-start gap-2 mt-1 text-slate-600 dark:text-slate-400 text-sm">
                                                        <MapPinIcon className="w-4 h-4 mt-0.5 flex-shrink-0 text-slate-400" />
                                                        <span>{booking.address}</span>
                                                    </div>
                                                </div>

                                                {/* Services & Photographer */}
                                                <div className="flex flex-wrap gap-4 items-center pt-2">
                                                    <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-700/50 px-3 py-1.5 rounded-lg border border-slate-100 dark:border-slate-600">
                                                        <CameraIcon className="w-4 h-4 text-purple-500" />
                                                        <span className="font-medium">Profissional:</span>
                                                        <span>{getPhotographerName(booking.photographer_id)}</span>
                                                    </div>

                                                    <div className="flex flex-wrap gap-2">
                                                        {booking.service_ids.map(sid => {
                                                            const sName = allServices.find(s => s.id === sid)?.name;
                                                            if (!sName) return null;
                                                            return (
                                                                <span key={sid} className="text-xs font-medium text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-900/20 px-2 py-1 rounded border border-purple-100 dark:border-purple-800">
                                                                    {sName}
                                                                </span>
                                                            )
                                                        })}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Price & Actions */}
                                            <div className="flex flex-col justify-between items-end gap-4 min-w-[200px]">
                                                <div className="text-right">
                                                    <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Valor Total</p>
                                                    <p className="text-2xl font-bold gradient-text">R$ {booking.total_price.toFixed(2)}</p>
                                                </div>
                                                <button onClick={() => onViewDetails(booking.id)} className="text-xs font-semibold text-purple-600 bg-purple-100 hover:bg-purple-200 px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 border border-purple-200">
                                                    Ver Detalhes
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="text-center py-10 text-slate-500 dark:text-slate-400">
                            <p className="font-semibold">Nenhum agendamento encontrado neste período.</p>
                            <p className="text-sm">Tente alterar o filtro de data ou o termo de busca.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
