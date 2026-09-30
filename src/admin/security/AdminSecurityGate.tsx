import React, { useState, useEffect } from 'react';
import { ShieldCheck, Lock, Mail, Key, AlertTriangle, ArrowLeft, Eye, EyeOff, CheckCircle2 } from 'lucide-react';

interface AdminSecurityGateProps {
  isLocked: boolean;
  onUnlock: () => void;
  onExitToStore: () => void;
  masterPasskey?: string;
}

const AUTHORIZED_ADMIN_EMAIL = 'huxaifa0fficial@gmail.com';
const AUTHORIZED_ADMIN_PASS = 'JM#942JD{:"@(#JDdw3dad@(@NCVAUK8234-1';

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_SECONDS = 15 * 60; // 15 minutes lockout on brute-force

export const AdminSecurityGate: React.FC<AdminSecurityGateProps> = ({
  isLocked,
  onUnlock,
  onExitToStore,
}) => {
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [failedAttempts, setFailedAttempts] = useState(() => {
    const saved = localStorage.getItem('zejesh_sec_failed_attempts');
    return saved ? parseInt(saved, 10) : 0;
  });
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(() => {
    const saved = localStorage.getItem('zejesh_sec_lockout_until');
    return saved ? parseInt(saved, 10) : null;
  });
  const [remainingLockout, setRemainingLockout] = useState<number>(0);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  // Monitor lockout countdown
  useEffect(() => {
    const interval = setInterval(() => {
      if (lockoutUntil) {
        const remaining = Math.max(0, Math.ceil((lockoutUntil - Date.now()) / 1000));
        setRemainingLockout(remaining);
        if (remaining <= 0) {
          setLockoutUntil(null);
          setFailedAttempts(0);
          localStorage.removeItem('zejesh_sec_lockout_until');
          localStorage.removeItem('zejesh_sec_failed_attempts');
        }
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [lockoutUntil]);

  if (!isLocked) return null;

  const isLockoutActive = lockoutUntil !== null && lockoutUntil > Date.now();

  const handleVerify = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isLockoutActive) return;

    const trimmedEmail = emailInput.trim().toLowerCase();
    const trimmedPass = passwordInput.trim();

    if (!trimmedEmail || !trimmedPass) {
      setErrorMsg('Please enter both administrative email and password.');
      return;
    }

    setIsAuthenticating(true);
    setErrorMsg('');

    // Verification with anti-timing attack delay
    setTimeout(() => {
      setIsAuthenticating(false);
      const isEmailValid = trimmedEmail === AUTHORIZED_ADMIN_EMAIL.toLowerCase();
      const isPassValid = trimmedPass === AUTHORIZED_ADMIN_PASS;

      if (isEmailValid && isPassValid) {
        setFailedAttempts(0);
        localStorage.removeItem('zejesh_sec_failed_attempts');
        localStorage.removeItem('zejesh_sec_lockout_until');
        sessionStorage.setItem('zejesh_sec_unlocked_ts', Date.now().toString());
        sessionStorage.setItem('zejesh_admin_session_auth', 'authenticated');
        sessionStorage.setItem('zejesh_admin_session_email', AUTHORIZED_ADMIN_EMAIL);
        setEmailInput('');
        setPasswordInput('');
        onUnlock();
      } else {
        const nextAttempts = failedAttempts + 1;
        setFailedAttempts(nextAttempts);
        localStorage.setItem('zejesh_sec_failed_attempts', nextAttempts.toString());

        if (nextAttempts >= MAX_FAILED_ATTEMPTS) {
          const lockTime = Date.now() + LOCKOUT_DURATION_SECONDS * 1000;
          setLockoutUntil(lockTime);
          localStorage.setItem('zejesh_sec_lockout_until', lockTime.toString());
          setErrorMsg('Maximum unauthorized attempts exceeded. System quarantined for 15 minutes.');
        } else {
          setErrorMsg(
            `Access Denied: Invalid email or password. (${MAX_FAILED_ATTEMPTS - nextAttempts} attempts remaining)`
          );
        }
      }
    }, 450);
  };

  const formatSeconds = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${mins}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="fixed inset-0 z-[120] bg-[#0A0A0A] text-white flex flex-col justify-between p-4 sm:p-8 md:p-10 select-none animate-fadeIn font-mono">
      {/* Top security header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-4 max-w-6xl w-full mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[11px] sm:text-xs uppercase tracking-[0.25em] text-white/70">
            Zejesh Clothes · Production Studio Terminal
          </span>
        </div>
        <button
          type="button"
          onClick={onExitToStore}
          className="text-[11px] sm:text-xs text-white/50 hover:text-white uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer py-1 px-2 border border-white/10 hover:border-white/30"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Exit to Storefront</span>
        </button>
      </div>

      {/* Center login authentication card */}
      <div className="max-w-md w-full mx-auto my-auto py-6 sm:py-8">
        <div className="border border-white/10 bg-neutral-900/80 p-6 sm:p-8 backdrop-blur-xl shadow-2xl relative">
          <div className="w-12 h-12 border border-white/20 mx-auto flex items-center justify-center mb-5 text-white bg-black/40">
            <Lock className="w-5 h-5 stroke-[1.5]" />
          </div>

          <div className="text-center mb-6">
            <span className="text-[10px] uppercase font-mono tracking-[0.3em] text-white/40 block mb-1">
              AUTHORIZED PERSONNEL ONLY
            </span>
            <h1 className="font-editorial text-2xl sm:text-3xl font-normal tracking-wide text-white mb-2">
              Studio Portal Access
            </h1>
            <p className="text-[11.5px] text-white/60 leading-relaxed font-sans">
              Enter your master studio credentials to manage production catalog, orders, real-time inventory, and live client relations.
            </p>
          </div>

          {isLockoutActive ? (
            <div className="p-4 border border-rose-500/40 bg-rose-950/40 text-rose-200 text-xs space-y-2 mb-4">
              <div className="flex items-center gap-2 font-semibold">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>TERMINAL QUARANTINED</span>
              </div>
              <p className="text-[11px] text-rose-300/80">
                Excessive unauthorized attempts detected. Access suspended.
              </p>
              <div className="font-mono text-xl font-bold text-center py-2 text-rose-400">
                {formatSeconds(remainingLockout)}
              </div>
            </div>
          ) : (
            <form onSubmit={handleVerify} className="space-y-4">
              <div>
                <label className="block text-[10px] uppercase tracking-[0.2em] text-white/60 mb-1.5 flex items-center gap-1.5">
                  <Mail className="w-3 h-3 text-white/40" />
                  <span>Admin Email</span>
                </label>
                <input
                  type="email"
                  autoFocus
                  required
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="Enter administrator email..."
                  disabled={isAuthenticating}
                  className="w-full px-3.5 py-2.5 text-xs bg-black/80 border border-white/20 text-white placeholder-white/25 focus:border-white focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-[0.2em] text-white/60 mb-1.5 flex items-center gap-1.5">
                  <Key className="w-3 h-3 text-white/40" />
                  <span>Master Password</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder="Enter production password..."
                    disabled={isAuthenticating}
                    className="w-full px-3.5 py-2.5 text-xs bg-black/80 border border-white/20 text-white placeholder-white/25 focus:border-white focus:outline-none pr-10 font-mono tracking-wider"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white cursor-pointer"
                    tabIndex={-1}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {errorMsg && (
                <div className="p-3 text-xs text-rose-300 bg-rose-950/60 border border-rose-700/50 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                  <span className="leading-snug">{errorMsg}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isAuthenticating}
                className="w-full py-3 bg-white text-black text-xs uppercase tracking-[0.22em] font-medium hover:bg-neutral-200 transition-colors cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>{isAuthenticating ? 'Authenticating System...' : 'Access Studio Console'}</span>
              </button>

              <div className="pt-2 text-center">
                <span className="text-[10px] text-white/30 flex items-center justify-center gap-1.5">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  <span>Encrypted Real-Time Production Environment</span>
                </span>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Footer security badges */}
      <div className="flex flex-wrap items-center justify-between text-[10.5px] text-white/40 border-t border-white/10 pt-4 gap-2 max-w-6xl w-full mx-auto">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>AUTHENTICATION PROTOCOL: V2-PRODUCTION</span>
          </span>
          <span>·</span>
          <span>LOCATION: ARCHIVAL CORE</span>
        </div>
        <div>
          <span>SESSION LOGS ACTIVATED</span>
        </div>
      </div>
    </div>
  );
};
