
import React, { useState, useMemo, useEffect } from 'react';
import { getCoupons, addCoupon, deleteCoupon, getServices } from '../services/bookingService';
import { Coupon, CouponType, Service } from '../types';
import { TicketIcon, PlusIcon, SearchIcon, XIcon, CloudRainIcon } from './icons';

const emptyCouponForm: Omit<Coupon, 'id' | 'usedCount' | 'usedByClientIds'> = {
    code: '',
    type: 'percentage',
    value: 0,
    expirationDate: new Date().toISOString().split('T')[0],
    maxUses: 100,
    isActive: true,
    maxUsesPerClient: 1,
};

const CouponsPage: React.FC = () => {
    const [allCoupons, setAllCoupons] = useState<Coupon[]>([]);
    const [services, setServices] = useState<Service[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState(emptyCouponForm);

    useEffect(() => {
        const fetchData = async () => {
            const [fetchedCoupons, fetchedServices] = await Promise.all([
                getCoupons(),
                getServices()
            ]);
            setAllCoupons(fetchedCoupons);
            setServices(fetchedServices);
        };
        fetchData();
    }, []);

    const refreshCoupons = async () => {
        const coupons = await getCoupons();
        setAllCoupons(coupons);
    };

    const filteredCoupons = useMemo(() => {
        return allCoupons.filter(c => c.code.toLowerCase().includes(searchQuery.toLowerCase()));
    }, [allCoupons, searchQuery]);

    const handleDelete = async (id: string) => {
        if (window.confirm('Tem certeza que deseja excluir este cupom?')) {
            await deleteCoupon(id);
            await refreshCoupons();
        }
    };

    const handleRainCoupon = async () => {
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const rainCode = `CHUVA${today.getDate()}`;

        await addCoupon({
            code: rainCode,
            type: 'percentage',
            value: 15,
            expirationDate: tomorrow.toISOString().split('T')[0],
            maxUses: 50,
            isActive: true
        });

        await refreshCoupons();
        alert(`Cupom relâmpago ${rainCode} criado com sucesso! (15% OFF por 24h)`);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await addCoupon(formData);
        setIsModalOpen(false);
        await refreshCoupons();
        setFormData(emptyCouponForm);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        if (type === 'checkbox') {
            const { checked } = e.target as HTMLInputElement;
            setFormData(prev => ({ ...prev, [name]: checked }));
        } else {
            const processedValue = type === 'number' ? parseFloat(value) : value;
            setFormData(prev => ({ ...prev, [name]: processedValue }));
        }
    };

    return (
        <div className="space-y-8 animate-fade-in">
            <header className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800">Cupons de Desconto</h1>
                    <p className="text-slate-500">Gerencie campanhas e descontos especiais.</p>
                </div>
                <div className="flex gap-3">
                    <button onClick={handleRainCoupon} className="bg-blue-100 text-blue-700 font-semibold py-2.5 px-4 rounded-lg hover:bg-blue-200 transition-colors flex items-center gap-2">
                        <CloudRainIcon className="w-5 h-5" /> Cupom de Chuva
                    </button>
                    <button onClick={() => setIsModalOpen(true)} className="bg-purple-600 text-white font-semibold py-2.5 px-4 rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2 shadow-md">
                        <PlusIcon className="w-5 h-5" /> Novo Cupom
                    </button>
                </div>
            </header>

            <div className="bg-white p-6 rounded-xl shadow-lg border border-slate-200">
                <div className="relative mb-6 max-w-md">
                    <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Buscar cupom..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full pl-10 p-2 border border-slate-300 rounded-lg"
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredCoupons.map(coupon => {
                        const isExpired = new Date(coupon.expirationDate) < new Date();
                        const isDepleted = coupon.usedCount >= coupon.maxUses;
                        const isActive = coupon.isActive && !isExpired && !isDepleted;

                        return (
                            <div key={coupon.id} className={`p-5 rounded-xl border relative overflow-hidden ${isActive ? 'bg-white border-slate-200' : 'bg-slate-50 border-slate-200 opacity-75'}`}>
                                <div className="flex justify-between items-start mb-2">
                                    <div className="bg-slate-100 p-2 rounded-lg">
                                        <TicketIcon className={`w-6 h-6 ${isActive ? 'text-purple-600' : 'text-slate-400'}`} />
                                    </div>
                                    <button onClick={() => handleDelete(coupon.id)} className="text-slate-400 hover:text-red-500"><XIcon className="w-5 h-5" /></button>
                                </div>
                                <h3 className="text-xl font-bold text-slate-800 tracking-wide">{coupon.code}</h3>
                                <p className="text-sm font-semibold text-green-600 mb-3">
                                    {coupon.type === 'percentage' ? `${coupon.value}% OFF` : `R$ ${coupon.value.toFixed(2)} OFF`}
                                </p>

                                <div className="text-xs text-slate-500 space-y-1">
                                    <p>Validade: {new Date(coupon.expirationDate).toLocaleDateString('pt-BR')}</p>
                                    <p>Usos: {coupon.usedCount} / {coupon.maxUses}</p>
                                    {coupon.serviceRestrictionId && <p className="truncate">Restrito a: {services.find(s => s.id === coupon.serviceRestrictionId)?.name}</p>}
                                </div>

                                <div className={`absolute top-4 right-4 px-2 py-1 rounded text-xs font-bold ${isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                    {isActive ? 'ATIVO' : isExpired ? 'EXPIRADO' : isDepleted ? 'ESGOTADO' : 'INATIVO'}
                                </div>
                            </div>
                        );
                    })}
                    {filteredCoupons.length === 0 && <p className="text-slate-500 col-span-full text-center py-10">Nenhum cupom encontrado.</p>}
                </div>
            </div>

            {/* Add Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-fade-in-fast p-4">
                    <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold text-slate-800">Novo Cupom</h3>
                            <button onClick={() => setIsModalOpen(false)}><XIcon className="w-5 h-5 text-slate-500" /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Código do Cupom</label>
                                <input type="text" name="code" value={formData.code} onChange={handleChange} className="w-full p-2 border rounded-lg uppercase" placeholder="EX: DESCONTO10" required />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Tipo</label>
                                    <select name="type" value={formData.type} onChange={handleChange} className="w-full p-2 border rounded-lg">
                                        <option value="percentage">Porcentagem (%)</option>
                                        <option value="fixed">Valor Fixo (R$)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Valor</label>
                                    <input type="number" name="value" value={formData.value} onChange={handleChange} className="w-full p-2 border rounded-lg" required />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Validade</label>
                                    <input type="date" name="expirationDate" value={formData.expirationDate} onChange={handleChange} className="w-full p-2 border rounded-lg" required />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Limite de Usos</label>
                                    <input type="number" name="maxUses" value={formData.maxUses} onChange={handleChange} className="w-full p-2 border rounded-lg" required />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Limite por Cliente</label>
                                <input type="number" name="maxUsesPerClient" value={formData.maxUsesPerClient || 1} onChange={handleChange} className="w-full p-2 border rounded-lg" min="1" required />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Restrição de Serviço (Opcional)</label>
                                <select name="serviceRestrictionId" value={formData.serviceRestrictionId || ''} onChange={handleChange} className="w-full p-2 border rounded-lg">
                                    <option value="">Válido para todos</option>
                                    {services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                            </div>
                            <button type="submit" className="w-full bg-purple-600 text-white font-bold py-2 rounded-lg hover:bg-purple-700 mt-4">Criar Cupom</button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CouponsPage;
