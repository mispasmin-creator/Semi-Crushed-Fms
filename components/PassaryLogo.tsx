import React from 'react';

interface PassaryLogoProps {
    /** 'dark' = original olive green (for light backgrounds like sidebar)
     *  'light' = white version (for dark/green backgrounds like login header) */
    variant?: 'dark' | 'light';
    className?: string;
}

const PassaryLogo: React.FC<PassaryLogoProps> = ({ variant = 'dark', className = '' }) => {
    const color = variant === 'light' ? '#ffffff' : '#4a5c2a';

    return (
        <div className={`flex items-center gap-3 ${className}`}>
            {/* Arch / Gate Icon */}
            <svg
                viewBox="0 0 100 110"
                xmlns="http://www.w3.org/2000/svg"
                className="h-12 w-auto shrink-0"
                fill={color}
            >
                {/*
          Outer shape: a square with a notch cut from the bottom-left corner.
          We draw it as a polygon path.
          Points (clockwise):
            top-left(0,0) → top-right(100,0) → bottom-right(100,110)
            → notch-bottom-right(30,110) → notch-top-right(30,85)
            → notch-top-left(0,85) → close
        */}
                <path d="M0,0 H100 V110 H30 V85 H0 Z" />

                {/* White arch cutout (doorway: semicircle on top + rectangle below) */}
                <path
                    d="M22,100 L22,52 A28,28 0 0,1 78,52 L78,100 Z"
                    fill={variant === 'light' ? '#4a5c2a' : '#ffffff'}
                />
            </svg>

            {/* Text */}
            <div className="leading-tight">
                <div
                    className="font-black tracking-tight"
                    style={{
                        color,
                        fontSize: '1.25rem',
                        lineHeight: 1.1,
                        fontFamily: "'Inter', 'Segoe UI', sans-serif",
                        fontWeight: 900,
                    }}
                >
                    Passary
                </div>
                <div
                    className="font-black tracking-tight"
                    style={{
                        color,
                        fontSize: '1.25rem',
                        lineHeight: 1.1,
                        fontFamily: "'Inter', 'Segoe UI', sans-serif",
                        fontWeight: 900,
                    }}
                >
                    Refractories
                </div>
            </div>
        </div>
    );
};

export default PassaryLogo;
