import React, { useState, useEffect, useRef } from 'react';
import { StoreContent, HeroSlide, NEUTRAL_PLACEHOLDER_IMG } from '../../types';
import { useAuth } from '../../supabase/AuthContext';
import { useStorefrontData } from '../../context/StorefrontDataContext';
import { updateStoreContent, logAuditEvent } from '../../supabase/dbService';
import { uploadMediaAsset } from '../../supabase/mediaService';
import { UniversalMediaPickerModal } from '../components/UniversalMediaPickerModal';
import {
  ArrowUp,
  ArrowDown,
  Save,
  Plus,
  Trash2,
  Edit2,
  Video,
  Image as ImageIcon,
  Check,
  X,
  Eye,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Upload,
  Compass,
  ZoomIn,
  RotateCcw,
  RotateCw,
  Maximize2,
} from 'lucide-react';
import { ImageFrameAdjusterModal, FrameAdjusterResult } from '../components/ImageFrameAdjusterModal';

interface AdminContentViewProps {
  content: StoreContent;
  onRefresh: () => void;
}

export const AdminContentView: React.FC<AdminContentViewProps> = ({ content, onRefresh }) => {
  const { isEditor, adminProfile } = useAuth();
  const { updateStoreContentLocal } = useStorefrontData();

  const [formData, setFormData] = useState<StoreContent>(content);
  const [activeTab, setActiveTab] = useState<'hero' | 'sections' | 'announcement' | 'journal'>('hero');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Hero Slides List State
  const [heroSlides, setHeroSlides] = useState<HeroSlide[]>(() => {
    return content?.heroSlides || [];
  });

  // Keep in sync if external content changes
  useEffect(() => {
    if (content?.heroSlides && content.heroSlides.length > 0) {
      setHeroSlides(content.heroSlides);
    }
  }, [content]);

  // Modal / Drawer state for adding or editing a slide
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSlideId, setEditingSlideId] = useState<string | null>(null);

  // Slide form state
  const [slideType, setSlideType] = useState<'video' | 'image'>('video');
  const [slideSrc, setSlideSrc] = useState('');
  const [slidePoster, setSlidePoster] = useState('');
  const [captionEn, setCaptionEn] = useState('');
  const [captionFi, setCaptionFi] = useState('');
  const [positionDesktop, setPositionDesktop] = useState('center 20%');
  const [positionMobile, setPositionMobile] = useState('center 15%');
  const [slideScale, setSlideScale] = useState(1.0);
  const [slideRotation, setSlideRotation] = useState(0);
  const [slideFocalX, setSlideFocalX] = useState(50);
  const [slideFocalY, setSlideFocalY] = useState(20);
  const [slideFormError, setSlideFormError] = useState<string | null>(null);

  // File upload refs
  const slideFileInputRef = React.useRef<HTMLInputElement | null>(null);
  const slidePosterFileInputRef = React.useRef<HTMLInputElement | null>(null);
  const [isSlideAdjusterModalOpen, setIsSlideAdjusterModalOpen] = useState(false);

  // Deletion confirmation
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Interactive Live Preview in Admin
  const [previewIndex, setPreviewIndex] = useState(0);

  // Device file upload for slide
  const handleSlideFileUpload = (file: File | undefined) => {
    if (!file) return;
    const isVid = file.type.startsWith('video');
    setSlideType(isVid ? 'video' : 'image');

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        setSlideSrc(dataUrl);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSlidePosterUpload = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        setSlidePoster(dataUrl);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDeleteSlideImage = () => {
    setSlideSrc('');
  };

  const handleApplySlideAdjuster = (res: FrameAdjusterResult) => {
    setSlideScale(res.scale);
    setSlideRotation(res.rotation);
    setSlideFocalX(res.focalX);
    setSlideFocalY(res.focalY);
    setPositionDesktop(res.position);
    setPositionMobile(res.position);
  };

  // Quick asset presets for studio quality
  const defaultSections = [
    { id: 'latest_drop', label: 'Section 01: Latest Archival Drop' },
    { id: 'categories_mosaic', label: 'Section 02: Architectural Categories Mosaic' },
    { id: 'craft_narrative', label: 'Section 03: Nordic Craft & Materials Manifesto' },
    { id: 'featured_pieces', label: 'Section 04: Curated Core Highlights Carousel' },
    { id: 'winter_lookbook', label: 'Section 05: Editorial Winter Campaign Banner' },
    { id: 'journal_archive', label: 'Section 06: Quiet Nordic Studio Journal' },
  ];

  // Open modal to add a brand new slide
  const handleOpenAddModal = () => {
    setEditingSlideId(null);
    setSlideType('image');
    setSlideSrc('');
    setSlidePoster('');
    setCaptionEn('');
    setCaptionFi('');
    setPositionDesktop('center 20%');
    setPositionMobile('center 15%');
    setSlideScale(1.0);
    setSlideRotation(0);
    setSlideFocalX(50);
    setSlideFocalY(20);
    setSlideFormError(null);
    setIsModalOpen(true);
  };

  // Open modal to edit an existing slide
  const handleOpenEditModal = (slide: HeroSlide) => {
    setEditingSlideId(slide.id);
    setSlideType(slide.type);
    setSlideSrc(slide.src);
    setSlidePoster(slide.poster || '');
    setCaptionEn(slide.caption?.en || '');
    setCaptionFi(slide.caption?.fi || '');
    setPositionDesktop(slide.positionDesktop || 'center 20%');
    setPositionMobile(slide.positionMobile || 'center 15%');
    setSlideScale(slide.scale || 1.0);
    setSlideRotation(slide.rotation || 0);
    setSlideFocalX(slide.focalX || 50);
    setSlideFocalY(slide.focalY || 20);
    setSlideFormError(null);
    setIsModalOpen(true);
  };

  // Save new or edited slide to heroSlides list
  const handleSaveSlideModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!slideSrc.trim()) {
      setSlideFormError('Please provide a valid media source URL or upload a file from your device.');
      return;
    }

    if (editingSlideId) {
      // Update existing slide
      const updated = heroSlides.map((s) => {
        if (s.id === editingSlideId) {
          return {
            ...s,
            type: slideType,
            src: slideSrc.trim(),
            poster: slideType === 'video' ? slidePoster.trim() : undefined,
            positionDesktop,
            positionMobile,
            scale: slideScale,
            rotation: slideRotation,
            focalX: slideFocalX,
            focalY: slideFocalY,
            caption: {
              fi: captionFi.trim() || captionEn.trim(),
              en: captionEn.trim(),
              sv: captionEn.trim(),
            },
          };
        }
        return s;
      });
      setHeroSlides(updated);
      persistHeroSlidesUpdate(updated);
    } else {
      // Add new slide
      const newSlide: HeroSlide = {
        id: `slide-${Date.now()}`,
        type: slideType,
        src: slideSrc.trim(),
        poster: slideType === 'video' ? slidePoster.trim() || undefined : undefined,
        positionDesktop,
        positionMobile,
        scale: slideScale,
        rotation: slideRotation,
        focalX: slideFocalX,
        focalY: slideFocalY,
        caption: {
          fi: captionFi.trim() || captionEn.trim(),
          en: captionEn.trim() || 'Zejesh Campaign Series',
          sv: captionEn.trim() || 'Zejesh Campaign Series',
        },
      };
      const updated = [...heroSlides, newSlide];
      setHeroSlides(updated);
      persistHeroSlidesUpdate(updated);
    }

    setIsModalOpen(false);
  };

  // Remove a slide
  const handleRemoveSlide = (slideId: string) => {
    if (heroSlides.length <= 1) {
      alert('The hero carousel requires at least 1 active slide or video.');
      setDeleteConfirmId(null);
      return;
    }

    const updated = heroSlides.filter((s) => s.id !== slideId);
    setHeroSlides(updated);
    setDeleteConfirmId(null);
    if (previewIndex >= updated.length) {
      setPreviewIndex(Math.max(0, updated.length - 1));
    }
    persistHeroSlidesUpdate(updated);
  };

  // Reorder slides (up / down)
  const handleMoveSlide = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= heroSlides.length) return;

    const copy = [...heroSlides];
    const temp = copy[index];
    copy[index] = copy[targetIdx];
    copy[targetIdx] = temp;

    setHeroSlides(copy);
    persistHeroSlidesUpdate(copy);
  };

  // Save heroSlides immediately to context & firestore
  const persistHeroSlidesUpdate = async (slides: HeroSlide[]) => {
    const updatedContent: StoreContent = {
      ...formData,
      heroSlides: slides,
      updatedAt: new Date().toISOString(),
    };
    setFormData(updatedContent);
    updateStoreContentLocal(updatedContent);

    try {
      await updateStoreContent(updatedContent);
      await logAuditEvent(
        adminProfile?.name || 'admin',
        'HERO_SLIDES_UPDATED',
        'storefront_hero',
        { slideCount: slides.length }
      );
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
      onRefresh();
    } catch (err) {
      console.warn('Auto-save hero slides warning:', err);
    }
  };

  // Move Homepage narrative section
  const handleMoveSection = (index: number, direction: 'up' | 'down') => {
    const sections = [...(formData.sectionOrder || defaultSections.map((s) => s.id))];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= sections.length) return;

    const temp = sections[index];
    sections[index] = sections[targetIdx];
    sections[targetIdx] = temp;

    const updated = { ...formData, sectionOrder: sections };
    setFormData(updated);
    updateStoreContentLocal(updated);
  };

  // Global save of all content fields
  const handleSaveAllContent = async () => {
    if (!isEditor) return;
    setIsSaving(true);
    try {
      const updated: StoreContent = {
        ...formData,
        heroSlides,
        updatedAt: new Date().toISOString(),
      };

      await updateStoreContent(updated);
      updateStoreContentLocal(updated);

      await logAuditEvent(
        adminProfile?.name || 'admin',
        'STOREFRONT_CMS_UPDATED',
        'homepage',
        {
          sections: updated.sectionOrder,
          slidesCount: heroSlides.length,
        }
      );

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      onRefresh();
    } catch (err) {
      console.warn('Content save error:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const currentPreviewSlide = heroSlides[previewIndex] || heroSlides[0];

  return (
    <div className="space-y-6">
      {/* Title & Save Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-black/[0.08]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-editorial text-2xl sm:text-3xl font-normal">Storefront CMS & Hero Media</h1>
            {saveSuccess && (
              <span className="flex items-center gap-1 text-[11px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 border border-emerald-200">
                <Check className="w-3 h-3" /> Live on Storefront
              </span>
            )}
          </div>
          <p className="text-xs font-mono text-black/50 mt-0.5">
            Centrally manage hero video/slides carousel, narrative pacing, and announcement ticker.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleSaveAllContent}
            disabled={isSaving}
            className="text-xs font-mono uppercase tracking-wider text-white bg-black hover:bg-black/80 px-4 py-2 cursor-pointer flex items-center gap-2 font-medium disabled:opacity-50 transition-colors"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaving ? 'Publishing...' : 'Publish to Storefront'}</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-black/[0.08] text-xs font-mono uppercase tracking-wider overflow-x-auto">
        {[
          { id: 'hero', label: `1. Hero Slides & Videos (${heroSlides.length})` },
          { id: 'sections', label: '2. Homepage Sections Order' },
          { id: 'announcement', label: '3. Announcement Ticker' },
          { id: 'journal', label: '4. Editorial Journal' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2.5 transition-colors cursor-pointer shrink-0 ${
              activeTab === tab.id
                ? 'font-bold text-black border-b-2 border-black'
                : 'text-black/50 hover:text-black'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ============================================================== */}
      {/* TAB 1: HERO SLIDES & VIDEO CAROUSEL MANAGEMENT (CORE FEATURE) */}
      {/* ============================================================== */}
      {activeTab === 'hero' && (
        <div className="space-y-8 font-mono text-xs">
          {/* Hero Management Notice */}
          <div className="p-4 border border-black/10 bg-black/[0.02] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="font-semibold text-black text-xs uppercase tracking-wider">
                Hero Video & Slide Management Studio
              </p>
              <p className="text-[11px] text-black/60 mt-0.5">
                Slides and videos added or removed here immediately appear on the storefront. Public homepage controls have been restricted to protect store integrity.
              </p>
            </div>
            <button
              type="button"
              onClick={handleOpenAddModal}
              className="px-3.5 py-2 bg-black text-white hover:bg-black/80 transition-colors cursor-pointer flex items-center gap-1.5 shrink-0 text-xs uppercase tracking-wider font-medium"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Slide or Video</span>
            </button>
          </div>

          {/* Interactive Live Hero Preview Widget */}
          <div className="border border-black/[0.1] bg-white p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[11px] font-semibold uppercase tracking-wider text-black">
                  Interactive Live Carousel Preview
                </span>
                <span className="text-[10px] text-black/40">
                  (Slide {previewIndex + 1} of {heroSlides.length})
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setPreviewIndex((prev) => (prev - 1 + heroSlides.length) % heroSlides.length)}
                  className="p-1.5 border border-black/20 hover:border-black text-black cursor-pointer transition-colors"
                  title="Previous Slide"
                  aria-label="Previous Slide"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewIndex((prev) => (prev + 1) % heroSlides.length)}
                  className="p-1.5 border border-black/20 hover:border-black text-black cursor-pointer transition-colors"
                  title="Next Slide"
                  aria-label="Next Slide"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Simulated Hero Viewport */}
            <div className="relative w-full h-56 sm:h-72 bg-white overflow-hidden border border-black/[0.08] flex items-center justify-center">
              {currentPreviewSlide?.type === 'video' ? (
                <video
                  key={currentPreviewSlide.id}
                  src={currentPreviewSlide.src}
                  poster={currentPreviewSlide.poster}
                  autoPlay
                  muted
                  loop
                  playsInline
                  className="w-full h-full object-cover object-[center_20%]"
                />
              ) : (
                <img
                  key={currentPreviewSlide?.id}
                  src={currentPreviewSlide?.src}
                  alt={currentPreviewSlide?.caption?.en || 'Hero Preview'}
                  className="w-full h-full object-cover object-[center_20%]"
                />
              )}

              {/* Overlay slide label */}
              <div className="absolute top-3 left-3 bg-black/80 text-white px-2 py-0.5 text-[9.5px] uppercase tracking-widest font-mono flex items-center gap-1.5">
                {currentPreviewSlide?.type === 'video' ? (
                  <>
                    <Video className="w-3 h-3 text-indigo-400" />
                    <span>CINEMATIC VIDEO</span>
                  </>
                ) : (
                  <>
                    <ImageIcon className="w-3 h-3 text-amber-300" />
                    <span>STUDIO PHOTO</span>
                  </>
                )}
              </div>

              {/* Bottom counter overlay */}
              <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-xs px-2.5 py-1 text-[10px] font-mono border border-black/10">
                <span className="font-bold text-black">0{previewIndex + 1}</span>
                <span className="text-black/40"> / </span>
                <span className="text-black/60">0{heroSlides.length}</span>
                <span className="text-black/30"> · </span>
                <span className="text-black/70 uppercase">
                  {currentPreviewSlide?.caption?.en || 'Atelier Campaign'}
                </span>
              </div>
            </div>
          </div>

          {/* Active Hero Slides List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-black/[0.08]">
              <span className="text-xs uppercase font-semibold text-black tracking-wider">
                Configured Hero Carousel Slides ({heroSlides.length})
              </span>
              <span className="text-[11px] text-black/50">
                Order determines sequence on storefront
              </span>
            </div>

            <div className="space-y-3">
              {heroSlides.map((slide, idx) => (
                <div
                  key={slide.id}
                  className={`p-3.5 sm:p-4 border transition-colors bg-white flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                    previewIndex === idx ? 'border-black ring-1 ring-black/10' : 'border-black/[0.1] hover:border-black/30'
                  }`}
                >
                  {/* Left: Thumbnail & Details */}
                  <div className="flex items-start gap-3.5">
                    {/* Thumbnail preview */}
                    <div className="w-20 h-20 sm:w-24 sm:h-24 shrink-0 bg-neutral-100 border border-black/10 overflow-hidden relative flex items-center justify-center">
                      {slide.type === 'video' ? (
                        <>
                          <video
                            src={slide.src}
                            poster={slide.poster}
                            muted
                            playsInline
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                            <Video className="w-5 h-5 text-white drop-shadow" />
                          </div>
                        </>
                      ) : (
                        <img
                          src={slide.src}
                          alt={slide.caption?.en || 'Slide'}
                          className="w-full h-full object-cover"
                        />
                      )}
                      <span className="absolute bottom-1 right-1 bg-black text-white text-[8.5px] px-1 font-mono uppercase font-bold">
                        0{idx + 1}
                      </span>
                    </div>

                    {/* Metadata */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[9.5px] uppercase px-1.5 py-0.5 font-mono font-semibold border ${
                            slide.type === 'video'
                              ? 'bg-indigo-50 text-indigo-900 border-indigo-200'
                              : 'bg-neutral-50 text-neutral-800 border-neutral-200'
                          }`}
                        >
                          {slide.type === 'video' ? 'VIDEO (.MP4)' : 'STUDIO PHOTO'}
                        </span>
                        <span className="text-[10px] text-black/40 font-mono">
                          ID: {slide.id}
                        </span>
                      </div>

                      <h4 className="font-semibold text-black text-xs">
                        {slide.caption?.en || 'Untitled Campaign Slide'}
                      </h4>

                      <div className="text-[10.5px] text-black/50 font-mono break-all line-clamp-1 max-w-md">
                        URL: {slide.src}
                      </div>

                      {slide.type === 'video' && slide.poster && (
                        <div className="text-[10px] text-black/40 font-mono break-all line-clamp-1 max-w-md">
                          Poster: {slide.poster}
                        </div>
                      )}

                      <div className="text-[9.5px] text-black/40 font-mono">
                        Focal Position: Desktop ({slide.positionDesktop || 'center 20%'}) · Mobile ({slide.positionMobile || 'center 15%'})
                      </div>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                    <button
                      type="button"
                      onClick={() => setPreviewIndex(idx)}
                      className="px-2.5 py-1.5 border border-black/20 hover:border-black text-black text-[11px] cursor-pointer transition-colors flex items-center gap-1"
                      title="Preview this slide"
                    >
                      <Eye className="w-3 h-3" />
                      <span className="hidden sm:inline">Preview</span>
                    </button>

                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => handleMoveSlide(idx, 'up')}
                      className="p-1.5 border border-black/20 hover:border-black text-black cursor-pointer transition-colors disabled:opacity-25"
                      title="Move Up"
                      aria-label="Move Up"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      disabled={idx === heroSlides.length - 1}
                      onClick={() => handleMoveSlide(idx, 'down')}
                      className="p-1.5 border border-black/20 hover:border-black text-black cursor-pointer transition-colors disabled:opacity-25"
                      title="Move Down"
                      aria-label="Move Down"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(slide)}
                      className="px-2.5 py-1.5 border border-black/20 hover:border-black text-black text-[11px] cursor-pointer transition-colors flex items-center gap-1"
                    >
                      <Edit2 className="w-3 h-3" />
                      <span>Edit</span>
                    </button>

                    {deleteConfirmId === slide.id ? (
                      <div className="flex items-center gap-1 bg-red-50 p-1 border border-red-200">
                        <button
                          type="button"
                          onClick={() => handleRemoveSlide(slide.id)}
                          className="px-2 py-1 bg-red-600 text-white text-[10px] font-bold hover:bg-red-700 cursor-pointer"
                        >
                          Confirm
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteConfirmId(null)}
                          className="px-1.5 py-1 text-black/60 hover:text-black text-[10px] cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setDeleteConfirmId(slide.id)}
                        className="p-1.5 border border-red-200 hover:border-red-600 text-red-600 hover:bg-red-50 cursor-pointer transition-colors"
                        title="Remove Slide from Hero"
                        aria-label="Remove Slide"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Actions for Hero Carousel */}
          <div className="border border-black/[0.08] p-4 bg-neutral-50 flex items-center justify-between">
            <span className="text-xs uppercase font-medium text-black/70">
              {heroSlides.length === 0 ? 'No slides in carousel' : `${heroSlides.length} slide(s) active in carousel`}
            </span>
            <button
              type="button"
              onClick={handleOpenAddModal}
              className="px-4 py-2 bg-black text-white hover:bg-neutral-800 text-xs uppercase tracking-wider font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Carousel Slide</span>
            </button>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 2: SECTIONS REORDER */}
      {/* ============================================================== */}
      {activeTab === 'sections' && (
        <div className="space-y-4 max-w-2xl font-mono text-xs">
          <p className="text-black/60 text-[11px]">
            Reorder homepage narrative sections. Changes reflect live on the storefront immediately upon saving.
          </p>

          <div className="border border-black/[0.08] divide-y divide-black/[0.06] bg-white">
            {(formData.sectionOrder || defaultSections.map((s) => s.id)).map((secId, idx, arr) => {
              const info = defaultSections.find((s) => s.id === secId) || { label: secId };
              return (
                <div key={secId} className="p-3.5 flex items-center justify-between hover:bg-black/[0.015]">
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-black/40 font-mono">0{idx + 1}</span>
                    <span className="font-medium text-black">{info.label}</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      disabled={idx === 0}
                      onClick={() => handleMoveSection(idx, 'up')}
                      className="text-xs font-mono uppercase text-black hover:opacity-60 underline cursor-pointer disabled:opacity-20"
                    >
                      Up
                    </button>
                    <span className="text-black/20">/</span>
                    <button
                      disabled={idx === arr.length - 1}
                      onClick={() => handleMoveSection(idx, 'down')}
                      className="text-xs font-mono uppercase text-black hover:opacity-60 underline cursor-pointer disabled:opacity-20"
                    >
                      Down
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 3: ANNOUNCEMENT TICKER */}
      {/* ============================================================== */}
      {activeTab === 'announcement' && (
        <div className="space-y-6 max-w-2xl font-mono text-xs">
          <div>
            <label className="block text-[10px] uppercase text-black/50 mb-1">Announcement Ticker Text (English)</label>
            <input
              type="text"
              value={formData.announcementBar?.en || ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  announcementBar: { ...formData.announcementBar, en: e.target.value },
                })
              }
              className="w-full px-3 py-2 border-b border-black/30 focus:border-black text-xs bg-transparent focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[10px] uppercase text-black/50 mb-1">Announcement Ticker Text (Finnish - Optional)</label>
            <input
              type="text"
              value={formData.announcementBar?.fi || ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  announcementBar: { ...formData.announcementBar, fi: e.target.value },
                })
              }
              className="w-full px-3 py-2 border-b border-black/30 focus:border-black text-xs bg-transparent focus:outline-none"
            />
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 4: JOURNAL POSTS */}
      {/* ============================================================== */}
      {activeTab === 'journal' && (
        <div className="space-y-4 font-mono text-xs">
          <p className="text-black/60 text-[11px]">
            Archival articles and editorial journals published to the community feed.
          </p>

          <div className="border border-black/[0.08] divide-y divide-black/[0.06] bg-white">
            {(formData.journalPosts || []).map((post) => (
              <div key={post.id} className="p-4 flex items-center justify-between hover:bg-black/[0.015]">
                <div>
                  <div className="font-semibold text-black">{post.title.en || post.title.fi}</div>
                  <div className="text-[10px] text-black/40">
                    {post.date} · {post.readTime} · Tag: {post.tag}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase text-emerald-700 bg-emerald-50 px-2 py-0.5 border border-emerald-200">
                    Live
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: ADD / EDIT HERO SLIDE OR VIDEO */}
      {/* ============================================================== */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-xl bg-white text-black p-5 sm:p-7 border border-black shadow-2xl space-y-5 animate-fadeIn max-h-[92vh] overflow-y-auto font-mono text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-black/10">
              <div>
                <h3 className="font-editorial text-xl sm:text-2xl font-normal text-black">
                  {editingSlideId ? 'Edit Hero Slide / Video' : 'Add Hero Slide or Video'}
                </h3>
                <p className="text-[11px] text-black/50">
                  {editingSlideId
                    ? 'Modify the existing slide attributes and update the carousel sequence.'
                    : 'Append a new cinematic video or photography slide to the storefront hero carousel.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-black/50 hover:text-black cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {slideFormError && (
              <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 text-[11px]">
                {slideFormError}
              </div>
            )}

            <form onSubmit={handleSaveSlideModal} className="space-y-4">
              {/* Media Type Selection */}
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-black/60 mb-1.5 font-semibold">
                  Media Type:
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label
                    className={`p-3 border cursor-pointer flex items-center gap-2 transition-colors ${
                      slideType === 'video'
                        ? 'border-black bg-black text-white font-bold'
                        : 'border-black/20 hover:border-black/50 bg-white text-black'
                    }`}
                  >
                    <input
                      type="radio"
                      name="slideTypeRadio"
                      checked={slideType === 'video'}
                      onChange={() => setSlideType('video')}
                      className="sr-only"
                    />
                    <Video className="w-4 h-4" />
                    <span>Cinematic Video (.mp4)</span>
                  </label>

                  <label
                    className={`p-3 border cursor-pointer flex items-center gap-2 transition-colors ${
                      slideType === 'image'
                        ? 'border-black bg-black text-white font-bold'
                        : 'border-black/20 hover:border-black/50 bg-white text-black'
                    }`}
                  >
                    <input
                      type="radio"
                      name="slideTypeRadio"
                      checked={slideType === 'image'}
                      onChange={() => setSlideType('image')}
                      className="sr-only"
                    />
                    <ImageIcon className="w-4 h-4" />
                    <span>Studio Photography (Image)</span>
                  </label>
                </div>
              </div>

              {/* Hidden file inputs for device file uploads */}
              <input
                ref={slideFileInputRef}
                type="file"
                accept={slideType === 'video' ? 'video/*,image/*' : 'image/*'}
                onChange={(e) => {
                  handleSlideFileUpload(e.target.files?.[0]);
                  e.target.value = '';
                }}
                className="hidden"
              />
              <input
                ref={slidePosterFileInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => {
                  handleSlidePosterUpload(e.target.files?.[0]);
                  e.target.value = '';
                }}
                className="hidden"
              />

              {/* Media Source URL + Device Upload Bar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-[10px] uppercase tracking-wider text-black/60 font-semibold">
                    {slideType === 'video' ? 'Video Stream URL (.mp4 / WebM):' : 'Image URL or Local File:'}
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => slideFileInputRef.current?.click()}
                      className="px-2.5 py-1 text-[10px] uppercase font-mono font-medium bg-black text-white hover:bg-neutral-800 transition-colors flex items-center gap-1 cursor-pointer shadow-2xs"
                    >
                      <Upload className="w-3 h-3" />
                      <span>Upload from Device</span>
                    </button>
                    {slideSrc && (
                      <>
                        <button
                          type="button"
                          onClick={() => setIsSlideAdjusterModalOpen(true)}
                          className="px-2.5 py-1 text-[10px] uppercase font-mono border border-black hover:bg-black hover:text-white transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <Compass className="w-3 h-3" />
                          <span>Adjust Best Frame & Angle</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleDeleteSlideImage}
                          className="p-1 text-red-600 hover:bg-red-50 border border-red-200 transition-colors cursor-pointer"
                          title="Delete / Clear picture"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
                <input
                  type="text"
                  required
                  value={slideSrc}
                  onChange={(e) => setSlideSrc(e.target.value)}
                  placeholder={
                    slideType === 'video'
                      ? 'https://.../video.mp4'
                      : 'https://.../media.webp or /placeholder.svg'
                  }
                  className="w-full px-3 py-2 text-xs font-mono border border-black/20 focus:border-black focus:outline-none"
                />
              </div>

              {/* Poster Image for Video */}
              {slideType === 'video' && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-[10px] uppercase tracking-wider text-black/60 font-semibold">
                      Video Fallback Poster Image:
                    </label>
                    <button
                      type="button"
                      onClick={() => slidePosterFileInputRef.current?.click()}
                      className="px-2 py-0.5 text-[9.5px] uppercase font-mono border border-black/20 hover:border-black flex items-center gap-1 cursor-pointer"
                    >
                      <Upload className="w-2.5 h-2.5" />
                      <span>Upload Poster from Device</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    value={slidePoster}
                    onChange={(e) => setSlidePoster(e.target.value)}
                    placeholder="https://.../poster.webp or /placeholder.svg"
                    className="w-full px-3 py-2 text-xs font-mono border border-black/20 focus:border-black focus:outline-none"
                  />
                </div>
              )}

              {/* Frame, Zoom & Angle Controls */}
              <div className="p-3 border border-black/10 bg-neutral-50/70 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-wider text-black font-semibold flex items-center gap-1">
                    <Compass className="w-3 h-3 text-black" />
                    <span>Best Frame & Angle Calibration</span>
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[9.5px] font-mono text-black/60">
                      Scale: {slideScale.toFixed(2)}x · Angle: {slideRotation}°
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setSlideScale(1.0);
                        setSlideRotation(0);
                        setPositionDesktop('center 20%');
                        setPositionMobile('center 15%');
                      }}
                      className="text-[9px] uppercase font-mono underline hover:opacity-60 cursor-pointer"
                    >
                      Reset 0°
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <div className="flex justify-between text-[10px] text-black/70 mb-1">
                      <span>Angle / Tilt</span>
                      <span className="font-bold">{slideRotation}°</span>
                    </div>
                    <input
                      type="range"
                      min={-45}
                      max={45}
                      step={1}
                      value={slideRotation}
                      onChange={(e) => setSlideRotation(parseInt(e.target.value, 10))}
                      className="w-full accent-black cursor-pointer"
                    />
                    <div className="flex items-center justify-between gap-1 pt-0.5">
                      <button
                        type="button"
                        onClick={() => setSlideRotation((r) => Math.max(-45, r - 5))}
                        className="px-1.5 py-0.5 text-[8.5px] border border-black/15 bg-white cursor-pointer"
                      >
                        -5°
                      </button>
                      <button
                        type="button"
                        onClick={() => setSlideRotation(0)}
                        className="px-1.5 py-0.5 text-[8.5px] border border-black/15 bg-white cursor-pointer"
                      >
                        Level 0°
                      </button>
                      <button
                        type="button"
                        onClick={() => setSlideRotation((r) => Math.min(45, r + 5))}
                        className="px-1.5 py-0.5 text-[8.5px] border border-black/15 bg-white cursor-pointer"
                      >
                        +5°
                      </button>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[10px] text-black/70 mb-1">
                      <span>Zoom / Scale</span>
                      <span className="font-bold">{slideScale.toFixed(2)}x</span>
                    </div>
                    <input
                      type="range"
                      min={0.8}
                      max={2.5}
                      step={0.01}
                      value={slideScale}
                      onChange={(e) => setSlideScale(parseFloat(e.target.value))}
                      className="w-full accent-black cursor-pointer"
                    />
                    <div className="flex items-center justify-between gap-1 pt-0.5">
                      {[1.0, 1.15, 1.3, 1.5].map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setSlideScale(s)}
                          className={`px-1.5 py-0.5 text-[8.5px] border cursor-pointer ${
                            Math.abs(slideScale - s) < 0.02 ? 'border-black bg-black text-white' : 'border-black/15 bg-white'
                          }`}
                        >
                          {s}x
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Caption / Title */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-black/60 mb-1 font-semibold">
                    English Caption / Campaign Headline:
                  </label>
                  <input
                    type="text"
                    value={captionEn}
                    onChange={(e) => setCaptionEn(e.target.value)}
                    placeholder="e.g. Winter Campaign 2026 · Monolithic Wool"
                    className="w-full px-3 py-2 text-xs font-mono border border-black/20 focus:border-black focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-black/60 mb-1 font-semibold">
                    Finnish Caption (Optional):
                  </label>
                  <input
                    type="text"
                    value={captionFi}
                    onChange={(e) => setCaptionFi(e.target.value)}
                    placeholder="e.g. Talvikampanja 2026 · Monoliittinen villa"
                    className="w-full px-3 py-2 text-xs font-mono border border-black/20 focus:border-black focus:outline-none"
                  />
                </div>
              </div>

              {/* Focal Alignment Position */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-black/60 mb-1">
                    Desktop Object-Position:
                  </label>
                  <select
                    value={positionDesktop}
                    onChange={(e) => setPositionDesktop(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono border border-black/20 focus:border-black focus:outline-none bg-white"
                  >
                    <option value="center 20%">center 20% (Recommended for Fashion Models)</option>
                    <option value="center 15%">center 15% (High framing)</option>
                    <option value="center center">center center (Neutral)</option>
                    <option value="center top">center top (Focus on Headwear/Collars)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-black/60 mb-1">
                    Mobile Object-Position:
                  </label>
                  <select
                    value={positionMobile}
                    onChange={(e) => setPositionMobile(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono border border-black/20 focus:border-black focus:outline-none bg-white"
                  >
                    <option value="center 15%">center 15% (Mobile Vertical Framing)</option>
                    <option value="center 18%">center 18% (Standard Mobile)</option>
                    <option value="center 25%">center 25% (Lower Framing)</option>
                  </select>
                </div>
              </div>

              {/* Live Preview Inside Modal */}
              {slideSrc && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase tracking-wider text-black/50">
                      Live Hero Frame Preview:
                    </span>
                    <span className="text-[9.5px] font-mono text-black/40">
                      Scale: {slideScale.toFixed(2)}x · Angle: {slideRotation}°
                    </span>
                  </div>
                  <div className="w-full h-44 bg-neutral-100 border border-black/20 overflow-hidden relative flex items-center justify-center">
                    {slideType === 'video' ? (
                      <video
                        src={slideSrc}
                        poster={slidePoster}
                        controls
                        muted
                        className="w-full h-full object-cover"
                        style={{
                          objectPosition: positionDesktop,
                          transform: `scale(${slideScale}) rotate(${slideRotation}deg)`,
                        }}
                      />
                    ) : (
                      <img
                        src={slideSrc || NEUTRAL_PLACEHOLDER_IMG}
                        alt="Preview"
                        className="w-full h-full object-cover transition-transform duration-100"
                        style={{
                          objectPosition: positionDesktop,
                          transform: `scale(${slideScale}) rotate(${slideRotation}deg)`,
                        }}
                        onError={(e) => {
                          (e.target as any).src = NEUTRAL_PLACEHOLDER_IMG;
                        }}
                      />
                    )}
                  </div>
                </div>
              )}

              {/* Buttons */}
              <div className="pt-3 border-t border-black/10 flex items-center justify-between">
                <div>
                  {editingSlideId && (
                    <button
                      type="button"
                      onClick={() => {
                        handleRemoveSlide(editingSlideId);
                        setIsModalOpen(false);
                      }}
                      className="px-3 py-2 text-red-600 hover:bg-red-50 border border-red-200 text-xs uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete Slide</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 border border-black/20 hover:border-black text-black text-xs uppercase tracking-wider cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-black text-white hover:bg-black/80 text-xs uppercase tracking-wider font-semibold cursor-pointer"
                  >
                    {editingSlideId ? 'Save Slide Changes' : 'Add Slide to Carousel'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Frame & Angle Modal for Hero Slide */}
      <ImageFrameAdjusterModal
        isOpen={isSlideAdjusterModalOpen}
        imageUrl={slideSrc || NEUTRAL_PLACEHOLDER_IMG}
        title="Adjust Hero Slide Best Frame & Angle"
        initialFocalX={slideFocalX}
        initialFocalY={slideFocalY}
        initialScale={slideScale}
        initialRotation={slideRotation}
        initialAspectRatio="16/9"
        onClose={() => setIsSlideAdjusterModalOpen(false)}
        onApply={handleApplySlideAdjuster}
        onUploadFile={(dataUrl) => {
          setSlideType('image');
          setSlideSrc(dataUrl);
        }}
        onDeleteImage={handleDeleteSlideImage}
      />
    </div>
  );
};
