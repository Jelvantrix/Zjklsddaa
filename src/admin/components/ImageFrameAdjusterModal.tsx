import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Check,
  RotateCcw,
  RotateCw,
  Maximize2,
  Trash2,
  Upload,
  Sparkles,
  Compass,
  ZoomIn,
  Move,
  Layers,
  Crop,
  Eye,
} from 'lucide-react';

export interface FrameAdjusterResult {
  focalX: number;
  focalY: number;
  scale: number;
  rotation: number;
  aspectRatio: string;
  position: string;
  flipped?: boolean;
}

interface ImageFrameAdjusterModalProps {
  isOpen: boolean;
  imageUrl: string;
  title?: string;
  initialFocalX?: number;
  initialFocalY?: number;
  initialScale?: number;
  initialRotation?: number;
  initialAspectRatio?: string;
  initialFlipped?: boolean;
  onClose: () => void;
  onApply: (result: FrameAdjusterResult) => void;
  onUploadFile?: (dataUrl: string) => void;
  onDeleteImage?: () => void;
}

export const ImageFrameAdjusterModal: React.FC<ImageFrameAdjusterModalProps> = ({
  isOpen,
  imageUrl,
  title = 'Adjust Picture to Best Frame & Angle',
  initialFocalX = 50,
  initialFocalY = 25,
  initialScale = 1.05,
  initialRotation = 0,
  initialAspectRatio = '3/4',
  initialFlipped = false,
  onClose,
  onApply,
  onUploadFile,
  onDeleteImage,
}) => {
  const [focalX, setFocalX] = useState(initialFocalX);
  const [focalY, setFocalY] = useState(initialFocalY);
  const [scale, setScale] = useState(initialScale);
  const [rotation, setRotation] = useState(initialRotation);
  const [aspectRatio, setAspectRatio] = useState(initialAspectRatio);
  const [flipped, setFlipped] = useState(initialFlipped);
  const [currentUrl, setCurrentUrl] = useState(imageUrl);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const previewCanvasRef = useRef<HTMLDivElement | null>(null);

  // Sync with prop changes when modal opens
  useEffect(() => {
    if (isOpen) {
      setFocalX(initialFocalX ?? 50);
      setFocalY(initialFocalY ?? 25);
      setScale(initialScale ?? 1.05);
      setRotation(initialRotation ?? 0);
      setAspectRatio(initialAspectRatio ?? '3/4');
      setFlipped(initialFlipped ?? false);
      setCurrentUrl(imageUrl);
    }
  }, [isOpen, imageUrl, initialFocalX, initialFocalY, initialScale, initialRotation, initialAspectRatio, initialFlipped]);

  if (!isOpen) return null;

  // Handle click on the interactive anchor box
  const handleAnchorClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, Math.round(((e.clientX - rect.left) / rect.width) * 100)));
    const y = Math.max(0, Math.min(100, Math.round(((e.clientY - rect.top) / rect.height) * 100)));
    setFocalX(x);
    setFocalY(y);
  };

  // Device file upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        setCurrentUrl(dataUrl);
        if (onUploadFile) {
          onUploadFile(dataUrl);
        }
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Reset to neutral balanced frame
  const handleReset = () => {
    setFocalX(50);
    setFocalY(25);
    setScale(1.0);
    setRotation(0);
    setFlipped(false);
  };

  // Quick framing presets
  const applyPreset = (presetX: number, presetY: number, presetScale: number, presetRot = 0) => {
    setFocalX(presetX);
    setFocalY(presetY);
    setScale(presetScale);
    setRotation(presetRot);
  };

  const handleSave = () => {
    onApply({
      focalX,
      focalY,
      scale,
      rotation,
      aspectRatio,
      position: `${focalX}% ${focalY}%`,
      flipped,
    });
    onClose();
  };

  const aspectClass =
    aspectRatio === '3/4'
      ? 'aspect-[3/4]'
      : aspectRatio === '4/5'
      ? 'aspect-[4/5]'
      : aspectRatio === '1/1'
      ? 'aspect-square'
      : aspectRatio === '16/9'
      ? 'aspect-[16/9]'
      : 'aspect-[3/4]';

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-6 bg-neutral-950/70 backdrop-blur-sm select-none font-mono animate-fadeIn">
      <div className="bg-white border border-black/20 w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Top Header */}
        <div className="px-5 py-4 border-b border-black/10 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full border border-black/20 flex items-center justify-center bg-black/5">
              <Compass className="w-4 h-4 text-black" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-black">
                {title}
              </h3>
              <p className="text-[10px] text-black/50 font-sans">
                Position focal center, fine-tune angle/rotation, and frame scale for storefront perfection.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-black/40 hover:text-black hover:bg-black/5 transition-colors cursor-pointer"
              title="Close without saving"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Toolbar: Upload from device, Delete, Reset */}
        <div className="px-5 py-2.5 bg-neutral-50 border-b border-black/10 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1.5 text-[11px] uppercase tracking-wider font-mono font-medium bg-black text-white hover:bg-neutral-800 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload from Device</span>
            </button>

            {onDeleteImage && (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm('Delete this image from garment / slide?')) {
                    onDeleteImage();
                    onClose();
                  }
                }}
                className="px-3 py-1.5 text-[11px] uppercase tracking-wider font-mono border border-red-300 text-red-600 hover:bg-red-50 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Image</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleReset}
              className="px-2.5 py-1 text-[10px] uppercase font-mono border border-black/15 bg-white hover:border-black text-black/70 hover:text-black cursor-pointer"
            >
              Reset 0° & Center
            </button>
          </div>
        </div>

        {/* Main Body: Interactive Canvas Frame + Adjustment Controls */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-12 divide-y md:divide-y-0 md:divide-x divide-black/10">
          {/* Left Canvas (7 cols): Interactive focal viewport */}
          <div className="md:col-span-7 p-5 flex flex-col items-center justify-center bg-neutral-100/60 relative">
            <div className="w-full flex items-center justify-between mb-2">
              <span className="text-[10px] uppercase tracking-wider text-black/60 font-semibold flex items-center gap-1">
                <Crop className="w-3 h-3 text-black" />
                <span>Interactive Target Canvas</span>
              </span>
              <span className="text-[10px] font-mono text-black/50">
                Click anywhere to reposition focal anchor
              </span>
            </div>

            {/* Target Canvas Container */}
            <div
              ref={previewCanvasRef}
              onClick={handleAnchorClick}
              className={`relative w-full max-w-[340px] ${aspectClass} border-2 border-black/40 overflow-hidden bg-white shadow-lg cursor-crosshair group select-none`}
            >
              <img
                src={currentUrl}
                alt="Frame focal preview"
                style={{
                  objectPosition: `${focalX}% ${focalY}%`,
                  transform: `${flipped ? 'scaleX(-1)' : ''} scale(${scale}) rotate(${rotation}deg)`,
                }}
                className="w-full h-full object-cover pointer-events-none transition-transform duration-75 ease-out"
              />

              {/* Composition Grid Lines (Rule of Thirds) */}
              <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3 border border-black/10 opacity-30 group-hover:opacity-60 transition-opacity">
                <div className="border-r border-b border-black/20" />
                <div className="border-r border-b border-black/20" />
                <div className="border-b border-black/20" />
                <div className="border-r border-b border-black/20" />
                <div className="border-r border-b border-black/20" />
                <div className="border-b border-black/20" />
                <div className="border-r border-black/20" />
                <div className="border-r border-black/20" />
                <div />
              </div>

              {/* Target Crosshair Anchor */}
              <div
                style={{ left: `${focalX}%`, top: `${focalY}%` }}
                className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none z-10 transition-all duration-75"
              >
                <div className="w-8 h-8 rounded-full border-2 border-white bg-black/40 flex items-center justify-center backdrop-blur-xs shadow-md">
                  <div className="w-2 h-2 bg-white rounded-full ring-2 ring-black" />
                </div>
                <div className="absolute top-9 left-1/2 -translate-x-1/2 bg-black text-white text-[9px] px-2 py-0.5 whitespace-nowrap shadow-md rounded-xs">
                  X:{focalX}% Y:{focalY}%
                </div>
              </div>
            </div>

            {/* Micro instructions */}
            <div className="mt-3 text-[10px] text-center text-black/50 font-sans">
              Frame ratio: <strong className="text-black">{aspectRatio}</strong> · Scale: <strong className="text-black">{scale.toFixed(2)}x</strong> · Angle: <strong className="text-black">{rotation}°</strong>
            </div>
          </div>

          {/* Right Controls Panel (5 cols): Precision Sliders & Storefront Previews */}
          <div className="md:col-span-5 p-5 space-y-5 bg-white overflow-y-auto">
            {/* 1. Frame Aspect Ratio Selector */}
            <div>
              <label className="block text-[10.5px] uppercase tracking-wider text-black font-semibold mb-1.5">
                Target Frame Format:
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { id: '3/4', label: '3:4', desc: 'Archive' },
                  { id: '4/5', label: '4:5', desc: 'Editorial' },
                  { id: '1/1', label: '1:1', desc: 'Square' },
                  { id: '16/9', label: '16:9', desc: 'Banner' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setAspectRatio(item.id)}
                    className={`py-1.5 px-2 border text-center transition-colors cursor-pointer ${
                      aspectRatio === item.id
                        ? 'border-black bg-black text-white'
                        : 'border-black/15 bg-white hover:border-black/50 text-black'
                    }`}
                  >
                    <span className="block text-xs font-bold">{item.label}</span>
                    <span className="block text-[8px] opacity-70 uppercase">{item.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Angle & Rotation Control */}
            <div className="p-3 border border-black/10 bg-neutral-50/70 space-y-2.5">
              <div className="flex items-center justify-between text-[10.5px] uppercase tracking-wider text-black font-semibold">
                <span className="flex items-center gap-1">
                  <Compass className="w-3.5 h-3.5 text-black" />
                  <span>Angle / Rotation</span>
                </span>
                <span className="font-mono text-xs font-bold text-black">{rotation}°</span>
              </div>

              <input
                type="range"
                min={-180}
                max={180}
                step={1}
                value={rotation}
                onChange={(e) => setRotation(parseInt(e.target.value, 10))}
                className="w-full accent-black cursor-pointer"
              />

              <div className="flex items-center justify-between gap-1 pt-1">
                <button
                  type="button"
                  onClick={() => setRotation((prev) => Math.max(-180, prev - 90))}
                  className="px-2 py-1 text-[10px] border border-black/15 bg-white hover:border-black flex items-center gap-1 cursor-pointer"
                  title="Rotate 90 degrees counter-clockwise"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>-90°</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRotation(0)}
                  className="px-2 py-1 text-[10px] border border-black/15 bg-white hover:border-black cursor-pointer"
                >
                  Level 0°
                </button>
                <button
                  type="button"
                  onClick={() => setRotation((prev) => Math.min(180, prev + 90))}
                  className="px-2 py-1 text-[10px] border border-black/15 bg-white hover:border-black flex items-center gap-1 cursor-pointer"
                  title="Rotate 90 degrees clockwise"
                >
                  <RotateCw className="w-3 h-3" />
                  <span>+90°</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFlipped((prev) => !prev)}
                  className={`px-2 py-1 text-[10px] border cursor-pointer ${
                    flipped ? 'border-black bg-black text-white' : 'border-black/15 bg-white hover:border-black'
                  }`}
                  title="Flip horizontally (mirror reflection)"
                >
                  Flip
                </button>
              </div>
            </div>

            {/* 3. Zoom / Scale Control */}
            <div className="p-3 border border-black/10 bg-neutral-50/70 space-y-2.5">
              <div className="flex items-center justify-between text-[10.5px] uppercase tracking-wider text-black font-semibold">
                <span className="flex items-center gap-1">
                  <ZoomIn className="w-3.5 h-3.5 text-black" />
                  <span>Zoom / Scale</span>
                </span>
                <span className="font-mono text-xs font-bold text-black">{scale.toFixed(2)}x</span>
              </div>

              <input
                type="range"
                min={0.7}
                max={3.0}
                step={0.01}
                value={scale}
                onChange={(e) => setScale(parseFloat(e.target.value))}
                className="w-full accent-black cursor-pointer"
              />

              <div className="flex items-center justify-between gap-1 pt-0.5">
                {[1.0, 1.25, 1.5, 2.0].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setScale(s)}
                    className={`px-2 py-1 text-[10px] border cursor-pointer ${
                      Math.abs(scale - s) < 0.02
                        ? 'border-black bg-black text-white font-bold'
                        : 'border-black/15 bg-white hover:border-black'
                    }`}
                  >
                    {s}x
                  </button>
                ))}
              </div>
            </div>

            {/* 4. Fine Position Offsets (X & Y) */}
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-[10px] uppercase tracking-wider text-black/70 mb-1">
                  <span>Horizontal Alignment (X)</span>
                  <span className="font-bold">{focalX}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={focalX}
                  onChange={(e) => setFocalX(parseInt(e.target.value, 10))}
                  className="w-full accent-black cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-[10px] uppercase tracking-wider text-black/70 mb-1">
                  <span>Vertical Alignment (Y)</span>
                  <span className="font-bold">{focalY}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={focalY}
                  onChange={(e) => setFocalY(parseInt(e.target.value, 10))}
                  className="w-full accent-black cursor-pointer"
                />
              </div>
            </div>

            {/* 5. Framing Presets */}
            <div>
              <span className="block text-[10px] uppercase tracking-wider text-black/60 font-semibold mb-1.5">
                Quick Framing Presets:
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { label: 'Model Headroom', x: 50, y: 15, s: 1.1 },
                  { label: 'Torso & Silhouette', x: 50, y: 35, s: 1.15 },
                  { label: 'Full Center', x: 50, y: 50, s: 1.0 },
                  { label: 'Hemline / Lower', x: 50, y: 80, s: 1.2 },
                ].map((pr) => (
                  <button
                    key={pr.label}
                    type="button"
                    onClick={() => applyPreset(pr.x, pr.y, pr.s)}
                    className="p-1.5 text-left border border-black/15 bg-white hover:border-black text-[10px] cursor-pointer"
                  >
                    {pr.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 6. Live Storefront Previews */}
            <div>
              <span className="block text-[10px] uppercase tracking-wider text-black/60 font-semibold mb-2">
                Live Storefront Formats:
              </span>
              <div className="flex items-end gap-3 pt-1">
                {/* 3:4 Catalogue card */}
                <div>
                  <span className="text-[9px] text-black/50 block mb-1">3:4 Catalogue</span>
                  <div className="w-18 aspect-[3/4] border border-black/20 overflow-hidden bg-black/5 shadow-xs">
                    <img
                      src={currentUrl}
                      alt="Catalogue preview"
                      style={{
                        objectPosition: `${focalX}% ${focalY}%`,
                        transform: `${flipped ? 'scaleX(-1)' : ''} scale(${scale}) rotate(${rotation}deg)`,
                      }}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>

                {/* 1:1 Square bag */}
                <div>
                  <span className="text-[9px] text-black/50 block mb-1">1:1 Cart Bag</span>
                  <div className="w-14 aspect-square border border-black/20 overflow-hidden bg-black/5 shadow-xs">
                    <img
                      src={currentUrl}
                      alt="Cart bag preview"
                      style={{
                        objectPosition: `${focalX}% ${focalY}%`,
                        transform: `${flipped ? 'scaleX(-1)' : ''} scale(${scale}) rotate(${rotation}deg)`,
                      }}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>

                {/* 16:9 Banner */}
                <div>
                  <span className="text-[9px] text-black/50 block mb-1">16:9 Banner</span>
                  <div className="w-24 aspect-[16/9] border border-black/20 overflow-hidden bg-black/5 shadow-xs">
                    <img
                      src={currentUrl}
                      alt="Banner preview"
                      style={{
                        objectPosition: `${focalX}% ${focalY}%`,
                        transform: `${flipped ? 'scaleX(-1)' : ''} scale(${scale}) rotate(${rotation}deg)`,
                      }}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="px-5 py-3 border-t border-black/10 bg-white flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs uppercase font-mono tracking-wider border border-black/20 hover:border-black cursor-pointer transition-colors"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2 text-xs uppercase font-mono tracking-wider bg-black text-white hover:bg-neutral-800 flex items-center gap-2 cursor-pointer transition-colors font-medium shadow-sm"
          >
            <Check className="w-4 h-4" />
            <span>Apply Frame & Angle</span>
          </button>
        </div>
      </div>
    </div>
  );
};
