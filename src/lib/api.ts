import { AuthService } from './auth';
import { API_BASE_URL } from './config';
class ApiClient {
  private async request(url: string, options: RequestInit = {}) {
    const token = AuthService.getToken();
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options.headers as Record<string, string>,
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    

    const response = await fetch(`${API_BASE_URL}${url}`, {
      ...options,
      headers,
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Request failed' }));
      throw new Error(error.message || `HTTP error! status: ${response.status}`);
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return null;
    }

    return response.json();
  }

  async get(url: string) {
    return this.request(url, { method: 'GET' });
  }

  async post(url: string, data?: Record<string, unknown>) {
    return this.request(url, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put(url: string, data?: Record<string, unknown>) {
    return this.request(url, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete(url: string) {
    return this.request(url, { method: 'DELETE' });
  }

  async patch(url: string, data?: Record<string, unknown>) {
    return this.request(url, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }
}

export const api = new ApiClient();