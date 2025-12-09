import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Configuração otimizada do Query Client
const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            // Cache padrão de 5 minutos
            staleTime: 5 * 60 * 1000, // 5 minutos
            gcTime: 10 * 60 * 1000, // 10 minutos (antigamente cacheTime)

            // Não refetch automaticamente em algumas situações para economizar requisições
            refetchOnWindowFocus: false, // Não refetch quando volta para a aba
            refetchOnMount: true, // Refetch quando componente monta (se dados estiverem stale)
            refetchOnReconnect: true, // Refetch quando reconecta internet

            // Retry apenas 1 vez em caso de erro (não 3 vezes padrão)
            retry: 1,
            retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
        },
        mutations: {
            // Retry automático em mutations (create, update, delete)
            retry: 1,
        },
    },
});

interface QueryProviderProps {
    children: React.ReactNode;
}

export const QueryProvider: React.FC<QueryProviderProps> = ({ children }) => {
    return (
        <QueryClientProvider client={queryClient}>
            {children}
        </QueryClientProvider>
    );
};

// Exportar o queryClient para uso manual (invalidações, etc)
export { queryClient };
