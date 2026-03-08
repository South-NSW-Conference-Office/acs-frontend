'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import AdminLayout from '../../components/AdminLayout';
import { PermissionGate } from '@/components/PermissionGate';
import { StatusBadge } from '@/components/DataTable';
import Button from '@/components/Button';
import ServiceModal from '@/components/ServiceModal';
import ConfirmationModal from '@/components/ConfirmationModal';
import { useToast } from '@/contexts/ToastContext';
import { serviceManagement, Service } from '@/lib/serviceManagement';

interface ServicesResponse {
  services: Service[];
}
import { BuildingStorefrontIcon, MapPinIcon } from '@heroicons/react/24/outline';
import { TrashIcon } from '@heroicons/react/24/outline';
import { RowActionsMenu } from '@/components/RowActionsMenu';


function ServiceImage({ service }: { service: Service }) {
  const [imageError, setImageError] = useState(false);

  if (!service.primaryImage?.url || imageError) {
    return (
      <div className="w-10 h-10 rounded flex-shrink-0 bg-gray-100 flex items-center justify-center">
        <BuildingStorefrontIcon className="w-5 h-5 text-gray-400" />
      </div>
    );
  }

  return (
    <Image 
      src={service.primaryImage.url} 
      alt={service.primaryImage.alt || 'Service image'}
      width={40}
      height={40}
      className="object-cover rounded flex-shrink-0"
      onError={() => setImageError(true)}
    />
  );
}

export default function Services() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [serviceToDelete, setServiceToDelete] = useState<Service | null>(null);
  const { success, error } = useToast();
  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const fetchServices = useCallback(async (debounce = false) => {
    // Clear existing timeout if setting up a new debounced call
    if (fetchTimeoutRef.current) {
      clearTimeout(fetchTimeoutRef.current);
      fetchTimeoutRef.current = null;
    }

    if (debounce) {
      fetchTimeoutRef.current = setTimeout(() => fetchServices(false), 300);
      return;
    }

    try {
      setLoading(true);
      const data = await serviceManagement.getServices() as ServicesResponse;
      // Debug: Check what we're receiving
      console.log('Raw services data:', data);
      console.log('Services array:', data?.services);
      
      // Filter out any null, undefined, or invalid services
      const validServices = (data?.services || []).filter(service => 
        service && 
        typeof service === 'object' && 
        service._id && 
        service.name && 
        service.type
      );
      
      console.log('Valid services after filtering:', validServices);
      setServices(validServices);
    } catch (err) {
      console.error('Error fetching services:', err);
      const errorMessage = (err as Error)?.message || 'Failed to fetch services';
      
      // Only show error toast if it's a real error, not when services array is empty
      if (err && errorMessage !== 'No services found') {
        if (errorMessage.includes('Too many requests')) {
          error('Server is busy. Please wait a moment and try again.');
        } else {
          error('Failed to fetch services');
        }
      }
      setServices([]);
    } finally {
      setLoading(false);
    }
  }, [error]);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  const handleDeleteService = async (service: Service) => {
    try {
      await serviceManagement.deleteService(service._id);
      setServices(prev => prev.filter(s => s._id !== service._id));
      success(`${service.name} has been successfully deleted.`);
    } catch (err) {
      console.error('Error deleting service:', err);
      error('Failed to delete service');
    } finally {
      setShowDeleteConfirm(false);
      setServiceToDelete(null);
    }
  };

  const handleServiceSaved = (savedService: Service, isEdit: boolean) => {
    // Validate the saved service before adding/updating
    if (!savedService || !savedService._id || !savedService.name || !savedService.type) {
      error('Invalid service data received');
      return;
    }
    
    if (isEdit) {
      setServices(prev => 
        prev.map(service => service._id === savedService._id ? savedService : service)
      );
      success(`${savedService.name} has been successfully updated.`);
    } else {
      setServices(prev => [...prev, savedService]);
      success(`${savedService.name} has been successfully created.`);
    }
    
    setShowCreateModal(false);
    setShowEditModal(false);
    setSelectedService(null);
  };

  const columns = [
    {
      key: 'name',
      header: 'Service',
      accessor: (service: Service) => (
        <div className="flex items-start space-x-3">
          <ServiceImage service={service} />
          <div className="min-w-0">
            <button
              onClick={() => window.location.href = `/services/${service._id}`}
              className="font-semibold text-gray-900 hover:text-gray-600 truncate text-left cursor-pointer transition-colors duration-200"
            >
              {service.name}
            </button>
            <div className="text-sm text-gray-500 truncate">{service.descriptionShort}</div>
          </div>
        </div>
      ),
      className: 'px-6 py-4'
    },
    {
      key: 'type',
      header: 'Type',
      accessor: (service: Service) => (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 capitalize">
          {service.type.replace(/_/g, ' ')}
        </span>
      ),
    },
    {
      key: 'team',
      header: 'Team',
      accessor: (service: Service) => {
        // Debug the team structure
        console.log('Team data for service:', service.name, 'teamId:', service.teamId);
        
        const teamName = typeof service.teamId === 'object' ? service.teamId?.name : 'Team ID: ' + service.teamId;
        const teamCategory = typeof service.teamId === 'object' ? service.teamId?.category : '';
        
        return (
          <div>
            <div className="text-sm font-medium text-gray-900">
              {teamName || 'No Team'}
            </div>
            <div className="text-xs text-gray-500 capitalize">
              {teamCategory || ''}
            </div>
          </div>
        );
      },
    },
    {
      key: 'location',
      header: 'Location',
      accessor: (service: Service) => {
        if (!service.locations || service.locations.length === 0) {
          return <span className="text-gray-400">-</span>;
        }
        const location = service.locations[0];
        return (
          <div className="flex items-center text-sm text-gray-600">
            <MapPinIcon className="h-4 w-4 mr-1 flex-shrink-0" />
            <span className="truncate">
              {location.address.suburb && location.address.state ? 
                `${location.address.suburb}, ${location.address.state}` : 
                location.label
              }
            </span>
          </div>
        );
      },
      className: 'px-6 py-4 max-w-xs'
    },
    {
      key: 'status',
      header: 'Status',
      accessor: (service: Service) => (
        <StatusBadge
          status={service.status === 'active'}
          trueLabel="Active"
          falseLabel={service.status === 'paused' ? 'Paused' : 'Archived'}
          trueColor="green"
          falseColor={service.status === 'paused' ? 'yellow' : 'gray'}
        />
      ),
    },
    {
      key: 'createdAt',
      header: 'Created',
      accessor: (service: Service) => (
        <span className="text-sm text-gray-500">
          {new Date(service.createdAt).toLocaleDateString()}
        </span>
      )
    },
    {
      key: 'actions',
      header: 'Actions',
      headerClassName: 'px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider',
      className: 'px-6 py-4 whitespace-nowrap text-right text-sm font-medium',
      accessor: (service: Service) => (
        <RowActionsMenu actions={[
          { label: 'Edit', onClick: () => { setSelectedService(service); setShowEditModal(true); } },
          { label: 'Delete', onClick: () => { setServiceToDelete(service); setShowDeleteConfirm(true); }, variant: 'danger' },
        ]} />
      ),
    },
  ];

  const filteredServices = services.filter(service => {
    // Skip null, undefined, or invalid service entries
    if (!service || !service.name || !service.type) {
      return false;
    }
    
    return (
      service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      service.type.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  return (
    <AdminLayout 
      title="Services" 
      description="Manage community services across your teams"
    >
      <div className="space-y-6">
        {/* Table with custom header */}
        <div className="overflow-hidden">
          {/* Custom header with search and button */}
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between gap-4">
              <div className="max-w-xs">
                <input
                  type="text"
                  placeholder="Search services..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="block w-full px-4 py-2 rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-sm bg-white"
                />
              </div>
              <PermissionGate permission="services.create">
                <Button onClick={() => setShowCreateModal(true)} className="whitespace-nowrap" size="sm">
                  Add Service
                </Button>
              </PermissionGate>
            </div>
          </div>
          
          {/* Table content */}
          <div className="overflow-x-auto">
            {loading ? (
              <div className="px-4 py-5 text-center">
                <p className="text-gray-500">Loading...</p>
              </div>
            ) : filteredServices.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <div className="mx-auto h-12 w-12 text-gray-400 mb-4">
                  <BuildingStorefrontIcon />
                </div>
                <p className="text-sm text-gray-500">No services found</p>
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200 border-separate border-spacing-0">
                <thead className="bg-gray-50">
                  <tr>
                    {columns.map((column) => (
                      <th
                        key={column.key}
                        scope="col"
                        className={
                          column.headerClassName ||
                          'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'
                        }
                      >
                        {column.header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredServices.map((item) => (
                    <tr key={item._id} className="transition-all duration-500 ease-out hover:scale-[1.01] hover:shadow-md hover:bg-gray-50 hover:z-10 relative">
                      {columns.map((column) => (
                        <td
                          key={column.key}
                          className={column.className || 'px-6 py-4 whitespace-nowrap text-sm'}
                        >
                          {column.accessor(item)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Create/Edit Modal */}
        <ServiceModal
          isOpen={showCreateModal || showEditModal}
          onClose={() => {
            setShowCreateModal(false);
            setShowEditModal(false);
            setSelectedService(null);
          }}
          onSave={handleServiceSaved}
          service={showEditModal ? selectedService || undefined : undefined}
        />

        {/* Delete Confirmation Modal */}
        <ConfirmationModal
          isOpen={showDeleteConfirm}
          onClose={() => {
            setShowDeleteConfirm(false);
            setServiceToDelete(null);
          }}
          onConfirm={() => serviceToDelete && handleDeleteService(serviceToDelete)}
          title="Delete Service"
          message={`Are you sure you want to delete "${serviceToDelete?.name}"? This action cannot be undone and will permanently remove all service data.`}
          confirmLabel="Delete Service"
          confirmButtonColor="orange"
          theme="orange"
          icon={<TrashIcon className="h-6 w-6 text-red-600" />}
        />
      </div>
    </AdminLayout>
  );
}