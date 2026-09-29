import React, { useState } from 'react';
import { Category } from '../../types';
import { FolderTree, Eye, EyeOff, Plus, Edit2, Trash2, Check, X, CornerDownRight } from 'lucide-react';
import { useAuth } from '../../firebase/AuthContext';
import { doc, updateDoc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { logAuditEvent } from '../../firebase/dbService';

interface AdminCategoriesViewProps {
  categories: Category[];
  onRefresh: () => void;
}

export const AdminCategoriesView: React.FC<AdminCategoriesViewProps> = ({
  categories,
  onRefresh,
}) => {
  const { isEditor, adminProfile } = useAuth();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNameFi, setEditNameFi] = useState('');
  const [editNameEn, setEditNameEn] = useState('');
  const [newSubcatParent, setNewSubcatParent] = useState<string | null>(null);
  const [newSubcatNameFi, setNewSubcatNameFi] = useState('');
  const [newSubcatNameEn, setNewSubcatNameEn] = useState('');

  // Parent categories (no parentId)
  const parents = categories.filter((c) => !c.parentId);

  const toggleVisibility = async (cat: Category) => {
    if (!isEditor) return;
    try {
      await updateDoc(doc(db, 'categories', cat.id), { visible: !cat.visible });
      await logAuditEvent(adminProfile?.name || 'admin', 'toggle_category_visibility', cat.id, {
        visible: !cat.visible,
      });
      onRefresh();
    } catch (err) {
      console.warn('Failed toggling visibility:', err);
    }
  };

  const handleSaveEdit = async (catId: string) => {
    if (!isEditor) return;
    try {
      await updateDoc(doc(db, 'categories', catId), {
        name: { fi: editNameFi, en: editNameEn },
      });
      await logAuditEvent(adminProfile?.name || 'admin', 'rename_category', catId, {
        fi: editNameFi,
        en: editNameEn,
      });
      setEditingId(null);
      onRefresh();
    } catch (err) {
      console.warn('Failed editing category:', err);
    }
  };

  const handleCreateSubcategory = async (parentId: string) => {
    if (!isEditor || !newSubcatNameFi.trim()) return;
    try {
      const slug = newSubcatNameEn.toLowerCase().replace(/\s+/g, '-') || newSubcatNameFi.toLowerCase().replace(/\s+/g, '-');
      const id = `cat-${slug}-${Date.now().toString(36)}`;
      const newCat: Category = {
        id,
        parentId,
        name: { fi: newSubcatNameFi, en: newSubcatNameEn || newSubcatNameFi },
        slug,
        order: 99,
        visible: true,
      };
      await setDoc(doc(db, 'categories', id), newCat);
      await logAuditEvent(adminProfile?.name || 'admin', 'create_subcategory', id, { parentId });
      setNewSubcatParent(null);
      setNewSubcatNameFi('');
      setNewSubcatNameEn('');
      onRefresh();
    } catch (err) {
      console.warn('Failed creating subcategory:', err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="pb-4 border-b border-black/10">
        <h1 className="font-editorial text-3xl font-normal">Category Tree & Hierarchy</h1>
        <p className="text-xs font-mono text-black/50 mt-0.5">
          Manage storefront taxonomy, subcategory branches, slugs, and navigation visibility.
        </p>
      </div>

      <div className="border border-black/[0.08] bg-white divide-y divide-black/[0.08]">
        {parents.map((parent) => {
          const subcategories = categories.filter((c) => c.parentId === parent.id);
          const isEditing = editingId === parent.id;

          return (
            <div key={parent.id} className="p-4 sm:p-5 space-y-3">
              {/* Parent Category Row */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="w-1.5 h-1.5 bg-black" />
                  {isEditing ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={editNameEn}
                        onChange={(e) => setEditNameEn(e.target.value)}
                        placeholder="Name in English"
                        className="px-2 py-1 border-b border-black text-xs font-mono bg-transparent"
                      />
                      <input
                        type="text"
                        value={editNameFi}
                        onChange={(e) => setEditNameFi(e.target.value)}
                        placeholder="Name in Finnish"
                        className="px-2 py-1 border-b border-black text-xs font-mono bg-transparent"
                      />
                      <button
                        onClick={() => handleSaveEdit(parent.id)}
                        className="text-xs font-mono uppercase underline underline-offset-2 hover:opacity-60 cursor-pointer ml-1"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="text-xs font-mono uppercase text-black/50 hover:text-black underline underline-offset-2 cursor-pointer ml-1"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div>
                      <span className="font-editorial text-xl font-normal text-black">{parent.name.en || parent.name.fi}</span>
                      <span className="text-xs font-mono text-black/40 ml-2">({parent.name.fi})</span>
                      <span className="text-[10px] font-mono text-black/30 ml-2">/{parent.slug}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-4">
                  <button
                    onClick={() => toggleVisibility(parent)}
                    className="text-xs font-mono flex items-center gap-1.5 cursor-pointer hover:opacity-60 text-black/70"
                    title={parent.visible ? 'Hide from navigation' : 'Show in navigation'}
                  >
                    {parent.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5 text-black/40" />}
                    <span className="text-[11px] uppercase tracking-wider">{parent.visible ? 'Visible' : 'Hidden'}</span>
                  </button>

                  <button
                    onClick={() => {
                      setEditingId(parent.id);
                      setEditNameFi(parent.name.fi);
                      setEditNameEn(parent.name.en || parent.name.fi);
                    }}
                    className="text-xs font-mono uppercase tracking-wider hover:opacity-60 underline underline-offset-2 cursor-pointer text-black"
                    title="Rename category"
                  >
                    Rename
                  </button>

                  <button
                    onClick={() => setNewSubcatParent(parent.id)}
                    className="text-xs font-mono uppercase tracking-wider hover:opacity-60 underline underline-offset-4 cursor-pointer font-semibold text-black"
                  >
                    + Add Subcategory
                  </button>
                </div>
              </div>

              {/* Subcategories (Indented Tree) */}
              <div className="pl-6 sm:pl-8 space-y-2 border-l border-black/15 ml-3 sm:ml-4 pt-1">
                {subcategories.map((sub) => {
                  const isSubEditing = editingId === sub.id;

                  return (
                    <div
                      key={sub.id}
                      className="p-2 border-b border-black/[0.04] flex items-center justify-between text-xs font-mono"
                    >
                      <div className="flex items-center gap-2">
                        <CornerDownRight className="w-3.5 h-3.5 text-black/30" />
                        {isSubEditing ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={editNameEn}
                              onChange={(e) => setEditNameEn(e.target.value)}
                              className="px-2 py-0.5 border-b border-black text-xs bg-transparent"
                            />
                            <input
                              type="text"
                              value={editNameFi}
                              onChange={(e) => setEditNameFi(e.target.value)}
                              className="px-2 py-0.5 border-b border-black text-xs bg-transparent"
                            />
                            <button
                              onClick={() => handleSaveEdit(sub.id)}
                              className="text-xs underline underline-offset-2 cursor-pointer"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="text-xs text-black/50 underline underline-offset-2 cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div>
                            <span className="font-medium text-black">{sub.name.en || sub.name.fi}</span>
                            <span className="text-[11px] text-black/50 ml-2">({sub.name.fi})</span>
                            <span className="text-[10px] text-black/30 ml-2">/{sub.slug}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => toggleVisibility(sub)}
                          className="hover:opacity-60 text-black/60 hover:text-black cursor-pointer text-xs"
                        >
                          {sub.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5 text-black/30" />}
                        </button>
                        <button
                          onClick={() => {
                            setEditingId(sub.id);
                            setEditNameFi(sub.name.fi);
                            setEditNameEn(sub.name.en || sub.name.fi);
                          }}
                          className="hover:opacity-60 text-black/60 hover:text-black cursor-pointer text-xs underline underline-offset-2"
                        >
                          Rename
                        </button>
                      </div>
                    </div>
                  );
                })}

                {/* Inline form for adding new subcategory */}
                {newSubcatParent === parent.id && (
                  <div className="p-3 border-b border-black bg-black/[0.02] space-y-2">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-black/60 block">
                      New subcategory under {parent.name.en || parent.name.fi}:
                    </span>
                    <div className="flex flex-wrap gap-3 text-xs font-mono">
                      <input
                        type="text"
                        value={newSubcatNameEn}
                        onChange={(e) => setNewSubcatNameEn(e.target.value)}
                        placeholder="Name (EN) e.g. Wool Sweaters"
                        className="px-2.5 py-1 border-b border-black/40 focus:border-black bg-transparent flex-1 min-w-[140px]"
                      />
                      <input
                        type="text"
                        value={newSubcatNameFi}
                        onChange={(e) => setNewSubcatNameFi(e.target.value)}
                        placeholder="Name (FI) e.g. Villaneuleet"
                        className="px-2.5 py-1 border-b border-black/40 focus:border-black bg-transparent flex-1 min-w-[140px]"
                      />
                      <button
                        onClick={() => handleCreateSubcategory(parent.id)}
                        className="text-xs uppercase tracking-wider font-semibold cursor-pointer underline underline-offset-4"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setNewSubcatParent(null)}
                        className="text-xs uppercase text-black/50 hover:text-black cursor-pointer underline underline-offset-4"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
