import React, { useState, useEffect } from 'react';
import { Product, ProductVariant, Category, Collection } from '../../types';
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
} from 'lucide-react';
import { ImageFrameAdjusterModal, FrameAdjusterResult } from '../components/ImageFrameAdjusterModal';
import { uploadMediaAsset } from '../../supabase/mediaService';

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

  useEffect(() => {
    if (product) {
      setFormData({ ...product });
    } else {
      const randSuffix = String(Date.now() % 10000).padStart(4, '0');
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
  }, [product, isOpen]);

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

  // File upload input refs
  const primaryFileInputRef = React.useRef<HTMLInputElement | null>(null);
  const hoverFileInputRef = React.useRef<HTMLInputElement | null>(null);
  const galleryFileInputRef = React.useRef<HTMLInputElement | null>(null);

  // Full Adjuster Modal state
  const [isAdjusterModalOpen, setIsAdjusterModalOpen] = useState(false);
  const [adjustingTarget, setAdjustingTarget] = useState<'primary' | 'hover'>('primary');

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
    const updatedImages = [...(formData.images || [])];
    if (updatedImages[0]) {
      updatedImages[0] = { ...updatedImages[0], url };
    } else {
      updatedImages[0] = { url, order: 0, focalX: 50, focalY: 18, isPrimary: true };
    }
    setFormData({ ...formData, image: url, images: updatedImages });
  };

  const handleUpdateHoverUrl = (url: string) => {
    setFormData({ ...formData, hoverImage: url });
  };

  // Device file upload handler
  const handleDeviceFileUpload = async (
    file: File | undefined,
    target: 'primary' | 'hover' | 'gallery'
  ) => {
    if (!file) return;
    try {
      const asset = await uploadMediaAsset(file);
      if (target === 'primary') {
        handleUpdateImageUrl(asset.url);
      } else if (target === 'hover') {
        handleUpdateHoverUrl(asset.url);
      } else if (target === 'gallery') {
        const currentList = [...(formData.images || [])];
        currentList.push({
          url: asset.url,
          order: currentList.length,
          focalX: asset.focalX ?? 50,
          focalY: asset.focalY ?? 20,
        });
        setFormData({ ...formData, images: currentList });
      }
    } catch (err: any) {
      alert(err.message || 'File upload failed');
    }
  };

  // Delete image handlers
  const handleDeletePrimaryImage = () => {
    const currentList = [...(formData.images || [])];
    if (currentList.length > 0) {
      currentList.shift();
    }
    const nextPrimary = currentList[0]?.url || '';
    setFormData({
      ...formData,
      image: nextPrimary,
      images: currentList,
    });
  };

  const handleDeleteHoverImage = () => {
    setFormData({ ...formData, hoverImage: '' });
  };

  const handleDeleteGalleryImage = (index: number) => {
    const currentList = [...(formData.images || [])];
    currentList.splice(index, 1);
    setFormData({
      ...formData,
      images: currentList,
      image: currentList[0]?.url || formData.image,
    });
  };

  const handleUpdateFocalX = (x: number) => {
    const updatedImages = [...(formData.images || [])];
    if (updatedImages[0]) {
      updatedImages[0] = { ...updatedImages[0], focalX: x };
    }
    setFormData({
      ...formData,
      imagePosition: `${x}% ${focalY}%`,
      images: updatedImages,
      cropVariation: cropWithOnModel(`${x}% ${focalY}%`, focalScale),
    });
  };

  const handleUpdateFocalY = (y: number) => {
    const updatedImages = [...(formData.images || [])];
    if (updatedImages[0]) {
      updatedImages[0] = { ...updatedImages[0], focalY: y };
    }
    setFormData({
      ...formData,
      imagePosition: `${focalX}% ${y}%`,
      images: updatedImages,
      cropVariation: cropWithOnModel(`${focalX}% ${y}%`, focalScale),
    });
  };

  const handleUpdateScale = (scale: number) => {
    setFormData({
      ...formData,
      imageScale: scale,
      cropVariation: cropWithOnModel(`${focalX}% ${focalY}%`, scale),
    });
  };

  const handleUpdateRotation = (rotation: number) => {
    setFormData({
      ...formData,
      imageRotation: rotation,
    } as any);
  };

  const handleToggleFlip = () => {
    setFormData({
      ...formData,
      cropVariation: cropWithOnModel(`${focalX}% ${focalY}%`, focalScale, currentAspectRatio as any, !isFlipped),
    });
  };

  const handleFocalPointClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, Math.round(((e.clientX - rect.left) / rect.width) * 100)));
    const y = Math.max(0, Math.min(100, Math.round(((e.clientY - rect.top) / rect.height) * 100)));

    const updatedImages = [...(formData.images || [])];
    if (updatedImages[0]) {
      updatedImages[0] = {
        ...updatedImages[0],
        focalX: x,
        focalY: y,
      };
      setFormData({
        ...formData,
        imagePosition: `${x}% ${y}%`,
        images: updatedImages,
        cropVariation: cropWithOnModel(`${x}% ${y}%`, focalScale),
      });
    }
  };

  // Open modal adjuster for primary or hover image
  const handleOpenAdjuster = (target: 'primary' | 'hover') => {
    setAdjustingTarget(target);
    setIsAdjusterModalOpen(true);
  };

  // Apply results from modal adjuster
  const handleApplyAdjusterResult = (res: FrameAdjusterResult) => {
    if (adjustingTarget === 'primary') {
      const updatedImages = [...(formData.images || [])];
      if (updatedImages[0]) {
        updatedImages[0] = {
          ...updatedImages[0],
          focalX: res.focalX,
          focalY: res.focalY,
          scale: res.scale,
          rotation: res.rotation,
        };
      }
      setFormData({
        ...formData,
        imagePosition: res.position,
        imageScale: res.scale,
        imageRotation: res.rotation,
        images: updatedImages,
        cropVariation: cropWithOnModel(res.position, res.scale, res.aspectRatio as any, res.flipped),
      } as any);
    } else {
      setFormData({
        ...formData,
        hoverImagePosition: res.position,
        hoverImageRotation: res.rotation,
      } as any);
    }
  };

  const { saveProduct, deleteProduct } = useStorefrontData();

  const handleSave = async () => {
    setIsSaving(true);
    setSaveError(null);

    const productId = product?.id || `prod-${Date.now()}`;
    const cleanProduct: Product = {
      ...(formData as Product),
      id: productId,
      image: primaryUrl,
      hoverImage: hoverUrl || primaryUrl,
      imagePosition: `${focalX}% ${focalY}%`,
      imageScale: focalScale,
      imageRotation: focalRotation,
      cropVariation: cropWithOnModel(`${focalX}% ${focalY}%`, focalScale, currentAspectRatio as any, isFlipped),
      isComingSoon: Boolean(formData.isComingSoon || formData.status === 'coming_soon'),
      comingSoonNotice: formData.comingSoonNotice || '',
      updatedAt: new Date().toISOString(),
    };

    try {
      await saveProduct(cleanProduct);

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
              <span>Product successfully updated in Firestore archive!</span>
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
              {/* Hidden file inputs for device file uploads */}
              <input
                ref={primaryFileInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => {
                  handleDeviceFileUpload(e.target.files?.[0], 'primary');
                  e.target.value = '';
                }}
                className="hidden"
              />
              <input
                ref={hoverFileInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => {
                  handleDeviceFileUpload(e.target.files?.[0], 'hover');
                  e.target.value = '';
                }}
                className="hidden"
              />
              <input
                ref={galleryFileInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => {
                  handleDeviceFileUpload(e.target.files?.[0], 'gallery');
                  e.target.value = '';
                }}
                className="hidden"
              />

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
                      onClick={() => primaryFileInputRef.current?.click()}
                      className="px-2.5 py-1 text-[10.5px] uppercase font-mono font-medium bg-black text-white hover:bg-neutral-800 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    >
                      <Upload className="w-3 h-3" />
                      <span>Upload from Device</span>
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
                        Primary Image URL (or upload local file above):
                      </label>
                      <input
                        type="text"
                        value={primaryUrl}
                        onChange={(e) => handleUpdateImageUrl(e.target.value)}
                        placeholder="https://... or data:image/..."
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
                      onClick={() => hoverFileInputRef.current?.click()}
                      className="px-2.5 py-1 text-[10.5px] uppercase font-mono font-medium bg-black text-white hover:bg-neutral-800 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    >
                      <Upload className="w-3 h-3" />
                      <span>Upload from Device</span>
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
                      placeholder="https://... or data:image/..."
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
                    onClick={() => galleryFileInputRef.current?.click()}
                    className="px-3 py-1.5 text-[11px] uppercase tracking-wider font-mono bg-black text-white hover:bg-neutral-800 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Upload Picture from Device</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3 pt-2">
                  {(formData.images || []).map((img, idx) => (
                    <div
                      key={idx}
                      className="relative border border-black/15 bg-white p-1 group shadow-2xs"
                    >
                      <div className="w-full aspect-[3/4] overflow-hidden bg-neutral-100 relative">
                        <img src={img.url} alt={`Gallery ${idx + 1}`} className="w-full h-full object-cover" />
                        <span className="absolute top-1 left-1 bg-black text-white text-[8px] font-mono px-1 py-0.5">
                          {idx === 0 ? 'PRIMARY' : `#${idx + 1}`}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-1 pt-1 border-t border-black/10">
                        <button
                          type="button"
                          onClick={() => {
                            handleUpdateImageUrl(img.url);
                          }}
                          className="text-[9px] uppercase tracking-wider font-mono text-black hover:underline cursor-pointer"
                        >
                          Make Main
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteGalleryImage(idx)}
                          className="text-red-600 hover:text-red-800 p-0.5 cursor-pointer"
                          title="Delete image"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
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

      {/* Fullscreen Interactive Best Frame & Angle Modal */}
      <ImageFrameAdjusterModal
        isOpen={isAdjusterModalOpen}
        imageUrl={adjustingTarget === 'primary' ? primaryUrl : (hoverUrl || primaryUrl)}
        title={adjustingTarget === 'primary' ? 'Adjust Primary Garment Frame & Angle' : 'Adjust Hover Model Picture Frame & Angle'}
        initialFocalX={focalX}
        initialFocalY={focalY}
        initialScale={focalScale}
        initialRotation={focalRotation}
        initialAspectRatio={currentAspectRatio}
        initialFlipped={isFlipped}
        onClose={() => setIsAdjusterModalOpen(false)}
        onApply={handleApplyAdjusterResult}
        onUploadFile={(dataUrl) => {
          if (adjustingTarget === 'primary') handleUpdateImageUrl(dataUrl);
          else handleUpdateHoverUrl(dataUrl);
        }}
        onDeleteImage={adjustingTarget === 'primary' ? handleDeletePrimaryImage : handleDeleteHoverImage}
      />
    </div>
  );
};
