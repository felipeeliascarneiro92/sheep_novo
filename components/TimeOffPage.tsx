import React, { useState, FormEvent, useMemo, useEffect } from 'react';
import { blockTimeOffSlots, getTimeOffsForPhotographer, getPhotographerById, getDailySlotsForPhotographer, isSlotFree, getPhotographerAverageEarning } from '../services/bookingService';
// FIX: Import TimeOff from types.ts where it is now defined.
import { TimeOff } from '../types';
import { ClockIcon, XCircleIcon } from './icons';

import { User } from '../App';

// Helper to convert HH:MM string to total minutes
const timeToMinutes = (time: string) => {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
};

const TimeOffPage: React.FC<{ user: User }> = ({ user }) => {
    const [allTimeOffs, setAllTimeOffs] = useState<TimeOff[]>([]);

    const today = new Date();
    const todayISO = today.toISOString().split('T')[0];

    const [selectedDate, setSelectedDate] = useState(todayISO);
    const [slotsToBlock, setSlotsToBlock] = useState<string[]>([]);
    const [notes, setNotes] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [averageEarning, setAverageEarning] = useState(0);

    const [dailySlots, setDailySlots] = useState<string[]>([]);
    const [slotStatus, setSlotStatus] = useState<Map<string, 'available' | 'booked' | 'blocked'>>(new Map());

    // Fetch initial data
    useEffect(() => {
        const fetchData = async () => {
            const timeOffs = await getTimeOffsForPhotographer(user.id);
            setAllTimeOffs(timeOffs);

            const avg = await getPhotographerAverageEarning(user.id);
            setAverageEarning(avg);
        };
        fetchData();
    }, [user.id]);

    // Fetch slots and status when date changes
    useEffect(() => {
        const fetchSlots = async () => {
            const photographer = await getPhotographerById(user.id);
            if (!photographer || !selectedDate) {
                setDailySlots([]);
                setSlotStatus(new Map());
                return;
            }

            const slots = await getDailySlotsForPhotographer(user.id, selectedDate);
            const statusMap = new Map<string, 'available' | 'booked' | 'blocked'>();

            slots.forEach(slot => {
                // Check against bookings
                const startMinutes = timeToMinutes(slot);
                const endMinutes = startMinutes + photographer.slotDurationMinutes;
                const isBooked = photographer.bookings.some(b =>
                    b.date === selectedDate &&
                    b.status !== 'Cancelado' &&
                    timeToMinutes(b.start_time!) < endMinutes &&
                    timeToMinutes(b.end_time!) > startMinutes
                );

                if (isBooked) {
                    statusMap.set(slot, 'booked');
                    return;
                }

                // Check against time offs
                // Use isSlotFree by checking if a 1-minute task can start at the slot time.
                const isFree = isSlotFree(photographer, selectedDate, slot, 1);
                statusMap.set(slot, isFree ? 'available' : 'blocked');
            });

            setDailySlots(slots);
            setSlotStatus(statusMap);
        };
        fetchSlots();
    }, [user.id, selectedDate, allTimeOffs]); // Re-run if timeOffs change

    const opportunityCost = slotsToBlock.length * 50;

    const handleSlotClick = (slot: string) => {
        setSlotsToBlock(prev =>
            prev.includes(slot) ? prev.filter(s => s !== slot) : [...prev, slot]
        );
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (slotsToBlock.length === 0) return;
        setIsSubmitting(true);

        await blockTimeOffSlots(user.id, selectedDate, slotsToBlock, notes);

        const updatedTimeOffs = await getTimeOffsForPhotographer(user.id);
        setAllTimeOffs(updatedTimeOffs);
        setSlotsToBlock([]);
        setNotes('');
        setIsSubmitting(false);
    };

    const groupedTimeOffs = useMemo(() => {
        const groups: Record<string, { date: string, slots: string[], notes: string[] }> = {};

        allTimeOffs.forEach(to => {
            const date = new Date(to.start_datetime).toISOString().split('T')[0];
            const slot = new Date(to.start_datetime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

            if (!groups[date]) {
                groups[date] = { date, slots: [], notes: [] };
            }
            groups[date].slots.push(slot);
            if (to.notes && !groups[date].notes.includes(to.notes)) {
                groups[date].notes.push(to.notes);
            }
        });

        return Object.values(groups)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .map(group => ({ ...group, slots: group.slots.sort() }));

    }, [allTimeOffs]);

    return (
        <div className="space-y-8 animate-fade-in">
            <header>
                <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Gerenciar Folgas e Bloqueios</h1>
                <p className="text-slate-500 dark:text-slate-400">Selecione um dia e clique nos horários que deseja bloquear.</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
                    <div className="mb-6">
                        <label htmlFor="start-date" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Selecione o dia para bloquear</label>
                        <input type="date" id="start-date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} min={todayISO} required className="w-full md:w-auto p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg" />
                    </div>

                    <h3 className="font-bold text-slate-700 dark:text-slate-200 mb-3">Horários de Trabalho</h3>
                    <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2">
                        {dailySlots.map(slot => {
                            const status = slotStatus.get(slot);
                            const isSelected = slotsToBlock.includes(slot);
                            const isDisabled = status === 'booked' || status === 'blocked';

                            let buttonClass = "w-full p-2 border rounded-md font-semibold text-sm transition-colors ";
                            if (isDisabled) {
                                buttonClass += "bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed border-slate-200 dark:border-slate-700";
                            } else if (isSelected) {
                                buttonClass += "bg-red-500 text-white border-red-500 shadow-md";
                            } else {
                                buttonClass += "bg-white dark:bg-slate-700 text-purple-700 dark:text-purple-400 border-slate-300 dark:border-slate-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:border-purple-300 dark:hover:border-purple-500";
                            }

                            return (
                                <button key={slot} onClick={() => !isDisabled && handleSlotClick(slot)} disabled={isDisabled} className={buttonClass}>
                                    {slot}
                                </button>
                            );
                        })}
                    </div>

                    <form onSubmit={handleSubmit} className="mt-6 space-y-4 border-t border-slate-200 dark:border-slate-700 pt-6">
                        <h3 className="font-bold text-slate-700 dark:text-slate-200">Detalhes do Bloqueio</h3>
                        {slotsToBlock.length > 0 && (
                            <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-400 dark:border-amber-600 animate-fade-in rounded-r-lg">
                                <h4 className="font-bold text-amber-800 dark:text-amber-300">Custo de Oportunidade Estimado</h4>
                                <p className="text-sm text-amber-700 dark:text-amber-400">
                                    Bloquear <span className="font-bold">{slotsToBlock.length}</span> horário(s) representa um custo estimado de
                                    aproximadamente <span className="font-bold">R$ {opportunityCost.toFixed(2)}</span>
                                    , com base no custo fixo de R$ 50,00 por slot.
                                </p>
                            </div>
                        )}
                        <div>
                            <label htmlFor="notes" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Motivo (Opcional)</label>
                            <input type="text" id="notes" value={notes} onChange={e => setNotes(e.target.value)} className="mt-1 w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg" placeholder="Ex: Consulta médica" />
                        </div>
                        <button type="submit" disabled={isSubmitting || slotsToBlock.length === 0} className="w-full md:w-auto font-semibold text-white bg-gradient-to-r from-purple-600 to-pink-500 px-6 py-2.5 rounded-lg shadow-md hover:shadow-lg transition-shadow disabled:opacity-50">
                            {isSubmitting ? 'Salvando...' : `Bloquear ${slotsToBlock.length} Horário(s)`}
                        </button>
                    </form>
                </div>

                <div className="lg:col-span-1">
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 sticky top-8">
                        <h2 className="text-xl font-bold text-slate-700 dark:text-slate-200 mb-4">Períodos Bloqueados</h2>
                        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                            {groupedTimeOffs.length > 0 ? groupedTimeOffs.map(group => (
                                <div key={group.date} className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                                    <p className="font-bold text-slate-800 dark:text-slate-100">
                                        {new Date(group.date.replace(/-/g, '/')).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
                                    </p>
                                    <div className="flex flex-wrap gap-1 mt-2">
                                        {group.slots.map(slot => (
                                            <span key={slot} className="text-xs font-semibold bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-300 px-2 py-1 rounded-md">{slot}</span>
                                        ))}
                                    </div>
                                    {group.notes.length > 0 && <p className="text-sm text-slate-600 dark:text-slate-300 mt-2 italic">"{group.notes.join('; ')}"</p>}
                                </div>
                            )) : (
                                <p className="text-center text-slate-500 dark:text-slate-400 py-10">Nenhum período de folga cadastrado.</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TimeOffPage;
