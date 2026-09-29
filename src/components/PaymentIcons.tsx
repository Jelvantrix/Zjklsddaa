import React from 'react';

export const PaymentIcons: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`flex flex-wrap items-center gap-2 sm:gap-2.5 ${className}`}>
      {/* Visa */}
      <div
        className="h-6 sm:h-7 px-2 border border-black/20 flex items-center justify-center text-[9px] sm:text-[10px] tracking-[0.14em] font-sans font-medium uppercase hover:border-black transition-colors"
        title="Visa"
      >
        <span>VISA</span>
      </div>

      {/* Mastercard */}
      <div
        className="h-6 sm:h-7 px-2 border border-black/20 flex items-center gap-1 hover:border-black transition-colors"
        title="Mastercard"
      >
        <svg width="18" height="12" viewBox="0 0 22 14" fill="none" stroke="currentColor">
          <circle cx="7" cy="7" r="6" strokeWidth="1" />
          <circle cx="15" cy="7" r="6" strokeWidth="1" />
        </svg>
        <span className="text-[8.5px] sm:text-[9px] tracking-wider uppercase font-medium">MC</span>
      </div>

      {/* MobilePay */}
      <div
        className="h-6 sm:h-7 px-2 border border-black/20 flex items-center justify-center text-[8.5px] sm:text-[9px] tracking-[0.12em] font-sans font-medium hover:border-black transition-colors"
        title="MobilePay"
      >
        <span>MOBILEPAY</span>
      </div>

      {/* Klarna */}
      <div
        className="h-6 sm:h-7 px-2 border border-black/20 flex items-center justify-center text-[8.5px] sm:text-[9px] tracking-[0.12em] font-sans font-medium hover:border-black transition-colors"
        title="Klarna"
      >
        <span>KLARNA.</span>
      </div>

      {/* Verkkopankki */}
      <div
        className="h-6 sm:h-7 px-2 border border-black/20 flex items-center gap-1 hover:border-black transition-colors"
        title="Verkkopankki"
      >
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M3 21h18M3 10h18M5 10v11M19 10v11M12 10v11M2 10l10-7 10 7" />
        </svg>
        <span className="text-[8.5px] sm:text-[9px] tracking-wider uppercase font-medium">PANKKI</span>
      </div>

      {/* Apple Pay */}
      <div
        className="h-6 sm:h-7 px-2 border border-black/20 flex items-center gap-1 hover:border-black transition-colors"
        title="Apple Pay"
      >
        <svg width="10" height="12" viewBox="0 0 170 170" fill="currentColor">
          <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.92-3.39-8.08-8.5-12.49-15.34-6.42-9.98-11.51-21.75-15.26-35.3-3.75-13.56-5.63-26.23-5.63-38.01 0-14.28 3.59-26.35 10.77-36.21 7.18-9.87 16.27-14.88 27.27-15.03 5.44 0 11.2 1.41 17.28 4.23 6.08 2.82 10.15 4.3 12.21 4.45 1.52-.22 5.86-1.78 13.02-4.68 7.17-2.89 13.38-4.22 18.64-3.98 13.92.76 25.13 5.86 33.63 15.3-12.18 7.39-18.17 17.51-17.96 30.34.22 10.22 4.13 18.8 11.74 25.75 7.61 6.96 16.74 10.97 27.38 12.06-2.17 6.3-4.57 12.49-7.18 18.57zM119.22 33.11c0-7.39 2.66-14.34 7.99-20.86 5.33-6.52 11.96-10.76 19.89-12.25.33 1.3.49 2.5.49 3.59 0 7.39-2.83 14.55-8.48 21.49-5.65 6.95-12.49 11.08-20.53 12.39-.43-1.63-.64-2.94-.64-3.93z" />
        </svg>
        <span className="text-[8.5px] sm:text-[9px] tracking-wider uppercase font-medium">PAY</span>
      </div>
    </div>
  );
};
