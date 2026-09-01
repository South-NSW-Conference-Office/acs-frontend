'use client';

import React, { useState, useRef } from 'react';
import Image from 'next/image';
import MediaGalleryContent from './MediaGalleryContent';
import { MediaFile } from '@/lib/mediaService';
import { AuthService } from '@/lib/auth';
import { useToast } from '@/contexts/ToastContext';
import { CloudArrowUpIcon, PhotoIcon, XMarkIcon, ArrowUpTrayIcon } from '@heroicons/react/24/outline';
import { API_BASE_URL } from '@/lib/config';
interface MediaLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (file: MediaFile) => void;
  title?: string;
  allowedTypes?: string[];
  category?: string;
  type?: string;
}

export default function MediaLibraryModal({
  isOpen,
  onClose,
  onSelect,
  title = 'Select Media',
  allowedTypes = ['banner', 'gallery', 'thumbnail'],
  category = 'union',
  type = 'banner'
}: MediaLibraryModalProps) {
  const [activeTab, setActiveTab] = useState<'browse' | 'upload'>('browse');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [altText, setAltText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  const handleFileSelect = (file: File) => {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Invalid file type', 'Please select an image file (JPEG, PNG, WebP).');
      return;
    }

    // Validate file size (2MB limit)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('File too large', 'Image must be smaller than 2MB.');
      return;
    }

    setSelectedFile(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0 && files[0] instanceof File) {
      handleFileSelect(files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error('No file selected', 'Please select an image to upload');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', selectedFile);
      formData.append('type', type);
      formData.append('category', category);
      formData.append('alt', altText);

      const token = AuthService.getToken();
      
      // Debug logging
      console.log('Upload attempt:', {
        fileName: selectedFile.name,
        fileSize: selectedFile.size,
        fileType: selectedFile.type,
        uploadType: type,
        category,
        apiUrl: `${API_BASE_URL}/api/media/upload`,
        hasToken: !!token
      });
      const response = await fetch(`${API_BASE_URL}/api/media/upload`, {
        method: 'POST',
        headers: {
          Authorization: token ? `Bearer ${token}` : '',
        },
        body: formData,
      });

      console.log('Upload response status:', response.status, response.statusText);

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch {
          // If response is not JSON, use the status text
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();
      
      if (result.success && result.data?.file) {
        toast.success('Upload successful', 'Image uploaded successfully');
        onSelect(result.data.file);
        handleClose();
      } else {
        throw new Error(result.message || 'Upload failed - no file data returned');
      }
    } catch (error) {
      console.error('Upload error:', error);
      let errorMessage = 'Unknown error occurred';
      
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      // Provide more specific error messages
      if (errorMessage.includes('401')) {
        errorMessage = 'Authentication failed. Please log in again.';
      } else if (errorMessage.includes('413') || errorMessage.includes('too large')) {
        errorMessage = 'File is too large. Maximum size is 2MB.';
      } else if (errorMessage.includes('415') || errorMessage.includes('file type')) {
        errorMessage = 'Invalid file type. Please select a JPEG, PNG, or WebP image.';
      } else if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
        errorMessage = 'Network error. Please check your connection and try again.';
      }
      
      toast.error('Upload failed', errorMessage);
    } finally {
      setUploading(false);
    }
  };

  const removeSelectedFile = () => {
    setSelectedFile(null);
    setPreview(null);
    setAltText('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClose = () => {
    setActiveTab('browse');
    setSelectedFile(null);
    setPreview(null);
    setAltText('');
    setIsDragging(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onClose();
  };

  const handleMediaSelect = (file: MediaFile) => {
    onSelect(file);
    handleClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-7xl w-full h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="px-6 border-b border-gray-200">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('browse')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'browse'
                  ? 'border-[#F5821F] text-[#F5821F]'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <PhotoIcon className="h-5 w-5 inline mr-2" />
              Browse Media
            </button>
            <button
              onClick={() => setActiveTab('upload')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'upload'
                  ? 'border-[#F5821F] text-[#F5821F]'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <ArrowUpTrayIcon className="h-5 w-5 inline mr-2" />
              Upload New
            </button>
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {activeTab === 'browse' ? (
            <MediaGalleryContent
              onSelect={handleMediaSelect}
              allowedTypes={allowedTypes}
            />
          ) : (
            <div className="p-6 h-full overflow-auto">
              <div className="max-w-2xl mx-auto space-y-6">
                {/* Upload Area */}
                <div
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  className={`
                    border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
                    ${isDragging 
                      ? 'border-[#F5821F] bg-orange-50' 
                      : 'border-gray-300 hover:border-gray-400'
                    }
                  `}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileInputChange}
                    className="hidden"
                  />
                  
                  {preview ? (
                    <div className="space-y-4">
                      <div className="relative inline-block">
                        <Image
                          src={preview}
                          alt="Preview"
                          width={400}
                          height={256}
                          className="max-w-full max-h-64 rounded-lg shadow-md object-contain"
                        />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeSelectedFile();
                          }}
                          className="absolute top-2 right-2 p-1 bg-red-600 text-white rounded-full hover:bg-red-700"
                        >
                          <XMarkIcon className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="text-sm text-gray-600">
                        <p className="font-medium">{selectedFile?.name}</p>
                        <p>{selectedFile && (selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <CloudArrowUpIcon className="mx-auto h-16 w-16 text-gray-400" />
                      <div>
                        <p className="text-xl font-medium text-gray-900">
                          Drop your image here, or click to select
                        </p>
                        <p className="text-sm text-gray-500 mt-2">
                          PNG, JPG, WebP up to 2MB. Recommended size: 1200x400px
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Alt Text Input */}
                {selectedFile && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Alt Text (for accessibility)
                    </label>
                    <input
                      type="text"
                      value={altText}
                      onChange={(e) => setAltText(e.target.value)}
                      placeholder="Describe the image for accessibility"
                      className="w-full px-4 py-3 text-base rounded-md border-gray-300 shadow-sm focus:ring-[#F5821F] focus:border-[#F5821F]"
                    />
                  </div>
                )}

                {/* Upload Guidelines */}
                <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                  <h4 className="text-sm font-medium text-blue-900 mb-2">Image Guidelines:</h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Recommended size: 1200×400 pixels</li>
                    <li>• Maximum file size: 2MB</li>
                    <li>• Supported formats: JPG, PNG, WebP</li>
                    <li>• Image will be optimized automatically</li>
                    <li>• Add descriptive alt text for accessibility</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer - only show for upload tab */}
        {activeTab === 'upload' && (
          <div className="px-6 py-4 border-t border-gray-200 flex justify-between items-center">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-500"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleUpload}
              disabled={!selectedFile || uploading}
              className="px-6 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-[#F5821F] hover:bg-[#e0741c] disabled:bg-gray-300 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#F5821F]"
            >
              {uploading ? 'Uploading...' : 'Upload & Select'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}