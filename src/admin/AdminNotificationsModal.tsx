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

  // Derive low stock products (stock < 4)
  const lowStock = products.filter((p) => {
    const total = p.variants ? p.variants.reduce((a, v) => a + v.stock, 0) : (p.stock || 0);
    return total > 0 && total < 4;
  });

  // New pending orders
  const newOrders = orders.filter((o) => o.status === 'new' || o.status === 'paid').slice(0, 3);

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-end p-4 sm:p-6">
      <div onClick={onClose} className="fixed inset-0 backdrop-blur-xs" />

      <div className="relative w-full max-w-sm bg-white z-10 animate-fadeIn flex flex-col max-h-[85vh] text-small">
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-semibold uppercase tracking-wider text-small">Studio Notifications</span>
            <span className="text-small text-black/50">
              ({lowStock.length + newOrders.length + insights.length})
            </span>
          </div>
          <button onClick={onClose} className="p-1 text-black/50 hover:text-black cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto space-y-4">
          {/* Low Stock Warnings */}
          {lowStock.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-black font-medium">
                <span className="flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Low Stock Warning ({lowStock.length})</span>
                </span>
                <button
                  onClick={() => {
                    onNavigateView('inventory');
                    onClose();
                  }}
                  className="text-small uppercase text-black hover:opacity-60 underline underline-offset-2"
                >
                  View All
                </button>
              </div>
              {lowStock.slice(0, 3).map((p) => (
                <div key={p.id} className="p-2">
                  <div className="flex justify-between">
                    <span className="font-semibold text-black">{p.nr}</span>
                    <span className="text-black/70">{p.stock} units remaining</span>
                  </div>
                  <div className="text-small text-black/60 truncate">{p.name.en || p.name.fi}</div>
                </div>
              ))}
            </div>
          )}

          {/* New Orders */}
          {newOrders.length > 0 && (
            <div className="pt-3 space-y-2">
              <div className="flex items-center justify-between text-black font-medium">
                <span className="flex items-center gap-1.5">
                  <PackageCheck className="w-3.5 h-3.5" />
                  <span>New Customer Orders</span>
                </span>
                <button
                  onClick={() => {
                    onNavigateView('orders');
                    onClose();
                  }}
                  className="text-small uppercase text-black hover:opacity-60 underline underline-offset-2"
                >
                  View All
                </button>
              </div>
              {newOrders.map((o) => (
                <div key={o.id} className="p-2">
                  <div className="flex justify-between">
                    <span className="font-semibold text-black">{o.number}</span>
                    <span className="font-bold">{o.totals.total} €</span>
                  </div>
                  <div className="text-small text-black/60 truncate">{o.customer.name}</div>
                </div>
              ))}
            </div>
          )}

          {/* AI Insights */}
          {insights.length > 0 && (
            <div className="pt-3 space-y-2">
              <div className="flex items-center justify-between text-black font-medium">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Advisor Recommendations</span>
                </span>
                <button
                  onClick={() => {
                    onNavigateView('advisor');
                    onClose();
                  }}
                  className="text-small uppercase text-black hover:opacity-60 underline underline-offset-2"
                >
                  Explore
                </button>
              </div>
              {insights.slice(0, 2).map((ins) => (
                <div key={ins.id} className="p-2">
                  <div className="text-small uppercase font-semibold text-black/70">
                    [{ins.priority} Priority]
                  </div>
                  <div className="text-small font-semibold text-black mt-0.5 line-clamp-1">{ins.title}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
