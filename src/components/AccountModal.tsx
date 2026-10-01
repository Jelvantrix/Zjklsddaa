import React, { useState } from 'react';
import { Language } from '../types';
import { translations } from '../data/mockData';
import { X, Check } from 'lucide-react';

interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
  onNavigateAdmin?: () => void;
}

export const AccountModal: React.FC<AccountModalProps> = ({
  isOpen,
  onClose,
  language,
  onNavigateAdmin,
}) => {
  const t = translations[language];
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) setIsSubmitted(true);
  };

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center p-4">
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/40 backdrop-blur-[2px]"
      />

      <div className="relative w-full max-w-md bg-white border border-black/10 p-6 sm:p-8 shadow-2xl z-10 animate-fadeIn">
        <div className="flex items-center justify-between pb-3 sm:pb-4 border-b border-black/10 mb-4 sm:mb-6">
          <h3 className="font-editorial text-2xl sm:text-3xl font-normal">
            {t.nav.account}
          </h3>
          <button onClick={onClose} className="p-1.5 text-black/50 hover:text-black cursor-pointer">
            <X className="w-5 h-5 stroke-[1.5]" />
          </button>
        </div>

        {!isSubmitted ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-xs font-sans text-black/70 leading-relaxed">
              Sign in with your email to track active shipments or inspect your archival allocations.
            </p>

            <div>
              <label className="block text-[10.5px] font-mono uppercase tracking-wider text-black/60 mb-1">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full px-3.5 py-2.5 text-xs font-mono border border-black/20 focus:border-black focus:outline-none"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3.5 bg-black text-white text-xs uppercase tracking-[0.18em] font-medium hover:bg-black/80 transition-colors cursor-pointer"
            >
              Send Access Key
            </button>

            {onNavigateAdmin && (
              <div className="pt-4 border-t border-black/10">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onNavigateAdmin();
                  }}
                  className="w-full py-2.5 border border-black/30 hover:border-black text-black text-xs uppercase tracking-[0.16em] font-mono hover:bg-black hover:text-white transition-colors cursor-pointer flex items-center justify-center gap-2"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span>Enter Studio Console</span>
                </button>
              </div>
            )}
          </form>
        ) : (
          <div className="text-center py-6 space-y-3">
            <div className="w-10 h-10 border border-black mx-auto flex items-center justify-center">
              <Check className="w-5 h-5" />
            </div>
            <p className="text-xs font-sans text-black/80">
              A one-time access key has been dispatched to {email}.
            </p>
            <button
              onClick={onClose}
              className="mt-4 px-6 py-2 border border-black text-xs uppercase tracking-wider hover:bg-black hover:text-white transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
