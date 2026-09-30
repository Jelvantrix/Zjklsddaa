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
  onRefresh?: () => void;
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
      if (onRefresh) onRefresh();
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
    <div className="space-y-6 font-mono text-xs">
      {/* Title Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-black/10">
        <div>
          <h1 className="font-editorial text-3xl font-normal text-black">Private Waitlists & Drop Registrations</h1>
          <p className="text-xs text-black/50 mt-0.5">
            Pre-launch drop waitlists, early access pass dispatch, and subscriber export.
          </p>
        </div>

        {waitlist.length > 0 && (
          <button
            type="button"
            onClick={handleExportCSV}
            className="px-3 py-1.5 border border-black text-black hover:bg-black hover:text-white transition-colors flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        )}
      </div>

      {waitlist.length === 0 ? (
        <div className="p-12 border border-black/[0.08] bg-white text-center space-y-4">
          <div className="w-12 h-12 border border-black/15 mx-auto flex items-center justify-center text-black/40">
            <Clock className="w-6 h-6 stroke-[1.5]" />
          </div>
          <div>
            <h3 className="font-editorial text-2xl font-normal text-black mb-1">No Waitlist Subscribers Yet</h3>
            <p className="text-xs text-black/50 max-w-md mx-auto">
              Drop invitations and waitlist signups submitted through the storefront will sync directly to this table.
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Drop Filter */}
          <div className="flex gap-4 border-b border-black/[0.08] pb-2">
            <button
              type="button"
              onClick={() => setSelectedDrop('all')}
              className={`uppercase tracking-wider transition-colors cursor-pointer ${
                selectedDrop === 'all' ? 'font-semibold text-black underline underline-offset-4' : 'text-black/50 hover:text-black'
              }`}
            >
              All Drops ({waitlist.length})
            </button>
            {drops.map((drop) => (
              <button
                key={drop.id}
                type="button"
                onClick={() => setSelectedDrop(drop.id)}
                className={`uppercase tracking-wider transition-colors cursor-pointer ${
                  selectedDrop === drop.id
                    ? 'font-semibold text-black underline underline-offset-4'
                    : 'text-black/50 hover:text-black'
                }`}
              >
                {typeof drop.name === 'string' ? drop.name : drop.name.en}
              </button>
            ))}
          </div>

          {/* Table */}
          <div className="border border-black/[0.08] bg-white overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-black/[0.08] bg-black/[0.02] text-[10.5px] uppercase tracking-wider text-black/60">
                  <th className="p-3">Subscriber Email</th>
                  <th className="p-3">Target Drop</th>
                  <th className="p-3">Source</th>
                  <th className="p-3">Registered At</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[0.06]">
                {filteredEntries.map((w) => {
                  const isInvited = w.invited || invitedMap[w.id];
                  const dropObj = collections.find((c) => c.id === w.dropId);
                  const dropTitle = dropObj ? (typeof dropObj.name === 'string' ? dropObj.name : dropObj.name.en) : w.dropId;

                  return (
                    <tr key={w.id} className="hover:bg-black/[0.015] transition-colors">
                      <td className="p-3 font-medium text-black">{w.email}</td>
                      <td className="p-3 text-black/70">{dropTitle}</td>
                      <td className="p-3 text-black/50 text-[11px]">{w.source || 'Storefront'}</td>
                      <td className="p-3 text-black/50 text-[11px]">
                        {new Date(w.createdAt).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="p-3">
                        {isInvited ? (
                          <span className="inline-flex items-center gap-1 text-[10.5px] text-emerald-700 font-semibold">
                            <Check className="w-3 h-3" />
                            <span>Invited</span>
                          </span>
                        ) : (
                          <span className="text-[10.5px] text-black/50">Pending</span>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        {!isInvited && (
                          <button
                            type="button"
                            onClick={() => handleSendInvite(w)}
                            disabled={!isEditor}
                            className="px-2.5 py-1 text-[10.5px] uppercase tracking-wider border border-black/20 hover:border-black transition-colors cursor-pointer inline-flex items-center gap-1.5"
                          >
                            <Send className="w-3 h-3" />
                            <span>Send Pass</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};
