
import React, { useState, useEffect, useMemo } from 'react';
import { getTasks, updateTaskStatus, addTaskComment, addTask, updateTask, deleteTask, getEditors, getAdmins, getAllBookings } from '../services/bookingService';
import { Task, TaskStatus, TaskComment, Editor, AdminUser, Booking } from '../types';
import { CheckSquareIcon, DollarSignIcon, ClockIcon, FilterIcon, MessageSquareIcon, XIcon, UserIcon, PlusIcon, EditIcon, XCircleIcon, CheckCircleIcon, SearchIcon, CalendarIcon } from './icons';

// --- SUB-COMPONENT: PAYMENT SUMMARY ---
const PaymentSummary: React.FC<{ tasks: Task[] }> = ({ tasks }) => {
    const summary = useMemo(() => {
        const grouped: Record<string, { toPay: number, count: number, forecast: number }> = {};

        tasks.forEach(task => {
            if (!grouped[task.assigneeName]) {
                grouped[task.assigneeName] = { toPay: 0, count: 0, forecast: 0 };
            }

            if (task.status === 'Concluído') {
                grouped[task.assigneeName].toPay += task.payout;
                grouped[task.assigneeName].count += 1;
            } else {
                grouped[task.assigneeName].forecast += task.payout;
            }
        });

        return Object.entries(grouped);
    }, [tasks]);

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {summary.map(([name, data]) => (
                <div key={name} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col justify-between">
                    <div className="flex justify-between items-start mb-2">
                        <h3 className="font-bold text-slate-700 text-lg">{name}</h3>
                        <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-full font-semibold">
                            {data.count} concluídas
                        </span>
                    </div>
                    <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-500">A Pagar:</span>
                            <span className="font-bold text-green-600">R$ {data.toPay.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                            <span className="text-slate-400">Previsto:</span>
                            <span className="font-medium text-slate-500">R$ {data.forecast.toFixed(2)}</span>
                        </div>
                    </div>
                </div>
            ))}
            {summary.length === 0 && (
                <div className="col-span-full p-6 text-center text-slate-500 bg-slate-50 border border-dashed rounded-xl">
                    Nenhum dado financeiro disponível.
                </div>
            )}
        </div>
    );
};

// --- SUB-COMPONENT: TASK FORM MODAL (CREATE/EDIT) ---
const TaskFormModal: React.FC<{
    initialData?: Task;
    onClose: () => void;
    onSave: () => void;
}> = ({ initialData, onClose, onSave }) => {
    const [formData, setFormData] = useState({
        title: initialData?.title || '',
        description: initialData?.description || '',
        assigneeName: initialData?.assigneeName || '',
        payout: initialData?.payout || 0,
        dueDate: initialData?.dueDate || '',
        bookingId: initialData?.bookingId || ''
    });
    const [assignees, setAssignees] = useState<{ name: string, role: string }[]>([]);
    const [allBookings, setAllBookings] = useState<Booking[]>([]);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const fetchData = async () => {
            const [editors, admins, bookings] = await Promise.all([
                getEditors(),
                getAdmins(),
                getAllBookings()
            ]);

            const editorOptions = editors.map(e => ({ name: e.name, role: 'Editor' }));
            const adminOptions = admins.map(a => ({ name: a.name, role: a.role }));
            setAssignees([...adminOptions, ...editorOptions, { name: 'Reidiane', role: 'Editor' }]);
            setAllBookings(bookings);
        };
        fetchData();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const payload = {
            ...formData,
            // Default bookingId to null (empty string) if not provided
            bookingId: formData.bookingId
        };

        if (initialData) {
            await updateTask(initialData.id, payload);
        } else {
            await addTask(payload);
        }
        onSave();
    };

    const handleDelete = async () => {
        if (initialData && window.confirm('Tem certeza que deseja excluir esta tarefa?')) {
            await deleteTask(initialData.id);
            onSave();
        }
    }

    const selectedBooking = allBookings.find(b => b.id === formData.bookingId);

    const filteredBookings = allBookings.filter(b => {
        if (!searchTerm) return false;
        const searchLower = searchTerm.toLowerCase();
        return (
            b.client_name.toLowerCase().includes(searchLower) ||
            b.address.toLowerCase().includes(searchLower) ||
            b.id.toLowerCase().includes(searchLower)
        );
    }).slice(0, 5);

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 animate-fade-in-fast" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
                <header className="p-6 border-b flex justify-between items-center">
                    <h2 className="text-xl font-bold text-slate-800">{initialData ? 'Editar Tarefa' : 'Nova Tarefa'}</h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-100"><XIcon className="w-6 h-6 text-slate-500" /></button>
                </header>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Título</label>
                        <input type="text" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} required className="w-full p-2 border rounded-lg focus:ring-purple-500 focus:border-purple-500" placeholder="Ex: Edição de Vídeo..." />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Descrição</label>
                        <textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} rows={3} className="w-full p-2 border rounded-lg focus:ring-purple-500 focus:border-purple-500" placeholder="Detalhes da tarefa..."></textarea>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Delegar para</label>
                            <select value={formData.assigneeName} onChange={e => setFormData({ ...formData, assigneeName: e.target.value })} required className="w-full p-2 border rounded-lg focus:ring-purple-500 focus:border-purple-500 bg-white">
                                <option value="">Selecione...</option>
                                {assignees.map((a, i) => <option key={i} value={a.name}>{a.name} ({a.role})</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Pagamento (R$)</label>
                            <input type="number" step="0.01" value={formData.payout} onChange={e => setFormData({ ...formData, payout: e.target.value === '' ? 0 : parseFloat(e.target.value) })} className="w-full p-2 border rounded-lg focus:ring-purple-500 focus:border-purple-500" />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Prazo</label>
                            <input type="date" value={formData.dueDate} onChange={e => setFormData({ ...formData, dueDate: e.target.value })} className="w-full p-2 border rounded-lg focus:ring-purple-500 focus:border-purple-500" />
                        </div>
                        <div className="relative">
                            <label className="block text-sm font-medium text-slate-700 mb-1">Vincular Agendamento</label>
                            {selectedBooking ? (
                                <div className="flex items-start justify-between p-2 bg-purple-50 border border-purple-200 rounded-lg">
                                    <div className="overflow-hidden">
                                        <p className="text-xs font-bold text-purple-700 truncate">{selectedBooking.client_name}</p>
                                        <p className="text-[10px] text-purple-600 truncate">{selectedBooking.address}</p>
                                        <p className="text-[10px] text-purple-500">{new Date(selectedBooking.date || '').toLocaleDateString('pt-BR')}</p>
                                    </div>
                                    <button type="button" onClick={() => setFormData({ ...formData, bookingId: '' })} className="text-purple-400 hover:text-purple-700">
                                        <XIcon className="w-4 h-4" />
                                    </button>
                                </div>
                            ) : (
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                                        <SearchIcon className="h-4 w-4 text-slate-400" />
                                    </div>
                                    <input
                                        type="text"
                                        value={searchTerm}
                                        onChange={e => setSearchTerm(e.target.value)}
                                        className="w-full pl-8 p-2 border rounded-lg focus:ring-purple-500 focus:border-purple-500 text-sm"
                                        placeholder="Buscar cliente ou endereço..."
                                    />
                                    {searchTerm && filteredBookings.length > 0 && (
                                        <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                            {filteredBookings.map(b => (
                                                <button
                                                    key={b.id}
                                                    type="button"
                                                    onClick={() => {
                                                        setFormData({ ...formData, bookingId: b.id });
                                                        setSearchTerm('');
                                                    }}
                                                    className="w-full text-left p-2 hover:bg-slate-50 border-b border-slate-100 last:border-0"
                                                >
                                                    <p className="text-xs font-bold text-slate-700">{b.client_name}</p>
                                                    <p className="text-[10px] text-slate-500 truncate">{b.address}</p>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-500 flex items-center gap-1">
                                                            <CalendarIcon className="w-3 h-3" /> {new Date(b.date || '').toLocaleDateString('pt-BR')}
                                                        </span>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="pt-4 flex justify-end gap-3">
                        {initialData && (
                            <button type="button" onClick={handleDelete} className="mr-auto text-red-600 hover:bg-red-50 px-3 py-2 rounded-lg font-semibold text-sm">Excluir</button>
                        )}
                        <button type="button" onClick={onClose} className="px-4 py-2 border rounded-lg text-slate-700 hover:bg-slate-50 font-medium">Cancelar</button>
                        <button type="submit" className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-bold">Salvar</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// --- SUB-COMPONENT: TASK DETAILS MODAL ---
const TaskDetailsModal: React.FC<{ task: Task; onClose: () => void; onUpdate: () => void }> = ({ task, onClose, onUpdate }) => {
    const [comment, setComment] = useState('');
    const [localComments, setLocalComments] = useState<TaskComment[]>(task.comments || []);

    const handlePostComment = async () => {
        if (!comment.trim()) return;
        // Mock author as 'Admin' for now, ideally this comes from user context
        const updatedTask = await addTaskComment(task.id, comment, 'Admin');
        if (updatedTask) {
            setLocalComments([...updatedTask.comments]);
            setComment('');
            onUpdate(); // Refresh parent list to show updated counts if needed
        }
    };

    const handleStatusChange = (newStatus: TaskStatus) => {
        updateTaskStatus(task.id, newStatus);
        onUpdate();
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 animate-fade-in-fast" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-[80vh] flex flex-col md:flex-row overflow-hidden" onClick={e => e.stopPropagation()}>

                {/* LEFT: Details */}
                <div className="w-full md:w-1/2 bg-slate-50 p-6 md:p-8 overflow-y-auto border-b md:border-b-0 md:border-r border-slate-200 flex flex-col">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">ID: {task.id.slice(-6)}</span>
                            <h2 className="text-2xl font-bold text-slate-800 mt-1 leading-tight">{task.title}</h2>
                        </div>
                        <button onClick={onClose} className="md:hidden p-2 bg-white rounded-full shadow-sm"><XIcon className="w-5 h-5 text-slate-500" /></button>
                    </div>

                    <div className="space-y-6 flex-1">
                        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                            <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">Descrição</h4>
                            <p className="text-slate-600 text-sm leading-relaxed">{task.description || "Sem descrição."}</p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-white p-3 rounded-lg border border-slate-100">
                                <span className="text-xs text-slate-400 block mb-1">Valor</span>
                                <div className="flex items-center gap-1 text-green-600 font-bold">
                                    <DollarSignIcon className="w-4 h-4" /> {task.payout.toFixed(2)}
                                </div>
                            </div>
                            <div className="bg-white p-3 rounded-lg border border-slate-100">
                                <span className="text-xs text-slate-400 block mb-1">Responsável</span>
                                <div className="flex items-center gap-2 text-slate-700 font-semibold text-sm">
                                    <div className="w-5 h-5 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-xs">
                                        {task.assigneeName.charAt(0)}
                                    </div>
                                    {task.assigneeName}
                                </div>
                            </div>
                            <div className="bg-white p-3 rounded-lg border border-slate-100">
                                <span className="text-xs text-slate-400 block mb-1">Prazo</span>
                                <div className="flex items-center gap-1 text-slate-700 font-semibold text-sm">
                                    <ClockIcon className="w-4 h-4 text-slate-400" />
                                    {task.dueDate ? new Date(task.dueDate).toLocaleDateString('pt-BR') : 'N/A'}
                                </div>
                            </div>
                            <div className="bg-white p-3 rounded-lg border border-slate-100">
                                <span className="text-xs text-slate-400 block mb-1">Booking ID</span>
                                <div className="text-slate-700 font-mono text-xs pt-1">
                                    {task.bookingId}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-8 pt-6 border-t border-slate-200">
                        <p className="text-xs font-bold text-slate-500 mb-3 uppercase">Mover para:</p>
                        <div className="flex gap-2">
                            {task.status !== 'Pendente' && (
                                <button onClick={() => handleStatusChange('Pendente')} className="flex-1 py-2 bg-white border border-slate-300 text-slate-600 rounded-lg text-sm font-bold hover:bg-slate-100 transition-colors">Pendente</button>
                            )}
                            {task.status !== 'Em Andamento' && (
                                <button onClick={() => handleStatusChange('Em Andamento')} className="flex-1 py-2 bg-blue-100 text-blue-700 rounded-lg text-sm font-bold hover:bg-blue-200 transition-colors">Em Andamento</button>
                            )}
                            {task.status !== 'Concluído' && (
                                <button onClick={() => handleStatusChange('Concluído')} className="flex-1 py-2 bg-green-100 text-green-700 rounded-lg text-sm font-bold hover:bg-green-200 transition-colors">Concluído</button>
                            )}
                        </div>
                    </div>
                </div>

                {/* RIGHT: Comments */}
                <div className="w-full md:w-1/2 bg-white flex flex-col h-full">
                    <header className="p-4 border-b border-slate-100 flex justify-between items-center">
                        <h3 className="font-bold text-slate-800 flex items-center gap-2">
                            <MessageSquareIcon className="w-5 h-5 text-purple-500" /> Comentários
                        </h3>
                        <button onClick={onClose} className="hidden md:block p-1 rounded-full hover:bg-slate-100"><XIcon className="w-5 h-5 text-slate-400" /></button>
                    </header>

                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/30">
                        {localComments.length === 0 ? (
                            <div className="text-center py-10 text-slate-400 text-sm">
                                Nenhum comentário ainda.
                            </div>
                        ) : (
                            localComments.map(c => (
                                <div key={c.id} className="flex gap-3">
                                    <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center flex-shrink-0">
                                        <UserIcon className="w-4 h-4 text-slate-500" />
                                    </div>
                                    <div className="bg-white p-3 rounded-r-xl rounded-bl-xl shadow-sm border border-slate-100 max-w-[90%]">
                                        <div className="flex justify-between items-baseline gap-4 mb-1">
                                            <span className="font-bold text-xs text-slate-700">{c.author}</span>
                                            <span className="text-[10px] text-slate-400">{new Date(c.createdAt).toLocaleString('pt-BR', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}</span>
                                        </div>
                                        <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{c.text}</p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    <div className="p-4 border-t border-slate-100">
                        <div className="relative">
                            <input
                                type="text"
                                value={comment}
                                onChange={e => setComment(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handlePostComment()}
                                placeholder="Escreva um comentário..."
                                className="w-full pl-4 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all text-sm"
                            />
                            <button
                                onClick={handlePostComment}
                                disabled={!comment.trim()}
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:bg-slate-300 transition-colors"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};


const TasksPage: React.FC = () => {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [statusFilter, setStatusFilter] = useState<TaskStatus | 'all'>('all');
    const [assigneeFilter, setAssigneeFilter] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [showPaid, setShowPaid] = useState(false);
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);

    // Manual Task Management
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingTask, setEditingTask] = useState<Task | undefined>(undefined);

    const refreshTasks = async () => {
        const fetchedTasks = await getTasks();
        setTasks(fetchedTasks);
    };

    useEffect(() => {
        refreshTasks();
    }, []);

    const handleTaskClick = (task: Task) => {
        setSelectedTask(task);
    };

    const handleStatusChange = (taskId: string, newStatus: TaskStatus, e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent opening modal
        updateTaskStatus(taskId, newStatus);
        refreshTasks();
    };

    const handleAddNew = () => {
        setEditingTask(undefined);
        setIsFormOpen(true);
    };

    const handleEditTask = (task: Task, e: React.MouseEvent) => {
        e.stopPropagation();
        setEditingTask(task);
        setIsFormOpen(true);
    };

    const filteredTasks = useMemo(() => {
        return tasks.filter(t => {
            // Status Filter
            if (statusFilter !== 'all' && t.status !== statusFilter) return false;

            // Assignee Filter
            if (assigneeFilter !== 'all' && t.assigneeName !== assigneeFilter) return false;

            // Paid Filter: Hide paid tasks by default unless showPaid is true
            if (!showPaid && t.isPaid) return false;

            // Search Filter
            if (searchQuery) {
                const query = searchQuery.toLowerCase();
                return (
                    t.title.toLowerCase().includes(query) ||
                    (t.description || '').toLowerCase().includes(query) ||
                    t.assigneeName.toLowerCase().includes(query) ||
                    t.id.toLowerCase().includes(query)
                );
            }

            return true;
        });
    }, [tasks, statusFilter, assigneeFilter, searchQuery, showPaid]);

    const uniqueAssignees = useMemo(() => Array.from(new Set(tasks.map(t => t.assigneeName))), [tasks]);

    const groupedTasks = useMemo(() => {
        const groups: Record<string, Task[]> = { 'Pendente': [], 'Em Andamento': [], 'Concluído': [] };
        filteredTasks.forEach(t => {
            if (groups[t.status]) groups[t.status].push(t);
        });
        return groups;
    }, [filteredTasks]);

    return (
        <div className="space-y-8 animate-fade-in">
            {selectedTask && (
                <TaskDetailsModal
                    task={selectedTask}
                    onClose={() => setSelectedTask(null)}
                    onUpdate={() => { refreshTasks(); setSelectedTask(null); }}
                />
            )}

            {isFormOpen && (
                <TaskFormModal
                    initialData={editingTask}
                    onClose={() => setIsFormOpen(false)}
                    onSave={() => { refreshTasks(); setIsFormOpen(false); }}
                />
            )}

            <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
                        <CheckSquareIcon className="w-8 h-8 text-purple-600" /> Fluxo de Tarefas
                    </h1>
                    <p className="text-slate-500">Gerencie atividades, pagamentos e comunicação interna.</p>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                    <button
                        onClick={handleAddNew}
                        className="bg-purple-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2 shadow-sm"
                    >
                        <PlusIcon className="w-5 h-5" /> Nova Tarefa
                    </button>
                    <div className="flex items-center gap-2 bg-white p-2 rounded-lg border border-slate-200 shadow-sm">
                        <div className="relative border-r border-slate-200 pr-2 mr-2 hidden sm:block">
                            <SearchIcon className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Buscar tarefas..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="pl-8 py-1 text-sm bg-transparent focus:outline-none w-32 lg:w-48"
                            />
                        </div>

                        <FilterIcon className="w-5 h-5 text-slate-400" />
                        <select
                            value={assigneeFilter}
                            onChange={e => setAssigneeFilter(e.target.value)}
                            className="text-sm font-medium text-slate-700 bg-transparent focus:outline-none cursor-pointer border-r border-slate-200 pr-3 mr-2 max-w-[100px] sm:max-w-none"
                        >
                            <option value="all">Todos</option>
                            {uniqueAssignees.map(name => <option key={name} value={name}>{name}</option>)}
                        </select>
                        <select
                            value={statusFilter}
                            onChange={e => setStatusFilter(e.target.value as any)}
                            className="text-sm font-medium text-slate-700 bg-transparent focus:outline-none cursor-pointer border-r border-slate-200 pr-3 mr-2"
                        >
                            <option value="all">Status</option>
                            <option value="Pendente">Pendente</option>
                            <option value="Em Andamento">Em Andamento</option>
                            <option value="Concluído">Concluído</option>
                        </select>

                        <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 cursor-pointer hover:text-purple-600 transition-colors" title="Mostrar tarefas já pagas">
                            <input
                                type="checkbox"
                                checked={showPaid}
                                onChange={e => setShowPaid(e.target.checked)}
                                className="rounded text-purple-600 focus:ring-purple-500 w-4 h-4"
                            />
                            <span className="hidden sm:inline">Pagos</span>
                            <span className="sm:hidden">$</span>
                        </label>
                    </div>
                </div>
            </header>

            {/* Financial Summary */}
            <PaymentSummary tasks={filteredTasks} />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-full min-h-[500px]">
                {(['Pendente', 'Em Andamento', 'Concluído'] as TaskStatus[]).map(status => {
                    const tasksInColumn = groupedTasks[status];
                    const columnColor = status === 'Pendente' ? 'bg-slate-100 border-slate-200' : status === 'Em Andamento' ? 'bg-blue-50 border-blue-100' : 'bg-green-50 border-green-100';
                    const headerColor = status === 'Pendente' ? 'text-slate-600' : status === 'Em Andamento' ? 'text-blue-600' : 'text-green-600';

                    return (
                        <div key={status} className={`rounded-xl border p-4 flex flex-col ${columnColor}`}>
                            <div className="flex justify-between items-center mb-4 pb-2 border-b border-black/5">
                                <h3 className={`font-bold text-sm uppercase tracking-wider ${headerColor}`}>{status}</h3>
                                <span className="bg-white px-2 py-0.5 rounded-full text-xs font-bold text-slate-500 shadow-sm">{tasksInColumn.length}</span>
                            </div>

                            <div className="flex-1 space-y-3 overflow-y-auto max-h-[calc(100vh-350px)] pr-2 scrollbar-thin scrollbar-thumb-slate-300">
                                {tasksInColumn.length === 0 && (
                                    <div className="h-32 flex items-center justify-center text-slate-400 text-sm border-2 border-dashed border-slate-300/50 rounded-lg">
                                        Vazio
                                    </div>
                                )}
                                {tasksInColumn.map(task => (
                                    <div
                                        key={task.id}
                                        onClick={() => handleTaskClick(task)}
                                        className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 hover:shadow-md transition-all cursor-pointer hover:-translate-y-1 flex flex-col gap-3 group relative"
                                    >
                                        <div>
                                            <div className="flex justify-between items-start mb-1">
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                                    ID: {task.id.slice(-6)}
                                                </span>
                                                <div className="flex gap-1">
                                                    <button onClick={(e) => handleEditTask(task, e)} className="text-slate-400 hover:text-blue-600 p-0.5 rounded"><EditIcon className="w-3 h-3" /></button>
                                                    {task.dueDate && (
                                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1 ${new Date(task.dueDate) < new Date() && task.status !== 'Concluído' ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-600'}`}>
                                                            <ClockIcon className="w-3 h-3" />
                                                            {new Date(task.dueDate).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <h4 className="font-bold text-slate-800 text-sm leading-tight">{task.title}</h4>
                                            {task.comments && task.comments.length > 0 && (
                                                <div className="flex items-center gap-1 text-xs text-slate-400 mt-1">
                                                    <MessageSquareIcon className="w-3 h-3" /> {task.comments.length}
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex justify-between items-end border-t border-slate-50 pt-3">
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 text-xs font-bold border border-purple-200">
                                                    {task.assigneeName.charAt(0)}
                                                </div>
                                                <span className="text-xs font-medium text-slate-600">{task.assigneeName}</span>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-xs text-green-600 font-bold flex items-center gap-1 bg-green-50 px-2 py-0.5 rounded-md">
                                                    <DollarSignIcon className="w-3 h-3" /> {task.payout.toFixed(2)}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Quick Actions on Hover */}
                                        <div className="absolute inset-x-0 bottom-0 p-2 bg-white/95 backdrop-blur-sm border-t rounded-b-lg opacity-0 group-hover:opacity-100 transition-opacity flex gap-2 justify-center">
                                            {status !== 'Pendente' && (
                                                <button onClick={(e) => handleStatusChange(task.id, 'Pendente', e)} className="px-2 py-1 bg-slate-100 text-slate-600 text-[10px] font-bold rounded hover:bg-slate-200">&larr;</button>
                                            )}
                                            {status === 'Pendente' && (
                                                <button onClick={(e) => handleStatusChange(task.id, 'Em Andamento', e)} className="px-3 py-1 bg-blue-50 text-blue-600 text-[10px] font-bold rounded hover:bg-blue-100">Iniciar</button>
                                            )}
                                            {status === 'Em Andamento' && (
                                                <button onClick={(e) => handleStatusChange(task.id, 'Concluído', e)} className="px-3 py-1 bg-green-50 text-green-600 text-[10px] font-bold rounded hover:bg-green-100">Concluir</button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    );
};

export default TasksPage;
