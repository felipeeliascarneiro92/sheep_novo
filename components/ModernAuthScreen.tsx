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

    // Carousel State
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [portfolioImages] = useState<string[]>([
        'https://ptwpsuvkrcbkfkutddnq.supabase.co/storage/v1/object/public/public-assets/portfolio/fotografia-imobiliaria-curitiba-sheephouse-069.jpg',
        'https://ptwpsuvkrcbkfkutddnq.supabase.co/storage/v1/object/public/public-assets/portfolio/fotografia-imobiliaria-curitiba-sheephouse-256.jpg',
        'https://ptwpsuvkrcbkfkutddnq.supabase.co/storage/v1/object/public/public-assets/portfolio/fotografia-imobiliaria-curitiba-sheephouse-337.jpg',
        'https://ptwpsuvkrcbkfkutddnq.supabase.co/storage/v1/object/public/public-assets/portfolio/fotografia-imobiliaria-curitiba-sheephouse-352.jpg',
        'https://ptwpsuvkrcbkfkutddnq.supabase.co/storage/v1/object/public/public-assets/portfolio/fotografia-imobiliaria-curitiba-sheephouse-361.jpg'
    ]);
    const [logoUrl] = useState<string>('https://ptwpsuvkrcbkfkutddnq.supabase.co/storage/v1/object/public/public-assets/logo/logo%20sheep%202.png');

    // Auto-rotate carousel
    useEffect(() => {
        if (portfolioImages.length > 1) {
            const interval = setInterval(() => {
                setCurrentImageIndex(prev => (prev + 1) % portfolioImages.length);
            }, 5000);
            return () => clearInterval(interval);
        }
    }, [portfolioImages.length]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        console.log('🔐 Tentando fazer login com:', email);
        const success = await login(email, password);
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
            {/* LEFT SIDE - Portfolio Carousel */}
            <div className="hidden lg:flex lg:w-1/2 xl:w-3/5 relative overflow-hidden">
                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-purple-600/20 via-transparent to-indigo-600/20 z-10 pointer-events-none"></div>

                {/* Images */}
                {portfolioImages.map((image, index) => (
                    <div
                        key={index}
                        className={`absolute inset-0 transition-opacity duration-1000 ${index === currentImageIndex ? 'opacity-100' : 'opacity-0'
                            }`}
                    >
                        <img
                            src={image}
                            alt={`Portfolio ${index + 1}`}
                            className="w-full h-full object-cover"
                        />
                    </div>
                ))}

                {/* Content Overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-12 bg-gradient-to-t from-black/80 via-black/40 to-transparent z-20">
                    <h2 className="text-4xl xl:text-5xl font-bold text-white mb-4">
                        Fotografia profissional<br />para imóveis de luxo
                    </h2>
                    <p className="text-xl text-white/90 mb-6">
                        Transforme seus imóveis em obras de arte visuais
                    </p>

                    {/* Carousel Dots */}
                    {portfolioImages.length > 1 && (
                        <div className="flex gap-2 mt-8">
                            {portfolioImages.map((_, index) => (
                                <button
                                    key={index}
                                    onClick={() => setCurrentImageIndex(index)}
                                    className={`transition-all ${index === currentImageIndex
                                            ? 'w-12 bg-white'
                                            : 'w-3 bg-white/40 hover:bg-white/60'
                                        } h-3 rounded-full`}
                                    aria-label={`Imagem ${index + 1}`}
                                />
                            ))}
                        </div>
                    )}
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
