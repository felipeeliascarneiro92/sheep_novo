
import React from 'react';
import { ClockIcon, SunIcon, ShieldIcon, CheckCircleIcon } from './icons';

export interface ServiceAddon {
    id: string;
    title: string;
    description: string;
    price: number;
    icon: React.ReactNode;
}

export const ADDONS: ServiceAddon[] = [
    {
        id: 'entrega_express',
        title: 'Entrega Express 12h',
        description: 'Receba seu material editado na metade do tempo padrão.',
        price: 49.90,
        icon: <ClockIcon className="w-6 h-6 text-orange-500" />
    },
    {
        id: 'ceu_azul',
        title: 'Garantia Céu Azul',
        description: 'Substituição digital do céu em fotos externas se estiver nublado.',
        price: 29.90,
        icon: <SunIcon className="w-6 h-6 text-sky-500" />
    },
    {
        id: 'seguro_chuva',
        title: 'Seguro Chuva',
        description: 'Reagendamento gratuito até 2h antes em caso de chuva.',
        price: 19.90,
        icon: <ShieldIcon className="w-6 h-6 text-indigo-500" />
    }
];

interface ServiceAddonsProps {
    selectedAddons: string[];
    onToggle: (addonId: string) => void;
    filterIds?: string[]; // Optional: Show only specific addons
    title?: string;
}

const ServiceAddons: React.FC<ServiceAddonsProps> = ({ selectedAddons, onToggle, filterIds, title }) => {
    const displayAddons = filterIds
        ? ADDONS.filter(a => filterIds.includes(a.id))
        : ADDONS;

    if (displayAddons.length === 0) return null;

    return (
        <div className="space-y-3 animate-fade-in">
            {title && <h4 className="font-bold text-slate-700 dark:text-slate-200 text-sm mb-2">{title}</h4>}
            {displayAddons.map(addon => {
                const isSelected = selectedAddons.includes(addon.id);
                return (
                    <div
                        key={addon.id}
                        onClick={() => onToggle(addon.id)}
                        className={`relative p-4 rounded-xl border-2 cursor-pointer transition-all flex items-center gap-4 group ${isSelected
                                ? 'border-purple-500 dark:border-purple-400 bg-purple-50 dark:bg-purple-900/20'
                                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-purple-300 dark:hover:border-purple-500 hover:shadow-md'
                            }`}
                    >
                        <div className={`p-3 rounded-full ${isSelected ? 'bg-white dark:bg-slate-800' : 'bg-slate-50 dark:bg-slate-700'}`}>
                            {addon.icon}
                        </div>
                        <div className="flex-1">
                            <div className="flex justify-between items-center">
                                <h5 className={`font-bold ${isSelected ? 'text-purple-800 dark:text-purple-200' : 'text-slate-800 dark:text-slate-100'}`}>
                                    {addon.title}
                                </h5>
                                <span className={`text-sm font-bold ${isSelected ? 'text-purple-700 dark:text-purple-300' : 'text-slate-600 dark:text-slate-300'}`}>
                                    + R$ {addon.price.toFixed(2).replace('.', ',')}
                                </span>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 pr-8">
                                {addon.description}
                            </p>
                        </div>

                        <div className={`absolute top-4 right-4 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${isSelected ? 'bg-purple-600 dark:bg-purple-500 border-purple-600 dark:border-purple-500' : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700'
                            }`}>
                            {isSelected && <CheckCircleIcon className="w-4 h-4 text-white" />}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default ServiceAddons;
