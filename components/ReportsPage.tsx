
import React, { useState, useMemo, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';
import { getAllBookings, getClients, getPhotographers, getServices, getAllTimeOffs, getPhotographerAverageEarning } from '../services/bookingService';
import { getAllFeedbacks } from '../services/photographerFinanceService';
import { BarChart2Icon, CameraIcon, DollarSignIcon, ListOrderedIcon, SparklesIcon, UsersIcon, XCircleIcon, AlertTriangleIcon, MessageSquareIcon, TrendingDownIcon, FilterIcon, TrendingUpIcon, CheckCircleIcon } from './icons';
import { Booking, Client, Photographer, Service, TimeOff, PhotographerOpportunityCost } from '../types';

type DateRangeOption = 'today' | 'yesterday' | 'this_week' | 'this_month' | 'last_month' | 'this_year' | 'all_time';

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

// --- CHART COMPONENT ---
const DailyTrendChart: React.FC<{ data: { date: string, value: number, label: string }[], change: number, total: number }> = ({ data, change, total }) => {
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

    if (data.length === 0) return <div className="h-64 flex items-center justify-center text-slate-400">Sem dados suficientes para o gráfico.</div>;

    const height = 200;
    const maxVal = Math.max(...data.map(d => d.value), 1); // Avoid division by zero

    // Points generation
    const points = data.map((d, i) => {
        const x = (i / (data.length - 1)) * 100;
        const y = 100 - (d.value / maxVal) * 80; // Leave some padding at top
        return `${x},${y}`;
    }).join(' ');

    const areaPoints = `${points} 100,100 0,100`;

    return (
        <div className="bg-white p-6 rounded-xl shadow-lg border border-slate-200">
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h3 className="text-lg font-bold text-slate-800">Agendamentos x Períodos</h3>
                    <p className="text-sm text-slate-500">Gráfico de área</p>
                </div>
                <div className="text-right">
                    <div className="flex items-center justify-end gap-2">
                        <span className="text-3xl font-bold text-slate-800">{total}</span>
                        <span className={`text-xs font-bold px-2 py-1 rounded-full flex items-center ${change >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {change >= 0 ? <TrendingUpIcon className="w-3 h-3 mr-1" /> : <TrendingDownIcon className="w-3 h-3 mr-1" />}
                            {Math.abs(change).toFixed(1)}%
                        </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">vs. período anterior</p>
                </div>
            </div>

            <div className="relative h-64 w-full" onMouseLeave={() => setHoveredIndex(null)}>
                {/* Grid lines */}
                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                    {[0, 1, 2, 3, 4].map(i => (
                        <div key={i} className="w-full border-t border-slate-100 h-0"></div>
                    ))}
                </div>

                <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full overflow-visible">
                    <defs>
                        <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#a855f7" stopOpacity="0.3" />
                            <stop offset="100%" stopColor="#a855f7" stopOpacity="0" />
                        </linearGradient>
                    </defs>
                    {/* Area Fill */}
                    <polygon points={areaPoints} fill="url(#chartGradient)" />
                    {/* Line Stroke */}
                    <polyline points={points} fill="none" stroke="#a855f7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />

                    {/* Interactive Points */}
                    {data.map((d, i) => {
                        const x = (i / (data.length - 1)) * 100;
                        const y = 100 - (d.value / maxVal) * 80;
                        return (
                            <g key={i}>
                                <circle
                                    cx={`${x}%`}
                                    cy={`${y}%`}
                                    r="4" // Larger hit area, rendered small via CSS or separate visible circle
                                    fill="transparent"
                                    className="cursor-pointer"
                                    onMouseEnter={() => setHoveredIndex(i)}
                                />
                                {hoveredIndex === i && (
                                    <circle cx={`${x}%`} cy={`${y}%`} r="2" fill="#fff" stroke="#a855f7" strokeWidth="2" />
                                )}
                            </g>
                        )
                    })}
                </svg>

                {/* Tooltip */}
                {hoveredIndex !== null && (
                    <div
                        className="absolute top-0 bg-slate-800 text-white text-xs rounded px-2 py-1 transform -translate-x-1/2 -translate-y-full pointer-events-none transition-all z-10 shadow-xl"
                        style={{
                            left: `${(hoveredIndex / (data.length - 1)) * 100}%`,
                            top: `${100 - (data[hoveredIndex].value / maxVal) * 80}%`,
                            marginTop: '-10px'
                        }}
                    >
                        <div className="font-bold">{data[hoveredIndex].value} agendamentos</div>
                        <div className="text-[10px] text-slate-300">{data[hoveredIndex].label}</div>
                        <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 rotate-45 w-2 h-2 bg-slate-800"></div>
                    </div>
                )}
            </div>

            {/* X-Axis Labels */}
            <div className="flex justify-between mt-2 text-xs text-slate-400 px-1">
                {data.filter((_, i) => i % Math.ceil(data.length / 7) === 0).map((d, i) => (
                    <span key={i}>{d.label.split('/')[0]}/{d.label.split('/')[1]}</span>
                ))}
            </div>
        </div>
    );
};

const MetricCard: React.FC<{
    icon: React.ReactNode,
    title: string,
    value: string | number,
    subtext?: string,
    trend?: number,
    trendLabel?: string
}> = ({ icon, title, value, subtext, trend, trendLabel }) => {
    const isPositive = trend !== undefined && trend >= 0;
    const isNeutral = trend === 0;

    return (
        <div className="bg-white p-5 rounded-xl shadow-lg border border-slate-200 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between mb-4">
                <div className="bg-slate-100 p-3 rounded-full">{icon}</div>
                {trend !== undefined && (
                    <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${isNeutral ? 'bg-slate-100 text-slate-600' : isPositive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {isPositive ? <TrendingUpIcon className="w-3 h-3" /> : <TrendingDownIcon className="w-3 h-3" />}
                        <span>{Math.abs(trend).toFixed(1)}%</span>
                    </div>
                )}
            </div>
            <div>
                <p className="text-sm text-slate-500 font-semibold">{title}</p>
                <p className="text-2xl font-bold text-slate-800 mt-1">{value}</p>
                {subtext && <p className="text-xs text-slate-400 mt-1">{subtext}</p>}
                {trendLabel && <p className="text-xs text-slate-400 mt-1">{trendLabel}</p>}
            </div>
        </div>
    );
};

const RankingListItem: React.FC<{ rank: number, name: string, value: string }> = ({ rank, name, value }) => (
    <li className="flex items-center justify-between p-2 rounded-md hover:bg-slate-50">
        <div className="flex items-center gap-3">
            <span className="font-bold text-sm text-slate-400 w-5 text-center">{rank}</span>
            <p className="font-semibold text-slate-700 truncate max-w-[150px]">{name}</p>
        </div>
        <p className="font-bold text-purple-600 text-sm">{value}</p>
    </li>
);

interface ChurnRiskClient {
    client: Client;
    daysSinceLastBooking: number;
    averageTicket: number;
    riskLevel: 'High' | 'Medium';
}

const ChurnRiskListItem: React.FC<{ item: ChurnRiskClient }> = ({ item }) => {
    const handleAction = () => {
        alert(`Simulação: Mensagem de recuperação enviada para ${item.client.email} com cupom de 10% OFF!`);
    };

    return (
        <div className="flex items-center justify-between p-4 border border-slate-200 rounded-lg bg-slate-50 hover:bg-white transition-colors">
            <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${item.riskLevel === 'High' ? 'bg-red-100 text-red-600' : 'bg-yellow-100 text-yellow-600'}`}>
                    <AlertTriangleIcon className="w-5 h-5" />
                </div>
                <div>
                    <p className="font-bold text-slate-800">{item.client.name}</p>
                    <p className="text-xs text-slate-500">
                        <span className="font-semibold">{item.daysSinceLastBooking} dias</span> sem agendar • Ticket Médio: R$ {item.averageTicket.toFixed(2)}
                    </p>
                </div>
            </div>
            <button onClick={handleAction} className="text-xs font-bold text-purple-600 hover:text-white hover:bg-purple-600 px-3 py-1.5 rounded-full border border-purple-600 transition-colors flex items-center gap-1">
                <MessageSquareIcon className="w-3 h-3" /> Recuperar
            </button>
        </div>
    );
};

const ReportsPage: React.FC = () => {
    const [loadingAI, setLoadingAI] = useState(false);
    const [aiInsight, setAiInsight] = useState('');
    const [aiError, setAiError] = useState('');
    const [dateRange, setDateRange] = useState<DateRangeOption>('this_month');

    const [data, setData] = useState<{
        bookings: Booking[];
        clients: Client[];
        photographers: Photographer[];
        services: Service[];
        timeOffs: TimeOff[];
        feedbacks: any[];
    }>({ bookings: [], clients: [], photographers: [], services: [], timeOffs: [], feedbacks: [] });

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [bookings, clients, photographers, services, timeOffs, feedbacks] = await Promise.all([
                    getAllBookings(),
                    getClients(),
                    getPhotographers(),
                    getServices(),
                    getAllTimeOffs(),
                    getAllFeedbacks()
                ]);
                console.log('ReportsPage Data Fetched:', {
                    bookingsCount: bookings.length,
                    clientsCount: clients.length,
                    photographersCount: photographers.length,
                    servicesCount: services.length,
                    timeOffsCount: timeOffs.length
                });
                setData({ bookings, clients, photographers, services, timeOffs, feedbacks });
            } catch (error) {
                console.error("Error fetching report data:", error);
            }
        };
        fetchData();
    }, []);

    const metrics = useMemo(() => {
        const { bookings, clients, photographers, services } = data;

        const { start, end, prevStart, prevEnd } = getDateRange(dateRange);

        const isInRange = (dateStr: string | undefined, rangeStart: Date, rangeEnd: Date) => {
            if (!dateStr) return false;
            const d = new Date(dateStr.replace(/-/g, '/'));
            return d >= rangeStart && d <= rangeEnd;
        };

        // Filter bookings
        const currentBookings = bookings.filter(b => isInRange(b.date, start, end));
        const prevBookings = bookings.filter(b => isInRange(b.date, prevStart, prevEnd));

        // --- Calculate Current Metrics ---
        const currentRealized = currentBookings.filter(b => ['Realizado', 'Concluído'].includes(b.status || ''));
        const currentRevenue = currentRealized.reduce((sum, b) => sum + b.total_price, 0);
        const currentCount = currentBookings.length; // Volume total
        const currentAvgTicket = currentRealized.length > 0 ? currentRevenue / currentRealized.length : 0;
        const currentActiveClients = new Set(currentBookings.map(b => b.client_id)).size;

        // --- Calculate Previous Metrics ---
        const prevRealized = prevBookings.filter(b => ['Realizado', 'Concluído'].includes(b.status || ''));
        const prevRevenue = prevRealized.reduce((sum, b) => sum + b.total_price, 0);
        const prevCount = prevBookings.length;
        const prevActiveClients = new Set(prevBookings.map(b => b.client_id)).size;

        // --- Calculate Trends ---
        const revenueChange = prevRevenue === 0 ? (currentRevenue > 0 ? 100 : 0) : ((currentRevenue - prevRevenue) / prevRevenue) * 100;
        const countChange = prevCount === 0 ? (currentCount > 0 ? 100 : 0) : ((currentCount - prevCount) / prevCount) * 100;
        const clientsChange = prevActiveClients === 0 ? (currentActiveClients > 0 ? 100 : 0) : ((currentActiveClients - prevActiveClients) / prevActiveClients) * 100;

        // --- New Metric: Total Received (Pre-paid) ---
        const prePaidClientIds = new Set(clients.filter(c => c.paymentType === 'Pré-pago').map(c => c.id));
        const prepaidRevenue = currentBookings
            .filter(b => prePaidClientIds.has(b.client_id) && (b.status === 'Confirmado' || b.status === 'Realizado' || b.status === 'Concluído'))
            .reduce((sum, b) => sum + b.total_price, 0);

        // --- Chart Data Generation ---
        const chartDataMap = new Map<string, number>();
        const dayIterator = new Date(start);
        while (dayIterator <= end) {
            chartDataMap.set(dayIterator.toISOString().split('T')[0], 0);
            dayIterator.setDate(dayIterator.getDate() + 1);
        }

        currentBookings.forEach(b => {
            const dateKey = b.date;
            if (dateKey && chartDataMap.has(dateKey)) {
                chartDataMap.set(dateKey, (chartDataMap.get(dateKey) || 0) + 1);
            }
        });

        const chartData = Array.from(chartDataMap.entries()).map(([date, count]) => ({
            date,
            value: count,
            label: new Date(date.replace(/-/g, '/')).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
        }));


        // Ranking Logic
        const topPerformers = (
            list: (Client | Photographer | Service)[],
            idKey: 'client_id' | 'photographer_id' | 'service_ids'
        ) => {
            const revenueMap = new Map<string, number>();
            currentRealized.forEach(booking => {
                let ids: string[] = [];
                const val = booking[idKey];

                if (Array.isArray(val)) {
                    ids = val.filter((id): id is string => typeof id === 'string');
                } else if (typeof val === 'string') {
                    ids = [val];
                }

                if (ids.length === 0) return;

                ids.forEach((id) => {
                    revenueMap.set(id, (revenueMap.get(id) || 0) + booking.total_price / ids.length);
                });
            });

            return list.map(item => ({
                ...item,
                revenue: revenueMap.get(item.id) || 0,
            }))
                .filter(item => item.revenue > 0)
                .sort((a, b) => b.revenue - a.revenue)
                .slice(0, 5);
        };

        return {
            revenue: { val: currentRevenue, change: revenueChange },
            bookings: { val: currentCount, change: countChange },
            avgTicket: { val: currentAvgTicket },
            activeClients: { val: currentActiveClients, change: clientsChange },
            prepaidRevenue,
            chartData,
            topClients: topPerformers(clients, 'client_id'),
            topPhotographers: topPerformers(photographers, 'photographer_id'),
            topServices: topPerformers(services, 'service_ids'),
            currentBookings
        };
    }, [dateRange, data]);

    const absenceMetrics = useMemo(() => {
        const { photographers, timeOffs } = data;
        const { start, end } = getDateRange(dateRange);

        // Filter time offs that overlap with the selected range
        // Overlap logic: TimeOff.start < Range.end AND TimeOff.end > Range.start
        const timeOffsInRange = timeOffs.filter(to => {
            const toStart = new Date(to.start_datetime);
            const toEnd = new Date(to.end_datetime);
            return toStart < end && toEnd > start;
        });

        const slotsByPhotographer = timeOffsInRange.reduce((acc, to) => {
            acc[to.photographer_id] = (acc[to.photographer_id] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        let totalPlatformCost = 0;

        const photographerRanking: PhotographerOpportunityCost[] = photographers.map(p => {
            const blockedSlots = slotsByPhotographer[p.id] || 0;
            // const avgEarning = getPhotographerAverageEarning(p.id); // Removed in favor of fixed cost
            const opportunityCost = blockedSlots * 85; // Fixed cost for Admin/Editor view
            totalPlatformCost += opportunityCost;
            return { photographer: p, blockedSlots, opportunityCost };
        }).sort((a, b) => b.opportunityCost - a.opportunityCost); // Sort by highest cost (removed reverse for correct desc sorting)

        return { photographerRanking, totalPlatformCost };

    }, [dateRange, data]);

    const churnRiskClients = useMemo(() => {
        const { bookings, clients } = data;

        const riskList: ChurnRiskClient[] = [];
        const now = new Date();

        clients.forEach(client => {
            // Check for undefined date in bookings before comparison
            const clientBookings = bookings.filter(b => b.client_id === client.id && ['Realizado', 'Concluído'].includes(b.status || '') && b.date);
            if (clientBookings.length === 0) return;

            const lastBooking = clientBookings.reduce((latest, current) => {
                // Ensure dates are valid
                if (!current.date) return latest;
                return new Date(current.date) > new Date(latest.date!) ? current : latest;
            });

            if (!lastBooking.date) return;

            const lastBookingDate = new Date(lastBooking.date);
            const diffTime = Math.abs(now.getTime() - lastBookingDate.getTime());
            const daysSinceLastBooking = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            const totalSpent = clientBookings.reduce((sum, b) => sum + b.total_price, 0);
            const averageTicket = totalSpent / clientBookings.length;

            if (daysSinceLastBooking > 45) {
                riskList.push({ client, daysSinceLastBooking, averageTicket, riskLevel: 'High' });
            } else if (daysSinceLastBooking > 30) {
                riskList.push({ client, daysSinceLastBooking, averageTicket, riskLevel: 'Medium' });
            }
        });

        return riskList.sort((a, b) => b.daysSinceLastBooking - a.daysSinceLastBooking);
    }, [data]);


    const generateAIInsight = async () => {
        setLoadingAI(true);
        setAiInsight('');
        setAiError('');

        try {
            // Processed Data for AI (Filtered by date)
            const financialData = {
                revenue: metrics.revenue.val,
                bookings: metrics.bookings.val,
                ticket: metrics.avgTicket.val,
                costOfAbsence: absenceMetrics.totalPlatformCost,
                prepaid: metrics.prepaidRevenue
            };

            const currentBookings = metrics.currentBookings;
            const cancelCount = currentBookings.filter(b => b.status === 'Cancelado').length;
            const cancelRate = metrics.bookings.val > 0 ? (cancelCount / metrics.bookings.val) * 100 : 0;

            const topService = metrics.topServices.length > 0 ? metrics.topServices[0].name : 'Nenhum';

            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

            const prompt = `
            Você é o Diretor de Estratégia (CSO) da plataforma 'sheep.house'. Analise os dados do período: ${dateRange.replace('_', ' ').toUpperCase()}.

            **DADOS DO PERÍODO:**
            - Faturamento Total: R$ ${financialData.revenue.toFixed(2)}
            - Recebimento Antecipado (Pix): R$ ${financialData.prepaid.toFixed(2)}
            - Volume de Agendamentos: ${financialData.bookings}
            - Ticket Médio: R$ ${financialData.ticket.toFixed(2)}
            - Taxa de Cancelamento: ${cancelRate.toFixed(1)}%
            - Custo de Oportunidade (Folgas): R$ ${financialData.costOfAbsence.toFixed(2)}
            - Serviço Mais Vendido: ${topService}

            **SUA TAREFA:**
            Gere um relatório estratégico curto e direto em Markdown. Foco no que aconteceu NESTE período.

            ### 📊 Análise do Período (${dateRange})

            **Desempenho Financeiro**
            - Comente sobre o faturamento e o fluxo de caixa antecipado (Pix).

            **Eficiência Operacional**
            - Analise os cancelamentos e o custo de oportunidade das folgas dos fotógrafos. Estamos perdendo muito dinheiro com bloqueios de agenda?

            **Destaques & Ações**
            - Mencione o serviço destaque.
            - Sugira 1 ação prática para melhorar os resultados no próximo período similar.
            `;

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
            });

            setAiInsight(response.text);

        } catch (error) {
            console.error("Error generating AI insight:", error);
            setAiError("Ocorreu um erro ao gerar a análise. Tente novamente.");
        } finally {
            setLoadingAI(false);
        }
    };

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

    return (
        <div className="space-y-8 animate-fade-in">
            <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800">Relatórios & BI</h1>
                    <p className="text-slate-500">Análise de desempenho e insights detalhados.</p>
                </div>
                <div className="flex items-center gap-2 bg-white p-2 rounded-lg shadow-sm border border-slate-200">
                    <FilterIcon className="w-5 h-5 text-slate-400" />
                    <select
                        value={dateRange}
                        onChange={(e) => setDateRange(e.target.value as DateRangeOption)}
                        className="bg-transparent text-sm font-medium text-slate-700 focus:outline-none cursor-pointer"
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
            </header>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <MetricCard
                    icon={<DollarSignIcon className="w-6 h-6 text-green-500" />}
                    title="Faturamento Total"
                    value={`R$ ${metrics.revenue.val.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                    subtext="Realizados no período"
                    trend={dateRange !== 'all_time' ? metrics.revenue.change : undefined}
                    trendLabel={getRangeLabel()}
                />
                <MetricCard
                    icon={<CheckCircleIcon className="w-6 h-6 text-emerald-500" />}
                    title="Já Recebido (Pix)"
                    value={`R$ ${metrics.prepaidRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                    subtext="Fluxo de caixa garantido"
                />
                <MetricCard
                    icon={<ListOrderedIcon className="w-6 h-6 text-blue-500" />}
                    title="Agendamentos"
                    value={metrics.bookings.val}
                    subtext="Volume total no período"
                    trend={dateRange !== 'all_time' ? metrics.bookings.change : undefined}
                    trendLabel={getRangeLabel()}
                />
                <MetricCard
                    icon={<UsersIcon className="w-6 h-6 text-purple-500" />}
                    title="Clientes Ativos"
                    value={metrics.activeClients.val}
                    subtext="Que agendaram no período"
                    trend={dateRange !== 'all_time' ? metrics.activeClients.change : undefined}
                    trendLabel={getRangeLabel()}
                />
            </div>

            {/* NEW CHART SECTION */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <DailyTrendChart
                        data={metrics.chartData}
                        change={metrics.bookings.change}
                        total={metrics.bookings.val}
                    />
                </div>

                <div className="lg:col-span-1 bg-white p-6 rounded-xl shadow-lg border border-slate-200 flex flex-col justify-between">
                    <div>
                        <div className="flex items-center gap-3 mb-4">
                            <SparklesIcon className="w-8 h-8 text-purple-500" />
                            <h2 className="text-xl font-bold text-slate-700">Análise Inteligente</h2>
                        </div>
                        <p className="text-slate-500 mb-4 text-sm">Gere um relatório analítico focado especificamente nos dados do período selecionado.</p>
                        <button onClick={generateAIInsight} disabled={loadingAI} className="w-full font-semibold text-white bg-gradient-to-r from-purple-600 to-pink-500 px-6 py-3 rounded-lg shadow-md hover:shadow-lg transition-shadow disabled:opacity-50 flex items-center justify-center gap-2 text-sm">
                            <SparklesIcon className="w-4 h-4" />
                            {loadingAI ? 'Analisando...' : 'Gerar Análise com IA'}
                        </button>
                    </div>
                    <div className="mt-6 flex-1 overflow-y-auto max-h-[200px] scrollbar-thin scrollbar-thumb-purple-200">
                        {loadingAI && <p className="text-center text-slate-500 animate-pulse text-sm">A IA está cruzando os dados...</p>}
                        {aiError && <p className="text-center text-red-500 text-sm">{aiError}</p>}
                        {aiInsight && (
                            <div className="prose prose-sm prose-purple max-w-none p-3 bg-slate-50 rounded-lg border border-slate-200" dangerouslySetInnerHTML={{ __html: aiInsight.replace(/\n/g, '<br />').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
                        )}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 bg-white p-6 rounded-xl shadow-lg border border-slate-200">
                    <div className="flex items-center gap-2 mb-4"><CameraIcon className="w-5 h-5 text-slate-500" /><h3 className="text-lg font-bold text-slate-700">Top Fotógrafos</h3></div>
                    <ul className="space-y-1">
                        {metrics.topPhotographers.length > 0 ? metrics.topPhotographers.map((p, i) => <RankingListItem key={p.id} rank={i + 1} name={p.name} value={`R$ ${p.revenue.toFixed(2)}`} />) : <p className="text-sm text-slate-500 text-center py-4">Sem dados.</p>}
                    </ul>
                </div>
                <div className="lg:col-span-1 bg-white p-6 rounded-xl shadow-lg border border-slate-200">
                    <div className="flex items-center gap-2 mb-4"><UsersIcon className="w-5 h-5 text-slate-500" /><h3 className="text-lg font-bold text-slate-700">Top Clientes</h3></div>
                    <ul className="space-y-1">
                        {metrics.topClients.length > 0 ? metrics.topClients.map((c, i) => <RankingListItem key={c.id} rank={i + 1} name={c.name} value={`R$ ${c.revenue.toFixed(2)}`} />) : <p className="text-sm text-slate-500 text-center py-4">Sem dados.</p>}
                    </ul>
                </div>
                <div className="lg:col-span-1 bg-white p-6 rounded-xl shadow-lg border border-slate-200">
                    <div className="flex items-center gap-2 mb-4"><ListOrderedIcon className="w-5 h-5 text-slate-500" /><h3 className="text-lg font-bold text-slate-700">Top Serviços</h3></div>
                    <ul className="space-y-1">
                        {metrics.topServices.length > 0 ? metrics.topServices.map((s, i) => <RankingListItem key={s.id} rank={i + 1} name={s.name} value={`R$ ${s.revenue.toFixed(2)}`} />) : <p className="text-sm text-slate-500 text-center py-4">Sem dados.</p>}
                    </ul>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-lg border border-slate-200">
                    <div className="flex items-center gap-2 mb-4">
                        <TrendingDownIcon className="w-5 h-5 text-red-500" />
                        <h3 className="text-lg font-bold text-slate-700">Radar de Retenção (Geral)</h3>
                    </div>
                    <p className="text-sm text-slate-500 mb-4">Clientes inativos há mais de 30 dias (análise histórica global).</p>
                    <div className="space-y-3 max-h-[320px] overflow-y-auto pr-2">
                        {churnRiskClients.length > 0 ? (
                            churnRiskClients.map((item) => <ChurnRiskListItem key={item.client.id} item={item} />)
                        ) : (
                            <p className="text-center text-slate-500 py-10">Todos os clientes estão ativos recentemente! 🎉</p>
                        )}
                    </div>
                </div>

                <div className="lg:col-span-1 bg-white p-6 rounded-xl shadow-lg border border-slate-200 flex flex-col">
                    <div className="flex items-center gap-2 mb-6">
                        <XCircleIcon className="w-5 h-5 text-red-500" />
                        <h3 className="text-lg font-bold text-slate-700">Custo de Ausências</h3>
                    </div>

                    {/* Total Big Number */}
                    <div className="mb-6 p-4 bg-red-50 rounded-xl border border-red-100 text-center">
                        <p className="text-sm text-red-600 font-medium uppercase tracking-wide mb-1">Impacto Total no Período</p>
                        <p className="text-3xl font-extrabold text-red-700">
                            {absenceMetrics.totalPlatformCost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </p>
                    </div>

                    {/* Ranking List */}
                    <div className="flex-1 overflow-hidden">
                        <h4 className="text-xs font-bold text-slate-400 uppercase mb-3">Ranking de Bloqueios</h4>
                        <ul className="space-y-2 overflow-y-auto max-h-[240px] pr-2 scrollbar-thin scrollbar-thumb-slate-200">
                            {absenceMetrics.photographerRanking.length > 0 ? (
                                absenceMetrics.photographerRanking
                                    .filter(item => item.blockedSlots > 0) // Only show relevant ones
                                    .slice(0, 10) // Limit items
                                    .map((item, i) => (
                                        <li key={item.photographer.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-colors">
                                            <div className="flex items-center gap-3 overflow-hidden">
                                                <span className={`flex-shrink-0 w-6 h-6 flex items-center justify-center text-xs font-bold rounded-full ${i < 3 ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-500'}`}>
                                                    {i + 1}
                                                </span>
                                                <div className="truncate">
                                                    <p className="font-semibold text-slate-700 text-sm truncate">{item.photographer.name}</p>
                                                    <p className="text-[10px] text-slate-400">{item.blockedSlots} bloqueios</p>
                                                </div>
                                            </div>
                                            <p className="font-bold text-red-600 text-sm flex-shrink-0">
                                                - {item.opportunityCost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                            </p>
                                        </li>
                                    ))
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-slate-400 py-8">
                                    <CheckCircleIcon className="w-8 h-8 mb-2 opacity-50" />
                                    <p className="text-sm">Nenhum bloqueio registrado.</p>
                                </div>
                            )}
                        </ul>
                    </div>
                </div>
            </div>

            {/* QUALITY & FAILURES SECTION */}
            <div className="bg-white p-6 rounded-xl shadow-lg border border-slate-200">
                <div className="flex items-center gap-2 mb-6">
                    <AlertTriangleIcon className="w-6 h-6 text-red-500" />
                    <h3 className="text-xl font-bold text-slate-700">Relatório de Qualidade & Falhas</h3>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-slate-500">
                        <thead className="text-xs text-slate-700 uppercase bg-slate-50">
                            <tr>
                                <th scope="col" className="px-6 py-3">Data</th>
                                <th scope="col" className="px-6 py-3">Fotógrafo</th>
                                <th scope="col" className="px-6 py-3">Categoria</th>
                                <th scope="col" className="px-6 py-3">Gravidade</th>
                                <th scope="col" className="px-6 py-3">Detalhes</th>
                                <th scope="col" className="px-6 py-3">Agendamento</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.feedbacks && data.feedbacks.length > 0 ? (
                                data.feedbacks.map((fb: any) => (
                                    <tr key={fb.id} className="bg-white border-b hover:bg-slate-50">
                                        <td className="px-6 py-4 font-medium text-slate-900 whitespace-nowrap">
                                            {new Date(fb.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 font-semibold text-slate-700">
                                            {fb.photographer_name}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="bg-slate-100 text-slate-800 text-xs font-medium px-2.5 py-0.5 rounded border border-slate-200">
                                                {fb.category.replace(/_/g, ' ')}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`text-xs font-bold px-2 py-1 rounded-full ${fb.severity === 'CRITICAL' ? 'bg-red-100 text-red-800' :
                                                    fb.severity === 'WARNING' ? 'bg-yellow-100 text-yellow-800' :
                                                        'bg-blue-100 text-blue-800'
                                                }`}>
                                                {fb.severity}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 italic text-slate-600 max-w-xs truncate" title={fb.notes}>
                                            "{fb.notes}"
                                        </td>
                                        <td className="px-6 py-4 text-xs">
                                            <div className="font-semibold">{fb.client_name}</div>
                                            <div className="text-slate-400">{fb.booking_address}</div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                                        Nenhuma falha registrada. Excelente trabalho! 🎉
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default ReportsPage;
