'use client';

import React, { useState, useRef } from 'react';
import Image from 'next/image';
import Modal, { ModalBody, ModalFooter } from './Modal';
import MediaLibraryModal from './MediaLibraryModal';
import { ConferenceService } from '@/lib/conferenceService';
import { Conference } from '@/types/rbac';
import { Union } from '@/types/hierarchy';
import { MediaFile } from '@/lib/mediaService';
import { useToast } from '@/contexts/ToastContext';
import { CloudArrowUpIcon, XMarkIcon, PhotoIcon } from '@heroicons/react/24/outline';

interface ConferenceWithUnion extends Omit<Conference, 'unionId'> {
  unionId: Union | string;
}

interface ConferenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (savedConference: ConferenceWithUnion, isEdit: boolean) => void;
  conference?: ConferenceWithUnion | null;
  unions: Union[];
}

export default function ConferenceModal({ 
  isOpen, 
  onClose, 
  onSave, 
  conference, 
  unions 
}: ConferenceModalProps) {
  const [formData, setFormData] = useState({
    name: conference?.name || '',
    unionId: (typeof conference?.unionId === 'string' ? conference.unionId : conference?.unionId?._id) || '',
    territory: {
      description: conference?.territory?.description || ''
    },
    headquarters: {
      address: conference?.headquarters?.address || '',
      city: conference?.headquarters?.city || '',
      state: conference?.headquarters?.state || '',
      country: conference?.headquarters?.country || '',
      postalCode: conference?.headquarters?.postalCode || ''
    },
    contact: {
      email: conference?.contact?.email || '',
      phone: conference?.contact?.phone || '',
      website: conference?.contact?.website || ''
    }
  });
  const [loading, setLoading] = useState(false);
  const [bannerImage, setBannerImage] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(conference?.primaryImage?.url || null);
  const [bannerAlt, setBannerAlt] = useState(conference?.primaryImage?.alt || '');
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
    setBannerPreview(conference?.primaryImage?.url || null);
    setBannerAlt(conference?.primaryImage?.alt || '');
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
      return 'Conference name is required. Please enter a name for the conference.';
    }
    
    
    if (lowerMessage.includes('union') && lowerMessage.includes('required')) {
      return 'Please select a parent union for this conference.';
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
      
      // Prepare the data according to the backend Conference model schema
      const conferenceData = {
        name: formData.name,
        unionId: formData.unionId,
        territory: {
          description: formData.territory.description
        },
        headquarters: {
          address: formData.headquarters.address,
          city: formData.headquarters.city,
          state: formData.headquarters.state,
          country: formData.headquarters.country,
          postalCode: formData.headquarters.postalCode
        },
        contact: {
          email: formData.contact.email,
          phone: formData.contact.phone,
          website: formData.contact.website
        }
      };

      let response;
      if (conference) {
        // Update existing conference
        response = await ConferenceService.updateConference(conference._id, conferenceData);
        
        // Handle banner image update if changed
        if ((bannerImage || selectedMediaFile) && response.success && response.data) {
          try {
            if (bannerImage) {
              // Upload new file
              await ConferenceService.updateConferenceBanner(response.data._id, bannerImage, bannerAlt);
            } else if (selectedMediaFile) {
              // Update with selected media file
              await ConferenceService.updateConferenceBannerWithMediaFile(response.data._id, selectedMediaFile._id, bannerAlt);
            }
          } catch (bannerError) {
            console.warn('Failed to update banner image:', bannerError);
            toast.error('Banner upload failed', 'Conference updated but banner image could not be uploaded.');
          }
        }
      } else {
        // Create new conference
        response = await ConferenceService.createConference(conferenceData);
        
        // Handle banner image upload for new conference
        if ((bannerImage || selectedMediaFile) && response.success && response.data) {
          try {
            let bannerResponse;
            if (bannerImage) {
              // Upload new file
              bannerResponse = await ConferenceService.updateConferenceBanner(response.data._id, bannerImage, bannerAlt);
            } else if (selectedMediaFile) {
              // Update with selected media file
              bannerResponse = await ConferenceService.updateConferenceBannerWithMediaFile(response.data._id, selectedMediaFile._id, bannerAlt);
            }
            
            if (bannerResponse?.success && bannerResponse?.data) {
              // Update the response data with the banner image
              response.data.primaryImage = bannerResponse.data.image;
            }
          } catch (bannerError) {
            console.warn('Failed to upload banner image:', bannerError);
            toast.error('Banner upload failed', 'Conference created but banner image could not be uploaded.');
          }
        }
      }
      
      if (response.success && response.data) {
        onSave(response.data as ConferenceWithUnion, !!conference);
      } else {
        const errorMessage = response.message || 'An unknown error occurred';
        const userFriendlyMessage = getUserFriendlyErrorMessage(errorMessage);
        
        toast.error(
          conference ? 'Failed to update conference' : 'Failed to create conference',
          userFriendlyMessage
        );
      }
    } catch (error) {
      console.error('Error saving conference:', error);
      
      let errorMessage = 'An unexpected error occurred';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      const userFriendlyMessage = getUserFriendlyErrorMessage(errorMessage);
      
      toast.error(
        conference ? 'Failed to update conference' : 'Failed to create conference',
        userFriendlyMessage
      );
    } finally {
      setLoading(false);
    }
  };

  // Reset form when conference changes or modal opens/closes
  React.useEffect(() => {
    if (isOpen) {
      setFormData({
        name: conference?.name || '',
        unionId: (typeof conference?.unionId === 'string' ? conference.unionId : conference?.unionId?._id) || '',
        territory: {
          description: conference?.territory?.description || ''
        },
        headquarters: {
          address: conference?.headquarters?.address || '',
          city: conference?.headquarters?.city || '',
          state: conference?.headquarters?.state || '',
          country: conference?.headquarters?.country || '',
          postalCode: conference?.headquarters?.postalCode || ''
        },
        contact: {
          email: conference?.contact?.email || '',
          phone: conference?.contact?.phone || '',
          website: conference?.contact?.website || ''
        }
      });
      
      // Reset image state
      setBannerImage(null);
      setSelectedMediaFile(null);
      setBannerPreview(conference?.primaryImage?.url || null);
      setBannerAlt(conference?.primaryImage?.alt || '');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [conference, isOpen]);

  return (
    <>
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={conference ? 'Edit Conference' : 'Create Conference'}
      maxWidth="2xl"
      removeBorder={true}
    >
      <form onSubmit={handleSubmit}>
        <ModalBody className="space-y-6">

          {/* Basic Info */}
          <div>
            <label className="block text-sm font-medium text-gray-800">
              Conference Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Enter conference name"
              required
              className="mt-1 block w-full px-4 py-3 text-base rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          {/* Parent Union */}
          <div>
            <label className="block text-sm font-medium text-gray-800">
              Parent Union *
            </label>
            <select
              value={formData.unionId}
              onChange={(e) => setFormData(prev => ({ ...prev, unionId: e.target.value }))}
              required
              className="mt-1 block w-full px-4 py-3 text-base rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">Select a union</option>
              {unions.map(union => (
                <option key={union._id} value={union._id}>
                  {union.name}
                </option>
              ))}
            </select>
          </div>

          {/* Territory */}
          <div>
            <h4 className="text-sm font-medium text-gray-800 mb-4">Territory</h4>
            <div>
              <label className="block text-sm font-medium text-gray-800">
                Territory Description
              </label>
              <textarea
                value={formData.territory.description}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  territory: { ...prev.territory, description: e.target.value }
                }))}
                placeholder="Brief description of the conference's territory or regions"
                rows={2}
                className="mt-1 block w-full px-4 py-3 text-base rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
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
                  placeholder="contact@conference.org"
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
                  placeholder="https://www.conference.org"
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
            disabled={loading || !formData.name || !formData.unionId}
            className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {loading ? 'Saving...' : (conference ? 'Update' : 'Create')} Conference
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
      category="conference"
      type="banner"
    />
  </>);
}