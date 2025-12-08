import React, { useState } from 'react';
import { OptimizationSuggestion } from '../types';
import { reassignBooking } from '../services/bookingService';
import { RouteIcon, RefreshCwIcon, CheckCircleIcon, ArrowLeftIcon } from './icons';

interface RouteOptimizerWidgetProps {
    suggestions: OptimizationSuggestion[];
    onRefresh: () => void;
}

const RouteOptimizerWidget: React.FC<RouteOptimizerWidgetProps> = ({ suggestions, onRefresh }) => {
    const [appliedSwaps, setAppliedSwaps] = useState<number[]>([]);

    const handleApplySwap = (index: number, suggestion: OptimizationSuggestion) => {
        reassignBooking(suggestion.bookingA.id, suggestion.photographerB.id);
        reassignBooking(suggestion.bookingB.id, suggestion.photographerA.id);
        setAppliedSwaps(prev => [...prev, index]);
        setTimeout(onRefresh, 1500); // Refresh after animation
    };

    if (suggestions.length === 0) return null;

    return (
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl shadow-lg p-6 text-white mb-8 animate-fade-in relative overflow-hidden">
            <div className="absolute top-0 right-0 opacity-10 -mr-10 -mt-10">
                <RouteIcon className="w-64 h-64 text-white" />
            </div>
            
            <div className="relative z-10">
                <div className="flex items-center gap-3 mb-4">
                    <div className="bg-white/20 p-2 rounded-full">
                        <RouteIcon className="w-6 h-6 text-white animate-pulse" />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold">Otimização de Rota Detectada!</h3>
                        <p className="text-white/80 text-sm">Encontramos {suggestions.length} oportunidade(s) para economizar combustível e tempo hoje.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {suggestions.map((s, i) => {
                        if (appliedSwaps.includes(i)) return null;
                        return (
                            <div key={i} className="bg-white text-slate-800 rounded-lg p-4 shadow-md flex flex-col justify-between">
                                <div>
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-xs font-bold bg-green-100 text-green-700 px-2 py-1 rounded-full">
                                            Economia: {s.savingKm.toFixed(1)} km
                                        </span>
                                        <span className="text-xs text-slate-400 font-mono">
                                            {s.bookingA.start_time}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm mb-3">
                                        <div className="text-center">
                                            <p className="font-bold text-purple-700">{s.photographerA.name.split(' ')[0]}</p>
                                            <ArrowLeftIcon className="w-4 h-4 mx-auto text-slate-300 rotate-180 my-1"/>
                                            <p className="text-xs text-slate-500 truncate w-20">{s.bookingA.address.split(',')[1]}</p>
                                        </div>
                                        <RefreshCwIcon className="w-5 h-5 text-slate-400 mx-2"/>
                                        <div className="text-center">
                                            <p className="font-bold text-indigo-700">{s.photographerB.name.split(' ')[0]}</p>
                                            <ArrowLeftIcon className="w-4 h-4 mx-auto text-slate-300 rotate-180 my-1"/>
                                            <p className="text-xs text-slate-500 truncate w-20">{s.bookingB.address.split(',')[1]}</p>
                                        </div>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => handleApplySwap(i, s)}
                                    className="w-full bg-slate-900 text-white font-bold py-2 rounded-md text-xs hover:bg-slate-700 transition-colors flex items-center justify-center gap-2"
                                >
                                    <CheckCircleIcon className="w-3 h-3" /> Aplicar Troca
                                </button>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    );
};

export default RouteOptimizerWidget;