# Lokalise MCP Tool

A Minimal Command-line Program (MCP) server for adding translation keys to your Lokalise projects, designed for integration with [Cursor](https://www.cursor.so/) or standalone use.

---
## 🖼️ MCP Flow Diagram

![MCP Flow](./assets/flow.png)

*This diagram illustrates the Model Context Protocol (MCP) flow between Cursor, your MCP server, and Lokalise.* 

## ⚡️ Usage (Quick Start with Cursor MCP)

**No need to run Docker or Podman manually!**

1. 🐳 Make sure Docker or Podman is installed and running.
2. 🛠️ Add this to your `mcp.json` (or configure via Cursor UI):

   ```json
   {
     "mcpServers": {
       "lokalise": {
         "command": "docker", // podman
         "args": [
           "run",
           "--rm",
           "-i",
           "-e", "LOKALISE_API_KEY",
           "mdrafee03/lokalise-mcp:latest"
         ],
         "env": {
           "LOKALISE_API_KEY": "your_actual_api_key"
         }
       }
     }
   }
   ```

   - You can use `podman` instead of `docker` if you prefer.
   - Cursor will automatically pull and run the image as needed.

3. 🔄 **Restart Cursor.** It will handle everything for you.

---

## 📝 How to Use in Cursor

This tool takes these inputs:

- **projectName** (required): The name of your Lokalise project (e.g., `SpaceX`).
- **keys** (required): An array of objects, each with:
  - **keyName** (required): The translation key (e.g., `hello`)
  - **defaultValue** (optional): The default translation value (e.g., `Hello`)
  - **platforms** (optional): The platforms this key applies to (e.g., `web`, `ios`)

**Example:**
> I want to add two keys, one is hello and another one is bye. their default values are Hello and Goodbye. both are in web platform. the project is spaceX 

Cursor will automatically convert this to the correct input for the MCP tool.

![Cursor MCP Lokalise Flow](./assets/result.png)


---
## 📁 Project Files

**TypeScript Source Files (src/):**
- **src/mcp-server.ts**: The main MCP server entry point for Cursor integration.
- **src/mcp.ts**: Shared logic for interacting with the Lokalise API (used by the server).
- **src/server.ts**: (Optional) HTTP server version (not required for Cursor).
- **src/add-key.ts**: (Optional) CLI tool for adding a key interactively (not required for Cursor).

**Compiled JavaScript Files (dist/):**
- **dist/mcp-server.js**: Compiled MCP server.
- **dist/mcp.js**: Compiled API logic.
- **dist/server.js**: Compiled HTTP server.
- **dist/add-key.js**: Compiled CLI tool.

**Other Files:**
- **tsconfig.json**: TypeScript configuration.
- **Dockerfile**: For building the Docker image of the MCP server.
- **package.json**: Project dependencies and scripts.
- **README.md**: This documentation file.

---

## 🛠️ Setup (For Local Development or Customization)

### 1. 📥 Clone the Repository
```sh
git clone https://github.com/mdrafee03/mcp-lokalise.git
cd mcp-lokalise
```

### 2. 📦 Install Dependencies
```sh
npm install
```

### 3. 🔨 Build the Project
```sh
npm run build
```

### 4. 🔑 Set Your Lokalise API Key

In your MCP config (recommended for Cursor)
```json
{
  "mcpServers": {
    "lokalise": {
      "command": "node",
      "args": ["{directory-of-the-project}/dist/mcp-server.js"],
      "env": {
        "LOKALISE_API_KEY": "your_actual_api_key"
      }
    }
  }
}
```

---

## 🐳 MCP Server Setup Options for Cursor

You can set up the MCP server in Cursor in two ways:

### Option 1: Node.js (Direct Script)
```json
{
  "mcpServers": {
    "lokalise": {
      "command": "node",
      "args": ["/absolute/path/to/dist/mcp-server.js"],
      "env": {
        "LOKALISE_API_KEY": "your_actual_api_key"
      }
    }
  }
}
```
- Replace `/absolute/path/to/dist/mcp-server.js` with the full path to your compiled `dist/mcp-server.js` file.
- This runs the MCP server directly with Node.js.

---

### Option 2: Docker (or Podman)
```json
{
  "mcpServers": {
    "lokalise": {
      "command": "docker", // or "podman"
      "args": [
        "run",
        "--rm",
        "-i",
        "-e", "LOKALISE_API_KEY",
        "mdrafee03/lokalise-mcp:latest"
      ],
      "env": {
        "LOKALISE_API_KEY": "your_actual_api_key"
      }
    }
  }
}
```
- This will pull and run the published Docker image automatically.
- You can use `"command": "podman"` if you prefer Podman.

---

**💡 Note:** Both options require you to set your Lokalise API key in the `env` section. Cursor will handle starting the MCP server for you.

---

## 🐳 Docker Usage

### Using Pre-built Image from Docker Hub
```bash
# Run MCP server
podman run --rm -e LOKALISE_API_KEY=your_key mdrafee03/lokalise-mcp:latest

# Run HTTP server
podman run --rm -p 3000:3000 -e LOKALISE_API_KEY=your_key mdrafee03/lokalise-mcp:latest node dist/server.js

# Run CLI tool interactively
podman run --rm -it -e LOKALISE_API_KEY=your_key mdrafee03/lokalise-mcp:latest node dist/add-key.js
```

### Building Locally
```bash
# Build the image
podman build -t lokalise-mcp .

# Run locally built image
podman run --rm -e LOKALISE_API_KEY=your_key lokalise-mcp:latest
```

---

## 🧑‍💻 Development

### Available Scripts
- `npm run build` - Compile TypeScript to JavaScript
- `npm run dev` - Run the MCP server in development mode with tsx
- `npm run server` - Run the HTTP server in development mode with tsx
- `npm run add-key` - Run the CLI tool in development mode with tsx
- `npm start` - Run the compiled MCP server from dist/

### Requirements
- Node.js 22+ recommended
- TypeScript 5.8+
- MCP protocol via [@modelcontextprotocol/sdk](https://www.npmjs.com/package/@modelcontextprotocol/sdk)

---

## License
MIT 


