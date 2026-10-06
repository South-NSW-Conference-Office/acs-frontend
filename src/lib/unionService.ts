// Union Service - Handles API calls for union management

import { AuthService } from './auth';
import { 
  Union,
  Conference,
  Church,
  UnionListResponse, 
  UnionResponse,
  CreateUnionData, 
  UpdateUnionData,
  UnionListParams
} from '../types/hierarchy';
import { API_BASE_URL } from './config';
export class UnionService {
  private static getAuthHeaders() {
    const token = AuthService.getToken();
    return {
      'Content-Type': 'application/json',
      Authorization: token ? `Bearer ${token}` : '',
    };
  }

  /**
   * Ensure union data has type: 'union' (backend doesn't return it)
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private static addUnionType(union: any): Union {
    return { ...union, type: 'union' as const };
  }

  /**
   * Get all unions
   */
  static async getAllUnions(params?: UnionListParams): Promise<UnionListResponse> {
    try {
      const queryParams = new URLSearchParams();
      
      // Convert isActive to includeInactive for backend compatibility
      if (params?.isActive !== undefined && params.isActive === false) {
        // Only add includeInactive=true when we want to show inactive unions
        queryParams.append('includeInactive', 'true');
      }
      // Default behavior (no param) shows only active unions
      if (params?.search) {
        queryParams.append('search', params.search);
      }
      if (params?.limit) {
        queryParams.append('limit', params.limit.toString());
      }
      if (params?.offset) {
        queryParams.append('offset', params.offset.toString());
      }

      const url = `${API_BASE_URL}/api/unions${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Union API Error:', response.status, errorText);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result: UnionListResponse = await response.json();
      // Inject type: 'union' since backend doesn't return it
      result.data = result.data.map(u => this.addUnionType(u));
      return result;
    } catch (error) {
      console.error('Error fetching unions:', error);
      throw new Error(
        error instanceof Error ? error.message : 'Failed to fetch unions'
      );
    }
  }

  /**
   * Get union by ID
   */
  static async getUnionById(id: string): Promise<UnionResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/unions/${id}`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result: UnionResponse = await response.json();
      result.data = this.addUnionType(result.data);
      return result;
    } catch (error) {
      console.error('Error fetching union:', error);
      throw new Error(
        error instanceof Error ? error.message : 'Failed to fetch union'
      );
    }
  }

  /**
   * Create new union
   */
  static async createUnion(data: CreateUnionData): Promise<UnionResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/unions`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result: UnionResponse = await response.json();
      result.data = this.addUnionType(result.data);
      return result;
    } catch (error) {
      console.error('Error creating union:', error);
      throw new Error(
        error instanceof Error ? error.message : 'Failed to create union'
      );
    }
  }

  /**
   * Update union
   */
  static async updateUnion(id: string, data: UpdateUnionData): Promise<UnionResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/unions/${id}`, {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result: UnionResponse = await response.json();
      result.data = this.addUnionType(result.data);
      return result;
    } catch (error) {
      console.error('Error updating union:', error);
      throw new Error(
        error instanceof Error ? error.message : 'Failed to update union'
      );
    }
  }

  /**
   * Delete union
   */
  static async deleteUnion(id: string): Promise<{ 
    success: boolean; 
    message: string; 
    data?: {
      union: Union;
    };
    details?: {
      blockingEntities?: {
        conferences?: number;
        churches?: number;
        teams?: number;
        services?: number;
        level: string;
        action: string;
      };
    };
  }> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/unions/${id}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch {
          // If response isn't JSON, use status text
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        // Preserve the original error message from backend
        const backendMessage = errorData.message || `HTTP ${response.status}: ${response.statusText}`;
        const error = new Error(backendMessage);
        (error as Error & { originalResponse?: unknown }).originalResponse = errorData; // Preserve full response
        throw error;
      }

      return await response.json();
    } catch (error) {
      console.error('Error deleting union:', error);
      
      // Re-throw the original error to preserve backend messages
      if (error instanceof Error) {
        throw error;
      } else {
        throw new Error('Failed to delete union');
      }
    }
  }


  /**
   * Permanently delete union (hard delete — removes from database)
   */
  static async hardDeleteUnion(id: string): Promise<{
    success: boolean;
    message: string;
    details?: {
      blockingEntities?: {
        conferences?: number;
        churches?: number;
        teams?: number;
        services?: number;
        level: string;
        action: string;
      };
    };
  }> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/unions/${id}/permanent`, {
        method: 'DELETE',
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const backendMessage = errorData.message || `HTTP ${response.status}: ${response.statusText}`;
        const error = new Error(backendMessage);
        (error as Error & { originalResponse?: unknown }).originalResponse = errorData;
        throw error;
      }

      return await response.json();
    } catch (error) {
      console.error('Error permanently deleting union:', error);

      if (error instanceof Error) {
        throw error;
      } else {
        throw new Error('Failed to permanently delete union');
      }
    }
  }

  /**
   * Get union hierarchy (with conferences and churches)
   */
  static async getUnionHierarchy(id: string): Promise<{
    success: boolean;
    data: {
      union: Union;
      conferences: Conference[];
      churches: Church[];
    };
  }> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/unions/${id}/hierarchy`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      result.data.union = this.addUnionType(result.data.union);
      return result;
    } catch (error) {
      console.error('Error fetching union hierarchy:', error);
      throw new Error(
        error instanceof Error ? error.message : 'Failed to fetch union hierarchy'
      );
    }
  }

  /**
   * Update union banner image
   */
  static async updateUnionBanner(unionId: string, file: File, alt?: string): Promise<{
    success: boolean;
    data?: { image: { url: string; key: string; alt: string } };
    message?: string;
  }> {
    try {
      const formData = new FormData();
      formData.append('banner', file);
      if (alt) formData.append('alt', alt);

      const response = await fetch(`${API_BASE_URL}/api/unions/${unionId}/banner`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${AuthService.getToken()}`,
        },
        body: formData,
      });

      return await response.json();
    } catch (error) {
      console.error('Error updating union banner:', error);
      throw new Error(
        error instanceof Error ? error.message : 'Failed to update union banner'
      );
    }
  }

  /**
   * Update union banner with existing media file
   */
  static async updateUnionBannerWithMediaFile(unionId: string, mediaFileId: string, alt?: string): Promise<{
    success: boolean;
    data?: { image: { url: string; key: string; alt: string } };
    message?: string;
  }> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/unions/${unionId}/banner/media`, {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ 
          mediaFileId,
          alt: alt || ''
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error updating union banner with media file:', error);
      throw new Error(
        error instanceof Error ? error.message : 'Failed to update union banner'
      );
    }
  }

}