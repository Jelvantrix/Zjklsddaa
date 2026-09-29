import React, { useState } from 'react';
import { Customer } from '../../types';
import { Search, Mail, ShoppingBag, Heart, User, Check, X } from 'lucide-react';

interface AdminCustomersViewProps {
  customers: Customer[];
}

export const AdminCustomersView: React.FC<AdminCustomersViewProps> = ({ customers }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [segmentFilter, setSegmentFilter] = useState<'all' | 'vip' | 'returning' | 'new' | 'wishlisters'>('all');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(customers[0] || null);

  const filteredCustomers = customers.filter((c) => {
    if (segmentFilter === 'vip' && c.totals.spend < 1000) return false;
    if (segmentFilter === 'returning' && c.totals.orders <= 1) return false;
    if (segmentFilter === 'new' && c.totals.orders > 1) return false;
    if (segmentFilter === 'wishlisters' && (!c.wishlist || c.wishlist.length === 0)) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Title Bar */}
      <div className="pb-4 border-b border-black/10">
        <h1 className="font-editorial text-3xl font-normal">Customer Directory & CRM</h1>
        <p className="text-xs font-mono text-black/50 mt-0.5">
          Archival patron profiles, lifetime valuation, order cadence, and privacy consent.
        </p>
      </div>

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
            <div className="p-8 text-center text-xs font-mono text-black/40">No customers found.</div>
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
                    <span className="font-semibold">{cust.totals.spend} €</span>
                  </div>
                  <div className="text-black/60 text-[11px] truncate">{cust.email}</div>
                  <div className="text-[10.5px] text-black/40 mt-1 flex justify-between">
                    <span>{cust.totals.orders} orders placed</span>
                    <span>Wishlist: {cust.wishlist?.length || 0} items</span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right Column: Customer Profile Dossier */}
        {selectedCustomer && (
          <div className="lg:col-span-6 border border-black/[0.08] bg-white p-6 space-y-6 font-mono text-xs">
            <div className="border-b border-black/[0.08] pb-4">
              <span className="text-[10px] uppercase text-black/50 tracking-wider">Patron Dossier</span>
              <h2 className="font-editorial text-2xl font-normal text-black mt-0.5">{selectedCustomer.name}</h2>
              <div className="text-black/60 text-xs mt-1">{selectedCustomer.email}</div>
            </div>

            {/* Lifetime KPIs */}
            <div className="grid grid-cols-2 gap-4 py-3 border-y border-black/[0.08]">
              <div>
                <span className="text-[10px] uppercase text-black/50 block mb-0.5">Lifetime Spend</span>
                <span className="text-xl font-semibold text-black">{selectedCustomer.totals.spend} €</span>
              </div>
              <div>
                <span className="text-[10px] uppercase text-black/50 block mb-0.5">Completed Orders</span>
                <span className="text-xl font-semibold text-black">{selectedCustomer.totals.orders}</span>
              </div>
            </div>

            {/* Timeline Milestones */}
            <div className="space-y-2 text-[11px]">
              <div className="flex justify-between">
                <span className="text-black/50">First acquired:</span>
                <span>{new Date(selectedCustomer.firstSeen).toLocaleDateString('en-US')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-black/50">Last active:</span>
                <span>{new Date(selectedCustomer.lastSeen).toLocaleDateString('en-US')}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-black/50">Marketing consent:</span>
                <span className="font-semibold">
                  {selectedCustomer.marketingConsent ? 'Granted (GDPR)' : 'Opted Out'}
                </span>
              </div>
            </div>

            {/* Wishlist Curations */}
            <div className="space-y-2 pt-2 border-t border-black/[0.08]">
              <span className="text-[10px] uppercase text-black/50 tracking-wider">
                Saved Wishlist Items ({selectedCustomer.wishlist?.length || 0})
              </span>
              <div className="flex flex-wrap gap-2 pt-1">
                {(selectedCustomer.wishlist || []).map((wId) => (
                  <span key={wId} className="px-2 py-0.5 text-[10px] border border-black/20 text-black">
                    {wId}
                  </span>
                ))}
                {(!selectedCustomer.wishlist || selectedCustomer.wishlist.length === 0) && (
                  <span className="text-black/40 text-[11px]">No items currently saved.</span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
