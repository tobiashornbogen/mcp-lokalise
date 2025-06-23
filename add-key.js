#!/usr/bin/env node
import inquirer from 'inquirer';
import 'dotenv/config';
import { parseCommand, addKeyToProject } from './mcp.js';

async function main() {
  const { command } = await inquirer.prompt([
    {
      type: 'input',
      name: 'command',
      message: 'Describe what you want to do (e.g., "my project name is \"Watt\". I want to add a key named hello and default value is \"sdfs\". platforms are web, ios. add it"): ',
      validate: input => input ? true : 'Command is required.'
    }
  ]);

  const { projectName, keyName, defaultValue, platforms } = parseCommand(command);
  if (!projectName || !keyName || !defaultValue) {
    console.error('Could not parse command. Please use the format: "my project name is \"Watt\". I want to add a key named hello and default value is \"sdfs\". platforms are web, ios. add it"');
    process.exit(1);
  }

  const apiKey = process.env.LOKALISE_API_KEY;
  try {
    const result = await addKeyToProject({ apiKey, projectName, keyName, defaultValue, platforms });
    console.log('Key added successfully:', result);
  } catch (error) {
    console.error(error.message);
    if (error.response) {
      console.error('Error from Lokalise:', error.response.data);
    }
    process.exit(1);
  }
}

main(); 