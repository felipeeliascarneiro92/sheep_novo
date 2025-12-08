import React, { useState, useEffect, useRef } from 'react';
import { User } from '../App';
import { getClientById, updateClient } from '../services/clientService';
import { updateEntityProfilePicture } from '../services/photographerService';
import { Client } from '../types';
import { UserIcon, MailIcon, PhoneIcon, MapPinIcon, LoaderIcon, CameraIcon, SaveIcon, LockIcon, BellIcon, SmartphoneIcon, ShieldIcon } from './icons';
import { loadGoogleMapsScript } from '../services/bookingService';
import { supabase } from '../services/supabase';

interface ClientProfilePageProps {
    user: User;
}

type Tab = 'personal' | 'address' | 'security' | 'preferences';

const ClientProfilePage: React.FC<ClientProfilePageProps> = ({ user }) => {
    const [client, setClient] = useState<Client | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [activeTab, setActiveTab] = useState<Tab>('personal');

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        tradeName: '',
        phone: '',
        mobilePhone: '',
        email: '',
        marketingEmail1: '',
        marketingEmail2: '',
        whatsappNotification1: '',
        whatsappNotification2: '',
        password: '',
        confirmPassword: '',
        address: {
            street: '',
            number: '',
            neighborhood: '',
            city: '',
            state: '',
            zip: '',
            complement: ''
        },
        notificationPreferences: {
            whatsapp: true,
            email: true,
            promotions: false
        }
    });

    const [fullAddressString, setFullAddressString] = useState('');
    const autocompleteInputRef = useRef<HTMLInputElement>(null);
    const autocompleteInstanceRef = useRef<any>(null);

    useEffect(() => {
        const fetchClient = async () => {
            if (user.role !== 'client') return;
            try {
                const data = await getClientById(user.id);
                if (data) {
                    setClient(data);
                    setFormData({
                        name: data.name,
                        tradeName: data.tradeName || '',
                        phone: data.phone,
                        mobilePhone: data.mobilePhone || '',
                        email: data.email,
                        marketingEmail1: data.marketingEmail1 || '',
                        marketingEmail2: data.marketingEmail2 || '',
                        whatsappNotification1: data.whatsappNotification1 || '',
                        whatsappNotification2: data.whatsappNotification2 || '',
                        password: '', // Don't load password
                        confirmPassword: '',
                        address: {
                            street: data.address?.street || '',
                            number: data.address?.number || '',
                            neighborhood: data.address?.neighborhood || '',
                            city: data.address?.city || '',
                            state: data.address?.state || '',
                            zip: data.address?.zip || '',
                            complement: data.address?.complement || ''
                        },
                        notificationPreferences: data.notificationPreferences || {
                            whatsapp: true,
                            email: true,
                            promotions: false
                        }
                    });
                    if (data.address) {
                        setFullAddressString(`${data.address.street}, ${data.address.number} - ${data.address.city}`);
                    }
                }
            } catch (error) {
                console.error("Error fetching client profile:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchClient();
    }, [user.id, user.role]);

    // Google Maps Autocomplete
    useEffect(() => {
        if (!loading && activeTab === 'address') {
            loadGoogleMapsScript().then(() => {
                if (!autocompleteInputRef.current || !(window as any).google) return;

                autocompleteInstanceRef.current = new (window as any).google.maps.places.Autocomplete(
                    autocompleteInputRef.current,
                    { types: ['address'], componentRestrictions: { country: 'br' } }
                );

                autocompleteInstanceRef.current.addListener('place_changed', () => {
                    const place = autocompleteInstanceRef.current.getPlace();
                    if (place.address_components) {
                        const get = (type: string) => place.address_components.find((c: any) => c.types.includes(type))?.long_name || '';
                        const getShort = (type: string) => place.address_components.find((c: any) => c.types.includes(type))?.short_name || '';

                        setFormData(prev => ({
                            ...prev,
                            address: {
                                ...prev.address,
                                street: get('route'),
                                number: get('street_number'),
                                neighborhood: get('sublocality_level_1'),
                                city: get('administrative_area_level_2'),
                                state: getShort('administrative_area_level_1'),
                                zip: get('postal_code')
                            }
                        }));
                        setFullAddressString(place.formatted_address);
                    }
                });
            });
        }
    }, [loading, activeTab]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type, checked } = e.target;
        if (type === 'checkbox') {
            // Handle nested preferences
            if (name.startsWith('pref_')) {
                const prefKey = name.replace('pref_', '');
                setFormData(prev => ({
                    ...prev,
                    notificationPreferences: {
                        ...prev.notificationPreferences,
                        [prefKey]: checked
                    }
                }));
            }
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            address: { ...prev.address, [name]: value }
        }));
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0] && client) {
            const file = e.target.files[0];
            try {
                setSaving(true);
                const publicUrl = await updateEntityProfilePicture('client', client.id, file);
                setClient(prev => prev ? { ...prev, profilePicUrl: publicUrl } : null);
                setMessage({ type: 'success', text: 'Foto de perfil atualizada com sucesso!' });
            } catch (error) {
                console.error("Error uploading profile picture:", error);
                setMessage({ type: 'error', text: 'Erro ao atualizar foto de perfil.' });
            } finally {
                setSaving(false);
            }
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!client) return;
        setSaving(true);
        setMessage(null);

        try {
            const updates: Partial<Client> = {
                name: formData.name,
                tradeName: formData.tradeName,
                phone: formData.phone,
                mobilePhone: formData.mobilePhone,
                email: formData.email,
                marketingEmail1: formData.marketingEmail1,
                marketingEmail2: formData.marketingEmail2,
                whatsappNotification1: formData.whatsappNotification1,
                whatsappNotification2: formData.whatsappNotification2,
                address: {
                    ...client.address,
                    ...formData.address
                },
                notificationPreferences: formData.notificationPreferences
            };

            // Password Change Logic
            if (formData.password) {
                if (formData.password !== formData.confirmPassword) {
                    setMessage({ type: 'error', text: 'As senhas não coincidem.' });
                    setSaving(false);
                    return;
                }
                if (formData.password.length < 6) {
                    setMessage({ type: 'error', text: 'A senha deve ter pelo menos 6 caracteres.' });
                    setSaving(false);
                    return;
                }

                // 1. Update Supabase Auth (The real login password)
                const { error: authError } = await supabase.auth.updateUser({ password: formData.password });
                if (authError) {
                    console.error("Error updating auth password:", authError);
                    setMessage({ type: 'error', text: 'Erro ao atualizar senha no sistema de login.' });
                    setSaving(false);
                    return;
                }

                // 2. Update Client Table (Legacy/Record)
                updates.password = formData.password;
            }

            await updateClient(client.id, updates);
            setMessage({ type: 'success', text: 'Perfil atualizado com sucesso!' });

            // Clear password fields after success
            if (formData.password) {
                setFormData(prev => ({ ...prev, password: '', confirmPassword: '' }));
            }

        } catch (error) {
            console.error("Error updating profile:", error);
            setMessage({ type: 'error', text: 'Erro ao salvar alterações.' });
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-8 flex justify-center"><LoaderIcon className="w-8 h-8 animate-spin text-purple-600" /></div>;
    if (!client) return <div className="p-8 text-center text-slate-500">Cliente não encontrado.</div>;

    return (
        <div className="p-6 max-w-5xl mx-auto animate-fade-in">
            <h1 className="text-2xl font-bold text-slate-800 mb-6">Meu Perfil</h1>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                {/* Left Column: Profile Pic & Navigation */}
                <div className="md:col-span-1 space-y-6">
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 text-center">
                        <div className="relative w-32 h-32 mx-auto mb-4 group">
                            <div className="w-32 h-32 rounded-full overflow-hidden ring-4 ring-purple-100 bg-slate-100">
                                {client.profilePicUrl ? (
                                    <img src={client.profilePicUrl} alt={client.name} className="w-full h-full object-cover" />
                                ) : (
                                    <UserIcon className="w-full h-full text-slate-300 p-6" />
                                )}
                            </div>
                            <label className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                                <CameraIcon className="w-8 h-8 text-white" />
                                <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} disabled={saving} />
                            </label>
                        </div>
                        <h2 className="font-bold text-slate-800 text-lg">{client.name}</h2>
                        <p className="text-slate-500 text-sm">{client.personType}</p>
                    </div>

                    <nav className="space-y-1">
                        <button onClick={() => setActiveTab('personal')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'personal' ? 'bg-purple-50 text-purple-700' : 'text-slate-600 hover:bg-slate-50'}`}>
                            <UserIcon className="w-5 h-5" /> Dados Pessoais
                        </button>
                        <button onClick={() => setActiveTab('address')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'address' ? 'bg-purple-50 text-purple-700' : 'text-slate-600 hover:bg-slate-50'}`}>
                            <MapPinIcon className="w-5 h-5" /> Endereço
                        </button>
                        <button onClick={() => setActiveTab('security')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'security' ? 'bg-purple-50 text-purple-700' : 'text-slate-600 hover:bg-slate-50'}`}>
                            <ShieldIcon className="w-5 h-5" /> Segurança
                        </button>
                        <button onClick={() => setActiveTab('preferences')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'preferences' ? 'bg-purple-50 text-purple-700' : 'text-slate-600 hover:bg-slate-50'}`}>
                            <BellIcon className="w-5 h-5" /> Preferências
                        </button>
                    </nav>
                </div>

                {/* Right Column: Content */}
                <div className="md:col-span-3">
                    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 min-h-[500px] flex flex-col">

                        {/* TAB: PERSONAL */}
                        {activeTab === 'personal' && (
                            <div className="space-y-6 animate-fade-in">
                                <h3 className="text-lg font-bold text-slate-800 border-b pb-2 mb-4">Dados Pessoais</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Razão Social / Nome</label>
                                        <input name="name" value={formData.name} onChange={handleInputChange} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none" required />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Nome Fantasia</label>
                                        <input name="tradeName" value={formData.tradeName} onChange={handleInputChange} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Telefone Principal</label>
                                        <div className="relative">
                                            <PhoneIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                            <input name="phone" value={formData.phone} onChange={handleInputChange} className="w-full pl-9 p-2 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Celular / WhatsApp</label>
                                        <div className="relative">
                                            <SmartphoneIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                            <input name="mobilePhone" value={formData.mobilePhone} onChange={handleInputChange} className="w-full pl-9 p-2 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none" />
                                        </div>
                                    </div>
                                </div>

                                <h3 className="text-lg font-bold text-slate-800 border-b pb-2 mt-8 mb-4">Contatos para Notificação</h3>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email Principal (Login)</label>
                                        <div className="relative">
                                            <MailIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                            <input name="email" value={formData.email} onChange={handleInputChange} className="w-full pl-9 p-2 border rounded text-sm bg-slate-50" />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email Cópia 1 (Financeiro/Mkt)</label>
                                            <input name="marketingEmail1" value={formData.marketingEmail1} onChange={handleInputChange} className="w-full p-2 border rounded text-sm" placeholder="ex: financeiro@empresa.com" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email Cópia 2 (Sócios)</label>
                                            <input name="marketingEmail2" value={formData.marketingEmail2} onChange={handleInputChange} className="w-full p-2 border rounded text-sm" placeholder="ex: socio@empresa.com" />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">WhatsApp Notificação 1</label>
                                            <div className="relative">
                                                <SmartphoneIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500" />
                                                <input name="whatsappNotification1" value={formData.whatsappNotification1} onChange={handleInputChange} className="w-full pl-9 p-2 border rounded text-sm" placeholder="Para receber avisos rápidos" />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">WhatsApp Notificação 2</label>
                                            <div className="relative">
                                                <SmartphoneIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500" />
                                                <input name="whatsappNotification2" value={formData.whatsappNotification2} onChange={handleInputChange} className="w-full pl-9 p-2 border rounded text-sm" placeholder="Sócio ou Gerente" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* TAB: ADDRESS */}
                        {activeTab === 'address' && (
                            <div className="space-y-6 animate-fade-in">
                                <h3 className="text-lg font-bold text-slate-800 border-b pb-2 mb-4">Endereço Principal</h3>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Buscar Endereço</label>
                                        <div className="relative">
                                            <MapPinIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                            <input
                                                ref={autocompleteInputRef}
                                                value={fullAddressString}
                                                onChange={(e) => setFullAddressString(e.target.value)}
                                                className="w-full pl-10 p-2 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none bg-slate-50"
                                                placeholder="Digite para buscar no Google Maps..."
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="col-span-2">
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Rua</label>
                                            <input name="street" value={formData.address.street} onChange={handleAddressChange} className="w-full p-2 border rounded bg-slate-50" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Número</label>
                                            <input name="number" value={formData.address.number} onChange={handleAddressChange} className="w-full p-2 border rounded" />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Bairro</label>
                                            <input name="neighborhood" value={formData.address.neighborhood} onChange={handleAddressChange} className="w-full p-2 border rounded bg-slate-50" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Cidade</label>
                                            <input name="city" value={formData.address.city} onChange={handleAddressChange} className="w-full p-2 border rounded bg-slate-50" />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Estado</label>
                                            <input name="state" value={formData.address.state} onChange={handleAddressChange} className="w-full p-2 border rounded bg-slate-50" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">CEP</label>
                                            <input name="zip" value={formData.address.zip} onChange={handleAddressChange} className="w-full p-2 border rounded bg-slate-50" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Complemento</label>
                                        <input name="complement" value={formData.address.complement} onChange={handleAddressChange} className="w-full p-2 border rounded" />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* TAB: SECURITY */}
                        {activeTab === 'security' && (
                            <div className="space-y-6 animate-fade-in">
                                <h3 className="text-lg font-bold text-slate-800 border-b pb-2 mb-4">Segurança da Conta</h3>
                                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800 mb-6">
                                    <p>Para sua segurança, escolha uma senha forte com pelo menos 6 caracteres.</p>
                                </div>
                                <div className="max-w-md space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Nova Senha</label>
                                        <div className="relative">
                                            <LockIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                            <input
                                                type="password"
                                                name="password"
                                                value={formData.password}
                                                onChange={handleInputChange}
                                                className="w-full pl-9 p-2 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                                                placeholder="••••••••"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Confirmar Nova Senha</label>
                                        <div className="relative">
                                            <LockIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                            <input
                                                type="password"
                                                name="confirmPassword"
                                                value={formData.confirmPassword}
                                                onChange={handleInputChange}
                                                className="w-full pl-9 p-2 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                                                placeholder="••••••••"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* TAB: PREFERENCES */}
                        {activeTab === 'preferences' && (
                            <div className="space-y-6 animate-fade-in">
                                <h3 className="text-lg font-bold text-slate-800 border-b pb-2 mb-4">Preferências de Notificação</h3>
                                <p className="text-slate-500 text-sm mb-6">Escolha como você gostaria de ser notificado sobre seus agendamentos e novidades.</p>

                                <div className="space-y-4">
                                    <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="bg-green-100 p-2 rounded-full"><SmartphoneIcon className="w-5 h-5 text-green-600" /></div>
                                            <div>
                                                <p className="font-bold text-slate-800">Notificações via WhatsApp</p>
                                                <p className="text-xs text-slate-500">Receba lembretes de agendamento e status em tempo real.</p>
                                            </div>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input type="checkbox" name="pref_whatsapp" checked={formData.notificationPreferences.whatsapp} onChange={handleInputChange} className="sr-only peer" />
                                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                                        </label>
                                    </div>

                                    <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="bg-blue-100 p-2 rounded-full"><MailIcon className="w-5 h-5 text-blue-600" /></div>
                                            <div>
                                                <p className="font-bold text-slate-800">Notificações via Email</p>
                                                <p className="text-xs text-slate-500">Receba faturas, links de fotos e comprovantes.</p>
                                            </div>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input type="checkbox" name="pref_email" checked={formData.notificationPreferences.email} onChange={handleInputChange} className="sr-only peer" />
                                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                                        </label>
                                    </div>

                                    <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="bg-purple-100 p-2 rounded-full"><BellIcon className="w-5 h-5 text-purple-600" /></div>
                                            <div>
                                                <p className="font-bold text-slate-800">Ofertas e Promoções</p>
                                                <p className="text-xs text-slate-500">Receba cupons exclusivos e novidades da SheepHouse.</p>
                                            </div>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input type="checkbox" name="pref_promotions" checked={formData.notificationPreferences.promotions} onChange={handleInputChange} className="sr-only peer" />
                                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                                        </label>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="mt-auto pt-6 flex justify-end border-t">
                            {message && (
                                <div className={`mr-auto p-2 px-4 rounded-lg text-sm font-medium ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                                    {message.text}
                                </div>
                            )}
                            <button
                                type="submit"
                                disabled={saving}
                                className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-6 rounded-lg shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
                            >
                                {saving ? <LoaderIcon className="w-5 h-5 animate-spin" /> : <SaveIcon className="w-5 h-5" />}
                                {saving ? 'Salvando...' : 'Salvar Alterações'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default ClientProfilePage;
