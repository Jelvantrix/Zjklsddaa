import React, { useState, useMemo } from 'react';
import { Product, ProductStatus } from '../../types';
import {
  Search,
  Plus,
  Filter,
  CheckSquare,
  Square,
  Edit2,
  Trash2,
  Eye,
  SlidersHorizontal,
  ArrowUpDown,
  MoreVertical,
  Layers,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../firebase/AuthContext';
import { doc, updateDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { logAuditEvent } from '../../firebase/dbService';

interface AdminProductsViewProps {
  products: Product[];
  onEditProduct: (product: Product) => void;
  onCreateProduct: () => void;
  onViewProductInStore: (product: Product) => void;
  onRefresh: () => void;
}

export const AdminProductsView: React.FC<AdminProductsViewProps> = ({
  products,
  onEditProduct,
  onCreateProduct,
  onViewProductInStore,
  onRefresh,
}) => {
  const { isOwner, isEditor, adminProfile } = useAuth();

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | ProductStatus>('all');
  const [categoryFilter, setCategoryFilter] = useState<'all' | string>('all');
  const [stockLevelFilter, setStockLevelFilter] = useState<'all' | 'in_stock' | 'low_stock' | 'out_of_stock'>('all');

  // Selected rows for Bulk Actions
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkPricePercent, setBulkPricePercent] = useState<number>(10);
  const [showBulkPriceModal, setShowBulkPriceModal] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  // Filtered Products
  const filtered = useMemo(() => {
    return products.filter((p) => {
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchNr = p.nr?.toLowerCase().includes(q) || p.plateNumber?.toLowerCase().includes(q);
        const matchNameFi = p.name.fi.toLowerCase().includes(q);
        const matchNameEn = p.name.en.toLowerCase().includes(q);
        const matchSku = p.variants?.some((v) => v.sku.toLowerCase().includes(q));
        if (!matchNr && !matchNameFi && !matchNameEn && !matchSku) return false;
      }

      // Status
      if (statusFilter !== 'all' && p.status !== statusFilter) return false;

      // Category
      if (categoryFilter !== 'all' && p.category !== categoryFilter) return false;

      // Stock Level
      const totalStock = p.variants ? p.variants.reduce((a, v) => a + v.stock, 0) : (p.stock || 0);
      if (stockLevelFilter === 'in_stock' && totalStock <= 0) return false;
      if (stockLevelFilter === 'out_of_stock' && totalStock > 0) return false;
      if (stockLevelFilter === 'low_stock' && (totalStock <= 0 || totalStock >= 4)) return false;

      return true;
    });
  }, [products, searchQuery, statusFilter, categoryFilter, stockLevelFilter]);

  // Row selection
  const toggleSelectAll = () => {
    if (selectedIds.length === filtered.length) setSelectedIds([]);
    else setSelectedIds(filtered.map((p) => p.id));
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  };

  // Bulk Operations
  const handleBulkStatusChange = async (newStatus: ProductStatus) => {
    if (!isEditor) return;
    try {
      const batch = writeBatch(db);
      selectedIds.forEach((id) => {
        batch.update(doc(db, 'products', id), { status: newStatus, updatedAt: new Date().toISOString() });
      });
      await batch.commit();
      await logAuditEvent(adminProfile?.name || 'admin', 'bulk_status_change', 'products', {
        count: selectedIds.length,
        newStatus,
      });
      setSelectedIds([]);
      onRefresh();
    } catch (err) {
      console.warn('Bulk status change error:', err);
    }
  };

  const handleBulkPriceAdjust = async () => {
    if (!isEditor) return;
    try {
      const batch = writeBatch(db);
      const factor = 1 + bulkPricePercent / 100;
      selectedIds.forEach((id) => {
        const prod = products.find((p) => p.id === id);
        if (prod) {
          const newPrice = Math.round(prod.price * factor);
          batch.update(doc(db, 'products', id), { price: newPrice, updatedAt: new Date().toISOString() });
        }
      });
      await batch.commit();
      await logAuditEvent(adminProfile?.name || 'admin', 'bulk_price_adjust', 'products', {
        count: selectedIds.length,
        percent: bulkPricePercent,
      });
      setShowBulkPriceModal(false);
      setSelectedIds([]);
      onRefresh();
    } catch (err) {
      console.warn('Bulk price adjust error:', err);
    }
  };

  const handleBulkDelete = async () => {
    if (!isOwner) return;
    try {
      const batch = writeBatch(db);
      selectedIds.forEach((id) => {
        batch.delete(doc(db, 'products', id));
      });
      await batch.commit();
      await logAuditEvent(adminProfile?.name || 'admin', 'bulk_delete', 'products', { count: selectedIds.length });
      setDeleteConfirmOpen(false);
      setSelectedIds([]);
      onRefresh();
    } catch (err) {
      console.warn('Bulk delete error:', err);
    }
  };

  return (
    <div className="space-y-5">
      {/* Top Bar: Title & Primary Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-black/10">
        <div>
          <h1 className="font-editorial text-3xl font-normal">Tuotteet & Arkisto</h1>
          <p className="text-xs font-mono text-black/50 mt-0.5">
            Hallinnoi 24 numeroitua teosta, reaaliaikaista varastoa ja julkaisutiloja.
          </p>
        </div>

        <button
          onClick={onCreateProduct}
          className="px-4 py-2.5 bg-black text-white text-xs font-mono uppercase tracking-wider flex items-center gap-1.5 hover:bg-black/80 transition-colors cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Luo uusi teos</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 p-3 border border-black/15 bg-white text-xs font-mono">
        <div className="relative lg:col-span-2">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-black/40" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Hae nimellä, Nº-tunnuksella tai SKU:lla..."
            className="w-full pl-8 pr-3 py-1.5 border border-black/15 focus:border-black focus:outline-none"
          />
        </div>

        <div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="w-full px-2.5 py-1.5 border border-black/15 focus:border-black focus:outline-none cursor-pointer bg-white"
          >
            <option value="all">Kaikki tilat ({products.length})</option>
            <option value="live">Live (Julkaistu)</option>
            <option value="draft">Luonnos (Draft)</option>
            <option value="scheduled">Ajastettu (Scheduled)</option>
            <option value="sold_out">Loppuunmyyty</option>
            <option value="archived">Arkistoitu</option>
          </select>
        </div>

        <div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full px-2.5 py-1.5 border border-black/15 focus:border-black focus:outline-none cursor-pointer bg-white"
          >
            <option value="all">Kaikki kategoriat</option>
            <option value="naiset">Naiset</option>
            <option value="miehet">Miehet</option>
            <option value="asusteet">Asusteet</option>
          </select>
        </div>

        <div>
          <select
            value={stockLevelFilter}
            onChange={(e) => setStockLevelFilter(e.target.value as any)}
            className="w-full px-2.5 py-1.5 border border-black/15 focus:border-black focus:outline-none cursor-pointer bg-white"
          >
            <option value="all">Kaikki varastotasot</option>
            <option value="in_stock">Varastossa (&gt; 0)</option>
            <option value="low_stock">Vähän jäljellä (&lt; 4)</option>
            <option value="out_of_stock">Loppunut (0)</option>
          </select>
        </div>
      </div>

      {/* Floating Bulk Actions Bar */}
      {selectedIds.length > 0 && (
        <div className="p-3 border border-black bg-black text-white flex flex-wrap items-center justify-between gap-3 text-xs font-mono animate-fadeIn">
          <div className="flex items-center gap-2">
            <span className="font-semibold">{selectedIds.length}</span>
            <span>teosta valittu</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleBulkStatusChange('live')}
              className="px-2.5 py-1 bg-white text-black hover:bg-white/90 uppercase tracking-wider cursor-pointer"
            >
              Julkaise (Live)
            </button>
            <button
              onClick={() => handleBulkStatusChange('draft')}
              className="px-2.5 py-1 border border-white/40 hover:border-white uppercase tracking-wider cursor-pointer"
            >
              Luonnokseksi
            </button>
            <button
              onClick={() => setShowBulkPriceModal(true)}
              className="px-2.5 py-1 border border-white/40 hover:border-white uppercase tracking-wider cursor-pointer"
            >
              Muuta hintoja (+-%)
            </button>
            {isOwner && (
              <button
                onClick={() => setDeleteConfirmOpen(true)}
                className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white uppercase tracking-wider cursor-pointer"
              >
                Poista valitut
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main Table */}
      <div className="border border-black/15 bg-white overflow-x-auto shadow-xs">
        <table className="w-full text-left border-collapse text-xs font-mono">
          <thead>
            <tr className="border-b border-black/15 bg-black/[0.02] text-[10px] uppercase tracking-wider text-black/60 select-none">
              <th className="p-3 w-10 text-center">
                <button onClick={toggleSelectAll} className="cursor-pointer">
                  {selectedIds.length > 0 && selectedIds.length === filtered.length ? (
                    <CheckSquare className="w-4 h-4 text-black" />
                  ) : (
                    <Square className="w-4 h-4 text-black/40" />
                  )}
                </button>
              </th>
              <th className="p-3 w-16">Nro</th>
              <th className="p-3 w-16">Kuva</th>
              <th className="p-3">Nimi (FI / EN)</th>
              <th className="p-3 w-28">Tila</th>
              <th className="p-3 w-40">Varasto / Koot</th>
              <th className="p-3 w-24">Hinta</th>
              <th className="p-3 w-28">Kategoria</th>
              <th className="p-3 w-24 text-right">Toiminnot</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/10">
            {filtered.map((prod) => {
              const isSelected = selectedIds.includes(prod.id);
              const totalStock = prod.variants ? prod.variants.reduce((a, v) => a + v.stock, 0) : (prod.stock || 0);

              return (
                <tr
                  key={prod.id}
                  className={`hover:bg-black/[0.015] transition-colors ${isSelected ? 'bg-black/[0.03]' : ''}`}
                >
                  <td className="p-3 text-center">
                    <button onClick={() => toggleSelectOne(prod.id)} className="cursor-pointer">
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4 text-black" />
                      ) : (
                        <Square className="w-4 h-4 text-black/30" />
                      )}
                    </button>
                  </td>
                  <td className="p-3 font-semibold text-black">
                    {prod.nr || prod.plateNumber}
                  </td>
                  <td className="p-3">
                    <div className="w-10 h-13 border border-black/15 bg-black/5 overflow-hidden relative">
                      <img
                        src={prod.images?.[0]?.url || 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400&q=80'}
                        alt={prod.name.fi}
                        style={{
                          objectPosition: `${prod.images?.[0]?.focalX ?? 50}% ${prod.images?.[0]?.focalY ?? 20}%`,
                        }}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </td>
                  <td className="p-3">
                    <div className="font-semibold text-black font-sans text-[13px]">{prod.name.fi}</div>
                    <div className="text-[11px] text-black/50">{prod.name.en}</div>
                  </td>
                  <td className="p-3">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] uppercase font-mono border ${
                        prod.status === 'live'
                          ? 'border-black text-black bg-black/5'
                          : prod.status === 'scheduled'
                          ? 'border-blue-600 text-blue-700 bg-blue-50'
                          : prod.status === 'draft'
                          ? 'border-black/30 text-black/50'
                          : 'border-red-400 text-red-600 bg-red-50'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          prod.status === 'live' ? 'bg-black' : prod.status === 'scheduled' ? 'bg-blue-600' : 'bg-black/30'
                        }`}
                      />
                      <span>{prod.status}</span>
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-1 max-w-[170px]">
                      {(prod.variants || []).map((v) => (
                        <span
                          key={v.size}
                          title={`SKU: ${v.sku} · ${v.stock} kpl`}
                          className={`text-[9.5px] px-1.5 py-0.5 font-mono border ${
                            v.stock === 0
                              ? 'border-red-300 text-red-600 bg-red-50'
                              : v.stock < 3
                              ? 'border-amber-300 text-amber-700 bg-amber-50'
                              : 'border-black/15 text-black/70'
                          }`}
                        >
                          {v.size}:{v.stock}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="p-3 font-semibold">
                    {prod.price} €
                    {prod.compareAtPrice && (
                      <span className="block text-[10px] text-black/40 line-through">
                        {prod.compareAtPrice} €
                      </span>
                    )}
                  </td>
                  <td className="p-3 capitalize text-black/70">{prod.category}</td>
                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => onEditProduct(prod)}
                        className="p-1.5 hover:bg-black/10 border border-transparent hover:border-black/20 cursor-pointer"
                        title="Muokkaa"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onViewProductInStore(prod)}
                        className="p-1.5 hover:bg-black/10 border border-transparent hover:border-black/20 cursor-pointer text-black/60 hover:text-black"
                        title="Katso kaupassa"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className="p-12 text-center text-xs font-mono text-black/50">
            Ei hakuehtoja vastaavia tuotteita.
          </div>
        )}
      </div>

      {/* Modal: Bulk Price Adjustment */}
      {showBulkPriceModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div onClick={() => setShowBulkPriceModal(false)} className="fixed inset-0 bg-black/60" />
          <div className="relative w-full max-w-sm bg-white border border-black p-6 shadow-2xl z-10 font-mono text-xs">
            <h3 className="text-sm font-semibold uppercase tracking-wider mb-2">Massahintamuutos</h3>
            <p className="text-black/60 mb-4 text-[11px]">
              Muuta {selectedIds.length} valitun tuotteen myyntihintaa prosentuaalisesti.
            </p>
            <div className="mb-4">
              <label className="block text-[10px] uppercase text-black/60 mb-1">Muutosprosentti (%)</label>
              <input
                type="number"
                value={bulkPricePercent}
                onChange={(e) => setBulkPricePercent(parseFloat(e.target.value) || 0)}
                placeholder="+10 tai -15"
                className="w-full px-3 py-2 border border-black/20 focus:border-black font-semibold"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowBulkPriceModal(false)}
                className="px-3 py-1.5 border border-black/20 hover:border-black uppercase"
              >
                Peruuta
              </button>
              <button
                onClick={handleBulkPriceAdjust}
                className="px-4 py-1.5 bg-black text-white hover:bg-black/80 uppercase font-semibold"
              >
                Käytä hintoihin
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Delete Confirmation */}
      {deleteConfirmOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div onClick={() => setDeleteConfirmOpen(false)} className="fixed inset-0 bg-black/60" />
          <div className="relative w-full max-w-sm bg-white border border-black p-6 shadow-2xl z-10 font-mono text-xs">
            <h3 className="text-sm font-semibold uppercase tracking-wider mb-2 text-red-600">
              Vahvista poisto (Owner)
            </h3>
            <p className="text-black/70 mb-4 text-[11px] leading-relaxed">
              Haluatko varmasti poistaa {selectedIds.length} tuotetta pysyvästi Firestoresta? Toimintoa ei voi perua.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeleteConfirmOpen(false)}
                className="px-3 py-1.5 border border-black/20 hover:border-black uppercase"
              >
                Peruuta
              </button>
              <button
                onClick={handleBulkDelete}
                className="px-4 py-1.5 bg-red-600 text-white hover:bg-red-700 uppercase font-semibold"
              >
                Poista pysyvästi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
