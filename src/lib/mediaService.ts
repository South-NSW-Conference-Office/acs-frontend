// Media Service - Handles API calls for media gallery management

import { AuthService } from './auth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

export interface MediaFile {
  _id: string;
  originalName: string;
  fileName: string;
  key: string;
  url: string;
  mimeType: string;
  size: number;
  formattedSize: string;
  dimensions?: {
    width: number;
    height: number;
  };
  type: 'banner' | 'gallery' | 'thumbnail' | 'avatar' | 'document';
  category: 'service' | 'union' | 'conference' | 'church' | 'team' | 'user' | 'general';
  /**
   * Null when the uploader's account no longer exists: the API populates this
   * reference, and Mongo yields null for a document that has been deleted.
   *
   * This was typed as always present, so nothing warned about `uploadedBy.name`
   * — which threw "Cannot read properties of null (reading 'name')" during the
   * file map and took the whole admin page down with a client-side exception.
   */
  uploadedBy: {
    _id: string;
    name: string;
    email: string;
  } | null;
  entityType?: string;
  entityId?: string;
  alt: string;
  caption: string;
  tags: string[];
  thumbnail?: {
    key: string;
    url: string;
    size: number;
  };
  isActive: boolean;
  isPublic: boolean;
  usageCount: number;
  lastUsedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MediaListParams {
  page?: number;
  limit?: number;
  type?: string;
  category?: string;
  search?: string;
  sortBy?: 'createdAt' | 'size' | 'originalName' | 'usageCount';
  sortOrder?: 'asc' | 'desc';
}

export interface MediaListResponse {
  success: boolean;
  message: string;
  data: {
    files: MediaFile[];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalFiles: number;
      filesPerPage: number;
      hasNextPage: boolean;
      hasPreviousPage: boolean;
    };
    isAdminView: boolean;
  };
}

export interface MediaStatsResponse {
  success: boolean;
  message: string;
  data: {
    totalFiles: number;
    totalSize: number;
    formattedTotalSize: string;
    byType: Array<{
      type: string;
      size: number;
    }>;
  };
}

export class MediaService {
  private static getAuthHeaders() {
    const token = AuthService.getToken();
    return {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    };
  }

  /**
   * Get media files with pagination and filtering
   */
  static async getMediaFiles(params?: MediaListParams): Promise<MediaListResponse> {
    try {
      const queryParams = new URLSearchParams();
      
      if (params?.page) queryParams.append('page', params.page.toString());
      if (params?.limit) queryParams.append('limit', params.limit.toString());
      if (params?.type) queryParams.append('type', params.type);
      if (params?.category) queryParams.append('category', params.category);
      if (params?.search) queryParams.append('search', params.search);
      if (params?.sortBy) queryParams.append('sortBy', params.sortBy);
      if (params?.sortOrder) queryParams.append('sortOrder', params.sortOrder);

      const url = `${API_BASE_URL}/api/media${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: this.getAuthHeaders(),
        credentials: 'include',
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Media API Error:', response.status, errorText);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching media files:', error);
      throw new Error(
        error instanceof Error ? error.message : 'Failed to fetch media files'
      );
    }
  }

  /**
   * Get storage statistics
   */
  static async getStorageStats(): Promise<MediaStatsResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/media/stats`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching storage stats:', error);
      throw new Error(
        error instanceof Error ? error.message : 'Failed to fetch storage statistics'
      );
    }
  }

  /**
   * Get specific media file details
   */
  static async getMediaFile(id: string): Promise<{
    success: boolean;
    message: string;
    data: MediaFile;
  }> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/media/${id}`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching media file:', error);
      throw new Error(
        error instanceof Error ? error.message : 'Failed to fetch media file'
      );
    }
  }

  /**
   * Update media file metadata
   */
  static async updateMediaFile(id: string, updates: {
    alt?: string;
    caption?: string;
    tags?: string[];
  }): Promise<{
    success: boolean;
    message: string;
    data: MediaFile;
  }> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/media/${id}`, {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(updates),
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error updating media file:', error);
      throw new Error(
        error instanceof Error ? error.message : 'Failed to update media file'
      );
    }
  }

  /**
   * Delete media file
   */
  static async deleteMediaFile(id: string): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/media/${id}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders(),
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error deleting media file:', error);
      throw new Error(
        error instanceof Error ? error.message : 'Failed to delete media file'
      );
    }
  }

  /**
   * Bulk delete media files
   */
  static async bulkDeleteMediaFiles(fileIds: string[]): Promise<{
    success: boolean;
    message: string;
    data: {
      deleted: string[];
      failed: Array<{
        fileId: string;
        reason: string;
      }>;
    };
  }> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/media/bulk-delete`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ fileIds }),
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error bulk deleting media files:', error);
      throw new Error(
        error instanceof Error ? error.message : 'Failed to delete media files'
      );
    }
  }

  /**
   * Copy media file URL to clipboard
   */
  static async copyUrlToClipboard(url: string): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(url);
      return true;
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      return false;
    }
  }

  /**
   * Download media file
   */
  static downloadFile(url: string, fileName: string): void {
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}