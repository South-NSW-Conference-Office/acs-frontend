'use client';

import React, { useState, useEffect, useCallback } from 'react';
import MediaThumbnail from './MediaThumbnail';
import { MediaService, MediaFile, MediaListParams, MediaStatsResponse } from '@/lib/mediaService';
import { useToast } from '@/contexts/ToastContext';
import Button from './Button';
import { 
  MagnifyingGlassIcon, 
  PhotoIcon, 
  TrashIcon, 
  EyeIcon,
  DocumentDuplicateIcon,
  ArrowDownTrayIcon,
  XMarkIcon,
  PencilIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CheckIcon,
} from '@heroicons/react/24/outline';

export default function MediaGalleryPage() {
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('');
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [sortBy, setSortBy] = useState<'createdAt' | 'size' | 'originalName' | 'usageCount'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalFiles, setTotalFiles] = useState(0);
  const [isAdminView, setIsAdminView] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
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
    if (selectedFiles.has(file._id)) {
      const newSelected = new Set(selectedFiles);
      newSelected.delete(file._id);
      setSelectedFiles(newSelected);
    } else {
      setSelectedFiles(new Set(selectedFiles).add(file._id));
    }
  };

  const handleSelectAll = () => {
    if (selectedFiles.size === files.length) {
      setSelectedFiles(new Set());
    } else {
      setSelectedFiles(new Set(files.map(f => f._id)));
    }
  };

  const handleDelete = async (fileIds: string[]) => {
    if (!confirm(`Are you sure you want to delete ${fileIds.length} file(s)? This action cannot be undone.`)) {
      return;
    }

    try {
      if (fileIds.length === 1) {
        await MediaService.deleteMediaFile(fileIds[0]);
        toast.success('File deleted successfully');
      } else {
        const response = await MediaService.bulkDeleteMediaFiles(fileIds);
        if (response.success) {
          toast.success(`${response.data.deleted.length} files deleted successfully`);
          if (response.data.failed.length > 0) {
            toast.error(`${response.data.failed.length} files failed to delete`);
          }
        }
      }
      
      setSelectedFiles(new Set());
      fetchFiles();
    } catch (error) {
      console.error('Error deleting files:', error);
      toast.error('Failed to delete files', error instanceof Error ? error.message : 'Unknown error');
    }
  };

  const handleCopyUrl = async (url: string) => {
    const success = await MediaService.copyUrlToClipboard(url);
    if (success) {
      toast.success('URL copied to clipboard');
    } else {
      toast.error('Failed to copy URL');
    }
  };

  const handleDownload = (file: MediaFile) => {
    MediaService.downloadFile(file.url, file.originalName);
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

  return (
    <div className="space-y-6">
      {/* Header with stats */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Media Gallery
              {isAdminView && (
                <span className="ml-2 px-3 py-1 text-sm font-medium bg-purple-100 text-purple-800 rounded-full">
                  Admin View
                </span>
              )}
            </h1>
            <p className="text-gray-600 mt-1">Manage your uploaded images and files</p>
          </div>
          {stats && (
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-gray-900">{stats.totalFiles}</div>
              <div className="text-sm text-gray-500">Files • {stats.formattedTotalSize}</div>
            </div>
          )}
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="space-y-4">
          {/* Search and Filters */}
          <div className="flex flex-wrap items-center gap-4">
            <form onSubmit={handleSearch} className="flex-1 min-w-[300px]">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search files..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 absolute left-3 top-4" />
              </div>
            </form>
            
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
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
              className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
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
              className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
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

          {/* Actions */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <button
                onClick={handleSelectAll}
                className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                {selectedFiles.size === files.length ? 'Deselect All' : 'Select All'}
              </button>
              
              {selectedFiles.size > 0 && (
                <button
                  onClick={() => handleDelete(Array.from(selectedFiles))}
                  className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Delete Selected ({selectedFiles.size})
                </button>
              )}
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                title={viewMode === 'grid' ? 'Switch to list view' : 'Switch to grid view'}
              >
                {viewMode === 'grid' ? (
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="bg-white rounded-lg border border-gray-200">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-gray-500">Loading...</div>
          </div>
        ) : files.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64">
            <PhotoIcon className="h-16 w-16 text-gray-300" />
            <p className="mt-4 text-lg text-gray-500">No media files found</p>
            <p className="text-sm text-gray-400">Try adjusting your search or filters</p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="p-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
            {files.map((file) => (
              <div
                key={file._id}
                className={`relative group bg-white border-2 rounded-lg overflow-hidden cursor-pointer transition-all hover:shadow-lg ${
                  selectedFiles.has(file._id) 
                    ? 'border-indigo-500 ring-2 ring-indigo-200' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
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
                      sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 20vw"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <PhotoIcon className="h-12 w-12 text-gray-400" />
                    </div>
                  )}
                  
                  {/* Selection indicator */}
                  {selectedFiles.has(file._id) && (
                    <div className="absolute top-2 right-2 bg-indigo-600 text-white rounded-full p-1">
                      <CheckIcon className="h-4 w-4" />
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
                        className="p-2 bg-white rounded-full text-gray-700 hover:bg-gray-100 transition-colors"
                        title="Preview"
                      >
                        <EyeIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopyUrl(file.url);
                        }}
                        className="p-2 bg-white rounded-full text-gray-700 hover:bg-gray-100 transition-colors"
                        title="Copy URL"
                      >
                        <DocumentDuplicateIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(file);
                        }}
                        className="p-2 bg-white rounded-full text-gray-700 hover:bg-gray-100 transition-colors"
                        title="Edit"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* File info */}
                <div className="p-3">
                  <p className="text-sm font-medium text-gray-900 truncate" title={file.originalName}>
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
        ) : (
          /* List View */
          <div className="p-6 space-y-3">
            {files.map((file) => (
              <div
                key={file._id}
                className={`flex items-center space-x-4 p-4 border rounded-lg cursor-pointer transition-colors ${
                  selectedFiles.has(file._id)
                    ? 'border-indigo-500 bg-indigo-50'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
                onClick={() => handleFileSelect(file)}
              >
                <div className="flex-shrink-0">
                  {selectedFiles.has(file._id) ? (
                    <CheckIcon className="h-5 w-5 text-indigo-600" />
                  ) : (
                    <div className="h-5 w-5"></div>
                  )}
                </div>
                
                <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                  {file.mimeType.startsWith('image/') ? (
                    <MediaThumbnail
                      src={file.thumbnail?.url || file.url}
                      alt={file.alt || file.originalName}
                      width={64}
                      height={64}
                      className="object-cover w-full h-full"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <PhotoIcon className="h-8 w-8 text-gray-400" />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">
                    {file.originalName}
                  </p>
                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    <span>{file.formattedSize}</span>
                    <span className="uppercase">{file.type}</span>
                    <span>{file.category}</span>
                    {isAdminView && <span>by {file.uploadedBy?.name ?? 'Unknown uploader'}</span>}
                    <span>{new Date(file.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setPreviewFile(file);
                    }}
                    className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                    title="Preview"
                  >
                    <EyeIcon className="h-5 w-5" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCopyUrl(file.url);
                    }}
                    className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                    title="Copy URL"
                  >
                    <DocumentDuplicateIcon className="h-5 w-5" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDownload(file);
                    }}
                    className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                    title="Download"
                  >
                    <ArrowDownTrayIcon className="h-5 w-5" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete([file._id]);
                    }}
                    className="p-2 text-red-400 hover:text-red-600 transition-colors"
                    title="Delete"
                  >
                    <TrashIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-500">
              Page {currentPage} of {totalPages} • {totalFiles} total files
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="p-3 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
              >
                <ChevronLeftIcon className="h-5 w-5" />
              </button>
              <span className="px-4 py-2 text-sm">
                {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="p-3 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
              >
                <ChevronRightIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Preview Modal */}
      {previewFile && (
        <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-4xl max-h-[90vh] overflow-auto">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-medium">{previewFile.originalName}</h3>
              <button
                onClick={() => setPreviewFile(null)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            <div className="p-6">
              {previewFile.mimeType.startsWith('image/') ? (
                <MediaThumbnail
                  src={previewFile.url}
                  alt={previewFile.alt || previewFile.originalName}
                  width={800}
                  height={600}
                  className="max-w-full h-auto rounded-lg"
                />
              ) : (
                <div className="flex items-center justify-center h-64">
                  <PhotoIcon className="h-16 w-16 text-gray-400" />
                  <span className="ml-4 text-gray-500">Preview not available</span>
                </div>
              )}
              <div className="mt-6 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-medium text-gray-900">File Details</p>
                  <div className="mt-2 space-y-1 text-gray-600">
                    <p><strong>Size:</strong> {previewFile.formattedSize}</p>
                    <p><strong>Type:</strong> {previewFile.type}</p>
                    <p><strong>Category:</strong> {previewFile.category}</p>
                    <p><strong>Uploaded:</strong> {new Date(previewFile.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
                <div>
                  <p className="font-medium text-gray-900">Metadata</p>
                  <div className="mt-2 space-y-1 text-gray-600">
                    {previewFile.alt && <p><strong>Alt text:</strong> {previewFile.alt}</p>}
                    {previewFile.caption && <p><strong>Caption:</strong> {previewFile.caption}</p>}
                    {previewFile.tags.length > 0 && <p><strong>Tags:</strong> {previewFile.tags.join(', ')}</p>}
                    <p><strong>Used:</strong> {previewFile.usageCount} times</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingFile && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-medium">Edit File</h3>
              <button
                onClick={() => setEditingFile(null)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Alt Text
                </label>
                <input
                  type="text"
                  value={editForm.alt}
                  onChange={(e) => setEditForm({ ...editForm, alt: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Describe the image for accessibility"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Caption
                </label>
                <textarea
                  value={editForm.caption}
                  onChange={(e) => setEditForm({ ...editForm, caption: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Add a caption for this file"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tags
                </label>
                <input
                  type="text"
                  value={editForm.tags}
                  onChange={(e) => setEditForm({ ...editForm, tags: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Comma-separated tags"
                />
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
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