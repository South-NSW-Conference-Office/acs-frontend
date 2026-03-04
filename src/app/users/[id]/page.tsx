'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { ArrowLeftIcon, PencilIcon, UserIcon, MapPinIcon, PhoneIcon, EnvelopeIcon } from '@heroicons/react/24/outline';
import { useToast } from '@/contexts/ToastContext';
import { PermissionGate } from '@/components/PermissionGate';
import { rbacService } from '@/lib/rbac';
import { User } from '@/types/rbac';
import UserModal from '@/components/UserModal';
import { StatusBadge } from '@/components/DataTable';
import AdminLayout from '@/components/AdminLayout';

export default function UserDetails() {
  const params = useParams();
  const router = useRouter();
  const userId = params?.id as string;
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const toast = useToast();

  const fetchUserDetails = useCallback(async () => {
    try {
      setLoading(true);
      // Fetch a single user by ID via the dedicated backend endpoint.
      // This avoids fetching all users and filtering client-side (IDOR risk),
      // and the backend enforces authorization checks (canAccessUser).
      const apiUser = await rbacService.getUserById(userId);

      // Map the API response to the User type
      const mappedUser: User = {
        ...apiUser,
        _id: apiUser._id,
        id: apiUser.id || apiUser._id,
        verified: apiUser.verified || false,
        phone: apiUser.phone || '',
        address: apiUser.address || '',
        city: apiUser.city || '',
        state: apiUser.state || '',
        country: apiUser.country || '',
        avatar: typeof apiUser.avatar === 'string' ? apiUser.avatar : apiUser.avatar?.url || '',
        createdAt: apiUser.createdAt || new Date().toISOString(),
        updatedAt: apiUser.updatedAt || new Date().toISOString()
      };
      setUser(mappedUser);
    } catch (error) {
      console.error('Error fetching user details:', error);
      const message = error instanceof Error ? error.message : 'Failed to load user details.';
      toast.error('Error loading user', message);
      router.push('/users');
    } finally {
      setLoading(false);
    }
  }, [userId, toast, router]);

  useEffect(() => {
    fetchUserDetails();
  }, [fetchUserDetails]);

  const handleUserSaved = (savedUser: User, isEdit: boolean) => {
    if (isEdit) {
      setUser(savedUser);
      toast.success('User updated', `${savedUser.name} has been successfully updated.`);
    }
    setShowEditModal(false);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-AU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-[#F5821F]"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <AdminLayout 
      title={user.name}
      description="User details and information"
    >
      {/* Header Actions */}
      <div className="flex items-center justify-between mb-8">
        <button
          onClick={() => router.push('/users')}
          className="flex items-center text-gray-600 hover:text-gray-900"
        >
          <ArrowLeftIcon className="h-5 w-5 mr-2" />
          Back to Users
        </button>
        <PermissionGate permission="users.update">
          <button
            onClick={() => setShowEditModal(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-[#F5821F] hover:bg-[#e0741c]"
          >
            <PencilIcon className="h-4 w-4 mr-2" />
            Edit User
          </button>
        </PermissionGate>
      </div>

      {/* Content */}
      <div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Profile Section */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow px-6 py-6">
              <div className="text-center">
                {/* Profile Picture */}
                <div className="mx-auto h-32 w-32 rounded-full bg-gray-200 flex items-center justify-center mb-4">
                  {user.avatar ? (
                    <Image
                      src={user.avatar}
                      alt={user.name}
                      width={128}
                      height={128}
                      className="h-32 w-32 rounded-full object-cover"
                    />
                  ) : (
                    <UserIcon className="h-16 w-16 text-gray-400" />
                  )}
                </div>
                
                <h2 className="text-xl font-bold text-gray-900 mb-2">{user.name}</h2>
                <p className="text-gray-600 mb-4">{user.email}</p>
                
                {/* Verification Status */}
                <div className="flex justify-center mb-6">
                  <StatusBadge
                    status={user.verified}
                    trueLabel="Verified"
                    falseLabel="Unverified"
                    trueColor="green"
                    falseColor="yellow"
                  />
                </div>

                {/* Quick Contact */}
                <div className="space-y-3">
                  {user.phone && (
                    <div className="flex items-center justify-center text-gray-600">
                      <PhoneIcon className="h-4 w-4 mr-2" />
                      <span>{user.phone}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-center text-gray-600">
                    <EnvelopeIcon className="h-4 w-4 mr-2" />
                    <span>{user.email}</span>
                  </div>
                  {(user.city || user.state || user.country) && (
                    <div className="flex items-center justify-center text-gray-600">
                      <MapPinIcon className="h-4 w-4 mr-2" />
                      <span>
                        {[user.city, user.state, user.country].filter(Boolean).join(', ')}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Details Section */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Personal Information */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Personal Information</h3>
              </div>
              <div className="px-6 py-4">
                <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Full Name</dt>
                    <dd className="mt-1 text-sm text-gray-900">{user.name}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Email Address</dt>
                    <dd className="mt-1 text-sm text-gray-900">{user.email}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Phone Number</dt>
                    <dd className="mt-1 text-sm text-gray-900">{user.phone || 'Not provided'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Verification Status</dt>
                    <dd className="mt-1">
                      <StatusBadge
                        status={user.verified}
                        trueLabel="Verified"
                        falseLabel="Unverified"
                        trueColor="green"
                        falseColor="yellow"
                      />
                    </dd>
                  </div>
                </dl>
              </div>
            </div>

            {/* Address Information */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Address Information</h3>
              </div>
              <div className="px-6 py-4">
                <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <dt className="text-sm font-medium text-gray-500">Street Address</dt>
                    <dd className="mt-1 text-sm text-gray-900">{user.address || 'Not provided'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">City</dt>
                    <dd className="mt-1 text-sm text-gray-900">{user.city || 'Not provided'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">State/Province</dt>
                    <dd className="mt-1 text-sm text-gray-900">{user.state || 'Not provided'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Country</dt>
                    <dd className="mt-1 text-sm text-gray-900">{user.country || 'Australia'}</dd>
                  </div>
                </dl>
              </div>
            </div>

            {/* Organization & Roles */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Organization & Roles</h3>
              </div>
              <div className="px-6 py-4">
                {(user.unionAssignments?.length || user.conferenceAssignments?.length || user.churchAssignments?.length) ? (
                  <div className="space-y-4">
                    {/* Union Assignments */}
                    {user.unionAssignments?.map((assignment, index) => (
                      <div key={`union-${index}`} className="border border-gray-200 rounded-lg p-4">
                        <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
                          <div>
                            <dt className="text-sm font-medium text-gray-500">Union</dt>
                            <dd className="mt-1 text-sm text-gray-900">
                              {typeof assignment.union === 'object' 
                                ? assignment.union.name 
                                : 'Unknown Union'}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-sm font-medium text-gray-500">Role</dt>
                            <dd className="mt-1 text-sm text-gray-900">
                              {typeof assignment.role === 'object'
                                ? assignment.role.displayName || assignment.role.name
                                : 'Unknown Role'}
                            </dd>
                          </div>
                        </div>
                      </div>
                    ))}
                    {/* Conference Assignments */}
                    {user.conferenceAssignments?.map((assignment, index) => (
                      <div key={`conference-${index}`} className="border border-gray-200 rounded-lg p-4">
                        <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
                          <div>
                            <dt className="text-sm font-medium text-gray-500">Conference</dt>
                            <dd className="mt-1 text-sm text-gray-900">
                              {typeof assignment.conference === 'object' 
                                ? assignment.conference.name 
                                : 'Unknown Conference'}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-sm font-medium text-gray-500">Role</dt>
                            <dd className="mt-1 text-sm text-gray-900">
                              {typeof assignment.role === 'object'
                                ? assignment.role.displayName || assignment.role.name
                                : 'Unknown Role'}
                            </dd>
                          </div>
                        </div>
                      </div>
                    ))}
                    {/* Church Assignments */}
                    {user.churchAssignments?.map((assignment, index) => (
                      <div key={`church-${index}`} className="border border-gray-200 rounded-lg p-4">
                        <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
                          <div>
                            <dt className="text-sm font-medium text-gray-500">Church</dt>
                            <dd className="mt-1 text-sm text-gray-900">
                              {typeof assignment.church === 'object' 
                                ? assignment.church.name 
                                : 'Unknown Church'}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-sm font-medium text-gray-500">Role</dt>
                            <dd className="mt-1 text-sm text-gray-900">
                              {typeof assignment.role === 'object'
                                ? assignment.role.displayName || assignment.role.name
                                : 'Unknown Role'}
                            </dd>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No organization assignments</p>
                )}
              </div>
            </div>

            {/* Account Information */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Account Information</h3>
              </div>
              <div className="px-6 py-4">
                <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Created</dt>
                    <dd className="mt-1 text-sm text-gray-900">{formatDate(user.createdAt)}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Last Updated</dt>
                    <dd className="mt-1 text-sm text-gray-900">{formatDate(user.updatedAt)}</dd>
                  </div>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {showEditModal && (
        <UserModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          onSave={handleUserSaved}
          user={user}
        />
      )}
    </AdminLayout>
  );
}