import { useState, useRef } from 'react';
import Image from 'next/image';
import { 
  CloudArrowUpIcon, 
  TrashIcon, 
  PhotoIcon,
  PlusIcon,
  XMarkIcon 
} from '@heroicons/react/24/outline';

interface GalleryImage {
  _id: string;
  url: string;
  thumbnailUrl?: string;
  alt: string;
  caption: string;
}

interface GallerySectionProps {
  images: GalleryImage[];
  onImagesUpdate: (files: File[]) => Promise<void>;
  onImageDelete: (imageId: string) => Promise<void>;
  onImagesDelete: (imageIds: string[]) => Promise<void>;
}

export default function GallerySection({
  images,
  onImagesUpdate,
  onImageDelete,
  onImagesDelete
}: GallerySectionProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [selectedImage, setSelectedImage] = useState<GalleryImage | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);

  const toggleSelected = (imageId: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(imageId)) next.delete(imageId);
      else next.add(imageId);
      return next;
    });
  };

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelectedIds(new Set());
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Delete ${selectedIds.size} selected image${selectedIds.size === 1 ? '' : 's'}? This cannot be undone.`)) {
      return;
    }
    try {
      setDeleting(true);
      await onImagesDelete([...selectedIds]);
      exitSelectMode();
    } catch (error) {
      console.error('Bulk delete error:', error);
    } finally {
      setDeleting(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await handleFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFiles = async (files: File[]) => {
    // Validate file types
    const validFiles = files.filter(file => 
      file.type.match(/^image\/(jpeg|jpg|png|webp)$/)
    );

    if (validFiles.length !== files.length) {
      alert('Some files were skipped. Only JPEG, PNG, and WebP images are allowed.');
    }

    if (validFiles.length === 0) {
      return;
    }

    // Check file sizes (5MB max per image)
    const oversizedFiles = validFiles.filter(file => file.size > 5 * 1024 * 1024);
    if (oversizedFiles.length > 0) {
      alert(`${oversizedFiles.length} file(s) exceed the 5MB limit and will be skipped.`);
      const validSizedFiles = validFiles.filter(file => file.size <= 5 * 1024 * 1024);
      if (validSizedFiles.length === 0) {
        return;
      }
      files = validSizedFiles;
    } else {
      files = validFiles;
    }

    try {
      setUploading(true);
      await onImagesUpdate(files);
    } catch (error) {
      console.error('Upload error:', error);
    } finally {
      setUploading(false);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(Array.from(e.target.files));
    }
  };

  const handleDelete = async (imageId: string) => {
    if (confirm('Are you sure you want to delete this image?')) {
      try {
        await onImageDelete(imageId);
      } catch (error) {
        console.error('Delete error:', error);
      }
    }
  };

  return (
    <div className="bg-white shadow sm:rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Gallery Images</h3>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">
              {images.length} image{images.length === 1 ? '' : 's'}
            </span>
            {images.length > 0 && !selectMode && (
              <button
                type="button"
                onClick={() => setSelectMode(true)}
                className="text-sm font-medium text-gray-700 border border-gray-300 rounded-md px-3 py-1 hover:bg-gray-50"
              >
                Select
              </button>
            )}
            {selectMode && (
              <>
                <button
                  type="button"
                  onClick={handleBulkDelete}
                  disabled={selectedIds.size === 0 || deleting}
                  className="text-sm font-medium text-white bg-red-600 rounded-md px-3 py-1 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {deleting ? 'Deleting…' : `Delete Selected (${selectedIds.size})`}
                </button>
                <button
                  type="button"
                  onClick={exitSelectMode}
                  disabled={deleting}
                  className="text-sm font-medium text-gray-700 border border-gray-300 rounded-md px-3 py-1 hover:bg-gray-50"
                >
                  Cancel
                </button>
              </>
            )}
          </div>
        </div>
        
        <div className="space-y-4">
          {/* Gallery Grid.
              Tiles were 2-4 columns wide (~270px each on a desktop) but showed the
              96×96 thumbnail — generated "for crisp display at 48×48" (see
              storageService) — so every photo was upscaled ~3× and pixelated.
              Smaller tiles plus the full image as the source: the browser
              downscales, which is always sharp; the tiny thumb upscaled never is. */}
          {images.length > 0 && (
            <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {images.map((image) => (
                <div key={image._id} className="relative group">
                  <div
                    className={`relative aspect-square rounded-lg overflow-hidden bg-gray-100 cursor-pointer ${
                      selectMode && selectedIds.has(image._id) ? 'ring-2 ring-red-500 ring-offset-2' : ''
                    }`}
                    onClick={() => (selectMode ? toggleSelected(image._id) : setSelectedImage(image))}
                  >
                    <Image
                      src={image.url}
                      alt={image.alt || 'Gallery image'}
                      fill
                      sizes="(max-width: 768px) 33vw, (max-width: 1024px) 25vw, 17vw"
                      className="object-cover"
                    />
                    <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-40 transition-opacity"></div>
                    {selectMode && (
                      <div
                        className={`absolute top-2 left-2 h-5 w-5 rounded-full border-2 flex items-center justify-center ${
                          selectedIds.has(image._id)
                            ? 'bg-red-600 border-red-600'
                            : 'bg-white/80 border-gray-400'
                        }`}
                      >
                        {selectedIds.has(image._id) && (
                          <svg className="h-3 w-3 text-white" viewBox="0 0 12 12" fill="none">
                            <path d="M2 6l3 3 5-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </div>
                    )}
                  </div>

                  {!selectMode && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(image._id);
                      }}
                      className="absolute top-2 right-2 p-1.5 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-700"
                      title="Delete image"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  )}
                  
                  {image.caption && (
                    <p className="mt-2 text-xs text-gray-600 truncate" title={image.caption}>
                      {image.caption}
                    </p>
                  )}
                </div>
              ))}
              
              {/* Add More Button */}
              {!selectMode && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="relative aspect-square rounded-lg border-2 border-dashed border-gray-300 hover:border-[#F5821F] hover:bg-orange-50 transition-colors flex items-center justify-center"
                  disabled={uploading}
                >
                  <div className="text-center">
                    <PlusIcon className="mx-auto h-8 w-8 text-gray-400" />
                    <span className="mt-2 block text-sm text-gray-600">Add Images</span>
                  </div>
                </button>
              )}
            </div>
          )}

          {/* Upload Zone (when no images) */}
          {images.length === 0 && (
            <div
              className={`relative border-2 border-dashed rounded-lg p-8 ${
                dragActive ? 'border-[#F5821F] bg-orange-50' : 'border-gray-300'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <div className="text-center">
                <PhotoIcon className="mx-auto h-12 w-12 text-gray-400" />
                <div className="mt-4">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-[#F5821F] hover:bg-[#e0741c] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#F5821F]"
                    disabled={uploading}
                  >
                    <CloudArrowUpIcon className="h-5 w-5 mr-2" />
                    Upload Images
                  </button>
                  <p className="mt-2 text-sm text-gray-600">
                    or drag and drop
                  </p>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  JPEG, PNG, WebP up to 5MB each
                </p>
              </div>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            onChange={handleFileInput}
            disabled={uploading}
          />

          {/* Upload Progress */}
          {uploading && (
            <div className="mt-4">
              <div className="bg-gray-200 rounded-full h-2">
                <div className="bg-[#F5821F] h-2 rounded-full animate-pulse" style={{ width: '50%' }}></div>
              </div>
              <p className="text-sm text-gray-600 mt-2">Uploading images...</p>
            </div>
          )}

          {/* Instructions */}
          <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-600">
            <p className="font-medium mb-1">Gallery Image Guidelines:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Maximum file size: 5MB per image</li>
              <li>Supported formats: JPEG, PNG, WebP</li>
              <li>Images will be automatically optimized for web display</li>
              <li>Click on an image to view it in full size</li>
              <li>Use Select to remove several images at once</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Lightbox Modal */}
      {selectedImage && (
        <div 
          className="fixed inset-0 z-50 bg-black bg-opacity-75 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-4xl max-h-full">
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute -top-10 right-0 text-white hover:text-gray-300"
            >
              <XMarkIcon className="h-8 w-8" />
            </button>
            <div className="relative">
              <Image
                src={selectedImage.url}
                alt={selectedImage.alt || 'Gallery image'}
                width={1200}
                height={800}
                className="object-contain max-h-[80vh] w-auto"
              />
              {selectedImage.caption && (
                <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white p-4">
                  <p className="text-sm">{selectedImage.caption}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}