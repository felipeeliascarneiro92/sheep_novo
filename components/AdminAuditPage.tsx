
import React, { useState, useEffect, useMemo } from 'react';
import { getAuditLogs } from '../services/auditService';
import { AuditLog, AuditActionType } from '../types';
import { ShieldIcon, SearchIcon, FilterIcon, PlusIcon, EditIcon, XCircleIcon, DollarSignIcon, RefreshCwIcon, UserIcon } from './icons';

const getIconForAction = (type: AuditActionType) => {
    switch (type) {
        case 'CREATE': return <PlusIcon className="w-5 h-5 text-green-600" />;
        case 'UPDATE': return <EditIcon className="w-5 h-5 text-blue-600" />;
        case 'DELETE': return <XCircleIcon className="w-5 h-5 text-red-600" />;
        case 'FINANCE': return <DollarSignIcon className="w-5 h-5 text-yellow-600" />;
        case 'STATUS_CHANGE': return <RefreshCwIcon className="w-5 h-5 text-purple-600" />;
        case 'LOGIN': return <UserIcon className="w-5 h-5 text-slate-600" />;
        default: return <ShieldIcon className="w-5 h-5 text-slate-600" />;
    }
};

const getBgColorForAction = (type: AuditActionType) => {
    switch (type) {
        case 'CREATE': return 'bg-green-100';
        case 'UPDATE': return 'bg-blue-100';
        case 'DELETE': return 'bg-red-100';
        case 'FINANCE': return 'bg-yellow-100';
        case 'STATUS_CHANGE': return 'bg-purple-100';
        default: return 'bg-slate-100';
    }
};

const AdminAuditPage: React.FC = () => {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [roleFilter, setRoleFilter] = useState('all');

    useEffect(() => {
        const fetchLogs = async () => {
            const data = await getAuditLogs();
            setLogs(data);
        };
        fetchLogs();
    }, []);

    const filteredLogs = useMemo(() => {
        return logs.filter(log => {
            const matchesSearch =
                log.details.toLowerCase().includes(searchQuery.toLowerCase()) ||
                log.actorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                log.category.toLowerCase().includes(searchQuery.toLowerCase());

            const matchesRole = roleFilter === 'all' || log.role === roleFilter;

            return matchesSearch && matchesRole;
        });
    }, [logs, searchQuery, roleFilter]);

    const stats = useMemo(() => {
        const today = new Date().toISOString().split('T')[0];
        return {
            total: logs.length,
            today: logs.filter(l => l.timestamp.startsWith(today)).length,
            critical: logs.filter(l => l.actionType === 'DELETE' || l.actionType === 'FINANCE').length
        };
    }, [logs]);

    return (
        <div className="space-y-8 animate-fade-in">
            <header>
                <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-3">
                    <ShieldIcon className="w-8 h-8 text-slate-800 dark:text-slate-100" />
                    Timeline de Auditoria
                </h1>
                <p className="text-slate-500 dark:text-slate-400">Registro de segurança e governança do sistema.</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                    <div>
                        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Logs Totais</p>
                        <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{stats.total}</p>
                    </div>
                    <div className="bg-slate-100 dark:bg-slate-700 p-3 rounded-full"><ShieldIcon className="w-6 h-6 text-slate-500 dark:text-slate-400" /></div>
                </div>
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                    <div>
                        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Ações Hoje</p>
                        <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{stats.today}</p>
                    </div>
                    <div className="bg-blue-100 dark:bg-blue-900/30 p-3 rounded-full"><RefreshCwIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" /></div>
                </div>
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                    <div>
                        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Ações Críticas</p>
                        <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{stats.critical}</p>
                    </div>
                    <div className="bg-red-100 dark:bg-red-900/30 p-3 rounded-full"><XCircleIcon className="w-6 h-6 text-red-600 dark:text-red-400" /></div>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
                <div className="flex flex-col sm:flex-row gap-4 mb-6 justify-between items-center">
                    <div className="relative w-full sm:w-96">
                        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 dark:text-slate-500" />
                        <input
                            type="text"
                            placeholder="Buscar por ator, ação ou detalhe..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full pl-10 p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg focus:ring-purple-500 focus:border-purple-500 transition-colors"
                        />
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <FilterIcon className="w-5 h-5 text-slate-400 dark:text-slate-500" />
                        <select
                            value={roleFilter}
                            onChange={e => setRoleFilter(e.target.value)}
                            className="p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-sm font-medium text-slate-700 dark:text-slate-200 focus:outline-none w-full sm:w-auto"
                        >
                            <option value="all">Todos Atores</option>
                            <option value="Admin">Admin</option>
                            <option value="Cliente">Cliente</option>
                            <option value="Fotógrafo">Fotógrafo</option>
                            <option value="Sistema">Sistema</option>
                        </select>
                    </div>
                </div>

                <div className="space-y-0 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-300 dark:before:via-slate-600 before:to-transparent">
                    {filteredLogs.length > 0 ? filteredLogs.map((log) => (
                        <div key={log.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active mb-8 last:mb-0">
                            {/* Icon */}
                            <div className={`flex items-center justify-center w-10 h-10 rounded-full border-4 border-white dark:border-slate-800 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 ${getBgColorForAction(log.actionType)}`}>
                                {getIconForAction(log.actionType)}
                            </div>

                            {/* Content Card */}
                            <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-white dark:bg-slate-700 p-4 rounded-xl border border-slate-200 dark:border-slate-600 shadow-sm hover:shadow-md transition-shadow">
                                <div className="flex justify-between items-start mb-1">
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-slate-800 dark:text-slate-100 text-sm">{log.actorName}</span>
                                        <span className="text-[10px] px-2 py-0.5 bg-slate-100 dark:bg-slate-600 text-slate-500 dark:text-slate-300 rounded-full border border-slate-200 dark:border-slate-500 uppercase font-bold">{log.role}</span>
                                    </div>
                                    <time className="font-mono text-xs text-slate-400 dark:text-slate-500">{new Date(log.timestamp).toLocaleString('pt-BR')}</time>
                                </div>
                                <p className="text-sm text-slate-600 dark:text-slate-300 mb-2">{log.details}</p>
                                <div className="flex items-center gap-2 mt-2">
                                    <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 px-2 py-1 rounded uppercase tracking-wider border border-purple-100 dark:border-purple-800">
                                        {log.category}
                                    </span>
                                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                                        {log.actionType}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )) : (
                        <div className="text-center py-20 text-slate-500 dark:text-slate-400">Nenhum registro encontrado.</div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminAuditPage;
