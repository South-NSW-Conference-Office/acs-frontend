import { AuthService } from './auth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL + '/api';

export interface ProfileAvatarUploadResult {
  success: boolean;
  avatar: {
    url: string;
    key: string;
  };
  message: string;
}

export class ProfileManagement {
  // Upload profile avatar
  static async updateProfileAvatar(file: File): Promise<ProfileAvatarUploadResult> {
    const formData = new FormData();
    formData.append('avatar', file);

    const token = AuthService.getToken();
    const response = await fetch(`${API_BASE_URL}/profile/avatar`, {
      method: 'PUT',
      headers: {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
      body: formData,
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to upload profile avatar');
    }

    return response.json();
  }

  // Remove profile avatar
  static async removeProfileAvatar(): Promise<{ success: boolean; message: string }> {
    const token = AuthService.getToken();
    const response = await fetch(`${API_BASE_URL}/profile/avatar`, {
      method: 'DELETE',
      headers: {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to remove profile avatar');
    }

    return response.json();
  }
}