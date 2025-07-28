import express, { Request, Response } from 'express';
import 'dotenv/config';
import { addKeysToProject } from './mcp.js';
import type { Key } from './types.js';

const app = express();
app.use(express.json());

interface AddKeyRequestBody {
  projectName: string;
  keyName: string;
  defaultValue: string;
  platforms?: string[];
  description?: string;
  tags?: string[];
}

interface AddKeysRequestBody {
  projectName: string;
  keys: Array<{
    keyName: string;
    defaultValue: string;
    platforms?: string[];
    description?: string;
    tags?: string[];
  }>;
}

app.post('/add-key', async (req: Request<{}, {}, AddKeyRequestBody>, res: Response) => {
  const { projectName, keyName, defaultValue, platforms, description, tags } = req.body;
  
  if (!projectName || !keyName || !defaultValue) {
    return res.status(400).json({ 
      error: 'Missing required fields. projectName, keyName, and defaultValue are required.',
      required: ['projectName', 'keyName', 'defaultValue'],
      optional: ['platforms', 'description', 'tags']
    });
  }
  
  const apiKey = process.env.LOKALISE_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'LOKALISE_API_KEY environment variable is required.' });
  }
  
  try {
    const keys: Key[] = [{
      keyName,
      defaultValue,
      platforms: platforms || ['web', 'ios', 'android', 'other'],
      description: description || undefined,
      tags: tags || undefined
    }];
    
    const result = await addKeysToProject({ apiKey, projectName, keys });
    res.json({ success: true, result });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    const errorResponse: any = { error: errorMessage };
    
    if (error instanceof Error && 'response' in error) {
      errorResponse.details = (error as any).response?.data;
    }
    
    res.status(500).json(errorResponse);
  }
});

// Bulk endpoint for adding multiple keys
app.post('/add-keys', async (req: Request<{}, {}, AddKeysRequestBody>, res: Response) => {
  const { projectName, keys } = req.body;
  
  if (!projectName || !Array.isArray(keys) || keys.length === 0) {
    return res.status(400).json({ 
      error: 'Missing required fields. projectName and keys array are required.',
      required: ['projectName', 'keys'],
      example: {
        projectName: 'My Project',
        keys: [
          {
            keyName: 'hello_world',
            defaultValue: 'Hello World',
            platforms: ['web'],
            description: 'Greeting message',
            tags: ['greeting']
          }
        ]
      }
    });
  }

  // Validate each key
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    if (!key.keyName || !key.defaultValue) {
      return res.status(400).json({
        error: `Invalid key at index ${i}. keyName and defaultValue are required.`,
        keyIndex: i,
        key: key
      });
    }
  }

  const apiKey = process.env.LOKALISE_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'LOKALISE_API_KEY environment variable is required.' });
  }
  
  try {
    const keyObjects: Key[] = keys.map(key => ({
      keyName: key.keyName,
      defaultValue: key.defaultValue,
      platforms: key.platforms || undefined,
      description: key.description || undefined,
      tags: key.tags || undefined
    }));
    
    const result = await addKeysToProject({ apiKey, projectName, keys: keyObjects });
    res.json({ 
      success: true, 
      result,
      summary: {
        projectName,
        keysAdded: keys.length,
        keys: keys.map(k => k.keyName)
      }
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    const errorResponse: any = { error: errorMessage };
    
    if (error instanceof Error && 'response' in error) {
      errorResponse.details = (error as any).response?.data;
    }
    
    res.status(500).json(errorResponse);
  }
});

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    endpoints: [
      'POST /add-key - Add a single translation key',
      'POST /add-keys - Add multiple translation keys',
      'GET /health - Health check'
    ]
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`MCP server listening on port ${PORT}`);
});