#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import "dotenv/config";
import {
  addKeysToProject,
  updateKeysInProject,
  deleteKeysFromProject,
  manageTranslations,
  searchKeysInProject,
  searchAvailableProjects,
} from "./mcp.js";
import type {
  MCPToolArguments,
  MCPToolResponse,
  MCPUpdateToolArguments,
  MCPDeleteToolArguments,
  MCPTranslationToolArguments,
  MCPSearchToolArguments,
  MCPSearchProjectsToolArguments,
} from "./types.js";

export class LokaliseMCPServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: "lokalise-mcp-server",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
  }

  private setupToolHandlers(): void {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: "add_lokalise_keys",
            description:
              "Add multiple translation keys to a Lokalise project using structured input",
            inputSchema: {
              type: "object",
              properties: {
                projectName: {
                  type: "string",
                  description: "Lokalise project name",
                },
                keys: {
                  type: "array",
                  description: "Array of keys to add",
                  items: {
                    type: "object",
                    properties: {
                      keyName: {
                        type: "string",
                        description: "Key to add",
                      },
                      defaultValue: {
                        type: "string",
                        description: "Default value for the key (optional)",
                      },
                      platforms: {
                        type: "array",
                        items: { type: "string" },
                        description:
                          "Platforms (web, ios, android, other). Optional.",
                      },
                      description: {
                        type: "string",
                        description: "Description for the key (optional)",
                      },
                      tags: {
                        type: "array",
                        items: { type: "string" },
                        description: "Tags for the key (optional)",
                      },
                    },
                    required: ["keyName"],
                  },
                },
              },
              required: ["projectName", "keys"],
            },
          },
          {
            name: "update_lokalise_keys",
            description:
              "Update existing translation keys in a Lokalise project with new properties and translations",
            inputSchema: {
              type: "object",
              properties: {
                projectName: {
                  type: "string",
                  description: "Lokalise project name",
                },
                keys: {
                  type: "array",
                  description: "Array of keys to update",
                  items: {
                    type: "object",
                    properties: {
                      keyName: {
                        type: "string",
                        description: "Name of the existing key to update",
                      },
                      platforms: {
                        type: "array",
                        items: { type: "string" },
                        description:
                          "New platforms (web, ios, android, other). Optional.",
                      },
                      description: {
                        type: "string",
                        description: "New description for the key (optional)",
                      },
                      tags: {
                        type: "array",
                        items: { type: "string" },
                        description: "New tags for the key (optional)",
                      },
                      translations: {
                        type: "object",
                        description:
                          "Translations for different languages (en, de supported)",
                        properties: {
                          en: {
                            type: "string",
                            description: "English translation",
                          },
                          de: {
                            type: "string",
                            description: "German translation",
                          },
                        },
                        additionalProperties: { type: "string" },
                      },
                    },
                    required: ["keyName"],
                  },
                },
              },
              required: ["projectName", "keys"],
            },
          },
          {
            name: "delete_lokalise_keys",
            description: "Delete translation keys from a Lokalise project",
            inputSchema: {
              type: "object",
              properties: {
                projectName: {
                  type: "string",
                  description: "Lokalise project name",
                },
                keys: {
                  type: "array",
                  description: "Array of keys to delete",
                  items: {
                    type: "object",
                    properties: {
                      keyName: {
                        type: "string",
                        description: "Name of the key to delete",
                      },
                    },
                    required: ["keyName"],
                  },
                },
              },
              required: ["projectName", "keys"],
            },
          },
          {
            name: "manage_lokalise_translations",
            description:
              "Manage translations for existing keys in multiple languages (German and English focus)",
            inputSchema: {
              type: "object",
              properties: {
                projectName: {
                  type: "string",
                  description: "Lokalise project name",
                },
                translations: {
                  type: "array",
                  description: "Array of translation updates",
                  items: {
                    type: "object",
                    properties: {
                      keyName: {
                        type: "string",
                        description: "Name of the existing key",
                      },
                      translations: {
                        type: "object",
                        description: "Translations for different languages",
                        properties: {
                          en: {
                            type: "string",
                            description: "English translation",
                          },
                          de: {
                            type: "string",
                            description: "German translation",
                          },
                        },
                        additionalProperties: { type: "string" },
                      },
                      markAsReviewed: {
                        type: "boolean",
                        description: "Mark translations as reviewed (optional)",
                      },
                    },
                    required: ["keyName", "translations"],
                  },
                },
              },
              required: ["projectName", "translations"],
            },
          },
          {
            name: "search_lokalise_keys",
            description:
              "Search for translation keys in a Lokalise project based on various criteria like name patterns, tags, platforms, translation status, etc.",
            inputSchema: {
              type: "object",
              properties: {
                projectName: {
                  type: "string",
                  description: "Lokalise project name",
                },
                criteria: {
                  type: "object",
                  description: "Search criteria to filter keys",
                  properties: {
                    keyNamePattern: {
                      type: "string",
                      description:
                        'Partial match in key name (e.g., "error" finds "error_message", "user_error")',
                    },
                    keyNameExact: {
                      type: "string",
                      description: "Exact key name match",
                    },
                    tags: {
                      type: "array",
                      items: { type: "string" },
                      description:
                        'Must have all these tags (e.g., ["urgent", "frontend"])',
                    },
                    platforms: {
                      type: "array",
                      items: { type: "string" },
                      description:
                        "Must be available on these platforms (web, ios, android, other)",
                    },
                    translationStatus: {
                      type: "string",
                      enum: [
                        "translated",
                        "untranslated",
                        "fuzzy",
                        "reviewed",
                        "any",
                      ],
                      description:
                        "Filter by translation status: translated=has text, untranslated=missing text, fuzzy=needs review, reviewed=approved, any=all",
                    },
                    languages: {
                      type: "array",
                      items: { type: "string" },
                      description:
                        "Check translation status for these languages (en, de supported)",
                    },
                    hasDescription: {
                      type: "boolean",
                      description:
                        "Filter keys that have (true) or don't have (false) descriptions",
                    },
                    descriptionPattern: {
                      type: "string",
                      description: "Partial match in key description",
                    },
                    createdAfter: {
                      type: "string",
                      description:
                        "Find keys created after this date (ISO format: 2024-01-01)",
                    },
                    createdBefore: {
                      type: "string",
                      description:
                        "Find keys created before this date (ISO format: 2024-12-31)",
                    },
                  },
                  additionalProperties: false,
                },
                limit: {
                  type: "number",
                  description:
                    "Maximum number of results to return (default: 50, max: 200)",
                  minimum: 1,
                  maximum: 200,
                },
              },
              required: ["projectName", "criteria"],
            },
          },
          {
            name: "search_available_projects",
            description:
              "Search for available Lokalise projects that you have access to",
            inputSchema: {
              type: "object",
              properties: {
                searchTerm: {
                  type: "string",
                  description:
                    "Optional search term to filter projects by name or description",
                },
              },
              required: [],
            },
          },
        ],
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      const apiKey = process.env.LOKALISE_API_KEY;

      if (!apiKey) {
        return {
          content: [
            {
              type: "text",
              text: "Error: LOKALISE_API_KEY environment variable is required.",
            },
          ],
        } satisfies MCPToolResponse;
      }

      try {
        if (name === "add_lokalise_keys") {
          const { projectName, keys } = args as unknown as MCPToolArguments;
          if (!projectName || !Array.isArray(keys) || keys.length === 0) {
            return {
              content: [
                {
                  type: "text",
                  text: "Error: projectName and at least one key are required.",
                },
              ],
            } satisfies MCPToolResponse;
          }

          const result = await addKeysToProject({ apiKey, projectName, keys });
          return {
            content: [
              {
                type: "text",
                text: `Successfully added ${
                  keys.length
                } key(s) to project "${projectName}". Result: ${JSON.stringify(
                  result,
                  null,
                  2
                )}`,
              },
            ],
          } satisfies MCPToolResponse;
        }

        if (name === "update_lokalise_keys") {
          const { projectName, keys } =
            args as unknown as MCPUpdateToolArguments;
          if (!projectName || !Array.isArray(keys) || keys.length === 0) {
            return {
              content: [
                {
                  type: "text",
                  text: "Error: projectName and at least one key are required.",
                },
              ],
            } satisfies MCPToolResponse;
          }

          const result = await updateKeysInProject({
            apiKey,
            projectName,
            keys,
          });
          return {
            content: [
              {
                type: "text",
                text: `Successfully updated ${
                  keys.length
                } key(s) in project "${projectName}". Result: ${JSON.stringify(
                  result,
                  null,
                  2
                )}`,
              },
            ],
          } satisfies MCPToolResponse;
        }

        if (name === "delete_lokalise_keys") {
          const { projectName, keys } =
            args as unknown as MCPDeleteToolArguments;
          if (!projectName || !Array.isArray(keys) || keys.length === 0) {
            return {
              content: [
                {
                  type: "text",
                  text: "Error: projectName and at least one key are required.",
                },
              ],
            } satisfies MCPToolResponse;
          }

          const result = await deleteKeysFromProject({
            apiKey,
            projectName,
            keys,
          });
          return {
            content: [
              {
                type: "text",
                text: `Successfully deleted ${
                  keys.length
                } key(s) from project "${projectName}". Keys removed: ${
                  result.keys_removed
                }. Result: ${JSON.stringify(result, null, 2)}`,
              },
            ],
          } satisfies MCPToolResponse;
        }

        if (name === "manage_lokalise_translations") {
          const { projectName, translations } =
            args as unknown as MCPTranslationToolArguments;
          if (
            !projectName ||
            !Array.isArray(translations) ||
            translations.length === 0
          ) {
            return {
              content: [
                {
                  type: "text",
                  text: "Error: projectName and at least one translation item are required.",
                },
              ],
            } satisfies MCPToolResponse;
          }

          const result = await manageTranslations({
            apiKey,
            projectName,
            translations,
          });
          return {
            content: [
              {
                type: "text",
                text: `Successfully managed translations for ${
                  translations.length
                } key(s) in project "${projectName}". Processed ${
                  result.summary.translationsProcessed
                } translation(s). Result: ${JSON.stringify(result, null, 2)}`,
              },
            ],
          } satisfies MCPToolResponse;
        }

        if (name === "search_lokalise_keys") {
          const { projectName, criteria, limit } =
            args as unknown as MCPSearchToolArguments;
          if (!projectName || !criteria) {
            return {
              content: [
                {
                  type: "text",
                  text: "Error: projectName and search criteria are required.",
                },
              ],
            } satisfies MCPToolResponse;
          }

          const result = await searchKeysInProject({
            apiKey,
            projectName,
            criteria,
            limit,
          });

          // Format the results for better readability
          const formattedResults = result.results.map((key) => {
            const keyNameString =
              typeof key.key_name === "string"
                ? key.key_name
                : Object.values(key.key_name)[0];
            const translationSummary = key.translations
              .map(
                (t) =>
                  `${t.language_iso}: "${t.translation}"${
                    t.is_reviewed ? " (✓ reviewed)" : ""
                  }${t.is_fuzzy ? " (⚠ fuzzy)" : ""}`
              )
              .join(", ");

            return `🔑 ${keyNameString}
📝 ${key.description || "No description"}
🏷️ Tags: [${key.tags?.join(", ") || "none"}]
📱 Platforms: [${key.platforms.join(", ")}]
🌍 Translations: ${translationSummary || "none"}
✅ Match reasons: ${key.matchReasons.join(", ")}
📅 Created: ${key.created_at}`;
          });

          const summary = `
🔍 Search Results for "${projectName}"
📊 Found ${result.total_found} key(s) matching criteria
🎯 Criteria used: ${JSON.stringify(result.criteria_used, null, 2)}

${formattedResults.join("\n\n")}`;

          return {
            content: [
              {
                type: "text",
                text: summary,
              },
            ],
          } satisfies MCPToolResponse;
        }

        if (name === "search_available_projects") {
          const { searchTerm } =
            args as unknown as MCPSearchProjectsToolArguments;

          const projects = await searchAvailableProjects(apiKey, searchTerm);

          // Format the results for better readability
          const formattedProjects = projects.map((project) => {
            return `📁 ${project.name}
📝 ${project.description || "No description"}
🆔 ${project.project_id}
👤 Created by: ${project.created_by_email}
📅 Created: ${project.created_at}`;
          });

          const summary = `
🔍 Available Projects${searchTerm ? ` (filtered by: "${searchTerm}")` : ""}
📊 Found ${projects.length} project(s)

${formattedProjects.join("\n\n")}`;

          return {
            content: [
              {
                type: "text",
                text: summary,
              },
            ],
          } satisfies MCPToolResponse;
        }

        throw new Error(`Unknown tool: ${name}`);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error occurred";
        return {
          content: [
            {
              type: "text",
              text: `Error: ${errorMessage}`,
            },
          ],
        } satisfies MCPToolResponse;
      }
    });
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("Lokalise MCP server started");
  }
}

const server = new LokaliseMCPServer();
server.run().catch(console.error);
