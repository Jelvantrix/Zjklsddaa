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
import { useAuth } from '../../supabase/AuthContext';
import { supabase } from '../../supabase/config';
import { logAuditEvent } from '../../supabase/dbService';

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
      for (const id of selectedIds) {
        await supabase
          .from('products')
          .update({ status: newStatus, updatedAt: new Date().toISOString() })
          .eq('id', id);
      }
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
      const factor = 1 + bulkPricePercent / 100;
      for (const id of selectedIds) {
        const prod = products.find((p) => p.id === id);
        if (prod) {
          const newPrice = Math.round(prod.price * factor);
          await supabase
            .from('products')
            .update({ price: newPrice, updatedAt: new Date().toISOString() })
            .eq('id', id);
        }
      }
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
      for (const id of selectedIds) {
        await supabase.from('products').delete().eq('id', id);
      }
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
          <h1 className="font-editorial text-3xl font-normal">Products & Archive</h1>
          <p className="text-xs font-mono text-black/50 mt-0.5">
            Manage 24 numbered garments, real-time inventory and release statuses.
          </p>
        </div>

        <button
          onClick={onCreateProduct}
          className="py-1 text-xs font-mono uppercase tracking-wider flex items-center gap-1.5 text-black hover:opacity-60 transition-opacity cursor-pointer self-start sm:self-auto underline underline-offset-4 font-semibold"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Create New Garment</span>
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
            placeholder="Search by name, Nº plate or SKU..."
            className="w-full pl-8 pr-3 py-1.5 border border-black/15 focus:border-black focus:outline-none"
          />
        </div>

        <div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="w-full px-2.5 py-1.5 border border-black/15 focus:border-black focus:outline-none cursor-pointer bg-white"
          >
            <option value="all">All statuses ({products.length})</option>
            <option value="live">Live (Published)</option>
            <option value="draft">Draft</option>
            <option value="scheduled">Scheduled</option>
            <option value="sold_out">Sold Out</option>
            <option value="archived">Archived</option>
          </select>
        </div>

        <div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full px-2.5 py-1.5 border border-black/15 focus:border-black focus:outline-none cursor-pointer bg-white"
          >
            <option value="all">All categories</option>
            <option value="naiset">Women</option>
            <option value="miehet">Men</option>
            <option value="asusteet">Accessories</option>
          </select>
        </div>

        <div>
          <select
            value={stockLevelFilter}
            onChange={(e) => setStockLevelFilter(e.target.value as any)}
            className="w-full px-2.5 py-1.5 border border-black/15 focus:border-black focus:outline-none cursor-pointer bg-white"
          >
            <option value="all">All stock levels</option>
            <option value="in_stock">In Stock (&gt; 0)</option>
            <option value="low_stock">Low Stock (&lt; 4)</option>
            <option value="out_of_stock">Out of Stock (0)</option>
          </select>
        </div>
      </div>

      {/* Floating Bulk Actions Bar: Pure Typography */}
      {selectedIds.length > 0 && (
        <div className="py-2.5 px-3 border-b border-black/[0.1] bg-white text-black flex flex-wrap items-center justify-between gap-4 text-xs font-mono animate-fadeIn">
          <div className="flex items-center gap-2">
            <span className="font-semibold">{selectedIds.length}</span>
            <span>items selected</span>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => handleBulkStatusChange('live')}
              className="text-xs font-mono uppercase tracking-wider text-black hover:opacity-60 cursor-pointer underline underline-offset-4"
            >
              Publish Live
            </button>
            <button
              onClick={() => handleBulkStatusChange('draft')}
              className="text-xs font-mono uppercase tracking-wider text-black/70 hover:text-black cursor-pointer underline underline-offset-4"
            >
              Set Draft
            </button>
            <button
              onClick={() => setShowBulkPriceModal(true)}
              className="text-xs font-mono uppercase tracking-wider text-black/70 hover:text-black cursor-pointer underline underline-offset-4"
            >
              Adjust Prices (+-%)
            </button>
            {isOwner && (
              <button
                onClick={() => setDeleteConfirmOpen(true)}
                className="text-xs font-mono uppercase tracking-wider text-black hover:opacity-60 cursor-pointer underline underline-offset-4 font-semibold"
              >
                Delete Selected
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main Table */}
      <div className="border border-black/[0.08] bg-white overflow-x-auto shadow-xs">
        <table className="w-full text-left border-collapse text-xs font-mono">
          <thead>
            <tr className="border-b border-black/[0.08] bg-black/[0.02] text-[10px] uppercase tracking-wider text-black/60 select-none">
              <th className="p-3 w-10 text-center">
                <button onClick={toggleSelectAll} className="cursor-pointer">
                  {selectedIds.length > 0 && selectedIds.length === filtered.length ? (
                    <CheckSquare className="w-4 h-4 text-black" />
                  ) : (
                    <Square className="w-4 h-4 text-black/40" />
                  )}
                </button>
              </th>
              <th className="p-3 w-16">Nº</th>
              <th className="p-3 w-16">Image</th>
              <th className="p-3">Name (FI / EN)</th>
              <th className="p-3 w-28">Status</th>
              <th className="p-3 w-40">Stock / Sizes</th>
              <th className="p-3 w-24">Price</th>
              <th className="p-3 w-28">Category</th>
              <th className="p-3 w-24 text-right">Actions</th>
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
                    <span className="inline-flex items-center gap-1.5 text-[10px] uppercase font-mono tracking-wider">
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          prod.status === 'live'
                            ? 'bg-black'
                            : prod.status === 'scheduled'
                            ? 'border border-black'
                            : 'bg-black/30'
                        }`}
                      />
                      <span className={prod.status === 'draft' ? 'text-black/40' : 'text-black'}>
                        {prod.status}
                      </span>
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-1.5 max-w-[170px]">
                      {(prod.variants || []).map((v) => (
                        <span
                          key={v.size}
                          title={`SKU: ${v.sku} · ${v.stock} kpl`}
                          className={`text-[10px] font-mono ${
                            v.stock === 0 ? 'text-black/30 line-through' : v.stock < 3 ? 'font-bold underline' : 'text-black/70'
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
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => onEditProduct(prod)}
                        className="p-1 hover:opacity-60 cursor-pointer text-black"
                        title="Edit"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onViewProductInStore(prod)}
                        className="p-1 hover:opacity-60 cursor-pointer text-black/60 hover:text-black"
                        title="View in Store"
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
            No products match your search criteria.
          </div>
        )}
      </div>

      {/* Modal: Bulk Price Adjustment (Subtle Hairline Borders) */}
      {showBulkPriceModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div onClick={() => setShowBulkPriceModal(false)} className="fixed inset-0 bg-neutral-950/40 backdrop-blur-[2px]" />
          <div className="relative w-full max-w-sm bg-white border border-black/[0.08] shadow-2xl p-6 z-10 font-mono text-xs">
            <h3 className="text-sm font-semibold uppercase tracking-wider mb-2 text-black">Bulk Price Adjustment</h3>
            <p className="text-black/60 mb-4 text-[11px]">
              Adjust the retail price of {selectedIds.length} selected garments by percentage.
            </p>
            <div className="mb-4">
              <label className="block text-[10px] uppercase text-black/60 mb-1">Percentage Change (%)</label>
              <input
                type="number"
                value={bulkPricePercent}
                onChange={(e) => setBulkPricePercent(parseFloat(e.target.value) || 0)}
                placeholder="+10 or -15"
                className="w-full px-3 py-2 border-b border-black/[0.2] focus:border-black focus:outline-none font-semibold bg-transparent"
              />
            </div>
            <div className="flex justify-end gap-4 mt-6">
              <button
                onClick={() => setShowBulkPriceModal(false)}
                className="text-xs font-mono uppercase text-black/60 hover:text-black underline underline-offset-4 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkPriceAdjust}
                className="text-xs font-mono uppercase text-black hover:opacity-60 underline underline-offset-4 font-semibold cursor-pointer"
              >
                Apply Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Delete Confirmation (Subtle Hairline Borders) */}
      {deleteConfirmOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div onClick={() => setDeleteConfirmOpen(false)} className="fixed inset-0 bg-neutral-950/40 backdrop-blur-[2px]" />
          <div className="relative w-full max-w-sm bg-white border border-black/[0.08] shadow-2xl p-6 z-10 font-mono text-xs">
            <h3 className="text-sm font-semibold uppercase tracking-wider mb-2 text-black">
              Confirm Deletion (Owner)
            </h3>
            <p className="text-black/70 mb-4 text-[11px] leading-relaxed">
              Are you sure you want to permanently delete {selectedIds.length} products from the Firestore database? This action is irreversible.
            </p>
            <div className="flex justify-end gap-4 mt-6">
              <button
                onClick={() => setDeleteConfirmOpen(false)}
                className="text-xs font-mono uppercase text-black/60 hover:text-black underline underline-offset-4 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkDelete}
                className="text-xs font-mono uppercase text-rose-600 hover:text-rose-800 underline underline-offset-4 font-semibold cursor-pointer"
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
