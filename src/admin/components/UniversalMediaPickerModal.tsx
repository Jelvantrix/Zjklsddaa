import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Upload,
  Camera,
  Grid,
  Link as LinkIcon,
  Search,
  Check,
  AlertCircle,
  Loader2,
  Trash2,
  Sparkles,
  Maximize2,
} from 'lucide-react';
import { MediaAsset, NEUTRAL_PLACEHOLDER_IMG } from '../../types';
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
      setUploadError(`Unsupported file format. Please upload JPEG, PNG, WebP, AVIF, MP4, or WebM.`);
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
    <div className="fixed inset-0 z-[115] flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs select-none">
      <div className="bg-white border border-black/20 w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl font-sans">
        {/* Top Header */}
        <div className="p-4 sm:px-6 border-b border-black/10 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-xs uppercase tracking-[0.2em] font-medium text-black">
              {title}
            </h2>
            <p className="text-[10px] text-black/40 font-mono">
              Upload from device, camera, media library, or HTTPS link
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-black/40 hover:text-black cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-black/10 bg-neutral-50 shrink-0 font-mono text-[11px]">
          <button
            type="button"
            onClick={() => setTab('upload')}
            className={`flex-1 py-2.5 px-4 flex items-center justify-center gap-2 border-b-2 cursor-pointer uppercase tracking-wider ${
              tab === 'upload'
                ? 'border-black bg-white text-black font-medium'
                : 'border-transparent text-black/50 hover:text-black'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload Device</span>
          </button>

          <button
            type="button"
            onClick={() => setTab('library')}
            className={`flex-1 py-2.5 px-4 flex items-center justify-center gap-2 border-b-2 cursor-pointer uppercase tracking-wider ${
              tab === 'library'
                ? 'border-black bg-white text-black font-medium'
                : 'border-transparent text-black/50 hover:text-black'
            }`}
          >
            <Grid className="w-3.5 h-3.5" />
            <span>Library ({libraryAssets.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setTab('url')}
            className={`flex-1 py-2.5 px-4 flex items-center justify-center gap-2 border-b-2 cursor-pointer uppercase tracking-wider ${
              tab === 'url'
                ? 'border-black bg-white text-black font-medium'
                : 'border-transparent text-black/50 hover:text-black'
            }`}
          >
            <LinkIcon className="w-3.5 h-3.5" />
            <span>Paste URL</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1">
          {/* TAB 1: UPLOAD FROM DEVICE */}
          {tab === 'upload' && (
            <div className="space-y-4">
              {/* Dropzone */}
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="border border-dashed border-black/30 hover:border-black p-8 sm:p-12 text-center bg-neutral-50/50 hover:bg-neutral-50 transition-colors cursor-pointer flex flex-col items-center justify-center gap-3"
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

                <div className="w-12 h-12 rounded-full border border-black/15 flex items-center justify-center bg-white">
                  <Upload className="w-5 h-5 text-black" />
                </div>

                <div>
                  <div className="text-xs font-mono uppercase tracking-wider text-black">
                    Drag and drop file here, or click to browse
                  </div>
                  <div className="text-[10px] text-black/40 font-mono mt-1">
                    Auto-compresses to WebP (max 2400px) · Up to 15 MB
                  </div>
                </div>

                {/* Mobile Camera Option */}
                <div className="pt-2 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      cameraInputRef.current?.click();
                    }}
                    className="px-3 py-1.5 bg-white border border-black/20 hover:border-black text-[10.5px] uppercase font-mono tracking-wider flex items-center gap-1.5 cursor-pointer"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Take Photo</span>
                  </button>
                </div>
              </div>

              {/* Progress Bar */}
              {isUploading && (
                <div className="p-4 border border-black/15 bg-neutral-50 space-y-2">
                  <div className="flex justify-between text-[11px] font-mono uppercase">
                    <span>Compressing & uploading to Storage...</span>
                    <span>{uploadProgress || 0}%</span>
                  </div>
                  <div className="w-full h-1 bg-black/10 overflow-hidden">
                    <div
                      className="h-full bg-black transition-all duration-300"
                      style={{ width: `${uploadProgress || 10}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Error Notice & Retry */}
              {uploadError && (
                <div className="p-4 border border-black/20 bg-neutral-100 flex items-start justify-between gap-3 text-xs font-mono">
                  <div className="flex items-start gap-2 text-black">
                    <AlertCircle className="w-4 h-4 text-black shrink-0 mt-0.5" />
                    <div>
                      <div className="font-medium uppercase">Upload Notice</div>
                      <div className="text-black/70 mt-0.5">{uploadError}</div>
                    </div>
                  </div>
                  {failedFile && (
                    <button
                      type="button"
                      onClick={handleRetryUpload}
                      className="px-3 py-1 border border-black text-[10px] uppercase font-mono tracking-wider bg-white hover:bg-black hover:text-white cursor-pointer shrink-0"
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
            <div className="space-y-4">
              <div className="flex items-center gap-2 border border-black/15 px-3 py-2">
                <Search className="w-3.5 h-3.5 text-black/40" />
                <input
                  type="text"
                  placeholder="Filter media assets by name or path..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full text-xs font-mono focus:outline-none bg-transparent"
                />
              </div>

              {loadingLibrary ? (
                <div className="py-12 text-center text-xs font-mono text-black/40 flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-black" />
                  <span>Loading storage assets...</span>
                </div>
              ) : filteredAssets.length === 0 ? (
                <div className="py-12 text-center border border-dashed border-black/15 p-8">
                  <div className="text-xs font-mono text-black/60 uppercase">
                    No media assets found
                  </div>
                  <div className="text-[10px] text-black/40 font-mono mt-1">
                    Upload from your device to populate your storage library
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-[50vh] overflow-y-auto">
                  {filteredAssets.map((asset) => {
                    const isSelected = currentUrl === asset.url;
                    return (
                      <div
                        key={asset.id}
                        onClick={() => {
                          onSelect(asset.url, asset);
                          onClose();
                        }}
                        className={`group relative aspect-[3/4] border bg-neutral-50 overflow-hidden cursor-pointer transition-all ${
                          isSelected ? 'border-black ring-1 ring-black' : 'border-black/10 hover:border-black'
                        }`}
                      >
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

                        {isSelected && (
                          <div className="absolute top-2 right-2 bg-black text-white p-1 shadow-xs">
                            <Check className="w-3 h-3" />
                          </div>
                        )}

                        <div className="absolute inset-x-0 bottom-0 p-1.5 bg-white/95 border-t border-black/10 text-[9px] font-mono text-black/70 truncate">
                          {asset.alt || asset.path.split('/').pop()}
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
            <form onSubmit={handleUrlSubmit} className="space-y-4">
              <div>
                <label className="block text-[10.5px] uppercase font-mono tracking-wider text-black/60 mb-1">
                  Secure Image or Video URL (HTTPS)
                </label>
                <input
                  type="url"
                  placeholder="https://your-domain.com/path/image.webp"
                  value={manualUrl}
                  onChange={(e) => setManualUrl(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono border border-black/20 focus:border-black focus:outline-none"
                />
              </div>

              {urlError && (
                <div className="p-3 border border-black/20 bg-neutral-100 text-[11px] font-mono text-black flex items-center gap-2">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{urlError}</span>
                </div>
              )}

              <button
                type="submit"
                className="px-4 py-2 bg-black text-white hover:bg-neutral-800 text-[11px] font-mono uppercase tracking-widest cursor-pointer"
              >
                Use URL
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
