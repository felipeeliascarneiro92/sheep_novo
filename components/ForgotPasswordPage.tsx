
import React, { useState } from 'react';
import { MailIcon, ArrowLeftIcon, CheckCircleIcon } from './icons';
import { supabase } from '../services/supabase';

interface ForgotPasswordPageProps {
    onBack: () => void;
}

const ForgotPasswordPage: React.FC<ForgotPasswordPageProps> = ({ onBack }) => {
    const [email, setEmail] = useState('');
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        console.log('🔑 Solicitando recuperação de senha para:', email);

        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/reset-password`,
            });

            if (error) {
                console.error('❌ Erro ao enviar email de recuperação:', error);

                if (error.message.includes('Email') || error.message.includes('SMTP')) {
                    setError('⚠️ Email não configurado. Contate o administrador ou recupere a senha manualmente.');
                } else {
                    setError(`Erro: ${error.message}`);
                }
                setIsLoading(false);
                return;
            }

            console.log('✅ Email de recuperação enviado com sucesso!');
            setIsSubmitted(true);
        } catch (err: any) {
            console.error('❌ Erro inesperado:', err);
            setError('Erro ao enviar email. Tente novamente mais tarde.');
        }

        setIsLoading(false);
    };

    return (
        <div className="p-8 animate-fade-in">
            <button onClick={onBack} className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 mb-6 transition-colors">
                <ArrowLeftIcon className="w-4 h-4" /> Voltar para Login
            </button>

            <div className="text-center mb-8">
                <div className="bg-purple-100 dark:bg-purple-900/30 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <span className="text-3xl">🔐</span>
                </div>
                <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Esqueceu a senha?</h1>
                <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm">Não se preocupe! Digite seu email e enviaremos instruções para redefinir.</p>
            </div>

            {isSubmitted ? (
                <div className="text-center bg-green-50 dark:bg-green-900/20 p-6 rounded-xl border border-green-100 dark:border-green-800 animate-fade-in">
                    <div className="mx-auto bg-green-100 dark:bg-green-800/50 w-12 h-12 rounded-full flex items-center justify-center mb-3">
                        <CheckCircleIcon className="w-6 h-6 text-green-600 dark:text-green-400" />
                    </div>
                    <h3 className="font-bold text-green-800 dark:text-green-300">Email Enviado!</h3>
                    <p className="text-sm text-green-700 dark:text-green-400 mt-1">Verifique sua caixa de entrada (e spam) para recuperar seu acesso.</p>
                    <button onClick={onBack} className="mt-4 text-sm font-bold text-green-700 dark:text-green-400 hover:underline">
                        Voltar para o Login
                    </button>
                </div>
            ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email Cadastrado</label>
                        <div className="relative">
                            <MailIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <input
                                type="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
                                placeholder="seu@email.com"
                                required
                                disabled={isLoading}
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-300 text-sm p-4 rounded-xl">
                            <p className="font-semibold mb-2">{error}</p>
                            <p className="text-xs">💡 <strong>Solução:</strong> Configure SMTP no Supabase ou contate o administrador para redefinir sua senha manualmente.</p>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-slate-800 hover:bg-slate-900 dark:bg-purple-600 dark:hover:bg-purple-700 text-white font-bold py-3 rounded-xl shadow-lg transition-all transform active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {isLoading ? 'Enviando...' : 'Enviar Link de Recuperação'}
                    </button>

                    <div className="text-center">
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            Se não funcionar, contate o suporte:<br />
                            <a href="mailto:suporte@sheephouse.com.br" className="text-purple-600 dark:text-purple-400 font-semibold hover:underline">
                                suporte@sheephouse.com.br
                            </a>
                        </p>
                    </div>
                </form>
            )}
        </div>
    );
};

export default ForgotPasswordPage;
