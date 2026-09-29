import React from 'react';
import { JournalArticle, Language } from '../types';
import { JOURNAL_ARTICLES, translations } from '../data/mockData';
import { FashionImage } from './FashionImage';
import { X, ArrowLeft } from 'lucide-react';

interface JournalModalProps {
  articleId: string | null;
  onClose: () => void;
  language: Language;
}

export const JournalModal: React.FC<JournalModalProps> = ({
  articleId,
  onClose,
  language,
}) => {
  const t = translations[language];

  if (!articleId) return null;

  const article =
    JOURNAL_ARTICLES.find((a) => a.id === articleId) || JOURNAL_ARTICLES[0];

  return (
    <div className="fixed inset-0 z-[92] bg-white flex flex-col overflow-y-auto animate-fadeIn select-none">
      {/* Top Header */}
      <div className="max-w-4xl w-full mx-auto px-6 py-6 border-b border-black/10 flex items-center justify-between">
        <button
          onClick={onClose}
          className="flex items-center gap-2 text-xs font-mono tracking-wider uppercase text-black/60 hover:text-black"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{language === 'fi' ? 'Takaisin Journaliin' : 'Back to Journal'}</span>
        </button>

        <button
          onClick={onClose}
          className="p-1.5 text-black/60 hover:text-black"
          aria-label={t.nav.close}
        >
          <X className="w-5 h-5 stroke-[1.5]" />
        </button>
      </div>

      {/* Article Body */}
      <article className="max-w-3xl w-full mx-auto px-6 py-12 md:py-20 flex-1">
        <div className="flex items-center gap-3 text-xs font-mono text-black/40 mb-4">
          <span>{article.date}</span>
          <span>·</span>
          <span>{article.readTime} LUKUAIKA</span>
        </div>

        <h1 className="font-editorial text-4xl sm:text-5xl md:text-6xl font-normal leading-tight mb-6">
          {article.title[language]}
        </h1>

        <p className="font-editorial text-xl sm:text-2xl text-black/70 italic mb-10 leading-relaxed">
          "{article.subtitle[language]}"
        </p>

        <div className="aspect-[16/10] overflow-hidden border border-black/10 bg-white mb-10">
          <FashionImage
            alt={article.title[language]}
            position={article.cropPosition}
            scale={1.15}
            aspectRatio="auto"
            className="w-full h-full"
          />
        </div>

        <div className="text-sm sm:text-base font-sans text-black/80 leading-relaxed space-y-6">
          <p>
            {language === 'fi'
              ? 'Pohjoisessa pimeys ei ole tyhjiö, vaan tila jota valo muovaa harvoin mutta sitäkin merkityksellisemmin. Kaamoksen matalalta lankeavat säteet korostavat kankaiden pintarakennetta: karkean villan karheutta, kammatun merinon pehmeyttä ja pellavan luonnollisia epätasaisuuksia.'
              : 'In the North, darkness is not a void, but a spatial condition sculpted rarely yet profoundly by light. Low-angled winter rays dramatize the topography of weaves: the tooth of dense wool, the serene halo of combed merino, and the organic slubs of raw linen.'}
          </p>

          <p>
            {language === 'fi'
              ? 'Zejeshin filosofian ytimessä on ajatus vaatteesta pysyvänä museaalisena luettelonumerona. Emme suunnittele sesonkeja varten, vaan teemme numeroituja arkistolevyjä, joiden leikkaukset ja materiaalivahvuudet on hiottu kestämään sukupolvien yli.'
              : 'At the core of the Zejesh ethos lies the belief in the garment as a permanent archival accession. We do not design for the churn of seasonal schedules; rather, we execute numbered archive plates refined to endure across generations.'}
          </p>

          <div className="p-6 border-l-2 border-black bg-black/5 my-8">
            <p className="font-editorial text-xl italic text-black/90">
              {language === 'fi'
                ? '"Vaatteen tulee antaa kantajalleen rauhaa ja suojaa, ei viedä huomiota."'
                : '"A garment should impart quietude and shelter to the wearer, never demand attention."'}
            </p>
          </div>

          <p>
            {language === 'fi'
              ? 'Kun materiaalina käytetään 100% neitseellistä villaa ilman synteettisiä sekoitteita, vaate säilyttää luonnollisen hengittävyytensä ja kykynsä hylkiä likaa ja hajuja. Se vaatii vain tuuletuksen pakkasessa palautuakseen raikkaaksi.'
              : 'When crafted exclusively from 100% virgin wool without synthetic blends, the garment maintains its innate breathability and soil resistance. A brief exposure to sub-zero air restores its purity completely.'}
          </p>
        </div>

        <div className="mt-14 pt-8 border-t border-black/10 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-6 py-3 btn-secondary text-xs uppercase tracking-[0.16em]"
          >
            {language === 'fi' ? 'Palaa sivustolle' : 'Return to Site'}
          </button>
        </div>
      </article>
    </div>
  );
};
