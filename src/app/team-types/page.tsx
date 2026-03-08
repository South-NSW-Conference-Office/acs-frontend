'use client';

import React, { useState, useEffect, useCallback } from 'react';
import AdminLayout from '../../components/AdminLayout';
import { PermissionGate } from '@/components/PermissionGate';
import { Column, StatusBadge } from '@/components/DataTable';
import { RowActionsMenu } from '@/components/RowActionsMenu';
import Button from '@/components/Button';
import { Trash, Plus, Tag } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { teamTypeService, TeamType, CreateTeamTypeData } from '@/lib/teamTypes';
import { usePermissions } from '@/contexts/HierarchicalPermissionContext';
import { CreateTeamTypeModal } from '@/components/teamTypes/CreateTeamTypeModal';
import ConfirmationModal from '@/components/ConfirmationModal';

export default function TeamTypesPage() {
  const [teamTypes, setTeamTypes] = useState<TeamType[]>([]);
  const [loading, setLoading] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingTeamType, setEditingTeamType] = useState<TeamType | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [teamTypeToDelete, setTeamTypeToDelete] = useState<TeamType | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const { user } = usePermissions();

  const loadTeamTypes = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await teamTypeService.getUserTeamTypes(user.id, true, true);
      const teamTypesData = response.data || [];
      setTeamTypes(teamTypesData);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load team types';
      setTeamTypes([]);
      toast({
        title: 'Error Loading Team Types',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (user?.id) {
      loadTeamTypes();
    }
  }, [user?.id, loadTeamTypes]);

  const handleCreateTeamType = async (teamTypeData: CreateTeamTypeData) => {
    try {
      await teamTypeService.createTeamType(teamTypeData);
      toast({
        title: 'Success',
        description: 'Team type created successfully',
      });
      loadTeamTypes();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create team type';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
      throw error; // Re-throw so modal doesn't close
    }
  };

  const handleEditTeamType = (teamType: TeamType) => {
    setEditingTeamType(teamType);
    setEditModalOpen(true);
  };

  const handleUpdateTeamType = async (teamTypeData: CreateTeamTypeData) => {
    if (!editingTeamType) return;

    try {
      await teamTypeService.updateTeamType(editingTeamType._id, teamTypeData);
      toast({
        title: 'Success',
        description: 'Team type updated successfully',
      });
      loadTeamTypes();
      setEditModalOpen(false);
      setEditingTeamType(null);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update team type';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
      throw error; // Re-throw so modal doesn't close
    }
  };

  const handleDeleteTeamType = (teamType: TeamType) => {
    setTeamTypeToDelete(teamType);
    setDeleteModalOpen(true);
  };

  const confirmDeleteTeamType = async () => {
    if (!teamTypeToDelete) return;

    try {
      await teamTypeService.deleteTeamType(teamTypeToDelete._id);
      toast({
        title: 'Success',
        description: 'Team type deleted successfully',
      });
      loadTeamTypes();
      setDeleteModalOpen(false);
      setTeamTypeToDelete(null);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete team type';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  };

  const closeDeleteModal = () => {
    setDeleteModalOpen(false);
    setTeamTypeToDelete(null);
  };

  const filteredTeamTypes = teamTypes.filter(teamType =>
    teamType.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (teamType.description && teamType.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const columns: Column<TeamType>[] = [
    {
      key: 'name',
      header: 'Team Type',
      accessor: (teamType) => (
        <div className="flex items-center">
          <div className="flex-shrink-0 h-10 w-10">
            <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center text-lg">
              📋
            </div>
          </div>
          <div className="ml-4">
            <div className="text-sm font-medium text-gray-900">{teamType.name}</div>
            <div className="text-sm text-gray-500">
              {teamType.description || 'No description'}
            </div>
          </div>
        </div>
      )
    },
    {
      key: 'teams',
      header: 'Teams',
      accessor: (teamType) => {
        const count = teamType.teamCount ?? 0;
        return (
          <div className="text-sm text-gray-900">
            <span className="font-medium">{count}</span>
            <span className="text-gray-500"> {count === 1 ? 'team' : 'teams'}</span>
          </div>
        );
      }
    },
    {
      key: 'default',
      header: 'Default',
      accessor: (teamType) => (
        <StatusBadge
          status={teamType.isDefault}
          trueLabel="Default"
          falseLabel="Custom"
          trueColor="blue"
          falseColor="gray"
        />
      )
    },
    {
      key: 'status',
      header: 'Status',
      accessor: (teamType) => (
        <StatusBadge
          status={teamType.isActive}
          trueLabel="Active"
          falseLabel="Inactive"
          trueColor="green"
          falseColor="red"
        />
      )
    },
    {
      key: 'actions',
      header: 'Actions',
      headerClassName: 'px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider',
      className: 'px-6 py-4 whitespace-nowrap text-right text-sm font-medium',
      accessor: (teamType) => (
        <RowActionsMenu actions={[
          { label: 'Edit', onClick: () => handleEditTeamType(teamType) },
          { label: 'Delete', onClick: () => handleDeleteTeamType(teamType), variant: 'danger' },
        ]} />
      )
    }
  ];

  return (
    <AdminLayout title="Team Types" description="Manage team types for your organization">
      <div className="space-y-6">
        {/* Table with custom header */}
        <div className="overflow-hidden">
          {/* Custom header with search and button */}
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between gap-4">
              <div className="max-w-xs">
                <input
                  type="text"
                  placeholder="Search team types..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="block w-full px-4 py-2 rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-sm bg-white"
                />
              </div>
              <PermissionGate permission="team-types.create">
                <Button onClick={() => setCreateModalOpen(true)} className="whitespace-nowrap" size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Team Type
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
            ) : filteredTeamTypes.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <div className="mx-auto h-12 w-12 text-gray-400 mb-4">
                  <Tag className="h-12 w-12" />
                </div>
                <p className="text-sm text-gray-500">No team types found</p>
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
                  {filteredTeamTypes.map((teamType) => (
                    <tr key={teamType._id} className="transition-all duration-500 ease-out hover:scale-[1.01] hover:shadow-md hover:bg-gray-50 hover:z-10 relative">
                      {columns.map((column) => (
                        <td
                          key={column.key}
                          className={column.className || 'px-6 py-4 whitespace-nowrap text-sm'}
                        >
                          {column.accessor(teamType)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <CreateTeamTypeModal
          open={createModalOpen}
          onOpenChange={setCreateModalOpen}
          onSubmit={handleCreateTeamType}
        />

        <CreateTeamTypeModal
          open={editModalOpen}
          onOpenChange={(open) => {
            setEditModalOpen(open);
            if (!open) {
              setEditingTeamType(null);
            }
          }}
          onSubmit={handleUpdateTeamType}
          editTeamType={editingTeamType}
          mode="edit"
        />

        <ConfirmationModal
          isOpen={deleteModalOpen}
          onClose={closeDeleteModal}
          onConfirm={confirmDeleteTeamType}
          title="Delete Team Type"
          message={`Are you sure you want to delete "${teamTypeToDelete?.name}"? This action cannot be undone and may affect teams using this type.`}
          confirmLabel="Delete Team Type"
          cancelLabel="Cancel"
          confirmButtonColor="red"
          icon={<Trash className="h-6 w-6 text-red-600" />}
        />
      </div>
    </AdminLayout>
  );
}