
import React, { useEffect, useState } from 'react';
import { ShieldIcon, LockIcon, ChevronRightIcon } from './icons';

export const MagicLoginConfirmPage: React.FC = () => {
    const [targetUrl, setTargetUrl] = useState<string | null>(null);

    useEffect(() => {
        // Extract 'target_url' from query parameters (Hash or Search)
        // Supports: /#/confirm-login?target=URL or /confirm-login?target=URL
        const params = new URLSearchParams(window.location.hash.split('?')[1] || window.location.search);
        const target = params.get('target');

        if (target) {
            try {
                // Decode it if it was encoded
                setTargetUrl(decodeURIComponent(target));
            } catch (e) {
                console.error("Error decoding target URL", e);
                setTargetUrl(target);
            }
        }
    }, []);

    const handleConfirm = () => {
        if (targetUrl) {
            window.location.href = targetUrl;
        }
    };

    if (!targetUrl) {
        return (
            <div className="min-h-screen bg-[#f3f4f8] flex items-center justify-center p-4">
                <div className="bg-white p-8 rounded-2xl shadow-xl text-center max-w-md w-full">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <LockIcon className="w-8 h-8 text-red-500" />
                    </div>
                    <h1 className="text-xl font-bold text-gray-800 mb-2">Link Inválido</h1>
                    <p className="text-gray-500">Não foi possível identificar o destino de login. Por favor, solicite um novo link.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#19224c] to-[#2a356e] flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-fade-in-up">
                {/* Header */}
                <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-6 text-center">
                    <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner">
                        <ShieldIcon className="w-10 h-10 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-1">Verificação de Segurança</h1>
                    <p className="text-purple-100 text-sm">Confirme que você é humano para continuar.</p>
                </div>

                {/* Content */}
                <div className="p-8 text-center">
                    <p className="text-gray-600 mb-8 text-lg leading-relaxed">
                        Olá! Detectamos seu acesso ao painel do
                        <span className="font-bold text-[#19224c]"> SheepHouse</span>.
                        <br />
                        Para proteger sua conta contra robôs, clique no botão para entrar.
                    </p>

                    <button
                        onClick={handleConfirm}
                        className="w-full group relative bg-[#19224c] hover:bg-[#2a356e] text-white font-bold py-4 rounded-xl shadow-lg transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-3"
                    >
                        <span>Acessar Meu Painel</span>
                        <ChevronRightIcon className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </button>

                    <p className="mt-6 text-xs text-gray-400">
                        Ambiente seguro. Seus dados estão protegidos.
                    </p>
                </div>
            </div>
        </div>
    );
};
