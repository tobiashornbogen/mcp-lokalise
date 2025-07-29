import axios, { AxiosInstance, AxiosResponse } from "axios";
import type {
  ProjectsResponse,
  ProjectData,
  CreateKeysRequest,
  CreateKeysResponse,
  KeysResponse,
  UpdateKeysRequest,
  UpdateKeysResponse,
  UpdateKeyRequest,
  DeleteKeysRequest,
  DeleteKeysResponse,
  TranslationsResponse,
  UpdateTranslationRequest,
  SearchCriteria,
  SearchResult,
  TranslationStatus,
} from "./types.js";

export class LokaliseApiClient {
  private client: AxiosInstance;
  private readonly baseURL = "https://api.lokalise.com/api2";

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error("Lokalise API key is required");
    }

    this.client = axios.create({
      baseURL: this.baseURL,
      headers: {
        "X-Api-Token": apiKey,
        "Content-Type": "application/json",
      },
      timeout: 30000, // 30 second timeout
    });

    // Add request interceptor for logging
    this.client.interceptors.request.use(
      (config) => {
        console.log(
          `[Lokalise API] ${config.method?.toUpperCase()} ${config.url}`
        );
        return config;
      },
      (error) => {
        console.error("[Lokalise API] Request error:", error);
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
        console.error(
          "[Lokalise API] Response error:",
          error.response?.data || error.message
        );
        return Promise.reject(error);
      }
    );
  }

  /**
   * Get all projects with pagination support
   */
  async getProjects(
    page: number = 1,
    limit: number = 100
  ): Promise<ProjectsResponse> {
    const response: AxiosResponse<ProjectsResponse> = await this.client.get(
      "/projects",
      {
        params: { page, limit },
      }
    );
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

      found = projects.find(
        (p) => p.name.toLowerCase() === projectName.toLowerCase()
      );

      if (found || projects.length < 100) break;
      page++;
    }

    return found || null;
  }

  /**
   * Create keys in a project
   */
  async createKeys(
    projectId: string,
    request: CreateKeysRequest
  ): Promise<CreateKeysResponse> {
    const response: AxiosResponse<CreateKeysResponse> = await this.client.post(
      `/projects/${projectId}/keys`,
      request
    );
    return response.data;
  }

  /**
   * Get all keys in a project with pagination support
   */
  async getKeys(
    projectId: string,
    page: number = 1,
    limit: number = 100,
    includeTranslations: boolean = true
  ): Promise<KeysResponse> {
    const response: AxiosResponse<KeysResponse> = await this.client.get(
      `/projects/${projectId}/keys`,
      {
        params: {
          page,
          limit,
          include_translations: includeTranslations ? 1 : 0,
        },
      }
    );
    return response.data;
  }

  /**
   * Find a key by name in a project
   */
  async findKeyByName(
    projectId: string,
    keyName: string
  ): Promise<{
    key_id: number;
    key_name: string | { [platform: string]: string };
  } | null> {
    let page = 1;
    let found:
      | { key_id: number; key_name: string | { [platform: string]: string } }
      | undefined = undefined;

    while (!found) {
      const data = await this.getKeys(projectId, page, 100, false);
      const keys = data.keys;

      // Handle both string and object key_name formats from Lokalise API
      found = keys.find((k) => {
        if (typeof k.key_name === "string") {
          return k.key_name === keyName;
        } else if (typeof k.key_name === "object" && k.key_name !== null) {
          // Check if any platform has the matching key name
          const keyNameObj = k.key_name as any;
          return Object.values(keyNameObj).includes(keyName);
        }
        return false;
      });

      if (found || keys.length < 100) break;
      page++;
    }

    return found || null;
  }

  /**
   * Search for keys based on criteria
   */
  async searchKeys(
    projectId: string,
    criteria: SearchCriteria,
    limit: number = 100
  ): Promise<SearchResult[]> {
    const results: SearchResult[] = [];
    let page = 1;
    let totalProcessed = 0;

    while (totalProcessed < limit) {
      const data = await this.getKeys(
        projectId,
        page,
        Math.min(100, limit - totalProcessed),
        true
      );
      const keys = data.keys;

      if (keys.length === 0) break;

      for (const key of keys) {
        if (results.length >= limit) break;

        const matchResult = this.evaluateKeyMatch(key, criteria);
        if (matchResult.matches) {
          const searchResult: SearchResult = {
            key_id: key.key_id,
            key_name: key.key_name,
            platforms: key.platforms,
            description: key.description,
            tags: key.tags,
            created_at: key.created_at,
            modified_at: key.created_at, // Lokalise doesn't always provide modified_at
            translations:
              key.translations?.map((t) => ({
                language_iso: t.language_iso,
                translation: t.translation,
                is_fuzzy: t.is_fuzzy,
                is_reviewed: t.is_reviewed,
                words: t.translation ? t.translation.split(" ").length : 0,
              })) || [],
            matchReasons: matchResult.reasons,
          };
          results.push(searchResult);
        }
      }

      totalProcessed += keys.length;
      if (keys.length < 100) break; // No more pages
      page++;
    }

    return results;
  }

  /**
   * Evaluate if a key matches the search criteria
   */
  private evaluateKeyMatch(
    key: any,
    criteria: SearchCriteria
  ): { matches: boolean; reasons: string[] } {
    const reasons: string[] = [];
    let matches = true;

    // Helper function to get key name as string
    const getKeyNameString = (keyName: any): string => {
      if (typeof keyName === "string") return keyName;
      if (typeof keyName === "object" && keyName !== null) {
        return Object.values(keyName)[0] as string; // Use first platform name
      }
      return "";
    };

    const keyNameString = getKeyNameString(key.key_name);

    // Key name pattern matching
    if (criteria.keyNamePattern) {
      const pattern = criteria.keyNamePattern.toLowerCase();
      if (keyNameString.toLowerCase().includes(pattern)) {
        reasons.push(`Key name contains "${criteria.keyNamePattern}"`);
      } else {
        matches = false;
      }
    }

    // Exact key name matching
    if (criteria.keyNameExact) {
      if (keyNameString === criteria.keyNameExact) {
        reasons.push(`Key name exactly matches "${criteria.keyNameExact}"`);
      } else {
        matches = false;
      }
    }

    // Tags filtering
    if (criteria.tags && criteria.tags.length > 0) {
      const keyTags = key.tags || [];
      const hasAllTags = criteria.tags.every((tag) => keyTags.includes(tag));
      if (hasAllTags) {
        reasons.push(`Has tags: ${criteria.tags.join(", ")}`);
      } else {
        matches = false;
      }
    }

    // Platforms filtering
    if (criteria.platforms && criteria.platforms.length > 0) {
      const hasAllPlatforms = criteria.platforms.every((platform) =>
        key.platforms.includes(platform)
      );
      if (hasAllPlatforms) {
        reasons.push(
          `Available on platforms: ${criteria.platforms.join(", ")}`
        );
      } else {
        matches = false;
      }
    }

    // Description filtering
    if (criteria.hasDescription !== undefined) {
      const hasDesc = Boolean(
        key.description && key.description.trim().length > 0
      );
      if (criteria.hasDescription === hasDesc) {
        reasons.push(hasDesc ? "Has description" : "No description");
      } else {
        matches = false;
      }
    }

    // Description pattern matching
    if (criteria.descriptionPattern) {
      const desc = key.description || "";
      const pattern = criteria.descriptionPattern.toLowerCase();
      if (desc.toLowerCase().includes(pattern)) {
        reasons.push(`Description contains "${criteria.descriptionPattern}"`);
      } else {
        matches = false;
      }
    }

    // Translation status filtering
    if (criteria.translationStatus && criteria.translationStatus !== "any") {
      const translations = key.translations || [];
      const languagesToCheck = criteria.languages || ["en", "de"];

      const statusMatch = this.checkTranslationStatus(
        translations,
        criteria.translationStatus,
        languagesToCheck
      );
      if (statusMatch.matches) {
        reasons.push(statusMatch.reason);
      } else {
        matches = false;
      }
    }

    // Date filtering
    if (criteria.createdAfter) {
      const createdDate = new Date(key.created_at);
      const afterDate = new Date(criteria.createdAfter);
      if (createdDate >= afterDate) {
        reasons.push(`Created after ${criteria.createdAfter}`);
      } else {
        matches = false;
      }
    }

    if (criteria.createdBefore) {
      const createdDate = new Date(key.created_at);
      const beforeDate = new Date(criteria.createdBefore);
      if (createdDate <= beforeDate) {
        reasons.push(`Created before ${criteria.createdBefore}`);
      } else {
        matches = false;
      }
    }

    return { matches, reasons };
  }

  /**
   * Check translation status for specific languages
   */
  private checkTranslationStatus(
    translations: any[],
    status: TranslationStatus,
    languages: string[]
  ): { matches: boolean; reason: string } {
    const relevantTranslations = translations.filter((t) =>
      languages.includes(t.language_iso)
    );

    switch (status) {
      case "translated":
        const allTranslated = relevantTranslations.every(
          (t) => t.translation && t.translation.trim().length > 0
        );
        return {
          matches: allTranslated,
          reason: allTranslated
            ? `Fully translated in ${languages.join(", ")}`
            : "",
        };

      case "untranslated":
        const anyUntranslated = relevantTranslations.some(
          (t) => !t.translation || t.translation.trim().length === 0
        );
        return {
          matches: anyUntranslated,
          reason: anyUntranslated
            ? `Has untranslated content in ${languages.join(", ")}`
            : "",
        };

      case "fuzzy":
        const anyFuzzy = relevantTranslations.some((t) => t.is_fuzzy);
        return {
          matches: anyFuzzy,
          reason: anyFuzzy
            ? `Has fuzzy translations in ${languages.join(", ")}`
            : "",
        };

      case "reviewed":
        const allReviewed = relevantTranslations.every((t) => t.is_reviewed);
        return {
          matches: allReviewed,
          reason: allReviewed
            ? `All translations reviewed in ${languages.join(", ")}`
            : "",
        };

      default:
        return { matches: true, reason: "Any translation status" };
    }
  }

  /**
   * Update a single key in a project
   */
  async updateKey(
    projectId: string,
    keyId: number,
    request: UpdateKeyRequest
  ): Promise<any> {
    const response: AxiosResponse<any> = await this.client.put(
      `/projects/${projectId}/keys/${keyId}`,
      request
    );
    return response.data;
  }

  /**
   * Update multiple keys in a project (bulk operation)
   */
  async updateKeys(
    projectId: string,
    request: UpdateKeysRequest
  ): Promise<UpdateKeysResponse> {
    const response: AxiosResponse<UpdateKeysResponse> = await this.client.put(
      `/projects/${projectId}/keys`,
      request
    );
    return response.data;
  }

  /**
   * Delete a single key from a project
   */
  async deleteKey(projectId: string, keyId: number): Promise<any> {
    const response: AxiosResponse<any> = await this.client.delete(
      `/projects/${projectId}/keys/${keyId}`
    );
    return response.data;
  }

  /**
   * Delete multiple keys from a project (bulk operation)
   */
  async deleteKeys(
    projectId: string,
    request: DeleteKeysRequest
  ): Promise<DeleteKeysResponse> {
    const response: AxiosResponse<DeleteKeysResponse> =
      await this.client.delete(`/projects/${projectId}/keys`, {
        data: request,
      });
    return response.data;
  }

  /**
   * Get all translations for a project
   */
  async getTranslations(
    projectId: string,
    page: number = 1,
    limit: number = 100
  ): Promise<TranslationsResponse> {
    const response: AxiosResponse<TranslationsResponse> = await this.client.get(
      `/projects/${projectId}/translations`,
      {
        params: { page, limit },
      }
    );
    return response.data;
  }

  /**
   * Update a specific translation
   */
  async updateTranslation(
    projectId: string,
    translationId: number,
    request: UpdateTranslationRequest
  ): Promise<any> {
    const response: AxiosResponse<any> = await this.client.put(
      `/projects/${projectId}/translations/${translationId}`,
      request
    );
    return response.data;
  }

  /**
   * Get translations for a specific key across all languages
   */
  async getKeyTranslations(
    projectId: string,
    keyId: number
  ): Promise<TranslationsResponse> {
    const response: AxiosResponse<TranslationsResponse> = await this.client.get(
      `/projects/${projectId}/translations`,
      {
        params: {
          filter_key_id: keyId,
          limit: 500, // Get all translations for this key
        },
      }
    );
    return response.data;
  }

  /**
   * Get project details by ID
   */
  async getProject(projectId: string): Promise<ProjectData> {
    const response: AxiosResponse<{ project: ProjectData }> =
      await this.client.get(`/projects/${projectId}`);
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
    const token = this.client.defaults.headers["X-Api-Token"] as string;
    if (!token) return "Not configured";
    return `${token.substring(0, 8)}...${token.substring(token.length - 4)}`;
  }

  /**
   * Update API key
   */
  updateApiKey(newApiKey: string): void {
    if (!newApiKey) {
      throw new Error("API key cannot be empty");
    }
    this.client.defaults.headers["X-Api-Token"] = newApiKey;
  }
}
