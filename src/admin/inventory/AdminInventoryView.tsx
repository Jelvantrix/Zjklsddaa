import React, { useState } from 'react';
import { Product } from '../../types';
import { Download, AlertCircle, Check, Search, ArrowUp, ArrowDown } from 'lucide-react';
import { useAuth } from '../../supabase/AuthContext';
import { supabase } from '../../supabase/config';
import { logAuditEvent } from '../../supabase/dbService';

interface AdminInventoryViewProps {
  products: Product[];
  onRefresh: () => void;
}

export const AdminInventoryView: React.FC<AdminInventoryViewProps> = ({ products, onRefresh }) => {
  const { isEditor, adminProfile } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'out'>('all');
  const [updatingSku, setUpdatingSku] = useState<string | null>(null);

  // Flatten variants with parent product info
  const allVariants = products.flatMap((p) =>
    (p.variants || []).map((v) => ({
      productId: p.id,
      productNr: p.nr || p.plateNumber,
      productName: p.name.en || p.name.fi,
      category: p.category,
      price: p.price,
      size: v.size,
      sku: v.sku,
      stock: v.stock,
      variantsList: p.variants || [],
    }))
  );

  const filteredVariants = allVariants.filter((item) => {
    if (stockFilter === 'low' && (item.stock <= 0 || item.stock >= 4)) return false;
    if (stockFilter === 'out' && item.stock > 0) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        item.productNr.toLowerCase().includes(q) ||
        item.productName.toLowerCase().includes(q) ||
        item.sku.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleAdjustStock = async (
    productId: string,
    sku: string,
    delta: number,
    currentStock: number,
    variantsList: any[]
  ) => {
    if (!isEditor) return;
    const newStock = Math.max(0, currentStock + delta);
    setUpdatingSku(sku);

    try {
      const updatedVariants = variantsList.map((v) => (v.sku === sku ? { ...v, stock: newStock } : v));
      const totalStock = updatedVariants.reduce((a, b) => a + (Number(b.stock) || 0), 0);

      await supabase
        .from('products')
        .update({
          variants: updatedVariants,
          stock: totalStock,
          updatedAt: new Date().toISOString(),
        })
        .eq('id', productId);

      // Write immutable inventory log
      const logId = `inv-${Date.now()}-${sku}`;
      await supabase.from('inventoryLog').upsert({
        id: logId,
        productId,
        sku,
        delta,
        resultingStock: newStock,
        by: adminProfile?.name || 'admin',
        at: new Date().toISOString(),
        reason: 'manual_quick_adjustment',
      });

      await logAuditEvent(adminProfile?.name || 'admin', 'adjust_inventory', sku, { delta, newStock });
      onRefresh();
    } catch (err) {
      console.warn('Stock adjustment error:', err);
    } finally {
      setUpdatingSku(null);
    }
  };

  const handleExportCSV = () => {
    const headers = ['Nº', 'Product Name', 'Category', 'Size', 'SKU', 'Stock', 'Price (EUR)'];
    const rows = filteredVariants.map((v) => [
      v.productNr,
      `"${v.productName}"`,
      v.category,
      v.size,
      v.sku,
      v.stock,
      v.price,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `zejesh_inventory_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totalStockCount = allVariants.reduce((a, b) => a + b.stock, 0);
  const lowStockCount = allVariants.filter((v) => v.stock > 0 && v.stock < 4).length;
  const outOfStockCount = allVariants.filter((v) => v.stock === 0).length;

  return (
    <div className="space-y-6">
      {/* Title Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4">
        <div>
          <h1 className="font-serif text-display font-normal">Real-Time Inventory</h1>
          <p className="text-small text-black/50 mt-0.5">
            Size-level SKU tracking, atomic inventory audit logs, and low-stock replenishment thresholds.
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          className="text-small uppercase tracking-wider text-black hover:opacity-60 underline underline-offset-4 cursor-pointer flex items-center gap-1.5 font-semibold"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export Inventory CSV</span>
        </button>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-white p-4 text-small">
        <div>
          <span className="text-small uppercase text-black/50 block mb-0.5">Total Garments in Stock</span>
          <span className="text-title font-semibold text-black">{totalStockCount} units</span>
        </div>
        <div>
          <span className="text-small uppercase text-black/50 block mb-0.5">Low Stock SKUs (&lt; 4 units)</span>
          <span className="text-title font-semibold text-black underline">{lowStockCount} SKUs</span>
        </div>
        <div>
          <span className="text-small uppercase text-black/50 block mb-0.5">Depleted SKUs (0 units)</span>
          <span className="text-title font-semibold text-black/40">{outOfStockCount} SKUs</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 text-small">
        <div className="relative sm:col-span-2">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-black/40" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search SKU, product plate Nº or garment name..."
            className="w-full pl-8 pr-3 py-1.5 bg-transparent"
          />
        </div>

        <div>
          <select
            value={stockFilter}
            onChange={(e) => setStockFilter(e.target.value as any)}
            className="w-full px-2.5 py-1.5 bg-transparent cursor-pointer"
          >
            <option value="all">All stock statuses ({allVariants.length})</option>
            <option value="low">Low Stock Alert (&lt; 4)</option>
            <option value="out">Depleted / Sold Out (0)</option>
          </select>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-white overflow-x-auto">
        <table className="w-full text-left text-small">
          <thead>
            <tr className="text-small uppercase tracking-wider text-black/60 select-none">
              <th className="p-3 w-16">Nº</th>
              <th className="p-3">Product Name</th>
              <th className="p-3 w-28">Category</th>
              <th className="p-3 w-20">Size</th>
              <th className="p-3">SKU</th>
              <th className="p-3 w-24">Price</th>
              <th className="p-3 w-28">Stock Level</th>
              <th className="p-3 w-32 text-right">Quick Edit</th>
            </tr>
          </thead>
          <tbody className="">
            {filteredVariants.map((item) => (
              <tr key={item.sku} className="transition-colors">
                <td className="p-3 font-semibold">{item.productNr}</td>
                <td className="p-3 font-medium text-black">{item.productName}</td>
                <td className="p-3 capitalize text-black/60">{item.category}</td>
                <td className="p-3 font-bold">{item.size}</td>
                <td className="p-3 text-black/60">{item.sku}</td>
                <td className="p-3 font-semibold">{item.price} €</td>
                <td className="p-3">
                  <span
                    className={`font-semibold ${ item.stock === 0 ?'text-black/30 line-through' : item.stock < 4 ? 'underline font-bold' : ''
                    }`}
                  >
                    {item.stock} units
                  </span>
                </td>
                <td className="p-3 text-right">
                  <div className="flex items-center justify-end gap-3">
                    <button
                      onClick={() =>
                        handleAdjustStock(item.productId, item.sku, -1, item.stock, item.variantsList)
                      }
                      disabled={updatingSku === item.sku || item.stock <= 0}
                      className="text-small uppercase hover:opacity-60 disabled:opacity-20 underline underline-offset-2 cursor-pointer"
                    >
                      -1
                    </button>
                    <button
                      onClick={() =>
                        handleAdjustStock(item.productId, item.sku, 1, item.stock, item.variantsList)
                      }
                      disabled={updatingSku === item.sku}
                      className="text-small uppercase hover:opacity-60 disabled:opacity-20 underline underline-offset-2 cursor-pointer"
                    >
                      +1
                    </button>
                    <button
                      onClick={() =>
                        handleAdjustStock(item.productId, item.sku, 5, item.stock, item.variantsList)
                      }
                      disabled={updatingSku === item.sku}
                      className="text-small uppercase hover:opacity-60 disabled:opacity-20 underline underline-offset-2 cursor-pointer font-semibold"
                    >
                      +5
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
