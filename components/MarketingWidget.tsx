import React, { useState, useEffect } from 'react';
import { MarketingPost } from '../types';
import { getMarketingPosts } from '../services/marketingService';
import { MegaphoneIcon, ChevronLeftIcon, ChevronRightIcon, GiftIcon, InfoIcon, TrendingUpIcon } from './icons';

interface MarketingWidgetProps {
    onNavigate: (page: any, mode?: string) => void;
}

const MarketingWidget: React.FC<MarketingWidgetProps> = ({ onNavigate }) => {
    const [posts, setPosts] = useState<MarketingPost[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchPosts = async () => {
            setIsLoading(true);
            const data = await getMarketingPosts();
            setPosts(data);
            setIsLoading(false);
        };
        fetchPosts();
    }, []);

    useEffect(() => {
        if (posts.length > 1) {
            const interval = setInterval(() => {
                setCurrentIndex((prev) => (prev + 1) % posts.length);
            }, 8000); // Auto-rotate every 8 seconds
            return () => clearInterval(interval);
        }
    }, [posts.length]);

    const nextSlide = () => {
        setCurrentIndex((prev) => (prev + 1) % posts.length);
    };

    const prevSlide = () => {
        setCurrentIndex((prev) => (prev - 1 + posts.length) % posts.length);
    };

    if (isLoading) {
        return (
            <div className="w-full h-48 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 animate-pulse flex items-center justify-center">
                <div className="flex flex-col items-center gap-2">
                    <div className="w-8 h-8 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
                    <div className="w-32 h-4 bg-slate-200 dark:bg-slate-700 rounded"></div>
                </div>
            </div>
        );
    }

    if (posts.length === 0) return null;

    const currentPost = posts[currentIndex];

    // Determine colors/icons based on type
    const getTypeStyles = (type: string) => {
        switch (type) {
            case 'promotion':
                return {
                    bg: 'bg-gradient-to-r from-pink-500 to-rose-600',
                    icon: <GiftIcon className="w-6 h-6 text-white" />,
                    label: 'PROMOÇÃO'
                };
            case 'news':
                return {
                    bg: 'bg-gradient-to-r from-blue-500 to-indigo-600',
                    icon: <MegaphoneIcon className="w-6 h-6 text-white" />,
                    label: 'NOVIDADE'
                };
            case 'tip':
                return {
                    bg: 'bg-gradient-to-r from-emerald-500 to-teal-600',
                    icon: <InfoIcon className="w-6 h-6 text-white" />,
                    label: 'DICA'
                };
            case 'upsell':
                return {
                    bg: 'bg-gradient-to-r from-amber-500 to-orange-600',
                    icon: <TrendingUpIcon className="w-6 h-6 text-white" />,
                    label: 'OPORTUNIDADE'
                };
            default:
                return {
                    bg: 'bg-gradient-to-r from-slate-500 to-slate-600',
                    icon: <InfoIcon className="w-6 h-6 text-white" />,
                    label: 'INFO'
                };
        }
    };

    const styles = getTypeStyles(currentPost.type);

    const handleAction = () => {
        if (currentPost.actionLink) {
            // Check if it's an internal navigation or external link
            if (currentPost.actionLink.startsWith('http')) {
                window.open(currentPost.actionLink, '_blank');
            } else {
                // Parse internal link (e.g., /booking?service=drone)
                // For simplicity, we'll just support basic page navigation for now
                if (currentPost.actionLink.includes('booking')) onNavigate('booking');
                else if (currentPost.actionLink.includes('referral')) onNavigate('referral');
                else if (currentPost.actionLink.includes('studio')) onNavigate('studio');
                else if (currentPost.actionLink.includes('appointments')) onNavigate('appointments');
            }
        }
    };

    return (
        <div className="relative w-full overflow-hidden rounded-xl shadow-lg group">
            {/* Background Image with Overlay */}
            <div className="absolute inset-0 bg-slate-900">
                {currentPost.imageUrl && (
                    <img
                        src={currentPost.imageUrl}
                        alt={currentPost.title}
                        className="w-full h-full object-cover opacity-40 transition-transform duration-700 hover:scale-105"
                    />
                )}
                <div className={`absolute inset-0 opacity-90 ${styles.bg} mix-blend-multiply`}></div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
            </div>

            {/* Content */}
            <div className="relative p-6 md:p-8 h-full min-h-[200px] flex flex-col justify-center items-start text-white z-10">
                <div className="flex items-center gap-2 mb-3 animate-fade-in">
                    <div className="p-1.5 bg-white/20 backdrop-blur-sm rounded-lg">
                        {styles.icon}
                    </div>
                    <span className="text-xs font-bold tracking-wider bg-white/20 px-2 py-0.5 rounded text-white backdrop-blur-sm">
                        {styles.label}
                    </span>
                </div>

                <h2 className="text-2xl md:text-3xl font-bold mb-2 leading-tight max-w-2xl animate-slide-up">
                    {currentPost.title}
                </h2>

                <p className="text-white/90 text-sm md:text-base mb-6 max-w-xl line-clamp-2 animate-slide-up-delay">
                    {currentPost.content}
                </p>

                {currentPost.actionText && (
                    <button
                        onClick={handleAction}
                        className="bg-white text-slate-900 hover:bg-slate-100 px-6 py-2.5 rounded-lg font-bold text-sm transition-all transform hover:scale-105 shadow-lg flex items-center gap-2 animate-fade-in-up"
                    >
                        {currentPost.actionText}
                        <ChevronRightIcon className="w-4 h-4" />
                    </button>
                )}
            </div>

            {/* Controls */}
            {posts.length > 1 && (
                <>
                    <button
                        onClick={prevSlide}
                        className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-black/20 hover:bg-black/40 text-white rounded-full backdrop-blur-sm transition-all opacity-0 group-hover:opacity-100"
                    >
                        <ChevronLeftIcon className="w-6 h-6" />
                    </button>
                    <button
                        onClick={nextSlide}
                        className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-black/20 hover:bg-black/40 text-white rounded-full backdrop-blur-sm transition-all opacity-0 group-hover:opacity-100"
                    >
                        <ChevronRightIcon className="w-6 h-6" />
                    </button>

                    {/* Dots */}
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                        {posts.map((_, idx) => (
                            <button
                                key={idx}
                                onClick={() => setCurrentIndex(idx)}
                                className={`w-2 h-2 rounded-full transition-all ${idx === currentIndex ? 'bg-white w-6' : 'bg-white/40 hover:bg-white/60'}`}
                            />
                        ))}
                    </div>
                </>
            )}
        </div>
    );
};

export default MarketingWidget;
