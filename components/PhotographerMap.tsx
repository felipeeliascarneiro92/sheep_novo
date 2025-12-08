import React, { useEffect, useRef } from 'react';
import { Photographer } from '../types';
import { loadGoogleMapsScript } from '../services/bookingService';

declare var google: any;

interface PhotographerMapProps {
    photographers: Photographer[];
    selectedLocation: { lat: number, lng: number } | null;
    selectedPhotographerId: string;
    onSelectPhotographer: (id: string) => void;
}

const PhotographerMap: React.FC<PhotographerMapProps> = ({ photographers, selectedLocation, selectedPhotographerId, onSelectPhotographer }) => {
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<any | null>(null);
    const markersRef = useRef<any[]>([]);

    useEffect(() => {
        if (!mapRef.current || !selectedLocation) return;

        const initMap = async () => {
            try {
                // Ensure Google Maps is loaded
                if (!(window as any).google || !(window as any).google.maps) {
                    await loadGoogleMapsScript();
                }

                const { Map } = await (window as any).google.maps.importLibrary("maps") as google.maps.MapsLibrary;
                const { AdvancedMarkerElement } = await (window as any).google.maps.importLibrary("marker") as google.maps.MarkerLibrary;

                // Initialize Map
                if (!mapInstanceRef.current) {
                    mapInstanceRef.current = new Map(mapRef.current, {
                        center: selectedLocation,
                        zoom: 12,
                        mapId: "DEMO_MAP_ID", // Required for AdvancedMarkerElement
                        styles: [
                            {
                                featureType: "poi",
                                elementType: "labels",
                                stylers: [{ visibility: "off" }]
                            }
                        ]
                    });
                } else {
                    mapInstanceRef.current.setCenter(selectedLocation);
                }

                // Clear existing markers
                markersRef.current.forEach(marker => marker.map = null);
                markersRef.current = [];

                // Add Property Marker (Red)
                const propertyPin = document.createElement('img');
                propertyPin.src = "http://maps.google.com/mapfiles/ms/icons/red-dot.png";

                const propertyMarker = new AdvancedMarkerElement({
                    position: selectedLocation,
                    map: mapInstanceRef.current,
                    title: "Imóvel",
                    content: propertyPin
                });
                markersRef.current.push(propertyMarker);

                // Add Photographer Markers (Blue, or Green if selected)
                photographers.forEach(p => {
                    if (!p.baseLat || !p.baseLng || !p.isActive) return;

                    const isSelected = p.id === selectedPhotographerId;
                    const pin = document.createElement('img');
                    pin.src = isSelected
                        ? "http://maps.google.com/mapfiles/ms/icons/green-dot.png"
                        : "http://maps.google.com/mapfiles/ms/icons/blue-dot.png";

                    const marker = new AdvancedMarkerElement({
                        position: { lat: p.baseLat, lng: p.baseLng },
                        map: mapInstanceRef.current,
                        title: p.name,
                        content: pin
                    });

                    marker.addListener("click", () => {
                        onSelectPhotographer(p.id);
                    });

                    markersRef.current.push(marker);
                });
            } catch (error) {
                console.error("Error initializing map:", error);
            }
        };

        initMap();

    }, [photographers, selectedLocation, selectedPhotographerId]);

    return (
        <div ref={mapRef} className="w-full h-64 rounded-lg shadow-md border border-slate-200" />
    );
};

export default PhotographerMap;
