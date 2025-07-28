#!/usr/bin/env node
import inquirer from 'inquirer';
import 'dotenv/config';
import { parseCommand, addKeysToProject } from './mcp.js';
import type { Key } from './types.js';

interface PromptAnswers {
  command: string;
}

async function main(): Promise<void> {
  const { command }: PromptAnswers = await inquirer.prompt([
    {
      type: 'input',
      name: 'command',
      message: 'Describe what you want to do (e.g., "my project name is \\"Watt\\". I want to add a key named hello and default value is \\"sdfs\\". platforms are web, ios. add it"): ',
      validate: (input: string) => input ? true : 'Command is required.'
    }
  ]);

  const { projectName, keyName, defaultValue, platforms } = parseCommand(command);
  if (!projectName || !keyName || !defaultValue) {
    console.error('Could not parse command. Please use the format: "my project name is \\"Watt\\". I want to add a key named hello and default value is \\"sdfs\\". platforms are web, ios. add it"');
    process.exit(1);
  }

  const apiKey = process.env.LOKALISE_API_KEY;
  if (!apiKey) {
    console.error('LOKALISE_API_KEY environment variable is required.');
    process.exit(1);
  }

  try {
    const keys: Key[] = [{
      keyName,
      defaultValue,
      platforms: platforms || undefined
    }];
    
    const result = await addKeysToProject({ apiKey, projectName, keys });
    console.log('Key added successfully:', result);
  } catch (error) {
    if (error instanceof Error) {
      console.error(error.message);
      if ('response' in error) {
        console.error('Error from Lokalise:', (error as any).response.data);
      }
    } else {
      console.error('An unknown error occurred');
    }
    process.exit(1);
  }
}

main();