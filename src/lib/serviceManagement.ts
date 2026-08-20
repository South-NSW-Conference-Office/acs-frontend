import { AuthService } from './auth';
import { ServiceScheduling } from '@/types/scheduling';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL + '/api';

export interface Service {
  _id: string;
  name: string;
  type: string;
  teamId?: {
    _id: string;
    name: string;
    category?: string;
  } | string;
  descriptionShort: string;
  descriptionLong: string;
  status: 'active' | 'paused' | 'archived';
  locations: Array<{
    label: string;
    address: {
      street?: string;
      suburb?: string;
      state?: string;
      postcode?: string;
    };
    coordinates?: {
      lat: number;
      lng: number;
    };
  }>;
  primaryImage?: {
    url: string;
    alt: string;
  };
  availability?: 'always_open' | 'set_times' | 'set_events' | null;
  scheduling?: ServiceScheduling;
  gallery?: Array<{
    _id: string;
    url: string;
    alt?: string;
    type: 'image' | 'video';
  }>;
  tags?: string[];
  contactInfo: {
    email?: string;
    phone?: string;
    website?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface ServiceCreateRequest {
  name: string;
  type: string;
  teamId: string; // Team ID as string
  descriptionShort: string;
  descriptionLong: string;
  status: 'active' | 'paused' | 'archived';
  locations: Array<{
    label: string;
    address: {
      street?: string;
      suburb?: string;
      state?: string;
      postcode?: string;
    };
    coordinates?: {
      lat: number;
      lng: number;
    };
  }>;
  primaryImage?: {
    url: string;
    alt: string;
  };
  availability?: 'always_open' | 'set_times' | 'set_events' | null;
  gallery?: Array<{
    _id: string;
    url: string;
    alt?: string;
    type: 'image' | 'video';
  }>;
  tags?: string[];
  contactInfo: {
    email?: string;
    phone?: string;
    website?: string;
  };
}

export interface ServiceEvent {
  _id: string;
  service: string;
  name: string;
  description: string;
  start: string;
  end: string;
  locationText: string;
  status: string;
}

export interface ServiceStats {
  totalServices: number;
  activeServices: number;
  upcomingEvents: number;
  openVolunteerRoles: number;
}

export interface ServicePermissions {
  [teamId: string]: {
    teamName: string;
    teamType: string;
    canCreateServices: boolean;
    canUpdateServices: boolean;
    canDeleteServices: boolean;
    canManageServices: boolean;
  };
}

interface PermissionsResponse {
  permissions: ServicePermissions;
}

interface StatsResponse {
  stats: ServiceStats;
}

class ServiceManagementService {
  private async fetchWithAuth(url: string, options: RequestInit = {}, retries = 3) {
    const token = AuthService.getToken();
    
    const attemptRequest = async (attemptNumber: number): Promise<unknown> => {
      try {
        const response = await fetch(`${API_BASE_URL}${url}`, {
          ...options,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            ...options.headers,
          },
        });

        if (response.status === 429 && attemptNumber < retries) {
          // Rate limited, wait with exponential backoff
          const delay = Math.min(1000 * Math.pow(2, attemptNumber), 10000);
          await new Promise(resolve => setTimeout(resolve, delay));
          return attemptRequest(attemptNumber + 1);
        }

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const errorMessage = errorData.message || errorData.error || 
            (response.status === 429 ? 'Too many requests, please try again later.' : 'Request failed');
          throw new Error(errorMessage);
        }

        return response.json();
      } catch (error) {
        if (attemptNumber < retries && 
            (error instanceof TypeError || // Network error
             (error as Error & { name: string }).name === 'AbortError')) { // Request timeout
          const delay = Math.min(1000 * Math.pow(2, attemptNumber), 10000);
          await new Promise(resolve => setTimeout(resolve, delay));
          return attemptRequest(attemptNumber + 1);
        }
        throw error;
      }
    };

    return attemptRequest(0);
  }

  // Get user's service permissions
  async getServicePermissions(): Promise<ServicePermissions> {
    const data = await this.fetchWithAuth('/admin/services/permissions') as PermissionsResponse;
    return data.permissions;
  }

  // Get dashboard statistics
  async getDashboardStats(): Promise<ServiceStats> {
    const data = await this.fetchWithAuth('/admin/services/dashboard-stats') as StatsResponse;
    return data.stats;
  }

  // Get services with filters
  async getServices(params: {
    page?: number;
    limit?: number;
    teamId?: string;
    type?: string;
    status?: string;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  } = {}) {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        queryParams.append(key, value.toString());
      }
    });

    const url = `/admin/services?${queryParams}`;

    const result = await this.fetchWithAuth(url);
    return result;
  }

  // Every service the caller can see, across all pages.
  //
  // GET /admin/services is paginated and defaults to 10 per page. The register
  // called getServices() bare, took page one, and showed its length as
  // "Ministries on Record" — so a super admin saw "10" while the database held
  // 22, and rows 11+ were unreachable (the register has no pager). Church admins
  // never noticed: their scope sits under ten.
  //
  // Loops by the response's own pagination rather than requesting one huge page,
  // so there is no silent cap at any size. The guard also stops if a page comes
  // back empty, so a server that ignores the page param cannot loop us forever.
  async getAllServices(params: {
    teamId?: string;
    type?: string;
    status?: string;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  } = {}) {
    const limit = 100;
    const first = (await this.getServices({ ...params, page: 1, limit })) as {
      services?: unknown[];
      pagination?: { pages?: number };
    };

    const services = [...(first?.services ?? [])];
    const pages = first?.pagination?.pages ?? 1;

    for (let page = 2; page <= pages; page++) {
      const next = (await this.getServices({ ...params, page, limit })) as {
        services?: unknown[];
      };
      const batch = next?.services ?? [];
      if (batch.length === 0) break;
      services.push(...batch);
    }

    return { ...first, services };
  }

  // Get single service with full details
  async getServiceDetails(serviceId: string) {
    return this.fetchWithAuth(`/admin/services/${serviceId}/full`);
  }


  // Get available service types
  async getServiceTypes() {
    return this.fetchWithAuth('/admin/services/types');
  }

  // Create a new service
  async createService(serviceData: ServiceCreateRequest) {
    return this.fetchWithAuth('/admin/services', {
      method: 'POST',
      body: JSON.stringify(serviceData),
    });
  }

  // Update a service
  async updateService(serviceId: string, updates: ServiceCreateRequest) {
    return this.fetchWithAuth(`/admin/services/${serviceId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  // Toggle service status
  async toggleServiceStatus(serviceId: string) {
    return this.fetchWithAuth(`/admin/services/${serviceId}/toggle-status`, {
      method: 'POST',
    });
  }

  // Delete (archive) a service
  async deleteService(serviceId: string) {
    return this.fetchWithAuth(`/admin/services/${serviceId}`, {
      method: 'DELETE',
    });
  }

  // Get service images
  async getServiceImages(serviceId: string) {
    return this.fetchWithAuth(`/services/${serviceId}/images`);
  }

  // Update service primary image
  async updateServicePrimaryImage(serviceId: string, file: File) {
    const formData = new FormData();
    formData.append('banner', file);

    const token = AuthService.getToken();
    
    // Ensure we have a valid base URL
    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000';
    const uploadUrl = `${baseUrl}/api/services/${serviceId}/banner`;

    const response = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Primary image upload failed:', errorText);
      throw new Error(`Failed to upload primary image: ${response.status} - ${errorText}`);
    }

    return response.json();
  }

  // Update service primary image with media file
  async updateServicePrimaryImageWithMediaFile(serviceId: string, mediaFileId: string, alt?: string) {
    const token = AuthService.getToken();
    
    // Use the admin endpoint which we know exists and has media file support
    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000';
    const uploadUrl = `${baseUrl}/api/admin/services/${serviceId}/banner`;

    const response = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        mediaFileId,
        alt: alt || '',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Primary image media upload failed:', errorText);
      throw new Error(`Failed to update primary image with media file: ${response.status} - ${errorText}`);
    }

    return response.json();
  }

  // Add images to gallery
  async addGalleryImages(serviceId: string, files: File[]) {
    const formData = new FormData();
    files.forEach(file => {
      formData.append('images', file);
    });

    const token = AuthService.getToken();
    const response = await fetch(`${API_BASE_URL}/services/${serviceId}/gallery`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Failed to upload gallery images');
    }

    return response.json();
  }

  // Remove image from gallery
  async removeGalleryImage(serviceId: string, imageId: string) {
    return this.fetchWithAuth(`/services/${serviceId}/gallery/${imageId}`, {
      method: 'DELETE',
    });
  }

  // Service Events
  async getServiceEvents(serviceId: string) {
    return this.fetchWithAuth(`/services/${serviceId}/events`);
  }

  async createServiceEvent(serviceId: string, eventData: {
    title: string;
    description?: string;
    date: string;
    time?: string;
    location?: string;
    capacity?: number;
  }) {
    // Transform data to match backend expectations
    const start = new Date(eventData.date);
    if (eventData.time) {
      const [hours, minutes] = eventData.time.split(':');
      start.setHours(parseInt(hours, 10), parseInt(minutes, 10));
    }
    
    // Default end time to 2 hours after start if no time specified, or 1 hour if time is specified
    const end = new Date(start);
    end.setHours(end.getHours() + (eventData.time ? 1 : 2));
    
    const transformedData = {
      name: eventData.title,
      description: eventData.description || '',
      start: start.toISOString(),
      end: end.toISOString(),
      locationText: eventData.location || '',
      ...(eventData.capacity ? { capacity: { maximum: eventData.capacity } } : {})
    };
    
    return this.fetchWithAuth(`/services/${serviceId}/events`, {
      method: 'POST',
      body: JSON.stringify(transformedData),
    });
  }

  async updateServiceEvent(serviceId: string, eventId: string, eventData: Partial<{
    title: string;
    description?: string;
    date: string;
    time?: string;
    location?: string;
    capacity?: number;
  }>) {
    return this.fetchWithAuth(`/services/${serviceId}/events/${eventId}`, {
      method: 'PUT',
      body: JSON.stringify(eventData),
    });
  }

  async deleteServiceEvent(serviceId: string, eventId: string) {
    return this.fetchWithAuth(`/services/${serviceId}/events/${eventId}`, {
      method: 'DELETE',
    });
  }

  // Service Volunteer Roles
  async getServiceVolunteerRoles(serviceId: string) {
    return this.fetchWithAuth(`/services/${serviceId}/volunteer-roles`);
  }

  async createServiceVolunteerRole(serviceId: string, roleData: {
    title: string;
    description: string;
    requirements?: string;
    timeCommitment?: string;
    volunteersNeeded?: number;
    isActive: boolean;
  }) {
    return this.fetchWithAuth(`/services/${serviceId}/volunteer-roles`, {
      method: 'POST',
      body: JSON.stringify(roleData),
    });
  }

  async updateServiceVolunteerRole(serviceId: string, roleId: string, roleData: Partial<{
    title: string;
    description: string;
    requirements?: string;
    timeCommitment?: string;
    volunteersNeeded?: number;
    isActive: boolean;
  }>) {
    return this.fetchWithAuth(`/services/${serviceId}/volunteer-roles/${roleId}`, {
      method: 'PUT',
      body: JSON.stringify(roleData),
    });
  }

  async deleteServiceVolunteerRole(serviceId: string, roleId: string) {
    return this.fetchWithAuth(`/services/${serviceId}/volunteer-roles/${roleId}`, {
      method: 'DELETE',
    });
  }

}

export const serviceManagement = new ServiceManagementService();