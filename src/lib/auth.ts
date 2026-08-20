const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

interface LoginCredentials {
  email: string;
  password: string;
}

export interface AssignmentRole {
  _id: string;
  name: string;
  displayName: string;
  hierarchyLevel?: number;
  canManage?: number[];
}

interface AuthResponse {
  success: boolean;
  message: string;
  data?: {
    user: {
      id: string;
      name: string;
      email: string;
      verified: boolean;
      avatar?: string;
      phone?: string;
      address?: string;
      city?: string;
      state?: string;
      country?: string;
      // `role` is a bare ObjectId string when the backend has not populated it,
      // and a full role document when it has. Both shapes occur, so consumers
      // must handle either.
      unionAssignments?: Array<{union: string; role: string | AssignmentRole; assignedAt: string}>;
      conferenceAssignments?: Array<{conference: string; role: string | AssignmentRole; assignedAt: string}>;
      churchAssignments?: Array<{church: string; role: string | AssignmentRole; assignedAt: string}>;
      primaryUnion?: string;
      primaryConference?: string;
      primaryChurch?: string;
      teamAssignments?: Array<{
        teamId: string;
        role: 'leader' | 'member' | 'communications';
        assignedAt: string;
        team?: {
          _id: string;
          name: string;
          type: string;
          churchId: string;
        };
      }>;
      primaryTeam?: string;
    };
    token: string;
    permissions?: string[];
    role?: {
      id: string;
      name: string;
      displayName: string;
      level: string;
    };
  };
  err?: string;
}

export class AuthService {
  private static getAuthHeaders(token?: string) {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    
    return headers;
  }

  static async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/signin`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(credentials),
        credentials: 'include',
      });

      // A failed sign-in may answer with HTML or an empty body (a proxy error page,
      // a 502). Parsing that throws a SyntaxError, which would otherwise surface as
      // "Unexpected token <" instead of anything about signing in.
      let data: Partial<AuthResponse> & { err?: string } = {};
      try {
        data = await response.json();
      } catch {
        data = {};
      }

      if (!response.ok) {
        // Prefer `message` over `err`. The API returns both: `message` is written for
        // the person signing in, `err` is a short internal reason. Reading `err` first
        // turned "Please complete your account setup by setting a password first.
        // Check your email for the verification link." into "Password not set", which
        // tells someone enrolled by an admin nothing about what to do next.
        throw new Error(
          data.message || data.err || `Login failed (${response.status})`
        );
      }

      return data as AuthResponse;
    } catch (error) {
      console.error('Login error:', error);
      const message = error instanceof Error ? error.message : 'Login failed';
      return { success: false, message, err: message };
    }
  }

  static async verifyAuth(token: string): Promise<AuthResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/is-auth`, {
        method: 'GET',
        headers: this.getAuthHeaders(token),
        credentials: 'include',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.err || 'Authentication verification failed');
      }

      return {
        success: true,
        message: 'Authentication verified',
        data: {
          user: data.data.user,
          permissions: data.data.permissions,
          role: data.data.role,
          token,
        },
      };
    } catch (error) {
      console.error('Auth verification error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Authentication verification failed',
        err: error instanceof Error ? error.message : 'Authentication verification failed',
      };
    }
  }

  // NEW: Verify authentication with hierarchical data
  static async verifyAuthHierarchical(token: string): Promise<AuthResponse & {
    data?: AuthResponse['data'] & {
      hierarchyLevel: number;
      hierarchyPath: string;
      managedLevels: number[];
    }
  }> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/is-auth-hierarchical`, {
        method: 'GET',
        headers: this.getAuthHeaders(token),
        credentials: 'include',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.err || 'Hierarchical authentication verification failed');
      }

      return {
        success: true,
        message: 'Hierarchical authentication verified',
        data: {
          user: data.data.user,
          permissions: data.data.permissions,
          role: data.data.role,
          hierarchyLevel: data.data.hierarchyLevel,
          hierarchyPath: data.data.hierarchyPath,
          managedLevels: data.data.managedLevels,
          token,
        },
      };
    } catch (error) {
      console.error('Hierarchical auth verification error:', error);
      
      // Fallback to regular auth verification if hierarchical endpoint doesn't exist
      const fallbackResult = await this.verifyAuth(token);
      
      if (fallbackResult.success) {
        // Add default hierarchical data
        return {
          ...fallbackResult,
          data: {
            ...fallbackResult.data!,
            hierarchyLevel: 4, // Default to lowest level
            hierarchyPath: '',
            managedLevels: []
          }
        };
      }
      
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Hierarchical authentication verification failed',
        err: error instanceof Error ? error.message : 'Hierarchical authentication verification failed',
      };
    }
  }

  static setToken(token: string): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('token', token);
      // Keep auth_token for backward compatibility
      localStorage.setItem('auth_token', token);
    }
  }

  static getToken(): string | null {
    if (typeof window !== 'undefined') {
      // Try new key first, fallback to old key
      return localStorage.getItem('token') || localStorage.getItem('auth_token');
    }
    return null;
  }

  static removeToken(): void {
    if (typeof window !== 'undefined') {
      // Remove the old token first (silently)
      localStorage.removeItem('auth_token');
      // Remove the main token last - this will trigger the storage event
      localStorage.removeItem('token');
    }
  }

  static async logout(): Promise<void> {
    try {
      // Call logout endpoint to blacklist the token on the backend
      await fetch(`${API_BASE_URL}/api/auth/logout`, {
        method: 'POST',
        headers: this.getAuthHeaders(this.getToken() || undefined),
        credentials: 'include',
      });
    } catch {
      console.warn('[AuthService] Logout endpoint failed, but continuing with client-side logout');
    } finally {
      // Clear tokens - this will trigger the storage event
      this.removeToken();

      // Manually trigger logout logic since storage events don't fire on same tab
      window.dispatchEvent(new CustomEvent('logout'));
    }
  }


  static hasPermission(permission: string, userPermissions?: string[]): boolean {
    if (!userPermissions) {
      // Try to get from stored permissions
      const storedPermissions = this.getStoredPermissions();
      if (!storedPermissions) return false;
      userPermissions = storedPermissions;
    }

    // Check for wildcard permissions
    if (userPermissions.includes('*') || userPermissions.includes('all')) return true;

    // Check exact match
    if (userPermissions.includes(permission)) return true;

    // Check resource wildcard (e.g., 'users.*' matches 'users.create')
    const [resource, action] = permission.split('.');
    if (userPermissions.includes(`${resource}.*`)) return true;

    // Check for scoped permissions (e.g., 'organizations.create:subordinate' matches 'organizations.create')
    const matchesScoped = userPermissions.some(userPerm => {
      const [userResource, userActionWithScope] = userPerm.split('.');
      if (!userActionWithScope || !userActionWithScope.includes(':')) return false;
      
      const [userAction] = userActionWithScope.split(':');
      return userResource === resource && userAction === action;
    });

    return matchesScoped;
  }

  static setStoredPermissions(permissions: string[]): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('userPermissions', JSON.stringify(permissions));
    }
  }

  static getStoredPermissions(): string[] | null {
    if (typeof window !== 'undefined') {
      const permissions = localStorage.getItem('userPermissions');
      return permissions ? JSON.parse(permissions) : null;
    }
    return null;
  }
}