
import React, { useState, useEffect } from 'react';
import { getEditingRequests, getClientById, updateEditingRequestStatus, uploadEditedImage, getClients } from '../services/bookingService';
import { EditingRequest, EditingRequestItem, EditingStatus } from '../types';
import { DownloadIcon, UploadCloudIcon, CheckCircleIcon, ClockIcon, WandIcon, ChevronRightIcon, XIcon, LoaderIcon } from './icons';

const statusColors: Record<EditingStatus, string> = {
    'Pendente': 'bg-yellow-100 text-yellow-800 border-yellow-200',
    'Em Andamento': 'bg-blue-100 text-blue-800 border-blue-200',
    'Concluído': 'bg-green-100 text-green-800 border-green-200',
};

const RequestItemCard: React.FC<{ item: EditingRequestItem; requestId: string; onUpload: (itemId: string, file: File) => void }> = ({ item, requestId, onUpload }) => {
    const [isHovering, setIsHovering] = useState(false);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            onUpload(item.id, e.target.files[0]);
        }
    };

    return (
        <div className="bg-white border border-slate-200 rounded-lg p-4 flex gap-4 items-start hover:shadow-md transition-shadow">
            <div className="w-24 h-24 bg-slate-100 rounded-md flex-shrink-0 relative overflow-hidden group">
                <img src={item.originalFileUrl} alt="Original" className="w-full h-full object-cover" />
                <a href={item.originalFileUrl} download={item.originalFileName} className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white font-bold text-xs">
                    <DownloadIcon className="w-6 h-6" />
                </a>
            </div>

            <div className="flex-1">
                <div className="flex justify-between items-start">
                    <div>
                        <p className="font-bold text-slate-800 text-sm mb-1">{item.originalFileName}</p>
                        <div className="flex flex-wrap gap-1 mb-2">
                            {item.serviceIds.map(sid => (
                                <span key={sid} className="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full border border-purple-200 font-semibold uppercase">
                                    {sid.replace(/_/g, ' ')}
                                </span>
                            ))}
                        </div>
                        {item.instructions && (
                            <p className="text-xs bg-slate-50 p-2 rounded text-slate-600 italic border border-slate-100">
                                "{item.instructions}"
                            </p>
                        )}
                    </div>

                    <div className="text-right">
                        {item.editedFileUrl ? (
                            <div className="flex flex-col items-end gap-1">
                                <span className="text-xs font-bold text-green-600 flex items-center gap-1">
                                    <CheckCircleIcon className="w-4 h-4" /> Editado
                                </span>
                                <a href={item.editedFileUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline">Ver Resultado</a>
                            </div>
                        ) : (
                            <label className={`cursor-pointer px-3 py-1.5 rounded-lg text-xs font-bold border transition-all flex items-center gap-1 ${isHovering ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-white border-slate-300 text-slate-600'}`} onMouseEnter={() => setIsHovering(true)} onMouseLeave={() => setIsHovering(false)}>
                                <UploadCloudIcon className="w-4 h-4" /> Upload
                                <input type="file" className="hidden" onChange={handleFileChange} accept="image/*" />
                            </label>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

const EditingManagementPage: React.FC = () => {
    const [requests, setRequests] = useState<EditingRequest[]>([]);
    const [clients, setClients] = useState<Record<string, any>>({});
    const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
    const [editorNotes, setEditorNotes] = useState('');

    const refreshData = async () => {
        try {
            const [fetchedRequests, fetchedClients] = await Promise.all([
                getEditingRequests(),
                getClients()
            ]);

            const sortedRequests = fetchedRequests.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            setRequests(sortedRequests);

            const clientsMap = fetchedClients.reduce((acc: any, client: any) => {
                acc[client.id] = client;
                return acc;
            }, {});
            setClients(clientsMap);
        } catch (error) {
            console.error("Error refreshing data:", error);
        }
    };

    useEffect(() => {
        refreshData();
    }, []);

    const handleSelectRequest = (req: EditingRequest) => {
        setSelectedRequestId(req.id);
        setEditorNotes(req.editorNotes || '');
    };

    const handleUpload = async (requestId: string, itemId: string, file: File) => {
        // Mock upload -> create object URL
        const url = URL.createObjectURL(file);
        await uploadEditedImage(requestId, itemId, url);
        refreshData();
    };

    const handleStatusChange = async (requestId: string, newStatus: EditingStatus) => {
        await updateEditingRequestStatus(requestId, newStatus, editorNotes);
        refreshData();
    };

    const selectedRequest = requests.find(r => r.id === selectedRequestId);
    const clientName = selectedRequest && clients[selectedRequest.clientId] ? clients[selectedRequest.clientId].name : '';

    return (
        <div className="space-y-8 animate-fade-in h-full flex flex-col">
            <header>
                <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
                    <WandIcon className="w-8 h-8 text-purple-600" /> Painel de Edição
                </h1>
                <p className="text-slate-500">Gerencie solicitações de tratamento e manipulação de imagens.</p>
            </header>

            <div className="flex gap-6 h-[calc(100vh-200px)]">
                {/* Left: Request List */}
                <div className="w-1/3 bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
                    <div className="p-4 border-b border-slate-100 bg-slate-50">
                        <h3 className="font-bold text-slate-700">Solicitações ({requests.length})</h3>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-2">
                        {requests.map(req => {
                            const c = clients[req.clientId];
                            const isActive = selectedRequestId === req.id;
                            return (
                                <button
                                    key={req.id}
                                    onClick={() => handleSelectRequest(req)}
                                    className={`w-full text-left p-4 rounded-lg border transition-all ${isActive ? 'bg-purple-50 border-purple-300 ring-1 ring-purple-200' : 'bg-white border-slate-200 hover:bg-slate-50'}`}
                                >
                                    <div className="flex justify-between items-start mb-1">
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusColors[req.status]}`}>
                                            {req.status}
                                        </span>
                                        <span className="text-xs text-slate-400">{new Date(req.createdAt).toLocaleDateString('pt-BR')}</span>
                                    </div>
                                    <p className="font-bold text-slate-800 truncate">{c?.name || 'Cliente Desconhecido'}</p>
                                    <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                                        <WandIcon className="w-3 h-3" /> {req.items.length} imagens
                                        <span className="mx-1">•</span>
                                        R$ {req.totalPrice.toFixed(2)}
                                    </p>
                                </button>
                            )
                        })}
                        {requests.length === 0 && (
                            <div className="p-8 text-center text-slate-500 text-sm">
                                Nenhuma solicitação pendente.
                            </div>
                        )}
                    </div>
                </div>

                {/* Right: Workspace */}
                <div className="flex-1 bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col overflow-hidden">
                    {selectedRequest ? (
                        <>
                            <header className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                                <div>
                                    <h2 className="text-xl font-bold text-slate-800">Solicitação #{selectedRequest.id.slice(-6)}</h2>
                                    <p className="text-slate-500 text-sm">{clientName}</p>
                                </div>
                                <div className="flex gap-2">
                                    {selectedRequest.status !== 'Concluído' && (
                                        <button
                                            onClick={() => handleStatusChange(selectedRequest.id, 'Concluído')}
                                            className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-green-700 transition-colors flex items-center gap-2 shadow-sm"
                                        >
                                            <CheckCircleIcon className="w-4 h-4" /> Marcar como Concluído
                                        </button>
                                    )}
                                </div>
                            </header>

                            <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
                                <div className="mb-6 bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                                    <label className="block text-sm font-bold text-slate-700 mb-2">Notas do Editor / Detalhes da Entrega</label>
                                    <textarea
                                        className="w-full p-3 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                        rows={3}
                                        placeholder="Adicione observações sobre a edição ou link extra se necessário..."
                                        value={editorNotes}
                                        onChange={(e) => setEditorNotes(e.target.value)}
                                    />
                                </div>

                                <div className="space-y-4">
                                    {selectedRequest.items.map(item => (
                                        <RequestItemCard
                                            key={item.id}
                                            item={item}
                                            requestId={selectedRequest.id}
                                            onUpload={(itemId, file) => handleUpload(selectedRequest.id, itemId, file)}
                                        />
                                    ))}
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8">
                            <WandIcon className="w-16 h-16 mb-4 opacity-20" />
                            <p>Selecione uma solicitação para começar a trabalhar.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default EditingManagementPage;