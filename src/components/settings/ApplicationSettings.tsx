'use client';

import { useState, useEffect, useCallback } from 'react';
import { usePermissions } from '../../contexts/HierarchicalPermissionContext';
import { serviceTypeAPI, ServiceType, ServiceTypeFormData } from '../../lib/serviceTypes';
import ServiceTypeModal from '../ServiceTypeModal';
import ConfirmationModal from '../ConfirmationModal';
import { useToast } from '../../contexts/ToastContext';
import { PlusIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { RowActionsMenu } from '../RowActionsMenu';

interface ApplicationSettingsProps {
  section: string;
}

export default function ApplicationSettings({ section }: ApplicationSettingsProps) {
  const { } = usePermissions();
  const { success: showSuccess, error: showError } = useToast();
  
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingType, setEditingType] = useState<ServiceType | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterActive, setFilterActive] = useState<boolean | undefined>(undefined);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [serviceTypeToDelete, setServiceTypeToDelete] = useState<ServiceType | null>(null);

  const loadServiceTypes = useCallback(async () => {
    try {
      setLoading(true);
      const types = await serviceTypeAPI.getAll({
        isActive: filterActive,
        search: searchTerm,
      });
      setServiceTypes(types);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : (error as { response?: { data?: { message?: string } } }).response?.data?.message;
      showError('Failed to load service types', errorMessage);
    } finally {
      setLoading(false);
    }
  }, [filterActive, searchTerm, showError]);

  useEffect(() => {
    if (section === 'service-types') {
      loadServiceTypes();
    }
  }, [section, loadServiceTypes]);

  const handleCreate = () => {
    setEditingType(null);
    setModalOpen(true);
  };

  const handleEdit = (serviceType: ServiceType) => {
    setEditingType(serviceType);
    setModalOpen(true);
  };

  const handleDelete = async () => {
    if (!serviceTypeToDelete) return;

    try {
      setSubmitting(true);
      await serviceTypeAPI.delete(serviceTypeToDelete.id);
      showSuccess('Service type deleted successfully');
      loadServiceTypes();
      setShowDeleteConfirm(false);
      setServiceTypeToDelete(null);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : (error as { response?: { data?: { message?: string } } }).response?.data?.message;
      showError('Failed to delete service type', errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSave = async (data: ServiceTypeFormData) => {
    try {
      setSubmitting(true);
      if (editingType) {
        await serviceTypeAPI.update(editingType.id, data);
        showSuccess('Service type updated successfully');
      } else {
        await serviceTypeAPI.create(data);
        showSuccess('Service type created successfully');
      }
      loadServiceTypes();
      setModalOpen(false);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : (error as { response?: { data?: { message?: string } } }).response?.data?.message;
      showError(editingType ? 'Failed to update service type' : 'Failed to create service type', errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadServiceTypes();
  };

  const promptDelete = (serviceType: ServiceType) => {
    setServiceTypeToDelete(serviceType);
    setShowDeleteConfirm(true);
  };

  if (section === 'service-types') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Service Types</h1>
          <p className="mt-2 text-sm text-gray-600">
            Manage the types of services available in the system. Add, edit, or remove service categories.
          </p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between">
              <div className="flex-1 flex flex-col md:flex-row gap-4">
                <form onSubmit={handleSearch} className="flex-1 max-w-md">
                  <div className="relative">
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search service types..."
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                    <MagnifyingGlassIcon className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  </div>
                </form>
                
                <select
                  value={filterActive === undefined ? '' : filterActive.toString()}
                  onChange={(e) => setFilterActive(e.target.value === '' ? undefined : e.target.value === 'true')}
                  className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Status</option>
                  <option value="true">Active Only</option>
                  <option value="false">Inactive Only</option>
                </select>
              </div>
              
              <button
                onClick={handleCreate}
                className="ml-4 inline-flex items-center px-4 py-2 bg-blue-600 border border-transparent rounded-md font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <PlusIcon className="h-5 w-5 mr-2" />
                New Service Type
              </button>
            </div>
          </div>

          {loading ? (
            <div className="p-6 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 border-separate border-spacing-0">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Service Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Last Updated
                    </th>
                    <th className="relative px-6 py-3">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {serviceTypes.map((serviceType) => (
                    <tr key={serviceType.id} className="transition-all duration-500 ease-out hover:scale-[1.01] hover:shadow-md hover:bg-gray-50 hover:z-10 relative">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{serviceType.name}</div>
                          {serviceType.description && (
                            <div className="text-sm text-gray-500">{serviceType.description}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          serviceType.isActive 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {serviceType.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {serviceType.updatedAt ? new Date(serviceType.updatedAt).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <RowActionsMenu actions={[
                          { label: 'Edit', onClick: () => handleEdit(serviceType) },
                          { label: 'Delete', onClick: () => promptDelete(serviceType), variant: 'danger' },
                        ]} />
                      </td>
                    </tr>
                  ))}
                  {serviceTypes.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-6 py-4 text-center text-gray-500">
                        No service types found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Service Type Modal */}
        <ServiceTypeModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          onSubmit={handleSave}
          serviceType={editingType}
          isLoading={submitting}
        />

        {/* Delete Confirmation Modal */}
        <ConfirmationModal
          isOpen={showDeleteConfirm}
          onClose={() => setShowDeleteConfirm(false)}
          onConfirm={handleDelete}
          title="Delete Service Type"
          message={`Are you sure you want to delete "${serviceTypeToDelete?.name}"? This action cannot be undone.`}
          confirmLabel="Delete"
          confirmButtonColor="red"
        />
      </div>
    );
  }

  return null;
}