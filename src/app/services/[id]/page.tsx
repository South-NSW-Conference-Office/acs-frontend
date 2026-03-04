'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import AdminLayout from '@/components/AdminLayout';
import Button from '@/components/Button';
import { StatusBadge } from '@/components/DataTable';
import { useToast } from '@/contexts/ToastContext';
import { usePermissions } from '@/contexts/HierarchicalPermissionContext';
import { serviceManagement } from '@/lib/serviceManagement';
import {
   MapPinIcon,
   EnvelopeIcon,
   PhoneIcon,
   GlobeAltIcon,
   XMarkIcon,
} from '@heroicons/react/24/outline';

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

function ServiceBannerImage({ service }: { service: ServiceDetails['service'] }) {
  const [imageError, setImageError] = useState(false);

  // Check for image in multiple possible field names (prioritize ones with valid URLs)
  const imageData = (service.primaryImage?.url ? service.primaryImage : null) ||
                   (service.bannerImage?.url ? service.bannerImage : null) ||
                   null;

  if (!imageData?.url || imageError) {
    return <div className="absolute inset-0 bg-gradient-to-br from-[#F5821F] to-[#e0741c]"></div>;
  }

  return (
    <Image
      src={imageData.url}
      alt={imageData.alt || service.name}
      fill
      className="object-cover opacity-50"
      priority
      onError={() => {
        setImageError(true);
      }}
    />
  );
}

export default function ServiceDetailPage() {
   const params = useParams();
   const router = useRouter();
   const serviceId = params?.id as string;
   const { user, loading: authLoading } = usePermissions();

   const [serviceData, setServiceData] = useState<ServiceDetails | null>(null);
   const [loading, setLoading] = useState(true);
   const { error: showErrorToast } = useToast();

   const fetchServiceDetails = useCallback(async () => {
      try {
         setLoading(true);
         const data = await serviceManagement.getServiceDetails(serviceId) as ServiceDetails | { data: ServiceDetails['service']; events?: ServiceDetails['events']; permissions?: ServiceDetails['permissions'] } | ServiceDetails['service'];
         
         // Handle different response structures
         let serviceData: ServiceDetails;
         if ('service' in data) {
            // Response structure: { service: {...}, events: [...], ... }
            serviceData = data as ServiceDetails;
         } else if ('data' in data) {
            // Response structure: { data: {...} }
            serviceData = {
               service: data.data,
               events: data.events || [],
               permissions: data.permissions || { canUpdate: false, canDelete: false, canManage: false }
            };
         } else {
            // Response structure: { _id: ..., name: ..., ... } (direct service object)
            serviceData = {
               service: data as ServiceDetails['service'],
               events: [],
               permissions: { canUpdate: false, canDelete: false, canManage: false }
            };
         }
         
         setServiceData(serviceData);
      } catch (error) {
         console.error('Failed to fetch service details:', error);
         showErrorToast('Failed to load service details');
         router.push('/services');
      } finally {
         setLoading(false);
      }
   }, [serviceId, router, showErrorToast]);

   useEffect(() => {
      // Only fetch service details after authentication is ready
      if (!authLoading && user) {
         fetchServiceDetails();
      }
   }, [fetchServiceDetails, authLoading, user]);



   if (authLoading || loading) {
      return (
         <AdminLayout title="Loading..." description="Please wait">
            <div className="flex items-center justify-center h-64">
               <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#F5821F] mx-auto"></div>
                  <p className="mt-4 text-gray-600">
                     Loading service details...
                  </p>
               </div>
            </div>
         </AdminLayout>
      );
   }

   if (!serviceData) {
      return (
         <AdminLayout
            title="Service Not Found"
            description="The requested service could not be found"
         >
            <div className="text-center py-12">
               <p className="text-gray-600 mb-4">
                  The service you&apos;re looking for doesn&apos;t exist or has
                  been removed.
               </p>
               <Button
                  variant="primary"
                  onClick={() => router.push('/services')}
               >
                  Back to Services
               </Button>
            </div>
         </AdminLayout>
      );
   }

   const { service, events, permissions } = serviceData;

   return (
      <AdminLayout
         title={service.name}
         description={`${service.teamId?.name || 'Team'} • ${service.type.replace(
            /_/g,
            ' '
         )}`}
         hideTitle={true}
         hideHeader={true}
      >
         {/* Hero Banner Section */}
         <div className="relative h-80 md:h-96 bg-gray-900 -mx-6 -mt-6">
            <ServiceBannerImage service={service} />

            {/* User Profile Overlay */}
            <div className="absolute top-8 right-4 z-20">
               <div className="flex items-center space-x-4">

                  {/* User Profile */}
                  <div className="flex items-center space-x-3">
                     <div className="text-right">
                        <p className="text-sm font-medium text-white drop-shadow-lg">
                           {user?.name || 'Admin'}
                        </p>
                        <p className="text-xs text-white/90 drop-shadow-lg">
                           {user?.email || ''}
                        </p>
                     </div>

                     <div
                        className="w-8 h-8 rounded-full flex items-center justify-center shadow-lg"
                        style={{ backgroundColor: '#454545' }}
                     >
                        <span className="text-white text-sm font-medium">
                           {user?.name?.charAt(0)?.toUpperCase() || 'A'}
                        </span>
                     </div>
                  </div>
               </div>
            </div>

            {/* Overlay Content */}
            <div className="absolute inset-0 flex items-end">
               <div className="w-full p-8 md:p-12 bg-gradient-to-t from-black/80 to-transparent">
                  <div className="max-w-6xl mx-auto">
                     <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-4">
                           <span className="px-3 py-1 bg-[#F5821F] text-white text-sm font-medium rounded-full">
                              {service.type.replace(/_/g, ' ')}
                           </span>
                           <StatusBadge
                              status={service.status === 'active'}
                              trueLabel="Active"
                              falseLabel={
                                 service.status === 'paused'
                                    ? 'Paused'
                                    : 'Archived'
                              }
                              trueColor="green"
                              falseColor={
                                 service.status === 'paused' ? 'yellow' : 'gray'
                              }
                           />
                        </div>
                        <h1 className="text-4xl md:text-5xl font-bold text-white mb-3">
                           {service.name}
                        </h1>
                        <p className="text-lg text-gray-200">
                           {service.descriptionShort}
                        </p>
                        <p className="text-sm text-gray-300 mt-2">
                           {service.teamId?.name || 'Team'}
                        </p>
                     </div>
                  </div>
               </div>
            </div>

            {/* Back Button */}
            <button
               onClick={() => router.push('/services')}
               className="absolute top-4 left-4 p-2 bg-black/50 hover:bg-black/70 text-white rounded-full transition-colors"
            >
               <XMarkIcon className="h-6 w-6" />
            </button>
         </div>

         <div className="mt-8">
               {/* Main Content Container */}
               <div className="max-w-6xl mx-auto">
                  {/* Description Section */}
                  <div className="bg-white rounded-lg shadow-sm p-8 mb-8">
                     <h2 className="text-2xl font-bold text-gray-900 mb-6">
                        About This Service
                     </h2>
                     
                     {/* Short Description */}
                     <div className="mb-6">
                        <h3 className="font-semibold text-gray-900 mb-2">Summary</h3>
                        <p className="text-lg text-gray-600">
                           {service.descriptionShort}
                        </p>
                     </div>

                     {/* Detailed Description */}
                     {service.descriptionLong && service.descriptionLong !== service.descriptionShort && (
                        <div className="mb-6">
                           <h3 className="font-semibold text-gray-900 mb-2">Detailed Description</h3>
                           <div className="prose max-w-none text-gray-600">
                              <p>{service.descriptionLong}</p>
                           </div>
                        </div>
                     )}

                     {/* Tags */}
                     {service.tags && service.tags.length > 0 && (
                        <div>
                           <h3 className="font-semibold text-gray-900 mb-3">Tags</h3>
                           <div className="flex flex-wrap gap-2">
                              {service.tags.map((tag, index) => (
                                 <span
                                    key={index}
                                    className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-orange-100 text-orange-800"
                                 >
                                    {tag}
                                 </span>
                              ))}
                           </div>
                        </div>
                     )}
                  </div>

                  {/* Service Details Section */}
                  <div className="bg-white rounded-lg shadow-sm p-8 mb-8">
                     <h2 className="text-2xl font-bold text-gray-900 mb-6">
                        Service Details
                     </h2>
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {/* Basic Information */}
                        <div>
                           <h3 className="font-semibold text-gray-900 mb-4">
                              Basic Information
                           </h3>
                           <div className="space-y-3">
                              <div>
                                 <p className="text-sm font-medium text-gray-500">Service Type</p>
                                 <p className="text-gray-900 capitalize">
                                    {service.type.replace(/_/g, ' ')}
                                 </p>
                              </div>
                              <div>
                                 <p className="text-sm font-medium text-gray-500">Team</p>
                                 <p className="text-gray-900">
                                    {service.teamId?.name || 'N/A'}
                                    {service.teamId?.type && (
                                       <span className="text-gray-500 ml-1">
                                          ({service.teamId.type})
                                       </span>
                                    )}
                                 </p>
                              </div>
                              <div>
                                 <p className="text-sm font-medium text-gray-500">Status</p>
                                 <p className="text-gray-900 capitalize">
                                    {service.status}
                                 </p>
                              </div>
                           </div>
                        </div>

                        {/* Location Information */}
                        {service.locations && service.locations.length > 0 && (
                           <div>
                              <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
                                 <MapPinIcon className="h-5 w-5 text-gray-400 mr-2" />
                                 Location
                              </h3>
                              <div className="space-y-3">
                                 {service.locations.map((location, index) => (
                                    <div key={index} className="text-gray-600">
                                       <p className="font-medium text-gray-900 mb-1">
                                          {location.label}
                                       </p>
                                       {location.address && (
                                          <div className="text-sm space-y-1">
                                             {location.address.street && (
                                                <p>{location.address.street}</p>
                                             )}
                                             {(location.address.suburb || location.address.state || location.address.postcode) && (
                                                <p>
                                                   {location.address.suburb && `${location.address.suburb}, `}
                                                   {location.address.state && `${location.address.state} `}
                                                   {location.address.postcode}
                                                </p>
                                             )}
                                          </div>
                                       )}
                                    </div>
                                 ))}
                              </div>
                           </div>
                        )}

                        {/* Contact Information */}
                        <div>
                           <h3 className="font-semibold text-gray-900 mb-4">
                              Contact Information
                           </h3>
                           <div className="space-y-3">
                              {service.contactInfo?.email ? (
                                 <div className="flex items-center text-gray-600">
                                    <EnvelopeIcon className="h-5 w-5 text-gray-400 mr-3 flex-shrink-0" />
                                    <a
                                       href={`mailto:${service.contactInfo.email}`}
                                       className="hover:text-[#F5821F] transition-colors break-all"
                                    >
                                       {service.contactInfo.email}
                                    </a>
                                 </div>
                              ) : (
                                 <p className="text-gray-500 text-sm">No email provided</p>
                              )}
                              
                              {service.contactInfo?.phone ? (
                                 <div className="flex items-center text-gray-600">
                                    <PhoneIcon className="h-5 w-5 text-gray-400 mr-3 flex-shrink-0" />
                                    <a
                                       href={`tel:${service.contactInfo.phone}`}
                                       className="hover:text-[#F5821F] transition-colors"
                                    >
                                       {service.contactInfo.phone}
                                    </a>
                                 </div>
                              ) : (
                                 <p className="text-gray-500 text-sm">No phone provided</p>
                              )}
                              
                              {service.contactInfo?.website ? (
                                 <div className="flex items-center text-gray-600">
                                    <GlobeAltIcon className="h-5 w-5 text-gray-400 mr-3 flex-shrink-0" />
                                    <a
                                       href={service.contactInfo.website}
                                       target="_blank"
                                       rel="noopener noreferrer"
                                       className="hover:text-[#F5821F] transition-colors break-all"
                                    >
                                       {service.contactInfo.website}
                                    </a>
                                 </div>
                              ) : (
                                 <p className="text-gray-500 text-sm">No website provided</p>
                              )}
                           </div>
                        </div>
                     </div>
                  </div>

                  {/* Availability & Scheduling Section */}
                  {(service.availability || service.scheduling) && (
                     <div className="bg-white rounded-lg shadow-sm p-8 mb-8">
                        <h2 className="text-2xl font-bold text-gray-900 mb-6">
                           Availability & Scheduling
                        </h2>
                        
                        {/* Service Availability */}
                        {service.availability && (
                           <div className="mb-6">
                              <h3 className="font-semibold text-gray-900 mb-3">Service Availability</h3>
                              <p className="text-gray-600 capitalize">
                                 {service.availability === 'always_open' && 'Always Open'}
                                 {service.availability === 'set_times' && 'Set Times'}
                                 {service.availability === 'set_events' && 'Set Events'}
                              </p>
                              <p className="text-sm text-gray-500 mt-1">
                                 {service.availability === 'always_open' && 'This service is available 24/7'}
                                 {service.availability === 'set_times' && 'This service operates on specific times'}
                                 {service.availability === 'set_events' && 'This service operates through scheduled events'}
                              </p>
                           </div>
                        )}

                        {/* Weekly Schedule */}
                        {service.scheduling?.weeklySchedule?.schedule && service.availability === 'set_times' && (
                           <div className="mb-6">
                              <h3 className="font-semibold text-gray-900 mb-3">Weekly Schedule</h3>
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                 {(() => {
                                    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                                    const schedule = service.scheduling?.weeklySchedule?.schedule || [];
                                    
                                    return dayNames.map((dayName, dayIndex) => {
                                       const daySchedule = schedule.find((s) => s.dayOfWeek === dayIndex);
                                       
                                       return (
                                          <div key={dayName} className="border border-gray-200 rounded-lg p-4">
                                             <h4 className="font-medium text-gray-900 mb-2">{dayName}</h4>
                                             {daySchedule?.isEnabled ? (
                                                <div className="space-y-1">
                                                   {daySchedule.timeSlots?.map((slot, index: number) => (
                                                      <p key={index} className="text-sm text-gray-600">
                                                         {slot.startTime} - {slot.endTime}
                                                      </p>
                                                   ))}
                                                   {(!daySchedule.timeSlots || daySchedule.timeSlots.length === 0) && (
                                                      <p className="text-sm text-gray-500">No time slots set</p>
                                                   )}
                                                </div>
                                             ) : (
                                                <p className="text-sm text-gray-500">Closed</p>
                                             )}
                                          </div>
                                       );
                                    });
                                 })()}
                              </div>
                              {service.scheduling?.weeklySchedule?.timezone && (
                                 <p className="text-sm text-gray-500 mt-3">
                                    Timezone: {service.scheduling?.weeklySchedule?.timezone}
                                 </p>
                              )}
                           </div>
                        )}

                        {/* Scheduled Events */}
                        {service.scheduling?.events && service.scheduling.events.length > 0 && service.availability === 'set_events' && (
                           <div>
                              <h3 className="font-semibold text-gray-900 mb-3">Scheduled Events</h3>
                              <div className="space-y-3">
                                 {service.scheduling.events.slice(0, 5).map((event, index: number) => (
                                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                                       <h4 className="font-medium text-gray-900">{event.name}</h4>
                                       {event.description && (
                                          <p className="text-sm text-gray-600 mt-1">{event.description}</p>
                                       )}
                                       <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                                          {event.startDateTime && (
                                             <span>📅 {new Date(event.startDateTime).toLocaleDateString()}</span>
                                          )}
                                          {event.startDateTime && event.endDateTime && (
                                             <span>🕒 {new Date(event.startDateTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - {new Date(event.endDateTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                          )}
                                          {event.isRecurring && (
                                             <span>🔄 Recurring ({event.recurrencePattern?.type})</span>
                                          )}
                                       </div>
                                       {event.timezone && event.timezone !== 'Australia/Sydney' && (
                                          <p className="text-xs text-gray-400 mt-1">Timezone: {event.timezone}</p>
                                       )}
                                    </div>
                                 ))}
                                 {service.scheduling.events.length > 5 && (
                                    <p className="text-sm text-gray-500 text-center py-2">
                                       And {service.scheduling.events.length - 5} more events...
                                    </p>
                                 )}
                              </div>
                           </div>
                        )}
                     </div>
                  )}

                  {/* Events Section */}
                  <div className="bg-white rounded-lg shadow-sm p-8 mb-8">
                     <div className="mb-6">
                        <h2 className="text-2xl font-bold text-gray-900">
                           Events
                        </h2>
                     </div>
                     {events.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                           {events.slice(0, 10).map((event) => (
                              <div key={event._id} className="p-6">
                                 <div className="mb-4">
                                    <h3 className="text-lg font-medium text-gray-900">
                                       {event.name}
                                    </h3>
                                    {event.description && (
                                       <p className="text-gray-600 mt-1 text-sm">
                                          {event.description}
                                       </p>
                                    )}
                                 </div>
                                 
                                 <div className="space-y-2">
                                    <div className="flex items-center text-sm text-gray-600">
                                       <span className="font-medium w-16">Date:</span>
                                       <span>
                                          {new Date(event.start).toLocaleDateString('en-AU', {
                                             year: 'numeric',
                                             month: 'long',
                                             day: 'numeric'
                                          })}
                                       </span>
                                    </div>
                                    {event.start.includes('T') && new Date(event.start).getHours() !== 0 && (
                                       <div className="flex items-center text-sm text-gray-600">
                                          <span className="font-medium w-16">Time:</span>
                                          <span>
                                             {new Date(event.start).toLocaleTimeString('en-AU', {
                                                hour: '2-digit',
                                                minute: '2-digit'
                                             })}
                                             {event.end && (
                                                <span>
                                                   {' - '} 
                                                   {new Date(event.end).toLocaleTimeString('en-AU', {
                                                      hour: '2-digit',
                                                      minute: '2-digit'
                                                   })}
                                                </span>
                                             )}
                                          </span>
                                       </div>
                                    )}
                                    {event.locationText && (
                                       <div className="flex items-center text-sm text-gray-600">
                                          <span className="font-medium w-16">Location:</span>
                                          <span>{event.locationText}</span>
                                       </div>
                                    )}
                                 </div>
                              </div>
                           ))}
                        </div>
                     ) : (
                        <p className="text-gray-500 text-center py-8">
                           No events scheduled for this service.
                        </p>
                     )}
                  </div>



                  {/* Gallery Section */}
                  <div className="bg-white rounded-lg shadow-sm p-8 mb-8">
                     <div className="flex items-center justify-between mb-6">
                        <h2 className="text-2xl font-bold text-gray-900">
                           Gallery
                        </h2>
                        {permissions.canUpdate && (
                           <button
                              onClick={() =>
                                 router.push(`/services/${serviceId}/images`)
                              }
                              className="text-[#F5821F] hover:text-[#e0741c] font-medium text-sm"
                           >
                              Manage Images
                           </button>
                        )}
                     </div>

                     {/* Gallery Display */}
                     {service.gallery && service.gallery.length > 0 ? (
                           <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                              {service.gallery
                                 .slice(0, 8)
                                 .map((image, index) => (
                                    <div
                                       key={index}
                                       className="relative rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-shadow group"
                                    >
                                       <div className="relative h-48">
                                          <Image
                                             src={image.url}
                                             alt={
                                                image.alt ||
                                                `Gallery image ${index + 1}`
                                             }
                                             fill
                                             className="object-cover group-hover:scale-105 transition-transform duration-300"
                                          />
                                       </div>
                                       {image.caption && (
                                          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                                             <p className="text-white text-xs">
                                                {image.caption}
                                             </p>
                                          </div>
                                       )}
                                    </div>
                                 ))}
                              {service.gallery.length > 8 && (
                                 <div
                                    className="relative h-48 rounded-lg bg-gray-100 flex items-center justify-center cursor-pointer hover:bg-gray-200 transition-colors"
                                    onClick={() =>
                                       permissions.canUpdate &&
                                       router.push(
                                          `/services/${serviceId}/images`
                                       )
                                    }
                                 >
                                    <div className="text-center">
                                       <p className="text-2xl font-bold text-gray-600">
                                          +{service.gallery.length - 8}
                                       </p>
                                       <p className="text-sm text-gray-500">
                                          more images
                                       </p>
                                    </div>
                                 </div>
                              )}
                           </div>
                        ) : (
                           <p className="text-gray-500 text-center py-8">
                              No gallery images uploaded yet.
                           </p>
                        )}
                  </div>
               </div>
            </div>

            {/* Modals */}
         </AdminLayout>
   );
}
