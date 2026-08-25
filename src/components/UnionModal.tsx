'use client';

import React, { useState, useRef } from 'react';
import Image from 'next/image';
import Modal, { ModalBody, ModalFooter } from './Modal';
import MediaLibraryModal from './MediaLibraryModal';
import { UnionService } from '@/lib/unionService';
import { Union } from '@/types/hierarchy';
import { MediaFile } from '@/lib/mediaService';
import { useToast } from '@/contexts/ToastContext';
import { CloudArrowUpIcon, XMarkIcon, PhotoIcon } from '@heroicons/react/24/outline';

interface UnionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (savedUnion: Union, isEdit: boolean) => void;
  union?: Union | null;
}

export default function UnionModal({ 
  isOpen, 
  onClose, 
  onSave, 
  union
}: UnionModalProps) {
  const [formData, setFormData] = useState({
    name: union?.name || '',
    headquarters: {
      address: union?.headquarters?.address || '',
      city: union?.headquarters?.city || '',
      state: union?.headquarters?.state || '',
      country: union?.headquarters?.country || '',
      postalCode: union?.headquarters?.postalCode || ''
    },
    contact: {
      email: union?.contact?.email || '',
      phone: union?.contact?.phone || '',
      website: union?.contact?.website || ''
    }
  });
  const [loading, setLoading] = useState(false);
  const [bannerImage, setBannerImage] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(union?.primaryImage?.url || null);
  const [bannerAlt, setBannerAlt] = useState(union?.primaryImage?.alt || '');
  const [selectedMediaFile, setSelectedMediaFile] = useState<MediaFile | null>(null);
  const [isMediaLibraryOpen, setIsMediaLibraryOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  // Image handling functions
  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error('Invalid file type', 'Please select an image file (JPEG, PNG, WebP).');
        return;
      }

      // Validate file size (2MB limit)
      if (file.size > 2 * 1024 * 1024) {
        toast.error('File too large', 'Banner image must be smaller than 2MB.');
        return;
      }

      setBannerImage(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setBannerPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeBannerImage = () => {
    setBannerImage(null);
    setSelectedMediaFile(null);
    setBannerPreview(union?.primaryImage?.url || null);
    setBannerAlt(union?.primaryImage?.alt || '');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleMediaSelect = (mediaFile: MediaFile) => {
    setSelectedMediaFile(mediaFile);
    setBannerPreview(mediaFile.url);
    setBannerAlt(mediaFile.alt);
    setBannerImage(null); // Clear any previously selected file
    setIsMediaLibraryOpen(false);
  };

  const openMediaLibrary = () => {
    setIsMediaLibraryOpen(true);
  };

  // Helper function to provide user-friendly error messages
  const getUserFriendlyErrorMessage = (errorMessage: string) => {
    const lowerMessage = errorMessage.toLowerCase();
    
    if (lowerMessage.includes('name') && lowerMessage.includes('required')) {
      return 'Union name is required. Please enter a name for the union.';
    }
    
    if (lowerMessage.includes('code') && lowerMessage.includes('required')) {
      return 'Union code is required. Please enter a unique code for the union.';
    }
    
    if (lowerMessage.includes('code') && lowerMessage.includes('exist')) {
      return 'A union with this code already exists. Please choose a different code.';
    }
    
    if (lowerMessage.includes('email') && lowerMessage.includes('invalid')) {
      return 'Please enter a valid email address.';
    }
    
    if (lowerMessage.includes('permission') || lowerMessage.includes('authorized')) {
      return 'You do not have permission to perform this action. Please contact your administrator.';
    }
    
    return errorMessage || 'An unexpected error occurred. Please try again.';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      
      const unionData = {
        name: formData.name,
        headquarters: formData.headquarters,
        contact: formData.contact
      };

      let response;
      if (union) {
        // Update existing union
        response = await UnionService.updateUnion(union._id, unionData);
        
        // Handle banner image update if changed
        if ((bannerImage || selectedMediaFile) && response.success && response.data) {
          try {
            if (bannerImage) {
              // Upload new file
              await UnionService.updateUnionBanner(response.data._id, bannerImage, bannerAlt);
            } else if (selectedMediaFile) {
              // Update with selected media file
              await UnionService.updateUnionBannerWithMediaFile(response.data._id, selectedMediaFile._id, bannerAlt);
            }
          } catch (bannerError) {
            console.warn('Failed to update banner image:', bannerError);
            toast.error('Banner upload failed', 'Union updated but banner image could not be uploaded.');
          }
        }
      } else {
        // Create new union
        response = await UnionService.createUnion(unionData);
        
        // Handle banner image upload for new union
        if ((bannerImage || selectedMediaFile) && response.success && response.data) {
          try {
            let bannerResponse;
            if (bannerImage) {
              // Upload new file
              bannerResponse = await UnionService.updateUnionBanner(response.data._id, bannerImage, bannerAlt);
            } else if (selectedMediaFile) {
              // Update with selected media file
              bannerResponse = await UnionService.updateUnionBannerWithMediaFile(response.data._id, selectedMediaFile._id, bannerAlt);
            }
            
            if (bannerResponse?.success && bannerResponse?.data) {
              // Update the response data with the banner image
              response.data.primaryImage = bannerResponse.data.image;
            }
          } catch (bannerError) {
            console.warn('Failed to upload banner image:', bannerError);
            toast.error('Banner upload failed', 'Union created but banner image could not be uploaded.');
          }
        }
      }
      
      if (response.success && response.data) {
        onSave(response.data, !!union);
      } else {
        const errorMessage = response.message || 'An unknown error occurred';
        const userFriendlyMessage = getUserFriendlyErrorMessage(errorMessage);
        
        toast.error(
          union ? 'Failed to update union' : 'Failed to create union',
          userFriendlyMessage
        );
      }
    } catch (error) {
      console.error('Error saving union:', error);
      
      let errorMessage = 'An unexpected error occurred';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      const userFriendlyMessage = getUserFriendlyErrorMessage(errorMessage);
      
      toast.error(
        union ? 'Failed to update union' : 'Failed to create union',
        userFriendlyMessage
      );
    } finally {
      setLoading(false);
    }
  };

  // Reset form when union changes or modal opens/closes
  React.useEffect(() => {
    if (isOpen) {
      setFormData({
        name: union?.name || '',
        headquarters: {
          address: union?.headquarters?.address || '',
          city: union?.headquarters?.city || '',
          state: union?.headquarters?.state || '',
          country: union?.headquarters?.country || '',
          postalCode: union?.headquarters?.postalCode || ''
        },
        contact: {
          email: union?.contact?.email || '',
          phone: union?.contact?.phone || '',
          website: union?.contact?.website || ''
        }
      });
      
      // Reset image state
      setBannerImage(null);
      setSelectedMediaFile(null);
      setBannerPreview(union?.primaryImage?.url || null);
      setBannerAlt(union?.primaryImage?.alt || '');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [union, isOpen]);

  return (
    <>
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={union ? 'Edit Union' : 'Create Union'}
      maxWidth="2xl"
      removeBorder={true}
    >
      <form onSubmit={handleSubmit}>
        <ModalBody className="space-y-6">
          {/* Basic Info */}
          <div>
            <label className="block text-sm font-medium text-gray-800">
              Union Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Enter union name"
              required
              className="mt-1 block w-full px-4 py-3 text-base rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>


          {/* Headquarters */}
          <div>
            <h4 className="text-sm font-medium text-gray-800 mb-4">Headquarters</h4>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-800">
                  Address
                </label>
                <input
                  type="text"
                  value={formData.headquarters.address}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    headquarters: { ...prev.headquarters, address: e.target.value }
                  }))}
                  placeholder="Street address"
                  className="mt-1 block w-full px-4 py-3 text-base rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-800">
                  City
                </label>
                <input
                  type="text"
                  value={formData.headquarters.city}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    headquarters: { ...prev.headquarters, city: e.target.value }
                  }))}
                  placeholder="City"
                  className="mt-1 block w-full px-4 py-3 text-base rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-800">
                  State/Province
                </label>
                <input
                  type="text"
                  value={formData.headquarters.state}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    headquarters: { ...prev.headquarters, state: e.target.value }
                  }))}
                  placeholder="State or Province"
                  className="mt-1 block w-full px-4 py-3 text-base rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-800">
                  Country
                </label>
                <input
                  type="text"
                  value={formData.headquarters.country}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    headquarters: { ...prev.headquarters, country: e.target.value }
                  }))}
                  placeholder="Country"
                  className="mt-1 block w-full px-4 py-3 text-base rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-800">
                  Postal Code
                </label>
                <input
                  type="text"
                  value={formData.headquarters.postalCode}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    headquarters: { ...prev.headquarters, postalCode: e.target.value }
                  }))}
                  placeholder="Postal/ZIP code"
                  className="mt-1 block w-full px-4 py-3 text-base rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div>
            <h4 className="text-sm font-medium text-gray-800 mb-4">Contact Information</h4>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-800">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.contact.email}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    contact: { ...prev.contact, email: e.target.value }
                  }))}
                  placeholder="contact@union.org"
                  className="mt-1 block w-full px-4 py-3 text-base rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-800">
                  Phone
                </label>
                <input
                  type="tel"
                  value={formData.contact.phone}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    contact: { ...prev.contact, phone: e.target.value }
                  }))}
                  placeholder="(123) 456-7890"
                  className="mt-1 block w-full px-4 py-3 text-base rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-800">
                  Website
                </label>
                <input
                  type="url"
                  value={formData.contact.website}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    contact: { ...prev.contact, website: e.target.value }
                  }))}
                  placeholder="https://www.union.org"
                  className="mt-1 block w-full px-4 py-3 text-base rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Banner Image Upload */}
          <div>
            <h4 className="text-sm font-medium text-gray-800 mb-4">Banner Image</h4>
            
            {bannerPreview ? (
              <div className="relative">
                {/* `relative` is required: next/image `fill` positions against the
                    nearest positioned ancestor, so without it the preview escaped to
                    the wrapper above and rendered an arbitrary crop. 3:1 is the ratio
                    of the recommended 1200x400, so a correct banner previews whole. */}
                <div className="relative w-full aspect-[3/1] bg-gray-100 rounded-lg overflow-hidden">
                  <Image
                    src={bannerPreview}
                    alt="Banner preview"
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 50vw"
                  />
                </div>
                <button
                  type="button"
                  onClick={removeBannerImage}
                  className="absolute top-2 right-2 p-1 bg-red-600 text-gray-800 rounded-full hover:bg-red-700"
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>
                <div className="mt-2">
                  <label className="block text-sm font-medium text-gray-800">
                    Alt Text
                  </label>
                  <input
                    type="text"
                    value={bannerAlt}
                    onChange={(e) => setBannerAlt(e.target.value)}
                    placeholder="Describe the image for accessibility"
                    className="mt-1 block w-full px-3 py-2 text-sm rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>
            ) : (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                <PhotoIcon className="mx-auto h-12 w-12 text-gray-400" />
                <div className="mt-4">
                  <button
                    type="button"
                    onClick={openMediaLibrary}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    <CloudArrowUpIcon className="h-4 w-4 mr-2" />
                    Select Banner Image
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Browse existing images or upload new ones. Recommended size: 1200x400px
                </p>
              </div>
            )}
            
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
          </div>
        </ModalBody>

        <ModalFooter>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-800 hover:text-gray-500"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || !formData.name}
            className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {union ? 'Update' : 'Create'} Union
          </button>
        </ModalFooter>
      </form>
    </Modal>

    <MediaLibraryModal
      isOpen={isMediaLibraryOpen}
      onClose={() => setIsMediaLibraryOpen(false)}
      onSelect={handleMediaSelect}
      title="Select Banner Image"
      allowedTypes={['banner', 'gallery']}
      category="union"
      type="banner"
    />
  </>
  );
}