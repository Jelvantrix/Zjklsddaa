import React, { useState } from 'react';
import { Language } from '../types';
import { translations } from '../data/mockData';
import { X, Check, Shield, Database, RotateCcw, UserCheck } from 'lucide-react';
import { useAuth } from '../firebase/AuthContext';
import { useStorefrontData } from '../context/StorefrontDataContext';

interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
}

export const AccountModal: React.FC<AccountModalProps> = ({
  isOpen,
  onClose,
  language,
}) => {
  const t = translations[language];
  const { role, switchRole, signOut } = useAuth();
  const { isLiveFromFirestore, resetDemoData } = useStorefrontData();

  const [activeTab, setActiveTab] = useState<'customer' | 'admin'>('customer');
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) setIsSubmitted(true);
  };

  const handleResetData = async () => {
    setIsResetting(true);
    const ok = await resetDemoData();
    setIsResetting(false);
    if (ok) {
      setResetSuccess(true);
      setTimeout(() => setResetSuccess(false), 3000);
    }
  };

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center p-4">
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/40 backdrop-blur-[2px]"
      />

      <div className="relative w-full max-w-md bg-white border border-black p-6 sm:p-8 shadow-2xl z-10 animate-fadeIn">
        <div className="flex items-center justify-between pb-3 sm:pb-4 border-b border-black/10 mb-4 sm:mb-6">
          <h3 className="font-editorial text-2xl sm:text-3xl font-normal">
            {t.nav.account}
          </h3>
          <button onClick={onClose} className="p-1.5 text-black/50 hover:text-black cursor-pointer">
            <X className="w-5 h-5 stroke-[1.5]" />
          </button>
        </div>

        {/* Tab switch: Customer vs Studio Staff / Admin */}
        <div className="flex border-b border-black/15 mb-6">
          <button
            type="button"
            onClick={() => setActiveTab('customer')}
            className={`pb-2.5 px-3 text-xs font-mono uppercase tracking-wider transition-colors cursor-pointer ${
              activeTab === 'customer'
                ? 'border-b-2 border-black font-semibold text-black'
                : 'text-black/50 hover:text-black'
            }`}
          >
            {language === 'fi' ? 'Asiakastili' : 'Customer'}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('admin')}
            className={`pb-2.5 px-3 text-xs font-mono uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'admin'
                ? 'border-b-2 border-black font-semibold text-black'
                : 'text-black/50 hover:text-black'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>{language === 'fi' ? 'Studio & Ylläpito' : 'Studio Staff'}</span>
          </button>
        </div>

        {activeTab === 'customer' ? (
          !isSubmitted ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <p className="text-xs font-sans text-black/70 leading-relaxed">
                {language === 'fi'
                  ? 'Kirjaudu sisään sähköpostillasi seurataksesi tilauksiasi tai tarkastellaksesi arkistovarauksiasi.'
                  : 'Sign in with your email to track active shipments or inspect your archival allocations.'}
              </p>

              <div>
                <label className="block text-[10.5px] font-mono uppercase tracking-wider text-black/60 mb-1">
                  {language === 'fi' ? 'Sähköpostiosoite' : 'Email Address'}
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nimi@osoite.fi"
                  className="w-full px-3.5 py-2.5 text-xs font-mono border border-black/20 focus:border-black focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3.5 btn-primary text-xs uppercase tracking-[0.18em] font-medium cursor-pointer"
              >
                {language === 'fi' ? 'Lähetä kirjautumiskoodi' : 'Send Access Key'}
              </button>
            </form>
          ) : (
            <div className="text-center py-6 space-y-3">
              <div className="w-10 h-10 border border-black mx-auto flex items-center justify-center">
                <Check className="w-5 h-5" />
              </div>
              <p className="text-xs font-sans text-black/80">
                {language === 'fi'
                  ? `Kertakäyttöinen kirjautumislinkki on lähetetty osoitteeseen ${email}.`
                  : `A one-time access key has been dispatched to ${email}.`}
              </p>
              <button
                onClick={onClose}
                className="mt-4 px-6 py-2 btn-secondary text-xs uppercase tracking-wider cursor-pointer"
              >
                {t.nav.close}
              </button>
            </div>
          )
        ) : (
          <div className="space-y-5">
            <div className="p-3 border border-black/10 bg-black/[0.02]">
              <div className="flex items-center justify-between text-xs font-mono mb-2">
                <span className="text-black/60 uppercase tracking-wider">Tietokanta (Firestore):</span>
                <span className="flex items-center gap-1.5 font-medium">
                  <span className={`w-2 h-2 rounded-full ${isLiveFromFirestore ? 'bg-black' : 'border border-black'}`} />
                  {isLiveFromFirestore ? 'Yhdistetty (Live)' : 'Paikallinen siemen'}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-black/60 uppercase tracking-wider">Aktiivinen rooli:</span>
                <span className="font-semibold uppercase tracking-wider text-black bg-black/10 px-2 py-0.5">
                  {role}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-[10.5px] font-mono uppercase tracking-wider text-black/60 mb-2">
                {language === 'fi' ? 'Vaihda käyttöoikeusroolia (Testaustyökalu):' : 'Switch Role (RBAC Simulator):'}
              </label>
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <button
                  type="button"
                  onClick={() => switchRole('owner')}
                  className={`p-2.5 border text-left cursor-pointer transition-colors ${
                    role === 'owner' ? 'border-black bg-black text-white font-semibold' : 'border-black/20 hover:border-black'
                  }`}
                >
                  <div className="text-[10px] uppercase opacity-70">Rooli 1</div>
                  <div>Owner (Pääkäyttäjä)</div>
                </button>
                <button
                  type="button"
                  onClick={() => switchRole('editor')}
                  className={`p-2.5 border text-left cursor-pointer transition-colors ${
                    role === 'editor' ? 'border-black bg-black text-white font-semibold' : 'border-black/20 hover:border-black'
                  }`}
                >
                  <div className="text-[10px] uppercase opacity-70">Rooli 2</div>
                  <div>Editor (Muokkaaja)</div>
                </button>
                <button
                  type="button"
                  onClick={() => switchRole('viewer')}
                  className={`p-2.5 border text-left cursor-pointer transition-colors ${
                    role === 'viewer' ? 'border-black bg-black text-white font-semibold' : 'border-black/20 hover:border-black'
                  }`}
                >
                  <div className="text-[10px] uppercase opacity-70">Rooli 3</div>
                  <div>Viewer (Lukuoikeus)</div>
                </button>
                <button
                  type="button"
                  onClick={() => switchRole('customer')}
                  className={`p-2.5 border text-left cursor-pointer transition-colors ${
                    role === 'customer' ? 'border-black bg-black text-white font-semibold' : 'border-black/20 hover:border-black'
                  }`}
                >
                  <div className="text-[10px] uppercase opacity-70">Rooli 4</div>
                  <div>Customer (Vieras)</div>
                </button>
              </div>
            </div>

            {/* Reset Demo Data Button */}
            <div className="pt-2 border-t border-black/10">
              <button
                type="button"
                disabled={isResetting}
                onClick={handleResetData}
                className="w-full py-2.5 border border-black/30 hover:border-black flex items-center justify-center gap-2 text-xs font-mono uppercase tracking-wider transition-colors cursor-pointer disabled:opacity-50"
              >
                <RotateCcw className={`w-3.5 h-3.5 ${isResetting ? 'animate-spin' : ''}`} />
                <span>
                  {isResetting
                    ? (language === 'fi' ? 'Alustetaan...' : 'Resetting...')
                    : resetSuccess
                    ? (language === 'fi' ? 'Tiedot palautettu!' : 'Data Reset Complete!')
                    : (language === 'fi' ? 'Palauta demotiedot (Reset demo data)' : 'Reset Demo Data')}
                </span>
              </button>
              <p className="text-[10px] font-mono text-black/40 mt-1 text-center">
                Kirjoittaa 24 tuotetta, 5 kokoelmaa, 40 tilausta ja 30 pv analytiikkaa.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

