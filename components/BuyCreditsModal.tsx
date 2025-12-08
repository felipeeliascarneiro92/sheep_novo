import React, { useState } from 'react';
import { User } from '../App';
import { createAsaasCharge, createAsaasCustomer, cancelAsaasCharge } from '../services/asaasService';
import { addFunds, getClientById, updateClient } from '../services/clientService';
import { supabase } from '../services/supabase';
import { XIcon, CheckCircleIcon, WalletIcon, AlertTriangleIcon, LoaderIcon, CopyIcon } from './icons';

interface BuyCreditsModalProps {
    user: User;
    onClose: () => void;
    onSuccess: () => void;
}

const PACKAGES = [
    { id: 'basic', value: 50, bonus: 0, label: 'R$ 50,00' },
    { id: 'standard', value: 100, bonus: 0, label: 'R$ 100,00' },
    { id: 'premium', value: 200, bonus: 0, label: 'R$ 200,00' },
    { id: 'custom', value: 0, bonus: 0, label: 'Outro Valor' },
];

const BuyCreditsModal: React.FC<BuyCreditsModalProps> = ({ user, onClose, onSuccess }) => {
    const [step, setStep] = useState<'select' | 'payment' | 'success'>('select');
    const [selectedPackage, setSelectedPackage] = useState<typeof PACKAGES[0] | null>(null);
    const [customAmount, setCustomAmount] = useState<string>('');
    const [loading, setLoading] = useState(false);
    const [paymentData, setPaymentData] = useState<{ id: string, pixQrCodeUrl?: string, pixPayload?: string, invoiceUrl: string } | null>(null);
    const [copied, setCopied] = useState(false);
    const [showManualInput, setShowManualInput] = useState(false);
    const [manualDescription, setManualDescription] = useState('Adição Manual de Fundos');

    const isAdminOrEditor = user.role === 'admin' || user.role === 'editor';

    const handleSelectPackage = (pkg: typeof PACKAGES[0]) => {
        setSelectedPackage(pkg);
        if (pkg.id !== 'custom') {
            setCustomAmount(pkg.value.toString());
        } else {
            setCustomAmount('');
        }
    };

    const handleGeneratePix = async () => {
        const amount = parseFloat(customAmount);
        if (!amount || amount <= 0) {
            alert("Por favor, insira um valor válido.");
            return;
        }

        setLoading(true);
        try {
            // 1. Ensure Client exists in Asaas
            const client = await getClientById(user.clientId || user.id);
            if (!client) throw new Error("Cliente não encontrado");

            let asaasId = client.asaasCustomerId;
            if (!asaasId) {
                asaasId = await createAsaasCustomer(client);
                // IMPORTANT: Save the Asaas ID to the client record immediately
                if (asaasId && !asaasId.startsWith('cus_error')) {
                    await updateClient(client.id, { asaasCustomerId: asaasId });
                }
            }

            // 2. Create Charge
            const charge = await createAsaasCharge(
                asaasId,
                amount,
                new Date().toISOString().split('T')[0], // Due today
                `Compra de Créditos - R$ ${amount.toFixed(2)}`,
                'PIX',
                client.id // Pass client ID as externalReference for Webhook fallback
            );

            setPaymentData(charge);
            setStep('payment');
        } catch (error) {
            console.error("Erro ao criar cobrança", error);
            alert("Erro ao iniciar pagamento. Tente novamente.");
        } finally {
            setLoading(false);
        }
    };

    const handleManualAdd = async () => {
        const amount = parseFloat(customAmount);
        if (!amount || amount <= 0) {
            alert("Por favor, insira um valor válido.");
            return;
        }

        setLoading(true);
        try {
            await addFunds(
                user.clientId || user.id,
                amount,
                'Credit',
                manualDescription,
                'Manual (Admin/Editor)'
            );
            setStep('success');
        } catch (error) {
            console.error("Erro ao adicionar fundos manualmente", error);
            alert("Erro ao adicionar fundos.");
        } finally {
            setLoading(false);
        }
    };

    const handleCancelPayment = async () => {
        if (paymentData?.id) {
            setLoading(true);
            await cancelAsaasCharge(paymentData.id);
        }
        onClose();
    };

    const handleCopyPix = () => {
        if (paymentData?.pixPayload) {
            navigator.clipboard.writeText(paymentData.pixPayload);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    // Realtime Payment Listener
    React.useEffect(() => {
        if (step !== 'payment') return;

        const subscription = supabase
            .channel('payment_confirmation_wallet')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'transactions',
                    filter: `client_id=eq.${user.clientId || user.id}`
                },
                (payload) => {
                    console.log('Payment confirmed via Realtime:', payload);
                    if (payload.new.type === 'Credit') {
                        setStep('success');
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(subscription);
        };
    }, [step, user.clientId, user.id]);

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 animate-fade-in-fast" onClick={onClose}>
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div className="bg-slate-50 dark:bg-slate-900/50 p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                    <div>
                        <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                            <WalletIcon className="w-6 h-6 text-purple-600" />
                            {isAdminOrEditor && showManualInput ? 'Adicionar Saldo Manual' : 'Adicionar Fundos'}
                        </h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            {isAdminOrEditor && showManualInput ? 'Ajuste administrativo sem cobrança.' : 'Escolha um valor para recarregar.'}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors">
                        <XIcon className="w-5 h-5 text-slate-500" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto">
                    {step === 'select' && (
                        <div className="space-y-6">
                            {isAdminOrEditor && (
                                <div className="flex justify-end">
                                    <button
                                        onClick={() => setShowManualInput(!showManualInput)}
                                        className="text-xs font-semibold text-purple-600 hover:underline"
                                    >
                                        {showManualInput ? 'Voltar para Modo Pagamento' : 'Modo Manual (Admin)'}
                                    </button>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                {PACKAGES.map(pkg => (
                                    <button
                                        key={pkg.id}
                                        onClick={() => handleSelectPackage(pkg)}
                                        className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center justify-center gap-2
                                            ${selectedPackage?.id === pkg.id
                                                ? 'border-purple-600 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300'
                                                : 'border-slate-100 dark:border-slate-700 hover:border-purple-300 dark:hover:border-purple-700 text-slate-600 dark:text-slate-300'
                                            }`}
                                    >
                                        <span className="font-bold text-lg">{pkg.label}</span>
                                    </button>
                                ))}
                            </div>

                            {selectedPackage?.id === 'custom' && (
                                <div className="animate-fade-in">
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Digite o valor (R$)</label>
                                    <input
                                        type="number"
                                        value={customAmount}
                                        onChange={e => setCustomAmount(e.target.value)}
                                        className="w-full p-3 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none dark:bg-slate-700 dark:text-white"
                                        placeholder="0,00"
                                        min="1"
                                    />
                                </div>
                            )}

                            {isAdminOrEditor && showManualInput && (
                                <div className="animate-fade-in">
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Descrição (Interna)</label>
                                    <input
                                        type="text"
                                        value={manualDescription}
                                        onChange={e => setManualDescription(e.target.value)}
                                        className="w-full p-3 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none dark:bg-slate-700 dark:text-white"
                                    />
                                </div>
                            )}

                            <div className="pt-4">
                                {isAdminOrEditor && showManualInput ? (
                                    <button
                                        onClick={handleManualAdd}
                                        disabled={loading || !customAmount}
                                        className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl shadow-lg transition-transform transform active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                    >
                                        {loading ? <LoaderIcon className="w-5 h-5 animate-spin" /> : <CheckCircleIcon className="w-5 h-5" />}
                                        Adicionar Saldo Manualmente
                                    </button>
                                ) : (
                                    <button
                                        onClick={handleGeneratePix}
                                        disabled={loading || !selectedPackage || !customAmount}
                                        className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-xl shadow-lg transition-transform transform active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                    >
                                        {loading ? <LoaderIcon className="w-5 h-5 animate-spin" /> : <WalletIcon className="w-5 h-5" />}
                                        Gerar Pix de R$ {parseFloat(customAmount || '0').toFixed(2)}
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    {step === 'payment' && paymentData && (
                        <div className="flex flex-col items-center text-center space-y-6">
                            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                                {paymentData.pixQrCodeUrl ? (
                                    <img src={paymentData.pixQrCodeUrl} alt="QR Code Pix" className="w-48 h-48 object-contain" />
                                ) : (
                                    <div className="w-48 h-48 bg-slate-100 flex items-center justify-center text-slate-400 text-xs">QR Code Indisponível</div>
                                )}
                            </div>

                            {paymentData.pixPayload && (
                                <button
                                    onClick={handleCopyPix}
                                    className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-200 transition-colors"
                                >
                                    {copied ? <CheckCircleIcon className="w-4 h-4 text-green-500" /> : <CopyIcon className="w-4 h-4" />}
                                    {copied ? 'Copiado!' : 'Copiar Código Pix'}
                                </button>
                            )}

                            <div>
                                <p className="font-bold text-slate-800 dark:text-slate-100 text-lg">Pague via Pix</p>
                                <p className="text-sm text-slate-500 dark:text-slate-400">Abra o app do seu banco e escaneie o código.</p>
                                <p className="text-xs text-slate-400 mt-2 animate-pulse">Aguardando confirmação do pagamento...</p>
                            </div>

                            <div className="w-full bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-4 rounded-lg text-left text-sm text-blue-800 dark:text-blue-200 flex gap-3">
                                <AlertTriangleIcon className="w-5 h-5 flex-shrink-0" />
                                <p>
                                    Assim que você pagar no banco, esta tela atualizará automaticamente em alguns segundos.
                                </p>
                            </div>

                            <button
                                onClick={handleCancelPayment}
                                className="w-full inline-flex justify-center rounded-md border border-red-300 dark:border-red-800 shadow-sm px-4 py-2.5 bg-white dark:bg-slate-700 text-base font-medium text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                            >
                                Cancelar
                            </button>
                        </div>
                    )}

                    {step === 'success' && (
                        <div className="flex flex-col items-center text-center space-y-6 py-8">
                            {/* Success Animation */}
                            <div className="relative flex items-center justify-center mb-4">
                                <div className="absolute w-24 h-24 bg-green-100 rounded-full animate-ping opacity-75"></div>
                                <div className="absolute w-24 h-24 bg-green-100 rounded-full"></div>
                                <div className="absolute w-16 h-16 bg-green-200 rounded-full"></div>
                                <div className="relative w-12 h-12 bg-green-600 rounded-full flex items-center justify-center shadow-lg z-10">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                            </div>
                            
                            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">
                                Seu pagamento foi realizado com sucesso!
                            </h3>
                            
                            <p className="text-slate-600 dark:text-slate-400 max-w-xs mx-auto">
                                O valor de R$ {parseFloat(customAmount).toFixed(2)} foi adicionado à sua carteira.
                            </p>
                            
                            <button
                                onClick={() => { onSuccess(); onClose(); }}
                                className="bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-8 rounded-xl shadow-lg transition-all transform hover:scale-105"
                            >
                                Fechar
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default BuyCreditsModal;
