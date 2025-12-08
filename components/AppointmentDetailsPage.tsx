
import React, { useState, useEffect, DragEvent, useMemo, useRef } from 'react';
import {
    getBookingById, getServiceById, getPhotographerById, updateBookingStatus,
    completeBooking, getCommonAreas, uploadMaterialForBooking, getBrokerById,
    getPhotographerPayoutForBooking, generateMarketingDescription, getServices,
    getContextualUpsells, addTipToBooking, updateKeyStatus, updateBookingObservations,
    linkBookingToDropbox, getBookingPhotos, getClientById
} from '../services/bookingService';
import { sendBookingConfirmation, sendRescheduleNotification, sendPhotographerEnRoute, sendMaterialReady } from '../services/whatsappService';
import { Booking, Service, Photographer, CommonArea, Broker, DriveFile, Client } from '../types';
import {
    ArrowLeftIcon, CalendarIcon, ClockIcon, MapPinIcon, CameraIcon, UserIcon,
    DollarSignIcon, HistoryIcon, XCircleIcon, AlertTriangleIcon, CheckCircleIcon, UploadCloudIcon,
    FileIcon, PhoneIcon, ImageIcon, EditIcon, RefreshCwIcon, SparklesIcon, TrendingUpIcon, FileTextIcon, ShieldIcon, ArrowUpRightIcon, MessageSquareIcon, PlusIcon, LoaderIcon, TicketIcon, MessageCircleIcon, NavigationIcon, KeyIcon, BuildingIcon, DownloadIcon, SearchIcon, XIcon, FolderIcon
} from './icons';
import { User } from '../App';
import { RescheduleModal, EditServicesModal, CancelModal } from './AppointmentsPage';
import ReportFailureModal from './ReportFailureModal';
import Skeleton from './Skeleton';


interface AppointmentDetailsPageProps {
    bookingId: string;
    onBack: () => void;
    user: User;
    onNavigate?: (page: any, mode?: string) => void; // Optional for Admin views
}

const statusStyles: Record<Booking['status'], string> = {
    Confirmado: "bg-green-100 text-green-800 border-green-200",
    Cancelado: "bg-red-100 text-red-800 border-red-200",
    Pendente: "bg-yellow-100 text-yellow-800 border-yellow-200",
    Realizado: "bg-blue-100 text-blue-800 border-blue-200",
    Concluído: "bg-purple-100 text-purple-800 border-purple-200",
    Rascunho: "bg-gray-100 text-gray-800 border-gray-200",
};

// --- MODALS ---

const EditObservationsModal: React.FC<{ currentNotes: string; onClose: () => void; onSave: (notes: string) => void }> = ({ currentNotes, onClose, onSave }) => {
    const [notes, setNotes] = useState(currentNotes);

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-fade-in-fast p-4" onClick={onClose}>
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6 w-full max-w-lg" onClick={e => e.stopPropagation()}>
                <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-4">Editar Observações</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Adicione detalhes como bloco, apartamento, instruções de acesso ou cuidados especiais.</p>

                <textarea
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    rows={5}
                    className="w-full p-3 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg focus:ring-purple-500 focus:border-purple-500 text-sm"
                    placeholder="Ex: Chave na portaria. Cuidado com o cachorro. Bloco A, Apto 402."
                    autoFocus
                />

                <div className="mt-6 flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 text-sm font-semibold">Cancelar</button>
                    <button
                        onClick={() => onSave(notes)}
                        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-bold shadow-sm"
                    >
                        Salvar Alterações
                    </button>
                </div>
            </div>
        </div>
    );
};

const TipModal: React.FC<{ onClose: () => void; onConfirm: (amount: number) => void; }> = ({ onClose, onConfirm }) => {
    const [amount, setAmount] = useState<number | ''>('');
    const [loading, setLoading] = useState(false);

    const handlePreset = (val: number) => {
        setAmount(val);
    }

    const handleSubmit = async () => {
        if (!amount || Number(amount) <= 0) return;
        setLoading(true);
        // Simulate network delay for UX feedback
        await new Promise(resolve => setTimeout(resolve, 800));
        onConfirm(Number(amount));
        setLoading(false);
    };

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-fade-in-fast p-4" onClick={onClose}>
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
                <div className="text-center mb-6">
                    <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400 rounded-full flex items-center justify-center mx-auto mb-3">
                        <DollarSignIcon className="w-6 h-6" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Gostou do serviço?</h3>
                    <p className="text-slate-500 dark:text-slate-400 text-sm">Envie uma gorjeta para o fotógrafo.</p>
                </div>

                <div className="grid grid-cols-3 gap-3 mb-4">
                    {[5, 10, 20].map(val => (
                        <button
                            key={val}
                            onClick={() => handlePreset(val)}
                            className={`py-2 rounded-lg font-bold border transition-all ${amount === val ? 'bg-yellow-100 dark:bg-yellow-900/20 border-yellow-400 text-yellow-700 dark:text-yellow-400 ring-2 ring-yellow-200 dark:ring-yellow-800' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                        >
                            R$ {val}
                        </button>
                    ))}
                </div>

                <div className="relative mb-6">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 text-sm font-bold">R$</span>
                    <input
                        type="number"
                        placeholder="Outro valor"
                        value={amount}
                        onChange={e => setAmount(Number(e.target.value))}
                        className="w-full pl-8 p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg focus:ring-yellow-400 focus:border-yellow-400 outline-none"
                    />
                </div>

                <button
                    onClick={handleSubmit}
                    disabled={loading || !amount || Number(amount) <= 0}
                    className="w-full bg-yellow-400 hover:bg-yellow-500 text-yellow-900 font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? <LoaderIcon className="w-5 h-5 animate-spin" /> : <CheckCircleIcon className="w-5 h-5" />}
                    {loading ? 'Enviando...' : 'Enviar Gorjeta'}
                </button>

                <button onClick={onClose} disabled={loading} className="w-full mt-3 text-slate-500 dark:text-slate-400 text-sm font-semibold hover:underline">
                    Cancelar
                </button>
            </div>
        </div>
    )
}

const CompleteBookingModal: React.FC<{ commonAreas: CommonArea[]; onClose: () => void; onConfirm: (notes: string, commonAreaId?: string) => void; }> = ({ commonAreas, onClose, onConfirm }) => {
    const [notes, setNotes] = useState('');
    const [selectedAreaId, setSelectedAreaId] = useState<string>('');
    const [searchQuery, setSearchQuery] = useState('');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false); // New state
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Click outside to close dropdown
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const filteredAreas = useMemo(() => {
        if (!searchQuery) return commonAreas.slice(0, 10);
        const lower = searchQuery.toLowerCase();
        return commonAreas.filter(a =>
            a.name.toLowerCase().includes(lower) ||
            a.fullAddress.toLowerCase().includes(lower)
        ).slice(0, 15); // Limit to 15 results for performance
    }, [commonAreas, searchQuery]);

    const handleSelectArea = (area: CommonArea) => {
        setSelectedAreaId(area.id);
        setSearchQuery(area.fullAddress);
        setIsDropdownOpen(false);
    };

    const handleClearArea = () => {
        setSelectedAreaId('');
        setSearchQuery('');
    };

    const handleConfirm = () => {
        setIsSubmitting(true);
        onConfirm(notes, selectedAreaId || undefined);
        // Modal will be closed by parent after processing
    }

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-fade-in-fast p-4" onClick={onClose}>
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6 sm:p-8 w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                <div className="text-center">
                    <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900/20">
                        <CheckCircleIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <h3 className="mt-4 text-xl font-bold text-slate-800 dark:text-slate-100">Finalizar Sessão</h3>
                    <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Adicione observações internas e, se aplicável, vincule a uma área comum para entrega automática.</p>
                </div>

                <div className="mt-6 space-y-4">
                    <div>
                        <label htmlFor="complete-notes" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Observações Internas (Privado)</label>
                        <textarea id="complete-notes" rows={4} className="w-full p-3 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg focus:ring-purple-500 focus:border-purple-500 text-sm" placeholder="Ex: O cliente pediu foco na piscina. A luz da sala estava ruim..." value={notes} onChange={(e) => setNotes(e.target.value)} />
                    </div>

                    <div className="relative" ref={dropdownRef}>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Vincular à Área Comum (Opcional)</label>
                        <div className="relative">
                            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 dark:text-slate-500 pointer-events-none" />
                            <input
                                type="text"
                                className={`w-full pl-10 pr-10 p-3 border rounded-lg text-sm focus:ring-purple-500 focus:border-purple-500 transition-colors ${selectedAreaId ? 'border-green-500 dark:border-green-400 bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200 font-medium' : 'border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white'}`}
                                placeholder="Buscar área comum..."
                                value={searchQuery}
                                onChange={(e) => {
                                    setSearchQuery(e.target.value);
                                    setIsDropdownOpen(true);
                                    if (!e.target.value) setSelectedAreaId('');
                                }}
                                onFocus={() => setIsDropdownOpen(true)}
                            />
                            {searchQuery && (
                                <button
                                    onClick={handleClearArea}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 hover:text-red-500"
                                >
                                    <XCircleIcon className="w-5 h-5" />
                                </button>
                            )}
                        </div>

                        {isDropdownOpen && filteredAreas.length > 0 && (
                            <ul className="absolute z-20 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl max-h-60 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700">
                                {filteredAreas.map(area => (
                                    <li
                                        key={area.id}
                                        onClick={() => handleSelectArea(area)}
                                        className="p-3 hover:bg-purple-50 dark:hover:bg-purple-900/20 cursor-pointer transition-colors"
                                    >
                                        <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{area.name}</p>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{area.fullAddress}</p>
                                    </li>
                                ))}
                            </ul>
                        )}

                        {isDropdownOpen && searchQuery && filteredAreas.length === 0 && (
                            <div className="absolute z-20 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg p-4 text-center text-sm text-slate-500 dark:text-slate-400">
                                Nenhuma área comum encontrada.
                            </div>
                        )}
                    </div>
                </div>

                <div className="mt-8 flex flex-col sm:flex-row-reverse gap-3">
                    <button
                        type="button"
                        className="w-full inline-flex justify-center gap-2 rounded-lg border border-transparent shadow-sm px-4 py-2.5 bg-blue-600 text-base font-bold text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-all"
                        onClick={handleConfirm}
                        disabled={!notes.trim() || isSubmitting}
                    >
                        {isSubmitting ? <LoaderIcon className="w-5 h-5 animate-spin" /> : null}
                        {isSubmitting ? 'Finalizando...' : 'Confirmar Realização'}
                    </button>
                    <button
                        type="button"
                        className="w-full inline-flex justify-center rounded-lg border border-slate-300 dark:border-slate-600 shadow-sm px-4 py-2.5 bg-white dark:bg-slate-700 text-base font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors"
                        onClick={onClose}
                        disabled={isSubmitting}
                    >
                        Cancelar
                    </button>
                </div>
            </div>
        </div>
    );
};



const DescriptionModal: React.FC<{ text: string; onClose: () => void; }> = ({ text, onClose }) => (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-fade-in-fast p-4" onClick={onClose}>
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6 sm:p-8 w-full max-w-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-2">
                    <SparklesIcon className="w-6 h-6 text-purple-500" />
                    <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Descrição Gerada pela IA</h3>
                </div>
                <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700"><XCircleIcon className="w-6 h-6 text-slate-400 dark:text-slate-500" /></button>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg max-h-[60vh] overflow-y-auto">
                <div className="prose prose-sm prose-purple dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: text.replace(/\n/g, '<br />').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
            </div>
            <div className="mt-6 flex justify-end gap-3">
                <button onClick={onClose} className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700">Fechar</button>
                <button onClick={() => { navigator.clipboard.writeText(text); alert('Texto copiado!'); }} className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-semibold">Copiar Texto</button>
            </div>
        </div>
    </div>
);

// --- MAIN COMPONENT ---

const AppointmentDetailsPage: React.FC<AppointmentDetailsPageProps> = ({ bookingId, onBack, user, onNavigate }) => {
    const [booking, setBooking] = useState<Booking | null>(null);
    const [services, setServices] = useState<Service[]>([]);
    const [photographer, setPhotographer] = useState<Photographer | null>(null);
    const [broker, setBroker] = useState<Broker | null>(null);
    const [commonAreas, setCommonAreas] = useState<CommonArea[]>([]);
    const [linkedCommonArea, setLinkedCommonArea] = useState<CommonArea | null>(null);

    const [client, setClient] = useState<Client | null>(null);

    // Dropbox Integration State
    const [creatingDropboxFolder, setCreatingDropboxFolder] = useState(false);
    const [galleryPhotos, setGalleryPhotos] = useState<DriveFile[]>([]);
    const [loadingGallery, setLoadingGallery] = useState(false);

    // AI States
    const [generatingDescription, setGeneratingDescription] = useState(false);
    const [generatedDescription, setGeneratedDescription] = useState('');
    const [showDescriptionModal, setShowDescriptionModal] = useState(false);

    // Modal States
    const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
    const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);

    const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);
    const [isEditServicesModalOpen, setIsEditServicesModalOpen] = useState(false);
    const [isTipModalOpen, setIsTipModalOpen] = useState(false);
    const [isEditObservationsModalOpen, setIsEditObservationsModalOpen] = useState(false);
    const [isReportFailureModalOpen, setIsReportFailureModalOpen] = useState(false);

    const [isLoading, setIsLoading] = useState(true);

    const refreshBooking = async (silent = false) => {
        if (!silent) setIsLoading(true);
        const fetchedBooking = await getBookingById(bookingId);
        if (fetchedBooking) {
            setBooking(fetchedBooking);

            const servicePromises = fetchedBooking.service_ids.map(id => getServiceById(id));
            const fetchedServices = (await Promise.all(servicePromises)).filter(Boolean) as Service[];
            setServices(fetchedServices);

            if (fetchedBooking.photographer_id) {
                const fetchedPhotographer = await getPhotographerById(fetchedBooking.photographer_id);
                setPhotographer(fetchedPhotographer || null);
            }

            if (fetchedBooking.brokerId) {
                const fetchedBroker = await getBrokerById(fetchedBooking.brokerId);
                setBroker(fetchedBroker || null);
            }

            // Fetch Client Details
            if (fetchedBooking.client_id) {
                const fetchedClient = await getClientById(fetchedBooking.client_id);
                setClient(fetchedClient || null);
            }
        }
        if (!silent) setIsLoading(false);
    };

    useEffect(() => {
        refreshBooking();
        const fetchAreas = async () => {
            const areas = await getCommonAreas();
            setCommonAreas(areas);
        };
        fetchAreas();
    }, [bookingId]);

    // Optimistic Update Handler
    const handleOptimisticUpdate = (bookingId: string, newStatus: Booking['status']) => {
        if (booking) {
            setBooking({ ...booking, status: newStatus });
        }
    };

    useEffect(() => {
        if (booking && booking.commonAreaId) {
            const area = commonAreas.find(ca => ca.id === booking.commonAreaId);
            setLinkedCommonArea(area || null);
        } else {
            setLinkedCommonArea(null);
        }
    }, [booking, commonAreas]);

    // FETCH DRIVE GALLERY IF FOLDER EXISTS
    useEffect(() => {
        if (booking?.dropboxFolderId && (user.role === 'client' || user.role === 'broker' || user.role === 'admin')) {
            setLoadingGallery(true);
            getBookingPhotos(booking.dropboxFolderId).then(files => {
                setGalleryPhotos(files);
                setLoadingGallery(false);
            });
        }
    }, [booking, user.role]);

    const payout = useMemo(() => {
        if (!booking) return 0;
        return getPhotographerPayoutForBooking(booking);
    }, [booking]);

    const upsellOpportunities = useMemo(() => {
        if (!booking) return [];
        return getContextualUpsells(booking);
    }, [booking]);


    const handleConfirmCancel = () => {
        refreshBooking(true);
        setIsCancelModalOpen(false);
    }

    // UPDATED: Async handling for completion + drive creation
    const handleConfirmComplete = async (notes: string, commonAreaId?: string) => {
        // Booking completion is now async to handle Dropbox creation
        const updatedBooking = await completeBooking(bookingId, notes, commonAreaId);
        setBooking(updatedBooking);
        setIsCompleteModalOpen(false);

        if (updatedBooking.dropboxFolderId) {
            alert("Sessão finalizada! A pasta no Dropbox foi criada automaticamente.");
        } else {
            alert("Sessão finalizada, mas houve um erro ao criar a pasta no Dropbox automaticamente. Por favor, utilize o botão 'Criar Pasta no Dropbox' para tentar novamente.");
        }
    }



    const handleGenerateDescription = async () => {
        setGeneratingDescription(true);
        try {
            const desc = await generateMarketingDescription(bookingId);
            setGeneratedDescription(desc);
            setShowDescriptionModal(true);
        } catch (error) {
            alert("Erro ao gerar descrição. Tente novamente.");
        } finally {
            setGeneratingDescription(false);
        }
    };

    const handleConfirmTip = async (amount: number) => {
        const updated = await addTipToBooking(bookingId, amount);
        if (updated) {
            setBooking(updated);
            setIsTipModalOpen(false);
        }
    };

    const handleKeyToggle = async () => {
        if (!booking) return;

        const currentStatus = booking.keyState;
        let newStatus: 'WITH_PHOTOGRAPHER' | 'RETURNED' = 'WITH_PHOTOGRAPHER';

        if (currentStatus === 'WITH_PHOTOGRAPHER') {
            newStatus = 'RETURNED';
        }

        await updateKeyStatus(bookingId, newStatus);
        refreshBooking(true);
    }

    const handleUpdateObservations = async (notes: string) => {
        const actorName = user.role === 'admin' ? 'Admin' : (user.role === 'editor' ? 'Editor' : 'Cliente');
        await updateBookingObservations(bookingId, notes, actorName);
        refreshBooking(true);
        setIsEditObservationsModalOpen(false);
    }

    const handleCreateDropboxFolder = async () => {
        if (!booking) return;
        setCreatingDropboxFolder(true);
        const updated = await linkBookingToDropbox(booking.id, user.role === 'admin' ? 'Admin' : 'Fotógrafo');
        if (updated) {
            setBooking(updated);
            alert('Pasta criada no Dropbox com sucesso!');
        } else {
            alert('Erro ao criar pasta. Verifique a configuração.');
        }
        setCreatingDropboxFolder(false);
    }

    // --- Z-API Handlers ---
    const handleZApiAction = async (action: 'confirm' | 'enroute' | 'reschedule') => {
        if (!booking) return;

        let success = false;
        if (action === 'confirm') {
            success = await sendBookingConfirmation(booking);
        } else if (action === 'reschedule') {
            success = await sendRescheduleNotification(booking);
        } else if (action === 'enroute') {
            const photographerName = photographer ? photographer.name : 'Fotógrafo';
            success = await sendPhotographerEnRoute(booking, photographerName, 20); // Mock 20 mins
        }

        if (success) {
            alert('Mensagem enviada com sucesso (Simulação Z-API)! Verifique o console.');
        }
    };


    if (isLoading) {
        return (
            <div className="space-y-6 animate-fade-in p-6">
                <div className="flex justify-between items-center">
                    <Skeleton width={100} height={24} />
                    <Skeleton width={100} height={24} className="rounded-full" />
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-white p-6 rounded-xl shadow-lg border border-slate-200 space-y-4">
                            <Skeleton width="40%" height={28} />
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <div className="flex gap-3">
                                        <Skeleton variant="circular" width={20} height={20} />
                                        <div className="flex-1 space-y-2">
                                            <Skeleton width="30%" height={16} />
                                            <Skeleton width="80%" height={20} />
                                        </div>
                                    </div>
                                    <div className="flex gap-3">
                                        <Skeleton variant="circular" width={20} height={20} />
                                        <div className="flex-1 space-y-2">
                                            <Skeleton width="30%" height={16} />
                                            <Skeleton width="60%" height={20} />
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Skeleton width="50%" height={20} />
                                    <Skeleton width="100%" height={40} />
                                    <Skeleton width="100%" height={40} />
                                    <div className="flex justify-between pt-2">
                                        <Skeleton width="30%" height={24} />
                                        <Skeleton width="30%" height={24} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="space-y-6">
                        <div className="bg-white p-6 rounded-xl shadow-lg border border-slate-200 space-y-3">
                            <Skeleton width="50%" height={24} />
                            <Skeleton width="100%" height={40} />
                            <Skeleton width="100%" height={40} />
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (!booking) return <div className="p-8 text-center">Carregando detalhes...</div>;

    const canCancel = (booking.status === 'Pendente' || booking.status === 'Confirmado') && booking.status !== 'Realizado' && booking.status !== 'Concluído';
    const canReschedule = (booking.status === 'Pendente' || booking.status === 'Confirmado') && booking.status !== 'Realizado' && booking.status !== 'Concluído';
    const canEditServices = booking.status === 'Pendente' || booking.status === 'Confirmado';

    const isPhotographer = user.role === 'photographer';
    const isAdminOrEditor = user.role === 'admin' || user.role === 'editor';
    const canEditObservations = isAdminOrEditor || user.role === 'client' || user.role === 'broker';
    const hasKeyPickup = booking.service_ids.includes('retirar_chaves');

    return (
        <div className="space-y-6 animate-fade-in">
            {isCancelModalOpen && <CancelModal booking={booking} user={user} onConfirm={handleConfirmCancel} onClose={() => setIsCancelModalOpen(false)} onOptimisticUpdate={handleOptimisticUpdate} />}
            {isRescheduleModalOpen && <RescheduleModal booking={booking} onConfirm={() => { refreshBooking(); setIsRescheduleModalOpen(false); }} onClose={() => setIsRescheduleModalOpen(false)} />}
            {isEditServicesModalOpen && <EditServicesModal booking={booking} user={user} onConfirm={() => { refreshBooking(); setIsEditServicesModalOpen(false); }} onClose={() => setIsEditServicesModalOpen(false)} />}
            {isCompleteModalOpen && <CompleteBookingModal commonAreas={commonAreas} onClose={() => setIsCompleteModalOpen(false)} onConfirm={handleConfirmComplete} />}

            {showDescriptionModal && <DescriptionModal text={generatedDescription} onClose={() => setShowDescriptionModal(false)} />}
            {isTipModalOpen && <TipModal onClose={() => setIsTipModalOpen(false)} onConfirm={handleConfirmTip} />}
            {isEditObservationsModalOpen && <EditObservationsModal currentNotes={booking.unit_details || ''} onClose={() => setIsEditObservationsModalOpen(false)} onSave={handleUpdateObservations} />}
            {isReportFailureModalOpen && booking.photographer_id && (
                <ReportFailureModal
                    isOpen={isReportFailureModalOpen}
                    onClose={() => setIsReportFailureModalOpen(false)}
                    bookingId={bookingId}
                    photographerId={booking.photographer_id}
                    reporterId={user.id}
                    onSuccess={() => {
                        refreshBooking();
                        alert("Falha reportada e registrada no financeiro.");
                    }}
                />
            )}

            <div className="flex justify-between items-center">
                <button onClick={onBack} className="flex items-center gap-2 text-sm font-semibold text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300">
                    <ArrowLeftIcon className="w-5 h-5" /> Voltar
                </button>
                <span className={`px-3 py-1 rounded-full text-sm font-bold border ${statusStyles[booking.status]}`}>
                    {booking.status}
                </span>
            </div>

            {booking.isFlash && (
                <div className="bg-gradient-to-r from-amber-100 to-orange-100 border border-orange-200 p-4 rounded-lg flex items-center gap-3">
                    <div className="bg-white/60 p-2 rounded-full"><ClockIcon className="w-6 h-6 text-orange-600" /></div>
                    <div>
                        <p className="font-bold text-orange-800">Agendamento Flash ⚡</p>
                        <p className="text-xs text-orange-700">Solicitação de urgência.</p>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column: Main Info */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
                        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-4">Detalhes da Sessão</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <div className="flex items-start gap-3">
                                    <MapPinIcon className="w-5 h-5 text-slate-500 mt-1" />
                                    <div className="flex-1">
                                        {/* CLIENT OBSERVATIONS (Visible to Admin, Editor, Photographer) */}
                                        {(isAdminOrEditor || isPhotographer) && client?.notes && (
                                            <div className="mb-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                                                <h4 className="text-xs font-bold text-blue-800 dark:text-blue-200 uppercase mb-1 flex items-center gap-1">
                                                    <AlertTriangleIcon className="w-3 h-3" /> Observações do Cliente
                                                </h4>
                                                <p className="text-sm text-blue-900 dark:text-blue-100">
                                                    {client.notes}
                                                </p>
                                            </div>
                                        )}

                                        <p className="text-sm text-slate-500 dark:text-slate-400 font-semibold">Endereço</p>
                                        <p className="text-slate-800 dark:text-slate-100 font-medium">{booking.address}</p>

                                        {/* Unit Details / Observations Block */}
                                        <div className="relative group mt-2">
                                            {booking.unit_details ? (
                                                <p className="text-sm text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900 p-3 rounded border border-slate-200 dark:border-slate-700">
                                                    {booking.unit_details}
                                                </p>
                                            ) : (
                                                canEditObservations && (
                                                    <button
                                                        onClick={() => setIsEditObservationsModalOpen(true)}
                                                        className="text-xs text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 border border-purple-200 dark:border-purple-800 border-dashed px-3 py-2 rounded-lg w-full text-left flex items-center gap-2"
                                                    >
                                                        <PlusIcon className="w-3 h-3" /> Adicionar Observações
                                                    </button>
                                                )
                                            )}

                                            {/* Edit Button Overlay */}
                                            {canEditObservations && booking.unit_details && (
                                                <button
                                                    onClick={() => setIsEditObservationsModalOpen(true)}
                                                    className="absolute top-2 right-2 p-1 bg-white dark:bg-slate-800 rounded-full shadow-sm text-slate-400 dark:text-slate-500 hover:text-purple-600 dark:hover:text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                                    title="Editar Observações"
                                                >
                                                    <EditIcon className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>

                                        {/* KEY TRACKER MOVED TO SIDEBAR */}
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <CalendarIcon className="w-5 h-5 text-slate-500 dark:text-slate-400 mt-1" />
                                    <div>
                                        <p className="text-sm text-slate-500 dark:text-slate-400 font-semibold">Data e Hora</p>
                                        <p className="text-slate-800 dark:text-slate-100 font-medium capitalize">{new Date(booking.date.replace(/-/g, '/')).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                                        <p className="text-slate-800 dark:text-slate-100">{booking.start_time} - {booking.end_time}</p>
                                    </div>
                                </div>
                            </div>
                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <p className="text-sm text-slate-500 dark:text-slate-400 font-semibold">Serviços Contratados</p>
                                    {canEditServices && <button onClick={() => setIsEditServicesModalOpen(true)} className="text-xs font-bold text-purple-600 dark:text-purple-400 hover:underline">Editar</button>}
                                </div>
                                <ul className="space-y-2 mb-4">
                                    {services.map(s => (
                                        <li key={s.id} className="flex justify-between text-sm p-2 bg-slate-50 dark:bg-slate-900 rounded border border-slate-100 dark:border-slate-700">
                                            <span className="text-slate-700 dark:text-slate-300">{s.name} {s.id === 'taxa_flash' && '⚡'}</span>
                                            <span className="font-semibold text-slate-700 dark:text-slate-200">
                                                {/* Use overwritten price if available, else standard */}
                                                R$ {isPhotographer
                                                    ? (((booking.servicePriceOverrides?.[s.id] ?? s.price) || 0) * 0.6).toFixed(2)
                                                    : ((booking.servicePriceOverrides?.[s.id] ?? s.price) || 0).toFixed(2)}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                                <div className="flex justify-between items-center pt-3 border-t border-slate-100 dark:border-slate-700">
                                    <span className="font-bold text-slate-800 dark:text-slate-100">{isPhotographer ? 'Seu Recebível' : 'Total'}</span>
                                    <span className="font-bold text-xl text-purple-700 dark:text-purple-400">
                                        R$ {isPhotographer ? (payout || 0).toFixed(2) : (booking.total_price || 0).toFixed(2)}
                                    </span>
                                </div>
                                {(booking.couponCode) && (
                                    <p className="text-xs text-green-600 text-right mt-1">
                                        Cupom {booking.couponCode}: -R$ {isPhotographer ? ((booking.discountAmount || 0) * 0.6).toFixed(2) : (booking.discountAmount || 0).toFixed(2)} (Já aplicado)
                                    </p>
                                )}
                                {booking.tipAmount ? (
                                    <div className="flex justify-between items-center mt-1 text-yellow-600">
                                        <span className="text-xs font-bold flex items-center gap-1"><DollarSignIcon className="w-3 h-3" /> Gorjeta</span>
                                        <span className="text-sm font-semibold">+ R$ {booking.tipAmount.toFixed(2)}</span>
                                    </div>
                                ) : null}
                            </div>
                        </div>
                    </div>



                    {/* CLIENT GALLERY */}
                    {(user.role === 'client' || user.role === 'broker') && booking.dropboxFolderLink && (
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                                    <ImageIcon className="w-5 h-5 text-purple-600 dark:text-purple-400" /> Galeria de Fotos
                                </h3>
                                <div className="flex gap-2">
                                    <a
                                        href={booking.dropboxFolderLink.includes('dl=0') ? booking.dropboxFolderLink.replace('dl=0', 'dl=1') : (booking.dropboxFolderLink.includes('?') ? `${booking.dropboxFolderLink}&dl=1` : `${booking.dropboxFolderLink}?dl=1`)}
                                        className="text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 py-1.5 px-3 rounded-lg flex items-center gap-1 transition-colors shadow-sm"
                                    >
                                        <DownloadIcon className="w-3 h-3" /> Baixar Material (ZIP)
                                    </a>
                                </div>
                            </div>

                            {loadingGallery ? (
                                <div className="text-center py-8 text-slate-500 dark:text-slate-400">Carregando fotos...</div>
                            ) : galleryPhotos.length > 0 ? (
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                    {galleryPhotos.slice(0, 6).map((photo) => (
                                        <a key={photo.id} href={photo.webViewLink} target="_blank" rel="noreferrer" className="aspect-video bg-slate-100 dark:bg-slate-700 rounded-lg overflow-hidden hover:opacity-90 transition-opacity">
                                            <img
                                                src={photo.thumbnailLink}
                                                alt={photo.name}
                                                className="w-full h-full object-cover"
                                            />
                                        </a>
                                    ))}
                                    {galleryPhotos.length > 6 && (
                                        <a href={booking.dropboxFolderLink} target="_blank" rel="noreferrer" className="aspect-video bg-slate-100 dark:bg-slate-700 rounded-lg flex items-center justify-center text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors font-bold text-sm">
                                            + {galleryPhotos.length - 6} fotos
                                        </a>
                                    )}
                                </div>
                            ) : (
                                <div className="text-center py-8 bg-slate-50 dark:bg-slate-900 rounded-lg text-slate-500 dark:text-slate-400 text-sm">
                                    Nenhuma foto disponível na galeria ainda.
                                </div>
                            )}
                        </div>
                    )}

                    {/* INTERNAL NOTES (Visible only to Admin/Editor) */}
                    {(isAdminOrEditor) && booking.internalNotes && (
                        <div className="bg-red-50 dark:bg-red-900/20 p-6 rounded-xl border border-red-200 dark:border-red-800 shadow-sm animate-fade-in">
                            <h4 className="font-bold text-red-800 dark:text-red-200 flex items-center gap-2 text-lg mb-2">
                                <ShieldIcon className="w-5 h-5" /> Notas Internas (Privado)
                            </h4>
                            <p className="text-sm text-red-700 dark:text-red-300 italic bg-white dark:bg-slate-800 p-3 rounded border border-red-100 dark:border-red-800">
                                "{booking.internalNotes}"
                            </p>
                            <p className="text-xs text-red-500 dark:text-red-400 mt-2">* Visível apenas para Administradores e Editores.</p>
                        </div>
                    )}

                    {/* LINKED COMMON AREA CARD */}
                    {linkedCommonArea && (booking.status === 'Realizado' || booking.status === 'Concluído') && (
                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-6 rounded-xl border border-blue-100 dark:border-blue-800 shadow-sm animate-fade-in">
                            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                                <div>
                                    <h4 className="font-bold text-blue-800 dark:text-blue-200 flex items-center gap-2 text-lg">
                                        <BuildingIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" /> Área Comum Vinculada
                                    </h4>
                                    <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                                        As fotos de <strong>{linkedCommonArea.name}</strong> foram incluídas neste pacote.
                                    </p>
                                </div>
                                <a
                                    href={linkedCommonArea.media_link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-full sm:w-auto flex items-center justify-center gap-2 bg-blue-600 text-white py-2.5 px-6 rounded-lg font-bold shadow-md hover:bg-blue-700 transition-all transform hover:-translate-y-0.5"
                                >
                                    <DownloadIcon className="w-5 h-5" />
                                    Baixar Fotos da Área Comum
                                </a>
                            </div>
                        </div>
                    )}



                    {/* Upsell Opportunities (Admin/Client) */}
                    {(user.role === 'admin' || user.role === 'client') && upsellOpportunities.length > 0 && canEditServices && (
                        <div className="bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 p-4 rounded-xl border border-purple-100 dark:border-purple-800">
                            <h3 className="font-bold text-purple-800 dark:text-purple-200 flex items-center gap-2 mb-3">
                                <SparklesIcon className="w-5 h-5" /> Turbine seu anúncio
                            </h3>
                            <div className="space-y-2">
                                {upsellOpportunities.map(s => (
                                    <div key={s.id} className="flex justify-between items-center bg-white dark:bg-slate-800 p-3 rounded-lg border border-purple-100 dark:border-purple-800 shadow-sm">
                                        <div>
                                            <p className="font-semibold text-slate-700 dark:text-slate-200 text-sm">{s.name}</p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">Aumente o engajamento do imóvel.</p>
                                        </div>
                                        <button
                                            className="text-xs font-bold bg-purple-600 dark:bg-purple-500 text-white px-3 py-1.5 rounded-full hover:bg-purple-700 dark:hover:bg-purple-600 transition-colors"
                                            onClick={() => {
                                                /* In a real app, this would add the service directly */
                                                alert(`Adicione "${s.name}" clicando em "Editar" na lista de serviços.`);
                                            }}
                                        >
                                            + R$ {s.price.toFixed(2)}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* History Log */}
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
                        <h3 className="font-bold text-slate-700 dark:text-slate-200 mb-4 flex items-center gap-2">
                            <HistoryIcon className="w-5 h-5 text-slate-400 dark:text-slate-500" /> Histórico
                        </h3>
                        <div className="space-y-4 max-h-60 overflow-y-auto pr-2">
                            {booking.history.map((entry, idx) => (
                                <div key={idx} className="flex gap-3 text-sm">
                                    <div className="mt-1 min-w-[80px] text-xs text-slate-400 dark:text-slate-500 text-right">
                                        {new Date(entry.timestamp).toLocaleDateString('pt-BR')}<br />
                                        {new Date(entry.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                    <div className="relative pl-4 border-l-2 border-slate-200 dark:border-slate-700">
                                        <div className={`absolute -left-[5px] top-1.5 w-2 h-2 rounded-full ${entry.actor === 'Sistema' ? 'bg-slate-400 dark:bg-slate-500' : 'bg-purple-500 dark:bg-purple-400'}`}></div>
                                        <p className="text-slate-800 dark:text-slate-100"><span className="font-semibold">{entry.actor}:</span> {entry.notes}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right Column: Stakeholders & Actions */}
                <div className="space-y-6">
                    {/* Actions Card */}
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
                        <h3 className="font-bold text-slate-700 dark:text-slate-200 mb-4">Ações</h3>
                        <div className="space-y-3">
                            {/* Marketing Description (AI) - Hidden for Admin and Photographer */}
                            {user.role !== 'admin' && user.role !== 'photographer' && (
                                <button onClick={handleGenerateDescription} disabled={generatingDescription} className="w-full py-2 px-4 bg-gradient-to-r from-pink-500 to-purple-600 text-white font-bold rounded-lg shadow hover:opacity-90 transition-opacity flex items-center justify-center gap-2 text-sm">
                                    <SparklesIcon className="w-4 h-4" />
                                    {generatingDescription ? 'Gerando...' : 'Criar Descrição com IA'}
                                </button>
                            )}

                            {/* Role-based Actions */}
                            {/* Finalize Session - Photographer, Admin, Editor */}
                            {(isPhotographer || isAdminOrEditor) && booking.status === 'Confirmado' && (
                                <button onClick={() => setIsCompleteModalOpen(true)} className="w-full py-2 px-4 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors text-sm">
                                    Finalizar Sessão
                                </button>
                            )}

                            {/* Report Failure - Admin/Editor ONLY */}
                            {(isAdminOrEditor) && (
                                <>
                                    <button
                                        onClick={() => setIsEditServicesModalOpen(true)}
                                        className="w-full py-2 px-4 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-bold rounded-lg hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors text-sm flex items-center justify-center gap-2"
                                    >
                                        <EditIcon className="w-4 h-4" /> Editar Serviços
                                    </button>

                                    <button
                                        onClick={() => setIsReportFailureModalOpen(true)}
                                        className="w-full py-2 px-4 bg-white dark:bg-slate-700 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 font-bold rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-sm flex items-center justify-center gap-2"
                                    >
                                        <AlertTriangleIcon className="w-4 h-4" /> Reportar Falha
                                    </button>
                                </>
                            )}

                            {/* Deliver Material - Admin, Editor ONLY */}
                            {(isAdminOrEditor) && booking.status === 'Realizado' && (
                                <button
                                    onClick={async () => {
                                        console.log('Botão Entregar Material clicado');
                                        if (window.confirm('ATENÇÃO: Confirmar entrega do material? O status mudará para Concluído e o cliente será notificado.')) {
                                            console.log('Confirmado. Chamando uploadMaterialForBooking...');
                                            const updated = await uploadMaterialForBooking(bookingId, []);
                                            console.log('Atualizado:', updated);
                                            setBooking(updated);
                                            alert('Material entregue e notificação enviada!');
                                        }
                                    }}
                                    className="w-full py-2 px-4 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 transition-colors text-sm flex items-center justify-center gap-2"
                                >
                                    <UploadCloudIcon className="w-4 h-4" /> Entregar Material
                                </button>
                            )}

                            {/* KEY TRACKER BUTTON (Sidebar Location) */}
                            {isPhotographer && (hasKeyPickup || services.some(s => s.name === 'Retirar Chaves na Imobiliária' || s.id === 'retirar_chaves')) && (
                                <>
                                    {!booking.keyState ? (
                                        <button onClick={handleKeyToggle} className="w-full flex items-center justify-center gap-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600 py-2 px-4 rounded-lg font-bold text-sm transition-colors">
                                            <KeyIcon className="w-4 h-4 text-slate-500 dark:text-slate-400" /> 🗝️ Pegar Chave
                                        </button>
                                    ) : booking.keyState === 'WITH_PHOTOGRAPHER' ? (
                                        <button onClick={handleKeyToggle} className="w-full flex items-center justify-center gap-2 bg-amber-100 dark:bg-amber-900/20 hover:bg-amber-200 dark:hover:bg-amber-900/40 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-700 py-2 px-4 rounded-lg font-bold text-sm transition-colors animate-pulse">
                                            <KeyIcon className="w-4 h-4" /> 🟠 Devolver Chave
                                        </button>
                                    ) : (
                                        <div className="w-full flex items-center justify-center gap-2 bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200 border border-green-200 dark:border-green-800 py-2 px-4 rounded-lg font-bold text-sm">
                                            <CheckCircleIcon className="w-4 h-4" /> ✅ Chave Devolvida
                                        </div>
                                    )}
                                </>
                            )}

                            {/* Reschedule - Hidden for Photographer */}
                            {canReschedule && !isPhotographer && (
                                <button onClick={() => setIsRescheduleModalOpen(true)} className="w-full py-2 px-4 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-bold rounded-lg hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors text-sm flex items-center justify-center gap-2">
                                    <RefreshCwIcon className="w-4 h-4" /> Reagendar
                                </button>
                            )}

                            {/* Cancel - Hidden for Photographer */}
                            {canCancel && !isPhotographer && (
                                <button onClick={() => setIsCancelModalOpen(true)} className="w-full py-2 px-4 bg-white dark:bg-slate-700 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 font-bold rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-sm flex items-center justify-center gap-2">
                                    <XCircleIcon className="w-4 h-4" /> Cancelar
                                </button>
                            )}

                            {/* Tipping (Client Only, Status Completed) */}
                            {user.role === 'client' && (booking.status === 'Realizado' || booking.status === 'Concluído') && (
                                <button onClick={() => setIsTipModalOpen(true)} className="w-full py-2 px-4 bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 font-bold rounded-lg hover:bg-yellow-200 dark:hover:bg-yellow-900/40 transition-colors text-sm flex items-center justify-center gap-2 border border-yellow-300 dark:border-yellow-700">
                                    <DollarSignIcon className="w-4 h-4" /> Enviar Gorjeta
                                </button>
                            )}

                            {/* Dropbox Actions - Moved from Blue Section */}
                            {(isPhotographer || isAdminOrEditor) && (
                                <>
                                    {isPhotographer && booking.dropboxUploadLink && (
                                        <a
                                            href={booking.dropboxUploadLink}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="w-full py-2 px-4 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 transition-colors text-sm flex items-center justify-center gap-2"
                                        >
                                            <FolderIcon className="w-4 h-4" /> Fazer Upload (Sem Login)
                                        </a>
                                    )}

                                    {booking.dropboxFolderLink ? (
                                        <a
                                            href={booking.dropboxFolderLink}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="w-full py-2 px-4 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors text-sm flex items-center justify-center gap-2"
                                        >
                                            <FolderIcon className="w-4 h-4" /> Abrir Pasta (Visualizar)
                                        </a>
                                    ) : (
                                        !booking.dropboxUploadLink && (booking.status === 'Realizado' || booking.status === 'Concluído') && (
                                            <button
                                                onClick={handleCreateDropboxFolder}
                                                disabled={creatingDropboxFolder}
                                                className="w-full py-2 px-4 bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 font-bold rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors text-sm flex items-center justify-center gap-2"
                                            >
                                                {creatingDropboxFolder ? <LoaderIcon className="w-4 h-4 animate-spin" /> : <PlusIcon className="w-4 h-4" />}
                                                Criar Pasta no Dropbox
                                            </button>
                                        )
                                    )}
                                </>
                            )}
                        </div>
                    </div>

                    {/* People Card */}
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 space-y-4">
                        {/* CLIENT SECTION */}
                        <div>
                            <div className="flex justify-between items-start mb-2">
                                <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase">Cliente</p>
                                {(isPhotographer || isAdminOrEditor) && booking.client_phone && (
                                    <a
                                        href={`tel:${booking.client_phone.replace(/\D/g, '')}`}
                                        className="text-xs font-bold bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-2 py-1 rounded flex items-center gap-1 hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors"
                                    >
                                        <PhoneIcon className="w-3 h-3" /> Ligar
                                    </a>
                                )}
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center"><UserIcon className="w-5 h-5 text-slate-500 dark:text-slate-400" /></div>
                                <div>
                                    <p className="font-bold text-slate-800 dark:text-slate-100 text-sm">{booking.client_name}</p>
                                    {/* Phone hidden as requested */}
                                </div>
                            </div>
                        </div>

                        {/* BROKER SECTION */}
                        {broker && (
                            <div className="pt-4 border-t border-slate-100 dark:border-slate-700">
                                <div className="flex justify-between items-start mb-2">
                                    <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase">Corretor Responsável</p>
                                    {(isPhotographer || isAdminOrEditor) && broker.phone && (
                                        <a
                                            href={`tel:${broker.phone.replace(/\D/g, '')}`}
                                            className="text-xs font-bold bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-2 py-1 rounded flex items-center gap-1 hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors"
                                        >
                                            <PhoneIcon className="w-3 h-3" /> Ligar
                                        </a>
                                    )}
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center"><UserIcon className="w-5 h-5 text-slate-500 dark:text-slate-400" /></div>
                                    <div>
                                        <p className="font-bold text-slate-800 dark:text-slate-100 text-sm">{broker.name}</p>
                                        {/* Phone hidden */}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* PHOTOGRAPHER SECTION */}
                        <div className="pt-4 border-t border-slate-100 dark:border-slate-700">
                            <div className="flex justify-between items-start mb-2">
                                <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase">Fotógrafo</p>
                                {((user.role === 'client' || user.role === 'broker' || isAdminOrEditor) && photographer?.phone) && (
                                    <a
                                        href={`tel:${photographer.phone.replace(/\D/g, '')}`}
                                        className="text-xs font-bold bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-2 py-1 rounded flex items-center gap-1 hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors"
                                    >
                                        <PhoneIcon className="w-3 h-3" /> Ligar
                                    </a>
                                )}
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center"><CameraIcon className="w-5 h-5 text-slate-500 dark:text-slate-400" /></div>
                                <div>
                                    <p className="font-bold text-slate-800 dark:text-slate-100 text-sm">{photographer?.name}</p>
                                    {/* Phone hidden */}
                                    {photographer?.rg && (
                                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 font-mono">RG: {photographer.rg}</p>
                                    )}
                                </div>
                            </div>
                            {isPhotographer && (
                                <div className="mt-3 bg-green-50 dark:bg-green-900/20 p-2 rounded border border-green-200 dark:border-green-800 text-center">
                                    <p className="text-xs text-green-800 dark:text-green-200">Seu Recebível Estimado</p>
                                    <p className="font-bold text-green-700 dark:text-green-300 text-lg">R$ {payout.toFixed(2)}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AppointmentDetailsPage;
