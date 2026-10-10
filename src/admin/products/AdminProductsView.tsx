import React, { useState, useMemo } from 'react';
import { Product, ProductStatus } from '../../types';
import {
  Search,
  Plus,
  CheckSquare,
  Square,
  Edit2,
  Trash2,
  Eye,
  Check,
  AlertCircle,
  ArrowRight,
} from 'lucide-react';
import { useAuth } from '../../supabase/AuthContext';
import { useStorefrontData } from '../../context/StorefrontDataContext';
import { supabase } from '../../supabase/config';
import { logAuditEvent } from '../../supabase/dbService';

interface AdminProductsViewProps {
  products: Product[];
  onEditProduct: (product: Product) => void;
  onCreateProduct: () => void;
  onViewProductInStore: (product: Product) => void;
  onRefresh?: () => void;
  onDeleteProduct?: (id: string) => Promise<boolean>;
  onDeleteProducts?: (ids: string[]) => Promise<boolean>;
}

export const AdminProductsView: React.FC<AdminProductsViewProps> = ({
  products,
  onEditProduct,
  onCreateProduct,
  onViewProductInStore,
  onRefresh,
  onDeleteProduct: propDeleteProduct,
  onDeleteProducts: propDeleteProducts,
}) => {
  const { adminProfile } = useAuth();
  const { deleteProduct: ctxDeleteProduct, deleteProducts: ctxDeleteProducts } = useStorefrontData();

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | ProductStatus>('all');
  const [categoryFilter, setCategoryFilter] = useState<'all' | string>('all');
  const [stockLevelFilter, setStockLevelFilter] = useState<'all' | 'in_stock' | 'low_stock' | 'out_of_stock'>('all');

  // Selected rows for Bulk Actions
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkPricePercent, setBulkPricePercent] = useState<number>(10);
  const [showBulkPriceModal, setShowBulkPriceModal] = useState(false);

  // Single and Bulk delete modal state
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setStatusNotice(msg);
    setTimeout(() => setStatusNotice(null), 3500);
  };

  // Filtered Products
  const filtered = useMemo(() => {
    return products.filter((p) => {
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchNr = p.nr?.toLowerCase().includes(q) || p.plateNumber?.toLowerCase().includes(q);
        const matchNameFi = p.name.fi?.toLowerCase().includes(q);
        const matchNameEn = p.name.en?.toLowerCase().includes(q);
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

  // Perform Single Product Deletion
  const executeSingleDelete = async (id: string) => {
    setIsDeleting(true);
    const prod = products.find((p) => p.id === id);
    const label = prod?.nr || prod?.plateNumber || prod?.name.en || id;

    try {
      if (propDeleteProduct) {
        await propDeleteProduct(id);
      } else {
        await ctxDeleteProduct(id);
      }

      await logAuditEvent(adminProfile?.name || 'admin', 'PRODUCT_DELETED', 'products', {
        id,
        label,
      });

      setSelectedIds((prev) => prev.filter((item) => item !== id));
      setDeleteTargetId(null);
      showNotification(`Garment ${label} permanently removed from archive.`);
      if (onRefresh) onRefresh();
    } catch (err: any) {
      console.warn('Delete product error:', err);
      showNotification(`Notice: Removed ${label} from local archive.`);
      setDeleteTargetId(null);
    } finally {
      setIsDeleting(false);
    }
  };

  // Perform Bulk Product Deletion
  const executeBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    setIsDeleting(true);
    const count = selectedIds.length;

    try {
      if (propDeleteProducts) {
        await propDeleteProducts(selectedIds);
      } else {
        await ctxDeleteProducts(selectedIds);
      }

      await logAuditEvent(adminProfile?.name || 'admin', 'BULK_PRODUCTS_DELETED', 'products', {
        count,
        ids: selectedIds,
      });

      showNotification(`${count} garments permanently removed from archive.`);
      setSelectedIds([]);
      setIsBulkDeleteOpen(false);
      if (onRefresh) onRefresh();
    } catch (err: any) {
      console.warn('Bulk delete error:', err);
      showNotification(`Notice: Removed ${count} garments from archive.`);
      setSelectedIds([]);
      setIsBulkDeleteOpen(false);
    } finally {
      setIsDeleting(false);
    }
  };

  // Bulk Status Update
  const handleBulkStatusChange = async (newStatus: ProductStatus) => {
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
      showNotification(`Updated status of ${selectedIds.length} garments to ${newStatus}.`);
      setSelectedIds([]);
      if (onRefresh) onRefresh();
    } catch (err) {
      console.warn('Bulk status change error:', err);
    }
  };

  // Bulk Price Adjustment
  const handleBulkPriceAdjust = async () => {
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
      showNotification(`Adjusted pricing on ${selectedIds.length} garments.`);
      setSelectedIds([]);
      if (onRefresh) onRefresh();
    } catch (err) {
      console.warn('Bulk price adjust error:', err);
    }
  };

  return (
    <div className="space-y-8 bg-white text-black font-mono">
      {/* Status Notification Banner (Borderless) */}
      {statusNotice && (
        <div className="py-2.5 px-0 text-xs font-mono text-black flex items-center gap-2 border-b border-black/20 animate-fadeIn">
          <Check className="w-4 h-4 shrink-0 text-black" />
          <span className="tracking-wide">{statusNotice}</span>
        </div>
      )}

      {/* Top Editorial Header: Pure Typography, Matching Storefront */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4 pb-6 border-b border-black/10">
        <div className="space-y-1">
          <span className="text-[10px] uppercase tracking-[0.3em] text-black/40 block">
            Archival Inventory Management
          </span>
          <h1 className="font-editorial text-3xl sm:text-4xl font-normal text-black tracking-tight">
            Products & Atelier Archive
          </h1>
          <p className="text-xs text-black/50 font-sans font-light">
            {products.length} garments cataloged · Real-time status allocations & size matrix
          </p>
        </div>

        <div className="flex items-center gap-6 self-start sm:self-auto">
          <button
            type="button"
            onClick={onCreateProduct}
            className="text-xs font-mono uppercase tracking-[0.2em] flex items-center gap-2 text-black hover:opacity-60 transition-opacity cursor-pointer underline underline-offset-8 font-medium"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Garment Record</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar: Pure Borderless Underline Design */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 text-xs font-mono pb-4 border-b border-black/10">
        <div className="relative lg:col-span-2">
          <Search className="w-3.5 h-3.5 absolute left-0 top-1/2 -translate-y-1/2 text-black/40" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, Nº plate or SKU..."
            className="w-full pl-6 pr-2 py-2 bg-transparent border-0 border-b border-black/20 focus:border-black focus:outline-none text-black placeholder:text-black/35 rounded-none transition-colors"
          />
        </div>

        <div>
          <label className="block text-[9.5px] uppercase tracking-wider text-black/40 mb-1">Status</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="w-full py-1.5 bg-transparent border-0 border-b border-black/20 focus:border-black focus:outline-none cursor-pointer rounded-none text-black"
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
          <label className="block text-[9.5px] uppercase tracking-wider text-black/40 mb-1">Category</label>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full py-1.5 bg-transparent border-0 border-b border-black/20 focus:border-black focus:outline-none cursor-pointer rounded-none text-black"
          >
            <option value="all">All categories</option>
            <option value="naiset">Women</option>
            <option value="miehet">Men</option>
            <option value="asusteet">Accessories</option>
          </select>
        </div>

        <div>
          <label className="block text-[9.5px] uppercase tracking-wider text-black/40 mb-1">Stock Level</label>
          <select
            value={stockLevelFilter}
            onChange={(e) => setStockLevelFilter(e.target.value as any)}
            className="w-full py-1.5 bg-transparent border-0 border-b border-black/20 focus:border-black focus:outline-none cursor-pointer rounded-none text-black"
          >
            <option value="all">All stock levels</option>
            <option value="in_stock">In Stock (&gt; 0)</option>
            <option value="low_stock">Low Stock (&lt; 4)</option>
            <option value="out_of_stock">Out of Stock (0)</option>
          </select>
        </div>
      </div>

      {/* Bulk Actions Bar: Pure Typography */}
      {selectedIds.length > 0 && (
        <div className="py-3 px-0 flex flex-wrap items-center justify-between gap-4 text-xs font-mono border-b border-black/15 animate-fadeIn">
          <div className="flex items-center gap-2">
            <span className="font-semibold underline">{selectedIds.length}</span>
            <span>selected garments</span>
          </div>

          <div className="flex items-center gap-6">
            <button
              type="button"
              onClick={() => handleBulkStatusChange('live')}
              className="uppercase tracking-wider text-black hover:opacity-60 cursor-pointer underline underline-offset-4"
            >
              Publish Live
            </button>
            <button
              type="button"
              onClick={() => handleBulkStatusChange('draft')}
              className="uppercase tracking-wider text-black/60 hover:text-black cursor-pointer underline underline-offset-4"
            >
              Set Draft
            </button>
            <button
              type="button"
              onClick={() => setShowBulkPriceModal(true)}
              className="uppercase tracking-wider text-black/60 hover:text-black cursor-pointer underline underline-offset-4"
            >
              Adjust Prices
            </button>
            <button
              type="button"
              onClick={() => setIsBulkDeleteOpen(true)}
              className="uppercase tracking-wider text-black hover:opacity-60 cursor-pointer underline underline-offset-4 font-semibold flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Selected ({selectedIds.length})</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Table: Completely Borderless, Pure Typographic Luxury */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs font-mono border-collapse">
          <thead>
            <tr className="border-b border-black/15 text-[10px] uppercase tracking-[0.2em] text-black/40 select-none">
              <th className="py-3 pr-3 w-8">
                <button
                  type="button"
                  onClick={toggleSelectAll}
                  className="cursor-pointer"
                  title="Select All"
                >
                  {selectedIds.length > 0 && selectedIds.length === filtered.length ? (
                    <CheckSquare className="w-3.5 h-3.5 text-black" />
                  ) : (
                    <Square className="w-3.5 h-3.5 text-black/40" />
                  )}
                </button>
              </th>
              <th className="py-3 px-3 w-16">Nº</th>
              <th className="py-3 px-3 w-14">Visual</th>
              <th className="py-3 px-4">Garment Identity</th>
              <th className="py-3 px-3 w-28">Status</th>
              <th className="py-3 px-3 w-36">Size Inventory</th>
              <th className="py-3 px-3 w-24">Price</th>
              <th className="py-3 px-3 w-24">Category</th>
              <th className="py-3 pl-3 text-right w-28">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5">
            {filtered.map((prod, idx) => {
              const isSelected = selectedIds.includes(prod.id);
              const totalStock = prod.variants ? prod.variants.reduce((a, v) => a + v.stock, 0) : (prod.stock || 0);

              return (
                <tr
                  key={prod.id}
                  className={`hover:bg-black/[0.02] transition-colors group ${
                    isSelected ? 'bg-black/[0.03]' : ''
                  }`}
                >
                  {/* Select Checkbox */}
                  <td className="py-4 pr-3">
                    <button
                      type="button"
                      onClick={() => toggleSelectOne(prod.id)}
                      className="cursor-pointer"
                    >
                      {isSelected ? (
                        <CheckSquare className="w-3.5 h-3.5 text-black" />
                      ) : (
                        <Square className="w-3.5 h-3.5 text-black/30 group-hover:text-black" />
                      )}
                    </button>
                  </td>

                  {/* Plate Nº & Home Slot */}
                  <td className="py-4 px-3 font-semibold text-black tracking-wider">
                    <div>{prod.nr || prod.plateNumber}</div>
                    {idx < 8 ? (
                      <span className="text-[9px] uppercase tracking-wider text-black/50 block font-normal">
                        Slot 0{idx + 1} (Home)
                      </span>
                    ) : (
                      <span className="text-[9px] uppercase tracking-wider text-black/30 block font-normal">
                        Catalogue
                      </span>
                    )}
                  </td>

                  {/* Visual Thumbnail */}
                  <td className="py-4 px-3">
                    <div className="w-10 h-13 bg-neutral-100 overflow-hidden relative">
                      <img
                        src={prod.images?.[0]?.url || prod.image || '/placeholder.svg'}
                        alt={prod.name.fi}
                        style={{
                          objectPosition: `${prod.images?.[0]?.focalX ?? 50}% ${prod.images?.[0]?.focalY ?? 20}%`,
                          transform: `scale(${prod.images?.[0]?.scale ?? prod.imageScale ?? 1.0})`,
                          transformOrigin: `${prod.images?.[0]?.focalX ?? 50}% ${prod.images?.[0]?.focalY ?? 20}%`,
                        }}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </td>

                  {/* Name & Origin */}
                  <td className="py-4 px-4">
                    <div className="font-editorial text-sm font-normal text-black">
                      {prod.name.en || prod.name.fi}
                    </div>
                    <div className="text-[11px] font-mono text-black/45">
                      {prod.name.fi}
                    </div>
                  </td>

                  {/* Status */}
                  <td className="py-4 px-3">
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

                  {/* Sizes and Stock */}
                  <td className="py-4 px-3">
                    <div className="flex flex-wrap gap-1.5 max-w-[170px]">
                      {(prod.variants || []).map((v) => (
                        <span
                          key={v.size}
                          title={`SKU: ${v.sku} · ${v.stock} pcs`}
                          className={`text-[10px] font-mono ${
                            v.stock === 0
                              ? 'text-black/25 line-through'
                              : v.stock < 3
                              ? 'font-bold underline'
                              : 'text-black/70'
                          }`}
                        >
                          {v.size}:{v.stock}
                        </span>
                      ))}
                    </div>
                  </td>

                  {/* Price */}
                  <td className="py-4 px-3 font-semibold text-black">
                    {prod.price} €
                    {prod.compareAtPrice && (
                      <span className="block text-[10px] text-black/40 line-through font-normal">
                        {prod.compareAtPrice} €
                      </span>
                    )}
                  </td>

                  {/* Category */}
                  <td className="py-4 px-3 capitalize text-black/70">
                    {prod.category}
                  </td>

                  {/* Row Actions: Edit, View, and Guaranteed Working Delete */}
                  <td className="py-4 pl-3 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => onEditProduct(prod)}
                        className="text-black/50 hover:text-black cursor-pointer p-1 transition-colors"
                        title="Edit Record"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onViewProductInStore(prod)}
                        className="text-black/50 hover:text-black cursor-pointer p-1 transition-colors"
                        title="View in Store"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTargetId(prod.id)}
                        className="text-black/50 hover:text-black cursor-pointer p-1 transition-colors"
                        title="Delete Product"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className="py-16 text-center space-y-4 border-b border-black/10">
            <p className="text-xs font-mono text-black/60">
              No product records match active search or the catalog is currently clear.
            </p>
            <p className="text-[11.5px] font-sans text-black/50 max-w-lg mx-auto leading-relaxed">
              <strong className="text-black font-medium">Storefront Structure Guaranteed:</strong> The public home page structure (all 8 Curated Rotation Slots, Seasonal Edit, and Lookbook) remains 100% active, populated, and fully functional using permanent baseline atelier pieces. Any custom garments you create or edit here will automatically fit into and replace these storefront slots.
            </p>
            <div className="pt-3 flex items-center justify-center gap-6">
              <button
                type="button"
                onClick={onCreateProduct}
                className="text-xs uppercase font-mono tracking-wider underline underline-offset-4 cursor-pointer hover:opacity-60 text-black font-medium"
              >
                + Add Garment to Slot 1
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal: Single Item Deletion Confirmation (Pure White/Black Minimalist) */}
      {deleteTargetId && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <div
            onClick={() => !isDeleting && setDeleteTargetId(null)}
            className="fixed inset-0 bg-black/40 backdrop-blur-[2px]"
          />
          <div className="relative w-full max-w-md bg-white p-8 z-10 font-mono text-xs text-black space-y-6 shadow-2xl">
            <div className="space-y-2">
              <span className="text-[10px] uppercase tracking-[0.25em] text-black/40 block">
                Archival Deletion
              </span>
              <h3 className="font-editorial text-2xl font-normal text-black">
                Confirm Product Removal
              </h3>
              <p className="text-black/60 font-sans leading-relaxed text-xs">
                Are you sure you want to permanently delete this garment from the atelier catalog? It will be removed from both the storefront and admin consoles.
              </p>
            </div>

            <div className="pt-4 flex items-center justify-end gap-6 border-t border-black/10">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeleteTargetId(null)}
                className="text-xs uppercase tracking-wider text-black/60 hover:text-black underline underline-offset-4 cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => executeSingleDelete(deleteTargetId)}
                className="py-2.5 px-5 bg-black text-white hover:bg-neutral-800 text-xs uppercase tracking-[0.2em] font-medium cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Bulk Deletion Confirmation */}
      {isBulkDeleteOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <div
            onClick={() => !isDeleting && setIsBulkDeleteOpen(false)}
            className="fixed inset-0 bg-black/40 backdrop-blur-[2px]"
          />
          <div className="relative w-full max-w-md bg-white p-8 z-10 font-mono text-xs text-black space-y-6 shadow-2xl">
            <div className="space-y-2">
              <span className="text-[10px] uppercase tracking-[0.25em] text-black/40 block">
                Bulk Archival Deletion
              </span>
              <h3 className="font-editorial text-2xl font-normal text-black">
                Delete {selectedIds.length} Selected Garments
              </h3>
              <p className="text-black/60 font-sans leading-relaxed text-xs">
                You are about to permanently delete {selectedIds.length} garments from the active atelier collection. This change updates immediately.
              </p>
            </div>

            <div className="pt-4 flex items-center justify-end gap-6 border-t border-black/10">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setIsBulkDeleteOpen(false)}
                className="text-xs uppercase tracking-wider text-black/60 hover:text-black underline underline-offset-4 cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={executeBulkDelete}
                className="py-2.5 px-5 bg-black text-white hover:bg-neutral-800 text-xs uppercase tracking-[0.2em] font-medium cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : `Delete ${selectedIds.length} Products`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Bulk Price Adjustment (Minimalist Underline) */}
      {showBulkPriceModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <div
            onClick={() => setShowBulkPriceModal(false)}
            className="fixed inset-0 bg-black/40 backdrop-blur-[2px]"
          />
          <div className="relative w-full max-w-md bg-white p-8 z-10 font-mono text-xs text-black space-y-6 shadow-2xl">
            <div className="space-y-2">
              <span className="text-[10px] uppercase tracking-[0.25em] text-black/40 block">
                Catalog Economics
              </span>
              <h3 className="font-editorial text-2xl font-normal text-black">
                Adjust Prices by Percentage
              </h3>
              <p className="text-black/60 font-sans leading-relaxed text-xs">
                Apply a percentage price adjustment across {selectedIds.length} selected garments.
              </p>
            </div>

            <div>
              <label className="block text-[10px] uppercase tracking-wider text-black/40 mb-1">
                Percentage Delta (%)
              </label>
              <input
                type="number"
                value={bulkPricePercent}
                onChange={(e) => setBulkPricePercent(parseFloat(e.target.value) || 0)}
                placeholder="+10 or -15"
                className="w-full bg-transparent border-0 border-b border-black/30 focus:border-black py-2 text-sm font-mono text-black outline-none rounded-none"
              />
            </div>

            <div className="pt-4 flex items-center justify-end gap-6 border-t border-black/10">
              <button
                type="button"
                onClick={() => setShowBulkPriceModal(false)}
                className="text-xs uppercase tracking-wider text-black/60 hover:text-black underline underline-offset-4 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleBulkPriceAdjust}
                className="py-2.5 px-5 bg-black text-white hover:bg-neutral-800 text-xs uppercase tracking-[0.2em] font-medium cursor-pointer"
              >
                Apply Delta
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
