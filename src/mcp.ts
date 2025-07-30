import "dotenv/config";
import { LokaliseApiClient } from "./lokalise-client.js";
import type {
  Key,
  AddKeysParams,
  KeyPayload,
  ParsedCommand,
  CreateKeysResponse,
  Platform,
  UpdateKey,
  UpdateKeysParams,
  UpdateKeysResponse,
  DeleteKey,
  DeleteKeysParams,
  DeleteKeysResponse,
  ManageTranslation,
  ManageTranslationsParams,
  SupportedLanguage,
  SearchKeysParams,
  SearchResponse,
  SearchCriteria,
  ProjectData,
} from "./types.js";
import { ALLOWED_PLATFORMS, SUPPORTED_LANGUAGES } from "./types.js";

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
    platforms = platformsMatch[2]
      .split(",")
      .map((p) => p.trim().toLowerCase())
      .filter(Boolean);
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
    throw new Error(
      "Lokalise API key is required. Set LOKALISE_API_KEY environment variable or pass it as parameter."
    );
  }
  return new LokaliseApiClient(key);
}

export async function findProjectIdByName(
  apiKey: string,
  projectName: string
): Promise<string | null> {
  const client = createLokaliseClient(apiKey);
  const project = await client.findProjectByName(projectName);
  return project ? project.project_id : null;
}

export async function addKeysToProject({
  apiKey,
  projectName,
  keys,
}: AddKeysParams): Promise<CreateKeysResponse> {
  if (!apiKey) {
    throw new Error("LOKALISE_API_KEY not set in .env file or input.");
  }
  if (!projectName || !Array.isArray(keys) || keys.length === 0) {
    throw new Error("Missing projectName or keys.");
  }

  // Validate key names are not empty
  for (const key of keys) {
    if (!key.keyName || key.keyName.trim().length === 0) {
      throw new Error("Key name cannot be empty or contain only whitespace.");
    }
  }

  const client = createLokaliseClient(apiKey);
  const project = await client.findProjectByName(projectName);
  if (!project) {
    throw new Error(`Project named "${projectName}" not found.`);
  }

  const keyPayloads: KeyPayload[] = keys.map(
    ({ keyName, defaultValue, platforms, description, tags }) => {
      const usedPlatforms =
        platforms && platforms.length > 0
          ? platforms.filter((p): p is Platform =>
              ALLOWED_PLATFORMS.includes(p as Platform)
            )
          : [...ALLOWED_PLATFORMS];

      if (usedPlatforms.length === 0) {
        throw new Error(
          `No valid platforms specified for key: ${keyName}. Valid platforms are: ${ALLOWED_PLATFORMS.join(
            ", "
          )}`
        );
      }

      const payload: KeyPayload = {
        key_name: keyName,
        platforms: usedPlatforms,
      };

      if (defaultValue) {
        payload.translations = [
          {
            language_iso: "en",
            translation: defaultValue,
          },
        ];
      }

      if (description) {
        payload.description = description;
      }

      if (tags && tags.length > 0) {
        payload.tags = tags;
      }

      return payload;
    }
  );

  try {
    return await client.createKeys(project.project_id, { keys: keyPayloads });
  } catch (error: any) {
    if (error.response?.status === 400) {
      throw new Error(
        `Invalid key data: ${error.response?.data?.message || error.message}`
      );
    }
    throw error;
  }
}

/**
 * Update existing keys in a project
 */
export async function updateKeysInProject({
  apiKey,
  projectName,
  keys,
}: UpdateKeysParams): Promise<UpdateKeysResponse> {
  if (!apiKey) {
    throw new Error("LOKALISE_API_KEY not set in .env file or input.");
  }
  if (!projectName || !Array.isArray(keys) || keys.length === 0) {
    throw new Error("Missing projectName or keys.");
  }

  const client = createLokaliseClient(apiKey);
  const project = await client.findProjectByName(projectName);
  if (!project) {
    throw new Error(`Project named "${projectName}" not found.`);
  }

  const updatePayloads = [];

  for (const updateKey of keys) {
    const { keyName, platforms, description, tags, translations } = updateKey;

    // Find the key ID by name
    const existingKey = await client.findKeyByName(project.project_id, keyName);
    if (!existingKey) {
      throw new Error(
        `Key named "${keyName}" not found in project "${projectName}".`
      );
    }

    const payload: any = {
      key_id: existingKey.key_id,
    };

    if (platforms && platforms.length > 0) {
      const validPlatforms = platforms.filter((p): p is Platform =>
        ALLOWED_PLATFORMS.includes(p as Platform)
      );
      if (validPlatforms.length === 0) {
        throw new Error("No valid platforms specified for key: " + keyName);
      }
      payload.platforms = validPlatforms;
    }

    if (description !== undefined) {
      payload.description = description;
    }

    if (tags !== undefined) {
      payload.tags = tags;
    }

    if (translations) {
      const translationArray = [];
      for (const [langCode, translationValue] of Object.entries(translations)) {
        if (
          translationValue !== undefined &&
          SUPPORTED_LANGUAGES.includes(langCode as SupportedLanguage)
        ) {
          translationArray.push({
            language_iso: langCode,
            translation: translationValue,
          });
        }
      }
      if (translationArray.length > 0) {
        payload.translations = translationArray;
      }
    }

    updatePayloads.push(payload);
  }

  return await client.updateKeys(project.project_id, { keys: updatePayloads });
}

/**
 * Delete keys from a project
 */
export async function deleteKeysFromProject({
  apiKey,
  projectName,
  keys,
}: DeleteKeysParams): Promise<DeleteKeysResponse> {
  if (!apiKey) {
    throw new Error("LOKALISE_API_KEY not set in .env file or input.");
  }
  if (!projectName || !Array.isArray(keys) || keys.length === 0) {
    throw new Error("Missing projectName or keys.");
  }

  const client = createLokaliseClient(apiKey);
  const project = await client.findProjectByName(projectName);
  if (!project) {
    throw new Error(`Project named "${projectName}" not found.`);
  }

  const keyIds = [];

  for (const deleteKey of keys) {
    const { keyName } = deleteKey;

    // Find the key ID by name
    const existingKey = await client.findKeyByName(project.project_id, keyName);
    if (!existingKey) {
      throw new Error(
        `Key named "${keyName}" not found in project "${projectName}".`
      );
    }

    keyIds.push(existingKey.key_id);
  }

  return await client.deleteKeys(project.project_id, { keys: keyIds });
}

/**
 * Manage translations for existing keys in multiple languages
 */
export async function manageTranslations({
  apiKey,
  projectName,
  translations,
}: ManageTranslationsParams): Promise<any> {
  if (!apiKey) {
    throw new Error("LOKALISE_API_KEY not set in .env file or input.");
  }
  if (
    !projectName ||
    !Array.isArray(translations) ||
    translations.length === 0
  ) {
    throw new Error("Missing projectName or translations.");
  }

  const client = createLokaliseClient(apiKey);
  const project = await client.findProjectByName(projectName);
  if (!project) {
    throw new Error(`Project named "${projectName}" not found.`);
  }

  const results = [];

  for (const translationItem of translations) {
    const {
      keyName,
      translations: keyTranslations,
      markAsReviewed,
    } = translationItem;

    // Find the key ID by name
    const existingKey = await client.findKeyByName(project.project_id, keyName);
    if (!existingKey) {
      throw new Error(
        `Key named "${keyName}" not found in project "${projectName}".`
      );
    }

    // Get existing translations for this key
    const existingTranslations = await client.getKeyTranslations(
      project.project_id,
      existingKey.key_id
    );

    // Update each language translation
    for (const [langCode, translationValue] of Object.entries(
      keyTranslations
    )) {
      if (
        translationValue !== undefined &&
        SUPPORTED_LANGUAGES.includes(langCode as SupportedLanguage)
      ) {
        // Find existing translation for this language
        const existingTranslation = existingTranslations.translations.find(
          (t) => t.language_iso === langCode
        );

        if (existingTranslation) {
          // Update existing translation
          const updateResult = await client.updateTranslation(
            project.project_id,
            existingTranslation.translation_id,
            {
              translation: translationValue,
              is_reviewed: markAsReviewed || false,
            }
          );
          results.push({
            keyName,
            language: langCode,
            action: "updated",
            translationId: existingTranslation.translation_id,
            result: updateResult,
          });
        } else {
          // If translation doesn't exist, we need to create it via key update
          // This is a limitation - we'll use the update key method with translations
          await client.updateKey(project.project_id, existingKey.key_id, {
            translations: [
              {
                language_iso: langCode,
                translation: translationValue,
              },
            ],
          });
          results.push({
            keyName,
            language: langCode,
            action: "created",
            keyId: existingKey.key_id,
          });
        }
      }
    }
  }

  return {
    project_id: project.project_id,
    results,
    summary: {
      keysProcessed: translations.length,
      translationsProcessed: results.length,
    },
  };
}

/**
 * Search for keys in a project based on criteria
 */
export async function searchKeysInProject({
  apiKey,
  projectName,
  criteria,
  limit = 50,
}: SearchKeysParams): Promise<SearchResponse> {
  if (!apiKey) {
    throw new Error("LOKALISE_API_KEY not set in .env file or input.");
  }
  if (!projectName || !criteria) {
    throw new Error("Missing projectName or search criteria.");
  }

  // Validate limit parameter
  if (limit <= 0) {
    throw new Error("Limit must be a positive number greater than 0.");
  }
  if (limit > 200) {
    limit = 200; // Cap at maximum allowed
  }

  const client = createLokaliseClient(apiKey);
  const project = await client.findProjectByName(projectName);
  if (!project) {
    throw new Error(`Project named "${projectName}" not found.`);
  }

  // Validate search criteria with warnings
  const validatedCriteria = validateSearchCriteria(criteria);

  // Perform the search
  const searchResults = await client.searchKeys(
    project.project_id,
    validatedCriteria,
    limit
  );

  return {
    results: searchResults,
    total_found: searchResults.length,
    criteria_used: validatedCriteria,
    project_id: project.project_id,
    project_name: project.name,
  };
}

/**
 * Search for available projects
 */
export async function searchAvailableProjects(
  apiKey: string,
  searchTerm?: string
): Promise<ProjectData[]> {
  if (!apiKey) {
    throw new Error("LOKALISE_API_KEY not set in .env file or input.");
  }

  const client = createLokaliseClient(apiKey);
  let page = 1;
  let allProjects: ProjectData[] = [];

  // Get all projects with pagination
  while (true) {
    const data = await client.getProjects(page, 100);
    const projects = data.projects;

    if (projects.length === 0) break;

    allProjects = allProjects.concat(projects);

    if (projects.length < 100) break; // No more pages
    page++;
  }

  // Filter by search term if provided
  if (searchTerm && searchTerm.trim().length > 0) {
    const term = searchTerm.toLowerCase().trim();
    allProjects = allProjects.filter(
      (project) =>
        project.name.toLowerCase().includes(term) ||
        (project.description &&
          project.description.toLowerCase().includes(term))
    );
  }

  return allProjects;
}

/**
 * Validate and normalize search criteria
 */
function validateSearchCriteria(criteria: SearchCriteria): SearchCriteria {
  const validated: SearchCriteria = { ...criteria };
  const warnings: string[] = [];

  // Validate platforms
  if (validated.platforms && validated.platforms.length > 0) {
    const originalPlatforms = [...validated.platforms];
    validated.platforms = validated.platforms.filter((p): p is Platform =>
      ALLOWED_PLATFORMS.includes(p as Platform)
    );

    const invalidPlatforms = originalPlatforms.filter(
      (p) => !ALLOWED_PLATFORMS.includes(p as Platform)
    );
    if (invalidPlatforms.length > 0) {
      console.warn(
        `Invalid platforms ignored: ${invalidPlatforms.join(
          ", "
        )}. Valid platforms: ${ALLOWED_PLATFORMS.join(", ")}`
      );
    }
  }

  // Validate languages
  if (validated.languages && validated.languages.length > 0) {
    const originalLanguages = [...validated.languages];
    validated.languages = validated.languages.filter(
      (l): l is SupportedLanguage =>
        SUPPORTED_LANGUAGES.includes(l as SupportedLanguage)
    );

    const invalidLanguages = originalLanguages.filter(
      (l) => !SUPPORTED_LANGUAGES.includes(l as SupportedLanguage)
    );
    if (invalidLanguages.length > 0) {
      console.warn(
        `Invalid languages ignored: ${invalidLanguages.join(
          ", "
        )}. Supported languages: ${SUPPORTED_LANGUAGES.join(", ")}`
      );
    }
  } else {
    // Default to supported languages if none specified
    validated.languages = [...SUPPORTED_LANGUAGES];
  }

  // Validate translation status
  if (
    validated.translationStatus &&
    !["translated", "untranslated", "fuzzy", "reviewed", "any"].includes(
      validated.translationStatus
    )
  ) {
    console.warn(
      `Invalid translation status ignored: ${validated.translationStatus}. Valid values: translated, untranslated, fuzzy, reviewed, any`
    );
    delete validated.translationStatus;
  }

  // Validate dates with better error messages
  if (validated.createdAfter) {
    try {
      new Date(validated.createdAfter);
    } catch {
      console.warn(
        `Invalid createdAfter date ignored: ${validated.createdAfter}. Use ISO format like: 2024-01-01`
      );
      delete validated.createdAfter;
    }
  }

  if (validated.createdBefore) {
    try {
      new Date(validated.createdBefore);
    } catch {
      console.warn(
        `Invalid createdBefore date ignored: ${validated.createdBefore}. Use ISO format like: 2024-12-31`
      );
      delete validated.createdBefore;
    }
  }

  if (validated.modifiedAfter) {
    try {
      new Date(validated.modifiedAfter);
    } catch {
      console.warn(
        `Invalid modifiedAfter date ignored: ${validated.modifiedAfter}. Use ISO format like: 2024-01-01`
      );
      delete validated.modifiedAfter;
    }
  }

  if (validated.modifiedBefore) {
    try {
      new Date(validated.modifiedBefore);
    } catch {
      console.warn(
        `Invalid modifiedBefore date ignored: ${validated.modifiedBefore}. Use ISO format like: 2024-12-31`
      );
      delete validated.modifiedBefore;
    }
  }

  return validated;
}
