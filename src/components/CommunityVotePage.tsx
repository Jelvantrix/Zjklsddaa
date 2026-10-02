import React, { useState, useEffect, useMemo } from 'react';
import { CommunitySuggestion } from '../types';
import {
  subscribeToSuggestions,
  submitCommunitySuggestion,
  voteForSuggestion,
} from '../firebase/dbService';
import {
  ThumbsUp,
  Plus,
  X,
  Check,
  Sparkles,
  ArrowLeft,
  Filter,
  CheckCircle2,
  Clock,
  Scissors,
  Layers,
} from 'lucide-react';

interface CommunityVotePageProps {
  onBackToHome: () => void;
  onNavigateArchive: () => void;
}

export const CommunityVotePage: React.FC<CommunityVotePageProps> = ({
  onBackToHome,
  onNavigateArchive,
}) => {
  const [suggestions, setSuggestions] = useState<CommunitySuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'all' | 'top' | 'commissioned'>('top');
  const [votedIds, setVotedIds] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem('zejesh_user_voted_sug_ids');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Proposal submission modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Outerwear');
  const [desiredFabric, setDesiredFabric] = useState('');
  const [description, setDescription] = useState('');
  const [submitterName, setSubmitterName] = useState('');
  const [submitterEmail, setSubmitterEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Real-time subscription to suggestions
  useEffect(() => {
    const unsub = subscribeToSuggestions((data) => {
      setSuggestions(data);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleVote = async (id: string) => {
    if (votedIds.includes(id)) return;

    const newVoted = [...votedIds, id];
    setVotedIds(newVoted);
    try {
      localStorage.setItem('zejesh_user_voted_sug_ids', JSON.stringify(newVoted));
    } catch {}

    // Optimistic UI update
    setSuggestions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, votes: s.votes + 1 } : s))
    );

    // Commit to Firestore
    const voterId = `user-${Date.now().toString(36)}`;
    await voteForSuggestion(id, voterId);
  };

  const handleSubmitProposal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      setSubmitError('Please provide a garment title and description.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    const res = await submitCommunitySuggestion({
      title: title.trim(),
      category: category.trim(),
      desiredFabric: desiredFabric.trim() || 'Natural Virgin Wool or Cotton',
      description: description.trim(),
      submittedBy: submitterName.trim() || 'Atelier Patron',
      submitterEmail: submitterEmail.trim() || undefined,
      status: 'under_review',
    });

    setIsSubmitting(false);

    if (res.success) {
      setSubmitSuccess(true);
      setTitle('');
      setDesiredFabric('');
      setDescription('');
      setSubmitterName('');
      setSubmitterEmail('');
      setTimeout(() => {
        setSubmitSuccess(false);
        setIsModalOpen(false);
      }, 2000);
    } else {
      setSubmitError(res.error || 'Failed to submit proposal.');
    }
  };

  const filteredSuggestions = useMemo(() => {
    let list = [...suggestions];
    if (activeFilter === 'top') {
      list.sort((a, b) => b.votes - a.votes);
    } else if (activeFilter === 'commissioned') {
      list = list.filter((s) => s.status === 'commissioned' || s.status === 'in_sampling');
      list.sort((a, b) => b.votes - a.votes);
    }
    return list;
  }, [suggestions, activeFilter]);

  const totalVotesCast = useMemo(
    () => suggestions.reduce((sum, s) => sum + (s.votes || 0), 0),
    [suggestions]
  );
  const commissionedCount = useMemo(
    () => suggestions.filter((s) => s.status === 'commissioned').length,
    [suggestions]
  );

  return (
    <div className="w-full bg-[#FFFFFF] text-[#000000] min-h-screen pt-20 sm:pt-24 select-none font-mono">
      {/* Top Breadcrumb Header */}
      <div className="max-w-[1720px] mx-auto px-4 sm:px-6 md:px-10 py-5 border-b border-black/[0.06] flex items-center justify-between text-xs">
        <button
          type="button"
          onClick={onBackToHome}
          className="flex items-center gap-2 text-black/60 hover:text-black transition-colors cursor-pointer uppercase tracking-wider"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Return Home</span>
        </button>
        <span className="text-[10px] tracking-[0.25em] uppercase text-black/40">
          CO-CREATION ARCHIVE · BALLOT
        </span>
      </div>

      {/* Main Hero Header */}
      <div className="max-w-[1720px] mx-auto px-4 sm:px-6 md:px-10 py-12 sm:py-16 md:py-20 border-b border-black/[0.08]">
        <div className="max-w-4xl space-y-4">
          <div className="flex items-center gap-2 text-[10.5px] uppercase tracking-[0.24em] text-black/50">
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span>Community Commissions</span>
          </div>
          <h1 className="font-editorial text-3xl sm:text-5xl md:text-6xl font-normal tracking-tight text-black">
            What Should Zejesh Craft Next?
          </h1>
          <p className="text-xs sm:text-sm font-sans text-black/70 max-w-2xl leading-relaxed font-light">
            We reject mass production forecasting. Vote on client proposals or submit your own garment ideas. The pieces with the most community support enter active pattern drafting and Portuguese loom production.
          </p>
        </div>

        {/* Live Metrics Ribbon & Action */}
        <div className="mt-8 pt-8 border-t border-black/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-6 sm:gap-10 text-xs">
            <div>
              <span className="text-[10px] uppercase text-black/40 block">Proposals Registered</span>
              <span className="font-editorial text-2xl font-normal text-black">{suggestions.length}</span>
            </div>
            <div className="w-px h-8 bg-black/10" />
            <div>
              <span className="text-[10px] uppercase text-black/40 block">Total Votes Cast</span>
              <span className="font-editorial text-2xl font-normal text-black">{totalVotesCast}</span>
            </div>
            <div className="w-px h-8 bg-black/10" />
            <div>
              <span className="text-[10px] uppercase text-black/40 block">Commissioned</span>
              <span className="font-editorial text-2xl font-normal text-emerald-700">{commissionedCount} Pieces</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="px-5 py-3 bg-black text-white hover:bg-neutral-800 transition-colors text-xs uppercase tracking-[0.18em] cursor-pointer flex items-center justify-center gap-2 shrink-0 font-medium"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Propose a Garment</span>
          </button>
        </div>
      </div>

      {/* Filter Selector Bar */}
      <div className="max-w-[1720px] mx-auto px-4 sm:px-6 md:px-10 py-5 flex items-center justify-between border-b border-black/[0.06] text-xs">
        <div className="flex items-center gap-2">
          {(['top', 'all', 'commissioned'] as const).map((filterKey) => (
            <button
              key={filterKey}
              type="button"
              onClick={() => setActiveFilter(filterKey)}
              className={`px-3 py-1.5 uppercase tracking-wider text-[11px] cursor-pointer transition-colors border ${
                activeFilter === filterKey
                  ? 'border-black bg-black text-white font-semibold'
                  : 'border-black/10 text-black/60 hover:border-black'
              }`}
            >
              {filterKey === 'top' && 'Most Voted (Priority)'}
              {filterKey === 'all' && 'All Proposals'}
              {filterKey === 'commissioned' && 'Commissioned & In Sampling'}
            </button>
          ))}
        </div>

        <span className="text-[11px] text-black/50 hidden sm:inline">
          Showing {filteredSuggestions.length} proposals
        </span>
      </div>

      {/* Suggestions Cards Grid */}
      <div className="max-w-[1720px] mx-auto px-4 sm:px-6 md:px-10 py-10 sm:py-16">
        {loading ? (
          <div className="py-20 text-center text-xs text-black/40">
            Consulting atelier archives...
          </div>
        ) : filteredSuggestions.length === 0 ? (
          <div className="py-20 text-center space-y-3">
            <p className="text-xs text-black/50">No proposals match this filter.</p>
            <button
              type="button"
              onClick={() => setActiveFilter('all')}
              className="text-xs uppercase underline underline-offset-4 cursor-pointer"
            >
              View all proposals
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
            {filteredSuggestions.map((item, idx) => {
              const hasVoted = votedIds.includes(item.id);
              const isCommissioned = item.status === 'commissioned';
              const isInSampling = item.status === 'in_sampling';

              return (
                <div
                  key={item.id}
                  className={`p-6 sm:p-8 border transition-all duration-300 bg-white flex flex-col justify-between space-y-6 ${
                    isCommissioned
                      ? 'border-emerald-600/40 ring-1 ring-emerald-600/20 shadow-sm'
                      : 'border-black/[0.1] hover:border-black'
                  }`}
                >
                  <div className="space-y-4">
                    {/* Header: Rank, Category, Status */}
                    <div className="flex items-center justify-between gap-3 text-[10.5px]">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-black text-xs">
                          #{idx + 1}
                        </span>
                        <span className="px-2 py-0.5 border border-black/15 bg-black/[0.02] uppercase tracking-wider text-black/70">
                          {item.category}
                        </span>
                      </div>

                      {/* Status Badges */}
                      {isCommissioned ? (
                        <span className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-300 font-semibold uppercase text-[10px] tracking-wider">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>COMMISSIONED FOR PRODUCTION</span>
                        </span>
                      ) : isInSampling ? (
                        <span className="flex items-center gap-1.5 px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-300 font-semibold uppercase text-[10px] tracking-wider">
                          <Scissors className="w-3 h-3 text-amber-600" />
                          <span>PATTERN DRAFTING & SAMPLING</span>
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 px-2 py-0.5 bg-neutral-50 text-black/60 border border-black/10 uppercase text-[10px] tracking-wider">
                          <Clock className="w-3 h-3 text-black/40" />
                          <span>UNDER BALLOT REVIEW</span>
                        </span>
                      )}
                    </div>

                    {/* Proposal Title */}
                    <h3 className="font-editorial text-2xl sm:text-3xl font-normal text-black leading-snug">
                      {item.title}
                    </h3>

                    {/* Fabric specifications */}
                    <div className="text-[11px] font-mono text-black/70 flex items-start gap-1.5 bg-black/[0.02] p-2.5 border border-black/[0.06]">
                      <span className="text-black/40 uppercase tracking-wider shrink-0 font-medium">Fabric:</span>
                      <span className="font-medium text-black">{item.desiredFabric}</span>
                    </div>

                    {/* Architectural Description */}
                    <p className="text-xs sm:text-[13px] font-sans text-black/70 leading-relaxed font-light">
                      {item.description}
                    </p>

                    {/* Atelier Curator Notes */}
                    {item.curatorNotes && (
                      <div className="p-3 bg-neutral-50 border-l-2 border-black text-xs font-mono text-black/80 space-y-1">
                        <span className="text-[9.5px] uppercase tracking-widest text-black/50 block font-bold">
                          ATELIER DISPATCH:
                        </span>
                        <p className="font-sans text-[12px]">{item.curatorNotes}</p>
                      </div>
                    )}
                  </div>

                  {/* Card Bottom: Submitter Info & Vote Button */}
                  <div className="pt-4 border-t border-black/[0.08] flex items-center justify-between gap-4">
                    <div className="text-[10px] text-black/40">
                      <span>Proposed by {item.submittedBy || 'Anonymous Patron'}</span>
                      <span className="mx-1.5">·</span>
                      <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleVote(item.id)}
                      disabled={hasVoted}
                      className={`px-4 py-2 border text-xs uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-2 ${
                        hasVoted
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-900 font-semibold cursor-default'
                          : 'border-black bg-white text-black hover:bg-black hover:text-white'
                      }`}
                    >
                      <ThumbsUp className={`w-3.5 h-3.5 ${hasVoted ? 'fill-emerald-800' : ''}`} />
                      <span>{hasVoted ? 'Voted' : 'Vote'}</span>
                      <span className="font-bold font-mono pl-1">({item.votes})</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL: PROPOSE A NEW GARMENT */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white border border-black p-6 sm:p-8 shadow-2xl relative max-h-[92vh] overflow-y-auto space-y-6">
            <div className="flex items-start justify-between border-b border-black/10 pb-4">
              <div>
                <span className="text-[10px] uppercase tracking-[0.25em] text-black/50 block mb-1">
                  ATELIER COMMISSION
                </span>
                <h2 className="font-editorial text-2xl sm:text-3xl font-normal text-black">
                  Propose a Garment
                </h2>
                <p className="text-xs text-black/60 font-sans mt-1">
                  Describe the garment you wish to see crafted by Zejesh. If the proposal receives community support, our patternmakers will begin sampling.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-black/40 hover:text-black cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {submitSuccess ? (
              <div className="py-10 text-center space-y-3">
                <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-600" />
                <h3 className="font-editorial text-2xl font-normal text-black">Proposal Registered</h3>
                <p className="text-xs font-sans text-black/70 max-w-sm mx-auto">
                  Your piece has been added to the public ballot. Fellow patrons can now vote for its creation.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmitProposal} className="space-y-4 text-xs font-mono">
                {submitError && (
                  <div className="p-2.5 bg-red-50 border border-red-200 text-red-800 text-[11px]">
                    {submitError}
                  </div>
                )}

                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-black font-semibold mb-1">
                    Garment Title / Concept *
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Full-Length Raw Wool Trench, Seamless Knit Trousers"
                    className="w-full px-3 py-2 border border-black/30 bg-neutral-50/50 focus:bg-white focus:outline-none focus:border-black text-xs text-black"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10.5px] uppercase tracking-wider text-black/70 mb-1">
                      Category
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full px-3 py-2 border border-black/20 bg-neutral-50/50 focus:bg-white focus:outline-none focus:border-black text-xs text-black"
                    >
                      <option value="Outerwear">Outerwear</option>
                      <option value="Knitwear">Knitwear</option>
                      <option value="Tailoring">Tailoring</option>
                      <option value="Accessories">Accessories</option>
                      <option value="Footwear">Footwear</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10.5px] uppercase tracking-wider text-black/70 mb-1">
                      Desired Fabrication
                    </label>
                    <input
                      type="text"
                      value={desiredFabric}
                      onChange={(e) => setDesiredFabric(e.target.value)}
                      placeholder="e.g. 100% Virgin Wool (600 gsm)"
                      className="w-full px-3 py-2 border border-black/20 bg-neutral-50/50 focus:bg-white focus:outline-none focus:border-black text-xs text-black"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-black font-semibold mb-1">
                    Silhouette & Design Details *
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe the stance, collar, pockets, closure, length, and why this piece belongs in the permanent archive..."
                    className="w-full px-3 py-2 border border-black/30 bg-neutral-50/50 focus:bg-white focus:outline-none focus:border-black text-xs font-sans text-black leading-relaxed"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10.5px] uppercase tracking-wider text-black/70 mb-1">
                      Your Name / Handle
                    </label>
                    <input
                      type="text"
                      value={submitterName}
                      onChange={(e) => setSubmitterName(e.target.value)}
                      placeholder="e.g. Marcus / Collector"
                      className="w-full px-3 py-2 border border-black/20 bg-neutral-50/50 focus:bg-white focus:outline-none focus:border-black text-xs text-black"
                    />
                  </div>

                  <div>
                    <label className="block text-[10.5px] uppercase tracking-wider text-black/70 mb-1">
                      Email (for notification if made)
                    </label>
                    <input
                      type="email"
                      value={submitterEmail}
                      onChange={(e) => setSubmitterEmail(e.target.value)}
                      placeholder="name@example.com"
                      className="w-full px-3 py-2 border border-black/20 bg-neutral-50/50 focus:bg-white focus:outline-none focus:border-black text-xs text-black"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-black/10 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 border border-black/20 text-black hover:bg-black/5 text-xs uppercase tracking-wider cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-6 py-2.5 bg-black text-white hover:bg-neutral-800 text-xs uppercase tracking-wider font-semibold cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting ? 'Registering...' : 'Submit to Ballot'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
