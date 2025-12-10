import React, { useState, useEffect } from 'react';
import { Network, Service, Client, NetworkPrice } from '../types';
import { networkService } from '../services/networkService';
import { getServices } from '../services/resourceService';
import * as clientService from '../services/clientService';
import {
    BuildingIcon,
    PlusIcon,
    EditIcon as PencilIcon,
    TrashIcon,
    UsersIcon,
    DollarSignIcon,
    XIcon,
    SaveIcon,
    SearchIcon,
    CheckCircleIcon as CheckIcon
} from './icons';
import { useToast } from '../contexts/ToastContext';

export function ManageNetworks() {
    const [networks, setNetworks] = useState<Network[]>([]);
    const [services, setServices] = useState<Service[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedNetwork, setSelectedNetwork] = useState<Network | null>(null);

    // States for the Modal
    const [activeTab, setActiveTab] = useState<'prices' | 'clients'>('prices');
    const [networkPrices, setNetworkPrices] = useState<NetworkPrice[]>([]);
    const [networkClients, setNetworkClients] = useState<Pick<Client, 'id' | 'name' | 'tradeName' | 'email'>[]>([]);
    const [allClients, setAllClients] = useState<Client[]>([]); // For adding new clients
    const [searchTerm, setSearchTerm] = useState('');

    // States for Create/Edit Network
    const [isEditMode, setIsEditMode] = useState(false);
    const [newNetworkName, setNewNetworkName] = useState('');
    const [newNetworkDesc, setNewNetworkDesc] = useState('');

    const { showToast } = useToast();

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [networksData, servicesData, clientsData] = await Promise.all([
                networkService.getAllNetworks(),
                getServices(),
                clientService.getClients()
            ]);
            setNetworks(networksData);
            setServices(servicesData);
            setAllClients(clientsData);
        } catch (error) {
            console.error('Error loading data:', error);
            showToast('Erro ao carregar dados.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateNetwork = async () => {
        if (!newNetworkName.trim()) return;
        try {
            await networkService.createNetwork({ name: newNetworkName, description: newNetworkDesc });
            showToast('Rede criada com sucesso!', 'success');
            setNewNetworkName('');
            setNewNetworkDesc('');
            setIsEditMode(false);
            loadData();
        } catch (error) {
            showToast('Erro ao criar rede.', 'error');
        }
    };

    const handleUpdateNetwork = async () => {
        if (!selectedNetwork || !newNetworkName.trim()) return;
        try {
            await networkService.updateNetwork(selectedNetwork.id, { name: newNetworkName, description: newNetworkDesc });
            showToast('Rede atualizada!', 'success');
            setIsEditMode(false);
            loadData();
        } catch (error) {
            showToast('Erro ao atualizar rede.', 'error');
        }
    };

    const handleDeleteNetwork = async (id: string) => {
        if (!confirm('Tem certeza? Isso removerá todos os preços e desvinculará as imobiliárias.')) return;
        try {
            await networkService.deleteNetwork(id);
            showToast('Rede excluída.', 'success');
            loadData();
            if (selectedNetwork?.id === id) closeModal();
        } catch (error) {
            showToast('Erro ao excluir rede.', 'error');
        }
    };

    const openModal = async (network: Network) => {
        setSelectedNetwork(network);
        setNewNetworkName(network.name);
        setNewNetworkDesc(network.description || '');
        setIsModalOpen(true);
        setActiveTab('prices');

        // Fetch details
        try {
            const [prices, clients] = await Promise.all([
                networkService.getNetworkPrices(network.id),
                networkService.getClientsInNetwork(network.id)
            ]);
            setNetworkPrices(prices);
            // Map to correct shape if necessary
            const mappedClients = clients.map((c: any) => ({
                id: c.id,
                name: c.name,
                tradeName: c.tradeName || c.trade_name, // Handle snake_case if coming raw from DB in networkService
                email: c.email
            }));
            setNetworkClients(mappedClients);
        } catch (error) {
            showToast('Erro ao carregar detalhes da rede.', 'error');
        }
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setSelectedNetwork(null);
        setIsEditMode(false);
    };

    const handlePriceChange = async (serviceId: string, newPrice: string) => {
        if (!selectedNetwork) return;
        const priceValue = parseFloat(newPrice);
        if (isNaN(priceValue)) return;

        try {
            const savedPrice = await networkService.upsertNetworkPrice({
                network_id: selectedNetwork.id,
                service_id: serviceId,
                price: priceValue
            });

            setNetworkPrices(prev => {
                const existing = prev.find(p => p.service_id === serviceId);
                if (existing) {
                    return prev.map(p => p.service_id === serviceId ? savedPrice : p);
                }
                return [...prev, savedPrice];
            });
            showToast('Preço salvo!', 'success');
        } catch (error) {
            showToast('Erro ao salvar preço.', 'error');
        }
    };

    const handleAddClient = async (clientId: string) => {
        if (!selectedNetwork) return;
        try {
            await networkService.addClientToNetwork(clientId, selectedNetwork.id);
            const client = allClients.find(c => c.id === clientId);
            if (client) {
                setNetworkClients(prev => [...prev, client]);
            }
            showToast('Imobiliária adicionada!', 'success');
        } catch (error) {
            showToast('Erro ao adicionar imobiliária.', 'error');
        }
    };

    const handleRemoveClient = async (clientId: string) => {
        try {
            await networkService.removeClientFromNetwork(clientId);
            setNetworkClients(prev => prev.filter(c => c.id !== clientId));
            showToast('Imobiliária removida!', 'success');
        } catch (error) {
            showToast('Erro ao remover imobiliária.', 'error');
        }
    };

    // Filter available clients to add (exclude those already in THIS network)
    const availableClients = allClients.filter(
        c => !networkClients.some(nc => nc.id === c.id) &&
            (c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (c.tradeName || '').toLowerCase().includes(searchTerm.toLowerCase()))
    ).slice(0, 10); // Limit to 10 for performance in dropdown

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800">Redes de Imobiliárias</h1>
                    <p className="text-slate-600 mt-1">Gerencie grupos e tabelas de preços especiais</p>
                </div>
                <button
                    onClick={() => {
                        setSelectedNetwork(null);
                        setNewNetworkName('');
                        setNewNetworkDesc('');
                        setIsEditMode(true);
                        setIsModalOpen(true);
                    }}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                >
                    <PlusIcon className="w-5 h-5" />
                    Nova Rede
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div></div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {networks.map(network => (
                        <div key={network.id} onClick={() => openModal(network)} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow cursor-pointer group">
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-3 bg-purple-100 rounded-lg text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                                    <BuildingIcon className="w-6 h-6" />
                                </div>
                            </div>
                            <h3 className="text-xl font-bold text-slate-800 mb-2">{network.name}</h3>
                            <p className="text-slate-500 text-sm mb-4 h-10 line-clamp-2">{network.description || 'Sem descrição'}</p>
                            <div className="flex items-center text-sm text-slate-500 font-medium">
                                Clique para configurar
                            </div>
                        </div>
                    ))}
                    {networks.length === 0 && (
                        <div className="col-span-full py-12 text-center text-slate-500">
                            Nenhuma rede cadastrada.
                        </div>
                    )}
                </div>
            )}

            {/* MODAL PRINCIPAL */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">

                        {/* Header Modal */}
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <div className="w-full mr-4">
                                {isEditMode ? (
                                    <div className="space-y-3 w-full">
                                        <input
                                            type="text"
                                            value={newNetworkName}
                                            onChange={e => setNewNetworkName(e.target.value)}
                                            placeholder="Nome da Rede"
                                            className="text-2xl font-bold text-slate-800 bg-transparent border-b-2 border-purple-200 focus:border-purple-600 focus:outline-none w-full placeholder:text-slate-300"
                                            autoFocus
                                        />
                                        <input
                                            type="text"
                                            value={newNetworkDesc}
                                            onChange={e => setNewNetworkDesc(e.target.value)}
                                            placeholder="Descrição (opcional)"
                                            className="text-sm text-slate-600 bg-transparent border-b border-slate-200 focus:border-purple-400 focus:outline-none w-full"
                                        />
                                    </div>
                                ) : (
                                    <>
                                        <h2 className="text-2xl font-bold text-slate-800">{selectedNetwork?.name}</h2>
                                        <p className="text-slate-500 text-sm">{selectedNetwork?.description}</p>
                                    </>
                                )}
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                {isEditMode ? (
                                    <button
                                        onClick={selectedNetwork ? handleUpdateNetwork : handleCreateNetwork}
                                        className="bg-green-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1 hover:bg-green-700"
                                    >
                                        <SaveIcon className="w-4 h-4" /> Salvar
                                    </button>
                                ) : (
                                    <>
                                        <button
                                            onClick={() => {
                                                setIsEditMode(true);
                                                setNewNetworkName(selectedNetwork!.name);
                                                setNewNetworkDesc(selectedNetwork!.description || '');
                                            }}
                                            className="text-slate-400 hover:text-purple-600 p-2 rounded-full hover:bg-purple-50"
                                            title="Editar informações"
                                        >
                                            <PencilIcon className="w-5 h-5" />
                                        </button>
                                        <button
                                            onClick={() => handleDeleteNetwork(selectedNetwork!.id)}
                                            className="text-slate-400 hover:text-red-600 p-2 rounded-full hover:bg-red-50"
                                            title="Excluir rede"
                                        >
                                            <TrashIcon className="w-5 h-5" />
                                        </button>
                                    </>
                                )}
                                <button onClick={closeModal} className="text-slate-400 hover:text-slate-600 p-2 ml-2">
                                    <XIcon className="w-6 h-6" />
                                </button>
                            </div>
                        </div>

                        {/* Content (Only show tabs if editing an existing network) */}
                        {selectedNetwork && !isEditMode && (
                            <>
                                {/* Tabs */}
                                <div className="flex border-b border-slate-200 px-6">
                                    <button
                                        onClick={() => setActiveTab('prices')}
                                        className={`pb-3 pt-4 px-4 font-medium text-sm transition-colors border-b-2 ${activeTab === 'prices' ? 'border-purple-600 text-purple-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                                    >
                                        <div className="flex items-center gap-2"><DollarSignIcon className="w-4 h-4" /> Tabela de Preços</div>
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('clients')}
                                        className={`pb-3 pt-4 px-4 font-medium text-sm transition-colors border-b-2 ${activeTab === 'clients' ? 'border-purple-600 text-purple-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                                    >
                                        <div className="flex items-center gap-2"><UsersIcon className="w-4 h-4" /> Imobiliárias Vinculadas</div>
                                    </button>
                                </div>

                                {/* Tab Content */}
                                <div className="flex-1 overflow-y-auto p-6 bg-slate-50">

                                    {/* PREÇOS */}
                                    {activeTab === 'prices' && (
                                        <div className="space-y-4">
                                            <div className="bg-blue-50 text-blue-700 p-4 rounded-lg text-sm mb-4">
                                                💡 Defina os preços especiais para esta rede. Se deixar em branco, será usado o preço padrão da tabela geral.
                                            </div>

                                            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                                                <table className="w-full text-left border-collapse">
                                                    <thead>
                                                        <tr className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold">
                                                            <th className="p-4 border-b border-slate-200">Serviço</th>
                                                            <th className="p-4 border-b border-slate-200 w-32">Preço Padrão</th>
                                                            <th className="p-4 border-b border-slate-200 w-40">Preço Rede</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-100">
                                                        {services.map(service => {
                                                            const networkPrice = networkPrices.find(np => np.service_id === service.id);
                                                            return (
                                                                <tr key={service.id} className="hover:bg-slate-50 transition-colors">
                                                                    <td className="p-4 text-slate-800 font-medium">{service.name}</td>
                                                                    <td className="p-4 text-slate-500">
                                                                        <span className="line-through text-xs mr-2"></span>
                                                                        R$ {service.price.toFixed(2)}
                                                                    </td>
                                                                    <td className="p-4">
                                                                        <div className="relative">
                                                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">R$</span>
                                                                            <input
                                                                                type="number"
                                                                                step="0.01"
                                                                                placeholder={service.price.toString()}
                                                                                defaultValue={networkPrice?.price || ''}
                                                                                onBlur={(e) => handlePriceChange(service.id, e.target.value)}
                                                                                className={`w-full pl-9 pr-3 py-1.5 rounded-lg border text-sm transition-all focus:ring-2 focus:ring-purple-200 focus:outline-none ${networkPrice ? 'border-purple-300 bg-purple-50 text-purple-700 font-semibold' : 'border-slate-200 text-slate-800'}`}
                                                                            />
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    )}

                                    {/* CLIENTES */}
                                    {activeTab === 'clients' && (
                                        <div className="space-y-6">
                                            {/* Search / Add */}
                                            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                                                <h4 className="text-sm font-semibold text-slate-700 mb-3">Adicionar Imobiliária à Rede</h4>
                                                <div className="relative">
                                                    <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                                    <input
                                                        type="text"
                                                        placeholder="Buscar imobiliária..."
                                                        value={searchTerm}
                                                        onChange={e => setSearchTerm(e.target.value)}
                                                        className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none transition-all"
                                                    />
                                                    {searchTerm && (
                                                        <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border border-slate-200 max-h-60 overflow-y-auto z-10">
                                                            {availableClients.length > 0 ? (
                                                                availableClients.map(client => (
                                                                    <button
                                                                        key={client.id}
                                                                        onClick={() => {
                                                                            handleAddClient(client.id);
                                                                            setSearchTerm('');
                                                                        }}
                                                                        className="w-full text-left px-4 py-3 hover:bg-slate-50 flex items-center justify-between group border-b border-slate-50 last:border-0"
                                                                    >
                                                                        <div>
                                                                            <div className="font-medium text-slate-800">{client.tradeName || client.name}</div>
                                                                            <div className="text-xs text-slate-500">{client.email}</div>
                                                                        </div>
                                                                        <PlusIcon className="w-4 h-4 text-slate-300 group-hover:text-purple-600" />
                                                                    </button>
                                                                ))
                                                            ) : (
                                                                <div className="p-4 text-center text-sm text-slate-400">Nenhuma imobiliária encontrada.</div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* List */}
                                            <div>
                                                <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                                                    Imobiliárias nesta Rede <span className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full text-xs">{networkClients.length}</span>
                                                </h4>

                                                {networkClients.length === 0 ? (
                                                    <div className="text-center py-8 text-slate-500 bg-slate-100 rounded-xl border border-dashed border-slate-300">
                                                        Nenhuma imobiliária vinculada ainda.
                                                    </div>
                                                ) : (
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                        {networkClients.map(client => (
                                                            <div key={client.id} className="bg-white p-3 rounded-lg border border-slate-200 flex justify-between items-center shadow-sm">
                                                                <div>
                                                                    <div className="font-medium text-slate-800 text-sm">{client.tradeName || client.name}</div>
                                                                </div>
                                                                <button
                                                                    onClick={() => handleRemoveClient(client.id)}
                                                                    className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-md transition-colors"
                                                                    title="Remover da rede"
                                                                >
                                                                    <XIcon className="w-4 h-4" />
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
