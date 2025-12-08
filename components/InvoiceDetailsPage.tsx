
import React, { useState, useEffect } from 'react';
import { getInvoiceById } from '../services/bookingService';
import { AdminInvoice, Booking } from '../types';
import { ArrowLeftIcon, CalendarIcon, DollarSignIcon, FileTextIcon, MapPinIcon, DownloadIcon } from './icons';

interface InvoiceDetailsPageProps {
    invoiceId: string;
    onBack: () => void;
}

const InvoiceDetailsPage: React.FC<InvoiceDetailsPageProps> = ({ invoiceId, onBack }) => {
    const [invoiceDetails, setInvoiceDetails] = useState<{ invoice: AdminInvoice; bookings: Booking[] } | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const details = getInvoiceById(invoiceId);
        setInvoiceDetails(details);
        setLoading(false);
    }, [invoiceId]);

    const handleDownloadPDF = () => {
        // Simulate PDF download
        alert("Iniciando download do PDF...");
    };

    if (loading) {
        return <div className="text-center p-8">Carregando detalhes da fatura...</div>;
    }

    if (!invoiceDetails) {
        return <div className="text-center p-8">Fatura não encontrada.</div>;
    }
    
    const { invoice, bookings } = invoiceDetails;

    return (
        <div className="space-y-6 animate-fade-in">
            <header className="flex justify-between items-center flex-wrap gap-4">
                <div>
                    <button onClick={onBack} className="flex items-center gap-2 text-sm font-semibold text-purple-600 hover:text-purple-800 mb-2">
                        <ArrowLeftIcon className="w-5 h-5"/>Voltar para Faturas
                    </button>
                    <h1 className="text-3xl font-bold text-slate-800">Detalhes da Fatura</h1>
                    <p className="text-slate-500 text-sm">Fatura #{invoice.id.slice(-6)} • Período: {invoice.monthYear}</p>
                </div>
                <button onClick={handleDownloadPDF} className="flex items-center gap-2 bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-lg font-semibold hover:bg-slate-50 transition-colors shadow-sm">
                    <DownloadIcon className="w-5 h-5" />
                    Baixar PDF
                </button>
            </header>

            <div className="bg-white p-8 rounded-xl shadow-lg border border-slate-200">
                {/* Header */}
                <div className="flex justify-between items-start pb-6 border-b">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">Fatura de Serviços</h2>
                        <p className="text-slate-500">{invoice.clientName}</p>
                    </div>
                    <div className="text-right">
                        <p className="font-bold text-4xl text-purple-700">{invoice.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                        <p className="text-sm text-slate-500">Vencimento em: {new Date(invoice.dueDate + 'T00:00:00').toLocaleDateString('pt-BR')}</p>
                    </div>
                </div>

                {/* Details */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6">
                    <div className="flex items-center gap-3 bg-slate-50 p-4 rounded-lg">
                        <FileTextIcon className="w-6 h-6 text-slate-500" />
                        <div>
                            <p className="text-sm text-slate-500">Nº da Fatura</p>
                            <p className="font-semibold text-slate-800">{invoice.id.slice(-6)}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 bg-slate-50 p-4 rounded-lg">
                        <CalendarIcon className="w-6 h-6 text-slate-500" />
                        <div>
                            <p className="text-sm text-slate-500">Data de Emissão</p>
                            <p className="font-semibold text-slate-800">{new Date(invoice.issueDate + 'T00:00:00').toLocaleDateString('pt-BR')}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 bg-slate-50 p-4 rounded-lg">
                        <DollarSignIcon className="w-6 h-6 text-slate-500" />
                        <div>
                            <p className="text-sm text-slate-500">Status</p>
                            <p className="font-semibold text-slate-800">{invoice.status}</p>
                        </div>
                    </div>
                </div>

                {/* Bookings List */}
                <div className="mt-8">
                    <h3 className="text-lg font-bold text-slate-700 mb-4">Serviços Inclusos nesta Fatura</h3>
                    <div className="space-y-4">
                        {bookings.map(booking => (
                            <div key={booking.id} className="p-4 border rounded-lg hover:bg-slate-50">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="font-semibold text-slate-800">{booking.date ? new Date(booking.date + 'T00:00:00').toLocaleDateString('pt-BR') : 'N/A'}</p>
                                        <div className="flex items-center gap-2 text-sm text-slate-500 mt-1">
                                            <MapPinIcon className="w-4 h-4"/>
                                            <span>{booking.address}</span>
                                        </div>
                                    </div>
                                    <p className="font-semibold text-slate-700">{booking.total_price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InvoiceDetailsPage;
