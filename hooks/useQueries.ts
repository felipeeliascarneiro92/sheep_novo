/**
 * Custom React Query Hooks para Cache Inteligente
 * 
 * Estes hooks substituem as chamadas diretas aos services,
 * adicionando cache automático e reduzindo requisições ao Supabase.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    getPhotographers,
    getPhotographerById,
    getClients,
    getClientById,
    getServices,
    getAllBookings,
    getBookingById
} from '../services/bookingService';
import { Photographer, Client, Service, Booking } from '../types';

// ==================== PHOTOGRAPHERS ====================

/**
 * Hook para buscar todos os fotógrafos com cache de 10 minutos
 * Fotógrafos raramente mudam, então cache longo é eficiente
 */
export const usePhotographers = () => {
    return useQuery<Photographer[]>({
        queryKey: ['photographers'],
        queryFn: getPhotographers,
        staleTime: 10 * 60 * 1000, // 10 minutos - dados raramente mudam
    });
};

/**
 * Hook para buscar um fotógrafo específico
 * @param id - ID do fotógrafo
 */
export const usePhotographer = (id: string | undefined) => {
    return useQuery<Photographer | undefined>({
        queryKey: ['photographer', id],
        queryFn: () => id ? getPhotographerById(id) : undefined,
        enabled: !!id, // Só executa se ID existir
        staleTime: 10 * 60 * 1000,
    });
};

// ==================== CLIENTS ====================

/**
 * Hook para buscar todos os clientes com cache de 5 minutos
 */
export const useClients = () => {
    return useQuery<Client[]>({
        queryKey: ['clients'],
        queryFn: getClients,
        staleTime: 5 * 60 * 1000, // 5 minutos
    });
};

/**
 * Hook para buscar um cliente específico
 * @param id - ID do cliente
 */
export const useClient = (id: string | undefined) => {
    return useQuery<Client | undefined>({
        queryKey: ['client', id],
        queryFn: () => id ? getClientById(id) : undefined,
        enabled: !!id,
        staleTime: 5 * 60 * 1000,
    });
};

// ==================== SERVICES ====================

/**
 * Hook para buscar todos os serviços com cache de 30 minutos
 * Serviços raramente mudam, então cache muito longo
 */
export const useServices = () => {
    return useQuery<Service[]>({
        queryKey: ['services'],
        queryFn: getServices,
        staleTime: 30 * 60 * 1000, // 30 minutos - dados muito estáveis
    });
};

// ==================== BOOKINGS ====================

/**
 * Hook para buscar todos os agendamentos com cache de 2 minutos
 * Agendamentos mudam com frequência, então cache mais curto
 */
export const useBookings = () => {
    return useQuery<Booking[]>({
        queryKey: ['bookings'],
        queryFn: getAllBookings,
        staleTime: 2 * 60 * 1000, // 2 minutos - dados mudam frequentemente
    });
};

/**
 * Hook para buscar um agendamento específico
 * @param id - ID do agendamento
 */
export const useBooking = (id: string | undefined) => {
    return useQuery<Booking | undefined>({
        queryKey: ['booking', id],
        queryFn: () => id ? getBookingById(id) : undefined,
        enabled: !!id,
        staleTime: 2 * 60 * 1000,
    });
};

// ==================== MUTATIONS (Para invalidar cache) ====================

/**
 * Hook para invalidar cache de fotógrafos após atualizações
 * Use quando criar/editar/deletar um fotógrafo
 */
export const useInvalidatePhotographers = () => {
    const queryClient = useQueryClient();
    return () => {
        queryClient.invalidateQueries({ queryKey: ['photographers'] });
    };
};

/**
 * Hook para invalidar cache de clientes após atualizações
 */
export const useInvalidateClients = () => {
    const queryClient = useQueryClient();
    return () => {
        queryClient.invalidateQueries({ queryKey: ['clients'] });
    };
};

/**
 * Hook para invalidar cache de agendamentos após atualizações
 */
export const useInvalidateBookings = () => {
    const queryClient = useQueryClient();
    return () => {
        queryClient.invalidateQueries({ queryKey: ['bookings'] });
    };
};

/**
 * Hook para invalidar cache de serviços após atualizações
 */
export const useInvalidateServices = () => {
    const queryClient = useQueryClient();
    return () => {
        queryClient.invalidateQueries({ queryKey: ['services'] });
    };
};
