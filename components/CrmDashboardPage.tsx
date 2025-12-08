import React, { useState, useEffect } from 'react';
import { User } from '../App';
import { getCrmAlerts, getNetworks, logCrmActivity, snoozeAlert, dismissAlert, getAllClientMetrics, getRecentActivities } from '../services/crmService';
import { CrmAlert, ClientCrmMetrics, CrmAlertType, CrmActivityType, CrmActivityResult, CrmActivity } from '../types';
import {
    AlertTriangleIcon, TrendingUpIcon, UsersIcon, UserXIcon,
    CheckCircleIcon, ClockIcon, XCircleIcon, MessageCircleIcon,
    PhoneIcon, MailIcon, CalendarIcon, SearchIcon, FilterIcon,
    RefreshCwIcon, LoaderIcon, HistoryIcon, XIcon
} from './icons';

interface CrmDashboardProps {
    user: User;
}

const CrmDashboardPage: React.FC<CrmDashboardProps> = ({ user }) => {
    const [alerts, setAlerts] = useState<CrmAlert[]>([]);
    const [metrics, setMetrics] = useState<ClientCrmMetrics[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedAlert, setSelectedAlert] = useState<CrmAlert | null>(null);

    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [priorityFilter, setPriorityFilter] = useState<'ALL' | 'HIGH' | 'MEDIUM' | 'LOW'>('ALL');

    // History
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [activities, setActivities] = useState<(CrmActivity & { client_name: string })[]>([]);

    // Action Modal State
    const [isActionModalOpen, setIsActionModalOpen] = useState(false);
    const [actionType, setActionType] = useState<CrmActivityType>('WHATSAPP');
    const [actionResult, setActionResult] = useState<CrmActivityResult>('SUCCESS');
    const [actionNotes, setActionNotes] = useState('');
    const [snoozeDays, setSnoozeDays] = useState(30);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        const [alertsData, metricsData] = await Promise.all([
            getCrmAlerts(),
            getAllClientMetrics()
        ]);
        setAlerts(alertsData);
        setMetrics(metricsData);
        setLoading(false);
    };

    const fetchHistory = async () => {
        const history = await getRecentActivities();
        setActivities(history);
        setIsHistoryOpen(true);
    };

    const handleOpenAction = (alert: CrmAlert) => {
        setSelectedAlert(alert);
        setActionType('WHATSAPP');
        setActionResult('SUCCESS');
        setActionNotes('');
        setIsActionModalOpen(true);
    };

    const handleSubmitAction = async () => {
        if (!selectedAlert) return;

        try {
            if (actionResult === 'SNOOZE') {
                await snoozeAlert(selectedAlert.id, snoozeDays);
            } else if (actionResult === 'DO_NOT_DISTURB' || actionResult === 'LOST') {
                await dismissAlert(selectedAlert.id);
                await logCrmActivity(selectedAlert.client_id, actionType, actionResult, actionNotes, user.id);
            } else {
                await logCrmActivity(selectedAlert.client_id, actionType, actionResult, actionNotes, user.id);
                if (actionResult === 'SUCCESS') {
                    await dismissAlert(selectedAlert.id);
                }
            }

            setIsActionModalOpen(false);
            fetchData();
        } catch (error) {
            console.error("Error submitting action:", error);
            alert("Erro ao salvar ação.");
        }
    };

    // --- FILTERS ---
    const filteredAlerts = alerts.filter(alert => {
        const matchesSearch = alert.client_name?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesPriority = priorityFilter === 'ALL' || alert.priority === priorityFilter;
        return matchesSearch && matchesPriority;
    });

    // --- RENDER HELPERS ---

    const getColumnIcon = (type: CrmAlertType) => {
        switch (type) {
            case 'GHOST_ACTIVATION': return <UserXIcon className="w-5 h-5 text-slate-500" />;
            case 'CHURN_RISK': return <AlertTriangleIcon className="w-5 h-5 text-red-500" />;
            case 'UPSELL_OPPORTUNITY': return <TrendingUpIcon className="w-5 h-5 text-green-500" />;
            case 'LOW_PENETRATION': return <UsersIcon className="w-5 h-5 text-blue-500" />;
            default: return <AlertTriangleIcon className="w-5 h-5" />;
        }
    };

    const getColumnTitle = (type: CrmAlertType) => {
        switch (type) {
            case 'GHOST_ACTIVATION': return 'Ativação (Leads)';
            case 'CHURN_RISK': return 'Risco de Churn';
            case 'UPSELL_OPPORTUNITY': return 'Oportunidade Upsell';
            case 'LOW_PENETRATION': return 'Expansão (Penetração)';
            default: return 'Outros';
        }
    };

    const getColumnColor = (type: CrmAlertType) => {
        switch (type) {
            case 'GHOST_ACTIVATION': return 'bg-slate-50 border-slate-200';
            case 'CHURN_RISK': return 'bg-red-50 border-red-200';
            case 'UPSELL_OPPORTUNITY': return 'bg-green-50 border-green-200';
            case 'LOW_PENETRATION': return 'bg-blue-50 border-blue-200';
            default: return 'bg-white';
        }
    };

    const renderAlertCard = (alert: CrmAlert) => {
        const clientMetric = metrics.find(m => m.client_id === alert.client_id);

        return (
            <div key={alert.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow cursor-pointer group relative" onClick={() => handleOpenAction(alert)}>
                <div className="flex justify-between items-start mb-2">
                    <h4 className="font-bold text-slate-800 text-sm">{alert.client_name}</h4>
                    {alert.priority === 'HIGH' && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" title="Alta Prioridade"></span>}
                </div>

                <div className="text-xs text-slate-500 space-y-1 mb-3">
                    {alert.type === 'CHURN_RISK' && (
                        <p className="text-red-600 font-medium">
                            ⚠️ {clientMetric?.days_since_last_booking || '?'} dias sem comprar
                        </p>
                    )}
                    {alert.type === 'UPSELL_OPPORTUNITY' && (
                        <p className="text-green-600 font-medium">
                            💎 Ticket Médio: R$ {clientMetric?.avg_ticket?.toFixed(0)}
                        </p>
                    )}
                    {alert.type === 'LOW_PENETRATION' && (
                        <p className="text-blue-600 font-medium">
                            👥 {clientMetric?.active_brokers_count}/{clientMetric?.total_brokers_count} corretores ativos
                        </p>
                    )}
                    {alert.type === 'GHOST_ACTIVATION' && (
                        <p className="text-slate-600 font-medium">
                            👻 Nunca comprou
                        </p>
                    )}
                </div>

                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity absolute bottom-2 right-2 left-2 bg-white/90 pt-1">
                    <button className="flex-1 bg-green-100 hover:bg-green-200 text-green-700 py-1.5 rounded text-xs font-bold flex items-center justify-center gap-1">
                        <MessageCircleIcon className="w-3 h-3" /> Ação
                    </button>
                </div>
            </div>
        );
    };

    const renderColumn = (type: CrmAlertType) => {
        const columnAlerts = filteredAlerts.filter(a => a.type === type);

        return (
            <div className={`flex-1 min-w-[280px] rounded-2xl p-4 border ${getColumnColor(type)} flex flex-col h-full max-h-[calc(100vh-240px)]`}>
                <div className="flex items-center gap-2 mb-4 pb-2 border-b border-black/5">
                    {getColumnIcon(type)}
                    <h3 className="font-bold text-slate-700">{getColumnTitle(type)}</h3>
                    <span className="ml-auto bg-white px-2 py-0.5 rounded-full text-xs font-bold text-slate-500 shadow-sm">
                        {columnAlerts.length}
                    </span>
                </div>

                <div className="flex-1 overflow-y-auto space-y-3 pr-1 scrollbar-thin scrollbar-thumb-slate-300">
                    {columnAlerts.length > 0 ? (
                        columnAlerts.map(renderAlertCard)
                    ) : (
                        <div className="h-32 flex items-center justify-center text-slate-400 text-xs italic text-center px-4">
                            Nenhuma oportunidade encontrada.
                        </div>
                    )}
                </div>
            </div>
        );
    };

    // Stats
    const totalActive = metrics.filter(m => m.lifecycle_stage === 'Active').length;

    return (
        <div className="space-y-6 animate-fade-in h-full flex flex-col">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 flex-shrink-0">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                        🧠 CRM Inteligente
                        <span className="text-xs font-normal bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full border border-purple-200">Beta</span>
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm">Gerencie o relacionamento e recupere clientes inativos.</p>
                </div>

                <div className="flex gap-3">
                    <button onClick={fetchHistory} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors text-sm font-medium">
                        <HistoryIcon className="w-4 h-4" /> Histórico
                    </button>
                    <button onClick={fetchData} className="p-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-slate-600 transition-colors">
                        <RefreshCwIcon className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex-shrink-0">
                <div className="flex-1 relative">
                    <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Buscar cliente..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full pl-9 p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none text-sm"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <FilterIcon className="w-4 h-4 text-slate-500" />
                    <select
                        value={priorityFilter}
                        onChange={e => setPriorityFilter(e.target.value as any)}
                        className="p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none text-sm bg-white"
                    >
                        <option value="ALL">Todas Prioridades</option>
                        <option value="HIGH">🔥 Alta Prioridade</option>
                        <option value="MEDIUM">⚠️ Média Prioridade</option>
                        <option value="LOW">ℹ️ Baixa Prioridade</option>
                    </select>
                </div>
            </div>

            {/* Main Board */}
            <div className="flex-1 overflow-x-auto pb-4">
                <div className="flex gap-4 h-full min-w-[1200px]">
                    {renderColumn('GHOST_ACTIVATION')}
                    {renderColumn('CHURN_RISK')}
                    {renderColumn('LOW_PENETRATION')}
                    {renderColumn('UPSELL_OPPORTUNITY')}
                </div>
            </div>

            {/* Action Modal */}
            {isActionModalOpen && selectedAlert && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 animate-fade-in-fast">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                        <div className="bg-slate-50 p-4 border-b border-slate-100 flex justify-between items-center">
                            <h3 className="font-bold text-slate-800">Ação: {selectedAlert.client_name}</h3>
                            <button onClick={() => setIsActionModalOpen(false)}><XCircleIcon className="w-6 h-6 text-slate-400 hover:text-slate-600" /></button>
                        </div>

                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">O que você fez?</label>
                                <div className="grid grid-cols-3 gap-2">
                                    <button
                                        onClick={() => setActionType('WHATSAPP')}
                                        className={`p-2 rounded-lg border text-sm flex flex-col items-center gap-1 ${actionType === 'WHATSAPP' ? 'bg-green-50 border-green-500 text-green-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                                    >
                                        <MessageCircleIcon className="w-4 h-4" /> WhatsApp
                                    </button>
                                    <button
                                        onClick={() => setActionType('CALL')}
                                        className={`p-2 rounded-lg border text-sm flex flex-col items-center gap-1 ${actionType === 'CALL' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                                    >
                                        <PhoneIcon className="w-4 h-4" /> Ligação
                                    </button>
                                    <button
                                        onClick={() => setActionType('EMAIL')}
                                        className={`p-2 rounded-lg border text-sm flex flex-col items-center gap-1 ${actionType === 'EMAIL' ? 'bg-purple-50 border-purple-500 text-purple-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                                    >
                                        <MailIcon className="w-4 h-4" /> Email
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Resultado</label>
                                <select
                                    value={actionResult}
                                    onChange={e => setActionResult(e.target.value as CrmActivityResult)}
                                    className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-purple-500"
                                >
                                    <option value="SUCCESS">✅ Sucesso / Reagendou</option>
                                    <option value="SNOOZE">💤 Snooze (Ligar depois)</option>
                                    <option value="NO_ANSWER">📞 Não Atendeu</option>
                                    <option value="LOST">❌ Perdido (Concorrente/Preço)</option>
                                    <option value="DO_NOT_DISTURB">🚫 Não Perturbe (Remover)</option>
                                </select>
                            </div>

                            {actionResult === 'SNOOZE' && (
                                <div className="animate-fade-in">
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Lembrar em (dias)</label>
                                    <input
                                        type="number"
                                        value={snoozeDays}
                                        onChange={e => setSnoozeDays(parseInt(e.target.value))}
                                        className="w-full p-2 border border-slate-300 rounded-lg"
                                        min="1"
                                    />
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Notas</label>
                                <textarea
                                    value={actionNotes}
                                    onChange={e => setActionNotes(e.target.value)}
                                    className="w-full p-2 border border-slate-300 rounded-lg h-20 resize-none focus:ring-2 focus:ring-purple-500"
                                    placeholder="Detalhes da conversa..."
                                />
                            </div>

                            <button
                                onClick={handleSubmitAction}
                                className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-3 rounded-xl shadow-lg transition-transform active:scale-[0.98]"
                            >
                                Salvar & Atualizar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* History Drawer */}
            {isHistoryOpen && (
                <div className="fixed inset-0 z-50 flex justify-end">
                    <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setIsHistoryOpen(false)} />
                    <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-slide-in-right">
                        <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                            <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                <HistoryIcon className="w-5 h-5 text-purple-600" /> Histórico de Atividades
                            </h3>
                            <button onClick={() => setIsHistoryOpen(false)} className="p-1 hover:bg-slate-200 rounded-full">
                                <XIcon className="w-5 h-5 text-slate-500" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {activities.length > 0 ? (
                                activities.map(activity => (
                                    <div key={activity.id} className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm relative">
                                        <div className="absolute top-4 right-4 text-xs text-slate-400">
                                            {new Date(activity.created_at).toLocaleDateString()}
                                        </div>
                                        <h4 className="font-bold text-slate-800 text-sm mb-1">{activity.client_name}</h4>
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${activity.type === 'WHATSAPP' ? 'bg-green-50 text-green-700 border-green-200' :
                                                    activity.type === 'CALL' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                                        'bg-slate-50 text-slate-700 border-slate-200'
                                                }`}>
                                                {activity.type}
                                            </span>
                                            <span className="text-slate-300">•</span>
                                            <span className={`text-xs font-bold ${activity.result === 'SUCCESS' ? 'text-green-600' :
                                                    activity.result === 'LOST' ? 'text-red-600' :
                                                        'text-slate-500'
                                                }`}>
                                                {activity.result}
                                            </span>
                                        </div>
                                        {activity.notes && (
                                            <p className="text-xs text-slate-600 bg-slate-50 p-2 rounded border border-slate-100 italic">
                                                "{activity.notes}"
                                            </p>
                                        )}
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-10 text-slate-400 text-sm">
                                    Nenhuma atividade recente.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CrmDashboardPage;
