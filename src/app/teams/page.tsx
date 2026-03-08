'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import AdminLayout from '../../components/AdminLayout';
import { PermissionGate } from '@/components/PermissionGate';
import { Column, StatusBadge } from '@/components/DataTable';
import { RowActionsMenu } from '@/components/RowActionsMenu';
import Button from '@/components/Button';
import { Users, UserPlus, Trash } from 'lucide-react';
import { useToast } from '@/contexts/ToastContext';
import { teamService, Team } from '@/lib/teams';
import { TeamType, teamTypeService } from '@/lib/teamTypes';
import { teamImageService } from '@/lib/teamImageService';
import { MediaFile } from '@/lib/mediaService';
import { usePermissions } from '@/contexts/HierarchicalPermissionContext';
import { CreateTeamModal } from '@/components/teams/CreateTeamModal';
import { TeamMembersModal } from '@/components/teams/TeamMembersModal';
import { useSuperAdmin } from '@/hooks/useSuperAdmin';
import ConfirmationModal from '@/components/ConfirmationModal';

export default function TeamsPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [membersModalOpen, setMembersModalOpen] = useState(false);
  const [selectedTeam] = useState<Team | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [teamToDelete, setTeamToDelete] = useState<Team | null>(null);
  const [teamTypes, setTeamTypes] = useState<TeamType[]>([]);
  const router = useRouter();
  const { user } = usePermissions();
  const { isSuperAdmin } = useSuperAdmin();
  const { error: showErrorToast, success: showSuccessToast } = useToast();

  const loadTeams = useCallback(async () => {
    try {
      setLoading(true);
      let response;
      
      if (isSuperAdmin) {
        // Super admin views all teams from MongoDB collection across all hierarchies
        response = await teamService.getAllTeams();
      } else {
        // Regular user - get teams accessible to user via hierarchy
        response = await teamService.getAllTeams(); // This endpoint filters by user permissions
      }
      
      const teamsData = response.data || [];
      setTeams(teamsData);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load teams';
      setTeams([]);
      
      // Provide more specific error handling for hierarchy access issues
      if (errorMessage.includes('No hierarchy access found')) {
        showErrorToast('Access Denied', 'You do not have proper hierarchy access to view teams. Please contact your administrator to assign you to an organization.');
      } else {
        showErrorToast('Error Loading Teams', errorMessage);
      }
    } finally {
      setLoading(false);
    }
  }, [isSuperAdmin, showErrorToast]);

  const loadTeamTypes = useCallback(async () => {
    if (!user?.id) {
      setTeamTypes([]);
      return;
    }
    
    try {
      const response = await teamTypeService.getUserTeamTypes(user.id, true, false);
      setTeamTypes(response.data || []);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load team types';
      console.error('Error loading team types:', errorMessage);
      setTeamTypes([]);
    }
  }, [user?.id]);


  useEffect(() => {
    loadTeams();
    loadTeamTypes();
  }, [loadTeams, loadTeamTypes]);

  const handleEditTeam = (team: Team) => {
    setEditingTeam(team);
    setEditModalOpen(true);
  };

  const handleUpdateTeam = async (teamData: {
    name: string;
    type: string;
    description?: string;
    location?: string;
    churchId?: string;
    bannerImage?: File | null;
    bannerMediaFile?: MediaFile | null;
    bannerAlt?: string;
    profileImage?: File | null;
    profileMediaFile?: MediaFile | null;
    profileAlt?: string;
  }) => {
    if (!editingTeam) return;
    
    try {
      // Update the team first
      await teamService.updateTeam(editingTeam._id, {
        name: teamData.name,
        type: teamData.type,
        description: teamData.description,
        location: teamData.location,
      });

      // Handle image updates similar to create
      // Handle banner image
      if (teamData.bannerImage || teamData.bannerMediaFile) {
        try {
          if (teamData.bannerImage) {
            await teamImageService.uploadBanner(
              editingTeam._id, 
              teamData.bannerImage, 
              teamData.bannerAlt || `${teamData.name} banner`
            );
          } else if (teamData.bannerMediaFile) {
            if (!teamData.bannerMediaFile._id) {
              throw new Error('Selected media file has no ID');
            }
            await teamImageService.setBannerFromMediaFile(
              editingTeam._id,
              teamData.bannerMediaFile._id,
              teamData.bannerAlt || `${teamData.name} banner`
            );
          }
        } catch (err) {
          console.error('Failed to update banner:', err);
          const errorMessage = err instanceof Error ? err.message : 'Unknown error';
          showErrorToast('Warning', `Team updated but banner upload failed: ${errorMessage}`);
        }
      }
      
      // Handle profile photo
      if (teamData.profileImage || teamData.profileMediaFile) {
        try {
          if (teamData.profileImage) {
            await teamImageService.uploadProfilePhoto(
              editingTeam._id, 
              teamData.profileImage, 
              teamData.profileAlt || `${teamData.name} profile photo`
            );
          } else if (teamData.profileMediaFile) {
            if (!teamData.profileMediaFile._id) {
              throw new Error('Selected media file has no ID');
            }
            await teamImageService.setProfilePhotoFromMediaFile(
              editingTeam._id,
              teamData.profileMediaFile._id,
              teamData.profileAlt || `${teamData.name} profile photo`
            );
          }
        } catch (err) {
          console.error('Failed to update profile photo:', err);
          const errorMessage = err instanceof Error ? err.message : 'Unknown error';
          showErrorToast('Warning', `Team updated but profile photo upload failed: ${errorMessage}`);
        }
      }
      
      showSuccessToast('Success', 'Team updated successfully');
      loadTeams();
      setEditModalOpen(false);
      setEditingTeam(null);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update team';
      showErrorToast('Error', errorMessage);
    }
  };

  const handleCreateTeam = async (teamData: {
    name: string;
    type: string;
    description?: string;
    location?: string;
    churchId?: string;
    bannerImage?: File | null;
    bannerMediaFile?: MediaFile | null;
    bannerAlt?: string;
    profileImage?: File | null;
    profileMediaFile?: MediaFile | null;
    profileAlt?: string;
  }) => {
    try {
      // Create the team first
      const response = await teamService.createTeam({
        name: teamData.name,
        type: teamData.type,
        description: teamData.description,
        location: teamData.location,
        churchId: teamData.churchId || '' // Use selected church or let backend determine
      });

      const createdTeam = response.data;
      
      // Handle banner image - following church pattern
      if (teamData.bannerImage || teamData.bannerMediaFile) {
        try {
          if (teamData.bannerImage) {
            // Upload new file
            await teamImageService.uploadBanner(
              createdTeam._id, 
              teamData.bannerImage, 
              teamData.bannerAlt || `${teamData.name} banner`
            );
          } else if (teamData.bannerMediaFile) {
            // Set from existing media file
            if (!teamData.bannerMediaFile._id) {
              throw new Error('Selected media file has no ID');
            }
            await teamImageService.setBannerFromMediaFile(
              createdTeam._id,
              teamData.bannerMediaFile._id,
              teamData.bannerAlt || `${teamData.name} banner`
            );
          }
        } catch (err) {
          console.error('Failed to set banner:', err);
          const errorMessage = err instanceof Error ? err.message : 'Unknown error';
          showErrorToast('Warning', `Team created but banner upload failed: ${errorMessage}`);
        }
      }
      
      // Handle profile photo - following church pattern
      if (teamData.profileImage || teamData.profileMediaFile) {
        try {
          if (teamData.profileImage) {
            // Upload new file
            await teamImageService.uploadProfilePhoto(
              createdTeam._id, 
              teamData.profileImage, 
              teamData.profileAlt || `${teamData.name} profile photo`
            );
          } else if (teamData.profileMediaFile) {
            // Set from existing media file
            if (!teamData.profileMediaFile._id) {
              throw new Error('Selected media file has no ID');
            }
            await teamImageService.setProfilePhotoFromMediaFile(
              createdTeam._id,
              teamData.profileMediaFile._id,
              teamData.profileAlt || `${teamData.name} profile photo`
            );
          }
        } catch (err) {
          console.error('Failed to set profile photo:', err);
          const errorMessage = err instanceof Error ? err.message : 'Unknown error';
          showErrorToast('Warning', `Team created but profile photo upload failed: ${errorMessage}`);
        }
      }
      
      showSuccessToast('Success', 'Team created successfully');
      loadTeams();
      setCreateModalOpen(false);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create team';
      showErrorToast('Error', errorMessage);
    }
  };

  const handleDeleteTeam = (team: Team) => {
    setTeamToDelete(team);
    setDeleteModalOpen(true);
  };

  const confirmDeleteTeam = async () => {
    if (!teamToDelete) return;

    try {
      await teamService.deleteTeam(teamToDelete._id);
      showSuccessToast('Success', 'Team deleted successfully');
      loadTeams();
      setDeleteModalOpen(false);
      setTeamToDelete(null);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete team';
      showErrorToast('Error', errorMessage);
    }
  };

  const closeDeleteModal = () => {
    setDeleteModalOpen(false);
    setTeamToDelete(null);
  };

  const getTeamTypeData = (typeName: string | undefined) => {
    if (!typeName) {
      return {
        name: 'No Type',
        icon: '👥',
        colorClass: 'bg-gray-100 text-gray-800',
        description: 'No type specified'
      };
    }
    
    // Look for team type that matches either the type or category field
    const teamType = teamTypes.find(t => t.name === typeName);
    if (teamType) {
      return {
        name: teamType.name,
        icon: '👥',
        colorClass: teamType.isActive ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800',
        description: teamType.description || ''
      };
    }
    
    // Fall back to the legacy type names if no team type found
    return {
      name: typeName,
      icon: '👥',
      colorClass: 'bg-gray-100 text-gray-800',
      description: 'Legacy type'
    };
  };

  const filteredTeams = teams.filter(team => {
    const query = searchQuery.toLowerCase();
    const teamTypeName = team.category || team.type;
    const typeData = getTeamTypeData(teamTypeName);
    
    return team.name.toLowerCase().includes(query) ||
           (teamTypeName && teamTypeName.toLowerCase().includes(query)) ||
           typeData.name.toLowerCase().includes(query) ||
           (typeData.description && typeData.description.toLowerCase().includes(query));
  });

  const columns: Column<Team>[] = [
    {
      key: 'name',
      header: 'Team',
      accessor: (team) => {
        const typeData = getTeamTypeData(team.type);
        return (
          <div className="flex items-center">
            <div className="flex-shrink-0 h-10 w-10">
              {team.profilePhoto?.url ? (
                <Image
                  src={team.profilePhoto.url}
                  alt={team.profilePhoto.alt || `${team.name} profile`}
                  width={40}
                  height={40}
                  className="h-10 w-10 rounded-full object-cover"
                />
              ) : (
                <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center text-lg">
                  {typeData.icon}
                </div>
              )}
            </div>
            <div className="ml-4">
              <div className="text-sm font-medium text-gray-900">{team.name}</div>
              <div className="text-sm text-gray-500">
                {team.description || typeData.description || 'No description'}
              </div>
              {team.location && (
                <div className="text-xs text-gray-400 mt-1">
                  📍 {team.location}
                </div>
              )}
            </div>
          </div>
        );
      }
    },
    {
      key: 'type',
      header: 'Type',
      accessor: (team) => {
        // Use category field first, then fall back to type field
        const teamTypeName = team.category || team.type;
        const typeData = getTeamTypeData(teamTypeName);
        return (
          <span 
            className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${typeData.colorClass}`}
            title={typeData.description}
          >
            {typeData.name}
          </span>
        );
      }
    },
    // Church information for teams
    ...(isSuperAdmin ? [{
      key: 'church' as keyof Team,
      header: 'Church',
      accessor: (team: Team) => (
        <span className="text-sm text-gray-900">
          {typeof team.churchId === 'object' && team.churchId?.name ? team.churchId.name : 'Church'}
        </span>
      )
    }] : []),
    {
      key: 'members',
      header: 'Members',
      accessor: (team) => (
        <div className="text-sm text-gray-900">
          <span className="font-medium">{team.memberCount || 0}</span>
        </div>
      )
    },
    // Add Created By column for super admin
    ...(isSuperAdmin ? [{
      key: 'createdBy' as keyof Team,
      header: 'Created By',
      accessor: (team: Team) => (
        <span className="text-sm text-gray-900">
          {team.createdBy?.name || team.createdBy?.email || 'System Admin'}
        </span>
      )
    }] : []),
    {
      key: 'status',
      header: 'Status',
      accessor: (team) => (
        <StatusBadge
          status={team.isActive}
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
      accessor: (team) => (
        <RowActionsMenu actions={[
          { label: 'View Details', onClick: () => router.push(`/teams/${team._id}`) },
          { label: 'Edit', onClick: () => handleEditTeam(team) },
          { label: 'Delete', onClick: () => handleDeleteTeam(team), variant: 'danger' },
        ]} />
      )
    }
  ];


  // Remove entity requirement check since teams are loaded via hierarchy

  const description = isSuperAdmin 
    ? "Manage teams across all hierarchies"
    : "Manage teams accessible to you";

  return (
    <AdminLayout 
      title="Teams" 
      description={description}
    >
        <div className="space-y-6">
          {/* Table with custom header */}
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            {/* Custom header with search and button */}
            <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="max-w-xs">
                  <input
                    type="text"
                    placeholder="Search teams..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="block w-full px-4 py-2 rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-sm bg-white"
                  />
                </div>
              </div>
              <PermissionGate permission="teams.create">
                <Button onClick={() => setCreateModalOpen(true)} className="whitespace-nowrap" size="sm">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Create Team
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
            ) : filteredTeams.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <div className="mx-auto h-12 w-12 text-gray-400 mb-4">
                  <Users className="h-12 w-12" />
                </div>
                <p className="text-sm text-gray-500">No teams found</p>
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
                  {filteredTeams.map((team) => (
                    <tr key={team._id} className="transition-all duration-500 ease-out hover:scale-[1.01] hover:shadow-md hover:bg-gray-50 hover:z-10 relative">
                      {columns.map((column) => (
                        <td
                          key={column.key}
                          className={column.className || 'px-6 py-4 whitespace-nowrap text-sm'}
                        >
                          {column.accessor(team)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <CreateTeamModal
          open={createModalOpen}
          onOpenChange={setCreateModalOpen}
          onSubmit={handleCreateTeam}
        />

        <CreateTeamModal
          open={editModalOpen}
          onOpenChange={(open) => {
            setEditModalOpen(open);
            if (!open) {
              setEditingTeam(null);
            }
          }}
          onSubmit={handleUpdateTeam}
          editTeam={editingTeam}
          mode="edit"
        />

        {selectedTeam && (
          <TeamMembersModal
            open={membersModalOpen}
            onOpenChange={setMembersModalOpen}
            team={selectedTeam}
            onUpdate={loadTeams}
          />
        )}

        <ConfirmationModal
          isOpen={deleteModalOpen}
          onClose={closeDeleteModal}
          onConfirm={confirmDeleteTeam}
          title="Delete Team"
          message={`Are you sure you want to delete "${teamToDelete?.name}"? This action cannot be undone and will remove all team data including members and associated content.`}
          confirmLabel="Delete Team"
          cancelLabel="Cancel"
          confirmButtonColor="orange"
          theme="orange"
          icon={<Trash className="h-6 w-6 text-red-600" />}
        />
      </div>
    </AdminLayout>
  );
}