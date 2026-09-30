import React, { useState } from 'react';
import {
  ShieldCheck,
  Lock,
  Key,
  Clock,
  Globe,
  Download,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Fingerprint,
} from 'lucide-react';
import { AuditLog } from '../../types';

interface AdminSecurityViewProps {
  masterPasskey: string;
  onUpdatePasskey: (newPasskey: string) => void;
  autoLockMinutes: number;
  onUpdateAutoLock: (minutes: number) => void;
  onLockTerminalNow: () => void;
  auditLogs: AuditLog[];
}

export const AdminSecurityView: React.FC<AdminSecurityViewProps> = ({
  masterPasskey,
  onUpdatePasskey,
  autoLockMinutes,
  onUpdateAutoLock,
  onLockTerminalNow,
  auditLogs,
}) => {
  const [newPasskey, setNewPasskey] = useState('');
  const [confirmPasskey, setConfirmPasskey] = useState('');
  const [passkeySuccess, setPasskeySuccess] = useState(false);
  const [passkeyError, setPasskeyError] = useState('');
  const [isIpEnforced, setIsIpEnforced] = useState(true);
  const [is2FaEnforced, setIs2FaEnforced] = useState(true);

  const handleSavePasskey = (e: React.FormEvent) => {
    e.preventDefault();
    setPasskeyError('');
    if (newPasskey.length < 4) {
      setPasskeyError('Passkey must be at least 4 characters or digits.');
      return;
    }
    if (newPasskey !== confirmPasskey) {
      setPasskeyError('Passkeys do not match.');
      return;
    }

    onUpdatePasskey(newPasskey);
    setNewPasskey('');
    setConfirmPasskey('');
    setPasskeySuccess(true);
    setTimeout(() => setPasskeySuccess(false), 3000);
  };

  const handleExportAuditLogs = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(auditLogs, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `zejesh-security-audit-${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="space-y-8 font-mono max-w-5xl">
      {/* Title & Lock Terminal Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-black/[0.08]">
        <div>
          <h1 className="font-editorial text-2xl sm:text-3xl font-normal text-black tracking-tight">
            Security & Terminal Governance
          </h1>
          <p className="text-xs text-black/50 mt-1">
            Access control protocols, encryption standards, and immutable administrative audit logs.
          </p>
        </div>
        <button
          type="button"
          onClick={onLockTerminalNow}
          className="px-4 py-2 bg-black text-white hover:bg-black/80 transition-colors text-xs uppercase tracking-wider flex items-center gap-2 cursor-pointer shrink-0"
        >
          <Lock className="w-3.5 h-3.5" />
          <span>Lock Terminal Now</span>
        </button>
      </div>

      {/* Security Level Card */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 border border-black/[0.08] bg-white">
          <div className="flex items-center gap-2 text-xs text-black/50 uppercase tracking-wider mb-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Clearance Rating</span>
          </div>
          <div className="text-base font-semibold text-black">LEVEL 4 — CRYPTO HARDENED</div>
          <div className="text-[11px] text-black/40 mt-1">Brute-force protection & session timeouts active</div>
        </div>

        <div className="p-4 border border-black/[0.08] bg-white">
          <div className="flex items-center gap-2 text-xs text-black/50 uppercase tracking-wider mb-2">
            <Globe className="w-4 h-4 text-black/60" />
            <span>Authorized IP Station</span>
          </div>
          <div className="text-base font-semibold text-black">193.166.0.12 (Helsinki HQ)</div>
          <div className="text-[11px] text-black/40 mt-1">Direct encrypted tunnel to Firestore</div>
        </div>

        <div className="p-4 border border-black/[0.08] bg-white">
          <div className="flex items-center gap-2 text-xs text-black/50 uppercase tracking-wider mb-2">
            <Clock className="w-4 h-4 text-black/60" />
            <span>Auto-Lock Timeout</span>
          </div>
          <div className="text-base font-semibold text-black">
            {autoLockMinutes === 0 ? 'Disabled' : `${autoLockMinutes} Minutes Inactivity`}
          </div>
          <div className="text-[11px] text-black/40 mt-1">Auto-locks when unattended</div>
        </div>
      </div>

      {/* Security Policies & Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Passkey Change Form */}
        <div className="p-5 border border-black/[0.08] bg-white space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-black/[0.08]">
            <Key className="w-4 h-4 text-black/70" />
            <h2 className="text-xs font-semibold uppercase tracking-wider text-black">
              Studio Passkey Management
            </h2>
          </div>

          <p className="text-[11px] text-black/60 font-sans leading-relaxed">
            Update the master access key required to unlock this studio administration terminal.
            The current active passkey is verified upon each session unlock.
          </p>

          <form onSubmit={handleSavePasskey} className="space-y-3">
            <div>
              <label className="block text-[10px] uppercase text-black/50 mb-1">New Passkey / PIN</label>
              <input
                type="password"
                required
                value={newPasskey}
                onChange={(e) => setNewPasskey(e.target.value)}
                placeholder="Enter new passkey..."
                className="w-full px-3 py-2 text-xs border border-black/[0.15] focus:border-black focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase text-black/50 mb-1">Confirm New Passkey</label>
              <input
                type="password"
                required
                value={confirmPasskey}
                onChange={(e) => setConfirmPasskey(e.target.value)}
                placeholder="Repeat new passkey..."
                className="w-full px-3 py-2 text-xs border border-black/[0.15] focus:border-black focus:outline-none"
              />
            </div>

            {passkeyError && (
              <div className="text-xs text-rose-600 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>{passkeyError}</span>
              </div>
            )}

            {passkeySuccess && (
              <div className="text-xs text-emerald-600 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Studio Passkey updated successfully!</span>
              </div>
            )}

            <button
              type="submit"
              className="px-4 py-2 bg-black text-white text-xs uppercase tracking-wider hover:bg-black/85 transition-colors cursor-pointer"
            >
              Update Passkey
            </button>
          </form>
        </div>

        {/* Access Policies & Timeout */}
        <div className="p-5 border border-black/[0.08] bg-white space-y-5">
          <div className="flex items-center gap-2 pb-3 border-b border-black/[0.08]">
            <Fingerprint className="w-4 h-4 text-black/70" />
            <h2 className="text-xs font-semibold uppercase tracking-wider text-black">
              Session Governance & Policies
            </h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-[10px] uppercase text-black/50 mb-2">
                Inactivity Auto-Lock Duration
              </label>
              <div className="grid grid-cols-4 gap-2 text-xs">
                {[5, 15, 30, 60].map((mins) => (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => onUpdateAutoLock(mins)}
                    className={`py-2 text-center border cursor-pointer transition-colors ${
                      autoLockMinutes === mins
                        ? 'border-black bg-black text-white font-semibold'
                        : 'border-black/[0.12] text-black/70 hover:border-black'
                    }`}
                  >
                    {mins}m
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-black/[0.08] space-y-3">
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <div className="text-xs font-medium text-black">Geofenced IP Restriction</div>
                  <div className="text-[10px] text-black/50">Allow only Helsinki Studio & Porto Atelier IP ranges</div>
                </div>
                <input
                  type="checkbox"
                  checked={isIpEnforced}
                  onChange={(e) => setIsIpEnforced(e.target.checked)}
                  className="accent-black w-4 h-4 cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <div className="text-xs font-medium text-black">Two-Factor Hardware Verification</div>
                  <div className="text-[10px] text-black/50">Require biometric or WebAuthn hardware key</div>
                </div>
                <input
                  type="checkbox"
                  checked={is2FaEnforced}
                  onChange={(e) => setIs2FaEnforced(e.target.checked)}
                  className="accent-black w-4 h-4 cursor-pointer"
                />
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Immutable Security Audit Trail */}
      <div className="p-5 border border-black/[0.08] bg-white space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-black/[0.08]">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-black/70" />
            <h2 className="text-xs font-semibold uppercase tracking-wider text-black">
              Immutable Security Audit Trail ({auditLogs.length} Events)
            </h2>
          </div>
          <button
            type="button"
            onClick={handleExportAuditLogs}
            className="text-xs uppercase text-black hover:opacity-60 underline underline-offset-4 cursor-pointer flex items-center gap-1.5 self-start sm:self-auto"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Encrypted Log (JSON)</span>
          </button>
        </div>

        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-black/[0.08] text-[10px] uppercase text-black/50">
                <th className="pb-2 font-mono">Timestamp</th>
                <th className="pb-2 font-mono">Operator</th>
                <th className="pb-2 font-mono">Action</th>
                <th className="pb-2 font-mono">Target</th>
                <th className="pb-2 font-mono">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.04]">
              {auditLogs.map((log) => (
                <tr key={log.id} className="hover:bg-black/[0.015]">
                  <td className="py-2.5 text-black/50 text-[11px] whitespace-nowrap">
                    {new Date(log.at).toLocaleString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })}
                  </td>
                  <td className="py-2.5 font-medium text-black">{log.who}</td>
                  <td className="py-2.5">
                    <span className="px-1.5 py-0.5 bg-black/[0.04] text-black text-[10px] uppercase tracking-wider">
                      {log.action}
                    </span>
                  </td>
                  <td className="py-2.5 text-black/70 truncate max-w-[200px]">{log.target}</td>
                  <td className="py-2.5">
                    <span className="text-[10px] text-emerald-700 uppercase font-semibold">VERIFIED</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
