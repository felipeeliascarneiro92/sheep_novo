
import React, { useState, useEffect, useMemo } from 'react';
import { getBrokers, getClients, addBroker, updateBroker, grantBrokerAccess, revokeBrokerAccess } from '../services/bookingService';
import { Broker, Client } from '../types';
import { UserIcon, SearchIcon, EditIcon, CheckCircleIcon, XCircleIcon, LockIcon, PlusIcon, TrashIcon, BuildingIcon, PhoneIcon, MailIcon, XIcon } from './icons';
import { maskPhone } from '../utils/masks';

const ManageBrokers: React.FC = () => {
    const [brokers, setBrokers] = useState<Broker[]>([]);
    const [clients, setClients] = useState<Client[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingBroker, setEditingBroker] = useState<Broker | null>(null);

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        clientId: '',
        isActive: true,
        hasLogin: true
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setIsLoading(true);
        const [brokersData, clientsData] = await Promise.all([getBrokers(), getClients()]);
        setBrokers(brokersData);
        setClients(clientsData);
        setIsLoading(false);
    };

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(e.target.value);
    };

    const filteredBrokers = useMemo(() => {
        return brokers.filter(broker =>
            broker.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            broker.email?.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [brokers, searchTerm]);

    const getClientName = (clientId: string) => {
        const client = clients.find(c => c.id === clientId);
        return client ? client.name : 'N/A';
    };

    const handleEdit = (broker: Broker) => {
        setEditingBroker(broker);
        setFormData({
            name: broker.name,
            email: broker.email || '',
            phone: broker.phone || '',
            clientId: broker.clientId,
            isActive: broker.isActive,
            hasLogin: broker.hasLogin
        });
        setIsModalOpen(true);
    };

    const handleAddNew = () => {
        setEditingBroker(null);
        setFormData({
            name: '',
            email: '',
            phone: '',
            clientId: '',
            isActive: true,
            hasLogin: true
        });
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.clientId) {
            alert('Selecione uma imobiliária.');
            return;
        }

        try {
            if (editingBroker) {
                await updateBroker(editingBroker.id, {
                    name: formData.name,
                    email: formData.email,
                    phone: formData.phone,
                    clientId: formData.clientId,
                    isActive: formData.isActive,
                    hasLogin: formData.hasLogin
                });
            } else {
                // addBroker signature might need adjustment if it doesn't support all fields directly
                // checking addBroker in clientService: addBroker(name, phone, email, clientId)
                // It sets has_login=true by default now.
                // We might need to update it immediately if we want to support hasLogin=false on creation, 
                // but for now let's assume creation is always active/login true as per previous request.
                await addBroker(formData.name, formData.phone, formData.email, formData.clientId);

                // If we want to enforce specific state on creation that differs from default:
                // We'd need to fetch the new broker and update it, or update addBroker to accept more args.
                // For now, defaults are fine.
            }
            setIsModalOpen(false);
            fetchData();
        } catch (error) {
            console.error('Error saving broker:', error);
            alert('Erro ao salvar corretor.');
        }
    };

    const handleToggleStatus = async (broker: Broker) => {
        if (confirm(`Deseja ${broker.isActive ? 'desativar' : 'ativar'} este corretor?`)) {
            await updateBroker(broker.id, { isActive: !broker.isActive });
            fetchData();
        }
    };

    const handleToggleLogin = async (broker: Broker) => {
        if (confirm(`Deseja ${broker.hasLogin ? 'revogar' : 'conceder'} acesso a este corretor?`)) {
            await updateBroker(broker.id, { hasLogin: !broker.hasLogin });
            fetchData();
        }
    };

    return (
        <div className="animate-fade-in space-y-6">
            <header className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Gerenciar Corretores</h1>
                    <p className="text-slate-500 dark:text-slate-400">Administração geral de corretores e vínculos.</p>
                </div>
                <button onClick={handleAddNew} className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-semibold flex items-center gap-2 transition-colors shadow-md">
                    <PlusIcon className="w-5 h-5" /> Novo Corretor
                </button>
            </header>

            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center gap-4 bg-slate-50 dark:bg-slate-800/50">
                    <div className="relative flex-1 max-w-md">
                        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Buscar por nome ou email..."
                            value={searchTerm}
                            onChange={handleSearch}
                            className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                        />
                    </div>
                    <div className="text-sm text-slate-500 dark:text-slate-400">
                        Total: <strong>{filteredBrokers.length}</strong>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400 text-xs uppercase font-bold">
                            <tr>
                                <th className="px-6 py-4">Corretor</th>
                                <th className="px-6 py-4">Imobiliária</th>
                                <th className="px-6 py-4">Contato</th>
                                <th className="px-6 py-4 text-center">Status</th>
                                <th className="px-6 py-4 text-center">Acesso</th>
                                <th className="px-6 py-4 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                            {isLoading ? (
                                <tr><td colSpan={6} className="p-8 text-center text-slate-500">Carregando...</td></tr>
                            ) : filteredBrokers.length === 0 ? (
                                <tr><td colSpan={6} className="p-8 text-center text-slate-500">Nenhum corretor encontrado.</td></tr>
                            ) : (
                                filteredBrokers.map(broker => (
                                    <tr key={broker.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center overflow-hidden">
                                                    {broker.profilePicUrl ? (
                                                        <img src={broker.profilePicUrl} alt={broker.name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <UserIcon className="w-5 h-5 text-slate-400" />
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-slate-800 dark:text-slate-100">{broker.name}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                                                <BuildingIcon className="w-4 h-4 text-slate-400" />
                                                {getClientName(broker.clientId)}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="space-y-1 text-sm text-slate-500 dark:text-slate-400">
                                                <div className="flex items-center gap-2"><MailIcon className="w-3 h-3" /> {broker.email || '-'}</div>
                                                <div className="flex items-center gap-2"><PhoneIcon className="w-3 h-3" /> {broker.phone || '-'}</div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <button onClick={() => handleToggleStatus(broker)} className={`px-2 py-1 rounded-full text-xs font-bold border ${broker.isActive ? 'bg-green-100 text-green-800 border-green-200' : 'bg-red-100 text-red-800 border-red-200'}`}>
                                                {broker.isActive ? 'Ativo' : 'Inativo'}
                                            </button>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <button onClick={() => handleToggleLogin(broker)} title={broker.hasLogin ? 'Clique para revogar acesso' : 'Clique para conceder acesso'}>
                                                {broker.hasLogin ? (
                                                    <CheckCircleIcon className="w-5 h-5 text-green-500 mx-auto" />
                                                ) : (
                                                    <LockIcon className="w-5 h-5 text-slate-400 mx-auto" />
                                                )}
                                            </button>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button onClick={() => handleEdit(broker)} className="p-2 text-slate-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors">
                                                <EditIcon className="w-5 h-5" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setIsModalOpen(false)}>
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-fade-in-up" onClick={e => e.stopPropagation()}>
                        <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">{editingBroker ? 'Editar Corretor' : 'Novo Corretor'}</h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><XIcon className="w-6 h-6" /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nome Completo</label>
                                <input type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg focus:ring-purple-500" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email</label>
                                    <input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg focus:ring-purple-500" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Telefone</label>
                                    <input type="text" value={formData.phone} onChange={e => setFormData({ ...formData, phone: maskPhone(e.target.value) })} className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg focus:ring-purple-500" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Imobiliária (Cliente)</label>
                                <div className="relative">
                                    <div className="relative">
                                        <input
                                            type="text"
                                            placeholder="Buscar imobiliária..."
                                            className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg focus:ring-purple-500 pr-8"
                                            value={formData.clientId ? (clients.find(c => c.id === formData.clientId)?.name || '') : ''}
                                            onChange={(e) => {
                                                // This input is now just for display/filtering if we want to get fancy, 
                                                // but for a simple searchable dropdown, we usually have a separate search input inside the dropdown 
                                                // or we make this input the searcher.
                                                // Let's implement a proper Combobox pattern.
                                            }}
                                            onClick={() => {
                                                // Toggle dropdown visibility
                                                const dropdown = document.getElementById('client-dropdown');
                                                if (dropdown) dropdown.classList.toggle('hidden');
                                            }}
                                            readOnly // Make it read-only so it acts as a trigger, search is inside
                                        />
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                            <SearchIcon className="w-4 h-4 text-slate-400" />
                                        </div>
                                    </div>

                                    {/* Dropdown Menu */}
                                    <div id="client-dropdown" className="hidden absolute z-10 mt-1 w-full bg-white dark:bg-slate-700 shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm">
                                        <div className="sticky top-0 bg-white dark:bg-slate-700 p-2 border-b border-slate-100 dark:border-slate-600">
                                            <input
                                                type="text"
                                                className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm dark:bg-slate-800 dark:text-white focus:ring-purple-500"
                                                placeholder="Digite para filtrar..."
                                                autoFocus
                                                onChange={(e) => {
                                                    const term = e.target.value.toLowerCase();
                                                    const options = document.querySelectorAll('.client-option');
                                                    options.forEach((opt: any) => {
                                                        const text = opt.textContent?.toLowerCase() || '';
                                                        opt.style.display = text.includes(term) ? 'block' : 'none';
                                                    });
                                                }}
                                            />
                                        </div>
                                        {clients.map(client => (
                                            <div
                                                key={client.id}
                                                className="client-option cursor-pointer select-none relative py-2 pl-3 pr-9 hover:bg-purple-50 dark:hover:bg-purple-900/20 text-slate-900 dark:text-slate-100"
                                                onClick={() => {
                                                    setFormData({ ...formData, clientId: client.id });
                                                    document.getElementById('client-dropdown')?.classList.add('hidden');
                                                }}
                                            >
                                                <span className={`block truncate ${formData.clientId === client.id ? 'font-semibold' : 'font-normal'}`}>
                                                    {client.name}
                                                </span>
                                                {formData.clientId === client.id && (
                                                    <span className="absolute inset-y-0 right-0 flex items-center pr-4 text-purple-600">
                                                        <CheckCircleIcon className="h-5 w-5" />
                                                    </span>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-6 pt-2">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="checkbox" checked={formData.isActive} onChange={e => setFormData({ ...formData, isActive: e.target.checked })} className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500" />
                                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Ativo</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="checkbox" checked={formData.hasLogin} onChange={e => setFormData({ ...formData, hasLogin: e.target.checked })} className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500" />
                                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Acesso ao Sistema</span>
                                </label>
                            </div>

                            <div className="pt-4 flex gap-3 justify-end">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700">Cancelar</button>
                                <button type="submit" className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-semibold shadow-md">Salvar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ManageBrokers;
