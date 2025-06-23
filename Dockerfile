# Use official Node.js LTS image
FROM node:22-slim

# Set working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install --production

# Copy the rest of your code
COPY . .

# Default command to run the MCP server
CMD ["node", "mcp-server.js"] 