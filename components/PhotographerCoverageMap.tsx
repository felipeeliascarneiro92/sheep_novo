import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Photographer } from '../types';
import { loadGoogleMapsScript } from '../services/bookingService';
import { XIcon, FilterIcon, SearchIcon, MapPinIcon, CheckSquareIcon, UsersIcon } from './icons';

declare var google: any;

interface PhotographerCoverageMapProps {
    photographers: Photographer[];
    onClose: () => void;
}

const PhotographerCoverageMap: React.FC<PhotographerCoverageMapProps> = ({ photographers, onClose }) => {
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<any | null>(null);
    const markersRef = useRef<any[]>([]);
    const circlesRef = useRef<any[]>([]);

    // State for filtering
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(photographers.map(p => p.id)));
    const [searchQuery, setSearchQuery] = useState('');
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    const filteredList = useMemo(() => {
        if (!searchQuery.trim()) return photographers;
        const lower = searchQuery.toLowerCase();
        return photographers.filter(p => p.name.toLowerCase().includes(lower));
    }, [photographers, searchQuery]);

    const togglePhotographer = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setSelectedIds(newSet);
    };

    const toggleAll = () => {
        if (selectedIds.size === photographers.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(photographers.map(p => p.id)));
        }
    };

    // Initialize Map
    useEffect(() => {
        const initMap = async () => {
            if (!mapRef.current) return;

            try {
                if (!(window as any).google || !(window as any).google.maps) {
                    await loadGoogleMapsScript();
                }

                const { Map } = await (window as any).google.maps.importLibrary("maps");

                if (!mapInstanceRef.current) {
                    mapInstanceRef.current = new Map(mapRef.current, {
                        center: { lat: -25.4284, lng: -49.2733 }, // Default Curitiba
                        zoom: 11,
                        mapId: "COVERAGE_MAP",
                        disableDefaultUI: false,
                        zoomControl: true,
                        streetViewControl: false,
                        mapTypeControl: false,
                    });
                }
            } catch (error) {
                console.error("Error initializing map:", error);
            }
        };

        initMap();
    }, []);

    // Update Markers and Circles
    useEffect(() => {
        if (!mapInstanceRef.current || !(window as any).google) return;

        // Clear existing
        markersRef.current.forEach(m => m.setMap(null));
        circlesRef.current.forEach(c => c.setMap(null));
        markersRef.current = [];
        circlesRef.current = [];

        const { Marker } = (window as any).google.maps;
        const { Circle } = (window as any).google.maps;
        const { InfoWindow } = (window as any).google.maps;

        const infoWindow = new InfoWindow();

        photographers.forEach(p => {
            if (!selectedIds.has(p.id) || !p.baseLat || !p.baseLng) return;

            // Create Marker
            const marker = new Marker({
                position: { lat: p.baseLat, lng: p.baseLng },
                map: mapInstanceRef.current,
                title: p.name,
                // Use a custom icon or standard color
                icon: p.isActive
                    ? "http://maps.google.com/mapfiles/ms/icons/green-dot.png"
                    : "http://maps.google.com/mapfiles/ms/icons/red-dot.png"
            });

            marker.addListener('click', () => {
                infoWindow.setContent(`
                    <div style="padding: 8px;">
                        <h3 style="font-weight: bold; margin-bottom: 4px;">${p.name}</h3>
                        <p style="font-size: 12px; color: #666;">${p.baseAddress}</p>
                        <p style="font-size: 12px; margin-top: 4px;"><strong>Raio:</strong> ${p.radiusKm} km</p>
                        <p style="font-size: 12px;"><strong>Status:</strong> ${p.isActive ? 'Ativo' : 'Inativo'}</p>
                    </div>
                `);
                infoWindow.open(mapInstanceRef.current, marker);
            });

            markersRef.current.push(marker);

            // Create Circle
            const circle = new Circle({
                strokeColor: p.isActive ? "#10B981" : "#EF4444",
                strokeOpacity: 0.8,
                strokeWeight: 2,
                fillColor: p.isActive ? "#10B981" : "#EF4444",
                fillOpacity: 0.15,
                map: mapInstanceRef.current,
                center: { lat: p.baseLat, lng: p.baseLng },
                radius: p.radiusKm * 1000, // meters
                clickable: false
            });

            circlesRef.current.push(circle);
        });

    }, [photographers, selectedIds]);

    return (
        <div className="fixed inset-0 z-50 bg-white dark:bg-slate-900 flex flex-col animate-fade-in">
            {/* Header */}
            <header className="h-16 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between px-6 bg-white dark:bg-slate-900 shadow-sm z-20">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg text-purple-600 dark:text-purple-400">
                        <MapPinIcon className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">Mapa de Cobertura</h1>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Visualize as áreas atendidas pela equipe</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                        className={`p-2 rounded-lg border transition-colors ${isSidebarOpen ? 'bg-purple-50 border-purple-200 text-purple-700' : 'bg-white border-slate-200 text-slate-600'}`}
                    >
                        <FilterIcon className="w-5 h-5" />
                    </button>
                    <button
                        onClick={onClose}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg font-medium transition-colors"
                    >
                        <XIcon className="w-5 h-5" /> Fechar
                    </button>
                </div>
            </header>

            <div className="flex-1 flex overflow-hidden relative">
                {/* Sidebar */}
                <div className={`w-80 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 flex flex-col transition-all duration-300 absolute z-10 h-full shadow-xl ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                    <div className="p-4 border-b border-slate-200 dark:border-slate-700">
                        <div className="relative">
                            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Filtrar fotógrafos..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                            />
                        </div>
                        <div className="mt-3 flex items-center justify-between">
                            <button onClick={toggleAll} className="text-xs font-semibold text-purple-600 hover:text-purple-700 flex items-center gap-1">
                                <CheckSquareIcon className="w-3 h-3" />
                                {selectedIds.size === photographers.length ? 'Desmarcar Todos' : 'Marcar Todos'}
                            </button>
                            <span className="text-xs text-slate-500">{selectedIds.size} selecionados</span>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-2 space-y-1">
                        {filteredList.map(p => (
                            <label
                                key={p.id}
                                className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${selectedIds.has(p.id) ? 'bg-purple-50 dark:bg-purple-900/20' : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}
                            >
                                <input
                                    type="checkbox"
                                    checked={selectedIds.has(p.id)}
                                    onChange={() => togglePhotographer(p.id)}
                                    className="rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                                />
                                <div className="flex-1 min-w-0">
                                    <p className={`text-sm font-medium truncate ${p.isActive ? 'text-slate-700 dark:text-slate-200' : 'text-slate-400 dark:text-slate-500'}`}>
                                        {p.name}
                                    </p>
                                    <p className="text-xs text-slate-500 truncate">{p.radiusKm} km • {p.isActive ? 'Ativo' : 'Inativo'}</p>
                                </div>
                                <div className={`w-2 h-2 rounded-full ${p.isActive ? 'bg-green-500' : 'bg-red-500'}`}></div>
                            </label>
                        ))}
                    </div>
                </div>

                {/* Map Container */}
                <div className={`flex-1 transition-all duration-300 ${isSidebarOpen ? 'ml-80' : 'ml-0'}`}>
                    <div ref={mapRef} className="w-full h-full bg-slate-100 dark:bg-slate-900 flex items-center justify-center">
                        <p className="text-slate-400 animate-pulse">Carregando mapa...</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PhotographerCoverageMap;
