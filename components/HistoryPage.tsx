
import React, { useState, useMemo, useEffect } from 'react';
// FIX: Added missing function imports from bookingService.ts.
import { getPhotographerById, getServiceById, getPhotographerPayoutForBooking } from '../services/bookingService';
import { Booking, Service } from '../types';
import { DollarSignIcon, ListOrderedIcon, BarChart2Icon } from './icons';
import { User } from '../App';

const parseDate = (dateString: string | undefined) => dateString ? new Date(dateString.replace(/-/g, '/')) : new Date(0);

const getWeekNumber = (d: Date) => {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d.valueOf() - yearStart.valueOf()) / 86400000) + 1) / 7);
    return weekNo;
}

const MetricCard: React.FC<{ icon: React.ReactNode, title: string, value: string }> = ({ icon, title, value }) => (
    <div className="bg-white p-5 rounded-xl shadow-lg border border-slate-200 flex items-center gap-4">
        <div className="bg-slate-100 p-3 rounded-full">{icon}</div>
        <div>
            <p className="text-sm text-slate-500 font-semibold">{title}</p>
            <p className="text-2xl font-bold text-slate-800">{value}</p>
        </div>
    </div>
);

const HistoryPage: React.FC<{ user: User }> = ({ user }) => {
    const [filterType, setFilterType] = useState<'month' | 'week' | 'day'>('month');
    const [currentDate, setCurrentDate] = useState(new Date());
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [services, setServices] = useState<Map<string, Service>>(new Map());

    useEffect(() => {
        const fetchData = async () => {
            const photographer = await getPhotographerById(user.id);
            if (!photographer) {
                setBookings([]);
                setServices(new Map());
                return;
            }

            const serviceMap = new Map<string, Service>();
            for (const sId of photographer.services) {
                const service = await getServiceById(sId);
                if (service) serviceMap.set(sId, service);
            }

            setBookings(photographer.bookings);
            setServices(serviceMap);
        };
        fetchData();
    }, [user.id]);

    const filteredData = useMemo(() => {
        let filteredBookings: Booking[] = [];

        if (filterType === 'month') {
            const year = currentDate.getFullYear();
            const month = currentDate.getMonth();
            filteredBookings = bookings.filter(b => {
                const bookingDate = parseDate(b.date);
                return b.status === 'Realizado' && bookingDate.getFullYear() === year && bookingDate.getMonth() === month;
            });
        } else if (filterType === 'week') {
            const year = currentDate.getFullYear();
            const week = getWeekNumber(currentDate);
            filteredBookings = bookings.filter(b => {
                const bookingDate = parseDate(b.date);
                return b.status === 'Realizado' && bookingDate.getFullYear() === year && getWeekNumber(bookingDate) === week;
            });
        } else if (filterType === 'day') {
            const dateString = currentDate.toISOString().split('T')[0];
            filteredBookings = bookings.filter(b => b.status === 'Realizado' && b.date === dateString);
        }

        filteredBookings.sort((a, b) => parseDate(a.date).getTime() - parseDate(b.date).getTime());

        const totalFaturado = filteredBookings.reduce((sum, b) => sum + getPhotographerPayoutForBooking(b), 0);
        const servicosRealizados = filteredBookings.length;
        const ticketMedio = servicosRealizados > 0 ? totalFaturado / servicosRealizados : 0;

        return { filteredBookings, totalFaturado, servicosRealizados, ticketMedio };

    }, [bookings, currentDate, filterType]);

    const handleDateChange = (increment: number) => {
        setCurrentDate(prev => {
            const newDate = new Date(prev);
            if (filterType === 'month') newDate.setMonth(prev.getMonth() + increment);
            else if (filterType === 'week') newDate.setDate(prev.getDate() + (increment * 7));
            else if (filterType === 'day') newDate.setDate(prev.getDate() + increment);
            return newDate;
        });
    };

    const getFilterLabel = () => {
        if (filterType === 'day') return currentDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
        if (filterType === 'week') {
            const startOfWeek = new Date(currentDate);
            startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
            const endOfWeek = new Date(startOfWeek);
            endOfWeek.setDate(startOfWeek.getDate() + 6);
            return `Semana de ${startOfWeek.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} a ${endOfWeek.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}`;
        }
        return currentDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
    }

    return (
        <div className="space-y-8 animate-fade-in">
            <header>
                <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Histórico Financeiro</h1>
                <p className="text-slate-500 dark:text-slate-400">Consulte seu desempenho e trabalhos realizados.</p>
            </header>

            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
                <div className="flex justify-between items-center flex-wrap gap-4">
                    <div>
                        <div className="flex border border-slate-300 dark:border-slate-600 rounded-lg p-1 w-min">
                            {(['day', 'week', 'month'] as const).map(type => (
                                <button key={type} onClick={() => setFilterType(type)} className={`px-3 py-1 text-sm font-semibold rounded-md transition-colors ${filterType === type ? 'bg-purple-600 text-white shadow' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'}`}>
                                    {type === 'day' ? 'Dia' : type === 'week' ? 'Semana' : 'Mês'}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <button onClick={() => handleDateChange(-1)} className="p-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300">&larr;</button>
                        <span className="font-bold text-purple-600 dark:text-purple-400 text-lg w-60 text-center capitalize">
                            {getFilterLabel()}
                        </span>
                        <button onClick={() => handleDateChange(1)} className="p-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300">&rarr;</button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <MetricCard icon={<DollarSignIcon className="w-6 h-6 text-green-500" />} title="Total a Receber" value={filteredData.totalFaturado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} />
                <MetricCard icon={<ListOrderedIcon className="w-6 h-6 text-blue-500" />} title="Serviços Realizados" value={filteredData.servicosRealizados.toString()} />
                <MetricCard icon={<BarChart2Icon className="w-6 h-6 text-orange-500" />} title="Recebível Médio" value={filteredData.ticketMedio.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} />
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-slate-500 dark:text-slate-400">
                        <thead className="text-xs text-slate-700 dark:text-slate-300 uppercase bg-slate-50 dark:bg-slate-700/50">
                            <tr>
                                <th scope="col" className="px-6 py-3">Data</th>
                                <th scope="col" className="px-6 py-3">Cliente</th>
                                <th scope="col" className="px-6 py-3">Serviços</th>
                                <th scope="col" className="px-6 py-3 text-right">Seu Recebível</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                            {filteredData.filteredBookings.map(booking => (
                                <tr key={booking.id} className="bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                                    <td className="px-6 py-4 font-medium text-slate-900 dark:text-slate-100">
                                        {parseDate(booking.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                                    </td>
                                    <td className="px-6 py-4 text-slate-700 dark:text-slate-300">{booking.client_name}</td>
                                    <td className="px-6 py-4 text-slate-700 dark:text-slate-300">
                                        {booking.service_ids.map(id => services.get(id)?.name || 'N/A').join(', ')}
                                    </td>
                                    <td className="px-6 py-4 font-semibold text-right text-green-600 dark:text-green-400">
                                        {getPhotographerPayoutForBooking(booking).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                    </td>
                                </tr>
                            ))}
                            {filteredData.filteredBookings.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="text-center py-10 text-slate-500 dark:text-slate-400">
                                        Nenhum serviço realizado encontrado para este período.
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

export default HistoryPage;
