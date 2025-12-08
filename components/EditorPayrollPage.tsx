import React, { useState, useEffect, useMemo } from 'react';
import { calculatePendingEditorPayouts, processEditorPayout, PendingEditorPayout } from '../services/taskService';
import { DollarSignIcon, CheckCircleIcon, UserIcon, SearchIcon, XIcon, ListOrderedIcon } from './icons';

const EditorPayrollPage: React.FC = () => {
    const [payouts, setPayouts] = useState<PendingEditorPayout[]>([]);
    const [selectedEditorName, setSelectedEditorName] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        loadPayouts();
    }, []);

    const loadPayouts = async () => {
        const data = await calculatePendingEditorPayouts();
        setPayouts(data);
    };

    const filteredPayouts = useMemo(() => {
        if (!searchQuery) return payouts;
        const lower = searchQuery.toLowerCase();
        return payouts.filter(p => p.editorName.toLowerCase().includes(lower));
    }, [payouts, searchQuery]);

    const totalPending = useMemo(() => payouts.reduce((sum, p) => sum + p.totalPending, 0), [payouts]);

    const handleViewDetails = (name: string) => {
        setSelectedEditorName(name);
    };

    const handleCloseModal = () => {
        setSelectedEditorName(null);
    };

    const refreshData = async () => {
        await loadPayouts();
        handleCloseModal();
    };

    return (
        <div className="space-y-8 animate-fade-in">
            <header>
                <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Payroll de Editores</h1>
                <p className="text-slate-500 dark:text-slate-400">Controle os pagamentos pendentes por tarefas realizadas.</p>
            </header>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex items-center gap-4">
                    <div className="bg-yellow-100 dark:bg-yellow-900/30 p-3 rounded-full"><DollarSignIcon className="w-6 h-6 text-yellow-600 dark:text-yellow-400" /></div>
                    <div>
                        <p className="text-sm text-slate-500 dark:text-slate-400 font-semibold">Total Pendente</p>
                        <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{totalPending.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex items-center gap-4">
                    <div className="bg-blue-100 dark:bg-blue-900/30 p-3 rounded-full"><UserIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" /></div>
                    <div>
                        <p className="text-sm text-slate-500 dark:text-slate-400 font-semibold">Editores a Pagar</p>
                        <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{payouts.length}</p>
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="p-5 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50 flex justify-between items-center">
                    <h3 className="font-bold text-slate-700 dark:text-slate-200">Editores com Saldo</h3>
                    <div className="relative w-64">
                        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" />
                        <input
                            type="text"
                            placeholder="Buscar editor..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full pl-9 p-2 text-sm border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg"
                        />
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-slate-500 dark:text-slate-400">
                        <thead className="text-xs text-slate-700 dark:text-slate-300 uppercase bg-slate-100 dark:bg-slate-700/50">
                            <tr>
                                <th className="px-6 py-3">Editor</th>
                                <th className="px-6 py-3 text-center">Tarefas Pendentes</th>
                                <th className="px-6 py-3 text-right">Valor Total</th>
                                <th className="px-6 py-3 text-center">Ação</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                            {filteredPayouts.map((payout) => (
                                <tr key={payout.editorName} className="bg-white dark:bg-slate-800 border-b dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                    <td className="px-6 py-4 font-medium text-slate-900 dark:text-slate-100 flex items-center gap-3">
                                        <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center text-purple-700 dark:text-purple-400 font-bold">
                                            {payout.editorName.charAt(0).toUpperCase()}
                                        </div>
                                        {payout.editorName}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-1 rounded-full text-xs font-bold">{payout.tasks.length}</span>
                                    </td>
                                    <td className="px-6 py-4 text-right font-bold text-slate-700 dark:text-slate-200">
                                        {payout.totalPending.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <button onClick={() => handleViewDetails(payout.editorName)} className="text-purple-600 dark:text-purple-400 hover:underline font-semibold">
                                            Detalhes / Pagar
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {filteredPayouts.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="text-center py-8 text-slate-500 dark:text-slate-400">Nenhum repasse pendente.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {selectedEditorName && (
                <EditorPayoutModal
                    payoutData={payouts.find(p => p.editorName === selectedEditorName)!}
                    onClose={handleCloseModal}
                    onConfirm={refreshData}
                />
            )}
        </div>
    );
};

const EditorPayoutModal: React.FC<{ payoutData: PendingEditorPayout; onClose: () => void; onConfirm: () => void }> = ({ payoutData, onClose, onConfirm }) => {
    const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>(payoutData.tasks.map(t => t.id));
    const [isProcessing, setIsProcessing] = useState(false);

    const handleToggle = (id: string) => {
        setSelectedTaskIds(prev => prev.includes(id) ? prev.filter(tid => tid !== id) : [...prev, id]);
    };

    const totalSelected = payoutData.tasks
        .filter(t => selectedTaskIds.includes(t.id))
        .reduce((sum, t) => sum + (t.payout || 0), 0);

    const handleProcess = async () => {
        if (totalSelected <= 0) return;
        setIsProcessing(true);
        try {
            await processEditorPayout(selectedTaskIds);
            onConfirm();
            alert('Pagamento registrado com sucesso!');
        } catch (error) {
            console.error("Error processing payout:", error);
            alert('Erro ao registrar pagamento.');
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-fade-in-fast p-4" onClick={onClose}>
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <header className="p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-700/50 rounded-t-2xl">
                    <div>
                        <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Confirmar Pagamento</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400">{payoutData.editorName}</p>
                    </div>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700"><XIcon className="w-6 h-6 text-slate-500 dark:text-slate-400" /></button>
                </header>

                <div className="flex-1 overflow-y-auto p-6">
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Selecione as tarefas que serão pagas:</p>
                    <div className="space-y-3">
                        {payoutData.tasks.map(task => (
                            <div key={task.id} className={`flex items-center gap-3 p-3 rounded-lg border transition-colors cursor-pointer ${selectedTaskIds.includes(task.id) ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' : 'bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600'}`} onClick={() => handleToggle(task.id)}>
                                <input type="checkbox" checked={selectedTaskIds.includes(task.id)} readOnly className="h-5 w-5 text-green-600 rounded focus:ring-green-500 pointer-events-none" />
                                <div className="flex-1">
                                    <div className="flex justify-between">
                                        <p className="font-bold text-slate-700 dark:text-slate-200 text-sm">{task.title}</p>
                                        <span className="text-xs text-slate-400">{new Date(task.createdAt).toLocaleDateString('pt-BR')}</span>
                                    </div>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">{task.description}</p>
                                </div>
                                <p className="font-bold text-slate-800 dark:text-slate-100">R$ {(task.payout || 0).toFixed(2)}</p>
                            </div>
                        ))}
                    </div>
                </div>

                <footer className="p-6 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-b-2xl">
                    <div className="flex justify-between items-center mb-4">
                        <span className="text-slate-600 dark:text-slate-300 font-medium">Total Selecionado:</span>
                        <span className="text-2xl font-bold text-green-600 dark:text-green-400">R$ {totalSelected.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-end gap-3">
                        <button onClick={onClose} className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 font-semibold">Cancelar</button>
                        <button
                            onClick={handleProcess}
                            disabled={isProcessing || totalSelected === 0}
                            className="px-6 py-2 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 shadow-md disabled:opacity-70 flex items-center gap-2"
                        >
                            {isProcessing ? 'Processando...' : <><CheckCircleIcon className="w-5 h-5" /> Confirmar Pagamento</>}
                        </button>
                    </div>
                </footer>
            </div>
        </div>
    );
};

export default EditorPayrollPage;
