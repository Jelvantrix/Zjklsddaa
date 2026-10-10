import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  StoreContent,
  HeroSlide,
  HeroSlideMedia,
  ImageFramingParams,
  JournalArticle,
  MediaAsset,
  NEUTRAL_PLACEHOLDER_IMG,
} from '../../types';
import { useAuth } from '../../supabase/AuthContext';
import { useStorefrontData } from '../../context/StorefrontDataContext';
import { updateStoreContent, logAuditEvent } from '../../supabase/dbService';
import { isDataUrl } from '../../supabase/mediaService';
import { UniversalMediaPickerModal } from '../components/UniversalMediaPickerModal';
import { UniversalImageEditorModal } from '../components/UniversalImageEditorModal';
import { imageFramingStyle } from '../../components/FashionImage';
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
  ChevronLeft,
  ChevronRight,
  GripVertical,
  Monitor,
  Tablet,
  Smartphone,
  Upload,
  Compass,
  RotateCcw,
} from 'lucide-react';

/* ========================================================================== */
/* Helpers                                                                     */
/* ========================================================================== */

/** JSON.stringify with stable key order that drops `undefined` members. */
const stableStringify = (value: unknown): string => {
  if (value === undefined) return 'undefined';
  if (value === null) return 'null';
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    const keys = Object.keys(obj)
      .filter((k) => obj[k] !== undefined)
      .sort();
    return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`).join(',')}}`;
  }
  return JSON.stringify(value) ?? 'undefined';
};

/** Fingerprint of every editable CMS field (id / updatedAt are excluded). */
const contentFingerprint = (c?: StoreContent | null): string =>
  stableStringify(
    c
      ? {
          sectionOrder: c.sectionOrder,
          heroMedia: c.heroMedia,
          heroSlides: c.heroSlides,
          announcementBar: c.announcementBar,
          journalPosts: c.journalPosts,
          translations: c.translations,
        }
      : null
  );

const isVideoUrl = (url?: string): boolean => Boolean(url && /\.(mp4|webm)(\?.*)?$/i.test(url));

const resolveKind = (url: string, asset?: MediaAsset): 'image' | 'video' =>
  asset?.kind || (isVideoUrl(url) ? 'video' : 'image');

/** Recursively rejects any accidental data URL before it can reach the content row. */
const containsDataUrl = (value: unknown): boolean => {
  if (typeof value === 'string') return isDataUrl(value);
  if (Array.isArray(value)) return value.some(containsDataUrl);
  if (value && typeof value === 'object') {
    return Object.values(value as Record<string, unknown>).some(containsDataUrl);
  }
  return false;
};

/** Journal entries carry editor framing inside `content.journalPosts[].framing`. */
type JournalRecord = JournalArticle & { framing?: ImageFramingParams };

const framingSummary = (f?: ImageFramingParams): string =>
  f ? `focal ${f.focalX}%/${f.focalY}% · zoom ${f.zoom}x · ${f.rotation}°` : 'library default';

/* ========================================================================== */
/* Reusable CMS image slot (picker + frame editor + clear + optional poster)    */
/* ========================================================================== */

interface ImageSlotProps {
  label: string;
  value?: string;
  kind?: 'image' | 'video';
  framing?: ImageFramingParams;
  allowedKind?: 'all' | 'image' | 'video';
  allowPoster?: boolean;
  poster?: string;
  onSelect: (url: string, asset?: MediaAsset) => void;
  onFraming?: (framing: ImageFramingParams) => void;
  onClear: () => void;
  onPosterSelect?: (url: string) => void;
  onPosterClear?: () => void;
}

const ImageSlot: React.FC<ImageSlotProps> = ({
  label,
  value,
  kind,
  framing,
  allowedKind = 'image',
  allowPoster = false,
  poster,
  onSelect,
  onFraming,
  onClear,
  onPosterSelect,
  onPosterClear,
}) => {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [posterPickerOpen, setPosterPickerOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);

  const resolvedKind: 'image' | 'video' =
    kind || (value ? (isVideoUrl(value) ? 'video' : 'image') : 'image');

  return (
    <div
      onSubmit={(e) => e.stopPropagation()}
      className="p-3 space-y-2.5"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-small uppercase tracking-wider text-black/60 font-semibold">
          {label}
        </span>
        <span
          className={`text-small uppercase px-1.5 py-0.5 font-semibold ${ resolvedKind ==='video'
              ? 'text-indigo-900'
              : 'text-neutral-800'
          }`}
        >
          {resolvedKind === 'video' ? 'VIDEO' : 'IMAGE'}
        </span>
      </div>

      <div className="flex items-start gap-3">
        {/* Thumbnail */}
        <div className="w-24 h-16 sm:w-28 sm:h-20 shrink-0 bg-white overflow-hidden flex items-center justify-center">
          {value ? (
            resolvedKind === 'video' ? (
              <video
                src={value}
                poster={poster}
                muted
                playsInline
                preload="metadata"
                className="w-full h-full object-cover"
              />
            ) : (
              <img
                src={value}
                alt={label}
                className="w-full h-full object-cover"
                style={framing ? imageFramingStyle(framing, 'heroDesktop') : undefined}
                onError={(e) => {
                  const el = e.currentTarget;
                  if (el.dataset.fallback !== '1') {
                    el.dataset.fallback = '1';
                    el.src = NEUTRAL_PLACEHOLDER_IMG;
                  }
                }}
              />
            )
          ) : (
            <span className="text-small uppercase text-black/40 px-2 text-center leading-tight">
              No media selected
            </span>
          )}
        </div>

        {/* Value + actions */}
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="text-small text-black/50 break-all line-clamp-2">
            {value || 'Empty slot — nothing renders on the storefront.'}
          </div>
          {framing && (
            <div className="text-small text-black/40">
              Framing · {framingSummary(framing)}
            </div>
          )}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              className="px-2.5 py-1 text-small uppercase font-medium text-white transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Upload className="w-3 h-3" />
              <span>Choose / Upload</span>
            </button>
            {value && resolvedKind === 'image' && onFraming && (
              <button
                type="button"
                onClick={() => setEditorOpen(true)}
                className="px-2.5 py-1 text-small uppercase hover:text-white transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Compass className="w-3 h-3" />
                <span>Adjust Frame</span>
              </button>
            )}
            {value && (
              <button
                type="button"
                onClick={onClear}
                className="px-2 py-1 text-small uppercase text-red-600 transition-colors cursor-pointer flex items-center gap-1"
              >
                <Trash2 className="w-3 h-3" />
                <span>Clear</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Poster (video slots only) */}
      {allowPoster && resolvedKind === 'video' && (
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
          <span className="text-small uppercase tracking-wider text-black/60">
            Video poster image (optional)
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setPosterPickerOpen(true)}
              className="px-2 py-1 text-small uppercase flex items-center gap-1 cursor-pointer"
            >
              <Upload className="w-2.5 h-2.5" />
              <span>{poster ? 'Replace Poster' : 'Choose Poster'}</span>
            </button>
            {poster && (
              <button
                type="button"
                onClick={onPosterClear}
                className="p-1 text-red-600 cursor-pointer"
                title="Clear poster"
                aria-label={`Clear poster image for ${label}`}
              >
                <Trash2 className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Media picker (device upload / library / https link) */}
      <UniversalMediaPickerModal
        isOpen={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={(url, asset) => {
          onSelect(url, asset);
          setPickerOpen(false);
        }}
        title={label}
        allowedKind={allowedKind}
        currentUrl={value}
      />

      {allowPoster && (
        <UniversalMediaPickerModal
          isOpen={posterPickerOpen}
          onClose={() => setPosterPickerOpen(false)}
          onSelect={(url) => {
            onPosterSelect?.(url);
            setPosterPickerOpen(false);
          }}
          title={`${label} · poster`}
          allowedKind="image"
          currentUrl={poster}
        />
      )}

      {/* Non-destructive frame / angle editor */}
      {editorOpen && value && onFraming && (
        <UniversalImageEditorModal
          isOpen
          imageUrl={value}
          title={`Frame calibration · ${label}`}
          initialFraming={framing}
          onClose={() => setEditorOpen(false)}
          onApply={(framingResult) => {
            onFraming(framingResult);
            setEditorOpen(false);
          }}
        />
      )}
    </div>
  );
};

/* ========================================================================== */
/* Preview device presets (inline scaled frame widths, no iframe)              */
/* ========================================================================== */

const PREVIEW_DEVICES = [
  { id: 'desktop', label: 'Desktop', width: 1920, Icon: Monitor },
  { id: 'tablet', label: 'Tablet', width: 834, Icon: Tablet },
  { id: 'mobile', label: 'Mobile', width: 390, Icon: Smartphone },
] as const;

type PreviewDeviceId = (typeof PREVIEW_DEVICES)[number]['id'];

/* ========================================================================== */
/* View                                                                        */
/* ========================================================================== */

interface AdminContentViewProps {
  content: StoreContent;
  onRefresh: () => void;
}

type TabId = 'hero' | 'sections' | 'announcement' | 'journal' | 'story';

export const AdminContentView: React.FC<AdminContentViewProps> = ({ content, onRefresh }) => {
  const { isEditor, adminProfile } = useAuth();
  const { updateStoreContentLocal } = useStorefrontData();

  /* ------------------------------ Draft state ----------------------------- */
  const [formData, setFormData] = useState<StoreContent>(content);
  const [savedSnapshot, setSavedSnapshot] = useState<StoreContent>(content);
  const [activeTab, setActiveTab] = useState<TabId>('hero');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [discardSuccess, setDiscardSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const heroSlides: HeroSlide[] = formData.heroSlides || [];

  const draftFingerprint = useMemo(() => contentFingerprint(formData), [formData]);
  const savedFingerprint = useMemo(() => contentFingerprint(savedSnapshot), [savedSnapshot]);
  const isDirty = draftFingerprint !== savedFingerprint;

  const isDirtyRef = useRef(false);
  useEffect(() => {
    isDirtyRef.current = isDirty;
  }, [isDirty]);

  /**
   * Realtime (`subscribeToContent`) echo. The latest server payload is always
   * adopted as the published snapshot; the local draft is only replaced when
   * there is nothing unsaved, so optimistic state never fights the channel.
   */
  useEffect(() => {
    setSavedSnapshot(content);
    if (!isDirtyRef.current) {
      setFormData(content);
    }
  }, [content]);

  /* --------------------------- Unsaved changes ---------------------------- */
  useEffect(() => {
    if (!isDirty) return;
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  const handleSelectTab = (tab: TabId) => {
    if (tab === activeTab) return;
    if (
      isDirty &&
      !window.confirm(
        'You have unsaved CMS changes. They do not reach the storefront until you press "Publish to Storefront". Switch section anyway?'
      )
    ) {
      return;
    }
    setActiveTab(tab);
  };

  /* ---------------------------- Slide modal state ------------------------- */
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSlideId, setEditingSlideId] = useState<string | null>(null);

  const [slideDesktop, setSlideDesktop] = useState<HeroSlideMedia | null>(null);
  const [slideMobile, setSlideMobile] = useState<HeroSlideMedia | null>(null);
  const [captionEn, setCaptionEn] = useState('');
  const [captionFi, setCaptionFi] = useState('');
  const [slideLinkUrl, setSlideLinkUrl] = useState('');
  const [slideEnabled, setSlideEnabled] = useState(true);
  const [slideFormError, setSlideFormError] = useState<string | null>(null);

  /* ------------------------ Drag & reorder state -------------------------- */
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const html5DragIdRef = useRef<string | null>(null);
  const pointerDragIdRef = useRef<string | null>(null);
  const pointerDragCleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    return () => {
      pointerDragCleanupRef.current?.();
    };
  }, []);

  // Deletion confirmation
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Interactive Live Preview in Admin
  const [previewIndex, setPreviewIndex] = useState(0);
  const [previewDevice, setPreviewDevice] = useState<PreviewDeviceId>('desktop');

  useEffect(() => {
    if (heroSlides.length > 0 && previewIndex >= heroSlides.length) {
      setPreviewIndex(heroSlides.length - 1);
    }
  }, [heroSlides.length, previewIndex]);

  /* --------------------------- Draft mutations ---------------------------- */

  const updateHeroSlides = (next: HeroSlide[] | ((prev: HeroSlide[]) => HeroSlide[])) => {
    setFormData((prev) => {
      const list = prev.heroSlides || [];
      const resolved = typeof next === 'function' ? next(list) : next;
      return { ...prev, heroSlides: resolved };
    });
  };

  const moveSlideToId = (draggedId: string, targetId: string) => {
    updateHeroSlides((list) => {
      const from = list.findIndex((s) => s.id === draggedId);
      const to = list.findIndex((s) => s.id === targetId);
      if (from < 0 || to < 0 || from === to) return list;
      const copy = [...list];
      const [moved] = copy.splice(from, 1);
      copy.splice(to, 0, moved);
      return copy;
    });
  };

  const reorderSlides = (from: number, to: number) => {
    updateHeroSlides((list) => {
      if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) return list;
      const copy = [...list];
      const [moved] = copy.splice(from, 1);
      copy.splice(to, 0, moved);
      return copy;
    });
  };

  /* HTML5 drag-and-drop reorder (mouse) */
  const handleRowDragStart = (e: React.DragEvent, slideId: string) => {
    const target = e.target as HTMLElement;
    if (target.closest('button, a, input, select, textarea')) {
      e.preventDefault();
      return;
    }
    html5DragIdRef.current = slideId;
    e.dataTransfer.effectAllowed = 'move';
    try {
      e.dataTransfer.setData('text/plain', slideId);
    } catch {
      /* browsers that block dataTransfer in dragstart */
    }
    setDraggingId(slideId);
  };

  const handleRowDragOver = (e: React.DragEvent, slideId: string) => {
    if (!html5DragIdRef.current) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverId !== slideId) setDragOverId(slideId);
  };

  const handleRowDrop = (e: React.DragEvent, slideId: string) => {
    e.preventDefault();
    const from = html5DragIdRef.current;
    html5DragIdRef.current = null;
    setDraggingId(null);
    setDragOverId(null);
    if (from && from !== slideId) moveSlideToId(from, slideId);
  };

  const handleRowDragEnd = () => {
    html5DragIdRef.current = null;
    setDraggingId(null);
    setDragOverId(null);
  };

  /* Pointer-based reorder via the grip handle (mouse + touch friendly) */
  const handleGripPointerDown = (e: React.PointerEvent<HTMLButtonElement>, slideId: string) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.preventDefault();
    pointerDragCleanupRef.current?.();
    pointerDragIdRef.current = slideId;
    setDraggingId(slideId);

    const handleMove = (ev: PointerEvent) => {
      const dragged = pointerDragIdRef.current;
      if (!dragged) return;
      const under = document.elementFromPoint(ev.clientX, ev.clientY) as HTMLElement | null;
      const row = under?.closest('[data-slide-id]') as HTMLElement | null;
      const targetId = row?.getAttribute('data-slide-id');
      if (!targetId || targetId === dragged) {
        setDragOverId(null);
        return;
      }
      setDragOverId(targetId);
      moveSlideToId(dragged, targetId);
    };

    const handleEnd = () => {
      pointerDragIdRef.current = null;
      setDraggingId(null);
      setDragOverId(null);
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleEnd);
      window.removeEventListener('pointercancel', handleEnd);
      pointerDragCleanupRef.current = null;
    };

    pointerDragCleanupRef.current = handleEnd;
    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleEnd);
    window.addEventListener('pointercancel', handleEnd);
  };

  /* ------------------------------ Slide modal ----------------------------- */

  const normalizeMedia = (m: HeroSlideMedia | null | undefined): HeroSlideMedia | undefined => {
    if (!m) return undefined;
    const url = m.url.trim();
    if (!url) return undefined;
    return { ...m, url };
  };

  const handleOpenAddModal = () => {
    setEditingSlideId(null);
    setSlideDesktop(null);
    setSlideMobile(null);
    setCaptionEn('');
    setCaptionFi('');
    setSlideLinkUrl('');
    setSlideEnabled(true);
    setSlideFormError(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (slide: HeroSlide) => {
    setEditingSlideId(slide.id);
    setSlideDesktop(normalizeMedia(slide.desktopMedia || null) || null);
    setSlideMobile(normalizeMedia(slide.mobileMedia || null) || null);
    setCaptionEn(slide.caption?.en || '');
    setCaptionFi(slide.caption?.fi || '');
    setSlideLinkUrl(slide.linkUrl || '');
    setSlideEnabled(slide.enabled !== false);
    setSlideFormError(null);
    setIsModalOpen(true);
  };

  /** Save new or edited slide into the local draft (published via Save bar). */
  const handleSaveSlideModal = (e: React.FormEvent) => {
    e.preventDefault();

    const desktop = normalizeMedia(slideDesktop);
    const mobile = normalizeMedia(slideMobile);

    if (!desktop && !mobile) {
      setSlideFormError('Choose media for the desktop slot, the mobile slot, or both.');
      return;
    }
    if (containsDataUrl(desktop) || containsDataUrl(mobile)) {
      setSlideFormError(
        'Base64 data URLs are never written to the content row. Upload the file to the media library instead.'
      );
      return;
    }

    const link = slideLinkUrl.trim();
    if (link && !link.startsWith('https://') && !link.startsWith('/')) {
      setSlideFormError('The link must begin with https:// or be a path beginning with "/".');
      return;
    }

    const existing = editingSlideId ? heroSlides.find((s) => s.id === editingSlideId) : undefined;
    const primary = desktop || mobile;
    const primaryFraming = desktop?.framing || mobile?.framing;
    const positionFrom = (f?: ImageFramingParams) => (f ? `${f.focalX}% ${f.focalY}%` : undefined);

    const nextSlide: HeroSlide = {
      ...(existing || {}),
      id: existing?.id || `slide-${Date.now()}`,
      type: primary?.kind === 'video' ? 'video' : 'image',
      src: primary?.url || '',
      poster: primary?.poster || undefined,
      positionDesktop:
        positionFrom(desktop?.framing) || existing?.positionDesktop || 'center 20%',
      positionMobile: positionFrom(mobile?.framing) || existing?.positionMobile || 'center 15%',
      scale: primaryFraming?.zoom ?? existing?.scale ?? 1.0,
      rotation: primaryFraming?.rotation ?? existing?.rotation ?? 0,
      focalX: primaryFraming?.focalX ?? existing?.focalX ?? 50,
      focalY: primaryFraming?.focalY ?? existing?.focalY ?? 20,
      caption: {
        fi: captionFi.trim() || captionEn.trim(),
        en: captionEn.trim(),
        sv: captionEn.trim(),
      },
      enabled: slideEnabled,
      desktopMedia: desktop,
      mobileMedia: mobile,
      framing: existing?.framing,
      linkUrl: link || undefined,
    };

    if (editingSlideId) {
      updateHeroSlides((list) => list.map((s) => (s.id === editingSlideId ? nextSlide : s)));
    } else {
      updateHeroSlides((list) => [...list, nextSlide]);
    }

    setIsModalOpen(false);
  };

  const handleRemoveSlide = (slideId: string) => {
    if (heroSlides.length <= 1) {
      alert('The hero carousel requires at least 1 active slide or video.');
      setDeleteConfirmId(null);
      return;
    }
    updateHeroSlides((list) => list.filter((s) => s.id !== slideId));
    setDeleteConfirmId(null);
  };

  const toggleSlideEnabled = (slideId: string) => {
    updateHeroSlides((list) =>
      list.map((s) => (s.id === slideId ? { ...s, enabled: s.enabled === false } : s))
    );
  };

  /** Up / Down buttons — keyboard accessible fallback to drag-and-drop. */
  const handleMoveSlide = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= heroSlides.length) return;
    reorderSlides(index, targetIdx);
  };

  /* ----------------------------- CMS slots ------------------------------- */

  const setTranslationValue = (key: string, value: unknown) => {
    setFormData((prev) => ({
      ...prev,
      translations: { ...(prev.translations || {}), [key]: value },
    }));
  };

  const updateJournalPost = (postId: string, patch: Partial<JournalRecord>) => {
    setFormData((prev) => ({
      ...prev,
      journalPosts: (prev.journalPosts || []).map((p) =>
        p.id === postId ? { ...p, ...patch } : p
      ),
    }));
  };

  /* -------------------------- Homepage sections -------------------------- */

  // Quick asset presets for studio quality
  const defaultSections = [
    { id: 'latest_drop', label: 'Section 01: Latest Archival Drop' },
    { id: 'categories_mosaic', label: 'Section 02: Architectural Categories Mosaic' },
    { id: 'craft_narrative', label: 'Section 03: Nordic Craft & Materials Manifesto' },
    { id: 'featured_pieces', label: 'Section 04: Curated Core Highlights Carousel' },
    { id: 'winter_lookbook', label: 'Section 05: Editorial Winter Campaign Banner' },
    { id: 'journal_archive', label: 'Section 06: Quiet Nordic Studio Journal' },
  ];

  const handleMoveSection = (index: number, direction: 'up' | 'down') => {
    const sections = [...(formData.sectionOrder || defaultSections.map((s) => s.id))];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= sections.length) return;

    const temp = sections[index];
    sections[index] = sections[targetIdx];
    sections[targetIdx] = temp;

    setFormData((prev) => ({ ...prev, sectionOrder: sections }));
  };

  /* ------------------------------ Save / Discard -------------------------- */

  const handleSaveAllContent = async () => {
    if (!isEditor || isSaving) return;
    setIsSaving(true);
    setSaveError(null);
    try {
      const updated: StoreContent = {
        ...formData,
        updatedAt: new Date().toISOString(),
      };

      if (containsDataUrl(updated)) {
        throw new Error(
          'Base64 data URLs cannot be published. Choose the file from the media library instead.'
        );
      }

      await updateStoreContent(updated);
      updateStoreContentLocal(updated);

      setFormData(updated);
      setSavedSnapshot(updated);

      await logAuditEvent(
        adminProfile?.name || 'admin',
        'STOREFRONT_CMS_UPDATED',
        'homepage',
        {
          sections: updated.sectionOrder,
          slidesCount: updated.heroSlides?.length || 0,
        }
      );

      setSaveSuccess(true);
      window.setTimeout(() => setSaveSuccess(false), 3000);
      onRefresh();
    } catch (err) {
      console.warn('Content save error:', err);
      setSaveError(
        (err as Error)?.message || 'Publishing failed. Your edits stay in draft.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleDiscardChanges = () => {
    if (isSaving) return;
    setFormData(savedSnapshot);
    setSaveError(null);
    setSaveSuccess(false);
    setDiscardSuccess(true);
    window.setTimeout(() => setDiscardSuccess(false), 2500);
  };

  /* ------------------------------- Preview ------------------------------- */

  const currentPreviewSlide = heroSlides[previewIndex] || heroSlides[0];
  const isPreviewMobile = previewDevice === 'mobile';
  const previewMedia = currentPreviewSlide
    ? isPreviewMobile
      ? currentPreviewSlide.mobileMedia || currentPreviewSlide.desktopMedia
      : currentPreviewSlide.desktopMedia || currentPreviewSlide.mobileMedia
    : undefined;
  const previewKind: 'image' | 'video' = previewMedia
    ? previewMedia.kind || (isVideoUrl(previewMedia.url) ? 'video' : 'image')
    : (currentPreviewSlide?.type === 'video' ? 'video' : 'image');
  const previewUrl = previewMedia?.url || currentPreviewSlide?.src || '';
  const previewPoster = previewMedia?.poster || currentPreviewSlide?.poster;
  const previewFraming = previewMedia?.framing || currentPreviewSlide?.framing;
  const previewStyle = imageFramingStyle(
    previewFraming,
    isPreviewMobile ? 'heroMobile' : 'heroDesktop',
    isPreviewMobile
      ? currentPreviewSlide?.positionMobile
      : currentPreviewSlide?.positionDesktop,
    {
      scale: currentPreviewSlide?.scale,
      rotation: currentPreviewSlide?.rotation,
    }
  );

  return (
    <div className="space-y-6">
      {/* Title & Save Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="font-serif text-title sm:text-display font-normal">Storefront CMS & Hero Media</h1>
            {saveSuccess && (
              <span className="flex items-center gap-1 text-small text-emerald-700 px-2 py-0.5">
                <Check className="w-3 h-3" /> Live on Storefront
              </span>
            )}
            {discardSuccess && !saveSuccess && (
              <span className="flex items-center gap-1 text-small text-black/60 px-2 py-0.5">
                <RotateCcw className="w-3 h-3" /> Draft reverted
              </span>
            )}
            {isDirty && (
              <span className="flex items-center gap-1.5 text-small text-black px-2 py-0.5">
                <span className="w-1.5 h-1.5 animate-pulse" />
                Unsaved changes
              </span>
            )}
          </div>
          <p className="text-small text-black/50 mt-0.5">
            Draft edits stay private until you publish. Centrally manage hero video/slides carousel, narrative pacing, and announcement ticker.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleDiscardChanges}
            disabled={!isDirty || isSaving}
            className="text-small uppercase tracking-wider text-black px-4 py-2 cursor-pointer flex items-center gap-2 font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Discard changes</span>
          </button>
          <button
            type="button"
            onClick={handleSaveAllContent}
            disabled={isSaving || !isDirty}
            title={!isEditor ? 'Editor role required to publish' : undefined}
            className="text-small uppercase tracking-wider text-white px-4 py-2 cursor-pointer flex items-center gap-2 font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaving ? 'Publishing...' : 'Publish to Storefront'}</span>
          </button>
        </div>
      </div>

      {saveError && (
        <div className="p-2.5 text-red-700 text-small" role="alert">
          {saveError}
        </div>
      )}

      {/* Tabs */}
      <div className="flex text-small uppercase tracking-wider overflow-x-auto">
        {[
          { id: 'hero', label: `1. Hero Slides & Videos (${heroSlides.length})` },
          { id: 'sections', label: '2. Homepage Sections Order' },
          { id: 'announcement', label: '3. Announcement Ticker' },
          { id: 'journal', label: '4. Editorial Journal' },
          { id: 'story', label: '5. Story Page Plates' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleSelectTab(tab.id as TabId)}
            className={`px-4 py-2.5 transition-colors cursor-pointer shrink-0 ${ activeTab === tab.id ?'font-bold text-black'
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
        <div className="space-y-8 text-small">
          {/* Hero Management Notice */}
          <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="font-semibold text-black text-small uppercase tracking-wider">
                Hero Video & Slide Management Studio
              </p>
              <p className="text-small text-black/60 mt-0.5">
                Drag the grip (or use the arrows) to reorder, toggle slides on or off, and give every slide its own desktop and mobile media. Nothing reaches the storefront until you press Publish to Storefront.
              </p>
            </div>
            <button
              type="button"
              onClick={handleOpenAddModal}
              className="px-3.5 py-2 text-white transition-colors cursor-pointer flex items-center gap-1.5 shrink-0 text-small uppercase tracking-wider font-medium"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Slide or Video</span>
            </button>
          </div>

          {/* Interactive Live Hero Preview Widget */}
          <div className="bg-white p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 animate-pulse" />
                <span className="text-small font-semibold uppercase tracking-wider text-black">
                  Interactive Live Carousel Preview
                </span>
                <span className="text-small text-black/40">
                  {heroSlides.length > 0
                    ? `(Slide ${previewIndex + 1} of ${heroSlides.length})`
                    : '(No slides in draft)'}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={heroSlides.length < 2}
                  onClick={() => setPreviewIndex((prev) => (prev - 1 + heroSlides.length) % heroSlides.length)}
                  className="p-1.5 text-black cursor-pointer transition-colors disabled:opacity-25"
                  title="Previous Slide"
                  aria-label="Previous Slide"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  disabled={heroSlides.length < 2}
                  onClick={() => setPreviewIndex((prev) => (prev + 1) % heroSlides.length)}
                  className="p-1.5 text-black cursor-pointer transition-colors disabled:opacity-25"
                  title="Next Slide"
                  aria-label="Next Slide"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Preview device toggle: 1920 / 834 / 390 px inline frames */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5" role="group" aria-label="Preview device width">
                <span className="text-small uppercase tracking-wider text-black/50 mr-1">
                  Preview:
                </span>
                {PREVIEW_DEVICES.map((device) => (
                  <button
                    key={device.id}
                    type="button"
                    onClick={() => setPreviewDevice(device.id)}
                    aria-pressed={previewDevice === device.id}
                    className={`px-2.5 py-1 text-small uppercase flex items-center gap-1.5 cursor-pointer transition-colors ${ previewDevice === device.id ?'text-white'
                        : 'bg-white text-black/60 hover:text-black'
                    }`}
                  >
                    <device.Icon className="w-3 h-3" />
                    <span>
                      {device.label} · {device.width}px
                    </span>
                  </button>
                ))}
              </div>
              <span className="text-small text-black/40">
                Scroll horizontally to inspect the full frame
              </span>
            </div>

            {/* Simulated Hero Viewport (fixed-width frame inside an overflow container) */}
            <div className="w-full overflow-x-auto">
              <div
                style={{
                  width: PREVIEW_DEVICES.find((d) => d.id === previewDevice)?.width || 1920,
                  height: 480,
                }}
                className="relative bg-white overflow-hidden"
              >
                {previewUrl ? (
                  previewKind === 'video' ? (
                    <video
                      key={`${currentPreviewSlide?.id || 'preview'}-${previewDevice}`}
                      src={previewUrl}
                      poster={previewPoster}
                      autoPlay
                      muted
                      loop
                      playsInline
                      className="w-full h-full object-cover"
                      style={previewStyle}
                    />
                  ) : (
                    <img
                      key={`${currentPreviewSlide?.id || 'preview'}-${previewDevice}`}
                      src={previewUrl}
                      alt={currentPreviewSlide?.caption?.en || 'Hero Preview'}
                      className="w-full h-full object-cover"
                      style={previewStyle}
                      onError={(e) => {
                        const el = e.currentTarget;
                        if (el.dataset.fallback !== '1') {
                          el.dataset.fallback = '1';
                          el.src = NEUTRAL_PLACEHOLDER_IMG;
                        }
                      }}
                    />
                  )
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-small uppercase tracking-widest text-black/40">
                    No media configured for this slide
                  </div>
                )}

                {/* Overlay slide label */}
                <div className="absolute top-3 left-3 text-white px-2 py-0.5 text-small uppercase tracking-widest flex items-center gap-1.5">
                  {previewKind === 'video' ? (
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
                  <span className="text-white/60">· {previewDevice.toUpperCase()}</span>
                </div>

                {/* Bottom counter overlay */}
                <div className="absolute bottom-3 left-3 backdrop-blur-xs px-2.5 py-1 text-small">
                  <span className="font-bold text-black">
                    {String(Math.min(previewIndex + 1, Math.max(heroSlides.length, 1))).padStart(2, '0')}
                  </span>
                  <span className="text-black/40"> / </span>
                  <span className="text-black/60">
                    {String(heroSlides.length).padStart(2, '0')}
                  </span>
                  <span className="text-black/30"> · </span>
                  <span className="text-black/70 uppercase">
                    {currentPreviewSlide?.caption?.en || 'Atelier Campaign'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Active Hero Slides List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-2">
              <span className="text-small uppercase font-semibold text-black tracking-wider">
                Configured Hero Carousel Slides ({heroSlides.length})
              </span>
              <span className="text-small text-black/50">
                Drag the grip or use Up / Down — order determines storefront sequence
              </span>
            </div>

            <div className="space-y-3">
              {heroSlides.map((slide, idx) => {
                const thumbMedia = slide.desktopMedia || slide.mobileMedia;
                const thumbUrl = thumbMedia?.url || slide.src;
                const thumbKind =
                  thumbMedia?.kind || (isVideoUrl(thumbUrl) ? 'video' : slide.type === 'video' ? 'video' : 'image');
                const isEnabled = slide.enabled !== false;

                return (
                  <div
                    key={slide.id}
                    data-slide-id={slide.id}
                    draggable
                    onDragStart={(e) => handleRowDragStart(e, slide.id)}
                    onDragOver={(e) => handleRowDragOver(e, slide.id)}
                    onDrop={(e) => handleRowDrop(e, slide.id)}
                    onDragEnd={handleRowDragEnd}
                    className={`p-3.5 sm:p-4 transition-colors bg-white flex flex-col md:flex-row md:items-start justify-between gap-4 cursor-grab active:cursor-grabbing ${ dragOverId === slide.id ? 'opacity-50'
                        : previewIndex === idx
                          ? ''
                          : ''
                    }${draggingId === slide.id ? ' opacity-60' : ''}`}
                  >
                    {/* Left: Grip, Thumbnail & Details */}
                    <div className="flex items-start gap-3 min-w-0">
                      {/* Drag handle (mouse + touch reorder) */}
                      <button
                        type="button"
                        aria-label={`Reorder slide ${idx + 1} of ${heroSlides.length}. Drag, or use the Move Up and Move Down buttons.`}
                        title="Drag to reorder"
                        onPointerDown={(e) => handleGripPointerDown(e, slide.id)}
                        className="p-1 -ml-1 text-black/35 hover:text-black cursor-grab active:cursor-grabbing touch-none select-none shrink-0"
                      >
                        <GripVertical className="w-4 h-4" />
                      </button>

                      {/* Thumbnail preview */}
                      <div className="w-20 h-20 sm:w-24 sm:h-24 shrink-0 overflow-hidden relative flex items-center justify-center">
                        {thumbUrl ? (
                          thumbKind === 'video' ? (
                            <>
                              <video
                                src={thumbUrl}
                                poster={slide.poster || thumbMedia?.poster}
                                muted
                                playsInline
                                preload="metadata"
                                className="w-full h-full object-cover"
                              />
                              <div className="absolute inset-0 flex items-center justify-center">
                                <Video className="w-5 h-5 text-black" />
                              </div>
                            </>
                          ) : (
                            <img
                              src={thumbUrl}
                              alt={slide.caption?.en || 'Slide'}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                const el = e.currentTarget;
                                if (el.dataset.fallback !== '1') {
                                  el.dataset.fallback = '1';
                                  el.src = NEUTRAL_PLACEHOLDER_IMG;
                                }
                              }}
                            />
                          )
                        ) : (
                          <span className="text-small uppercase text-black/40 px-2 text-center">
                            Empty slot
                          </span>
                        )}
                        <span className="absolute bottom-1 right-1 text-white text-[8.5px] px-1 uppercase font-bold">
                          {String(idx + 1).padStart(2, '0')}
                        </span>
                      </div>

                      {/* Metadata */}
                      <div className="space-y-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`text-small uppercase px-1.5 py-0.5 font-semibold ${ slide.type ==='video'
                                ? 'text-indigo-900'
                                : 'text-neutral-800'
                            }`}
                          >
                            {slide.type === 'video' ? 'VIDEO (.MP4)' : 'STUDIO PHOTO'}
                          </span>
                          <span className="text-small uppercase px-1.5 py-0.5 font-semibold bg-white text-black/70">
                            Desktop: {(slide.desktopMedia?.kind || 'empty').toUpperCase()}
                          </span>
                          <span className="text-small uppercase px-1.5 py-0.5 font-semibold bg-white text-black/70">
                            Mobile: {(slide.mobileMedia?.kind || 'empty').toUpperCase()}
                          </span>
                          <button
                            type="button"
                            role="switch"
                            aria-checked={isEnabled}
                            aria-label={`${isEnabled ? 'Disable' : 'Enable'} slide ${idx + 1}`}
                            onClick={() => toggleSlideEnabled(slide.id)}
                            className={`px-2 py-0.5 text-small uppercase font-semibold flex items-center gap-1.5 cursor-pointer transition-colors ${ isEnabled ?'text-white'
                                : 'bg-white text-black/60'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 ${isEnabled ?'bg-white' : ''}`}
                            />
                            <span>{isEnabled ? 'Enabled' : 'Disabled'}</span>
                          </button>
                          <span className="text-small text-black/40">ID: {slide.id}</span>
                        </div>

                        <h4 className="font-semibold text-black text-small">
                          {slide.caption?.en || 'Untitled Campaign Slide'}
                        </h4>

                        <div className="text-small text-black/50 break-all line-clamp-1 max-w-md">
                          Desktop: {slide.desktopMedia?.url || '—'}
                        </div>
                        <div className="text-small text-black/50 break-all line-clamp-1 max-w-md">
                          Mobile: {slide.mobileMedia?.url || '—'}
                        </div>

                        {slide.type === 'video' && (slide.desktopMedia?.poster || slide.mobileMedia?.poster || slide.poster) && (
                          <div className="text-small text-black/40 break-all line-clamp-1 max-w-md">
                            Poster: {slide.desktopMedia?.poster || slide.mobileMedia?.poster || slide.poster}
                          </div>
                        )}

                        <div className="text-small text-black/40">
                          Framing: Desktop ({framingSummary(slide.desktopMedia?.framing)}) · Mobile (
                          {framingSummary(slide.mobileMedia?.framing)})
                        </div>

                        <div className="text-small text-black/40">
                          Legacy positions: Desktop ({slide.positionDesktop || 'center 20%'}) · Mobile (
                          {slide.positionMobile || 'center 15%'})
                        </div>

                        {slide.linkUrl && (
                          <div className="text-small text-black/40 break-all line-clamp-1 max-w-md">
                            Link: {slide.linkUrl}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-2 self-end md:self-center shrink-0 flex-wrap">
                      <button
                        type="button"
                        onClick={() => {
                          setPreviewIndex(idx);
                          setPreviewDevice('desktop');
                        }}
                        className="px-2.5 py-1.5 text-black text-small cursor-pointer transition-colors flex items-center gap-1"
                        title="Preview this slide"
                      >
                        <Eye className="w-3 h-3" />
                        <span className="hidden sm:inline">Preview</span>
                      </button>

                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => handleMoveSlide(idx, 'up')}
                        className="p-1.5 text-black cursor-pointer transition-colors disabled:opacity-25"
                        title="Move Up"
                        aria-label={`Move slide ${idx + 1} up`}
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        disabled={idx === heroSlides.length - 1}
                        onClick={() => handleMoveSlide(idx, 'down')}
                        className="p-1.5 text-black cursor-pointer transition-colors disabled:opacity-25"
                        title="Move Down"
                        aria-label={`Move slide ${idx + 1} down`}
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(slide)}
                        className="px-2.5 py-1.5 text-black text-small cursor-pointer transition-colors flex items-center gap-1"
                      >
                        <Edit2 className="w-3 h-3" />
                        <span>Edit</span>
                      </button>

                      {deleteConfirmId === slide.id ? (
                        <div className="flex items-center gap-1 p-1">
                          <button
                            type="button"
                            onClick={() => handleRemoveSlide(slide.id)}
                            className="px-2 py-1 text-white text-small font-bold cursor-pointer"
                          >
                            Confirm
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmId(null)}
                            className="px-1.5 py-1 text-black/60 hover:text-black text-small cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setDeleteConfirmId(slide.id)}
                          className="p-1.5 text-red-600 cursor-pointer transition-colors"
                          title="Remove Slide from Hero"
                          aria-label={`Remove slide ${idx + 1}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Actions for Hero Carousel */}
          <div className="p-4 flex items-center justify-between gap-3 flex-wrap">
            <span className="text-small uppercase font-medium text-black/70">
              {heroSlides.length === 0
                ? 'No slides in carousel'
                : `${heroSlides.length} slide(s) in carousel · ${
                    heroSlides.filter((s) => s.enabled !== false).length
                  } enabled`}
            </span>
            <button
              type="button"
              onClick={handleOpenAddModal}
              className="px-4 py-2 text-white text-small uppercase tracking-wider font-semibold flex items-center gap-1.5 cursor-pointer"
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
        <div className="space-y-4 max-w-2xl text-small">
          <p className="text-black/60 text-small">
            Reorder homepage narrative sections. Changes reflect live on the storefront upon saving.
          </p>

          <div className="bg-white">
            {(formData.sectionOrder || defaultSections.map((s) => s.id)).map((secId, idx, arr) => {
              const info = defaultSections.find((s) => s.id === secId) || { label: secId };
              return (
                <div key={secId} className="p-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-small text-black/40">0{idx + 1}</span>
                    <span className="font-medium text-black">{info.label}</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      disabled={idx === 0}
                      onClick={() => handleMoveSection(idx, 'up')}
                      className="text-small uppercase text-black hover:opacity-60 underline cursor-pointer disabled:opacity-20"
                    >
                      Up
                    </button>
                    <span className="text-black/20">/</span>
                    <button
                      disabled={idx === arr.length - 1}
                      onClick={() => handleMoveSection(idx, 'down')}
                      className="text-small uppercase text-black hover:opacity-60 underline cursor-pointer disabled:opacity-20"
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
      {/* TAB 3: ANNOUNCEMENT TICKER (text only — no image slot exists)  */}
      {/* ============================================================== */}
      {activeTab === 'announcement' && (
        <div className="space-y-6 max-w-2xl text-small">
          <div>
            <label className="block text-small uppercase text-black/50 mb-1">Announcement Ticker Text (English)</label>
            <input
              type="text"
              value={formData.announcementBar?.en || ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  announcementBar: { ...formData.announcementBar, en: e.target.value },
                })
              }
              className="w-full px-3 py-2 text-small bg-transparent"
            />
          </div>

          <div>
            <label className="block text-small uppercase text-black/50 mb-1">Announcement Ticker Text (Finnish - Optional)</label>
            <input
              type="text"
              value={formData.announcementBar?.fi || ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  announcementBar: { ...formData.announcementBar, fi: e.target.value },
                })
              }
              className="w-full px-3 py-2 text-small bg-transparent"
            />
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 4: JOURNAL POSTS (editable cover image + framing)          */}
      {/* ============================================================== */}
      {activeTab === 'journal' && (
        <div className="space-y-4 text-small">
          <p className="text-black/60 text-small">
            Archival articles and editorial journals published to the community feed. Clearing a cover removes the image from the storefront article entirely.
          </p>

          <div className="bg-white">
            {(formData.journalPosts || []).map((post) => {
              const record = post as JournalRecord;
              return (
                <div key={post.id} className="p-4 flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="font-semibold text-black">{post.title.en || post.title.fi}</div>
                    <div className="text-small text-black/40">
                      {post.date} · {post.readTime} · Tag: {post.tag}
                    </div>
                    <div className="mt-2">
                      <span className="text-small uppercase text-emerald-700 px-2 py-0.5">
                        Live
                      </span>
                    </div>
                  </div>

                  <div className="w-full lg:w-[26rem] shrink-0">
                    <ImageSlot
                      label="Journal cover image"
                      value={record.image}
                      framing={record.framing}
                      allowedKind="image"
                      onSelect={(url, asset) =>
                        updateJournalPost(post.id, { image: url, framing: asset?.framing })
                      }
                      onFraming={(f) => updateJournalPost(post.id, { framing: f })}
                      onClear={() => updateJournalPost(post.id, { image: '', framing: undefined })}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 5: STORY PAGE PLATES                                       */}
      {/* ============================================================== */}
      {activeTab === 'story' && (
        <div className="space-y-6 max-w-3xl text-small">
          <p className="text-black/60 text-small">
            Image slots for the Story page. Every slot is optional — an empty slot renders nothing on the storefront.
          </p>

          <ImageSlot
            label="Story hero image (wide)"
            value={formData.translations?.storyHeroImage || ''}
            framing={formData.translations?.storyHeroFraming}
            allowedKind="image"
            onSelect={(url, asset) => {
              setTranslationValue('storyHeroImage', url);
              setTranslationValue('storyHeroFraming', asset?.framing);
            }}
            onFraming={(f) => setTranslationValue('storyHeroFraming', f)}
            onClear={() => {
              setTranslationValue('storyHeroImage', '');
              setTranslationValue('storyHeroFraming', undefined);
            }}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ImageSlot
              label="Story plate I"
              value={formData.translations?.storyPlate1 || ''}
              framing={formData.translations?.storyPlate1Framing}
              allowedKind="image"
              onSelect={(url, asset) => {
                setTranslationValue('storyPlate1', url);
                setTranslationValue('storyPlate1Framing', asset?.framing);
              }}
              onFraming={(f) => setTranslationValue('storyPlate1Framing', f)}
              onClear={() => {
                setTranslationValue('storyPlate1', '');
                setTranslationValue('storyPlate1Framing', undefined);
              }}
            />

            <ImageSlot
              label="Story plate II"
              value={formData.translations?.storyPlate2 || ''}
              framing={formData.translations?.storyPlate2Framing}
              allowedKind="image"
              onSelect={(url, asset) => {
                setTranslationValue('storyPlate2', url);
                setTranslationValue('storyPlate2Framing', asset?.framing);
              }}
              onFraming={(f) => setTranslationValue('storyPlate2Framing', f)}
              onClear={() => {
                setTranslationValue('storyPlate2', '');
                setTranslationValue('storyPlate2Framing', undefined);
              }}
            />
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: ADD / EDIT HERO SLIDE OR VIDEO                          */}
      {/* ============================================================== */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[120] backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-xl bg-white text-black p-5 sm:p-7 space-y-5 animate-fadeIn max-h-[92vh] overflow-y-auto text-small">
            <div className="flex items-center justify-between pb-3">
              <div>
                <h3 className="font-serif text-title sm:text-title font-normal text-black">
                  {editingSlideId ? 'Edit Hero Slide / Video' : 'Add Hero Slide or Video'}
                </h3>
                <p className="text-small text-black/50">
                  {editingSlideId
                    ? 'Update the desktop and mobile media slots, framing and link of this slide.'
                    : 'Attach desktop and mobile media to a new carousel slide. Publish when ready.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-black/50 hover:text-black cursor-pointer"
                aria-label="Close slide editor"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {slideFormError && (
              <div className="p-2.5 text-red-700 text-small">
                {slideFormError}
              </div>
            )}

            <form onSubmit={handleSaveSlideModal} className="space-y-4">
              {/* Visibility */}
              <div className="flex items-center justify-between gap-3 p-3">
                <div>
                  <span className="text-small uppercase tracking-wider text-black/60 font-semibold block">
                    Slide visibility
                  </span>
                  <span className="text-small text-black/40">
                    Disabled slides stay in the draft but are hidden from the storefront.
                  </span>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={slideEnabled}
                  onClick={() => setSlideEnabled((v) => !v)}
                  className={`px-2.5 py-1 text-small uppercase font-semibold flex items-center gap-1.5 cursor-pointer transition-colors shrink-0 ${ slideEnabled ?'text-white'
                      : 'bg-white text-black/60'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 ${slideEnabled ?'bg-white' : ''}`}
                  />
                  <span>{slideEnabled ? 'Enabled' : 'Disabled'}</span>
                </button>
              </div>

              {/* Desktop media slot */}
              <ImageSlot
                label="Desktop media (image or video)"
                value={slideDesktop?.url}
                kind={slideDesktop?.kind}
                framing={slideDesktop?.framing}
                allowedKind="all"
                allowPoster
                poster={slideDesktop?.poster}
                onSelect={(url, asset) =>
                  setSlideDesktop({
                    url,
                    kind: resolveKind(url, asset),
                    framing: asset?.framing,
                    alt: asset?.alt,
                  })
                }
                onFraming={(f) => setSlideDesktop((prev) => (prev ? { ...prev, framing: f } : prev))}
                onClear={() => setSlideDesktop(null)}
                onPosterSelect={(url) =>
                  setSlideDesktop((prev) => (prev ? { ...prev, poster: url } : prev))
                }
                onPosterClear={() =>
                  setSlideDesktop((prev) => (prev ? { ...prev, poster: undefined } : prev))
                }
              />

              {/* Mobile media slot */}
              <ImageSlot
                label="Mobile media (image or video)"
                value={slideMobile?.url}
                kind={slideMobile?.kind}
                framing={slideMobile?.framing}
                allowedKind="all"
                allowPoster
                poster={slideMobile?.poster}
                onSelect={(url, asset) =>
                  setSlideMobile({
                    url,
                    kind: resolveKind(url, asset),
                    framing: asset?.framing,
                    alt: asset?.alt,
                  })
                }
                onFraming={(f) => setSlideMobile((prev) => (prev ? { ...prev, framing: f } : prev))}
                onClear={() => setSlideMobile(null)}
                onPosterSelect={(url) =>
                  setSlideMobile((prev) => (prev ? { ...prev, poster: url } : prev))
                }
                onPosterClear={() =>
                  setSlideMobile((prev) => (prev ? { ...prev, poster: undefined } : prev))
                }
              />

              {/* Optional link */}
              <div>
                <label className="block text-small uppercase tracking-wider text-black/60 mb-1 font-semibold">
                  Link (optional — https:// or /path):
                </label>
                <input
                  type="text"
                  value={slideLinkUrl}
                  onChange={(e) => setSlideLinkUrl(e.target.value)}
                  placeholder="https://... or /archive"
                  className="w-full px-3 py-2 text-small"
                />
              </div>

              {/* Caption / Title (metadata only — never rendered over the media) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-small uppercase tracking-wider text-black/60 mb-1 font-semibold">
                    English Caption / Campaign Headline:
                  </label>
                  <input
                    type="text"
                    value={captionEn}
                    onChange={(e) => setCaptionEn(e.target.value)}
                    placeholder="e.g. Winter Campaign 2026 · Monolithic Wool"
                    className="w-full px-3 py-2 text-small"
                  />
                </div>
                <div>
                  <label className="block text-small uppercase tracking-wider text-black/60 mb-1 font-semibold">
                    Finnish Caption (Optional):
                  </label>
                  <input
                    type="text"
                    value={captionFi}
                    onChange={(e) => setCaptionFi(e.target.value)}
                    placeholder="e.g. Talvikampanja 2026 · Monoliittinen villa"
                    className="w-full px-3 py-2 text-small"
                  />
                </div>
              </div>
              <p className="text-small text-black/40 -mt-2">
                Captions are internal metadata only. The storefront hero never renders text over the media.
              </p>

              {/* Live per-device preview */}
              {(slideDesktop?.url || slideMobile?.url) && (
                <div className="space-y-1.5">
                  <span className="text-small uppercase tracking-wider text-black/50">
                    Live Slot Preview:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <span className="text-small uppercase text-black/50">
                        Desktop {slideDesktop?.url ? '' : '(empty)'}
                      </span>
                      <div className="w-full h-36 overflow-hidden relative">
                        {slideDesktop?.url ? (
                          slideDesktop.kind === 'video' ? (
                            <video
                              src={slideDesktop.url}
                              poster={slideDesktop.poster}
                              controls
                              muted
                              playsInline
                              className="w-full h-full object-cover"
                              style={imageFramingStyle(
                                slideDesktop.framing,
                                'heroDesktop',
                                'center 20%'
                              )}
                            />
                          ) : (
                            <img
                              src={slideDesktop.url}
                              alt="Desktop slot preview"
                              className="w-full h-full object-cover"
                              style={imageFramingStyle(
                                slideDesktop.framing,
                                'heroDesktop',
                                'center 20%'
                              )}
                              onError={(e) => {
                                const el = e.currentTarget;
                                if (el.dataset.fallback !== '1') {
                                  el.dataset.fallback = '1';
                                  el.src = NEUTRAL_PLACEHOLDER_IMG;
                                }
                              }}
                            />
                          )
                        ) : (
                          <span className="absolute inset-0 flex items-center justify-center text-small uppercase text-black/40">
                            Nothing renders
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <span className="text-small uppercase text-black/50">
                        Mobile {slideMobile?.url ? '' : '(empty)'}
                      </span>
                      <div className="w-full h-36 overflow-hidden relative">
                        {slideMobile?.url ? (
                          slideMobile.kind === 'video' ? (
                            <video
                              src={slideMobile.url}
                              poster={slideMobile.poster}
                              controls
                              muted
                              playsInline
                              className="w-full h-full object-cover"
                              style={imageFramingStyle(
                                slideMobile.framing,
                                'heroMobile',
                                'center 15%'
                              )}
                            />
                          ) : (
                            <img
                              src={slideMobile.url}
                              alt="Mobile slot preview"
                              className="w-full h-full object-cover"
                              style={imageFramingStyle(
                                slideMobile.framing,
                                'heroMobile',
                                'center 15%'
                              )}
                              onError={(e) => {
                                const el = e.currentTarget;
                                if (el.dataset.fallback !== '1') {
                                  el.dataset.fallback = '1';
                                  el.src = NEUTRAL_PLACEHOLDER_IMG;
                                }
                              }}
                            />
                          )
                        ) : (
                          <span className="absolute inset-0 flex items-center justify-center text-small uppercase text-black/40">
                            Nothing renders
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Buttons */}
              <div className="pt-3 flex items-center justify-between gap-3 flex-wrap">
                <div>
                  {editingSlideId && (
                    <button
                      type="button"
                      onClick={() => {
                        handleRemoveSlide(editingSlideId);
                        setIsModalOpen(false);
                      }}
                      className="px-3 py-2 text-red-600 text-small uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
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
                    className="px-4 py-2 text-black text-small uppercase tracking-wider cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 text-white text-small uppercase tracking-wider font-semibold cursor-pointer"
                  >
                    {editingSlideId ? 'Save Slide Changes' : 'Add Slide to Carousel'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
