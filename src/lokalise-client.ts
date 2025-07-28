import axios, { AxiosInstance, AxiosResponse } from 'axios';
import type {
  ProjectsResponse,
  ProjectData,
  CreateKeysRequest,
  CreateKeysResponse
} from './types.js';

export class LokaliseApiClient {
  private client: AxiosInstance;
  private readonly baseURL = 'https://api.lokalise.com/api2';

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error('Lokalise API key is required');
    }

    this.client = axios.create({
      baseURL: this.baseURL,
      headers: {
        'X-Api-Token': apiKey,
        'Content-Type': 'application/json',
      },
      timeout: 30000, // 30 second timeout
    });

    // Add request interceptor for logging
    this.client.interceptors.request.use(
      (config) => {
        console.log(`[Lokalise API] ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        console.error('[Lokalise API] Request error:', error);
        return Promise.reject(error);
      }
    );

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => {
        console.log(`[Lokalise API] ${response.status} ${response.config.url}`);
        return response;
      },
      (error) => {
        console.error('[Lokalise API] Response error:', error.response?.data || error.message);
        return Promise.reject(error);
      }
    );
  }

  /**
   * Get all projects with pagination support
   */
  async getProjects(page: number = 1, limit: number = 100): Promise<ProjectsResponse> {
    const response: AxiosResponse<ProjectsResponse> = await this.client.get('/projects', {
      params: { page, limit }
    });
    return response.data;
  }

  /**
   * Find a project by name (case-insensitive)
   */
  async findProjectByName(projectName: string): Promise<ProjectData | null> {
    let page = 1;
    let found: ProjectData | undefined = undefined;

    while (!found) {
      const data = await this.getProjects(page, 100);
      const projects = data.projects;
      
      found = projects.find(p => p.name.toLowerCase() === projectName.toLowerCase());
      
      if (found || projects.length < 100) break;
      page++;
    }

    return found || null;
  }

  /**
   * Create keys in a project
   */
  async createKeys(projectId: string, request: CreateKeysRequest): Promise<CreateKeysResponse> {
    const response: AxiosResponse<CreateKeysResponse> = await this.client.post(
      `/projects/${projectId}/keys`,
      request
    );
    return response.data;
  }

  /**
   * Get project details by ID
   */
  async getProject(projectId: string): Promise<ProjectData> {
    const response: AxiosResponse<{ project: ProjectData }> = await this.client.get(
      `/projects/${projectId}`
    );
    return response.data.project;
  }

  /**
   * Test the API connection
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.getProjects(1, 1);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get the configured API key (masked for security)
   */
  getApiKeyInfo(): string {
    const token = this.client.defaults.headers['X-Api-Token'] as string;
    if (!token) return 'Not configured';
    return `${token.substring(0, 8)}...${token.substring(token.length - 4)}`;
  }

  /**
   * Update API key
   */
  updateApiKey(newApiKey: string): void {
    if (!newApiKey) {
      throw new Error('API key cannot be empty');
    }
    this.client.defaults.headers['X-Api-Token'] = newApiKey;
  }
}