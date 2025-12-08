

import React, { useState, useEffect, useMemo, FormEvent, DragEvent, useRef } from 'react';
// FIX: Added missing function imports from bookingService.ts.
import {
    getAllBookings, getBookingsForClient, getBookingsForPhotographer, getBookingsPaginated,
    getServiceById, getPhotographers, getServices,
    updateBookingStatus, rescheduleBooking, getClientById,
    getAvailableSlots, updateBookingServicesAndPrice, getPhotographerPayoutForBooking, getPhotographerById, isSlotFree, getDailySlotsForPhotographer, deliverAndCompleteBooking, getClients, uploadMaterialForBooking, updateBookingFull
} from '../services/bookingService';
import { Booking, BookingStatus, Photographer, Service, Client } from '../types';
import { FilterIcon, MapPinIcon, ClockIcon, ListOrderedIcon, CameraIcon, CalendarIcon, SearchIcon, EditIcon, RefreshCwIcon, XCircleIcon, XIcon, DollarSignIcon, UploadIcon, UploadCloudIcon, FileIcon, CheckCircleIcon, ChevronDownIcon, DownloadIcon } from './icons';
import { User } from '../App';
import Calendar from './Calendar';
import Skeleton from './Skeleton';

const statusOptions: BookingStatus[] = ['Confirmado', 'Cancelado', 'Pendente', 'Realizado', 'Concluído'];

const statusStyles: Record<BookingStatus, string> = {
    Confirmado: "bg-green-100 text-green-800",
    Cancelado: "bg-red-100 text-red-800",
    Pendente: "bg-yellow-100 text-yellow-800",
    Realizado: "bg-blue-100 text-blue-800",
    Concluído: "bg-purple-100 text-purple-800",
    Rascunho: "bg-gray-100 text-gray-800",
};

// --- MODALS (Exported for reuse) ---

const CANCEL_REASONS = [
    { id: 'weather', label: '⛈️ Condições Climáticas (Chuva/Tempo Feio)', icon: '🌧️' },
    { id: 'keys', label: '🔑 Problema com Chaves / Acesso', icon: '🔑' },
    { id: 'owner', label: '👤 Proprietário/Inquilino não pode', icon: '🏠' },
    { id: 'personal', label: '📅 Imprevisto Pessoal / Agenda', icon: '🗓️' },
    { id: 'other', label: '📝 Outro Motivo', icon: '✏️' }
];

import { useToast } from '../contexts/ToastContext';

// ...

export const CancelModal: React.FC<{
    booking: Booking,
    user: User,
    onConfirm: () => void,
    onClose: () => void,
    onOptimisticUpdate?: (bookingId: string, newStatus: BookingStatus) => void
}> = ({ booking, user, onConfirm, onClose, onOptimisticUpdate }) => {
    const [selectedReasonId, setSelectedReasonId] = useState<string>('');
    const [customReason, setCustomReason] = useState('');
    const { showToast } = useToast();

    // Estado para controlar se mostramos o Upsell de retenção (Ideia do Céu Azul)
    const [showRetentionOffer, setShowRetentionOffer] = useState(false);

    const actor = user.role === 'admin' ? 'Admin' : 'Cliente';

    const handleReasonSelect = (id: string) => {
        setSelectedReasonId(id);
        // Se o motivo for clima, mostramos a oferta de retenção antes de deixar cancelar
        if (id === 'weather') {
            setShowRetentionOffer(true);
        } else {
            setShowRetentionOffer(false);
        }
    };

    const handleConfirm = async () => {
        let finalReason = CANCEL_REASONS.find(r => r.id === selectedReasonId)?.label || 'Motivo não informado';

        if (selectedReasonId === 'other') {
            if (!customReason.trim()) {
                showToast('Por favor, descreva o motivo.', 'warning');
                return;
            }
            finalReason = `Outro: ${customReason} `;
        } else if (selectedReasonId === 'weather') {
            // Aqui você pode adicionar uma tag específica para métricas futuras
            finalReason = `[CLIMA] ${finalReason} `;
        }

        // OPTIMISTIC UPDATE: Update UI immediately
        if (onOptimisticUpdate) {
            onOptimisticUpdate(booking.id, 'Cancelado');
        }
        onClose(); // Close modal immediately

        try {
            await updateBookingStatus(booking.id, 'Cancelado', `Cancelado por ${actor}: ${finalReason} `, actor);
            showToast('Agendamento cancelado com sucesso!', 'success');
            onConfirm(); // Sync with server
        } catch (error) {
            console.error("Error cancelling booking", error);
            showToast('Erro ao cancelar. Revertendo...', 'error');
            onConfirm(); // Revert/Sync
        }
    };

    const handleRetention = () => {
        const blueSkyId = 'ceu_azul';
        const blueSkyPrice = 29.90; // Standard Price
        const discountedPrice = blueSkyPrice * 0.5; // 50% OFF

        const newServiceIds = [...booking.service_ids];
        if (!newServiceIds.includes(blueSkyId)) {
            newServiceIds.push(blueSkyId);
        }

        const newOverrides = {
            ...booking.servicePriceOverrides,
            [blueSkyId]: discountedPrice
        };

        updateBookingServicesAndPrice(booking.id, newServiceIds, actor, newOverrides);

        showToast('Ótima escolha! Adicionamos o Céu Azul ao seu pacote com 50% de desconto.', 'success');
        onConfirm(); // Refresh data
        onClose();
    };

    // Se o cliente selecionar CLIMA, mostramos essa tentativa de salvar o agendamento
    if (showRetentionOffer) {
        return (
            <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 animate-fade-in-fast" onClick={onClose}>
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
                    <div className="text-center mb-4">
                        <div className="bg-blue-100 dark:bg-blue-900/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3">
                            <span className="text-3xl">⛅</span>
                        </div>
                        <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Não perca a viagem!</h3>
                        <p className="text-slate-600 dark:text-slate-400 mt-2 text-sm">
                            O dia está feio? Não tem problema. Nós garantimos fotos lindas mesmo assim.
                        </p>
                    </div>

                    <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800 mb-6">
                        <h4 className="font-bold text-blue-800 dark:text-blue-200 text-sm mb-1">✨ Oferta Especial de Retenção</h4>
                        <p className="text-xs text-slate-600 dark:text-slate-300 mb-3">
                            Mantenha seu agendamento e ganhe <strong>50% de desconto</strong> na Edição de Céu Azul. Trocamos o cinza pelo azul digitalmente!
                        </p>
                        <button
                            onClick={handleRetention}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded-lg text-sm transition-colors shadow-sm"
                        >
                            Manter Agendamento + Céu Azul
                        </button>
                    </div>

                    <button
                        onClick={() => setShowRetentionOffer(false)} // Volta para a tela de confirmação do cancelamento
                        className="w-full text-slate-400 dark:text-slate-500 text-xs font-semibold hover:text-red-500 underline"
                    >
                        Ainda prefiro cancelar
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 animate-fade-in-fast" onClick={onClose}>
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6 w-full max-w-md flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>

                <div className="text-center mb-6">
                    <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Cancelar Agendamento</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Poxa, que pena! 😕 Qual o motivo do cancelamento?</p>
                </div>

                <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                    {CANCEL_REASONS.map(reason => (
                        <button
                            key={reason.id}
                            onClick={() => handleReasonSelect(reason.id)}
                            className={`w-full p-4 rounded-xl border-2 text-left transition-all duration-200 flex items-center gap-3 group
                                ${selectedReasonId === reason.id
                                    ? 'border-purple-600 dark:border-purple-500 bg-purple-50 dark:bg-purple-900/20 ring-1 ring-purple-200 dark:ring-purple-800'
                                    : 'border-slate-100 dark:border-slate-700 hover:border-purple-300 dark:hover:border-purple-500 hover:bg-slate-50 dark:hover:bg-slate-700'
                                } `}
                        >
                            <span className="text-2xl">{reason.icon}</span>
                            <span className={`font-semibold text-sm ${selectedReasonId === reason.id ? 'text-purple-900 dark:text-purple-200' : 'text-slate-600 dark:text-slate-300'} `}>
                                {reason.label}
                            </span>

                            {/* Radio Circle Indicator */}
                            <div className={`ml-auto w-5 h-5 rounded-full border-2 flex items-center justify-center
                                ${selectedReasonId === reason.id ? 'border-purple-600 dark:border-purple-500' : 'border-slate-300 dark:border-slate-600'} `}
                            >
                                {selectedReasonId === reason.id && <div className="w-2.5 h-2.5 bg-purple-600 dark:bg-purple-500 rounded-full" />}
                            </div>
                        </button>
                    ))}

                    {/* Caixa de texto condicional para "Outros" */}
                    {selectedReasonId === 'other' && (
                        <textarea
                            value={customReason}
                            onChange={e => setCustomReason(e.target.value)}
                            rows={3}
                            className="w-full p-3 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg focus:ring-purple-500 focus:border-purple-500 text-sm mt-2 animate-fade-in"
                            placeholder="Conte-nos mais detalhes..."
                            autoFocus
                        />
                    )}
                </div>

                <div className="mt-6 flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-700">
                    <button onClick={onClose} className="flex-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold py-2.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
                        Voltar
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={!selectedReasonId || (selectedReasonId === 'other' && !customReason.trim())}
                        className="flex-1 bg-red-500 text-white font-semibold py-2.5 rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed shadow-md transition-all"
                    >
                        Confirmar
                    </button>
                </div>
            </div>
        </div>
    );
};

export const RescheduleModal: React.FC<{ booking: Booking, onConfirm: () => void, onClose: () => void }> = ({ booking, onConfirm, onClose }) => {
    const [selectedDate, setSelectedDate] = useState(booking.date ? new Date(booking.date.replace(/-/g, '/')) : new Date());
    const [slots, setSlots] = useState<string[]>([]);
    const [selectedSlot, setSelectedSlot] = useState('');

    useEffect(() => {
        const fetchSlots = async () => {
            const dateString = selectedDate.toISOString().split('T')[0];
            const photographer = await getPhotographerById(booking.photographer_id);
            if (!photographer) {
                setSlots([]);
                return;
            }

            const allServices = await getServices();
            const getBookingDuration = (serviceIds: string[]): number => {
                return allServices
                    .filter(s => serviceIds.includes(s.id))
                    .reduce((total, s) => total + s.duration_minutes, 0);
            };

            const duration = getBookingDuration(booking.service_ids);
            const potentialSlots = await getDailySlotsForPhotographer(photographer.id, dateString);

            const freeSlots = potentialSlots.filter(slot =>
                isSlotFree(photographer, dateString, slot, duration, booking.id)
            );

            setSlots(freeSlots);
            setSelectedSlot('');
        };
        fetchSlots();
    }, [selectedDate, booking]);

    const handleConfirm = async () => {
        if (!selectedSlot) { alert('Por favor, selecione um novo horário.'); return; }
        const dateString = selectedDate.toISOString().split('T')[0];
        await rescheduleBooking(booking.id, dateString, selectedSlot);
        alert('Agendamento reagendado com sucesso!');
        onConfirm();
    };

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 animate-fade-in-fast" onClick={onClose}><div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6 sm:p-8 w-full max-w-lg" onClick={e => e.stopPropagation()}><h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Reagendar Sessão</h3><div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4"><Calendar selectedDate={selectedDate} onDateChange={setSelectedDate} /><div className="space-y-2"><h4 className="font-semibold text-slate-800 dark:text-slate-200">Horários disponíveis:</h4><div className="grid grid-cols-3 gap-2 max-h-60 overflow-y-auto">{slots.map(s => <button key={s} onClick={() => setSelectedSlot(s)} className={`p-2 rounded-md text-sm font-semibold ${selectedSlot === s ? 'bg-purple-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600'} `}>{s}</button>)}</div></div></div>
            <div className="mt-6 flex gap-3 justify-end"><button onClick={onClose} className="bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold py-2 px-4 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600">Cancelar</button><button onClick={handleConfirm} disabled={!selectedSlot} className="bg-purple-600 text-white font-semibold py-2 px-4 rounded-lg disabled:opacity-50">Confirmar Novo Horário</button></div></div></div>
    );
};

export const EditBookingModal: React.FC<{ booking: Booking, user: User, onConfirm: () => void, onClose: () => void }> = ({ booking, user, onConfirm, onClose }) => {
    const [formData, setFormData] = useState({
        client_id: booking.client_id,
        photographer_id: booking.photographer_id || '',
        date: booking.date || '',
        start_time: booking.start_time || '',
        address: booking.address,
        status: booking.status,
        unit_details: booking.unit_details || ''
    });
    const [clients, setClients] = useState<Client[]>([]);
    const [photographers, setPhotographers] = useState<Photographer[]>([]);

    useEffect(() => {
        const loadData = async () => {
            const [c, p] = await Promise.all([getClients(), getPhotographers()]);
            setClients(c);
            setPhotographers(p);
        };
        loadData();
    }, []);

    const handleSave = async () => {
        await updateBookingFull(booking.id, formData, user.role === 'admin' ? 'Admin' : 'Editor');
        alert('Agendamento atualizado!');
        onConfirm();
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 animate-fade-in-fast" onClick={onClose}>
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-4">Editar Agendamento Completo</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Client */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Cliente</label>
                        <select
                            value={formData.client_id}
                            onChange={e => setFormData({ ...formData, client_id: e.target.value })}
                            className="w-full p-2 border rounded dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                        >
                            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                    {/* Photographer */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Fotógrafo</label>
                        <select
                            value={formData.photographer_id}
                            onChange={e => setFormData({ ...formData, photographer_id: e.target.value })}
                            className="w-full p-2 border rounded dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                        >
                            <option value="">Sem fotógrafo</option>
                            {photographers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    </div>
                    {/* Date */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Data</label>
                        <input
                            type="date"
                            value={formData.date}
                            onChange={e => setFormData({ ...formData, date: e.target.value })}
                            className="w-full p-2 border rounded dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                        />
                    </div>
                    {/* Time */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Horário</label>
                        <input
                            type="time"
                            value={formData.start_time}
                            onChange={e => setFormData({ ...formData, start_time: e.target.value })}
                            className="w-full p-2 border rounded dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                        />
                    </div>
                    {/* Status */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Status</label>
                        <select
                            value={formData.status}
                            onChange={e => setFormData({ ...formData, status: e.target.value as BookingStatus })}
                            className="w-full p-2 border rounded dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                        >
                            {statusOptions.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                    {/* Address */}
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Endereço</label>
                        <input
                            type="text"
                            value={formData.address}
                            onChange={e => setFormData({ ...formData, address: e.target.value })}
                            className="w-full p-2 border rounded dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                        />
                    </div>
                    {/* Notes */}
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Detalhes / Observações</label>
                        <textarea
                            value={formData.unit_details}
                            onChange={e => setFormData({ ...formData, unit_details: e.target.value })}
                            className="w-full p-2 border rounded dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                            rows={3}
                        />
                    </div>
                </div>
                <div className="mt-6 flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 bg-slate-200 rounded hover:bg-slate-300 text-slate-800 font-semibold">Cancelar</button>
                    <button onClick={handleSave} className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 font-semibold">Salvar Alterações</button>
                </div>
            </div>
        </div>
    );
};

export const EditServicesModal: React.FC<{ booking: Booking, user: User, onConfirm: () => void, onClose: () => void }> = ({ booking, user, onConfirm, onClose }) => {
    const [selectedIds, setSelectedIds] = useState(booking.service_ids);
    const [currentPrices, setCurrentPrices] = useState<Record<string, string>>({});
    const [client, setClient] = useState<Client | undefined>(undefined);
    const [allServices, setAllServices] = useState<Service[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            const fetchedClient = await getClientById(booking.client_id);
            setClient(fetchedClient);
            const services = await getServices();
            setAllServices(services.filter(s => s.status === 'Ativo'));
        };
        fetchData();
    }, [booking.client_id]);

    const formatCurrency = (value: number | string) => {
        const num = Number(String(value).toString().replace(',', '.'));
        return isNaN(num) ? '0,00' : num.toFixed(2).replace('.', ',');
    };
    const parseCurrency = (value: string) => Number(value.replace('.', '').replace(',', '.'));

    useEffect(() => {
        if (!client) return;
        const initialPrices: Record<string, string> = {};
        allServices.forEach(s => {
            const price = booking.servicePriceOverrides?.[s.id] ?? client.customPrices[s.id] ?? s.price;
            initialPrices[s.id] = formatCurrency(price);
        });
        setCurrentPrices(initialPrices);
    }, [booking, client, allServices]);

    const { newTotalPrice, priceDifference } = useMemo(() => {
        if (!client) return { newTotalPrice: 0, priceDifference: 0 };
        const newPrice = allServices
            .filter(s => selectedIds.includes(s.id))
            .reduce((sum, service) => {
                const priceStr = currentPrices[service.id];
                return sum + (priceStr !== undefined ? parseCurrency(priceStr) : 0);
            }, 0);
        return { newTotalPrice: newPrice, priceDifference: newPrice - booking.total_price };
    }, [selectedIds, allServices, client, booking.total_price, currentPrices]);

    const handleSave = async () => {
        const numericOverrides: Record<string, number> = {};
        selectedIds.forEach(serviceId => {
            numericOverrides[serviceId] = parseCurrency(currentPrices[serviceId]);
        });

        // Logic now handled in service: updateBookingServicesAndPrice logs to Wallet
        await updateBookingServicesAndPrice(booking.id, selectedIds, user.role === 'admin' ? 'Admin' : 'Cliente', numericOverrides);
        alert('Serviços atualizados com sucesso!');
        onConfirm();
    };

    const isPrePaid = client?.paymentType === 'Pré-pago';
    const projectedBalance = isPrePaid ? (client.balance - priceDifference) : 0;

    if (!client) return null;

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 animate-fade-in-fast" onClick={onClose}>
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <header className="p-6 border-b border-slate-200 dark:border-slate-700"><h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Editar Serviços</h3></header>
                <div className="flex-1 overflow-y-auto p-6 space-y-3">
                    {allServices.filter(s => user.role === 'admin' || s.isVisibleToClient).map(s => {
                        const isSelected = selectedIds.includes(s.id);
                        return (
                            <div key={s.id} className={`p-4 border rounded-lg transition-colors ${isSelected ? 'bg-slate-50 dark:bg-slate-900/40 border-slate-300 dark:border-slate-600' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'} `}>
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={isSelected}
                                        onChange={() => setSelectedIds(p => p.includes(s.id) ? p.filter(id => id !== s.id) : [...p, s.id])}
                                        className="h-5 w-5 rounded border-gray-300 dark:border-slate-600 text-purple-600 focus:ring-purple-500 dark:bg-slate-700"
                                    />
                                    <span className="font-semibold text-slate-800 dark:text-slate-200">{s.name}</span>
                                </label>
                                {isSelected && (
                                    <div className="mt-3 pl-8 animate-fade-in-fast">
                                        <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Valor (R$)</label>
                                        <input
                                            type="text"
                                            value={currentPrices[s.id] || '0,00'}
                                            onChange={e => setCurrentPrices(prev => ({ ...prev, [s.id]: e.target.value.replace(/[^0-9,]/g, '') }))}
                                            onBlur={e => setCurrentPrices(prev => ({ ...prev, [s.id]: formatCurrency(e.target.value) }))}
                                            className="w-full max-w-[150px] p-2 border rounded-md text-sm mt-1 bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                                            disabled={user.role !== 'admin'}
                                        />
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>

                {/* FINANCIAL SUMMARY FOOTER */}
                <footer className="p-6 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 rounded-b-xl space-y-4">
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-600 dark:text-slate-400">Total Anterior:</span>
                        <span className="font-medium text-slate-800 dark:text-slate-200">R$ {booking.total_price.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm border-b border-slate-200 dark:border-slate-700 pb-2">
                        <span className="text-slate-600 dark:text-slate-400">Novo Total:</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">R$ {newTotalPrice.toFixed(2)}</span>
                    </div>

                    {isPrePaid ? (
                        <div className="bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Impacto na Carteira</span>
                                <span className={`font-bold ${priceDifference > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'} `}>
                                    {priceDifference > 0 ? '-' : '+'} R$ {Math.abs(priceDifference).toFixed(2)}
                                </span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-xs text-slate-500 dark:text-slate-400">Saldo Projetado:</span>
                                <span className={`font-bold text-sm ${projectedBalance < 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-800 dark:text-slate-200'} `}>
                                    R$ {projectedBalance.toFixed(2)}
                                </span>
                            </div>
                            {projectedBalance < 0 && (
                                <p className="text-[10px] text-red-500 dark:text-red-400 mt-1 font-medium">
                                    Atenção: Seu saldo ficará negativo. Será necessário adicionar fundos em breve.
                                </p>
                            )}
                        </div>
                    ) : (
                        <div className="flex justify-between items-center">
                            <span className="font-bold text-slate-800 dark:text-slate-200">Diferença:</span>
                            <span className={`font-bold ${priceDifference > 0 ? 'text-purple-600 dark:text-purple-400' : 'text-green-600 dark:text-green-400'} `}>
                                {priceDifference > 0 ? '+' : ''} R$ {priceDifference.toFixed(2)}
                            </span>
                        </div>
                    )}

                    <div className="flex gap-3 items-center justify-end pt-2">
                        <button onClick={onClose} className="bg-white dark:bg-slate-800 py-2 px-4 border border-slate-300 dark:border-slate-600 rounded-lg text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700">Cancelar</button>
                        <button onClick={handleSave} className="font-semibold text-white bg-purple-600 px-5 py-2.5 rounded-lg shadow-md hover:bg-purple-700 transition-shadow">
                            {isPrePaid && priceDifference > 0 ? 'Atualizar e Debitar' : 'Salvar Alterações'}
                        </button>
                    </div>
                </footer>
            </div>
        </div>
    );
}




// --- DATE RANGE PICKER COMPONENT ---
const DateRangePicker: React.FC<{
    startDate: string;
    endDate: string;
    onChange: (start: string, end: string) => void;
}> = ({ startDate, endDate, onChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Parse strings to Date objects or null
    const start = startDate ? new Date(startDate + 'T00:00:00') : null;
    const end = endDate ? new Date(endDate + 'T00:00:00') : null;

    // Click outside to close
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleDateSelect = (date: Date) => {
        const dateStr = date.toISOString().split('T')[0];

        // Logic: 
        // 1. If no start, set start.
        // 2. If start exists but no end, set end. Ensure end > start.
        // 3. If both exist, reset and start new range.

        if (!startDate || (startDate && endDate)) {
            onChange(dateStr, '');
        } else {
            // We have start, setting end
            if (date < (start || new Date())) {
                // If new date is before start, swap them or just reset start
                onChange(dateStr, '');
            } else {
                onChange(startDate, dateStr);
                setIsOpen(false); // Auto close on range complete
            }
        }
    };

    const setPreset = (days: number) => {
        const s = new Date();
        const e = new Date();
        e.setDate(s.getDate() + days);
        onChange(s.toISOString().split('T')[0], e.toISOString().split('T')[0]);
        setIsOpen(false);
    };

    const setToday = () => {
        const s = new Date().toISOString().split('T')[0];
        onChange(s, s);
        setIsOpen(false);
    };

    const setTomorrow = () => {
        const d = new Date();
        d.setDate(d.getDate() + 1);
        const s = d.toISOString().split('T')[0];
        onChange(s, s);
        setIsOpen(false);
    };

    const setThisMonth = () => {
        const now = new Date();
        const s = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        const e = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
        onChange(s, e);
        setIsOpen(false);
    };

    const clear = () => {
        onChange('', '');
        setIsOpen(false);
    };

    const displayValue = startDate
        ? `${new Date(startDate + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} ${endDate ? ` - ${new Date(endDate + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}` : ''} `
        : 'Filtrar por Data';

    return (
        <div className="relative" ref={containerRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full md:w-auto flex items-center gap-2 bg-white dark:bg-slate-800 border ${isOpen ? 'border-purple-500 ring-1 ring-purple-200 dark:ring-purple-800' : 'border-slate-300 dark:border-slate-600'} text-slate-700 dark:text-slate-200 px-4 py-2 rounded-lg shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-all text-sm font-medium min-w-[200px] justify-between`}
            >
                <div className="flex items-center gap-2">
                    <CalendarIcon className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                    <span>{displayValue}</span>
                </div>
                <ChevronDownIcon className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''} `} />
            </button>

            {isOpen && (
                <div className="absolute top-full mt-2 left-0 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 z-50 p-4 w-80 sm:w-96 animate-fade-in-fast">
                    <div className="grid grid-cols-2 gap-2 mb-4">
                        <button onClick={setToday} className="text-xs font-semibold bg-slate-100 dark:bg-slate-700 dark:text-slate-200 hover:bg-purple-100 dark:hover:bg-purple-900/40 hover:text-purple-700 dark:hover:text-purple-300 py-1.5 rounded transition-colors">Hoje</button>
                        <button onClick={setTomorrow} className="text-xs font-semibold bg-slate-100 dark:bg-slate-700 dark:text-slate-200 hover:bg-purple-100 dark:hover:bg-purple-900/40 hover:text-purple-700 dark:hover:text-purple-300 py-1.5 rounded transition-colors">Amanhã</button>
                        <button onClick={() => setPreset(7)} className="text-xs font-semibold bg-slate-100 dark:bg-slate-700 dark:text-slate-200 hover:bg-purple-100 dark:hover:bg-purple-900/40 hover:text-purple-700 dark:hover:text-purple-300 py-1.5 rounded transition-colors">Esta Semana</button>
                        <button onClick={setThisMonth} className="text-xs font-semibold bg-slate-100 dark:bg-slate-700 dark:text-slate-200 hover:bg-purple-100 dark:hover:bg-purple-900/40 hover:text-purple-700 dark:hover:text-purple-300 py-1.5 rounded transition-colors">Este Mês</button>
                    </div>

                    <div className="border-t border-slate-100 dark:border-slate-700 pt-4">
                        <Calendar
                            onDateChange={handleDateSelect}
                            startDate={start}
                            endDate={end}
                            selectedDate={null} // Disable single select highlight in favor of range props
                        />
                    </div>

                    <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center">
                        <button onClick={clear} className="text-xs text-red-500 hover:text-red-700 font-semibold">Limpar Filtro</button>
                        <button onClick={() => setIsOpen(false)} className="text-xs bg-slate-800 dark:bg-slate-700 text-white px-3 py-1.5 rounded font-bold hover:bg-slate-700 dark:hover:bg-slate-600">Fechar</button>
                    </div>
                </div>
            )}
        </div>
    );
};


// --- MAIN COMPONENT ---

interface AppointmentsPageProps {
    user: User;
    onViewDetails: (bookingId: string) => void;
}

const AppointmentsPage: React.FC<AppointmentsPageProps> = ({ user, onViewDetails }) => {
    const [allBookings, setAllBookings] = useState<Booking[]>([]);
    const [filteredBookings, setFilteredBookings] = useState<Booking[]>([]);
    const [photographers, setPhotographers] = useState<Photographer[]>([]);
    const [allServices, setAllServices] = useState<Service[]>([]);

    // Modals state
    const [cancellingBooking, setCancellingBooking] = useState<Booking | null>(null);
    const [reschedulingBooking, setReschedulingBooking] = useState<Booking | null>(null);
    const [editingServicesBooking, setEditingServicesBooking] = useState<Booking | null>(null);
    const [editingBooking, setEditingBooking] = useState<Booking | null>(null);


    // Filter input states
    const [provider, setProvider] = useState('all');
    const [appointmentStatus, setAppointmentStatus] = useState<BookingStatus | 'all'>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    const [isLoading, setIsLoading] = useState(true);

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const PAGE_SIZE = 50;

    const refreshBookings = async (silent = false) => {
        if (!silent) setIsLoading(true);

        try {
            let result;

            // Prepare Filters
            const filters: any = {
                status: appointmentStatus,
                startDate: startDate || undefined,
                endDate: endDate || undefined,
                searchQuery: searchQuery || undefined
            };

            if (user.role === 'admin' || user.role === 'editor') {
                filters.photographerId = provider;
            } else if (user.role === 'photographer') {
                filters.photographerId = user.id;
            } else if (user.role === 'broker') {
                filters.clientId = user.clientId;
                // Check permissions: if cannot view all, restrict to own bookings
                if (!user.permissions?.canViewAllBookings) {
                    filters.brokerId = user.id;
                }
            } else { // client
                filters.clientId = user.id;
            }

            const { data, count } = await getBookingsPaginated(currentPage, PAGE_SIZE, filters);

            setAllBookings(data); // In paginated view, allBookings is just the current page
            setTotalCount(count);
            setTotalPages(Math.ceil(count / PAGE_SIZE));

        } catch (error) {
            console.error("Error refreshing bookings:", error);
        } finally {
            if (!silent) setIsLoading(false);
        }
    };

    // Effect to refresh when page or filters change
    useEffect(() => {
        refreshBookings();
    }, [currentPage, provider, appointmentStatus, startDate, endDate, searchQuery, user]); // Add dependencies to auto-refresh

    const [clientsMap, setClientsMap] = useState<Record<string, Client>>({});

    useEffect(() => {
        refreshBookings();
        if (user.role === 'admin' || user.role === 'editor') {
            getPhotographers().then(data => setPhotographers(data.filter(p => p.isActive)));
            getClients().then(clients => {
                const map = clients.reduce((acc, c) => ({ ...acc, [c.id]: c }), {} as Record<string, Client>);
                setClientsMap(map);
            });
        }
    }, [user]);

    useEffect(() => {
        const fetchServices = async () => {
            const services = await getServices();
            setAllServices(services);
        };
        fetchServices();
    }, []);

    // Optimistic Update Handler
    const handleOptimisticUpdate = (bookingId: string, newStatus: BookingStatus) => {
        setAllBookings(prev => prev.map(b =>
            b.id === bookingId ? { ...b, status: newStatus } : b
        ));
    };

    // Simplified Effect: Since server handles filtering, we just pass data to view
    useEffect(() => {
        setFilteredBookings(allBookings);
    }, [allBookings]);

    // Helper to get service names
    const getServiceNames = (ids: string[]) => {
        return ids.map(id => allServices.find(s => s.id === id)?.name).filter(Boolean).join(', ');
    };

    // Helper to get photographer name
    const getPhotographerName = (booking: Booking) => {
        if (booking.photographer_name && booking.photographer_name !== 'Desconhecido') {
            return booking.photographer_name;
        }
        if (!booking.photographer_id) return 'Não atribuído';
        return photographers.find(p => p.id === booking.photographer_id)?.name || 'Desconhecido';
    };

    const isFutureBooking = (booking: Booking) => {
        if (!booking.date) return false;
        return new Date() < new Date(`${booking.date}T${booking.start_time} `);
    };

    const ActionButtons: React.FC<{ booking: Booking }> = ({ booking }) => {
        // Admin and Editor get full controls
        if (user.role === 'admin' || user.role === 'editor') {
            return <div className="flex items-center justify-end gap-2 flex-wrap">
                {booking.status === 'Realizado' && (
                    <button onClick={async () => {
                        if (window.confirm('ATENÇÃO: Confirmar entrega do material? O status mudará para Concluído e o cliente será notificado.')) {
                            await uploadMaterialForBooking(booking.id, []);
                            alert('Material entregue e notificação enviada!');
                            refreshBookings();
                        }
                    }} className="text-xs font-semibold text-green-600 bg-green-100 hover:bg-green-200 px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 border border-green-200"><UploadIcon className="w-4 h-4" />Entregar Material</button>
                )}
                <button onClick={() => onViewDetails(booking.id)} className="text-xs font-semibold text-purple-600 bg-purple-100 hover:bg-purple-200 px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 border border-purple-200">Ver Detalhes</button>

                {booking.status !== 'Cancelado' && booking.status !== 'Realizado' && booking.status !== 'Concluído' && (
                    <>
                        <button onClick={() => setEditingBooking(booking)} className="text-xs font-semibold text-slate-600 bg-white hover:bg-slate-100 px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 border border-slate-200"><EditIcon className="w-4 h-4" />Editar</button>
                        <button onClick={() => setEditingServicesBooking(booking)} className="text-xs font-semibold text-slate-600 bg-white hover:bg-slate-100 px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 border border-slate-200"><EditIcon className="w-4 h-4" />Serviços</button>
                        <button onClick={() => setReschedulingBooking(booking)} className="text-xs font-semibold text-slate-600 bg-white hover:bg-slate-100 px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 border border-slate-200"><RefreshCwIcon className="w-4 h-4" />Reagendar</button>
                        <button onClick={() => setCancellingBooking(booking)} className="text-xs font-semibold text-red-600 bg-white hover:bg-red-50 px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 border border-red-200"><XCircleIcon className="w-4 h-4" />Cancelar</button>
                    </>
                )}
            </div >
        }
        // Client and Broker get actions on future bookings
        if ((user.role === 'client' || user.role === 'broker') && isFutureBooking(booking) && (booking.status === 'Confirmado' || booking.status === 'Pendente')) {
            return <div className="flex items-center justify-end gap-2 flex-wrap">
                <button onClick={() => onViewDetails(booking.id)} className="text-xs font-semibold text-purple-600 bg-purple-100 hover:bg-purple-200 px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 border border-purple-200">Ver Detalhes</button>
                <button onClick={() => setEditingServicesBooking(booking)} className="text-xs font-semibold text-slate-600 bg-white hover:bg-slate-100 px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 border border-slate-200"><EditIcon className="w-4 h-4" />Serviços</button>
                <button onClick={() => setReschedulingBooking(booking)} className="text-xs font-semibold text-slate-600 bg-white hover:bg-slate-100 px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 border border-slate-200"><RefreshCwIcon className="w-4 h-4" />Reagendar</button>
                <button onClick={() => setCancellingBooking(booking)} className="text-xs font-semibold text-red-600 bg-white hover:bg-red-50 px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 border border-red-200"><XCircleIcon className="w-4 h-4" />Cancelar</button>
            </div>
        }
        // Fallback for photographer and client/broker on past bookings is just "View Details"
        return <button onClick={() => onViewDetails(booking.id)} className="text-xs font-semibold text-slate-600 bg-white hover:bg-slate-100 px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 border border-slate-200">Ver Detalhes</button>
    }

    const handleExport = () => {
        const headers = ['Data', 'Horário', 'Cliente', 'Endereço', 'Fotógrafo', 'Corretor', 'Serviços', 'Valor', 'Status', 'Link Sistema', 'Link Dropbox'];

        const csvContent = [
            headers.join(','),
            ...filteredBookings.map(b => {
                const date = b.date ? new Date(b.date).toLocaleDateString('pt-BR') : 'N/A';
                const time = b.start_time || 'N/A';
                const client = `"${b.client_name || ''}"`;
                const address = `"${b.address || ''}"`;
                const photographer = `"${getPhotographerName(b)}"`;
                const broker = `"${b.accompanying_broker_name || ''}"`;
                const services = `"${getServiceNames(b.service_ids)}"`;
                const price = b.total_price.toFixed(2).replace('.', ',');
                const status = b.status;
                const link = `${window.location.origin}/appointments/${b.id}`;
                const dropbox = b.dropboxFolderLink || '';

                return [date, time, client, address, photographer, broker, services, price, status, link, dropbox].join(',');
            })
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `agendamentos_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="space-y-8 animate-fade-in">
            {cancellingBooking && <CancelModal booking={cancellingBooking} user={user} onClose={() => setCancellingBooking(null)} onConfirm={() => refreshBookings(true)} onOptimisticUpdate={handleOptimisticUpdate} />}
            {reschedulingBooking && <RescheduleModal booking={reschedulingBooking} onClose={() => setReschedulingBooking(null)} onConfirm={() => refreshBookings(true)} />}
            {editingServicesBooking && <EditServicesModal booking={editingServicesBooking} user={user} onClose={() => setEditingServicesBooking(null)} onConfirm={() => refreshBookings(true)} />}
            {editingBooking && <EditBookingModal booking={editingBooking} user={user} onClose={() => setEditingBooking(null)} onConfirm={() => refreshBookings(true)} />}

            <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Meus Agendamentos</h2>
                    {user.role === 'broker' && (
                        <span className={`text-xs font-bold px-2 py-1 rounded-full border ${user.permissions?.canViewAllBookings
                            ? 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800'
                            : 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800'
                            }`}>
                            {user.permissions?.canViewAllBookings ? 'Visão Geral (Imobiliária)' : 'Meus Agendamentos'}
                        </span>
                    )}
                </div>
                <button onClick={handleExport} className="flex items-center gap-2 text-sm font-semibold text-slate-600 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 px-4 py-2 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 transition-all">
                    <DownloadIcon className="w-4 h-4" />
                    Exportar Relatório
                </button>
            </div>

            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                    <div className={(user.role === 'admin' || user.role === 'editor') ? '' : 'md:col-span-2'}>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Buscar</label>
                        <div className="relative">
                            <input type="search" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Busca por cliente ou endereço..." className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg shadow-sm focus:ring-purple-500 focus:border-purple-500 transition-colors pl-10" />
                            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 dark:text-slate-500" />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Status</label>
                        <div className="relative">
                            <select value={appointmentStatus} onChange={e => setAppointmentStatus(e.target.value as any)} className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg shadow-sm focus:ring-purple-500 focus:border-purple-500 transition-colors appearance-none">
                                <option value="all">Todos</option>
                                {statusOptions.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                            <FilterIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500 pointer-events-none" />
                        </div>
                    </div>

                    {(user.role === 'admin' || user.role === 'editor') && (
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Prestador(a)</label>
                            <select value={provider} onChange={e => setProvider(e.target.value)} className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg shadow-sm focus:ring-purple-500 focus:border-purple-500 transition-colors">
                                <option value="all">Todos</option>
                                {photographers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                        </div>
                    )}

                    {/* Date Range Picker Component */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Período</label>
                        <DateRangePicker
                            startDate={startDate}
                            endDate={endDate}
                            onChange={(start, end) => { setStartDate(start); setEndDate(end); }}
                        />
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                {isLoading ? (
                    // SKELETON LOADING STATE
                    Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="bg-white dark:bg-slate-800 p-5 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
                            <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4">
                                <div className="flex items-center gap-4 w-full">
                                    <Skeleton variant="circular" width={48} height={48} />
                                    <div className="flex-1 space-y-2">
                                        <Skeleton width="60%" height={24} />
                                        <Skeleton width="40%" height={16} />
                                    </div>
                                </div>
                                <div className="flex flex-col sm:items-end gap-2 w-full sm:w-auto">
                                    <Skeleton width={100} height={32} />
                                    <div className="flex gap-2">
                                        <Skeleton width={80} height={32} />
                                        <Skeleton width={80} height={32} />
                                    </div>
                                </div>
                            </div>
                            <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Skeleton width="80%" height={20} />
                                <Skeleton width="80%" height={20} />
                                <Skeleton width="100%" height={20} className="md:col-span-2" />
                            </div>
                        </div>
                    ))
                ) : (
                    filteredBookings.length > 0 ? filteredBookings.map(booking => {
                        const bookingDate = booking.date ? new Date(booking.date.replace(/-/g, '/')) : null;
                        const displayPrice = user.role === 'photographer'
                            ? getPhotographerPayoutForBooking(booking)
                            : (booking.total_price + (booking.tipAmount || 0));
                        const client = clientsMap[booking.client_id];

                        return (
                            <div key={booking.id} className="bg-white dark:bg-slate-800 rounded-xl shadow-sm hover:shadow-md transition-shadow border border-slate-200 dark:border-slate-700 overflow-hidden animate-fade-in group">
                                {/* Header: Date & Status */}
                                <div className="bg-slate-50 dark:bg-slate-900/50 px-6 py-3 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                                    <div className="flex items-center gap-3">
                                        <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-semibold">
                                            <CalendarIcon className="w-4 h-4 text-purple-500" />
                                            <span>{bookingDate ? bookingDate.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'long' }) : 'Data a definir'}</span>
                                        </div>
                                        <div className="h-4 w-px bg-slate-300 dark:bg-slate-600 mx-1"></div>
                                        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 text-sm">
                                            <ClockIcon className="w-4 h-4" />
                                            <span>{booking.start_time ? `${booking.start_time} - ${booking.end_time}` : 'Horário a definir'}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500">#{booking.legacy_id ? booking.legacy_id : booking.id.slice(0, 6)}</span>
                                        <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${statusStyles[booking.status]} `}>{booking.status}</span>
                                    </div>
                                </div>

                                <div className="p-6">
                                    <div className="flex flex-col md:flex-row justify-between gap-6">
                                        {/* Main Info */}
                                        <div className="flex-1 space-y-4">
                                            <div>
                                                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                                                    {booking.client_name}
                                                    {/* Payment Indicator */}
                                                    {(user.role === 'admin' || user.role === 'photographer') && client && (
                                                        client.paymentType === 'Pré-pago' ? (
                                                            <span className="text-[10px] bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200 px-1.5 py-0.5 rounded-full border border-green-200 dark:border-green-800 font-bold" title="Pré-pago">$</span>
                                                        ) : (
                                                            <span className="text-[10px] bg-amber-100 dark:bg-amber-900/20 text-amber-800 dark:text-amber-200 px-1.5 py-0.5 rounded-full border border-amber-200 dark:border-amber-800 font-bold" title="Pós-pago">🕒</span>
                                                        )
                                                    )}
                                                </h3>
                                                <div className="flex items-start gap-2 mt-1 text-slate-600 dark:text-slate-400 text-sm">
                                                    <MapPinIcon className="w-4 h-4 mt-0.5 flex-shrink-0 text-slate-400" />
                                                    <span>{booking.address}</span>
                                                </div>
                                            </div>

                                            {/* Services & Photographer */}
                                            <div className="flex flex-wrap gap-4 items-center pt-2">
                                                <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-700/50 px-3 py-1.5 rounded-lg border border-slate-100 dark:border-slate-600">
                                                    <CameraIcon className="w-4 h-4 text-purple-500" />
                                                    <span className="font-medium">Profissional:</span>
                                                    <span>{getPhotographerName(booking)}</span>
                                                </div>

                                                <div className="flex flex-wrap gap-2">
                                                    {booking.service_ids.map(sid => {
                                                        const sName = allServices.find(s => s.id === sid)?.name;
                                                        if (!sName) return null;
                                                        return (
                                                            <span key={sid} className="text-xs font-medium text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-900/20 px-2 py-1 rounded border border-purple-100 dark:border-purple-800">
                                                                {sName}
                                                            </span>
                                                        )
                                                    })}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Price & Actions */}
                                        <div className="flex flex-col justify-between items-end gap-4 min-w-[200px]">
                                            <div className="text-right">
                                                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Valor Total</p>
                                                <p className="text-2xl font-bold gradient-text">R$ {displayPrice.toFixed(2)}</p>
                                            </div>
                                            <ActionButtons booking={booking} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    }) : (
                        <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
                            <p className="text-slate-500 dark:text-slate-400">Nenhum agendamento encontrado com os filtros atuais.</p>
                        </div>
                    )
                )}
            </div>

            {/* Pagination Controls */}
            {totalCount > 0 && (
                <div className="flex justify-between items-center mt-6 pb-8">
                    <span className="text-sm text-slate-500 dark:text-slate-400">
                        Mostrando página <span className="font-bold text-slate-700 dark:text-slate-200">{currentPage}</span> de <span className="font-bold text-slate-700 dark:text-slate-200">{totalPages}</span> ({totalCount} resultados)
                    </span>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-slate-800 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors"
                        >
                            Anterior
                        </button>
                        <button
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-slate-800 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors"
                        >
                            Próxima
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AppointmentsPage;
