import { AuthService } from './auth';
import { API_BASE_URL as API_ORIGIN } from './config';

const API_BASE_URL = `${API_ORIGIN}/api`;

export interface TestimonyImage {
  url: string;
  alt?: string;
  key?: string;
}

export interface TestimonyListItem {
  _id: string;
  name: string;
  location: string;
  review: string;
  image: TestimonyImage;
  status: 'draft' | 'pending' | 'approved' | 'rejected';
  isFeatured: boolean;
  featuredOrder: number;
  rejectionReason?: string;
  createdBy: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  updatedBy?: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  approvedBy?: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TestimonyCreateRequest {
  name: string;
  location: string;
  review: string;
  image: TestimonyImage;
}

export interface TestimonyFilters {
  search?: string;
  status?: string;
  featured?: boolean;
}

export interface TestimonyStats {
  total: number;
  draft: number;
  pending: number;
  approved: number;
  rejected: number;
  featured: number;
}

export interface TestimoniesResponse {
  success: boolean;
  testimonies: TestimonyListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface TestimonyResponse {
  success: boolean;
  testimony: TestimonyListItem;
  message?: string;
}

export interface TestimonyStatsResponse {
  success: boolean;
  stats: TestimonyStats;
}

class TestimoniesAPI {
  private async fetchWithAuth(url: string, options: RequestInit = {}) {
    const token = AuthService.getToken();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
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
      const errorData = await response.json().catch(() => null);
      throw new Error(
        errorData?.error || errorData?.message || `HTTP error! status: ${response.status}`
      );
    }

    return response.json();
  }

  async getAllTestimonies(filters?: TestimonyFilters): Promise<TestimoniesResponse> {
    const params = new URLSearchParams();

    if (filters?.search) params.append('search', filters.search);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.featured !== undefined) params.append('featured', String(filters.featured));

    const queryString = params.toString();
    const url = `/admin/testimonies${queryString ? `?${queryString}` : ''}`;

    return this.fetchWithAuth(url);
  }

  async getTestimonyById(id: string): Promise<TestimonyResponse> {
    return this.fetchWithAuth(`/admin/testimonies/${id}`);
  }

  async getStats(): Promise<TestimonyStatsResponse> {
    return this.fetchWithAuth('/admin/testimonies/stats');
  }

  async createTestimony(
    data: TestimonyCreateRequest
  ): Promise<TestimonyResponse> {
    return this.fetchWithAuth('/admin/testimonies', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateTestimony(
    id: string,
    data: Partial<TestimonyCreateRequest>
  ): Promise<TestimonyResponse> {
    return this.fetchWithAuth(`/admin/testimonies/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async submitForApproval(id: string): Promise<TestimonyResponse> {
    return this.fetchWithAuth(`/admin/testimonies/${id}/submit`, {
      method: 'POST',
    });
  }

  async approveTestimony(id: string): Promise<TestimonyResponse> {
    return this.fetchWithAuth(`/admin/testimonies/${id}/approve`, {
      method: 'POST',
    });
  }

  async rejectTestimony(id: string, reason?: string): Promise<TestimonyResponse> {
    return this.fetchWithAuth(`/admin/testimonies/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  async toggleFeatured(
    id: string,
    featured: boolean,
    order?: number
  ): Promise<TestimonyResponse> {
    return this.fetchWithAuth(`/admin/testimonies/${id}/featured`, {
      method: 'PUT',
      body: JSON.stringify({ featured, order }),
    });
  }

  async updateFeaturedOrder(id: string, order: number): Promise<TestimonyResponse> {
    return this.fetchWithAuth(`/admin/testimonies/${id}/reorder`, {
      method: 'PUT',
      body: JSON.stringify({ order }),
    });
  }

  async deleteTestimony(id: string): Promise<void> {
    await this.fetchWithAuth(`/admin/testimonies/${id}`, {
      method: 'DELETE',
    });
  }
}

export const testimoniesAPI = new TestimoniesAPI();
