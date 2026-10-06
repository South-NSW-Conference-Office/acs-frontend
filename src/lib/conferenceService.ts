// Conference Service - Handles API calls for conference management

import { AuthService } from './auth';
import { Conference, Church } from '../types/rbac';
import { 
  ConferenceListResponse, 
  ConferenceResponse,
  CreateConferenceData, 
  UpdateConferenceData,
  ConferenceListParams,
} from '../types/hierarchy';
import { API_BASE_URL } from './config';
export class ConferenceService {
  private static getAuthHeaders() {
    const token = AuthService.getToken();
    return {
      'Content-Type': 'application/json',
      Authorization: token ? `Bearer ${token}` : '',
    };
  }

  /**
   * Ensure conference data has type: 'conference' (backend doesn't return it)
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private static addConferenceType(conference: any): Conference {
    return { ...conference, type: 'conference' as const };
  }

  /**
   * Get all conferences
   */
  static async getAllConferences(params?: ConferenceListParams): Promise<ConferenceListResponse> {
    try {
      const queryParams = new URLSearchParams();
      
      if (params?.unionId) {
        queryParams.append('unionId', params.unionId);
      }
      if (params?.isActive !== undefined) {
        queryParams.append('isActive', params.isActive.toString());
      }
      if (params?.search) {
        queryParams.append('search', params.search);
      }
      if (params?.limit) {
        queryParams.append('limit', params.limit.toString());
      }
      if (params?.offset) {
        queryParams.append('offset', params.offset.toString());
      }

      const url = `${API_BASE_URL}/api/conferences${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result: ConferenceListResponse = await response.json();
      result.data = result.data.map(c => this.addConferenceType(c));
      return result;
    } catch (error) {
      console.error('Error fetching conferences:', error);
      throw new Error(
        error instanceof Error ? error.message : 'Failed to fetch conferences'
      );
    }
  }

  /**
   * Get conference by ID
   */
  static async getConferenceById(id: string): Promise<ConferenceResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/conferences/${id}`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result: ConferenceResponse = await response.json();
      result.data = this.addConferenceType(result.data);
      return result;
    } catch (error) {
      console.error('Error fetching conference:', error);
      throw new Error(
        error instanceof Error ? error.message : 'Failed to fetch conference'
      );
    }
  }

  /**
   * Create new conference
   */
  static async createConference(data: CreateConferenceData): Promise<ConferenceResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/conferences`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result: ConferenceResponse = await response.json();
      result.data = this.addConferenceType(result.data);
      return result;
    } catch (error) {
      console.error('Error creating conference:', error);
      throw new Error(
        error instanceof Error ? error.message : 'Failed to create conference'
      );
    }
  }

  /**
   * Update conference
   */
  static async updateConference(id: string, data: UpdateConferenceData): Promise<ConferenceResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/conferences/${id}`, {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result: ConferenceResponse = await response.json();
      result.data = this.addConferenceType(result.data);
      return result;
    } catch (error) {
      console.error('Error updating conference:', error);
      throw new Error(
        error instanceof Error ? error.message : 'Failed to update conference'
      );
    }
  }

  /**
   * Delete conference
   */
  static async deleteConference(id: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/conferences/${id}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error deleting conference:', error);
      throw new Error(
        error instanceof Error ? error.message : 'Failed to delete conference'
      );
    }
  }

  /**
   * Permanently delete conference (hard delete — removes from database, cascades subordinates)
   */
  static async hardDeleteConference(id: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/conferences/${id}/permanent`, {
        method: 'DELETE',
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        let errorData;
        try { errorData = await response.json(); } catch {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error permanently deleting conference:', error);
      if (error instanceof Error) throw error;
      throw new Error('Failed to permanently delete conference');
    }
  }

  /**
   * Get conference hierarchy (with churches)
   */
  static async getConferenceHierarchy(id: string): Promise<{
    success: boolean;
    data: {
      conference: Conference;
      churches: Church[];
    };
  }> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/conferences/${id}/hierarchy`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching conference hierarchy:', error);
      throw new Error(
        error instanceof Error ? error.message : 'Failed to fetch conference hierarchy'
      );
    }
  }

  /**
   * Update conference banner image
   */
  static async updateConferenceBanner(conferenceId: string, file: File, alt?: string): Promise<{
    success: boolean;
    data?: { image: { url: string; key: string; alt: string } };
    message?: string;
  }> {
    try {
      const formData = new FormData();
      formData.append('banner', file);
      if (alt) formData.append('alt', alt);

      const response = await fetch(`${API_BASE_URL}/api/conferences/${conferenceId}/banner`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${AuthService.getToken()}`,
        },
        body: formData,
      });

      return await response.json();
    } catch (error) {
      console.error('Error updating conference banner:', error);
      throw new Error(
        error instanceof Error ? error.message : 'Failed to update conference banner'
      );
    }
  }

  /**
   * Update conference banner with existing media file
   */
  static async updateConferenceBannerWithMediaFile(conferenceId: string, mediaFileId: string, alt?: string): Promise<{
    success: boolean;
    data?: { image: { url: string; key: string; alt: string } };
    message?: string;
  }> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/conferences/${conferenceId}/banner/media`, {
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
      console.error('Error updating conference banner with media file:', error);
      throw new Error(
        error instanceof Error ? error.message : 'Failed to update conference banner'
      );
    }
  }
}

// Create instance-based API for easier use in components
export const conferenceService = {
  getConferences: (params?: ConferenceListParams) => ConferenceService.getAllConferences(params),
  getConference: (id: string) => ConferenceService.getConferenceById(id),
  createConference: (data: CreateConferenceData) => ConferenceService.createConference(data),
  updateConference: (id: string, data: UpdateConferenceData) => ConferenceService.updateConference(id, data),
  deleteConference: (id: string) => ConferenceService.deleteConference(id),
  getConferenceStatistics: (id: string) => ConferenceService.getConferenceHierarchy(id),
  getConferenceHierarchy: (id: string) => ConferenceService.getConferenceHierarchy(id),
};