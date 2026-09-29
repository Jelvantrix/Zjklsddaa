import React, { useState, useEffect } from 'react';
import { X, Save, Clock, Eye, Sparkles, Layers, Image as ImageIcon, Tag, DollarSign, Globe, Check, AlertCircle } from 'lucide-react';
import { Product, ProductVariant, ProductImage } from '../../types';
import { PLACEHOLDER_IMG } from '../../data/mockData';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { logAuditEvent } from '../../firebase/dbService';
import { useAuth } from '../../firebase/AuthContext';

interface AdminProductEditorDrawerProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onSaveSuccess: (updated: Product) => void;
}

export const AdminProductEditorDrawer: React.FC<AdminProductEditorDrawerProps> = ({
  product,
  isOpen,
  onClose,
  onSaveSuccess,
}) => {
  const { adminProfile, role } = useAuth();
  const [activeTab, setActiveTab] = useState<'basic' | 'media' | 'variants' | 'pricing' | 'taxonomy' | 'seo'>('basic');
  const [formData, setFormData] = useState<Product | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedImageIdx, setSelectedImageIdx] = useState(0);

  useEffect(() => {
    if (product) {
      setFormData(JSON.parse(JSON.stringify(product)));
    } else {
      // Default new product template
      const newNr = 'Nº 025';
      setFormData({
        id: `prod-${Date.now()}`,
        nr: newNr,
        plateNumber: newNr,
        name: { fi: 'Uusi Arkistoteos', en: 'New Archival Piece', sv: 'Nytt Arkivstycke' },
        description: { fi: 'Korkealuokkainen suomalainen leikkaus.', en: 'High-grade Nordic tailoring.', sv: 'Högklassigt snitt.' },
        material: { fi: '100% Neitseellinen Merinovilla (380 g/m²)', en: '100% Virgin Merino Wool (380 g/m²)', sv: '100% Merinoull' },
        origin: { fi: 'Valmistettu Mikkelissä, Suomessa', en: 'Crafted in Mikkeli, Finland', sv: 'Tillverkad i S:t Michel, Finland' },
        care: { fi: 'Tuuletus riittää. Kemiallinen pesu tarvittaessa.', en: 'Air out regularly. Dry clean only.', sv: 'Vädring räcker.' },
        price: 360,
        vatRate: 24,
        category: 'naiset',
        subcategory: 'Takit & Ulkovaatteet',
        variants: [
          { size: 'XS', sku: `ZEJ-025-XS`, stock: 4 },
          { size: 'S', sku: `ZEJ-025-S`, stock: 6 },
          { size: 'M', sku: `ZEJ-025-M`, stock: 8 },
          { size: 'L', sku: `ZEJ-025-L`, stock: 4 },
          { size: 'XL', sku: `ZEJ-025-XL`, stock: 2 },
        ],
        sizes: ['XS', 'S', 'M', 'L', 'XL'],
        stock: 24,
        isLimited: true,
        limitedEdition: { isLimited: true, editionSize: 30, soldCount: 0 },
        images: [
          { url: PLACEHOLDER_IMG, alt: { fi: 'Studio kuva', en: 'Studio packshot', sv: 'Studio' }, focalX: 50, focalY: 20, order: 0, isPrimary: true },
          { url: PLACEHOLDER_IMG, alt: { fi: 'Mallin päällä', en: 'On model', sv: 'På modell' }, focalX: 50, focalY: 25, order: 1, isHover: true },
        ],
        status: 'draft',
        colorName: { fi: 'Hiilenmusta', en: 'Carbon Black', sv: 'Kolsva' },
        colorHex: '#141414',
        cropVariation: {
          packshot: { position: 'center 18%', scale: 1.1, aspectRatio: '3/4' },
          onModel: { position: 'center 22%', scale: 1.1, aspectRatio: '3/4' },
          detail1: { position: 'center 30%', scale: 1.5 },
          detail2: { position: 'center 40%', scale: 1.5 },
          detail3: { position: 'center 50%', scale: 1.5 },
          detail4: { position: 'center 60%', scale: 1.5 },
        },
      });
    }
  }, [product, isOpen]);

  if (!isOpen || !formData) return null;

  // Focal Point interactive click handler
  const handleFocalPointClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.round(((e.clientX - rect.left) / rect.width) * 100);
    const y = Math.round(((e.clientY - rect.top) / rect.height) * 100);

    const updatedImages = [...(formData.images || [])];
    if (updatedImages[selectedImageIdx]) {
      updatedImages[selectedImageIdx] = {
        ...updatedImages[selectedImageIdx],
        focalX: Math.max(0, Math.min(100, x)),
        focalY: Math.max(0, Math.min(100, y)),
      };
      setFormData({ ...formData, images: updatedImages });
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const totalStock = (formData.variants || []).reduce((acc, v) => acc + (Number(v.stock) || 0), 0);
      const toSave: Product = {
        ...formData,
        stock: totalStock,
        sizes: (formData.variants || []).map((v) => v.size),
        updatedAt: new Date().toISOString(),
      };

      await setDoc(doc(db, 'products', toSave.id), toSave);
      await logAuditEvent(
        adminProfile?.name || 'admin',
        'update_product',
        toSave.id,
        { nr: toSave.nr, price: toSave.price, status: toSave.status }
      );

      onSaveSuccess(toSave);
      onClose();
    } catch (err) {
      console.error('Failed saving product to Firestore:', err);
      // Fallback local notification
      onSaveSuccess(formData);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  const activeImage = formData.images?.[selectedImageIdx] || formData.images?.[0];
  const focalX = activeImage?.focalX ?? 50;
  const focalY = activeImage?.focalY ?? 20;

  return (
    <div className="fixed inset-0 z-[90] flex justify-end">
      <div onClick={onClose} className="fixed inset-0 bg-black/60 backdrop-blur-xs" />

      <div className="relative w-full max-w-4xl bg-white border-l border-black h-full flex flex-col z-10 animate-slideLeft shadow-2xl overflow-hidden">
        {/* Top Header */}
        <div className="p-4 sm:p-5 border-b border-black/10 flex items-center justify-between bg-white">
          <div className="flex items-center gap-3">
            <span className="font-mono text-sm font-semibold tracking-wider bg-black text-white px-2 py-0.5">
              {formData.nr || formData.plateNumber}
            </span>
            <h2 className="font-editorial text-xl sm:text-2xl font-normal">
              {formData.name.fi || 'Nimetön teos'}
            </h2>
            <span className="text-[10px] font-mono uppercase px-2 py-0.5 border border-black/20">
              {formData.status}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-2 bg-black text-white text-xs font-mono uppercase tracking-wider flex items-center gap-1.5 hover:bg-black/80 transition-colors cursor-pointer disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSaving ? 'Tallennetaan...' : 'Tallenna muutokset'}</span>
            </button>
            <button onClick={onClose} className="p-2 text-black/50 hover:text-black cursor-pointer">
              <X className="w-5 h-5 stroke-[1.5]" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-black/15 bg-black/[0.02] overflow-x-auto no-scrollbar text-xs font-mono uppercase tracking-wider">
          {[
            { id: 'basic', label: '1. Perustiedot', icon: Tag },
            { id: 'media', label: '2. Kuvat & Kohdistus', icon: ImageIcon },
            { id: 'variants', label: '3. Koot & Varasto', icon: Layers },
            { id: 'pricing', label: '4. Hinnoittelu', icon: DollarSign },
            { id: 'taxonomy', label: '5. Luokittelu', icon: Globe },
            { id: 'seo', label: '6. SEO & Julkaisu', icon: Clock },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-3 flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer ${
                  activeTab === tab.id
                    ? 'bg-white border-b-2 border-black font-semibold text-black'
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
          {/* TAB 1: BASIC INFO (Finnish & English side-by-side) */}
          {activeTab === 'basic' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10.5px] font-mono uppercase tracking-wider text-black/60 mb-1">
                    Tuotteen nimi (Suomi)
                  </label>
                  <input
                    type="text"
                    value={formData.name.fi}
                    onChange={(e) => setFormData({ ...formData, name: { ...formData.name, fi: e.target.value } })}
                    className="w-full px-3 py-2 text-xs font-mono border border-black/20 focus:border-black focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10.5px] font-mono uppercase tracking-wider text-black/60 mb-1">
                    Product Title (English)
                  </label>
                  <input
                    type="text"
                    value={formData.name.en}
                    onChange={(e) => setFormData({ ...formData, name: { ...formData.name, en: e.target.value } })}
                    className="w-full px-3 py-2 text-xs font-mono border border-black/20 focus:border-black focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10.5px] font-mono uppercase tracking-wider text-black/60 mb-1">
                    Kuvaus (Suomi)
                  </label>
                  <textarea
                    rows={4}
                    value={formData.description.fi}
                    onChange={(e) => setFormData({ ...formData, description: { ...formData.description, fi: e.target.value } })}
                    className="w-full px-3 py-2 text-xs font-sans border border-black/20 focus:border-black focus:outline-none leading-relaxed"
                  />
                </div>
                <div>
                  <label className="block text-[10.5px] font-mono uppercase tracking-wider text-black/60 mb-1">
                    Description (English)
                  </label>
                  <textarea
                    rows={4}
                    value={formData.description.en}
                    onChange={(e) => setFormData({ ...formData, description: { ...formData.description, en: e.target.value } })}
                    className="w-full px-3 py-2 text-xs font-sans border border-black/20 focus:border-black focus:outline-none leading-relaxed"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10.5px] font-mono uppercase tracking-wider text-black/60 mb-1">
                    Materiaali & Paino (FI)
                  </label>
                  <input
                    type="text"
                    value={formData.material.fi}
                    onChange={(e) => setFormData({ ...formData, material: { ...formData.material, fi: e.target.value } })}
                    className="w-full px-3 py-2 text-xs font-mono border border-black/20 focus:border-black focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10.5px] font-mono uppercase tracking-wider text-black/60 mb-1">
                    Material & Weight (EN)
                  </label>
                  <input
                    type="text"
                    value={formData.material.en}
                    onChange={(e) => setFormData({ ...formData, material: { ...formData.material, en: e.target.value } })}
                    className="w-full px-3 py-2 text-xs font-mono border border-black/20 focus:border-black focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10.5px] font-mono uppercase tracking-wider text-black/60 mb-1">
                    Alkuperä & Valmistus (FI)
                  </label>
                  <input
                    type="text"
                    value={formData.origin.fi}
                    onChange={(e) => setFormData({ ...formData, origin: { ...formData.origin, fi: e.target.value } })}
                    className="w-full px-3 py-2 text-xs font-mono border border-black/20 focus:border-black focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10.5px] font-mono uppercase tracking-wider text-black/60 mb-1">
                    Origin & Workshop (EN)
                  </label>
                  <input
                    type="text"
                    value={formData.origin.en}
                    onChange={(e) => setFormData({ ...formData, origin: { ...formData.origin, en: e.target.value } })}
                    className="w-full px-3 py-2 text-xs font-mono border border-black/20 focus:border-black focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: MEDIA & INTERACTIVE FOCAL POINT PICKER */}
          {activeTab === 'media' && (
            <div className="space-y-6">
              <div className="p-4 border border-black/15 bg-black/[0.02]">
                <h4 className="font-mono text-xs font-semibold uppercase tracking-wider mb-1">
                  Interaktiivinen kuvakohdistin (Focal Point Picker)
                </h4>
                <p className="text-xs text-black/60 font-sans">
                  Klikkaa kuvaa asettaaksesi optisen keskipisteen. Rajaukset mukautuvat automaattisesti kaikkiin kuvasuhteisiin (3:4, 4:5, 1:1, 16:9).
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Interactive Clickable Canvas */}
                <div className="lg:col-span-7">
                  <div
                    onClick={handleFocalPointClick}
                    className="relative w-full aspect-[3/4] border border-black overflow-hidden bg-black/5 cursor-crosshair group select-none"
                  >
                    <img
                      src={activeImage?.url || PLACEHOLDER_IMG}
                      alt="Focal source"
                      className="w-full h-full object-cover pointer-events-none"
                    />

                    {/* Red Crosshair Target */}
                    <div
                      style={{ left: `${focalX}%`, top: `${focalY}%` }}
                      className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                    >
                      <div className="w-8 h-8 rounded-full border-2 border-red-500 flex items-center justify-center animate-pulse">
                        <div className="w-1.5 h-1.5 bg-red-600 rounded-full" />
                      </div>
                      <span className="absolute top-9 left-1/2 -translate-x-1/2 bg-black text-white text-[9px] font-mono px-1.5 py-0.5 rounded whitespace-nowrap">
                        X:{focalX}% Y:{focalY}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Live Responsive Aspect Previews */}
                <div className="lg:col-span-5 space-y-4">
                  <div className="text-[10.5px] font-mono uppercase tracking-wider text-black/60">
                    Reaaliaikaiset rajausesikatselut:
                  </div>

                  {/* 3:4 Packshot preview */}
                  <div>
                    <span className="text-[10px] font-mono text-black/50 block mb-1">3:4 Arkisto & Tuotesivu:</span>
                    <div className="w-36 aspect-[3/4] border border-black/20 overflow-hidden relative bg-black/5">
                      <img
                        src={activeImage?.url || PLACEHOLDER_IMG}
                        style={{ objectPosition: `${focalX}% ${focalY}%` }}
                        className="w-full h-full object-cover"
                        alt="3:4"
                      />
                    </div>
                  </div>

                  {/* 1:1 Square preview */}
                  <div>
                    <span className="text-[10px] font-mono text-black/50 block mb-1">1:1 Neliö (Kassa & Ostoskori):</span>
                    <div className="w-28 aspect-square border border-black/20 overflow-hidden relative bg-black/5">
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
                  <h4 className="font-mono text-xs font-semibold uppercase tracking-wider">Koko- ja varastomatriisi</h4>
                  <p className="text-xs text-black/60 font-sans mt-0.5">Hallinnoi erillisiä kokoja, varastomääriä ja SKU-tunnisteita.</p>
                </div>
                <div className="font-mono text-xs font-medium">
                  Yhteisvarasto: <span className="font-bold">{(formData.variants || []).reduce((a, v) => a + Number(v.stock || 0), 0)} kpl</span>
                </div>
              </div>

              <div className="border border-black/20 divide-y divide-black/10">
                <div className="grid grid-cols-12 p-2.5 font-mono text-[10px] uppercase tracking-wider bg-black/[0.03] font-semibold">
                  <div className="col-span-3">Koko</div>
                  <div className="col-span-4">SKU</div>
                  <div className="col-span-3">Varastomäärä</div>
                  <div className="col-span-2 text-right">Tila</div>
                </div>

                {(formData.variants || []).map((v, idx) => {
                  const stockNum = Number(v.stock) || 0;
                  return (
                    <div key={idx} className="grid grid-cols-12 p-3 items-center text-xs font-mono">
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
                          className="w-full px-2 py-1 border border-black/15 focus:border-black text-[11px]"
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
                          className="w-20 px-2 py-1 border border-black/15 focus:border-black font-semibold"
                        />
                      </div>
                      <div className="col-span-2 text-right">
                        {stockNum === 0 ? (
                          <span className="text-[10px] font-mono text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5">
                            Loppu (0)
                          </span>
                        ) : stockNum < 3 ? (
                          <span className="text-[10px] font-mono text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5">
                            Vähän ({stockNum})
                          </span>
                        ) : (
                          <span className="text-[10px] font-mono text-black/60 border border-black/15 px-1.5 py-0.5">
                            OK ({stockNum})
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
                  <label className="block text-[10.5px] font-mono uppercase tracking-wider text-black/60 mb-1">
                    Myyntihinta (€ sis. alv)
                  </label>
                  <input
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-sm font-mono font-semibold border border-black/20 focus:border-black"
                  />
                </div>
                <div>
                  <label className="block text-[10.5px] font-mono uppercase tracking-wider text-black/60 mb-1">
                    Vertailuhinta (€)
                  </label>
                  <input
                    type="number"
                    value={formData.compareAtPrice || ''}
                    placeholder="Normaalihinta..."
                    onChange={(e) => setFormData({ ...formData, compareAtPrice: parseFloat(e.target.value) || undefined })}
                    className="w-full px-3 py-2 text-sm font-mono border border-black/20 focus:border-black"
                  />
                </div>
                <div>
                  <label className="block text-[10.5px] font-mono uppercase tracking-wider text-black/60 mb-1">
                    ALV-kanta (%)
                  </label>
                  <input
                    type="number"
                    disabled
                    value={formData.vatRate || 24}
                    className="w-full px-3 py-2 text-sm font-mono border border-black/10 bg-black/[0.02]"
                  />
                </div>
              </div>

              <div className="p-4 border border-black/10 bg-black/[0.02] text-xs font-mono space-y-1">
                <div className="flex justify-between">
                  <span className="text-black/60">Veroton hinta (ALV 0 %):</span>
                  <span>{Math.round((formData.price / 1.24) * 100) / 100} €</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-black/60">Arvonlisävero (24 %):</span>
                  <span>{Math.round((formData.price - formData.price / 1.24) * 100) / 100} €</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: TAXONOMY */}
          {activeTab === 'taxonomy' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10.5px] font-mono uppercase tracking-wider text-black/60 mb-1">
                    Pääkategoria
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                    className="w-full px-3 py-2 text-xs font-mono border border-black/20 focus:border-black cursor-pointer"
                  >
                    <option value="naiset">Naiset (Women)</option>
                    <option value="miehet">Miehet (Men)</option>
                    <option value="asusteet">Asusteet (Accessories)</option>
                    <option value="kokoelmat">Kokoelmat (Collections)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10.5px] font-mono uppercase tracking-wider text-black/60 mb-1">
                    Alakategoria
                  </label>
                  <input
                    type="text"
                    value={formData.subcategory}
                    onChange={(e) => setFormData({ ...formData, subcategory: e.target.value })}
                    className="w-full px-3 py-2 text-xs font-mono border border-black/20 focus:border-black"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10.5px] font-mono uppercase tracking-wider text-black/60 mb-1">
                  Kokoelmasidos
                </label>
                <select
                  value={formData.collectionSeason || 'perusvaatteet'}
                  onChange={(e) => setFormData({ ...formData, collectionSeason: e.target.value as any })}
                  className="w-full px-3 py-2 text-xs font-mono border border-black/20 focus:border-black cursor-pointer"
                >
                  <option value="talvi">Talvi 2026 · Kaamoksen Muodot</option>
                  <option value="perusvaatteet">Arkiston Perusteokset (Essentials)</option>
                  <option value="kevat">Kevät 2026 · Valon Paluu</option>
                </select>
              </div>

              <div className="pt-3 border-t border-black/10">
                <label className="flex items-center gap-2 text-xs font-mono cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isLimited}
                    onChange={(e) => setFormData({ ...formData, isLimited: e.target.checked })}
                    className="w-4 h-4 accent-black"
                  />
                  <span>Rajoitettu arkistoerä (Limited Edition)</span>
                </label>
              </div>
            </div>
          )}

          {/* TAB 6: SEO & PUBLISHING */}
          {activeTab === 'seo' && (
            <div className="space-y-6">
              <div>
                <label className="block text-[10.5px] font-mono uppercase tracking-wider text-black/60 mb-1">
                  Julkaisutila (Status)
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  className="w-full px-3 py-2 text-xs font-mono border border-black/20 focus:border-black font-semibold cursor-pointer"
                >
                  <option value="live">Live (Julkinen galleriassa)</option>
                  <option value="draft">Luonnos (Draft - vain ylläpito)</option>
                  <option value="scheduled">Ajastettu julkaisu (Scheduled)</option>
                  <option value="sold_out">Loppuunmyyty (Sold Out)</option>
                  <option value="archived">Arkistoitu (Archived)</option>
                </select>
              </div>

              {formData.status === 'scheduled' && (
                <div className="p-3 border border-black/15 bg-black/[0.02] space-y-2">
                  <label className="block text-[10.5px] font-mono uppercase tracking-wider text-black/60">
                    Ajastuksen päivämäärä ja kellonaika
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.publishAt ? new Date(formData.publishAt).toISOString().slice(0, 16) : ''}
                    onChange={(e) => setFormData({ ...formData, publishAt: new Date(e.target.value).toISOString() })}
                    className="px-3 py-2 text-xs font-mono border border-black/20 focus:border-black"
                  />
                  <p className="text-[10px] font-mono text-black/60">
                    Tuote julkaistaan automaattisesti kauppaan kun ajastushetki saavutetaan.
                  </p>
                </div>
              )}

              <div>
                <label className="block text-[10.5px] font-mono uppercase tracking-wider text-black/60 mb-1">
                  Hakukoneotsikko (SEO Title)
                </label>
                <input
                  type="text"
                  value={formData.seo?.title || ''}
                  onChange={(e) => setFormData({ ...formData, seo: { ...formData.seo, title: e.target.value } })}
                  placeholder={`${formData.name.en} | Zejesh Studio Helsinki`}
                  className="w-full px-3 py-2 text-xs font-mono border border-black/20 focus:border-black"
                />
              </div>

              <div>
                <label className="block text-[10.5px] font-mono uppercase tracking-wider text-black/60 mb-1">
                  Metakuvaus (SEO Meta Description)
                </label>
                <textarea
                  rows={2}
                  value={formData.seo?.description || ''}
                  onChange={(e) => setFormData({ ...formData, seo: { ...formData.seo, description: e.target.value } })}
                  placeholder="Nordic archival tailoring crafted in Finland."
                  className="w-full px-3 py-2 text-xs font-sans border border-black/20 focus:border-black"
                />
              </div>

              {/* Audit trail */}
              <div className="p-3 border border-black/10 bg-black/[0.02] text-[10px] font-mono text-black/50 space-y-1">
                <div>Luotu: {formData.createdAt ? new Date(formData.createdAt).toLocaleString('fi-FI') : 'Alkuperäinen erä'}</div>
                <div>Viimeksi päivitetty: {formData.updatedAt ? new Date(formData.updatedAt).toLocaleString('fi-FI') : 'Ei muokattu'}</div>
                <div>Muokkaaja: {adminProfile?.name || 'Studio Principal'}</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
