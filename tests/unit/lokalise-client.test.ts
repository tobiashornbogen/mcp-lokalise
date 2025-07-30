import {
  describe,
  it,
  expect,
  beforeEach,
  jest,
  afterEach,
} from "@jest/globals";
import axios from "axios";
import { LokaliseApiClient } from "../../src/lokalise-client";
import type { ProjectsResponse, CreateKeysResponse } from "../../src/types";

// Get the mocked axios
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe("LokaliseApiClient", () => {
  let client: LokaliseApiClient;
  const apiKey = "test_api_key_12345";
  let mockAxiosInstance: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create a mock axios instance
    mockAxiosInstance = {
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
      interceptors: {
        request: {
          use: jest.fn(),
        },
        response: {
          use: jest.fn(),
        },
      },
    };

    // Mock axios.create to return our mock instance
    (mockedAxios.create as jest.Mock) = jest
      .fn()
      .mockReturnValue(mockAxiosInstance);

    client = new LokaliseApiClient(apiKey);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("constructor", () => {
    it("should create client instance", () => {
      expect(client).toBeInstanceOf(LokaliseApiClient);
    });

    it("should throw error for missing API key", () => {
      expect(() => new LokaliseApiClient("")).toThrow("API key is required");
    });
  });

  describe("getProjects", () => {
    it("should fetch projects successfully", async () => {
      const mockResponse: ProjectsResponse = {
        projects: [
          {
            project_id: "123",
            name: "Test Project",
            description: "A test project",
            created_at: "2024-01-01T00:00:00Z",
            created_by: 1,
            created_by_email: "test@example.com",
          },
        ],
      };

      mockAxiosInstance.get.mockResolvedValueOnce({ data: mockResponse });

      const result = await client.getProjects();

      expect(mockAxiosInstance.get).toHaveBeenCalledWith("/projects", {
        params: { limit: 100, page: 1 },
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe("createKeys", () => {
    it("should create keys successfully", async () => {
      const projectId = "123";
      const keysPayload = {
        keys: [
          {
            key_name: "test_key",
            platforms: ["web"],
            translations: [{ language_iso: "en", translation: "Test Value" }],
          },
        ],
      };

      const mockResponse: CreateKeysResponse = {
        project_id: projectId,
        keys: [
          {
            key_id: 456,
            key_name: "test_key",
            platforms: ["web"],
            created_at: "2024-01-01T00:00:00Z",
          },
        ],
      };

      mockAxiosInstance.post.mockResolvedValueOnce({ data: mockResponse });

      const result = await client.createKeys(projectId, keysPayload);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        `/projects/${projectId}/keys`,
        keysPayload
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe("getKeys", () => {
    it("should fetch keys successfully", async () => {
      const projectId = "123";
      const mockResponse = {
        keys: [
          {
            key_id: 456,
            key_name: "test_key",
            platforms: ["web"],
            created_at: "2024-01-01T00:00:00Z",
          },
        ],
        project_id: projectId,
      };

      mockAxiosInstance.get.mockResolvedValueOnce({ data: mockResponse });

      const result = await client.getKeys(projectId);

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        `/projects/${projectId}/keys`,
        { params: { include_translations: 1, limit: 100, page: 1 } }
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe("updateKeys", () => {
    it("should update keys successfully", async () => {
      const projectId = "123";
      const updatePayload = {
        keys: [
          {
            key_id: 456,
            description: "Updated description",
            tags: ["updated"],
          },
        ],
      };

      const mockResponse = {
        keys: [
          {
            key_id: 456,
            key_name: "test_key",
            platforms: ["web"],
            updated_at: "2024-01-01T12:00:00Z",
          },
        ],
        project_id: projectId,
      };

      mockAxiosInstance.put.mockResolvedValueOnce({ data: mockResponse });

      const result = await client.updateKeys(projectId, updatePayload);

      expect(mockAxiosInstance.put).toHaveBeenCalledWith(
        `/projects/${projectId}/keys`,
        updatePayload
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe("deleteKeys", () => {
    it("should delete keys successfully", async () => {
      const projectId = "123";
      const deletePayload = { keys: [456, 789] };

      const mockResponse = {
        project_id: projectId,
        keys_removed: true,
        keys_locked: 0,
      };

      mockAxiosInstance.delete.mockResolvedValueOnce({ data: mockResponse });

      const result = await client.deleteKeys(projectId, deletePayload);

      expect(mockAxiosInstance.delete).toHaveBeenCalledWith(
        `/projects/${projectId}/keys`,
        { data: deletePayload }
      );
      expect(result).toEqual(mockResponse);
    });
  });
});
