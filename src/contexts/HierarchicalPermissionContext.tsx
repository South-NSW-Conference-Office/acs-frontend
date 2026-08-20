'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef, useMemo } from 'react';
import { AuthService } from '@/lib/auth';
import { permissionResolver, PermissionResolver, EntityAction, Entity } from '@/lib/permissionResolver';
import { isInSubtree } from '@/lib/hierarchyUtils';
import { RoleCategory } from '@/types/menu';

// Hierarchical User Interface
interface HierarchicalUser {
  id: string;
  name: string;
  email: string;
  verified: boolean;
  avatar?: {
    url: string;
    key: string;
  } | string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  unionAssignments?: Array<UnionAssignment>;
  conferenceAssignments?: Array<ConferenceAssignment>;
  churchAssignments?: Array<ChurchAssignment>;
  primaryUnion?: string;
  primaryConference?: string;
  primaryChurch?: string;
  teamAssignments?: TeamAssignment[];
  primaryTeam?: string;
  // Hierarchical Properties
  hierarchyLevel: number; // 0=super_admin, 1=conference, 2=church, 3=team, 4=service
  hierarchyPath: string;  // e.g., "union123/conference456/church789"
  managedLevels: number[]; // Levels this user can manage
}

interface UnionAssignment {
  union: string;
  role: {
    _id: string;
    name: string;
    displayName: string;
    hierarchyLevel?: number;
    canManage?: number[];
  };
  assignedAt: string;
}

interface ConferenceAssignment {
  conference: string;
  role: {
    _id: string;
    name: string;
    displayName: string;
    hierarchyLevel?: number;
    canManage?: number[];
  };
  assignedAt: string;
}

interface ChurchAssignment {
  church: string;
  role: {
    _id: string;
    name: string;
    displayName: string;
    hierarchyLevel?: number;
    canManage?: number[];
  };
  assignedAt: string;
}

interface TeamAssignment {
  teamId: string;
  role: 'leader' | 'member' | 'communications';
  assignedAt: string;
  team?: {
    _id: string;
    name: string;
    type: string;
    churchId: string;
    hierarchyPath: string;
  };
}


interface AccessibleEntity {
  _id: string;
  name: string;
  hierarchyPath?: string;
  hierarchyLevel?: string | number;
  type?: string;
  churchId?: string;
  parentId?: string;
  createdAt?: string;
  updatedAt?: string;
}

// Raw API response interfaces for proper typing
interface RawTeamData {
  _id: string;
  name: string;
  type: string;
  churchId?: string;
  hierarchyPath?: string;
}

interface RawTeamAssignment {
  teamId: string;
  role: 'leader' | 'member' | 'communications';
  assignedAt: string;
  team?: RawTeamData;
}

interface HierarchicalPermissionContextType {
  user: HierarchicalUser | null;
  permissions: string[];
  loading: boolean;
  
  // Hierarchical Permission Checks
  hasPermission: (permission: string) => boolean;
  canManageEntity: (entityType: string, entityPath: string) => boolean;
  canCreateEntity: (entityType: string, parentPath?: string) => boolean;
  
  // Enhanced Entity Permission Checks
  canViewEntity: (entity: AccessibleEntity | null, entityType: string) => boolean;
  canEditEntity: (entity: AccessibleEntity | null, entityType: string) => boolean;
  canDeleteEntity: (entity: AccessibleEntity | null, entityType: string) => boolean;
  getAllowedActions: (entity: AccessibleEntity | null, entityType: string) => EntityAction[];
  
  // Hierarchy Context
  currentLevel: number;
  currentPath: string;
  availableLevels: number[];
  
  // Legacy Hierarchical Properties (for backward compatibility)
  currentUnion: string | null;
  currentConference: string | null;
  currentChurch: string | null;
  role: string | null;
  type: string | null;

  // Role Category for menu access
  roleCategory: RoleCategory;
  
  
  // Team Context
  currentTeam: TeamAssignment['team'] | null;
  teams: TeamAssignment[];
  teamRole: TeamAssignment['role'] | null;
  switchTeam: (teamId: string) => void;
  hasTeamPermission: (permission: string, teamId?: string) => boolean;
  
  // Entity Access
  getAccessibleEntities: (entityType: string) => Promise<AccessibleEntity[]>;
  reloadPermissions: () => Promise<void>;
  
  // Permission Resolver Instance
  permissionResolver: PermissionResolver;
}

const HierarchicalPermissionContext = createContext<HierarchicalPermissionContextType | undefined>(undefined);

export const useHierarchicalPermissions = () => {
  const context = useContext(HierarchicalPermissionContext);
  if (!context) {
    throw new Error('useHierarchicalPermissions must be used within a HierarchicalPermissionProvider');
  }
  return context;
};

// Legacy aliases for backward compatibility
export const usePermissions = useHierarchicalPermissions;
export const useAuth = useHierarchicalPermissions;

// Additional compatibility hooks 
export const useHasPermission = (permission: string): boolean => {
  const { hasPermission } = useHierarchicalPermissions();
  return hasPermission(permission);
};

// Team permission checks with hierarchical support
export const useHasTeamPermission = (permission: string, teamId?: string): boolean => {
  const { canManageEntity, currentTeam } = useHierarchicalPermissions();
  
  // If no specific team provided, use current team
  const targetTeamId = teamId || currentTeam?._id;
  if (!targetTeamId) return false;
  
  // Check hierarchical team access
  return canManageEntity('team', targetTeamId);
};

// Team-specific hooks for backward compatibility
export const useCurrentTeam = () => {
  const { currentTeam, teamRole } = useHierarchicalPermissions();
  return { currentTeam, teamRole };
};

export const useUserTeams = () => {
  const { teams } = useHierarchicalPermissions();
  return teams;
};

interface HierarchicalPermissionProviderProps {
  children: ReactNode;
}

// An assignment's `role` arrives either as a bare ObjectId string (backend has
// not populated it) or as a full role document. Normalize to the object shape
// so consumers can read `.name` uniformly; an unpopulated role yields an empty
// name, which falsy-falls through the role-resolution chain rather than
// masquerading as a real role.
function normalizeAssignmentRole(
  role: string | { _id: string; name: string; displayName: string; hierarchyLevel?: number; canManage?: number[] }
): { _id: string; name: string; displayName: string; hierarchyLevel?: number; canManage?: number[] } {
  if (typeof role === 'string') {
    return { _id: role, name: '', displayName: '' };
  }
  return role;
}

// Helper function to determine role category
function determineRoleCategory(
  permissions: string[],
  hierarchyLevel: number,
  roleName: string | null,
  teamRole: 'leader' | 'member' | 'communications' | null
): RoleCategory {
  // Super admin check - wildcard permissions
  if (permissions.includes('*') || permissions.includes('all')) {
    return 'super_admin';
  }

  // Check role name for explicit category
  if (roleName) {
    const lowerRole = roleName.toLowerCase();
    if (lowerRole.includes('super_admin') || lowerRole === 'super_admin') {
      return 'super_admin';
    }
    if (lowerRole.includes('union_admin') || lowerRole === 'union_admin') {
      return 'union_admin';
    }
    if (lowerRole.includes('conference_admin') || lowerRole === 'conference_admin') {
      return 'conference_admin';
    }
    if (lowerRole.includes('viewer') || lowerRole === 'viewer') {
      return 'viewer';
    }
  }

  // Map hierarchy level to role category
  switch (hierarchyLevel) {
    case 0:
      if (roleName?.includes('union')) return 'union_admin';
      return 'super_admin';
    case 1:
      return 'conference_admin';
    case 2:
      return 'team_leader';
    case 3:
    case 4:
      if (teamRole === 'leader') return 'team_leader';
      if (teamRole === 'communications') return 'communications';
      return 'team_member';
    default:
      return 'viewer';
  }
}

export const HierarchicalPermissionProvider: React.FC<HierarchicalPermissionProviderProps> = ({ children }) => {
  const [user, setUser] = useState<HierarchicalUser | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  // The backend resolves the user's role and returns it on the auth response.
  // It was previously read from the response and then dropped, so roleName was
  // null for every user and role-based menu/permission logic never engaged.
  const [roleName, setRoleName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Team state
  const [teams, setTeams] = useState<TeamAssignment[]>([]);
  const [currentTeam, setCurrentTeam] = useState<TeamAssignment['team'] | null>(null);
  const [teamRole, setTeamRole] = useState<TeamAssignment['role'] | null>(null);

  // Logout timeout ref
  const logoutTimeout = useRef<NodeJS.Timeout | null>(null);

  const loadUserAndPermissions = useCallback(async () => {
    try {
      setLoading(true);
      const token = AuthService.getToken();
      
      if (!token) {
        setUser(null);
        setPermissions([]);
        setRoleName(null);
        setLoading(false);
        return;
      }

      // Verify authentication with hierarchical data
      const authResponse = await AuthService.verifyAuthHierarchical(token);
      
      if (!authResponse.success || !authResponse.data?.user) {
        setLoading(false);
        return;
      }

      const userData = authResponse.data.user;
      
      // Transform team assignments to match hierarchical interface
      let transformedTeams: TeamAssignment[] | undefined;
      if (userData.teamAssignments) {
        transformedTeams = (userData.teamAssignments as RawTeamAssignment[])
          .map((ta: RawTeamAssignment) => {
            return {
              teamId: ta.teamId,
              role: ta.role,
              assignedAt: ta.assignedAt,
              team: ta.team ? {
                _id: ta.team._id,
                name: ta.team.name,
                type: ta.team.type,
                churchId: ta.team.churchId || '',
                hierarchyPath: ta.team.hierarchyPath || ''
              } : undefined
            };
          })
          .filter((ta) => ta.team !== undefined) // Filter out invalid teams
          .map((ta) => ta as TeamAssignment); // Cast to correct type after filtering
      }
      
      // Transform to hierarchical user format
      const hierarchicalUser: HierarchicalUser = {
        id: userData.id,
        name: userData.name,
        email: userData.email,
        verified: userData.verified,
        avatar: userData.avatar,
        phone: userData.phone,
        address: userData.address,
        city: userData.city,
        state: userData.state,
        country: userData.country,
        // Hierarchical assignments were omitted here, so downstream role
        // derivation (which reads unionAssignments/conferenceAssignments/
        // churchAssignments) always found nothing.
        unionAssignments: userData.unionAssignments?.map((a) => ({
          ...a,
          role: normalizeAssignmentRole(a.role),
        })),
        conferenceAssignments: userData.conferenceAssignments?.map((a) => ({
          ...a,
          role: normalizeAssignmentRole(a.role),
        })),
        churchAssignments: userData.churchAssignments?.map((a) => ({
          ...a,
          role: normalizeAssignmentRole(a.role),
        })),
        primaryUnion: userData.primaryUnion,
        primaryConference: userData.primaryConference,
        primaryChurch: userData.primaryChurch,
        teamAssignments: transformedTeams,
        primaryTeam: userData.primaryTeam,
        hierarchyLevel: authResponse.data.hierarchyLevel || 4,
        hierarchyPath: authResponse.data.hierarchyPath || '',
        managedLevels: authResponse.data.managedLevels || []
      };

      setUser(hierarchicalUser);
      setPermissions(authResponse.data.permissions || []);
      // Authoritative role resolved by the backend; preferred over deriving it
      // from raw assignments, whose role refs may not be populated.
      setRoleName(authResponse.data.role?.name ?? null);
      
      // Entity assignments handled via hierarchical assignments
      
      // Set teams and current team (use already transformed teams)
      if (transformedTeams) {
        setTeams(transformedTeams);
        
        if (userData.primaryTeam) {
          const primaryTeamAssignment = transformedTeams.find((ta: TeamAssignment) => ta.teamId === userData.primaryTeam);
          if (primaryTeamAssignment?.team) {
            setCurrentTeam(primaryTeamAssignment.team);
            setTeamRole(primaryTeamAssignment.role);
          }
        } else if (transformedTeams.length > 0) {
          const firstTeam = transformedTeams[0];
          if (firstTeam.team) {
            setCurrentTeam(firstTeam.team);
            setTeamRole(firstTeam.role);
          }
        }
      }
      
    } catch (error) {
      console.error('Error loading hierarchical user data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load user data and permissions on mount
  useEffect(() => {
    loadUserAndPermissions();
  }, [loadUserAndPermissions]);

  // Listen for storage changes and logout events
  useEffect(() => {
    const handleLogout = () => {
      
      if (logoutTimeout.current) {
        clearTimeout(logoutTimeout.current);
        logoutTimeout.current = null;
      }
      
      setUser(null);
      setPermissions([]);
      setRoleName(null);
      setTeams([]);
      setCurrentTeam(null);
      setTeamRole(null);
      
      if (window.location.pathname !== '/') {
        window.location.href = '/';
      }
    };
    
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'token' && !e.newValue) {
        handleLogout();
      } else if (e.key === 'token' && e.newValue) {
        loadUserAndPermissions();
      }
    };

    window.addEventListener('logout', handleLogout);
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('logout', handleLogout);
      window.removeEventListener('storage', handleStorageChange);
      if (logoutTimeout.current) {
        clearTimeout(logoutTimeout.current);
        logoutTimeout.current = null;
      }
    };
  }, [loadUserAndPermissions]);

  // Hierarchical permission checking
  const canManageEntity = useCallback((entityType: string, entityPath: string): boolean => {
    if (!user) return false;
    
    const entity = { _id: '', hierarchyPath: entityPath, type: entityType };
    const result = permissionResolver.canPerformAction(
      {
        id: user.id,
        hierarchyLevel: user.hierarchyLevel,
        hierarchyPath: user.hierarchyPath,
        managedLevels: user.managedLevels,
        permissions,
        teamAssignments: user.teamAssignments
      },
      'manage',
      entity,
      entityType
    );
    
    return result.allowed;
  }, [user, permissions]);

  const canCreateEntity = useCallback((entityType: string, parentPath?: string): boolean => {
    if (!user) return false;
    
    const parentEntity = parentPath ? { _id: '', hierarchyPath: parentPath, type: entityType } : null;
    const result = permissionResolver.canPerformAction(
      {
        id: user.id,
        hierarchyLevel: user.hierarchyLevel,
        hierarchyPath: user.hierarchyPath,
        managedLevels: user.managedLevels,
        permissions,
        teamAssignments: user.teamAssignments
      },
      'create',
      parentEntity,
      entityType
    );
    
    return result.allowed;
  }, [user, permissions]);
  
  // Helper function to convert AccessibleEntity to Entity
  const toEntity = (entity: AccessibleEntity | null): Entity | null => {
    if (!entity) return null;
    return {
      _id: entity._id,
      hierarchyPath: entity.hierarchyPath || '',
      hierarchyLevel: entity.hierarchyLevel,
      type: entity.type
    };
  };

  // Enhanced entity permission checks
  const canViewEntity = useCallback((entity: AccessibleEntity | null, entityType: string): boolean => {
    if (!user) return false;
    
    const result = permissionResolver.canPerformAction(
      {
        id: user.id,
        hierarchyLevel: user.hierarchyLevel,
        hierarchyPath: user.hierarchyPath,
        managedLevels: user.managedLevels,
        permissions,
        teamAssignments: user.teamAssignments
      },
      'view',
      toEntity(entity),
      entityType
    );
    
    return result.allowed;
  }, [user, permissions]);
  
  const canEditEntity = useCallback((entity: AccessibleEntity | null, entityType: string): boolean => {
    if (!user) return false;
    
    const result = permissionResolver.canPerformAction(
      {
        id: user.id,
        hierarchyLevel: user.hierarchyLevel,
        hierarchyPath: user.hierarchyPath,
        managedLevels: user.managedLevels,
        permissions,
        teamAssignments: user.teamAssignments
      },
      'edit',
      toEntity(entity),
      entityType
    );
    
    return result.allowed;
  }, [user, permissions]);
  
  const canDeleteEntity = useCallback((entity: AccessibleEntity | null, entityType: string): boolean => {
    if (!user) return false;
    
    const result = permissionResolver.canPerformAction(
      {
        id: user.id,
        hierarchyLevel: user.hierarchyLevel,
        hierarchyPath: user.hierarchyPath,
        managedLevels: user.managedLevels,
        permissions,
        teamAssignments: user.teamAssignments
      },
      'delete',
      toEntity(entity),
      entityType
    );
    
    return result.allowed;
  }, [user, permissions]);
  
  const getAllowedActions = useCallback((entity: AccessibleEntity | null, entityType: string): EntityAction[] => {
    if (!user) return [];
    
    return permissionResolver.getAllowedActions(
      {
        id: user.id,
        hierarchyLevel: user.hierarchyLevel,
        hierarchyPath: user.hierarchyPath,
        managedLevels: user.managedLevels,
        permissions,
        teamAssignments: user.teamAssignments
      },
      toEntity(entity),
      entityType
    );
  }, [user, permissions]);

  const getAccessibleEntities = useCallback(async (entityType: string): Promise<AccessibleEntity[]> => {
    if (!user) return [];
    
    try {
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
      const token = AuthService.getToken();
      
      const response = await fetch(`${API_BASE_URL}/api/${entityType}/accessible`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        return data.data || [];
      }
    } catch (error) {
      console.error(`Error fetching accessible ${entityType}:`, error);
    }
    
    return [];
  }, [user]);


  const switchTeam = (teamId: string) => {
    const teamAssignment = teams.find(ta => ta.teamId === teamId);
    if (teamAssignment?.team) {
      // Validate team switch is allowed
      if (user && teamAssignment.team.hierarchyPath && 
          !isInSubtree(teamAssignment.team.hierarchyPath, user.hierarchyPath) && 
          user.hierarchyLevel !== 0) {
        console.warn('Cannot switch to team outside user hierarchy');
        return;
      }
      
      setCurrentTeam(teamAssignment.team);
      setTeamRole(teamAssignment.role);
      
      // Clear permission cache when switching context
      permissionResolver.clearUserCache(user?.id || '');
    }
  };

  const hasPermission = (permission: string): boolean => {
    if (!permissions || permissions.length === 0) {
      return false;
    }

    // Check for wildcard permissions (*, all)
    if (permissions.includes('*') || permissions.includes('all')) {
      return true;
    }

    // Check exact match
    if (permissions.includes(permission)) {
      return true;
    }

    // Check resource wildcard (e.g., 'users.*' matches 'users.create')
    const [resource, action] = permission.split('.');
    if (permissions.includes(`${resource}.*`)) {
      return true;
    }

    // `<resource>.manage` covers every action on that resource, scoped or not.
    // This mirrors the API's checkPermission and roleAllowsWrite — the panel
    // deciding differently from the API is how the "Inscribe New Ministry"
    // button vanished for church admins: the role grants services.manage:own
    // and the gate asked for services.create, so the API would have accepted a
    // create the panel never offered.
    const grantsManage = permissions.some(perm => {
      const [permResource, permActionWithScope] = String(perm).split('.');
      if (permResource !== resource || !permActionWithScope) {
        return false;
      }
      const [permAction] = permActionWithScope.split(':');
      return permAction === 'manage';
    });
    if (grantsManage) {
      return true;
    }

    // Check for scoped permissions (e.g., 'entities.create:subordinate' matches 'entities.create')
    const hasScoped = permissions.some(perm => {
      const [permResource, permActionWithScope] = perm.split('.');
      if (!permActionWithScope || !permActionWithScope.includes(':')) {
        return false;
      }

      const [permAction] = permActionWithScope.split(':');
      return permResource === resource && permAction === action;
    });

    return hasScoped;
  };

  // Clear permission cache on logout
  useEffect(() => {
    const handleLogoutCache = () => {
      permissionResolver.clearCache();
    };
    
    window.addEventListener('logout', handleLogoutCache);
    return () => window.removeEventListener('logout', handleLogoutCache);
  }, []);

  // Legacy hasTeamPermission implementation
  const hasTeamPermissionImpl = useCallback((permission: string, teamId?: string): boolean => {
    if (!user) return false;
    
    // If no specific team provided, use current team
    const targetTeamId = teamId || currentTeam?._id;
    if (!targetTeamId) return false;
    
    // Check hierarchical team access
    return canManageEntity('team', targetTeamId);
  }, [user, currentTeam, canManageEntity]);

  // Current entity context based on primary assignments

  // Calculate role category for menu access
  // Prefer the role the backend already resolved; fall back to the assignment
  // arrays only if it is absent.
  const role = roleName
    || user?.unionAssignments?.[0]?.role?.name
    || user?.conferenceAssignments?.[0]?.role?.name
    || user?.churchAssignments?.[0]?.role?.name
    || null;
  const roleCategory = useMemo((): RoleCategory => {
    return determineRoleCategory(permissions, user?.hierarchyLevel ?? -1, role, teamRole);
  }, [permissions, user?.hierarchyLevel, role, teamRole]);

  const contextValue: HierarchicalPermissionContextType = {
    user,
    permissions,
    loading,
    hasPermission,
    canManageEntity,
    canCreateEntity,
    canViewEntity,
    canEditEntity,
    canDeleteEntity,
    getAllowedActions,
    currentLevel: user?.hierarchyLevel ?? -1,
    currentPath: user?.hierarchyPath ?? '',
    availableLevels: user?.managedLevels ?? [],
    // Legacy properties for backward compatibility
    currentUnion: user?.primaryUnion || null,
    currentConference: user?.primaryConference || null,
    currentChurch: user?.primaryChurch || null,
    role,
    type: null,
    // Role Category for menu access
    roleCategory,
    currentTeam,
    teams,
    teamRole,
    switchTeam,
    hasTeamPermission: hasTeamPermissionImpl,
    getAccessibleEntities,
    reloadPermissions: loadUserAndPermissions,
    permissionResolver,
  };

  return (
    <HierarchicalPermissionContext.Provider value={contextValue}>
      {children}
    </HierarchicalPermissionContext.Provider>
  );
};

// Enhanced Permission Gate for hierarchical checks
interface HierarchicalGateProps {
  requiredLevel?: number;
  targetEntityPath?: string;
  entityType?: string;
  action?: 'read' | 'create' | 'update' | 'delete';
  permission?: string; // For backward compatibility
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export const HierarchicalGate: React.FC<HierarchicalGateProps> = ({
  requiredLevel,
  targetEntityPath,
  entityType,
  action = 'read',
  permission,
  fallback = null,
  children
}) => {
  const { user, hasPermission, canManageEntity, canCreateEntity } = useHierarchicalPermissions();
  
  // Legacy permission check
  if (permission) {
    return hasPermission(permission) ? <>{children}</> : <>{fallback}</>;
  }
  
  // Level-based check
  if (requiredLevel !== undefined) {
    const hasLevel = user && user.hierarchyLevel <= requiredLevel;
    return hasLevel ? <>{children}</> : <>{fallback}</>;
  }
  
  // Entity-based check  
  if (targetEntityPath && entityType) {
    if (action === 'create') {
      const canCreate = canCreateEntity(entityType, targetEntityPath);
      return canCreate ? <>{children}</> : <>{fallback}</>;
    } else {
      const canAccess = canManageEntity(entityType, targetEntityPath);
      return canAccess ? <>{children}</> : <>{fallback}</>;
    }
  }
  
  return <>{children}</>;
};