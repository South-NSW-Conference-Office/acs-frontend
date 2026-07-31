import { API_BASE_URL } from './config';

export interface TeamImageInfo {
  url: string | null;
  key: string | null;
  alt: string | null;
}

export interface TeamImagesResponse {
  success: boolean;
  data: {
    banner: TeamImageInfo;
    profilePhoto: TeamImageInfo;
    teamName: string;
  };
}

export interface UploadResponse {
  success: boolean;
  data: {
    teamId: string;
    banner?: TeamImageInfo;
    profilePhoto?: TeamImageInfo;
  };
  message: string;
}

class TeamImageService {
  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {};

    const token = localStorage.getItem('token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }


    return headers;
  }

  private getFormDataHeaders(): HeadersInit {
    const headers: HeadersInit = {};

    const token = localStorage.getItem('token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }


    // Don't set Content-Type for FormData - browser will set it with boundary
    return headers;
  }

  /**
   * Upload team banner image
   */
  async uploadBanner(teamId: string, file: File, alt = ''): Promise<UploadResponse> {
    try {
      const formData = new FormData();
      formData.append('banner', file);
      formData.append('alt', alt);

      const response = await fetch(`${API_BASE_URL}/api/teams/${teamId}/banner`, {
        method: 'PUT',
        headers: this.getFormDataHeaders(),
        body: formData,
      });

      if (!response.ok) {
        // Parse defensively: a 401/403/413 may return HTML or an empty body,
        // in which case response.json() throws SyntaxError and the real status
        // never reaches the caller.
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error uploading team banner:', error);
      throw new Error(
        error instanceof Error ? error.message : 'Failed to upload banner'
      );
    }
  }

  /**
   * Upload team profile photo
   */
  async uploadProfilePhoto(teamId: string, file: File, alt = ''): Promise<UploadResponse> {
    try {
      const formData = new FormData();
      formData.append('avatar', file); // Using 'avatar' field name to match upload middleware
      formData.append('alt', alt);

      const response = await fetch(`${API_BASE_URL}/api/teams/${teamId}/profile-photo`, {
        method: 'PUT',
        headers: this.getFormDataHeaders(),
        body: formData,
      });

      if (!response.ok) {
        // Parse defensively: a 401/403/413 may return HTML or an empty body,
        // in which case response.json() throws SyntaxError and the real status
        // never reaches the caller.
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error uploading team profile photo:', error);
      throw new Error(
        error instanceof Error ? error.message : 'Failed to upload profile photo'
      );
    }
  }

  /**
   * Remove team banner
   */
  async removeBanner(teamId: string): Promise<UploadResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/teams/${teamId}/banner`, {
        method: 'DELETE',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        // Parse defensively: a 401/403/413 may return HTML or an empty body,
        // in which case response.json() throws SyntaxError and the real status
        // never reaches the caller.
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error removing team banner:', error);
      throw new Error(
        error instanceof Error ? error.message : 'Failed to remove banner'
      );
    }
  }

  /**
   * Remove team profile photo
   */
  async removeProfilePhoto(teamId: string): Promise<UploadResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/teams/${teamId}/profile-photo`, {
        method: 'DELETE',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        // Parse defensively: a 401/403/413 may return HTML or an empty body,
        // in which case response.json() throws SyntaxError and the real status
        // never reaches the caller.
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error removing team profile photo:', error);
      throw new Error(
        error instanceof Error ? error.message : 'Failed to remove profile photo'
      );
    }
  }

  /**
   * Set team banner from existing media file
   */
  async setBannerFromMediaFile(teamId: string, mediaFileId: string, alt = ''): Promise<UploadResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/teams/${teamId}/banner/media`, {
        method: 'PUT',
        headers: {
          ...this.getHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ mediaFileId, alt }),
      });

      if (!response.ok) {
        // Parse defensively: a 401/403/413 may return HTML or an empty body,
        // in which case response.json() throws SyntaxError and the real status
        // never reaches the caller.
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error setting team banner from media:', error);
      throw new Error(
        error instanceof Error ? error.message : 'Failed to set banner from media'
      );
    }
  }

  /**
   * Set team profile photo from existing media file
   */
  async setProfilePhotoFromMediaFile(teamId: string, mediaFileId: string, alt = ''): Promise<UploadResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/teams/${teamId}/profile-photo/media`, {
        method: 'PUT',
        headers: {
          ...this.getHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ mediaFileId, alt }),
      });

      if (!response.ok) {
        // Parse defensively: a 401/403/413 may return HTML or an empty body,
        // in which case response.json() throws SyntaxError and the real status
        // never reaches the caller.
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error setting team profile photo from media:', error);
      throw new Error(
        error instanceof Error ? error.message : 'Failed to set profile photo from media'
      );
    }
  }

  /**
   * Get team images info
   */
  async getTeamImages(teamId: string): Promise<TeamImagesResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/teams/${teamId}/images`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        // Parse defensively: a 401/403/413 may return HTML or an empty body,
        // in which case response.json() throws SyntaxError and the real status
        // never reaches the caller.
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching team images:', error);
      throw new Error(
        error instanceof Error ? error.message : 'Failed to fetch team images'
      );
    }
  }
}

// Export a singleton instance
export const teamImageService = new TeamImageService();