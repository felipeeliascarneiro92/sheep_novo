
import React, { useState, useEffect } from 'react';
import { getClientById, getClientReferrals, updateClient } from '../services/bookingService';
import { User } from '../App';
import { GiftIcon, CopyIcon, Share2Icon, CheckCircleIcon, ClockIcon, UserIcon } from './icons';

const ReferralPage: React.FC<{ user: User }> = ({ user }) => {
    const [client, setClient] = useState<any>(null);
    const [referrals, setReferrals] = useState<{ client: any, status: string, reward: number }[]>([]);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            const c = await getClientById(user.id);
            if (c) {
                // Auto-generate code if missing (Self-healing logic)
                if (!c.referralCode) {
                    const newCode = (c.name.substring(0, 3) + Math.floor(Math.random() * 10000)).toUpperCase().replace(/\s/g, '');
                    await updateClient(c.id, { referralCode: newCode });
                    c.referralCode = newCode; // Update local ref immediately
                }

                setClient({ ...c });
                const refs = await getClientReferrals(c.id);
                setReferrals(refs);
            }
        };
        fetchData();
    }, [user.id]);

    if (!client) return <div className="p-8 text-center">Carregando dados...</div>;

    // Fail-safe if generation failed for some reason
    if (!client.referralCode) return <div className="p-8 text-center">Gerando seu código exclusivo...</div>;

    const referralLink = `sheephouse.com/register?ref=${client.referralCode}`;
    const shareMessage = `Olá! Estou usando a SheepHouse para agendar fotos dos meus imóveis e estou adorando. Use meu link para ganhar R$ 20 de desconto na primeira sessão: ${referralLink}`;

    const handleCopy = () => {
        navigator.clipboard.writeText(referralLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleWhatsAppShare = () => {
        const url = `https://wa.me/?text=${encodeURIComponent(shareMessage)}`;
        window.open(url, '_blank');
    };

    return (
        <div className="space-y-8 animate-fade-in max-w-4xl mx-auto">
            <header className="text-center py-6">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-purple-100 mb-4">
                    <GiftIcon className="w-8 h-8 text-purple-600" />
                </div>
                <h1 className="text-3xl font-bold text-slate-800">Indique e Ganhe</h1>
                <p className="text-slate-500 mt-2 text-lg max-w-xl mx-auto">
                    Convide amigos para a SheepHouse. Eles ganham <span className="font-bold text-purple-600">R$ 20,00</span> de desconto e você ganha <span className="font-bold text-purple-600">R$ 20,00</span> em créditos quando eles finalizarem o primeiro serviço.
                </p>
            </header>

            <div className="bg-white p-8 rounded-xl shadow-lg border border-slate-200 text-center">
                <h3 className="text-lg font-bold text-slate-700 mb-4">Seu Código de Indicação</h3>

                <div className="flex flex-col sm:flex-row gap-4 items-center justify-center mb-8">
                    <div className="bg-slate-50 border-2 border-dashed border-slate-300 rounded-lg px-6 py-3 font-mono text-xl font-bold text-slate-700 tracking-wider">
                        {client.referralCode}
                    </div>
                    <button
                        onClick={handleCopy}
                        className={`flex items-center gap-2 px-4 py-3 rounded-lg font-semibold transition-colors ${copied ? 'bg-green-100 text-green-700' : 'bg-purple-100 text-purple-700 hover:bg-purple-200'}`}
                    >
                        {copied ? <CheckCircleIcon className="w-5 h-5" /> : <CopyIcon className="w-5 h-5" />}
                        {copied ? 'Copiado!' : 'Copiar Link'}
                    </button>
                </div>

                <button
                    onClick={handleWhatsAppShare}
                    className="w-full sm:w-auto bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold py-3 px-8 rounded-full shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 mx-auto"
                >
                    <Share2Icon className="w-5 h-5" />
                    Enviar no WhatsApp
                </button>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-lg border border-slate-200">
                <h3 className="text-lg font-bold text-slate-700 mb-4 flex items-center gap-2">
                    <UserIcon className="w-5 h-5 text-purple-600" /> Minhas Indicações
                </h3>

                {referrals.length > 0 ? (
                    <div className="space-y-3">
                        {referrals.map((ref, idx) => (
                            <div key={idx} className="flex items-center justify-between p-4 border border-slate-100 rounded-lg hover:bg-slate-50 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center font-bold text-slate-500">
                                        {ref.client.name.charAt(0)}
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-800">{ref.client.name}</p>
                                        <p className="text-xs text-slate-500">Indicado em {ref.client.history.length > 0 ? new Date(ref.client.history[0].timestamp).toLocaleDateString('pt-BR') : 'Recente'}</p>
                                    </div>
                                </div>

                                {ref.status === 'Concluído' ? (
                                    <div className="text-right">
                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-800 mb-1">
                                            <CheckCircleIcon className="w-3 h-3" /> Ganho
                                        </span>
                                        <p className="text-sm font-bold text-green-600">+ R$ {ref.reward.toFixed(2)}</p>
                                    </div>
                                ) : (
                                    <div className="text-right">
                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-yellow-100 text-yellow-800 mb-1">
                                            <ClockIcon className="w-3 h-3" /> Pendente
                                        </span>
                                        <p className="text-xs text-slate-400">Aguardando 1º serviço</p>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-10 text-slate-500 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                        <p>Você ainda não indicou ninguém. Comece agora e ganhe créditos!</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ReferralPage;
