import React from 'react';

export const ProductCardSkeleton: React.FC<{ density?: 'comfortable' | 'compact' | 'dense' }> = ({
  density = 'comfortable',
}) => {
  return (
    <div className="bg-white space-y-4">
      <div
        className={`w-full overflow-hidden ${ density ==='dense' ? 'aspect-[4/5]' : 'aspect-[3/4]'
        }`}
      />
      <div className="space-y-2">
        <div className="h-4 w-3/4" />
        <div className="h-4 w-1/4" />
      </div>
    </div>
  );
};
