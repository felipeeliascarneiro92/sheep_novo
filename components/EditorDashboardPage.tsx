
import React, { useState, useEffect, useMemo } from 'react';
import { User } from '../App';
import { getTasks } from '../services/taskService';
import { Task } from '../types';
import { CheckSquareIcon, ListOrderedIcon, TrendingUpIcon, AlertTriangleIcon, ClockIcon, FolderIcon, MessageSquareIcon } from './icons';
import Skeleton from './Skeleton';
import RecentFailuresWidget from './RecentFailuresWidget';

interface EditorDashboardPageProps {
    user: User;
    onNavigate: (page: 'tasks' | 'editing' | 'common-areas') => void;
}

const EditorDashboardPage: React.FC<EditorDashboardPageProps> = ({ user, onNavigate }) => {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            const allTasks = await getTasks();
            // Filter tasks for this editor if we had editor ID in tasks, but currently tasks use assigneeName.
            // Assuming user.name matches assigneeName or we show all for now if no specific assignment logic exists strictly.
            // Ideally we should filter by assignee_id but the current taskService uses assignee_name.
            // We will filter by name matching roughly or just show all if user is 'Editor'.

            // Refine this: Filter by assigneeName match closest first name or full name
            const myTasks = allTasks.filter(t =>
                t.assigneeName && user.name.toLowerCase().includes(t.assigneeName.toLowerCase())
            );

            // If very few tasks found (maybe name mismatch), show unassigned too?
            // For now let's just use all relevant tasks or 'Editor' generic tasks.
            const relevantTasks = allTasks.filter(t =>
                t.assigneeName === 'Editor' ||
                (t.assigneeName && user.name.toLowerCase().includes(t.assigneeName.toLowerCase()))
            );

            setTasks(relevantTasks.length > 0 ? relevantTasks : allTasks); // Fallback to all if none specific found, for dev purposes
            setIsLoading(false);
        };
        fetchData();
    }, [user]);

    const metrics = useMemo(() => {
        const pending = tasks.filter(t => t.status === 'Pendente').length;
        const completedMonth = tasks.filter(t => {
            if (t.status !== 'Concluído' || !t.completedAt) return false;
            const d = new Date(t.completedAt);
            const now = new Date();
            return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        }).length;

        return { pending, completedMonth };
    }, [tasks]);

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 flex justify-between items-center flex-wrap gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-3">
                        Olá, {user.name.split(' ')[0]}!
                        <span className="text-xs font-bold px-2 py-1 rounded-full bg-orange-100 text-orange-700 border border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800">
                            Editor
                        </span>
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400">Aqui está o resumo das suas demandas de edição.</p>
                </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white dark:bg-slate-800 p-5 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 flex items-center gap-4">
                    <div className="bg-orange-100 dark:bg-orange-900/30 p-3 rounded-full">
                        <ClockIcon className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                    </div>
                    <div>
                        <p className="text-sm text-slate-500 dark:text-slate-400 font-semibold">Tarefas Pendentes</p>
                        <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{metrics.pending}</p>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-800 p-5 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 flex items-center gap-4">
                    <div className="bg-green-100 dark:bg-green-900/30 p-3 rounded-full">
                        <CheckSquareIcon className="w-6 h-6 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                        <p className="text-sm text-slate-500 dark:text-slate-400 font-semibold">Concluídas (Mês)</p>
                        <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{metrics.completedMonth}</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Recent Failures Widget - Requested Feature */}
                <div className="lg:col-span-2">
                    <h2 className="text-xl font-bold text-slate-700 dark:text-slate-200 mb-4 flex items-center gap-2">
                        <AlertTriangleIcon className="w-5 h-5 text-red-500" />
                        Relatório de Qualidade & Falhas
                    </h2>
                    <RecentFailuresWidget limit={5} />
                </div>

                {/* Quick Actions */}
                <div className="space-y-6">
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
                        <h3 className="text-lg font-bold text-slate-700 dark:text-slate-200 mb-4">Acesso Rápido</h3>
                        <div className="space-y-3">
                            <button onClick={() => onNavigate('tasks')} className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors border border-transparent hover:border-slate-200 dark:hover:border-slate-600 text-left">
                                <div className="bg-purple-100 dark:bg-purple-900/30 p-2 rounded-lg text-purple-600 dark:text-purple-400">
                                    <ListOrderedIcon className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="font-semibold text-slate-800 dark:text-slate-200">Minhas Tarefas</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">Gerenciar fila de edição</p>
                                </div>
                            </button>

                            <button onClick={() => onNavigate('common-areas')} className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors border border-transparent hover:border-slate-200 dark:hover:border-slate-600 text-left">
                                <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-lg text-blue-600 dark:text-blue-400">
                                    <FolderIcon className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="font-semibold text-slate-800 dark:text-slate-200">Áreas Comuns</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">Cadastrar e editar locais</p>
                                </div>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EditorDashboardPage;
