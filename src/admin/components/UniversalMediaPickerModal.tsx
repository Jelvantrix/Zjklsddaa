import React, { useState, useEffect, useRef } from 'react';
import { MediaAsset } from '../../types';
import {
  getMediaAssets,
  uploadMediaAsset,
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE_BYTES,
} from '../../supabase/mediaService';

export interface UniversalMediaPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (url: string, asset?: MediaAsset) => void;
  title?: string;
  allowedKind?: 'all' | 'image' | 'video';
  currentUrl?: string;
}

export const UniversalMediaPickerModal: React.FC<UniversalMediaPickerProps> = ({
  isOpen,
  onClose,
  onSelect,
  title = 'Select Media',
  allowedKind = 'all',
  currentUrl,
}) => {
  const [tab, setTab] = useState<'upload' | 'library' | 'url'>('upload');
  const [libraryAssets, setLibraryAssets] = useState<MediaAsset[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingLibrary, setLoadingLibrary] = useState(false);

  // Upload state
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [failedFile, setFailedFile] = useState<File | null>(null);

  // URL state
  const [manualUrl, setManualUrl] = useState('');
  const [urlError, setUrlError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadLibrary();
      setUploadError(null);
      setUrlError(null);
      setManualUrl('');
    }
  }, [isOpen]);

  const loadLibrary = async () => {
    setLoadingLibrary(true);
    try {
      const assets = await getMediaAssets();
      setLibraryAssets(assets);
    } catch (err) {
      console.warn('Failed to load library:', err);
    } finally {
      setLoadingLibrary(false);
    }
  };

  const handleFileUpload = async (file: File) => {
    setUploadError(null);
    setFailedFile(null);

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setUploadError(`File is too large (${(file.size / (1024 * 1024)).toFixed(1)} MB). Maximum size is 15 MB.`);
      return;
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      setUploadError('Unsupported file format. Please upload JPEG, PNG, WebP, AVIF, MP4, or WebM.');
      return;
    }

    setIsUploading(true);
    setUploadProgress(10);

    try {
      const asset = await uploadMediaAsset(file, {
        onProgress: (p) => setUploadProgress(p),
      });

      setUploadProgress(100);
      setTimeout(() => {
        setIsUploading(false);
        setUploadProgress(null);
        onSelect(asset.url, asset);
        onClose();
      }, 300);
    } catch (err: any) {
      console.error('Upload failed:', err);
      setIsUploading(false);
      setUploadProgress(null);
      setFailedFile(file);
      setUploadError(err.message || 'Upload failed. Please check network connection and try again.');
    }
  };

  const handleRetryUpload = () => {
    if (failedFile) {
      handleFileUpload(failedFile);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setUrlError(null);

    const trimmed = manualUrl.trim();
    if (!trimmed) {
      setUrlError('Please enter an image or video URL.');
      return;
    }

    if (!trimmed.startsWith('https://')) {
      setUrlError('URL must begin with secure protocol (https://).');
      return;
    }

    onSelect(trimmed);
    onClose();
  };

  if (!isOpen) return null;

  const filteredAssets = libraryAssets.filter((a) => {
    if (allowedKind === 'image' && a.kind !== 'image') return false;
    if (allowedKind === 'video' && a.kind !== 'video') return false;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (a.alt && a.alt.toLowerCase().includes(q)) || (a.path && a.path.toLowerCase().includes(q));
  });

  return (
    <div className="fixed inset-0 z-[115] bg-white text-black p-6 flex flex-col overflow-y-auto select-none">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-4 pb-6 shrink-0">
        <div>
          <span className="text-small text-black/40 block mb-1">Media Management</span>
          <h2 className="text-title">{title}</h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-small text-black hover:underline cursor-pointer"
        >
          Close
        </button>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-6 pb-6 text-small shrink-0">
        <button
          type="button"
          onClick={() => setTab('upload')}
          className={`cursor-pointer ${ tab ==='upload' ? 'underline font-bold text-black' : 'text-black/50 hover:text-black'
          }`}
        >
          Upload Device
        </button>

        <button
          type="button"
          onClick={() => setTab('library')}
          className={`cursor-pointer ${ tab ==='library' ? 'underline font-bold text-black' : 'text-black/50 hover:text-black'
          }`}
        >
          Library ({libraryAssets.length})
        </button>

        <button
          type="button"
          onClick={() => setTab('url')}
          className={`cursor-pointer ${ tab ==='url' ? 'underline font-bold text-black' : 'text-black/50 hover:text-black'
          }`}
        >
          Paste URL
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto">
        {/* TAB 1: UPLOAD FROM DEVICE */}
        {tab === 'upload' && (
          <div className="space-y-6 max-w-xl">
            {/* Dropzone */}
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="py-12 cursor-pointer space-y-4"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/avif,video/mp4,video/webm"
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    handleFileUpload(e.target.files[0]);
                  }
                }}
                className="hidden"
              />

              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    handleFileUpload(e.target.files[0]);
                  }
                }}
                className="hidden"
              />

              <div className="space-y-2">
                <p className="text-body text-black hover:underline">
                  Drag and drop file here, or click to browse
                </p>
                <p className="text-small text-black/40">
                  Auto-compresses to WebP (max 2400px) · Up to 15 MB
                </p>
              </div>

              {/* Mobile Camera Option */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    cameraInputRef.current?.click();
                  }}
                  className="text-small text-black hover:underline cursor-pointer"
                >
                  Take Photo →
                </button>
              </div>
            </div>

            {/* Progress Bar */}
            {isUploading && (
              <div className="space-y-1">
                <p className="text-small text-black/60">
                  Compressing & uploading to Storage... {uploadProgress || 0}%
                </p>
              </div>
            )}

            {/* Error Notice & Retry */}
            {uploadError && (
              <div className="space-y-2">
                <div className="text-small text-black">
                  <span className="block font-medium">Upload Notice</span>
                  <span className="block text-black/70">{uploadError}</span>
                </div>
                {failedFile && (
                  <button
                    type="button"
                    onClick={handleRetryUpload}
                    className="text-small text-black underline cursor-pointer"
                  >
                    Retry
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: CHOOSE FROM MEDIA LIBRARY */}
        {tab === 'library' && (
          <div className="space-y-6">
            <div className="max-w-md">
              <input
                type="text"
                placeholder="Filter media assets by name or path..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-body"
              />
            </div>

            {loadingLibrary ? (
              <div className="py-12 text-small text-black/40">
                Loading storage assets...
              </div>
            ) : filteredAssets.length === 0 ? (
              <div className="py-12 space-y-1">
                <p className="text-body text-black/60">
                  No media assets found
                </p>
                <p className="text-small text-black/40">
                  Upload from your device to populate your storage library
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6 max-h-[60vh] overflow-y-auto">
                {filteredAssets.map((asset) => {
                  const isSelected = currentUrl === asset.url;
                  return (
                    <div
                      key={asset.id}
                      onClick={() => {
                        onSelect(asset.url, asset);
                        onClose();
                      }}
                      className="cursor-pointer space-y-1"
                    >
                      <div className="relative aspect-[3/4] overflow-hidden bg-white">
                        {asset.kind === 'video' ? (
                          <video
                            src={asset.url}
                            className="w-full h-full object-cover"
                            muted
                            playsInline
                          />
                        ) : (
                          <img
                            src={asset.url}
                            alt={asset.alt || 'Asset'}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        )}
                      </div>

                      <div className="flex items-baseline justify-between text-small">
                        <span className={`truncate ${isSelected ?'font-bold underline' : 'text-black/60'}`}>
                          {asset.alt || asset.path.split('/').pop()}
                        </span>
                        {isSelected && <span className="text-black font-bold">Selected</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: PASTE HTTPS URL */}
        {tab === 'url' && (
          <form onSubmit={handleUrlSubmit} className="space-y-6 max-w-md">
            <div className="space-y-1">
              <label className="block text-small text-black/60">
                Secure Image or Video URL (HTTPS)
              </label>
              <input
                type="url"
                placeholder="https://your-domain.com/path/image.webp"
                value={manualUrl}
                onChange={(e) => setManualUrl(e.target.value)}
                className="w-full text-body"
              />
            </div>

            {urlError && (
              <p className="text-small text-black/70">
                {urlError}
              </p>
            )}

            <button
              type="submit"
              className="text-small text-black hover:underline cursor-pointer"
            >
              Use URL →
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
