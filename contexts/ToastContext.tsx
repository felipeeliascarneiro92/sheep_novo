import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { CheckCircleIcon, XCircleIcon, AlertTriangleIcon, XIcon } from '../components/icons';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
    id: string;
    message: string;
    type: ToastType;
}

interface ToastContextType {
    showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
};

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const showToast = useCallback((message: string, type: ToastType = 'info') => {
        const id = Math.random().toString(36).substring(2, 9);
        setToasts((prev) => [...prev, { id, message, type }]);

        setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id));
        }, 3000);
    }, []);

    const removeToast = (id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    };

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
                {toasts.map((toast) => (
                    <div
                        key={toast.id}
                        className={`pointer-events-auto min-w-[300px] max-w-md p-4 rounded-lg shadow-lg border flex items-start gap-3 animate-fade-in-up transition-all transform hover:scale-105 ${toast.type === 'success' ? 'bg-white border-green-200 text-green-800' :
                                toast.type === 'error' ? 'bg-white border-red-200 text-red-800' :
                                    toast.type === 'warning' ? 'bg-white border-yellow-200 text-yellow-800' :
                                        'bg-white border-blue-200 text-blue-800'
                            }`}
                    >
                        <div className="mt-0.5">
                            {toast.type === 'success' && <CheckCircleIcon className="w-5 h-5 text-green-500" />}
                            {toast.type === 'error' && <XCircleIcon className="w-5 h-5 text-red-500" />}
                            {toast.type === 'warning' && <AlertTriangleIcon className="w-5 h-5 text-yellow-500" />}
                            {toast.type === 'info' && <CheckCircleIcon className="w-5 h-5 text-blue-500" />}
                        </div>
                        <div className="flex-1">
                            <p className="text-sm font-semibold">{toast.message}</p>
                        </div>
                        <button onClick={() => removeToast(toast.id)} className="text-slate-400 hover:text-slate-600">
                            <XIcon className="w-4 h-4" />
                        </button>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
};
