


import React, { useState, useMemo, useEffect } from 'react';
import { getClientById, addFunds, searchClients } from '../services/bookingService';
import { Client, WalletTransaction } from '../types';
import { User } from '../App';
import { WalletIcon, TrendingUpIcon, ArrowUpRightIcon, ArrowDownLeftIcon, SearchIcon, PlusIcon, DollarSignIcon, ClockIcon } from './icons';
import BuyCreditsModal from './BuyCreditsModal';

interface WalletPageProps {
    user: User;
}

const WalletPage: React.FC<WalletPageProps> = ({ user }) => {
    // If Admin, they can select a client. If Client, they are locked to themselves.
    const [selectedClientId, setSelectedClientId] = useState<string>(user.role === 'client' ? user.id : '');
    const [clients, setClients] = useState<Client[]>([]);
    const [selectedClient, setSelectedClient] = useState<Client | null>(null);

    // Search state for admin
    const [searchTerm, setSearchTerm] = useState('');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isSearching, setIsSearching] = useState(false);

    // For adding funds simulation (Admin/Manual)
    const [isAddFundsModalOpen, setIsAddFundsModalOpen] = useState(false);

    // For Client Pix Payment
    const [isBuyCreditsModalOpen, setIsBuyCreditsModalOpen] = useState(false);

    const [amountToAdd, setAmountToAdd] = useState('');
    const [transactionType, setTransactionType] = useState<'Credit' | 'Debit'>('Credit');
    const [observation, setObservation] = useState('');

    useEffect(() => {
        const fetchInitialData = async () => {
            if (user.role !== 'admin') {
                const client = await getClientById(user.id);
                if (client) setSelectedClient(client);
            }
        };
        fetchInitialData();
    }, [user]);

    // Server-side Search Effect
    useEffect(() => {
        if (user.role !== 'admin') return;

        const delayDebounceFn = setTimeout(async () => {
            if (searchTerm.trim()) {
                setIsSearching(true);
                try {
                    const { data } = await searchClients(searchTerm, 1, 10);
                    setClients(data);
                } catch (error) {
                    console.error("Error searching clients:", error);
                    setClients([]);
                } finally {
                    setIsSearching(false);
                }
            } else {
                setClients([]);
            }
        }, 300);

        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm, user.role]);

    useEffect(() => {
        const fetchSelectedClient = async () => {
            if (user.role === 'admin' && selectedClientId) {
                const client = await getClientById(selectedClientId);
                if (client) {
                    setSelectedClient(client);
                    // Do not update searchTerm here to avoid triggering search again or loop
                    // But we might want to keep the name in the box?
                    // Usually selecting sets the "value" of the input.
                    setSearchTerm(client.name);
                }
            }
        };
        fetchSelectedClient();
    }, [selectedClientId, user.role]);

    // Refresh data helper
    const refreshClientData = async () => {
        if (selectedClientId) {
            const updated = await getClientById(selectedClientId);
            if (updated) setSelectedClient({ ...updated }); // Force refresh
        } else if (user.role === 'client') {
            const updated = await getClientById(user.id);
            if (updated) setSelectedClient({ ...updated });
        }
    };

    const handleAddFunds = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedClient) return;
        const amount = parseFloat(amountToAdd.replace(',', '.'));
        if (isNaN(amount) || amount <= 0) {
            alert('Valor inválido');
            return;
        }
        if (!observation.trim()) {
            alert('Por favor, adicione uma observação.');
            return;
        }

        await addFunds(selectedClient.id, amount, transactionType, observation, user.name);
        alert(`Sucesso! Transação realizada.`);
        setAmountToAdd('');
        setObservation('');
        setTransactionType('Credit');
        setIsAddFundsModalOpen(false);
        await refreshClientData();
    };

    const handleAddFundsClick = () => {
        if (user.role === 'client') {
            setIsBuyCreditsModalOpen(true);
        } else {
            setIsAddFundsModalOpen(true);
        }
    };

    // Sort transactions by date desc
    const sortedTransactions = useMemo(() => {
        if (!selectedClient || !selectedClient.transactions) return [];
        return [...selectedClient.transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [selectedClient]);

    const handleClientSelect = (client: Client) => {
        setSelectedClientId(client.id);
        setSearchTerm(client.name);
        setIsDropdownOpen(false);
    };

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(e.target.value);
        setIsDropdownOpen(true);
        if (e.target.value === '') {
            setSelectedClientId('');
            setSelectedClient(null);
            setClients([]);
        }
    };

    return (
        <div className="space-y-8 animate-fade-in">
            <header>
                <h1 className="text-3xl font-bold text-slate-800">Carteira Digital</h1>
                <p className="text-slate-500">Gerencie saldo e visualize o histórico de transações.</p>
            </header>

            {/* Admin Selection Area */}
            {user.role === 'admin' && (
                <div className="bg-white p-6 rounded-xl shadow-lg border border-slate-200">
                    <h3 className="text-lg font-bold text-slate-700 mb-4">Selecionar Cliente</h3>
                    <div className="relative max-w-md">
                        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 pointer-events-none" />
                        <input
                            type="text"
                            className="w-full pl-10 p-2 border border-slate-300 rounded-lg shadow-sm focus:ring-purple-500 focus:border-purple-500"
                            placeholder="Buscar cliente por nome..."
                            value={searchTerm}
                            onChange={handleSearchChange}
                            onFocus={() => setIsDropdownOpen(true)}
                        />
                        {isDropdownOpen && searchTerm && (
                            <ul className="absolute z-10 w-full bg-white border border-slate-300 rounded-lg mt-1 max-h-60 overflow-y-auto shadow-lg">
                                {isSearching ? (
                                    <li className="p-3 text-sm text-slate-500 text-center">Buscando...</li>
                                ) : clients.length > 0 ? (
                                    clients.map(c => (
                                        <li key={c.id}>
                                            <button
                                                className="w-full text-left p-3 hover:bg-slate-100 flex justify-between items-center"
                                                onClick={() => handleClientSelect(c)}
                                            >
                                                <div>
                                                    <span className="font-semibold block">{c.name}</span>
                                                    <span className="text-xs text-slate-500">Saldo: R$ {c.balance.toFixed(2)}</span>
                                                </div>
                                                {c.paymentType === 'Pré-pago' ? (
                                                    <span className="flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full border border-green-200">
                                                        <DollarSignIcon className="w-3 h-3" /> Pré
                                                    </span>
                                                ) : (
                                                    <span className="flex items-center gap-1 text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full border border-amber-200">
                                                        <ClockIcon className="w-3 h-3" /> Pós
                                                    </span>
                                                )}
                                            </button>
                                        </li>
                                    ))
                                ) : (
                                    <li className="p-3 text-sm text-slate-500 text-center">Nenhum cliente encontrado.</li>
                                )}
                            </ul>
                        )}
                    </div>
                </div>
            )}

            {selectedClient ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Balance Card */}
                    <div className="lg:col-span-1">
                        <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-6 rounded-xl shadow-xl text-white relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-10">
                                <WalletIcon className="w-32 h-32" />
                            </div>
                            <p className="text-slate-400 font-medium mb-1">Saldo Atual</p>
                            <h2 className={`text-4xl font-bold mb-6 ${selectedClient.balance < 0 ? 'text-red-400' : 'text-green-400'}`}>
                                R$ {selectedClient.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </h2>

                            <div className="flex items-center justify-between text-sm text-slate-300 mb-6">
                                <span>Cliente: {selectedClient.name}</span>
                                <div className="flex items-center gap-2">
                                    {selectedClient.paymentType === 'Pré-pago' ? (
                                        <span className="flex items-center gap-1 px-2 py-1 bg-green-900/50 border border-green-700 text-green-300 rounded text-xs">
                                            <DollarSignIcon className="w-3 h-3" /> Pré-pago
                                        </span>
                                    ) : (
                                        <span className="flex items-center gap-1 px-2 py-1 bg-amber-900/50 border border-amber-700 text-amber-300 rounded text-xs">
                                            <ClockIcon className="w-3 h-3" /> Pós-pago
                                        </span>
                                    )}
                                </div>
                            </div>

                            <button
                                onClick={handleAddFundsClick}
                                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                            >
                                <PlusIcon className="w-5 h-5" /> Adicionar Fundos
                            </button>
                        </div>

                        {selectedClient.balance < 0 && (
                            <div className="mt-4 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-r-lg text-sm">
                                <strong>Atenção:</strong> O saldo está negativo. Por favor, realize uma recarga para regularizar a conta.
                            </div>
                        )}
                    </div>

                    {/* Transaction History */}
                    <div className="lg:col-span-2 bg-white rounded-xl shadow-lg border border-slate-200 flex flex-col">
                        <div className="p-6 border-b border-slate-200">
                            <h3 className="text-xl font-bold text-slate-700 flex items-center gap-2">
                                <TrendingUpIcon className="w-6 h-6 text-purple-600" /> Histórico de Transações
                            </h3>
                        </div>
                        <div className="flex-1 overflow-auto max-h-[500px]">
                            {sortedTransactions.length > 0 ? (
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-slate-50 text-slate-500 font-medium">
                                        <tr>
                                            <th className="p-4">Data</th>
                                            <th className="p-4">Descrição</th>
                                            <th className="p-4 text-right">Valor</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {sortedTransactions.map((tx) => (
                                            <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                                                <td className="p-4 text-slate-600">
                                                    {new Date(tx.date).toLocaleDateString('pt-BR')} <span className="text-xs text-slate-400">{new Date(tx.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                                                </td>
                                                <td className="p-4 font-medium text-slate-800">
                                                    <div className="flex items-center gap-2">
                                                        <div className={`p-1.5 rounded-full ${tx.type === 'Credit' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                                            {tx.type === 'Credit' ? <ArrowDownLeftIcon className="w-3 h-3" /> : <ArrowUpRightIcon className="w-3 h-3" />}
                                                        </div>
                                                        {tx.description}
                                                    </div>
                                                </td>
                                                <td className={`p-4 text-right font-bold ${tx.type === 'Credit' ? 'text-green-600' : 'text-slate-700'}`}>
                                                    {tx.type === 'Credit' ? '+' : '-'} R$ {tx.amount.toFixed(2)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <div className="p-10 text-center text-slate-500">
                                    Nenhuma transação registrada.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="text-center py-20 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                    <p className="text-slate-500">Selecione um cliente para visualizar a carteira.</p>
                </div>
            )}

            {/* Manage Funds Modal (Admin/Manual) */}
            {isAddFundsModalOpen && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-fade-in-fast p-4">
                    <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md">
                        <h3 className="text-xl font-bold text-slate-800 mb-4">Gerenciar Saldo</h3>
                        <form onSubmit={handleAddFunds}>
                            <div className="mb-4 flex gap-4">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="type"
                                        checked={transactionType === 'Credit'}
                                        onChange={() => setTransactionType('Credit')}
                                        className="text-purple-600 focus:ring-purple-500"
                                    />
                                    <span className="text-slate-700 font-medium">Adicionar (Crédito)</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="type"
                                        checked={transactionType === 'Debit'}
                                        onChange={() => setTransactionType('Debit')}
                                        className="text-red-600 focus:ring-red-500"
                                    />
                                    <span className="text-slate-700 font-medium">Remover (Débito)</span>
                                </label>
                            </div>

                            <label className="block text-sm font-medium text-slate-700 mb-1">Valor (R$)</label>
                            <input
                                type="number"
                                step="0.01"
                                value={amountToAdd}
                                onChange={e => setAmountToAdd(e.target.value)}
                                className="w-full p-3 border border-slate-300 rounded-lg mb-4 focus:ring-purple-500 focus:border-purple-500 text-lg font-bold"
                                placeholder="0,00"
                                autoFocus
                                required
                            />

                            <label className="block text-sm font-medium text-slate-700 mb-1">Observação (Obrigatório)</label>
                            <textarea
                                value={observation}
                                onChange={e => setObservation(e.target.value)}
                                className="w-full p-3 border border-slate-300 rounded-lg mb-6 focus:ring-purple-500 focus:border-purple-500"
                                placeholder="Ex: Ajuste referente ao reembolso..."
                                rows={3}
                                required
                            />

                            <div className="flex justify-end gap-3">
                                <button type="button" onClick={() => setIsAddFundsModalOpen(false)} className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 font-semibold">Cancelar</button>
                                <button type="submit" className={`px-4 py-2 text-white rounded-lg font-semibold ${transactionType === 'Credit' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}>
                                    {transactionType === 'Credit' ? 'Adicionar' : 'Remover'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Client Buy Credits Modal */}
            {isBuyCreditsModalOpen && (
                <BuyCreditsModal
                    user={user}
                    onClose={() => setIsBuyCreditsModalOpen(false)}
                    onSuccess={refreshClientData}
                />
            )}
        </div>
    );
};

export default WalletPage;
