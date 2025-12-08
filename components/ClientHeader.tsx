import React, { useState, useEffect } from 'react';
import { User } from '../App';
import { useTheme } from '../contexts/ThemeContext';
import { MenuIcon, BellIcon, UserIcon, WalletIcon, SunIcon, MoonIcon } from './icons';
import NotificationPanel from './NotificationPanel';
import { Notification } from '../types';
import { getNotificationsForUser } from '../services/notificationService';

interface ClientHeaderProps {
    user: User;
    onMenuClick: () => void;
    balance?: number;
    paymentType?: 'Pré-pago' | 'Pós-pago';
}

const ClientHeader: React.FC<ClientHeaderProps> = ({ user, onMenuClick, balance, paymentType }) => {
    const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const { theme, toggleTheme } = useTheme();

    useEffect(() => {
        const fetchNotifications = async () => {
            const loaded = await getNotificationsForUser(user.role as any, user.id);
            setNotifications(loaded);
        };
        fetchNotifications();
    }, [user.role, user.id]);

    const unreadCount = notifications.filter(n => !n.read).length;

    const handleMarkAsRead = (id?: string) => {
        setNotifications(prev => prev.map(n =>
            (!id || n.id === id) ? { ...n, read: true } : n
        ));
    };

    return (
        <header className="bg-[#f3f4f8]/80 dark:bg-slate-900/80 backdrop-blur-lg h-20 flex items-center justify-between px-4 sm:px-8 flex-shrink-0 sticky top-0 z-30 border-b border-transparent dark:border-slate-800 transition-colors duration-300">
            <div className="flex items-center gap-4">
                <button onClick={onMenuClick} className="md:hidden p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400"><MenuIcon className="w-6 h-6" /></button>
                <div>
                    <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Portal do {user.role === 'broker' ? 'Corretor' : 'Cliente'}</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 hidden sm:block">Bem-vindo, {user.name.split(' ')[0]}!</p>
                </div>
            </div>
            <div className="flex items-center gap-4">
                {/* Wallet Display for Client - ONLY for Pre-paid */}
                {user.role === 'client' && balance !== undefined && paymentType === 'Pré-pago' && (
                    <div className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full border ${balance < 0 ? 'bg-red-50 border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400' : 'bg-green-50 border-green-200 text-green-700 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400'}`}>
                        <WalletIcon className="w-4 h-4" />
                        <span className="font-bold text-sm">R$ {balance.toFixed(2)}</span>
                    </div>
                )}

                <button
                    onClick={toggleTheme}
                    className="p-2 rounded-full hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors text-slate-600 dark:text-slate-400"
                    title={theme === 'dark' ? 'Mudar para modo claro' : 'Mudar para modo escuro'}
                >
                    {theme === 'dark' ? <SunIcon className="w-6 h-6" /> : <MoonIcon className="w-6 h-6" />}
                </button>

                <div className="relative">
                    <button
                        onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                        className="p-2 rounded-full hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors relative"
                    >
                        <BellIcon className="w-6 h-6 text-slate-600 dark:text-slate-400" />
                        {unreadCount > 0 && (
                            <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-[#f3f4f8] dark:border-slate-900">
                                {unreadCount}
                            </span>
                        )}
                    </button>
                    {isNotificationsOpen && (
                        <NotificationPanel
                            notifications={notifications}
                            onMarkAsRead={handleMarkAsRead}
                            onClose={() => setIsNotificationsOpen(false)}
                        />
                    )}
                </div>

                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center relative ring-2 ring-offset-2 ring-purple-400 dark:ring-offset-slate-900 overflow-hidden">
                        {user.profilePicUrl ? <img src={user.profilePicUrl} alt={user.name} className="w-full h-full object-cover" /> : <UserIcon className="w-6 h-6 text-slate-500 dark:text-slate-400" />}
                        <span className="absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full bg-green-400 ring-2 ring-white dark:ring-slate-900"></span>
                    </div>
                    <div className="text-right hidden sm:block">
                        <p className="font-bold text-sm text-slate-800 dark:text-slate-200">{user.name}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 capitalize">{user.role}</p>
                    </div>
                </div>
            </div>
        </header>
    );
};

export default ClientHeader;
