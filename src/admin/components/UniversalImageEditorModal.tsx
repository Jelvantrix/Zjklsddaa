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
      const targetW = 1600;
      const targetH = Math.round(targetW * (4 / 3)); // 3:4 aspect
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
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-2 sm:p-4 bg-black/70 backdrop-blur-xs select-none">
      <div className="bg-white border border-black/20 w-full max-w-6xl max-h-[95vh] flex flex-col shadow-2xl font-sans overflow-hidden">
        {/* Top Header */}
        <div className="p-4 sm:px-6 border-b border-black/10 flex items-center justify-between shrink-0 bg-white">
          <div className="flex items-center gap-3">
            <Compass className="w-4 h-4 text-black" />
            <div>
              <h2 className="text-xs uppercase tracking-[0.2em] font-medium text-black">
                {title}
              </h2>
              <p className="text-[10px] text-black/50 font-mono">
                Non-destructive framing, focal point, and placement calibration
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Undo / Redo */}
            <div className="flex items-center border border-black/15">
              <button
                type="button"
                onClick={handleUndo}
                disabled={historyIdx <= 0}
                className="p-1.5 text-black hover:bg-neutral-100 disabled:opacity-20 cursor-pointer"
                title="Undo (Ctrl+Z)"
              >
                <Undo2 className="w-3.5 h-3.5" />
              </button>
              <div className="w-[1px] h-3.5 bg-black/10" />
              <button
                type="button"
                onClick={handleRedo}
                disabled={historyIdx >= history.length - 1}
                className="p-1.5 text-black hover:bg-neutral-100 disabled:opacity-20 cursor-pointer"
                title="Redo"
              >
                <Redo2 className="w-3.5 h-3.5" />
              </button>
            </div>

            <button
              type="button"
              onClick={handleReset}
              className="px-2.5 py-1 text-[10px] uppercase font-mono tracking-wider border border-black/20 hover:border-black cursor-pointer"
            >
              Reset
            </button>

            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-1.5 text-[10.5px] uppercase font-mono tracking-widest bg-black text-white hover:bg-neutral-800 flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Apply Framing</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-black/50 hover:text-black cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Warning banner if image is too small */}
        {isTooSmallForHero && (
          <div className="bg-neutral-100 border-b border-black/10 px-6 py-2 flex items-center gap-2 text-[11px] text-neutral-800 font-mono">
            <AlertTriangle className="w-3.5 h-3.5 text-black shrink-0" />
            <span>
              Notice: Source image width ({naturalWidth}px) is below recommended 1920px for high-density desktop hero displays.
            </span>
          </div>
        )}

        {/* Placement tabs & "Same for all" */}
        <div className="px-6 py-2.5 border-b border-black/10 flex flex-wrap items-center justify-between gap-3 bg-neutral-50/60 shrink-0 text-xs font-mono">
          <div className="flex items-center gap-1 overflow-x-auto">
            <span className="text-[10px] uppercase tracking-wider text-black/40 mr-2">Placement:</span>
            {[
              { id: 'all', label: 'Default / Universal' },
              { id: 'card', label: 'Product Card' },
              { id: 'archive', label: 'Archive Plate' },
              { id: 'productPage', label: 'Product Detail' },
              { id: 'heroDesktop', label: 'Hero (Desktop)' },
              { id: 'heroMobile', label: 'Hero (Mobile)' },
              { id: 'og', label: 'Open Graph' },
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setActivePlacement(p.id as PlacementKey)}
                className={`px-2.5 py-1 text-[10px] uppercase tracking-wider transition-colors cursor-pointer ${
                  activePlacement === p.id
                    ? 'bg-black text-white'
                    : 'bg-white text-black/70 hover:text-black border border-black/10'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <label className="flex items-center gap-2 text-[11px] cursor-pointer">
            <input
              type="checkbox"
              checked={sameForAll}
              onChange={(e) => setSameForAll(e.target.checked)}
              className="w-3.5 h-3.5 accent-black rounded-none cursor-pointer"
            />
            <span className="text-black/70 uppercase tracking-wider text-[10px]">Same for all placements</span>
          </label>
        </div>

        {/* Main Workspace (Editor + Live Placements) */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-y-auto divide-y lg:divide-y-0 lg:divide-x divide-black/10 min-h-0">
          {/* LEFT: Interactive Framing Canvas & Crosshair (7 cols) */}
          <div className="lg:col-span-7 p-4 sm:p-6 flex flex-col items-center justify-center bg-neutral-100/50">
            <div className="w-full max-w-lg flex flex-col items-center">
              <div className="flex items-center justify-between w-full mb-2 text-[10px] font-mono text-black/50">
                <span>CLICK OR DRAG CROSSHAIR TO CALIBRATE FOCAL POINT</span>
                <span>{currentCrop.focalX}% X · {currentCrop.focalY}% Y</span>
              </div>

              {/* Main Interactive Stage */}
              <div
                ref={containerRef}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                className="relative w-full aspect-[3/4] max-h-[50vh] bg-white border border-black/20 overflow-hidden cursor-crosshair shadow-sm select-none touch-none"
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

                {/* Thirds Rule Grid Overlay */}
                <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3 border border-black/10">
                  <div className="border-r border-b border-black/10" />
                  <div className="border-r border-b border-black/10" />
                  <div className="border-b border-black/10" />
                  <div className="border-r border-b border-black/10" />
                  <div className="border-r border-b border-black/10" />
                  <div className="border-b border-black/10" />
                  <div className="border-r border-black/10" />
                  <div className="border-r border-black/10" />
                  <div />
                </div>

                {/* Crosshair Target */}
                <div
                  className="absolute pointer-events-none -translate-x-1/2 -translate-y-1/2 flex items-center justify-center transition-all duration-75"
                  style={{
                    left: `${currentCrop.focalX}%`,
                    top: `${currentCrop.focalY}%`,
                  }}
                >
                  <div className="w-7 h-7 rounded-full border-2 border-white shadow-[0_0_8px_rgba(0,0,0,0.8)] flex items-center justify-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-white shadow-xs" />
                  </div>
                  <div className="absolute w-10 h-[1px] bg-white/70" />
                  <div className="absolute h-10 w-[1px] bg-white/70" />
                </div>
              </div>

              {/* Controls Strip Below Image */}
              <div className="w-full mt-4 space-y-3 font-mono text-xs">
                {/* Zoom & Straighten Sliders */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <div className="flex justify-between text-[10px] uppercase text-black/60 mb-1">
                      <span>Zoom ({currentCrop.zoom || 1}x)</span>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => updateCrop({ zoom: Math.max(1, Number(((currentCrop.zoom || 1) - 0.1).toFixed(2))) })}
                          className="px-1 border border-black/15 hover:border-black cursor-pointer"
                        >
                          -
                        </button>
                        <button
                          type="button"
                          onClick={() => updateCrop({ zoom: Math.min(4, Number(((currentCrop.zoom || 1) + 0.1).toFixed(2))) })}
                          className="px-1 border border-black/15 hover:border-black cursor-pointer"
                        >
                          +
                        </button>
                      </div>
                    </div>
                    <input
                      type="range"
                      min="1.0"
                      max="4.0"
                      step="0.05"
                      value={currentCrop.zoom || 1}
                      onChange={(e) => updateCrop({ zoom: parseFloat(e.target.value) })}
                      className="w-full accent-black cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-[10px] uppercase text-black/60 mb-1">
                      <span>Rotation ({currentCrop.rotation || 0}°)</span>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => updateCrop({ rotation: ((currentCrop.rotation || 0) - 90) % 360 })}
                          className="px-1 border border-black/15 hover:border-black cursor-pointer"
                          title="Rotate -90°"
                        >
                          -90°
                        </button>
                        <button
                          type="button"
                          onClick={() => updateCrop({ rotation: ((currentCrop.rotation || 0) + 90) % 360 })}
                          className="px-1 border border-black/15 hover:border-black cursor-pointer"
                          title="Rotate +90°"
                        >
                          +90°
                        </button>
                      </div>
                    </div>
                    <input
                      type="range"
                      min="-45"
                      max="45"
                      step="1"
                      value={currentCrop.rotation || 0}
                      onChange={(e) => updateCrop({ rotation: parseInt(e.target.value, 10) })}
                      className="w-full accent-black cursor-pointer"
                    />
                  </div>
                </div>

                {/* Flip & Aspect Ratio Buttons */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-black/10">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-black/50 uppercase mr-1">Flip:</span>
                    <button
                      type="button"
                      onClick={() => updateCrop({ flipH: !currentCrop.flipH })}
                      className={`p-1.5 border text-[10px] flex items-center gap-1 cursor-pointer ${
                        currentCrop.flipH ? 'bg-black text-white border-black' : 'border-black/20 hover:border-black bg-white'
                      }`}
                      title="Flip Horizontal"
                    >
                      <FlipHorizontal className="w-3.5 h-3.5" />
                      <span>H</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => updateCrop({ flipV: !currentCrop.flipV })}
                      className={`p-1.5 border text-[10px] flex items-center gap-1 cursor-pointer ${
                        currentCrop.flipV ? 'bg-black text-white border-black' : 'border-black/20 hover:border-black bg-white'
                      }`}
                      title="Flip Vertical"
                    >
                      <FlipVertical className="w-3.5 h-3.5" />
                      <span>V</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-black/50 uppercase mr-1">Ratio:</span>
                    {['3:4', '4:5', '1:1', '16:9', '9:16'].map((ratio) => (
                      <button
                        key={ratio}
                        type="button"
                        onClick={() => updateCrop({ aspectRatio: ratio })}
                        className={`px-2 py-1 text-[10px] border cursor-pointer ${
                          currentCrop.aspectRatio === ratio
                            ? 'bg-black text-white border-black'
                            : 'border-black/15 bg-white text-black/70 hover:border-black'
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
          <div className="lg:col-span-5 p-4 sm:p-6 flex flex-col bg-white overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xs uppercase tracking-wider font-medium text-black">
                  Live Storefront Placements
                </h3>
                <p className="text-[10px] text-black/50 font-mono">
                  Updates continuously as you calibrate
                </p>
              </div>

              {/* Export Edited WebP */}
              <button
                type="button"
                onClick={handleExportCopy}
                disabled={isExporting}
                className="px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider border border-black/20 hover:border-black flex items-center gap-1 cursor-pointer disabled:opacity-50"
                title="Renders crop to a new WebP asset"
              >
                <Download className="w-3 h-3" />
                <span>{isExporting ? 'Exporting...' : 'Export Copy'}</span>
              </button>
            </div>

            {exportNotice && (
              <div className="mb-4 p-2 text-[10px] font-mono bg-neutral-50 border border-black/10 text-black">
                {exportNotice}
              </div>
            )}

            <div className="space-y-6">
              {/* Placement 1: Product Card (3:4) */}
              <div className="border border-black/10 p-3">
                <div className="flex justify-between text-[10px] font-mono text-black/50 mb-2 uppercase">
                  <span>Product Card (Grid & Catalog)</span>
                  <span>3:4</span>
                </div>
                <div className="w-36 aspect-[3/4] bg-neutral-100 overflow-hidden border border-black/10">
                  <img
                    src={imageUrl || NEUTRAL_PLACEHOLDER_IMG}
                    alt="Card preview"
                    className="w-full h-full object-cover"
                    style={{
                      objectPosition: `${currentCrop.focalX}% ${currentCrop.focalY}%`,
                      transform: `${currentCrop.flipH ? 'scaleX(-1) ' : ''}${currentCrop.flipV ? 'scaleY(-1) ' : ''}scale(${currentCrop.zoom || 1}) rotate(${currentCrop.rotation || 0}deg)`,
                    }}
                  />
                </div>
              </div>

              {/* Placement 2: Listing / Archive Plate (4:5) */}
              <div className="border border-black/10 p-3">
                <div className="flex justify-between text-[10px] font-mono text-black/50 mb-2 uppercase">
                  <span>Archive Editorial Plate</span>
                  <span>4:5</span>
                </div>
                <div className="w-40 aspect-[4/5] bg-neutral-100 overflow-hidden border border-black/10">
                  <img
                    src={imageUrl || NEUTRAL_PLACEHOLDER_IMG}
                    alt="Archive preview"
                    className="w-full h-full object-cover"
                    style={{
                      objectPosition: `${currentCrop.focalX}% ${currentCrop.focalY}%`,
                      transform: `${currentCrop.flipH ? 'scaleX(-1) ' : ''}${currentCrop.flipV ? 'scaleY(-1) ' : ''}scale(${currentCrop.zoom || 1}) rotate(${currentCrop.rotation || 0}deg)`,
                    }}
                  />
                </div>
              </div>

              {/* Placement 3: Home Hero (Desktop 16:9 & Mobile 9:16) */}
              <div className="border border-black/10 p-3">
                <div className="flex justify-between text-[10px] font-mono text-black/50 mb-2 uppercase">
                  <span>Home Hero Section</span>
                  <span>Desktop & Mobile</span>
                </div>
                <div className="grid grid-cols-2 gap-3 items-end">
                  <div>
                    <div className="text-[9px] font-mono text-black/40 mb-1">DESKTOP (16:9)</div>
                    <div className="w-full aspect-[16/9] bg-neutral-100 overflow-hidden border border-black/10">
                      <img
                        src={imageUrl || NEUTRAL_PLACEHOLDER_IMG}
                        alt="Hero desktop preview"
                        className="w-full h-full object-cover"
                        style={{
                          objectPosition: `${currentCrop.focalX}% ${currentCrop.focalY}%`,
                          transform: `${currentCrop.flipH ? 'scaleX(-1) ' : ''}${currentCrop.flipV ? 'scaleY(-1) ' : ''}scale(${currentCrop.zoom || 1}) rotate(${currentCrop.rotation || 0}deg)`,
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="text-[9px] font-mono text-black/40 mb-1">MOBILE (9:16)</div>
                    <div className="w-20 aspect-[9/16] bg-neutral-100 overflow-hidden border border-black/10">
                      <img
                        src={imageUrl || NEUTRAL_PLACEHOLDER_IMG}
                        alt="Hero mobile preview"
                        className="w-full h-full object-cover"
                        style={{
                          objectPosition: `${currentCrop.focalX}% ${currentCrop.focalY}%`,
                          transform: `${currentCrop.flipH ? 'scaleX(-1) ' : ''}${currentCrop.flipV ? 'scaleY(-1) ' : ''}scale(${currentCrop.zoom || 1}) rotate(${currentCrop.rotation || 0}deg)`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Placement 4: Share / Open Graph Crop */}
              <div className="border border-black/10 p-3">
                <div className="flex justify-between text-[10px] font-mono text-black/50 mb-2 uppercase">
                  <span>Social Share / Open Graph</span>
                  <span>1.91:1</span>
                </div>
                <div className="w-56 aspect-[1.91/1] bg-neutral-100 overflow-hidden border border-black/10">
                  <img
                    src={imageUrl || NEUTRAL_PLACEHOLDER_IMG}
                    alt="Social preview"
                    className="w-full h-full object-cover"
                    style={{
                      objectPosition: `${currentCrop.focalX}% ${currentCrop.focalY}%`,
                      transform: `${currentCrop.flipH ? 'scaleX(-1) ' : ''}${currentCrop.flipV ? 'scaleY(-1) ' : ''}scale(${currentCrop.zoom || 1}) rotate(${currentCrop.rotation || 0}deg)`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
