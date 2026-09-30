import React, { useState } from 'react';
import { WaitlistEntry, Collection } from '../../types';
import { Download, Send, Check, Mail, Clock } from 'lucide-react';
import { useAuth } from '../../firebase/AuthContext';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { logAuditEvent } from '../../firebase/dbService';

interface AdminWaitlistViewProps {
  waitlist: WaitlistEntry[];
  collections: Collection[];
  onRefresh: () => void;
}

export const AdminWaitlistView: React.FC<AdminWaitlistViewProps> = ({ waitlist, collections, onRefresh }) => {
  const { isEditor, adminProfile } = useAuth();
  const [selectedDrop, setSelectedDrop] = useState<string>('all');
  const [invitedMap, setInvitedMap] = useState<Record<string, boolean>>({});

  const drops = collections.filter((c) => c.type === 'drop');

  const filteredEntries = waitlist.filter((w) => {
    if (selectedDrop !== 'all' && w.dropId !== selectedDrop) return false;
    return true;
  });

  const handleSendInvite = async (entry: WaitlistEntry) => {
    if (!isEditor) return;
    setInvitedMap((prev) => ({ ...prev, [entry.id]: true }));
    try {
      await updateDoc(doc(db, 'waitlist', entry.id), {
        invited: true,
        invitedAt: new Date().toISOString(),
      });
      await logAuditEvent(adminProfile?.name || 'admin', 'invite_waitlist', entry.id, {
        email: entry.email,
        dropId: entry.dropId,
      });
      onRefresh();
    } catch (err) {
      console.warn('Waitlist invite error:', err);
    }
  };

  const handleExportCSV = () => {
    const headers = ['Email', 'Drop ID', 'Source', 'Registered At', 'Invited'];
    const rows = filteredEntries.map((w) => [
      w.email,
      w.dropId,
      w.source,
      new Date(w.createdAt).toISOString(),
      w.invited || invitedMap[w.id] ? 'Yes' : 'No',
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csvContent));
    link.setAttribute('download', `zejesh_waitlist_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Title Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-black/10">
        <div>
          <h1 className="font-editorial text-3xl font-normal">Early Access Waitlist</h1>
          <p className="text-xs font-mono text-black/50 mt-0.5">
            Archival drop signups, VIP early purchasing links, and conversion tracking.
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          className="text-xs font-mono uppercase tracking-wider text-black hover:opacity-60 underline underline-offset-4 cursor-pointer flex items-center gap-1.5 font-semibold"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export Waitlist CSV</span>
        </button>
      </div>

      {/* Filter by Drop */}
      <div className="flex items-center gap-4 text-xs font-mono border-b border-black/[0.08] pb-2">
        <span className="text-black/50">Filter by Drop:</span>
        <button
          onClick={() => setSelectedDrop('all')}
          className={`uppercase tracking-wider transition-colors cursor-pointer py-1 ${
            selectedDrop === 'all' ? 'font-semibold text-black underline underline-offset-4' : 'text-black/50 hover:text-black'
          }`}
        >
          All Drops ({waitlist.length})
        </button>
        {drops.map((d) => (
          <button
            key={d.id}
            onClick={() => setSelectedDrop(d.id)}
            className={`uppercase tracking-wider transition-colors cursor-pointer py-1 ${
              selectedDrop === d.id ? 'font-semibold text-black underline underline-offset-4' : 'text-black/50 hover:text-black'
            }`}
          >
            {d.slug}
          </button>
        ))}
      </div>

      {/* Waitlist Table */}
      <div className="border border-black/[0.08] bg-white overflow-x-auto shadow-xs">
        <table className="w-full text-left border-collapse text-xs font-mono">
          <thead>
            <tr className="border-b border-black/[0.08] bg-black/[0.02] text-[10px] uppercase tracking-wider text-black/60 select-none">
              <th className="p-3">Subscriber Email</th>
              <th className="p-3 w-40">Target Drop</th>
              <th className="p-3 w-28">Source</th>
              <th className="p-3 w-36">Signed Up</th>
              <th className="p-3 w-28">Status</th>
              <th className="p-3 w-32 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/[0.06]">
            {filteredEntries.map((item) => {
              const isInvited = item.invited || invitedMap[item.id];
              return (
                <tr key={item.id} className="hover:bg-black/[0.015] transition-colors">
                  <td className="p-3 font-semibold text-black">{item.email}</td>
                  <td className="p-3 capitalize">{item.dropId}</td>
                  <td className="p-3 uppercase text-[10px] text-black/50">{item.source}</td>
                  <td className="p-3 text-[11px] text-black/60">
                    {new Date(item.createdAt).toLocaleDateString('en-US')}
                  </td>
                  <td className="p-3">
                    <span className="text-[10px] uppercase">
                      {isInvited ? '● Invited' : '○ Waiting'}
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    <button
                      onClick={() => handleSendInvite(item)}
                      disabled={isInvited}
                      className="text-xs uppercase hover:opacity-60 disabled:opacity-30 underline underline-offset-2 cursor-pointer font-semibold"
                    >
                      {isInvited ? 'Sent' : 'Send Invite'}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filteredEntries.length === 0 && (
          <div className="p-8 text-center text-xs font-mono text-black/40">
            No waitlist entries found for selected filter.
          </div>
        )}
      </div>
    </div>
  );
};
