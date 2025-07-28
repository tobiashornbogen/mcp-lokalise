// Main exports
export { parseCommand, findProjectIdByName, addKeysToProject, createLokaliseClient } from './mcp.js';
export { LokaliseApiClient } from './lokalise-client.js';

// Type exports
export type {
  ProjectData,
  LokaliseApiResponse,
  ProjectsResponse,
  Translation,
  KeyPayload,
  CreateKeysRequest,
  CreatedKey,
  CreateKeysResponse,
  Key,
  AddKeysParams,
  ParsedCommand,
  MCPToolArguments,
  MCPToolResponse,
  MCPErrorResponse,
  MCPSuccessResponse,
  Platform
} from './types.js';

export { ALLOWED_PLATFORMS } from './types.js';