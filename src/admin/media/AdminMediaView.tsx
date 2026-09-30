import React, { useState, useRef } from 'react';
import { Product } from '../../types';
import { UploadCloud, Image as ImageIcon, Check, Info, Trash2, Maximize2, Sparkles } from 'lucide-react';
import { PLACEHOLDER_IMG, PLACEHOLDER_VIDEO } from '../../data/mockData';

interface MediaItem {
  id: string;
  url: string;
  filename: string;
  dimensions: string;
  size: string;
  format: string;
  usageCount: number;
  productsUsedIn: string[];
}

interface AdminMediaViewProps {
  products: Product[];
}

export const AdminMediaView: React.FC<AdminMediaViewProps> = ({ products }) => {
  const [mediaList, setMediaList] = useState<MediaItem[]>(() => [
    {
      id: 'med-01',
      url: PLACEHOLDER_IMG,
      filename: 'zejesh_kaamos_packshot_2026.webp',
      dimensions: '2400 × 3200 px',
      size: '482 KB',
      format: 'image/webp',
      usageCount: 18,
      productsUsedIn: ['Nº 001', 'Nº 002', 'Nº 005', 'Nº 008'],
    },
    {
      id: 'med-02',
      url: PLACEHOLDER_IMG,
      filename: 'zejesh_monolith_onmodel.webp',
      dimensions: '2400 × 3000 px',
      size: '520 KB',
      format: 'image/webp',
      usageCount: 12,
      productsUsedIn: ['Nº 003', 'Nº 007', 'Nº 011'],
    },
    {
      id: 'med-03',
      url: PLACEHOLDER_IMG,
      filename: 'zejesh_wool_knit_detail_macro.webp',
      dimensions: '2400 × 2400 px',
      size: '390 KB',
      format: 'image/webp',
      usageCount: 6,
      productsUsedIn: ['Nº 004', 'Nº 014'],
    },
  ]);

  const [isCompressing, setIsCompressing] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Client-side canvas compression to WebP max 2400px
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsCompressing(true);
    const reader = new FileReader();

    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Calculate max 2400px keeping aspect ratio
        let { width, height } = img;
        const maxDim = 2400;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const webpDataUrl = canvas.toDataURL('image/webp', 0.85);

          const newMedia: MediaItem = {
            id: `med-${Date.now()}`,
            url: webpDataUrl,
            filename: file.name.replace(/\.[^/.]+$/, '') + '.webp',
            dimensions: `${width} × ${height} px`,
            size: `${Math.round(webpDataUrl.length * 0.75 / 1024)} KB (WebP)`,
            format: 'image/webp',
            usageCount: 0,
            productsUsedIn: [],
          };

          setMediaList((prev) => [newMedia, ...prev]);
          setIsCompressing(false);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-6">
      <div className="pb-4 border-b border-black/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-editorial text-3xl font-normal">Media Library</h1>
          <p className="text-xs font-mono text-black/50 mt-0.5">
            Client-side Canvas WebP compression (max 2400px), asset resolution, and product usage tracking.
          </p>
        </div>

        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isCompressing}
          className="text-xs font-mono uppercase tracking-wider flex items-center gap-1.5 text-black hover:opacity-60 underline underline-offset-4 cursor-pointer font-semibold"
        >
          <UploadCloud className="w-3.5 h-3.5" />
          <span>{isCompressing ? 'Compressing WebP...' : 'Upload Images'}</span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileUpload}
          className="hidden"
        />
      </div>

      {/* Dropzone Banner */}
      <div
        onClick={() => fileInputRef.current?.click()}
        className="p-8 border border-dashed border-black/30 hover:border-black bg-black/[0.015] hover:bg-black/[0.03] transition-all text-center cursor-pointer space-y-2 select-none"
      >
        <div className="w-10 h-10 border border-black/20 mx-auto flex items-center justify-center bg-white">
          <UploadCloud className="w-5 h-5 text-black/60" />
        </div>
        <div className="font-mono text-xs uppercase tracking-wider font-semibold">
          Drop studio images here or click to browse
        </div>
        <p className="text-[11px] font-mono text-black/40">
          Images are automatically resized and compressed client-side using hardware Canvas WebP export.
        </p>
      </div>

      {/* Media Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {mediaList.map((item) => (
          <div
            key={item.id}
            onClick={() => setSelectedMedia(item)}
            className="border border-black/[0.08] bg-white p-2.5 flex flex-col justify-between group hover:border-black transition-colors cursor-pointer"
          >
            <div className="aspect-[3/4] border border-black/10 bg-black/5 overflow-hidden relative mb-2">
              <img src={item.url} alt="" className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-500 grayscale" />
              <div className="absolute bottom-1 right-1 bg-black text-white text-[9px] font-mono px-1 py-0.5">
                {item.dimensions}
              </div>
            </div>

            <div className="space-y-1">
              <div className="font-mono text-[11px] font-semibold truncate text-black">{item.filename}</div>
              <div className="flex items-center justify-between text-[10px] font-mono text-black/50">
                <span>{item.size}</span>
                <span className="text-black font-medium">{item.usageCount} products</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Media Inspector Modal */}
      {selectedMedia && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div onClick={() => setSelectedMedia(null)} className="fixed inset-0 bg-neutral-950/40 backdrop-blur-[2px]" />
          <div className="relative w-full max-w-lg bg-white border border-black/[0.08] shadow-2xl p-6 z-10 font-mono text-xs space-y-4">
            <div className="flex items-center justify-between border-b border-black/10 pb-3">
              <span className="font-semibold uppercase tracking-wider">Asset Details</span>
              <button onClick={() => setSelectedMedia(null)} className="cursor-pointer text-black/50 hover:text-black">
                ✕
              </button>
            </div>

            <div className="aspect-[3/4] max-h-60 border border-black/20 overflow-hidden mx-auto bg-black/5">
              <img src={selectedMedia.url} alt="" className="w-full h-full object-cover grayscale" />
            </div>

            <div className="space-y-2 text-[11px] divide-y divide-black/10">
              <div className="flex justify-between py-1">
                <span className="text-black/50">Filename:</span>
                <span className="font-semibold truncate max-w-[250px]">{selectedMedia.filename}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-black/50">Dimensions:</span>
                <span>{selectedMedia.dimensions}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-black/50">Filesize:</span>
                <span>{selectedMedia.size}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-black/50">Linked in products:</span>
                <span>{selectedMedia.productsUsedIn.join(', ') || 'Not linked'}</span>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedMedia(null)}
                className="text-xs font-mono uppercase text-black hover:opacity-60 underline underline-offset-4 cursor-pointer font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
