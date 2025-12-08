
import React, { useState } from 'react';
import { MailIcon, ArrowLeftIcon, CheckCircleIcon } from './icons';

interface ForgotPasswordPageProps {
    onBack: () => void;
}

const ForgotPasswordPage: React.FC<ForgotPasswordPageProps> = ({ onBack }) => {
    const [email, setEmail] = useState('');
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        
        // Simulate API call
        setTimeout(() => {
            setIsLoading(false);
            setIsSubmitted(true);
        }, 1500);
    };

    return (
        <div className="p-8 animate-fade-in">
            <button onClick={onBack} className="flex items-center gap-2 text-sm text-slate-500 hover:text-purple-600 mb-6 transition-colors">
                <ArrowLeftIcon className="w-4 h-4" /> Voltar para Login
            </button>

            <div className="text-center mb-8">
                <div className="bg-purple-100 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <span className="text-3xl">🔐</span>
                </div>
                <h1 className="text-2xl font-bold text-slate-800">Esqueceu a senha?</h1>
                <p className="text-slate-500 mt-2 text-sm">Não se preocupe! Digite seu email e enviaremos instruções para redefinir.</p>
            </div>

            {isSubmitted ? (
                <div className="text-center bg-green-50 p-6 rounded-xl border border-green-100 animate-fade-in">
                    <div className="mx-auto bg-green-100 w-12 h-12 rounded-full flex items-center justify-center mb-3">
                        <CheckCircleIcon className="w-6 h-6 text-green-600" />
                    </div>
                    <h3 className="font-bold text-green-800">Email Enviado!</h3>
                    <p className="text-sm text-green-700 mt-1">Verifique sua caixa de entrada (e spam) para recuperar seu acesso.</p>
                    <button onClick={onBack} className="mt-4 text-sm font-bold text-green-700 hover:underline">
                        Voltar para o Login
                    </button>
                </div>
            ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Email Cadastrado</label>
                        <div className="relative">
                            <MailIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <input 
                                type="email" 
                                value={email} 
                                onChange={e => setEmail(e.target.value)} 
                                className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
                                placeholder="seu@email.com"
                                required
                            />
                        </div>
                    </div>

                    <button 
                        type="submit" 
                        disabled={isLoading}
                        className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-3 rounded-xl shadow-lg transition-all transform active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {isLoading ? 'Enviando...' : 'Enviar Link de Recuperação'}
                    </button>
                </form>
            )}
        </div>
    );
};

export default ForgotPasswordPage;
