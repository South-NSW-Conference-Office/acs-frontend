'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Modal, { ModalBody, ModalFooter } from './Modal';
import MediaLibraryModal from './MediaLibraryModal';
import DayTimeScheduler from './DayTimeScheduler';
import EventScheduler from './EventScheduler';
import { useToast } from '@/contexts/ToastContext';
import { serviceManagement, Service } from '@/lib/serviceManagement';
import { serviceTypeAPI } from '@/lib/serviceTypes';
import { teamService, Team } from '@/lib/teams';
import { MediaFile } from '@/lib/mediaService';
import { ServiceScheduling, DEFAULT_WEEKLY_SCHEDULE } from '@/types/scheduling';
import { XMarkIcon, CloudArrowUpIcon, PhotoIcon } from '@heroicons/react/24/outline';

interface ServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (service: Service, isEdit: boolean) => void;
  service?: Service;
  teamId?: string;
}


export default function ServiceModal({ 
  isOpen, 
  onClose, 
  onSave, 
  service,
  teamId 
}: ServiceModalProps) {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    type: '',
    teamId: teamId || '',
    descriptionShort: '',
    descriptionLong: '',
    status: 'active' as 'active' | 'paused' | 'archived',
    availability: null as 'always_open' | 'set_times' | 'set_events' | null,
    tags: [] as string[],
    locations: [{
      label: 'Main Location',
      address: {
        street: '',
        suburb: '',
        state: '',
        postcode: ''
      },
      isMobile: false,
      openingHours: []
    }],
    contactInfo: {
      email: '',
      phone: '',
      website: ''
    }
  });
  
  const [loading, setLoading] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [teams, setTeams] = useState<Team[]>([]);
  const [serviceTypes, setServiceTypes] = useState<Array<{value: string; label: string; description?: string}>>([]);
  const [tagInput, setTagInput] = useState('');
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string>('');
  const [bannerAlt, setBannerAlt] = useState('');
  const [selectedMediaFile, setSelectedMediaFile] = useState<MediaFile | null>(null);
  const [isMediaLibraryOpen, setIsMediaLibraryOpen] = useState(false);
  const [scheduling, setScheduling] = useState<ServiceScheduling>({
    availability: null,
    weeklySchedule: DEFAULT_WEEKLY_SCHEDULE,
    events: []
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { error: showError } = useToast();

  useEffect(() => {
    if (service) {
      // Fetch full service details when editing to ensure we have the latest data including banner image
      const fetchFullServiceDetails = async () => {
        try {
          setLoadingDetails(true);
          const fullService = await serviceManagement.getServiceDetails(service._id) as { service?: Service; data?: Service } | Service;
          const serviceData = ('service' in fullService && fullService.service) || ('data' in fullService && fullService.data) || fullService as Service;
          
          setFormData({
            name: serviceData.name || '',
            type: serviceData.type || '',
            teamId: typeof serviceData.teamId === 'string' ? serviceData.teamId : serviceData.teamId?._id || '',
            descriptionShort: serviceData.descriptionShort || '',
            descriptionLong: serviceData.descriptionLong || '',
            status: serviceData.status || 'active',
            availability: serviceData.availability || null,
            tags: serviceData.tags || [],
            locations: serviceData.locations?.map(location => ({
              ...location,
              address: {
                street: location.address?.street || '',
                suburb: location.address?.suburb || '',
                state: location.address?.state || '',
                postcode: location.address?.postcode || ''
              },
              isMobile: false,
              openingHours: []
            })) || [{
              label: 'Main Location',
              address: {
                street: '',
                suburb: '',
                state: '',
                postcode: ''
              },
              isMobile: false,
              openingHours: []
            }],
            contactInfo: {
              email: serviceData.contactInfo?.email || '',
              phone: serviceData.contactInfo?.phone || '',
              website: serviceData.contactInfo?.website || ''
            }
          });
          // Reset file selections when editing a different service
          setBannerFile(null);
          setSelectedMediaFile(null);
          setBannerPreview(serviceData?.primaryImage?.url || '');
          setBannerAlt(serviceData?.primaryImage?.alt || '');
          // Initialize scheduling data
          setScheduling({
            availability: serviceData.availability || null,
            weeklySchedule: serviceData.scheduling?.weeklySchedule || DEFAULT_WEEKLY_SCHEDULE,
            events: serviceData.scheduling?.events || []
          });
        } catch (error) {
          console.error('Failed to fetch service details:', error);
          // Fallback to using the provided service data
          setFormData({
            name: service.name || '',
            type: service.type || '',
            teamId: typeof service.teamId === 'string' ? service.teamId : service.teamId?._id || '',
            descriptionShort: service.descriptionShort || '',
            descriptionLong: service.descriptionLong || '',
            status: service.status || 'active',
            availability: service.availability || null,
            tags: service.tags || [],
            locations: service.locations?.map(location => ({
              ...location,
              address: {
                street: location.address?.street || '',
                suburb: location.address?.suburb || '',
                state: location.address?.state || '',
                postcode: location.address?.postcode || ''
              },
              isMobile: false,
              openingHours: []
            })) || [{
              label: 'Main Location',
              address: {
                street: '',
                suburb: '',
                state: '',
                postcode: ''
              },
              isMobile: false,
              openingHours: []
            }],
            contactInfo: {
              email: service.contactInfo?.email || '',
              phone: service.contactInfo?.phone || '',
              website: service.contactInfo?.website || ''
            }
          });
          setBannerFile(null);
          setSelectedMediaFile(null);
          setBannerPreview(service?.primaryImage?.url || '');
          setBannerAlt(service?.primaryImage?.alt || '');
          setScheduling({
            availability: service.availability || null,
            weeklySchedule: service.scheduling?.weeklySchedule || DEFAULT_WEEKLY_SCHEDULE,
            events: service.scheduling?.events || []
          });
        } finally {
          setLoadingDetails(false);
        }
      };
      
      fetchFullServiceDetails();
    } else if (teamId) {
      setFormData(prev => ({ ...prev, teamId: teamId }));
      // Reset file selections for new service
      setBannerFile(null);
      setSelectedMediaFile(null);
      setBannerPreview('');
      setBannerAlt('');
      // Reset scheduling for new service
      setScheduling({
        availability: null,
        weeklySchedule: DEFAULT_WEEKLY_SCHEDULE,
        events: []
      });
    }
  }, [service, teamId]);

  const fetchTeams = useCallback(async () => {
    try {
      let data;
      
      // First try to get all teams (for service creation, user should see all available teams)
      try {
        data = await teamService.getAllTeams();
      } catch {
        try {
          data = await teamService.getMyTeams();
        } catch (myTeamsError) {
          throw myTeamsError;
        }
      }
      
      // Handle different response structures. The final `|| data` fallback used
      // to hand the whole response envelope to setTeams whenever neither `data`
      // nor `teams` held the list — an object, not an array — and the render then
      // died on teams.map with a runtime TypeError that took the modal down. Pick
      // the first candidate that is genuinely an array instead, so an unexpected
      // shape degrades to an empty picker rather than a crash.
      const candidates = [data?.data, data?.teams, data];
      const teamsArray = candidates.find(Array.isArray) ?? [];

      if (!candidates.some(Array.isArray)) {
        console.warn('[ServiceModal] No team array in response; got:', data);
      }

      setTeams(teamsArray);
    } catch (error) {
      console.error('Error fetching teams:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      showError(`Failed to fetch teams: ${errorMessage}`);
      setTeams([]);
    }
  }, [showError]);

  const fetchServiceTypes = useCallback(async () => {
    try {
      const types = await serviceTypeAPI.getActive();
      
      // Check if response is an array
      if (!Array.isArray(types)) {
        showError('Invalid response format from service types API');
        return;
      }
      
      // Format types for dropdown
      const formattedTypes = types.map(type => ({
        value: type.value,
        label: type.name,
        description: type.description
      }));
      
      setServiceTypes(formattedTypes);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      showError(`Failed to fetch service types: ${errorMessage}`);
    }
  }, [showError]);

  useEffect(() => {
    if (isOpen) {
      fetchTeams();
      fetchServiceTypes();
    }
  }, [isOpen, fetchTeams, fetchServiceTypes]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.type || !formData.teamId) {
      showError('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      let savedService;
      
      // Combine form data with scheduling data
      const serviceData = {
        ...formData,
        scheduling: {
          ...scheduling,
          lastUpdated: new Date().toISOString()
        }
      };
      
      if (service) {
        // Update existing service
        const response = await serviceManagement.updateService(service._id, serviceData) as { data?: Service; service?: Service };
        savedService = response.data || response.service;
      } else {
        // Create new service
        const response = await serviceManagement.createService(serviceData) as { data?: Service; service?: Service };
        savedService = response.data || response.service;
      }

      // Handle file uploads after service creation/update
      if (savedService) {
        // Upload primary image if selected
        if (bannerFile) {
          try {
            await serviceManagement.updateServicePrimaryImage(savedService._id, bannerFile);
          } catch (error) {
            console.error('Error uploading primary image:', error);
            showError('Service saved but primary image upload failed');
          }
        } else if (selectedMediaFile) {
          try {
            await serviceManagement.updateServicePrimaryImageWithMediaFile(savedService._id, selectedMediaFile._id, bannerAlt);
          } catch (error) {
            console.error('Error setting primary image from media file:', error);
            showError('Service saved but primary image update failed');
          }
        }

      }

      if (!savedService) {
        throw new Error('Failed to save service - no service data returned');
      }

      onSave(savedService, !!service);
      onClose();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : `Failed to ${service ? 'update' : 'create'} service`;
      showError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const addTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()]
      }));
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleBannerFileChange = (file: File) => {
    if (!file.type.startsWith('image/')) {
      showError('Please select an image file');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      showError('Image size must be less than 2MB');
      return;
    }

    setBannerFile(file);
    
    // Generate preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setBannerPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };


  const removeBannerFile = () => {
    setBannerFile(null);
    setSelectedMediaFile(null);
    setBannerPreview('');
    setBannerAlt('');
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleBannerFileChange(file);
    }
  };

  const handleMediaSelect = (mediaFile: MediaFile) => {
    setSelectedMediaFile(mediaFile);
    setBannerPreview(mediaFile.url);
    setBannerAlt(mediaFile.alt);
    setBannerFile(null); // Clear any previously selected file
    setIsMediaLibraryOpen(false);
  };

  const openMediaLibrary = () => {
    setIsMediaLibraryOpen(true);
  };


  return (
    <>
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={service ? 'Edit Service' : 'Create Service'}
      maxWidth="2xl"
      removeBorder={true}
    >
      <form onSubmit={handleSubmit}>
        <ModalBody className="space-y-6">
          {loadingDetails ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
            </div>
          ) : (
            <>
          {/* Basic Info */}
          <div>
            <label className="block text-sm font-medium text-gray-800">
              Service Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Enter service name"
              required
              className="mt-1 block w-full px-4 py-3 text-base rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-800">
                Service Type
              </label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="mt-1 block w-full px-4 py-3 text-base rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                required
              >
                <option value="">Choose Type</option>
                {serviceTypes.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-800">
                Team
              </label>
              <select
                value={formData.teamId}
                onChange={(e) => setFormData({ ...formData, teamId: e.target.value })}
                className="mt-1 block w-full px-4 py-3 text-base rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100"
                required
                disabled={!!service}
              >
                <option value="">Choose Team</option>
                {teams.map(team => (
                  <option key={team._id} value={team._id}>
                    {team.name} {team.category && `(${team.category})`}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Descriptions */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-gray-800">Description</h4>
            
            <div>
              <label className="block text-sm font-medium text-gray-800">
                Short Description
              </label>
              <input
                type="text"
                value={formData.descriptionShort}
                onChange={(e) => setFormData({ ...formData, descriptionShort: e.target.value })}
                placeholder="Brief description (max 200 characters)"
                maxLength={200}
                required
                className="mt-1 block w-full px-4 py-3 text-base rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
              />
              <p className="mt-1 text-sm text-gray-500">
                {formData.descriptionShort.length}/200 characters
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-800">
                Detailed Description
              </label>
              <textarea
                value={formData.descriptionLong}
                onChange={(e) => setFormData({ ...formData, descriptionLong: e.target.value })}
                rows={4}
                placeholder="Provide a detailed description of the service..."
                required
                className="mt-1 block w-full px-4 py-3 text-base rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Location */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-gray-800">Location</h4>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-800">
                  Street Address
                </label>
                <input
                  type="text"
                  value={formData.locations[0].address.street}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    locations: [{
                      ...prev.locations[0],
                      address: { ...prev.locations[0].address, street: e.target.value }
                    }]
                  }))}
                  placeholder="123 Main Street"
                  className="mt-1 block w-full px-4 py-3 text-base rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-800">
                  Suburb
                </label>
                <input
                  type="text"
                  value={formData.locations[0].address.suburb}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    locations: [{
                      ...prev.locations[0],
                      address: { ...prev.locations[0].address, suburb: e.target.value }
                    }]
                  }))}
                  placeholder="Sydney"
                  className="mt-1 block w-full px-4 py-3 text-base rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-800">
                  State
                </label>
                <input
                  type="text"
                  value={formData.locations[0].address.state}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    locations: [{
                      ...prev.locations[0],
                      address: { ...prev.locations[0].address, state: e.target.value }
                    }]
                  }))}
                  placeholder="NSW"
                  className="mt-1 block w-full px-4 py-3 text-base rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-800">
                  Postcode
                </label>
                <input
                  type="text"
                  value={formData.locations[0].address.postcode}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    locations: [{
                      ...prev.locations[0],
                      address: { ...prev.locations[0].address, postcode: e.target.value }
                    }]
                  }))}
                  placeholder="2000"
                  className="mt-1 block w-full px-4 py-3 text-base rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-gray-800">Contact Information</h4>
            
            <div>
              <label className="block text-sm font-medium text-gray-800">
                Email
              </label>
              <input
                type="email"
                value={formData.contactInfo.email}
                onChange={(e) => setFormData({
                  ...formData,
                  contactInfo: { ...formData.contactInfo, email: e.target.value }
                })}
                placeholder="service@example.com"
                className="mt-1 block w-full px-4 py-3 text-base rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-800">
                Phone
              </label>
              <input
                type="tel"
                value={formData.contactInfo.phone}
                onChange={(e) => setFormData({
                  ...formData,
                  contactInfo: { ...formData.contactInfo, phone: e.target.value }
                })}
                placeholder="(02) 1234 5678"
                className="mt-1 block w-full px-4 py-3 text-base rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-800">
                Website
              </label>
              <input
                type="url"
                value={formData.contactInfo.website}
                onChange={(e) => setFormData({
                  ...formData,
                  contactInfo: { ...formData.contactInfo, website: e.target.value }
                })}
                placeholder="https://example.com"
                className="mt-1 block w-full px-4 py-3 text-base rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-gray-800">Tags</h4>
            
            <div>
              <label className="block text-sm font-medium text-gray-800">
                Add Tags
              </label>
              <div className="mt-1 flex">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                  placeholder="Type a tag and press Enter"
                  className="block w-full px-4 py-3 text-base rounded-l-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                />
                <button
                  type="button"
                  onClick={addTag}
                  className="px-4 py-3 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-r-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Add
                </button>
              </div>
              
              <div className="mt-3 flex flex-wrap gap-2">
                {formData.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-indigo-100 text-indigo-800"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="ml-2 inline-flex items-center justify-center w-4 h-4 text-indigo-400 hover:text-indigo-600"
                    >
                      <XMarkIcon className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Banner Photo */}
          <div>
            <h4 className="text-sm font-medium text-gray-800 mb-4">Banner Image</h4>
            
            {bannerPreview ? (
              <div className="relative">
                <div className="w-full h-32 bg-gray-100 rounded-lg overflow-hidden">
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
                  onClick={removeBannerFile}
                  className="absolute top-2 right-2 p-1 bg-red-600 text-white rounded-full hover:bg-red-700"
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

            {/* The banner is the only image this modal manages; the gallery lives on
                its own page. Without this pointer, that page is unreachable from the
                edit flow and admins reasonably conclude the banner is the only photo
                a service can have. Create has no id yet, so the link is edit-only. */}
            {service?._id && (
              <div className="mt-3 flex items-center justify-between rounded-md bg-gray-50 border border-gray-200 px-4 py-3">
                <p className="text-xs text-gray-600">
                  Gallery photos (up to 20) are managed on their own page.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    router.push(`/services/${service._id}/images`);
                  }}
                  className="ml-4 shrink-0 inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  <PhotoIcon className="h-4 w-4 mr-1.5" />
                  Manage Photos
                </button>
              </div>
            )}
          </div>


          {/* Availability */}
          <div>
            <label className="block text-sm font-medium text-gray-800">
              Service Availability
            </label>
            <select
              value={formData.availability || ''}
              onChange={(e) => {
                const newAvailability = e.target.value as 'always_open' | 'set_times' | 'set_events' | null || null;
                setFormData({ ...formData, availability: newAvailability });
                setScheduling(prev => ({ ...prev, availability: newAvailability }));
              }}
              className="mt-1 block w-full px-4 py-3 text-base rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">Select Availability</option>
              <option value="always_open">Always Open</option>
              <option value="set_times">Set Times</option>
              <option value="set_events">Set Events</option>
            </select>
            <p className="mt-1 text-sm text-gray-500">
              Choose how this service operates: always available, specific times, or event-based
            </p>
          </div>

          {/* Scheduling Details */}
          {scheduling.availability === 'set_times' && (
            <div>
              <DayTimeScheduler
                schedule={scheduling.weeklySchedule || DEFAULT_WEEKLY_SCHEDULE}
                onChange={(weeklySchedule) => setScheduling(prev => ({ ...prev, weeklySchedule }))}
              />
            </div>
          )}

          {scheduling.availability === 'set_events' && (
            <div>
              <EventScheduler
                events={scheduling.events || []}
                onChange={(events) => setScheduling(prev => ({ ...prev, events }))}
                timezone={scheduling.weeklySchedule?.timezone || 'Australia/Sydney'}
              />
            </div>
          )}

          {/* Status (only for editing) */}
          {service && (
            <div>
              <label className="block text-sm font-medium text-gray-800">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as 'active' | 'paused' | 'archived' })}
                className="mt-1 block w-full px-4 py-3 text-base rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          )}
          </>
          )}
        </ModalBody>

        <ModalFooter>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-800 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="ml-3 px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            disabled={loading}
          >
            {loading ? 'Saving...' : service ? 'Update' : 'Create'}
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
      category="service"
      type="banner"
    />
  </>
  );
}