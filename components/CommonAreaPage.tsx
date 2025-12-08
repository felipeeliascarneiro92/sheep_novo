import React, { useState, useMemo, useEffect } from 'react';
// FIX: Added missing function import from bookingService.ts.
import { getCommonAreas } from '../services/resourceService';
import { getAllBookings } from '../services/bookingService';
import { CommonArea, Booking } from '../types';
import { SearchIcon } from './icons';

const CommonAreaPage: React.FC = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [allCommonAreas, setAllCommonAreas] = useState<CommonArea[]>([]);
    const [bookings, setBookings] = useState<Booking[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            const [areas, allBookings] = await Promise.all([
                getCommonAreas(),
                getAllBookings()
            ]);
            setAllCommonAreas(areas);
            setBookings(allBookings);
        };
        fetchData();
    }, []);

    const filteredAreas = useMemo(() => {
        if (!searchQuery.trim()) {
            return allCommonAreas;
        }
        const lowerQuery = searchQuery.toLowerCase();
        return allCommonAreas.filter(area =>
            area.name.toLowerCase().includes(lowerQuery) ||
            area.fullAddress.toLowerCase().includes(lowerQuery)
        );
    }, [allCommonAreas, searchQuery]);

    const getLastSessionDate = (areaId: string) => {
        const areaBookings = bookings.filter(b => b.commonAreaId === areaId && (b.status === 'Realizado' || b.status === 'Concluído'));
        if (areaBookings.length === 0) return null;

        // Sort by date desc
        const sorted = [...areaBookings].sort((a, b) => {
            const dateA = new Date(a.date || 0).getTime();
            const dateB = new Date(b.date || 0).getTime();
            return dateB - dateA;
        });

        return sorted[0].date;
    };

    return (
        <div className="space-y-8 animate-fade-in">
            <header>
                <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Áreas Comuns</h1>
                <p className="text-slate-500 dark:text-slate-400">Pesquise por endereços para visualizar mídias e observações existentes.</p>
            </header>

            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
                <div className="relative mb-6">
                    <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 dark:text-slate-500" />
                    <input
                        type="text"
                        placeholder="Buscar por nome ou endereço..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full p-3 pl-12 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg shadow-sm focus:ring-purple-500 focus:border-purple-500 transition-colors"
                    />
                </div>

                <div className="space-y-4">
                    {filteredAreas.length > 0 ? filteredAreas.map(area => {
                        const lastSessionDate = getLastSessionDate(area.id);

                        return (
                            <div key={area.id} className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="font-bold text-purple-700 dark:text-purple-400">{area.fullAddress}</h3>
                                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                                            {lastSessionDate
                                                ? `Última sessão: ${new Date(lastSessionDate + 'T00:00:00').toLocaleDateString('pt-BR')} `
                                                : 'Nenhuma sessão realizada ainda.'}
                                        </p>
                                    </div>
                                    <span className="text-sm text-slate-600 dark:text-slate-300 font-medium">
                                        Cadastrado em: {new Date(area.createdAt).toLocaleDateString('pt-BR')}
                                    </span>
                                </div>
                                <div className="mt-3">
                                    <a href={area.media_link} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline">
                                        Link da Pasta: {area.media_link}
                                    </a>
                                    {area.notes && (
                                        <p className="mt-2 text-sm bg-yellow-50 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 border-l-4 border-yellow-400 dark:border-yellow-600 p-3 rounded-r-lg">
                                            <strong>Obs:</strong> {area.notes}
                                        </p>
                                    )}
                                </div>
                            </div>
                        );
                    }) : (
                        <div className="text-center py-10 text-slate-500 dark:text-slate-400">
                            <p>Nenhuma área comum encontrada com os termos da busca.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CommonAreaPage;
