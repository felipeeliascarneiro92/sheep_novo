
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getTodayConversationsForUser, sendMessage, markMessagesAsRead, subscribeToConversation, uploadChatAttachment } from '../services/chatService';
import { Conversation, Message } from '../types';
import { SendIcon, UserIcon, MapPinIcon, ClockIcon, PaperclipIcon } from './icons';

const ChatPage: React.FC = () => {
    const { user } = useAuth();
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
    const [loading, setLoading] = useState(true);
    const [messageInput, setMessageInput] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!user) return;
        fetchConversations();
    }, [user]);

    const fetchConversations = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const data = await getTodayConversationsForUser(user.id, user.role);
            setConversations(data);
            if (data.length > 0 && !selectedConv) {
                // Auto-select first chat if none selected
                // Optional: setSelectedConv(data[0]);
            }
        } catch (error) {
            console.error("Error loading chats", error);
        } finally {
            setLoading(false);
        }
    };

    // Subscriptions
    useEffect(() => {
        if (!selectedConv) return;

        // Mark read
        if (user) markMessagesAsRead(selectedConv.id, user.id);

        const unsubscribe = subscribeToConversation(selectedConv.id, (newMessage) => {
            setConversations(prevConvs => {
                return prevConvs.map(c => {
                    if (c.id === selectedConv.id) {
                        // Avoid duplicates if strict mode causes double render
                        if (c.messages?.find(m => m.id === newMessage.id)) return c;
                        return { ...c, messages: [...(c.messages || []), newMessage] };
                    }
                    return c;
                });
            });
            // Also update selected conv state locally to reflect immediate changes
            setSelectedConv(prev => {
                if (!prev || prev.id !== selectedConv.id) return prev;
                if (prev.messages?.find(m => m.id === newMessage.id)) return prev;
                return { ...prev, messages: [...(prev.messages || []), newMessage] };
            });

            scrollToBottom();
        });

        return () => {
            unsubscribe();
        };
    }, [selectedConv?.id]);

    const scrollToBottom = () => {
        setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 100);
    };

    useEffect(() => {
        scrollToBottom();
    }, [selectedConv?.messages]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!messageInput.trim() || !selectedConv || !user) return;

        const content = messageInput;
        setMessageInput(''); // Optimistic clear

        await sendMessage(selectedConv.id, user.id, user.role, content, 'text');
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0 || !selectedConv || !user) return;

        setIsUploading(true);
        const file = e.target.files[0];
        try {
            const publicUrl = await uploadChatAttachment(file);
            if (publicUrl) {
                // Determine type
                const type = file.type.startsWith('image/') ? 'image' : file.type.startsWith('audio/') ? 'audio' : 'file';
                await sendMessage(selectedConv.id, user.id, user.role, type === 'image' ? 'Imagem enviada' : 'Arquivo enviado', type, publicUrl);
            }
        } catch (error) {
            console.error("Upload failed", error);
            alert("Erro ao enviar arquivo.");
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    if (loading && conversations.length === 0) {
        return <div className="p-8 text-center text-slate-500">Carregando conversas...</div>;
    }

    return (
        <div className="flex h-[calc(100vh-100px)] bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden animate-fade-in">
            {/* Sidebar List */}
            <div className={`${selectedConv ? 'hidden md:flex' : 'flex'} w-full md:w-80 flex-col border-r border-slate-200 dark:border-slate-700`}>
                <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
                    <h2 className="font-bold text-slate-800 dark:text-slate-100">Conversas do Dia</h2>
                    <p className="text-xs text-slate-500">Agendamentos de hoje</p>
                </div>
                <div className="flex-1 overflow-y-auto">
                    {conversations.length === 0 ? (
                        <div className="p-8 text-center text-slate-400 text-sm">
                            Nenhum agendamento ativo para hoje.
                        </div>
                    ) : (
                        conversations.map(conv => (
                            <div
                                key={conv.id}
                                onClick={() => {
                                    setSelectedConv(conv);
                                    setConversations(prev => prev.map(c => c.id === conv.id ? { ...c, unreadCount: 0 } : c));
                                }}
                                className={`p-4 border-b border-slate-100 dark:border-slate-800 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors ${selectedConv?.id === conv.id ? 'bg-purple-50 dark:bg-purple-900/20 border-l-4 border-l-purple-500' : ''}`}
                            >
                                <div className="flex justify-between mb-1">
                                    <span className="font-bold text-slate-700 dark:text-slate-200 text-sm truncate">
                                        {user?.role === 'photographer' ? conv.booking?.client_name : conv.booking?.photographer_name || 'Aguardando Fotógrafo'}
                                    </span>
                                    <span className="text-[10px] text-slate-400 flex items-center gap-2">
                                        {conv.booking?.start_time}
                                        {conv.unreadCount && conv.unreadCount > 0 ? (
                                            <span className="bg-red-500 text-white rounded-full px-2 py-0.5 text-[10px] font-bold min-w-[1.25rem] text-center">
                                                {conv.unreadCount}
                                            </span>
                                        ) : null}
                                    </span>
                                </div>
                                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                                    {conv.messages && conv.messages.length > 0
                                        ? conv.messages[conv.messages.length - 1].content
                                        : 'Inicie a conversa...'}
                                </p>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Chat Area */}
            {selectedConv ? (
                <div className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-950">
                    {/* Header */}
                    <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 p-4 flex items-center justify-between shadow-sm z-10">
                        <div className="flex items-center gap-3">
                            <button onClick={() => setSelectedConv(null)} className="md:hidden p-1 -ml-2 mr-2 text-slate-500">
                                ←
                            </button>
                            <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center text-slate-500">
                                <UserIcon className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-800 dark:text-slate-100">
                                    {user?.role === 'photographer' ? selectedConv.booking?.client_name : selectedConv.booking?.photographer_name || 'Fotógrafo'}
                                </h3>
                                <div className="flex items-center gap-3 text-xs text-slate-500">
                                    <span className="flex items-center gap-1"><ClockIcon className="w-3 h-3" /> {selectedConv.booking?.start_time}</span>
                                    <span className="flex items-center gap-1"><MapPinIcon className="w-3 h-3" /> {selectedConv.booking?.address}</span>
                                </div>
                            </div>
                        </div>
                    </header>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        {selectedConv.messages?.length === 0 && (
                            <div className="text-center text-slate-400 text-sm mt-10">
                                Nenhuma mensagem ainda. Envie a primeira mensagem!
                            </div>
                        )}
                        {selectedConv.messages?.map((msg) => {
                            const isMe = msg.sender_id === user?.id;
                            return (
                                <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[80%] rounded-2xl px-4 py-2 shadow-sm text-sm ${isMe ? 'bg-purple-600 text-white rounded-tr-none' : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-tl-none border border-slate-200 dark:border-slate-700'}`}>

                                        {msg.type === 'text' && <p>{msg.content}</p>}

                                        {msg.type === 'image' && (
                                            <div className="mb-1">
                                                <img src={msg.media_url} alt="Envio" className="max-w-full rounded-lg max-h-60 object-cover cursor-pointer" onClick={() => window.open(msg.media_url, '_blank')} />
                                                {msg.content !== 'Imagem enviada' && <p className="mt-1">{msg.content}</p>}
                                            </div>
                                        )}

                                        {msg.type === 'file' && (
                                            <a href={msg.media_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 underline text-blue-300">
                                                📄 Arquivo recebido
                                            </a>
                                        )}

                                        <span className={`text-[9px] block text-right mt-1 opacity-70 ${isMe ? 'text-purple-200' : 'text-slate-400'}`}>
                                            {new Date(msg.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input */}
                    <form onSubmit={handleSend} className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 flex gap-2 items-center">
                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            accept="image/*,.pdf,.doc,.docx"
                            onChange={handleFileSelect}
                        />
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="p-2 lg:p-3 text-slate-400 hover:text-purple-600 transition-colors rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
                            disabled={isUploading}
                        >
                            <PaperclipIcon className="w-5 h-5" />
                        </button>

                        <input
                            type="text"
                            className="flex-1 border border-slate-300 dark:border-slate-600 rounded-full px-4 py-2 focus:ring-2 focus:ring-purple-500 focus:outline-none dark:bg-slate-800 dark:text-white"
                            placeholder={isUploading ? "Enviando arquivo..." : "Digite sua mensagem..."}
                            value={messageInput}
                            onChange={(e) => setMessageInput(e.target.value)}
                            disabled={isUploading}
                        />
                        <button
                            type="submit"
                            disabled={!messageInput.trim() || isUploading}
                            className="bg-purple-600 text-white p-3 rounded-full hover:bg-purple-700 disabled:opacity-50 transition-colors shadow-md"
                        >
                            <SendIcon className="w-5 h-5" />
                        </button>
                    </form>
                </div>
            ) : (
                <div className="hidden md:flex flex-1 items-center justify-center bg-slate-50 dark:bg-slate-950 flex-col text-slate-400">
                    <div className="w-20 h-20 bg-slate-200 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                        <SendIcon className="w-10 h-10 text-slate-400" />
                    </div>
                    <p>Selecione uma conversa para começar</p>
                </div>
            )}
        </div>
    );
};

export default ChatPage;
