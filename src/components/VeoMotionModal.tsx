import React, { useState, useRef } from 'react';
import { X, Upload, Film, Play, Pause, RotateCw, Download, Check, Sparkles, Layers, Sliders } from 'lucide-react';
import { Product, NEUTRAL_PLACEHOLDER_IMG } from '../types';
import { useStorefrontData } from '../context/StorefrontDataContext';
import { generateVeoVideo } from '../services/veoService';

interface VeoMotionModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialProduct?: Product | null;
  onSetAsHeroVideo?: (videoUrl: string) => void;
}

const COUTURE_MOTION_PRESETS = [
  {
    id: 'runway',
    label: 'Runway Stride',
    prompt: 'Slow-motion high-fashion runway walk in Helsinki winter light, heavy virgin wool swaying with natural stance, 24fps film grain',
  },
  {
    id: 'drape',
    label: 'Textile Drape Flow',
    prompt: 'Subtle atmospheric wind revealing natural weave drape and wool texture, minimal clean studio setting, quiet camera push-in',
  },
  {
    id: 'turn',
    label: 'Slow Turntable Turn',
    prompt: 'Sculptural silhouette slowly turning 180 degrees in pure white studio, striking chiaroscuro shadows across coat architecture',
  },
  {
    id: 'macro',
    label: 'Macro Fabric Detail',
    prompt: 'Extreme close-up macro tracking shot along pure combed merino wool seams, slow meditative cinematic pan',
  },
];

export const VeoMotionModal: React.FC<VeoMotionModalProps> = ({
  isOpen,
  onClose,
  initialProduct,
  onSetAsHeroVideo,
}) => {
  const { products } = useStorefrontData();
  const [selectedImage, setSelectedImage] = useState<string>(() => {
    return initialProduct?.image || products[0]?.image || '';
  });
  const [selectedAspect, setSelectedAspect] = useState<'16:9' | '9:16'>('16:9');
  const [promptText, setPromptText] = useState(COUTURE_MOTION_PRESETS[0].prompt);
  const [activePresetId, setActivePresetId] = useState<string>('runway');
  const [isGenerating, setIsGenerating] = useState(false);
  const [progressStatus, setProgressStatus] = useState<string>('');
  const [progressValue, setProgressValue] = useState<number>(0);
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isHeroApplied, setIsHeroApplied] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setSelectedImage(reader.result);
          setGeneratedVideoUrl(null);
          setIsHeroApplied(false);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSelectPreset = (preset: typeof COUTURE_MOTION_PRESETS[0]) => {
    setActivePresetId(preset.id);
    setPromptText(preset.prompt);
  };

  const handleStartGeneration = async () => {
    if (!selectedImage) return;

    setIsGenerating(true);
    setProgressStatus('Initializing Veo 3.1 Fast video synthesis...');
    setProgressValue(10);
    setGeneratedVideoUrl(null);
    setIsHeroApplied(false);

    try {
      const res = await generateVeoVideo(
        {
          imageBase64: selectedImage,
          prompt: promptText,
          aspectRatio: selectedAspect,
        },
        (status, val) => {
          setProgressStatus(status);
          setProgressValue(val);
        }
      );

      if (res.videoUrl) {
        setGeneratedVideoUrl(res.videoUrl);
      }
    } catch (err) {
      console.error('Generation failure:', err);
    } finally {
      setIsGenerating(false);
      setProgressValue(100);
    }
  };

  const toggleVideoPlayback = () => {
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play();
        setIsPlaying(true);
      } else {
        videoRef.current.pause();
        setIsPlaying(false);
      }
    }
  };

  const handleApplyToHero = () => {
    if (generatedVideoUrl && onSetAsHeroVideo) {
      onSetAsHeroVideo(generatedVideoUrl);
      setIsHeroApplied(true);
      setTimeout(() => setIsHeroApplied(false), 3000);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-fadeIn select-none font-mono">
      <div className="bg-white text-black max-w-4xl w-full border border-black/[0.1] shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="h-14 border-b border-black/[0.08] px-4 sm:px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <Film className="w-4 h-4 stroke-[1.5]" />
            <span className="font-editorial text-lg tracking-wider font-semibold">MOTION ATELIER</span>
            <span className="text-[10px] uppercase tracking-[0.2em] text-black/50 pl-2 border-l border-black/[0.1] hidden sm:inline">
              Veo Video Generations · veo-3.1-fast-generate-preview
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-black/50 hover:text-black transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5 stroke-[1.5]" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1">
          {/* Instructions banner */}
          <div className="border border-black/[0.08] p-3.5 sm:p-4 bg-neutral-50/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <div>
              <span className="text-[10px] uppercase tracking-widest text-black/40 block mb-0.5 font-medium">
                AI COUTURE IN MOTION
              </span>
              <p className="text-black/80 font-sans text-xs">
                Upload a garment photograph or choose an archival plate. Veo animates the static weave into fluid 24fps high-fashion video.
              </p>
            </div>
            <div className="text-[10px] px-2.5 py-1 border border-black/20 uppercase tracking-widest shrink-0 font-medium">
              Model: veo-3.1-fast
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Input Selection & Controls (7 cols) */}
            <div className="lg:col-span-7 space-y-5">
              {/* 1. Photo Selection */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10.5px] uppercase tracking-[0.2em] text-black/60 font-medium">
                    1. Select or Upload Still Photo
                  </span>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-[11px] uppercase tracking-wider text-black underline underline-offset-4 hover:opacity-60 cursor-pointer flex items-center gap-1.5"
                  >
                    <Upload className="w-3 h-3" />
                    <span>Upload Custom Photo</span>
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>

                {/* Archival Plates Quick Selector */}
                <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                  {(products || []).slice(0, 8).map((prod) => {
                    const isSelected = selectedImage === prod.image;
                    return (
                      <button
                        key={prod.id}
                        type="button"
                        onClick={() => {
                          setSelectedImage(prod.image || NEUTRAL_PLACEHOLDER_IMG);
                          setGeneratedVideoUrl(null);
                        }}
                        className={`w-14 aspect-[3/4] border shrink-0 overflow-hidden relative transition-all cursor-pointer ${
                          isSelected
                            ? 'border-black ring-1 ring-black'
                            : 'border-black/10 opacity-70 hover:opacity-100'
                        }`}
                        title={prod.name?.en || prod.plateNumber}
                      >
                        <img
                          src={prod.image || NEUTRAL_PLACEHOLDER_IMG}
                          alt={prod.name?.en || 'Plate'}
                          className="w-full h-full object-cover"
                        />
                        <span className="absolute bottom-0 inset-x-0 bg-white/90 text-[8px] py-0.5 text-center truncate">
                          {prod.plateNumber}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Aspect Ratio Selector (Mandatory 16:9 or 9:16) */}
              <div>
                <span className="text-[10.5px] uppercase tracking-[0.2em] text-black/60 block mb-2 font-medium">
                  2. Video Aspect Ratio
                </span>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <button
                    type="button"
                    onClick={() => setSelectedAspect('16:9')}
                    className={`py-3 px-4 border text-left cursor-pointer transition-all flex items-center justify-between ${
                      selectedAspect === '16:9'
                        ? 'border-black bg-black text-white font-medium'
                        : 'border-black/20 hover:border-black text-black'
                    }`}
                  >
                    <div>
                      <div className="font-semibold tracking-wider">16:9 Landscape</div>
                      <div className={`text-[10px] ${selectedAspect === '16:9' ? 'text-white/70' : 'text-black/50'}`}>
                        Cinematic Runway & Desktop Hero
                      </div>
                    </div>
                    <div className="w-6 h-3.5 border border-current" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedAspect('9:16')}
                    className={`py-3 px-4 border text-left cursor-pointer transition-all flex items-center justify-between ${
                      selectedAspect === '9:16'
                        ? 'border-black bg-black text-white font-medium'
                        : 'border-black/20 hover:border-black text-black'
                    }`}
                  >
                    <div>
                      <div className="font-semibold tracking-wider">9:16 Portrait</div>
                      <div className={`text-[10px] ${selectedAspect === '9:16' ? 'text-white/70' : 'text-black/50'}`}>
                        Editorial Mobile & Vertical Reel
                      </div>
                    </div>
                    <div className="w-3.5 h-6 border border-current" />
                  </button>
                </div>
              </div>

              {/* 3. Motion Direction & Presets */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10.5px] uppercase tracking-[0.2em] text-black/60 font-medium">
                    3. Motion Presets & Direction
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 mb-2.5">
                  {COUTURE_MOTION_PRESETS.map((pst) => (
                    <button
                      key={pst.id}
                      type="button"
                      onClick={() => handleSelectPreset(pst)}
                      className={`p-2 text-left text-xs border cursor-pointer transition-colors truncate ${
                        activePresetId === pst.id
                          ? 'border-black bg-black/5 font-semibold text-black'
                          : 'border-black/15 text-black/60 hover:text-black'
                      }`}
                    >
                      <div className="truncate">{pst.label}</div>
                    </button>
                  ))}
                </div>

                <textarea
                  value={promptText}
                  onChange={(e) => setPromptText(e.target.value)}
                  rows={2}
                  className="w-full p-2.5 text-xs font-mono border border-black/20 focus:border-black focus:outline-none resize-none leading-relaxed placeholder-black/30"
                  placeholder="Describe desired movement, camera pan, and garment flow..."
                />
              </div>

              {/* Generation Button */}
              <button
                type="button"
                onClick={handleStartGeneration}
                disabled={isGenerating || !selectedImage}
                className="w-full py-3.5 btn-primary text-xs uppercase tracking-[0.24em] font-medium flex items-center justify-center gap-2 disabled:opacity-40 cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>
                  {isGenerating
                    ? 'Synthesizing Veo Video...'
                    : 'Animate Image into Veo Video →'}
                </span>
              </button>

              {/* Progress status */}
              {isGenerating && (
                <div className="space-y-2 pt-1 animate-fadeIn">
                  <div className="flex justify-between text-[11px] text-black/60">
                    <span className="truncate pr-2">{progressStatus}</span>
                    <span className="shrink-0">{progressValue}%</span>
                  </div>
                  <div className="w-full h-1 bg-black/10 overflow-hidden">
                    <div
                      className="h-full bg-black transition-all duration-300"
                      style={{ width: `${progressValue}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Right: Real-Time Preview & Video Output (5 cols) */}
            <div className="lg:col-span-5 flex flex-col">
              <span className="text-[10.5px] uppercase tracking-[0.2em] text-black/60 block mb-2 font-medium">
                {generatedVideoUrl ? 'Generated Veo Video Stream' : 'Source Still Preview'}
              </span>

              <div
                className={`relative border border-black/15 bg-black flex items-center justify-center overflow-hidden transition-all ${
                  selectedAspect === '16:9' ? 'aspect-video' : 'aspect-[9/16] max-h-[380px]'
                }`}
              >
                {generatedVideoUrl ? (
                  <div className="relative w-full h-full group">
                    <video
                      ref={videoRef}
                      src={generatedVideoUrl}
                      autoPlay
                      loop
                      muted
                      playsInline
                      className="w-full h-full object-cover"
                    />

                    {/* Minimal Video Overlays */}
                    <div className="absolute top-2 left-2 px-2 py-0.5 bg-black/75 text-white text-[9px] font-mono uppercase tracking-wider flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                      <span>VEO 24FPS · {selectedAspect}</span>
                    </div>

                    {/* Bottom controls strip */}
                    <div className="absolute bottom-0 inset-x-0 p-2.5 bg-gradient-to-t from-black/80 to-transparent flex items-center justify-between text-white opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={toggleVideoPlayback}
                        className="p-1 hover:opacity-75 cursor-pointer"
                      >
                        {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                      </button>

                      <div className="flex items-center gap-2">
                        <a
                          href={generatedVideoUrl}
                          download={`zejesh-veo-${selectedAspect}.mp4`}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1 hover:opacity-75 cursor-pointer text-xs"
                          title="Download MP4 Video"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="relative w-full h-full bg-neutral-100 flex items-center justify-center">
                    {selectedImage ? (
                      <img
                        src={selectedImage}
                        alt="Selected source still"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-xs text-black/40">No photo selected</span>
                    )}

                    <div className="absolute inset-0 bg-black/20 flex items-center justify-center pointer-events-none">
                      <div className="w-10 h-10 border border-white/60 rounded-full flex items-center justify-center text-white/80 backdrop-blur-xs">
                        <Play className="w-4 h-4 ml-0.5" />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons for Generated Video */}
              {generatedVideoUrl && (
                <div className="pt-3 space-y-2 text-center">
                  <button
                    type="button"
                    onClick={handleApplyToHero}
                    className="w-full py-2 text-xs uppercase tracking-wider text-black hover:opacity-60 underline underline-offset-4 transition-opacity cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    {isHeroApplied ? <Check className="w-3.5 h-3.5" /> : <Layers className="w-3.5 h-3.5" />}
                    <span>{isHeroApplied ? 'Applied to Storefront Hero!' : 'Set as Hero Video'}</span>
                  </button>

                  <a
                    href={generatedVideoUrl}
                    download={`zejesh-veo-${selectedAspect}.mp4`}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full py-1 text-black/60 hover:text-black text-[11px] uppercase tracking-wider transition-colors text-center block underline underline-offset-2"
                  >
                    Download High-Res MP4
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="h-12 border-t border-black/[0.08] px-6 bg-neutral-50/50 flex items-center justify-between text-[11px] text-black/50 shrink-0">
          <span>Veo 3.1 Fast AI Generation Service</span>
          <span>16:9 & 9:16 HD Native Aspect</span>
        </div>
      </div>
    </div>
  );
};
