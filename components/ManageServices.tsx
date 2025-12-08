
import React, { useState, useMemo, FormEvent, useEffect } from 'react';
import { getServices, addService, updateService } from '../services/bookingService';
import { Service, ServiceCategory } from '../types';
import { SettingsIcon, SearchIcon, PlusIcon, XIcon, EditIcon, CheckCircleIcon, EyeIcon, EyeOffIcon } from './icons';

const serviceCategories: ServiceCategory[] = ['Foto', 'Vídeo', 'Aéreo', 'Pacotes', 'Outros'];
const emptyService: Omit<Service, 'id'> = {
    name: '',
    category: 'Foto',
    duration_minutes: 60,
    price: 0,
    status: 'Ativo',
    description: '',
    isVisibleToClient: true,
};

// --- MODAL: SERVICE FORM ---
const ServiceFormModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
    initialData?: Service | null;
}> = ({ isOpen, onClose, onSave, initialData }) => {
    const isEditMode = !!initialData;
    const [formData, setFormData] = useState<Omit<Service, 'id'>>(isEditMode ? initialData! : emptyService);
    const [isSubmitting, setIsSubmitting] = useState(false);

    React.useEffect(() => {
        setFormData(isEditMode ? initialData! : emptyService);
    }, [initialData, isEditMode, isOpen]);

    if (!isOpen) return null;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        if (type === 'checkbox') {
            const { checked } = e.target as HTMLInputElement;
            setFormData(prev => ({ ...prev, [name]: checked }));
        } else {
            const processedValue = type === 'number' ? parseFloat(value) : value;
            setFormData(prev => ({ ...prev, [name]: processedValue }));
        }
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            let success = false;

            if (isEditMode) {
                success = await updateService(initialData.id, formData);
            } else {
                success = await addService(formData);
            }

            if (success) {
                alert(isEditMode ? 'Serviço atualizado com sucesso!' : 'Serviço adicionado com sucesso!');
                onSave();
            } else {
                alert('Erro ao salvar serviço. Verifique o console para mais detalhes.');
            }
        } catch (error) {
            console.error('Error in handleSubmit:', error);
            alert('Erro inesperado ao salvar serviço.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-fade-in-fast p-4" onClick={onClose}>
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <header className="p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">{isEditMode ? 'Editar Serviço' : 'Adicionar Novo Serviço'}</h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700"><XIcon className="w-6 h-6 text-slate-500 dark:text-slate-400" /></button>
                </header>
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Nome do Serviço</label>
                        <input type="text" name="name" id="name" value={formData.name} onChange={handleChange} required className="mt-1 w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg shadow-sm focus:ring-purple-500 focus:border-purple-500" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="category" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Categoria</label>
                            <select name="category" id="category" value={formData.category} onChange={handleChange} className="mt-1 w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg shadow-sm focus:ring-purple-500 focus:border-purple-500">
                                {serviceCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="status" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Status</label>
                            <select name="status" id="status" value={formData.status} onChange={handleChange} className="mt-1 w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg shadow-sm focus:ring-purple-500 focus:border-purple-500">
                                <option value="Ativo">Ativo</option>
                                <option value="Inativo">Inativo</option>
                            </select>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="duration_minutes" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Duração (minutos)</label>
                            <input type="number" name="duration_minutes" id="duration_minutes" value={formData.duration_minutes} onChange={handleChange} required className="mt-1 w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg shadow-sm focus:ring-purple-500 focus:border-purple-500" />
                        </div>
                        <div>
                            <label htmlFor="price" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Preço Padrão (R$)</label>
                            <input type="number" step="0.01" name="price" id="price" value={formData.price} onChange={handleChange} required className="mt-1 w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg shadow-sm focus:ring-purple-500 focus:border-purple-500" />
                        </div>
                    </div>
                    <div>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                name="isVisibleToClient"
                                checked={!!formData.isVisibleToClient}
                                onChange={handleChange}
                                className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                            />
                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Visível para clientes no agendamento</span>
                        </label>
                    </div>
                    <div>
                        <label htmlFor="description" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Descrição Interna (opcional)</label>
                        <textarea name="description" id="description" value={formData.description || ''} onChange={handleChange} rows={3} className="mt-1 w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg shadow-sm focus:ring-purple-500 focus:border-purple-500" placeholder="Notas sobre o que este serviço inclui..."></textarea>
                    </div>
                </form>
                <footer className="p-6 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3 bg-slate-50 dark:bg-slate-800/50 rounded-b-2xl">
                    <button onClick={onClose} type="button" className="bg-white dark:bg-slate-700 py-2 px-4 border border-slate-300 dark:border-slate-600 rounded-lg text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-600">Cancelar</button>
                    <button onClick={handleSubmit} disabled={isSubmitting} className="font-semibold text-white bg-green-500 px-5 py-2.5 rounded-lg shadow-md hover:bg-green-600 transition-shadow disabled:opacity-50">{isSubmitting ? 'Salvando...' : 'Salvar Serviço'}</button>
                </footer>
            </div>
        </div>
    );
};

// --- MAIN COMPONENT ---
const ManageServices: React.FC = () => {
    const [allServices, setAllServices] = useState<Service[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingService, setEditingService] = useState<Service | null>(null);

    // Filters
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'Ativo' | 'Inativo'>('all');
    const [categoryFilter, setCategoryFilter] = useState<'all' | ServiceCategory>('all');

    const fetchServices = async () => {
        const services = await getServices();
        setAllServices(services);
    };

    useEffect(() => {
        fetchServices();
    }, []);

    const refreshServices = () => {
        fetchServices();
    };

    const filteredServices = useMemo(() => {
        return allServices
            .filter(s => {
                if (statusFilter !== 'all' && s.status !== statusFilter) return false;
                if (categoryFilter !== 'all' && s.category !== categoryFilter) return false;
                if (searchQuery.trim() && !s.name.toLowerCase().includes(searchQuery.toLowerCase().trim())) return false;
                return true;
            })
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [allServices, searchQuery, statusFilter, categoryFilter]);

    const handleAddNew = () => { setEditingService(null); setIsModalOpen(true); };
    const handleEdit = (service: Service) => { setEditingService(service); setIsModalOpen(true); };
    const handleSave = () => { refreshServices(); setIsModalOpen(false); };

    const handleToggleStatus = async (service: Service) => {
        const newStatus = service.status === 'Ativo' ? 'Inativo' : 'Ativo';
        if (window.confirm(`Tem certeza que deseja alterar o status de "${service.name}" para ${newStatus}?`)) {
            const success = await updateService(service.id, { status: newStatus });
            if (success) {
                refreshServices();
            } else {
                alert('Erro ao alterar status. Verifique o console.');
            }
        }
    };

    return (
        <div className="space-y-8 animate-fade-in">
            <header className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Gerenciar Serviços</h1>
                    <p className="text-slate-500 dark:text-slate-400">Adicione, edite e organize os serviços oferecidos.</p>
                </div>
                <button onClick={handleAddNew} className="font-semibold text-white bg-gradient-to-r from-purple-600 to-pink-500 px-5 py-2.5 rounded-lg shadow-md hover:shadow-lg transition-shadow flex items-center gap-2 self-start sm:self-center">
                    <PlusIcon className="w-5 h-5" />Adicionar Serviço
                </button>
            </header>

            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="md:col-span-1 relative">
                        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 dark:text-slate-500" />
                        <input type="text" placeholder="Buscar por nome..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full p-2 pl-10 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg" />
                    </div>
                    <div>
                        <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value as any)} className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg">
                            <option value="all">Todas as Categorias</option>
                            {serviceCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                        </select>
                    </div>
                    <div>
                        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)} className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg">
                            <option value="all">Todos os Status</option>
                            <option value="Ativo">Ativo</option>
                            <option value="Inativo">Inativo</option>
                        </select>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-slate-700 dark:text-slate-300 uppercase bg-slate-50 dark:bg-slate-700/50">
                            <tr>
                                <th scope="col" className="px-6 py-3">Nome do Serviço</th>
                                <th scope="col" className="px-6 py-3">Categoria</th>
                                <th scope="col" className="px-6 py-3 text-center">Duração</th>
                                <th scope="col" className="px-6 py-3 text-right">Preço Padrão</th>
                                <th scope="col" className="px-6 py-3 text-center">Visibilidade</th>
                                <th scope="col" className="px-6 py-3 text-center">Status</th>
                                <th scope="col" className="px-6 py-3 text-center">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                            {filteredServices.map(service => (
                                <tr key={service.id} className="bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                    <td className="px-6 py-4 font-bold text-slate-800 dark:text-slate-100">{service.name}</td>
                                    <td className="px-6 py-4 text-slate-600 dark:text-slate-300">{service.category}</td>
                                    <td className="px-6 py-4 text-center text-slate-600 dark:text-slate-300">{service.duration_minutes} min</td>
                                    <td className="px-6 py-4 text-right font-semibold text-green-700 dark:text-green-400">{service.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                                    <td className="px-6 py-4 text-center">
                                        {service.isVisibleToClient ? (
                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
                                                <EyeIcon className="w-3 h-3" /> Público
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                                                <EyeOffIcon className="w-3 h-3" /> Interno
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`inline-block px-3 py-1 font-semibold text-xs rounded-full ${service.status === 'Ativo' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'}`}>
                                            {service.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center justify-center gap-2">
                                            <button onClick={() => handleToggleStatus(service)} className={`font-semibold text-xs px-3 py-1.5 rounded-md transition-colors ${service.status === 'Ativo' ? 'hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400' : 'hover:bg-green-100 dark:hover:bg-green-900/30 text-green-600 dark:text-green-400'}`}>
                                                {service.status === 'Ativo' ? 'Inativar' : 'Ativar'}
                                            </button>
                                            <button onClick={() => handleEdit(service)} className="p-2 text-blue-600 dark:text-blue-400 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/30"><EditIcon className="w-4 h-4" /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {filteredServices.length === 0 && <div className="text-center p-8 text-slate-500 dark:text-slate-400">Nenhum serviço encontrado com os filtros aplicados.</div>}
                </div>
            </div>

            <ServiceFormModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSave}
                initialData={editingService}
            />
        </div>
    );
};

export default ManageServices;
