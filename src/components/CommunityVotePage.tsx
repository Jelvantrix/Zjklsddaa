import React, { useState, useEffect, useMemo } from 'react';
import { CommunitySuggestion } from '../types';
import {
  subscribeToSuggestions,
  submitCommunitySuggestion,
  voteForSuggestion,
} from '../supabase/dbService';
import {
  ArrowLeft,
  ArrowRight,
  Plus,
  X,
  Check,
  CheckCircle2,
  Clock,
  Scissors,
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
  const [activeFilter, setActiveFilter] = useState<'top' | 'all' | 'commissioned'>('top');
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

  // Real-time subscription to suggestions via Supabase
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

    // Commit to Supabase database
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
    () => suggestions.filter((s) => s.status === 'commissioned' || s.status === 'in_sampling').length,
    [suggestions]
  );

  return (
    <div className="w-full bg-[#FFFFFF] text-[#000000] min-h-screen select-none pt-20 sm:pt-28 lg:pt-32">
      {/* Top Breadcrumb Header */}
      <div className="max-w-[1720px] mx-auto px-4 sm:px-6 md:px-10 py-4 flex items-center justify-between text-xs font-mono">
        <button
          type="button"
          onClick={onBackToHome}
          className="group flex items-center gap-2 text-black/60 hover:text-black transition-colors cursor-pointer uppercase tracking-[0.2em]"
          aria-label="Return to storefront"
        >
          <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-1" />
          <span className="underline underline-offset-4">Return Home</span>
        </button>
        <span className="text-[10px] sm:text-[11px] tracking-[0.28em] uppercase text-black/40">
          CO-CREATION ARCHIVE · BALLOT
        </span>
      </div>

      {/* Main Studio Header - Clean White Aesthetic */}
      <div className="max-w-[1720px] mx-auto px-4 sm:px-6 md:px-10 py-12 sm:py-16 md:py-24">
        <div className="max-w-4xl space-y-4 sm:space-y-6">
          <span className="font-mono text-[10.5px] sm:text-xs tracking-[0.28em] uppercase text-black/45 block">
            PATRON COMMISSIONS & OPEN BALLOT
          </span>
          <h1 className="font-editorial text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-normal tracking-tight text-black leading-[1.02]">
            What Should Zejesh Craft Next?
          </h1>
          <p className="text-sm sm:text-base md:text-lg font-sans text-black/75 max-w-2xl leading-relaxed font-light">
            We reject mass production forecasting. Vote on patron garment concepts or submit your own architectural proposals. Pieces with high community backing enter pattern drafting in Helsinki and Portuguese shuttle-loom weaving.
          </p>

          {/* Unboxed Live Metrics Ribbon & Pure Typography CTA */}
          <div className="pt-6 sm:pt-8 flex flex-col sm:flex-row sm:items-end justify-between gap-8 border-t border-black/10">
            {/* Unboxed Minimal Metrics */}
            <div className="flex items-center gap-6 sm:gap-12 text-xs font-mono">
              <div>
                <span className="text-[9.5px] sm:text-[10px] uppercase tracking-widest text-black/45 block mb-1">
                  Registered Proposals
                </span>
                <span className="font-editorial text-2xl sm:text-3xl font-normal text-black">
                  {suggestions.length}
                </span>
              </div>
              <div className="w-px h-8 bg-black/15" />
              <div>
                <span className="text-[9.5px] sm:text-[10px] uppercase tracking-widest text-black/45 block mb-1">
                  Ballots Cast
                </span>
                <span className="font-editorial text-2xl sm:text-3xl font-normal text-black">
                  {totalVotesCast}
                </span>
              </div>
              <div className="w-px h-8 bg-black/15" />
              <div>
                <span className="text-[9.5px] sm:text-[10px] uppercase tracking-widest text-black/45 block mb-1">
                  In Production
                </span>
                <span className="font-editorial text-2xl sm:text-3xl font-normal text-black">
                  {commissionedCount} Pieces
                </span>
              </div>
            </div>

            {/* Pure Typographic Action (NO border, NO box) */}
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="group inline-flex items-center gap-2 text-xs uppercase tracking-[0.22em] font-mono text-black hover:opacity-60 transition-opacity cursor-pointer underline underline-offset-8 shrink-0"
            >
              <Plus className="w-3.5 h-3.5 transition-transform group-hover:rotate-90" />
              <span>Propose a Garment</span>
            </button>
          </div>
        </div>
      </div>

      {/* FILTER BAR: Pure Typographic Tabs (NO boxes, NO pills) */}
      <div className="max-w-[1720px] mx-auto px-4 sm:px-6 md:px-10 py-5 sm:py-7 border-b border-black/[0.06] flex items-center justify-between text-xs font-mono">
        <div className="flex items-center gap-6 sm:gap-10">
          {(['top', 'all', 'commissioned'] as const).map((filterKey) => (
            <button
              key={filterKey}
              type="button"
              onClick={() => setActiveFilter(filterKey)}
              className={`py-1 uppercase tracking-[0.2em] text-[11px] sm:text-xs cursor-pointer transition-all ${
                activeFilter === filterKey
                  ? 'text-black font-semibold underline underline-offset-8'
                  : 'text-black/50 hover:text-black'
              }`}
            >
              {filterKey === 'top' && 'Most Voted (Priority)'}
              {filterKey === 'all' && 'All Proposals'}
              {filterKey === 'commissioned' && 'Commissioned & In Sampling'}
            </button>
          ))}
        </div>

        <span className="text-[11px] text-black/40 hidden md:inline">
          Showing {filteredSuggestions.length} registered proposals
        </span>
      </div>

      {/* SUGGESTIONS LIST: Luxury Minimalist Cards */}
      <div className="max-w-[1720px] mx-auto px-4 sm:px-6 md:px-10 py-12 sm:py-20">
        {loading ? (
          <div className="py-24 text-center font-mono text-xs text-black/40">
            Consulting atelier ballot archive...
          </div>
        ) : filteredSuggestions.length === 0 ? (
          <div className="py-24 text-center space-y-4 font-mono">
            <p className="text-xs text-black/50">No proposals match this filter.</p>
            <button
              type="button"
              onClick={() => setActiveFilter('all')}
              className="text-xs uppercase tracking-wider text-black underline underline-offset-4 cursor-pointer hover:opacity-60"
            >
              View all proposals
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 sm:gap-12">
            {filteredSuggestions.map((item, idx) => {
              const hasVoted = votedIds.includes(item.id);
              const isCommissioned = item.status === 'commissioned';
              const isInSampling = item.status === 'in_sampling';

              return (
                <div
                  key={item.id}
                  className="p-6 sm:p-10 border border-black/[0.08] bg-white flex flex-col justify-between space-y-6 sm:space-y-8 hover:border-black/25 transition-colors"
                >
                  <div className="space-y-5">
                    {/* Header: Rank, Category, and Unboxed Status */}
                    <div className="flex items-center justify-between gap-3 text-[10.5px] font-mono">
                      <div className="flex items-center gap-2.5">
                        <span className="text-black font-semibold text-xs">
                          № {(idx + 1).toString().padStart(2, '0')}
                        </span>
                        <span className="text-black/40">·</span>
                        <span className="uppercase tracking-[0.2em] text-black/60">
                          {item.category}
                        </span>
                      </div>

                      {/* Unboxed Clean Status Indicators */}
                      {isCommissioned ? (
                        <span className="flex items-center gap-1.5 text-black font-semibold uppercase text-[10px] tracking-widest">
                          <CheckCircle2 className="w-3.5 h-3.5 stroke-[1.5]" />
                          <span>COMMISSIONED</span>
                        </span>
                      ) : isInSampling ? (
                        <span className="flex items-center gap-1.5 text-black/80 font-medium uppercase text-[10px] tracking-widest">
                          <Scissors className="w-3.5 h-3.5 stroke-[1.5]" />
                          <span>PATTERN DRAFTING</span>
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-black/45 uppercase text-[10px] tracking-widest">
                          <Clock className="w-3.5 h-3.5 stroke-[1.5]" />
                          <span>BALLOT REVIEW</span>
                        </span>
                      )}
                    </div>

                    {/* Proposal Title */}
                    <h3 className="font-editorial text-2xl sm:text-3xl md:text-4xl font-normal text-black leading-snug">
                      {item.title}
                    </h3>

                    {/* Desired Fabric Specification */}
                    <div className="text-[11px] sm:text-xs font-mono text-black/70 flex items-start gap-2 pt-1 border-t border-black/5">
                      <span className="text-black/40 uppercase tracking-widest shrink-0 font-medium">
                        Fabrication:
                      </span>
                      <span className="text-black">{item.desiredFabric}</span>
                    </div>

                    {/* Architectural Description */}
                    <p className="text-xs sm:text-sm font-sans text-black/75 leading-relaxed font-light">
                      {item.description}
                    </p>

                    {/* Atelier Curator Notes */}
                    {item.curatorNotes && (
                      <div className="pt-3 border-t border-black/10 font-mono text-xs space-y-1">
                        <span className="text-[9.5px] uppercase tracking-widest text-black/50 block font-medium">
                          ATELIER DISPATCH:
                        </span>
                        <p className="font-sans text-xs sm:text-[13px] text-black/80 leading-relaxed font-light">
                          {item.curatorNotes}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Card Bottom: Submitter Info & Pure Typographic Vote Button */}
                  <div className="pt-6 border-t border-black/10 flex items-center justify-between gap-4 font-mono text-xs">
                    <div className="text-[10px] sm:text-[10.5px] text-black/45">
                      <span>By {item.submittedBy || 'Atelier Patron'}</span>
                      <span className="mx-1.5">·</span>
                      <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                    </div>

                    {/* Pure Typography Vote Button - NO box, NO border */}
                    <button
                      type="button"
                      onClick={() => handleVote(item.id)}
                      disabled={hasVoted}
                      className={`uppercase tracking-[0.2em] text-xs transition-opacity cursor-pointer flex items-center gap-2 ${
                        hasVoted
                          ? 'text-black/50 cursor-default no-underline'
                          : 'text-black hover:opacity-60 underline underline-offset-4 font-medium'
                      }`}
                      aria-label={hasVoted ? 'Ballot recorded' : `Cast ballot for ${item.title}`}
                    >
                      {hasVoted ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Ballot Recorded ({item.votes})</span>
                        </>
                      ) : (
                        <>
                          <span>Cast Ballot</span>
                          <span className="font-mono text-black/70">({item.votes})</span>
                          <ArrowRight className="w-3 h-3" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL: PROPOSE A NEW GARMENT (PURE TYPOGRAPHY AESTHETIC) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[120] bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white p-6 sm:p-10 border border-black/15 shadow-2xl relative max-h-[92vh] overflow-y-auto space-y-6">
            <div className="flex items-start justify-between pb-4 border-b border-black/10">
              <div>
                <span className="text-[10px] uppercase tracking-[0.25em] text-black/50 block mb-1 font-mono">
                  ATELIER COMMISSION
                </span>
                <h2 className="font-editorial text-2xl sm:text-3xl font-normal text-black">
                  Propose a Garment
                </h2>
                <p className="text-xs text-black/60 font-sans mt-1 leading-relaxed">
                  Describe the garment you wish to see crafted by Zejesh. Proposals with high community support enter pattern drafting.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-black/40 hover:text-black cursor-pointer"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {submitSuccess ? (
              <div className="py-12 text-center space-y-3 font-mono">
                <CheckCircle2 className="w-8 h-8 mx-auto stroke-[1.2] text-black" />
                <h3 className="font-editorial text-2xl font-normal text-black">Proposal Registered</h3>
                <p className="text-xs font-sans text-black/70 max-w-sm mx-auto leading-relaxed">
                  Your piece has been added to the public ballot. Fellow patrons can now vote for its creation.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmitProposal} className="space-y-5 text-xs font-mono">
                {submitError && (
                  <div className="p-3 bg-red-50 text-red-900 text-[11px]">
                    {submitError}
                  </div>
                )}

                <div>
                  <label className="block text-[10.5px] uppercase tracking-wider text-black font-medium mb-1">
                    Garment Title / Concept *
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Double-Breasted Heavy Wool Greatcoat"
                    className="w-full px-3 py-2.5 border-b border-black/20 focus:border-black focus:outline-none text-xs text-black bg-transparent"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10.5px] uppercase tracking-wider text-black/60 mb-1">
                      Category
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full px-3 py-2.5 border-b border-black/20 focus:border-black focus:outline-none text-xs text-black bg-transparent"
                    >
                      <option value="Outerwear">Outerwear</option>
                      <option value="Knitwear">Knitwear</option>
                      <option value="Tailoring">Tailoring</option>
                      <option value="Accessories">Accessories</option>
                      <option value="Footwear">Footwear</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10.5px] uppercase tracking-wider text-black/60 mb-1">
                      Desired Fabrication
                    </label>
                    <input
                      type="text"
                      value={desiredFabric}
                      onChange={(e) => setDesiredFabric(e.target.value)}
                      placeholder="e.g. 100% Virgin Wool (700 gsm)"
                      className="w-full px-3 py-2.5 border-b border-black/20 focus:border-black focus:outline-none text-xs text-black bg-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10.5px] uppercase tracking-wider text-black font-medium mb-1">
                    Silhouette & Construction Details *
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe the stance, collar, pockets, closure, length, and why this piece belongs in the permanent archive..."
                    className="w-full px-3 py-2.5 border border-black/20 focus:border-black focus:outline-none text-xs font-sans text-black leading-relaxed bg-transparent"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10.5px] uppercase tracking-wider text-black/60 mb-1">
                      Your Name / Handle
                    </label>
                    <input
                      type="text"
                      value={submitterName}
                      onChange={(e) => setSubmitterName(e.target.value)}
                      placeholder="e.g. Marcus / Collector"
                      className="w-full px-3 py-2.5 border-b border-black/20 focus:border-black focus:outline-none text-xs text-black bg-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-[10.5px] uppercase tracking-wider text-black/60 mb-1">
                      Email (optional notification)
                    </label>
                    <input
                      type="email"
                      value={submitterEmail}
                      onChange={(e) => setSubmitterEmail(e.target.value)}
                      placeholder="name@example.com"
                      className="w-full px-3 py-2.5 border-b border-black/20 focus:border-black focus:outline-none text-xs text-black bg-transparent"
                    />
                  </div>
                </div>

                {/* Pure Typography Modal Actions (NO boxes, NO borders around buttons) */}
                <div className="pt-6 border-t border-black/10 flex items-center justify-end gap-6 uppercase tracking-[0.2em] text-xs">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="text-black/50 hover:text-black cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="text-black hover:opacity-60 underline underline-offset-8 cursor-pointer font-medium disabled:opacity-40"
                  >
                    {isSubmitting ? 'Registering...' : 'Submit to Ballot →'}
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
