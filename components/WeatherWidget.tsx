
import React, { useState, useEffect } from 'react';
import { getWeatherForecast, WeatherForecast } from '../services/weatherService';
import { SunIcon, CloudSunIcon, CloudIcon, CloudRainIcon, CloudLightningIcon, MapPinIcon } from './icons';

interface WeatherWidgetProps {
    date: Date | null;
    location?: { lat: number; lng: number } | null;
    onWeatherCheck?: (isBadWeather: boolean) => void;
}

const weatherIconMap: Record<WeatherForecast['icon'], React.ReactNode> = {
    'sun': <SunIcon className="w-10 h-10 text-yellow-500" />,
    'cloud-sun': <CloudSunIcon className="w-10 h-10 text-sky-500" />,
    'cloud': <CloudIcon className="w-10 h-10 text-slate-500" />,
    'cloud-rain': <CloudRainIcon className="w-10 h-10 text-blue-500" />,
    'cloud-lightning': <CloudLightningIcon className="w-10 h-10 text-gray-600" />,
};

const WeatherWidget: React.FC<WeatherWidgetProps> = ({ date, location, onWeatherCheck }) => {
    const [forecast, setForecast] = useState<WeatherForecast | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(false);

    useEffect(() => {
        if (date && location) {
            setLoading(true);
            setError(false);
            setForecast(null);

            getWeatherForecast(date, location.lat, location.lng).then(data => {
                setForecast(data);
                setLoading(false);

                // Report weather condition to parent for Upsell logic
                if (onWeatherCheck && data) {
                    // "Good Weather" is now Sun or Sun with Clouds
                    const isBadWeather = data.condition !== 'Ensolarado' && data.condition !== 'Sol entre Nuvens';
                    onWeatherCheck(isBadWeather);
                } else if (onWeatherCheck) {
                    onWeatherCheck(false); // Default to safe if no data
                }
            }).catch(() => {
                setLoading(false);
                setError(true);
            });
        } else {
            setForecast(null);
            setLoading(false);
        }
    }, [date, location]); // Re-run when date or location coordinates change

    if (!date) return null;

    return (
        <div className="mt-2">
            {loading && (
                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900 p-4 rounded-lg">
                    <div className="w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-sm">Consultando meteorologia no local...</span>
                </div>
            )}

            {!loading && !location && (
                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900 p-4 rounded-lg border border-dashed border-slate-300 dark:border-slate-700">
                    <MapPinIcon className="w-5 h-5 text-slate-400 dark:text-slate-500" />
                    <span className="text-sm">Selecione um endereço para ver a previsão.</span>
                </div>
            )}

            {!loading && location && !forecast && !error && (
                <div className="text-center text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900 p-4 rounded-lg border border-slate-100 dark:border-slate-700">
                    <p className="text-sm">Previsão indisponível para esta data (limite de 14 dias).</p>
                </div>
            )}

            {!loading && forecast && (
                <div className="flex items-center gap-4 animate-fade-in bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-4 rounded-lg border border-blue-100 dark:border-blue-800">
                    <div className="flex-shrink-0 bg-white dark:bg-slate-800 p-2 rounded-full shadow-sm">
                        {weatherIconMap[forecast.icon]}
                    </div>
                    <div>
                        <p className="font-bold text-slate-800 dark:text-slate-100 text-lg leading-tight">{forecast.condition}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wide mb-1">
                            {date.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'short' })}
                        </p>
                        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                            <span className="bg-blue-200/50 dark:bg-blue-800/50 px-1.5 rounded text-blue-800 dark:text-blue-200 font-bold">{forecast.tempMin}°</span>
                            <div className="w-8 h-1 bg-gradient-to-r from-blue-300 to-orange-300 rounded-full"></div>
                            <span className="bg-orange-200/50 dark:bg-orange-800/50 px-1.5 rounded text-orange-800 dark:text-orange-200 font-bold">{forecast.tempMax}°</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WeatherWidget;
