import React, { useState } from 'react';
import { Order, OrderStatus } from '../../types';
import { Search, Printer, FileText, CheckCircle, RefreshCw, Truck, ArrowRight, X, Clock } from 'lucide-react';
import { useAuth } from '../../firebase/AuthContext';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { logAuditEvent } from '../../firebase/dbService';

interface AdminOrdersViewProps {
  orders: Order[];
  onRefresh: () => void;
}

export const AdminOrdersView: React.FC<AdminOrdersViewProps> = ({ orders, onRefresh }) => {
  const { isEditor, adminProfile } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | OrderStatus>('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(orders[0] || null);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [internalNote, setInternalNote] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const filteredOrders = orders.filter((o) => {
    if (statusFilter !== 'all' && o.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchNum = o.number.toLowerCase().includes(q);
      const matchCust = o.customer.name.toLowerCase().includes(q) || o.customer.email.toLowerCase().includes(q);
      if (!matchNum && !matchCust) return false;
    }
    return true;
  });

  const handleUpdateStatus = async (newStatus: OrderStatus) => {
    if (!isEditor || !selectedOrder) return;
    setIsUpdating(true);
    try {
      const newTimelineItem = {
        at: new Date().toISOString(),
        status: newStatus,
        by: adminProfile?.name || 'admin',
        note: `Status updated to ${newStatus}`,
      };

      const updatedTimeline = [...(selectedOrder.timeline || []), newTimelineItem];

      await updateDoc(doc(db, 'orders', selectedOrder.id), {
        status: newStatus,
        timeline: updatedTimeline,
        updatedAt: new Date().toISOString(),
      });

      await logAuditEvent(adminProfile?.name || 'admin', 'update_order_status', selectedOrder.id, {
        previous: selectedOrder.status,
        next: newStatus,
      });

      setSelectedOrder({
        ...selectedOrder,
        status: newStatus,
        timeline: updatedTimeline,
      });

      onRefresh();
    } catch (err) {
      console.warn('Order status update failed:', err);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSaveTracking = async () => {
    if (!isEditor || !selectedOrder || !trackingNumber.trim()) return;
    try {
      await updateDoc(doc(db, 'orders', selectedOrder.id), {
        tracking: trackingNumber,
        updatedAt: new Date().toISOString(),
      });
      setSelectedOrder({ ...selectedOrder, tracking: trackingNumber });
      setTrackingNumber('');
      onRefresh();
    } catch (err) {
      console.warn('Tracking save failed:', err);
    }
  };

  const handleAddNote = async () => {
    if (!isEditor || !selectedOrder || !internalNote.trim()) return;
    try {
      const newTimelineItem = {
        at: new Date().toISOString(),
        status: selectedOrder.status,
        by: adminProfile?.name || 'admin',
        note: internalNote,
      };
      const updatedTimeline = [...(selectedOrder.timeline || []), newTimelineItem];
      await updateDoc(doc(db, 'orders', selectedOrder.id), {
        timeline: updatedTimeline,
        notes: internalNote,
        updatedAt: new Date().toISOString(),
      });
      setSelectedOrder({ ...selectedOrder, timeline: updatedTimeline, notes: internalNote });
      setInternalNote('');
      onRefresh();
    } catch (err) {
      console.warn('Note save failed:', err);
    }
  };

  const printDocument = (type: 'packing' | 'invoice') => {
    window.print();
  };

  // Status indicator style strictly black & white (filled vs outlined vs dashed)
  const renderStatusBadge = (st: OrderStatus) => {
    switch (st) {
      case 'paid':
      case 'delivered':
        return <span className="text-[10px] font-mono uppercase tracking-wider text-black font-semibold">● {st}</span>;
      case 'packed':
      case 'shipped':
        return <span className="text-[10px] font-mono uppercase tracking-wider text-black">◐ {st}</span>;
      case 'new':
        return <span className="text-[10px] font-mono uppercase tracking-wider text-black/70">○ {st}</span>;
      case 'cancelled':
      case 'refunded':
        return <span className="text-[10px] font-mono uppercase tracking-wider text-black/40 line-through">{st}</span>;
      default:
        return <span className="text-[10px] font-mono uppercase tracking-wider">{st}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Title Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-black/10">
        <div>
          <h1 className="font-editorial text-3xl font-normal">Customer Orders</h1>
          <p className="text-xs font-mono text-black/50 mt-0.5">
            Fulfillment pipeline, atomic inventory allocation, invoices, and timeline audit.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => printDocument('invoice')}
            className="text-xs font-mono uppercase tracking-wider text-black hover:opacity-60 underline underline-offset-4 cursor-pointer flex items-center gap-1.5"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Slip</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 border-b border-black/[0.08] text-xs font-mono">
        <div className="relative sm:col-span-2">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-black/40" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search order number or customer name/email..."
            className="w-full pl-8 pr-3 py-1.5 border-b border-black/20 focus:border-black bg-transparent focus:outline-none"
          />
        </div>

        <div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="w-full px-2.5 py-1.5 border-b border-black/20 focus:border-black bg-transparent focus:outline-none cursor-pointer"
          >
            <option value="all">All statuses ({orders.length})</option>
            <option value="new">New</option>
            <option value="paid">Paid</option>
            <option value="packed">Packed</option>
            <option value="shipped">Shipped</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
            <option value="refunded">Refunded</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Order List */}
        <div className="lg:col-span-5 border border-black/[0.08] bg-white divide-y divide-black/[0.06] overflow-y-auto max-h-[700px]">
          {filteredOrders.length === 0 ? (
            <div className="p-8 text-center text-xs font-mono text-black/40">No orders match criteria.</div>
          ) : (
            filteredOrders.map((ord) => {
              const isSelected = selectedOrder?.id === ord.id;
              return (
                <div
                  key={ord.id}
                  onClick={() => setSelectedOrder(ord)}
                  className={`p-4 transition-colors cursor-pointer text-xs font-mono ${
                    isSelected ? 'bg-black/[0.03] border-l-2 border-black' : 'hover:bg-black/[0.015]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-black">{ord.number}</span>
                    {renderStatusBadge(ord.status)}
                  </div>
                  <div className="text-black/80 font-medium">{ord.customer.name}</div>
                  <div className="text-[11px] text-black/50 mt-1 flex justify-between">
                    <span>{ord.items.length} items</span>
                    <span className="font-semibold text-black">{ord.totals.total} €</span>
                  </div>
                  <div className="text-[10px] text-black/40 mt-1">
                    {new Date(ord.createdAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right Column: Order Detail & Timeline */}
        {selectedOrder && (
          <div className="lg:col-span-7 border border-black/[0.08] bg-white p-6 space-y-6 font-mono text-xs">
            {/* Order Header */}
            <div className="flex items-start justify-between border-b border-black/[0.08] pb-4">
              <div>
                <span className="text-[10px] uppercase text-black/50 tracking-wider">Order Details</span>
                <h2 className="font-editorial text-2xl font-normal text-black mt-0.5">{selectedOrder.number}</h2>
                <div className="text-black/50 text-[11px] mt-1">
                  Placed on {new Date(selectedOrder.createdAt).toLocaleString('en-US')}
                </div>
              </div>

              <div className="text-right">
                <div className="text-sm font-semibold">{selectedOrder.totals.total} €</div>
                <div className="mt-1">{renderStatusBadge(selectedOrder.status)}</div>
              </div>
            </div>

            {/* Status Transition Pipeline */}
            <div className="space-y-2">
              <span className="text-[10px] uppercase text-black/50 tracking-wider">Update Order State</span>
              <div className="flex flex-wrap gap-4 text-xs pt-1">
                {['paid', 'packed', 'shipped', 'delivered', 'cancelled'].map((targetStatus) => (
                  <button
                    key={targetStatus}
                    onClick={() => handleUpdateStatus(targetStatus as OrderStatus)}
                    disabled={isUpdating || selectedOrder.status === targetStatus}
                    className={`uppercase tracking-wider transition-opacity cursor-pointer ${
                      selectedOrder.status === targetStatus
                        ? 'font-bold underline underline-offset-4 text-black'
                        : 'text-black/60 hover:text-black underline underline-offset-2'
                    }`}
                  >
                    Mark {targetStatus}
                  </button>
                ))}
              </div>
            </div>

            {/* Customer & Shipping Info */}
            <div className="grid grid-cols-2 gap-4 py-3 border-y border-black/[0.08]">
              <div>
                <span className="text-[10px] uppercase text-black/50 block mb-1">Customer</span>
                <div className="font-semibold text-black">{selectedOrder.customer.name}</div>
                <div className="text-black/60">{selectedOrder.customer.email}</div>
                <div className="text-black/60">{selectedOrder.customer.phone || 'No phone'}</div>
              </div>
              <div>
                <span className="text-[10px] uppercase text-black/50 block mb-1">Shipping Method</span>
                <div className="font-semibold">{selectedOrder.shippingMethod}</div>
                <div className="text-black/60">{selectedOrder.customer.address?.street}</div>
                <div className="text-black/60">
                  {selectedOrder.customer.address?.postalCode} {selectedOrder.customer.address?.city}
                </div>
              </div>
            </div>

            {/* Purchased Items */}
            <div className="space-y-2">
              <span className="text-[10px] uppercase text-black/50 tracking-wider">Garments in Order</span>
              <div className="divide-y divide-black/[0.06] border border-black/[0.08]">
                {selectedOrder.items.map((item, idx) => (
                  <div key={idx} className="p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-black/60">{item.productNr}</span>
                      <span className="font-sans font-medium">{item.productName}</span>
                      <span className="text-[10.5px] text-black/50">Size: {item.size}</span>
                      <span className="text-[10.5px] text-black/50">Qty: {item.quantity}</span>
                    </div>
                    <div className="font-semibold">{item.price * item.quantity} €</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Tracking Code Input */}
            <div className="space-y-1">
              <span className="text-[10px] uppercase text-black/50 tracking-wider">Tracking Number</span>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  placeholder={selectedOrder.tracking || 'Enter carrier tracking code...'}
                  className="flex-1 px-2.5 py-1.5 border-b border-black/30 focus:border-black bg-transparent focus:outline-none text-xs"
                />
                <button
                  onClick={handleSaveTracking}
                  className="text-xs uppercase tracking-wider underline underline-offset-4 hover:opacity-60 cursor-pointer font-semibold"
                >
                  Save Code
                </button>
              </div>
            </div>

            {/* Order Timeline Log */}
            <div className="space-y-2">
              <span className="text-[10px] uppercase text-black/50 tracking-wider">Fulfillment Timeline</span>
              <div className="space-y-2 border-l border-black/15 pl-3 ml-1 text-[11px]">
                {(selectedOrder.timeline || []).map((tl, i) => (
                  <div key={i} className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold uppercase">{tl.status}</span>
                      <span className="text-[10px] text-black/40">{new Date(tl.at).toLocaleString('en-US')}</span>
                      {tl.by && <span className="text-[10px] text-black/50">({tl.by})</span>}
                    </div>
                    {tl.note && <div className="text-black/70 pl-2">{tl.note}</div>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
