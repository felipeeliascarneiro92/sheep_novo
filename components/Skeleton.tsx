import React from 'react';

interface SkeletonProps {
    className?: string;
    variant?: 'text' | 'circular' | 'rectangular';
    width?: string | number;
    height?: string | number;
}

const Skeleton: React.FC<SkeletonProps> = ({
    className = '',
    variant = 'text',
    width,
    height
}) => {
    const baseClasses = "animate-pulse bg-slate-200";

    let variantClasses = "";
    switch (variant) {
        case 'circular':
            variantClasses = "rounded-full";
            break;
        case 'rectangular':
            variantClasses = "rounded-md";
            break;
        case 'text':
        default:
            variantClasses = "rounded h-4 w-full";
            break;
    }

    const style: React.CSSProperties = {};
    if (width) style.width = width;
    if (height) style.height = height;

    return (
        <div
            className={`${baseClasses} ${variantClasses} ${className}`}
            style={style}
        />
    );
};

export default Skeleton;
