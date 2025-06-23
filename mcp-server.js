#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import 'dotenv/config';
import { addKeysToProject } from './mcp.js';

class LokaliseMCPServer {
  constructor() {
    this.server = new Server(
      {
        name: 'lokalise-mcp-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
  }

  setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'add_lokalise_keys',
            description: 'Add multiple translation keys to a Lokalise project using structured input',
            inputSchema: {
              type: 'object',
              properties: {
                projectName: {
                  type: 'string',
                  description: 'Lokalise project name'
                },
                keys: {
                  type: 'array',
                  description: 'Array of keys to add',
                  items: {
                    type: 'object',
                    properties: {
                      keyName: {
                        type: 'string',
                        description: 'Key to add'
                      },
                      defaultValue: {
                        type: 'string',
                        description: 'Default value for the key (optional)'
                      },
                      platforms: {
                        type: 'array',
                        items: { type: 'string' },
                        description: 'Platforms (web, ios, android, other). Optional.'
                      }
                    },
                    required: ['keyName']
                  }
                }
              },
              required: ['projectName', 'keys']
            }
          }
        ]
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      if (name === 'add_lokalise_keys') {
        try {
          const { projectName, keys } = args;
          if (!projectName || !Array.isArray(keys) || keys.length === 0) {
            return {
              content: [
                {
                  type: 'text',
                  text: 'Error: projectName and at least one key are required.'
                }
              ]
            };
          }

          const apiKey = process.env.LOKALISE_API_KEY;
          const result = await addKeysToProject({ apiKey, projectName, keys });
          return {
            content: [
              {
                type: 'text',
                text: `Successfully added ${keys.length} key(s) to project "${projectName}". Result: ${JSON.stringify(result, null, 2)}`
              }
            ]
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text',
                text: `Error: ${error.message}`
              }
            ]
          };
        }
      }

      throw new Error(`Unknown tool: ${name}`);
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Lokalise MCP server started');
  }
}

const server = new LokaliseMCPServer();
server.run().catch(console.error); 