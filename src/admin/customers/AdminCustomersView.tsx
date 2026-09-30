import React, { useState } from 'react';
import { Customer } from '../../types';
import { Search, Mail, ShoppingBag, Heart, User, Check, X, Users, Plus } from 'lucide-react';

interface AdminCustomersViewProps {
  customers: Customer[];
}

export const AdminCustomersView: React.FC<AdminCustomersViewProps> = ({ customers }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [segmentFilter, setSegmentFilter] = useState<'all' | 'vip' | 'returning' | 'new' | 'wishlisters'>('all');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(customers[0] || null);

  // Keep selectedCustomer in sync
  React.useEffect(() => {
    if (!selectedCustomer && customers.length > 0) {
      setSelectedCustomer(customers[0]);
    } else if (selectedCustomer && !customers.some((c) => c.id === selectedCustomer.id)) {
      setSelectedCustomer(customers[0] || null);
    }
  }, [customers, selectedCustomer]);

  const filteredCustomers = customers.filter((c) => {
    if (segmentFilter === 'vip' && (c.totals?.spend || 0) < 1000) return false;
    if (segmentFilter === 'returning' && (c.totals?.orders || 0) <= 1) return false;
    if (segmentFilter === 'new' && (c.totals?.orders || 0) > 1) return false;
    if (segmentFilter === 'wishlisters' && (!c.wishlist || c.wishlist.length === 0)) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (c.name || '').toLowerCase().includes(q) || (c.email || '').toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Title Bar */}
      <div className="pb-4 border-b border-black/10">
        <h1 className="font-editorial text-3xl font-normal">Customer Directory & CRM</h1>
        <p className="text-xs font-mono text-black/50 mt-0.5">
          Archival patron profiles, lifetime valuation, verified order cadence, and privacy consent.
        </p>
      </div>

      {customers.length === 0 ? (
        <div className="p-12 border border-black/[0.08] bg-white text-center space-y-4 font-mono">
          <div className="w-12 h-12 border border-black/15 mx-auto flex items-center justify-center text-black/40">
            <Users className="w-6 h-6 stroke-[1.5]" />
          </div>
          <div>
            <h3 className="font-editorial text-2xl font-normal text-black mb-1">No Customer Profiles Recorded Yet</h3>
            <p className="text-xs text-black/50 max-w-md mx-auto">
              Real customer profiles will be automatically created and enriched here as shoppers complete checkout or create accounts.
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Segment filters */}
          <div className="flex flex-wrap gap-4 text-xs font-mono border-b border-black/[0.08] pb-2">
            {[
              { id: 'all', label: `All Patrons (${customers.length})` },
              { id: 'vip', label: 'VIP (> 1,000 € spend)' },
              { id: 'returning', label: 'Repeat Collectors' },
              { id: 'new', label: 'First-Time' },
              { id: 'wishlisters', label: 'Wishlisters' },
            ].map((seg) => (
              <button
                key={seg.id}
                type="button"
                onClick={() => setSegmentFilter(seg.id as any)}
                className={`uppercase tracking-wider transition-colors cursor-pointer py-1 ${
                  segmentFilter === seg.id
                    ? 'font-semibold text-black underline underline-offset-4'
                    : 'text-black/50 hover:text-black'
                }`}
              >
                {seg.label}
              </button>
            ))}
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-black/40" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by customer name or email..."
              className="w-full pl-8 pr-3 py-1.5 border-b border-black/20 focus:border-black bg-transparent focus:outline-none text-xs font-mono"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Customer Table */}
            <div className="lg:col-span-6 border border-black/[0.08] bg-white divide-y divide-black/[0.06] overflow-y-auto max-h-[700px]">
              {filteredCustomers.length === 0 ? (
                <div className="p-8 text-center text-xs font-mono text-black/40">No customers match criteria.</div>
              ) : (
                filteredCustomers.map((cust) => {
                  const isSelected = selectedCustomer?.id === cust.id;
                  return (
                    <div
                      key={cust.id}
                      onClick={() => setSelectedCustomer(cust)}
                      className={`p-4 transition-colors cursor-pointer text-xs font-mono ${
                        isSelected ? 'bg-black/[0.03] border-l-2 border-black' : 'hover:bg-black/[0.015]'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-black">{cust.name}</span>
                        <span className="font-semibold">{cust.totals?.spend || 0} €</span>
                      </div>
                      <div className="text-black/60 text-[11px] truncate">{cust.email}</div>
                      <div className="text-[10.5px] text-black/40 mt-1 flex justify-between">
                        <span>{cust.totals?.orders || 0} orders placed</span>
                        <span>Wishlist: {cust.wishlist?.length || 0} items</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Right Column: Customer Dossier */}
            {selectedCustomer && (
              <div className="lg:col-span-6 border border-black/[0.08] bg-white p-6 space-y-6 font-mono text-xs">
                <div className="border-b border-black/[0.08] pb-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase text-black/50 tracking-wider">Patron Dossier</span>
                    <span className="text-[10px] px-2 py-0.5 border border-black/20 uppercase tracking-widest">
                      {(selectedCustomer.totals?.spend || 0) >= 1000 ? 'VIP Patron' : 'Standard'}
                    </span>
                  </div>
                  <h2 className="font-editorial text-2xl font-normal text-black mt-1">{selectedCustomer.name}</h2>
                  <div className="text-black/50 text-[11px] flex items-center gap-1.5 mt-1">
                    <Mail className="w-3 h-3" />
                    <span>{selectedCustomer.email}</span>
                  </div>
                </div>

                {/* Key Metrics */}
                <div className="grid grid-cols-2 gap-4 p-4 border border-black/[0.08] bg-black/[0.01]">
                  <div>
                    <span className="text-[10px] uppercase text-black/40 block">Lifetime Valuation</span>
                    <span className="text-xl font-editorial font-normal">{selectedCustomer.totals?.spend || 0} €</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase text-black/40 block">Orders Completed</span>
                    <span className="text-xl font-editorial font-normal">{selectedCustomer.totals?.orders || 0}</span>
                  </div>
                </div>

                {/* Timestamps */}
                <div className="space-y-2 border-b border-black/[0.08] pb-4 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-black/50">First Interaction:</span>
                    <span>{new Date(selectedCustomer.firstSeen).toLocaleDateString('en-US')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-black/50">Latest Activity:</span>
                    <span>{new Date(selectedCustomer.lastSeen).toLocaleDateString('en-US')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-black/50">GDPR Marketing Consent:</span>
                    <span className="text-emerald-700 font-semibold">Granted</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
