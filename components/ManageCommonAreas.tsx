import React, { useState, useMemo, useEffect, useRef, FormEvent } from 'react';
import { getCommonAreas, addCommonArea, updateCommonArea, deleteCommonAreas, loadGoogleMapsScript } from '../services/bookingService';
import { CommonArea, CommonAreaAddress } from '../types';
import { SearchIcon, PlusIcon, EditIcon, ArrowLeftIcon, CheckCircleIcon, XIcon, LinkIcon, TrashIcon, ChevronLeftIcon, ChevronRightIcon } from './icons';

declare var google: any;

const emptyAddress: CommonAreaAddress = { street: '', number: '', complement: '', neighborhood: '', city: '', state: '' };
const emptyCommonAreaForm: Omit<CommonArea, 'id' | 'createdAt' | 'fullAddress'> = { name: '', address: emptyAddress, media_link: '', notes: '' };


const ManageCommonAreas: React.FC = () => {
    const [allAreas, setAllAreas] = useState<CommonArea[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    // Panel State
    const [isPanelOpen, setIsPanelOpen] = useState(false);
    const [selectedArea, setSelectedArea] = useState<CommonArea | null>(null); // For editing
    const [formData, setFormData] = useState<Omit<CommonArea, 'id' | 'createdAt' | 'fullAddress'>>(emptyCommonAreaForm);
    const [isSaving, setIsSaving] = useState(false);

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10); // Reduced for better UX

    const autocompleteInputRef = useRef<HTMLInputElement>(null);
    const autocompleteInstanceRef = useRef<any>(null);

    const refreshData = async () => {
        const areas = await getCommonAreas();
        setAllAreas(areas);
    };
    useEffect(() => { refreshData(); }, []);

    // --- Autocomplete Effect ---
    useEffect(() => {
        if (!isPanelOpen) return;

        const initAutocomplete = async () => {
            if (!autocompleteInputRef.current) return;

            try {
                // Ensure Google Maps is loaded
                if (!(window as any).google || !(window as any).google.maps) {
                    await loadGoogleMapsScript();
                }

                const { Autocomplete } = await (window as any).google.maps.importLibrary("places") as google.maps.PlacesLibrary;

                autocompleteInstanceRef.current = new Autocomplete(
                    autocompleteInputRef.current, { types: ['address'], componentRestrictions: { country: 'br' } }
                );
                autocompleteInstanceRef.current.addListener('place_changed', () => {
                    const place = autocompleteInstanceRef.current.getPlace();
                    if (place.address_components) {
                        const get = (type: string) => place.address_components.find((c: any) => c.types.includes(type))?.long_name || '';
                        const newAddress: CommonAreaAddress = {
                            street: get('route'),
                            number: get('street_number'),
                            neighborhood: get('sublocality_level_1'),
                            city: get('administrative_area_level_2'),
                            state: get('administrative_area_level_1'),
                            complement: ''
                        };
                        setFormData(prev => ({ ...prev, address: newAddress, name: `${newAddress.street}, ${newAddress.number}` }));
                    }
                });
            } catch (error) {
                console.error("Error initializing Google Maps Autocomplete:", error);
            }
        };

        initAutocomplete();

        return () => {
            if (autocompleteInstanceRef.current) {
                (window as any).google.maps.event.clearInstanceListeners(autocompleteInstanceRef.current);
            }
        }
    }, [isPanelOpen]);


    // --- Data & Pagination Memos ---
    const filteredAreas = useMemo(() => {
        if (!searchQuery.trim()) return allAreas;

        const normalize = (str: string) => str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const terms = normalize(searchQuery).split(' ').filter(t => t.length > 0);

        return allAreas.filter(area => {
            const searchableText = normalize([
                area.name,
                area.fullAddress,
                area.address?.street,
                area.address?.number,
                area.address?.neighborhood,
                area.address?.city,
                area.notes
            ].filter(Boolean).join(' '));

            return terms.every(term => searchableText.includes(term));
        });
    }, [allAreas, searchQuery]);

    const paginatedAreas = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return filteredAreas.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredAreas, currentPage, itemsPerPage]);

    const totalPages = Math.ceil(filteredAreas.length / itemsPerPage);

    // --- Handlers ---
    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedIds(paginatedAreas.map(a => a.id));
        } else {
            setSelectedIds([]);
        }
    };

    const handleSelectOne = (id: string) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    const handleAdd = () => {
        setSelectedArea(null);
        setFormData(emptyCommonAreaForm);
        setIsPanelOpen(true);
    };

    const handleEdit = (area: CommonArea) => {
        setSelectedArea(area);
        setFormData({
            name: area.name,
            address: area.address,
            media_link: area.media_link,
            notes: area.notes
        });
        setIsPanelOpen(true);
    };

    const handleClosePanel = () => {
        setIsPanelOpen(false);
        setSelectedArea(null);
    };

    const handleDelete = () => {
        if (window.confirm(`Tem certeza que deseja excluir ${selectedIds.length} área(s) comum(ns)?`)) {
            deleteCommonAreas(selectedIds);
            setSelectedIds([]);
            refreshData();
        }
    };

    // --- Form Handlers ---
    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, address: { ...prev.address, [name]: value } }));
    };

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        if (selectedArea) { // Edit mode
            updateCommonArea(selectedArea.id, formData);
        } else { // Add mode
            addCommonArea(formData);
        }
        setTimeout(() => {
            setIsSaving(false);
            refreshData();
            handleClosePanel();
        }, 500);
    };

    const FormInput: React.FC<{ label: string, name: string, value: string, onChange: any, containerClassName?: string, placeholder?: string, required?: boolean }> = ({ label, name, value, onChange, containerClassName, placeholder, required }) => (
        <div className={containerClassName}>
            <label htmlFor={name} className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{label}{required && ' *'}</label>
            <input type="text" id={name} name={name} value={value} onChange={onChange} placeholder={placeholder} required={required} className="w-full p-2 border rounded-lg shadow-sm focus:ring-purple-500 focus:border-purple-500 transition-colors bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 dark:text-white" />
        </div>
    );

    return (
        <div className="space-y-8 animate-fade-in">
            <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Áreas Comuns</h1>
                    <p className="text-slate-500 dark:text-slate-400">Gerencie as áreas comuns disponíveis para agendamento.</p>
                </div>
                <button onClick={handleAdd} className="bg-purple-600 text-white font-semibold py-2.5 px-6 rounded-lg shadow-md hover:bg-purple-700 transition-all flex items-center gap-2 transform hover:scale-105">
                    <PlusIcon className="w-5 h-5" /> Nova Área
                </button>
            </header>

            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                {/* Toolbar */}
                <div className="p-5 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div className="relative w-full sm:w-96">
                        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 dark:text-slate-500 pointer-events-none" />
                        <input
                            type="search"
                            placeholder="Buscar por nome ou endereço..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
                        />
                    </div>

                    {selectedIds.length > 0 && (
                        <div className="flex items-center gap-3 animate-fade-in">
                            <span className="text-sm text-slate-600 dark:text-slate-300 font-medium">{selectedIds.length} selecionado(s)</span>
                            <button onClick={handleDelete} className="bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors">
                                <TrashIcon className="w-4 h-4" /> Excluir
                            </button>
                        </div>
                    )}
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-slate-500 dark:text-slate-400 uppercase bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
                            <tr>
                                <th scope="col" className="p-4 w-4">
                                    <input type="checkbox" onChange={handleSelectAll} checked={selectedIds.length > 0 && selectedIds.length === paginatedAreas.length && paginatedAreas.length > 0} className="w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 rounded focus:ring-purple-500" />
                                </th>
                                <th scope="col" className="px-6 py-3 font-bold">Nome / Endereço</th>
                                <th scope="col" className="px-6 py-3 font-bold">Mídia</th>
                                <th scope="col" className="px-6 py-3 font-bold text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                            {paginatedAreas.map(area => (
                                <tr key={area.id} className="bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors group">
                                    <td className="p-4">
                                        <input type="checkbox" checked={selectedIds.includes(area.id)} onChange={() => handleSelectOne(area.id)} className="w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 rounded focus:ring-purple-500" />
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-slate-800 dark:text-slate-100 text-base">{area.name}</div>
                                        <div className="text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-1">
                                            <span className="truncate max-w-xs">{area.fullAddress}</span>
                                        </div>
                                        {area.notes && <div className="text-xs text-slate-400 dark:text-slate-500 mt-1 italic max-w-md truncate">{area.notes}</div>}
                                    </td>
                                    <td className="px-6 py-4">
                                        {area.media_link ? (
                                            <a href={area.media_link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium hover:underline bg-blue-50 dark:bg-blue-900/20 px-3 py-1 rounded-full text-xs transition-colors">
                                                <LinkIcon className="w-3 h-3" /> Visualizar Mídia
                                            </a>
                                        ) : (
                                            <span className="text-slate-400 dark:text-slate-500 text-xs">Sem mídia</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button onClick={() => handleEdit(area)} className="text-slate-400 dark:text-slate-500 hover:text-purple-600 dark:hover:text-purple-400 p-2 rounded-full hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all" title="Editar">
                                            <EditIcon className="w-5 h-5" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {paginatedAreas.length === 0 && (
                        <div className="text-center py-12">
                            <div className="bg-slate-50 dark:bg-slate-700/50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                                <SearchIcon className="w-8 h-8 text-slate-300 dark:text-slate-500" />
                            </div>
                            <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100">Nenhuma área encontrada</h3>
                            <p className="text-slate-500 dark:text-slate-400 mt-1">Tente buscar por outro termo ou adicione uma nova área.</p>
                        </div>
                    )}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex justify-between items-center">
                        <span className="text-sm text-slate-500 dark:text-slate-400">
                            Mostrando <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> a <span className="font-medium">{Math.min(currentPage * itemsPerPage, filteredAreas.length)}</span> de <span className="font-medium">{filteredAreas.length}</span> resultados
                        </span>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="p-2 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-white dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-slate-600 dark:text-slate-300"
                            >
                                <ChevronLeftIcon className="w-5 h-5" />
                            </button>
                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="p-2 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-white dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-slate-600 dark:text-slate-300"
                            >
                                <ChevronRightIcon className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Slide-over Panel */}
            {isPanelOpen && (
                <div className="fixed inset-0 z-50">
                    {/* Backdrop */}
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={handleClosePanel}></div>
                    {/* Panel */}
                    <div className="absolute inset-y-0 right-0 w-full max-w-2xl bg-white dark:bg-slate-800 shadow-2xl flex flex-col animate-slide-in-right">
                        <form onSubmit={handleSubmit} className="flex flex-col h-full">
                            <header className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center flex-shrink-0 bg-slate-50/50 dark:bg-slate-800/50">
                                <div>
                                    <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">{selectedArea ? 'Editar Área Comum' : 'Nova Área Comum'}</h2>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Preencha os dados abaixo para {selectedArea ? 'atualizar' : 'cadastrar'} a área.</p>
                                </div>
                                <button type="button" onClick={handleClosePanel} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"><XIcon className="w-6 h-6" /></button>
                            </header>

                            <div className="flex-1 overflow-y-auto p-8 space-y-8">
                                <div className="space-y-6">
                                    <h3 className="text-sm font-bold text-purple-900 dark:text-purple-300 uppercase tracking-wider border-b border-purple-100 dark:border-purple-900/30 pb-2">Informações Principais</h3>
                                    <div className="grid grid-cols-1 gap-6">
                                        <div>
                                            <label htmlFor="search-address" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Buscar Endereço (Google Maps)</label>
                                            <div className="relative">
                                                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 dark:text-slate-500 pointer-events-none" />
                                                <input ref={autocompleteInputRef} id="search-address" placeholder="Digite para buscar..." className="w-full p-2.5 pl-10 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg shadow-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all outline-none" />
                                            </div>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Selecione um endereço da lista para preencher automaticamente.</p>
                                        </div>
                                        <FormInput label="Nome da Área" name="name" value={formData.name} onChange={handleFormChange} placeholder="Ex: Salão de Festas, Piscina..." required />
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <h3 className="text-sm font-bold text-purple-900 dark:text-purple-300 uppercase tracking-wider border-b border-purple-100 dark:border-purple-900/30 pb-2">Endereço Detalhado</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        <FormInput label="Logradouro" name="street" value={formData.address.street} onChange={handleAddressChange} containerClassName="md:col-span-2" placeholder="Rua, Avenida..." />
                                        <FormInput label="Número" name="number" value={formData.address.number} onChange={handleAddressChange} placeholder="123" />
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        <FormInput label="Complemento" name="complement" value={formData.address.complement || ''} onChange={handleAddressChange} placeholder="Apto, Bloco..." />
                                        <FormInput label="Bairro" name="neighborhood" value={formData.address.neighborhood} onChange={handleAddressChange} placeholder="Bairro" />
                                        <FormInput label="Cidade" name="city" value={formData.address.city} onChange={handleAddressChange} placeholder="Cidade" />
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        <FormInput label="Estado" name="state" value={formData.address.state} onChange={handleAddressChange} placeholder="UF" />
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <h3 className="text-sm font-bold text-purple-900 dark:text-purple-300 uppercase tracking-wider border-b border-purple-100 dark:border-purple-900/30 pb-2">Mídia e Observações</h3>
                                    <FormInput label="Link da Mídia (Tour Virtual/Fotos)" name="media_link" value={formData.media_link} onChange={handleFormChange} placeholder="https://..." required />
                                    <div>
                                        <label htmlFor="notes" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Observações Internas</label>
                                        <textarea id="notes" name="notes" value={formData.notes || ''} onChange={handleFormChange} rows={4} placeholder="Informações adicionais sobre a área..." className="w-full p-3 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg shadow-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all outline-none resize-none"></textarea>
                                    </div>
                                </div>
                            </div>

                            <footer className="p-6 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex justify-end items-center gap-3 flex-shrink-0">
                                <button type="button" onClick={handleClosePanel} className="font-semibold text-sm text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-700 py-2.5 px-5 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors shadow-sm">Cancelar</button>
                                <button type="submit" disabled={isSaving} className="font-semibold text-white bg-purple-600 px-6 py-2.5 rounded-lg shadow-md hover:bg-purple-700 transition-all disabled:opacity-50 flex items-center gap-2 transform active:scale-95">
                                    <CheckCircleIcon className="w-5 h-5" /> {isSaving ? 'Salvando...' : 'Salvar Alterações'}
                                </button>
                            </footer>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ManageCommonAreas;