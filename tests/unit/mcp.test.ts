import { describe, it, expect } from "@jest/globals";
import { parseCommand } from "../../src/mcp";

describe("MCP Core Functions", () => {
  describe("parseCommand", () => {
    it("should parse project name correctly", () => {
      const command =
        'Add a key to project name is "My Project" with key named "test_key"';
      const result = parseCommand(command);

      expect(result.projectName).toBe("My Project");
      expect(result.keyName).toBe("test_key");
    });

    it("should parse command with single quotes", () => {
      const command =
        "Add key named 'hello_world' to project name is 'Demo Project'";
      const result = parseCommand(command);

      expect(result.projectName).toBe("Demo Project");
      expect(result.keyName).toBe("hello_world");
    });

    it("should parse default value", () => {
      const command = 'Add key with default value is "Hello World"';
      const result = parseCommand(command);

      expect(result.defaultValue).toBe("Hello World");
    });

    it("should parse platforms", () => {
      const command = "Add key where platforms are web, ios, android";
      const result = parseCommand(command);

      expect(result.platforms).toEqual(["web", "ios", "android"]);
    });

    it("should handle single platform", () => {
      const command = "Add key where platform is web";
      const result = parseCommand(command);

      expect(result.platforms).toEqual(["web"]);
    });

    it("should return null for missing information", () => {
      const command = "Just some random text";
      const result = parseCommand(command);

      expect(result.projectName).toBe(null);
      expect(result.keyName).toBe(null);
      expect(result.defaultValue).toBe(null);
      expect(result.platforms).toBe(null);
    });

    it("should handle complex command with all elements", () => {
      const command =
        'Add key named "welcome_message" to project name is "EducAide App" with default value is "Welcome to our app" where platforms are web, ios';
      const result = parseCommand(command);

      expect(result.projectName).toBe("EducAide App");
      expect(result.keyName).toBe("welcome_message");
      expect(result.defaultValue).toBe("Welcome to our app");
      expect(result.platforms).toEqual(["web", "ios"]);
    });
  });

  // Note: findProjectIdByName is tested as part of integration tests
  // since it requires API calls and is async
});
