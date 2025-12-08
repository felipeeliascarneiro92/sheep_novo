
import React, { useState, useEffect } from 'react';
// FIX: Added missing function import from bookingService.ts.
import { getInvoicesForClient, getInvoiceById } from '../services/bookingService';
import { AdminInvoice, PaymentStatus } from '../types';
import { FileTextIcon, BarcodeIcon, XIcon, CalendarIcon, DownloadIcon, WalletIcon } from './icons';
import BuyCreditsModal from './BuyCreditsModal';

import { User } from '../App';

const statusStyles: Record<PaymentStatus, string> = {
    Quitado: "bg-green-100 text-green-800",
    Atrasado: "bg-red-100 text-red-800",
    Pendente: "bg-yellow-100 text-yellow-800",
};

const BoletoPaymentModal: React.FC<{ invoice: AdminInvoice; onClose: () => void; }> = ({ invoice, onClose }) => {
    const boletoNumber = `85890.00000 00112.233445 56677.889900 1 99990000${(invoice.amount * 100).toFixed(0).padStart(8, '0')}`;
    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-fade-in-fast p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8 w-full max-w-lg" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-start"><h3 className="text-xl font-bold text-slate-800">Visualização de Boleto</h3><button onClick={onClose} className="p-1 rounded-full hover:bg-slate-100 -mt-1 -mr-2"><XIcon className="w-5 h-5 text-slate-500" /></button></div>
                <p className="text-sm text-slate-500 mt-1">Simulação de boleto para a fatura de {invoice.monthYear}.</p>
                <div className="mt-6 p-6 border rounded-lg bg-slate-50 space-y-4">
                    <div className="flex justify-between items-baseline">
                        <span className="text-sm text-slate-600">Valor a Pagar</span>
                        <span className="text-2xl font-bold text-slate-800">{invoice.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-sm text-slate-600">Vencimento</span>
                        <span className="font-semibold text-slate-800">{new Date(invoice.dueDate + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
                    </div>
                    <div className="text-center pt-4">
                        <BarcodeIcon className="w-full h-20 text-slate-800" />
                        <p className="text-xs tracking-widest mt-2 text-slate-600 font-mono break-all">{boletoNumber}</p>
                    </div>
                    <button onClick={() => navigator.clipboard.writeText(boletoNumber.replace(/\s/g, ''))} className="w-full mt-4 bg-purple-600 text-white font-semibold py-2 rounded-lg hover:bg-purple-700 transition-colors">Copiar Linha Digitável</button>
                </div>
            </div>
        </div>
    );
};


const BillingPage: React.FC<{ user: User; onViewInvoiceDetails: (invoiceId: string) => void; }> = ({ user, onViewInvoiceDetails }) => {
    const [invoices, setInvoices] = useState<AdminInvoice[]>([]);
    const [boletoModalInvoice, setBoletoModalInvoice] = useState<AdminInvoice | null>(null);
    const [showBuyCreditsModal, setShowBuyCreditsModal] = useState(false);

    useEffect(() => {
        const fetchInvoices = async () => {
            const data = await getInvoicesForClient(user.id);
            setInvoices(data);
        };
        fetchInvoices();
    }, [user.id]);

    const handleDownloadXLS = async (invoiceId: string) => {
        const details = await getInvoiceById(invoiceId);
        if (!details) {
            alert("Erro ao gerar relatório.");
            return;
        }
        const { invoice, bookings } = details;

        // CSV Header
        const header = ['Data', 'Horário', 'Endereço', 'Serviços', 'Valor (R$)'];
        const rows = bookings.map(b => [
            b.date ? new Date(b.date).toLocaleDateString('pt-BR') : 'N/A',
            b.start_time || 'N/A',
            `"${b.address}"`, // Quote to handle commas
            `"${b.service_ids.join(', ')}"`,
            b.total_price.toFixed(2).replace('.', ',')
        ]);

        const csvContent = [
            `Fatura: ${invoice.monthYear}`,
            `Cliente: ${invoice.clientName}`,
            `Total: R$ ${invoice.amount.toFixed(2).replace('.', ',')}`,
            '',
            header.join(';'),
            ...rows.map(r => r.join(';'))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `fatura_${invoice.monthYear.replace(/\s/g, '_')}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="space-y-8 animate-fade-in">
            {boletoModalInvoice && <BoletoPaymentModal invoice={boletoModalInvoice} onClose={() => setBoletoModalInvoice(null)} />}
            {showBuyCreditsModal && <BuyCreditsModal user={user} onClose={() => setShowBuyCreditsModal(false)} onSuccess={() => alert('Créditos adicionados com sucesso!')} />}

            <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Financeiro</h1>
                    <p className="text-slate-500 dark:text-slate-400">Consulte suas últimas cobranças e faturas.</p>
                </div>
                <button
                    onClick={() => setShowBuyCreditsModal(true)}
                    className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-bold py-2.5 px-5 rounded-lg shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5"
                >
                    <WalletIcon className="w-5 h-5" />
                    Comprar Créditos
                </button>
            </header>

            {/* Desktop View (Table) */}
            <div className="hidden md:block bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-slate-500 dark:text-slate-400">
                        <thead className="text-xs text-white uppercase bg-[#19224c] dark:bg-[#19224c]">
                            <tr>
                                <th scope="col" className="px-6 py-4">PERÍODO</th>
                                <th scope="col" className="px-6 py-4 text-center">VENC.</th>
                                <th scope="col" className="px-6 py-4 text-right">VALOR</th>
                                <th scope="col" className="px-6 py-4 text-center">STATUS</th>
                                <th scope="col" className="px-6 py-4 text-center">AÇÕES</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                            {invoices.map((invoice) => (
                                <tr key={invoice.id} className="bg-white dark:bg-slate-800 border-b dark:border-slate-700 last:border-b-0 hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                    <td className="px-6 py-4 font-medium text-slate-900 dark:text-slate-100 whitespace-nowrap">
                                        <div className="font-bold capitalize">{invoice.monthYear}</div>
                                        <div className="text-xs text-slate-500 dark:text-slate-400">Fatura #{invoice.id.slice(-6)}</div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        {new Date(invoice.dueDate + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                                    </td>
                                    <td className="px-6 py-4 font-semibold text-right text-slate-700 dark:text-slate-200">
                                        {invoice.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`inline-block px-3 py-1 font-semibold text-xs rounded-full ${statusStyles[invoice.status]}`}>
                                            {invoice.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center justify-center gap-2">
                                            <button onClick={() => onViewInvoiceDetails(invoice.id)} className="p-2 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-md hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors" title="Ver Detalhes">
                                                <FileTextIcon className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => setBoletoModalInvoice(invoice)} className="p-2 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 rounded-md hover:bg-yellow-200 dark:hover:bg-yellow-900/50 transition-colors" title="Ver Boleto">
                                                <BarcodeIcon className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => handleDownloadXLS(invoice.id)} className="p-2 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-md hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors" title="Baixar Relatório (XLS)">
                                                <DownloadIcon className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {invoices.length === 0 && <p className="text-center text-slate-500 dark:text-slate-400 py-12">Nenhuma fatura encontrada para este perfil.</p>}
                </div>
            </div>

            {/* Mobile View (Cards) */}
            <div className="md:hidden space-y-4">
                {invoices.map((invoice) => (
                    <div key={invoice.id} className="bg-white dark:bg-slate-800 p-5 rounded-xl shadow-md border border-slate-200 dark:border-slate-700 flex flex-col gap-4">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="font-bold text-lg text-slate-800 dark:text-slate-100 capitalize">{invoice.monthYear}</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Fatura #{invoice.id.slice(-6)}</p>
                            </div>
                            <span className={`inline-block px-3 py-1 font-semibold text-xs rounded-full ${statusStyles[invoice.status]}`}>
                                {invoice.status}
                            </span>
                        </div>

                        <div className="flex justify-between items-end border-t border-slate-100 dark:border-slate-700 pt-4">
                            <div>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Vencimento</p>
                                <div className="flex items-center gap-1 text-slate-700 dark:text-slate-300 font-medium">
                                    <CalendarIcon className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                                    {new Date(invoice.dueDate + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Valor</p>
                                <p className="text-xl font-bold text-slate-800 dark:text-slate-100">{invoice.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2 pt-2">
                            <button onClick={() => onViewInvoiceDetails(invoice.id)} className="flex flex-col items-center justify-center p-2 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 font-semibold rounded-lg border border-purple-100 dark:border-purple-800 hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors text-xs">
                                <FileTextIcon className="w-5 h-5 mb-1" /> Detalhes
                            </button>
                            <button onClick={() => setBoletoModalInvoice(invoice)} className="flex flex-col items-center justify-center p-2 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300 font-semibold rounded-lg border border-yellow-100 dark:border-yellow-800 hover:bg-yellow-100 dark:hover:bg-yellow-900/30 transition-colors text-xs">
                                <BarcodeIcon className="w-5 h-5 mb-1" /> Boleto
                            </button>
                            <button onClick={() => handleDownloadXLS(invoice.id)} className="flex flex-col items-center justify-center p-2 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 font-semibold rounded-lg border border-green-100 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors text-xs">
                                <DownloadIcon className="w-5 h-5 mb-1" /> XLS
                            </button>
                        </div>
                    </div>
                ))}
                {invoices.length === 0 && <p className="text-center text-slate-500 dark:text-slate-400 py-12">Nenhuma fatura encontrada para este perfil.</p>}
            </div>
        </div>
    );
};

export default BillingPage;
