'use client';

import React, { useState, useEffect, useCallback } from 'react';
import AdminLayout from '../../components/AdminLayout';
import { PermissionGate } from '@/components/PermissionGate';
import Button from '@/components/Button';
import TestimonyModal from '@/components/TestimonyModal';
import ConfirmationModal from '@/components/ConfirmationModal';
import { useToast } from '@/contexts/ToastContext';
import {
  testimoniesAPI,
  TestimonyListItem,
  TestimonyStats,
} from '@/lib/testimoniesAPI';
import { RowActionsMenu } from '@/components/RowActionsMenu';
import { ChatBubbleLeftIcon, MagnifyingGlassIcon, XCircleIcon } from '@heroicons/react/24/outline';
import { TrashIcon } from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';

type TestimonyStatus = 'all' | 'draft' | 'pending' | 'approved' | 'rejected';

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800',
  pending: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
};

export default function Testimonies() {
  const [testimonies, setTestimonies] = useState<TestimonyListItem[]>([]);
  const [stats, setStats] = useState<TestimonyStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<TestimonyStatus>('all');
  const [selectedTestimony, setSelectedTestimony] =
    useState<TestimonyListItem | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [testimonyToDelete, setTestimonyToDelete] =
    useState<TestimonyListItem | null>(null);
  const [testimonyToReject, setTestimonyToReject] =
    useState<TestimonyListItem | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const { error: showErrorToast, success: showSuccessToast } = useToast();

  const fetchTestimonies = useCallback(async () => {
    try {
      setLoading(true);
      const filters = {
        search: searchQuery || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
      };
      const response = await testimoniesAPI.getAllTestimonies(filters);
      setTestimonies(response.testimonies);
    } catch (error) {
      console.error('Failed to fetch testimonies:', error);
      showErrorToast(
        'Failed to load testimonies',
        error instanceof Error ? error.message : 'Unknown error'
      );
    } finally {
      setLoading(false);
    }
  }, [searchQuery, statusFilter, showErrorToast]);

  const fetchStats = useCallback(async () => {
    try {
      const response = await testimoniesAPI.getStats();
      setStats(response.stats);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  }, []);

  useEffect(() => {
    fetchTestimonies();
  }, [fetchTestimonies]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const handleTestimonySaved = () => {
    setShowCreateModal(false);
    setShowEditModal(false);
    setSelectedTestimony(null);
    fetchTestimonies();
    fetchStats();
  };

  const handleDeleteTestimony = async () => {
    if (!testimonyToDelete) return;

    try {
      await testimoniesAPI.deleteTestimony(testimonyToDelete._id);
      showSuccessToast('Testimony deleted successfully');
      setShowDeleteConfirm(false);
      setTestimonyToDelete(null);
      fetchTestimonies();
      fetchStats();
    } catch (error) {
      console.error('Failed to delete testimony:', error);
      showErrorToast(
        'Failed to delete testimony',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  };

  const handleSubmitForApproval = async (testimony: TestimonyListItem) => {
    try {
      await testimoniesAPI.submitForApproval(testimony._id);
      showSuccessToast('Testimony submitted for approval');
      fetchTestimonies();
      fetchStats();
    } catch (error) {
      console.error('Failed to submit testimony:', error);
      showErrorToast(
        'Failed to submit testimony',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  };

  const handleApprove = async (testimony: TestimonyListItem) => {
    try {
      await testimoniesAPI.approveTestimony(testimony._id);
      showSuccessToast('Testimony approved');
      fetchTestimonies();
      fetchStats();
    } catch (error) {
      console.error('Failed to approve testimony:', error);
      showErrorToast(
        'Failed to approve testimony',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  };

  const handleReject = async () => {
    if (!testimonyToReject) return;

    try {
      await testimoniesAPI.rejectTestimony(
        testimonyToReject._id,
        rejectReason || undefined
      );
      showSuccessToast('Testimony rejected');
      setShowRejectModal(false);
      setTestimonyToReject(null);
      setRejectReason('');
      fetchTestimonies();
      fetchStats();
    } catch (error) {
      console.error('Failed to reject testimony:', error);
      showErrorToast(
        'Failed to reject testimony',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  };

  const handleToggleFeatured = async (testimony: TestimonyListItem) => {
    try {
      await testimoniesAPI.toggleFeatured(testimony._id, !testimony.isFeatured);
      showSuccessToast(
        testimony.isFeatured
          ? 'Removed from featured'
          : 'Added to featured testimonies'
      );
      fetchTestimonies();
      fetchStats();
    } catch (error) {
      console.error('Failed to toggle featured:', error);
      showErrorToast(
        'Failed to update featured status',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  };

  const getStatusBadge = (status: string): React.ReactElement => (
    <span
      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${STATUS_COLORS[status] || STATUS_COLORS.draft}`}
    >
      {status}
    </span>
  );

  const truncateText = (text: string, maxLength: number): string =>
    text.length <= maxLength ? text : `${text.substring(0, maxLength)}...`;

  const formatDate = (dateString: string): string =>
    new Date(dateString).toLocaleDateString('en-AU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

  const columns = [
    {
      key: 'person',
      header: 'Person',
      accessor: (testimony: TestimonyListItem) => (
        <div className="flex items-center space-x-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={testimony.image.url}
            alt={testimony.image.alt || testimony.name}
            className="h-10 w-10 rounded-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src =
                'https://via.placeholder.com/40?text=?';
            }}
          />
          <div className="min-w-0">
            <p className="font-medium text-gray-900 truncate">{testimony.name}</p>
            <p className="text-sm text-gray-500 truncate">{testimony.location}</p>
          </div>
        </div>
      ),
      className: 'px-6 py-4',
    },
    {
      key: 'review',
      header: 'Testimonial',
      accessor: (testimony: TestimonyListItem) => (
        <p className="text-sm text-gray-600 max-w-xs">
          {truncateText(testimony.review, 100)}
        </p>
      ),
      className: 'px-6 py-4',
    },
    {
      key: 'status',
      header: 'Status',
      accessor: (testimony: TestimonyListItem) => (
        <div className="flex items-center space-x-2">
          {getStatusBadge(testimony.status)}
          {testimony.isFeatured && testimony.status === 'approved' && (
            <StarIconSolid className="h-4 w-4 text-yellow-500" title="Featured" />
          )}
        </div>
      ),
      className: 'px-6 py-4',
    },
    {
      key: 'date',
      header: 'Created',
      accessor: (testimony: TestimonyListItem) => (
        <div>
          <p className="text-sm text-gray-900">{formatDate(testimony.createdAt)}</p>
          {testimony.approvedAt && (
            <p className="text-xs text-gray-500">
              Approved: {formatDate(testimony.approvedAt)}
            </p>
          )}
        </div>
      ),
      className: 'px-6 py-4',
    },
    {
      key: 'actions',
      header: 'Actions',
      accessor: (testimony: TestimonyListItem) => (
        <RowActionsMenu actions={[
          { label: 'Edit', onClick: () => { setSelectedTestimony(testimony); setShowEditModal(true); } },
          { label: 'Submit for Approval', onClick: () => handleSubmitForApproval(testimony), hidden: testimony.status !== 'draft' },
          { label: 'Approve', onClick: () => handleApprove(testimony), hidden: testimony.status !== 'pending' },
          { label: 'Reject', onClick: () => { setTestimonyToReject(testimony); setShowRejectModal(true); }, hidden: testimony.status !== 'pending', variant: 'danger' },
          { label: testimony.isFeatured ? 'Remove from Featured' : 'Add to Featured', onClick: () => handleToggleFeatured(testimony), hidden: testimony.status !== 'approved' },
          { label: 'Delete', onClick: () => { setTestimonyToDelete(testimony); setShowDeleteConfirm(true); }, variant: 'danger' },
        ]} />
      ),
      className: 'px-6 py-4',
    },
  ];

  const filteredTestimonies = testimonies.filter(
    (testimony) =>
      testimony.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      testimony.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      testimony.review.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AdminLayout
      title="Testimonies"
      description="Manage testimonies displayed on the homepage"
    >
      <div className="space-y-6">
        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="bg-white rounded-lg shadow px-4 py-3">
              <p className="text-sm text-gray-500">Total</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.total}</p>
            </div>
            <div className="bg-white rounded-lg shadow px-4 py-3">
              <p className="text-sm text-gray-500">Draft</p>
              <p className="text-2xl font-semibold text-gray-600">{stats.draft}</p>
            </div>
            <div className="bg-white rounded-lg shadow px-4 py-3">
              <p className="text-sm text-yellow-600">Pending</p>
              <p className="text-2xl font-semibold text-yellow-600">
                {stats.pending}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow px-4 py-3">
              <p className="text-sm text-green-600">Approved</p>
              <p className="text-2xl font-semibold text-green-600">
                {stats.approved}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow px-4 py-3">
              <p className="text-sm text-red-600">Rejected</p>
              <p className="text-2xl font-semibold text-red-600">
                {stats.rejected}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow px-4 py-3">
              <p className="text-sm text-yellow-500">Featured</p>
              <p className="text-2xl font-semibold text-yellow-500">
                {stats.featured}
              </p>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          {/* Header with search, filters and button */}
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search testimonies..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 block w-full sm:w-64 px-4 py-2 rounded-md border-gray-300 shadow-sm focus:ring-[#F5821F] focus:border-[#F5821F] text-sm bg-white"
                  />
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) =>
                    setStatusFilter(e.target.value as TestimonyStatus)
                  }
                  className="block w-full sm:w-40 px-4 py-2 rounded-md border-gray-300 shadow-sm focus:ring-[#F5821F] focus:border-[#F5821F] text-sm bg-white"
                >
                  <option value="all">All Status</option>
                  <option value="draft">Draft</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
              <PermissionGate permission="testimonies.manage">
                <Button
                  onClick={() => setShowCreateModal(true)}
                  className="whitespace-nowrap"
                  size="sm"
                >
                  Add Testimony
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
            ) : filteredTestimonies.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <div className="mx-auto h-12 w-12 text-gray-400 mb-4">
                  <ChatBubbleLeftIcon />
                </div>
                <p className="text-sm text-gray-500">
                  {testimonies.length === 0
                    ? 'No testimonies found'
                    : 'No matches for your search'}
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
                  {filteredTestimonies.map((testimony) => (
                    <tr key={testimony._id} className="transition-all duration-500 ease-out hover:scale-[1.01] hover:shadow-md hover:bg-gray-50 hover:z-10 relative">
                      {columns.map((column) => (
                        <td
                          key={`${testimony._id}-${column.key}`}
                          className={`${column.className} whitespace-nowrap text-sm text-gray-900`}
                        >
                          {column.accessor(testimony)}
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

      {/* Create Testimony Modal */}
      {showCreateModal && (
        <TestimonyModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onTestimonySaved={handleTestimonySaved}
        />
      )}

      {/* Edit Testimony Modal */}
      {showEditModal && selectedTestimony && (
        <TestimonyModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setSelectedTestimony(null);
          }}
          onTestimonySaved={handleTestimonySaved}
          testimony={selectedTestimony}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && testimonyToDelete && (
        <ConfirmationModal
          isOpen={showDeleteConfirm}
          onClose={() => {
            setShowDeleteConfirm(false);
            setTestimonyToDelete(null);
          }}
          onConfirm={handleDeleteTestimony}
          title="Delete Testimony"
          message={`Are you sure you want to delete the testimony from "${testimonyToDelete.name}"? This action cannot be undone.`}
          confirmLabel="Delete Testimony"
          confirmButtonColor="red"
          icon={<TrashIcon className="h-6 w-6 text-red-600" />}
        />
      )}

      {/* Reject Confirmation Modal */}
      {showRejectModal && testimonyToReject && (
        <ConfirmationModal
          isOpen={showRejectModal}
          onClose={() => {
            setShowRejectModal(false);
            setTestimonyToReject(null);
            setRejectReason('');
          }}
          onConfirm={handleReject}
          title="Reject Testimony"
          message={
            <div className="space-y-4">
              <p>
                Are you sure you want to reject the testimony from &quot;
                {testimonyToReject.name}&quot;?
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rejection Reason (optional)
                </label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="Enter reason for rejection..."
                />
              </div>
            </div>
          }
          confirmLabel="Reject Testimony"
          confirmButtonColor="red"
          icon={<XCircleIcon className="h-6 w-6 text-red-600" />}
        />
      )}
    </AdminLayout>
  );
}
