
import React, { useMemo, useState, useRef, useEffect } from 'react';
// FIX: Added missing function import from bookingService.ts.
import { getPhotographerById, getPhotographerPayoutForBooking, uploadInvoice } from '../services/bookingService';
import { getPhotographerTransactions } from '../services/photographerFinanceService';
import { UploadIcon, FileTextIcon, DollarSignIcon, CheckCircleIcon, ClockIcon, LoaderIcon } from './icons';
import { Booking } from '../types';
import { User } from '../App';

const parseDate = (dateString: string) => new Date(dateString.replace(/-/g, '/'));

const ReceivablesPage: React.FC<{ user: User }> = ({ user }) => {
    const [attachedFiles, setAttachedFiles] = useState<Record<string, File>>({});
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uploadingMonth, setUploadingMonth] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);

    const [monthlyReceivables, setMonthlyReceivables] = useState<any[]>([]);
    const [totalPending, setTotalPending] = useState(0);
    const [totalPaid, setTotalPaid] = useState(0);

    useEffect(() => {
        const fetchData = async () => {
            const photographer = await getPhotographerById(user.id);
            if (!photographer) {
                setMonthlyReceivables([]);
                setTotalPending(0);
                setTotalPaid(0);
                return;
            }

            const bookings = photographer.bookings.filter(b => b.status === 'Realizado' || b.status === 'Concluído');

            let pendingSum = 0;
            let paidSum = 0;

            const grouped = bookings.reduce((acc, booking) => {
                const monthYear = parseDate(booking.date || '').toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
                const payout = getPhotographerPayoutForBooking(booking);

                if (!acc[monthYear]) {
                    acc[monthYear] = {
                        total: 0,
                        totalPaid: 0,
                        totalPending: 0,
                        count: 0,
                        bookings: [],
                        date: parseDate(booking.date || ''),
                        isFullyPaid: true,
                        debits: 0,
                        credits: 0
                    };
                }

                acc[monthYear].total += payout;
                acc[monthYear].count++;
                acc[monthYear].bookings.push(booking);

                if (booking.isPaidToPhotographer) {
                    acc[monthYear].totalPaid += payout;
                    paidSum += payout;
                } else {
                    acc[monthYear].totalPending += payout;
                    acc[monthYear].isFullyPaid = false;
                    pendingSum += payout;
                }

                return acc;
            }, {} as Record<string, { total: number; totalPaid: number; totalPending: number; count: number; bookings: Booking[], date: Date, isFullyPaid: boolean, debits: number, credits: number }>);

            // Fetch and process transactions (Debits/Credits)
            const transactions = await getPhotographerTransactions(user.id);

            transactions.forEach(tx => {
                const txDate = parseDate(tx.created_at.split('T')[0]);
                const monthYear = txDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });

                if (grouped[monthYear]) {
                    if (tx.type === 'DEBIT') {
                        grouped[monthYear].total += tx.amount; // amount is negative for debit in DB, so adding it reduces total
                        grouped[monthYear].totalPending += tx.amount;
                        grouped[monthYear].debits = (grouped[monthYear].debits || 0) + Math.abs(tx.amount);
                        pendingSum += tx.amount;
                    } else {
                        grouped[monthYear].total += tx.amount;
                        grouped[monthYear].totalPending += tx.amount;
                        grouped[monthYear].credits = (grouped[monthYear].credits || 0) + tx.amount;
                        pendingSum += tx.amount;
                    }
                }
            });

            const list = Object.entries(grouped)
                .map(([monthYear, data]) => ({ monthYear, ...data }))
                .sort((a, b) => b.date.getTime() - a.date.getTime());

            setMonthlyReceivables(list);
            setTotalPending(pendingSum);
            setTotalPaid(paidSum);
        };
        fetchData();
    }, [user.id]);

    const handleAttachClick = (monthYear: string) => {
        setUploadingMonth(monthYear);
        fileInputRef.current?.click();
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files[0] && uploadingMonth) {
            const file = event.target.files[0];
            setIsUploading(true);
            try {
                await uploadInvoice(file, uploadingMonth, user.id);
                setAttachedFiles(prev => ({ ...prev, [uploadingMonth]: file }));
                alert("Nota Fiscal enviada com sucesso!");
            } catch (error) {
                console.error("Erro ao enviar NF:", error);
                alert("Erro ao enviar Nota Fiscal. Tente novamente.");
            } finally {
                setIsUploading(false);
                setUploadingMonth(null);
            }
        } else {
            setUploadingMonth(null);
        }

        // Reset the input value to allow re-uploading the same file
        if (event.target) event.target.value = '';
    };

    return (
        <div className="space-y-8 animate-fade-in">
            <input type="file" ref={fileInputRef} onChange={handleFileChange} style={{ display: 'none' }} accept=".pdf" />
            <header>
                <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Meus Recebíveis</h1>
                <p className="text-slate-500 dark:text-slate-400">Acompanhe os fechamentos mensais e status de repasse.</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex items-center gap-4">
                    <div className="bg-yellow-100 dark:bg-yellow-900/30 p-3 rounded-full"><DollarSignIcon className="w-6 h-6 text-yellow-600 dark:text-yellow-400" /></div>
                    <div>
                        <p className="text-sm text-slate-500 dark:text-slate-400 font-semibold">Saldo a Receber</p>
                        <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{totalPending.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex items-center gap-4">
                    <div className="bg-green-100 dark:bg-green-900/30 p-3 rounded-full"><CheckCircleIcon className="w-6 h-6 text-green-600 dark:text-green-400" /></div>
                    <div>
                        <p className="text-sm text-slate-500 dark:text-slate-400 font-semibold">Total Recebido</p>
                        <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{totalPaid.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-slate-500 dark:text-slate-400">
                        <thead className="text-xs text-white uppercase bg-[#19224c] dark:bg-[#19224c]">
                            <tr>
                                <th scope="col" className="px-6 py-4">MÊS DE REFERÊNCIA</th>
                                <th scope="col" className="px-6 py-4 text-center">SERVIÇOS</th>
                                <th scope="col" className="px-6 py-4 text-right">VALOR TOTAL</th>
                                <th scope="col" className="px-6 py-4 text-right">RECEBIDO</th>
                                <th scope="col" className="px-6 py-4 text-center">STATUS REPASSE</th>
                                <th scope="col" className="px-6 py-4 text-center">NOTA FISCAL</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                            {monthlyReceivables.map(({ monthYear, total, totalPaid, count, isFullyPaid, debits, credits }) => {
                                const attachedFile = attachedFiles[monthYear];
                                return (
                                    <tr key={monthYear} className="bg-white dark:bg-slate-800 border-b last:border-b-0 hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                        <td className="px-6 py-4 font-bold text-slate-900 dark:text-slate-100 capitalize">
                                            {monthYear}
                                            {debits > 0 && <span className="block text-xs text-red-500 font-normal mt-1">(- R$ {debits.toFixed(2)} em multas)</span>}
                                            {credits > 0 && <span className="block text-xs text-green-500 font-normal mt-1">(+ R$ {credits.toFixed(2)} em bônus)</span>}
                                        </td>
                                        <td className="px-6 py-4 text-center text-slate-600 dark:text-slate-300">
                                            {count}
                                        </td>
                                        <td className="px-6 py-4 font-bold text-right text-slate-800 dark:text-slate-100">
                                            {total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                        </td>
                                        <td className="px-6 py-4 font-bold text-right text-green-600 dark:text-green-400">
                                            {totalPaid.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`inline-flex items-center gap-1 px-3 py-1 font-semibold text-xs rounded-full ${isFullyPaid ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-800' : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-800'}`}>
                                                {isFullyPaid ? <><CheckCircleIcon className="w-3 h-3" /> Quitado</> : <><ClockIcon className="w-3 h-3" /> Pendente</>}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {attachedFile ? (
                                                <div className="flex items-center justify-center gap-2 text-green-700 dark:text-green-400 font-semibold text-xs">
                                                    <FileTextIcon className="w-4 h-4" />
                                                    <span className="truncate max-w-xs">{attachedFile.name}</span>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => handleAttachClick(monthYear)}
                                                    disabled={isUploading}
                                                    className={`bg-purple-500 hover:bg-purple-600 text-white font-semibold py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors text-xs mx-auto shadow-sm ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                >
                                                    {isUploading && uploadingMonth === monthYear ? <LoaderIcon className="w-4 h-4 animate-spin" /> : <UploadIcon className="w-4 h-4" />}
                                                    {isUploading && uploadingMonth === monthYear ? 'Enviando...' : 'Anexar NF'}
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                )
                            })}
                            {monthlyReceivables.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="text-center py-8 text-slate-500 dark:text-slate-400">Nenhum registro financeiro encontrado.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default ReceivablesPage;
