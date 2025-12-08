import React, { useState } from 'react';
import { AlertTriangleIcon, XCircleIcon, DollarSignIcon, CheckCircleIcon } from './icons';
import { FeedbackCategory, reportFailure } from '../services/photographerFinanceService';

interface ReportFailureModalProps {
    isOpen: boolean;
    onClose: () => void;
    bookingId: string;
    photographerId: string;
    reporterId: string;
    onSuccess: () => void;
}

const ReportFailureModal: React.FC<ReportFailureModalProps> = ({ isOpen, onClose, bookingId, photographerId, reporterId, onSuccess }) => {
    const [category, setCategory] = useState<FeedbackCategory>('QUALIDADE');
    const [isCritical, setIsCritical] = useState(false);
    const [penaltyAmount, setPenaltyAmount] = useState<string>('');
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async () => {
        if (!notes.trim()) {
            alert("Por favor, descreva o motivo da falha.");
            return;
        }

        setLoading(true);
        try {
            await reportFailure(
                bookingId,
                photographerId,
                category,
                isCritical ? 'CRITICAL' : 'WARNING',
                notes,
                reporterId,
                isCritical ? parseFloat(penaltyAmount) : 0
            );
            alert("Reportado com sucesso!");
            onSuccess();
            onClose();
        } catch (error) {
            console.error("Error reporting failure:", error);
            alert("Erro ao reportar falha.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                <div className="bg-red-50 p-4 border-b border-red-100 flex justify-between items-center">
                    <h3 className="font-bold text-red-800 flex items-center gap-2">
                        <AlertTriangleIcon className="w-5 h-5" /> Reportar Falha
                    </h3>
                    <button onClick={onClose}><XCircleIcon className="w-6 h-6 text-red-300 hover:text-red-500" /></button>
                </div>

                <div className="p-6 space-y-4">

                    {/* Categoria */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Tipo de Falha</label>
                        <select
                            value={category}
                            onChange={e => setCategory(e.target.value as FeedbackCategory)}
                            className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-red-500"
                        >
                            <option value="ATRASO_ENTREGA">⏰ Atraso na Entrega</option>
                            <option value="LINK_INVERTIDO">🔗 Link Invertido</option>
                            <option value="ENTREGA_INCOMPLETA">🧩 Entrega Incompleta</option>
                            <option value="FALTOU_AREA_COMUM">🙈 Faltou Área Comum</option>
                            <option value="QUALIDADE">👎 Qualidade Ruim</option>
                            <option value="RECLAMACAO_ATENDIMENTO">🗣️ Reclamação (Atendimento)</option>
                            <option value="OUTROS">❓ Outros</option>
                        </select>
                    </div>

                    {/* Toggle Crítico */}
                    <div className="flex items-center justify-between bg-slate-50 p-3 rounded-lg border border-slate-200">
                        <div>
                            <span className="font-bold text-slate-700 block">Falha Grave? (Financeiro)</span>
                            <span className="text-xs text-slate-500">Gera desconto na carteira do fotógrafo.</span>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" checked={isCritical} onChange={e => setIsCritical(e.target.checked)} className="sr-only peer" />
                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                        </label>
                    </div>

                    {/* Valor da Multa (Condicional) */}
                    {isCritical && (
                        <div className="animate-fade-in">
                            <label className="block text-xs font-bold text-red-600 uppercase mb-2">Valor do Desconto (R$)</label>
                            <div className="relative">
                                <DollarSignIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-red-400" />
                                <input
                                    type="number"
                                    value={penaltyAmount}
                                    onChange={e => setPenaltyAmount(e.target.value)}
                                    className="w-full pl-9 p-2 border border-red-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none text-red-700 font-bold"
                                    placeholder="0,00"
                                />
                            </div>
                        </div>
                    )}

                    {/* Motivo */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Motivo / Detalhes (Obrigatório)</label>
                        <textarea
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            className="w-full p-2 border border-slate-300 rounded-lg h-24 resize-none focus:ring-2 focus:ring-red-500"
                            placeholder="Ex: Esqueceu a foto da fachada, tive que voltar lá..."
                        />
                    </div>

                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl shadow-lg transition-transform active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {loading ? 'Salvando...' : 'Confirmar Report'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ReportFailureModal;
