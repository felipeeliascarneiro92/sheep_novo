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
    CheckCircleIcon as CheckIcon,
    CalendarIcon
} from './icons';
import { useToast } from '../contexts/ToastContext';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function ManageNetworks() {
    const [networks, setNetworks] = useState<(Network & {
        clientCount?: number;
        activeCount?: number;
        attentionCount?: number;
        criticalCount?: number;
        noBookingCount?: number;
        targetClients?: number;
    })[]>([]);
    const [services, setServices] = useState<Service[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedNetwork, setSelectedNetwork] = useState<Network | null>(null);

    // States for the Modal
    const [activeTab, setActiveTab] = useState<'prices' | 'clients'>('prices');
    const [networkPrices, setNetworkPrices] = useState<NetworkPrice[]>([]);
    const [networkClients, setNetworkClients] = useState<(Pick<Client, 'id' | 'name' | 'tradeName' | 'email'> & { lastBookingDate?: string })[]>([]);

    // Server-side search states
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState<Client[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    // States for Create/Edit Network
    const [isEditMode, setIsEditMode] = useState(false);
    const [newNetworkName, setNewNetworkName] = useState('');
    const [newNetworkDesc, setNewNetworkDesc] = useState('');
    const [newNetworkTarget, setNewNetworkTarget] = useState(''); // New target clients state

    const { showToast } = useToast();

    // Debounced Search Effect
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (searchTerm.length >= 2) {
                setIsSearching(true);
                try {
                    const { data } = await clientService.searchClients(searchTerm, 1, 20); // Limit to 20 results
                    setSearchResults(data);
                } catch (error) {
                    console.error("Error searching clients:", error);
                } finally {
                    setIsSearching(false);
                }
            } else {
                setSearchResults([]);
            }
        }, 500); // 500ms delay

        return () => clearTimeout(timer);
    }, [searchTerm]);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [networksData, servicesData] = await Promise.all([
                networkService.getAllNetworks(),
                getServices()
            ]);
            setNetworks(networksData);
            setServices(servicesData);
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
            await networkService.createNetwork({
                name: newNetworkName,
                description: newNetworkDesc,
                target_clients: parseInt(newNetworkTarget) || 0
            });
            showToast('Rede criada com sucesso!', 'success');
            setNewNetworkName('');
            setNewNetworkDesc('');
            setNewNetworkTarget('');
            setIsEditMode(false);
            loadData();
        } catch (error) {
            showToast('Erro ao criar rede.', 'error');
        }
    };

    const handleUpdateNetwork = async () => {
        if (!selectedNetwork || !newNetworkName.trim()) return;
        try {
            await networkService.updateNetwork(selectedNetwork.id, {
                name: newNetworkName,
                description: newNetworkDesc,
                target_clients: parseInt(newNetworkTarget) || 0
            });
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

    const openModal = async (network: Network & { target_clients?: number }) => {
        setSelectedNetwork(network);
        setNewNetworkName(network.name);
        setNewNetworkDesc(network.description || '');
        setNewNetworkTarget(network.target_clients?.toString() || '');
        setIsModalOpen(true);
        setActiveTab('prices');

        // Reset state before fetching to avoid stale data
        setNetworkClients([]);
        setNetworkPrices([]);
        setSearchTerm('');
        setSearchResults([]);

        // Fetch details
        try {
            const [prices, clients] = await Promise.all([
                networkService.getNetworkPrices(network.id),
                networkService.getClientsInNetworkWithStats(network.id)
            ]);
            setNetworkPrices(prices);

            // Map to correct shape
            const mappedClients = clients.map((c: any) => ({
                id: c.id,
                name: c.name,
                tradeName: c.tradeName || c.trade_name,
                email: c.email,
                lastBookingDate: c.lastBookingDate
            }));
            setNetworkClients(mappedClients);
        } catch (error: any) {
            console.error('Erro ao carregar detalhes da rede:', error);
            // Check if error is 400 - Bad Request
            if (error.status === 400 || (error.code && error.code.startsWith('PGRST'))) {
                showToast('Erro de conexão com banco de dados (Coluna faltando?).', 'error');
            } else {
                showToast('Erro ao carregar detalhes da rede.', 'error');
            }
        }
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setSelectedNetwork(null);
        setIsEditMode(false);
        setNewNetworkTarget('');
        // Clear state on close too
        setNetworkClients([]);
        setNetworkPrices([]);
        setSearchTerm('');
        setSearchResults([]);
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
            // We need to get the client details from search results to add to the local list
            const clientToAdd = searchResults.find(c => c.id === clientId);
            if (clientToAdd) {
                setNetworkClients(prev => [...prev, {
                    id: clientToAdd.id,
                    name: clientToAdd.name,
                    tradeName: clientToAdd.tradeName,
                    email: clientToAdd.email,
                    lastBookingDate: undefined
                }]);
                // Update global count locally
                setNetworks(prev => prev.map(n => n.id === selectedNetwork.id ? { ...n, clientCount: (n.clientCount || 0) + 1 } : n));

                setSearchTerm('');
                setSearchResults([]);
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
            // Update global count locally
            setNetworks(prev => prev.map(n => n.id === selectedNetwork?.id ? { ...n, clientCount: Math.max((n.clientCount || 0) - 1, 0) } : n));
            showToast('Imobiliária removida!', 'success');
        } catch (error) {
            showToast('Erro ao remover imobiliária.', 'error');
        }
    };

    // Filter results to exclude those already in the network
    const filteredSearchResults = searchResults.filter(
        c => !networkClients.some(nc => nc.id === c.id)
    );

    const getRecencyBadge = (date?: string) => {
        if (!date) return <span className="bg-slate-100 text-slate-500 text-xs px-2 py-1 rounded-full">Sem agendamentos</span>;

        const days = Math.floor((new Date().getTime() - new Date(date).getTime()) / (1000 * 3600 * 24));

        if (days < 30) return <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full font-medium">Ativo ({days}d)</span>;
        if (days < 60) return <span className="bg-yellow-100 text-yellow-700 text-xs px-2 py-1 rounded-full font-medium">Inativo ({days}d)</span>;
        return <span className="bg-red-100 text-red-700 text-xs px-2 py-1 rounded-full font-medium">Crítico ({days}d)</span>;
    };

    // Helper to render the progress bar
    const renderNetworkProgressBar = (network: Network & {
        clientCount?: number;
        activeCount?: number;
        attentionCount?: number;
        criticalCount?: number;
        noBookingCount?: number;
        targetClients?: number;
    }) => {
        const target = network.targetClients || 0;
        const currentTotal = network.clientCount || 0;

        // Safety check: if we have clients but no stats (active/critical etc are all undefined/0), 
        // it likely means the migration hasn't run or RPC failed. 
        // In this case, show the simple badge to avoid showing "0 Active, 0 Critical" when there are actually 50 clients.
        const statsSum = (network.activeCount || 0) + (network.attentionCount || 0) + (network.criticalCount || 0) + (network.noBookingCount || 0);
        const hasStats = statsSum > 0 || currentTotal === 0;

        if (!hasStats && currentTotal > 0) {
            return (
                <div className="mb-4">
                    <div className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1 w-fit" title="Estatísticas indisponíveis (verifique banco de dados)">
                        <UsersIcon className="w-3 h-3" />
                        {currentTotal} imobiliárias
                    </div>
                </div>
            );
        }

        // If no clients and no target, show simple empty state
        if (currentTotal === 0 && target === 0) {
            return (
                <div className="mb-4">
                    <div className="bg-slate-100 text-slate-400 px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1 w-fit">
                        <UsersIcon className="w-3 h-3" />
                        Sem imobiliárias
                    </div>
                </div>
            );
        }

        // Calculation Base: Target or Total?
        const base = target > 0 ? target : currentTotal;
        const isTargetBased = target > 0;

        // Calculate percentages
        const activePct = Math.min(((network.activeCount || 0) / base) * 100, 100);
        const attentionPct = Math.min(((network.attentionCount || 0) / base) * 100, 100);
        const criticalPct = Math.min(((network.criticalCount || 0) / base) * 100, 100);
        const noBoookingPct = Math.min(((network.noBookingCount || 0) / base) * 100, 100);

        return (
            <div className="w-full space-y-2 mb-4">
                <div className="flex justify-between items-center text-xs mb-1">
                    <span className="font-semibold text-slate-700">
                        {currentTotal} {isTargetBased ? `/ ${target}` : ''} imobiliárias
                    </span>
                    {isTargetBased && (
                        <span className="text-slate-500">{Math.round((currentTotal / target) * 100)}% da meta</span>
                    )}
                </div>

                {/* Progress Bar Container */}
                <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden flex">
                    {(network.activeCount || 0) > 0 && (
                        <div style={{ width: `${activePct}%` }} className="bg-green-500 h-full" title={`Ativas: ${network.activeCount}`} />
                    )}
                    {(network.attentionCount || 0) > 0 && (
                        <div style={{ width: `${attentionPct}%` }} className="bg-yellow-500 h-full" title={`Inativas: ${network.attentionCount}`} />
                    )}
                    {(network.criticalCount || 0) > 0 && (
                        <div style={{ width: `${criticalPct}%` }} className="bg-red-500 h-full" title={`Críticas: ${network.criticalCount}`} />
                    )}
                    {(network.noBookingCount || 0) > 0 && (
                        <div style={{ width: `${noBoookingPct}%` }} className="bg-slate-400 h-full" title={`Sem Agendamento: ${network.noBookingCount}`} />
                    )}
                </div>

                {/* Legend / Stats */}
                <div className="flex gap-2 text-[10px] text-slate-500 flex-wrap">
                    {(network.activeCount || 0) > 0 && <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-green-500"></div> {network.activeCount}</div>}
                    {(network.attentionCount || 0) > 0 && <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-yellow-500"></div> {network.attentionCount}</div>}
                    {(network.criticalCount || 0) > 0 && <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-red-500"></div> {network.criticalCount}</div>}
                    {(network.noBookingCount || 0) > 0 && <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-slate-400"></div> {network.noBookingCount}</div>}

                    {isTargetBased && (
                        <div className="flex items-center gap-1 ml-auto text-slate-400 font-medium">Faltam: {Math.max(0, target - currentTotal)}</div>
                    )}
                </div>
            </div>
        );
    };

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
                        setNewNetworkTarget('');
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
                        <div key={network.id} onClick={() => openModal(network)} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow cursor-pointer group relative">
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-3 bg-purple-100 rounded-lg text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                                    <BuildingIcon className="w-6 h-6" />
                                </div>
                            </div>

                            <h3 className="text-xl font-bold text-slate-800 mb-2">{network.name}</h3>
                            <p className="text-slate-500 text-sm mb-4 h-10 line-clamp-2">{network.description || 'Sem descrição'}</p>

                            {/* Always try to render stats/progress bar */}
                            {renderNetworkProgressBar(network)}

                            <div className="flex items-center text-sm text-slate-500 font-medium border-t border-slate-100 pt-4 mt-2">
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
                                        <div className="flex gap-4">
                                            <input
                                                type="text"
                                                value={newNetworkDesc}
                                                onChange={e => setNewNetworkDesc(e.target.value)}
                                                placeholder="Descrição (opcional)"
                                                className="text-sm text-slate-600 bg-transparent border-b border-slate-200 focus:border-purple-400 focus:outline-none w-full"
                                            />
                                            <div className="w-48 shrink-0 relative">
                                                <input
                                                    type="number"
                                                    value={newNetworkTarget}
                                                    onChange={e => setNewNetworkTarget(e.target.value)}
                                                    placeholder="Meta de Imobiliárias"
                                                    className="text-sm text-slate-600 bg-transparent border-b border-slate-200 focus:border-purple-400 focus:outline-none w-full pl-7"
                                                />
                                                <UsersIcon className="w-4 h-4 text-slate-400 absolute left-0 top-0.5" />
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <div className="flex items-center gap-3">
                                            <h2 className="text-2xl font-bold text-slate-800">{selectedNetwork?.name}</h2>
                                            {selectedNetwork?.target_clients && (
                                                <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium border border-purple-200">
                                                    Meta: {selectedNetwork.target_clients}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-slate-500 text-sm mt-1">{selectedNetwork?.description}</p>
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
                                                setNewNetworkTarget(selectedNetwork!.target_clients?.toString() || '');
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
                                                        placeholder="Buscar imobiliária por nome, telefone ou email..."
                                                        value={searchTerm}
                                                        onChange={e => setSearchTerm(e.target.value)}
                                                        className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none transition-all"
                                                    />
                                                    {searchTerm && (
                                                        <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border border-slate-200 max-h-60 overflow-y-auto z-10">
                                                            {isSearching ? (
                                                                <div className="p-4 text-center text-sm text-slate-400 flex items-center justify-center gap-2">
                                                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600"></div> Buscando...
                                                                </div>
                                                            ) : filteredSearchResults.length > 0 ? (
                                                                filteredSearchResults.map(client => (
                                                                    <button
                                                                        key={client.id}
                                                                        onClick={() => {
                                                                            handleAddClient(client.id);
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
                                                                <div className="p-4 text-center text-sm text-slate-400">
                                                                    {searchTerm.length < 2 ? 'Digite pelo menos 2 caracteres' : 'Nenhuma imobiliária encontrada.'}
                                                                </div>
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
                                                    <div className="grid grid-cols-1 gap-3">
                                                        {networkClients.map(client => (
                                                            <div key={client.id} className="bg-white p-4 rounded-lg border border-slate-200 flex justify-between items-center shadow-sm hover:shadow-md transition-shadow">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="flex flex-col">
                                                                        <div className="font-medium text-slate-800 text-sm flex items-center gap-2">
                                                                            {client.tradeName || client.name}
                                                                            {getRecencyBadge(client.lastBookingDate)}
                                                                        </div>
                                                                        <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                                                                            {client.email}
                                                                            {client.lastBookingDate && (
                                                                                <span className="text-slate-400 border-l border-slate-300 pl-2 ml-1">
                                                                                    Último pedido: {formatDistanceToNow(parseISO(client.lastBookingDate), { locale: ptBR, addSuffix: true })}
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    </div>
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
