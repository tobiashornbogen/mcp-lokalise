import 'dotenv/config';
import axios from 'axios';

export function parseCommand(command) {
  const projectMatch = command.match(/project name is ['"]?([\w\s-]+)['"]?/i);
  const keyMatch = command.match(/key named ['"]?([\w-]+)['"]?/i);
  const valueMatch = command.match(/default value is ['"]?([\w\s-]+)['"]?/i);
  const platformsMatch = command.match(/platforms? (are|is) ([\w,\s-]+)/i);
  let platforms = null;
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

export async function findProjectIdByName(apiKey, projectName) {
  let page = 1;
  let found = null;
  while (!found) {
    const res = await axios.get('https://api.lokalise.com/api2/projects', {
      headers: { 'X-Api-Token': apiKey },
      params: { page, limit: 100 },
    });
    const projects = res.data.projects;
    found = projects.find(p => p.name.toLowerCase() === projectName.toLowerCase());
    if (found || projects.length < 100) break;
    page++;
  }
  return found ? found.project_id : null;
}

export async function addKeysToProject({ apiKey, projectName, keys }) {
  if (!apiKey) {
    throw new Error('LOKALISE_API_KEY not set in .env file or input.');
  }
  if (!projectName || !Array.isArray(keys) || keys.length === 0) {
    throw new Error('Missing projectName or keys.');
  }
  const projectId = await findProjectIdByName(apiKey, projectName);
  if (!projectId) {
    throw new Error(`Project named "${projectName}" not found.`);
  }
  const allowedPlatforms = ['web', 'ios', 'android', 'other'];
  const keyPayloads = keys.map(({ keyName, defaultValue, platforms }) => {
    const usedPlatforms = (platforms && platforms.length > 0)
      ? platforms.filter(p => allowedPlatforms.includes(p))
      : allowedPlatforms;
    if (usedPlatforms.length === 0) {
      throw new Error('No valid platforms specified for key: ' + keyName);
    }
    const payload = {
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
    return payload;
  });
  const response = await axios.post(
    `https://api.lokalise.com/api2/projects/${projectId}/keys`,
    {
      keys: keyPayloads
    },
    {
      headers: {
        'X-Api-Token': apiKey,
        'Content-Type': 'application/json'
      }
    }
  );
  return response.data;
} 