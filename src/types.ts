// Lokalise API Types
export interface ProjectData {
  project_id: string;
  name: string;
  description?: string;
  created_at: string;
  created_by: number;
  created_by_email: string;
}

export interface LokaliseApiResponse<T> {
  data: T;
}

export interface ProjectsResponse {
  projects: ProjectData[];
}

export interface Translation {
  language_iso: string;
  translation: string;
}

export interface KeyPayload {
  key_name: string;
  platforms: string[];
  translations?: Translation[];
  description?: string;
  tags?: string[];
}

export interface CreateKeysRequest {
  keys: KeyPayload[];
}

export interface CreatedKey {
  key_id: number;
  key_name: string;
  platforms: string[];
  created_at: string;
}

export interface CreateKeysResponse {
  keys: CreatedKey[];
  project_id: string;
  errors?: Array<{
    message: string;
    code: number;
    key?: KeyPayload;
  }>;
}

// Application Types
export interface Key {
  keyName: string;
  defaultValue?: string;
  platforms?: string[];
  description?: string;
  tags?: string[];
}

export interface AddKeysParams {
  apiKey: string;
  projectName: string;
  keys: Key[];
}

export interface ParsedCommand {
  projectName: string | null;
  keyName: string | null;
  defaultValue: string | null;
  platforms: string[] | null;
}

// MCP Types
export interface MCPToolArguments {
  projectName: string;
  keys: Key[];
}

export interface MCPToolResponse {
  content: Array<{
    type: 'text';
    text: string;
  }>;
}

export interface MCPErrorResponse extends MCPToolResponse {
  isError: true;
}

export interface MCPSuccessResponse extends MCPToolResponse {
  isError: false;
  result?: CreateKeysResponse;
}

// Constants
export const ALLOWED_PLATFORMS = ['web', 'ios', 'android', 'other'] as const;
export type Platform = typeof ALLOWED_PLATFORMS[number];