'use client';

import { useState, useEffect, useCallback } from 'react';
import AdminLayout from '../../components/AdminLayout';
import { PermissionGate } from '@/components/PermissionGate';
import { StatusBadge } from '@/components/DataTable';
import Button from '@/components/Button';
import VolunteerOpportunityModal from '@/components/VolunteerOpportunityModal';
import ConfirmationModal from '@/components/ConfirmationModal';
import { useToast } from '@/contexts/ToastContext';
import { volunteerOpportunitiesAPI, VolunteerOpportunityListItem } from '@/lib/volunteerOpportunitiesAPI';
import { UserGroupIcon, MapPinIcon, MagnifyingGlassIcon, ClockIcon } from '@heroicons/react/24/outline';
import { TrashIcon } from '@heroicons/react/24/outline';
import { RowActionsMenu } from '@/components/RowActionsMenu';

export default function VolunteerOpportunities() {
  const [opportunities, setOpportunities] = useState<VolunteerOpportunityListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [serviceFilter, setServiceFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [selectedOpportunity, setSelectedOpportunity] = useState<VolunteerOpportunityListItem | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [opportunityToDelete, setOpportunityToDelete] = useState<VolunteerOpportunityListItem | null>(null);
  const [services, setServices] = useState<Array<{ _id: string; name: string; type: string }>>([]);
  const { error: showErrorToast, success: showSuccessToast } = useToast();

  const fetchOpportunities = useCallback(async () => {
    try {
      setLoading(true);
      const filters = {
        search: searchQuery || undefined,
        serviceId: serviceFilter || undefined,
        status: statusFilter || undefined,
        category: categoryFilter || undefined
      };
      const opportunitiesData = await volunteerOpportunitiesAPI.getAllOpportunities(filters);
      setOpportunities(opportunitiesData);
    } catch (error: unknown) {
      console.error('Failed to fetch volunteer opportunities:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      showErrorToast('Failed to load volunteer opportunities', errorMessage);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, serviceFilter, statusFilter, categoryFilter, showErrorToast]);

  const fetchServices = useCallback(async () => {
    try {
      const servicesData = await volunteerOpportunitiesAPI.getServicesForDropdown();
      setServices(servicesData);
    } catch (error: unknown) {
      console.error('Failed to fetch services:', error);
    }
  }, []);

  useEffect(() => {
    fetchOpportunities();
  }, [fetchOpportunities]);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  const handleOpportunitySaved = () => {
    setShowCreateModal(false);
    setShowEditModal(false);
    setSelectedOpportunity(null);
    fetchOpportunities();
  };

  const handleDeleteOpportunity = async () => {
    if (!opportunityToDelete) return;

    try {
      await volunteerOpportunitiesAPI.deleteOpportunity(opportunityToDelete._id);
      showSuccessToast('Volunteer opportunity deleted successfully');
      setShowDeleteConfirm(false);
      setOpportunityToDelete(null);
      fetchOpportunities();
    } catch (error: unknown) {
      console.error('Failed to delete volunteer opportunity:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      showErrorToast('Failed to delete volunteer opportunity', errorMessage);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'green';
      case 'draft':
        return 'blue';
      case 'paused':
        return 'yellow';
      case 'filled':
        return 'purple';
      case 'closed':
        return 'gray';
      default:
        return 'gray';
    }
  };

  const formatCategory = (category: string) => {
    if (!category) return 'Uncategorized';
    return category.charAt(0).toUpperCase() + category.slice(1);
  };

  const formatTimeCommitment = (timeCommitment: VolunteerOpportunityListItem['timeCommitment']) => {
    if (!timeCommitment) return 'Not specified';
    
    let text = formatCategory(timeCommitment.type);
    if (timeCommitment.hoursPerWeek?.minimum || timeCommitment.hoursPerWeek?.maximum) {
      const min = timeCommitment.hoursPerWeek.minimum || 0;
      const max = timeCommitment.hoursPerWeek.maximum || min;
      if (min === max) {
        text += ` (${min}h/week)`;
      } else {
        text += ` (${min}-${max}h/week)`;
      }
    }
    return text;
  };

  const columns = [
    {
      key: 'title',
      header: 'Opportunity',
      accessor: (opportunity: VolunteerOpportunityListItem) => (
        <div className="flex items-start space-x-3">
          <div className="w-10 h-10 rounded flex-shrink-0 bg-orange-100 flex items-center justify-center">
            <UserGroupIcon className="w-5 h-5 text-[#F5821F]" />
          </div>
          <div className="min-w-0">
            <p className="font-medium text-gray-900 truncate">{opportunity.title}</p>
            <p className="text-sm text-gray-500 truncate">{formatCategory(opportunity.category)}</p>
          </div>
        </div>
      ),
      className: 'px-6 py-4'
    },
    {
      key: 'service',
      header: 'Service',
      accessor: (opportunity: VolunteerOpportunityListItem) => (
        <div>
          <p className="font-medium text-gray-900">{opportunity.service.name}</p>
          <p className="text-sm text-gray-500">{opportunity.service.type}</p>
        </div>
      ),
      className: 'px-6 py-4'
    },
    {
      key: 'positions',
      header: 'Positions',
      accessor: (opportunity: VolunteerOpportunityListItem) => (
        <div>
          <p className="font-medium text-gray-900">
            {opportunity.positionsFilled || 0} / {opportunity.numberOfPositions}
          </p>
          <p className="text-sm text-gray-500">
            {(opportunity.numberOfPositions - (opportunity.positionsFilled || 0))} available
          </p>
        </div>
      ),
      className: 'px-6 py-4'
    },
    {
      key: 'timeCommitment',
      header: 'Time Commitment',
      accessor: (opportunity: VolunteerOpportunityListItem) => (
        <div className="flex items-center space-x-1">
          <ClockIcon className="w-4 h-4 text-gray-400" />
          <span className="text-gray-900">{formatTimeCommitment(opportunity.timeCommitment)}</span>
        </div>
      ),
      className: 'px-6 py-4'
    },
    {
      key: 'location',
      header: 'Location',
      accessor: (opportunity: VolunteerOpportunityListItem) => (
        <div className="flex items-center space-x-1">
          <MapPinIcon className="w-4 h-4 text-gray-400" />
          <span className="text-gray-900">{formatCategory(opportunity.location.type)}</span>
        </div>
      ),
      className: 'px-6 py-4'
    },
    {
      key: 'status',
      header: 'Status',
      accessor: (opportunity: VolunteerOpportunityListItem) => (
        <StatusBadge 
          status={opportunity.status === 'open'}
          trueLabel="Open"
          falseLabel={opportunity.status.charAt(0).toUpperCase() + opportunity.status.slice(1)}
          trueColor={getStatusColor(opportunity.status) as 'green' | 'blue' | 'purple'}
          falseColor={getStatusColor(opportunity.status) as 'yellow' | 'red' | 'gray'}
        />
      ),
      className: 'px-6 py-4'
    },
    {
      key: 'actions',
      header: 'Actions',
      accessor: (opportunity: VolunteerOpportunityListItem) => (
        <RowActionsMenu actions={[
          { label: 'Edit', onClick: () => { setSelectedOpportunity(opportunity); setShowEditModal(true); } },
          { label: 'Delete', onClick: () => { setOpportunityToDelete(opportunity); setShowDeleteConfirm(true); }, variant: 'danger' },
        ]} />
      ),
      className: 'px-6 py-4'
    },
  ];

  const filteredOpportunities = opportunities.filter(opportunity => {
    const matchesSearch = opportunity.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      opportunity.service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (opportunity.description && opportunity.description.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesCategory = !categoryFilter || 
      (opportunity.category && opportunity.category.toLowerCase().includes(categoryFilter.toLowerCase()));
    
    return matchesSearch && matchesCategory;
  });


  const statusOptions = [
    { value: '', label: 'All Status' },
    { value: 'draft', label: 'Draft' },
    { value: 'open', label: 'Open' },
    { value: 'paused', label: 'Paused' },
    { value: 'filled', label: 'Filled' },
    { value: 'closed', label: 'Closed' },
  ];

  return (
    <AdminLayout 
      title="Volunteer Opportunities" 
      description="Manage volunteer opportunities for all community services"
    >
      <div className="space-y-6">
        {/* Table with custom header */}
        <div className="overflow-hidden">
          {/* Custom header with search, filters and button */}
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search opportunities..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 block w-full sm:w-64 px-4 py-2 rounded-md border-gray-300 shadow-sm focus:ring-[#F5821F] focus:border-[#F5821F] text-sm bg-white"
                  />
                </div>
                <select
                  value={serviceFilter}
                  onChange={(e) => setServiceFilter(e.target.value)}
                  className="block w-full sm:w-48 px-4 py-2 rounded-md border-gray-300 shadow-sm focus:ring-[#F5821F] focus:border-[#F5821F] text-sm bg-white"
                >
                  <option value="">All Services</option>
                  {services.map((service) => (
                    <option key={service._id} value={service._id}>
                      {service.name}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="Filter by category..."
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="block w-full sm:w-48 px-4 py-2 rounded-md border-gray-300 shadow-sm focus:ring-[#F5821F] focus:border-[#F5821F] text-sm bg-white"
                />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="block w-full sm:w-48 px-4 py-2 rounded-md border-gray-300 shadow-sm focus:ring-[#F5821F] focus:border-[#F5821F] text-sm bg-white"
                >
                  {statusOptions.map((status) => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </select>
              </div>
              <PermissionGate permission="services.manage">
                <Button onClick={() => setShowCreateModal(true)} className="whitespace-nowrap" size="sm">
                  Add Opportunity
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
            ) : filteredOpportunities.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <div className="mx-auto h-12 w-12 text-gray-400 mb-4">
                  <UserGroupIcon />
                </div>
                <p className="text-sm text-gray-500">
                  {opportunities.length === 0 ? 'No volunteer opportunities found' : 'No opportunities match your search criteria'}
                </p>
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200 border-separate border-spacing-0">
                <thead className="bg-gray-50">
                  <tr>
                    {columns.map((column) => (
                      <th
                        key={column.key}
                        className={`${column.className} text-left text-xs font-medium text-gray-500 uppercase tracking-wider`}
                      >
                        {column.header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredOpportunities.map((opportunity) => (
                    <tr key={opportunity._id} className="transition-all duration-500 ease-out hover:scale-[1.01] hover:shadow-md hover:bg-gray-50 hover:z-10 relative">
                      {columns.map((column) => (
                        <td
                          key={`${opportunity._id}-${column.key}`}
                          className={`${column.className} whitespace-nowrap text-sm text-gray-900`}
                        >
                          {column.accessor(opportunity)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Create Opportunity Modal */}
      {showCreateModal && (
        <VolunteerOpportunityModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onOpportunitySaved={handleOpportunitySaved}
        />
      )}

      {/* Edit Opportunity Modal */}
      {showEditModal && selectedOpportunity && (
        <VolunteerOpportunityModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setSelectedOpportunity(null);
          }}
          onOpportunitySaved={handleOpportunitySaved}
          opportunity={selectedOpportunity}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && opportunityToDelete && (
        <ConfirmationModal
          isOpen={showDeleteConfirm}
          onClose={() => {
            setShowDeleteConfirm(false);
            setOpportunityToDelete(null);
          }}
          onConfirm={handleDeleteOpportunity}
          title="Delete Volunteer Opportunity"
          message={`Are you sure you want to delete "${opportunityToDelete.title}"? This action cannot be undone.`}
          confirmLabel="Delete Opportunity"
          confirmButtonColor="red"
          icon={<TrashIcon className="h-6 w-6 text-red-600" />}
        />
      )}
    </AdminLayout>
  );
}