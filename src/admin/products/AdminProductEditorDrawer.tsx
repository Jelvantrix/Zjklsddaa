import React, { useState, useEffect, useMemo } from 'react';
import {
  Product,
  ProductVariant,
  Category,
  Collection,
  ImageFramingParams,
  MediaAsset,
} from '../../types';
import { useAuth } from '../../supabase/AuthContext';
import { useStorefrontData } from '../../context/StorefrontDataContext';
import { logAuditEvent } from '../../supabase/dbService';
import { supabase } from '../../supabase/config';
import {
  X,
  Save,
  Tag,
  ImageIcon,
  Layers,
  DollarSign,
  Globe,
  Clock,
  Sparkles,
  Check,
  AlertCircle,
  Trash2,
  Upload,
  RotateCcw,
  RotateCw,
  Compass,
  ZoomIn,
  Move,
  Eye,
  Plus,
  Maximize2,
  GripVertical,
  ChevronLeft,
  ChevronRight,
  Star,
  Type,
  ImagePlus,
  Sliders,
} from 'lucide-react';
import { UniversalImageEditorModal } from '../components/UniversalImageEditorModal';
import { UniversalMediaPickerModal } from '../components/UniversalMediaPickerModal';
import {
  isDataUrl,
  findMediaUsage,
  removeMediaReferences,
  deleteMediaAssetPermanently,
  getMediaAssets,
  updateMediaAsset,
} from '../../supabase/mediaService';

interface AdminProductEditorDrawerProps {
  isOpen: boolean;
  product: Product | null;
  onClose: () => void;
  onSaveSuccess: (updatedProduct: Product) => void;
  onDeleteProduct?: (id: string) => Promise<boolean>;
  categories?: Category[];
  collections?: Collection[];
}

const PLACEHOLDER_IMG = '/placeholder.svg';

/** Where the shared UniversalMediaPicker should send the chosen file. */
type PickerTarget =
  | { kind: 'primary' }
  | { kind: 'hover' }
  | { kind: 'gallery-add' }
  | { kind: 'gallery-replace'; index: number };

/** Which stored image the UniversalImageEditor should calibrate. */
type EditorTarget =
  | { kind: 'primary' }
  | { kind: 'hover' }
  | { kind: 'gallery'; index: number };

/** A reference the owner asked to remove (never deletes the file by itself). */
type DeleteTarget =
  | { kind: 'image'; index: number; url: string }
  | { kind: 'hover'; url: string };

type MediaUsage = {
  productIds: string[];
  productTitles: string[];
  heroUsage: boolean;
  contentSections: string[];
  totalUses: number;
};

/** Editor presets ('3:4') -> legacy cropVariation tokens ('3/4'). */
const toLegacyAspect = (aspect?: string): string => (aspect ? aspect.replace(':', '/') : '3/4');

const legacyAspectForCrop = (
  aspect?: string
): '3/4' | '4/5' | '1/1' | '16/9' => {
  const value = (aspect || '').replace(':', '/');
  return (['3/4', '4/5', '1/1', '16/9'] as string[]).includes(value)
    ? (value as '3/4' | '4/5' | '1/1' | '16/9')
    : '3/4';
};

/** Legacy crop token -> editor preset. */
const toEditorAspect = (aspect?: string): string => (aspect ? aspect.replace('/', ':') : '3:4');

/**
 * Strips every stored base64/data URL so inline imagery can never round-trip
 * back into the database. Returns the cleaned product plus how many were found.
 */
const sanitizeStoredProduct = (
  product: Product
): { clean: Product; stripped: number } => {
  let stripped = 0;
  const images = (product.images || []).map((img) => {
    if (img && isDataUrl(img.url)) {
      stripped += 1;
      return { ...img, url: '' };
    }
    return img;
  });
  const image = product.image;
  const hoverImage = product.hoverImage;
  if (isDataUrl(image)) {
    stripped += 1;
  }
  if (isDataUrl(hoverImage)) {
    stripped += 1;
  }
  return {
    clean: {
      ...product,
      images,
      image: isDataUrl(image) ? '' : image,
      hoverImage: isDataUrl(hoverImage) ? '' : hoverImage,
    },
    stripped,
  };
};

export const AdminProductEditorDrawer: React.FC<AdminProductEditorDrawerProps> = ({
  isOpen,
  product,
  onClose,
  onSaveSuccess,
  onDeleteProduct,
  categories = [],
  collections = [],
}) => {
  const { isEditor, isOwner, adminProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<'basic' | 'media' | 'variants' | 'pricing' | 'taxonomy' | 'seo'>('basic');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Form state initialized from selected product or clean empty product template
  const [formData, setFormData] = useState<Partial<Product>>(() => {
    if (product) return { ...product };
    const randSuffix = String(Date.now() % 10000).padStart(4, '0');
    return {
      nr: `ZE-${new Date().getFullYear()}-${randSuffix}`,
      name: { fi: '', en: '', sv: '' },
      description: {
        fi: '',
        en: '',
        sv: '',
      },
      price: 0,
      vatRate: 24,
      category: 'naiset',
      subcategory: '',
      collectionSeason: 'perusvaatteet',
      material: { fi: '', en: '', sv: '' },
      origin: { fi: '', en: '', sv: '' },
      care: { fi: '', en: '', sv: '' },
      images: [],
      variants: [],
      limitedEdition: { isLimited: false, editionSize: 0, soldCount: 0 },
      isLimited: false,
      status: 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  });

  // ---------------------------------------------------------------
  // Shared media tooling state (hooks must all run before the early
  // return below so the drawer can be closed safely).
  // ---------------------------------------------------------------
  const [pickerTarget, setPickerTarget] = useState<PickerTarget | null>(null);
  const [editorTarget, setEditorTarget] = useState<EditorTarget | null>(null);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [dataUrlStripped, setDataUrlStripped] = useState(false);
  const [libraryAssets, setLibraryAssets] = useState<MediaAsset[]>([]);

  // Per-image alt text editor
  const [altEditIndex, setAltEditIndex] = useState<number | null>(null);
  const [altDraftEn, setAltDraftEn] = useState('');
  const [altDraftFi, setAltDraftFi] = useState('');
  const [isSavingAlt, setIsSavingAlt] = useState(false);

  // Reference / library deletion flow
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [deleteUsage, setDeleteUsage] = useState<MediaUsage | null>(null);
  const [checkingUsage, setCheckingUsage] = useState(false);
  const [deleteAction, setDeleteAction] = useState<'idle' | 'working' | 'error'>('idle');
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Native drag & drop reorder
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const { saveProduct, deleteProduct } = useStorefrontData();

  const notify = (type: 'success' | 'error', text: string) => {
    setNotice({ type, text });
    window.setTimeout(() => setNotice(null), 5000);
  };

  useEffect(() => {
    if (product) {
      const { clean, stripped } = sanitizeStoredProduct(product);
      setDataUrlStripped(stripped > 0);
      setFormData(clean);
    } else {
      const randSuffix = String(Date.now() % 10000).padStart(4, '0');
      setDataUrlStripped(false);
      setFormData({
        nr: `ZE-${new Date().getFullYear()}-${randSuffix}`,
        name: { fi: '', en: '', sv: '' },
        description: {
          fi: '',
          en: '',
          sv: '',
        },
        price: 0,
        vatRate: 24,
        category: 'naiset',
        subcategory: '',
        collectionSeason: 'perusvaatteet',
        material: { fi: '', en: '', sv: '' },
        origin: { fi: '', en: '', sv: '' },
        care: { fi: '', en: '', sv: '' },
        images: [],
        variants: [],
        limitedEdition: { isLimited: false, editionSize: 0, soldCount: 0 },
        isLimited: false,
        status: 'draft',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
    setPickerTarget(null);
    setEditorTarget(null);
    setDeleteTarget(null);
    setAltEditIndex(null);
    setNotice(null);
  }, [product, isOpen]);

  // Media library snapshot: keeps alt edits and permanent deletes honest.
  useEffect(() => {
    if (!isOpen) return undefined;
    let cancelled = false;
    getMediaAssets()
      .then((assets) => {
        if (!cancelled) setLibraryAssets(assets);
      })
      .catch(() => {
        if (!cancelled) setLibraryAssets([]);
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  // Always check real usage before offering any destructive choice.
  useEffect(() => {
    if (!deleteTarget?.url || isDataUrl(deleteTarget.url)) {
      setDeleteUsage(null);
      setCheckingUsage(false);
      return undefined;
    }
    let cancelled = false;
    setCheckingUsage(true);
    setDeleteUsage(null);
    findMediaUsage(deleteTarget.url)
      .then((usage) => {
        if (!cancelled) {
          setDeleteUsage(usage);
          setCheckingUsage(false);
        }
      })
      .catch(() => {
        if (!cancelled) setCheckingUsage(false);
      });
    return () => {
      cancelled = true;
    };
  }, [deleteTarget]);

  // Stable seed for the UniversalImageEditor: its init effect depends on
  // object identity, so the value must not be rebuilt on unrelated renders.
  const editorInitialFraming = useMemo<Partial<ImageFramingParams> | undefined>(() => {
    if (!editorTarget) return undefined;
    const images = formData.images || [];

    if (editorTarget.kind === 'gallery') {
      const entry = images[editorTarget.index];
      const base = entry?.framing;
      return {
        focalX: base?.focalX ?? entry?.focalX ?? 50,
        focalY: base?.focalY ?? entry?.focalY ?? 50,
        zoom: base?.zoom ?? entry?.scale ?? 1,
        rotation: base?.rotation ?? entry?.rotation ?? 0,
        flipH: base?.flipH ?? false,
        flipV: base?.flipV ?? false,
        aspectRatio: base?.aspectRatio ?? toEditorAspect(entry?.aspectRatio),
        overrides: base?.overrides,
      };
    }

    if (editorTarget.kind === 'hover') {
      const entry = images.find((img) => img?.url && img.url === formData.hoverImage);
      const base = entry?.framing;
      const position = (formData as any).hoverImagePosition as string | undefined;
      const [hx, hy] = (position || '').split(' ');
      return {
        focalX: base?.focalX ?? (hx ? parseFloat(hx) : 50),
        focalY: base?.focalY ?? (hy ? parseFloat(hy) : 50),
        zoom: base?.zoom ?? 1,
        rotation: base?.rotation ?? ((formData as any).hoverImageRotation as number | undefined) ?? 0,
        flipH: base?.flipH ?? false,
        flipV: base?.flipV ?? false,
        aspectRatio: base?.aspectRatio ?? '3:4',
        overrides: base?.overrides,
      };
    }

    const entry = images[0];
    const base = entry?.framing || formData.framing;
    return {
      focalX: base?.focalX ?? entry?.focalX ?? 50,
      focalY: base?.focalY ?? entry?.focalY ?? 18,
      zoom: base?.zoom ?? entry?.scale ?? ((formData as any).imageScale as number | undefined) ?? 1.05,
      rotation:
        base?.rotation ?? entry?.rotation ?? ((formData as any).imageRotation as number | undefined) ?? 0,
      flipH: base?.flipH ?? formData.cropVariation?.onModel?.flipped ?? false,
      flipV: base?.flipV ?? false,
      aspectRatio: base?.aspectRatio ?? toEditorAspect(formData.cropVariation?.onModel?.aspectRatio),
      overrides: base?.overrides,
    };
  }, [editorTarget, formData]);

  if (!isOpen) return null;

  // Active focal point, rotation, and image state
  const activeImage = formData.images?.[0];
  const primaryUrl = activeImage?.url || formData.image || PLACEHOLDER_IMG;
  const hoverUrl = formData.hoverImage || '';
  const focalX = activeImage?.focalX ?? 50;
  const focalY = activeImage?.focalY ?? 18;
  const focalScale = (formData as any).imageScale ?? (formData.cropVariation?.onModel?.scale ?? 1.05);
  const focalRotation = (formData as any).imageRotation ?? 0;
  const currentAspectRatio = formData.cropVariation?.onModel?.aspectRatio || '3/4';
  const isFlipped = formData.cropVariation?.onModel?.flipped || false;
  const galleryImages = formData.images || [];


  const cropWithOnModel = (
    position: string,
    scale: number,
    aspectRatio: '3/4' | '4/5' | '1/1' | '16/9' = currentAspectRatio as any,
    flipped = isFlipped
  ): Product['cropVariation'] => {
    const base = formData.cropVariation;
    return {
      packshot: base?.packshot || {
        position: 'center center',
        scale: 1,
        aspectRatio: '3/4',
      },
      onModel: {
        position,
        scale,
        aspectRatio,
        flipped,
      },
      detail1: base?.detail1 || { position: 'center center', scale: 1.2 },
      detail2: base?.detail2 || { position: 'center center', scale: 1.2 },
      detail3: base?.detail3 || { position: 'center center', scale: 1.2 },
      detail4: base?.detail4 || { position: 'center center', scale: 1.2 },
    };
  };

  const handleUpdateImageUrl = (url: string) => {
    if (isDataUrl(url)) {
      notify('error', 'Inline base64 images are rejected. Upload the file to the media library instead.');
      return;
    }
    const updatedImages = [...(formData.images || [])];
    if (updatedImages[0]) {
      updatedImages[0] = { ...updatedImages[0], url };
    } else if (url) {
      updatedImages[0] = { url, order: 0, focalX: 50, focalY: 18, isPrimary: true };
    }
    setFormData({ ...formData, image: url, images: updatedImages });
  };

  const handleUpdateHoverUrl = (url: string) => {
    if (isDataUrl(url)) {
      notify('error', 'Inline base64 images are rejected. Upload the file to the media library instead.');
      return;
    }
    setFormData({ ...formData, hoverImage: url });
  };

  /** Routes whatever the shared media picker chose into the right slot. */
  const handlePickerSelect = (url: string) => {
    if (isDataUrl(url)) {
      notify('error', 'Inline base64 images are rejected. Upload the file to the media library instead.');
      return;
    }
    const target = pickerTarget;
    if (!target) return;

    if (target.kind === 'primary') {
      handleUpdateImageUrl(url);
      return;
    }
    if (target.kind === 'hover') {
      handleUpdateHoverUrl(url);
      return;
    }

    const list = [...(formData.images || [])];
    if (target.kind === 'gallery-add') {
      list.push({ url, order: list.length, alt: undefined });
      setFormData({ ...formData, images: list.map((img, i) => ({ ...img, order: i })) });
      notify('success', 'Picture added to the gallery. Save the record to keep it.');
      return;
    }

    const entry = list[target.index];
    if (!entry) return;
    // A different file deserves a clean frame, but keeps its alt text.
    list[target.index] = { url, order: target.index, alt: entry.alt, isPrimary: target.index === 0 };
    setFormData({
      ...formData,
      images: list,
      image: target.index === 0 ? url : formData.image,
    });
    notify('success', 'Picture replaced. Save the record to keep it.');
  };

  /** Titles and current values for the shared picker. */
  const pickerTitle =
    pickerTarget?.kind === 'primary'
      ? 'Choose Primary Picture'
      : pickerTarget?.kind === 'hover'
        ? 'Choose Hover Picture'
        : pickerTarget?.kind === 'gallery-add'
          ? 'Add Gallery Picture'
          : pickerTarget
            ? `Replace Picture #${pickerTarget.index + 1}`
            : 'Select Media';

  const pickerCurrentUrl =
    pickerTarget?.kind === 'primary'
      ? (formData.images?.[0]?.url || formData.image || '')
      : pickerTarget?.kind === 'hover'
        ? (formData.hoverImage || '')
        : pickerTarget?.kind === 'gallery-replace'
          ? ((formData.images || [])[pickerTarget.index]?.url || '')
          : '';

  /** Image and title for the shared UniversalImageEditor. */
  const editorImageUrl =
    editorTarget?.kind === 'primary'
      ? (formData.images?.[0]?.url || formData.image || '')
      : editorTarget?.kind === 'hover'
        ? (formData.hoverImage || '')
        : editorTarget
          ? ((formData.images || [])[editorTarget.index]?.url || '')
          : '';

  const editorTitle =
    editorTarget?.kind === 'primary'
      ? 'Frame the Primary Picture'
      : editorTarget?.kind === 'hover'
        ? 'Frame the Hover Picture'
        : editorTarget
          ? `Frame Gallery Picture #${editorTarget.index + 1}`
          : 'Image Frame & Angle Editor';

  /**
   * Reads the current primary framing and merges a patch into it, so the
   * ImageEditor parameters and the legacy fields can never drift apart.
   */
  const primaryFramingWith = (patch: Partial<ImageFramingParams>): ImageFramingParams => {
    const entry = (formData.images || [])[0];
    const base = entry?.framing || formData.framing;
    return {
      focalX: patch.focalX ?? base?.focalX ?? entry?.focalX ?? focalX,
      focalY: patch.focalY ?? base?.focalY ?? entry?.focalY ?? focalY,
      zoom: patch.zoom ?? base?.zoom ?? entry?.scale ?? focalScale,
      rotation: patch.rotation ?? base?.rotation ?? entry?.rotation ?? focalRotation,
      flipH: patch.flipH ?? base?.flipH ?? isFlipped,
      flipV: patch.flipV ?? base?.flipV ?? false,
      aspectRatio: patch.aspectRatio ?? base?.aspectRatio ?? toEditorAspect(currentAspectRatio),
      overrides: patch.overrides !== undefined ? patch.overrides : base?.overrides,
    };
  };

  /**
   * Writes ImageFramingParams onto images[0].framing AND product.framing, then
   * mirrors it into imagePosition / imageScale / imageRotation / cropVariation
   * so older storefront paths keep reading the same values.
   */
  const applyPrimaryFraming = (next: ImageFramingParams) => {
    const position = `${next.focalX}% ${next.focalY}%`;
    const legacyAspect = toLegacyAspect(next.aspectRatio);
    const list = [...(formData.images || [])];
    const url = list[0]?.url || formData.image || '';
    if (!url || isDataUrl(url)) {
      notify('error', 'Choose a picture first — only media library images can be framed.');
      return;
    }
    list[0] = {
      ...(list[0] as NonNullable<(typeof list)[0]>),
      url,
      order: 0,
      isPrimary: true,
      framing: next,
      focalX: next.focalX,
      focalY: next.focalY,
      scale: next.zoom,
      rotation: next.rotation,
      position,
      aspectRatio: legacyAspect,
    };
    setFormData({
      ...formData,
      images: list,
      image: url,
      framing: next,
      imagePosition: position,
      imageScale: next.zoom,
      imageRotation: next.rotation,
      cropVariation: cropWithOnModel(
        position,
        next.zoom,
        legacyAspectForCrop(next.aspectRatio),
        Boolean(next.flipH)
      ),
    } as any);
  };

  /** Framing for a secondary gallery tile (index > 0). */
  const applyGalleryFraming = (index: number, next: ImageFramingParams) => {
    const list = [...(formData.images || [])];
    if (!list[index]) return;
    const position = `${next.focalX}% ${next.focalY}%`;
    list[index] = {
      ...list[index],
      framing: next,
      focalX: next.focalX,
      focalY: next.focalY,
      scale: next.zoom,
      rotation: next.rotation,
      position,
      aspectRatio: toLegacyAspect(next.aspectRatio),
      order: index,
    };
    setFormData({ ...formData, images: list });
  };

  /**
   * Hover framing: legacy hoverImagePosition / hoverImageRotation always, plus
   * the full parameter set when the hover picture also lives in the gallery.
   */
  const applyHoverFraming = (next: ImageFramingParams) => {
    const position = `${next.focalX}% ${next.focalY}%`;
    const list = [...(formData.images || [])];
    const hoverIdx = list.findIndex((img) => img?.url && img.url === formData.hoverImage);
    if (hoverIdx >= 0) {
      list[hoverIdx] = {
        ...list[hoverIdx],
        framing: next,
        focalX: next.focalX,
        focalY: next.focalY,
        scale: next.zoom,
        rotation: next.rotation,
        position,
        aspectRatio: toLegacyAspect(next.aspectRatio),
      };
    }
    setFormData({
      ...formData,
      images: list,
      hoverImagePosition: position,
      hoverImageRotation: next.rotation,
    } as any);
  };

  // ---------------------------------------------------------------
  // Gallery: reorder, primary swap, hover, delete references
  // ---------------------------------------------------------------
  const reorderImages = (from: number, to: number) => {
    const list = [...(formData.images || [])];
    if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) return;
    const [moved] = list.splice(from, 1);
    list.splice(to, 0, moved);
    const next = list.map((img, idx) => ({ ...img, order: idx, isPrimary: idx === 0 }));
    setFormData({ ...formData, images: next, image: next[0]?.url || '' });
  };

  const moveImageBy = (index: number, delta: number) => reorderImages(index, index + delta);

  /** Swaps the target into slot 0 — the previous primary is never destroyed. */
  const handleSetAsPrimary = (index: number) => {
    if (index === 0) return;
    const list = [...(formData.images || [])];
    const target = list[index];
    const previous = list[0];
    if (!target?.url || !previous) return;
    list[0] = { ...target, order: 0, isPrimary: true };
    list[index] = { ...previous, order: index, isPrimary: false };
    setFormData({ ...formData, images: list, image: list[0].url });
    notify('success', 'Primary picture swapped. The previous primary stays in the gallery.');
  };

  const handleSetAsHover = (index: number) => {
    const current = (formData.images || [])[index];
    if (!current?.url) return;
    const wasHover = Boolean(current.isHover);
    const next = (formData.images || []).map((img, i) => ({ ...img, isHover: i === index ? !wasHover : false }));
    setFormData({ ...formData, images: next, hoverImage: wasHover ? '' : current.url });
    notify(
      'success',
      wasHover
        ? 'Hover picture cleared.'
        : 'Hover picture set. Its framing stays stored on that gallery image.'
    );
  };

  /** Removes only the reference from this record (the file is kept). */
  const applyLocalReferenceRemoval = (target: DeleteTarget) => {
    if (target.kind === 'hover') {
      setFormData({ ...formData, hoverImage: '' });
      return;
    }
    const list = [...(formData.images || [])];
    list.splice(target.index, 1);
    const next = list.map((img, idx) => ({ ...img, order: idx, isPrimary: idx === 0 }));
    setFormData({ ...formData, images: next, image: next[0]?.url || '' });
  };

  const openDeleteTarget = (target: DeleteTarget) => {
    setDeleteError(null);
    setDeleteAction('idle');
    if (!target.url || isDataUrl(target.url)) {
      applyLocalReferenceRemoval(target);
      notify('success', 'Empty image slot cleared.');
      return;
    }
    setDeleteTarget(target);
  };

  const handleDeletePrimaryImage = () =>
    openDeleteTarget({ kind: 'image', index: 0, url: (formData.images || [])[0]?.url || formData.image || '' });
  const handleDeleteHoverImage = () => openDeleteTarget({ kind: 'hover', url: formData.hoverImage || '' });
  const handleDeleteGalleryImage = (index: number) =>
    openDeleteTarget({ kind: 'image', index, url: (formData.images || [])[index]?.url || '' });

  const handleRemoveReference = () => {
    if (!deleteTarget) return;
    applyLocalReferenceRemoval(deleteTarget);
    setDeleteTarget(null);
    setDeleteUsage(null);
    notify('success', 'Reference removed from this record. The file stays in the media library.');
  };

  const handleRemoveEverywhere = async () => {
    if (!deleteTarget) return;
    setDeleteAction('working');
    setDeleteError(null);
    const res = await removeMediaReferences(deleteTarget.url);
    if (!res.success) {
      setDeleteAction('error');
      setDeleteError(res.error || 'Could not remove every reference.');
      return;
    }
    applyLocalReferenceRemoval(deleteTarget);
    setDeleteTarget(null);
    setDeleteUsage(null);
    setDeleteAction('idle');
    notify(
      'success',
      'Reference removed from every product, cover and CMS section. The file stays in the media library.'
    );
  };

  const handleDeletePermanently = async () => {
    if (!deleteTarget || checkingUsage) return;
    const asset = libraryAssets.find((a) => a.url === deleteTarget.url);
    if (!asset) {
      setDeleteAction('error');
      setDeleteError(
        'This file is not tracked in the media library, so it cannot be deleted from Storage. Remove the reference instead.'
      );
      return;
    }
    setDeleteAction('working');
    setDeleteError(null);
    if (deleteUsage && deleteUsage.totalUses > 0) {
      const rm = await removeMediaReferences(deleteTarget.url);
      if (!rm.success) {
        setDeleteAction('error');
        setDeleteError(rm.error || 'Could not remove every reference first.');
        return;
      }
    }
    const res = await deleteMediaAssetPermanently(asset);
    if (!res.success) {
      setDeleteAction('error');
      setDeleteError(res.error || 'Failed to delete the file from Storage.');
      return;
    }
    setLibraryAssets((prev) => prev.filter((a) => a.id !== asset.id));
    applyLocalReferenceRemoval(deleteTarget);
    setDeleteTarget(null);
    setDeleteUsage(null);
    setDeleteAction('idle');
    notify('success', 'File deleted permanently from the media library.');
  };

  // ---------------------------------------------------------------
  // Per-image alt text (also written back to the media library asset)
  // ---------------------------------------------------------------
  const openAltEditor = (index: number) => {
    const entry = (formData.images || [])[index];
    if (!entry) return;
    setAltDraftEn(entry.alt?.en || '');
    setAltDraftFi(entry.alt?.fi || '');
    setAltEditIndex(index);
  };

  const handleSaveAlt = async () => {
    if (altEditIndex === null) return;
    const index = altEditIndex;
    const list = [...(formData.images || [])];
    if (!list[index]) {
      setAltEditIndex(null);
      return;
    }
    const en = altDraftEn.trim();
    const fi = altDraftFi.trim() || en;
    if (!en && !fi) {
      notify('error', 'Alt text cannot be empty.');
      return;
    }
    list[index] = { ...list[index], alt: { en: en || fi, fi: fi || en } };
    const savedUrl = list[index].url;
    setFormData({ ...formData, images: list });
    setAltEditIndex(null);

    const asset = libraryAssets.find((a) => a.url === savedUrl);
    if (!asset) {
      notify('success', 'Alt text saved on this record.');
      return;
    }
    setIsSavingAlt(true);
    const res = await updateMediaAsset(asset.id, { alt: en || fi });
    setIsSavingAlt(false);
    if (res.success) {
      notify('success', 'Alt text saved on this record and in the media library.');
    } else {
      notify('error', `Alt text saved on this record, but the media library update failed: ${res.error}`);
    }
  };


  // Inline precision controls — every change is mirrored into BOTH the
  // ImageFramingParams (images[0].framing + product.framing) and the legacy
  // fields (imagePosition / imageScale / imageRotation / cropVariation).
  const handleUpdateFocalX = (x: number) => applyPrimaryFraming(primaryFramingWith({ focalX: x }));
  const handleUpdateFocalY = (y: number) => applyPrimaryFraming(primaryFramingWith({ focalY: y }));
  const handleUpdateScale = (scale: number) => applyPrimaryFraming(primaryFramingWith({ zoom: scale }));
  const handleUpdateRotation = (rotation: number) =>
    applyPrimaryFraming(primaryFramingWith({ rotation }));
  const handleToggleFlip = () => applyPrimaryFraming(primaryFramingWith({ flipH: !isFlipped }));

  const handleFocalPointClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, Math.round(((e.clientX - rect.left) / rect.width) * 100)));
    const y = Math.max(0, Math.min(100, Math.round(((e.clientY - rect.top) / rect.height) * 100)));
    applyPrimaryFraming(primaryFramingWith({ focalX: x, focalY: y }));
  };

  const handleResetPrimaryFraming = () =>
    applyPrimaryFraming(
      primaryFramingWith({ focalX: 50, focalY: 20, zoom: 1.05, rotation: 0, flipH: false, flipV: false })
    );

  /** Opens the shared UniversalImageEditor for the primary or hover picture. */
  const handleOpenAdjuster = (target: 'primary' | 'hover') => {
    const url = target === 'primary' ? activeImage?.url || formData.image || '' : hoverUrl;
    if (!url || isDataUrl(url)) {
      notify('error', 'Choose a picture first — only media library images can be framed.');
      return;
    }
    setEditorTarget({ kind: target });
  };

  /** Gallery tiles are editable too (this used to be primary/hover only). */
  const handleOpenGalleryEditor = (index: number) => {
    const url = (formData.images || [])[index]?.url || '';
    if (!url || isDataUrl(url)) {
      notify('error', 'Choose a picture first — only media library images can be framed.');
      return;
    }
    setEditorTarget(index === 0 ? { kind: 'primary' } : { kind: 'gallery', index });
  };

  /** Persists the UniversalImageEditor result instead of discarding it. */
  const handleApplyEditorFraming = (framing: ImageFramingParams) => {
    const target = editorTarget;
    if (!target) return;
    if (target.kind === 'primary') {
      applyPrimaryFraming(framing);
    } else if (target.kind === 'gallery') {
      if (target.index === 0) applyPrimaryFraming(framing);
      else applyGalleryFraming(target.index, framing);
    } else {
      applyHoverFraming(framing);
    }
    notify('success', 'Framing applied and stored on this record.');
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveError(null);

    const productId = product?.id || `prod-${Date.now()}`;
    const normalizedImages = galleryImages.map((img, idx) => ({
      ...img,
      order: idx,
      isPrimary: idx === 0,
    }));
    const primaryEntry = normalizedImages[0];
    const resolvedPrimary = primaryUrl === PLACEHOLDER_IMG ? '' : primaryUrl;
    const cleanProduct: Product = {
      ...(formData as Product),
      id: productId,
      images: normalizedImages,
      image: resolvedPrimary,
      hoverImage: hoverUrl || resolvedPrimary,
      // Non-destructive ImageEditor result (primary picture).
      framing: primaryEntry?.framing || formData.framing,
      imagePosition: `${focalX}% ${focalY}%`,
      imageScale: focalScale,
      imageRotation: focalRotation,
      cropVariation: cropWithOnModel(`${focalX}% ${focalY}%`, focalScale, currentAspectRatio as any, isFlipped),
      isComingSoon: Boolean(formData.isComingSoon || formData.status === 'coming_soon'),
      comingSoonNotice: formData.comingSoonNotice || '',
      updatedAt: new Date().toISOString(),
    };

    try {
      let saved = await saveProduct(cleanProduct);
      if (!saved) {
        // The gallery framing lives inside `images` (jsonb) and always saves.
        // Retry without the optional product-level columns so records still
        // persist on a schema that has not been migrated for them yet.
        const { framing, imageRotation, hoverImageRotation, ...rest } = cleanProduct;
        saved = await saveProduct(rest as Product);
      }
      if (!saved) {
        throw new Error('The product record could not be written to the database.');
      }

      try {
        await logAuditEvent(
          adminProfile?.email || 'studio-principal',
          product ? 'PRODUCT_UPDATED' : 'PRODUCT_CREATED',
          `Product: ${cleanProduct.name?.en || cleanProduct.plateNumber} (${cleanProduct.nr})`,
          { price: cleanProduct.price, status: cleanProduct.status, isComingSoon: cleanProduct.isComingSoon }
        );
      } catch {
        // Ignore audit log error
      }

      setIsSaving(false);
      setSaveSuccess(true);
      onSaveSuccess(cleanProduct);

      setTimeout(() => {
        setSaveSuccess(false);
        onClose();
      }, 500);
    } catch (err: any) {
      setIsSaving(false);
      setSaveError(err.message || 'Error occurred while saving product.');
    }
  };

  const handleDelete = async () => {
    if (!product) return;
    if (!window.confirm(`Permanently remove ${product.nr || product.name?.en || 'this garment'} from archive?`)) {
      return;
    }
    try {
      if (onDeleteProduct) {
        await onDeleteProduct(product.id);
      } else {
        await deleteProduct(product.id);
      }
      onClose();
    } catch (err: any) {
      setSaveError(err.message || 'Failed to delete product.');
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex justify-end">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-neutral-950/40 backdrop-blur-[2px] transition-opacity"
      />

      {/* Slide-over Container */}
      <div className="relative w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col z-10 animate-slideLeft border-l border-black/10 select-none font-mono">
        {/* Top Header */}
        <div className="p-4 sm:p-6 border-b border-black/10 flex items-center justify-between bg-white shrink-0">
          <div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-black/40">
              {product ? 'Edit Archival Item' : 'Create New Archival Item'}
            </div>
            <h3 className="font-editorial text-xl sm:text-2xl font-normal text-black mt-0.5 truncate max-w-md">
              {formData.name?.en || 'Untitled Archival Piece'}
            </h3>
          </div>

          <div className="flex items-center gap-4">
            {product && (
              <button
                type="button"
                onClick={handleDelete}
                className="text-xs uppercase tracking-wider text-black/50 hover:text-black underline underline-offset-4 cursor-pointer mr-2 flex items-center gap-1.5"
                title="Delete this garment permanently"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="py-2 px-4 bg-black text-white hover:bg-neutral-800 text-xs font-mono uppercase tracking-[0.2em] flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSaving ? 'Saving...' : 'Save Record'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1 text-black/40 hover:text-black cursor-pointer transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5 stroke-[1.5]" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-black/[0.08] bg-white overflow-x-auto no-scrollbar text-xs font-mono uppercase tracking-wider shrink-0">
          {[
            { id: 'basic', label: '1. Basic Info', icon: Tag },
            { id: 'media', label: '2. Media & Crops', icon: ImageIcon },
            { id: 'variants', label: '3. Sizes & Stock', icon: Layers },
            { id: 'pricing', label: '4. Pricing', icon: DollarSign },
            { id: 'taxonomy', label: '5. Taxonomy', icon: Globe },
            { id: 'seo', label: '6. Publishing', icon: Clock },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-3 flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer relative ${
                  isActive
                    ? 'font-semibold text-black border-b-2 border-black'
                    : 'text-black/50 hover:text-black'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {saveError && (
            <div className="p-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{saveError}</span>
            </div>
          )}

          {saveSuccess && (
            <div className="p-3 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 flex items-center gap-2">
              <Check className="w-4 h-4 shrink-0" />
              <span>Product record saved to the archive.</span>
            </div>
          )}

          {notice && (
            <div
              className={`p-3 text-xs border flex items-center gap-2 ${
                notice.type === 'success'
                  ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                  : 'text-rose-700 bg-rose-50 border-rose-200'
              }`}
            >
              {notice.type === 'success' ? (
                <Check className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              <span>{notice.text}</span>
            </div>
          )}

          {dataUrlStripped && (
            <div className="p-3 text-xs text-black bg-neutral-100 border border-black/20 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>
                Stored inline (base64) image data was cleared from this record — pick the pictures again
                from the media library so nothing is saved as a data URL.
              </span>
            </div>
          )}

          {/* TAB 1: BASIC INFO */}
          {activeTab === 'basic' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10.5px] uppercase tracking-wider text-black/60 mb-1">
                    Product Title (English)
                  </label>
                  <input
                    type="text"
                    value={formData.name?.en || ''}
                    onChange={(e) => setFormData({ ...formData, name: { ...formData.name!, en: e.target.value } })}
                    className="w-full px-3 py-2 text-xs border border-black/[0.12] focus:border-black focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10.5px] uppercase tracking-wider text-black/60 mb-1">
                    Product Title (Finnish)
                  </label>
                  <input
                    type="text"
                    value={formData.name?.fi || ''}
                    onChange={(e) => setFormData({ ...formData, name: { ...formData.name!, fi: e.target.value } })}
                    className="w-full px-3 py-2 text-xs border border-black/[0.12] focus:border-black focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10.5px] uppercase tracking-wider text-black/60 mb-1">
                    Description (English)
                  </label>
                  <textarea
                    rows={4}
                    value={formData.description?.en || ''}
                    onChange={(e) => setFormData({ ...formData, description: { ...formData.description!, en: e.target.value } })}
                    className="w-full px-3 py-2 text-xs font-sans border border-black/[0.12] focus:border-black focus:outline-none leading-relaxed"
                  />
                </div>
                <div>
                  <label className="block text-[10.5px] uppercase tracking-wider text-black/60 mb-1">
                    Description (Finnish)
                  </label>
                  <textarea
                    rows={4}
                    value={formData.description?.fi || ''}
                    onChange={(e) => setFormData({ ...formData, description: { ...formData.description!, fi: e.target.value } })}
                    className="w-full px-3 py-2 text-xs font-sans border border-black/[0.12] focus:border-black focus:outline-none leading-relaxed"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10.5px] uppercase tracking-wider text-black/60 mb-1">
                    Material & Weight (EN)
                  </label>
                  <input
                    type="text"
                    value={formData.material?.en || ''}
                    onChange={(e) => setFormData({ ...formData, material: { ...formData.material!, en: e.target.value } })}
                    className="w-full px-3 py-2 text-xs border border-black/[0.12] focus:border-black focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10.5px] uppercase tracking-wider text-black/60 mb-1">
                    Material & Weight (FI)
                  </label>
                  <input
                    type="text"
                    value={formData.material?.fi || ''}
                    onChange={(e) => setFormData({ ...formData, material: { ...formData.material!, fi: e.target.value } })}
                    className="w-full px-3 py-2 text-xs border border-black/[0.12] focus:border-black focus:outline-none"
                  />
                </div>
              </div>

              {/* COMING SOON CONFIGURATION */}
              <div className="p-4 border border-black/[0.12] bg-neutral-50 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-xs font-semibold text-black cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(formData.isComingSoon || formData.status === 'coming_soon')}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setFormData({
                          ...formData,
                          isComingSoon: checked,
                          status: checked ? 'coming_soon' : (formData.status === 'coming_soon' ? 'live' : formData.status),
                        });
                      }}
                      className="w-4 h-4 accent-black cursor-pointer"
                    />
                    <span>Mark as "Coming Soon" (Waitlist Mode)</span>
                  </label>
                  {(formData.isComingSoon || formData.status === 'coming_soon') && (
                    <span className="text-[10px] uppercase font-mono px-2 py-0.5 bg-black text-white font-semibold">
                      Coming Soon Active
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-black/60 font-sans leading-relaxed">
                  When enabled, this piece displays an editorial "COMING SOON" tag on the catalogue and swaps the "Add to Bag" action for a priority waitlist registration form.
                </p>
                {(formData.isComingSoon || formData.status === 'coming_soon') && (
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-black/60 mb-1">
                      Announcement / Arrival Notice (Optional)
                    </label>
                    <input
                      type="text"
                      value={formData.comingSoonNotice || ''}
                      onChange={(e) => setFormData({ ...formData, comingSoonNotice: e.target.value })}
                      placeholder="e.g. Arriving Autumn 2026 · Crafting in Helsinki"
                      className="w-full px-3 py-2 text-xs border border-black/[0.2] bg-white focus:border-black focus:outline-none"
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10.5px] uppercase tracking-wider text-black/60 mb-1">
                    Origin & Workshop (EN)
                  </label>
                  <input
                    type="text"
                    value={formData.origin?.en || ''}
                    onChange={(e) => setFormData({ ...formData, origin: { ...formData.origin!, en: e.target.value } })}
                    className="w-full px-3 py-2 text-xs border border-black/[0.12] focus:border-black focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10.5px] uppercase tracking-wider text-black/60 mb-1">
                    Origin & Workshop (FI)
                  </label>
                  <input
                    type="text"
                    value={formData.origin?.fi || ''}
                    onChange={(e) => setFormData({ ...formData, origin: { ...formData.origin!, fi: e.target.value } })}
                    className="w-full px-3 py-2 text-xs border border-black/[0.12] focus:border-black focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: MEDIA, IMAGE URLS, DEVICE FILE UPLOADS & FRAME/ANGLE ADJUSTMENT */}
          {activeTab === 'media' && (
            <div className="space-y-6">
              {/* 1. Primary Image Management Card */}
              <div className="border border-black/[0.12] p-4 bg-neutral-50/70 space-y-4 shadow-2xs">
                <div className="flex items-center justify-between border-b border-black/10 pb-2.5">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-black" />
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-black">
                      Primary Garment Picture
                    </h4>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setPickerTarget({ kind: 'primary' })}
                      className="px-2.5 py-1 text-[10.5px] uppercase font-mono font-medium bg-black text-white hover:bg-neutral-800 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    >
                      <Upload className="w-3 h-3" />
                      <span>Upload / Choose</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenAdjuster('primary')}
                      className="px-2.5 py-1 text-[10.5px] uppercase font-mono border border-black hover:bg-black hover:text-white transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <Compass className="w-3 h-3" />
                      <span>Adjust Best Frame & Angle</span>
                    </button>
                    {primaryUrl && (
                      <button
                        type="button"
                        onClick={handleDeletePrimaryImage}
                        className="p-1 text-red-600 hover:bg-red-50 border border-red-200 transition-colors cursor-pointer"
                        title="Delete primary picture"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
                  <div className="sm:col-span-3">
                    <div className="w-full aspect-[3/4] border border-black/20 overflow-hidden relative bg-black/5 shadow-2xs">
                      {primaryUrl ? (
                        <img
                          src={primaryUrl}
                          alt="Primary"
                          style={{
                            objectPosition: `${focalX}% ${focalY}%`,
                            transform: `${isFlipped ? 'scaleX(-1)' : ''} scale(${focalScale}) rotate(${focalRotation}deg)`,
                          }}
                          className="w-full h-full object-cover transition-transform duration-100"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center p-3 text-center text-black/40 text-[10px]">
                          <ImageIcon className="w-6 h-6 mb-1 opacity-40" />
                          <span>No Image Loaded</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="sm:col-span-9 space-y-3">
                    <div>
                      <label className="block text-[10px] uppercase tracking-wider text-black/60 mb-1">
                        Primary Image URL:
                      </label>
                      <input
                        type="text"
                        value={primaryUrl}
                        onChange={(e) => handleUpdateImageUrl(e.target.value)}
                        placeholder="https://..."
                        className="w-full px-3 py-2 text-xs font-mono border border-black/[0.15] bg-white focus:border-black focus:outline-none"
                      />
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <span className="text-[10px] uppercase tracking-wider text-black/50 font-semibold">
                        Current Frame:
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 bg-black/5 border border-black/10">
                        Anchor: {focalX}% / {focalY}%
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 bg-black/5 border border-black/10">
                        Scale: {Number(focalScale).toFixed(2)}x
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 bg-black/5 border border-black/10">
                        Angle: {focalRotation}°
                      </span>
                      {isFlipped && (
                        <span className="text-[10px] font-mono px-2 py-0.5 bg-black text-white">
                          Flipped
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. Secondary / Hover Image Card */}
              <div className="border border-black/[0.12] p-4 bg-neutral-50/70 space-y-4 shadow-2xs">
                <div className="flex items-center justify-between border-b border-black/10 pb-2.5">
                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4 text-black" />
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-black">
                      Hover / Secondary Model Picture (Optional)
                    </h4>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setPickerTarget({ kind: 'hover' })}
                      className="px-2.5 py-1 text-[10.5px] uppercase font-mono font-medium bg-black text-white hover:bg-neutral-800 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    >
                      <Upload className="w-3 h-3" />
                      <span>Upload / Choose</span>
                    </button>
                    {hoverUrl && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleOpenAdjuster('hover')}
                          className="px-2.5 py-1 text-[10.5px] uppercase font-mono border border-black hover:bg-black hover:text-white transition-colors flex items-center gap-1.5 cursor-pointer"
                        >
                          <Compass className="w-3 h-3" />
                          <span>Adjust Frame</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleDeleteHoverImage}
                          className="p-1 text-red-600 hover:bg-red-50 border border-red-200 transition-colors cursor-pointer"
                          title="Delete hover picture"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
                  <div className="sm:col-span-3">
                    <div className="w-full aspect-[3/4] border border-black/20 overflow-hidden relative bg-black/5 shadow-2xs">
                      {hoverUrl ? (
                        <img
                          src={hoverUrl}
                          alt="Hover"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center p-3 text-center text-black/40 text-[10px]">
                          <span>No hover image (Primary used)</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="sm:col-span-9">
                    <label className="block text-[10px] uppercase tracking-wider text-black/60 mb-1">
                      Hover Image URL:
                    </label>
                    <input
                      type="text"
                      value={hoverUrl}
                      onChange={(e) => handleUpdateHoverUrl(e.target.value)}
                      placeholder="https://..."
                      className="w-full px-3 py-2 text-xs font-mono border border-black/[0.15] bg-white focus:border-black focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* 3. Additional Gallery Images Card */}
              <div className="border border-black/[0.12] p-4 bg-neutral-50/70 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-black">
                      Archival Garment Gallery ({(formData.images || []).length} pictures)
                    </h4>
                    <p className="text-[11px] text-black/60 font-sans mt-0.5">
                      Upload detail shots, fabric macros, lookbook runway poses, or packshots.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPickerTarget({ kind: 'gallery-add' })}
                    className="px-3 py-1.5 text-[11px] uppercase tracking-wider font-mono bg-black text-white hover:bg-neutral-800 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Picture</span>
                  </button>
                </div>

                {(formData.images || []).length === 0 ? (
                  <p className="text-[11px] text-black/50 font-sans pt-2">
                    No pictures on this record yet. Use Add Picture to upload from a device, pick from the
                    media library or paste a URL.
                  </p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3 pt-2">
                    {(formData.images || []).map((img, idx) => (
                      <div
                        key={`${img.url}-${idx}`}
                        draggable={idx !== 0}
                        onDragStart={() => setDragIndex(idx)}
                        onDragOver={(e) => {
                          e.preventDefault();
                          if (dragIndex !== null && dragIndex !== idx) setDragOverIndex(idx);
                        }}
                        onDragEnd={() => {
                          setDragIndex(null);
                          setDragOverIndex(null);
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          if (dragIndex !== null) reorderImages(dragIndex, idx);
                          setDragIndex(null);
                          setDragOverIndex(null);
                        }}
                        className={`relative border bg-white p-1 group shadow-2xs transition-colors ${
                          dragOverIndex === idx ? 'border-black' : 'border-black/15'
                        } ${idx === 0 ? '' : 'cursor-grab active:cursor-grabbing'}`}
                      >
                        <div className="w-full aspect-[3/4] overflow-hidden bg-neutral-100 relative">
                          <img
                            src={img.url}
                            alt={img.alt?.en || `Gallery ${idx + 1}`}
                            className="w-full h-full object-cover"
                          />
                          <span className="absolute top-1 left-1 bg-black text-white text-[8px] font-mono px-1 py-0.5">
                            {idx === 0 ? 'PRIMARY' : `#${idx + 1}`}
                          </span>
                          {img.isHover && (
                            <span className="absolute top-1 right-1 bg-white text-black text-[8px] font-mono px-1 py-0.5 border border-black">
                              HOVER
                            </span>
                          )}
                          {/* Hover-only actions */}
                          <div className="absolute inset-x-0 bottom-0 hidden group-hover:flex group-focus-within:flex flex-wrap items-center justify-center gap-1 bg-black/75 p-1">
                            {idx !== 0 && (
                              <button
                                type="button"
                                onClick={() => moveImageBy(idx, -1)}
                                className="p-1 text-white hover:bg-white hover:text-black transition-colors cursor-pointer"
                                title="Move earlier"
                                aria-label={`Move image ${idx + 1} earlier`}
                              >
                                <ChevronLeft className="w-3 h-3" />
                              </button>
                            )}
                            {idx !== 0 && idx !== (formData.images || []).length - 1 && (
                              <button
                                type="button"
                                onClick={() => moveImageBy(idx, 1)}
                                className="p-1 text-white hover:bg-white hover:text-black transition-colors cursor-pointer"
                                title="Move later"
                                aria-label={`Move image ${idx + 1} later`}
                              >
                                <ChevronRight className="w-3 h-3" />
                              </button>
                            )}
                            {idx !== 0 && (
                              <button
                                type="button"
                                onClick={() => handleSetAsPrimary(idx)}
                                className="p-1 text-white hover:bg-white hover:text-black transition-colors cursor-pointer"
                                title="Swap into primary slot"
                                aria-label={`Make image ${idx + 1} the primary picture`}
                              >
                                <Star className="w-3 h-3" />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleSetAsHover(idx)}
                              className={`p-1 transition-colors cursor-pointer ${
                                img.isHover ? 'bg-white text-black' : 'text-white hover:bg-white hover:text-black'
                              }`}
                              title={img.isHover ? 'Clear hover picture' : 'Use as hover picture'}
                              aria-label={
                                img.isHover
                                  ? `Clear hover picture from image ${idx + 1}`
                                  : `Use image ${idx + 1} as hover picture`
                              }
                            >
                              <Eye className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenGalleryEditor(idx)}
                              className="p-1 text-white hover:bg-white hover:text-black transition-colors cursor-pointer"
                              title="Adjust frame"
                              aria-label={`Adjust frame of image ${idx + 1}`}
                            >
                              <Compass className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setPickerTarget({ kind: 'gallery-replace', index: idx })}
                              className="p-1 text-white hover:bg-white hover:text-black transition-colors cursor-pointer"
                              title="Replace picture"
                              aria-label={`Replace image ${idx + 1}`}
                            >
                              <ImagePlus className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => openAltEditor(idx)}
                              className="p-1 text-white hover:bg-white hover:text-black transition-colors cursor-pointer"
                              title="Edit alt text"
                              aria-label={`Edit alt text of image ${idx + 1}`}
                            >
                              <Type className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteGalleryImage(idx)}
                              className="p-1 text-white hover:bg-white hover:text-red-600 transition-colors cursor-pointer"
                              title="Delete image"
                              aria-label={`Delete image ${idx + 1}`}
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                        <div className="flex items-center justify-between mt-1 pt-1 border-t border-black/10">
                          <span className="flex items-center gap-1 text-[9px] uppercase tracking-wider font-mono text-black/60">
                            <GripVertical className="w-3 h-3" />
                            {idx === 0 ? 'Primary' : 'Drag'}
                          </span>
                          <button
                            type="button"
                            onClick={() => openAltEditor(idx)}
                            className="text-[9px] uppercase tracking-wider font-mono text-black hover:underline cursor-pointer"
                          >
                            {img.alt?.en ? 'Alt ✓' : 'Alt'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 4. Complete Inline Frame & Angle Adjuster Panel */}
              <div className="p-4 border border-black/[0.12] bg-white space-y-5 shadow-sm">
                <div className="flex items-center justify-between border-b border-black/10 pb-3">
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-black flex items-center gap-1.5">
                      <Compass className="w-4 h-4 text-black" />
                      <span>Adjust Picture to Best Frame & Angle</span>
                    </h4>
                    <p className="text-xs text-black/60 font-sans mt-0.5">
                      Click directly on the garment preview below to anchor focal center, or fine-tune angle/scale sliders.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenAdjuster('primary')}
                      className="px-3 py-1.5 text-[10.5px] uppercase font-mono font-medium bg-black text-white hover:bg-neutral-800 flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <Maximize2 className="w-3.5 h-3.5" />
                      <span>Open Fullscreen Adjuster</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        handleUpdateFocalX(50);
                        handleUpdateFocalY(20);
                        handleUpdateScale(1.05);
                        handleUpdateRotation(0);
                      }}
                      className="px-2.5 py-1.5 text-[10px] uppercase font-mono border border-black/20 hover:border-black bg-white cursor-pointer"
                    >
                      Reset 0° & Center
                    </button>
                  </div>
                </div>

                {/* Precision Sliders: Angle, Scale, X, Y */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
                  {/* Angle / Rotation */}
                  <div className="p-3 border border-black/10 bg-neutral-50/70 space-y-2">
                    <div className="flex justify-between text-[10.5px] uppercase tracking-wider text-black/80 font-semibold">
                      <span className="flex items-center gap-1">
                        <Compass className="w-3 h-3 text-black" />
                        <span>Angle / Tilt</span>
                      </span>
                      <span className="font-bold">{focalRotation}°</span>
                    </div>
                    <input
                      type="range"
                      min={-180}
                      max={180}
                      step={1}
                      value={focalRotation}
                      onChange={(e) => handleUpdateRotation(parseInt(e.target.value, 10))}
                      className="w-full accent-black cursor-pointer"
                    />
                    <div className="flex items-center justify-between gap-1 pt-0.5">
                      <button
                        type="button"
                        onClick={() => handleUpdateRotation(Math.max(-180, focalRotation - 90))}
                        className="px-1.5 py-0.5 text-[9px] border border-black/15 bg-white hover:border-black flex items-center gap-0.5 cursor-pointer"
                      >
                        <RotateCcw className="w-2.5 h-2.5" /> -90°
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdateRotation(0)}
                        className="px-1.5 py-0.5 text-[9px] border border-black/15 bg-white hover:border-black cursor-pointer"
                      >
                        0°
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdateRotation(Math.min(180, focalRotation + 90))}
                        className="px-1.5 py-0.5 text-[9px] border border-black/15 bg-white hover:border-black flex items-center gap-0.5 cursor-pointer"
                      >
                        <RotateCw className="w-2.5 h-2.5" /> +90°
                      </button>
                      <button
                        type="button"
                        onClick={handleToggleFlip}
                        className={`px-1.5 py-0.5 text-[9px] border cursor-pointer ${
                          isFlipped ? 'border-black bg-black text-white' : 'border-black/15 bg-white hover:border-black'
                        }`}
                      >
                        Flip
                      </button>
                    </div>
                  </div>

                  {/* Zoom / Scale */}
                  <div className="p-3 border border-black/10 bg-neutral-50/70 space-y-2">
                    <div className="flex justify-between text-[10.5px] uppercase tracking-wider text-black/80 font-semibold">
                      <span className="flex items-center gap-1">
                        <ZoomIn className="w-3 h-3 text-black" />
                        <span>Zoom / Scale</span>
                      </span>
                      <span className="font-bold">{Number(focalScale).toFixed(2)}x</span>
                    </div>
                    <input
                      type="range"
                      min={0.7}
                      max={3.0}
                      step={0.01}
                      value={focalScale}
                      onChange={(e) => handleUpdateScale(parseFloat(e.target.value))}
                      className="w-full accent-black cursor-pointer"
                    />
                    <div className="flex items-center justify-between gap-1 pt-0.5">
                      {[1.0, 1.25, 1.5, 2.0].map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => handleUpdateScale(s)}
                          className={`px-1.5 py-0.5 text-[9px] border cursor-pointer ${
                            Math.abs(focalScale - s) < 0.02
                              ? 'border-black bg-black text-white font-bold'
                              : 'border-black/15 bg-white hover:border-black'
                          }`}
                        >
                          {s}x
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Horizontal X */}
                  <div className="p-3 border border-black/10 bg-neutral-50/70 space-y-2">
                    <div className="flex justify-between text-[10.5px] uppercase tracking-wider text-black/80 font-semibold">
                      <span>Horizontal (X)</span>
                      <span className="font-bold">{focalX}%</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={focalX}
                      onChange={(e) => handleUpdateFocalX(Number(e.target.value))}
                      className="w-full accent-black cursor-pointer"
                    />
                    <div className="flex items-center justify-between text-[9px] text-black/50">
                      <span>Left (0%)</span>
                      <span>Center (50%)</span>
                      <span>Right (100%)</span>
                    </div>
                  </div>

                  {/* Vertical Y */}
                  <div className="p-3 border border-black/10 bg-neutral-50/70 space-y-2">
                    <div className="flex justify-between text-[10.5px] uppercase tracking-wider text-black/80 font-semibold">
                      <span>Vertical (Y)</span>
                      <span className="font-bold">{focalY}%</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={focalY}
                      onChange={(e) => handleUpdateFocalY(Number(e.target.value))}
                      className="w-full accent-black cursor-pointer"
                    />
                    <div className="flex items-center justify-between text-[9px] text-black/50">
                      <span>Top (0%)</span>
                      <span>Torso (35%)</span>
                      <span>Hem (100%)</span>
                    </div>
                  </div>
                </div>

                {/* Visual Canvas and Live Storefront Previews */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-2">
                  <div className="lg:col-span-7">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] uppercase tracking-wider text-black/60 font-semibold">
                        Interactive Target Viewport (Click to anchor focal center):
                      </span>
                      <span className="text-[10px] font-mono text-black/40">
                        {currentAspectRatio} Aspect
                      </span>
                    </div>
                    <div
                      onClick={handleFocalPointClick}
                      className="relative w-full aspect-[3/4] border-2 border-black/30 overflow-hidden bg-black/5 cursor-crosshair group select-none shadow-md"
                    >
                      <img
                        src={primaryUrl}
                        alt="Focal source"
                        style={{
                          objectPosition: `${focalX}% ${focalY}%`,
                          transform: `${isFlipped ? 'scaleX(-1)' : ''} scale(${focalScale}) rotate(${focalRotation}deg)`,
                        }}
                        className="w-full h-full object-cover pointer-events-none transition-transform duration-100 ease-out"
                      />

                      {/* Rule of thirds lines */}
                      <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3 border border-black/10 opacity-30 group-hover:opacity-60 transition-opacity">
                        <div className="border-r border-b border-black/20" />
                        <div className="border-r border-b border-black/20" />
                        <div className="border-b border-black/20" />
                        <div className="border-r border-b border-black/20" />
                        <div className="border-r border-b border-black/20" />
                        <div className="border-b border-black/20" />
                        <div className="border-r border-b border-black/20" />
                        <div className="border-r border-b border-black/20" />
                        <div />
                      </div>

                      {/* Target crosshair */}
                      <div
                        style={{ left: `${focalX}%`, top: `${focalY}%` }}
                        className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none z-10 transition-all duration-75"
                      >
                        <div className="w-8 h-8 rounded-full border-2 border-white bg-black/50 flex items-center justify-center backdrop-blur-xs shadow-lg">
                          <div className="w-2 h-2 bg-white rounded-full ring-2 ring-black" />
                        </div>
                        <span className="absolute top-9 left-1/2 -translate-x-1/2 bg-black text-white text-[9px] px-2 py-0.5 whitespace-nowrap shadow-md rounded-xs">
                          X:{focalX}% Y:{focalY}%
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="lg:col-span-5 space-y-4">
                    <div className="text-[10.5px] uppercase tracking-wider text-black font-semibold border-b border-black/10 pb-1.5">
                      Storefront Multi-Frame Previews:
                    </div>

                    <div>
                      <span className="text-[10px] text-black/60 block mb-1">3:4 Archive Dossier & Catalogue:</span>
                      <div className="w-36 aspect-[3/4] border border-black/[0.15] overflow-hidden relative bg-black/5 shadow-xs">
                        <img
                          src={primaryUrl}
                          style={{
                            objectPosition: `${focalX}% ${focalY}%`,
                            transform: `${isFlipped ? 'scaleX(-1)' : ''} scale(${focalScale}) rotate(${focalRotation}deg)`,
                          }}
                          className="w-full h-full object-cover transition-transform duration-100"
                          alt="3:4 Preview"
                        />
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] text-black/60 block mb-1">1:1 Square (Cart & Checkout Bag):</span>
                      <div className="w-28 aspect-square border border-black/[0.15] overflow-hidden relative bg-black/5 shadow-xs">
                        <img
                          src={primaryUrl}
                          style={{
                            objectPosition: `${focalX}% ${focalY}%`,
                            transform: `${isFlipped ? 'scaleX(-1)' : ''} scale(${focalScale}) rotate(${focalRotation}deg)`,
                          }}
                          className="w-full h-full object-cover transition-transform duration-100"
                          alt="1:1 Preview"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: VARIANTS & STOCK MATRIX */}
          {activeTab === 'variants' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-black">Sizes & Inventory Matrix</h4>
                  <p className="text-xs text-black/60 font-sans mt-0.5">Manage individual sizes, stock counts, and SKUs.</p>
                </div>
                <div className="text-xs font-medium text-black">
                  Total Units: <span className="font-bold">{(formData.variants || []).reduce((a, v) => a + Number(v.stock || 0), 0)}</span>
                </div>
              </div>

              <div className="border border-black/[0.08] divide-y divide-black/[0.05]">
                <div className="grid grid-cols-12 p-2.5 text-[10px] uppercase tracking-wider bg-black/[0.02] font-semibold text-black/70">
                  <div className="col-span-3">Size</div>
                  <div className="col-span-4">SKU</div>
                  <div className="col-span-3">In Stock</div>
                  <div className="col-span-2 text-right">Status</div>
                </div>

                {(formData.variants || []).map((v, idx) => {
                  const stockNum = Number(v.stock) || 0;
                  return (
                    <div key={idx} className="grid grid-cols-12 p-3 items-center text-xs">
                      <div className="col-span-3 font-semibold">{v.size}</div>
                      <div className="col-span-4">
                        <input
                          type="text"
                          value={v.sku}
                          onChange={(e) => {
                            const newVariants = [...(formData.variants || [])];
                            newVariants[idx].sku = e.target.value;
                            setFormData({ ...formData, variants: newVariants });
                          }}
                          className="w-full px-2 py-1 border border-black/[0.1] focus:border-black text-[11px]"
                        />
                      </div>
                      <div className="col-span-3">
                        <input
                          type="number"
                          min="0"
                          value={v.stock}
                          onChange={(e) => {
                            const newVariants = [...(formData.variants || [])];
                            newVariants[idx].stock = parseInt(e.target.value) || 0;
                            setFormData({ ...formData, variants: newVariants });
                          }}
                          className="w-20 px-2 py-1 border border-black/[0.1] focus:border-black font-semibold"
                        />
                      </div>
                      <div className="col-span-2 text-right">
                        {stockNum === 0 ? (
                          <span className="text-[10px] text-rose-700 bg-rose-50 px-1.5 py-0.5">
                            Sold Out
                          </span>
                        ) : stockNum < 3 ? (
                          <span className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5">
                            Low ({stockNum})
                          </span>
                        ) : (
                          <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5">
                            In Stock ({stockNum})
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 4: PRICING */}
          {activeTab === 'pricing' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10.5px] uppercase tracking-wider text-black/60 mb-1">
                    Retail Price (€ incl. VAT)
                  </label>
                  <input
                    type="number"
                    value={formData.price || 0}
                    onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-sm font-semibold border border-black/[0.12] focus:border-black"
                  />
                </div>
                <div>
                  <label className="block text-[10.5px] uppercase tracking-wider text-black/60 mb-1">
                    Compare At Price (€)
                  </label>
                  <input
                    type="number"
                    value={formData.compareAtPrice || ''}
                    placeholder="Regular price..."
                    onChange={(e) => setFormData({ ...formData, compareAtPrice: parseFloat(e.target.value) || undefined })}
                    className="w-full px-3 py-2 text-sm border border-black/[0.12] focus:border-black"
                  />
                </div>
                <div>
                  <label className="block text-[10.5px] uppercase tracking-wider text-black/60 mb-1">
                    VAT Rate (%)
                  </label>
                  <input
                    type="number"
                    disabled
                    value={formData.vatRate || 24}
                    className="w-full px-3 py-2 text-sm border border-black/[0.08] bg-black/[0.02]"
                  />
                </div>
              </div>

              <div className="p-4 border border-black/[0.08] bg-neutral-50/50 text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-black/60">Net Price (VAT 0%):</span>
                  <span>{Math.round(((formData.price || 0) / 1.24) * 100) / 100} €</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-black/60">Value Added Tax (24%):</span>
                  <span>{Math.round(((formData.price || 0) - (formData.price || 0) / 1.24) * 100) / 100} €</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: TAXONOMY */}
          {activeTab === 'taxonomy' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10.5px] uppercase tracking-wider text-black/60 mb-1">
                    Primary Category
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => {
                      const newCat = e.target.value;
                      setFormData({
                        ...formData,
                        category: newCat as any,
                        categoryIds: [newCat],
                      });
                    }}
                    className="w-full px-3 py-2 text-xs border border-black/[0.12] focus:border-black cursor-pointer bg-white"
                  >
                    {categories.length > 0 ? (
                      categories
                        .filter((c) => !c.parentId)
                        .map((cat) => (
                          <option key={cat.id} value={cat.slug || cat.id}>
                            {cat.name.en || cat.name.fi} ({cat.slug || cat.id})
                          </option>
                        ))
                    ) : (
                      <>
                        <option value="naiset">Women (Naiset)</option>
                        <option value="miehet">Men (Miehet)</option>
                        <option value="asusteet">Accessories (Asusteet)</option>
                        <option value="kokoelmat">Collections (Kokoelmat)</option>
                      </>
                    )}
                  </select>
                </div>
                <div>
                  <label className="block text-[10.5px] uppercase tracking-wider text-black/60 mb-1">
                    Subcategory
                  </label>
                  {(() => {
                    const currentParent = categories.find(
                      (c) => (c.slug || c.id) === formData.category
                    );
                    const subcats = currentParent
                      ? categories.filter((c) => c.parentId === currentParent.id)
                      : [];

                    if (subcats.length > 0) {
                      return (
                        <select
                          value={formData.subcategory || ''}
                          onChange={(e) => setFormData({ ...formData, subcategory: e.target.value })}
                          className="w-full px-3 py-2 text-xs border border-black/[0.12] focus:border-black cursor-pointer bg-white"
                        >
                          <option value="">-- None / All --</option>
                          {subcats.map((sc) => (
                            <option key={sc.id} value={sc.slug || sc.id}>
                              {sc.name.en || sc.name.fi} ({sc.slug})
                            </option>
                          ))}
                        </select>
                      );
                    }

                    return (
                      <input
                        type="text"
                        value={formData.subcategory || ''}
                        placeholder="e.g. coats, knitwear..."
                        onChange={(e) => setFormData({ ...formData, subcategory: e.target.value })}
                        className="w-full px-3 py-2 text-xs border border-black/[0.12] focus:border-black"
                      />
                    );
                  })()}
                </div>
              </div>

              <div>
                <label className="block text-[10.5px] uppercase tracking-wider text-black/60 mb-1">
                  Collection Association
                </label>
                <select
                  value={formData.collectionSeason || 'perusvaatteet'}
                  onChange={(e) => setFormData({ ...formData, collectionSeason: e.target.value as any })}
                  className="w-full px-3 py-2 text-xs border border-black/[0.12] focus:border-black cursor-pointer bg-white"
                >
                  {collections.length > 0 ? (
                    collections.map((col) => (
                      <option key={col.id} value={col.slug || col.id}>
                        {typeof col.name === 'string' ? col.name : (col.name.en || col.name.fi)} ({col.type})
                      </option>
                    ))
                  ) : (
                    <>
                      <option value="talvi">Talvi 2026 · Kaamoksen Muodot</option>
                      <option value="perusvaatteet">Archival Essentials</option>
                      <option value="kevat">Kevät 2026 · Valon Paluu</option>
                    </>
                  )}
                </select>
              </div>

              <div className="pt-3 border-t border-black/[0.08]">
                <label className="flex items-center gap-2 text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isLimited || false}
                    onChange={(e) => setFormData({ ...formData, isLimited: e.target.checked })}
                    className="w-4 h-4 accent-black cursor-pointer"
                  />
                  <span>Limited Archival Edition (Edition numbered)</span>
                </label>
              </div>
            </div>
          )}

          {/* TAB 6: PUBLISHING & SEO */}
          {activeTab === 'seo' && (
            <div className="space-y-6">
              <div>
                <label className="block text-[10.5px] uppercase tracking-wider text-black/60 mb-1">
                  Publishing Status
                </label>
                <select
                  value={formData.isComingSoon || formData.status === 'coming_soon' ? 'coming_soon' : formData.status}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === 'coming_soon') {
                      setFormData({ ...formData, status: 'coming_soon', isComingSoon: true });
                    } else {
                      setFormData({ ...formData, status: val as any, isComingSoon: false });
                    }
                  }}
                  className="w-full px-3 py-2 text-xs border border-black/[0.12] focus:border-black font-semibold cursor-pointer bg-white"
                >
                  <option value="live">Live (Public in archive)</option>
                  <option value="coming_soon">Coming Soon (Priority Waitlist Mode)</option>
                  <option value="draft">Draft (Restricted to Studio)</option>
                  <option value="scheduled">Scheduled Drop</option>
                  <option value="sold_out">Sold Out</option>
                  <option value="archived">Archived</option>
                </select>
              </div>

              {formData.status === 'scheduled' && (
                <div className="p-3 border border-black/[0.08] bg-neutral-50/50 space-y-2">
                  <label className="block text-[10.5px] uppercase tracking-wider text-black/60">
                    Scheduled Publish Timestamp
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.publishAt ? new Date(formData.publishAt).toISOString().slice(0, 16) : ''}
                    onChange={(e) => setFormData({ ...formData, publishAt: new Date(e.target.value).toISOString() })}
                    className="px-3 py-2 text-xs border border-black/[0.12] focus:border-black"
                  />
                  <p className="text-[10px] text-black/60">
                    Product publishes automatically to the live storefront when this time is reached.
                  </p>
                </div>
              )}

              <div>
                <label className="block text-[10.5px] uppercase tracking-wider text-black/60 mb-1">
                  SEO Page Title
                </label>
                <input
                  type="text"
                  value={formData.seo?.title || ''}
                  onChange={(e) => setFormData({ ...formData, seo: { ...formData.seo, title: e.target.value } })}
                  placeholder={`${formData.name?.en || 'Piece'} | Zejesh Studio Helsinki`}
                  className="w-full px-3 py-2 text-xs border border-black/[0.12] focus:border-black"
                />
              </div>

              <div>
                <label className="block text-[10.5px] uppercase tracking-wider text-black/60 mb-1">
                  SEO Meta Description
                </label>
                <textarea
                  rows={2}
                  value={formData.seo?.description || ''}
                  onChange={(e) => setFormData({ ...formData, seo: { ...formData.seo, description: e.target.value } })}
                  placeholder="Nordic archival tailoring crafted in Finland."
                  className="w-full px-3 py-2 text-xs font-sans border border-black/[0.12] focus:border-black"
                />
              </div>

              {/* Audit trail */}
              <div className="p-3 border border-black/[0.08] bg-neutral-50/50 text-[10px] text-black/50 space-y-1">
                <div>Created: {formData.createdAt ? new Date(formData.createdAt).toLocaleString('en-US') : 'Original archive'}</div>
                <div>Last updated: {formData.updatedAt ? new Date(formData.updatedAt).toLocaleString('en-US') : 'Unmodified'}</div>
                <div>Operator: {adminProfile?.name || 'Studio Principal'}</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Shared media picker: device upload (Supabase Storage), library, paste URL */}
      <UniversalMediaPickerModal
        isOpen={pickerTarget !== null}
        onClose={() => setPickerTarget(null)}
        onSelect={handlePickerSelect}
        title={pickerTitle}
        allowedKind="image"
        currentUrl={pickerCurrentUrl}
      />

      {/* Shared framing editor — the result is persisted on this record */}
      <UniversalImageEditorModal
        isOpen={editorTarget !== null}
        imageUrl={editorImageUrl}
        title={editorTitle}
        initialFraming={editorInitialFraming}
        onClose={() => setEditorTarget(null)}
        onApply={handleApplyEditorFraming}
      />

      {/* Alt text for one gallery picture */}
      {altEditIndex !== null && (
        <div
          className="fixed inset-0 z-[70] bg-black/60 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Edit alt text"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setAltEditIndex(null);
          }}
        >
          <div className="w-full max-w-md bg-white border border-black p-5 space-y-4 shadow-2xl">
            <div className="border-b border-black/10 pb-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider flex items-center gap-2">
                <Type className="w-4 h-4" />
                <span>Alt Text — Picture #{altEditIndex + 1}</span>
              </h3>
              <p className="text-[11px] text-black/60 mt-1">
                Describes the picture for search engines and screen readers.
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-black/60 mb-1">
                  English (required)
                </label>
                <input
                  type="text"
                  value={altDraftEn}
                  onChange={(e) => setAltDraftEn(e.target.value)}
                  placeholder="e.g. Charcoal wool overcoat, front view"
                  className="w-full px-3 py-2 text-xs border border-black/[0.15] focus:border-black focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-black/60 mb-1">
                  Finnish
                </label>
                <input
                  type="text"
                  value={altDraftFi}
                  onChange={(e) => setAltDraftFi(e.target.value)}
                  placeholder="e.g. Hiilenharmaa villapaita, etukuv"
                  className="w-full px-3 py-2 text-xs border border-black/[0.15] focus:border-black focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setAltEditIndex(null)}
                className="px-3 py-2 text-[11px] uppercase font-mono border border-black/20 hover:border-black cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveAlt}
                disabled={isSavingAlt}
                className="px-3 py-2 text-[11px] uppercase font-mono bg-black text-white hover:bg-neutral-800 disabled:opacity-50 cursor-pointer"
              >
                {isSavingAlt ? 'Saving…' : 'Save Alt Text'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Usage-aware removal: never break another storefront image by accident */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-[70] bg-black/60 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Remove picture"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setDeleteTarget(null);
          }}
        >
          <div className="w-full max-w-lg bg-white border border-black p-5 space-y-4 shadow-2xl">
            <div className="border-b border-black/10 pb-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider flex items-center gap-2">
                <Trash2 className="w-4 h-4" />
                <span>Remove This Picture?</span>
              </h3>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-black/70">
                Choose how far the removal should go. Removing a reference never deletes the file, so no
                other storefront image can break.
              </p>

              <div className="p-3 border border-black/10 bg-neutral-50/70">
                <p className="text-[10px] uppercase tracking-wider text-black/60 mb-1">Where it is used</p>
                {checkingUsage ? (
                  <p className="text-black/60">Checking usage…</p>
                ) : deleteUsage ? (
                  deleteUsage.totalUses === 0 ? (
                    <p className="text-black/70">No data yet — this file is not referenced anywhere else.</p>
                  ) : (
                    <ul className="space-y-1 text-black/70">
                      {deleteUsage.productTitles.length > 0 && (
                        <li>
                          Products: {deleteUsage.productTitles.slice(0, 6).join(', ')}
                          {deleteUsage.productTitles.length > 6 ? '…' : ''}
                        </li>
                      )}
                      {deleteUsage.heroUsage && <li>Home hero section</li>}
                      {deleteUsage.contentSections.length > 0 && (
                        <li>Content sections: {deleteUsage.contentSections.join(', ')}</li>
                      )}
                    </ul>
                  )
                ) : (
                  <p className="text-black/50">Could not load data</p>
                )}
              </div>

              {deleteError && (
                <p className="text-[11px] text-red-700 border border-red-200 bg-red-50 p-2">{deleteError}</p>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 pt-1 border-t border-black/10">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-3 py-2 text-[11px] uppercase font-mono border border-black/20 hover:border-black cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRemoveReference}
                className="px-3 py-2 text-[11px] uppercase font-mono border border-black hover:bg-black hover:text-white cursor-pointer"
              >
                Remove From This Record
              </button>
              <button
                type="button"
                onClick={handleRemoveEverywhere}
                disabled={deleteAction === 'working' || checkingUsage}
                className="px-3 py-2 text-[11px] uppercase font-mono border border-black bg-black text-white hover:bg-neutral-800 disabled:opacity-50 cursor-pointer"
              >
                {deleteAction === 'working' ? 'Working…' : 'Remove Everywhere'}
              </button>
              <button
                type="button"
                onClick={handleDeletePermanently}
                disabled={deleteAction === 'working' || checkingUsage}
                className="px-3 py-2 text-[11px] uppercase font-mono border border-red-300 text-red-700 hover:bg-red-600 hover:text-white hover:border-red-600 disabled:opacity-50 cursor-pointer"
              >
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
