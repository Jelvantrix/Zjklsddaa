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
      title: 'text-[15px] sm:text-[18px] tracking-[0.20em] sm:tracking-[0.22em]',
      sub: 'text-[5.5px] sm:text-[7px] tracking-[0.40em] sm:tracking-[0.45em] mt-[1px]',
    },
    md: {
      title: 'text-[17px] sm:text-[23px] md:text-[26px] tracking-[0.20em] sm:tracking-[0.22em]',
      sub: 'text-[6px] sm:text-[7.5px] md:text-[8.5px] tracking-[0.42em] sm:tracking-[0.46em] mt-[1.5px]',
    },
    lg: {
      title: 'text-[28px] sm:text-[38px] md:text-[42px] tracking-[0.22em] sm:tracking-[0.24em]',
      sub: 'text-[9px] sm:text-[11px] md:text-[12px] tracking-[0.46em] sm:tracking-[0.50em] mt-[3px]',
    },
    hero: {
      title: 'text-[40px] sm:text-[64px] md:text-[80px] tracking-[0.24em] sm:tracking-[0.26em]',
      sub: 'text-[11px] sm:text-[15px] md:text-[18px] tracking-[0.48em] sm:tracking-[0.54em] mt-[4px]',
    },
  };

  const selectedSize = sizeStyles[size];

  return (
    <div
      className={`inline-flex flex-col items-center justify-center select-none text-center transition-colors duration-300 ${
        invert ? 'text-white' : 'text-black'
      } ${className}`}
      aria-label="ZEJESH CLOTHES"
    >
      <span
        className={`font-editorial uppercase font-medium leading-none whitespace-nowrap pl-[0.20em] ${selectedSize.title}`}
        style={{
          fontFamily: '"Cormorant Garamond", "Instrument Serif", Georgia, serif',
        }}
      >
        ZEJESH
      </span>
      <span
        className={`font-sans uppercase font-light leading-none whitespace-nowrap pl-[0.42em] opacity-90 ${selectedSize.sub}`}
        style={{
          fontFamily: '"Hanken Grotesk", -apple-system, BlinkMacSystemFont, sans-serif',
        }}
      >
        CLOTHES
      </span>
    </div>
  );
};
