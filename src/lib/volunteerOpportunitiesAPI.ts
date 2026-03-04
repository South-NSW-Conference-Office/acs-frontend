import { AuthService } from './auth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL + '/api';

export interface VolunteerOpportunityListItem {
  _id: string;
  title: string;
  description: string;
  category: string;
  service: {
    _id: string;
    name: string;
    type: string;
  };
  requirements: {
    skills?: string[];
    experience?: string;
    backgroundCheck?: boolean;
    workingWithChildrenCheck?: boolean;
    minimumAge?: number;
    physicalRequirements?: string;
    otherRequirements?: string;
  };
  training?: {
    required?: boolean;
    description?: string;
    duration?: string;
    schedule?: string;
  };
  timeCommitment: {
    type: 'one_time' | 'occasional' | 'regular' | 'flexible';
    hoursPerWeek?: {
      minimum?: number;
      maximum?: number;
    };
    duration?: string;
    schedule?: string;
    description?: string;
  };
  location: {
    type: 'on_site' | 'remote' | 'hybrid';
    details?: string;
  };
  benefits?: string[];
  numberOfPositions: number;
  positionsFilled: number;
  status: 'draft' | 'open' | 'closed' | 'filled' | 'paused';
  visibility: 'public' | 'members_only' | 'private';
  applicationProcess: {
    method: 'email' | 'phone' | 'online_form' | 'in_person';
    contactEmail?: string;
    contactPhone?: string;
    applicationLink?: string;
    additionalInfo?: string;
  };
  startDate?: string;
  endDate?: string;
  tags?: string[];
  createdBy: {
    _id: string;
    name: string;
  };
  createdAt: string;
  updatedAt: string;
  // Virtual fields
  isOpen?: boolean;
  positionsAvailable?: number;
  isActive?: boolean;
}

export interface VolunteerOpportunityCreateRequest {
  title: string;
  description: string;
  serviceId: string;
  category?: string;
  requirements?: {
    skills?: string[];
    experience?: string;
    backgroundCheck?: boolean;
    workingWithChildrenCheck?: boolean;
    minimumAge?: number;
    physicalRequirements?: string;
    otherRequirements?: string;
  };
  training?: {
    required?: boolean;
    description?: string;
    duration?: string;
    schedule?: string;
  };
  timeCommitment?: {
    type?: 'one_time' | 'occasional' | 'regular' | 'flexible';
    hoursPerWeek?: {
      minimum?: number;
      maximum?: number;
    };
    duration?: string;
    schedule?: string;
    description?: string;
  };
  location?: {
    type?: 'on_site' | 'remote' | 'hybrid';
    details?: string;
  };
  benefits?: string[];
  numberOfPositions?: number;
  status?: 'draft' | 'open' | 'closed' | 'filled' | 'paused';
  visibility?: 'public' | 'members_only' | 'private';
  applicationProcess?: {
    method?: 'email' | 'phone' | 'online_form' | 'in_person';
    contactEmail?: string;
    contactPhone?: string;
    applicationLink?: string;
    additionalInfo?: string;
  };
  startDate?: string;
  endDate?: string;
  tags?: string[];
}

export interface VolunteerOpportunityFilters {
  search?: string;
  serviceId?: string;
  status?: string;
  category?: string;
}

class VolunteerOpportunitiesAPI {
  private async fetchWithAuth(url: string, options: RequestInit = {}) {
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
      const error = await response.text();
      throw new Error(error || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  async getAllOpportunities(filters?: VolunteerOpportunityFilters): Promise<VolunteerOpportunityListItem[]> {
    const params = new URLSearchParams();
    
    if (filters) {
      if (filters.search) {
        params.append('search', filters.search);
      }
      if (filters.serviceId) {
        params.append('serviceId', filters.serviceId);
      }
      if (filters.status) {
        params.append('status', filters.status);
      }
      if (filters.category) {
        params.append('category', filters.category);
      }
    }

    const queryString = params.toString();
    const url = queryString ? `/admin/volunteer-opportunities?${queryString}` : '/admin/volunteer-opportunities';
    
    return this.fetchWithAuth(url);
  }

  async getOpportunityById(opportunityId: string): Promise<VolunteerOpportunityListItem> {
    return this.fetchWithAuth(`/admin/volunteer-opportunities/${opportunityId}`);
  }

  async createOpportunity(opportunityData: VolunteerOpportunityCreateRequest): Promise<VolunteerOpportunityListItem> {
    return this.fetchWithAuth('/admin/volunteer-opportunities', {
      method: 'POST',
      body: JSON.stringify(opportunityData),
    });
  }

  async updateOpportunity(opportunityId: string, opportunityData: Partial<VolunteerOpportunityCreateRequest>): Promise<VolunteerOpportunityListItem> {
    return this.fetchWithAuth(`/admin/volunteer-opportunities/${opportunityId}`, {
      method: 'PUT',
      body: JSON.stringify(opportunityData),
    });
  }

  async deleteOpportunity(opportunityId: string): Promise<void> {
    await this.fetchWithAuth(`/admin/volunteer-opportunities/${opportunityId}`, {
      method: 'DELETE',
    });
  }

  async getServicesForDropdown(): Promise<Array<{ _id: string; name: string; type: string }>> {
    return this.fetchWithAuth('/admin/volunteer-opportunities/services');
  }
}

export const volunteerOpportunitiesAPI = new VolunteerOpportunitiesAPI();