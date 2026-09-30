import React, { useState, useEffect } from 'react';
import { Product, ProductVariant } from '../../types';
import { useAuth } from '../../firebase/AuthContext';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { logAuditEvent } from '../../firebase/dbService';
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
} from 'lucide-react';

interface AdminProductEditorDrawerProps {
  isOpen: boolean;
  product: Product | null;
  onClose: () => void;
  onSaveSuccess: (updatedProduct: Product) => void;
}

const PLACEHOLDER_IMG = 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&q=80&w=1200';

export const AdminProductEditorDrawer: React.FC<AdminProductEditorDrawerProps> = ({
  isOpen,
  product,
  onClose,
  onSaveSuccess,
}) => {
  const { isEditor, isOwner, adminProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<'basic' | 'media' | 'variants' | 'pricing' | 'taxonomy' | 'seo'>('basic');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Form state initialized from selected product or default new product template
  const [formData, setFormData] = useState<Partial<Product>>(() => {
    if (product) return { ...product };
    return {
      nr: `ZE-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      name: { fi: 'Uusi Arkistoteos', en: 'New Archival Piece', sv: 'Nytt Arkivstycke' },
      description: {
        fi: 'Hienostunut skandinaavinen villakangasteos.',
        en: 'Refined Scandinavian archival piece tailored with virgin wool.',
        sv: 'Förfinat skandinaviskt arkivstycke i ren ull.',
      },
      price: 480,
      vatRate: 24,
      category: 'naiset',
      subcategory: 'takit',
      collectionSeason: 'talvi',
      material: { fi: '100 % Neitseellinen villa', en: '100% Virgin Wool', sv: '100% Ren ull' },
      origin: { fi: 'Kudottu Suomessa', en: 'Woven in Finland', sv: 'Vävd i Finland' },
      care: { fi: 'Vain kemiallinen pesu', en: 'Dry clean only', sv: 'Endast kemtvätt' },
      images: [
        {
          url: PLACEHOLDER_IMG,
          order: 0,
          focalX: 50,
          focalY: 18,
          isPrimary: true,
        },
      ],
      variants: [
        { size: 'XS', sku: 'ZE-NEW-XS', stock: 4 },
        { size: 'S', sku: 'ZE-NEW-S', stock: 8 },
        { size: 'M', sku: 'ZE-NEW-M', stock: 6 },
        { size: 'L', sku: 'ZE-NEW-L', stock: 3 },
      ],
      limitedEdition: { isLimited: true, editionSize: 50, soldCount: 0 },
      isLimited: true,
      status: 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  });

  useEffect(() => {
    if (product) {
      setFormData({ ...product });
    } else {
      setFormData({
        nr: `ZE-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
        name: { fi: 'Uusi Arkistoteos', en: 'New Archival Piece', sv: 'Nytt Arkivstycke' },
        description: {
          fi: 'Hienostunut skandinaavinen villakangasteos.',
          en: 'Refined Scandinavian archival piece tailored with virgin wool.',
          sv: 'Förfinat skandinaviskt arkivstycke i ren ull.',
        },
        price: 480,
        vatRate: 24,
        category: 'naiset',
        subcategory: 'takit',
        collectionSeason: 'talvi',
        material: { fi: '100 % Neitseellinen villa', en: '100% Virgin Wool', sv: '100% Ren ull' },
        origin: { fi: 'Kudottu Suomessa', en: 'Woven in Finland', sv: 'Vävd i Finland' },
        care: { fi: 'Vain kemiallinen pesu', en: 'Dry clean only', sv: 'Endast kemtvätt' },
        images: [
          {
            url: PLACEHOLDER_IMG,
            order: 0,
            focalX: 50,
            focalY: 18,
            isPrimary: true,
          },
        ],
        variants: [
          { size: 'XS', sku: 'ZE-NEW-XS', stock: 4 },
          { size: 'S', sku: 'ZE-NEW-S', stock: 8 },
          { size: 'M', sku: 'ZE-NEW-M', stock: 6 },
          { size: 'L', sku: 'ZE-NEW-L', stock: 3 },
        ],
        limitedEdition: { isLimited: true, editionSize: 50, soldCount: 0 },
        isLimited: true,
        status: 'draft',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
  }, [product, isOpen]);

  if (!isOpen) return null;

  // Active focal point state
  const activeImage = formData.images?.[0];
  const focalX = activeImage?.focalX ?? 50;
  const focalY = activeImage?.focalY ?? 18;

  const handleFocalPointClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.round(((e.clientX - rect.left) / rect.width) * 100);
    const y = Math.round(((e.clientY - rect.top) / rect.height) * 100);

    const updatedImages = [...(formData.images || [])];
    if (updatedImages[0]) {
      updatedImages[0] = {
        ...updatedImages[0],
        focalX: x,
        focalY: y,
      };
      setFormData({ ...formData, images: updatedImages });
    }
  };

  const handleSave = async () => {
    if (!isEditor) {
      setSaveError('Permission Denied: Editor or Owner role required to save product records.');
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    const productId = product?.id || `prod-${Date.now()}`;
    const cleanProduct: Product = {
      ...(formData as Product),
      id: productId,
      updatedAt: new Date().toISOString(),
    };

    try {
      await setDoc(doc(db, 'products', productId), cleanProduct, { merge: true });

      // Log immutable audit entry
      await logAuditEvent(
        adminProfile?.email || 'studio-principal',
        product ? 'PRODUCT_UPDATED' : 'PRODUCT_CREATED',
        `Product: ${cleanProduct.name.en} (${cleanProduct.nr})`,
        { price: cleanProduct.price, status: cleanProduct.status }
      );

      setIsSaving(false);
      setSaveSuccess(true);
      onSaveSuccess(cleanProduct);

      setTimeout(() => {
        setSaveSuccess(false);
        onClose();
      }, 700);
    } catch (err: any) {
      setIsSaving(false);
      setSaveError(err.message || 'Error occurred while saving to Firestore.');
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
      <div className="relative w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col z-10 animate-slideLeft border-l border-black/[0.08] select-none font-mono">
        {/* Top Header */}
        <div className="p-4 sm:p-6 border-b border-black/[0.08] flex items-center justify-between bg-white shrink-0">
          <div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-black/40">
              {product ? 'Edit Archival Item' : 'Create New Archival Item'}
            </div>
            <h3 className="font-editorial text-xl sm:text-2xl font-normal text-black mt-0.5 truncate max-w-md">
              {formData.name?.en || 'Untitled Archival Piece'}
            </h3>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="py-1.5 px-3 bg-black text-white hover:bg-black/85 text-xs font-mono uppercase tracking-wider flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
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

          {/* TAB 2: MEDIA & FOCAL POINT PICKER */}
          {activeTab === 'media' && (
            <div className="space-y-6">
              <div className="p-4 border border-black/[0.08] bg-neutral-50/50">
                <h4 className="text-xs font-semibold uppercase tracking-wider mb-1 text-black">
                  Interactive Focal Point Picker
                </h4>
                <p className="text-xs text-black/60 font-sans">
                  Click on the visual below to set the optical anchor point. Renders adapt seamlessly to all aspect ratios (3:4, 4:5, 1:1, 16:9).
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-7">
                  <div
                    onClick={handleFocalPointClick}
                    className="relative w-full aspect-[3/4] border border-black/[0.12] overflow-hidden bg-black/5 cursor-crosshair group select-none"
                  >
                    <img
                      src={activeImage?.url || PLACEHOLDER_IMG}
                      alt="Focal source"
                      className="w-full h-full object-cover pointer-events-none"
                    />

                    {/* Target crosshair */}
                    <div
                      style={{ left: `${focalX}%`, top: `${focalY}%` }}
                      className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                    >
                      <div className="w-7 h-7 rounded-full border border-black/80 bg-white/40 flex items-center justify-center backdrop-blur-sm">
                        <div className="w-1.5 h-1.5 bg-black rounded-full" />
                      </div>
                      <span className="absolute top-8 left-1/2 -translate-x-1/2 bg-black text-white text-[9px] px-1.5 py-0.5 whitespace-nowrap">
                        X:{focalX}% Y:{focalY}%
                      </span>
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-5 space-y-4">
                  <div className="text-[10.5px] uppercase tracking-wider text-black/60">
                    Live Aspect Ratio Previews:
                  </div>

                  <div>
                    <span className="text-[10px] text-black/50 block mb-1">3:4 Archive & PDP Packshot:</span>
                    <div className="w-32 aspect-[3/4] border border-black/[0.1] overflow-hidden relative bg-black/5">
                      <img
                        src={activeImage?.url || PLACEHOLDER_IMG}
                        style={{ objectPosition: `${focalX}% ${focalY}%` }}
                        className="w-full h-full object-cover"
                        alt="3:4"
                      />
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] text-black/50 block mb-1">1:1 Square (Cart & Checkout):</span>
                    <div className="w-24 aspect-square border border-black/[0.1] overflow-hidden relative bg-black/5">
                      <img
                        src={activeImage?.url || PLACEHOLDER_IMG}
                        style={{ objectPosition: `${focalX}% ${focalY}%` }}
                        className="w-full h-full object-cover"
                        alt="1:1"
                      />
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
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                    className="w-full px-3 py-2 text-xs border border-black/[0.12] focus:border-black cursor-pointer bg-white"
                  >
                    <option value="naiset">Women (Naiset)</option>
                    <option value="miehet">Men (Miehet)</option>
                    <option value="asusteet">Accessories (Asusteet)</option>
                    <option value="kokoelmat">Collections (Kokoelmat)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10.5px] uppercase tracking-wider text-black/60 mb-1">
                    Subcategory Slug
                  </label>
                  <input
                    type="text"
                    value={formData.subcategory || ''}
                    onChange={(e) => setFormData({ ...formData, subcategory: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-black/[0.12] focus:border-black"
                  />
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
                  <option value="talvi">Talvi 2026 · Kaamoksen Muodot</option>
                  <option value="perusvaatteet">Archival Essentials</option>
                  <option value="kevat">Kevät 2026 · Valon Paluu</option>
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
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  className="w-full px-3 py-2 text-xs border border-black/[0.12] focus:border-black font-semibold cursor-pointer bg-white"
                >
                  <option value="live">Live (Public in archive)</option>
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
    </div>
  );
};
