




import React, { useState, useEffect, useMemo } from 'react';
// FIX: Added missing function imports from bookingService.ts.
import { getBookingsForClient, getServices, getClientById, getInvoicesForClient } from '../services/bookingService';
import { Booking, Service, BookingHistory, Client } from '../types';
import { CameraIcon, ListOrderedIcon, MessageSquareIcon, FileTextIcon, MapPinIcon, ClockIcon, DollarSignIcon, BarChart2Icon, HistoryIcon, AlertTriangleIcon, WalletIcon, GiftIcon } from './icons';
import { User } from '../App';
import Skeleton from './Skeleton';
import MarketingWidget from './MarketingWidget';
import { useClient } from '../hooks/useQueries';

// New component for metrics
const DashboardMetrics: React.FC<{ bookings: Booking[], userId: string }> = ({ bookings, userId }) => {
    // ✅ OTIMIZAÇÃO: Usar hook com cache ao invés de fetch manual
    const { data: client, isLoading: loading } = useClient(userId);

    const [financialMetric, setFinancialMetric] = useState<{ label: string, value: string, icon: React.ReactNode, alert?: boolean } | null>(null);

    useEffect(() => {
        const calculateMetric = async () => {
            if (!client) return;

            if (client.paymentType === 'Pré-pago') {
                const isLowBalance = client.balance < 50;
                setFinancialMetric({
                    label: 'Saldo em Carteira',
                    value: `R$ ${client.balance.toFixed(2)}`,
                    icon: <WalletIcon className={`w-6 h-6 ${isLowBalance ? 'text-amber-500' : 'text-emerald-500'}`} />,
                    alert: isLowBalance
                });
            } else {
                // Pós-pago: Calculate pending invoices
                const invoices = await getInvoicesForClient(client.id);
                const pendingAmount = invoices
                    .filter(inv => inv.status === 'Pendente' || inv.status === 'Atrasado')
                    .reduce((sum, inv) => sum + inv.amount, 0);

                const hasDebt = pendingAmount > 0;

                setFinancialMetric({
                    label: 'Faturas em Aberto',
                    value: `R$ ${pendingAmount.toFixed(2)}`,
                    icon: <FileTextIcon className={`w-6 h-6 ${hasDebt ? 'text-orange-500' : 'text-slate-500'}`} />,
                    alert: hasDebt
                });
            }
        };
        calculateMetric();
    }, [client]); // Só recalcula quando client mudar

    const totalBookingsThisMonth = bookings.filter(b => {
        const bookingDate = new Date(b.date);
        const today = new Date();
        return bookingDate.getMonth() === today.getMonth() && bookingDate.getFullYear() === today.getFullYear() && (b.status === 'Confirmado' || b.status === 'Realizado');
    }).length;

    const totalSpentThisMonth = bookings.filter(b => {
        const bookingDate = new Date(b.date);
        const today = new Date();
        return bookingDate.getMonth() === today.getMonth() && bookingDate.getFullYear() === today.getFullYear() && (b.status === 'Confirmado' || b.status === 'Realizado');
    }).reduce((acc, b) => acc + b.total_price, 0);

    if (loading) {
        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="bg-white p-5 rounded-xl shadow-lg border border-slate-200 flex items-center gap-4">
                    <Skeleton variant="circular" width={48} height={48} />
                    <div className="space-y-2 flex-1">
                        <Skeleton width="60%" height={16} />
                        <Skeleton width="40%" height={24} />
                    </div>
                </div>
                <div className="bg-white p-5 rounded-xl shadow-lg border border-slate-200 flex items-center gap-4">
                    <Skeleton variant="circular" width={48} height={48} />
                    <div className="space-y-2 flex-1">
                        <Skeleton width="60%" height={16} />
                        <Skeleton width="40%" height={24} />
                    </div>
                </div>
                <div className="bg-white p-5 rounded-xl shadow-lg border border-slate-200 flex items-center gap-4">
                    <Skeleton variant="circular" width={48} height={48} />
                    <div className="space-y-2 flex-1">
                        <Skeleton width="60%" height={16} />
                        <Skeleton width="40%" height={24} />
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <MetricCard icon={<ListOrderedIcon className="w-6 h-6 text-indigo-500" />} title="Agendamentos (Mês)" value={totalBookingsThisMonth.toString()} />
            <MetricCard icon={<DollarSignIcon className="w-6 h-6 text-green-500" />} title="Gastos (Mês)" value={`R$ ${totalSpentThisMonth.toFixed(2)}`} />
            {/* Dynamic Financial Card */}
            {financialMetric && (
                <div className={`bg-white dark:bg-slate-800 p-5 rounded-xl shadow-lg border flex items-center gap-4 transition-colors ${financialMetric.alert ? 'border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20' : 'border-slate-200 dark:border-slate-700'}`}>
                    <div className={`p-3 rounded-full ${financialMetric.alert ? 'bg-amber-100 dark:bg-amber-900/30' : 'bg-slate-100 dark:bg-slate-700'}`}>{financialMetric.icon}</div>
                    <div>
                        <p className={`text-sm font-semibold ${financialMetric.alert ? 'text-amber-800 dark:text-amber-200' : 'text-slate-500 dark:text-slate-400'}`}>{financialMetric.label}</p>
                        <p className={`font-bold text-2xl ${financialMetric.alert ? 'text-amber-700 dark:text-amber-300' : 'text-slate-800 dark:text-slate-100'}`}>{financialMetric.value}</p>
                    </div>
                </div>
            )}
        </div>
    );
};

const MetricCard: React.FC<{ icon: React.ReactNode, title: string, value: string, isText?: boolean }> = ({ icon, title, value, isText }) => (
    <div className="bg-white dark:bg-slate-800 p-5 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 flex items-center gap-4">
        <div className="bg-slate-100 dark:bg-slate-700 p-3 rounded-full">{icon}</div>
        <div>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-semibold">{title}</p>
            <p className={`font-bold ${isText ? 'text-lg' : 'text-2xl'} text-slate-800 dark:text-slate-100`}>{value}</p>
        </div>
    </div>
);

interface DashboardPageProps {
    user: User;
    onNavigate: (page: 'booking' | 'appointments' | 'billing' | 'referral', mode?: string) => void;
    onViewDetails: (bookingId: string) => void;
}

const DashboardPage: React.FC<DashboardPageProps> = ({ user, onNavigate, onViewDetails }) => {
    const [allBookings, setAllBookings] = useState<Booking[]>([]);
    const [upcomingBookings, setUpcomingBookings] = useState<Booking[]>([]);
    const [activityFeed, setActivityFeed] = useState<(BookingHistory & { booking: Booking })[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            const brokerId = (user.role === 'broker' && !user.permissions?.canViewAllBookings) ? user.id : undefined;
            const clientBookings = await getBookingsForClient(user.clientId || user.id, brokerId);
            setAllBookings(clientBookings);

            const upcoming = clientBookings
                .filter(b => {
                    if (b.status !== 'Confirmado') return false;
                    // Append T00:00:00 to ensure local time interpretation, matching setHours(0,0,0,0)
                    const bookingDate = new Date((b.date || '') + 'T00:00:00');
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    return bookingDate.getTime() >= today.getTime();
                })
                .sort((a, b) => new Date((a.date || '') + 'T00:00:00').getTime() - new Date((b.date || '') + 'T00:00:00').getTime());
            setUpcomingBookings(upcoming);

            const feed = clientBookings
                .flatMap(b => b.history.map(h => ({ ...h, booking: b })))
                .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
            setActivityFeed(feed);
            setIsLoading(false);
        };
        fetchData();
    }, [user]);

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 flex justify-between items-center flex-wrap gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-3">
                        Bem-vindo, {user.name.split(' ')[0]}!
                        {user.role === 'broker' && (
                            <span className={`text-xs font-bold px-2 py-1 rounded-full border ${user.permissions?.canViewAllBookings
                                ? 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800'
                                : 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800'
                                }`}>
                                {user.permissions?.canViewAllBookings ? 'Visão Geral (Imobiliária)' : 'Meus Agendamentos'}
                            </span>
                        )}
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400">Aqui está um resumo da sua atividade recente.</p>
                </div>
            </div>

            {/* Marketing Widget */}
            <MarketingWidget onNavigate={onNavigate} />

            {/* Metrics */}
            <DashboardMetrics bookings={allBookings} userId={user.clientId || user.id} />

            {/* Quick Actions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <ActionCard
                    icon={<CameraIcon className="w-8 h-8 text-purple-500" />}
                    title="Novo Agendamento"
                    description="Agende uma nova sessão padrão."
                    onClick={() => onNavigate('booking')}
                />

                <ActionCard
                    icon={<ListOrderedIcon className="w-8 h-8 text-pink-500" />}
                    title="Meus Agendamentos"
                    description="Visualize o histórico."
                    onClick={() => onNavigate('appointments')}
                />

                {/* FLASH BOOKING BUTTON - Moved to 3rd position */}
                <button
                    onClick={() => onNavigate('booking', 'flash')}
                    className="bg-gradient-to-r from-amber-500 to-red-600 p-6 rounded-xl shadow-lg border border-red-400 text-left hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 text-white relative overflow-hidden group"
                >
                    <div className="absolute -right-6 -bottom-6 opacity-20 group-hover:opacity-30 transition-opacity rotate-12">
                        <AlertTriangleIcon className="w-32 h-32" />
                    </div>
                    <div className="mb-3 bg-white/20 w-fit p-2 rounded-lg backdrop-blur-sm"><ClockIcon className="w-8 h-8 text-white" /></div>
                    <h3 className="font-extrabold text-white text-lg flex items-center gap-2">AGENDAMENTO FLASH <span className="animate-pulse">⚡</span></h3>
                    <p className="text-xs text-white/90 mt-1 font-medium">Precisa de fotos AGORA? Encontre um fotógrafo imediatamente.</p>
                </button>

                {/* Indique e Ganhe Card */}
                {user.role === 'client' && (
                    <button
                        onClick={() => onNavigate('referral')}
                        className="bg-gradient-to-br from-purple-600 to-indigo-700 p-6 rounded-xl shadow-lg border border-indigo-500 text-left hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 text-white relative overflow-hidden group"
                    >
                        <div className="absolute -right-6 -bottom-6 opacity-20 group-hover:opacity-30 transition-opacity -rotate-12">
                            <GiftIcon className="w-32 h-32" />
                        </div>
                        <div className="mb-3 bg-white/20 w-fit p-2 rounded-lg backdrop-blur-sm"><GiftIcon className="w-8 h-8 text-white" /></div>
                        <h3 className="font-extrabold text-white text-lg">INDIQUE E GANHE</h3>
                        <p className="text-xs text-white/90 mt-1 font-medium">Convide amigos e ganhe <strong className="text-yellow-300">R$ 20,00</strong> em créditos.</p>
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Upcoming Bookings */}
                <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
                    <h2 className="text-xl font-bold text-slate-700 dark:text-slate-200 mb-4">Próximos Agendamentos</h2>
                    <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                        {isLoading ? (
                            // SKELETONS FOR UPCOMING BOOKINGS
                            Array.from({ length: 3 }).map((_, i) => (
                                <div key={i} className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg">
                                    <div className="flex justify-between items-start gap-4">
                                        <div className="space-y-2 w-full">
                                            <Skeleton width="40%" height={20} />
                                            <Skeleton width="30%" height={16} />
                                        </div>
                                        <div className="flex flex-col items-end gap-1">
                                            <Skeleton width={80} height={20} />
                                            <Skeleton width={60} height={16} />
                                        </div>
                                    </div>
                                    <div className="flex items-start justify-between mt-3">
                                        <Skeleton width="60%" height={16} />
                                        <Skeleton width={80} height={16} />
                                    </div>
                                </div>
                            ))
                        ) : upcomingBookings.length > 0 ? (
                            upcomingBookings.map(booking => (
                                <div key={booking.id} className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg transition-shadow hover:shadow-md">
                                    <div className="flex justify-between items-start gap-4">
                                        <div>
                                            <p className="font-bold text-slate-800 dark:text-slate-100">{new Date(booking.date + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}</p>
                                            <p className="text-sm text-slate-500 dark:text-slate-400 font-semibold">{booking.start_time} - {booking.end_time}</p>
                                        </div>
                                        <div className="text-right flex-shrink-0">
                                            <p className="font-bold text-purple-600 dark:text-purple-400">R$ {booking.total_price.toFixed(2)}</p>
                                            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400">{booking.status}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-start justify-between mt-3">
                                        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                                            <MapPinIcon className="w-4 h-4 mt-0.5" />
                                            <span className="flex-1">{booking.address}</span>
                                        </div>
                                        <button onClick={() => onViewDetails(booking.id)} className="text-xs font-bold text-purple-600 dark:text-purple-400 hover:underline">
                                            Ver Detalhes
                                        </button>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="text-center text-slate-500 dark:text-slate-400 py-8">Nenhum agendamento futuro encontrado.</p>
                        )}
                    </div>
                </div>

                {/* News & Updates */}
                <div className="space-y-6">
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
                        <h3 className="text-lg font-bold text-slate-700 dark:text-slate-200 mb-4">Últimas Atualizações</h3>
                        <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                            {isLoading ? (
                                // SKELETONS FOR ACTIVITY FEED
                                Array.from({ length: 4 }).map((_, i) => (
                                    <div key={i} className="flex items-start gap-3">
                                        <Skeleton variant="circular" width={12} height={12} className="mt-1" />
                                        <div className="flex-1 space-y-2">
                                            <Skeleton width="90%" height={16} />
                                            <Skeleton width="50%" height={12} />
                                        </div>
                                    </div>
                                ))
                            ) : activityFeed.length > 0 ? (
                                activityFeed.map((item, index) => (
                                    <div key={index} className="flex items-start gap-3 text-sm">
                                        <div className="mt-1">
                                            <div className={`w-3 h-3 rounded-full ${item.actor === 'Cliente' ? 'bg-green-400' : item.actor === 'Fotógrafo' ? 'bg-blue-400' : 'bg-purple-400'}`}></div>
                                        </div>
                                        <div>
                                            <p className="text-slate-700 dark:text-slate-300"><span className="font-bold">{item.actor}:</span> {item.notes}</p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                                <span>{new Date(item.timestamp).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</span>
                                                <span className="mx-1">•</span>
                                                <span className="truncate">{item.booking.address}</span>
                                            </p>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-center text-slate-500 dark:text-slate-400 py-8">Nenhuma atividade recente.</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

const ActionCard: React.FC<{ icon: React.ReactNode, title: string, description: string, onClick: () => void }> = ({ icon, title, description, onClick }) => (
    <button onClick={onClick} className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 text-left hover:border-purple-300 dark:hover:border-purple-500 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
        <div className="mb-3">{icon}</div>
        <h3 className="font-bold text-slate-800 dark:text-slate-100 text-lg">{title}</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400">{description}</p>
    </button>
);

export default DashboardPage;
