import axios, { AxiosInstance, AxiosError } from 'axios';
import toast from 'react-hot-toast';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

class ApiService {
  private instance: AxiosInstance;

  constructor() {
    this.instance = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor
    this.instance.interceptors.request.use(
      (config) => {
        // Add auth token to requests
        const token = localStorage.getItem('clickview_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.instance.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response) {
          const { status, data } = error.response;
          const message = (data as any)?.error || 'An error occurred';

          switch (status) {
            case 400:
              toast.error(`Bad Request: ${message}`);
              break;
            case 401:
              toast.error('Unauthorized. Please check your API key.');
              break;
            case 403:
              toast.error('Access forbidden.');
              break;
            case 404:
              toast.error('Resource not found.');
              break;
            case 429:
              toast.error('Too many requests. Please try again later.');
              break;
            case 500:
              toast.error('Server error. Please try again later.');
              break;
            default:
              toast.error(message);
          }
        } else if (error.request) {
          toast.error('Network error. Please check your connection.');
        } else {
          toast.error('An unexpected error occurred.');
        }

        return Promise.reject(error);
      }
    );
  }

  // Workspace endpoints
  async createWorkspace(data: { name: string; apiKey: string; clickupTeamId?: string }) {
    const response = await this.instance.post('/workspaces', data);
    return response.data;
  }

  async getWorkspaces() {
    const response = await this.instance.get('/workspaces');
    return response.data;
  }

  async getWorkspace(id: string) {
    const response = await this.instance.get(`/workspaces/${id}`);
    return response.data;
  }

  async updateWorkspace(id: string, data: Partial<{ name: string; apiKey: string; isActive: boolean }>) {
    const response = await this.instance.put(`/workspaces/${id}`, data);
    return response.data;
  }

  async deleteWorkspace(id: string) {
    const response = await this.instance.delete(`/workspaces/${id}`);
    return response.data;
  }

  async validateWorkspace(id: string) {
    const response = await this.instance.post(`/workspaces/${id}/validate`);
    return response.data;
  }

  async getWorkspaceHierarchy(id: string) {
    const response = await this.instance.get(`/workspaces/${id}/hierarchy`);
    return response.data;
  }

  // Dashboard endpoints
  async createDashboard(data: {
    workspaceId: string;
    name: string;
    description?: string;
    layoutConfig?: any[];
    globalFilters?: any;
    refreshInterval?: number;
    isTemplate?: boolean;
    templateCategory?: string;
  }) {
    const response = await this.instance.post('/dashboards', data);
    return response.data;
  }

  async getDashboards(params?: {
    workspaceId?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) {
    const response = await this.instance.get('/dashboards', { params });
    return response.data;
  }

  async getDashboard(id: string) {
    const response = await this.instance.get(`/dashboards/${id}`);
    return response.data;
  }

  async updateDashboard(id: string, data: Partial<{
    name: string;
    description: string;
    layoutConfig: any[];
    globalFilters: any;
    refreshInterval: number;
  }>) {
    const response = await this.instance.put(`/dashboards/${id}`, data);
    return response.data;
  }

  async deleteDashboard(id: string) {
    const response = await this.instance.delete(`/dashboards/${id}`);
    return response.data;
  }

  async duplicateDashboard(id: string, name?: string) {
    const response = await this.instance.post(`/dashboards/${id}/duplicate`, { name });
    return response.data;
  }

  async shareDashboard(id: string, expiresIn?: number) {
    const response = await this.instance.post(`/dashboards/${id}/share`, { expiresIn });
    return response.data;
  }

  async getSharedDashboard(shareToken: string) {
    const response = await this.instance.get(`/dashboards/shared/${shareToken}`);
    return response.data;
  }

  async createDashboardExport(data: {
    dashboardId: string;
    format: 'pdf' | 'excel' | 'csv' | 'powerpoint';
    options: any;
  }) {
    const response = await this.instance.post('/dashboards/export', data, {
      timeout: 120000 // 2 minutes timeout for export generation
    });
    return response.data;
  }

  // Dashboard Template endpoints
  async getDashboardTemplates(params?: {
    category?: string;
    tags?: string[];
    isPublic?: boolean;
    search?: string;
  }) {
    const response = await this.instance.get('/dashboards/templates', { params });
    return response.data;
  }

  async getDashboardTemplate(id: string) {
    const response = await this.instance.get(`/dashboards/templates/${id}`);
    return response.data;
  }

  async createDashboardTemplate(data: {
    dashboardId: string;
    name: string;
    description: string;
    category: string;
    tags: string[];
    isPublic: boolean;
    generateThumbnail: boolean;
  }) {
    const response = await this.instance.post('/dashboards/templates', data);
    return response.data;
  }

  async createDashboardFromTemplate(data: {
    templateId: string;
    workspaceId: string;
    name?: string;
  }) {
    const response = await this.instance.post('/dashboards/from-template', data);
    return response.data;
  }

  async updateDashboardTemplate(id: string, data: Partial<{
    name: string;
    description: string;
    category: string;
    tags: string[];
    isPublic: boolean;
  }>) {
    const response = await this.instance.put(`/dashboards/templates/${id}`, data);
    return response.data;
  }

  async deleteDashboardTemplate(id: string) {
    const response = await this.instance.delete(`/dashboards/templates/${id}`);
    return response.data;
  }

  // Widget endpoints
  async createWidget(data: {
    dashboardId: string;
    type: string;
    title: string;
    description?: string;
    position: { x: number; y: number; w: number; h: number };
    config?: any;
    dataConfig: any;
    filters?: any;
    refreshInterval?: number;
  }) {
    const response = await this.instance.post('/widgets', data);
    return response.data;
  }

  async updateWidget(id: string, data: any) {
    const response = await this.instance.put(`/widgets/${id}`, data);
    return response.data;
  }

  async deleteWidget(id: string) {
    const response = await this.instance.delete(`/widgets/${id}`);
    return response.data;
  }

  async updateWidgetPosition(id: string, position: { x: number; y: number; w: number; h: number }) {
    const response = await this.instance.put(`/widgets/${id}/position`, { position });
    return response.data;
  }

  async batchUpdateWidgets(widgets: Array<{ id: string; position?: any; config?: any }>) {
    const response = await this.instance.post('/widgets/batch-update', { widgets });
    return response.data;
  }

  // Data endpoints
  async getTasks(params: {
    workspaceId: string;
    listId?: string;
    spaceId?: string;
    status?: string;
    assignee?: string;
    filters?: any;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
    page?: number;
  }) {
    const response = await this.instance.get('/data/tasks', { params });
    return response.data;
  }

  async getCustomFields(workspaceId: string, listId: string) {
    const response = await this.instance.get('/data/custom-fields', {
      params: { workspaceId, listId }
    });
    return response.data;
  }

  async refreshData(workspaceId: string, dashboardId?: string) {
    const response = await this.instance.post('/data/refresh', {
      workspaceId,
      dashboardId
    });
    return response.data;
  }

  async getAggregatedData(params: {
    workspaceId: string;
    sourceType: string;
    spaceId?: string;
    folderId?: string;
    listId?: string;
    filters?: any;
    aggregationType?: string;
    groupBy?: string;
    timeGroupBy?: string;
    startDate?: string;
    endDate?: string;
    dataConfig?: any;
  }) {
    const response = await this.instance.get('/data/aggregate', { params });
    return response.data;
  }


  async uploadTasks(formData: FormData) {
    const response = await this.instance.post('/tasks/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  async syncTasks(data: {
    workspaceId: string;
    listId?: string;
    spaceId?: string;
    syncAll?: boolean;
  }) {
    // Use a longer timeout for sync operations as they can take a while
    const response = await this.instance.post('/tasks/sync', data, {
      timeout: 300000 // 5 minutes timeout for sync operations
    });
    return response.data;
  }

  async getTaskStats(params: {
    workspaceId: string;
    listId?: string;
    spaceId?: string;
  }) {
    const response = await this.instance.get('/tasks/stats', { params });
    return response.data;
  }

  async getTaskSyncHistory(workspaceId: string) {
    const response = await this.instance.get('/tasks/sync-history', {
      params: { workspaceId }
    });
    return response.data;
  }

  // ClickUp endpoints
  async getClickUpSpaces(workspaceId: string) {
    const response = await this.instance.get('/clickup/spaces', {
      params: { workspaceId }
    });
    return response.data;
  }

  async getClickUpLists(workspaceId: string, spaceId: string) {
    const response = await this.instance.get('/clickup/lists', {
      params: { workspaceId, spaceId }
    });
    return response.data;
  }

  // ===================================================================
  // AUTHENTICATION ENDPOINTS
  // ===================================================================

  async login(emailOrUsername: string, password: string) {
    const response = await this.instance.post('/auth/login', {
      emailOrUsername,
      password
    });
    return response.data;
  }

  async register(
    email: string,
    username: string,
    password: string,
    firstName?: string,
    lastName?: string
  ) {
    const response = await this.instance.post('/auth/register', {
      email,
      username,
      password,
      firstName,
      lastName
    });
    return response.data;
  }

  async logout() {
    const response = await this.instance.post('/auth/logout');
    return response.data;
  }

  async verifyMfa(mfaToken: string, code: string) {
    const response = await this.instance.post('/auth/mfa/verify', {
      mfaToken,
      code
    });
    return response.data;
  }

  async getCurrentUser() {
    const response = await this.instance.get('/auth/me');
    return response.data;
  }

  async refreshToken(refreshToken: string) {
    const response = await this.instance.post('/auth/refresh', {
      refreshToken
    });
    return response.data;
  }

  async requestPasswordReset(email: string) {
    const response = await this.instance.post('/auth/password/reset-request', {
      email
    });
    return response.data;
  }

  async resetPassword(token: string, newPassword: string) {
    const response = await this.instance.post('/auth/password/reset', {
      token,
      newPassword
    });
    return response.data;
  }

  async changePassword(currentPassword: string, newPassword: string) {
    const response = await this.instance.post('/auth/password/change', {
      currentPassword,
      newPassword
    });
    return response.data;
  }

  async enableMfa() {
    const response = await this.instance.post('/auth/mfa/enable');
    return response.data;
  }

  async confirmMfa(code: string) {
    const response = await this.instance.post('/auth/mfa/confirm', {
      code
    });
    return response.data;
  }

  async disableMfa(password: string) {
    const response = await this.instance.post('/auth/mfa/disable', {
      password
    });
    return response.data;
  }

  async getSessions() {
    const response = await this.instance.get('/auth/sessions');
    return response.data;
  }

  async revokeSession(sessionId: string) {
    const response = await this.instance.delete(`/auth/sessions/${sessionId}`);
    return response.data;
  }

  async revokeAllSessions() {
    const response = await this.instance.delete('/auth/sessions');
    return response.data;
  }

  // Health check
  async checkHealth() {
    const response = await this.instance.get('/health');
    return response.data;
  }
}

export const apiService = new ApiService();
export default apiService;