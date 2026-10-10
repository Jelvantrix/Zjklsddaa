import React from 'react';

interface BrandLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'hero';
  invert?: boolean;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  className = '',
  size = 'md',
  invert = false,
}) => {
  // Dimension tuning per size with responsive breakpoints
  const sizeStyles = {
    sm: {
      title: 'text-[16px] sm:text-[19px]',
      sub: 'text-[6px] sm:text-[7.5px] mt-[1.5px]',
    },
    md: {
      title: 'text-[20px] sm:text-[26px] md:text-[30px]',
      sub: 'text-[7.5px] sm:text-[9px] md:text-[10px] mt-[2px]',
    },
    lg: {
      title: 'text-[32px] sm:text-[44px] md:text-[50px]',
      sub: 'text-[11px] sm:text-[13px] md:text-[15px] mt-[4px]',
    },
    hero: {
      title: 'text-[44px] sm:text-[68px] md:text-[88px]',
      sub: 'text-[13px] sm:text-[18px] md:text-[22px] mt-[6px]',
    },
  };

  const selectedSize = sizeStyles[size];

  return (
    <div
      className={`inline-flex items-center justify-center select-none text-center transition-colors duration-300 ${ invert ?'text-white' : 'text-black'
      } ${className}`}
      aria-label="ZEJESH"
    >
      <span
        className={`uppercase font-semibold leading-none whitespace-nowrap pl-[0.22em] ${selectedSize.title}`}
        style={{
          fontFamily: '"Bodoni Moda", "Playfair Display", "Didot", Georgia, serif',
          letterSpacing: '0.22em',
        }}
      >
        ZEJESH
      </span>
    </div>
  );
};
