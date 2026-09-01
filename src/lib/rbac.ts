// RBAC API Service for managing roles, permissions, and hierarchical entities

import { Union, Conference, Church, Role, UnionAssignment, ConferenceAssignment, ChurchAssignment } from '../types/rbac';
import { API_BASE_URL } from './config';

export interface UserWithRoles {
  _id: string;
  name: string;
  email: string;
  unionAssignments?: UnionAssignment[];
  conferenceAssignments?: ConferenceAssignment[];
  churchAssignments?: ChurchAssignment[];
  primaryUnion?: string;
  primaryConference?: string;
  primaryChurch?: string;
}

export interface UserPermissions {
  role: {
    id: string;
    name: string;
    displayName: string;
    level: string;
  };
  permissions: string[];
  union?: string;
  conference?: string;
  church?: string;
}

class RBACService {
  private apiBaseUrl: string;

  constructor() {
    this.apiBaseUrl = API_BASE_URL;
  }

  private getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem('token');
    // Context handled via separate storage for each entity type
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    };
    
    // Note: Hierarchical entity context handled via endpoint selection
    
    return headers;
  }

  // Hierarchical Entity Management
  async getUnions(): Promise<Union[]> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/unions`, {
        headers: this.getAuthHeaders(),
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch unions');
      }

      const result = await response.json();
      return result.data || result;
    } catch (error) {
      console.error('Error fetching unions:', error);
      throw error;
    }
  }

  async getConferences(unionId?: string): Promise<Conference[]> {
    try {
      const url = unionId 
        ? `${this.apiBaseUrl}/api/conferences?unionId=${unionId}`
        : `${this.apiBaseUrl}/api/conferences`;
      
      const response = await fetch(url, {
        headers: this.getAuthHeaders(),
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch conferences');
      }

      const result = await response.json();
      return result.data || result;
    } catch (error) {
      console.error('Error fetching conferences:', error);
      throw error;
    }
  }

  async getChurches(conferenceId?: string): Promise<Church[]> {
    try {
      const url = conferenceId 
        ? `${this.apiBaseUrl}/api/churches?conferenceId=${conferenceId}`
        : `${this.apiBaseUrl}/api/churches`;
      
      const response = await fetch(url, {
        headers: this.getAuthHeaders(),
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch churches');
      }

      const result = await response.json();
      return result.data || result;
    } catch (error) {
      console.error('Error fetching churches:', error);
      throw error;
    }
  }

  async createUnion(data: Partial<Union>): Promise<Union> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/unions`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(data),
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create union');
      }

      return response.json();
    } catch (error) {
      console.error('Error creating union:', error);
      throw error;
    }
  }

  async createConference(data: Partial<Conference>): Promise<Conference> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/conferences`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(data),
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create conference');
      }

      return response.json();
    } catch (error) {
      console.error('Error creating conference:', error);
      throw error;
    }
  }

  async createChurch(data: Partial<Church>): Promise<Church> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/churches`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(data),
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create church');
      }

      return response.json();
    } catch (error) {
      console.error('Error creating church:', error);
      throw error;
    }
  }

  async updateUnion(id: string, data: Partial<Union>): Promise<Union> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/unions/${id}`, {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(data),
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to update union');
      }

      return response.json();
    } catch (error) {
      console.error('Error updating union:', error);
      throw error;
    }
  }

  async updateConference(id: string, data: Partial<Conference>): Promise<Conference> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/conferences/${id}`, {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(data),
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to update conference');
      }

      return response.json();
    } catch (error) {
      console.error('Error updating conference:', error);
      throw error;
    }
  }

  async updateChurch(id: string, data: Partial<Church>): Promise<Church> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/churches/${id}`, {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(data),
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to update church');
      }

      return response.json();
    } catch (error) {
      console.error('Error updating church:', error);
      throw error;
    }
  }

  async deleteUnion(id: string): Promise<void> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/unions/${id}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders(),
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete union');
      }
    } catch (error) {
      console.error('Error deleting union:', error);
      throw error;
    }
  }

  async deleteConference(id: string): Promise<void> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/conferences/${id}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders(),
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete conference');
      }
    } catch (error) {
      console.error('Error deleting conference:', error);
      throw error;
    }
  }

  async deleteChurch(id: string): Promise<void> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/churches/${id}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders(),
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete church');
      }
    } catch (error) {
      console.error('Error deleting church:', error);
      throw error;
    }
  }

  // Role Management
  async getRoles(includeSystem = false): Promise<Role[]> {
    try {
      const response = await fetch(
        `${this.apiBaseUrl}/api/roles?includeSystem=${includeSystem}`,
        {
          headers: this.getAuthHeaders(),
          credentials: 'include',
        }
      );

      if (!response.ok) {
        if (response.status === 404) {
          return []; // Return empty array if no roles found
        }
        throw new Error('Failed to fetch roles');
      }

      const result = await response.json();
      return result.data || result;
    } catch (error) {
      console.error('Error fetching roles:', error);
      throw error;
    }
  }

  async getSystemRoles(): Promise<Role[]> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/roles?isSystemRole=true`, {
        headers: this.getAuthHeaders(),
        credentials: 'include',
      });

      if (!response.ok) {
        if (response.status === 404) {
          return []; // Return empty array if no system roles found
        }
        throw new Error('Failed to fetch system roles');
      }

      const result = await response.json();
      return result.data || result;
    } catch (error) {
      console.error('Error fetching system roles:', error);
      throw error;
    }
  }

  async createRole(data: Partial<Role>): Promise<Role> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/roles`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(data),
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create role');
      }

      return response.json();
    } catch (error) {
      console.error('Error creating role:', error);
      throw error;
    }
  }

  async updateRole(id: string, data: Partial<Role>): Promise<Role> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/roles/${id}`, {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(data),
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to update role');
      }

      return response.json();
    } catch (error) {
      console.error('Error updating role:', error);
      throw error;
    }
  }

  async deleteRole(id: string): Promise<void> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/roles/${id}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders(),
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete role');
      }
    } catch (error) {
      console.error('Error deleting role:', error);
      throw error;
    }
  }

  async resetSystemRole(id: string): Promise<Role> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/roles/${id}/reset`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to reset system role');
      }

      const result = await response.json();
      return result.data || result;
    } catch (error) {
      console.error('Error resetting system role:', error);
      throw error;
    }
  }

  // User Role Management
  async getUserRoles(userId: string): Promise<{unionAssignments?: UnionAssignment[], conferenceAssignments?: ConferenceAssignment[], churchAssignments?: ChurchAssignment[]}> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/users/${userId}/roles`, {
        headers: this.getAuthHeaders(),
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch user roles');
      }

      return response.json();
    } catch (error) {
      console.error('Error fetching user roles:', error);
      throw error;
    }
  }

  async assignUserToUnion(userId: string, unionId: string, roleName: string): Promise<{success: boolean; data?: {unionAssignments: Array<{union: string; role: string}>}; error?: string}> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/users/${userId}/union-roles`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ unionId, roleName }),
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to assign union role');
      }

      return response.json();
    } catch (error) {
      console.error('Error assigning union role:', error);
      throw error;
    }
  }

  async assignUserToConference(userId: string, conferenceId: string, roleName: string): Promise<{success: boolean; data?: {conferenceAssignments: Array<{conference: string; role: string}>}; error?: string}> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/users/${userId}/conference-roles`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ conferenceId, roleName }),
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to assign conference role');
      }

      return response.json();
    } catch (error) {
      console.error('Error assigning conference role:', error);
      throw error;
    }
  }

  async assignUserToChurch(userId: string, churchId: string, roleName: string): Promise<{success: boolean; data?: {churchAssignments: Array<{church: string; role: string}>}; error?: string}> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/users/${userId}/church-roles`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ churchId, roleName }),
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to assign church role');
      }

      return response.json();
    } catch (error) {
      console.error('Error assigning church role:', error);
      throw error;
    }
  }

  async revokeUserFromUnion(userId: string, unionId: string): Promise<{success: boolean}> {
    try {
      const response = await fetch(
        `${this.apiBaseUrl}/api/users/${userId}/union-roles/${unionId}`,
        {
          method: 'DELETE',
          headers: this.getAuthHeaders(),
          credentials: 'include',
        }
      );

      if (!response.ok) {
        throw new Error('Failed to revoke union role');
      }

      return response.json();
    } catch (error) {
      console.error('Error revoking union role:', error);
      throw error;
    }
  }

  async revokeUserFromConference(userId: string, conferenceId: string): Promise<{success: boolean}> {
    try {
      const response = await fetch(
        `${this.apiBaseUrl}/api/users/${userId}/conference-roles/${conferenceId}`,
        {
          method: 'DELETE',
          headers: this.getAuthHeaders(),
          credentials: 'include',
        }
      );

      if (!response.ok) {
        throw new Error('Failed to revoke conference role');
      }

      return response.json();
    } catch (error) {
      console.error('Error revoking conference role:', error);
      throw error;
    }
  }

  async revokeUserFromChurch(userId: string, churchId: string): Promise<{success: boolean}> {
    try {
      const response = await fetch(
        `${this.apiBaseUrl}/api/users/${userId}/church-roles/${churchId}`,
        {
          method: 'DELETE',
          headers: this.getAuthHeaders(),
          credentials: 'include',
        }
      );

      if (!response.ok) {
        throw new Error('Failed to revoke church role');
      }

      return response.json();
    } catch (error) {
      console.error('Error revoking church role:', error);
      throw error;
    }
  }

  async getUserPermissions(userId: string, entityId?: string, entityType?: 'union' | 'conference' | 'church'): Promise<UserPermissions> {
    try {
      let params = '';
      if (entityId && entityType) {
        params = `?${entityType}Id=${entityId}`;
      }
      
      const response = await fetch(
        `${this.apiBaseUrl}/api/users/${userId}/permissions${params}`,
        {
          headers: this.getAuthHeaders(),
          credentials: 'include',
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch user permissions');
      }

      return response.json();
    } catch (error) {
      console.error('Error fetching user permissions:', error);
      throw error;
    }
  }

  // Single User Fetch (avoids fetching all users and filtering client-side)
  async getUserById(userId: string): Promise<{_id: string; id: string; name: string; email: string; verified?: boolean; phone?: string; address?: string; city?: string; state?: string; country?: string; avatar?: {url: string; key: string} | string; createdAt?: string; updatedAt?: string; unionAssignments?: UnionAssignment[]; conferenceAssignments?: ConferenceAssignment[]; churchAssignments?: ChurchAssignment[]}> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/users/${userId}`, {
        headers: this.getAuthHeaders(),
        credentials: 'include',
      });

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('You do not have permission to access this user');
        }
        if (response.status === 404) {
          throw new Error('User not found');
        }
        throw new Error('Failed to fetch user');
      }

      return response.json();
    } catch (error) {
      console.error('Error fetching user by ID:', error);
      throw error;
    }
  }

  // User Management
  async getUsers(): Promise<Array<{_id: string; name: string; email: string; unionAssignments?: UnionAssignment[]; conferenceAssignments?: ConferenceAssignment[]; churchAssignments?: ChurchAssignment[]}>> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/users?limit=100`, {
        headers: this.getAuthHeaders(),
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }

      const data = await response.json();

      // API returns { users: [...], pagination: {...} }, we need just the users array
      return data.users || [];
    } catch (error) {
      console.error('Error fetching users:', error);
      throw error;
    }
  }

  // Permission Management
  async getAvailablePermissions(): Promise<Record<string, Array<{key: string; label: string; description: string; allowedScopes?: string[]}>>> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/permissions`, {
        headers: this.getAuthHeaders(),
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch permissions');
      }

      const result = await response.json();
      return result.permissions || {};
    } catch (error) {
      console.error('Error fetching permissions:', error);
      throw error;
    }
  }

  async getAvailablePermissionsForRole(roleLevel?: string): Promise<Record<string, Array<{key: string; label: string; description: string; allowedScopes?: string[]}>>> {
    try {
      const params = roleLevel ? `?roleLevel=${roleLevel}` : '';
      const response = await fetch(`${this.apiBaseUrl}/api/permissions/available-for-role${params}`, {
        headers: this.getAuthHeaders(),
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch permissions for role');
      }

      const result = await response.json();
      return result.permissions || {};
    } catch (error) {
      console.error('Error fetching permissions for role:', error);
      throw error;
    }
  }

  // Hierarchical Entity Context
  setCurrentUnion(unionId: string) {
    localStorage.setItem('currentUnionId', unionId);
  }

  setCurrentConference(conferenceId: string) {
    localStorage.setItem('currentConferenceId', conferenceId);
  }

  setCurrentChurch(churchId: string) {
    localStorage.setItem('currentChurchId', churchId);
  }

  getCurrentUnion(): string | null {
    return localStorage.getItem('currentUnionId');
  }

  getCurrentConference(): string | null {
    return localStorage.getItem('currentConferenceId');
  }

  getCurrentChurch(): string | null {
    return localStorage.getItem('currentChurchId');
  }

  clearHierarchicalContext() {
    localStorage.removeItem('currentUnionId');
    localStorage.removeItem('currentConferenceId');
    localStorage.removeItem('currentChurchId');
  }

  // Generic user role assignment - delegates to specific methods based on entity type
  async assignUserRole(userId: string, entityId: string, roleId: string, entityType: 'union' | 'conference' | 'church'): Promise<{success: boolean; data?: unknown; error?: string}> {
    try {
      switch (entityType) {
        case 'union':
          return await this.assignUserToUnion(userId, entityId, roleId);
        case 'conference':
          return await this.assignUserToConference(userId, entityId, roleId);
        case 'church':
          return await this.assignUserToChurch(userId, entityId, roleId);
        default:
          throw new Error(`Invalid entity type: ${entityType}`);
      }
    } catch (error) {
      console.error('Error in generic role assignment:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to assign role'
      };
    }
  }
}

export const rbacService = new RBACService();