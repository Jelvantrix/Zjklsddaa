import React, { useState, useEffect } from 'react';
import { StoreSettings, AuditLog } from '../../types';
import { useAuth } from '../../firebase/AuthContext';
import { doc, updateDoc, collection, getDocs, orderBy, limit, query } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { logAuditEvent } from '../../firebase/dbService';
import { Save, RotateCcw, Download, Shield, User, Clock, AlertTriangle } from 'lucide-react';

interface AdminSettingsViewProps {
  settings: StoreSettings;
  onRefresh: () => void;
  onResetDemoData: () => Promise<boolean>;
}

export const AdminSettingsView: React.FC<AdminSettingsViewProps> = ({
  settings,
  onRefresh,
  onResetDemoData,
}) => {
  const { isOwner, adminProfile } = useAuth();
  const [formData, setFormData] = useState<StoreSettings>(settings);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [resetSuccessMessage, setResetSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    // Load recent audit logs
    const loadAuditLogs = async () => {
      try {
        const q = query(collection(db, 'auditLog'), orderBy('at', 'desc'), limit(15));
        const snap = await getDocs(q);
        const logs: AuditLog[] = [];
        snap.forEach((d) => logs.push({ ...(d.data() as AuditLog), id: d.id }));
        setAuditLogs(logs);
      } catch (err) {
        console.warn('Audit logs load warning:', err);
      }
    };
    loadAuditLogs();
  }, []);

  const handleSaveSettings = async () => {
    if (!isOwner) return;
    setIsSaving(true);
    try {
      await updateDoc(doc(db, 'settings', 'store'), {
        ...formData,
      });

      await logAuditEvent(adminProfile?.name || 'admin', 'update_store_settings', 'settings', {
        storeName: formData.storeInfo?.name,
        vat: formData.vatRate,
      });

      onRefresh();
    } catch (err) {
      console.warn('Settings save error:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetData = async () => {
    if (!isOwner) return;
    const confirmed = window.confirm(
      'Are you sure you want to reset all demo data? This will overwrite products, collections, orders, and stats with pristine seed data.'
    );
    if (!confirmed) return;

    setIsResetting(true);
    const success = await onResetDemoData();
    setIsResetting(false);
    if (success) {
      setResetSuccessMessage('Demo data successfully restored to factory state.');
      setTimeout(() => setResetSuccessMessage(null), 4000);
      onRefresh();
    }
  };

  const handleExportAllData = async () => {
    const data = {
      settings: formData,
      exportedAt: new Date().toISOString(),
    };
    const jsonStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(data, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute('href', jsonStr);
    dlAnchor.setAttribute('download', `zejesh_store_backup_${Date.now()}.json`);
    dlAnchor.click();
  };

  return (
    <div className="space-y-8 max-w-4xl font-mono text-xs">
      {/* Title Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-black/[0.08]">
        <div>
          <h1 className="font-editorial text-3xl font-normal">Studio Configuration & Governance</h1>
          <p className="text-xs font-mono text-black/50 mt-0.5">
            Operational thresholds, shipping rules, tax settings, team permissions, and audit logs.
          </p>
        </div>

        {isOwner && (
          <button
            onClick={handleSaveSettings}
            disabled={isSaving}
            className="text-xs font-mono uppercase tracking-wider text-black hover:opacity-60 underline underline-offset-4 cursor-pointer flex items-center gap-1.5 font-semibold disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaving ? 'Saving...' : 'Save Configuration'}</span>
          </button>
        )}
      </div>

      {resetSuccessMessage && (
        <div className="p-3 border-b border-black bg-black/[0.02] text-black font-semibold">
          {resetSuccessMessage}
        </div>
      )}

      {/* SECTION 1: STUDIO STORE INFO */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-black border-b border-black/[0.08] pb-1.5">
          1. Brand Entity & Studio Details
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] uppercase text-black/50 mb-1">Brand Name</label>
            <input
              type="text"
              value={formData.storeInfo?.name || ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  storeInfo: { ...formData.storeInfo, name: e.target.value },
                })
              }
              className="w-full px-3 py-1.5 border-b border-black/30 focus:border-black bg-transparent"
            />
          </div>

          <div>
            <label className="block text-[10px] uppercase text-black/50 mb-1">Official Studio Email</label>
            <input
              type="email"
              value={formData.storeInfo?.email || ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  storeInfo: { ...formData.storeInfo, email: e.target.value },
                })
              }
              className="w-full px-3 py-1.5 border-b border-black/30 focus:border-black bg-transparent"
            />
          </div>

          <div>
            <label className="block text-[10px] uppercase text-black/50 mb-1">Physical Atelier Address</label>
            <input
              type="text"
              value={formData.storeInfo?.address || ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  storeInfo: { ...formData.storeInfo, address: e.target.value },
                })
              }
              className="w-full px-3 py-1.5 border-b border-black/30 focus:border-black bg-transparent"
            />
          </div>

          <div>
            <label className="block text-[10px] uppercase text-black/50 mb-1">Operating Currency</label>
            <input
              type="text"
              value={formData.storeInfo?.currency || 'EUR (€)'}
              disabled
              className="w-full px-3 py-1.5 border-b border-black/15 text-black/50 bg-transparent"
            />
          </div>
        </div>
      </div>

      {/* SECTION 2: COMMERCE & TAX THRESHOLDS */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-black border-b border-black/[0.08] pb-1.5">
          2. Tax & Commerce Thresholds
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-[10px] uppercase text-black/50 mb-1">Finnish VAT / ALV (%)</label>
            <input
              type="number"
              value={formData.vatRate || 24}
              onChange={(e) => setFormData({ ...formData, vatRate: parseFloat(e.target.value) || 24 })}
              className="w-full px-3 py-1.5 border-b border-black/30 focus:border-black bg-transparent font-semibold"
            />
          </div>

          <div>
            <label className="block text-[10px] uppercase text-black/50 mb-1">Free Shipping Threshold (€)</label>
            <input
              type="number"
              value={formData.freeShippingThreshold || 100}
              onChange={(e) =>
                setFormData({ ...formData, freeShippingThreshold: parseFloat(e.target.value) || 100 })
              }
              className="w-full px-3 py-1.5 border-b border-black/30 focus:border-black bg-transparent font-semibold"
            />
          </div>

          <div>
            <label className="block text-[10px] uppercase text-black/50 mb-1">Low-Stock Alert Trigger (&lt; units)</label>
            <input
              type="number"
              value={formData.lowStockThreshold || 4}
              onChange={(e) =>
                setFormData({ ...formData, lowStockThreshold: parseInt(e.target.value) || 4 })
              }
              className="w-full px-3 py-1.5 border-b border-black/30 focus:border-black bg-transparent font-semibold"
            />
          </div>
        </div>
      </div>

      {/* SECTION 3: SHIPPING METHODS */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-black border-b border-black/[0.08] pb-1.5">
          3. Logistic Methods & Rates
        </h2>
        <div className="border border-black/[0.08] divide-y divide-black/[0.06] bg-white">
          {(formData.shippingRates || []).map((method, idx) => (
            <div key={idx} className="p-3.5 flex items-center justify-between">
              <div>
                <span className="font-semibold text-black">{method.name}</span>
                <span className="text-[10px] text-black/40 block">Estimated delivery: {method.estimatedDays}</span>
              </div>
              <div className="font-bold text-black">{method.rate} €</div>
            </div>
          ))}
        </div>
      </div>

      {/* SECTION 4: DATA GOVERNANCE & RESET */}
      <div className="space-y-4 border-t border-black/[0.08] pt-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-black">
          4. Studio Data Governance & Factory Reset
        </h2>
        <div className="flex flex-wrap gap-6 items-center">
          <button
            onClick={handleExportAllData}
            className="text-xs font-mono uppercase text-black hover:opacity-60 underline underline-offset-4 cursor-pointer flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Full Studio Backup (JSON)</span>
          </button>

          {isOwner && (
            <button
              disabled={isResetting}
              onClick={handleResetData}
              className="text-xs font-mono uppercase text-black hover:opacity-60 underline underline-offset-4 cursor-pointer flex items-center gap-1.5 font-bold disabled:opacity-50"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{isResetting ? 'Resetting Data...' : 'Reset Factory Demo Data'}</span>
            </button>
          )}
        </div>
      </div>

      {/* SECTION 5: AUDIT LOG VIEWER */}
      <div className="space-y-4 border-t border-black/[0.08] pt-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-black">
          5. Immutable Administrative Audit Log
        </h2>
        <div className="border border-black/[0.08] bg-white overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs font-mono">
            <thead>
              <tr className="border-b border-black/[0.08] bg-black/[0.02] text-[10px] uppercase tracking-wider text-black/60">
                <th className="p-2.5">Timestamp</th>
                <th className="p-2.5">User</th>
                <th className="p-2.5">Action</th>
                <th className="p-2.5">Target</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.06]">
              {auditLogs.map((log) => (
                <tr key={log.id} className="hover:bg-black/[0.015]">
                  <td className="p-2.5 text-black/50 text-[10px]">
                    {log.at?.substring(0, 16).replace('T', ' ')}
                  </td>
                  <td className="p-2.5 font-medium">{log.who}</td>
                  <td className="p-2.5 uppercase font-semibold text-[10px]">{log.action}</td>
                  <td className="p-2.5 text-black/70">{log.target}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {auditLogs.length === 0 && (
            <div className="p-6 text-center text-black/40">No audit events recorded yet.</div>
          )}
        </div>
      </div>
    </div>
  );
};
