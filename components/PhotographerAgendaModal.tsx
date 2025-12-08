
import React, { useState, useEffect, useMemo } from 'react';
import { Photographer, Booking, TimeOff } from '../types';
import { getBookingsForPhotographer, getTimeOffsForPhotographer } from '../services/bookingService';
import { blockTimeOffSlots } from '../services/photographerService';
import { XIcon, CalendarIcon, ClockIcon, MapPinIcon, UserIcon, AlertTriangleIcon, PlusIcon, CheckCircleIcon } from './icons';
import Calendar from './Calendar';

interface PhotographerAgendaModalProps {
    photographer: Photographer;
    initialDate: Date;
    onClose: () => void;
}

type AgendaItem =
    | { type: 'booking'; data: Booking; start: number; end: number }
    | { type: 'timeoff'; data: TimeOff; start: number; end: number };

const timeToMinutes = (time: string) => {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
};

const minutesToTime = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
};

const PhotographerAgendaModal: React.FC<PhotographerAgendaModalProps> = ({ photographer, initialDate, onClose }) => {
    const [selectedDate, setSelectedDate] = useState<Date>(initialDate);
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [timeOffs, setTimeOffs] = useState<TimeOff[]>([]);
    const [loading, setLoading] = useState(true);

    // Blocking State
    const [isBlockingMode, setIsBlockingMode] = useState(false);
    const [selectedSlotsToBlock, setSelectedSlotsToBlock] = useState<string[]>([]);
    const [blockNotes, setBlockNotes] = useState('');
    const [isSubmittingBlock, setIsSubmittingBlock] = useState(false);

    const dayOfWeek = selectedDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase() as any;
    const availableSlots = photographer.availability[dayOfWeek] || [];

    const handleToggleSlot = (slot: string) => {
        setSelectedSlotsToBlock(prev =>
            prev.includes(slot) ? prev.filter(s => s !== slot) : [...prev, slot]
        );
    };

    const handleSaveBlock = async () => {
        if (selectedSlotsToBlock.length === 0) {
            alert("Selecione pelo menos um horário para bloquear.");
            return;
        }

        setIsSubmittingBlock(true);
        try {
            const dateStr = selectedDate.toISOString().split('T')[0];
            // Pass 'AdminBlock' as type to distinguish from regular time offs
            await blockTimeOffSlots(photographer.id, dateStr, selectedSlotsToBlock, blockNotes, 'AdminBlock');

            alert("Bloqueio realizado com sucesso!");
            setIsBlockingMode(false);
            setSelectedSlotsToBlock([]);
            setBlockNotes('');
            // Trigger refresh
            const [fetchedBookings, fetchedTimeOffs] = await Promise.all([
                getBookingsForPhotographer(photographer.id),
                getTimeOffsForPhotographer(photographer.id)
            ]);
            setBookings(fetchedBookings);
            setTimeOffs(fetchedTimeOffs);
        } catch (error) {
            console.error("Error blocking slots:", error);
            alert("Erro ao realizar bloqueio.");
        } finally {
            setIsSubmittingBlock(false);
        }
    };

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [fetchedBookings, fetchedTimeOffs] = await Promise.all([
                    getBookingsForPhotographer(photographer.id),
                    getTimeOffsForPhotographer(photographer.id)
                ]);
                setBookings(fetchedBookings);
                setTimeOffs(fetchedTimeOffs);
            } catch (error) {
                console.error("Error fetching agenda data", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [photographer.id]);

    const agendaItems = useMemo(() => {
        const dateStr = selectedDate.toISOString().split('T')[0];
        const items: AgendaItem[] = [];

        // Filter Bookings
        bookings.forEach(b => {
            if (b.date === dateStr && b.status !== 'Cancelado' && b.start_time && b.end_time) {
                items.push({
                    type: 'booking',
                    data: b,
                    start: timeToMinutes(b.start_time),
                    end: timeToMinutes(b.end_time)
                });
            }
        });

        // Filter Time Offs
        timeOffs.forEach(t => {
            const tStart = new Date(t.start_datetime);
            const tEnd = new Date(t.end_datetime);
            const tDateStr = tStart.toISOString().split('T')[0];

            if (tDateStr === dateStr) {
                items.push({
                    type: 'timeoff',
                    data: t,
                    start: tStart.getHours() * 60 + tStart.getMinutes(),
                    end: tEnd.getHours() * 60 + tEnd.getMinutes()
                });
            }
        });

        return items.sort((a, b) => a.start - b.start);
    }, [bookings, timeOffs, selectedDate]);

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-fade-in-fast p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-2xl">
                    <div className="flex items-center gap-4">
                        <img
                            src={photographer.profilePicUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(photographer.name)}&background=random`}
                            alt={photographer.name}
                            className="w-12 h-12 rounded-full border-2 border-white shadow-sm"
                        />
                        <div>
                            <h3 className="text-xl font-bold text-slate-800">Agenda de {photographer.name}</h3>
                            <p className="text-sm text-slate-500">Visualize todos os compromissos e bloqueios.</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                        <XIcon className="w-6 h-6 text-slate-500" />
                    </button>
                </div>

                <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
                    {/* Sidebar: Calendar */}
                    <div className="p-6 border-r border-slate-100 md:w-80 bg-white overflow-y-auto">
                        <h4 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
                            <CalendarIcon className="w-5 h-5 text-purple-600" /> Selecione a Data
                        </h4>
                        <Calendar
                            selectedDate={selectedDate}
                            onDateChange={(date) => { setSelectedDate(date); setIsBlockingMode(false); }}
                        />

                        <div className="mt-6">
                            {!isBlockingMode ? (
                                <button
                                    onClick={() => setIsBlockingMode(true)}
                                    className="w-full py-2.5 bg-red-50 text-red-600 border border-red-200 rounded-lg font-semibold hover:bg-red-100 transition-colors flex items-center justify-center gap-2"
                                >
                                    <AlertTriangleIcon className="w-5 h-5" />
                                    Adicionar Bloqueio
                                </button>
                            ) : (
                                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 animate-fade-in">
                                    <h5 className="font-bold text-slate-800 mb-2">Novo Bloqueio</h5>
                                    <p className="text-xs text-slate-500 mb-3">Selecione os horários abaixo para bloquear.</p>

                                    <div className="mb-3">
                                        <label className="block text-xs font-semibold text-slate-600 mb-1">Motivo / Obs:</label>
                                        <input
                                            type="text"
                                            value={blockNotes}
                                            onChange={e => setBlockNotes(e.target.value)}
                                            className="w-full p-2 text-sm border border-slate-300 rounded-md"
                                            placeholder="Ex: Folga médica, Manutenção..."
                                        />
                                    </div>

                                    <div className="flex gap-2">
                                        <button
                                            onClick={handleSaveBlock}
                                            disabled={isSubmittingBlock}
                                            className="flex-1 py-2 bg-red-600 text-white rounded-md text-sm font-bold hover:bg-red-700 disabled:opacity-50"
                                        >
                                            {isSubmittingBlock ? 'Salvando...' : 'Confirmar'}
                                        </button>
                                        <button
                                            onClick={() => setIsBlockingMode(false)}
                                            className="px-3 py-2 bg-white border border-slate-300 text-slate-600 rounded-md text-sm font-semibold hover:bg-slate-50"
                                        >
                                            Cancelar
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="mt-6 space-y-3">
                            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Legenda</div>
                            <div className="flex items-center gap-2 text-sm text-slate-600">
                                <div className="w-3 h-3 rounded-full bg-purple-500"></div> Agendamento
                            </div>
                            <div className="flex items-center gap-2 text-sm text-slate-600">
                                <div className="w-3 h-3 rounded-full bg-slate-400"></div> Bloqueio / Folga
                            </div>
                            <div className="flex items-center gap-2 text-sm text-slate-600">
                                <div className="w-3 h-3 rounded-full bg-red-500"></div> Bloqueio Admin
                            </div>
                        </div>
                    </div>

                    {/* Main Content: Timeline */}
                    <div className="flex-1 p-6 overflow-y-auto bg-slate-50/50">
                        <h4 className="font-bold text-slate-800 mb-6 text-lg capitalize flex justify-between items-center">
                            <span>{selectedDate.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
                            {isBlockingMode && <span className="text-sm font-normal text-red-600 bg-red-50 px-3 py-1 rounded-full border border-red-100">Modo de Bloqueio Ativo</span>}
                        </h4>

                        {isBlockingMode && (
                            <div className="mb-8 bg-white p-4 rounded-xl border border-purple-100 shadow-sm">
                                <h5 className="font-semibold text-slate-700 mb-3">Selecione os horários para bloquear:</h5>
                                {availableSlots.length > 0 ? (
                                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                                        {availableSlots.map(slot => {
                                            // Check if slot is already booked or blocked
                                            const isOccupied = agendaItems.some(item => {
                                                const itemStart = minutesToTime(item.start);
                                                return itemStart === slot; // Simple check, ideally check overlap
                                            });

                                            return (
                                                <button
                                                    key={slot}
                                                    onClick={() => !isOccupied && handleToggleSlot(slot)}
                                                    disabled={isOccupied}
                                                    className={`py-2 px-1 rounded-md text-sm font-medium transition-all ${selectedSlotsToBlock.includes(slot)
                                                        ? 'bg-red-500 text-white shadow-md transform scale-105'
                                                        : isOccupied
                                                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                                            : 'bg-white border border-slate-200 text-slate-600 hover:border-red-300 hover:bg-red-50'
                                                        }`}
                                                >
                                                    {slot}
                                                </button>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <p className="text-slate-500 italic">O fotógrafo não possui horários configurados para este dia da semana.</p>
                                )}
                            </div>
                        )}

                        {loading ? (
                            <div className="space-y-4">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="h-24 bg-slate-200 rounded-xl animate-pulse"></div>
                                ))}
                            </div>
                        ) : agendaItems.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-64 text-slate-400 border-2 border-dashed border-slate-200 rounded-xl">
                                <CalendarIcon className="w-12 h-12 mb-2 opacity-50" />
                                <p className="font-medium">Agenda livre neste dia</p>
                            </div>
                        ) : (
                            <div className="space-y-4 relative">
                                {/* Vertical Line */}
                                <div className="absolute left-4 top-4 bottom-4 w-0.5 bg-slate-200"></div>

                                {agendaItems.map((item, index) => (
                                    <div key={index} className="relative pl-10 animate-fade-in-up" style={{ animationDelay: `${index * 50}ms` }}>
                                        {/* Dot */}
                                        <div className={`absolute left-[11px] top-6 w-4 h-4 rounded-full border-4 border-white shadow-sm ${item.type === 'booking' ? 'bg-purple-500' :
                                            (item.data as any).type === 'AdminBlock' ? 'bg-red-500' : 'bg-slate-400'
                                            }`}></div>

                                        <div className={`p-4 rounded-xl border shadow-sm transition-all hover:shadow-md ${item.type === 'booking'
                                            ? 'bg-white border-purple-100 hover:border-purple-300'
                                            : (item.data as any).type === 'AdminBlock'
                                                ? 'bg-red-50 border-red-200'
                                                : 'bg-slate-100 border-slate-200'
                                            }`}>
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="flex items-center gap-2">
                                                    <span className={`px-2 py-1 rounded text-xs font-bold ${item.type === 'booking' ? 'bg-purple-100 text-purple-700' : 'bg-slate-200 text-slate-600'
                                                        }`}>
                                                        {minutesToTime(item.start)} - {minutesToTime(item.end)}
                                                    </span>
                                                    {item.type === 'booking' && (
                                                        <span className="text-xs text-slate-400 font-medium">
                                                            {item.end - item.start} min
                                                        </span>
                                                    )}
                                                </div>
                                                {item.type === 'booking' && (
                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${item.data.status === 'Confirmado' ? 'bg-green-100 text-green-700 border-green-200' :
                                                        item.data.status === 'Pendente' ? 'bg-yellow-100 text-yellow-700 border-yellow-200' :
                                                            'bg-slate-100 text-slate-600 border-slate-200'
                                                        }`}>
                                                        {item.data.status}
                                                    </span>
                                                )}
                                                {item.type === 'timeoff' && (item.data as any).type === 'AdminBlock' && (
                                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200">
                                                        Bloqueio Admin
                                                    </span>
                                                )}
                                            </div>

                                            {item.type === 'booking' ? (
                                                <>
                                                    <h5 className="font-bold text-slate-800 text-lg mb-1">{item.data.client_name}</h5>
                                                    <div className="space-y-1">
                                                        <p className="text-sm text-slate-600 flex items-center gap-2">
                                                            <MapPinIcon className="w-4 h-4 text-slate-400" /> {item.data.address}
                                                        </p>
                                                        <p className="text-xs text-slate-500 flex items-center gap-2">
                                                            <UserIcon className="w-3 h-3" /> ID: {item.data.id.slice(0, 8)}
                                                        </p>
                                                    </div>
                                                </>
                                            ) : (
                                                <>
                                                    <h5 className="font-bold text-slate-700 text-lg mb-1 flex items-center gap-2">
                                                        <AlertTriangleIcon className="w-5 h-5 text-slate-500" />
                                                        {(item.data as any).type === 'AdminBlock' ? 'Bloqueio Administrativo' : 'Bloqueio / Folga'}
                                                    </h5>
                                                    <p className="text-sm text-slate-600 italic">"{item.data.notes || (item.data as any).reason}"</p>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="p-4 border-t border-slate-100 bg-slate-50 rounded-b-2xl flex justify-end">
                    <button onClick={onClose} className="px-6 py-2 bg-white border border-slate-300 rounded-lg font-semibold text-slate-700 hover:bg-slate-50 shadow-sm">
                        Fechar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PhotographerAgendaModal;
