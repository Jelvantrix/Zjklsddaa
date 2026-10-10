import React, { useState, useEffect, useRef } from 'react';
import { Product, MediaAsset, ImageFramingParams } from '../../types';
import {
  UploadCloud,
  Check,
  Info,
  Trash2,
  Maximize2,
  Sparkles,
  AlertTriangle,
  Loader2,
  Search,
  ExternalLink,
  Sliders,
  Copy,
} from 'lucide-react';
import {
  getMediaAssets,
  uploadMediaAsset,
  deleteMediaAssetPermanently,
  findMediaUsage,
  MAX_FILE_SIZE_BYTES,
  ALLOWED_MIME_TYPES,
} from '../../supabase/mediaService';
import { UniversalImageEditorModal } from '../components/UniversalImageEditorModal';

interface AdminMediaViewProps {
  products: Product[];
}

export const AdminMediaView: React.FC<AdminMediaViewProps> = ({ products }) => {
  const [mediaList, setMediaList] = useState<MediaAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Upload state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Inspector & selection
  const [selectedAsset, setSelectedAsset] = useState<MediaAsset | null>(null);
  const [assetUsage, setAssetUsage] = useState<{
    productIds: string[];
    productTitles: string[];
    heroUsage: boolean;
    contentSections: string[];
    totalUses: number;
  } | null>(null);
  const [checkingUsage, setCheckingUsage] = useState(false);

  // Deletion modal state
  const [assetToDelete, setAssetToDelete] = useState<MediaAsset | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);

  // Image Editor
  const [editorAsset, setEditorAsset] = useState<MediaAsset | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const loadMedia = async () => {
    setLoading(true);
    try {
      const items = await getMediaAssets();
      setMediaList(items);
    } catch (err) {
      console.warn('Error loading media assets:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMedia();
  }, []);

  // When selecting an asset, check real usage across database
  useEffect(() => {
    if (selectedAsset) {
      setCheckingUsage(true);
      findMediaUsage(selectedAsset.url).then((usage) => {
        setAssetUsage(usage);
        setCheckingUsage(false);
      });
    } else {
      setAssetUsage(null);
    }
  }, [selectedAsset]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setUploadError(null);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        setUploadProgress(Math.round(((i + 1) / files.length) * 100));
        await uploadMediaAsset(file);
      } catch (err: any) {
        setUploadError(err.message || 'Upload failed for one or more files.');
      }
    }

    setIsUploading(false);
    setUploadProgress(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    loadMedia();
  };

  const handleConfirmDelete = async () => {
    if (!assetToDelete) return;
    setIsDeleting(true);
    setDeleteError(null);

    const res = await deleteMediaAssetPermanently(assetToDelete);
    setIsDeleting(false);

    if (res.success) {
      setMediaList((prev) => prev.filter((a) => a.id !== assetToDelete.id));
      if (selectedAsset?.id === assetToDelete.id) {
        setSelectedAsset(null);
      }
      setAssetToDelete(null);
    } else {
      setDeleteError(res.error || 'Failed to delete asset from Storage.');
    }
  };

  const handleCopyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const filteredMedia = mediaList.filter((item) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (item.alt && item.alt.toLowerCase().includes(q)) || item.path.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6 select-none">
      {/* Top Bar */}
      <div className="pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-display font-normal text-black">Media Storage</h1>
          <p className="text-small text-black/50 mt-0.5">
            Direct Supabase Storage integration with client-side WebP compression and usage tracking.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="px-4 py-2 text-white text-small uppercase tracking-wider flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span>{isUploading ? `Uploading (${uploadProgress || 0}%)...` : 'Upload From Device'}</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp,image/avif,video/mp4,video/webm"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>
      </div>

      {uploadError && (
        <div className="p-3 text-small text-black flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{uploadError}</span>
        </div>
      )}

      {/* Dropzone & Filter */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
        <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-white">
          <Search className="w-3.5 h-3.5 text-black/40" />
          <input
            type="text"
            placeholder="Search media assets by filename or tag..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-small bg-transparent"
          />
        </div>
        <div className="text-small text-black/50 shrink-0 self-center">
          {mediaList.length} asset{mediaList.length === 1 ? '' : 's'} in storage
        </div>
      </div>

      {/* Storage Grid */}
      {loading ? (
        <div className="py-20 text-center text-small text-black/40 flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-black" />
          <span>Connecting to Supabase Storage bucket...</span>
        </div>
      ) : filteredMedia.length === 0 ? (
        <div className="py-20 text-center p-8 space-y-3">
          <UploadCloud className="w-8 h-8 text-black/30 mx-auto" />
          <div className="text-small uppercase tracking-wider text-black/60">
            Storage bucket is clean & empty
          </div>
          <p className="text-small text-black/40 max-w-sm mx-auto">
            Upload images or campaign videos from your device to populate the media library.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredMedia.map((item) => (
            <div
              key={item.id}
              onClick={() => setSelectedAsset(item)}
              className="bg-white p-2.5 flex flex-col justify-between group transition-colors cursor-pointer"
            >
              <div className="aspect-[3/4] overflow-hidden relative mb-2">
                {item.kind === 'video' ? (
                  <video
                    src={item.url}
                    className="w-full h-full object-cover"
                    muted
                    playsInline
                  />
                ) : (
                  <img
                    src={item.url}
                    alt={item.alt || ''}
                    className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-500"
                    loading="lazy"
                  />
                )}
                <div className="absolute bottom-1 right-1 text-white text-small px-1 py-0.5">
                  {item.width && item.height ? `${item.width}×${item.height}` : item.kind}
                </div>
              </div>

              <div className="space-y-1">
                <div className="text-small font-semibold truncate text-black">
                  {item.alt || item.path.split('/').pop()}
                </div>
                <div className="flex items-center justify-between text-small text-black/50">
                  <span>{item.sizeBytes ? `${Math.round(item.sizeBytes / 1024)} KB` : ''}</span>
                  <span className="uppercase text-small">{item.kind}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Asset Inspector Modal */}
      {selectedAsset && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white w-full max-w-2xl max-h-[90vh] flex flex-col p-6 overflow-y-auto space-y-5">
            <div className="flex items-center justify-between pb-3">
              <h2 className="text-small uppercase tracking-wider font-semibold text-black">
                Asset Metadata & Calibration
              </h2>
              <button
                type="button"
                onClick={() => setSelectedAsset(null)}
                className="text-black/50 hover:text-black cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-start">
              <div className="aspect-[3/4] overflow-hidden">
                {selectedAsset.kind === 'video' ? (
                  <video
                    src={selectedAsset.url}
                    controls
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <img
                    src={selectedAsset.url}
                    alt={selectedAsset.alt || ''}
                    className="w-full h-full object-cover"
                  />
                )}
              </div>

              <div className="space-y-4 text-small">
                <div>
                  <div className="text-small text-black/40 uppercase">Storage Path</div>
                  <div className="text-black break-all text-small mt-0.5">
                    {selectedAsset.path}
                  </div>
                </div>

                <div>
                  <div className="text-small text-black/40 uppercase">Public URL</div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <input
                      type="text"
                      readOnly
                      value={selectedAsset.url}
                      className="w-full px-2 py-1 text-small select-all truncate"
                    />
                    <button
                      type="button"
                      onClick={() => handleCopyUrl(selectedAsset.url)}
                      className="px-2 py-1 text-small uppercase cursor-pointer shrink-0"
                    >
                      {copySuccess ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-small">
                  <div>
                    <span className="text-black/40 block text-small uppercase">Dimensions</span>
                    <span>{selectedAsset.width && selectedAsset.height ? `${selectedAsset.width} × ${selectedAsset.height} px` : 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-black/40 block text-small uppercase">File Size</span>
                    <span>{selectedAsset.sizeBytes ? `${Math.round(selectedAsset.sizeBytes / 1024)} KB` : 'N/A'}</span>
                  </div>
                </div>

                {/* Where is this used in the catalog? */}
                <div className="p-3 space-y-2">
                  <div className="text-small text-black/50 uppercase font-semibold flex items-center justify-between">
                    <span>Database References</span>
                    {checkingUsage && <Loader2 className="w-3 h-3 animate-spin text-black" />}
                  </div>

                  {assetUsage ? (
                    assetUsage.totalUses === 0 ? (
                      <p className="text-small text-black/60">
                        This file is currently unreferenced in products or hero slides.
                      </p>
                    ) : (
                      <div className="space-y-1 text-small text-black">
                        {assetUsage.productTitles.length > 0 && (
                          <div>
                            <span className="font-medium">Products ({assetUsage.productTitles.length}):</span>{' '}
                            {assetUsage.productTitles.join(', ')}
                          </div>
                        )}
                        {assetUsage.heroUsage && (
                          <div>
                            <span className="font-medium">Storefront:</span> Featured in Home Hero
                          </div>
                        )}
                        {assetUsage.contentSections.length > 0 && (
                          <div>
                            <span className="font-medium">CMS Sections:</span>{' '}
                            {assetUsage.contentSections.join(', ')}
                          </div>
                        )}
                      </div>
                    )
                  ) : null}
                </div>

                {/* Action buttons */}
                <div className="pt-2 flex flex-col gap-2">
                  {selectedAsset.kind === 'image' && (
                    <button
                      type="button"
                      onClick={() => setEditorAsset(selectedAsset)}
                      className="w-full py-2 text-black uppercase text-small tracking-wider flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Sliders className="w-3.5 h-3.5" />
                      <span>Calibrate Frame & Placements</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setAssetToDelete(selectedAsset);
                    }}
                    className="w-full py-2 text-red-700 uppercase text-small tracking-wider flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete From Storage</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Deletion Warning Modal */}
      {assetToDelete && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white w-full max-w-md p-6 space-y-4 text-small">
            <div className="flex items-center gap-2 text-black">
              <AlertTriangle className="w-4 h-4 text-black shrink-0" />
              <h3 className="uppercase tracking-wider font-semibold">
                Delete Asset Permanently
              </h3>
            </div>

            <p className="text-black/80 leading-relaxed">
              Are you sure you want to delete <span className="font-bold">{assetToDelete.path}</span> from the storage bucket?
            </p>

            {assetUsage && assetUsage.totalUses > 0 && (
              <div className="p-3 text-small text-black space-y-1">
                <div className="font-medium uppercase">Active Usage Notice:</div>
                <p>
                  This asset is currently in use across {assetUsage.totalUses} place(s):{' '}
                  {assetUsage.productTitles.join(', ')}. Deleting it will remove the file from storage and replace storefront placements with the neutral placeholder.
                </p>
              </div>
            )}

            {deleteError && (
              <div className="p-2 text-red-700 text-small">
                {deleteError}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setAssetToDelete(null)}
                className="px-3 py-1.5 text-small uppercase cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-4 py-1.5 text-white text-small uppercase tracking-wider cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Remove Everywhere'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Universal Image Editor */}
      {editorAsset && (
        <UniversalImageEditorModal
          isOpen={Boolean(editorAsset)}
          imageUrl={editorAsset.url}
          title={`Framing Calibration · ${editorAsset.alt || editorAsset.path.split('/').pop()}`}
          initialFraming={{
            focalX: editorAsset.focalX ?? 50,
            focalY: editorAsset.focalY ?? 50,
          }}
          onClose={() => setEditorAsset(null)}
          onApply={(framing) => {
            // Apply framing parameters
            setEditorAsset(null);
          }}
          onExportCopy={() => {
            loadMedia();
          }}
        />
      )}
    </div>
  );
};
