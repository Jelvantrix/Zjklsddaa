import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Check,
  RotateCcw,
  RotateCw,
  Compass,
  ZoomIn,
  ZoomOut,
  Move,
  Layers,
  Crop,
  Eye,
  Undo2,
  Redo2,
  FlipHorizontal,
  FlipVertical,
  AlertTriangle,
  Download,
  Sliders,
  Sparkles,
} from 'lucide-react';
import { ImageFramingParams, ImagePlacementCrop, MediaAsset, NEUTRAL_PLACEHOLDER_IMG } from '../../types';
import { uploadMediaAsset } from '../../supabase/mediaService';

export interface UniversalImageEditorProps {
  isOpen: boolean;
  imageUrl: string;
  title?: string;
  initialFraming?: Partial<ImageFramingParams>;
  onClose: () => void;
  onApply: (framing: ImageFramingParams) => void;
  onExportCopy?: (newAsset: MediaAsset) => void;
}

type PlacementKey = 'all' | 'card' | 'archive' | 'productPage' | 'heroDesktop' | 'heroMobile' | 'og';

const DEFAULT_CROP: ImagePlacementCrop = {
  focalX: 50,
  focalY: 50,
  zoom: 1.0,
  rotation: 0,
  flipH: false,
  flipV: false,
  aspectRatio: '3:4',
};

/** Tailwind aspect utilities keyed by the editor's ratio presets. */
const aspectClasses: Record<string, string> = {
  '3:4': 'aspect-[3/4]',
  '4:5': 'aspect-[4/5]',
  '1:1': 'aspect-square',
  '16:9': 'aspect-[16/9]',
  '9:16': 'aspect-[9/16]',
};

/** Ratio presets as [width, height] used by the canvas exporter. */
const aspectRatios: Record<string, [number, number]> = {
  '3:4': [3, 4],
  '4:5': [4, 5],
  '1:1': [1, 1],
  '16:9': [16, 9],
  '9:16': [9, 16],
};

export const UniversalImageEditorModal: React.FC<UniversalImageEditorProps> = ({
  isOpen,
  imageUrl,
  title = 'Image Frame & Angle Editor',
  initialFraming,
  onClose,
  onApply,
  onExportCopy,
}) => {
  // Active placement tab
  const [activePlacement, setActivePlacement] = useState<PlacementKey>('all');
  const [sameForAll, setSameForAll] = useState<boolean>(true);

  // Main framing state
  const [mainCrop, setMainCrop] = useState<ImagePlacementCrop>(() => ({
    focalX: initialFraming?.focalX ?? 50,
    focalY: initialFraming?.focalY ?? 50,
    zoom: initialFraming?.zoom ?? 1.0,
    rotation: initialFraming?.rotation ?? 0,
    flipH: initialFraming?.flipH ?? false,
    flipV: initialFraming?.flipV ?? false,
    aspectRatio: initialFraming?.aspectRatio ?? '3:4',
  }));

  // Overrides per placement
  const [overrides, setOverrides] = useState<Record<string, Partial<ImagePlacementCrop>>>(() => {
    return initialFraming?.overrides ? { ...initialFraming.overrides } : {};
  });

  // Undo / Redo history
  const [history, setHistory] = useState<ImagePlacementCrop[]>([]);
  const [historyIdx, setHistoryIdx] = useState<number>(-1);

  // Natural dimensions & warnings
  const [naturalWidth, setNaturalWidth] = useState<number>(0);
  const [naturalHeight, setNaturalHeight] = useState<number>(0);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  // Crosshair dragging state
  const [isDraggingCrosshair, setIsDraggingCrosshair] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Resolve current active crop based on placement
  const currentCrop: ImagePlacementCrop = activePlacement === 'all' || sameForAll
    ? mainCrop
    : { ...mainCrop, ...(overrides[activePlacement] || {}) };

  /** Resolves the crop that a given storefront placement actually renders. */
  const cropFor = (key: PlacementKey): ImagePlacementCrop =>
    sameForAll ? mainCrop : { ...mainCrop, ...(overrides[key] || {}) };

  const styleFor = (crop: ImagePlacementCrop): React.CSSProperties => ({
    objectPosition: `${crop.focalX ?? 50}% ${crop.focalY ?? 50}%`,
    transform: `${crop.flipH ? 'scaleX(-1) ' : ''}${crop.flipV ? 'scaleY(-1) ' : ''}scale(${
      crop.zoom || 1
    }) rotate(${crop.rotation || 0}deg)`,
    transformOrigin: `${crop.focalX ?? 50}% ${crop.focalY ?? 50}%`,
  });

  // Sync when modal opens or initial values change
  useEffect(() => {
    if (isOpen) {
      const initCrop: ImagePlacementCrop = {
        focalX: initialFraming?.focalX ?? 50,
        focalY: initialFraming?.focalY ?? 50,
        zoom: initialFraming?.zoom ?? 1.0,
        rotation: initialFraming?.rotation ?? 0,
        flipH: initialFraming?.flipH ?? false,
        flipV: initialFraming?.flipV ?? false,
        aspectRatio: initialFraming?.aspectRatio ?? '3:4',
      };
      setMainCrop(initCrop);
      setOverrides(initialFraming?.overrides ? { ...initialFraming.overrides } : {});
      setSameForAll(!initialFraming?.overrides || Object.keys(initialFraming.overrides).length === 0);
      setHistory([initCrop]);
      setHistoryIdx(0);

      // Measure natural dimensions
      const img = new Image();
      img.onload = () => {
        setNaturalWidth(img.naturalWidth);
        setNaturalHeight(img.naturalHeight);
      };
      img.src = imageUrl || NEUTRAL_PLACEHOLDER_IMG;
    }
  }, [isOpen, imageUrl, initialFraming]);

  // Update current crop with history tracking
  const updateCrop = (updates: Partial<ImagePlacementCrop>, saveHistory = true) => {
    const nextCrop = { ...currentCrop, ...updates };

    if (activePlacement === 'all' || sameForAll) {
      setMainCrop(nextCrop);
    } else {
      setOverrides((prev) => ({
        ...prev,
        [activePlacement]: { ...(prev[activePlacement] || {}), ...updates },
      }));
    }

    if (saveHistory) {
      setHistory((prev) => [...prev.slice(0, historyIdx + 1), nextCrop]);
      setHistoryIdx((prev) => prev + 1);
    }
  };

  const handleUndo = () => {
    if (historyIdx > 0) {
      const prev = history[historyIdx - 1];
      setHistoryIdx(historyIdx - 1);
      updateCrop(prev, false);
    }
  };

  const handleRedo = () => {
    if (historyIdx < history.length - 1) {
      const next = history[historyIdx + 1];
      setHistoryIdx(historyIdx + 1);
      updateCrop(next, false);
    }
  };

  const handleReset = () => {
    updateCrop(DEFAULT_CROP);
  };

  // Keyboard navigation (+/- zoom, arrow keys for focal point)
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        updateCrop({ focalY: Math.max(0, (currentCrop.focalY ?? 50) - (e.shiftKey ? 5 : 1)) });
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        updateCrop({ focalY: Math.min(100, (currentCrop.focalY ?? 50) + (e.shiftKey ? 5 : 1)) });
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        updateCrop({ focalX: Math.max(0, (currentCrop.focalX ?? 50) - (e.shiftKey ? 5 : 1)) });
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        updateCrop({ focalX: Math.min(100, (currentCrop.focalX ?? 50) + (e.shiftKey ? 5 : 1)) });
      } else if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        updateCrop({ zoom: Math.min(4.0, Number(((currentCrop.zoom ?? 1) + 0.1).toFixed(2))) });
      } else if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        updateCrop({ zoom: Math.max(1.0, Number(((currentCrop.zoom ?? 1) - 0.1).toFixed(2))) });
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      } else if (
        ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && e.shiftKey) ||
        ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y')
      ) {
        e.preventDefault();
        handleRedo();
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentCrop]);

  // Pointer / touch handling for crosshair
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDraggingCrosshair(true);
    handlePointerMove(e);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingCrosshair && e.buttons !== 1) return;
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, Math.round(((e.clientX - rect.left) / rect.width) * 100)));
    const y = Math.max(0, Math.min(100, Math.round(((e.clientY - rect.top) / rect.height) * 100)));

    updateCrop({ focalX: x, focalY: y }, false);
  };

  const handlePointerUp = () => {
    if (isDraggingCrosshair) {
      setIsDraggingCrosshair(false);
      // Save history after drag completes
      setHistory((prev) => [...prev.slice(0, historyIdx + 1), currentCrop]);
      setHistoryIdx((prev) => prev + 1);
    }
  };

  // --- Touch: pinch to zoom (two fingers) ---------------------------------
  const pinchRef = useRef<{ distance: number; zoom: number } | null>(null);

  const onTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      pinchRef.current = {
        distance: Math.hypot(dx, dy),
        zoom: currentCrop.zoom ?? 1,
      };
    }
  };

  const onTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2 && pinchRef.current) {
      e.preventDefault();
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const distance = Math.hypot(dx, dy);
      const ratio = distance / Math.max(1, pinchRef.current.distance);
      const next = Math.min(4, Math.max(1, Number((pinchRef.current.zoom * ratio).toFixed(2))));
      updateCrop({ zoom: next }, false);
    }
  };

  const onTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length < 2 && pinchRef.current) {
      pinchRef.current = null;
      setHistory((prev) => [...prev.slice(0, historyIdx + 1), currentCrop]);
      setHistoryIdx((prev) => prev + 1);
    }
  };

  const handleSave = () => {
    const finalFraming: ImageFramingParams = {
      focalX: mainCrop.focalX ?? 50,
      focalY: mainCrop.focalY ?? 50,
      zoom: mainCrop.zoom ?? 1.0,
      rotation: mainCrop.rotation ?? 0,
      flipH: mainCrop.flipH ?? false,
      flipV: mainCrop.flipV ?? false,
      aspectRatio: mainCrop.aspectRatio ?? '3:4',
      overrides: sameForAll ? undefined : overrides,
    };
    onApply(finalFraming);
    onClose();
  };

  // Export cropped copy to WebP via canvas
  const handleExportCopy = async () => {
    setIsExporting(true);
    setExportNotice('Rendering and compressing edited crop...');

    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = () => reject(new Error('Failed to load image for canvas export'));
        img.src = imageUrl;
      });

      const canvas = document.createElement('canvas');
      const [rw, rh] = aspectRatios[currentCrop.aspectRatio || '3:4'] || [3, 4];
      const targetW = rh >= rw ? 1600 : 2400;
      const targetH = Math.round((targetW * rh) / rw);
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext('2d');

      if (!ctx) throw new Error('Canvas 2D context unavailable');

      ctx.save();
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // Center
      ctx.translate(targetW / 2, targetH / 2);

      // Rotation & flips
      ctx.rotate(((currentCrop.rotation ?? 0) * Math.PI) / 180);
      ctx.scale(currentCrop.flipH ? -1 : 1, currentCrop.flipV ? -1 : 1);

      // Zoom & focal offset
      const zoom = currentCrop.zoom ?? 1;
      const focalOffsetX = ((currentCrop.focalX ?? 50) - 50) / 100;
      const focalOffsetY = ((currentCrop.focalY ?? 50) - 50) / 100;

      const drawW = targetW * zoom;
      const drawH = targetH * zoom;
      const drawX = -drawW / 2 - focalOffsetX * drawW * 0.5;
      const drawY = -drawH / 2 - focalOffsetY * drawH * 0.5;

      ctx.drawImage(img, drawX, drawY, drawW, drawH);
      ctx.restore();

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Canvas export failed'))), 'image/webp', 0.9);
      });

      const file = new File([blob], `edited-crop-${Date.now()}.webp`, { type: 'image/webp' });
      const asset = await uploadMediaAsset(file, { alt: 'Custom edited crop' });

      setExportNotice('Exported and saved to media library!');
      if (onExportCopy) onExportCopy(asset);
      setTimeout(() => setExportNotice(null), 3000);
    } catch (err: any) {
      console.error('Canvas export error:', err);
      setExportNotice(`Export failed: ${err.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  if (!isOpen) return null;

  // Warning check
  const isTooSmallForHero = (activePlacement === 'heroDesktop' || activePlacement === 'all') && naturalWidth > 0 && naturalWidth < 1920;

  return (
    <div className="fixed inset-0 z-[120] bg-white text-black p-6 flex flex-col overflow-y-auto select-none">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-4 pb-6 shrink-0">
        <div>
          <span className="text-small text-black/40 block mb-1">Image Framing</span>
          <h2 className="text-title">{title}</h2>
        </div>

        <div className="flex flex-wrap items-center gap-6 text-small">
          <button
            type="button"
            onClick={handleUndo}
            disabled={historyIdx <= 0}
            className="hover:underline cursor-pointer disabled:opacity-20"
          >
            Undo
          </button>
          <button
            type="button"
            onClick={handleRedo}
            disabled={historyIdx >= history.length - 1}
            className="hover:underline cursor-pointer disabled:opacity-20"
          >
            Redo
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="hover:underline cursor-pointer text-black/60"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={handleExportCopy}
            disabled={isExporting}
            className="hover:underline cursor-pointer text-black/60 disabled:opacity-40"
          >
            {isExporting ? 'Exporting...' : 'Export Copy'}
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="hover:underline cursor-pointer font-bold"
          >
            Apply Framing →
          </button>
          <button
            type="button"
            onClick={onClose}
            className="hover:underline cursor-pointer text-black/50"
          >
            Close
          </button>
        </div>
      </div>

      {/* Warning banner if image is too small */}
      {isTooSmallForHero && (
        <div className="pb-4 text-small text-black/60">
          Source width ({naturalWidth}px) is below recommended 1920px for desktop hero.
        </div>
      )}

      {/* Placement tabs & "Same for all" */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-6 text-small">
        <div className="flex flex-wrap items-center gap-4">
          <span className="text-black/40">Placement:</span>
          {[
            { id: 'all', label: 'Universal' },
            { id: 'card', label: 'Card' },
            { id: 'archive', label: 'Archive' },
            { id: 'productPage', label: 'Product Detail' },
            { id: 'heroDesktop', label: 'Hero Desktop' },
            { id: 'heroMobile', label: 'Hero Mobile' },
            { id: 'og', label: 'Open Graph' },
          ].map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setActivePlacement(p.id as PlacementKey)}
              className={`cursor-pointer ${ activePlacement === p.id ?'underline font-bold text-black' : 'text-black/50 hover:text-black'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setSameForAll(!sameForAll)}
          className="cursor-pointer text-black/70"
        >
          Same for all: <span className="underline">{sameForAll ? 'On' : 'Off'}</span>
        </button>
      </div>

      {/* Main Workspace (Editor + Live Placements) */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-12 min-h-0">
        <div className="lg:col-span-7 flex flex-col items-center">
          <div className="w-full max-w-lg flex flex-col items-center space-y-4">
            <div className="flex items-center justify-between w-full text-small text-black/40">
              <span>Calibrate focal point</span>
              <span>{currentCrop.focalX}% X · {currentCrop.focalY}% Y</span>
            </div>

              {/* Main Interactive Stage */}
              <div
                ref={containerRef}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onTouchStart={onTouchStart}
                onTouchMove={onTouchMove}
                onTouchEnd={onTouchEnd}
                className={`relative w-full max-h-[50vh] bg-white overflow-hidden cursor-crosshair select-none touch-none ${ aspectClasses[currentCrop.aspectRatio ||'3:4'] || 'aspect-[3/4]'
                }`}
              >
                <img
                  src={imageUrl || NEUTRAL_PLACEHOLDER_IMG}
                  alt="Subject calibration"
                  className="w-full h-full object-cover pointer-events-none transition-transform duration-75"
                  style={{
                    objectPosition: `${currentCrop.focalX}% ${currentCrop.focalY}%`,
                    transform: `${currentCrop.flipH ? 'scaleX(-1) ' : ''}${currentCrop.flipV ? 'scaleY(-1) ' : ''}scale(${currentCrop.zoom || 1}) rotate(${currentCrop.rotation || 0}deg)`,
                  }}
                />

                {/* Minimal Text Crosshair Marker */}
                <div
                  className="absolute pointer-events-none -translate-x-1/2 -translate-y-1/2 text-small text-black font-bold"
                  style={{
                    left: `${currentCrop.focalX}%`,
                    top: `${currentCrop.focalY}%`,
                  }}
                >
                  +
                </div>
              </div>

              {/* Controls Strip Below Image */}
              <div className="w-full space-y-4 pt-2">
                <div className="flex flex-wrap items-center justify-between gap-6 text-small">
                  {/* Zoom Stepper */}
                  <div className="flex items-center gap-3">
                    <span className="text-black/50">Zoom</span>
                    <button
                      type="button"
                      onClick={() => updateCrop({ zoom: Math.max(1, Number(((currentCrop.zoom || 1) - 0.1).toFixed(2))) })}
                      className="text-body cursor-pointer hover:underline"
                    >
                      −
                    </button>
                    <span className="text-body font-normal">{currentCrop.zoom || 1}</span>
                    <button
                      type="button"
                      onClick={() => updateCrop({ zoom: Math.min(4, Number(((currentCrop.zoom || 1) + 0.1).toFixed(2))) })}
                      className="text-body cursor-pointer hover:underline"
                    >
                      +
                    </button>
                  </div>

                  {/* Rotation Stepper */}
                  <div className="flex items-center gap-3">
                    <span className="text-black/50">Rotate</span>
                    <button
                      type="button"
                      onClick={() => updateCrop({ rotation: (currentCrop.rotation || 0) - 15 })}
                      className="text-body cursor-pointer hover:underline"
                    >
                      −
                    </button>
                    <span className="text-body font-normal">{currentCrop.rotation || 0}°</span>
                    <button
                      type="button"
                      onClick={() => updateCrop({ rotation: (currentCrop.rotation || 0) + 15 })}
                      className="text-body cursor-pointer hover:underline"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Flip & Aspect Ratio Text Choices */}
                <div className="flex flex-wrap items-center justify-between gap-6 text-small pt-2">
                  <div className="flex items-center gap-4">
                    <span className="text-black/50">Flip:</span>
                    <button
                      type="button"
                      onClick={() => updateCrop({ flipH: !currentCrop.flipH })}
                      className="cursor-pointer hover:underline"
                    >
                      H {currentCrop.flipH ? <span className="underline font-bold">On</span> : <span>Off</span>}
                    </button>
                    <button
                      type="button"
                      onClick={() => updateCrop({ flipV: !currentCrop.flipV })}
                      className="cursor-pointer hover:underline"
                    >
                      V {currentCrop.flipV ? <span className="underline font-bold">On</span> : <span>Off</span>}
                    </button>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-black/50">Ratio:</span>
                    {["3:4", "4:5", "1:1", "16:9", "9:16"].map((ratio) => (
                      <button
                        key={ratio}
                        type="button"
                        onClick={() => updateCrop({ aspectRatio: ratio })}
                        className={`cursor-pointer ${ currentCrop.aspectRatio === ratio ?"underline font-bold text-black"
                            : "text-black/40 hover:text-black"
                        }`}
                      >
                        {ratio}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: Live Previews Across Real Storefront Placements (5 cols) */}
        <div className="lg:col-span-5 space-y-8 overflow-y-auto">
          <div>
            <h3 className="text-title font-normal mb-1">Live Placements</h3>
            <span className="text-small text-black/40 block">Updates live as you calibrate</span>
          </div>

          <div className="space-y-6">
            <PlacementPreview
              label="Product Card"
              meta="3:4"
              ratioClass="aspect-[3/4]"
              boxClass="w-36"
              crop={cropFor("card")}
              imageUrl={imageUrl}
            />

            <PlacementPreview
              label="Archive Plate"
              meta="4:5"
              ratioClass="aspect-[4/5]"
              boxClass="w-40"
              crop={cropFor("archive")}
              imageUrl={imageUrl}
            />

            <PlacementPreview
              label="Product Detail"
              meta="1:1"
              ratioClass="aspect-square"
              boxClass="w-36"
              crop={cropFor("productPage")}
              imageUrl={imageUrl}
            />

            {/* Home Hero */}
            <div className="space-y-2">
              <div className="flex justify-between text-small text-black/40">
                <span>Hero Desktop & Mobile</span>
                <span>16:9 / 9:16</span>
              </div>
              <div className="grid grid-cols-2 gap-4 items-end">
                <div>
                  <span className="text-small text-black/40 block mb-1">Desktop</span>
                  <div className="w-full aspect-[16/9] overflow-hidden bg-white">
                    <img
                      src={imageUrl || NEUTRAL_PLACEHOLDER_IMG}
                      alt="Hero desktop preview"
                      className="w-full h-full object-cover"
                      style={styleFor(cropFor("heroDesktop"))}
                    />
                  </div>
                </div>

                <div>
                  <span className="text-small text-black/40 block mb-1">Mobile</span>
                  <div className="w-20 aspect-[9/16] overflow-hidden bg-white">
                    <img
                      src={imageUrl || NEUTRAL_PLACEHOLDER_IMG}
                      alt="Hero mobile preview"
                      className="w-full h-full object-cover"
                      style={styleFor(cropFor("heroMobile"))}
                    />
                  </div>
                </div>
              </div>
            </div>

            <PlacementPreview
              label="Open Graph"
              meta="1.91:1"
              ratioClass="aspect-[1.91/1]"
              boxClass="w-56"
              crop={cropFor("og")}
              imageUrl={imageUrl}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

/** One live storefront placement preview (updates while the owner adjusts). */
const PlacementPreview: React.FC<{
  label: string;
  meta: string;
  ratioClass: string;
  boxClass: string;
  crop: ImagePlacementCrop;
  imageUrl: string;
}> = ({ label, meta, ratioClass, boxClass, crop, imageUrl }) => (
  <div className="space-y-1">
    <div className="flex justify-between text-small text-black/40">
      <span>{label}</span>
      <span>{meta}</span>
    </div>
    <div className={`${boxClass} ${ratioClass} overflow-hidden bg-white`}>
      <img
        src={imageUrl || NEUTRAL_PLACEHOLDER_IMG}
        alt={`${label} preview`}
        className="w-full h-full object-cover"
        style={{
          objectPosition: `${crop.focalX ?? 50}% ${crop.focalY ?? 50}%`,
          transform: `${crop.flipH ? "scaleX(-1) " : ""}${crop.flipV ? "scaleY(-1) " : ""}scale(${
            crop.zoom || 1
          }) rotate(${crop.rotation || 0}deg)`,
          transformOrigin: `${crop.focalX ?? 50}% ${crop.focalY ?? 50}%`,
        }}
      />
    </div>
  </div>
);
