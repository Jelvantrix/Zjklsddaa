import React, { useState, useMemo } from 'react';
import { Category } from '../../types';
import {
  FolderTree,
  Eye,
  EyeOff,
  Plus,
  Edit2,
  Trash2,
  Check,
  X,
  CornerDownRight,
  Search,
  Layers,
  ChevronDown,
  ChevronRight,
  AlertCircle,
  ExternalLink,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../supabase/AuthContext';
import { supabase } from '../../supabase/config';
import { logAuditEvent } from '../../supabase/dbService';

interface AdminCategoriesViewProps {
  categories: Category[];
  onRefresh: () => void;
}

export const AdminCategoriesView: React.FC<AdminCategoriesViewProps> = ({
  categories,
  onRefresh,
}) => {
  const { isEditor, adminProfile } = useAuth();

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedParentIds, setCollapsedParentIds] = useState<Record<string, boolean>>({});

  // Editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNameEn, setEditNameEn] = useState('');
  const [editNameFi, setEditNameFi] = useState('');
  const [editSlug, setEditSlug] = useState('');
  const [editOrder, setEditOrder] = useState<number>(1);

  // New Category Drawer/Modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newCatNameEn, setNewCatNameEn] = useState('');
  const [newCatNameFi, setNewCatNameFi] = useState('');
  const [newCatSlug, setNewCatSlug] = useState('');
  const [newCatParentId, setNewCatParentId] = useState<string>('root');
  const [newCatOrder, setNewCatOrder] = useState<number>(10);
  const [newCatVisible, setNewCatVisible] = useState<boolean>(true);
  const [newCatImage, setNewCatImage] = useState<string>('');

  // Inline subcategory fast creation
  const [newSubcatParent, setNewSubcatParent] = useState<string | null>(null);
  const [quickSubcatNameEn, setQuickSubcatNameEn] = useState('');
  const [quickSubcatNameFi, setQuickSubcatNameFi] = useState('');

  // Action status message & error
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Deletion confirmation
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Derived parent & child groupings
  const parentCategories = useMemo(() => {
    return categories
      .filter((c) => !c.parentId)
      .sort((a, b) => (a.order || 0) - (b.order || 0));
  }, [categories]);

  const filteredParents = useMemo(() => {
    if (!searchQuery.trim()) return parentCategories;
    const q = searchQuery.toLowerCase();
    return parentCategories.filter((parent) => {
      const matchParent =
        parent.name.en?.toLowerCase().includes(q) ||
        parent.name.fi?.toLowerCase().includes(q) ||
        parent.slug.toLowerCase().includes(q);
      const childMatches = categories
        .filter((c) => c.parentId === parent.id)
        .some(
          (c) =>
            c.name.en?.toLowerCase().includes(q) ||
            c.name.fi?.toLowerCase().includes(q) ||
            c.slug.toLowerCase().includes(q)
        );
      return matchParent || childMatches;
    });
  }, [parentCategories, categories, searchQuery]);

  const toggleParentCollapse = (id: string) => {
    setCollapsedParentIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Helper to show transient message
  const notify = (type: 'success' | 'error', text: string) => {
    setStatusMsg({ type, text });
    setTimeout(() => setStatusMsg(null), 4000);
  };

  // 1. CREATE A BRAND NEW CATEGORY (Top-level or with parent)
  const handleCreateCategory = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newCatNameEn.trim()) {
      notify('error', 'Please provide a Category Name in English.');
      return;
    }

    setIsProcessing(true);
    try {
      const slug =
        newCatSlug.trim() ||
        newCatNameEn
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)+/g, '');

      const id = `cat-${slug}-${Date.now().toString(36)}`;
      const isRoot = newCatParentId === 'root' || !newCatParentId;

      const newCategory: Category = {
        id,
        parentId: isRoot ? undefined : newCatParentId,
        name: {
          en: newCatNameEn.trim(),
          fi: newCatNameFi.trim() || newCatNameEn.trim(),
        },
        slug,
        order: Number(newCatOrder) || 10,
        visible: newCatVisible,
        image: newCatImage.trim() || undefined,
      };

      const { error } = await supabase.from('categories').upsert({ ...newCategory, id });
      if (error) throw error;
      await logAuditEvent(
        adminProfile?.name || adminProfile?.email || 'admin',
        'create_category',
        id,
        { name: newCategory.name.en, slug, isRoot }
      );

      // Reset create form
      setNewCatNameEn('');
      setNewCatNameFi('');
      setNewCatSlug('');
      setNewCatParentId('root');
      setNewCatImage('');
      setIsCreateModalOpen(false);
      onRefresh();
      notify('success', `Category "${newCategory.name.en}" created and published to Firestore.`);
    } catch (err: any) {
      console.error('Error creating category:', err);
      notify('error', `Failed to create category: ${err.message || 'Database error'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // 2. QUICK SUBCATEGORY INLINE CREATION
  const handleQuickCreateSubcategory = async (parentId: string) => {
    if (!quickSubcatNameEn.trim()) {
      notify('error', 'Please enter a subcategory name in English.');
      return;
    }

    setIsProcessing(true);
    try {
      const slug = quickSubcatNameEn
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '');

      const id = `cat-${slug}-${Date.now().toString(36)}`;
      const newSubcategory: Category = {
        id,
        parentId,
        name: {
          en: quickSubcatNameEn.trim(),
          fi: quickSubcatNameFi.trim() || quickSubcatNameEn.trim(),
        },
        slug,
        order: 99,
        visible: true,
      };

      const { error } = await supabase.from('categories').upsert({ ...newSubcategory, id });
      if (error) throw error;
      await logAuditEvent(
        adminProfile?.name || adminProfile?.email || 'admin',
        'create_subcategory',
        id,
        { parentId, name: newSubcategory.name.en }
      );

      setNewSubcatParent(null);
      setQuickSubcatNameEn('');
      setQuickSubcatNameFi('');
      onRefresh();
      notify('success', `Subcategory "${newSubcategory.name.en}" added.`);
    } catch (err: any) {
      console.error('Failed to create subcategory:', err);
      notify('error', `Could not create subcategory: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // 3. EDIT EXISTING CATEGORY
  const startEdit = (cat: Category) => {
    setEditingId(cat.id);
    setEditNameEn(cat.name.en || cat.name.fi || '');
    setEditNameFi(cat.name.fi || cat.name.en || '');
    setEditSlug(cat.slug || '');
    setEditOrder(cat.order || 1);
  };

  const saveEdit = async (catId: string) => {
    if (!editNameEn.trim()) {
      notify('error', 'Name cannot be empty.');
      return;
    }

    setIsProcessing(true);
    try {
      const cleanSlug =
        editSlug.trim() ||
        editNameEn
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)+/g, '');

      const { error } = await supabase
        .from('categories')
        .update({
          'name.en': editNameEn.trim(),
          'name.fi': editNameFi.trim() || editNameEn.trim(),
          slug: cleanSlug,
          order: Number(editOrder) || 1,
        })
        .eq('id', catId);
      if (error) throw error;

      await logAuditEvent(
        adminProfile?.name || adminProfile?.email || 'admin',
        'update_category',
        catId,
        { en: editNameEn, slug: cleanSlug }
      );

      setEditingId(null);
      onRefresh();
      notify('success', 'Category updated successfully.');
    } catch (err: any) {
      console.error('Failed updating category:', err);
      notify('error', `Update failed: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // 4. TOGGLE VISIBILITY
  const toggleVisibility = async (cat: Category) => {
    try {
      const newVis = !cat.visible;
      const { error } = await supabase.from('categories').update({ visible: newVis }).eq('id', cat.id);
      if (error) throw error;
      await logAuditEvent(
        adminProfile?.name || adminProfile?.email || 'admin',
        'toggle_category_visibility',
        cat.id,
        { visible: newVis }
      );
      onRefresh();
      notify('success', `Category is now ${newVis ? 'Visible on storefront' : 'Hidden from storefront'}.`);
    } catch (err: any) {
      console.error('Failed toggling visibility:', err);
      notify('error', `Failed: ${err.message}`);
    }
  };

  // TOGGLE COMING SOON
  const toggleComingSoon = async (cat: Category) => {
    try {
      const newStatus = !cat.isComingSoon;
      let notice = cat.comingSoonNotice || 'Coming Soon · Handcrafted in Helsinki';
      if (newStatus && !cat.comingSoonNotice) {
        const entered = window.prompt(
          `Enter Coming Soon announcement note for "${cat.name.en || cat.name.fi}":`,
          'Coming Soon · Handcrafted in Helsinki'
        );
        if (entered !== null) {
          notice = entered || 'Coming Soon';
        }
      }
      const { error } = await supabase
        .from('categories')
        .update({
          isComingSoon: newStatus,
          comingSoonNotice: notice,
        })
        .eq('id', cat.id);
      if (error) throw error;
      await logAuditEvent(
        adminProfile?.name || adminProfile?.email || 'admin',
        'toggle_category_coming_soon',
        cat.id,
        { isComingSoon: newStatus, comingSoonNotice: notice }
      );
      onRefresh();
      notify('success', `Category "${cat.name.en || cat.name.fi}" Coming Soon is now ${newStatus ? 'Active' : 'Off'}.`);
    } catch (err: any) {
      console.error('Failed toggling Coming Soon:', err);
      notify('error', `Failed: ${err.message}`);
    }
  };

  // 5. DELETE CATEGORY
  const handleDeleteCategory = async (catId: string) => {
    setIsProcessing(true);
    try {
      // Also delete any child subcategories if deleting a parent
      const children = categories.filter((c) => c.parentId === catId);
      for (const child of children) {
        const { error: childError } = await supabase.from('categories').delete().eq('id', child.id);
        if (childError) throw childError;
      }

      const { error } = await supabase.from('categories').delete().eq('id', catId);
      if (error) throw error;
      await logAuditEvent(
        adminProfile?.name || adminProfile?.email || 'admin',
        'delete_category',
        catId,
        { removedSubcategoriesCount: children.length }
      );

      setConfirmDeleteId(null);
      onRefresh();
      notify('success', 'Category deleted from database.');
    } catch (err: any) {
      console.error('Error deleting category:', err);
      notify('error', `Failed to delete: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-small uppercase tracking-[0.2em] text-black/50">Taxonomy & Navigation</span>
            <span className="text-small px-2 py-0.5">
              {categories.length} total nodes
            </span>
          </div>
          <h1 className="font-serif text-display sm:text-display font-normal text-black tracking-tight">
            Categories & Department Architecture
          </h1>
          <p className="text-small text-black/60 mt-1 max-w-2xl leading-relaxed">
            Manage storefront departments, hierarchical subcategories, URL slugs, and visibility on the live header & menus.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 text-white transition-colors text-small uppercase tracking-[0.16em] cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create New Category</span>
          </button>
        </div>
      </div>

      {/* STATUS BANNER */}
      {statusMsg && (
        <div
          className={`p-3 text-small flex items-center justify-between ${ statusMsg.type ==='success'
              ? 'text-white'
              : 'text-red-900'
          }`}
        >
          <span>{statusMsg.text}</span>
          <button
            type="button"
            onClick={() => setStatusMsg(null)}
            className="text-inherit hover:opacity-60 cursor-pointer p-0.5 ml-4"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* FILTER & SEARCH STRIP */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 text-small">
        <div className="relative flex-1 max-w-md">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-black/40" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search categories by name, slug or code..."
            className="w-full pl-9 pr-3 py-1.5 bg-white text-small text-black placeholder:text-black/40"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-black/40 hover:text-black cursor-pointer"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-4 text-black/60 text-small">
          <span>
            Showing <strong className="text-black">{filteredParents.length}</strong> root departments
          </span>
          <span className="w-px h-3" />
          <span>
            <strong className="text-black">
              {categories.filter((c) => c.visible).length}
            </strong>{' '}
            visible in navigation
          </span>
        </div>
      </div>

      {/* CATEGORIES HIERARCHY TREE */}
      <div className="bg-white">
        {filteredParents.length === 0 ? (
          <div className="p-12 text-center text-small text-black/50 space-y-3">
            <FolderTree className="w-8 h-8 mx-auto text-black/30 stroke-[1]" />
            <p className="text-small font-serif text-black/80">No categories found matching your query.</p>
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(true)}
              className="px-4 py-2 text-black hover:text-white transition-colors cursor-pointer text-small uppercase tracking-wider"
            >
              + Create First Category
            </button>
          </div>
        ) : (
          filteredParents.map((parent) => {
            const children = categories
              .filter((c) => c.parentId === parent.id)
              .sort((a, b) => (a.order || 0) - (b.order || 0));
            const isCollapsed = !!collapsedParentIds[parent.id];
            const isEditing = editingId === parent.id;

            return (
              <div key={parent.id} className="p-4 sm:p-5 space-y-4 transition-colors">
                {/* PARENT ROW */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => toggleParentCollapse(parent.id)}
                      className="p-1 transition-colors cursor-pointer text-black/60 hover:text-black"
                      title={isCollapsed ? 'Expand subcategories' : 'Collapse subcategories'}
                    >
                      {children.length > 0 ? (
                        isCollapsed ? (
                          <ChevronRight className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )
                      ) : (
                        <span className="w-4 h-4 inline-block text-center text-black/30">•</span>
                      )}
                    </button>

                    {isEditing ? (
                      <div className="flex flex-wrap items-center gap-2 text-small">
                        <div className="flex items-center gap-1">
                          <span className="text-small text-black/40">EN:</span>
                          <input
                            type="text"
                            value={editNameEn}
                            onChange={(e) => setEditNameEn(e.target.value)}
                            placeholder="Name (EN)"
                            className="px-1 py-1 text-small bg-transparent min-w-[130px]"
                          />
                        </div>

                        <div className="flex items-center gap-1">
                          <span className="text-small text-black/40">FI:</span>
                          <input
                            type="text"
                            value={editNameFi}
                            onChange={(e) => setEditNameFi(e.target.value)}
                            placeholder="Name (FI)"
                            className="px-1 py-1 text-small bg-transparent min-w-[130px]"
                          />
                        </div>

                        <div className="flex items-center gap-1">
                          <span className="text-small text-black/40">Slug:</span>
                          <input
                            type="text"
                            value={editSlug}
                            onChange={(e) => setEditSlug(e.target.value)}
                            placeholder="slug"
                            className="px-1 py-1 text-small bg-transparent w-24"
                          />
                        </div>

                        <div className="flex items-center gap-1">
                          <span className="text-small text-black/40">Order:</span>
                          <input
                            type="number"
                            value={editOrder}
                            onChange={(e) => setEditOrder(parseInt(e.target.value, 10) || 1)}
                            className="px-1 py-1 text-small bg-transparent w-12"
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() => saveEdit(parent.id)}
                          disabled={isProcessing}
                          className="px-2 py-1 text-white text-small uppercase tracking-wider cursor-pointer"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="px-2 py-1 text-black text-small uppercase tracking-wider cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-wrap items-center gap-2.5">
                        <span className="font-serif text-title font-normal text-black">
                          {parent.name.en || parent.name.fi}
                        </span>

                        {parent.name.fi && parent.name.fi !== parent.name.en && (
                          <span className="text-small text-black/50">
                            ({parent.name.fi})
                          </span>
                        )}

                        <span className="px-1.5 py-0.5 text-small text-black/60">
                          /{parent.slug}
                        </span>

                        <span className="text-small text-black/40">
                          (order: {parent.order || 0})
                        </span>

                        <span
                          className={`text-small uppercase px-2 py-0.5 ${ parent.visible ?'text-black'
                              : 'text-black/40'
                          }`}
                        >
                          {parent.visible ? 'Live in Nav' : 'Hidden'}
                        </span>

                        {parent.isComingSoon && (
                          <span className="text-small uppercase px-2 py-0.5 text-white font-semibold flex items-center gap-1">
                            <span>⏳ Coming Soon</span>
                            {parent.comingSoonNotice && (
                              <span className="text-small text-white/70 hidden lg:inline">
                                · {parent.comingSoonNotice}
                              </span>
                            )}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* ACTION CONTROLS */}
                  <div className="flex items-center gap-2.5 sm:gap-3 shrink-0 text-small pt-1 sm:pt-0">
                    <button
                      type="button"
                      onClick={() => toggleComingSoon(parent)}
                      className={`px-2 py-1 text-small uppercase transition-colors cursor-pointer ${ parent.isComingSoon ?'text-white font-semibold'
                          : 'text-black/60 hover:text-black bg-white'
                      }`}
                      title={parent.comingSoonNotice || 'Toggle Coming Soon status on storefront'}
                    >
                      {parent.isComingSoon ? '⏳ Coming Soon (Active)' : '+ Coming Soon'}
                    </button>

                    <button
                      type="button"
                      onClick={() => toggleVisibility(parent)}
                      className="flex items-center gap-1.5 text-black/70 hover:text-black cursor-pointer text-small"
                      title={parent.visible ? 'Hide from storefront' : 'Show on storefront'}
                    >
                      {parent.visible ? (
                        <>
                          <Eye className="w-3.5 h-3.5 text-black" />
                          <span className="hidden md:inline text-small">Visible</span>
                        </>
                      ) : (
                        <>
                          <EyeOff className="w-3.5 h-3.5 text-black/40" />
                          <span className="hidden md:inline text-small text-black/50">Hidden</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => startEdit(parent)}
                      className="text-black/80 hover:text-black underline underline-offset-4 cursor-pointer text-small uppercase tracking-wider"
                    >
                      Edit
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setNewSubcatParent(parent.id);
                        setQuickSubcatNameEn('');
                        setQuickSubcatNameFi('');
                      }}
                      className="px-2.5 py-1 hover:text-white transition-colors text-small uppercase tracking-wider cursor-pointer font-medium"
                    >
                      + Subcategory
                    </button>

                    {/* DELETE BUTTON */}
                    {confirmDeleteId === parent.id ? (
                      <div className="flex items-center gap-1.5 p-1">
                        <span className="text-small text-red-800">Delete all {children.length} items?</span>
                        <button
                          type="button"
                          onClick={() => handleDeleteCategory(parent.id)}
                          className="px-1.5 py-0.5 text-white text-small uppercase font-bold cursor-pointer"
                        >
                          Confirm
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          className="px-1.5 py-0.5 text-small text-black/60 hover:text-black cursor-pointer"
                        >
                          X
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(parent.id)}
                        className="text-black/40 hover:text-red-600 transition-colors p-1 cursor-pointer"
                        title="Delete category and children"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* SUBCATEGORIES TREE (INDENTED) */}
                {!isCollapsed && (
                  <div className="pl-6 sm:pl-8 ml-3 sm:ml-4 space-y-2 pt-1">
                    {children.length === 0 && newSubcatParent !== parent.id && (
                      <p className="text-small text-black/40 italic py-1">
                        No subcategories attached. Click &quot;+ Subcategory&quot; to branch this department.
                      </p>
                    )}

                    {children.map((sub) => {
                      const isSubEditing = editingId === sub.id;

                      return (
                        <div
                          key={sub.id}
                          className="p-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-small"
                        >
                          <div className="flex items-center gap-2">
                            <CornerDownRight className="w-3.5 h-3.5 text-black/40 shrink-0" />

                            {isSubEditing ? (
                              <div className="flex flex-wrap items-center gap-2">
                                <input
                                  type="text"
                                  value={editNameEn}
                                  onChange={(e) => setEditNameEn(e.target.value)}
                                  placeholder="EN name"
                                  className="px-1.5 py-0.5 text-small bg-white min-w-[120px]"
                                />
                                <input
                                  type="text"
                                  value={editNameFi}
                                  onChange={(e) => setEditNameFi(e.target.value)}
                                  placeholder="FI name"
                                  className="px-1.5 py-0.5 text-small bg-white min-w-[120px]"
                                />
                                <input
                                  type="text"
                                  value={editSlug}
                                  onChange={(e) => setEditSlug(e.target.value)}
                                  placeholder="slug"
                                  className="px-1.5 py-0.5 text-small bg-white w-20"
                                />
                                <button
                                  type="button"
                                  onClick={() => saveEdit(sub.id)}
                                  className="px-2 py-0.5 text-white text-small uppercase cursor-pointer"
                                >
                                  Save
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingId(null)}
                                  className="text-small text-black/50 underline cursor-pointer ml-1"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-medium text-black">
                                  {sub.name.en || sub.name.fi}
                                </span>
                                {sub.name.fi && sub.name.fi !== sub.name.en && (
                                  <span className="text-small text-black/50">({sub.name.fi})</span>
                                )}
                                <span className="text-small text-black/40">
                                  /{sub.slug}
                                </span>
                                {!sub.visible && (
                                  <span className="text-small uppercase px-1.5 py-0.5 text-black/40">
                                    Hidden
                                  </span>
                                )}
                                {sub.isComingSoon && (
                                  <span className="text-small uppercase px-1.5 py-0.5 text-white font-semibold">
                                    Coming Soon
                                  </span>
                                )}
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-2 sm:gap-3 shrink-0 self-end sm:self-auto">
                            <button
                              type="button"
                              onClick={() => toggleComingSoon(sub)}
                              className={`px-1.5 py-0.5 text-small uppercase transition-colors cursor-pointer ${ sub.isComingSoon ?'text-white font-semibold'
                                  : 'text-black/50 hover:text-black bg-white'
                              }`}
                              title={sub.comingSoonNotice || 'Toggle Coming Soon on subcategory'}
                            >
                              {sub.isComingSoon ? '⏳ Coming Soon' : '+ Coming Soon'}
                            </button>

                            <button
                              type="button"
                              onClick={() => toggleVisibility(sub)}
                              className="text-black/60 hover:text-black cursor-pointer p-0.5"
                              title={sub.visible ? 'Hide from storefront' : 'Show on storefront'}
                            >
                              {sub.visible ? (
                                <Eye className="w-3.5 h-3.5 text-black" />
                              ) : (
                                <EyeOff className="w-3.5 h-3.5 text-black/30" />
                              )}
                            </button>

                            <button
                              type="button"
                              onClick={() => startEdit(sub)}
                              className="text-black/70 hover:text-black underline text-small cursor-pointer"
                            >
                              Edit
                            </button>

                            {confirmDeleteId === sub.id ? (
                              <div className="flex items-center gap-1 px-1">
                                <button
                                  type="button"
                                  onClick={() => handleDeleteCategory(sub.id)}
                                  className="text-small text-red-600 font-bold uppercase cursor-pointer"
                                >
                                  Delete
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteId(null)}
                                  className="text-small text-black/40 cursor-pointer ml-1"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(sub.id)}
                                className="text-black/30 hover:text-red-600 transition-colors p-0.5 cursor-pointer"
                                title="Delete subcategory"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {/* FAST INLINE SUBCATEGORY FORM */}
                    {newSubcatParent === parent.id && (
                      <div className="p-3 space-y-2 mt-2">
                        <div className="flex items-center justify-between">
                          <span className="text-small uppercase tracking-wider text-black font-semibold">
                            Add Subcategory under {parent.name.en || parent.name.fi}
                          </span>
                          <button
                            type="button"
                            onClick={() => setNewSubcatParent(null)}
                            className="text-black/40 hover:text-black cursor-pointer text-small"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="flex flex-wrap gap-2 text-small">
                          <input
                            type="text"
                            value={quickSubcatNameEn}
                            onChange={(e) => setQuickSubcatNameEn(e.target.value)}
                            placeholder="Subcategory Name (e.g. Wool Coats)"
                            className="px-2.5 py-1.5 bg-white text-small flex-1 min-w-[160px]"
                          />
                          <input
                            type="text"
                            value={quickSubcatNameFi}
                            onChange={(e) => setQuickSubcatNameFi(e.target.value)}
                            placeholder="Finnish Name (optional)"
                            className="px-2.5 py-1.5 bg-white text-small flex-1 min-w-[160px]"
                          />
                          <button
                            type="button"
                            onClick={() => handleQuickCreateSubcategory(parent.id)}
                            disabled={isProcessing}
                            className="px-4 py-1.5 text-white text-small uppercase tracking-wider cursor-pointer font-medium"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => setNewSubcatParent(null)}
                            className="px-3 py-1.5 text-black text-small uppercase cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* MODAL / DRAWER FOR CREATING A NEW TOP-LEVEL OR NESTED CATEGORY */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white max-w-lg w-full p-6 sm:p-8 space-y-6 relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between pb-4">
              <div>
                <span className="text-small uppercase tracking-[0.2em] text-black/50 block">Architecture</span>
                <h2 className="font-serif text-title font-normal text-black mt-0.5">
                  Create New Category
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 text-black/50 hover:text-black cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCategory} className="space-y-4 text-small">
              <div>
                <label className="block text-small uppercase tracking-wider text-black font-semibold mb-1">
                  Category Name (English) *
                </label>
                <input
                  type="text"
                  required
                  value={newCatNameEn}
                  onChange={(e) => {
                    setNewCatNameEn(e.target.value);
                    if (!newCatSlug) {
                      setNewCatSlug(
                        e.target.value
                          .toLowerCase()
                          .replace(/[^a-z0-9]+/g, '-')
                          .replace(/(^-|-$)+/g, '')
                      );
                    }
                  }}
                  placeholder="e.g. Footwear, Outerwear, Tailoring"
                  className="w-full px-3 py-2 focus:bg-white text-small text-black"
                />
              </div>

              <div>
                <label className="block text-small uppercase tracking-wider text-black/70 mb-1">
                  Category Name (Finnish / Localized)
                </label>
                <input
                  type="text"
                  value={newCatNameFi}
                  onChange={(e) => setNewCatNameFi(e.target.value)}
                  placeholder="e.g. Jalkineet, Ulkovaatteet"
                  className="w-full px-3 py-2 focus:bg-white text-small text-black"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-small uppercase tracking-wider text-black/70 mb-1">
                    URL Slug
                  </label>
                  <input
                    type="text"
                    value={newCatSlug}
                    onChange={(e) => setNewCatSlug(e.target.value)}
                    placeholder="e.g. footwear"
                    className="w-full px-3 py-2 focus:bg-white text-small text-black"
                  />
                </div>

                <div>
                  <label className="block text-small uppercase tracking-wider text-black/70 mb-1">
                    Hierarchy Placement
                  </label>
                  <select
                    value={newCatParentId}
                    onChange={(e) => setNewCatParentId(e.target.value)}
                    className="w-full px-3 py-2 focus:bg-white text-small text-black"
                  >
                    <option value="root">Top-Level Department (Root)</option>
                    {parentCategories.map((p) => (
                      <option key={p.id} value={p.id}>
                        Child of {p.name.en || p.name.fi}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div>
                  <label className="block text-small uppercase tracking-wider text-black/70 mb-1">
                    Display Order
                  </label>
                  <input
                    type="number"
                    value={newCatOrder}
                    onChange={(e) => setNewCatOrder(parseInt(e.target.value, 10) || 1)}
                    className="w-full px-3 py-2 focus:bg-white text-small text-black"
                  />
                </div>

                <div>
                  <label className="block text-small uppercase tracking-wider text-black/70 mb-1">
                    Visibility
                  </label>
                  <div className="flex items-center gap-2 pt-2">
                    <input
                      type="checkbox"
                      id="catVisCheck"
                      checked={newCatVisible}
                      onChange={(e) => setNewCatVisible(e.target.checked)}
                      className="accent-black w-4 h-4 cursor-pointer"
                    />
                    <label htmlFor="catVisCheck" className="text-small text-black cursor-pointer">
                      Visible in Storefront Navigation
                    </label>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-small uppercase tracking-wider text-black/70 mb-1">
                  Cover Image URL (Optional)
                </label>
                <input
                  type="text"
                  value={newCatImage}
                  onChange={(e) => setNewCatImage(e.target.value)}
                  placeholder="https://... or leave empty for default archive cover"
                  className="w-full px-3 py-2 focus:bg-white text-small text-black"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2.5 text-black text-small uppercase tracking-wider cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="px-6 py-2.5 text-white text-small uppercase tracking-widest font-semibold cursor-pointer disabled:opacity-50"
                >
                  {isProcessing ? 'Writing to Firestore...' : 'Create Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
