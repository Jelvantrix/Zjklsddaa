import React from 'react';
import { Language } from '../types';

interface TranslationBarProps {
  language: Language;
  onSetLanguage: (lang: Language) => void;
  className?: string;
}

export const TranslationBar: React.FC<TranslationBarProps> = ({
  language,
  onSetLanguage,
  className = '',
}) => {
  return (
    <div
      className={`inline-flex items-center gap-0.5 font-mono text-[10px] sm:text-xs select-none shrink-0 tracking-tight ${className}`}
      aria-label="Kielivalinta / Language selector"
    >
      <button
        type="button"
        onClick={() => onSetLanguage('fi')}
        className={`px-1 py-0.5 transition-opacity cursor-pointer ${
          language === 'fi'
            ? 'font-bold underline underline-offset-4 opacity-100'
            : 'opacity-40 hover:opacity-100'
        }`}
      >
        fi
      </button>
      <span className="opacity-30">/</span>
      <button
        type="button"
        onClick={() => onSetLanguage('en')}
        className={`px-1 py-0.5 transition-opacity cursor-pointer ${
          language === 'en'
            ? 'font-bold underline underline-offset-4 opacity-100'
            : 'opacity-40 hover:opacity-100'
        }`}
      >
        eng
      </button>
      <span className="opacity-30">/</span>
      <button
        type="button"
        onClick={() => onSetLanguage('sv')}
        className={`px-1 py-0.5 transition-opacity cursor-pointer ${
          language === 'sv'
            ? 'font-bold underline underline-offset-4 opacity-100'
            : 'opacity-40 hover:opacity-100'
        }`}
      >
        sv
      </button>
    </div>
  );
};
