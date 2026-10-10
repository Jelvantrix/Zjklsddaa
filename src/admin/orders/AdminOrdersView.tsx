import React, { useState } from 'react';
import { Order, OrderStatus } from '../../types';
import { Search, Printer, FileText, CheckCircle, RefreshCw, Truck, ArrowRight, X, Clock, ShoppingBag } from 'lucide-react';
import { useAuth } from '../../supabase/AuthContext';
import { supabase } from '../../supabase/config';
import { logAuditEvent } from '../../supabase/dbService';

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

  // Sync selected order if list changes
  React.useEffect(() => {
    if (!selectedOrder && orders.length > 0) {
      setSelectedOrder(orders[0]);
    } else if (selectedOrder && !orders.some((o) => o.id === selectedOrder.id)) {
      setSelectedOrder(orders[0] || null);
    }
  }, [orders, selectedOrder]);

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
        by: adminProfile?.name || 'Huxaifa Official',
        note: `Status updated to ${newStatus}`,
      };

      const updatedTimeline = [...(selectedOrder.timeline || []), newTimelineItem];

      const { error } = await supabase
        .from('orders')
        .update({
          status: newStatus,
          timeline: updatedTimeline,
          updatedAt: new Date().toISOString(),
        })
        .eq('id', selectedOrder.id);
      if (error) throw error;

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
      const { error } = await supabase
        .from('orders')
        .update({
          tracking: trackingNumber,
          updatedAt: new Date().toISOString(),
        })
        .eq('id', selectedOrder.id);
      if (error) throw error;
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
        by: adminProfile?.name || 'Huxaifa Official',
        note: internalNote,
      };
      const updatedTimeline = [...(selectedOrder.timeline || []), newTimelineItem];
      const { error } = await supabase
        .from('orders')
        .update({
          timeline: updatedTimeline,
          notes: internalNote,
          updatedAt: new Date().toISOString(),
        })
        .eq('id', selectedOrder.id);
      if (error) throw error;
      setSelectedOrder({ ...selectedOrder, timeline: updatedTimeline, notes: internalNote });
      setInternalNote('');
      onRefresh();
    } catch (err) {
      console.warn('Note save failed:', err);
    }
  };

  const printDocument = () => {
    window.print();
  };

  const renderStatusBadge = (st: OrderStatus) => {
    switch (st) {
      case 'paid':
      case 'delivered':
        return <span className="text-small uppercase tracking-wider text-black font-semibold">● {st}</span>;
      case 'packed':
      case 'shipped':
        return <span className="text-small uppercase tracking-wider text-black">◐ {st}</span>;
      case 'new':
        return <span className="text-small uppercase tracking-wider text-black/70">○ {st}</span>;
      case 'cancelled':
      case 'refunded':
        return <span className="text-small uppercase tracking-wider text-black/40 line-through">{st}</span>;
      default:
        return <span className="text-small uppercase tracking-wider">{st}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Title Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4">
        <div>
          <h1 className="font-serif text-display font-normal text-black">Real Customer Orders</h1>
          <p className="text-small text-black/50 mt-0.5">
            Verified checkout orders, fulfillment status, dispatch tracking, and audit trail.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {selectedOrder && (
            <button
              type="button"
              onClick={printDocument}
              className="px-3 py-1.5 text-small flex items-center gap-1.5 cursor-pointer hover:text-white transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Slip</span>
            </button>
          )}
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="p-12 bg-white text-center space-y-4">
          <div className="w-12 h-12 mx-auto flex items-center justify-center text-black/40">
            <ShoppingBag className="w-6 h-6 stroke-[1.5]" />
          </div>
          <div>
            <h3 className="font-serif text-title font-normal text-black mb-1">No Customer Orders Yet</h3>
            <p className="text-small text-black/50 max-w-md mx-auto">
              Real customer orders placed through the storefront checkout will immediately sync here in real-time.
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Filter and Search Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 text-small bg-white">
            <div className="relative sm:col-span-2">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-black/40" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search order number or customer name/email..."
                className="w-full pl-8 pr-3 py-1.5 bg-transparent"
              />
            </div>

            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="w-full px-2.5 py-1.5 bg-transparent cursor-pointer"
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

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-4">
            {/* Left Column: Order List */}
            <div className="lg:col-span-5 overflow-y-auto max-h-[700px]">
              {filteredOrders.length === 0 ? (
                <div className="p-8 text-center text-small text-black/40">No orders match criteria.</div>
              ) : (
                filteredOrders.map((ord) => {
                  const isSelected = selectedOrder?.id === ord.id;
                  return (
                    <div
                      key={ord.id}
                      onClick={() => setSelectedOrder(ord)}
                      className={`p-4 transition-colors cursor-pointer text-small ${ isSelected ?'' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-black">{ord.number}</span>
                        {renderStatusBadge(ord.status)}
                      </div>
                      <div className="text-black/80 font-medium">{ord.customer.name}</div>
                      <div className="text-small text-black/50 mt-1 flex justify-between">
                        <span>{ord.items.length} items</span>
                        <span className="font-semibold text-black">{ord.totals.total} €</span>
                      </div>
                      <div className="text-small text-black/40 mt-1">
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
              <div className="lg:col-span-7 space-y-6 text-small">
                {/* Order Header */}
                <div className="flex items-start justify-between pb-4">
                  <div>
                    <span className="text-small uppercase text-black/50 tracking-wider">Order Details</span>
                    <h2 className="font-serif text-title font-normal text-black mt-0.5">{selectedOrder.number}</h2>
                    <div className="text-black/50 text-small mt-1">
                      Placed on {new Date(selectedOrder.createdAt).toLocaleString('en-US')}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-small font-semibold">{selectedOrder.totals.total} €</div>
                    <div className="mt-1">{renderStatusBadge(selectedOrder.status)}</div>
                  </div>
                </div>

                {/* Status Switcher */}
                <div>
                  <div className="text-small uppercase text-black/50 tracking-wider mb-2">Update Fulfillment Status</div>
                  <div className="flex flex-wrap gap-2">
                    {(['new', 'paid', 'packed', 'shipped', 'delivered', 'cancelled', 'refunded'] as OrderStatus[]).map(
                      (st) => (
                        <button
                          key={st}
                          type="button"
                          onClick={() => handleUpdateStatus(st)}
                          disabled={isUpdating || selectedOrder.status === st}
                          className={`px-3 py-1 text-small uppercase tracking-wider transition-colors cursor-pointer ${ selectedOrder.status === st ?'text-white font-semibold'
                              : 'text-black/80'
                          }`}
                        >
                          {st}
                        </button>
                      )
                    )}
                  </div>
                </div>

                {/* Tracking Number */}
                <div className="py-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-small uppercase text-black/60 tracking-wider flex items-center gap-1.5">
                      <Truck className="w-3.5 h-3.5" />
                      <span>Tracking & Dispatch</span>
                    </span>
                    {selectedOrder.tracking && (
                      <span className="font-semibold text-black">{selectedOrder.tracking}</span>
                    )}
                  </div>

                  <div className="flex gap-4">
                    <input
                      type="text"
                      value={trackingNumber}
                      onChange={(e) => setTrackingNumber(e.target.value)}
                      placeholder={selectedOrder.tracking ? 'Update tracking code...' : 'Enter carrier tracking code...'}
                      className="flex-1 py-1.5 bg-transparent text-small"
                    />
                    <button
                      type="button"
                      onClick={handleSaveTracking}
                      className="py-1.5 px-4 text-white text-small uppercase tracking-wider cursor-pointer"
                    >
                      Save
                    </button>
                  </div>
                </div>

                {/* Customer and Shipping Details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 py-2">
                  <div>
                    <span className="text-small uppercase text-black/40 block mb-1">Customer Info</span>
                    <div className="font-semibold text-black">{selectedOrder.customer.name}</div>
                    <div className="text-black/70">{selectedOrder.customer.email}</div>
                    {selectedOrder.customer.phone && <div className="text-black/60">{selectedOrder.customer.phone}</div>}
                  </div>

                  <div>
                    <span className="text-small uppercase text-black/40 block mb-1">Delivery Address</span>
                    {selectedOrder.customer.address ? (
                      <div className="text-black/80 space-y-0.5">
                        <div>{selectedOrder.customer.address.street}</div>
                        <div>
                          {selectedOrder.customer.address.postalCode} {selectedOrder.customer.address.city}
                        </div>
                        <div>{selectedOrder.customer.address.country}</div>
                      </div>
                    ) : (
                      <div className="text-black/40 italic">Digital / In-store collection</div>
                    )}
                  </div>
                </div>

                {/* Items Table */}
                <div className="space-y-2 pt-2">
                  <div className="text-small uppercase text-black/50 tracking-wider mb-2">Order Line Items</div>
                  <div className="">
                    {selectedOrder.items.map((item, idx) => (
                      <div key={idx} className="p-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-black/40 text-small">{item.productNr}</span>
                          <div>
                            <div className="font-medium text-black">{item.productName}</div>
                            <div className="text-black/50 text-small">Size: {item.size} · Qty: {item.quantity}</div>
                          </div>
                        </div>
                        <span className="font-medium text-black">{item.price * item.quantity} €</span>
                      </div>
                    ))}
                  </div>

                  <div className="pt-3 mt-3 space-y-1 text-right text-small">
                    <div className="text-black/60">Subtotal: {selectedOrder.totals.subtotal} €</div>
                    <div className="text-black/60">Shipping: {selectedOrder.totals.shipping} €</div>
                    <div className="text-small font-semibold text-black">Total: {selectedOrder.totals.total} €</div>
                  </div>
                </div>

                {/* Order Timeline */}
                <div>
                  <div className="text-small uppercase text-black/50 tracking-wider mb-2">Timeline Audit</div>
                  <div className="space-y-2 pl-4 ml-2">
                    {(selectedOrder.timeline || []).map((tl, i) => (
                      <div key={i} className="relative">
                        <span className="w-2 h-2 absolute -left-[21px] top-1.5" />
                        <div className="flex items-center justify-between">
                          <span className="font-medium uppercase text-small">{tl.status}</span>
                          <span className="text-small text-black/40">
                            {new Date(tl.at).toLocaleString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                        {tl.note && <div className="text-small text-black/70 mt-0.5">{tl.note}</div>}
                        {tl.by && <div className="text-small text-black/40">by {tl.by}</div>}
                      </div>
                    ))}
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
