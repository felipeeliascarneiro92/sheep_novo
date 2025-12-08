
import React, { useState, useMemo, useEffect } from 'react';
import { generateMonthlyInvoices, getInvoicesForAdmin, updateInvoiceStatus, getInvoiceById, getServices } from '../services/bookingService';
import { AdminInvoice, PaymentStatus, Booking } from '../types';
import { DollarSignIcon, CheckCircleIcon, SearchIcon, FilterIcon, FileTextIcon, XIcon, AlertTriangleIcon, CalendarIcon, MapPinIcon, BarcodeIcon, EditIcon, EyeIcon, PhoneIcon, LinkIcon } from './icons';

const statusStyles: Record<PaymentStatus, string> = {
    Quitado: "bg-green-100 text-green-800 border-green-200",
    Atrasado: "bg-red-100 text-red-800 border-red-200",
    Pendente: "bg-yellow-100 text-yellow-800 border-yellow-200",
};

// --- MINI DASHBOARD COMPONENT ---
const FinanceDashboard: React.FC<{ invoices: AdminInvoice[] }> = ({ invoices }) => {
    const metrics = useMemo(() => {
        const totalPending = invoices.filter(i => i.status === 'Pendente').reduce((sum, i) => sum + i.amount, 0);
        const totalOverdue = invoices.filter(i => i.status === 'Atrasado').reduce((sum, i) => sum + i.amount, 0);
        const totalPaid = invoices.filter(i => i.status === 'Quitado').reduce((sum, i) => sum + i.amount, 0);
        return { totalPending, totalOverdue, totalPaid };
    }, [invoices]);

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white dark:bg-slate-800 p-5 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex items-center gap-4">
                <div className="bg-yellow-100 dark:bg-yellow-900/30 p-3 rounded-full"><DollarSignIcon className="w-6 h-6 text-yellow-600 dark:text-yellow-400" /></div>
                <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400 font-semibold">A Receber (Pendente)</p>
                    <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{metrics.totalPending.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                </div>
            </div>
            <div className="bg-white dark:bg-slate-800 p-5 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex items-center gap-4">
                <div className="bg-green-100 dark:bg-green-900/30 p-3 rounded-full"><CheckCircleIcon className="w-6 h-6 text-green-600 dark:text-green-400" /></div>
                <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400 font-semibold">Total Recebido</p>
                    <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{metrics.totalPaid.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                </div>
            </div>
            <div className="bg-white dark:bg-slate-800 p-5 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex items-center gap-4">
                <div className="bg-red-100 dark:bg-red-900/30 p-3 rounded-full"><AlertTriangleIcon className="w-6 h-6 text-red-600 dark:text-red-400" /></div>
                <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400 font-semibold">Em Atraso</p>
                    <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{metrics.totalOverdue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                </div>
            </div>
        </div>
    );
};

// --- ANALYSIS MODAL COMPONENT ---
const InvoiceAnalysisModal: React.FC<{ invoiceId: string; onClose: () => void; onUpdate: () => void; onViewDetails: (id: string) => void }> = ({ invoiceId, onClose, onUpdate, onViewDetails }) => {
    const [details, setDetails] = useState<{ invoice: AdminInvoice; bookings: Booking[] } | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [allServices, setAllServices] = useState<any[]>([]);

    useEffect(() => {
        const fetchServices = async () => {
            const services = await getServices();
            setAllServices(services);
        };
        fetchServices();
    }, []);

    useEffect(() => {
        const fetchData = async () => {
            const data = await getInvoiceById(invoiceId);
            setDetails(data);
        };
        fetchData();
    }, [invoiceId]);

    const handleGenerateCharge = () => {
        setIsProcessing(true);
        // Simulate API call to Asaas
        setTimeout(() => {
            setIsProcessing(false);
            alert("Cobrança gerada no Asaas e enviada ao cliente por email/WhatsApp!");
            // Optionally update status if needed, or keep as Pending until webhook confirms payment
            onClose();
        }, 1500);
    };

    const handleMarkAsPaid = () => {
        if (confirm("Confirmar o recebimento manual desta fatura?")) {
            updateInvoiceStatus(invoiceId, 'Quitado');
            onUpdate();
            onClose();
        }
    };

    const getServiceName = (id: string) => {
        return allServices.find(s => s.id === id)?.name || id;
    };

    if (!details) return null;
    const { invoice, bookings } = details;

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-fade-in-fast p-4" onClick={onClose}>
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <header className="p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-start bg-slate-50 dark:bg-slate-800/50 rounded-t-2xl">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Análise de Fatura</h2>
                        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{invoice.clientName} • <span className="capitalize">{invoice.monthYear}</span></p>
                    </div>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700"><XIcon className="w-6 h-6 text-slate-500 dark:text-slate-400" /></button>
                </header>

                <div className="flex-1 overflow-y-auto p-6">
                    <div className="mb-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-200 dark:border-slate-700">
                            <p className="text-xs text-slate-500 dark:text-slate-400 uppercase font-bold">Vencimento</p>
                            <p className="text-slate-800 dark:text-slate-100 font-medium flex items-center gap-2 mt-1">
                                <CalendarIcon className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                                {new Date(invoice.dueDate + 'T00:00:00').toLocaleDateString('pt-BR')}
                            </p>
                        </div>
                        <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-200 dark:border-slate-700">
                            <p className="text-xs text-slate-500 dark:text-slate-400 uppercase font-bold">Valor Total</p>
                            <p className="text-slate-800 dark:text-slate-100 font-bold text-lg mt-1 text-purple-700 dark:text-purple-400">
                                {invoice.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </p>
                        </div>
                        <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-200 dark:border-slate-700">
                            <p className="text-xs text-slate-500 dark:text-slate-400 uppercase font-bold">Status</p>
                            <span className={`inline-block mt-1 px-2 py-1 rounded text-xs font-bold border ${statusStyles[invoice.status]}`}>
                                {invoice.status}
                            </span>
                        </div>
                    </div>

                    <h3 className="font-bold text-slate-700 dark:text-slate-200 mb-3 flex items-center gap-2"><FileTextIcon className="w-5 h-5" /> Detalhamento dos Serviços</h3>
                    <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                        <table className="w-full text-sm text-left text-slate-600 dark:text-slate-300">
                            <thead className="bg-slate-100 dark:bg-slate-700/50 text-xs uppercase font-bold text-slate-500 dark:text-slate-400">
                                <tr>
                                    <th className="px-4 py-3">Data</th>
                                    <th className="px-4 py-3">Endereço / Serviços</th>
                                    <th className="px-4 py-3 text-right">Valor</th>
                                    <th className="px-4 py-3 text-center">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                {bookings.map(b => (
                                    <tr key={b.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                                        <td className="px-4 py-3 whitespace-nowrap">{new Date(b.date + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2 mb-1">
                                                <MapPinIcon className="w-3 h-3 text-slate-400 dark:text-slate-500 flex-shrink-0" />
                                                <span className="truncate max-w-xs font-medium text-slate-800 dark:text-slate-200" title={b.address}>{b.address}</span>
                                            </div>
                                            <div className="flex flex-wrap gap-1 pl-5">
                                                {b.service_ids.map(sid => (
                                                    <span key={sid} className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-[10px] font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wide">
                                                        {getServiceName(sid)}
                                                    </span>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-right font-medium">{b.total_price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                                        <td className="px-4 py-3 text-center">
                                            <button
                                                onClick={() => onViewDetails(b.id)}
                                                className="text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-900/20 p-2 rounded-md transition-colors flex items-center gap-1 mx-auto"
                                                title="Editar Detalhes"
                                            >
                                                <EditIcon className="w-4 h-4" />
                                                <span className="text-xs font-bold hidden sm:inline">Editar</span>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <footer className="p-6 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 rounded-b-2xl flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-600 font-semibold text-sm">
                        Fechar
                    </button>
                    {invoice.status !== 'Quitado' && (
                        <>
                            <button onClick={handleMarkAsPaid} className="px-4 py-2 border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 font-semibold text-sm flex items-center gap-2">
                                <CheckCircleIcon className="w-4 h-4" /> Marcar como Pago
                            </button>
                            <button onClick={handleGenerateCharge} disabled={isProcessing} className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-semibold text-sm shadow-md flex items-center gap-2 disabled:opacity-70">
                                {isProcessing ? 'Processando...' : <><BarcodeIcon className="w-4 h-4" /> Gerar Cobrança (Asaas)</>}
                            </button>
                        </>
                    )}
                </footer>
            </div>
        </div>
    );
};

// --- MAIN COMPONENT ---
const ManageFinancePage: React.FC<{ onViewDetails?: (bookingId: string) => void }> = ({ onViewDetails }) => {
    const [invoices, setInvoices] = useState<AdminInvoice[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<PaymentStatus | 'all'>('all');
    const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);

    useEffect(() => {
        refreshData();
    }, []);

    const refreshData = async () => {
        const data = await getInvoicesForAdmin();
        setInvoices(data);
    };

    const handleGenerateInvoices = async () => {
        setIsGenerating(true);
        try {
            const newInvoices = await generateMonthlyInvoices();
            await refreshData();
            if (newInvoices.length > 0) {
                alert(`${newInvoices.length} nova(s) fatura(s) gerada(s)! Analise-as antes de enviar a cobrança.`);
            } else {
                alert("Nenhum novo agendamento pendente para faturamento.");
            }
        } catch (error) {
            console.error("Error generating invoices:", error);
            alert("Erro ao gerar faturas.");
        } finally {
            setIsGenerating(false);
        }
    };

    const filteredInvoices = useMemo(() => {
        return invoices.filter(inv => {
            const matchesSearch = inv.clientName.toLowerCase().includes(searchQuery.toLowerCase()) || inv.monthYear.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesStatus = statusFilter === 'all' || inv.status === statusFilter;
            return matchesSearch && matchesStatus;
        });
    }, [invoices, searchQuery, statusFilter]);

    const handleInvoiceViewDetails = (id: string) => {
        if (onViewDetails) {
            onViewDetails(id);
        } else {
            console.warn("onViewDetails not provided to ManageFinancePage");
        }
    };

    return (
        <div className="space-y-8 animate-fade-in">
            {selectedInvoiceId && <InvoiceAnalysisModal invoiceId={selectedInvoiceId} onClose={() => setSelectedInvoiceId(null)} onUpdate={refreshData} onViewDetails={handleInvoiceViewDetails} />}

            <header className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Gestão Financeira</h1>
                    <p className="text-slate-500 dark:text-slate-400">Analise serviços, gere cobranças e acompanhe pagamentos.</p>
                </div>
                <button onClick={handleGenerateInvoices} disabled={isGenerating} className="font-semibold text-white bg-gradient-to-r from-purple-600 to-pink-500 px-5 py-2.5 rounded-lg shadow-md hover:shadow-lg transition-shadow disabled:opacity-50">
                    {isGenerating ? 'Processando...' : 'Gerar Faturas do Mês'}
                </button>
            </header>

            <FinanceDashboard invoices={invoices} />

            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                {/* Filters Bar */}
                <div className="p-5 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex flex-col sm:flex-row gap-4 justify-between items-center">
                    <h3 className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2"><FileTextIcon className="w-5 h-5" /> Faturas ({filteredInvoices.length})</h3>
                    <div className="flex gap-3 w-full sm:w-auto">
                        <div className="relative flex-1 sm:w-64">
                            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" />
                            <input
                                type="text"
                                placeholder="Buscar cliente ou período..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg focus:ring-purple-500 focus:border-purple-500"
                            />
                        </div>
                        <div className="relative">
                            <FilterIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" />
                            <select
                                value={statusFilter}
                                onChange={e => setStatusFilter(e.target.value as any)}
                                className="pl-9 pr-8 py-2 text-sm border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg focus:ring-purple-500 focus:border-purple-500 bg-white dark:bg-slate-700 appearance-none"
                            >
                                <option value="all">Todos Status</option>
                                <option value="Pendente">Pendente</option>
                                <option value="Quitado">Quitado</option>
                                <option value="Atrasado">Atrasado</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-slate-500 dark:text-slate-400">
                        <thead className="text-xs text-slate-700 dark:text-slate-300 uppercase bg-slate-100 dark:bg-slate-700/50">
                            <tr>
                                <th scope="col" className="px-6 py-4">Cliente</th>
                                <th scope="col" className="px-6 py-4">Período</th>
                                <th scope="col" className="px-6 py-4 text-center">Vencimento</th>
                                <th scope="col" className="px-6 py-4 text-right">Valor</th>
                                <th scope="col" className="px-6 py-4 text-center">Status</th>
                                <th scope="col" className="px-6 py-4 text-center">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                            {filteredInvoices.map((invoice) => (
                                <tr key={invoice.id} className="bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                                    <td className="px-6 py-4 font-semibold text-slate-800 dark:text-slate-100">
                                        {invoice.clientName}
                                    </td>
                                    <td className="px-6 py-4 capitalize">
                                        {invoice.monthYear}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        {new Date(invoice.dueDate + 'T00:00:00').toLocaleDateString('pt-BR')}
                                    </td>
                                    <td className="px-6 py-4 font-bold text-right text-slate-700 dark:text-slate-200">
                                        {invoice.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <div className="flex flex-col items-center gap-1">
                                            <span className={`inline-block px-3 py-1 font-semibold text-xs rounded-full border ${statusStyles[invoice.status]}`}>
                                                {invoice.status}
                                            </span>
                                            {/* Blue Eye Logic */}
                                            {(invoice as any).viewedAt && (
                                                <span className="text-xs text-blue-500 flex items-center gap-1" title={`Visualizado em ${new Date((invoice as any).viewedAt).toLocaleString('pt-BR')}`}>
                                                    <EyeIcon className="w-4 h-4" /> Visto
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <div className="flex items-center justify-center gap-2">
                                            <button
                                                onClick={() => setSelectedInvoiceId(invoice.id)}
                                                className="text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300 font-semibold text-xs border border-purple-200 dark:border-purple-800 hover:bg-purple-50 dark:hover:bg-purple-900/20 px-3 py-1.5 rounded-md transition-colors"
                                            >
                                                Analisar
                                            </button>
                                            {invoice.asaasInvoiceUrl && (
                                                <>
                                                    <button
                                                        onClick={() => {
                                                            const message = `Olá! Segue o link da sua fatura referente a ${invoice.monthYear}: ${invoice.asaasInvoiceUrl}`;
                                                            window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
                                                        }}
                                                        className="p-1.5 text-green-600 hover:bg-green-50 rounded-md"
                                                        title="Enviar no WhatsApp"
                                                    >
                                                        <PhoneIcon className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => window.open(invoice.asaasInvoiceUrl, '_blank')}
                                                        className="p-1.5 text-slate-600 hover:bg-slate-50 rounded-md"
                                                        title="Abrir Fatura"
                                                    >
                                                        <LinkIcon className="w-4 h-4" />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filteredInvoices.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="text-center py-12 text-slate-500 dark:text-slate-400">
                                        Nenhuma fatura encontrada.
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

export default ManageFinancePage;
