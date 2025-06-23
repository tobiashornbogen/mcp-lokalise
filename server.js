import express from 'express';
import 'dotenv/config';
import { parseCommand, addKeyToProject } from './mcp.js';

const app = express();
app.use(express.json());

app.post('/add-key', async (req, res) => {
  const { command } = req.body;
  if (!command) {
    return res.status(400).json({ error: 'Missing command in request body.' });
  }
  const { projectName, keyName, defaultValue, platforms } = parseCommand(command);
  if (!projectName || !keyName || !defaultValue) {
    return res.status(400).json({ error: 'Could not parse command. Please use the format: "my project name is \"Watt\". I want to add a key named hello and default value is \"sdfs\". platforms are web, ios. add it"' });
  }
  const apiKey = process.env.LOKALISE_API_KEY;
  try {
    const result = await addKeyToProject({ apiKey, projectName, keyName, defaultValue, platforms });
    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ error: error.message, details: error.response?.data });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`MCP server listening on port ${PORT}`);
}); 