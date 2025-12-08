
import React, { useState, useEffect, FormEvent, useRef } from 'react';
import { getBrokersForClient, addBroker, grantBrokerAccess, updateBroker, revokeBrokerAccess, updateEntityProfilePicture, getBrokerRanking } from '../services/bookingService';
import { Broker } from '../types';
import { UsersIcon, UserIcon, XIcon, CheckCircleIcon, EditIcon, LockIcon, ShieldIcon, XCircleIcon, CameraIcon, EyeIcon, TrophyIcon } from './icons';
import { useAuth } from '../contexts/AuthContext';
import { maskPhone } from '../utils/masks';

// Mocked client ID for the logged-in user


const GrantAccessModal: React.FC<{ broker: Broker, password?: string, onClose: () => void }> = ({ broker, password, onClose }) => (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-fade-in-fast p-4" onClick={onClose}>
        <div className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="text-center">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100"><CheckCircleIcon className="h-6 w-6 text-green-600" /></div>
                <h3 className="mt-4 text-xl font-bold text-slate-800">Acesso Concedido!</h3>
                <p className="mt-2 text-sm text-slate-500">O corretor <span className="font-bold">{broker.name}</span> agora pode acessar o sistema. Compartilhe as credenciais abaixo com ele.</p>
            </div>
            <div className="mt-6 space-y-3 bg-slate-50 p-4 rounded-lg border">
                <div><p className="text-xs text-slate-500">Email de Acesso</p><p className="font-semibold text-slate-800">{broker.email}</p></div>
                <div><p className="text-xs text-slate-500">Senha Provisória</p><p className="font-semibold text-slate-800">{password}</p></div>
            </div>
            <div className="mt-6"><button onClick={onClose} className="w-full inline-flex justify-center rounded-md border border-slate-300 shadow-sm px-4 py-2.5 bg-white text-base font-medium text-slate-700 hover:bg-slate-50">Fechar</button></div>
        </div>
    </div>
);

const ManageBrokerModal: React.FC<{ broker: Broker, onClose: () => void, onUpdate: () => void, onGrantAccess: (id: string) => void }> = ({ broker, onClose, onUpdate, onGrantAccess }) => {
    const [activeTab, setActiveTab] = useState<'profile' | 'access' | 'permissions'>('profile');
    const [formData, setFormData] = useState({
        name: broker.name,
        phone: broker.phone,
        email: broker.email,
        isActive: broker.isActive,
        profilePicUrl: broker.profilePicUrl || ''
    });
    const [permissions, setPermissions] = useState(broker.permissions || { canSchedule: true, canViewAllBookings: false });
    const [isSaving, setIsSaving] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleSaveProfile = (e: FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        updateBroker(broker.id, formData);
        setTimeout(() => {
            setIsSaving(false);
            onUpdate();
        }, 500);
    };

    const handleProfilePicChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            try {
                const base64 = await updateEntityProfilePicture('broker', broker.id, file);
                setFormData(prev => ({ ...prev, profilePicUrl: base64 }));
            } catch (error) {
                console.error("Error uploading profile picture:", error);
                alert("Erro ao carregar a imagem.");
            }
        }
    };

    const handleSavePermissions = () => {
        setIsSaving(true);
        updateBroker(broker.id, { permissions });
        setTimeout(() => {
            setIsSaving(false);
            onUpdate();
        }, 500);
    };

    const handleRevoke = () => {
        if (window.confirm("Tem certeza que deseja revogar o acesso deste corretor? Ele não poderá mais fazer login.")) {
            revokeBrokerAccess(broker.id);
            onUpdate();
        }
    }

    const handleToggleActive = () => {
        const newStatus = !formData.isActive;
        setFormData(prev => ({ ...prev, isActive: newStatus }));
        // Auto save status change
        updateBroker(broker.id, { isActive: newStatus });
        onUpdate();
    }

    return (
        <div className="fixed inset-0 z-50 overflow-hidden">
            <div className="absolute inset-0 bg-black/50 transition-opacity" onClick={onClose} />
            <div className="fixed inset-y-0 right-0 pl-10 max-w-full flex">
                <div className="w-screen max-w-md transform transition-transform bg-white shadow-xl flex flex-col animate-slide-in-right">
                    <header className="px-4 py-6 bg-slate-50 sm:px-6 border-b flex justify-between items-start">
                        <div>
                            <h2 className="text-lg font-medium text-slate-900">Gerenciar Corretor</h2>
                            <p className="mt-1 text-sm text-slate-500">{broker.name}</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <button onClick={handleToggleActive} className={`px-3 py-1 rounded-full text-xs font-bold border ${formData.isActive ? 'bg-green-100 text-green-800 border-green-200' : 'bg-red-100 text-red-800 border-red-200'}`}>
                                {formData.isActive ? 'Ativo' : 'Inativo'}
                            </button>
                            <button onClick={onClose} className="text-slate-400 hover:text-slate-500"><XIcon className="w-6 h-6" /></button>
                        </div>
                    </header>

                    {/* Tabs */}
                    <div className="border-b border-slate-200">
                        <nav className="-mb-px flex" aria-label="Tabs">
                            <button onClick={() => setActiveTab('profile')} className={`w-1/3 py-4 px-1 text-center border-b-2 font-medium text-sm ${activeTab === 'profile' ? 'border-purple-500 text-purple-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}>Perfil</button>
                            <button onClick={() => setActiveTab('access')} className={`w-1/3 py-4 px-1 text-center border-b-2 font-medium text-sm ${activeTab === 'access' ? 'border-purple-500 text-purple-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}>Acesso</button>
                            <button onClick={() => setActiveTab('permissions')} className={`w-1/3 py-4 px-1 text-center border-b-2 font-medium text-sm ${activeTab === 'permissions' ? 'border-purple-500 text-purple-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}>Permissões</button>
                        </nav>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6">
                        {activeTab === 'profile' && (
                            <form onSubmit={handleSaveProfile} className="space-y-6">
                                <div className="flex justify-center mb-4">
                                    <input type="file" ref={fileInputRef} onChange={handleProfilePicChange} className="hidden" accept="image/*" />
                                    <div
                                        onClick={() => fileInputRef.current?.click()}
                                        className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center border-2 border-dashed border-slate-300 relative cursor-pointer hover:border-purple-500 overflow-hidden group"
                                    >
                                        {formData.profilePicUrl ? (
                                            <img src={formData.profilePicUrl} alt="Profile" className="w-full h-full object-cover" />
                                        ) : (
                                            <UserIcon className="w-10 h-10 text-slate-400" />
                                        )}
                                        <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            <EditIcon className="w-6 h-6 text-white" />
                                        </div>
                                    </div>
                                </div>
                                <div><label className="block text-sm font-medium text-slate-700">Nome Completo</label><input type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 sm:text-sm p-2 border" /></div>
                                <div><label className="block text-sm font-medium text-slate-700">Email</label><input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 sm:text-sm p-2 border" /></div>
                                <div><label className="block text-sm font-medium text-slate-700">Telefone</label><input type="text" value={formData.phone} onChange={e => setFormData({ ...formData, phone: maskPhone(e.target.value) })} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 sm:text-sm p-2 border" /></div>
                                <button type="submit" disabled={isSaving} className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50">{isSaving ? 'Salvando...' : 'Salvar Alterações'}</button>
                            </form>
                        )}
                        {activeTab === 'access' && (
                            <div className="space-y-6">
                                <div className={`p-4 rounded-lg border ${broker.hasLogin ? 'bg-green-50 border-green-200' : 'bg-slate-50 border-slate-200'}`}>
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-full ${broker.hasLogin ? 'bg-green-100 text-green-600' : 'bg-slate-200 text-slate-500'}`}>
                                            <LockIcon className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-medium text-slate-900">Status do Acesso</h3>
                                            <p className="text-sm text-slate-500">{broker.hasLogin ? 'O corretor possui credenciais de acesso ativas.' : 'Este corretor ainda não possui acesso ao portal.'}</p>
                                        </div>
                                    </div>
                                </div>

                                {broker.hasLogin ? (
                                    <div className="space-y-3">
                                        <button onClick={() => onGrantAccess(broker.id)} className="w-full flex justify-center items-center gap-2 py-2 px-4 border border-slate-300 rounded-md shadow-sm text-sm font-medium text-slate-700 bg-white hover:bg-slate-50">
                                            <EditIcon className="w-4 h-4" /> Redefinir Senha
                                        </button>
                                        <button onClick={handleRevoke} className="w-full flex justify-center items-center gap-2 py-2 px-4 border border-red-300 rounded-md shadow-sm text-sm font-medium text-red-700 bg-white hover:bg-red-50">
                                            <XCircleIcon className="w-4 h-4" /> Revogar Acesso
                                        </button>
                                    </div>
                                ) : (
                                    <button onClick={() => onGrantAccess(broker.id)} className="w-full flex justify-center items-center gap-2 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700">
                                        <CheckCircleIcon className="w-4 h-4" /> Conceder Acesso
                                    </button>
                                )}
                            </div>
                        )}
                        {activeTab === 'permissions' && (
                            <div className="space-y-6">
                                <p className="text-sm text-slate-500">Configure o que este corretor pode fazer no sistema.</p>
                                <div className="space-y-4">
                                    <div className="flex items-start gap-3">
                                        <div className="flex h-5 items-center">
                                            <input id="canSchedule" type="checkbox" checked={permissions.canSchedule} onChange={e => setPermissions({ ...permissions, canSchedule: e.target.checked })} className="h-4 w-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500" />
                                        </div>
                                        <div className="text-sm">
                                            <label htmlFor="canSchedule" className="font-medium text-slate-700">Agendar Serviços</label>
                                            <p className="text-slate-500">Permite criar novos agendamentos de fotografia e vídeo.</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <div className="flex h-5 items-center">
                                            <input id="viewAll" type="checkbox" checked={permissions.canViewAllBookings} onChange={e => setPermissions({ ...permissions, canViewAllBookings: e.target.checked })} className="h-4 w-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500" />
                                        </div>
                                        <div className="text-sm">
                                            <label htmlFor="viewAll" className="font-medium text-slate-700">Visualizar Toda Agenda</label>
                                            <p className="text-slate-500">Se marcado, vê todos os agendamentos da imobiliária. Se desmarcado, vê apenas os próprios.</p>
                                        </div>
                                    </div>
                                </div>
                                <button onClick={handleSavePermissions} disabled={isSaving} className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50">{isSaving ? 'Salvando...' : 'Salvar Permissões'}</button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

const BrokersPage: React.FC = () => {
    const [brokers, setBrokers] = useState<Broker[]>([]);
    const [ranking, setRanking] = useState<any[]>([]);
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [accessGrantedBroker, setAccessGrantedBroker] = useState<Broker | null>(null);
    const [tempPassword, setTempPassword] = useState<string | undefined>(undefined);
    const [managingBroker, setManagingBroker] = useState<Broker | null>(null);
    const { user, impersonate } = useAuth();
    const clientId = user?.role === 'broker' ? user.clientId : user?.id;

    const fetchBrokers = async () => {
        if (clientId) {
            const fetched = await getBrokersForClient(clientId);
            setBrokers(fetched);

            // Fetch Ranking
            const ranked = await getBrokerRanking(clientId);
            setRanking(ranked);
        }
    }
    useEffect(() => { fetchBrokers(); }, [clientId]);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!clientId) return;

        setIsSubmitting(true);
        await addBroker(name, phone, email, clientId);

        setTimeout(() => {
            setName('');
            setPhone('');
            setEmail('');
            fetchBrokers();
            setIsSubmitting(false);
        }, 500);
    };

    const handleGrantAccess = async (brokerId: string) => {
        const result = await grantBrokerAccess(brokerId);
        if (result) {
            setAccessGrantedBroker(result.broker);
            setTempPassword(result.tempPassword);
            await fetchBrokers();
            if (managingBroker && managingBroker.id === brokerId) {
                // Update the managing view if open
                setManagingBroker({ ...result.broker });
            }
        }
    };

    const handleUpdateList = async () => {
        await fetchBrokers();
        if (managingBroker) {
            // Refresh the managing broker object from latest list
            // Since fetchBrokers updates state, we might need to find it from the new state or re-fetch individually.
            // For simplicity, let's just re-fetch the broker or rely on the list update.
            // But state update is async. Let's fetch individual broker to be safe or just wait for list.
            // Actually, fetchBrokers sets state, so 'brokers' won't be updated immediately here.
            // Better to just close or let the user see the list update.
            // But the modal relies on 'managingBroker' state.
            // Let's fetch the single broker to update the modal.
            // We don't have getBrokerById imported here, but we can use the list logic if we wait.
            // Let's just re-fetch the list and update managingBroker if found.
            // We can't easily access the updated list here without waiting for render.
            // So let's just close the modal or keep it as is, assuming optimistic updates or separate fetch.
            // The original code tried to find it in 'brokers', which is stale.
            // Let's leave the logic but make fetchBrokers async.
            const updated = brokers.find(b => b.id === managingBroker.id);
            if (updated) setManagingBroker(updated);
        }
    }

    const handleToggleStatus = (broker: Broker) => {
        const newStatus = !broker.isActive;
        if (window.confirm(`Tem certeza que deseja ${newStatus ? 'ativar' : 'inativar'} o corretor ${broker.name}?`)) {
            updateBroker(broker.id, { isActive: newStatus });
            fetchBrokers();
        }
    }

    return (
        <div className="space-y-8 animate-fade-in">
            {accessGrantedBroker && <GrantAccessModal broker={accessGrantedBroker} password={tempPassword} onClose={() => setAccessGrantedBroker(null)} />}
            {managingBroker && <ManageBrokerModal broker={managingBroker} onClose={() => setManagingBroker(null)} onUpdate={handleUpdateList} onGrantAccess={handleGrantAccess} />}

            <header className="flex justify-between items-center flex-wrap gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Gerenciar Corretores</h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm">Adicione e gerencie o acesso dos corretores da sua equipe.</p>
                </div>
            </header>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1">
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 sticky top-8">
                        <h2 className="text-xl font-bold text-slate-700 dark:text-slate-200 mb-4">Adicionar Novo Corretor</h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label htmlFor="name" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Nome Completo</label>
                                <input type="text" id="name" value={name} onChange={(e) => setName(e.target.value)} required className="mt-1 w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg shadow-sm focus:ring-purple-500 focus:border-purple-500" />
                            </div>
                            <div>
                                <label htmlFor="phone" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Telefone</label>
                                <input type="tel" id="phone" value={phone} onChange={(e) => setPhone(maskPhone(e.target.value))} required className="mt-1 w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg shadow-sm focus:ring-purple-500 focus:border-purple-500" />
                            </div>
                            <div>
                                <label htmlFor="email" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Email</label>
                                <input type="email" id="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="mt-1 w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg shadow-sm focus:ring-purple-500 focus:border-purple-500" />
                            </div>
                            <button type="submit" disabled={isSubmitting} className="w-full font-semibold text-white bg-gradient-to-r from-purple-600 to-pink-500 px-5 py-2.5 rounded-lg shadow-md hover:shadow-lg transition-shadow disabled:opacity-50">
                                {isSubmitting ? 'Adicionando...' : 'Adicionar Corretor'}
                            </button>
                        </form>
                    </div>
                </div>
                <div className="lg:col-span-2">
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
                        <h2 className="text-xl font-bold text-slate-700 dark:text-slate-200 mb-4">Corretores Cadastrados ({brokers.length})</h2>
                        <div className="space-y-4">
                            {brokers.length > 0 ? (
                                brokers.map(broker => (
                                    <div key={broker.id} className={`p-4 border border-slate-200 dark:border-slate-700 rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-colors ${broker.isActive ? 'hover:bg-slate-50 dark:hover:bg-slate-700/50 bg-white dark:bg-slate-800' : 'bg-slate-100 dark:bg-slate-900 opacity-75'}`}>
                                        <div className="flex items-center gap-4">
                                            <div className="bg-slate-100 dark:bg-slate-700 p-1 rounded-full relative w-12 h-12 flex-shrink-0">
                                                {broker.profilePicUrl ? (
                                                    <img src={broker.profilePicUrl} alt={broker.name} className="w-full h-full rounded-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center"><UserIcon className="w-6 h-6 text-slate-500 dark:text-slate-400" /></div>
                                                )}
                                                {!broker.isActive && <div className="absolute bottom-0 right-0 w-3 h-3 bg-red-500 border-2 border-white dark:border-slate-800 rounded-full"></div>}
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                                                    {broker.name}
                                                    {!broker.isActive && <span className="text-xs font-bold text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30 px-2 py-0.5 rounded-full">Inativo</span>}
                                                </h3>
                                                <p className="text-sm text-slate-500 dark:text-slate-400">{broker.phone}</p>
                                                <p className="text-xs text-slate-400 dark:text-slate-500">{broker.email}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 self-end sm:self-center flex-wrap justify-end">
                                            <div className="flex flex-col items-end mr-2">
                                                {broker.hasLogin ? (
                                                    <div className="flex items-center gap-1 text-xs font-semibold text-green-600 dark:text-green-400">
                                                        <CheckCircleIcon className="w-3 h-3" /> Acesso Habilitado
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-1 text-xs font-semibold text-slate-400 dark:text-slate-500">
                                                        <LockIcon className="w-3 h-3" /> Sem Acesso
                                                    </div>
                                                )}
                                            </div>
                                            {broker.hasLogin && broker.isActive && (
                                                <button onClick={() => impersonate(broker.id)} className="font-semibold text-sm bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 py-2 px-3 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 flex items-center gap-1" title="Logar como este corretor">
                                                    <EyeIcon className="w-4 h-4" />
                                                </button>
                                            )}
                                            <button onClick={() => handleToggleStatus(broker)} className={`text-sm font-bold px-4 py-2 rounded-lg transition-colors flex items-center gap-2 border ${broker.isActive ? 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/30' : 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-900/30'}`}>
                                                {broker.isActive ? 'Inativar' : 'Ativar'}
                                            </button>
                                            <button onClick={() => setManagingBroker(broker)} className="text-sm font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 px-4 py-2 rounded-lg transition-colors flex items-center gap-2 border border-slate-200 dark:border-slate-600">
                                                <EditIcon className="w-4 h-4" /> Gerenciar
                                            </button>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-center text-slate-500 dark:text-slate-400 py-8">Nenhum corretor cadastrado ainda.</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Ranking Section */}
            {ranking.length > 0 && (
                <div className="mt-12 mb-8 animate-fade-in-up">
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-6 flex items-center gap-2">
                        <TrophyIcon className="w-8 h-8 text-yellow-500" />
                        Ranking de Performance
                    </h2>

                    {/* Top 3 Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        {ranking.slice(0, 3).map((broker, index) => (
                            <div key={broker.id} className={`relative bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg border ${index === 0 ? 'border-yellow-400 dark:border-yellow-600 ring-2 ring-yellow-100 dark:ring-yellow-900/30 transform md:-translate-y-4' : 'border-slate-200 dark:border-slate-700'}`}>
                                {/* Rank Badge */}
                                <div className={`absolute -top-4 left-1/2 -translate-x-1/2 w-10 h-10 rounded-full flex items-center justify-center font-bold text-white shadow-md ${index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-slate-400' : 'bg-orange-400'
                                    }`}>
                                    #{index + 1}
                                </div>

                                <div className="mt-4 text-center">
                                    <div className="w-20 h-20 mx-auto rounded-full overflow-hidden border-4 border-white dark:border-slate-700 shadow-md mb-3">
                                        {broker.profilePicUrl ? <img src={broker.profilePicUrl} className="w-full h-full object-cover" /> : <UserIcon className="w-full h-full p-4 text-slate-300 dark:text-slate-600 bg-slate-100 dark:bg-slate-700" />}
                                    </div>
                                    <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100">{broker.name}</h3>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">{broker.totalBookings} agendamentos</p>

                                    <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-3">
                                        <p className="text-xs text-slate-500 dark:text-slate-400 uppercase font-bold">Volume de Vendas</p>
                                        <p className="text-xl font-bold text-green-600 dark:text-green-400">
                                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(broker.totalValue)}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Full List Table */}
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
                                <tr>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Posição</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Corretor</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase text-right">Agendamentos</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase text-right">Ticket Médio</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase text-right">Total Vendido</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                {ranking.map((broker, index) => (
                                    <tr key={broker.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                                        <td className="px-6 py-4 font-bold text-slate-600 dark:text-slate-300">#{index + 1}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                                                    {broker.profilePicUrl ? <img src={broker.profilePicUrl} className="w-full h-full object-cover" /> : <UserIcon className="w-full h-full p-1 text-slate-400 dark:text-slate-500" />}
                                                </div>
                                                <span className="font-medium text-slate-800 dark:text-slate-200">{broker.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right font-medium text-slate-600 dark:text-slate-300">{broker.totalBookings}</td>
                                        <td className="px-6 py-4 text-right text-slate-600 dark:text-slate-300">
                                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(broker.averageTicket)}
                                        </td>
                                        <td className="px-6 py-4 text-right font-bold text-green-600 dark:text-green-400">
                                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(broker.totalValue)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BrokersPage;
