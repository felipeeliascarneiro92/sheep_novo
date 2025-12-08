import React, { useState, useEffect, useMemo } from 'react';
import { getServices, getClientById, createEditingRequest, getEditingRequests, uploadCreativeStudioFile } from '../services/bookingService';
import { Service, EditingRequestItem, EditingRequest, EditingStatus } from '../types';
import { User } from '../App';
import { WandIcon, UploadCloudIcon, XCircleIcon, CheckCircleIcon, DollarSignIcon, LoaderIcon, ImagePlusIcon, LayersIcon, ClockIcon, DownloadIcon, PlusIcon } from './icons';

interface CreativeStudioPageProps {
    user: User;
    onSuccess: () => void;
}

const statusStyles: Record<EditingStatus, string> = {
    'Pendente': 'bg-yellow-100 text-yellow-800 border-yellow-200',
    'Em Andamento': 'bg-blue-100 text-blue-800 border-blue-200',
    'Concluído': 'bg-green-100 text-green-800 border-green-200',
};

const CreativeStudioPage: React.FC<CreativeStudioPageProps> = ({ user, onSuccess }) => {
    const [files, setFiles] = useState<File[]>([]);
    const [previews, setPreviews] = useState<Record<string, string>>({});
    const [selectedServices, setSelectedServices] = useState<Record<string, string[]>>({}); // Map filename -> array of service IDs
    const [instructions, setInstructions] = useState<Record<string, string>>({});
    const [editingServices, setEditingServices] = useState<Service[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [history, setHistory] = useState<EditingRequest[]>([]);

    const [client, setClient] = useState<any>(null);

    useEffect(() => {
        const fetchClient = async () => {
            const c = await getClientById(user.clientId || user.id);
            setClient(c);
        };
        fetchClient();
    }, [user]);

    useEffect(() => {
        const fetchData = async () => {
            // Fetch only editing services
            const allServices = await getServices();
            const services = allServices.filter(s => s.category === 'Edição' && s.status === 'Ativo');
            setEditingServices(services);
            await refreshHistory();
        };
        fetchData();
    }, [user]); // Added user dependency to refresh history if user changes

    const refreshHistory = async () => {
        const allReqs = await getEditingRequests();
        const reqs = allReqs.filter(r => r.clientId === (user.clientId || user.id));
        setHistory(reqs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    };

    // Clean up object URLs
    useEffect(() => {
        return () => {
            Object.values(previews).forEach(URL.revokeObjectURL);
        }
    }, [previews]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            addFiles(Array.from(e.target.files));
        }
    };

    const addFiles = (newFiles: File[]) => {
        const validFiles = newFiles.filter(f => f.type.startsWith('image/'));
        if (validFiles.length === 0) return;

        const newPreviews: Record<string, string> = {};
        validFiles.forEach(f => {
            newPreviews[f.name] = URL.createObjectURL(f);
        });

        setFiles(prev => [...prev, ...validFiles]);
        setPreviews(prev => ({ ...prev, ...newPreviews }));

        // Initialize service selection for new files
        const initialServices = { ...selectedServices };
        validFiles.forEach(f => {
            if (!initialServices[f.name]) initialServices[f.name] = [];
        });
        setSelectedServices(initialServices);
    };

    const removeFile = (fileName: string) => {
        setFiles(prev => prev.filter(f => f.name !== fileName));
        const newPreviews = { ...previews };
        if (newPreviews[fileName]) URL.revokeObjectURL(newPreviews[fileName]);
        delete newPreviews[fileName];
        setPreviews(newPreviews);

        const newServices = { ...selectedServices };
        delete newServices[fileName];
        setSelectedServices(newServices);
    };

    const toggleService = (fileName: string, serviceId: string) => {
        setSelectedServices(prev => {
            const current = prev[fileName] || [];
            const updated = current.includes(serviceId)
                ? current.filter(id => id !== serviceId)
                : [...current, serviceId];
            return { ...prev, [fileName]: updated };
        });
    };

    const handleInstructionChange = (fileName: string, text: string) => {
        setInstructions(prev => ({ ...prev, [fileName]: text }));
    };

    const calculateTotal = () => {
        if (!client) return 0;
        let total = 0;
        Object.entries(selectedServices).forEach(([fileName, serviceIds]: [string, string[]]) => {
            serviceIds.forEach(sId => {
                const service = editingServices.find(s => s.id === sId);
                if (service) {
                    // Use custom price if set for client
                    const price = client.customPrices[sId] !== undefined ? client.customPrices[sId] : service.price;
                    total += price;
                }
            });
        });
        return total;
    };

    const total = calculateTotal();
    const canSubmit = files.length > 0 && total > 0;

    const handleSubmit = async () => {
        if (!client) return;

        if (client.paymentType === 'Pré-pago' && client.balance < total) {
            const missing = total - client.balance;
            alert(`Saldo insuficiente. Faltam R$ ${missing.toFixed(2)} para realizar este pedido. Por favor, adicione fundos na Carteira.`);
            return;
        }

        setIsSubmitting(true);

        try {
            const items: { originalFileName: string, originalFileUrl: string, serviceIds: string[], instructions?: string }[] = [];

            for (const file of files) {
                if (selectedServices[file.name] && selectedServices[file.name].length > 0) {
                    // Upload file to Supabase Storage
                    const publicUrl = await uploadCreativeStudioFile(file);

                    items.push({
                        originalFileName: file.name,
                        originalFileUrl: publicUrl,
                        serviceIds: selectedServices[file.name],
                        instructions: instructions[file.name]
                    });
                }
            }

            if (items.length === 0) {
                alert("Selecione pelo menos um serviço para uma imagem.");
                setIsSubmitting(false);
                return;
            }

            await createEditingRequest(client.id, items, total);

            setIsSubmitting(false);
            alert('Solicitação enviada com sucesso!');

            // Reset form
            setFiles([]);
            setPreviews({});
            setSelectedServices({});
            setInstructions({});
            await refreshHistory();
        } catch (error) {
            console.error("Error submitting request:", error);
            alert("Erro ao enviar solicitação. Tente novamente.");
            setIsSubmitting(false);
        }
    };

    const handleDownload = async (url: string, filename: string) => {
        try {
            const response = await fetch(url);
            const blob = await response.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(blobUrl);
        } catch (error) {
            console.error("Download failed:", error);
            // Fallback to opening in new tab
            window.open(url, '_blank');
        }
    };

    return (
        <div className="animate-fade-in space-y-8 pb-20">
            <header className="text-center space-y-4 py-8 bg-gradient-to-r from-indigo-900 to-purple-900 rounded-2xl text-white shadow-xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
                    <WandIcon className="w-96 h-96 -translate-x-1/4 -translate-y-1/4" />
                </div>
                <div className="relative z-10">
                    <div className="mx-auto bg-white/20 w-16 h-16 rounded-full flex items-center justify-center backdrop-blur-sm mb-4">
                        <WandIcon className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-3xl font-bold">Creative Studio</h1>
                    <p className="text-purple-200 max-w-lg mx-auto mt-2 px-4">
                        Transforme suas fotos com nossa IA e editores especialistas. Selecione as imagens e escolha as mágicas que deseja aplicar.
                    </p>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left: Upload Area */}
                <div className="lg:col-span-2 space-y-6">
                    {files.length === 0 ? (
                        <div className="border-2 border-dashed border-slate-300 rounded-xl p-12 text-center hover:bg-slate-50 transition-colors cursor-pointer group relative">
                            <input type="file" multiple accept="image/*" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={handleFileChange} />
                            <div className="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                                <UploadCloudIcon className="w-8 h-8 text-purple-600" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-700">Arraste suas fotos aqui</h3>
                            <p className="text-slate-500 mt-2">ou clique para selecionar do computador</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <h3 className="font-bold text-slate-800 text-lg">Fotos Selecionadas ({files.length})</h3>
                                <label className="text-sm font-bold text-purple-600 cursor-pointer hover:underline flex items-center gap-1">
                                    <PlusIcon className="w-4 h-4" /> Adicionar mais
                                    <input type="file" multiple accept="image/*" className="hidden" onChange={handleFileChange} />
                                </label>
                            </div>

                            <div className="grid grid-cols-1 gap-6">
                                {files.map(file => (
                                    <div key={file.name} className="bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col sm:flex-row shadow-sm">
                                        <div className="w-full sm:w-48 h-48 bg-slate-100 relative flex-shrink-0">
                                            <img src={previews[file.name]} alt={file.name} className="w-full h-full object-cover" />
                                            <button onClick={() => removeFile(file.name)} className="absolute top-2 right-2 bg-white/90 p-1 rounded-full text-red-500 hover:text-red-600 shadow-sm">
                                                <XCircleIcon className="w-5 h-5" />
                                            </button>
                                        </div>
                                        <div className="p-4 flex-1">
                                            <div className="flex justify-between items-start mb-3">
                                                <p className="font-bold text-slate-700 truncate max-w-[200px]" title={file.name}>{file.name}</p>
                                            </div>

                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">O que deseja fazer nesta imagem?</p>
                                            <div className="grid grid-cols-2 gap-3 mb-4">
                                                {editingServices.map(service => {
                                                    const isSelected = selectedServices[file.name]?.includes(service.id);
                                                    const price = client?.customPrices[service.id] !== undefined ? client.customPrices[service.id] : service.price;

                                                    return (
                                                        <button
                                                            key={service.id}
                                                            onClick={() => toggleService(file.name, service.id)}
                                                            className={`p-3 rounded-xl text-sm font-bold border-2 transition-all flex flex-col items-start gap-1 text-left ${isSelected ? 'bg-purple-50 border-purple-600 text-purple-800 shadow-sm' : 'bg-white text-slate-600 border-slate-200 hover:border-purple-300 hover:bg-slate-50'}`}
                                                        >
                                                            <div className="flex justify-between w-full items-center">
                                                                <span>{service.name}</span>
                                                                {isSelected && <CheckCircleIcon className="w-5 h-5 text-purple-600" />}
                                                            </div>
                                                            <span className={`text-xs ${isSelected ? 'text-purple-600' : 'text-slate-400'}`}>+ R$ {price.toFixed(2)}</span>
                                                        </button>
                                                    )
                                                })}
                                            </div>

                                            <input
                                                type="text"
                                                placeholder="Instruções específicas (opcional)..."
                                                className="w-full text-sm p-2 border border-slate-200 rounded-lg focus:ring-purple-500 focus:border-purple-500"
                                                value={instructions[file.name] || ''}
                                                onChange={e => handleInstructionChange(file.name, e.target.value)}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Right: Summary Cart */}
                <div className="lg:col-span-1">
                    <div className="bg-white p-6 rounded-xl shadow-lg border border-slate-200 sticky top-8">
                        <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <LayersIcon className="w-5 h-5 text-purple-600" /> Resumo do Pedido
                        </h3>

                        {total === 0 ? (
                            <p className="text-slate-500 text-sm text-center py-8">Selecione serviços nas imagens para ver o resumo.</p>
                        ) : (
                            <div className="space-y-3 mb-6">
                                {Object.entries(selectedServices).map(([fileName, sIds]: [string, string[]]) => {
                                    if (sIds.length === 0) return null;
                                    let itemTotal = 0;
                                    return (
                                        <div key={fileName} className="text-sm border-b border-slate-100 pb-2">
                                            <p className="font-semibold text-slate-700 truncate mb-1">{fileName}</p>
                                            <ul className="space-y-1">
                                                {sIds.map(sId => {
                                                    const s = editingServices.find(srv => srv.id === sId);
                                                    if (!s) return null;
                                                    const price = client?.customPrices[sId] ?? s.price;
                                                    itemTotal += price;
                                                    return (
                                                        <li key={sId} className="flex justify-between text-slate-500 text-xs">
                                                            <span>• {s.name}</span>
                                                            <span>R$ {price.toFixed(2)}</span>
                                                        </li>
                                                    );
                                                })}
                                            </ul>
                                        </div>
                                    )
                                })}
                            </div>
                        )}

                        <div className="border-t border-slate-200 pt-4">
                            <div className="flex justify-between items-baseline mb-2">
                                <span className="text-slate-600 font-medium">Total Serviços</span>
                                <span className="text-2xl font-bold text-slate-800">R$ {total.toFixed(2)}</span>
                            </div>

                            {client?.paymentType === 'Pré-pago' && (
                                <div className={`text-xs font-bold p-2 rounded text-center ${client.balance >= total ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                                    Saldo: R$ {client.balance.toFixed(2)}
                                    {client.balance < total && <span className="block mt-1">Saldo insuficiente</span>}
                                </div>
                            )}
                        </div>

                        <button
                            onClick={handleSubmit}
                            disabled={!canSubmit || isSubmitting}
                            className="w-full mt-6 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold py-3 rounded-xl shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isSubmitting ? <LoaderIcon className="w-5 h-5 animate-spin" /> : <WandIcon className="w-5 h-5" />}
                            {isSubmitting ? 'Processando...' : 'Confirmar Pedido'}
                        </button>
                        <p className="text-xs text-slate-400 text-center mt-3">
                            Prazo médio de entrega: 24 horas úteis.
                        </p>
                    </div>
                </div>
            </div>

            {/* History Section */}
            <div className="bg-white p-6 rounded-xl shadow-lg border border-slate-200 mt-12">
                <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                    <ClockIcon className="w-6 h-6 text-purple-600" /> Histórico de Solicitações
                </h3>

                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-sm text-left text-slate-600">
                        <thead className="bg-slate-50 text-slate-500 font-bold text-xs uppercase">
                            <tr>
                                <th className="p-4 rounded-tl-lg">Data</th>
                                <th className="p-4">Imagens</th>
                                <th className="p-4">Valor</th>
                                <th className="p-4 text-center">Status</th>
                                <th className="p-4 text-right rounded-tr-lg">Resultado</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {history.length > 0 ? history.map(req => (
                                <tr key={req.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="p-4 font-medium text-slate-800">
                                        {new Date(req.createdAt).toLocaleDateString('pt-BR')}
                                        <div className="text-xs text-slate-400 mt-0.5">
                                            {new Date(req.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex flex-col gap-1">
                                            <span>{req.items.length} imagem(ns)</span>
                                            {req.editorNotes && (
                                                <div className="text-xs text-slate-500 bg-yellow-50 p-2 rounded border border-yellow-100 mt-1">
                                                    <span className="font-bold text-yellow-700">Nota do Editor:</span> {req.editorNotes}
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="p-4 font-bold text-slate-800">
                                        R$ {req.totalPrice.toFixed(2)}
                                    </td>
                                    <td className="p-4 text-center">
                                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold border ${statusStyles[req.status]}`}>
                                            {req.status}
                                        </span>
                                    </td>
                                    <td className="p-4 text-right">
                                        {req.status === 'Concluído' ? (
                                            <div className="flex flex-col items-end gap-2">
                                                {req.items.map((item, idx) => item.editedFileUrl && (
                                                    <button
                                                        key={idx}
                                                        onClick={() => handleDownload(item.editedFileUrl!, `edited_${item.originalFileName}`)}
                                                        className="inline-flex items-center gap-1 text-xs font-bold text-white bg-green-600 hover:bg-green-700 px-3 py-1.5 rounded-lg transition-colors"
                                                    >
                                                        <DownloadIcon className="w-4 h-4" /> Baixar {req.items.length > 1 ? `#${idx + 1}` : ''}
                                                    </button>
                                                ))}
                                            </div>
                                        ) : (
                                            <span className="text-slate-400 text-xs italic">Aguardando...</span>
                                        )}
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-slate-500">
                                        Nenhuma solicitação encontrada.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Mobile List (Cards) */}
                <div className="md:hidden space-y-4">
                    {history.length > 0 ? history.map(req => (
                        <div key={req.id} className="p-4 border border-slate-200 rounded-lg bg-slate-50 hover:bg-white transition-colors">
                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <p className="font-bold text-slate-800 text-sm">{new Date(req.createdAt).toLocaleDateString('pt-BR')}</p>
                                    <p className="text-xs text-slate-400">{new Date(req.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
                                </div>
                                <span className={`inline-block px-2 py-1 rounded text-[10px] font-bold border ${statusStyles[req.status]}`}>
                                    {req.status}
                                </span>
                            </div>

                            <div className="flex justify-between items-center text-sm mb-3">
                                <div className="flex items-center gap-2 text-slate-600">
                                    <WandIcon className="w-4 h-4" />
                                    <span>{req.items.length} imagem(ns)</span>
                                </div>
                                <span className="font-bold text-slate-800">R$ {req.totalPrice.toFixed(2)}</span>
                            </div>

                            {req.editorNotes && (
                                <div className="text-xs text-slate-500 bg-yellow-50 p-2 rounded border border-yellow-100 mb-3">
                                    <span className="font-bold text-yellow-700">Nota do Editor:</span> {req.editorNotes}
                                </div>
                            )}

                            {req.status === 'Concluído' ? (
                                <div className="space-y-2">
                                    {req.items.map((item, idx) => item.editedFileUrl && (
                                        <button
                                            key={idx}
                                            onClick={() => handleDownload(item.editedFileUrl!, `edited_${item.originalFileName}`)}
                                            className="w-full flex items-center justify-center gap-2 text-xs font-bold text-white bg-green-600 hover:bg-green-700 py-2 rounded-lg transition-colors"
                                        >
                                            <DownloadIcon className="w-4 h-4" /> Baixar {req.items.length > 1 ? `#${idx + 1}` : ''}
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <div className="w-full py-2 text-center text-xs text-slate-400 italic bg-white rounded border border-slate-100">
                                    Aguardando edição...
                                </div>
                            )}
                        </div>
                    )) : (
                        <div className="p-8 text-center text-slate-500 border border-dashed border-slate-200 rounded-lg">
                            Nenhuma solicitação encontrada.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CreativeStudioPage;
