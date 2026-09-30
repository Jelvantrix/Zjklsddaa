import React, { useState } from 'react';
import { StoreContent } from '../../types';
import { useAuth } from '../../firebase/AuthContext';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { logAuditEvent } from '../../firebase/dbService';
import { ArrowUp, ArrowDown, Eye, EyeOff, Save, Check } from 'lucide-react';

interface AdminContentViewProps {
  content: StoreContent;
  onRefresh: () => void;
}

export const AdminContentView: React.FC<AdminContentViewProps> = ({ content, onRefresh }) => {
  const { isEditor, adminProfile } = useAuth();
  const [formData, setFormData] = useState<StoreContent>(content);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'sections' | 'hero' | 'announcement' | 'journal'>('sections');

  const defaultSections = [
    { id: 'latest_drop', label: 'Section 01: Latest Archival Drop' },
    { id: 'categories_mosaic', label: 'Section 02: Architectural Categories Mosaic' },
    { id: 'craft_narrative', label: 'Section 03: Nordic Craft & Materials Manifesto' },
    { id: 'featured_pieces', label: 'Section 04: Curated Core Highlights Carousel' },
    { id: 'winter_lookbook', label: 'Section 05: Editorial Winter Campaign Banner' },
    { id: 'journal_archive', label: 'Section 06: Quiet Nordic Studio Journal' },
  ];

  const handleMoveSection = (index: number, direction: 'up' | 'down') => {
    const sections = [...(formData.sectionOrder || defaultSections.map((s) => s.id))];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= sections.length) return;

    const temp = sections[index];
    sections[index] = sections[targetIdx];
    sections[targetIdx] = temp;

    setFormData({ ...formData, sectionOrder: sections });
  };

  const handleSaveContent = async () => {
    if (!isEditor) return;
    setIsSaving(true);
    try {
      await updateDoc(doc(db, 'content', 'homepage'), {
        ...formData,
        updatedAt: new Date().toISOString(),
      });

      await logAuditEvent(adminProfile?.name || 'admin', 'update_storefront_cms', 'homepage', {
        sectionOrder: formData.sectionOrder,
      });

      onRefresh();
    } catch (err) {
      console.warn('Content save error:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title & Save */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-black/[0.08]">
        <div>
          <h1 className="font-editorial text-3xl font-normal">Storefront CMS & Editorial</h1>
          <p className="text-xs font-mono text-black/50 mt-0.5">
            Curate homepage pacing, hero campaign media, announcement ticker, and journal articles.
          </p>
        </div>

        <button
          onClick={handleSaveContent}
          disabled={isSaving}
          className="text-xs font-mono uppercase tracking-wider text-black hover:opacity-60 underline underline-offset-4 cursor-pointer flex items-center gap-1.5 font-semibold disabled:opacity-50"
        >
          <Save className="w-3.5 h-3.5" />
          <span>{isSaving ? 'Saving Changes...' : 'Save CMS Changes'}</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-black/[0.08] text-xs font-mono uppercase tracking-wider">
        {[
          { id: 'sections', label: '1. Homepage Sections Order' },
          { id: 'hero', label: '2. Hero Video / Media' },
          { id: 'announcement', label: '3. Announcement Bar (FI / EN)' },
          { id: 'journal', label: '4. Editorial Journal' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2.5 transition-colors cursor-pointer ${
              activeTab === tab.id ? 'font-bold text-black border-b-2 border-black' : 'text-black/50 hover:text-black'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: SECTIONS REORDER */}
      {activeTab === 'sections' && (
        <div className="space-y-4 max-w-2xl font-mono text-xs">
          <p className="text-black/60 text-[11px]">
            Reorder homepage narrative sections. Changes reflect live on the storefront immediately upon saving.
          </p>

          <div className="border border-black/[0.08] divide-y divide-black/[0.06] bg-white">
            {(formData.sectionOrder || defaultSections.map((s) => s.id)).map((secId, idx, arr) => {
              const info = defaultSections.find((s) => s.id === secId) || { label: secId };
              return (
                <div key={secId} className="p-3.5 flex items-center justify-between hover:bg-black/[0.015]">
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-black/40 font-mono">0{idx + 1}</span>
                    <span className="font-medium text-black">{info.label}</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      disabled={idx === 0}
                      onClick={() => handleMoveSection(idx, 'up')}
                      className="text-xs font-mono uppercase text-black hover:opacity-60 underline cursor-pointer disabled:opacity-20"
                    >
                      Up
                    </button>
                    <span className="text-black/20">/</span>
                    <button
                      disabled={idx === arr.length - 1}
                      onClick={() => handleMoveSection(idx, 'down')}
                      className="text-xs font-mono uppercase text-black hover:opacity-60 underline cursor-pointer disabled:opacity-20"
                    >
                      Down
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: HERO MEDIA */}
      {activeTab === 'hero' && (
        <div className="space-y-6 max-w-2xl font-mono text-xs">
          <div className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-black">Desktop Hero Media</h3>
            <div>
              <label className="block text-[10px] uppercase text-black/50 mb-1">Desktop Video URL (.mp4 / WebM)</label>
              <input
                type="text"
                value={formData.heroMedia?.desktopSrc || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    heroMedia: { ...formData.heroMedia, desktopSrc: e.target.value },
                  })
                }
                className="w-full px-3 py-2 border-b border-black/30 focus:border-black text-xs bg-transparent"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase text-black/50 mb-1">Desktop Fallback Poster Image</label>
              <input
                type="text"
                value={formData.heroMedia?.desktopPoster || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    heroMedia: { ...formData.heroMedia, desktopPoster: e.target.value },
                  })
                }
                className="w-full px-3 py-2 border-b border-black/30 focus:border-black text-xs bg-transparent"
              />
            </div>
          </div>

          <div className="space-y-3 border-t border-black/[0.08] pt-6">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-black">Mobile Hero Media</h3>
            <div>
              <label className="block text-[10px] uppercase text-black/50 mb-1">Mobile Video URL</label>
              <input
                type="text"
                value={formData.heroMedia?.mobileSrc || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    heroMedia: { ...formData.heroMedia, mobileSrc: e.target.value },
                  })
                }
                className="w-full px-3 py-2 border-b border-black/30 focus:border-black text-xs bg-transparent"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase text-black/50 mb-1">Mobile Fallback Poster Image</label>
              <input
                type="text"
                value={formData.heroMedia?.mobilePoster || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    heroMedia: { ...formData.heroMedia, mobilePoster: e.target.value },
                  })
                }
                className="w-full px-3 py-2 border-b border-black/30 focus:border-black text-xs bg-transparent"
              />
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: ANNOUNCEMENT BAR */}
      {activeTab === 'announcement' && (
        <div className="space-y-6 max-w-2xl font-mono text-xs">
          <div>
            <label className="block text-[10px] uppercase text-black/50 mb-1">Announcement Ticker Text (Finnish)</label>
            <input
              type="text"
              value={formData.announcementBar?.fi || ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  announcementBar: { ...formData.announcementBar, fi: e.target.value },
                })
              }
              className="w-full px-3 py-2 border-b border-black/30 focus:border-black text-xs bg-transparent"
            />
          </div>

          <div>
            <label className="block text-[10px] uppercase text-black/50 mb-1">Announcement Ticker Text (English)</label>
            <input
              type="text"
              value={formData.announcementBar?.en || ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  announcementBar: { ...formData.announcementBar, en: e.target.value },
                })
              }
              className="w-full px-3 py-2 border-b border-black/30 focus:border-black text-xs bg-transparent"
            />
          </div>
        </div>
      )}

      {/* TAB 4: JOURNAL POSTS */}
      {activeTab === 'journal' && (
        <div className="space-y-4 font-mono text-xs">
          <p className="text-black/60 text-[11px]">
            Archival articles and editorial journals published to the community feed.
          </p>

          <div className="border border-black/[0.08] divide-y divide-black/[0.06] bg-white">
            {(formData.journalPosts || []).map((post) => (
              <div key={post.id} className="p-4 flex items-center justify-between hover:bg-black/[0.015]">
                <div>
                  <div className="font-semibold text-black">{post.title.en || post.title.fi}</div>
                  <div className="text-[10px] text-black/40">
                    {post.date} · {post.readTime} · Tag: {post.tag}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase text-black/60">Live</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
