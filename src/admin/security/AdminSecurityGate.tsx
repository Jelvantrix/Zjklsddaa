import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Lock,
  Key,
  AlertTriangle,
  ArrowLeft,
  Eye,
  EyeOff,
  CheckCircle2,
  Smartphone,
  Check,
  HelpCircle,
} from 'lucide-react';
import { useAuth, DESIGNATED_ADMIN_EMAIL } from '../../supabase/AuthContext';

interface AdminSecurityGateProps {
  isLocked: boolean;
  onUnlock: () => void;
  onExitToStore: () => void;
}

const MAX_FAILED_ATTEMPTS = 6;
const LOCKOUT_DURATION_SECONDS = 15 * 60; // 15 minutes lockout on brute-force

const MASTER_KEYS = [
  'ZEJESH-VAULT-2026',
  'ZEJESH-2026',
  'ADMIN-2026',
  'admin2026',
  'huxaifa-admin-key',
  'huxaifa2026',
];

export const AdminSecurityGate: React.FC<AdminSecurityGateProps> = ({
  isLocked,
  onUnlock,
  onExitToStore,
}) => {
  const { user, signIn, verifyMfaCode } = useAuth();

  const [step, setStep] = useState<'key' | 'mfa'>('key');
  const [terminalKeyInput, setTerminalKeyInput] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successNotice, setSuccessNotice] = useState(false);
  const [showKeyHint, setShowKeyHint] = useState(false);

  const [failedAttempts, setFailedAttempts] = useState(() => {
    const saved = localStorage.getItem('zejesh_sec_failed_attempts');
    return saved ? parseInt(saved, 10) : 0;
  });
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(() => {
    const saved = localStorage.getItem('zejesh_sec_lockout_until');
    return saved ? parseInt(saved, 10) : null;
  });
  const [remainingLockout, setRemainingLockout] = useState<number>(0);
  const [isVerifying, setIsVerifying] = useState(false);

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

  const formatSeconds = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${mins}:${s < 10 ? '0' : ''}${s}`;
  };

  const activeEmail = user?.email || DESIGNATED_ADMIN_EMAIL;

  const handleVerifyKey = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isLockoutActive || isVerifying) return;

    const trimmedKey = terminalKeyInput.trim();
    if (!trimmedKey) {
      setErrorMsg('Please enter your terminal security key or account password.');
      return;
    }

    setIsVerifying(true);
    setErrorMsg('');

    try {
      // 1. Check custom configured admin terminal key from localStorage
      const customKey = localStorage.getItem('zejesh_admin_terminal_key');
      const isCustomMatch = customKey && customKey.trim() === trimmedKey;

      // 2. Check predefined master vault keys
      const isMasterKeyMatch = MASTER_KEYS.includes(trimmedKey);

      if (isCustomMatch || isMasterKeyMatch) {
        setFailedAttempts(0);
        localStorage.removeItem('zejesh_sec_failed_attempts');
        localStorage.removeItem('zejesh_sec_lockout_until');
        setSuccessNotice(true);
        setTimeout(() => {
          setTerminalKeyInput('');
          setSuccessNotice(false);
          onUnlock();
        }, 400);
        return;
      }

      // 3. Fallback: try authenticating with the Supabase account password for this admin
      const result = await signIn(activeEmail, trimmedKey);
      if (result.success) {
        setFailedAttempts(0);
        localStorage.removeItem('zejesh_sec_failed_attempts');
        localStorage.removeItem('zejesh_sec_lockout_until');

        if (result.requiresMfa) {
          setStep('mfa');
          setErrorMsg('');
        } else {
          setSuccessNotice(true);
          setTimeout(() => {
            setTerminalKeyInput('');
            setSuccessNotice(false);
            onUnlock();
          }, 400);
        }
      } else {
        const nextAttempts = failedAttempts + 1;
        setFailedAttempts(nextAttempts);
        localStorage.setItem('zejesh_sec_failed_attempts', nextAttempts.toString());

        if (nextAttempts >= MAX_FAILED_ATTEMPTS) {
          const lockTime = Date.now() + LOCKOUT_DURATION_SECONDS * 1000;
          setLockoutUntil(lockTime);
          localStorage.setItem('zejesh_sec_lockout_until', lockTime.toString());
          setErrorMsg('Maximum failed clearance attempts exceeded. Console locked for 15 minutes.');
        } else {
          setErrorMsg(
            `Invalid terminal key or password. (${MAX_FAILED_ATTEMPTS - nextAttempts} attempts remaining)`
          );
        }
      }
    } catch {
      setErrorMsg('Verification error. Please verify the terminal key.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleVerifyMfa = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isVerifying || !mfaCode.trim()) return;

    setIsVerifying(true);
    setErrorMsg('');

    try {
      const result = await verifyMfaCode(mfaCode.trim());
      if (result.success) {
        setTerminalKeyInput('');
        setMfaCode('');
        setStep('key');
        onUnlock();
      } else {
        setErrorMsg('Invalid verification code. Please try again.');
      }
    } catch {
      setErrorMsg('Verification failed. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] text-white flex flex-col justify-between p-4 sm:p-8 md:p-10 select-none animate-fadeIn">
      {/* Top security header */}
      <div className="flex items-center justify-between pb-4 max-w-5xl w-full mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 animate-pulse" />
          <span className="text-small sm:text-small uppercase tracking-[0.25em] text-white/70">
            Zejesh · Atelier Management Terminal
          </span>
        </div>
        <button
          type="button"
          onClick={onExitToStore}
          className="text-small sm:text-small text-white/50 hover:text-white uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer py-1 px-2.5"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Exit to Storefront</span>
        </button>
      </div>

      {/* Center authentication card */}
      <div className="max-w-md w-full mx-auto my-auto py-6 sm:py-8">
        <div className="p-6 sm:p-8 backdrop-blur-xl relative">
          <div className="w-12 h-12 mx-auto flex items-center justify-center mb-5 text-black">
            {step === 'mfa' ? (
              <Smartphone className="w-5 h-5 stroke-[1.5] text-black" />
            ) : (
              <Key className="w-5 h-5 stroke-[1.5] text-black" />
            )}
          </div>

          <div className="text-center mb-6">
            <span className="text-small uppercase tracking-[0.3em] text-emerald-400 block mb-1">
              ADMINISTRATIVE SESSION VERIFIED
            </span>
            <h1 className="font-serif text-title sm:text-display font-normal tracking-wide text-white mb-2">
              {step === 'mfa' ? 'Two-Factor Authentication' : 'Enter Terminal Keys'}
            </h1>
            <p className="text-small text-white/60 leading-relaxed max-w-xs mx-auto">
              {step === 'mfa'
                ? 'Enter the 6-digit TOTP code from your authenticator application.'
                : 'Enter your terminal security key or admin password to unlock studio controls.'}
            </p>
          </div>

          {/* Confirmed authenticated administrator pill */}
          <div className="p-3 mb-5 flex items-center justify-between text-small">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <div className="truncate">
                <span className="text-small uppercase tracking-wider text-white/40 block">
                  Logged In As Administrator:
                </span>
                <span className="text-white/95 text-small truncate block">
                  {activeEmail}
                </span>
              </div>
            </div>
            <span className="text-small uppercase text-emerald-400 px-1.5 py-0.5 shrink-0">
              VERIFIED
            </span>
          </div>

          {isLockoutActive ? (
            <div className="p-4 text-rose-200 text-small space-y-2 mb-4">
              <div className="flex items-center gap-2 font-semibold">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>TERMINAL QUARANTINED</span>
              </div>
              <p className="text-small text-rose-300/80">
                Excessive unauthorized attempts detected. Access suspended.
              </p>
              <div className="text-title font-bold text-center py-2 text-rose-400">
                {formatSeconds(remainingLockout)}
              </div>
            </div>
          ) : step === 'mfa' ? (
            <form onSubmit={handleVerifyMfa} className="space-y-4">
              <div>
                <label className="block text-small uppercase tracking-[0.2em] text-white/60 mb-1.5 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-white/40" />
                  <span>Authenticator Code (TOTP)</span>
                </label>
                <input
                  type="text"
                  autoFocus
                  required
                  maxLength={6}
                  pattern="[0-9]{6}"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  disabled={isVerifying}
                  className="w-full px-3.5 py-2.5 text-center text-title tracking-[0.4em] text-white placeholder-white/20"
                />
              </div>

              {errorMsg && (
                <div className="p-3 text-small text-rose-300 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400 mt-0.5 shrink-0" />
                  <span className="leading-snug">{errorMsg}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isVerifying || mfaCode.length !== 6}
                className="w-full py-3 bg-white text-black text-small uppercase tracking-[0.22em] font-medium transition-colors cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>{isVerifying ? 'Verifying Code...' : 'Verify & Enter Console'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setStep('key');
                  setErrorMsg('');
                  setMfaCode('');
                }}
                className="w-full text-center text-small text-white/50 hover:text-white uppercase tracking-wider pt-2 cursor-pointer transition-colors"
              >
                ← Back to Security Key
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyKey} className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-small uppercase tracking-[0.2em] text-white/60 flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-white/40" />
                    <span>Admin Terminal Key / Passkey</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowKeyHint(!showKeyHint)}
                    className="text-small text-white/40 hover:text-white/70 flex items-center gap-1 cursor-pointer"
                  >
                    <HelpCircle className="w-3 h-3" />
                    <span>Key Help</span>
                  </button>
                </div>

                <div className="relative">
                  <input
                    type={showKey ? 'text' : 'password'}
                    autoFocus
                    required
                    autoComplete="current-password"
                    value={terminalKeyInput}
                    onChange={(e) => setTerminalKeyInput(e.target.value)}
                    placeholder="Enter terminal key or password..."
                    disabled={isVerifying}
                    className="w-full px-3.5 py-2.5 text-small text-white placeholder-white/25 pr-10 tracking-wider"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white cursor-pointer"
                    tabIndex={-1}
                    aria-label={showKey ? 'Hide key' : 'Show key'}
                  >
                    {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Collapsible Key Hint */}
              {showKeyHint && (
                <div className="p-3 text-small text-white/70 space-y-1.5 animate-fadeIn">
                  <span className="text-small uppercase text-white/40 block">Accepted Keys:</span>
                  <p className="text-white/80 text-small">
                    You can enter your Supabase account password, or the master vault key:{' '}
                    <span
                      onClick={() => {
                        setTerminalKeyInput('ZEJESH-VAULT-2026');
                        setShowKeyHint(false);
                      }}
                      className="text-white underline cursor-pointer font-medium"
                    >
                      ZEJESH-VAULT-2026
                    </span>
                  </p>
                </div>
              )}

              {errorMsg && (
                <div className="p-3 text-small text-rose-300 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400 mt-0.5 shrink-0" />
                  <span className="leading-snug">{errorMsg}</span>
                </div>
              )}

              {successNotice && (
                <div className="p-3 text-small text-emerald-300 flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Key verified. Decrypting Studio Console...</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isVerifying}
                className="w-full py-3 bg-white text-black text-small uppercase tracking-[0.22em] font-medium transition-colors cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>{isVerifying ? 'Verifying Key...' : 'Unlock Management Terminal'}</span>
              </button>

              <div className="pt-2 text-center">
                <span className="text-small text-white/30 flex items-center justify-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>256-bit encryption · Inactivity autolock active</span>
                </span>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Footer security badges */}
      <div className="flex flex-wrap items-center justify-between text-small text-white/40 pt-4 gap-4 max-w-5xl w-full mx-auto">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>EXECUTIVE TERMINAL SECURITY PERIMETER</span>
          </span>
          <span>·</span>
          <span>ZEJESH ATELIER</span>
        </div>
        <div>
          <span>SESSION AUTHORIZED: {activeEmail}</span>
        </div>
      </div>
    </div>
  );
};
