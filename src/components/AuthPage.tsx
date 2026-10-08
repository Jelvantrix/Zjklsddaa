import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Eye,
  EyeOff,
  Check,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Copy,
  CheckCircle2,
  RefreshCw,
  LogOut,
  ShoppingBag,
  Heart,
  Key,
} from 'lucide-react';
import { useAuth, DESIGNATED_ADMIN_EMAIL } from '../supabase/AuthContext';
import { ADMIN_SECRET_PATH } from '../App';

interface AuthPageProps {
  initialMode?: 'signin' | 'signup' | 'forgot';
  onNavigateHome: () => void;
  onNavigateAdmin: () => void;
  onOpenCart?: () => void;
  onOpenWishlist?: () => void;
  onNavigateArchive?: () => void;
  cartCount?: number;
  wishlistCount?: number;
}

export const AuthPage: React.FC<AuthPageProps> = ({
  initialMode = 'signin',
  onNavigateHome,
  onNavigateAdmin,
  onOpenCart,
  onOpenWishlist,
  cartCount = 0,
  wishlistCount = 0,
}) => {
  const {
    user,
    isAdmin,
    isOwner,
    signIn,
    signUp,
    resetPassword,
    signOut,
    changePassword,
  } = useAuth();

  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Status Feedback States
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [copiedPath, setCopiedPath] = useState(false);

  // Password change state (for logged in patrons)
  const [newPassword, setNewPassword] = useState('');
  const [changePassLoading, setChangePassLoading] = useState(false);
  const [changePassSuccess, setChangePassSuccess] = useState('');
  const [changePassError, setChangePassError] = useState('');

  // Auto-fill saved email if remembered
  useEffect(() => {
    const saved = localStorage.getItem('zejesh_patron_email');
    if (saved) setEmail(saved);
  }, []);

  const clearMessages = () => {
    setErrorMessage('');
    setSuccessMessage('');
  };

  const handleModeSwitch = (nextMode: 'signin' | 'signup' | 'forgot') => {
    setMode(nextMode);
    clearMessages();
  };

  // Sign in submit
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();

    if (!email.trim() || !password) {
      setErrorMessage('Please provide your registered email address and password.');
      return;
    }

    setLoading(true);
    try {
      const res = await signIn(email.trim(), password);
      if (res.success) {
        if (rememberMe) {
          localStorage.setItem('zejesh_patron_email', email.trim());
        } else {
          localStorage.removeItem('zejesh_patron_email');
        }
        setSuccessMessage('Authentication verified. Welcome to the Atelier.');
      } else {
        setErrorMessage(res.error || 'Authentication failed. Please verify your credentials.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected authentication error occurred.');
    } finally {
      setLoading(false);
    }
  };

  // Sign up submit
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();

    if (!email.trim() || !password) {
      setErrorMessage('Please specify an email address and password.');
      return;
    }
    if (password.length < 6) {
      setErrorMessage('Password must contain at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage('The passwords provided do not match.');
      return;
    }

    setLoading(true);
    try {
      const res = await signUp(email.trim(), password, fullName.trim());
      if (res.success) {
        setSuccessMessage(res.message || 'Patron registration completed. You may now sign in.');
        if (rememberMe) {
          localStorage.setItem('zejesh_patron_email', email.trim());
        }
      } else {
        setErrorMessage(res.error || 'Registration could not be completed.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected registration error occurred.');
    } finally {
      setLoading(false);
    }
  };

  // Password reset request
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();

    if (!email.trim()) {
      setErrorMessage('Please enter your email to receive recovery instructions.');
      return;
    }

    setLoading(true);
    try {
      const res = await resetPassword(email.trim());
      if (res.success) {
        setSuccessMessage(res.message || 'Password reset link dispatched to your inbox.');
      } else {
        setErrorMessage(res.error || 'Unable to process reset request.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to dispatch password recovery link.');
    } finally {
      setLoading(false);
    }
  };

  // In-session password update
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setChangePassError('');
    setChangePassSuccess('');

    if (!newPassword || newPassword.length < 6) {
      setChangePassError('New password must be at least 6 characters long.');
      return;
    }

    setChangePassLoading(true);
    try {
      const res = await changePassword(newPassword);
      if (res.success) {
        setChangePassSuccess('Password successfully updated.');
        setNewPassword('');
      } else {
        setChangePassError(res.error || 'Could not update credentials.');
      }
    } catch (err: any) {
      setChangePassError(err.message || 'Failed to update credentials.');
    } finally {
      setChangePassLoading(false);
    }
  };

  const handleCopyAdminPath = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(ADMIN_SECRET_PATH);
      setCopiedPath(true);
      setTimeout(() => setCopiedPath(false), 2500);
    }
  };

  const isUserDesignatedAdmin =
    user?.email?.toLowerCase().trim() === DESIGNATED_ADMIN_EMAIL.toLowerCase() || isAdmin || isOwner;

  return (
    <div className="min-h-screen bg-white text-black selection:bg-black selection:text-white flex flex-col font-sans">
      {/* Top Return Navigation: Pure minimal white background, black text */}
      <header className="w-full bg-white px-5 sm:px-10 lg:px-16 h-16 sm:h-20 flex items-center justify-between border-b border-black/5 shrink-0 z-20">
        <button
          type="button"
          onClick={onNavigateHome}
          className="group flex items-center gap-2.5 text-xs font-mono uppercase tracking-[0.25em] text-black/60 hover:text-black transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
          <span>Return to Storefront</span>
        </button>

        <span className="text-[10px] font-mono uppercase tracking-[0.3em] text-black/35">
          Patron Access
        </span>
      </header>

      {/* Main Container: Completely White Background and Black Text, Fully Responsive */}
      <main className="flex-1 flex items-center justify-center px-4 sm:px-6 md:px-10 py-10 sm:py-16 bg-white">
        <div className="w-full max-w-md sm:max-w-lg mx-auto">
          {/* If user is ALREADY authenticated: Show Patron Dashboard */}
          {user ? (
            <div className="space-y-8 sm:space-y-10 animate-fadeIn">
              {/* Header */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] tracking-[0.3em] uppercase text-black/40">
                    Authenticated Session
                  </span>
                  <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-black">
                    <span className="w-1.5 h-1.5 rounded-full bg-black animate-pulse" />
                    Active
                  </span>
                </div>
                <h1 className="font-editorial text-3xl sm:text-5xl font-normal text-black tracking-tight">
                  Patron Dashboard
                </h1>
                <p className="text-xs font-mono text-black/60 break-all">
                  {user.email}
                </p>
              </div>

              {/* VIP Executive Access: Only visible when signed in as huxaifa0fficial@gmail.com */}
              {isUserDesignatedAdmin && (
                <div className="bg-black text-white p-6 sm:p-8 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <ShieldCheck className="w-5 h-5 text-white" />
                      <span className="font-mono text-xs uppercase tracking-[0.25em] font-semibold text-white">
                        Executive Console Ready
                      </span>
                    </div>
                    <span className="text-[9.5px] font-mono text-white/50 tracking-widest uppercase">
                      Owner Authorization
                    </span>
                  </div>

                  <p className="text-xs font-sans text-white/70 leading-relaxed font-light">
                    Master administrator authorization recognized. Access catalog engineering, inventory stock, orders, and studio telemetry.
                  </p>

                  <button
                    type="button"
                    onClick={onNavigateAdmin}
                    className="w-full py-4 bg-white text-black hover:bg-neutral-200 transition-colors text-xs font-mono uppercase tracking-[0.25em] font-semibold flex items-center justify-center gap-2 cursor-pointer group"
                  >
                    <span>ENTER ATELIER MANAGEMENT TERMINAL</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </button>

                  {/* Direct Terminal URL */}
                  <div className="pt-2 text-[11px] font-mono text-white/60 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase tracking-wider text-white/40">
                        Direct Terminal Path:
                      </span>
                      <button
                        type="button"
                        onClick={handleCopyAdminPath}
                        className="flex items-center gap-1 text-[10px] uppercase text-white/80 hover:text-white underline cursor-pointer"
                      >
                        {copiedPath ? (
                          <>
                            <Check className="w-3 h-3 text-white" />
                            <span className="text-white font-medium">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy Path</span>
                          </>
                        )}
                      </button>
                    </div>
                    <div className="font-mono text-[10.5px] break-all select-all text-white/90">
                      {ADMIN_SECRET_PATH}
                    </div>
                  </div>
                </div>
              )}

              {/* Patron Metrics: Pure Borderless Typographic Grid */}
              <div className="grid grid-cols-2 gap-4 sm:gap-6 text-xs font-mono py-2">
                <div className="space-y-1">
                  <span className="text-[9.5px] uppercase tracking-widest text-black/40 block">
                    Patron Status
                  </span>
                  <span className="font-sans text-sm font-medium text-black">
                    {isUserDesignatedAdmin ? 'Executive Administrator' : 'Verified Patron'}
                  </span>
                </div>
                <div className="space-y-1">
                  <span className="text-[9.5px] uppercase tracking-widest text-black/40 block">
                    Session Clearance
                  </span>
                  <span className="font-mono text-xs text-black/80">
                    Encrypted Token
                  </span>
                </div>
                <div
                  onClick={onOpenWishlist}
                  className="space-y-1 cursor-pointer group"
                >
                  <span className="text-[9.5px] uppercase tracking-widest text-black/40 block group-hover:text-black transition-colors">
                    Archival Wishlist
                  </span>
                  <span className="font-sans text-sm font-medium text-black flex items-center gap-2">
                    <span>{wishlistCount} Pieces</span>
                    <Heart className="w-3.5 h-3.5 text-black/50 group-hover:text-black transition-colors" />
                  </span>
                </div>
                <div
                  onClick={onOpenCart}
                  className="space-y-1 cursor-pointer group"
                >
                  <span className="text-[9.5px] uppercase tracking-widest text-black/40 block group-hover:text-black transition-colors">
                    Shopping Bag
                  </span>
                  <span className="font-sans text-sm font-medium text-black flex items-center gap-2">
                    <span>{cartCount} Items</span>
                    <ShoppingBag className="w-3.5 h-3.5 text-black/50 group-hover:text-black transition-colors" />
                  </span>
                </div>
              </div>

              {/* Change Password Panel: Pure Underline Inputs */}
              <div className="space-y-4 pt-4 border-t border-black/10">
                <h3 className="font-mono text-xs uppercase tracking-[0.25em] font-medium text-black flex items-center gap-2">
                  <Key className="w-3.5 h-3.5" />
                  <span>Update Credentials</span>
                </h3>
                <form onSubmit={handleChangePassword} className="space-y-4">
                  <input
                    type="password"
                    placeholder="New password (minimum 6 characters)"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-transparent border-0 border-b border-black/20 focus:border-black py-2.5 px-0 text-xs font-mono placeholder:text-black/30 outline-none transition-colors rounded-none"
                  />
                  {changePassError && (
                    <p className="text-xs text-black font-mono font-medium underline">{changePassError}</p>
                  )}
                  {changePassSuccess && (
                    <p className="text-xs text-black font-mono font-medium">{changePassSuccess}</p>
                  )}
                  <button
                    type="submit"
                    disabled={changePassLoading}
                    className="w-full py-3.5 bg-black text-white hover:bg-neutral-800 transition-colors text-xs font-mono uppercase tracking-[0.2em] cursor-pointer disabled:opacity-50"
                  >
                    {changePassLoading ? 'Updating...' : 'Update Password'}
                  </button>
                </form>
              </div>

              {/* Return / Sign Out Actions */}
              <div className="pt-4 flex items-center justify-between border-t border-black/10">
                <button
                  type="button"
                  onClick={onNavigateHome}
                  className="text-xs font-mono uppercase tracking-[0.2em] text-black/60 hover:text-black underline underline-offset-4 cursor-pointer"
                >
                  Return to Storefront
                </button>
                <button
                  type="button"
                  onClick={() => signOut()}
                  className="flex items-center gap-2 text-xs font-mono uppercase tracking-[0.2em] text-black/60 hover:text-black transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          ) : (
            /* If user is NOT authenticated: Show Sign In / Sign Up / Forgot Password */
            <div className="space-y-8 animate-fadeIn">
              {/* Borderless Mode Switcher Tabs */}
              <div className="flex items-center gap-4 sm:gap-6 font-mono text-xs">
                <button
                  type="button"
                  onClick={() => handleModeSwitch('signin')}
                  className={`uppercase tracking-[0.25em] transition-colors cursor-pointer py-1 ${
                    mode === 'signin'
                      ? 'text-black font-semibold underline underline-offset-8'
                      : 'text-black/40 hover:text-black'
                  }`}
                >
                  Sign In
                </button>
                <span className="text-black/20 font-light">/</span>
                <button
                  type="button"
                  onClick={() => handleModeSwitch('signup')}
                  className={`uppercase tracking-[0.25em] transition-colors cursor-pointer py-1 ${
                    mode === 'signup'
                      ? 'text-black font-semibold underline underline-offset-8'
                      : 'text-black/40 hover:text-black'
                  }`}
                >
                  Register
                </button>
                <span className="text-black/20 font-light">/</span>
                <button
                  type="button"
                  onClick={() => handleModeSwitch('forgot')}
                  className={`uppercase tracking-[0.25em] transition-colors cursor-pointer py-1 ${
                    mode === 'forgot'
                      ? 'text-black font-semibold underline underline-offset-8'
                      : 'text-black/40 hover:text-black'
                  }`}
                >
                  Recovery
                </button>
              </div>

              {/* Heading & Subtitle */}
              <div className="space-y-2">
                <h1 className="font-editorial text-3xl sm:text-5xl font-normal text-black leading-tight tracking-tight">
                  {mode === 'signin' && 'Atelier Access'}
                  {mode === 'signup' && 'Patron Account'}
                  {mode === 'forgot' && 'Access Recovery'}
                </h1>
                <p className="font-sans text-xs sm:text-sm text-black/60 leading-relaxed font-light">
                  {mode === 'signin' &&
                    'Sign in with your email to view order allocations, reserve pieces, and access your patron profile.'}
                  {mode === 'signup' &&
                    'Register with the atelier to establish your patron credentials and access archival drops.'}
                  {mode === 'forgot' &&
                    'Enter your registered email address to receive password reset instructions.'}
                </p>
              </div>

              {/* Status Alerts */}
              {errorMessage && (
                <div className="py-2 text-black text-xs font-mono flex items-start gap-2 border-l-2 border-black pl-3 animate-fadeIn">
                  <AlertCircle className="w-4 h-4 shrink-0 text-black mt-0.5" />
                  <span className="leading-relaxed">{errorMessage}</span>
                </div>
              )}

              {successMessage && (
                <div className="py-2 text-black text-xs font-mono flex items-start gap-2 border-l-2 border-black pl-3 animate-fadeIn">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-black mt-0.5" />
                  <span className="leading-relaxed">{successMessage}</span>
                </div>
              )}

              {/* FORMS: Completely Borderless Inputs with Luxury Underline */}
              {mode === 'signin' && (
                <form onSubmit={handleSignIn} className="space-y-6 pt-2">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-mono uppercase tracking-[0.25em] text-black/50">
                      Email Address
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="patron@example.com"
                      className="w-full bg-transparent border-0 border-b border-black/20 focus:border-black py-3 px-0 text-sm font-sans text-black placeholder:text-black/30 outline-none transition-colors rounded-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="block text-[10px] font-mono uppercase tracking-[0.25em] text-black/50">
                        Password
                      </label>
                      <button
                        type="button"
                        onClick={() => handleModeSwitch('forgot')}
                        className="text-[10px] font-mono text-black/40 hover:text-black uppercase tracking-wider underline cursor-pointer"
                      >
                        Forgot?
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••••••"
                        className="w-full bg-transparent border-0 border-b border-black/20 focus:border-black py-3 pr-8 px-0 text-sm font-sans text-black placeholder:text-black/30 outline-none transition-colors rounded-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-0 top-1/2 -translate-y-1/2 text-black/40 hover:text-black cursor-pointer p-1"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-mono text-black/60">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="w-3.5 h-3.5 accent-black rounded-none cursor-pointer"
                      />
                      <span>Remember credentials</span>
                    </label>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-4 bg-black text-white hover:bg-neutral-800 transition-colors text-xs font-mono uppercase tracking-[0.25em] font-medium flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
                  >
                    {loading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>AUTHENTICATING...</span>
                      </>
                    ) : (
                      <>
                        <span>SIGN IN TO ATELIER</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              )}

              {mode === 'signup' && (
                <form onSubmit={handleSignUp} className="space-y-6 pt-2">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-mono uppercase tracking-[0.25em] text-black/50">
                      Full Name / Patron Alias
                    </label>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Elena Rostova"
                      className="w-full bg-transparent border-0 border-b border-black/20 focus:border-black py-3 px-0 text-sm font-sans text-black placeholder:text-black/30 outline-none transition-colors rounded-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] font-mono uppercase tracking-[0.25em] text-black/50">
                      Email Address
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="patron@example.com"
                      className="w-full bg-transparent border-0 border-b border-black/20 focus:border-black py-3 px-0 text-sm font-sans text-black placeholder:text-black/30 outline-none transition-colors rounded-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] font-mono uppercase tracking-[0.25em] text-black/50">
                      Password (Min. 6 Characters)
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••••••"
                        className="w-full bg-transparent border-0 border-b border-black/20 focus:border-black py-3 pr-8 px-0 text-sm font-sans text-black placeholder:text-black/30 outline-none transition-colors rounded-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-0 top-1/2 -translate-y-1/2 text-black/40 hover:text-black cursor-pointer p-1"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] font-mono uppercase tracking-[0.25em] text-black/50">
                      Confirm Password
                    </label>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full bg-transparent border-0 border-b border-black/20 focus:border-black py-3 px-0 text-sm font-sans text-black placeholder:text-black/30 outline-none transition-colors rounded-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-4 bg-black text-white hover:bg-neutral-800 transition-colors text-xs font-mono uppercase tracking-[0.25em] font-medium flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
                  >
                    {loading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>REGISTERING...</span>
                      </>
                    ) : (
                      <>
                        <span>CREATE ACCOUNT</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              )}

              {mode === 'forgot' && (
                <form onSubmit={handleResetPassword} className="space-y-6 pt-2">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-mono uppercase tracking-[0.25em] text-black/50">
                      Registered Email Address
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="patron@example.com"
                      className="w-full bg-transparent border-0 border-b border-black/20 focus:border-black py-3 px-0 text-sm font-sans text-black placeholder:text-black/30 outline-none transition-colors rounded-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-4 bg-black text-white hover:bg-neutral-800 transition-colors text-xs font-mono uppercase tracking-[0.25em] font-medium flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
                  >
                    {loading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>SENDING INSTRUCTIONS...</span>
                      </>
                    ) : (
                      <>
                        <span>DISPATCH RESET LINK</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>

                  <div className="text-center pt-2">
                    <button
                      type="button"
                      onClick={() => handleModeSwitch('signin')}
                      className="text-xs font-mono text-black/50 hover:text-black uppercase tracking-[0.15em] underline cursor-pointer"
                    >
                      ← Return to Sign In
                    </button>
                  </div>
                </form>
              )}

              {/* Minimal Patron Privileges Note: Pure white and black typography */}
              <div className="pt-6 border-t border-black/10 space-y-3">
                <span className="font-mono text-[9.5px] uppercase tracking-[0.25em] text-black/40 block">
                  Discerning Patron Benefits
                </span>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-sans text-black/70 font-light">
                  <li className="flex items-center gap-2">
                    <span className="w-1 h-1 rounded-full bg-black/60 shrink-0" />
                    <span>Seasonal archival allocations</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1 h-1 rounded-full bg-black/60 shrink-0" />
                    <span>Live restock notifications</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1 h-1 rounded-full bg-black/60 shrink-0" />
                    <span>Private curated wishlist</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1 h-1 rounded-full bg-black/60 shrink-0" />
                    <span>Permanent garment care records</span>
                  </li>
                </ul>
              </div>

              {/* Subtle Micro-Footnote */}
              <div className="pt-4 text-center">
                <p className="text-[10px] font-mono text-black/35 uppercase tracking-widest">
                  Zejesh Atelier · Helsinki · Porto
                </p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
