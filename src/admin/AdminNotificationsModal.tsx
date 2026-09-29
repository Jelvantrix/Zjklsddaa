import React from 'react';
import { X, AlertTriangle, PackageCheck, Sparkles, Clock, ArrowRight } from 'lucide-react';
import { Product, Order, AiInsight } from '../types';

interface AdminNotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  orders: Order[];
  insights: AiInsight[];
  onNavigateView: (view: string) => void;
}

export const AdminNotificationsModal: React.FC<AdminNotificationsModalProps> = ({
  isOpen,
  onClose,
  products,
  orders,
  insights,
  onNavigateView,
}) => {
  if (!isOpen) return null;

  // Derive low stock products (stock < 3)
  const lowStock = products.filter((p) => {
    const total = p.variants ? p.variants.reduce((a, v) => a + v.stock, 0) : (p.stock || 0);
    return total > 0 && total < 4;
  });

  // New pending orders
  const newOrders = orders.filter((o) => o.status === 'new' || o.status === 'paid').slice(0, 3);

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-end p-4 sm:p-6">
      <div onClick={onClose} className="fixed inset-0 bg-black/40 backdrop-blur-xs" />

      <div className="relative w-full max-w-sm bg-white border border-black shadow-2xl z-10 animate-fadeIn flex flex-col max-h-[85vh]">
        <div className="p-4 border-b border-black/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-semibold uppercase tracking-wider">Ilmoitukset</span>
            <span className="px-1.5 py-0.5 text-[10px] font-mono bg-black text-white">
              {lowStock.length + newOrders.length + insights.length}
            </span>
          </div>
          <button onClick={onClose} className="p-1 text-black/50 hover:text-black cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto space-y-4 divide-y divide-black/10 text-xs">
          {/* Low Stock Warnings */}
          {lowStock.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-black font-mono font-medium">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Alhainen varasto ({lowStock.length})</span>
              </div>
              {lowStock.slice(0, 3).map((p) => (
                <div key={p.id} className="p-2 border border-black/15 bg-black/[0.02]">
                  <div className="flex justify-between font-mono">
                    <span className="font-semibold">{p.nr}</span>
                    <span className="text-black/70">{p.stock} kpl jäljellä</span>
                  </div>
                  <div className="text-[11px] text-black/60 truncate">{p.name.fi}</div>
                </div>
              ))}
            </div>
          )}

          {/* New Orders */}
          {newOrders.length > 0 && (
            <div className="pt-3 space-y-2">
              <div className="flex items-center gap-1.5 text-black font-mono font-medium">
                <PackageCheck className="w-3.5 h-3.5" />
                <span>Uudet tilaukset</span>
              </div>
              {newOrders.map((o) => (
                <div key={o.id} className="p-2 border border-black/15">
                  <div className="flex justify-between font-mono">
                    <span className="font-semibold">{o.number}</span>
                    <span>{o.totals.total} €</span>
                  </div>
                  <div className="text-[11px] text-black/60 truncate">{o.customer.name}</div>
                </div>
              ))}
            </div>
          )}

          {/* AI Insights */}
          {insights.length > 0 && (
            <div className="pt-3 space-y-2">
              <div className="flex items-center gap-1.5 text-black font-mono font-medium">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Neuvonantajan suositukset</span>
              </div>
              {insights.slice(0, 2).map((ins) => (
                <div key={ins.id} className="p-2 border border-black/15 bg-black/[0.02]">
                  <div className="font-mono text-[10px] uppercase font-semibold text-black/70">
                    {ins.priority === 'high' ? 'Korkea prioriteetti' : 'Suositus'}
                  </div>
                  <div className="text-[11px] font-sans font-medium line-clamp-2 mt-0.5">
                    {ins.title}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-3 border-t border-black/10 bg-black/[0.02] text-center">
          <button
            onClick={() => {
              onNavigateView('advisor');
              onClose();
            }}
            className="text-[11px] font-mono tracking-wider uppercase hover:underline flex items-center justify-center gap-1 w-full"
          >
            <span>Avaa Tekoälyneuvonantaja</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
};
