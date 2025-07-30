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

// New types for extended functionality
export interface ExistingKey {
  key_id: number;
  key_name: string | { [platform: string]: string };
  platforms: string[];
  description?: string;
  tags?: string[];
  created_at: string;
  translations?: Array<{
    language_iso: string;
    translation: string;
    is_fuzzy: boolean;
    is_reviewed: boolean;
  }>;
}

export interface KeysResponse {
  keys: ExistingKey[];
  project_id: string;
}

export interface UpdateKeyRequest {
  platforms?: string[];
  description?: string;
  tags?: string[];
  translations?: Translation[];
}

export interface UpdateKeysRequest {
  keys: Array<{
    key_id: number;
    platforms?: string[];
    description?: string;
    tags?: string[];
    translations?: Translation[];
  }>;
}

export interface DeleteKeysRequest {
  keys: number[]; // Array of key IDs
}

export interface UpdatedKey {
  key_id: number;
  key_name: string;
  platforms: string[];
  updated_at: string;
}

export interface UpdateKeysResponse {
  keys: UpdatedKey[];
  project_id: string;
  errors?: Array<{
    message: string;
    code: number;
    key_id?: number;
  }>;
}

export interface DeleteKeysResponse {
  project_id: string;
  keys_removed: boolean; // API actually returns boolean, not number
  keys_locked?: number;
  errors?: Array<{
    message: string;
    code: number;
    key_id?: number;
  }>;
}

export interface TranslationDetails {
  translation_id: number;
  key_id: number;
  language_iso: string;
  translation: string;
  is_fuzzy: boolean;
  is_reviewed: boolean;
  reviewed_by?: number;
  reviewed_at?: string;
  words: number;
  custom_translation_statuses: Array<{
    status_id: number;
    title: string;
    color: string;
  }>;
}

export interface TranslationsResponse {
  translations: TranslationDetails[];
  project_id: string;
}

export interface UpdateTranslationRequest {
  translation: string;
  is_fuzzy?: boolean;
  is_reviewed?: boolean;
}

// New types for search functionality
export interface SearchCriteria {
  keyNamePattern?: string; // Partial match in key name
  keyNameExact?: string; // Exact key name match
  tags?: string[]; // Must have these tags
  platforms?: string[]; // Must be on these platforms
  translationStatus?: TranslationStatus; // Translation status filter
  languages?: string[]; // Filter by specific languages
  hasDescription?: boolean; // Has or doesn't have description
  hasComments?: boolean; // Has or doesn't have comments
  createdAfter?: string; // Created after date (ISO string)
  createdBefore?: string; // Created before date (ISO string)
  modifiedAfter?: string; // Modified after date (ISO string)
  modifiedBefore?: string; // Modified before date (ISO string)
  descriptionPattern?: string; // Partial match in description
  wordCountMin?: number; // Minimum word count
  wordCountMax?: number; // Maximum word count
}

export type TranslationStatus =
  | "translated" // Has non-empty translation
  | "untranslated" // Empty or missing translation
  | "fuzzy" // Marked as fuzzy/needs review
  | "reviewed" // Marked as reviewed
  | "any"; // Any status

export interface SearchResult {
  key_id: number;
  key_name: string | { [platform: string]: string };
  platforms: string[];
  description?: string;
  tags?: string[];
  created_at: string;
  modified_at?: string;
  translations: Array<{
    language_iso: string;
    translation: string;
    is_fuzzy: boolean;
    is_reviewed: boolean;
    words: number;
  }>;
  matchReasons: string[]; // Why this key matched the search criteria
}

export interface SearchResponse {
  results: SearchResult[];
  total_found: number;
  criteria_used: SearchCriteria;
  project_id: string;
  project_name: string;
}

export interface SearchKeysParams {
  apiKey: string;
  projectName: string;
  criteria: SearchCriteria;
  limit?: number;
}

// Application Types
export interface Key {
  keyName: string;
  defaultValue?: string;
  platforms?: string[];
  description?: string;
  tags?: string[];
}

// New application types for extended functionality
export interface UpdateKey {
  keyName: string;
  platforms?: string[];
  description?: string;
  tags?: string[];
  translations?: {
    en?: string;
    de?: string;
    [languageCode: string]: string | undefined;
  };
}

export interface DeleteKey {
  keyName: string;
}

export interface ManageTranslation {
  keyName: string;
  translations: {
    en?: string;
    de?: string;
    [languageCode: string]: string | undefined;
  };
  markAsReviewed?: boolean;
}

export interface AddKeysParams {
  apiKey: string;
  projectName: string;
  keys: Key[];
}

export interface UpdateKeysParams {
  apiKey: string;
  projectName: string;
  keys: UpdateKey[];
}

export interface DeleteKeysParams {
  apiKey: string;
  projectName: string;
  keys: DeleteKey[];
}

export interface ManageTranslationsParams {
  apiKey: string;
  projectName: string;
  translations: ManageTranslation[];
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

export interface MCPUpdateToolArguments {
  projectName: string;
  keys: UpdateKey[];
}

export interface MCPDeleteToolArguments {
  projectName: string;
  keys: DeleteKey[];
}

export interface MCPTranslationToolArguments {
  projectName: string;
  translations: ManageTranslation[];
}

export interface MCPSearchToolArguments {
  projectName: string;
  criteria: SearchCriteria;
  limit?: number;
}

export interface MCPSearchProjectsToolArguments {
  searchTerm?: string;
}

export interface MCPToolResponse {
  content: Array<{
    type: "text";
    text: string;
  }>;
}

export interface MCPErrorResponse extends MCPToolResponse {
  isError: true;
}

export interface MCPSuccessResponse extends MCPToolResponse {
  isError: false;
  result?:
    | CreateKeysResponse
    | UpdateKeysResponse
    | DeleteKeysResponse
    | SearchResponse;
}

// Constants
export const ALLOWED_PLATFORMS = ["web", "ios", "android", "other"] as const;
export type Platform = (typeof ALLOWED_PLATFORMS)[number];

export const SUPPORTED_LANGUAGES = ["en", "de"] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const TRANSLATION_STATUSES = [
  "translated",
  "untranslated",
  "fuzzy",
  "reviewed",
  "any",
] as const;
