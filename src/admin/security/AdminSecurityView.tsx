import React, { useState } from 'react';
import {
  ShieldCheck,
  Lock,
  Key,
  Clock,
  Download,
  AlertCircle,
  CheckCircle2,
  Fingerprint,
} from 'lucide-react';
import { AuditLog } from '../../types';
import { useAuth } from '../../supabase/AuthContext';

interface AdminSecurityViewProps {
  autoLockMinutes: number;
  onUpdateAutoLock: (minutes: number) => void;
  onLockTerminalNow: () => void;
  auditLogs: AuditLog[];
}

export const AdminSecurityView: React.FC<AdminSecurityViewProps> = ({
  autoLockMinutes,
  onUpdateAutoLock,
  onLockTerminalNow,
  auditLogs,
}) => {
  const { changePassword, adminProfile, role } = useAuth();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passkeySuccess, setPasskeySuccess] = useState(false);
  const [passkeyError, setPasskeyError] = useState('');
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  const handleSavePasskey = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasskeyError('');

    if (newPassword.length < 8) {
      setPasskeyError('Password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasskeyError('Passwords do not match.');
      return;
    }

    setIsSavingPassword(true);
    // Handed to Supabase Auth, which hashes it server-side. The plaintext is
    // never stored or logged by this application.
    const result = await changePassword(newPassword);
    setIsSavingPassword(false);

    if (!result.success) {
      setPasskeyError(result.error || 'Unable to update password.');
      return;
    }

    setNewPassword('');
    setConfirmPassword('');
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
            Session controls, password management and the audit log recorded for this terminal. Only verified
            checks are reported.
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
            <span>Assigned Role</span>
          </div>
          <div className="text-base font-semibold text-black uppercase break-words">
            {adminProfile?.role || role || 'No role assigned'}
          </div>
          <div className="text-[11px] text-black/40 mt-1">
            Granted by your Supabase sign-in — inactivity auto-lock is {autoLockMinutes === 0 ? 'disabled' : `${autoLockMinutes}m`}
          </div>
        </div>

        <div className="p-4 border border-black/[0.08] bg-white">
          <div className="flex items-center gap-2 text-xs text-black/50 uppercase tracking-wider mb-2">
            <Fingerprint className="w-4 h-4 text-black/60" />
            <span>Signed-In Operator</span>
          </div>
          <div className="text-sm font-semibold text-black break-words">
            {adminProfile?.email || 'Not signed in'}
          </div>
          <div className="text-[11px] text-black/40 mt-1">Identity comes from the Supabase session</div>
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
        {/* Password Change Form */}
        <div className="p-5 border border-black/[0.08] bg-white space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-black/[0.08]">
            <Key className="w-4 h-4 text-black/70" />
            <h2 className="text-xs font-semibold uppercase tracking-wider text-black">
              Account Password
            </h2>
          </div>

          <p className="text-[11px] text-black/60 font-sans leading-relaxed">
            Changes the password for <strong>{adminProfile?.email || 'your studio account'}</strong>.
            Credentials are hashed server-side by Supabase Auth — this application never stores them.
          </p>

          <form onSubmit={handleSavePasskey} className="space-y-3">
            <div>
              <label className="block text-[10px] uppercase text-black/50 mb-1">New Password</label>
              <input
                type="password"
                required
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimum 8 characters"
                className="w-full px-3 py-2 text-xs border border-black/[0.15] focus:border-black focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase text-black/50 mb-1">Confirm New Password</label>
              <input
                type="password"
                required
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat new password"
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
                <span>Password updated successfully!</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isSavingPassword}
              className="px-4 py-2 bg-black text-white text-xs uppercase tracking-wider hover:bg-black/85 transition-colors cursor-pointer disabled:opacity-50"
            >
              {isSavingPassword ? 'Updating...' : 'Update Password'}
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
              <label className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-medium text-black">Geofenced IP Restriction</div>
                  <div className="text-[10px] text-black/50">Not available — no IP allow-list is configured or enforced.</div>
                </div>
                <input
                  type="checkbox"
                  disabled
                  aria-label="Geofenced IP restriction — not available"
                  className="accent-black w-4 h-4 cursor-not-allowed opacity-50"
                />
              </label>

              <label className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-medium text-black">Two-Factor Hardware Verification</div>
                  <div className="text-[10px] text-black/50">Not available — two-factor verification is not configured.</div>
                </div>
                <input
                  type="checkbox"
                  disabled
                  aria-label="Two-factor hardware verification — not available"
                  className="accent-black w-4 h-4 cursor-not-allowed opacity-50"
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
              Security Audit Trail ({auditLogs.length} Events)
            </h2>
          </div>
          <button
            type="button"
            onClick={handleExportAuditLogs}
            className="text-xs uppercase text-black hover:opacity-60 underline underline-offset-4 cursor-pointer flex items-center gap-1.5 self-start sm:self-auto"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Audit Log (JSON)</span>
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
              {auditLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-xs text-black/40">
                    No activity yet — audit entries appear here as soon as a real action is recorded.
                  </td>
                </tr>
              ) : (
                auditLogs.map((log) => {
                  const status =
                    typeof log.details?.status === 'string' && log.details.status
                      ? log.details.status
                      : 'Unverified';
                  return (
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
                        <span
                          className={`text-[10px] uppercase font-semibold ${
                            status.toLowerCase() === 'verified' ? 'text-emerald-700' : 'text-black/50'
                          }`}
                        >
                          {status}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
