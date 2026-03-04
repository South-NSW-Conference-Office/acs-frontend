import { AuthService } from './auth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

interface SuperAdminUser {
  id: string;
  name: string;
  email: string;
  isSuperAdmin: boolean;
  avatar?: string;
  organizations: Array<{
    _id: string;
    name: string;
    type: 'union' | 'conference' | 'church';
    role: string;
  }>;
  createdAt: string;
  lastLogin?: string;
  isActive: boolean;
}

interface EligibleUser {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  organizations: Array<{
    _id: string;
    name: string;
    type: 'union' | 'conference' | 'church';
    role: string;
  }>;
  verified: boolean;
}

interface SuperAdminStats {
  superAdminCount: number;
  totalUsers: number;
  verifiedUsers: number;
  percentageSuperAdmins: string;
}

interface AuditLog {
  _id: string;
  action: string;
  targetResource: string;
  targetId: string;
  userId: {
    _id: string;
    name: string;
    email: string;
  };
  metadata: Record<string, unknown>;
  createdAt: string;
  statusCode: number;
}

export class SuperAdminService {
  private static getAuthHeaders() {
    const token = AuthService.getToken();
    
    return {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    };
  }

  static async getUsers(): Promise<{
    superAdmins: SuperAdminUser[];
    eligibleUsers: EligibleUser[];
  }> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/super-admin/users`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to fetch super admin users');
      }

      const result = await response.json();
      return result.data;
    } catch (error) {
      console.error('Error fetching super admin users:', error);
      throw error;
    }
  }

  static async grantSuperAdmin(userId: string, reason?: string): Promise<{
    success: boolean;
    message: string;
    data?: SuperAdminUser;
  }> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/super-admin/grant`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ userId, reason }),
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to grant super admin privileges');
      }

      return await response.json();
    } catch (error) {
      console.error('Error granting super admin privileges:', error);
      throw error;
    }
  }

  static async revokeSuperAdmin(userId: string, reason?: string): Promise<{
    success: boolean;
    message: string;
    data?: SuperAdminUser;
  }> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/super-admin/revoke`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ userId, reason }),
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to revoke super admin privileges');
      }

      return await response.json();
    } catch (error) {
      console.error('Error revoking super admin privileges:', error);
      throw error;
    }
  }

  static async getStats(): Promise<{
    stats: SuperAdminStats;
    recentActions: AuditLog[];
  }> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/super-admin/stats`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to fetch super admin stats');
      }

      const result = await response.json();
      return result.data;
    } catch (error) {
      console.error('Error fetching super admin stats:', error);
      throw error;
    }
  }

  static async getAuditLogs(page = 1, limit = 20): Promise<{
    logs: AuditLog[];
    pagination: {
      page: number;
      limit: number;
      totalCount: number;
      totalPages: number;
    };
  }> {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });

      const response = await fetch(`${API_BASE_URL}/api/super-admin/audit-logs?${params}`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to fetch audit logs');
      }

      const result = await response.json();
      return result.data;
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      throw error;
    }
  }
}