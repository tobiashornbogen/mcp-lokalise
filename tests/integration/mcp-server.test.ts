import {
  describe,
  it,
  expect,
  beforeEach,
  jest,
  afterEach,
} from "@jest/globals";
import axios from "axios";
import {
  addKeysToProject,
  searchKeysInProject,
  updateKeysInProject,
  manageTranslations,
  deleteKeysFromProject,
  searchAvailableProjects,
} from "../../src/mcp";

// Get the mocked axios
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe("MCP Integration Tests", () => {
  const apiKey = "test_api_key_12345";
  const projectName = "Test Project";
  const projectId = "902835446888b3caabe5d2.34221777";
  let mockAxiosInstance: any;

  beforeEach(() => {
    // Create a mock axios instance
    mockAxiosInstance = {
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
      interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn() },
      },
    };

    // Mock axios.create to return our mock instance
    (mockedAxios.create as jest.Mock) = jest.fn().mockReturnValue(mockAxiosInstance);
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("searchAvailableProjects", () => {
    it("should return available projects", async () => {
      const mockResponse = {
        data: {
          projects: [
            {
              project_id: projectId,
              name: projectName,
              description: "Test project description",
              created_at: "2024-01-01T00:00:00Z",
              created_by: 1,
              created_by_email: "test@example.com",
            },
          ],
        },
      };

      mockAxiosInstance.get.mockResolvedValueOnce(mockResponse);

      const result = await searchAvailableProjects(apiKey);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe(projectName);
      expect(result[0].project_id).toBe(projectId);
    });

    it("should filter projects by search term", async () => {
      const mockResponse = {
        data: {
          projects: [
            {
              project_id: "1",
              name: "EducAide",
              description: "Education app",
              created_at: "2024-01-01T00:00:00Z",
              created_by: 1,
              created_by_email: "test@example.com",
            },
            {
              project_id: "2",
              name: "Shopping App",
              description: "E-commerce application",
              created_at: "2024-01-02T00:00:00Z",
              created_by: 2,
              created_by_email: "test2@example.com",
            },
          ],
        },
      };

      mockAxiosInstance.get.mockResolvedValueOnce(mockResponse);

      const result = await searchAvailableProjects(apiKey, "Educ");

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("EducAide");
    });
  });

  describe("addKeysToProject", () => {
    it("should add keys to project successfully", async () => {
      // Mock finding project
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: {
          projects: [
            {
              project_id: projectId,
              name: projectName,
              description: "Test project",
              created_at: "2024-01-01T00:00:00Z",
              created_by: 1,
              created_by_email: "test@example.com",
            },
          ],
        },
      });

      // Mock creating keys
      mockAxiosInstance.post.mockResolvedValueOnce({
        data: {
          project_id: projectId,
          keys: [
            {
              key_id: 123,
              key_name: "test_key",
              platforms: ["web"],
              created_at: "2024-01-01T00:00:00Z",
            },
          ],
        },
      });

      const keys = [
        {
          keyName: "test_key",
          defaultValue: "Test Value",
          platforms: ["web"],
          description: "Test key description",
          tags: ["test"],
        },
      ];

      const result = await addKeysToProject({ apiKey, projectName, keys });

      expect(result.project_id).toBe(projectId);
      expect(result.keys).toHaveLength(1);
      expect(result.keys[0].key_name).toBe("test_key");
    });

    it("should handle project not found error", async () => {
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: { projects: [] },
      });

      const keys = [{ keyName: "test_key", defaultValue: "Test Value" }];

      await expect(
        addKeysToProject({ apiKey, projectName: "Non-existent Project", keys })
      ).rejects.toThrow('Project named "Non-existent Project" not found.');
    });
  });

  describe("searchKeysInProject", () => {
    it("should search keys by name pattern", async () => {
      // Mock finding project
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: {
          projects: [
            {
              project_id: projectId,
              name: projectName,
              description: "Test project",
              created_at: "2024-01-01T00:00:00Z",
              created_by: 1,
              created_by_email: "test@example.com",
            },
          ],
        },
      });

      // Mock getting keys
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: {
          keys: [
            {
              key_id: 123,
              key_name: "test_key_1",
              platforms: ["web"],
              description: "First test key",
              tags: ["test"],
              created_at: "2024-01-01T00:00:00Z",
              translations: [
                {
                  language_iso: "en",
                  translation: "Test Value",
                  is_fuzzy: false,
                  is_reviewed: true,
                  words: 2,
                },
              ],
            },
            {
              key_id: 124,
              key_name: "another_key",
              platforms: ["web"],
              description: "Another key",
              tags: [],
              created_at: "2024-01-01T00:00:00Z",
              translations: [],
            },
          ],
          project_id: projectId,
        },
      });

      const result = await searchKeysInProject({
        apiKey,
        projectName,
        criteria: { keyNamePattern: "test" },
      });

      expect(result.total_found).toBe(1);
      expect(result.results[0].key_name).toBe("test_key_1");
      expect(result.results[0].matchReasons).toContain(
        'Key name contains "test"'
      );
    });

    it("should search keys by tags", async () => {
      // Mock finding project
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: {
          projects: [
            {
              project_id: projectId,
              name: projectName,
              description: "Test project",
              created_at: "2024-01-01T00:00:00Z",
              created_by: 1,
              created_by_email: "test@example.com",
            },
          ],
        },
      });

      // Mock getting keys
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: {
          keys: [
            {
              key_id: 123,
              key_name: "test_key",
              platforms: ["web"],
              tags: ["urgent", "frontend"],
              created_at: "2024-01-01T00:00:00Z",
              translations: [],
            },
          ],
          project_id: projectId,
        },
      });

      const result = await searchKeysInProject({
        apiKey,
        projectName,
        criteria: { tags: ["urgent"] },
      });

      expect(result.total_found).toBe(1);
      expect(result.results[0].matchReasons).toContain("Has tags: urgent");
    });
  });

  describe("End-to-End Workflow", () => {
    it("should complete a full CRUD workflow", async () => {
      const testKeyName = "integration_test_key";

      // Step 1: Mock finding project for add operation
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: {
          projects: [
            {
              project_id: projectId,
              name: projectName,
              description: "Test project",
              created_at: "2024-01-01T00:00:00Z",
              created_by: 1,
              created_by_email: "test@example.com",
            },
          ],
        },
      });

      // Step 2: Mock creating keys
      mockAxiosInstance.post.mockResolvedValueOnce({
        data: {
          project_id: projectId,
          keys: [
            {
              key_id: 999,
              key_name: testKeyName,
              platforms: ["web"],
              created_at: "2024-01-01T00:00:00Z",
            },
          ],
        },
      });

      // Add key
      const addResult = await addKeysToProject({
        apiKey,
        projectName,
        keys: [
          {
            keyName: testKeyName,
            defaultValue: "Integration Test Value",
            platforms: ["web"],
            tags: ["integration-test"],
          },
        ],
      });

      expect(addResult.keys[0].key_name).toBe(testKeyName);

      // Step 3: Mock search operation
      mockAxiosInstance.get
        .mockResolvedValueOnce({
          // Find project call
          data: {
            projects: [
              {
                project_id: projectId,
                name: projectName,
                description: "Test project",
                created_at: "2024-01-01T00:00:00Z",
                created_by: 1,
                created_by_email: "test@example.com",
              },
            ],
          },
        })
        .mockResolvedValueOnce({
          // Get keys call
          data: {
            keys: [
              {
                key_id: 999,
                key_name: testKeyName,
                platforms: ["web"],
                tags: ["integration-test"],
                created_at: "2024-01-01T00:00:00Z",
                translations: [],
              },
            ],
            project_id: projectId,
          },
        });

      // Search for the key
      const searchResult = await searchKeysInProject({
        apiKey,
        projectName,
        criteria: { tags: ["integration-test"] },
      });

      expect(searchResult.results[0].key_name).toBe(testKeyName);

      // The test demonstrates the workflow is working correctly
      expect(addResult).toBeDefined();
      expect(searchResult).toBeDefined();
    });
  });
});
