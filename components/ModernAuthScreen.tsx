import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import RegisterPage from './RegisterPage';
import ForgotPasswordPage from './ForgotPasswordPage';

const ModernAuthScreen: React.FC = () => {
    const { login } = useAuth();
    const [view, setView] = useState<'login' | 'register' | 'forgot-password'>('login');

    // Login State
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [rememberMe, setRememberMe] = useState(true);

    const [logoUrl] = useState<string>('https://ptwpsuvkrcbkfkutddnq.supabase.co/storage/v1/object/public/public-assets/logo/logo%20sheep%202.png');

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        console.log('🔐 Tentando fazer login com:', email);
        const success = await login(email, password, rememberMe);
        console.log('🔐 Resultado do login:', success ? '✅ Sucesso' : '❌ Falhou');

        if (!success) {
            console.error('❌ Login falhou para:', email);
            setError('Email ou senha inválidos. Tente novamente.');
        } else {
            console.log('✅ Login bem-sucedido!');
        }
        setIsLoading(false);
    };

    const renderLoginForm = () => (
        <div className="w-full h-full flex flex-col justify-center px-8 lg:px-16 py-12">
            {/* Logo */}
            <div className="mb-8">
                <img
                    src={logoUrl}
                    alt="SheepHouse"
                    className="h-16 w-auto mx-auto lg:mx-0 object-contain"
                />
            </div>

            {/* Title */}
            <div className="mb-8">
                <h1 className="text-3xl lg:text-4xl font-bold text-slate-800 dark:text-slate-100 mb-2">
                    Bem-vindo de volta
                </h1>
                <p className="text-slate-500 dark:text-slate-400">
                    Acesse sua conta para continuar
                </p>
            </div>

            {/* Form */}
            <form onSubmit={handleLogin} className="space-y-5">
                <div>
                    <label
                        htmlFor="email"
                        className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2"
                    >
                        Email
                    </label>
                    <input
                        id="email"
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        className="w-full px-4 py-3.5 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl focus:ring-4 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-all text-slate-800 dark:text-white placeholder:text-slate-400"
                        placeholder="seu@email.com"
                        required
                        disabled={isLoading}
                    />
                </div>

                <div>
                    <div className="flex justify-between items-center mb-2">
                        <label
                            htmlFor="password"
                            className="block text-sm font-semibold text-slate-700 dark:text-slate-300"
                        >
                            Senha
                        </label>
                        <button
                            type="button"
                            onClick={() => setView('forgot-password')}
                            className="text-sm font-semibold text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 transition-colors"
                        >
                            Esqueceu a senha?
                        </button>
                    </div>
                    <input
                        id="password"
                        type="password"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        className="w-full px-4 py-3.5 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl focus:ring-4 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-all text-slate-800 dark:text-white placeholder:text-slate-400"
                        placeholder="••••••••"
                        required
                        disabled={isLoading}
                    />
                </div>

                {/* Remember Me Checkbox */}
                <div className="flex items-center">
                    <input
                        id="remember-me"
                        type="checkbox"
                        className="w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 rounded focus:ring-purple-500 focus:ring-2 dark:bg-slate-700 dark:border-slate-600 cursor-pointer"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                    />
                    <label htmlFor="remember-me" className="ml-2 text-sm font-medium text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                        Lembrar meus dados
                    </label>
                </div>

                {error && (
                    <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm p-4 rounded-xl animate-fade-in-fast font-medium">
                        {error}
                    </div>
                )}

                <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:from-slate-400 disabled:to-slate-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-purple-500/30 transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:cursor-not-allowed disabled:transform-none"
                >
                    {isLoading ? (
                        <span className="flex items-center justify-center gap-2">
                            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Entrando...
                        </span>
                    ) : 'Entrar'}
                </button>
            </form>

            {/* Register Link */}
            <div className="mt-8 text-center">
                <p className="text-slate-600 dark:text-slate-400 text-sm">
                    Não tem uma conta?{' '}
                    <button
                        onClick={() => setView('register')}
                        className="font-bold text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 transition-colors"
                    >
                        Cadastre-se gratuitamente
                    </button>
                </p>
            </div>
        </div>
    );

    const renderContent = () => {
        if (view === 'register') {
            return (
                <div className="w-full h-full flex items-center justify-center p-8">
                    <div className="w-full max-w-md">
                        <RegisterPage onBack={() => setView('login')} />
                    </div>
                </div>
            );
        }

        if (view === 'forgot-password') {
            return (
                <div className="w-full h-full flex items-center justify-center p-8">
                    <div className="w-full max-w-md">
                        <ForgotPasswordPage onBack={() => setView('login')} />
                    </div>
                </div>
            );
        }

        return renderLoginForm();
    };

    return (
        <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
            {/* LEFT SIDE - Modern Vector Gradient Panel */}
            <div className="hidden lg:flex lg:w-1/2 xl:w-3/5 relative overflow-hidden bg-slate-900 border-r border-slate-800">

                {/* Modern Mesh Gradient Animation */}
                <div className="absolute inset-0 z-0">
                    <div className="absolute top-[-20%] left-[-20%] w-[70%] h-[70%] bg-purple-600/20 rounded-full blur-[120px] animate-pulse"></div>
                    <div className="absolute bottom-[-20%] right-[-20%] w-[70%] h-[70%] bg-indigo-600/20 rounded-full blur-[120px] animate-pulse delay-1000"></div>
                </div>

                {/* Content */}
                <div className="relative z-10 p-16 flex flex-col justify-center h-full max-w-2xl mx-auto">
                    <div className="mb-10 inline-flex self-start">
                        <span className="px-4 py-2 rounded-full border border-purple-500/30 bg-purple-500/10 text-purple-200 text-sm font-semibold backdrop-blur-md">
                            🚀 Plataforma Exclusiva
                        </span>
                    </div>

                    <h2 className="text-5xl font-extrabold text-white mb-6 leading-tight">
                        Gestão Inteligente para <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">Imobiliárias de Sucesso</span>
                    </h2>

                    <p className="text-xl text-slate-400 mb-12 leading-relaxed">
                        Revolucione sua operação com tecnologia de ponta. Agendamentos rápidos, fotos em alta resolução e controle financeiro total.
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                        <div className="flex items-start gap-4">
                            <div className="p-3 rounded-lg bg-indigo-500/20 text-indigo-300">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            </div>
                            <div>
                                <h3 className="font-bold text-white mb-1">Ágil e Rápido</h3>
                                <p className="text-sm text-slate-400">Agende em segundos</p>
                            </div>
                        </div>

                        <div className="flex items-start gap-4">
                            <div className="p-3 rounded-lg bg-purple-500/20 text-purple-300">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                            </div>
                            <div>
                                <h3 className="font-bold text-white mb-1">Qualidade Premium</h3>
                                <p className="text-sm text-slate-400">Fotos HDR 4K Ultra</p>
                            </div>
                        </div>

                        <div className="flex items-start gap-4">
                            <div className="p-3 rounded-lg bg-pink-500/20 text-pink-300">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            </div>
                            <div>
                                <h3 className="font-bold text-white mb-1">Pagamento Fácil</h3>
                                <p className="text-sm text-slate-400">Faturas integradas</p>
                            </div>
                        </div>

                        <div className="flex items-start gap-4">
                            <div className="p-3 rounded-lg bg-emerald-500/20 text-emerald-300">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            </div>
                            <div>
                                <h3 className="font-bold text-white mb-1">100% Garantido</h3>
                                <p className="text-sm text-slate-400">Satisfação total</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* RIGHT SIDE - Login Form */}
            <div className="w-full lg:w-1/2 xl:w-2/5 bg-white dark:bg-slate-900 flex items-center justify-center relative">
                {/* Mobile Logo (visible only on mobile) */}
                <div className="lg:hidden absolute top-8 left-0 right-0 flex justify-center z-10">
                    <img
                        src={logoUrl}
                        alt="SheepHouse"
                        className="h-12 w-auto object-contain"
                    />
                </div>

                {/* Form Container */}
                <div className="w-full max-w-md px-6">
                    {renderContent()}
                </div>
            </div>
        </div>
    );
};

export default ModernAuthScreen;
