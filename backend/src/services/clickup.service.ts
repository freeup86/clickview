import axios, { AxiosInstance, AxiosError } from 'axios';
import { logger } from '../config/logger';
import { query } from '../config/database';
import { EncryptionService } from '../config/encryption';

interface RateLimitInfo {
  remaining: number;
  resetAt: Date;
}

interface ClickUpTask {
  id: string;
  name: string;
  description: string;
  status: {
    id: string;
    status: string;
    color: string;
    type: string;
  };
  date_created: string;
  date_updated: string;
  date_closed: string | null;
  date_done: string | null;
  archived: boolean;
  creator: {
    id: number;
    username: string;
    email: string;
  };
  assignees: Array<{
    id: number;
    username: string;
    email: string;
  }>;
  watchers: Array<{
    id: number;
    username: string;
    email: string;
  }>;
  priority: {
    id: string;
    priority: string;
    color: string;
  } | null;
  due_date: string | null;
  start_date: string | null;
  time_estimate: number | null;
  time_spent: number;
  custom_fields: Array<{
    id: string;
    name: string;
    type: string;
    value: any;
  }>;
  tags: string[];
  parent: string | null;
  linked_tasks: any[];
  team_id: string;
  url: string;
  permission_level: string;
  list: {
    id: string;
    name: string;
  };
  project: {
    id: string;
    name: string;
  };
  folder: {
    id: string;
    name: string;
  };
  space: {
    id: string;
  };
}

interface ClickUpList {
  id: string;
  name: string;
  orderindex: number;
  status: {
    status: string;
    color: string;
    hide_label: boolean;
  };
  priority: {
    priority: string;
    color: string;
  };
  assignee: any;
  task_count: number;
  due_date: string | null;
  start_date: string | null;
  folder: {
    id: string;
    name: string;
  };
  space: {
    id: string;
    name: string;
  };
  archived: boolean;
  override_statuses: boolean;
  statuses: Array<{
    id: string;
    status: string;
    orderindex: number;
    color: string;
    type: string;
  }>;
}

interface ClickUpSpace {
  id: string;
  name: string;
  private: boolean;
  statuses: Array<{
    id: string;
    status: string;
    type: string;
    orderindex: number;
    color: string;
  }>;
  multiple_assignees: boolean;
  features: {
    due_dates: {
      enabled: boolean;
      start_date: boolean;
      remap_due_dates: boolean;
      remap_closed_due_date: boolean;
    };
    time_tracking: {
      enabled: boolean;
    };
    tags: {
      enabled: boolean;
    };
    time_estimates: {
      enabled: boolean;
    };
    custom_fields: {
      enabled: boolean;
    };
  };
  archived: boolean;
}

export class ClickUpService {
  private axiosInstance: AxiosInstance;
  private workspaceId: string;
  private apiKey: string;
  private rateLimit: RateLimitInfo = {
    remaining: 100,
    resetAt: new Date()
  };
  private requestQueue: Array<() => Promise<any>> = [];
  private isProcessingQueue = false;

  constructor(workspaceId: string, encryptedApiKey: string, iv: string) {
    this.workspaceId = workspaceId;
    
    try {
      this.apiKey = EncryptionService.decrypt(encryptedApiKey, iv);
      
      if (!this.apiKey || this.apiKey.length === 0) {
        logger.error('Decrypted API key is empty', { workspaceId });
        throw new Error('Invalid API key after decryption');
      }
    } catch (error: any) {
      logger.error('Failed to decrypt API key', { 
        workspaceId, 
        error: error.message,
        encryptedLength: encryptedApiKey?.length,
        ivLength: iv?.length
      });
      throw error;
    }
    
    this.axiosInstance = axios.create({
      baseURL: 'https://api.clickup.com/api/v2',
      headers: {
        'Authorization': this.apiKey,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Response interceptor to handle rate limits
    this.axiosInstance.interceptors.response.use(
      async (response) => {
        // Update rate limit info from headers
        const remaining = response.headers['x-ratelimit-remaining'];
        const reset = response.headers['x-ratelimit-reset'];
        
        if (remaining !== undefined) {
          this.rateLimit.remaining = parseInt(remaining);
        }
        if (reset !== undefined) {
          this.rateLimit.resetAt = new Date(parseInt(reset) * 1000);
        }

        // Log API request
        await this.logApiRequest(
          response.config.url || '',
          response.config.method?.toUpperCase() || 'GET',
          response.status,
          Date.now() - (response.config.metadata?.startTime || Date.now())
        );

        return response;
      },
      async (error: AxiosError) => {
        if (error.response?.status === 429) {
          // Rate limited - add to queue
          logger.warn('ClickUp API rate limit reached', {
            workspaceId: this.workspaceId,
            resetAt: this.rateLimit.resetAt
          });
          
          // Wait and retry
          const retryAfter = error.response.headers['retry-after'] || 60;
          await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
          return this.axiosInstance.request(error.config!);
        }

        // Log failed API request
        await this.logApiRequest(
          error.config?.url || '',
          error.config?.method?.toUpperCase() || 'GET',
          error.response?.status || 0,
          Date.now() - (error.config?.metadata?.startTime || Date.now()),
          error.message
        );

        throw error;
      }
    );

    // Request interceptor to add timing metadata
    this.axiosInstance.interceptors.request.use((config) => {
      config.metadata = { startTime: Date.now() };
      return config;
    });
  }

  private async logApiRequest(
    endpoint: string,
    method: string,
    statusCode: number,
    responseTime: number,
    errorMessage?: string
  ) {
    try {
      // Only log if we have a valid UUID workspace ID
      // Skip logging for temporary workspace IDs used during validation
      const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(this.workspaceId);
      
      if (this.workspaceId && isValidUUID) {
        await query(
          `INSERT INTO api_request_logs 
           (workspace_id, endpoint, method, status_code, response_time_ms, error_message, rate_limit_remaining)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            this.workspaceId,
            endpoint,
            method,
            statusCode,
            responseTime,
            errorMessage || null,
            this.rateLimit.remaining
          ]
        );
      }
    } catch (error) {
      logger.error('Failed to log API request', error);
    }
  }

  private async executeWithRateLimit<T>(request: () => Promise<T>): Promise<T> {
    // Check if we need to wait for rate limit reset
    if (this.rateLimit.remaining <= 5 && this.rateLimit.resetAt > new Date()) {
      const waitTime = this.rateLimit.resetAt.getTime() - Date.now();
      logger.info(`Waiting ${waitTime}ms for rate limit reset`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    return request();
  }

  // Workspace methods
  async validateApiKey(): Promise<boolean> {
    try {
      const response = await this.executeWithRateLimit(() => 
        this.axiosInstance.get('/user')
      );
      return response.status === 200;
    } catch (error) {
      logger.error('API key validation failed', error);
      return false;
    }
  }

  async getTeams() {
    try {
      const response = await this.executeWithRateLimit(() =>
        this.axiosInstance.get('/team')
      );
      return response.data.teams;
    } catch (error) {
      logger.error('Failed to fetch teams', error);
      throw error;
    }
  }

  // Space methods
  async getSpaces(teamId: string): Promise<ClickUpSpace[]> {
    try {
      const response = await this.executeWithRateLimit(() =>
        this.axiosInstance.get(`/team/${teamId}/space`, {
          params: { archived: false }
        })
      );
      return response.data.spaces;
    } catch (error) {
      logger.error('Failed to fetch spaces', error);
      throw error;
    }
  }

  async getSpace(spaceId: string): Promise<ClickUpSpace> {
    try {
      const response = await this.executeWithRateLimit(() =>
        this.axiosInstance.get(`/space/${spaceId}`)
      );
      return response.data;
    } catch (error) {
      logger.error('Failed to fetch space', error);
      throw error;
    }
  }

  // Folder methods
  async getFolders(spaceId: string) {
    try {
      const response = await this.executeWithRateLimit(() =>
        this.axiosInstance.get(`/space/${spaceId}/folder`, {
          params: { archived: false }
        })
      );
      return response.data.folders;
    } catch (error) {
      logger.error('Failed to fetch folders', error);
      throw error;
    }
  }

  // List methods
  async getLists(folderId: string): Promise<ClickUpList[]> {
    try {
      const response = await this.executeWithRateLimit(() =>
        this.axiosInstance.get(`/folder/${folderId}/list`, {
          params: { archived: false }
        })
      );
      return response.data.lists;
    } catch (error) {
      logger.error('Failed to fetch lists', error);
      throw error;
    }
  }
  
  // Get all lists in a space (including folderless lists and lists in folders)
  async getSpaceLists(spaceId: string): Promise<ClickUpList[]> {
    try {
      const allLists: ClickUpList[] = [];
      
      // Get folderless lists
      const folderlessLists = await this.getFolderlessLists(spaceId);
      allLists.push(...folderlessLists);
      
      // Get folders and their lists
      const folders = await this.getFolders(spaceId);
      for (const folder of folders) {
        const folderLists = await this.getLists(folder.id);
        allLists.push(...folderLists);
      }
      
      return allLists;
    } catch (error) {
      logger.error('Failed to fetch space lists', error);
      throw error;
    }
  }

  async getFolderlessLists(spaceId: string): Promise<ClickUpList[]> {
    try {
      const response = await this.executeWithRateLimit(() =>
        this.axiosInstance.get(`/space/${spaceId}/list`, {
          params: { archived: false }
        })
      );
      return response.data.lists;
    } catch (error) {
      logger.error('Failed to fetch folderless lists', error);
      throw error;
    }
  }

  // Task methods
  async getTasks(listId: string, params?: {
    archived?: boolean;
    page?: number;
    order_by?: string;
    reverse?: boolean;
    subtasks?: boolean;
    statuses?: string[];
    include_closed?: boolean;
    assignees?: string[];
    tags?: string[];
    due_date_gt?: number;
    due_date_lt?: number;
    date_created_gt?: number;
    date_created_lt?: number;
    date_updated_gt?: number;
    date_updated_lt?: number;
    custom_fields?: string[];
  }): Promise<ClickUpTask[]> {
    try {
      let allTasks: ClickUpTask[] = [];
      let page = 0;
      let hasMore = true;
      
      // Fetch all pages until no more tasks
      while (hasMore) {
        const response = await this.executeWithRateLimit(() =>
          this.axiosInstance.get(`/list/${listId}/task`, {
            params: {
              archived: params?.archived || false,
              page: page,
              order_by: params?.order_by || 'created',
              reverse: params?.reverse || false,
              subtasks: params?.subtasks || true,
              include_closed: params?.include_closed || true,
              ...params
            }
          })
        );
        
        const tasks = response.data.tasks;
        if (tasks && tasks.length > 0) {
          allTasks = allTasks.concat(tasks);
          logger.info(`Fetched page ${page} with ${tasks.length} tasks from list ${listId}`);
          page++;
          // ClickUp returns 100 tasks per page, if we get less, we're done
          if (tasks.length < 100) {
            hasMore = false;
          }
        } else {
          hasMore = false;
        }
      }
      
      logger.info(`Total tasks fetched from list ${listId}: ${allTasks.length}`);
      return allTasks;
    } catch (error) {
      logger.error('Failed to fetch tasks', error);
      throw error;
    }
  }

  async getTask(taskId: string): Promise<ClickUpTask> {
    try {
      const response = await this.executeWithRateLimit(() =>
        this.axiosInstance.get(`/task/${taskId}`)
      );
      return response.data;
    } catch (error) {
      logger.error('Failed to fetch task', error);
      throw error;
    }
  }

  // Custom fields methods
  async getCustomFields(listId: string) {
    try {
      const response = await this.executeWithRateLimit(() =>
        this.axiosInstance.get(`/list/${listId}/field`)
      );
      return response.data.fields;
    } catch (error) {
      logger.error('Failed to fetch custom fields', error);
      throw error;
    }
  }

  // Time tracking methods
  async getTimeEntries(teamId: string, params?: {
    start_date?: number;
    end_date?: number;
    assignee?: string[];
    include_task_tags?: boolean;
    include_location_names?: boolean;
    space_id?: string;
    folder_id?: string;
    list_id?: string;
    task_id?: string;
  }) {
    try {
      const response = await this.executeWithRateLimit(() =>
        this.axiosInstance.get(`/team/${teamId}/time_entries`, {
          params: params || {}
        })
      );
      return response.data.data;
    } catch (error) {
      logger.error('Failed to fetch time entries', error);
      throw error;
    }
  }

  // Comments methods
  async getTaskComments(taskId: string) {
    try {
      const response = await this.executeWithRateLimit(() =>
        this.axiosInstance.get(`/task/${taskId}/comment`)
      );
      return response.data.comments;
    } catch (error) {
      logger.error('Failed to fetch task comments', error);
      throw error;
    }
  }

  // Webhook methods
  async createWebhook(teamId: string, endpoint: string, events: string[]) {
    try {
      const response = await this.executeWithRateLimit(() =>
        this.axiosInstance.post(`/team/${teamId}/webhook`, {
          endpoint,
          events
        })
      );
      return response.data;
    } catch (error) {
      logger.error('Failed to create webhook', error);
      throw error;
    }
  }

  async deleteWebhook(webhookId: string) {
    try {
      await this.executeWithRateLimit(() =>
        this.axiosInstance.delete(`/webhook/${webhookId}`)
      );
    } catch (error) {
      logger.error('Failed to delete webhook', error);
      throw error;
    }
  }

  // Batch operations
  async getAllTasksFromSpace(spaceId: string, filters?: any): Promise<ClickUpTask[]> {
    const allTasks: ClickUpTask[] = [];
    
    try {
      // Get all folders in space
      const folders = await this.getFolders(spaceId);
      
      // Get folderless lists
      const folderlessLists = await this.getFolderlessLists(spaceId);
      
      // Process folderless lists
      for (const list of folderlessLists) {
        const tasks = await this.getTasks(list.id, filters);
        allTasks.push(...tasks);
      }
      
      // Process folders
      for (const folder of folders) {
        const lists = await this.getLists(folder.id);
        for (const list of lists) {
          const tasks = await this.getTasks(list.id, filters);
          allTasks.push(...tasks);
        }
      }
      
      return allTasks;
    } catch (error) {
      logger.error('Failed to fetch all tasks from space', error);
      throw error;
    }
  }

  // Get hierarchy
  async getWorkspaceHierarchy(teamId: string) {
    try {
      const spaces = await this.getSpaces(teamId);
      const hierarchy = [];

      for (const space of spaces) {
        const spaceData: any = {
          id: space.id,
          name: space.name,
          type: 'space',
          folders: [],
          lists: []
        };

        // Get folders
        const folders = await this.getFolders(space.id);
        for (const folder of folders) {
          const folderData: any = {
            id: folder.id,
            name: folder.name,
            type: 'folder',
            lists: []
          };

          // Get lists in folder
          const lists = await this.getLists(folder.id);
          folderData.lists = lists.map((list: ClickUpList) => ({
            id: list.id,
            name: list.name,
            type: 'list',
            task_count: list.task_count
          }));

          spaceData.folders.push(folderData);
        }

        // Get folderless lists
        const folderlessLists = await this.getFolderlessLists(space.id);
        spaceData.lists = folderlessLists.map((list: ClickUpList) => ({
          id: list.id,
          name: list.name,
          type: 'list',
          task_count: list.task_count
        }));

        hierarchy.push(spaceData);
      }

      return hierarchy;
    } catch (error) {
      logger.error('Failed to fetch workspace hierarchy', error);
      throw error;
    }
  }
}