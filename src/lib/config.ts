import fs from 'fs';
import path from 'path';
import { z } from 'zod';

// Define config schema (no sensitive data)
const ConfigSchema = z.object({
  aiEngineConfigPath: z.string(),
});

// Get config path from env or fallback to local or default
let configPath = process.env.APP_CONFIG_PATH;
if (!configPath) {
  if (process.env.NODE_ENV === 'development') {
    configPath = path.resolve(process.cwd(), 'config/local.json');
  } else {
    configPath = path.resolve(process.cwd(), 'config/default.json');
  }
}

// Read and parse config file
let configRaw: string;
try {
  configRaw = fs.readFileSync(configPath, 'utf-8');
} catch (err) {
  throw new Error(`Config file not found at ${configPath}`);
}

let configJson: any;
try {
  configJson = JSON.parse(configRaw);
} catch (err) {
  throw new Error(`Config file at ${configPath} is not valid JSON.`);
}


const config = ConfigSchema.parse(configJson);
process.env.AI_ENGINES_CONFIG_PATH = config.aiEngineConfigPath;

export default config;
