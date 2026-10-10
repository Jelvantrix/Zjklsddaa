import React, { useState } from 'react';
import { Collection, Product } from '../../types';
import { Layers, Clock, Users, ArrowUp, ArrowDown, Send, Check, Plus, AlertCircle } from 'lucide-react';
import { useAuth } from '../../supabase/AuthContext';
import { supabase } from '../../supabase/config';
import { logAuditEvent } from '../../supabase/dbService';

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4">
        <div>
          <h1 className="font-serif text-display font-normal">Collections & Drops</h1>
          <p className="text-small text-black/50 mt-0.5">
            Manage seasonal collections, limited edition drops, and VIP early access waitlists.
          </p>
        </div>

        {/* Tab switch */}
        <div className="flex items-center gap-6 text-small">
          <button
            onClick={() => setActiveTab('drops')}
            className={`uppercase tracking-wider transition-colors cursor-pointer py-1 ${ activeTab ==='drops'
                ? 'font-semibold text-black underline underline-offset-4'
                : 'text-black/50 hover:text-black'
            }`}
          >
            Drops ({drops.length})
          </button>
          <button
            onClick={() => setActiveTab('seasons')}
            className={`uppercase tracking-wider transition-colors cursor-pointer py-1 ${ activeTab ==='seasons'
                ? 'font-semibold text-black underline underline-offset-4'
                : 'text-black/50 hover:text-black'
            }`}
          >
            Seasonal Collections ({seasons.length})
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: List of items */}
        <div className="lg:col-span-5 space-y-3">
          <div className="text-small uppercase tracking-wider text-black/50">
            Select item to manage:
          </div>

          <div className="space-y-2">
            {displayedList.map((col) => {
              const isSelected = col.id === selectedColId;
              const nameText = typeof col.name === 'object' ? col.name.en || col.name.fi : col.name;

              return (
                <div
                  key={col.id}
                  onClick={() => setSelectedColId(col.id)}
                  className={`p-4 transition-all cursor-pointer ${ isSelected ?'text-black font-semibold'
                      : 'text-black/70 hover:text-black'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5 text-small">
                    <span className="uppercase tracking-wider">/{col.slug}</span>
                    <span className="text-small uppercase tracking-wider">
                      [{col.status}]
                    </span>
                  </div>

                  <h3 className="font-serif text-title font-normal line-clamp-1">{nameText}</h3>

                  {col.type === 'drop' && (
                    <div className="mt-3 pt-2 text-small flex justify-between text-black/50">
                      <span>Edition: {col.editionSize || 50} units</span>
                      <span>Waitlist: 84 subscribers</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Drop Details & Manager */}
        {activeCollection && (
          <div className="lg:col-span-7 space-y-6 p-6 bg-white">
            <div className="flex items-start justify-between pb-4">
              <div>
                <span className="text-small uppercase tracking-wider text-black/40 block">
                  {activeCollection.type === 'drop' ? 'Limited Drop Management' : 'Collection Overview'}
                </span>
                <h2 className="font-serif text-title font-normal mt-0.5">
                  {typeof activeCollection.name === 'object' ? activeCollection.name.en || activeCollection.name.fi : activeCollection.name}
                </h2>
                <div className="text-small text-black/50 mt-1">Slug: /{activeCollection.slug}</div>
              </div>

              <span className="text-small uppercase text-black font-semibold">
                [{activeCollection.status}]
              </span>
            </div>

            {/* Drop Launchpad Widget */}
            {activeCollection.type === 'drop' && (
              <div className="p-4 space-y-4 text-small">
                <div className="flex items-center gap-2 text-black font-semibold uppercase tracking-wider">
                  <Clock className="w-4 h-4" />
                  <span>Drop Timing & Readiness</span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-small uppercase text-black/50 block">Scheduled release:</span>
                    <span className="font-semibold">{activeCollection.startAt ? new Date(activeCollection.startAt).toLocaleString('en-US') : 'Active Now'}</span>
                  </div>
                  <div>
                    <span className="text-small uppercase text-black/50 block">Edition size:</span>
                    <span className="font-semibold">{activeCollection.editionSize || 50} numbered pieces</span>
                  </div>
                </div>

                {/* Simulated waitlist notify */}
                <div className="pt-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-black/60" />
                    <span>84 waitlist subscribers</span>
                  </div>

                  <button
                    onClick={() => handleSendEarlyAccess(activeCollection.id)}
                    className="py-1 text-black hover:opacity-60 underline underline-offset-4 uppercase tracking-wider text-small flex items-center gap-1.5 cursor-pointer font-semibold"
                  >
                    {earlyAccessSent[activeCollection.id] ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Link Dispatched to VIP List</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>Dispatch Early Access Link</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Associated Products with visual reorder */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-small font-semibold uppercase tracking-wider">
                  Attached Garments ({colProducts.length})
                </h4>
                <span className="text-small text-black/50">Curate order for storefront display</span>
              </div>

              <div className="">
                {colProducts.length === 0 ? (
                  <div className="p-6 text-center text-small text-black/40">
                    No products attached. Assign this collection in Product Editor.
                  </div>
                ) : (
                  colProducts.map((p, idx) => (
                    <div key={p.id} className="p-3 flex items-center justify-between text-small">
                      <div className="flex items-center gap-3">
                        <span className="font-semibold w-16">{p.nr}</span>
                        <div className="w-8 h-10 overflow-hidden">
                          <img src={p.images?.[0]?.url} alt="" className="w-full h-full object-cover grayscale" />
                        </div>
                        <span className="font-medium text-black">{p.name.en || p.name.fi}</span>
                      </div>

                      <div className="flex items-center gap-3">
                        <button
                          disabled={idx === 0}
                          className="hover:opacity-60 disabled:opacity-30 cursor-pointer text-small underline underline-offset-2"
                        >
                          Up
                        </button>
                        <button
                          disabled={idx === colProducts.length - 1}
                          className="hover:opacity-60 disabled:opacity-30 cursor-pointer text-small underline underline-offset-2"
                        >
                          Down
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
