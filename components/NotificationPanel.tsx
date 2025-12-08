
import React from 'react';
import { Notification } from '../types';
import { CheckCircleIcon, InfoIcon, AlertTriangleIcon, XCircleIcon, XIcon } from './icons';

interface NotificationPanelProps {
    notifications: Notification[];
    onMarkAsRead: (id?: string) => void;
    onClose: () => void;
    onNavigate?: (path: string) => void;
}

const iconMap: Record<Notification['type'], React.ReactNode> = {
    success: <CheckCircleIcon className="w-5 h-5 text-green-500" />,
    info: <InfoIcon className="w-5 h-5 text-blue-500" />,
    warning: <AlertTriangleIcon className="w-5 h-5 text-amber-500" />,
    urgent: <XCircleIcon className="w-5 h-5 text-red-500" />,
};

const NotificationPanel: React.FC<NotificationPanelProps> = ({ notifications, onMarkAsRead, onClose, onNavigate }) => {
    const hasUnread = notifications.some(n => !n.read);

    const handleNotificationClick = (notification: Notification) => {
        if (!notification.read) {
            onMarkAsRead(notification.id);
        }
        if (notification.link && onNavigate) {
            onNavigate(notification.link);
            onClose();
        } else if (notification.link) {
            // Fallback if no navigate function (e.g. external link)
            window.location.hash = notification.link; // Or window.open for external
            onClose();
        }
    };

    return (
        <>
            <div className="fixed inset-0 z-40" onClick={onClose}></div>
            <div className="absolute right-0 top-full mt-3 w-80 sm:w-96 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 z-50 overflow-hidden animate-fade-in-fast origin-top-right">
                <header className="px-4 py-3 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900">
                    <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">Notificações</h3>
                    {hasUnread && (
                        <button onClick={() => onMarkAsRead()} className="text-xs text-purple-600 dark:text-purple-400 font-semibold hover:underline">
                            Marcar todas como lidas
                        </button>
                    )}
                </header>
                <div className="max-h-[400px] overflow-y-auto">
                    {notifications.length > 0 ? (
                        <ul className="divide-y divide-slate-100 dark:divide-slate-700">
                            {notifications.map(notification => (
                                <li
                                    key={notification.id}
                                    onClick={() => handleNotificationClick(notification)}
                                    className={`p-4 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer flex gap-3 ${!notification.read ? 'bg-purple-50/30 dark:bg-purple-900/20' : ''}`}
                                >
                                    <div className="mt-0.5 flex-shrink-0">
                                        {iconMap[notification.type]}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex justify-between items-start">
                                            <p className={`text-sm ${!notification.read ? 'font-bold text-slate-800 dark:text-slate-100' : 'font-medium text-slate-600 dark:text-slate-300'}`}>
                                                {notification.title}
                                            </p>
                                            {!notification.read && <span className="w-2 h-2 bg-purple-500 rounded-full mt-1.5"></span>}
                                        </div>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                                            {notification.message}
                                        </p>
                                        <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-2">
                                            {new Date(notification.timestamp).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                                        </p>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <div className="p-8 text-center">
                            <div className="bg-slate-100 dark:bg-slate-700 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                                <InfoIcon className="w-6 h-6 text-slate-400 dark:text-slate-500" />
                            </div>
                            <p className="text-slate-500 dark:text-slate-400 text-sm">Nenhuma notificação no momento.</p>
                        </div>
                    )}
                </div>
                <footer className="px-4 py-2 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-center">
                    <button onClick={onClose} className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 font-medium">
                        Fechar
                    </button>
                </footer>
            </div>
        </>
    );
};

export default NotificationPanel;
