
import React, { useState, useMemo, FormEvent, useRef, useEffect } from 'react';
import { getAdmins, addAdmin, updateAdmin, updateEntityProfilePicture } from '../services/bookingService';
import { AdminUser } from '../types';
import { SearchIcon, PlusIcon, EditIcon, UserCogIcon, CheckCircleIcon, XCircleIcon, PhoneIcon, MailIcon, XIcon, CameraIcon, ShieldIcon } from './icons';
import { maskPhone } from '../utils/masks';

const ManageAdmins: React.FC = () => {
    const [allAdmins, setAllAdmins] = useState<AdminUser[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedAdmin, setSelectedAdmin] = useState<AdminUser | null>(null);

    useEffect(() => {
        fetchAdmins();
    }, []);

    const fetchAdmins = async () => {
        setIsLoading(true);
        const data = await getAdmins();
        setAllAdmins(data);
        setIsLoading(false);
    };

    const refreshList = () => fetchAdmins();

    const filteredAdmins = useMemo(() => {
        if (!searchQuery.trim()) return allAdmins;
        const lower = searchQuery.toLowerCase();
        return allAdmins.filter(a => a.name.toLowerCase().includes(lower) || a.email.toLowerCase().includes(lower));
    }, [allAdmins, searchQuery]);

    const handleAddNew = () => {
        setSelectedAdmin(null);
        setIsModalOpen(true);
    };

    const handleEdit = (admin: AdminUser) => {
        setSelectedAdmin(admin);
        setIsModalOpen(true);
    };

    const handleToggleStatus = (admin: AdminUser) => {
        const newStatus = !admin.isActive;
        if (window.confirm(`Tem certeza que deseja ${newStatus ? 'ativar' : 'inativar'} o administrador ${admin.name}?`)) {
            updateAdmin(admin.id, { isActive: newStatus });
            refreshList();
        }
    };

    return (
        <div className="space-y-8 animate-fade-in">
            <header className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Gerenciar Administradores</h1>
                    <p className="text-slate-500 dark:text-slate-400">Controle quem tem acesso total à plataforma.</p>
                </div>
                <button onClick={handleAddNew} className="font-semibold text-white bg-gradient-to-r from-purple-600 to-pink-500 px-5 py-2.5 rounded-lg shadow-md hover:shadow-lg transition-shadow flex items-center gap-2">
                    <PlusIcon className="w-5 h-5" /> Adicionar Admin
                </button>
            </header>

            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
                <div className="relative mb-6">
                    <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 dark:text-slate-500" />
                    <input
                        type="text"
                        placeholder="Buscar por nome ou email..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full p-3 pl-12 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg shadow-sm focus:ring-purple-500 focus:border-purple-500 transition-colors"
                    />
                </div>

                <div className="space-y-4">
                    {filteredAdmins.map(admin => (
                        <div key={admin.id} className={`p-4 border border-slate-200 dark:border-slate-700 rounded-lg transition-all flex flex-col sm:flex-row justify-between items-center gap-4 ${!admin.isActive ? 'bg-slate-100 dark:bg-slate-700/50 opacity-70' : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}>
                            <div className="flex items-center gap-4 w-full sm:w-auto">
                                <div className="w-12 h-12 bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0">
                                    {admin.profilePicUrl ? (
                                        <img src={admin.profilePicUrl} alt={admin.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <UserCogIcon className="w-6 h-6 text-slate-500 dark:text-slate-400" />
                                    )}
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-800 dark:text-slate-100 text-lg flex items-center gap-2">
                                        {admin.name}
                                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${admin.role === 'Super Admin' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300' : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'}`}>{admin.role}</span>
                                    </h3>
                                    <div className="text-sm text-slate-500 dark:text-slate-400 flex flex-col sm:flex-row sm:gap-4">
                                        <span className="flex items-center gap-1"><MailIcon className="w-3 h-3" /> {admin.email}</span>
                                        <span className="flex items-center gap-1"><PhoneIcon className="w-3 h-3" /> {admin.phone}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-2 w-full sm:w-auto justify-end">
                                <button onClick={() => handleToggleStatus(admin)} className={`text-sm font-semibold px-3 py-1.5 rounded-md transition-colors border flex items-center gap-1 ${admin.isActive ? 'text-red-600 dark:text-red-400 border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/20' : 'text-green-600 dark:text-green-400 border-green-200 dark:border-green-800 hover:bg-green-50 dark:hover:bg-green-900/20'}`}>
                                    {admin.isActive ? <><XCircleIcon className="w-4 h-4" /> Inativar</> : <><CheckCircleIcon className="w-4 h-4" /> Ativar</>}
                                </button>
                                <button onClick={() => handleEdit(admin)} className="text-sm font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 px-3 py-1.5 rounded-md transition-colors border border-blue-200 dark:border-blue-800 flex items-center gap-1">
                                    <EditIcon className="w-4 h-4" /> Editar
                                </button>
                            </div>
                        </div>
                    ))}
                    {filteredAdmins.length === 0 && <div className="text-center py-10 text-slate-500 dark:text-slate-400">Nenhum administrador encontrado.</div>}
                </div>
            </div>

            {isModalOpen && (
                <AdminFormModal
                    onClose={() => setIsModalOpen(false)}
                    onSave={() => { refreshList(); setIsModalOpen(false); }}
                    initialData={selectedAdmin}
                />
            )}
        </div>
    );
};

const AdminFormModal: React.FC<{ onClose: () => void; onSave: () => void; initialData: AdminUser | null }> = ({ onClose, onSave, initialData }) => {
    const [formData, setFormData] = useState({
        name: initialData?.name || '',
        email: initialData?.email || '',
        phone: initialData?.phone || '',
        isActive: initialData?.isActive ?? true,
        role: initialData?.role || 'Admin',
        profilePicUrl: initialData?.profilePicUrl || ''
    });
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isSaving, setIsSaving] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        let newValue = value;
        if (name === 'phone') {
            newValue = maskPhone(value);
        }

        if (type === 'checkbox') {
            const { checked } = e.target as HTMLInputElement;
            setFormData(prev => ({ ...prev, [name]: checked }));
        } else {
            setFormData(prev => ({ ...prev, [name]: newValue }));
        }
    };

    const handleProfilePicChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            if (initialData) {
                const base64 = await updateEntityProfilePicture('admin', initialData.id, file);
                setFormData(prev => ({ ...prev, profilePicUrl: base64 }));
            } else {
                const reader = new FileReader();
                reader.onloadend = () => setFormData(prev => ({ ...prev, profilePicUrl: reader.result as string }));
                reader.readAsDataURL(file);
            }
        }
    };

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        // @ts-ignore
        const dataToSave = { ...formData, role: formData.role as 'Admin' | 'Super Admin' };
        if (initialData) {
            updateAdmin(initialData.id, dataToSave);
        } else {
            addAdmin(dataToSave);
        }
        setTimeout(() => {
            setIsSaving(false);
            onSave();
        }, 500);
    };

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-fade-in-fast p-4" onClick={onClose}>
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
                <header className="p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">{initialData ? 'Editar Admin' : 'Novo Admin'}</h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700"><XIcon className="w-6 h-6 text-slate-500 dark:text-slate-400" /></button>
                </header>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="flex justify-center mb-4">
                        <input type="file" ref={fileInputRef} onChange={handleProfilePicChange} className="hidden" accept="image/*" />
                        <div onClick={() => fileInputRef.current?.click()} className="w-24 h-24 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center border-2 border-dashed border-slate-300 dark:border-slate-600 cursor-pointer hover:border-purple-500 dark:hover:border-purple-400 overflow-hidden relative group">
                            {formData.profilePicUrl ? <img src={formData.profilePicUrl} alt="Profile" className="w-full h-full object-cover" /> : <UserCogIcon className="w-10 h-10 text-slate-400 dark:text-slate-500" />}
                            <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100"><CameraIcon className="w-6 h-6 text-white" /></div>
                        </div>
                    </div>

                    <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Nome Completo</label><input type="text" name="name" value={formData.name} onChange={handleChange} required className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg mt-1" /></div>
                    <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Email</label><input type="email" name="email" value={formData.email} onChange={handleChange} required className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg mt-1" /></div>
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Telefone</label><input type="text" name="phone" value={formData.phone} onChange={handleChange} required className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg mt-1" /></div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Permissão</label>
                            <select name="role" value={formData.role} onChange={handleChange} className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg mt-1 bg-white">
                                <option value="Admin">Admin</option>
                                <option value="Super Admin">Super Admin</option>
                            </select>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2">
                        <input type="checkbox" name="isActive" checked={formData.isActive} onChange={handleChange} className="h-4 w-4 text-purple-600 rounded focus:ring-purple-500" />
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Cadastro Ativo</label>
                    </div>

                    <div className="pt-4 flex justify-end gap-3">
                        <button type="button" onClick={onClose} className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium">Cancelar</button>
                        <button type="submit" disabled={isSaving} className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-bold disabled:opacity-50">
                            {isSaving ? 'Salvando...' : 'Salvar'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ManageAdmins;
