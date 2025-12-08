import { supabase } from './supabase';
import { MarketingPost } from '../types';

// Helper to map DB result to App type
const mapFromDb = (row: any): MarketingPost => ({
    id: row.id,
    title: row.title,
    content: row.content,
    imageUrl: row.image_url,
    type: row.type,
    isActive: row.is_active,
    createdAt: row.created_at,
    actionLink: row.action_link,
    actionText: row.action_text
});

// Helper to map App type to DB input
const mapToDb = (post: Partial<MarketingPost>) => {
    const dbObj: any = {};
    if (post.title !== undefined) dbObj.title = post.title;
    if (post.content !== undefined) dbObj.content = post.content;
    if (post.imageUrl !== undefined) dbObj.image_url = post.imageUrl;
    if (post.type !== undefined) dbObj.type = post.type;
    if (post.isActive !== undefined) dbObj.is_active = post.isActive;
    if (post.actionLink !== undefined) dbObj.action_link = post.actionLink;
    if (post.actionText !== undefined) dbObj.action_text = post.actionText;
    return dbObj;
};

export const getMarketingPosts = async (): Promise<MarketingPost[]> => {
    const { data, error } = await supabase
        .from('marketing_posts')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching marketing posts:', error);
        // Fallback to mock data if table doesn't exist yet
        return [
            {
                id: '1',
                title: 'Novidade: Fotos com Drone!',
                content: 'Agora oferecemos serviços de filmagem e fotografia com drone para valorizar ainda mais seus imóveis. Agende já!',
                type: 'news',
                isActive: true,
                createdAt: new Date().toISOString(),
                imageUrl: 'https://images.unsplash.com/photo-1473968512647-3e447244af8f?auto=format&fit=crop&q=80&w=1000',
                actionLink: '/booking?service=drone',
                actionText: 'Ver Pacotes'
            },
            {
                id: '2',
                title: 'Promoção de Fim de Ano',
                content: 'Ganhe 10% de desconto em qualquer pacote Premium agendado até o dia 31/12.',
                type: 'promotion',
                isActive: true,
                createdAt: new Date(Date.now() - 86400000).toISOString(),
                actionText: 'Aproveitar'
            }
        ];
    }
    return (data || []).map(mapFromDb);
};

export const getAllMarketingPosts = async (): Promise<MarketingPost[]> => {
    const { data, error } = await supabase
        .from('marketing_posts')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) return [];
    return (data || []).map(mapFromDb);
};

export const createMarketingPost = async (post: Omit<MarketingPost, 'id' | 'createdAt'>): Promise<MarketingPost | null> => {
    const dbPayload = mapToDb(post);
    const { data, error } = await supabase
        .from('marketing_posts')
        .insert([dbPayload])
        .select()
        .single();

    if (error) {
        console.error('Error creating marketing post:', error);
        return null;
    }
    return mapFromDb(data);
};

export const updateMarketingPost = async (id: string, updates: Partial<MarketingPost>): Promise<MarketingPost | null> => {
    const dbPayload = mapToDb(updates);
    const { data, error } = await supabase
        .from('marketing_posts')
        .update(dbPayload)
        .eq('id', id)
        .select()
        .single();

    if (error) {
        console.error('Error updating marketing post:', error);
        return null;
    }
    return mapFromDb(data);
};

export const deleteMarketingPost = async (id: string): Promise<boolean> => {
    const { error } = await supabase
        .from('marketing_posts')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('Error deleting marketing post:', error);
        return false;
    }
    return true;
};
