import React from 'react';

export const ProductCardSkeleton: React.FC<{ density?: 'comfortable' | 'compact' | 'dense' }> = ({
  density = 'comfortable',
}) => {
  return (
    <div className="border border-black/[0.06] bg-white p-3 flex flex-col justify-between animate-pulse shadow-sm">
      {/* Top Header Plate Skeleton */}
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-black/[0.04]">
        <div className="h-3 w-14 bg-black/10" />
        <div className="h-3 w-16 bg-black/10" />
      </div>

      {/* Media Aspect Box Skeleton */}
      <div
        className={`w-full bg-black/[0.03] border border-black/[0.04] mb-3 flex items-center justify-center relative overflow-hidden ${
          density === 'dense' ? 'aspect-[4/5]' : 'aspect-[3/4]'
        }`}
      >
        <div className="w-12 h-12 border border-black/10 flex items-center justify-center">
          <div className="w-1.5 h-1.5 bg-black/20" />
        </div>
      </div>

      {/* Product Details Skeleton */}
      <div className="space-y-2">
        <div className="h-3.5 w-3/4 bg-black/[0.08] animate-shimmer" />
        <div className="h-2.5 w-1/2 bg-black/[0.04] animate-shimmer" />
        <div className="pt-2 flex justify-between items-center border-t border-black/[0.04]">
          <div className="h-3 w-12 bg-black/[0.08] animate-shimmer" />
          <div className="h-4 w-14 bg-black/[0.04] animate-shimmer" />
        </div>
      </div>
    </div>
  );
};
