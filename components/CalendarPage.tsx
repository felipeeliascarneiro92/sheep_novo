
import React, { useState, useMemo, useEffect } from 'react';
// FIX: Added missing function imports from bookingService.ts.
import { getPhotographerById, getDailySlotsForPhotographer } from '../services/bookingService';
import { Booking } from '../types';
import { ChevronLeftIcon, ChevronRightIcon } from './icons';

import { User } from '../App';

const statusStyles: Record<Booking['status'], { bg: string; text: string; border: string }> = {
    Confirmado: { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-400' },
    Realizado: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-400' },
    Cancelado: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-400' },
    Pendente: { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-400' },
    Concluído: { bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-400' },
    Rascunho: { bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-400' },
};

interface CalendarPageProps {
    user: User;
    onViewDetails: (bookingId: string) => void;
}

const CalendarPage: React.FC<CalendarPageProps> = ({ user, onViewDetails }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [photographerBookings, setPhotographerBookings] = useState<Booking[]>([]);
    const [dailySlots, setDailySlots] = useState<string[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            const photographer = await getPhotographerById(user.id);
            if (photographer) {
                setPhotographerBookings(photographer.bookings);
                const todayForSlots = new Date().toISOString().split('T')[0];
                const slots = await getDailySlotsForPhotographer(user.id, todayForSlots);
                setDailySlots(slots);
            }
        };
        fetchData();
    }, [user.id]);

    const { weekDates, weekLabel } = useMemo(() => {
        const startOfWeek = new Date(currentDate);
        startOfWeek.setDate(currentDate.getDate() - currentDate.getDay()); // Sunday

        const dates: Date[] = [];
        for (let i = 0; i < 7; i++) {
            const date = new Date(startOfWeek);
            date.setDate(startOfWeek.getDate() + i);
            dates.push(date);
        }

        const endOfWeek = dates[6];
        const startMonth = startOfWeek.toLocaleString('pt-BR', { month: 'long' });
        const endMonth = endOfWeek.toLocaleString('pt-BR', { month: 'long' });
        const year = startOfWeek.getFullYear();

        let label = '';
        if (startMonth === endMonth) {
            label = `${startOfWeek.getDate()} a ${endOfWeek.getDate()} de ${startMonth} de ${year}`;
        } else {
            label = `${startOfWeek.getDate()} de ${startMonth} a ${endOfWeek.getDate()} de ${endMonth} de ${year}`;
        }

        return {
            weekDates: dates,
            weekLabel: label
        };
    }, [currentDate]);

    const weeklySchedule = useMemo(() => {
        return weekDates.map(date => {
            const dateString = date.toISOString().split('T')[0];
            const bookingsForDay = photographerBookings
                .filter(b => b.date === dateString && b.status !== 'Cancelado');

            const bookingsBySlot = new Map<string, Booking>();
            bookingsForDay.forEach(b => bookingsBySlot.set(b.start_time, b));
            return bookingsBySlot;
        });
    }, [weekDates, photographerBookings]);

    const handlePrevWeek = () => setCurrentDate(prev => new Date(prev.setDate(prev.getDate() - 7)));
    const handleNextWeek = () => setCurrentDate(prev => new Date(prev.setDate(prev.getDate() + 7)));

    return (
        <div className="space-y-8 animate-fade-in">
            <header className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Calendário</h1>
                    <p className="text-slate-500 dark:text-slate-400">Visualize sua agenda semanal.</p>
                </div>
                <div className="flex items-center gap-4">
                    <button onClick={handlePrevWeek} className="p-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 border dark:border-slate-600 text-slate-600 dark:text-slate-300"><ChevronLeftIcon className="w-5 h-5" /></button>
                    <span className="font-bold text-purple-600 dark:text-purple-400 text-lg w-auto sm:w-72 text-center capitalize">
                        {weekLabel}
                    </span>
                    <button onClick={handleNextWeek} className="p-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 border dark:border-slate-600 text-slate-600 dark:text-slate-300"><ChevronRightIcon className="w-5 h-5" /></button>
                </div>
            </header>

            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="overflow-x-auto">
                    <div className="grid grid-cols-[100px_repeat(7,1fr)] min-w-[900px]">
                        {/* Time column header */}
                        <div className="p-3 bg-slate-50 dark:bg-slate-700/50 border-r border-b dark:border-slate-700"></div>

                        {/* Day headers */}
                        {weekDates.map(date => (
                            <div key={date.toISOString()} className="p-3 text-center bg-slate-50 dark:bg-slate-700/50 border-r border-b dark:border-slate-700">
                                <p className="font-semibold text-slate-600 dark:text-slate-300 text-sm">{date.toLocaleString('pt-BR', { weekday: 'short' })}</p>
                                <p className="font-bold text-slate-800 dark:text-slate-100 text-xl">{date.getDate()}</p>
                            </div>
                        ))}

                        {/* Schedule rows */}
                        {dailySlots.map(slot => (
                            <React.Fragment key={slot}>
                                {/* Time cell */}
                                <div className="p-3 text-center bg-slate-50 dark:bg-slate-700/50 border-r border-b dark:border-slate-700 font-semibold text-purple-700 dark:text-purple-400 h-16 flex items-center justify-center">
                                    {slot}
                                </div>
                                {/* Day cells for this slot */}
                                {weeklySchedule.map((daySchedule, dayIndex) => {
                                    const booking = daySchedule.get(slot);
                                    return (
                                        <div key={dayIndex} className="p-1 border-r border-b dark:border-slate-700 h-16">
                                            {booking && (
                                                <div
                                                    onClick={() => onViewDetails(booking.id)}
                                                    className={`p-2 rounded-lg h-full text-xs cursor-pointer transition-all hover:shadow-lg hover:-translate-y-0.5 flex flex-col justify-center ${statusStyles[booking.status].bg} ${statusStyles[booking.status].text} border-l-4 ${statusStyles[booking.status].border}`}
                                                >
                                                    <p className="font-bold truncate">{booking.client_name}</p>
                                                    <p className="truncate">{booking.address}</p>
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
                            </React.Fragment>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CalendarPage;