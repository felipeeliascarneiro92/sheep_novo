import React, { useState, useEffect } from 'react';
import { MarketingPost, MarketingPostType } from '../types';
import { getMarketingPosts, createMarketingPost, updateMarketingPost, deleteMarketingPost, getAllMarketingPosts } from '../services/marketingService';
import { MegaphoneIcon, PlusIcon, EditIcon, TrashIcon, SaveIcon, XIcon, GiftIcon, InfoIcon, TrendingUpIcon, ImagePlusIcon } from './icons';

const ManageMarketingPage: React.FC = () => {
    const [posts, setPosts] = useState<MarketingPost[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingPost, setEditingPost] = useState<MarketingPost | null>(null);

    // Form State
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [imageUrl, setImageUrl] = useState('');
    const [type, setType] = useState<MarketingPostType>('news');
    const [actionLink, setActionLink] = useState('');
    const [actionText, setActionText] = useState('');
    const [isActive, setIsActive] = useState(true);

    useEffect(() => {
        fetchPosts();
    }, []);

    const fetchPosts = async () => {
        setIsLoading(true);
        const data = await getAllMarketingPosts();
        setPosts(data);
        setIsLoading(false);
    };

    const handleOpenModal = (post?: MarketingPost) => {
        if (post) {
            setEditingPost(post);
            setTitle(post.title);
            setContent(post.content);
            setImageUrl(post.imageUrl || '');
            setType(post.type);
            setActionLink(post.actionLink || '');
            setActionText(post.actionText || '');
            setIsActive(post.isActive);
        } else {
            setEditingPost(null);
            setTitle('');
            setContent('');
            setImageUrl('');
            setType('news');
            setActionLink('');
            setActionText('');
            setIsActive(true);
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingPost(null);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();

        const postData = {
            title,
            content,
            imageUrl: imageUrl || undefined,
            type,
            actionLink: actionLink || undefined,
            actionText: actionText || undefined,
            isActive
        };

        if (editingPost) {
            await updateMarketingPost(editingPost.id, postData);
        } else {
            await createMarketingPost(postData);
        }

        handleCloseModal();
        fetchPosts();
    };

    const handleDelete = async (id: string) => {
        if (window.confirm('Tem certeza que deseja excluir este post?')) {
            await deleteMarketingPost(id);
            fetchPosts();
        }
    };

    const getTypeLabel = (type: MarketingPostType) => {
        switch (type) {
            case 'promotion': return 'Promoção';
            case 'news': return 'Novidade';
            case 'tip': return 'Dica';
            case 'upsell': return 'Oportunidade';
            default: return type;
        }
    };

    const getTypeColor = (type: MarketingPostType) => {
        switch (type) {
            case 'promotion': return 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300';
            case 'news': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
            case 'tip': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300';
            case 'upsell': return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300';
            default: return 'bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-300';
        }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Marketing & Banners</h1>
                    <p className="text-slate-500 dark:text-slate-400">Gerencie os banners e comunicados exibidos no dashboard dos clientes.</p>
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-lg shadow-purple-500/20"
                >
                    <PlusIcon className="w-5 h-5" />
                    Novo Post
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {isLoading ? (
                    <p className="text-slate-500 col-span-full text-center py-10">Carregando posts...</p>
                ) : posts.length === 0 ? (
                    <div className="col-span-full text-center py-16 bg-white dark:bg-slate-800 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
                        <MegaphoneIcon className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                        <p className="text-slate-500 dark:text-slate-400">Nenhum post de marketing criado ainda.</p>
                        <button onClick={() => handleOpenModal()} className="text-purple-600 font-bold mt-2 hover:underline">Criar o primeiro</button>
                    </div>
                ) : (
                    posts.map(post => (
                        <div key={post.id} className={`bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden group flex flex-col ${!post.isActive ? 'opacity-60 grayscale' : ''}`}>
                            <div className="h-40 bg-slate-200 dark:bg-slate-700 relative overflow-hidden">
                                {post.imageUrl ? (
                                    <img src={post.imageUrl} alt={post.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                                ) : (
                                    <div className="flex items-center justify-center h-full text-slate-400">
                                        <ImagePlusIcon className="w-10 h-10" />
                                    </div>
                                )}
                                <div className="absolute top-3 right-3 flex gap-2">
                                    <span className={`text-xs font-bold px-2 py-1 rounded-full shadow-sm ${getTypeColor(post.type)}`}>
                                        {getTypeLabel(post.type)}
                                    </span>
                                    {!post.isActive && (
                                        <span className="text-xs font-bold px-2 py-1 rounded-full bg-slate-600 text-white shadow-sm">
                                            Inativo
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className="p-5 flex-1 flex flex-col">
                                <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100 mb-2 line-clamp-1">{post.title}</h3>
                                <p className="text-slate-500 dark:text-slate-400 text-sm mb-4 line-clamp-3 flex-1">{post.content}</p>

                                <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-700 mt-auto">
                                    <span className="text-xs text-slate-400">
                                        {new Date(post.createdAt).toLocaleDateString('pt-BR')}
                                    </span>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleOpenModal(post)}
                                            className="p-2 text-slate-500 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors"
                                            title="Editar"
                                        >
                                            <EditIcon className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(post.id)}
                                            className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                            title="Excluir"
                                        >
                                            <TrashIcon className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Edit/Create Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
                                {editingPost ? 'Editar Post' : 'Novo Post de Marketing'}
                            </h2>
                            <button onClick={handleCloseModal} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                                <XIcon className="w-6 h-6" />
                            </button>
                        </div>

                        <form onSubmit={handleSave} className="p-6 overflow-y-auto space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Título</label>
                                    <input
                                        type="text"
                                        required
                                        value={title}
                                        onChange={e => setTitle(e.target.value)}
                                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                        placeholder="Ex: Promoção de Verão"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Tipo</label>
                                    <select
                                        value={type}
                                        onChange={e => setType(e.target.value as MarketingPostType)}
                                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                    >
                                        <option value="news">Novidade</option>
                                        <option value="promotion">Promoção</option>
                                        <option value="tip">Dica</option>
                                        <option value="upsell">Oportunidade (Upsell)</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Conteúdo</label>
                                <textarea
                                    required
                                    value={content}
                                    onChange={e => setContent(e.target.value)}
                                    rows={4}
                                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                    placeholder="Descreva a novidade ou promoção..."
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">URL da Imagem (Opcional)</label>
                                <input
                                    type="url"
                                    value={imageUrl}
                                    onChange={e => setImageUrl(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                    placeholder="https://exemplo.com/imagem.jpg"
                                />
                                <p className="text-xs text-slate-500 mt-1">Recomendado: Imagens horizontais de alta qualidade (Unsplash, etc).</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Texto do Botão (Opcional)</label>
                                    <input
                                        type="text"
                                        value={actionText}
                                        onChange={e => setActionText(e.target.value)}
                                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                        placeholder="Ex: Ver Detalhes"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Link de Ação (Opcional)</label>
                                    <input
                                        type="text"
                                        value={actionLink}
                                        onChange={e => setActionLink(e.target.value)}
                                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                        placeholder="Ex: /booking?service=drone ou https://..."
                                    />
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="isActive"
                                    checked={isActive}
                                    onChange={e => setIsActive(e.target.checked)}
                                    className="w-4 h-4 text-purple-600 border-slate-300 rounded focus:ring-purple-500"
                                />
                                <label htmlFor="isActive" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                    Post Ativo (Visível para clientes)
                                </label>
                            </div>

                            <div className="pt-4 flex justify-end gap-3 border-t border-slate-200 dark:border-slate-700 mt-4">
                                <button
                                    type="button"
                                    onClick={handleCloseModal}
                                    className="px-4 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg shadow-lg shadow-purple-500/20 transition-colors flex items-center gap-2"
                                >
                                    <SaveIcon className="w-4 h-4" />
                                    Salvar Post
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ManageMarketingPage;
