
import React, { useState, useEffect } from 'react';
import { LockIcon, CheckCircleIcon, EyeIcon, EyeOffIcon } from './icons';
import { supabase } from '../services/supabase';

const ResetPasswordPage: React.FC = () => {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    useEffect(() => {
        // Verificar se há um hash de recuperação de senha na URL
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const type = hashParams.get('type');

        console.log('🔐 Página de reset carregada. Type:', type);

        if (type !== 'recovery') {
            console.warn('⚠️ Link de recuperação inválido ou expirado');
            setError('Link de recuperação inválido ou expirado.');
        }
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        // Validações
        if (password.length < 6) {
            setError('A senha deve ter pelo menos 6 caracteres.');
            return;
        }

        if (password !== confirmPassword) {
            setError('As senhas não coincidem.');
            return;
        }

        setIsLoading(true);
        console.log('🔐 Tentando redefinir senha...');

        try {
            const { error } = await supabase.auth.updateUser({
                password: password
            });

            if (error) {
                console.error('❌ Erro ao redefinir senha:', error);
                setError(`Erro: ${error.message}`);
                setIsLoading(false);
                return;
            }

            console.log('✅ Senha redefinida com sucesso!');
            setSuccess(true);

            // Redirecionar para home após 3 segundos
            setTimeout(() => {
                window.location.href = '/';
            }, 3000);

        } catch (err: any) {
            console.error('❌ Erro inesperado:', err);
            setError('Erro ao redefinir senha. Tente novamente.');
        }

        setIsLoading(false);
    };

    const handleBackToLogin = () => {
        window.location.href = '/';
    };

    if (success) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
                <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-2xl max-w-md w-full text-center animate-fade-in">
                    <div className="mx-auto bg-green-100 dark:bg-green-900/30 w-20 h-20 rounded-full flex items-center justify-center mb-6">
                        <CheckCircleIcon className="w-10 h-10 text-green-600 dark:text-green-400" />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-3">
                        Senha Redefinida!
                    </h1>
                    <p className="text-slate-600 dark:text-slate-400 mb-6">
                        Sua senha foi alterada com sucesso. Você será redirecionado para o login em instantes...
                    </p>
                    <div className="flex justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-2xl max-w-md w-full animate-fade-in">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="bg-purple-100 dark:bg-purple-900/30 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <LockIcon className="w-8 h-8 text-purple-600 dark:text-purple-400" />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2">
                        Redefinir Senha
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm">
                        Escolha uma nova senha forte para sua conta
                    </p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Nova Senha */}
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                            Nova Senha
                        </label>
                        <div className="relative">
                            <LockIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                className="w-full pl-10 pr-12 py-3 bg-white dark:bg-slate-700 border-2 border-slate-200 dark:border-slate-600 rounded-xl focus:ring-4 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-all text-slate-800 dark:text-white placeholder:text-slate-400"
                                placeholder="Digite sua nova senha"
                                required
                                disabled={isLoading}
                                minLength={6}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                            >
                                {showPassword ? (
                                    <EyeOffIcon className="w-5 h-5" />
                                ) : (
                                    <EyeIcon className="w-5 h-5" />
                                )}
                            </button>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            Mínimo de 6 caracteres
                        </p>
                    </div>

                    {/* Confirmar Senha */}
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                            Confirmar Nova Senha
                        </label>
                        <div className="relative">
                            <LockIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <input
                                type={showConfirmPassword ? 'text' : 'password'}
                                value={confirmPassword}
                                onChange={e => setConfirmPassword(e.target.value)}
                                className="w-full pl-10 pr-12 py-3 bg-white dark:bg-slate-700 border-2 border-slate-200 dark:border-slate-600 rounded-xl focus:ring-4 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-all text-slate-800 dark:text-white placeholder:text-slate-400"
                                placeholder="Digite novamente"
                                required
                                disabled={isLoading}
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                            >
                                {showConfirmPassword ? (
                                    <EyeOffIcon className="w-5 h-5" />
                                ) : (
                                    <EyeIcon className="w-5 h-5" />
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Erro */}
                    {error && (
                        <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm p-4 rounded-xl animate-fade-in font-medium">
                            {error}
                        </div>
                    )}

                    {/* Submit Button */}
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
                                Redefinindo...
                            </span>
                        ) : 'Redefinir Senha'}
                    </button>
                </form>

                {/* Footer */}
                <div className="mt-6 text-center">
                    <button
                        onClick={handleBackToLogin}
                        className="text-sm text-slate-500 dark:text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 font-semibold transition-colors"
                    >
                        Voltar para o Login
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ResetPasswordPage;
