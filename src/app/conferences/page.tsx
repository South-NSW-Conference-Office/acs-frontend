'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import AdminLayout from '@/components/AdminLayout';
import { PermissionGate } from '@/components/PermissionGate';
import { Column, StatusBadge } from '@/components/DataTable';
import { RowActionsMenu } from '@/components/RowActionsMenu';
import Button from '@/components/Button';
import ConferenceModal from '@/components/ConferenceModal';
import ConfirmationModal from '@/components/ConfirmationModal';
import { useToast } from '@/contexts/ToastContext';
import { conferenceService } from '@/lib/conferenceService';
import { UnionService } from '@/lib/unionService';
import { Conference } from '@/types/rbac';
import { Union, ConferenceListParams } from '@/types/hierarchy';
import {
  BuildingOffice2Icon,
  TrashIcon,
  PhoneIcon,
  EnvelopeIcon,
} from '@heroicons/react/24/outline';

interface ConferenceWithUnion extends Omit<Conference, 'unionId'> {
  unionId: Union | string;
}

export default function ConferencesPage() {
  const [conferences, setConferences] = useState<ConferenceWithUnion[]>([]);
  const [unions, setUnions] = useState<Union[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedConference, setSelectedConference] = useState<ConferenceWithUnion | undefined>(undefined);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [conferenceToDelete, setConferenceToDelete] = useState<ConferenceWithUnion | undefined>(undefined);
  
  const toast = useToast();

  const fetchConferences = useCallback(async () => {
    try {
      setLoading(true);
      
      const params: ConferenceListParams = {
        includeInactive: showInactive,
      };
      
      const [conferencesResponse, unionsResponse] = await Promise.all([
        conferenceService.getConferences(params),
        UnionService.getAllUnions({ isActive: true })
      ]);
      
      setConferences(conferencesResponse.data);
      setUnions(unionsResponse.data);
    } catch (err) {
      console.error('Failed to fetch conferences:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch conferences';
      toast.error('Failed to load conferences', errorMessage);
      setConferences([]);
      setUnions([]);
    } finally {
      setLoading(false);
    }
  }, [showInactive, toast]);

  useEffect(() => {
    fetchConferences();
  }, [fetchConferences]);

  const filteredConferences = (conferences || []).filter(
    (conference) => {
      if (!conference) return false;
      
      const searchLower = searchQuery.toLowerCase();
      
      // If no search query, return all conferences
      if (!searchQuery.trim()) return true;
      
      // Check conference name
      if (conference.name?.toLowerCase().includes(searchLower)) {
        return true;
      }
      
      // Check email
      if (conference.contact?.email?.toLowerCase().includes(searchLower)) {
        return true;
      }
      
      // Check territory
      if (conference.territory?.description?.toLowerCase().includes(searchLower)) {
        return true;
      }
      
      // Check union name
      const unionName = typeof conference.unionId === 'object' 
        ? conference.unionId.name 
        : unions.find(u => u._id === conference.unionId)?.name || '';
      if (unionName.toLowerCase().includes(searchLower)) {
        return true;
      }
      
      return false;
    }
  );

  const handleDeleteConference = async (conference: ConferenceWithUnion) => {
    try {
      await conferenceService.deleteConference(conference._id);
      setConferences((prev) =>
        prev.filter((c) => c._id !== conference._id)
      );
      toast.success(
        'Conference deleted',
        `${conference.name} has been successfully removed.`
      );
    } catch (error) {
      console.error('Error deleting conference:', error);
      toast.error(
        'Failed to delete conference',
        'An unexpected error occurred'
      );
    } finally {
      setShowDeleteConfirm(false);
      setConferenceToDelete(undefined);
    }
  };
  
  const handleConferenceSaved = (savedConference: ConferenceWithUnion, isEdit: boolean) => {
    if (isEdit) {
      setConferences((prev) =>
        prev.map((conference) =>
          conference._id === savedConference._id ? savedConference : conference
        )
      );
      toast.success(
        'Conference updated',
        `${savedConference.name} has been successfully updated.`
      );
    } else {
      setConferences((prev) => [...prev, savedConference]);
      toast.success(
        'Conference created',
        `${savedConference.name} has been successfully created.`
      );
    }
    
    setShowCreateModal(false);
    setShowEditModal(false);
    setSelectedConference(undefined);
  };

  const getUnionName = (unionId: Union | string): string => {
    if (typeof unionId === 'object') {
      return unionId.name;
    }
    return unions.find(u => u._id === unionId)?.name || 'Unknown Union';
  };

  // Define table columns
  const columns: Column<ConferenceWithUnion>[] = [
    {
      key: 'name',
      header: 'Conference',
      accessor: (conference) => (
        <div className="flex items-center">
          <div className="shrink-0 h-12 w-12">
            {conference.primaryImage?.url ? (
              <div className="h-12 w-12 rounded-lg overflow-hidden bg-gray-100 shadow-sm">
                <Image
                  src={conference.primaryImage.thumbnailUrl || conference.primaryImage.url}
                  alt={conference.primaryImage.alt || conference.name}
                  width={96}
                  height={96}
                  className="h-full w-full object-cover"
                  style={{ imageRendering: 'auto' }}
                  priority={false}
                  quality={95}
                  onError={() => {
                    console.warn(`Failed to load image for conference: ${conference.name}`);
                  }}
                />
              </div>
            ) : (
              <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center shadow-sm">
                <BuildingOffice2Icon className="h-7 w-7 text-white" />
              </div>
            )}
          </div>
          <div className="ml-4">
            <button
              onClick={() => window.location.href = `/conferences/${conference._id}`}
              className="text-sm font-semibold text-gray-900 hover:text-gray-600 text-left cursor-pointer transition-colors duration-200"
            >
              {conference.name}
            </button>
          </div>
        </div>
      ),
    },
    {
      key: 'union',
      header: 'Union',
      accessor: (conference) => (
        <span className="text-sm text-gray-900">
          {getUnionName(conference.unionId)}
        </span>
      ),
      className: 'px-6 py-4 whitespace-nowrap text-sm max-w-xs',
    },
    {
      key: 'territory',
      header: 'Territory',
      accessor: (conference) => (
        <span className="text-sm text-gray-900">
          {conference.territory?.description || 'Not specified'}
        </span>
      ),
      className: 'px-6 py-4 whitespace-nowrap text-sm max-w-xs',
    },
    {
      key: 'contact',
      header: 'Contact',
      accessor: (conference) => (
        <div className="text-sm text-gray-900">
          {conference.contact?.email && (
            <div className="flex items-center mb-1">
              <EnvelopeIcon className="h-4 w-4 text-gray-400 mr-2" />
              {conference.contact.email}
            </div>
          )}
          {conference.contact?.phone && (
            <div className="flex items-center">
              <PhoneIcon className="h-4 w-4 text-gray-400 mr-2" />
              {conference.contact.phone}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      accessor: (conference) => (
        <StatusBadge
          status={conference.isActive}
          trueLabel="Active"
          falseLabel="Inactive"
          trueColor="green"
          falseColor="red"
        />
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      headerClassName:
        'px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider',
      className:
        'px-6 py-4 whitespace-nowrap text-right text-sm font-medium',
      accessor: (conference) => (
        <RowActionsMenu actions={[
          { label: 'Edit', onClick: () => { setSelectedConference(conference); setShowEditModal(true); } },
          { label: 'Delete', onClick: () => { setConferenceToDelete(conference); setShowDeleteConfirm(true); }, variant: 'danger' },
        ]} />
      ),
    },
  ];


  return (
    <AdminLayout
      title="Conferences"
      description="Manage regional divisions within unions"
    >
      <div className="space-y-6">
        {/* Table with custom header */}
        <div className="overflow-hidden">
          {/* Custom header with search and button */}
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="max-w-xs">
                  <input
                    type="text"
                    placeholder="Search conferences..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="block w-full px-4 py-2 rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-sm bg-white"
                  />
                </div>
                <div className="flex items-center">
                  <label className="inline-flex items-center">
                    <input
                      type="checkbox"
                      checked={showInactive}
                      onChange={(e) => setShowInactive(e.target.checked)}
                      className="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                    />
                    <span className="ml-2 text-sm text-gray-700">Show inactive</span>
                  </label>
                </div>
              </div>
              <PermissionGate permission="conferences.create">
                <Button
                  onClick={() => setShowCreateModal(true)}
                  className="whitespace-nowrap bg-orange-600 hover:bg-orange-700 text-white"
                  size="sm"
                >
                  Add Conference
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
            ) : filteredConferences.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <div className="mx-auto h-12 w-12 text-gray-400 mb-4">
                  <BuildingOffice2Icon />
                </div>
                <p className="text-sm text-gray-500">
                  No conferences found
                </p>
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
                  {filteredConferences.map((item) => (
                    <tr key={item?._id || Math.random()} className="transition-all duration-500 ease-out hover:scale-[1.01] hover:shadow-md hover:bg-gray-50 hover:z-10 relative">
                      {columns.map((column) => (
                        <td
                          key={column.key}
                          className={
                            column.className ||
                            'px-6 py-4 whitespace-nowrap text-sm'
                          }
                        >
                          {item ? column.accessor(item) : '-'}
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
        <ConferenceModal
          isOpen={showCreateModal || showEditModal}
          onClose={() => {
            setShowCreateModal(false);
            setShowEditModal(false);
            setSelectedConference(undefined);
          }}
          onSave={handleConferenceSaved}
          conference={showEditModal ? selectedConference : null}
          unions={unions}
        />

        {/* Delete Confirmation Modal */}
        <ConfirmationModal
          isOpen={showDeleteConfirm}
          onClose={() => {
            setShowDeleteConfirm(false);
            setConferenceToDelete(undefined);
          }}
          onConfirm={() =>
            conferenceToDelete && handleDeleteConference(conferenceToDelete)
          }
          title="Delete Conference"
          message={`Are you sure you want to delete "${conferenceToDelete?.name}"? This action cannot be undone.`}
          confirmLabel="Delete Conference"
          confirmButtonColor="red"
          icon={<TrashIcon className="h-6 w-6 text-red-600" />}
        />
      </div>
    </AdminLayout>
  );
}