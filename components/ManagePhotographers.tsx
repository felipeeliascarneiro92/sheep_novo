




import React, { useState, useMemo, useRef, useEffect, FormEvent } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getPhotographers, getServices, addPhotographer, updatePhotographer, updatePhotographerPrices, loadGoogleMapsScript, updateEntityProfilePicture } from '../services/bookingService';
import { Photographer, Service, ServiceCategory, DayOfWeek, PhotographerHistory } from '../types';
import { CameraIcon, SearchIcon, PhoneIcon, MapPinIcon, RouteIcon, PlusIcon, XIcon, MailIcon, LockIcon, UserIcon, EditIcon, HistoryIcon, DollarSignIcon, ArrowLeftIcon, CheckCircleIcon, XCircleIcon, FileTextIcon, EyeIcon } from './icons';
import { maskPhone } from '../utils/masks';

const serviceCategories: ServiceCategory[] = ['Foto', 'Vídeo', 'Aéreo', 'Pacotes', 'Outros'];

// --- SUB-COMPONENT: PHOTOGRAPHER VALUES PAGE ---
const PhotographerValuesPage: React.FC<{ photographer: Photographer; onBack: () => void; onSave: () => void; }> = ({ photographer, onBack, onSave }) => {
    const [prices, setPrices] = useState<Record<string, string>>({});
    const [isSaving, setIsSaving] = useState(false);

    const [allServices, setAllServices] = useState<Service[]>([]);

    useEffect(() => {
        const fetchServices = async () => {
            const services = await getServices();
            setAllServices(services);
        };
        fetchServices();
    }, []);

    const servicesToDisplay = useMemo(() => {
        return allServices.filter(s => photographer.services.includes(s.id));
    }, [photographer.services, allServices]);

    const formatCurrency = (value: number | string) => {
        const num = Number(String(value).replace(',', '.'));
        return isNaN(num) ? '0,00' : num.toFixed(2).replace('.', ',');
    };
    const parseCurrency = (value: string) => Number(value.replace('.', '').replace(',', '.'));

    useEffect(() => {
        const initialPrices = photographer.prices || {};
        const formattedPrices: Record<string, string> = {};
        servicesToDisplay.forEach(service => {
            const price = initialPrices[service.id];
            formattedPrices[service.id] = formatCurrency(price || 0);
        });
        setPrices(formattedPrices);
    }, [photographer, servicesToDisplay]);

    const handlePriceChange = (serviceId: string, value: string) => {
        const sanitizedValue = value.replace(/[^0-9,]/g, '');
        setPrices(prev => ({ ...prev, [serviceId]: sanitizedValue }));
    };

    const handleBlur = (serviceId: string, value: string) => {
        setPrices(prev => ({ ...prev, [serviceId]: formatCurrency(value) }));
    };

    const handleSave = () => {
        setIsSaving(true);
        const numericPrices: Record<string, number> = {};
        Object.keys(prices).forEach(serviceId => {
            numericPrices[serviceId] = parseCurrency(prices[serviceId]);
        });

        updatePhotographerPrices(photographer.id, numericPrices);
        setTimeout(() => {
            setIsSaving(false);
            onSave();
        }, 500);
    };

    const groupedServicesToDisplay = useMemo(() => {
        return serviceCategories
            .map(category => ({
                category,
                services: servicesToDisplay.filter(s => s.category === category)
            }))
            .filter(group => group.services.length > 0);
    }, [servicesToDisplay]);

    return (
        <div className="animate-fade-in">
            <header className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Fornecedor Valores</h1>
                    <div className="text-sm text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2">
                        <span className="cursor-pointer hover:underline" onClick={onBack}>Gerenciar Fotógrafos</span>
                        <span>-</span>
                        <span className="font-semibold text-slate-600 dark:text-slate-300">Definir Valores</span>
                    </div>
                </div>
                <button onClick={onBack} className="flex items-center gap-2 text-sm font-semibold bg-white dark:bg-slate-700 dark:text-slate-200 py-2 px-4 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-600">
                    <ArrowLeftIcon className="w-4 h-4" /> Voltar para listagem
                </button>
            </header>

            <div className="bg-white dark:bg-slate-800 p-6 sm:p-8 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-3 mb-8">
                    <h2 className="text-xl text-slate-700 dark:text-slate-200 font-semibold">Definir Valores para o Fornecedor</h2>
                    <span className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 text-sm font-semibold px-3 py-1 rounded-full">{photographer.name}</span>
                </div>

                <div className="space-y-8">
                    {groupedServicesToDisplay.map(group => (
                        <div key={group.category}>
                            <h3 className="text-xl font-bold text-slate-600 dark:text-slate-300 mb-4 pb-2 border-b dark:border-slate-700">{group.category}</h3>
                            <div className="space-y-6 max-w-2xl mx-auto">
                                {group.services.map(service => (
                                    <div key={service.id} className="grid grid-cols-1 md:grid-cols-2 items-center gap-4">
                                        <div className="flex items-center gap-2">
                                            <h4 className="font-semibold text-slate-800 dark:text-slate-100">{service.name}</h4>
                                            {(!photographer.prices || !(service.id in photographer.prices)) && <span className="text-xs font-bold text-white bg-green-500 px-2 py-0.5 rounded-full">Novo</span>}
                                        </div>
                                        <div>
                                            <label htmlFor={`price-${service.id}`} className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Valor</label>
                                            <div className="relative">
                                                <input
                                                    type="text"
                                                    id={`price-${service.id}`}
                                                    value={prices[service.id] || '0,00'}
                                                    onChange={e => handlePriceChange(service.id, e.target.value)}
                                                    onBlur={e => handleBlur(service.id, e.target.value)}
                                                    className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg shadow-sm focus:ring-purple-500 focus:border-purple-500"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                <footer className="mt-10 pt-6 border-t border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row justify-between items-center gap-4">
                    <button onClick={onBack} className="flex items-center gap-2 text-sm font-semibold bg-white dark:bg-slate-700 dark:text-slate-200 py-2 px-4 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-600">
                        <ArrowLeftIcon className="w-4 h-4" /> Voltar para listagem
                    </button>
                    <button onClick={handleSave} disabled={isSaving} className="font-semibold text-white bg-green-500 px-6 py-2.5 rounded-lg shadow-md hover:bg-green-600 transition-shadow disabled:opacity-50 flex items-center gap-2">
                        <CheckCircleIcon className="w-5 h-5" /> {isSaving ? 'Salvando...' : 'Salvar'}
                    </button>
                </footer>
            </div>
        </div>
    );
};


// --- MODAL: PHOTOGRAPHER FORM (ADD/EDIT) ---
const PhotographerFormModal: React.FC<{ onClose: () => void; onSave: () => void; initialData?: Photographer; }> = ({ onClose, onSave, initialData }) => {
    const isEditMode = !!initialData;
    const [formData, setFormData] = useState({
        name: initialData?.name || '',
        phone: initialData?.phone || '',
        email: initialData?.email || '',
        rg: initialData?.rg || '',
        baseAddress: initialData?.baseAddress || '',
        radiusKm: initialData?.radiusKm || 10,
        availability: initialData?.availability || {},
        services: initialData?.services || [],
        isActive: initialData?.isActive !== undefined ? initialData.isActive : true,
        profilePicUrl: initialData?.profilePicUrl || '',
    });
    const [password, setPassword] = useState(''); // Used for initial credential creation
    const [selectedLocation, setSelectedLocation] = useState<{ lat: number, lng: number } | null>(initialData ? { lat: initialData.baseLat, lng: initialData.baseLng } : null);

    const [allServices, setAllServices] = useState<Service[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const autocompleteInputRef = useRef<HTMLInputElement>(null);
    const autocompleteInstanceRef = useRef<any>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const fetchServices = async () => {
            const services = await getServices();
            setAllServices(services);
        };
        fetchServices();
    }, []);

    // Sync formData with initialData when it changes (e.g., after profile picture upload)
    useEffect(() => {
        if (initialData) {
            setFormData({
                name: initialData.name || '',
                phone: initialData.phone || '',
                email: initialData.email || '',
                rg: initialData.rg || '',
                baseAddress: initialData.baseAddress || '',
                radiusKm: initialData.radiusKm || 10,
                availability: initialData.availability || {},
                services: initialData.services || [],
                isActive: initialData.isActive !== undefined ? initialData.isActive : true,
                profilePicUrl: initialData.profilePicUrl || '',
            });
            setSelectedLocation({ lat: initialData.baseLat, lng: initialData.baseLng });
        }
    }, [initialData?.profilePicUrl]); // Only update when profile picture changes

    useEffect(() => {
        const initAutocomplete = () => {
            if (!autocompleteInputRef.current || !(window as any).google || autocompleteInstanceRef.current) return;
            autocompleteInstanceRef.current = new (window as any).google.maps.places.Autocomplete(autocompleteInputRef.current, { types: ['address'], componentRestrictions: { country: 'br' } });
            autocompleteInstanceRef.current.addListener('place_changed', () => {
                const place = autocompleteInstanceRef.current.getPlace();
                if (place?.geometry?.location) {
                    setFormData(prev => ({ ...prev, baseAddress: place.formatted_address || '' }));
                    setSelectedLocation({ lat: place.geometry.location.lat(), lng: place.geometry.location.lng() });
                }
            });
        };

        loadGoogleMapsScript().then(() => {
            initAutocomplete();
        }).catch(error => {
            console.error("Could not load Google Maps script for photographer form", error);
        });
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { id, value, type, checked } = e.target;
        let newValue = value;
        if (id === 'phone') {
            newValue = maskPhone(value);
        }
        setFormData(prev => ({ ...prev, [id]: type === 'checkbox' ? checked : newValue }));
    }

    const handleServiceToggle = (serviceId: string) => {
        setFormData(prev => ({
            ...prev,
            services: prev.services.includes(serviceId) ? prev.services.filter(id => id !== serviceId) : [...prev.services, serviceId]
        }));
    };

    const handleProfilePicChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0] && initialData) {
            const file = e.target.files[0];
            try {
                const base64 = await updateEntityProfilePicture('photographer', initialData.id, file);
                setFormData(prev => ({ ...prev, profilePicUrl: base64 }));
            } catch (error) {
                console.error("Error uploading profile picture:", error);
                alert("Erro ao carregar a imagem.");
            }
        } else if (e.target.files && e.target.files[0] && !initialData) {
            // For new photographer, just read to base64 for preview, upload happens on save if we were persisting to server.
            // Here we just store base64 string in state.
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onloadend = () => {
                setFormData(prev => ({ ...prev, profilePicUrl: reader.result as string }));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleDayToggle = (day: DayOfWeek) => {
        setFormData(prev => {
            const newAvail = { ...prev.availability };
            if (newAvail[day] && newAvail[day]!.length > 0) {
                newAvail[day] = [];
            } else {
                newAvail[day] = ['08:00', '09:15', '10:30', '11:45', '13:00', '14:15', '15:30', '16:45'];
            }
            return { ...prev, availability: newAvail };
        });
    };

    const handleSlotChange = (day: DayOfWeek, index: number, value: string) => {
        setFormData(prev => {
            const newAvail = { ...prev.availability };
            const daySlots = [...(newAvail[day] || [])];
            daySlots[index] = value;
            // Sort to keep it clean
            daySlots.sort();
            newAvail[day] = daySlots;
            return { ...prev, availability: newAvail };
        });
    };

    const handleAddSlot = (day: DayOfWeek) => {
        setFormData(prev => {
            const newAvail = { ...prev.availability };
            const daySlots = [...(newAvail[day] || [])];
            daySlots.push('18:00');
            daySlots.sort();
            newAvail[day] = daySlots;
            return { ...prev, availability: newAvail };
        });
    };

    const handleRemoveSlot = (day: DayOfWeek, index: number) => {
        setFormData(prev => {
            const newAvail = { ...prev.availability };
            let daySlots = [...(newAvail[day] || [])];
            daySlots.splice(index, 1);
            newAvail[day] = daySlots;
            return { ...prev, availability: newAvail };
        });
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!selectedLocation) {
            alert('Por favor, selecione um endereço base válido da lista.');
            return;
        }

        setIsSubmitting(true);

        try {
            // Ensure all data is in camelCase before sending to the service
            const photographerData = {
                name: formData.name,
                email: formData.email,
                phone: formData.phone,
                rg: formData.rg,
                baseAddress: formData.baseAddress,
                baseLat: selectedLocation.lat,
                baseLng: selectedLocation.lng,
                radiusKm: Number(formData.radiusKm),
                services: formData.services,
                slotDurationMinutes: 60,
                availability: formData.availability,
                isActive: formData.isActive !== undefined ? formData.isActive : true,
                profilePicUrl: formData.profilePicUrl
            };

            let success = false;

            if (isEditMode && initialData) {
                success = await updatePhotographer(initialData.id, photographerData);
            } else {
                success = await addPhotographer(photographerData);
            }

            if (success) {
                alert(isEditMode ? 'Fotógrafo atualizado com sucesso!' : 'Fotógrafo cadastrado com sucesso!');
                onSave();
            } else {
                alert('Erro ao salvar fotógrafo. Verifique o console para mais detalhes.');
            }
        } catch (error) {
            console.error('Error in handleSubmit:', error);
            alert('Erro inesperado ao salvar fotógrafo.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const groupedServices = useMemo(() => serviceCategories.map(category => ({ category, services: allServices.filter(s => s.category === category) })).filter(group => group.services.length > 0), [allServices]);

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-fade-in-fast p-4" onClick={onClose}>
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <header className="p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center flex-shrink-0">
                    <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">{isEditMode ? 'Editar Fotógrafo' : 'Adicionar Novo Fotógrafo'}</h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700"><XIcon className="w-6 h-6 text-slate-500 dark:text-slate-400" /></button>
                </header>
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                        <div className="space-y-6">
                            <div className="flex justify-between items-center border-b dark:border-slate-700 pb-2">
                                <h3 className="font-bold text-slate-600 dark:text-slate-300">Informações Pessoais</h3>
                                <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-700 px-3 py-1 rounded-full border border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors">
                                    <input type="checkbox" id="isActive" checked={formData.isActive} onChange={handleChange} className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500" />
                                    Cadastro Ativo
                                </label>
                            </div>

                            <div className="flex justify-center mb-4">
                                <input type="file" ref={fileInputRef} onChange={handleProfilePicChange} className="hidden" accept="image/*" />
                                <div
                                    onClick={() => fileInputRef.current?.click()}
                                    className="w-24 h-24 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center border-2 border-dashed border-slate-300 dark:border-slate-600 relative cursor-pointer hover:border-purple-500 dark:hover:border-purple-400 overflow-hidden group"
                                >
                                    {formData.profilePicUrl ? (
                                        <img src={formData.profilePicUrl} alt="Profile" className="w-full h-full object-cover" />
                                    ) : (
                                        <CameraIcon className="w-10 h-10 text-slate-400 dark:text-slate-500" />
                                    )}
                                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <EditIcon className="w-6 h-6 text-white" />
                                    </div>
                                </div>
                            </div>

                            <InputField icon={<UserIcon />} id="name" label="Nome Completo" value={formData.name} onChange={handleChange} required />
                            <InputField icon={<FileTextIcon />} id="rg" label="RG" value={formData.rg} onChange={handleChange} required />
                            <InputField icon={<PhoneIcon />} id="phone" label="Telefone" value={formData.phone} onChange={handleChange} required />
                            <InputField icon={<MailIcon />} id="email" label="Email" type="email" value={formData.email} onChange={handleChange} required />
                            {!isEditMode && <InputField icon={<LockIcon />} id="password" label="Senha Inicial" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />}
                            <h3 className="font-bold text-slate-600 dark:text-slate-300 border-b dark:border-slate-700 pb-2 pt-4">Área de Atuação</h3>
                            <div><label htmlFor="baseAddress" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Endereço Base</label><div className="relative mt-1"><MapPinIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 dark:text-slate-500 pointer-events-none" /><input ref={autocompleteInputRef} id="baseAddress" value={formData.baseAddress} onChange={handleChange} required className="w-full p-2 pl-10 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg shadow-sm focus:ring-purple-500 focus:border-purple-500" /></div></div>
                            <div><label htmlFor="radiusKm" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Raio de Atendimento (km)</label><input id="radiusKm" type="number" value={formData.radiusKm} onChange={handleChange} required className="mt-1 w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg shadow-sm focus:ring-purple-500 focus:border-purple-500" /></div>
                            <h3 className="font-bold text-slate-600 dark:text-slate-300 border-b dark:border-slate-700 pb-2 pt-4">Serviços Habilitados</h3>
                            <div className="space-y-4 max-h-60 overflow-y-auto pr-2">{groupedServices.map(group => (<div key={group.category}><h4 className="font-semibold text-purple-700 dark:text-purple-400 text-sm mb-2">{group.category}</h4><div className="space-y-2">{group.services.map(service => (<label key={service.id} className="flex items-center gap-3 cursor-pointer"><input type="checkbox" checked={formData.services.includes(service.id)} onChange={() => handleServiceToggle(service.id)} className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500" /><span className="text-sm text-slate-800 dark:text-slate-200">{service.name}</span></label>))}</div></div>))}</div>
                        </div>
                        <div className="space-y-6">
                            <h3 className="font-bold text-slate-600 dark:text-slate-300 border-b dark:border-slate-700 pb-2">Disponibilidade Semanal</h3>
                            <div className="space-y-4">{dayNames.map(day => { const daySlots = formData.availability[day] || []; const isDayActive = daySlots.length > 0; return (<div key={day} className="p-3 border dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-700/50"><div className="flex items-center justify-between"><label htmlFor={`toggle-${day}`} className="flex items-center gap-3 cursor-pointer"><input type="checkbox" id={`toggle-${day}`} checked={isDayActive} onChange={() => handleDayToggle(day)} className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500" /><span className="font-semibold text-slate-700 dark:text-slate-200">{dayLabels[day]}</span></label>{isDayActive && <button type="button" onClick={() => handleAddSlot(day)} className="text-xs font-semibold text-purple-600 dark:text-purple-400 hover:underline">Adicionar Horário</button>}</div>{isDayActive && (<div className="mt-3 space-y-2 pl-7">{daySlots.map((slot, index) => (<div key={index} className="flex items-center gap-2"><input type="time" value={slot} onChange={e => handleSlotChange(day, index, e.target.value)} className="w-full p-1 border border-slate-300 dark:border-slate-600 dark:bg-slate-600 dark:text-white rounded-md shadow-sm text-sm" /><button type="button" onClick={() => handleRemoveSlot(day, index)} className="p-1 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-full"><XIcon className="w-4 h-4" /></button></div>))}</div>)}</div>); })}</div>
                        </div>
                    </div>
                </form>
                <footer className="p-6 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3 flex-shrink-0 bg-slate-50 dark:bg-slate-800/50 rounded-b-2xl">
                    <button onClick={onClose} type="button" className="bg-white dark:bg-slate-700 py-2 px-4 border border-slate-300 dark:border-slate-600 rounded-lg text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-600">Cancelar</button>
                    <button onClick={handleSubmit} disabled={isSubmitting} className="font-semibold text-white bg-gradient-to-r from-purple-600 to-pink-500 px-5 py-2.5 rounded-lg shadow-md hover:shadow-lg transition-shadow disabled:opacity-50">{isSubmitting ? 'Salvando...' : 'Salvar Fotógrafo'}</button>
                </footer>
            </div>
        </div>
    );
};
const InputField: React.FC<{ icon: React.ReactNode, id: string, label: string, type?: string, value: string, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void, required?: boolean }> = ({ icon, id, label, type = "text", value, onChange, required }) => (<div><label htmlFor={id} className="block text-sm font-medium text-slate-700 dark:text-slate-300">{label}</label><div className="relative mt-1"><div className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 dark:text-slate-500 pointer-events-none">{icon}</div><input id={id} type={type} value={value} onChange={onChange} required={required} className="w-full p-2 pl-10 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg shadow-sm focus:ring-purple-500 focus:border-purple-500" /></div></div>);
const dayNames: DayOfWeek[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const dayLabels: Record<DayOfWeek, string> = { monday: 'Segunda-feira', tuesday: 'Terça-feira', wednesday: 'Quarta-feira', thursday: 'Quinta-feira', friday: 'Sexta-feira', saturday: 'Sábado', sunday: 'Domingo' };

// --- MODAL: HISTORY ---
const PhotographerHistoryModal: React.FC<{ photographer: Photographer, onClose: () => void }> = ({ photographer, onClose }) => {
    const [auditLogs, setAuditLogs] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchAuditLogs = async () => {
            try {
                const { getAuditLogs } = await import('../services/auditService');
                const allLogs = await getAuditLogs();

                // Filter logs related to this photographer
                const photographerLogs = allLogs.filter(log =>
                    log.category === 'Fotógrafos' &&
                    log.metadata?.photographerId === photographer.id
                );

                // Sort by timestamp descending (most recent first)
                photographerLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

                setAuditLogs(photographerLogs);
            } catch (error) {
                console.error('Error fetching audit logs:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchAuditLogs();
    }, [photographer.id]);

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-fade-in-fast p-4" onClick={onClose}>
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <header className="p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Histórico de Alterações: {photographer.name}</h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700"><XIcon className="w-6 h-6 text-slate-500 dark:text-slate-400" /></button>
                </header>
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {isLoading ? (
                        <p className="text-center text-slate-500 dark:text-slate-400 py-10">Carregando...</p>
                    ) : auditLogs.length > 0 ? (
                        auditLogs.map((log, index) => (
                            <div key={index} className="p-4 border dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                                <div className="flex items-center justify-between mb-3">
                                    <span className={`text-xs font-semibold px-2 py-1 rounded ${log.actionType === 'CREATE' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' :
                                        log.actionType === 'UPDATE' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300' :
                                            log.actionType === 'DELETE' ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300' :
                                                'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
                                        }`}>
                                        {log.actionType}
                                    </span>
                                    <span className="text-xs text-slate-500 dark:text-slate-400">
                                        {new Date(log.timestamp).toLocaleString('pt-BR')}
                                    </span>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{log.actorName}</p>
                                    {log.details.split('\n').map((line: string, i: number) => (
                                        <p key={i} className={`text-sm ${i === 0 ? 'font-medium text-slate-800 dark:text-slate-100' : 'text-slate-600 dark:text-slate-300 pl-4'}`}>
                                            {line}
                                        </p>
                                    ))}
                                </div>
                            </div>
                        ))
                    ) : (
                        <p className="text-center text-slate-500 dark:text-slate-400 py-10">Nenhum histórico encontrado.</p>
                    )}
                </div>
            </div>
        </div>
    );
};


import PhotographerCoverageMap from './PhotographerCoverageMap';

// ... (existing imports)

// ... (existing PhotographerValuesPage, PhotographerFormModal, PhotographerHistoryModal)

// --- MAIN COMPONENT ---
const ManagePhotographers: React.FC = () => {
    const { impersonate } = useAuth();
    const [view, setView] = useState<'list' | 'prices' | 'map'>('list');
    const [selectedPhotographer, setSelectedPhotographer] = useState<Photographer | null>(null);
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [allPhotographers, setAllPhotographers] = useState<Photographer[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchPhotographers();
    }, []);

    const fetchPhotographers = async () => {
        setIsLoading(true);
        const data = await getPhotographers();
        setAllPhotographers(data);
        setIsLoading(false);
    };

    const refreshPhotographers = () => fetchPhotographers();

    const [showInactive, setShowInactive] = useState(false);

    const filteredPhotographers = useMemo(() => {
        let filtered = allPhotographers;

        // Filter out inactive unless showInactive is true
        if (!showInactive) {
            filtered = filtered.filter(p => p.isActive);
        }

        if (!searchQuery.trim()) return filtered;

        const lowerQuery = searchQuery.toLowerCase();
        return filtered.filter(p =>
            (p.name || '').toLowerCase().includes(lowerQuery) ||
            (p.base_address || '').toLowerCase().includes(lowerQuery)
        );
    }, [allPhotographers, searchQuery, showInactive]);

    const handleAddNew = () => { setSelectedPhotographer(null); setIsFormModalOpen(true); };
    const handleEdit = (p: Photographer) => { setSelectedPhotographer(p); setIsFormModalOpen(true); };
    const handleManagePrices = (p: Photographer) => { setSelectedPhotographer(p); setView('prices'); };
    const handleViewHistory = (p: Photographer) => { setSelectedPhotographer(p); setIsHistoryModalOpen(true); };
    const handleSave = () => { refreshPhotographers(); setIsFormModalOpen(false); };

    const handleToggleStatus = async (p: Photographer) => {
        const newStatus = !p.isActive;
        const action = newStatus ? 'ativar' : 'inativar';
        if (window.confirm(`Tem certeza que deseja ${action} o fotógrafo ${p.name}?`)) {
            await updatePhotographer(p.id, { isActive: newStatus });
            refreshPhotographers();
        }
    };

    if (view === 'prices' && selectedPhotographer) {
        return <PhotographerValuesPage photographer={selectedPhotographer} onBack={() => setView('list')} onSave={() => { refreshPhotographers(); setView('list'); }} />;
    }

    if (view === 'map') {
        return <PhotographerCoverageMap photographers={allPhotographers} onClose={() => setView('list')} />;
    }

    return (
        <div className="space-y-8 animate-fade-in">
            <header className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Gerenciar Fotógrafos</h1>
                <div className="flex gap-3">
                    <button
                        onClick={() => setView('map')}
                        className="font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 px-5 py-2.5 rounded-lg shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-2"
                    >
                        <MapPinIcon className="w-5 h-5 text-purple-600" />
                        Mapa de Cobertura
                    </button>
                    <button onClick={handleAddNew} className="font-semibold text-white bg-gradient-to-r from-purple-600 to-pink-500 px-5 py-2.5 rounded-lg shadow-md hover:shadow-lg transition-shadow flex items-center gap-2">
                        <PlusIcon className="w-5 h-5" />
                        Adicionar Fotógrafo
                    </button>
                </div>
            </header>
            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
                <div className="flex flex-col md:flex-row gap-4 mb-6 justify-between items-center">
                    <div className="relative flex-1 w-full">
                        <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 dark:text-slate-500" />
                        <input
                            type="text"
                            placeholder="Buscar por nome ou endereço..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full p-3 pl-12 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg shadow-sm focus:ring-purple-500 focus:border-purple-500 transition-colors"
                        />
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold text-slate-700 dark:text-slate-300 select-none">
                        <input
                            type="checkbox"
                            checked={showInactive}
                            onChange={e => setShowInactive(e.target.checked)}
                            className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                        />
                        Mostrar Inativos
                    </label>
                </div>
                <div className="space-y-4">{filteredPhotographers.map(photographer => (
                    <div key={photographer.id} className={`p-4 border border-slate-200 dark:border-slate-700 rounded-lg transition-all ${!photographer.isActive ? 'bg-slate-100 dark:bg-slate-700/50 opacity-60' : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}>
                        <div className="flex justify-between items-start flex-wrap gap-2">
                            <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-full overflow-hidden flex-shrink-0 border-2 border-white dark:border-slate-600 shadow-sm ${!photographer.isActive ? 'bg-slate-200 dark:bg-slate-700' : 'bg-slate-100 dark:bg-slate-600'}`}>
                                    {photographer.profilePicUrl ? (
                                        <img src={photographer.profilePicUrl} alt={photographer.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center"><CameraIcon className="w-6 h-6 text-slate-500 dark:text-slate-400" /></div>
                                    )}
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-800 dark:text-slate-100 text-lg">{photographer.name} {!photographer.isActive && <span className="text-xs font-bold text-red-600 dark:text-red-400 ml-2">(INATIVO)</span>}</h3>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">{photographer.email}</p>
                                </div>
                            </div>
                            <div className="text-right text-sm">
                                <p className="font-semibold text-slate-700 dark:text-slate-200">{photographer.bookings.length} agendamentos</p>
                                <p className={`font-bold ${photographer.isActive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>{photographer.isActive ? 'Ativo' : 'Inativo'}</p>
                            </div>
                        </div>
                        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                            <div className="flex items-center gap-2"><PhoneIcon className="w-4 h-4 text-slate-500 dark:text-slate-400" /><span className="text-slate-600 dark:text-slate-300">{photographer.phone}</span></div>
                            <div className="flex items-center gap-2"><MapPinIcon className="w-4 h-4 text-slate-500 dark:text-slate-400" /><span className="text-slate-600 dark:text-slate-300">{photographer.baseAddress}</span></div>
                            <div className="flex items-center gap-2"><RouteIcon className="w-4 h-4 text-slate-500 dark:text-slate-400" /><span className="text-slate-600 dark:text-slate-300">Atende em um raio de {photographer.radiusKm} km</span></div>
                        </div>
                        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 flex items-center justify-end gap-2 flex-wrap">
                            <button onClick={() => impersonate(photographer.id)} className="text-sm font-semibold text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 px-3 py-1.5 rounded-md transition-colors flex items-center gap-2 border border-purple-200 dark:border-purple-800" title="Acessar Painel">
                                <EyeIcon className="w-4 h-4" /> Acessar
                            </button>
                            <button onClick={() => handleToggleStatus(photographer)} className={`text-sm font-semibold px-3 py-1.5 rounded-md transition-colors flex items-center gap-2 border ${photographer.isActive ? 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 border-red-200 dark:border-red-800' : 'text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 border-green-200 dark:border-green-800'}`}>
                                {photographer.isActive ? <><XCircleIcon className="w-4 h-4" /> Inativar</> : <><CheckCircleIcon className="w-4 h-4" /> Ativar</>}
                            </button>
                            <button onClick={() => handleManagePrices(photographer)} className="text-sm font-semibold text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 px-3 py-1.5 rounded-md transition-colors flex items-center gap-2 border border-green-200 dark:border-green-800"><DollarSignIcon className="w-4 h-4" /> Definir Valores</button>
                            <button onClick={() => handleEdit(photographer)} className="text-sm font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 px-3 py-1.5 rounded-md transition-colors flex items-center gap-2 border border-blue-200 dark:border-blue-800"><EditIcon className="w-4 h-4" /> Editar</button>
                            <button onClick={() => handleViewHistory(photographer)} className="text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 px-3 py-1.5 rounded-md transition-colors flex items-center gap-2 border border-slate-200 dark:border-slate-600"><HistoryIcon className="w-4 h-4" /> Histórico</button>
                        </div>
                    </div>
                ))}</div>
            </div>
            {isFormModalOpen && <PhotographerFormModal onClose={() => setIsFormModalOpen(false)} onSave={handleSave} initialData={selectedPhotographer || undefined} />}
            {isHistoryModalOpen && selectedPhotographer && <PhotographerHistoryModal photographer={selectedPhotographer} onClose={() => setIsHistoryModalOpen(false)} />}
        </div>
    );
};

export default ManagePhotographers;