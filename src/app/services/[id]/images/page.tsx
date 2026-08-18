'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AdminLayout from '@/components/AdminLayout';
import Button from '@/components/Button';
import GallerySection from '@/components/GallerySection';
import { useToast } from '@/contexts/ToastContext';
import { serviceManagement } from '@/lib/serviceManagement';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

interface ServiceDetails {
  service: {
    _id: string;
    name: string;
    type: string;
    teamId?: {
      _id: string;
      name: string;
      type: string;
    };
    descriptionShort: string;
    descriptionLong: string;
    status: 'active' | 'paused' | 'archived';
    primaryImage?: {
      url: string;
      alt: string;
    };
    bannerImage?: {
      url: string;
      alt: string;
    };
    gallery?: Array<{
      url: string;
      alt: string;
      caption: string;
    }>;
    tags?: string[];
    availability?: 'always_open' | 'set_times' | 'set_events' | null;
    scheduling?: {
      weeklySchedule?: {
        timezone?: string;
        schedule?: Array<{
          dayOfWeek: number; // 0-6 (Sunday = 0)
          timeSlots: Array<{
            startTime: string; // HH:mm format
            endTime: string; // HH:mm format
          }>;
          isEnabled: boolean;
        }>;
      };
      events?: Array<{
        name: string;
        description?: string;
        startDateTime: string; // ISO Date string
        endDateTime: string; // ISO Date string
        timezone?: string;
        isRecurring?: boolean;
        recurrencePattern?: {
          type?: 'daily' | 'weekly' | 'monthly';
          interval?: number;
          endDate?: string;
          daysOfWeek?: number[];
        };
      }>;
      lastUpdated?: string;
    };
    locations: Array<{
      label: string;
      address: {
        street?: string;
        suburb?: string;
        state?: string;
        postcode?: string;
      };
      coordinates?: {
        lat: number;
        lng: number;
      };
    }>;
    contactInfo: {
      email?: string;
      phone?: string;
      website?: string;
    };
    createdAt: string;
    updatedAt: string;
  };
  events: Array<{ _id: string; name: string; start: string; end?: string; description?: string; locationText?: string }>;
  permissions: {
    canUpdate: boolean;
    canDelete: boolean;
    canManage: boolean;
  };
}

interface ServiceImagesData {
  gallery: Array<{
    _id: string;
    url: string;
    key: string;
    thumbnailUrl?: string;
    thumbnailKey?: string;
    alt: string;
    caption: string;
  }>;
}

export default function ServiceImagesPage() {
  const params = useParams();
  const router = useRouter();
  const { error: showErrorToast, success: showSuccessToast } = useToast();
  const serviceId = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [serviceName, setServiceName] = useState<string>('');
  const [hasPermission, setHasPermission] = useState(false);
  const [images, setImages] = useState<ServiceImagesData>({
    gallery: []
  });

  const fetchServiceImages = useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch service details to get the name and permissions
      const serviceDetails = await serviceManagement.getServiceDetails(serviceId) as ServiceDetails | { data: ServiceDetails['service']; events?: ServiceDetails['events']; permissions?: ServiceDetails['permissions'] } | ServiceDetails['service'];
      
      // Handle different response structures
      let serviceName: string;
      let permissions: { canUpdate: boolean };
      
      if ('service' in serviceDetails) {
        // Response structure: { service: {...}, events: [...], permissions: {...} }
        serviceName = serviceDetails.service.name;
        permissions = serviceDetails.permissions || { canUpdate: false };
      } else if ('data' in serviceDetails) {
        // Response structure: { data: {...} }
        serviceName = serviceDetails.data.name;
        permissions = serviceDetails.permissions || { canUpdate: false };
      } else {
        // Response structure: { _id: ..., name: ..., ... } (direct service object)
        serviceName = serviceDetails.name;
        // This branch hardcoded canUpdate: false, so any response shape without
        // a permissions block locked the user out of the gallery and redirected
        // them away regardless of their actual authorization. Absence of
        // permission data is not a denial - the backend authorizes every write,
        // so let it be the decision point.
        permissions = (serviceDetails as { permissions?: { canUpdate: boolean } })
          .permissions || { canUpdate: true };
      }
      
      setServiceName(serviceName);
      
      // Check if user has permission to manage images
      if (!permissions.canUpdate) {
        showErrorToast('You do not have permission to manage images for this service');
        router.push(`/services/${serviceId}`);
        return;
      }
      
      setHasPermission(true);
      
      // Fetch images
      const imagesResponse = await serviceManagement.getServiceImages(serviceId) as ServiceImagesData;
      setImages({
        gallery: imagesResponse.gallery || []
      });
    } catch (error) {
      console.error('Failed to fetch service images:', error);
      showErrorToast('Failed to load service images');
    } finally {
      setLoading(false);
    }
  }, [serviceId, showErrorToast, router]);

  useEffect(() => {
    fetchServiceImages();
  }, [fetchServiceImages]);


  const handleGalleryUpdate = async (files: File[]) => {
    try {
      await serviceManagement.addGalleryImages(serviceId, files);
      showSuccessToast(`${files.length} images added to gallery`);
      fetchServiceImages();
    } catch (error) {
      console.error('Failed to add gallery images:', error);
      showErrorToast('Failed to add gallery images');
    }
  };

  const handleGalleryDelete = async (imageId: string) => {
    try {
      await serviceManagement.removeGalleryImage(serviceId, imageId);
      showSuccessToast('Image removed from gallery');
      fetchServiceImages();
    } catch (error) {
      console.error('Failed to remove gallery image:', error);
      showErrorToast('Failed to remove image');
    }
  };

  if (loading) {
    return (
      <AdminLayout
        title="Service Images"
        description="Loading..."
      >
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#F5821F] mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading images...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  // Don't render upload components if user doesn't have permission
  if (!hasPermission && !loading) {
    return (
      <AdminLayout
        title="Access Denied"
        description="You don't have permission to access this page"
      >
        <div className="text-center py-12">
          <p className="text-gray-600 mb-4">You do not have permission to manage images for this service.</p>
          <Button
            variant="primary"
            leftIcon={ArrowLeftIcon}
            onClick={() => router.push(`/services/${serviceId}`)}
          >
            Back to Service Details
          </Button>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout
      title={`Gallery - ${serviceName}`}
      description="Manage gallery images for this service"
    >
      <div className="space-y-6">
        {/* Back Button */}
        <div>
          <Button
            variant="ghost"
            leftIcon={ArrowLeftIcon}
            onClick={() => router.push(`/services/${serviceId}`)}
          >
            Back to Service Details
          </Button>
        </div>

        {/* Gallery Section */}
        <GallerySection
          images={images.gallery}
          onImagesUpdate={handleGalleryUpdate}
          onImageDelete={handleGalleryDelete}
        />
      </div>
    </AdminLayout>
  );
}