import React from 'react';
import { ShieldAlert, Lock, ArrowLeft, ArrowRight, UserCheck, LogOut } from 'lucide-react';
import { useAuth, DESIGNATED_ADMIN_EMAIL } from '../../supabase/AuthContext';

interface AdminRestrictedGateProps {
  onGoToAuth: () => void;
  onBackToStorefront: () => void;
}

export const AdminRestrictedGate: React.FC<AdminRestrictedGateProps> = ({
  onGoToAuth,
  onBackToStorefront,
}) => {
  const { user, signOut } = useAuth();

  const handleSignOutAndAuth = async () => {
    try {
      await signOut();
    } catch {
      // Ignore
    }
    onGoToAuth();
  };

  return (
    <div className="min-h-screen bg-[#0D0D0D] text-white flex flex-col justify-between p-6 sm:p-12 font-mono selection:bg-white selection:text-black animate-fadeIn">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-4 max-w-4xl w-full mx-auto">
        <div className="flex items-center gap-3">
          <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
          <span className="text-[11px] uppercase tracking-[0.25em] text-white/60">
            Zejesh · Atelier Security Perimeter
          </span>
        </div>
        <button
          type="button"
          onClick={onBackToStorefront}
          className="text-[11px] text-white/60 hover:text-white uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer py-1 px-2.5 border border-white/10 hover:border-white/30"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Return to Storefront</span>
        </button>
      </div>

      {/* Main Card */}
      <div className="max-w-md w-full mx-auto my-auto py-10">
        <div className="border border-white/15 bg-black/80 backdrop-blur-xl p-8 sm:p-10 shadow-2xl relative text-center">
          {/* Top lock icon */}
          <div className="w-14 h-14 border border-rose-500/30 bg-rose-950/30 text-rose-400 mx-auto flex items-center justify-center mb-6">
            <Lock className="w-6 h-6 stroke-[1.5]" />
          </div>

          <span className="text-[10px] uppercase font-mono tracking-[0.3em] text-rose-400 block mb-2 font-medium">
            RESTRICTED TERMINAL LINK
          </span>

          <h1 className="font-editorial text-2xl sm:text-3xl font-normal tracking-tight text-white mb-3">
            Administrative Access Denied
          </h1>

          <p className="text-xs font-sans text-white/65 leading-relaxed mb-6 font-light">
            This management terminal link cannot be opened without an active executive administrator session.
            Only the designated administrator (<span className="text-white font-mono select-all font-normal">{DESIGNATED_ADMIN_EMAIL}</span>) is permitted to access this panel.
          </p>

          {user ? (
            <div className="p-4 border border-white/10 bg-white/[0.03] text-left text-xs space-y-2 mb-6">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-white/40 uppercase tracking-wider">
                  Current Session:
                </span>
                <span className="text-[9.5px] uppercase font-mono bg-white/10 text-white/70 px-1.5 py-0.5">
                  Patron Account
                </span>
              </div>
              <p className="font-mono text-white/90 break-all text-[11.5px]">
                {user.email}
              </p>
              <p className="text-[11px] text-white/50 font-sans pt-1 border-t border-white/10">
                This account does not have executive clearance. Please sign out and log in with{' '}
                <span className="text-white font-mono">{DESIGNATED_ADMIN_EMAIL}</span> on the main website.
              </p>
            </div>
          ) : (
            <div className="p-4 border border-white/10 bg-white/[0.03] text-left text-xs space-y-2 mb-6">
              <div className="flex items-center gap-2 text-white/50 text-[10.5px]">
                <ShieldAlert className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>NO ACTIVE ADMIN SESSION DETECTED</span>
              </div>
              <p className="text-[11px] text-white/60 font-sans leading-relaxed">
                You must first log in with{' '}
                <span className="text-white font-mono">{DESIGNATED_ADMIN_EMAIL}</span> on the main website.
                Once logged in, revisit this link to enter your terminal keys.
              </p>
            </div>
          )}

          {/* Action buttons */}
          <div className="space-y-3 pt-2">
            {user ? (
              <button
                type="button"
                onClick={handleSignOutAndAuth}
                className="w-full py-3.5 bg-white text-black hover:bg-neutral-200 transition-colors text-xs uppercase tracking-[0.22em] font-medium flex items-center justify-center gap-2 cursor-pointer shadow-lg"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out & Log In as Admin</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onGoToAuth}
                className="w-full py-3.5 bg-white text-black hover:bg-neutral-200 transition-colors text-xs uppercase tracking-[0.22em] font-medium flex items-center justify-center gap-2 cursor-pointer shadow-lg group"
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Log In on Website First</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </button>
            )}

            <button
              type="button"
              onClick={onBackToStorefront}
              className="w-full py-3 border border-white/15 text-white/70 hover:text-white hover:border-white/40 transition-colors text-xs uppercase tracking-wider cursor-pointer"
            >
              Return to Storefront
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-white/10 pt-4 max-w-4xl w-full mx-auto flex items-center justify-between text-[10px] text-white/40">
        <span>SECURITY ENFORCEMENT PROTOCOL: STRICT OWNER VALIDATION</span>
        <span className="hidden sm:inline">ZEJESH ENTERPRISE PERIMETER</span>
      </div>
    </div>
  );
};
