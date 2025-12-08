import React, { useEffect, useState } from 'react';
import { getRecentFeedbacks, PhotographerFeedback } from '../services/photographerFinanceService';
import { AlertTriangleIcon, CheckCircleIcon, ClockIcon } from './icons';

interface RecentFailuresWidgetProps {
    photographerId?: string; // If provided, shows only for this photographer
    limit?: number;
}

const RecentFailuresWidget: React.FC<RecentFailuresWidgetProps> = ({ photographerId, limit = 5 }) => {
    const [feedbacks, setFeedbacks] = useState<(PhotographerFeedback & { bookings: { date: string, address: string } })[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchFeedbacks = async () => {
            const data = await getRecentFeedbacks(limit, photographerId);
            setFeedbacks(data);
            setLoading(false);
        };
        fetchFeedbacks();
    }, [photographerId, limit]);

    if (loading) return <div className="animate-pulse h-32 bg-slate-100 rounded-lg"></div>;

    if (feedbacks.length === 0) {
        return (
            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 text-center">
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
                    <CheckCircleIcon className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="font-bold text-slate-800 dark:text-slate-100">Nenhuma falha recente</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">Tudo operando perfeitamente!</p>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
            <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
                <AlertTriangleIcon className="w-5 h-5 text-red-500" />
                {photographerId ? 'Meus Alertas & Feedbacks' : 'Falhas Recentes (Geral)'}
            </h3>
            <div className="space-y-4">
                {feedbacks.map(feedback => (
                    <div key={feedback.id} className="flex gap-3 items-start p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-700">
                        <div className={`mt-1 min-w-[6px] h-6 rounded-full ${feedback.severity === 'CRITICAL' ? 'bg-red-500' : 'bg-yellow-500'}`}></div>
                        <div className="flex-1">
                            <div className="flex justify-between items-start">
                                <p className="font-bold text-slate-800 dark:text-slate-100 text-sm">{feedback.category.replace(/_/g, ' ')}</p>
                                <span className="text-[10px] font-bold text-slate-400 uppercase">{new Date(feedback.created_at).toLocaleDateString()}</span>
                            </div>
                            <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 italic">"{feedback.notes}"</p>
                            {feedback.bookings && (
                                <p className="text-[10px] text-slate-400 mt-2 flex items-center gap-1">
                                    <ClockIcon className="w-3 h-3" /> {new Date(feedback.bookings.date).toLocaleDateString()} - {feedback.bookings.address}
                                </p>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default RecentFailuresWidget;
