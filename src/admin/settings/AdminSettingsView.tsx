import React, { useState, useEffect } from 'react';
import { StoreSettings, AuditLog, SocialPlatformLink } from '../../types';
import { useAuth } from '../../supabase/AuthContext';
import { supabase } from '../../supabase/config';
import { logAuditEvent } from '../../supabase/dbService';
import { Save, RotateCcw, Download, Shield, User, Clock, AlertTriangle, Plus, Trash2, Mail, Globe, Check, ExternalLink } from 'lucide-react';

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
  const [formData, setFormData] = useState<StoreSettings>(() => {
    const existing = { ...settings };
    if (!existing.storeInfo) {
      existing.storeInfo = {
        name: 'ZEJESH',
        email: 'huxaifa0fficial@gmail.com',
        dispatchEmail: 'dispatch@zejesh.com',
        conciergeEmail: 'concierge@zejesh.com',
        address: 'Aleksanterinkatu 17, 00100 Helsinki, Finland',
        currency: 'EUR (€)',
        platforms: [],
      };
    }
    if (!existing.storeInfo.platforms || existing.storeInfo.platforms.length === 0) {
      existing.storeInfo.platforms = [
        { id: 'plat-ig', name: 'Instagram', url: 'https://instagram.com/zejesh', handle: '@zejesh', enabled: true },
        { id: 'plat-pin', name: 'Pinterest', url: 'https://pinterest.com/zejesh', handle: '@zejesh', enabled: true },
        { id: 'plat-tt', name: 'TikTok', url: 'https://tiktok.com/@zejesh', handle: '@zejesh', enabled: true },
        { id: 'plat-wa', name: 'WhatsApp', url: 'https://wa.me/358401234567', handle: 'Atelier Concierge', enabled: true },
      ];
    }
    return existing;
  });

  const [ownerEmail, setOwnerEmail] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('zejesh_admin_owner_email') || 'huxaifa0fficial@gmail.com';
    }
    return 'huxaifa0fficial@gmail.com';
  });

  // State for new platform form
  const [newPlatformName, setNewPlatformName] = useState('Instagram');
  const [newPlatformUrl, setNewPlatformUrl] = useState('');
  const [newPlatformHandle, setNewPlatformHandle] = useState('');
  const [showAddPlatform, setShowAddPlatform] = useState(false);

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);
  const [resetSuccessMessage, setResetSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    // Load recent audit logs
    const loadAuditLogs = async () => {
      try {
        const { data: rows } = await supabase
          .from('auditLog')
          .select('*')
          .order('at', { ascending: false })
          .limit(15);
        const logs: AuditLog[] = [];
        (rows || []).forEach((row) => logs.push({ ...(row as AuditLog), id: row.id }));
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
    setSaveSuccessMsg(null);
    try {
      // 1. Save owner email locally & in session
      if (typeof window !== 'undefined') {
        localStorage.setItem('zejesh_admin_owner_email', ownerEmail.trim().toLowerCase());
        sessionStorage.setItem('zejesh_admin_session_email', ownerEmail.trim().toLowerCase());
      }

      // 2. Persist updated store settings to Firestore
      const updatedSettings = {
        ...formData,
        storeInfo: {
          ...formData.storeInfo,
          email: formData.storeInfo?.email || ownerEmail.trim().toLowerCase(),
        },
      };

      await supabase.from('settings').upsert({ ...updatedSettings, id: 'global-settings' });

      // 3. Update admins document for owner
      try {
        await supabase.from('admins').upsert({
          email: ownerEmail.trim().toLowerCase(),
          role: 'owner',
          name: 'Huxaifa (Owner)',
          updatedAt: new Date().toISOString(),
          id: 'admin-owner',
        });
      } catch {}

      await logAuditEvent(adminProfile?.name || 'admin', 'update_store_settings', 'settings', {
        storeName: formData.storeInfo?.name,
        ownerEmail: ownerEmail.trim().toLowerCase(),
        platformsCount: formData.storeInfo?.platforms?.length || 0,
      });

      setSaveSuccessMsg('Configuration, administrative email, and platforms saved successfully.');
      setTimeout(() => setSaveSuccessMsg(null), 4000);
      onRefresh();
    } catch (err: any) {
      console.warn('Settings save error:', err);
      alert(`Could not save settings: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Platform handlers
  const handleTogglePlatform = (id: string) => {
    const currentPlatforms = formData.storeInfo?.platforms || [];
    const updated = currentPlatforms.map((p) =>
      p.id === id ? { ...p, enabled: !p.enabled } : p
    );
    setFormData({
      ...formData,
      storeInfo: { ...formData.storeInfo, platforms: updated },
    });
  };

  const handleDeletePlatform = (id: string) => {
    const currentPlatforms = formData.storeInfo?.platforms || [];
    const updated = currentPlatforms.filter((p) => p.id !== id);
    setFormData({
      ...formData,
      storeInfo: { ...formData.storeInfo, platforms: updated },
    });
  };

  const handleAddPlatform = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlatformUrl.trim()) return;

    const newPlat: SocialPlatformLink = {
      id: `plat-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: newPlatformName.trim(),
      url: newPlatformUrl.trim(),
      handle: newPlatformHandle.trim() || undefined,
      enabled: true,
    };

    const currentPlatforms = formData.storeInfo?.platforms || [];
    setFormData({
      ...formData,
      storeInfo: {
        ...formData.storeInfo,
        platforms: [...currentPlatforms, newPlat],
      },
    });

    setNewPlatformUrl('');
    setNewPlatformHandle('');
    setShowAddPlatform(false);
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
      ownerEmail,
      exportedAt: new Date().toISOString(),
    };
    const jsonStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(data, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute('href', jsonStr);
    dlAnchor.setAttribute('download', `zejesh_store_backup_${Date.now()}.json`);
    dlAnchor.click();
  };

  const currentPlatforms = formData.storeInfo?.platforms || [];

  return (
    <div className="space-y-8 max-w-4xl font-mono text-xs">
      {/* Title Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-black/[0.08]">
        <div>
          <h1 className="font-editorial text-3xl font-normal">Studio Configuration & Governance</h1>
          <p className="text-xs font-mono text-black/50 mt-0.5">
            Manage principal owner email, communications channels, connected external platforms, tax rules, and audit logs.
          </p>
        </div>

        {isOwner && (
          <button
            onClick={handleSaveSettings}
            disabled={isSaving}
            className="text-xs font-mono uppercase tracking-wider bg-black text-white hover:bg-neutral-800 px-4 py-2 cursor-pointer flex items-center gap-1.5 font-semibold disabled:opacity-50 transition-colors shadow-sm"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaving ? 'Saving Changes...' : 'Save Configuration'}</span>
          </button>
        )}
      </div>

      {saveSuccessMsg && (
        <div className="p-3 border border-emerald-300 bg-emerald-50 text-emerald-900 font-semibold flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-700 shrink-0" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {resetSuccessMessage && (
        <div className="p-3 border-b border-black bg-black/[0.02] text-black font-semibold">
          {resetSuccessMessage}
        </div>
      )}

      {/* SECTION 1: ADMINISTRATIVE & COMMUNICATIONS EMAILS */}
      <div className="space-y-4 border border-black/[0.1] p-5 bg-neutral-50/50">
        <div className="flex items-center gap-2 border-b border-black/[0.08] pb-2">
          <Mail className="w-4 h-4 text-black" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-black">
            1. Administrative & Studio Email Management
          </h2>
        </div>
        <p className="text-[11px] text-black/60 font-sans">
          Manage the authorized owner access email and public client contact endpoints.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div>
            <label className="block text-[10.5px] uppercase font-semibold text-black mb-1">
              Principal Owner & Master Admin Email
            </label>
            <input
              type="email"
              value={ownerEmail}
              onChange={(e) => setOwnerEmail(e.target.value)}
              placeholder="e.g. huxaifa0fficial@gmail.com"
              className="w-full px-3 py-2 border border-black/30 focus:border-black bg-white font-mono text-xs"
            />
            <span className="text-[10px] text-black/40 block mt-1">
              Only this email address is authorized to unlock and govern the studio admin console.
            </span>
          </div>

          <div>
            <label className="block text-[10.5px] uppercase text-black/70 mb-1">
              Storefront Client Support Email
            </label>
            <input
              type="email"
              value={formData.storeInfo?.email || ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  storeInfo: { ...formData.storeInfo, email: e.target.value },
                })
              }
              placeholder="e.g. contact@zejesh.com"
              className="w-full px-3 py-2 border border-black/20 focus:border-black bg-white font-mono text-xs"
            />
            <span className="text-[10px] text-black/40 block mt-1">
              Displayed on invoice receipts and storefront customer service contacts.
            </span>
          </div>

          <div>
            <label className="block text-[10.5px] uppercase text-black/70 mb-1">
              Logistics & Dispatch Orders Email
            </label>
            <input
              type="email"
              value={formData.storeInfo?.dispatchEmail || ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  storeInfo: { ...formData.storeInfo, dispatchEmail: e.target.value },
                })
              }
              placeholder="e.g. dispatch@zejesh.com"
              className="w-full px-3 py-2 border border-black/20 focus:border-black bg-white font-mono text-xs"
            />
          </div>

          <div>
            <label className="block text-[10.5px] uppercase text-black/70 mb-1">
              Private Concierge / VIP Client Email
            </label>
            <input
              type="email"
              value={formData.storeInfo?.conciergeEmail || ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  storeInfo: { ...formData.storeInfo, conciergeEmail: e.target.value },
                })
              }
              placeholder="e.g. concierge@zejesh.com"
              className="w-full px-3 py-2 border border-black/20 focus:border-black bg-white font-mono text-xs"
            />
          </div>
        </div>
      </div>

      {/* SECTION 2: CONNECTED PLATFORMS & SOCIAL CHANNELS */}
      <div className="space-y-4 border border-black/[0.1] p-5 bg-neutral-50/50">
        <div className="flex items-center justify-between border-b border-black/[0.08] pb-2">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-black" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-black">
              2. Connected Platforms & External Channels
            </h2>
          </div>

          <button
            type="button"
            onClick={() => setShowAddPlatform(!showAddPlatform)}
            className="flex items-center gap-1.5 px-3 py-1 bg-black text-white hover:bg-neutral-800 text-[11px] uppercase font-mono cursor-pointer transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Platform</span>
          </button>
        </div>

        <p className="text-[11px] text-black/60 font-sans">
          Configure links to your external platforms (Instagram, TikTok, Pinterest, WhatsApp, X, YouTube, Spotify). Active channels appear dynamically on the live storefront footer.
        </p>

        {/* Add Platform Form Drawer / Collapse */}
        {showAddPlatform && (
          <form onSubmit={handleAddPlatform} className="p-4 border border-black bg-white space-y-3 mt-2">
            <span className="text-[11px] uppercase font-semibold text-black block">
              Configure New External Channel
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] uppercase text-black/60 mb-1">Platform Type</label>
                <select
                  value={newPlatformName}
                  onChange={(e) => setNewPlatformName(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-black/20 text-xs bg-white cursor-pointer"
                >
                  <option value="Instagram">Instagram</option>
                  <option value="TikTok">TikTok</option>
                  <option value="Pinterest">Pinterest</option>
                  <option value="WhatsApp">WhatsApp</option>
                  <option value="X">X (Twitter)</option>
                  <option value="YouTube">YouTube</option>
                  <option value="Spotify">Spotify</option>
                  <option value="Facebook">Facebook</option>
                  <option value="Custom">Custom Platform</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] uppercase text-black/60 mb-1">Direct URL / Link</label>
                <input
                  type="text"
                  required
                  value={newPlatformUrl}
                  onChange={(e) => setNewPlatformUrl(e.target.value)}
                  placeholder="https://instagram.com/zejesh"
                  className="w-full px-2.5 py-1.5 border border-black/20 text-xs"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase text-black/60 mb-1">Display Label / Handle</label>
                <input
                  type="text"
                  value={newPlatformHandle}
                  onChange={(e) => setNewPlatformHandle(e.target.value)}
                  placeholder="@zejesh or IG"
                  className="w-full px-2.5 py-1.5 border border-black/20 text-xs"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowAddPlatform(false)}
                className="px-3 py-1.5 border border-black/20 hover:border-black text-xs uppercase"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-black text-white hover:bg-neutral-800 text-xs uppercase font-semibold"
              >
                Save Channel
              </button>
            </div>
          </form>
        )}

        {/* Existing Platforms List */}
        <div className="border border-black/[0.08] divide-y divide-black/[0.06] bg-white">
          {currentPlatforms.map((plat) => (
            <div key={plat.id} className="p-3.5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={plat.enabled !== false}
                  onChange={() => handleTogglePlatform(plat.id)}
                  className="w-4 h-4 accent-black cursor-pointer"
                  title="Enable or disable on storefront footer"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-black">{plat.name}</span>
                    {plat.handle && (
                      <span className="text-[10.5px] font-mono text-black/50">({plat.handle})</span>
                    )}
                    {plat.enabled !== false ? (
                      <span className="text-[9px] uppercase font-mono px-1.5 py-0.2 bg-emerald-100 text-emerald-900 border border-emerald-300">
                        Live on Footer
                      </span>
                    ) : (
                      <span className="text-[9px] uppercase font-mono px-1.5 py-0.2 bg-neutral-100 text-neutral-600 border border-neutral-300">
                        Disabled
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-black/50 truncate block max-w-md">
                    {plat.url}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {plat.url && plat.url.startsWith('http') && (
                  <a
                    href={plat.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 text-black/40 hover:text-black transition-colors"
                    title="Open link"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => handleDeletePlatform(plat.id)}
                  className="p-1.5 text-black/40 hover:text-red-600 transition-colors cursor-pointer"
                  title="Remove platform"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}

          {currentPlatforms.length === 0 && (
            <div className="p-6 text-center text-black/40 text-xs">
              No platforms connected yet. Click "+ Add Platform" to connect Instagram, TikTok, etc.
            </div>
          )}
        </div>
      </div>

      {/* SECTION 3: STUDIO ENTITY & TAX THRESHOLDS */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-black border-b border-black/[0.08] pb-1.5">
          3. Brand Entity & Studio Details
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] uppercase text-black/50 mb-1">Brand Name</label>
            <input
              type="text"
              value={formData.storeInfo?.name || 'ZEJESH'}
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
            <label className="block text-[10px] uppercase text-black/50 mb-1">Physical Atelier Address</label>
            <input
              type="text"
              value={formData.storeInfo?.address || 'Aleksanterinkatu 17, Helsinki'}
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
        </div>
      </div>

      {/* SECTION 4: DATA GOVERNANCE & BACKUP */}
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
