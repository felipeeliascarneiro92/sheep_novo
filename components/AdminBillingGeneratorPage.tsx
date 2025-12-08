
import React, { useState, useEffect, useMemo } from 'react';
import { getPendingBillables, generateInvoiceForClient, PendingBillable } from '../services/financeService';
import { DollarSignIcon, FilePlusIcon, CalendarIcon, MapPinIcon, BuildingIcon, SearchIcon, FilterIcon, XIcon, CheckCircleIcon, EditIcon, LoaderIcon } from './icons';
import { EditServicesModal } from './AppointmentsPage';
import { useAuth } from '../contexts/AuthContext';
import { Booking } from '../types';

const AdminBillingGeneratorPage: React.FC = () => {
    const [pendingGroups, setPendingGroups] = useState<PendingBillable[]>([]);
    const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [selectedClientIds, setSelectedClientIds] = useState<string[]>([]);
    const [isBulkGenerating, setIsBulkGenerating] = useState(false);

    useEffect(() => {
        const loadData = async () => {
            const data = await getPendingBillables();
            setPendingGroups(data);
        };
        loadData();
    }, []);

    const filteredGroups = useMemo(() => {
        if (!searchQuery) return pendingGroups;
        const lower = searchQuery.toLowerCase();
        return pendingGroups.filter(g => g.client.name.toLowerCase().includes(lower));
    }, [pendingGroups, searchQuery]);

    const totalPendingRevenue = useMemo(() => pendingGroups.reduce((sum, g) => sum + g.total, 0), [pendingGroups]);

    const handleViewDetails = (id: string) => {
        setSelectedClientId(id);
    };

    const handleCloseModal = () => {
        setSelectedClientId(null);
    };

    const refreshData = async () => {
        const data = await getPendingBillables();
        setPendingGroups(data);
    };

    const handleModalUpdate = () => {
        refreshData();
    };

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedClientIds(filteredGroups.map(g => g.client.id));
        } else {
            setSelectedClientIds([]);
        }
    };

    const handleSelectClient = (clientId: string) => {
        setSelectedClientIds(prev =>
            prev.includes(clientId)
                ? prev.filter(id => id !== clientId)
                : [...prev, clientId]
        );
    };

    const handleGenerateSelected = async () => {
        if (selectedClientIds.length === 0) return;
        if (!confirm(`Deseja gerar faturas para os ${selectedClientIds.length} clientes selecionados?`)) return;

        setIsBulkGenerating(true);
        let successCount = 0;
        let errorCount = 0;

        try {
            for (const clientId of selectedClientIds) {
                const group = pendingGroups.find(g => g.client.id === clientId);
                if (!group) continue;

                // Use all booking IDs for that client
                const bookingIds = group.bookings.map(b => b.id);
                try {
                    await generateInvoiceForClient(clientId, bookingIds);
                    successCount++;
                } catch (err) {
                    console.error(`Error generating invoice for client ${clientId}`, err);
                    errorCount++;
                }
            }

            alert(`Processo finalizado!\nFaturas geradas: ${successCount}\nErros: ${errorCount}`);
            setSelectedClientIds([]); // Clear selection
            refreshData();
        } catch (error) {
            console.error(error);
            alert('Erro crítico ao processar faturas.');
        } finally {
            setIsBulkGenerating(false);
        }
    };



    return (
        <div className="space-y-8 animate-fade-in">
            <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Gerador de Cobranças</h1>
                    <p className="text-slate-500 dark:text-slate-400">Confira os serviços realizados e gere faturas para as imobiliárias.</p>
                </div>
                {selectedClientIds.length > 0 && (
                    <button
                        onClick={handleGenerateSelected}
                        disabled={isBulkGenerating}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-lg font-bold shadow-sm flex items-center gap-2 disabled:opacity-70 transition-colors animate-fade-in"
                    >
                        {isBulkGenerating ? <LoaderIcon className="w-5 h-5 animate-spin" /> : <FilePlusIcon className="w-5 h-5" />}
                        Gerar {selectedClientIds.length} Fatura(s)
                    </button>
                )}
            </header>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex items-center gap-4">
                    <div className="bg-green-100 dark:bg-green-900/30 p-3 rounded-full"><DollarSignIcon className="w-6 h-6 text-green-600 dark:text-green-400" /></div>
                    <div>
                        <p className="text-sm text-slate-500 dark:text-slate-400 font-semibold">Receita Pendente</p>
                        <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{totalPendingRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex items-center gap-4">
                    <div className="bg-blue-100 dark:bg-blue-900/30 p-3 rounded-full"><BuildingIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" /></div>
                    <div>
                        <p className="text-sm text-slate-500 dark:text-slate-400 font-semibold">Clientes a Faturar</p>
                        <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{pendingGroups.length}</p>
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="p-5 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50 flex justify-between items-center">
                    <h3 className="font-bold text-slate-700 dark:text-slate-200">Imobiliárias com Serviços Pendentes</h3>
                    <div className="relative w-64">
                        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" />
                        <input
                            type="text"
                            placeholder="Buscar imobiliária..."
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
                                <th className="px-6 py-3 text-center">
                                    <input
                                        type="checkbox"
                                        className="h-4 w-4 text-indigo-600 rounded focus:ring-indigo-500 cursor-pointer"
                                        onChange={handleSelectAll}
                                        checked={filteredGroups.length > 0 && selectedClientIds.length === filteredGroups.length}
                                    />
                                </th>
                                <th className="px-6 py-3">Cliente / Imobiliária</th>
                                <th className="px-6 py-3 text-center">Qtd. Serviços</th>
                                <th className="px-6 py-3 text-right">Total Acumulado</th>
                                <th className="px-6 py-3 text-center">Ação</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                            {filteredGroups.map((group) => (
                                <tr key={group.client.id} className="bg-white dark:bg-slate-800 border-b dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                    <td className="px-6 py-4 text-center">
                                        <input
                                            type="checkbox"
                                            className="h-4 w-4 text-indigo-600 rounded focus:ring-indigo-500 cursor-pointer"
                                            checked={selectedClientIds.includes(group.client.id)}
                                            onChange={() => handleSelectClient(group.client.id)}
                                        />
                                    </td>
                                    <td className="px-6 py-4 font-medium text-slate-900 dark:text-slate-100">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center text-indigo-700 dark:text-indigo-400 font-bold">
                                                {group.client.name.charAt(0)}
                                            </div>
                                            <div>
                                                <p>{group.client.name}</p>
                                                <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 border dark:border-slate-600 rounded text-slate-500 dark:text-slate-400">{group.client.paymentType}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-1 rounded-full text-xs font-bold">{group.bookings.length}</span>
                                    </td>
                                    <td className="px-6 py-4 text-right font-bold text-slate-700 dark:text-slate-200">
                                        {group.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <button onClick={() => handleViewDetails(group.client.id)} className="text-white bg-indigo-600 hover:bg-indigo-700 font-semibold text-xs px-3 py-1.5 rounded-md transition-colors shadow-sm flex items-center gap-1 mx-auto">
                                            <FilePlusIcon className="w-3 h-3" /> Conferir & Faturar
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {filteredGroups.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="text-center py-8 text-slate-500 dark:text-slate-400">Nenhuma pendência de faturamento encontrada.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {selectedClientId && (
                <BillingConferenceModal
                    group={pendingGroups.find(g => g.client.id === selectedClientId)!}
                    onClose={handleCloseModal}
                    onUpdate={handleModalUpdate}
                    onConfirm={() => {
                        refreshData();
                        handleCloseModal();
                    }}
                />
            )}
        </div>
    );
};

const BillingConferenceModal: React.FC<{ group: PendingBillable; onClose: () => void; onUpdate: () => void; onConfirm: () => void }> = ({ group, onClose, onUpdate, onConfirm }) => {
    const { user } = useAuth();
    const [selectedBookingIds, setSelectedBookingIds] = useState<string[]>(group.bookings.map(b => b.id));
    const [dueDate, setDueDate] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [editingBooking, setEditingBooking] = useState<Booking | null>(null);

    // Set default due date (Next month, preferred day)
    useEffect(() => {
        const now = new Date();
        const defaultDate = new Date(now.getFullYear(), now.getMonth() + 1, group.client.dueDay || 10);
        setDueDate(defaultDate.toISOString().split('T')[0]);
    }, [group.client.dueDay]);

    const handleToggle = (id: string) => {
        setSelectedBookingIds(prev => prev.includes(id) ? prev.filter(bid => bid !== id) : [...prev, id]);
    };

    const totalSelected = group.bookings
        .filter(b => selectedBookingIds.includes(b.id))
        .reduce((sum, b) => sum + b.total_price, 0);

    const handleGenerate = async () => {
        if (totalSelected <= 0) return;
        setIsProcessing(true);

        try {
            await generateInvoiceForClient(group.client.id, selectedBookingIds, dueDate);
            onConfirm();
            alert('Fatura gerada com sucesso! Ela está disponível no menu Faturas.');
        } catch (error) {
            console.error("Error generating invoice:", error);
            alert('Erro ao gerar fatura.');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleEditBooking = (booking: Booking, e: React.MouseEvent) => {
        e.stopPropagation();
        setEditingBooking(booking);
    };

    const handleEditSave = () => {
        setEditingBooking(null);
        onUpdate(); // Refresh data in parent to reflect price/service changes
    };

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-fade-in-fast p-4" onClick={onClose}>
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <header className="p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-700/50 rounded-t-2xl">
                    <div>
                        <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Conferência de Cobrança</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400">{group.client.name}</p>
                    </div>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700"><XIcon className="w-6 h-6 text-slate-500 dark:text-slate-400" /></button>
                </header>

                <div className="flex-1 overflow-y-auto p-6">
                    <div className="flex justify-between items-end mb-4">
                        <p className="text-sm text-slate-500 dark:text-slate-400">Selecione os serviços para incluir nesta fatura:</p>
                        <div className="text-sm">
                            <label className="mr-2 font-semibold text-slate-700 dark:text-slate-300">Vencimento:</label>
                            <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded p-1 text-sm" />
                        </div>
                    </div>

                    <div className="space-y-3">
                        {group.bookings.map(booking => (
                            <div key={booking.id} className={`flex items-center gap-3 p-3 rounded-lg border transition-colors cursor-pointer ${selectedBookingIds.includes(booking.id) ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800' : 'bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600'}`} onClick={() => handleToggle(booking.id)}>
                                <input type="checkbox" checked={selectedBookingIds.includes(booking.id)} readOnly className="h-5 w-5 text-indigo-600 rounded focus:ring-indigo-500 pointer-events-none" />
                                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    <div>
                                        <p className="font-bold text-slate-700 dark:text-slate-200 text-sm flex items-center gap-2">
                                            <CalendarIcon className="w-3 h-3 text-slate-400 dark:text-slate-500" /> {new Date(booking.date || '').toLocaleDateString('pt-BR')}
                                        </p>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-1">
                                            <MapPinIcon className="w-3 h-3 text-slate-400 dark:text-slate-500" /> {booking.address}
                                        </p>
                                    </div>
                                    <div className="text-right sm:text-left">
                                        <p className="text-xs text-slate-500 dark:text-slate-400">Serviços:</p>
                                        <p className="text-xs font-medium truncate text-slate-700 dark:text-slate-300">{booking.service_ids.join(', ')}</p>
                                    </div>
                                </div>
                                <div className="text-right min-w-[80px]">
                                    <p className="font-bold text-slate-800 dark:text-slate-100">R$ {booking.total_price.toFixed(2)}</p>
                                    <button
                                        onClick={(e) => handleEditBooking(booking, e)}
                                        className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline mt-1 flex items-center gap-1 justify-end w-full"
                                    >
                                        <EditIcon className="w-3 h-3" /> Editar
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <footer className="p-6 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-b-2xl">
                    <div className="flex justify-between items-center mb-4">
                        <span className="text-slate-600 dark:text-slate-300 font-medium">Total da Fatura:</span>
                        <span className="text-2xl font-bold text-indigo-700 dark:text-indigo-400">R$ {totalSelected.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-end gap-3">
                        <button onClick={onClose} className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 font-semibold">Cancelar</button>
                        <button
                            onClick={handleGenerate}
                            disabled={isProcessing || totalSelected === 0}
                            className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 shadow-md disabled:opacity-70 flex items-center gap-2"
                        >
                            {isProcessing ? 'Gerando...' : <><FilePlusIcon className="w-5 h-5" /> Gerar Fatura</>}
                        </button>
                    </div>
                </footer>
            </div>

            {editingBooking && user && (
                <EditServicesModal
                    booking={editingBooking}
                    user={user}
                    onClose={() => setEditingBooking(null)}
                    onConfirm={handleEditSave}
                />
            )}
        </div>
    );
};

export default AdminBillingGeneratorPage;
