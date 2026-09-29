import React, { useState } from 'react';
import { Collection, Product } from '../../types';
import { Layers, Clock, Users, ArrowUp, ArrowDown, Send, Check, Plus, AlertCircle } from 'lucide-react';
import { useAuth } from '../../firebase/AuthContext';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { logAuditEvent } from '../../firebase/dbService';

interface AdminCollectionsViewProps {
  collections: Collection[];
  products: Product[];
  onRefresh: () => void;
}

export const AdminCollectionsView: React.FC<AdminCollectionsViewProps> = ({
  collections,
  products,
  onRefresh,
}) => {
  const { isEditor, adminProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<'drops' | 'seasons'>('drops');
  const [selectedColId, setSelectedColId] = useState<string>(collections.find((c) => c.type === 'drop')?.id || collections[0]?.id || '');
  const [earlyAccessSent, setEarlyAccessSent] = useState<Record<string, boolean>>({});

  const activeCollection = collections.find((c) => c.id === selectedColId) || collections[0];

  const handleSendEarlyAccess = async (colId: string) => {
    setEarlyAccessSent((prev) => ({ ...prev, [colId]: true }));
    await logAuditEvent(adminProfile?.name || 'admin', 'send_early_access', colId, {
      recipientCount: 84,
      drop: activeCollection.slug,
    });
    setTimeout(() => {
      setEarlyAccessSent((prev) => ({ ...prev, [colId]: false }));
    }, 4000);
  };

  const drops = collections.filter((c) => c.type === 'drop');
  const seasons = collections.filter((c) => c.type !== 'drop');

  const displayedList = activeTab === 'drops' ? drops : seasons;

  // Resolve products in active collection
  const colProducts = products.filter((p) => {
    return activeCollection?.productIds?.includes(p.id) || p.collectionSeason === activeCollection?.slug;
  });

  return (
    <div className="space-y-6">
      {/* Title Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-black/10">
        <div>
          <h1 className="font-editorial text-3xl font-normal">Kokoelmat & Pudotukset</h1>
          <p className="text-xs font-mono text-black/50 mt-0.5">
            Hallitse kausikokoelmia, rajoitettuja eriä ja ennakko-odotuslistoja.
          </p>
        </div>

        {/* Tab switch */}
        <div className="flex border border-black/20 text-xs font-mono">
          <button
            onClick={() => setActiveTab('drops')}
            className={`px-3.5 py-1.5 uppercase tracking-wider transition-colors cursor-pointer ${
              activeTab === 'drops' ? 'bg-black text-white font-semibold' : 'hover:bg-black/5'
            }`}
          >
            Pudotukset ({drops.length})
          </button>
          <button
            onClick={() => setActiveTab('seasons')}
            className={`px-3.5 py-1.5 uppercase tracking-wider transition-colors cursor-pointer ${
              activeTab === 'seasons' ? 'bg-black text-white font-semibold' : 'hover:bg-black/5'
            }`}
          >
            Kausikokoelmat ({seasons.length})
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: List of items */}
        <div className="lg:col-span-5 space-y-3">
          <div className="text-[10.5px] font-mono uppercase tracking-wider text-black/50">
            Valitse hallinnoitava kohde:
          </div>

          <div className="space-y-2">
            {displayedList.map((col) => {
              const isSelected = col.id === selectedColId;
              const nameText = typeof col.name === 'object' ? col.name.fi : col.name;

              return (
                <div
                  key={col.id}
                  onClick={() => setSelectedColId(col.id)}
                  className={`p-4 border transition-all cursor-pointer ${
                    isSelected
                      ? 'border-black bg-black text-white shadow-xs'
                      : 'border-black/15 bg-white hover:border-black/40'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5 font-mono text-xs">
                    <span className="font-semibold uppercase tracking-wider">{col.slug}</span>
                    <span
                      className={`text-[10px] uppercase px-1.5 py-0.5 border ${
                        isSelected
                          ? 'border-white/30 text-white'
                          : col.status === 'live'
                          ? 'border-black text-black'
                          : 'border-black/20 text-black/50'
                      }`}
                    >
                      {col.status}
                    </span>
                  </div>

                  <h3 className="font-editorial text-lg font-normal line-clamp-1">{nameText}</h3>

                  {col.type === 'drop' && (
                    <div className={`mt-3 pt-2 border-t text-[11px] font-mono flex justify-between ${isSelected ? 'border-white/20 text-white/70' : 'border-black/10 text-black/60'}`}>
                      <span>Eräkoko: {col.editionSize || 50} kpl</span>
                      <span>Odotuslista: 84 hlöä</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Drop Details & Manager */}
        {activeCollection && (
          <div className="lg:col-span-7 space-y-6 p-6 border border-black/15 bg-white">
            <div className="flex items-start justify-between border-b border-black/10 pb-4">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-black/40 block">
                  {activeCollection.type === 'drop' ? 'Pudotuksen hallinta' : 'Kausikokoelma'}
                </span>
                <h2 className="font-editorial text-2xl font-normal mt-0.5">
                  {typeof activeCollection.name === 'object' ? activeCollection.name.fi : activeCollection.name}
                </h2>
                <div className="text-xs font-mono text-black/50 mt-1">Slug: /{activeCollection.slug}</div>
              </div>

              <span className="font-mono text-xs uppercase px-2.5 py-1 border border-black bg-black/5 font-semibold">
                {activeCollection.status}
              </span>
            </div>

            {/* Drop Launchpad Widget */}
            {activeCollection.type === 'drop' && (
              <div className="p-4 border border-black/15 bg-black/[0.02] space-y-4 font-mono text-xs">
                <div className="flex items-center gap-2 text-black font-semibold uppercase tracking-wider">
                  <Clock className="w-4 h-4" />
                  <span>Pudotuksen ajoitus ja valmius</span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[10px] uppercase text-black/50 block">Julkaisuhetki:</span>
                    <span className="font-semibold">{activeCollection.startAt ? new Date(activeCollection.startAt).toLocaleString('fi-FI') : 'Aktiivinen nyt'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase text-black/50 block">Valmistuserä:</span>
                    <span className="font-semibold">{activeCollection.editionSize || 50} numeroitua kappaletta</span>
                  </div>
                </div>

                {/* Simulated waitlist notify */}
                <div className="pt-3 border-t border-black/10 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-black/60" />
                    <span>84 odotuslistalaista</span>
                  </div>

                  <button
                    onClick={() => handleSendEarlyAccess(activeCollection.id)}
                    className="px-3 py-1.5 bg-black text-white hover:bg-black/80 uppercase tracking-wider text-[11px] flex items-center gap-1.5 cursor-pointer"
                  >
                    {earlyAccessSent[activeCollection.id] ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Lähetetty VIP-listalle!</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>Lähetä ennakko-ostolinkki</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Associated Products with visual reorder */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-mono text-xs font-semibold uppercase tracking-wider">
                  Kokoelmaan kuuluvat teokset ({colProducts.length})
                </h4>
                <span className="text-[10px] font-mono text-black/50">Järjestä teokset gallerianäyttöä varten</span>
              </div>

              <div className="border border-black/15 divide-y divide-black/10">
                {colProducts.length === 0 ? (
                  <div className="p-6 text-center text-xs font-mono text-black/40">
                    Ei sidottuja tuotteita. Valitse tuote-editorista kokoelmaksi tämä pudotus.
                  </div>
                ) : (
                  colProducts.map((p, idx) => (
                    <div key={p.id} className="p-3 flex items-center justify-between text-xs font-mono hover:bg-black/[0.02]">
                      <div className="flex items-center gap-3">
                        <span className="font-semibold w-16">{p.nr}</span>
                        <div className="w-8 h-10 border border-black/10 overflow-hidden bg-black/5">
                          <img src={p.images?.[0]?.url} alt="" className="w-full h-full object-cover" />
                        </div>
                        <span className="font-sans font-medium text-black">{p.name.fi}</span>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          disabled={idx === 0}
                          className="p-1 border border-black/15 hover:border-black disabled:opacity-30 cursor-pointer"
                          title="Siirrä ylemmäs"
                        >
                          <ArrowUp className="w-3 h-3" />
                        </button>
                        <button
                          disabled={idx === colProducts.length - 1}
                          className="p-1 border border-black/15 hover:border-black disabled:opacity-30 cursor-pointer"
                          title="Siirrä alemmas"
                        >
                          <ArrowDown className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
