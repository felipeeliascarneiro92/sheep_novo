import React, { useState, useEffect, useMemo } from 'react';
import { Photographer } from '../types';
import { calculateDistanceKm, getPhotographerById, getDailySlotsForPhotographer, isSlotFree } from '../services/bookingService';
import { ClockIcon, MapPinIcon, CheckCircleIcon, AlertTriangleIcon } from './icons';

interface PhotographerRecommendationListProps {
    photographers: Photographer[];
    selectedLocation: { lat: number, lng: number } | null;
    selectedDate: Date;
    totalDuration: number;
    selectedPhotographerId: string;
    onSelectPhotographer: (id: string) => void;
}

interface PhotographerWithAvailability extends Photographer {
    distance: number;
    availableSlotsCount: number;
    loadingAvailability: boolean;
}

const PhotographerRecommendationList: React.FC<PhotographerRecommendationListProps> = ({
    photographers,
    selectedLocation,
    selectedDate,
    totalDuration,
    selectedPhotographerId,
    onSelectPhotographer
}) => {
    const [recommendations, setRecommendations] = useState<PhotographerWithAvailability[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!selectedLocation || photographers.length === 0) {
            setRecommendations([]);
            return;
        }

        const fetchAvailability = async () => {
            setLoading(true);
            const dateString = selectedDate.toISOString().split('T')[0];

            // 1. Calculate distances and initial sort
            const withDistance = photographers.map(p => ({
                ...p,
                distance: calculateDistanceKm(selectedLocation.lat, selectedLocation.lng, p.baseLat!, p.baseLng!),
                availableSlotsCount: 0,
                loadingAvailability: true
            })).sort((a, b) => a.distance - b.distance);

            // Take top 10 for detailed check to save resources
            const topCandidates = withDistance.slice(0, 10);
            const others = withDistance.slice(10).map(p => ({ ...p, loadingAvailability: false, availableSlotsCount: -1 })); // -1 means unknown

            // 2. Fetch availability for top candidates in parallel
            const checkedCandidates = await Promise.all(topCandidates.map(async (p) => {
                try {
                    // We need full details for TimeOffs
                    const fullP = await getPhotographerById(p.id);
                    if (!fullP) return { ...p, loadingAvailability: false, availableSlotsCount: 0 };

                    const slots = await getDailySlotsForPhotographer(p.id, dateString);
                    const freeSlots = slots.filter(slot => isSlotFree(fullP, dateString, slot, totalDuration));

                    return {
                        ...p,
                        loadingAvailability: false,
                        availableSlotsCount: freeSlots.length
                    };
                } catch (e) {
                    console.error(`Error checking availability for ${p.name}`, e);
                    return { ...p, loadingAvailability: false, availableSlotsCount: 0 };
                }
            }));

            // 3. Sort by Availability (desc) then Distance (asc)
            // We prioritize those with slots > 0.
            const sorted = [...checkedCandidates, ...others].sort((a, b) => {
                // If one has slots and other doesn't (or is unknown), prioritize the one with slots
                const aHasSlots = a.availableSlotsCount > 0;
                const bHasSlots = b.availableSlotsCount > 0;

                if (aHasSlots && !bHasSlots) return -1;
                if (!aHasSlots && bHasSlots) return 1;

                // If both have slots or both don't, sort by distance
                return a.distance - b.distance;
            });

            setRecommendations(sorted);
            setLoading(false);
        };

        fetchAvailability();
    }, [photographers, selectedLocation, selectedDate, totalDuration]);

    if (!selectedLocation) return <p className="text-slate-500 text-sm">Selecione um endereço para ver recomendações.</p>;
    if (loading && recommendations.length === 0) return <p className="text-slate-500 text-sm animate-pulse">Buscando melhores fotógrafos...</p>;

    return (
        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
            {recommendations.map(p => {
                const isSelected = p.id === selectedPhotographerId;
                return (
                    <div
                        key={p.id}
                        onClick={() => onSelectPhotographer(p.id)}
                        className={`p-3 rounded-lg border cursor-pointer transition-all ${isSelected
                                ? 'bg-purple-50 border-purple-500 ring-1 ring-purple-500'
                                : 'bg-white border-slate-200 hover:border-purple-300 hover:bg-slate-50'
                            }`}
                    >
                        <div className="flex justify-between items-start">
                            <div>
                                <h4 className={`font-bold ${isSelected ? 'text-purple-800' : 'text-slate-700'}`}>{p.name}</h4>
                                <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                                    <span className="flex items-center gap-1">
                                        <MapPinIcon className="w-3 h-3" /> {p.distance.toFixed(1)} km
                                    </span>
                                    {p.availableSlotsCount > 0 ? (
                                        <span className="flex items-center gap-1 text-green-600 font-medium">
                                            <ClockIcon className="w-3 h-3" /> {p.availableSlotsCount} horários
                                        </span>
                                    ) : p.availableSlotsCount === 0 ? (
                                        <span className="flex items-center gap-1 text-red-500 font-medium">
                                            <AlertTriangleIcon className="w-3 h-3" /> Indisponível
                                        </span>
                                    ) : (
                                        <span className="flex items-center gap-1 text-slate-400">
                                            <ClockIcon className="w-3 h-3" /> Ver disponibilidade
                                        </span>
                                    )}
                                </div>
                            </div>
                            {isSelected && <CheckCircleIcon className="w-5 h-5 text-purple-600" />}
                        </div>
                    </div>
                );
            })}
            {recommendations.length === 0 && (
                <p className="text-center text-slate-500 text-sm py-4">Nenhum fotógrafo encontrado nesta região.</p>
            )}
        </div>
    );
};

export default PhotographerRecommendationList;
