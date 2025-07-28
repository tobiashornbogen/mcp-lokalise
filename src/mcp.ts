import 'dotenv/config';
import { LokaliseApiClient } from './lokalise-client.js';
import type {
  Key,
  AddKeysParams,
  KeyPayload,
  ParsedCommand,
  CreateKeysResponse,
  Platform
} from './types.js';
import { ALLOWED_PLATFORMS } from './types.js';

/**
 * Parse a natural language command into structured data
 */
export function parseCommand(command: string): ParsedCommand {
  const projectMatch = command.match(/project name is ['"]?([\w\s-]+)['"]?/i);
  const keyMatch = command.match(/key named ['"]?([\w-]+)['"]?/i);
  const valueMatch = command.match(/default value is ['"]?([\w\s-]+)['"]?/i);
  const platformsMatch = command.match(/platforms? (are|is) ([\w,\s-]+)/i);
  
  let platforms: string[] | null = null;
  if (platformsMatch && platformsMatch[2]) {
    platforms = platformsMatch[2].split(',').map(p => p.trim().toLowerCase()).filter(Boolean);
  }
  
  return {
    projectName: projectMatch ? projectMatch[1].trim() : null,
    keyName: keyMatch ? keyMatch[1].trim() : null,
    defaultValue: valueMatch ? valueMatch[1].trim() : null,
    platforms,
  };
}

/**
 * Create a configured Lokalise API client
 */
export function createLokaliseClient(apiKey?: string): LokaliseApiClient {
  const key = apiKey || process.env.LOKALISE_API_KEY;
  if (!key) {
    throw new Error('Lokalise API key is required. Set LOKALISE_API_KEY environment variable or pass it as parameter.');
  }
  return new LokaliseApiClient(key);
}

export async function findProjectIdByName(apiKey: string, projectName: string): Promise<string | null> {
  const client = createLokaliseClient(apiKey);
  const project = await client.findProjectByName(projectName);
  return project ? project.project_id : null;
}

export async function addKeysToProject({ apiKey, projectName, keys }: AddKeysParams): Promise<CreateKeysResponse> {
  if (!apiKey) {
    throw new Error('LOKALISE_API_KEY not set in .env file or input.');
  }
  if (!projectName || !Array.isArray(keys) || keys.length === 0) {
    throw new Error('Missing projectName or keys.');
  }
  
  const client = createLokaliseClient(apiKey);
  const project = await client.findProjectByName(projectName);
  if (!project) {
    throw new Error(`Project named "${projectName}" not found.`);
  }
  
  const keyPayloads: KeyPayload[] = keys.map(({ keyName, defaultValue, platforms, description, tags }) => {
    const usedPlatforms = (platforms && platforms.length > 0)
      ? platforms.filter((p): p is Platform => ALLOWED_PLATFORMS.includes(p as Platform))
      : [...ALLOWED_PLATFORMS];
      
    if (usedPlatforms.length === 0) {
      throw new Error('No valid platforms specified for key: ' + keyName);
    }
    
    const payload: KeyPayload = {
      key_name: keyName,
      platforms: usedPlatforms
    };
    
    if (defaultValue) {
      payload.translations = [
        {
          language_iso: 'en',
          translation: defaultValue
        }
      ];
    }
    
    if (description) {
      payload.description = description;
    }
    
    if (tags && tags.length > 0) {
      payload.tags = tags;
    }
    
    return payload;
  });
  
  return await client.createKeys(project.project_id, { keys: keyPayloads });
}