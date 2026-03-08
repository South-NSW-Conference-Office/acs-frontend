'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { usePermissions } from '../../../contexts/HierarchicalPermissionContext';
import { serviceTypeAPI, ServiceType, ServiceTypeFormData } from '../../../lib/serviceTypes';
import ServiceTypeModal from '../../../components/ServiceTypeModal';
import ConfirmationModal from '../../../components/ConfirmationModal';
import { useToast } from '../../../contexts/ToastContext';
import { PlusIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { TrashIcon } from '@heroicons/react/24/outline';
import { RowActionsMenu } from '../../../components/RowActionsMenu';
import AdminLayout from '../../../components/AdminLayout';

export default function ServiceTypesPage() {
  const { permissions } = usePermissions();
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
    loadServiceTypes();
  }, [filterActive, loadServiceTypes]);

  const handleCreate = () => {
    setEditingType(null);
    setModalOpen(true);
  };

  const handleEdit = (serviceType: ServiceType) => {
    setEditingType(serviceType);
    setModalOpen(true);
  };

  const handleDelete = (serviceType: ServiceType) => {
    setServiceTypeToDelete(serviceType);
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    if (!serviceTypeToDelete) return;

    try {
      await serviceTypeAPI.delete(serviceTypeToDelete._id);
      showSuccess('Service type deleted successfully');
      loadServiceTypes();
    } catch (error) {
      const errorMessage = (error as { response?: { data?: { message?: string } } }).response?.data?.message;
      showError('Failed to delete service type', errorMessage);
    } finally {
      setShowDeleteConfirm(false);
      setServiceTypeToDelete(null);
    }
  };

  const handleSubmit = async (data: ServiceTypeFormData) => {
    try {
      setSubmitting(true);
      if (editingType) {
        await serviceTypeAPI.update(editingType._id, data);
        showSuccess('Service type updated successfully');
      } else {
        await serviceTypeAPI.create(data);
        showSuccess('Service type created successfully');
      }
      setModalOpen(false);
      loadServiceTypes();
    } catch (error) {
      const errorMessage = (error as { response?: { data?: { message?: string } } }).response?.data?.message;
      showError('Failed to save service type', errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadServiceTypes();
  };

  const filteredTypes = serviceTypes ? serviceTypes.filter(type =>
    type.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    type.value.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (type.description?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)
  ) : [];

  const hasPermission = permissions?.includes('manage_service_types') || permissions?.includes('*');
  
  if (!hasPermission) {
    return (
      <AdminLayout title="Service Types">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">Access Denied</h2>
          <p className="mt-2 text-gray-600">
            You don&apos;t have permission to manage service types.
          </p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Service Types">
      <div className="space-y-6">
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="p-6 border-b border-gray-200">
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
                className="mt-4 md:mt-0 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
              >
                <PlusIcon className="mr-2 -ml-1 h-4 w-4" />
                Add Service Type
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 border-separate border-spacing-0">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Value
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                      Loading...
                    </td>
                  </tr>
                ) : filteredTypes.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                      No service types found
                    </td>
                  </tr>
                ) : (
                  filteredTypes.map((type) => (
                    <tr key={type._id} className="transition-all duration-500 ease-out hover:scale-[1.01] hover:shadow-md hover:bg-gray-50 hover:z-10 relative">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {type.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <code className="bg-gray-100 px-2 py-1 rounded">{type.value}</code>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                        {type.description || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          type.isActive
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {type.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-right">
                        <RowActionsMenu actions={[
                          { label: 'Edit', onClick: () => handleEdit(type) },
                          { label: 'Delete', onClick: () => handleDelete(type), variant: 'danger' },
                        ]} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <ServiceTypeModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          onSubmit={handleSubmit}
          serviceType={editingType}
          isLoading={submitting}
        />

        <ConfirmationModal
          isOpen={showDeleteConfirm}
          onClose={() => {
            setShowDeleteConfirm(false);
            setServiceTypeToDelete(null);
          }}
          onConfirm={handleConfirmDelete}
          title="Delete Service Type"
          message={`Are you sure you want to delete "${serviceTypeToDelete?.name}"? This action cannot be undone.`}
          confirmLabel="Delete Service Type"
          confirmButtonColor="red"
          icon={<TrashIcon className="h-6 w-6 text-red-600" />}
        />
      </div>
    </AdminLayout>
  );
}