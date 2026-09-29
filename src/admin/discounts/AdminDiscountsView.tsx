import React, { useState } from 'react';
import { Discount } from '../../types';
import { useAuth } from '../../firebase/AuthContext';
import { doc, updateDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { logAuditEvent } from '../../firebase/dbService';
import { Plus, Percent, Check, Trash2, X } from 'lucide-react';

interface AdminDiscountsViewProps {
  discounts: Discount[];
  onRefresh: () => void;
}

export const AdminDiscountsView: React.FC<AdminDiscountsViewProps> = ({ discounts, onRefresh }) => {
  const { isEditor, adminProfile } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<Discount>>({
    code: '',
    type: 'percent',
    value: 15,
    minSpend: 150,
    usageLimit: 50,
    used: 0,
    active: true,
  });

  const handleToggleActive = async (discount: Discount) => {
    if (!isEditor) return;
    try {
      await updateDoc(doc(db, 'discounts', discount.id), {
        active: !discount.active,
      });
      await logAuditEvent(adminProfile?.name || 'admin', 'toggle_discount', discount.code, {
        active: !discount.active,
      });
      onRefresh();
    } catch (err) {
      console.warn('Discount toggle error:', err);
    }
  };

  const handleCreateDiscount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.code?.trim() || !isEditor) return;
    try {
      const codeUpper = formData.code.trim().toUpperCase();
      const id = `disc-${Date.now()}`;
      const newDiscount: Discount = {
        id,
        code: codeUpper,
        type: formData.type || 'percent',
        value: Number(formData.value) || 10,
        minSpend: Number(formData.minSpend) || 0,
        usageLimit: Number(formData.usageLimit) || 100,
        used: 0,
        active: true,
        startAt: new Date().toISOString(),
      };

      await setDoc(doc(db, 'discounts', id), newDiscount);
      await logAuditEvent(adminProfile?.name || 'admin', 'create_discount', codeUpper, {
        value: newDiscount.value,
        type: newDiscount.type,
      });

      setIsModalOpen(false);
      setFormData({
        code: '',
        type: 'percent',
        value: 15,
        minSpend: 150,
        usageLimit: 50,
        used: 0,
        active: true,
      });
      onRefresh();
    } catch (err) {
      console.warn('Discount creation error:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-black/[0.08]">
        <div>
          <h1 className="font-editorial text-3xl font-normal">Discount Codes & Privileges</h1>
          <p className="text-xs font-mono text-black/50 mt-0.5">
            Architectural coupons, private VIP campaign codes, and redemption telemetry.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="text-xs font-mono uppercase tracking-wider text-black hover:opacity-60 underline underline-offset-4 cursor-pointer flex items-center gap-1.5 font-semibold"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Discount Code</span>
        </button>
      </div>

      {/* Table */}
      <div className="border border-black/[0.08] bg-white overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs font-mono">
          <thead>
            <tr className="border-b border-black/[0.08] bg-black/[0.02] text-[10px] uppercase tracking-wider text-black/60 select-none">
              <th className="p-3">Coupon Code</th>
              <th className="p-3">Discount Type</th>
              <th className="p-3">Value</th>
              <th className="p-3">Minimum Spend</th>
              <th className="p-3">Redemptions</th>
              <th className="p-3">Active State</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/[0.06]">
            {discounts.map((disc) => (
              <tr key={disc.id} className="hover:bg-black/[0.015] transition-colors">
                <td className="p-3 font-semibold text-black tracking-wider">{disc.code}</td>
                <td className="p-3 capitalize text-black/70">{disc.type}</td>
                <td className="p-3 font-bold">
                  {disc.type === 'percent' ? `${disc.value} %` : `${disc.value} €`}
                </td>
                <td className="p-3 text-black/60">{disc.minSpend ? `${disc.minSpend} €` : 'No minimum'}</td>
                <td className="p-3">
                  <span className="font-semibold text-black">{disc.used}</span> / {disc.usageLimit || '∞'}
                </td>
                <td className="p-3">
                  <span className="text-[10px] uppercase tracking-wider">
                    {disc.active ? '● Active' : '○ Disabled'}
                  </span>
                </td>
                <td className="p-3 text-right">
                  <button
                    onClick={() => handleToggleActive(disc)}
                    className="text-xs font-mono uppercase text-black hover:opacity-60 underline underline-offset-4 cursor-pointer"
                  >
                    {disc.active ? 'Deactivate' : 'Activate'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {discounts.length === 0 && (
          <div className="p-12 text-center text-xs font-mono text-black/40">
            No active discount codes created yet.
          </div>
        )}
      </div>

      {/* Modal: Create Discount */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div onClick={() => setIsModalOpen(false)} className="fixed inset-0 bg-black/60" />
          <div className="relative w-full max-w-sm bg-white border border-black p-6 z-10 font-mono text-xs shadow-2xl">
            <div className="flex justify-between items-center mb-4 border-b border-black/[0.08] pb-2">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-black">Create Discount Code</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 text-black/50 hover:text-black">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateDiscount} className="space-y-4">
              <div>
                <label className="block text-[10px] uppercase text-black/60 mb-1">Coupon Code</label>
                <input
                  type="text"
                  required
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  placeholder="e.g. VIPARCHIVE15"
                  className="w-full px-2.5 py-1.5 border-b border-black/30 focus:border-black uppercase font-bold tracking-widest bg-transparent"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase text-black/60 mb-1">Type</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                    className="w-full px-2 py-1.5 border-b border-black/30 focus:border-black bg-transparent"
                  >
                    <option value="percent">Percentage (%)</option>
                    <option value="fixed">Fixed Amount (€)</option>
                    <option value="freeShipping">Free Shipping</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] uppercase text-black/60 mb-1">Value</label>
                  <input
                    type="number"
                    value={formData.value}
                    onChange={(e) => setFormData({ ...formData, value: parseFloat(e.target.value) || 0 })}
                    className="w-full px-2 py-1.5 border-b border-black/30 focus:border-black bg-transparent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase text-black/60 mb-1">Min Spend (€)</label>
                  <input
                    type="number"
                    value={formData.minSpend}
                    onChange={(e) => setFormData({ ...formData, minSpend: parseFloat(e.target.value) || 0 })}
                    className="w-full px-2 py-1.5 border-b border-black/30 focus:border-black bg-transparent"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase text-black/60 mb-1">Usage Limit</label>
                  <input
                    type="number"
                    value={formData.usageLimit}
                    onChange={(e) => setFormData({ ...formData, usageLimit: parseInt(e.target.value) || 0 })}
                    className="w-full px-2 py-1.5 border-b border-black/30 focus:border-black bg-transparent"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-4 mt-6 pt-2 border-t border-black/[0.08]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="text-xs font-mono uppercase text-black/60 hover:text-black underline underline-offset-4 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="text-xs font-mono uppercase text-black hover:opacity-60 underline underline-offset-4 font-semibold cursor-pointer"
                >
                  Save Code
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
