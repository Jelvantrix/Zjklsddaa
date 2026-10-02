import React, { useState, useEffect, useMemo } from 'react';
import { CommunitySuggestion } from '../../types';
import { useAuth } from '../../firebase/AuthContext';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { subscribeToSuggestions, logAuditEvent } from '../../firebase/dbService';
import {
  ThumbsUp,
  Sparkles,
  Scissors,
  CheckCircle2,
  Clock,
  Trash2,
  Edit2,
  Search,
  Layers,
  Check,
  X,
  ExternalLink,
} from 'lucide-react';

export const AdminSuggestionsView: React.FC = () => {
  const { isOwner, isEditor, adminProfile } = useAuth();
  const [suggestions, setSuggestions] = useState<CommunitySuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | CommunitySuggestion['status']>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [curatorNotes, setCuratorNotes] = useState('');
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  useEffect(() => {
    const unsub = subscribeToSuggestions((data) => {
      setSuggestions(data);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const filtered = useMemo(() => {
    return suggestions
      .filter((s) => {
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchTitle = s.title.toLowerCase().includes(q);
          const matchFabric = s.desiredFabric.toLowerCase().includes(q);
          const matchCat = s.category.toLowerCase().includes(q);
          if (!matchTitle && !matchFabric && !matchCat) return false;
        }
        if (statusFilter !== 'all' && s.status !== statusFilter) return false;
        return true;
      })
      .sort((a, b) => (b.votes || 0) - (a.votes || 0)); // Most voted at top
  }, [suggestions, searchQuery, statusFilter]);

  const topVotedPiece = suggestions[0];
  const commissionedCount = suggestions.filter((s) => s.status === 'commissioned').length;
  const inSamplingCount = suggestions.filter((s) => s.status === 'in_sampling').length;
  const totalVotesCount = suggestions.reduce((acc, s) => acc + (s.votes || 0), 0);

  const handleUpdateStatus = async (id: string, newStatus: CommunitySuggestion['status']) => {
    if (!isEditor) return;
    try {
      await updateDoc(doc(db, 'suggestions', id), {
        status: newStatus,
        updatedAt: new Date().toISOString(),
      });
      await logAuditEvent(
        adminProfile?.name || 'admin',
        'update_suggestion_status',
        id,
        { status: newStatus }
      );
      setStatusMsg(`Status updated to ${newStatus.replace('_', ' ')}.`);
      setTimeout(() => setStatusMsg(null), 3500);
    } catch (err: any) {
      alert(`Error updating: ${err.message}`);
    }
  };

  const handleSaveCuratorNotes = async (id: string) => {
    if (!isEditor) return;
    try {
      await updateDoc(doc(db, 'suggestions', id), {
        curatorNotes: curatorNotes.trim(),
        updatedAt: new Date().toISOString(),
      });
      setEditingId(null);
      setStatusMsg('Curator notes saved.');
      setTimeout(() => setStatusMsg(null), 3500);
    } catch (err: any) {
      alert(`Error saving notes: ${err.message}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (!isOwner) return;
    if (!window.confirm('Delete this community suggestion permanently?')) return;
    try {
      await deleteDoc(doc(db, 'suggestions', id));
      await logAuditEvent(adminProfile?.name || 'admin', 'delete_suggestion', id);
      setStatusMsg('Suggestion deleted.');
      setTimeout(() => setStatusMsg(null), 3500);
    } catch (err: any) {
      alert(`Error deleting: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6 font-mono text-xs">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-black/10">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] uppercase tracking-[0.2em] text-black/50">Community Atelier & Voting</span>
            <span className="text-[10px] px-2 py-0.5 border border-black/15 bg-black/[0.02]">
              {suggestions.length} proposals
            </span>
          </div>
          <h1 className="font-editorial text-3xl sm:text-4xl font-normal text-black tracking-tight">
            Client Suggestions & Voting Governance
          </h1>
          <p className="text-xs text-black/60 mt-1 max-w-2xl leading-relaxed">
            Review design ideas requested by clients. Proposals with the most votes are commissioned for tailoring and sampling in our Helsinki & Porto ateliers.
          </p>
        </div>
      </div>

      {statusMsg && (
        <div className="p-3 border border-emerald-300 bg-emerald-50 text-emerald-900 font-semibold flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-700 shrink-0" />
          <span>{statusMsg}</span>
        </div>
      )}

      {/* KPI METRIC CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 border border-black/[0.1] bg-neutral-50/60 space-y-1">
          <span className="text-[10px] uppercase text-black/50 tracking-wider">Top Voted Leader</span>
          <div className="font-editorial text-lg font-normal text-black truncate">
            {topVotedPiece ? topVotedPiece.title : 'None yet'}
          </div>
          <span className="text-[11px] font-bold text-black">
            {topVotedPiece ? `${topVotedPiece.votes} client votes` : '0 votes'}
          </span>
        </div>

        <div className="p-4 border border-black/[0.1] bg-neutral-50/60 space-y-1">
          <span className="text-[10px] uppercase text-black/50 tracking-wider">Commissioned to Make</span>
          <div className="font-editorial text-2xl font-normal text-black">
            {commissionedCount}
          </div>
          <span className="text-[10.5px] text-black/60">Selected from client voting</span>
        </div>

        <div className="p-4 border border-black/[0.1] bg-neutral-50/60 space-y-1">
          <span className="text-[10px] uppercase text-black/50 tracking-wider">In Atelier Sampling</span>
          <div className="font-editorial text-2xl font-normal text-black">
            {inSamplingCount}
          </div>
          <span className="text-[10.5px] text-black/60">Prototypes in construction</span>
        </div>

        <div className="p-4 border border-black/[0.1] bg-neutral-50/60 space-y-1">
          <span className="text-[10px] uppercase text-black/50 tracking-wider">Total Ballots Cast</span>
          <div className="font-editorial text-2xl font-normal text-black">
            {totalVotesCount}
          </div>
          <span className="text-[10.5px] text-black/60">Verified community votes</span>
        </div>
      </div>

      {/* SEARCH & FILTER CONTROLS */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
        <div className="relative flex-1 max-w-md">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-black/40" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search proposals, fabrics, categories..."
            className="w-full pl-9 pr-3 py-2 text-xs border border-black/20 focus:border-black bg-white"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10.5px] uppercase text-black/50">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-2.5 py-1.5 border border-black/20 bg-white text-xs cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value="under_review">Under Review</option>
            <option value="in_sampling">In Sampling</option>
            <option value="commissioned">Commissioned</option>
            <option value="declined">Declined</option>
          </select>
        </div>
      </div>

      {/* SUGGESTIONS LIST (RANKED BY VOTES) */}
      <div className="border border-black/[0.08] divide-y divide-black/[0.06] bg-white">
        {filtered.map((item, idx) => (
          <div key={item.id} className="p-4 sm:p-5 space-y-3 hover:bg-neutral-50/50 transition-colors">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-xs uppercase px-2 py-0.5 bg-black text-white">
                    #{idx + 1} · {item.votes} Votes
                  </span>
                  <span className="text-[10px] uppercase text-black/50 px-1.5 py-0.5 border border-black/15">
                    {item.category}
                  </span>
                  <span className="text-[10px] text-black/40">
                    Fabric: <strong className="text-black">{item.desiredFabric}</strong>
                  </span>
                </div>

                <h3 className="font-editorial text-xl font-normal text-black pt-1">
                  {item.title}
                </h3>

                <p className="text-xs font-sans text-black/70 max-w-3xl leading-relaxed">
                  {item.description}
                </p>

                <div className="flex items-center gap-3 text-[10px] text-black/40 pt-1">
                  <span>Submitted by: {item.submittedBy || 'Anonymous Patron'}</span>
                  {item.submitterEmail && <span>· {item.submitterEmail}</span>}
                  <span>· {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'Recent'}</span>
                </div>
              </div>

              {/* Status and Curator Controls */}
              <div className="flex flex-col items-end gap-2 shrink-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase text-black/50">Production Status:</span>
                  <select
                    value={item.status}
                    onChange={(e) => handleUpdateStatus(item.id, e.target.value as any)}
                    className={`px-2 py-1 text-[11px] uppercase font-semibold border cursor-pointer ${
                      item.status === 'commissioned'
                        ? 'bg-black text-white border-black'
                        : item.status === 'in_sampling'
                        ? 'bg-amber-100 text-amber-900 border-amber-300'
                        : 'bg-white border-black/20 text-black'
                    }`}
                  >
                    <option value="under_review">Under Review</option>
                    <option value="in_sampling">In Sampling</option>
                    <option value="commissioned">Commissioned to Make</option>
                    <option value="declined">Declined</option>
                  </select>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(item.id);
                      setCuratorNotes(item.curatorNotes || '');
                    }}
                    className="text-[11px] uppercase underline text-black/70 hover:text-black cursor-pointer"
                  >
                    {item.curatorNotes ? 'Edit Atelier Note' : '+ Add Atelier Note'}
                  </button>
                  {isOwner && (
                    <button
                      type="button"
                      onClick={() => handleDelete(item.id)}
                      className="text-[11px] uppercase text-black/40 hover:text-red-600 transition-colors cursor-pointer"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* CURATOR NOTES DISPLAY */}
            {item.curatorNotes && editingId !== item.id && (
              <div className="p-3 bg-neutral-100/70 border-l-2 border-black text-[11px] font-sans text-black/80">
                <span className="font-mono text-[9.5px] uppercase font-bold text-black/60 block mb-0.5">
                  Atelier Curator Response (Visible to Public):
                </span>
                {item.curatorNotes}
              </div>
            )}

            {/* CURATOR NOTES EDITOR FORM */}
            {editingId === item.id && (
              <div className="p-3 border border-black bg-white space-y-2 mt-2">
                <label className="block text-[10px] uppercase text-black/60 font-semibold">
                  Atelier Curator Public Note for "{item.title}":
                </label>
                <textarea
                  rows={2}
                  value={curatorNotes}
                  onChange={(e) => setCuratorNotes(e.target.value)}
                  placeholder="e.g. Sampling completed in Helsinki. Scheduled for Winter 2026 release."
                  className="w-full p-2 text-xs border border-black/20 font-sans focus:border-black"
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingId(null)}
                    className="px-2.5 py-1 text-[10px] uppercase border border-black/20"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSaveCuratorNotes(item.id)}
                    className="px-3 py-1 text-[10px] uppercase bg-black text-white font-semibold"
                  >
                    Save Note
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}

        {filtered.length === 0 && !loading && (
          <div className="p-10 text-center text-black/40">
            No suggestions match the current filter.
          </div>
        )}
      </div>
    </div>
  );
};
