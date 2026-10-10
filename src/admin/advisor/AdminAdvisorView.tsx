import React, { useState } from 'react';
import { Product, DailyStat, AiInsight } from '../../types';
import { useAuth } from '../../supabase/AuthContext';
import { supabase } from '../../supabase/config';
import { logAuditEvent } from '../../supabase/dbService';
import { GoogleGenAI } from '@google/genai';
import {
  Sparkles,
  ArrowRight,
  CheckCircle,
  MessageSquare,
  Clock,
  TrendingUp,
  AlertCircle,
  Send,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';

interface AdminAdvisorViewProps {
  products: Product[];
  dailyStats: DailyStat[];
  insights: AiInsight[];
  onRefresh: () => void;
  onNavigateView: (view: string) => void;
}

export const AdminAdvisorView: React.FC<AdminAdvisorViewProps> = ({
  products,
  dailyStats,
  insights,
  onRefresh,
  onNavigateView,
}) => {
  const { isEditor, adminProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<'insights' | 'chat' | 'digest'>('insights');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [chatQuery, setChatQuery] = useState('');
  const totalRev = dailyStats.reduce((s, d) => s + (d.revenue || 0), 0);
  const totalOrd = dailyStats.reduce((s, d) => s + (d.orders || 0), 0);

  const [chatMessages, setChatMessages] = useState<Array<{ sender: 'user' | 'ai'; text: string; citations?: string }>>(() => [
    {
      sender: 'ai',
      text: totalOrd > 0
        ? `Welcome. I have reviewed your live studio telemetry across your ${products.length} catalog items. You have generated ${totalRev.toLocaleString()} € in sales across ${totalOrd} completed orders. How may I advise your retail strategy today?`
        : `Welcome. I am connected to your live store database. You currently have ${products.length} catalog garments and 0 settled orders. How may I assist in merchandising, price architecture, or catalog launch preparation?`,
    },
  ]);
  const [isAsking, setIsAsking] = useState(false);

  const activeInsightsList = insights || [];

  const handleMarkInsightDone = async (insightId: string) => {
    if (!isEditor) return;
    try {
      await supabase
        .from('insights')
        .update({
          status: 'done',
          resolvedAt: new Date().toISOString(),
        })
        .eq('id', insightId);
      await logAuditEvent(adminProfile?.name || 'admin', 'mark_insight_done', insightId);
      onRefresh();
    } catch {
      // Update failed — reload the current database state instead of guessing.
      onRefresh();
    }
  };

  const handleAnalyzeNow = async () => {
    if (products.length === 0 && dailyStats.length === 0) {
      alert('There is not enough data in the database to generate strategic insights. Please add products and record store traffic first.');
      return;
    }

    setIsAnalyzing(true);
    try {
      const apiKey = process.env.GEMINI_API_KEY || (import.meta as any).env?.VITE_GEMINI_API_KEY;
      if (apiKey) {
        const ai = new GoogleGenAI({ apiKey });
        const summaryData = {
          productsCount: products.length,
          totalSalesVolume: dailyStats.reduce((a, s) => a + (s.revenue || 0), 0),
          ordersCount: dailyStats.reduce((a, s) => a + (s.orders || 0), 0),
          topSelling: products.slice(0, 3).map((p) => p.nr || p.name?.en),
          lowStock: products.filter((p) => p.stock < 4).map((p) => p.nr || p.name?.en),
        };

        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: `You are a senior retail strategist for Zejesh, a quiet Nordic luxury fashion atelier.
Analyze this real studio data: ${JSON.stringify(summaryData)}.
Return a JSON array of strategic recommendations based strictly on the provided real data with fields: title, priority (high/medium/low), category, evidence, recommendation, expectedImpact, effort.
Strictly valid JSON only.`,
        });

        const text = response.text || '';
        const cleaned = text.replace(/```json|```/g, '').trim();
        const parsed = JSON.parse(cleaned);

        for (const item of parsed) {
          const id = `ins-ai-${Date.now()}-${crypto.randomUUID ? crypto.randomUUID().slice(0, 8) : Date.now().toString(36)}`;
          await supabase.from('insights').upsert({
            ...item,
            id,
            status: 'new',
            createdAt: new Date().toISOString(),
          });
        }
      }
    } catch (err) {
      console.warn('AI Advisor analysis note:', err);
    } finally {
      setIsAnalyzing(false);
      onRefresh();
    }
  };

  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatQuery.trim() || isAsking) return;

    const userText = chatQuery.trim();
    setChatMessages((prev) => [...prev, { sender: 'user', text: userText }]);
    setChatQuery('');

    if (products.length === 0 && dailyStats.length === 0) {
      setChatMessages((prev) => [
        ...prev,
        {
          sender: 'ai',
          text: 'There is not enough data recorded in the database to answer this question. Please publish products and generate sales traffic first.',
        },
      ]);
      return;
    }

    setIsAsking(true);

    try {
      const apiKey = process.env.GEMINI_API_KEY || (import.meta as any).env?.VITE_GEMINI_API_KEY;
      const totalSales = dailyStats.reduce((a, s) => a + (s.revenue || 0), 0);
      const totalOrders = dailyStats.reduce((a, s) => a + (s.orders || 0), 0);
      const contextSummary = `Studio context: ${products.length} catalog items. Total recorded revenue: ${totalSales} €. Total orders: ${totalOrders}.`;

      if (apiKey) {
        const ai = new GoogleGenAI({ apiKey });
        const res = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: `${contextSummary}\nUser question: ${userText}\nProvide a concise strategic answer grounded strictly in these real numbers. If there is insufficient data to answer, state clearly that there is not enough data.`,
        });
        setChatMessages((prev) => [
          ...prev,
          {
            sender: 'ai',
            text: res.text || 'The model returned no content. Please rephrase your question and ask again.',
          },
        ]);
      } else {
        setTimeout(() => {
          setChatMessages((prev) => [
            ...prev,
            {
              sender: 'ai',
              text: `Studio records show ${products.length} products and ${totalOrders} orders (${totalSales} € recorded revenue). Connect GEMINI_API_KEY for conversational strategic intelligence.`,
            },
          ]);
        }, 300);
      }
    } catch (err) {
      setChatMessages((prev) => [
        ...prev,
        {
          sender: 'ai',
          text: 'Could not complete analysis at this time. Please verify network connectivity.',
        },
      ]);
    } finally {
      setIsAsking(false);
    }
  };

  return (
    <div className="space-y-6 font-mono text-xs">
      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-black/[0.08]">
        <div>
          <h1 className="font-editorial text-3xl font-normal">AI Studio Advisor</h1>
          <p className="text-xs font-mono text-black/50 mt-0.5">
            Strategic analysis grounded in your recorded catalog, order and traffic data. When there is not
            enough data, the advisor says so instead of guessing.
          </p>
        </div>

        <button
          onClick={handleAnalyzeNow}
          disabled={isAnalyzing}
          className="text-xs font-mono uppercase tracking-wider text-black hover:opacity-60 underline underline-offset-4 cursor-pointer flex items-center gap-1.5 font-semibold disabled:opacity-50"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>{isAnalyzing ? 'Analyzing Studio Data...' : 'Run Intelligence Sweep'}</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-black/[0.08] text-xs font-mono uppercase tracking-wider">
        {[
          { id: 'insights', label: `1. Actionable Insights (${activeInsightsList.filter((i) => i.status !== 'done').length})` },
          { id: 'chat', label: '2. Ask Your Data (Chat)' },
          { id: 'digest', label: '3. Weekly Executive Digest' },
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

      {/* TAB 1: ACTIONABLE INSIGHTS */}
      {activeTab === 'insights' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            {activeInsightsList.length === 0 ? (
              <div className="p-8 border border-black/10 bg-neutral-50/50 text-center space-y-2">
                <span className="text-xs uppercase font-semibold text-black tracking-wider block">
                  No Strategic Insights Yet
                </span>
                <p className="text-xs text-black/60 max-w-md mx-auto font-sans">
                  {products.length === 0
                    ? 'No products found in the catalog. Add products and record store traffic to enable strategic intelligence analysis.'
                    : 'Click "Analyze Catalog & Traffic" above to generate strategic recommendations from live store telemetry.'}
                </p>
              </div>
            ) : (
              activeInsightsList.map((ins) => (
                <div
                  key={ins.id}
                  className={`p-5 border border-black/[0.08] bg-white space-y-3 transition-colors ${
                    ins.status === 'done' ? 'opacity-50' : ''
                  }`}
                >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-black/[0.06] pb-2.5">
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`text-[9.5px] uppercase font-bold tracking-wider ${
                        ins.priority === 'high' ? 'underline' : 'text-black/60'
                      }`}
                    >
                      [{ins.priority} priority]
                    </span>
                    <span className="text-[10px] uppercase text-black/50 tracking-wider">
                      · {ins.category}
                    </span>
                  </div>

                  <span className="text-[10px] text-black/40">
                    Status: <span className="font-semibold uppercase">{ins.status}</span>
                  </span>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-black">{ins.title}</h3>
                  <div className="text-[11px] text-black/70 mt-1 leading-relaxed">
                    <span className="font-semibold text-black">Evidence: </span>
                    {ins.evidence}
                  </div>
                  <div className="text-[11px] text-black/90 mt-1 leading-relaxed">
                    <span className="font-semibold text-black">Recommendation: </span>
                    {ins.recommendation}
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-black/[0.06] text-[11px]">
                  <div className="space-x-4 text-black/60">
                    <span>
                      Expected Impact: <span className="font-semibold text-black">{ins.expectedImpact}</span>
                    </span>
                    <span>·</span>
                    <span>
                      Effort: <span className="text-black">{ins.effort}</span>
                    </span>
                  </div>

                  <div className="flex items-center gap-4">
                    {ins.suggestedAction?.deepLink && (
                      <button
                        onClick={() => onNavigateView(ins.suggestedAction.deepLink!)}
                        className="text-xs uppercase text-black hover:opacity-60 underline underline-offset-4 cursor-pointer flex items-center gap-1 font-semibold"
                      >
                        <span>Open in Admin</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    )}

                    {ins.status !== 'done' && (
                      <button
                        onClick={() => handleMarkInsightDone(ins.id)}
                        className="text-xs uppercase text-black/60 hover:text-black underline underline-offset-4 cursor-pointer"
                      >
                        Mark Done
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )))}
          </div>
        </div>
      )}

      {/* TAB 2: ASK YOUR DATA (Interactive Natural Language Querying) */}
      {activeTab === 'chat' && (
        <div className="border border-black/[0.08] bg-white p-6 space-y-4 max-w-3xl">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-black">
              Ask Your Data (Studio Intelligence)
            </h2>
            <p className="text-[11px] text-black/50 mt-0.5">
              Ask strategic questions in English or Finnish. The model answers from your recorded store totals;
              when the data is missing it states that there is not enough data.
            </p>
          </div>

          {/* Chat Transcript */}
          <div className="h-80 overflow-y-auto border border-black/[0.08] p-4 space-y-4 bg-black/[0.01]">
            {chatMessages.map((msg, idx) => (
              <div
                key={idx}
                className={`p-3 max-w-[85%] text-xs leading-relaxed ${
                  msg.sender === 'user'
                    ? 'ml-auto bg-black text-white'
                    : 'mr-auto bg-white border border-black/[0.08] text-black'
                }`}
              >
                <div className="text-[9.5px] uppercase text-black/40 mb-1 font-bold">
                  {msg.sender === 'user' ? 'Store Strategist' : 'Zejesh AI Engine'}
                </div>
                <div>{msg.text}</div>
              </div>
            ))}
            {isAsking && (
              <div className="p-3 bg-white border border-black/[0.08] mr-auto text-xs text-black/50">
                Calculating studio telemetry...
              </div>
            )}
          </div>

          {/* Input Form */}
          <form onSubmit={handleSendChat} className="flex gap-3">
            <input
              type="text"
              value={chatQuery}
              onChange={(e) => setChatQuery(e.target.value)}
              placeholder="e.g. Which category converts best on mobile? Or what pieces should I launch next?"
              className="flex-1 px-3 py-2 border-b border-black/30 focus:border-black text-xs bg-transparent"
            />
            <button
              type="submit"
              disabled={isAsking || !chatQuery.trim()}
              className="text-xs uppercase tracking-wider text-black hover:opacity-60 underline underline-offset-4 cursor-pointer font-semibold disabled:opacity-30"
            >
              Ask Advisor
            </button>
          </form>
        </div>
      )}

      {/* TAB 3: WEEKLY EXECUTIVE DIGEST (no fabricated report is generated) */}
      {activeTab === 'digest' && (
        <div className="border border-black/[0.08] bg-white p-6 space-y-4 max-w-2xl">
          <div>
            <div className="text-[10px] uppercase text-black/50 tracking-wider">Executive Briefing</div>
            <h2 className="font-editorial text-2xl font-normal text-black mt-1">Weekly Executive Digest</h2>
          </div>

          <div className="p-8 border border-black/10 bg-neutral-50/50 text-center space-y-2">
            <span className="text-xs uppercase font-semibold text-black tracking-wider block">No data yet</span>
            <p className="text-xs text-black/60 max-w-md mx-auto font-sans leading-relaxed">
              Not enough data yet — the advisor needs live store activity before it can write a digest.
              Revenue, order and traffic figures will appear here once they are recorded in the database.
            </p>
            <p className="text-[11px] text-black/40 font-mono">
              Recorded so far: {products.length} catalog items · {totalOrd} orders · {totalRev.toLocaleString()} €
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
