'use client';

import React, { useState, useEffect, useCallback } from 'react';
import MediaThumbnail from './MediaThumbnail';
import { MediaService, MediaFile, MediaListParams, MediaStatsResponse } from '@/lib/mediaService';
import { useToast } from '@/contexts/ToastContext';
import Button from './Button';
import { 
  MagnifyingGlassIcon, 
  PhotoIcon, 
  EyeIcon,
  DocumentDuplicateIcon,
  PencilIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

interface MediaGalleryContentProps {
  onSelect: (file: MediaFile) => void;
  allowedTypes?: string[];
}

export default function MediaGalleryContent({ 
  onSelect,
  allowedTypes 
}: MediaGalleryContentProps) {
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('');
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [sortBy, setSortBy] = useState<'createdAt' | 'size' | 'originalName' | 'usageCount'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalFiles, setTotalFiles] = useState(0);
  const [isAdminView, setIsAdminView] = useState(false);
  const [previewFile, setPreviewFile] = useState<MediaFile | null>(null);
  const [editingFile, setEditingFile] = useState<MediaFile | null>(null);
  const [editForm, setEditForm] = useState({ alt: '', caption: '', tags: '' });
  const [stats, setStats] = useState<MediaStatsResponse['data'] | null>(null);

  const toast = useToast();

  const fetchFiles = useCallback(async () => {
    try {
      setLoading(true);
      
      const params: MediaListParams = {
        page: currentPage,
        limit: 20,
        search: searchTerm || undefined,
        type: filterType || undefined,
        category: filterCategory || undefined,
        sortBy,
        sortOrder
      };

      const response = await MediaService.getMediaFiles(params);
      
      if (response.success) {
        setFiles(response.data.files);
        setCurrentPage(response.data.pagination.currentPage);
        setTotalPages(response.data.pagination.totalPages);
        setTotalFiles(response.data.pagination.totalFiles);
        setIsAdminView(response.data.isAdminView);
      }
    } catch (error) {
      console.error('Error fetching files:', error);
      toast.error('Failed to load media files', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchTerm, filterType, filterCategory, sortBy, sortOrder, toast]);

  const fetchStats = useCallback(async () => {
    try {
      const response = await MediaService.getStorageStats();
      if (response.success) {
        setStats(response.data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  }, []);

  useEffect(() => {
    fetchFiles();
    fetchStats();
  }, [fetchFiles, fetchStats]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchFiles();
  };

  const handleFileSelect = (file: MediaFile) => {
    onSelect(file);
  };

  const handleCopyUrl = async (url: string) => {
    const success = await MediaService.copyUrlToClipboard(url);
    if (success) {
      toast.success('URL copied to clipboard');
    } else {
      toast.error('Failed to copy URL');
    }
  };

  const handleEdit = (file: MediaFile) => {
    setEditingFile(file);
    setEditForm({
      alt: file.alt || '',
      caption: file.caption || '',
      tags: file.tags.join(', ')
    });
  };

  const handleSaveEdit = async () => {
    if (!editingFile) return;

    try {
      const updates = {
        alt: editForm.alt,
        caption: editForm.caption,
        tags: editForm.tags.split(',').map(tag => tag.trim()).filter(Boolean)
      };

      await MediaService.updateMediaFile(editingFile._id, updates);
      toast.success('File updated successfully');
      setEditingFile(null);
      fetchFiles();
    } catch (error) {
      console.error('Error updating file:', error);
      toast.error('Failed to update file', error instanceof Error ? error.message : 'Unknown error');
    }
  };

  const filteredFiles = allowedTypes 
    ? files.filter(file => allowedTypes.includes(file.type))
    : files;

  return (
    <div className="h-full flex flex-col">
      {/* Header with stats */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h3 className="text-lg font-medium text-gray-900">Browse Media</h3>
            {stats && (
              <div className="text-sm text-gray-500">
                {stats.totalFiles} files • {stats.formattedTotalSize}
              </div>
            )}
          </div>
          {isAdminView && (
            <span className="px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 rounded">
              Admin View
            </span>
          )}
        </div>
      </div>

      {/* Toolbar */}
      <div className="px-6 py-4 border-b border-gray-200 space-y-4">
        {/* Search and Filters */}
        <div className="flex flex-wrap items-center gap-4">
          <form onSubmit={handleSearch} className="flex-1 min-w-[300px]">
            <div className="relative">
              <input
                type="text"
                placeholder="Search files..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 absolute left-3 top-2.5" />
            </div>
          </form>
          
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Types</option>
            <option value="banner">Banner</option>
            <option value="gallery">Gallery</option>
            <option value="avatar">Avatar</option>
            <option value="document">Document</option>
          </select>

          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Categories</option>
            <option value="service">Service</option>
            <option value="union">Union</option>
            <option value="conference">Conference</option>
            <option value="church">Church</option>
            <option value="team">Team</option>
            <option value="user">User</option>
            <option value="general">General</option>
          </select>

          <select
            value={`${sortBy}-${sortOrder}`}
            onChange={(e) => {
              const [field, order] = e.target.value.split('-');
              setSortBy(field as 'createdAt' | 'size' | 'originalName' | 'usageCount');
              setSortOrder(order as 'asc' | 'desc');
            }}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
          >
            <option value="createdAt-desc">Newest First</option>
            <option value="createdAt-asc">Oldest First</option>
            <option value="originalName-asc">Name A-Z</option>
            <option value="originalName-desc">Name Z-A</option>
            <option value="size-desc">Largest First</option>
            <option value="size-asc">Smallest First</option>
            <option value="usageCount-desc">Most Used</option>
          </select>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-gray-500">Loading...</div>
          </div>
        ) : filteredFiles.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64">
            <PhotoIcon className="h-16 w-16 text-gray-300" />
            <p className="mt-4 text-lg text-gray-500">No media files found</p>
            <p className="text-sm text-gray-400">Try adjusting your search or filters</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {filteredFiles.map((file) => (
              <div
                key={file._id}
                className="relative group bg-white border-2 rounded-lg overflow-hidden cursor-pointer transition-all border-gray-200 hover:border-gray-300 hover:ring-2 hover:ring-indigo-200"
                onClick={() => handleFileSelect(file)}
              >
                {/* Image */}
                <div className="aspect-square relative bg-gray-100">
                  {file.mimeType.startsWith('image/') ? (
                    <MediaThumbnail
                      src={file.thumbnail?.url || file.url}
                      alt={file.alt || file.originalName}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 16vw"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <PhotoIcon className="h-12 w-12 text-gray-400" />
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <div className="flex space-x-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setPreviewFile(file);
                        }}
                        className="p-2 bg-white rounded-full text-gray-700 hover:bg-gray-100"
                        title="Preview"
                      >
                        <EyeIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopyUrl(file.url);
                        }}
                        className="p-2 bg-white rounded-full text-gray-700 hover:bg-gray-100"
                        title="Copy URL"
                      >
                        <DocumentDuplicateIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(file);
                        }}
                        className="p-2 bg-white rounded-full text-gray-700 hover:bg-gray-100"
                        title="Edit"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* File info */}
                <div className="p-2">
                  <p className="text-xs font-medium text-gray-900 truncate" title={file.originalName}>
                    {file.originalName}
                  </p>
                  <div className="flex items-center justify-between text-xs text-gray-500 mt-1">
                    <span>{file.formattedSize}</span>
                    <span className="uppercase">{file.type}</span>
                  </div>
                  {isAdminView && (
                    <p className="text-xs text-purple-600 mt-1">
                      {file.uploadedBy?.name ?? 'Unknown uploader'}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="p-4 border-t border-gray-200 flex items-center justify-between">
          <div className="text-sm text-gray-500">
            Page {currentPage} of {totalPages} • {totalFiles} total files
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="p-2 border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              <ChevronLeftIcon className="h-4 w-4" />
            </button>
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="p-2 border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              <ChevronRightIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewFile && (
        <div className="fixed inset-0 bg-black bg-opacity-75 z-[70] flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-4xl max-h-[90vh] overflow-auto">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-medium">{previewFile.originalName}</h3>
              <button
                onClick={() => setPreviewFile(null)}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4">
              {previewFile.mimeType.startsWith('image/') ? (
                <MediaThumbnail
                  src={previewFile.url}
                  alt={previewFile.alt || previewFile.originalName}
                  width={800}
                  height={600}
                  className="max-w-full h-auto"
                />
              ) : (
                <div className="flex items-center justify-center h-64">
                  <PhotoIcon className="h-16 w-16 text-gray-400" />
                  <span className="ml-4 text-gray-500">Preview not available</span>
                </div>
              )}
              <div className="mt-4 space-y-2 text-sm text-gray-600">
                <p><strong>Size:</strong> {previewFile.formattedSize}</p>
                <p><strong>Type:</strong> {previewFile.type}</p>
                <p><strong>Category:</strong> {previewFile.category}</p>
                {previewFile.alt && <p><strong>Alt text:</strong> {previewFile.alt}</p>}
                {previewFile.caption && <p><strong>Caption:</strong> {previewFile.caption}</p>}
                {previewFile.tags.length > 0 && <p><strong>Tags:</strong> {previewFile.tags.join(', ')}</p>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingFile && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[70] flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-medium">Edit File</h3>
              <button
                onClick={() => setEditingFile(null)}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Alt Text
                </label>
                <input
                  type="text"
                  value={editForm.alt}
                  onChange={(e) => setEditForm({ ...editForm, alt: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  placeholder="Describe the image for accessibility"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Caption
                </label>
                <textarea
                  value={editForm.caption}
                  onChange={(e) => setEditForm({ ...editForm, caption: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  placeholder="Add a caption for this file"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tags
                </label>
                <input
                  type="text"
                  value={editForm.tags}
                  onChange={(e) => setEditForm({ ...editForm, tags: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  placeholder="Comma-separated tags"
                />
              </div>
            </div>
            <div className="p-4 border-t border-gray-200 flex justify-end space-x-3">
              <Button
                variant="outline"
                onClick={() => setEditingFile(null)}
              >
                Cancel
              </Button>
              <Button onClick={handleSaveEdit}>
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}