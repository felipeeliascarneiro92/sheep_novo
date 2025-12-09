import React, { useState, useEffect, useRef } from 'react';

interface LazyImageProps {
    src: string;
    alt: string;
    className?: string;
    fallback?: string;
    placeholder?: string;
}

/**
 * Componente de imagem com lazy loading
 * Carrega a imagem apenas quando ela aparece no viewport
 * 
 * @example
 * <LazyImage 
 *   src={photographer.profilePicUrl} 
 *   alt={photographer.name}
 *   className="w-12 h-12 rounded-full"
 *   placeholder="/placeholder-avatar.png"
 * />
 */
const LazyImage: React.FC<LazyImageProps> = ({
    src,
    alt,
    className = '',
    fallback = '/placeholder.png',
    placeholder
}) => {
    const [imageSrc, setImageSrc] = useState<string>(placeholder || fallback);
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);
    const imgRef = useRef<HTMLImageElement>(null);

    useEffect(() => {
        // Intersection Observer para detectar quando a imagem entra no viewport
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        // Imagem entrou no viewport, carregar!
                        const img = new Image();
                        img.src = src;

                        img.onload = () => {
                            setImageSrc(src);
                            setIsLoading(false);
                        };

                        img.onerror = () => {
                            setImageSrc(fallback);
                            setHasError(true);
                            setIsLoading(false);
                        };

                        // Parar de observar após carregar
                        if (imgRef.current) {
                            observer.unobserve(imgRef.current);
                        }
                    }
                });
            },
            {
                rootMargin: '50px', // Começar a carregar 50px antes de entrar no viewport
                threshold: 0.01
            }
        );

        if (imgRef.current) {
            observer.observe(imgRef.current);
        }

        return () => {
            if (imgRef.current) {
                observer.unobserve(imgRef.current);
            }
        };
    }, [src, fallback]);

    return (
        <img
            ref={imgRef}
            src={imageSrc}
            alt={alt}
            className={`${className} ${isLoading ? 'opacity-50' : 'opacity-100'} transition-opacity duration-300`}
            loading="lazy" // Fallback nativo do browser
        />
    );
};

export default LazyImage;
