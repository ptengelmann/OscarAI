import fs from 'fs'
import path from 'path'
import { z } from 'zod'

const EngineEntrySchema = z.object({
  id: z.string(),
  provider: z.string(),
  description: z.string().optional(),
  params: z.record(z.any()).optional()
})

const AIEnginesConfigSchema = z.object({
  default: z.string(),
  engines: z.array(EngineEntrySchema)
})

export type EngineEntry = z.infer<typeof EngineEntrySchema>
export type AIEnginesConfig = z.infer<typeof AIEnginesConfigSchema>


import config from './config'


/**
 * Load AI engines config from the path specified in config.aiEngineConfigPath.
 * Throws on missing file, missing path, or invalid format.
 * Logs the config path being used.
 */
export function loadAIEnginesConfig(): AIEnginesConfig {
  const configPath = config.aiEngineConfigPath
  if (!configPath || typeof configPath !== 'string') {
    throw new Error('aiEngineConfigPath is missing or invalid in config')
  }
  const resolvedPath = path.resolve(process.cwd(), configPath)
  // Log the path being used
  // eslint-disable-next-line no-console
  console.log(`[AIEnginesConfig] Loading AI engines config from: ${resolvedPath}`)
  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`AI engines config not found at path: ${resolvedPath}`)
  }
  const raw = fs.readFileSync(resolvedPath, 'utf-8')
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch (e) {
    throw new Error(`Failed to parse AI engines config JSON at ${resolvedPath}: ${(e as Error).message}`)
  }
  const result = AIEnginesConfigSchema.safeParse(parsed)
  if (!result.success) {
    throw new Error(`AI engines config validation error: ${result.error.toString()}`)
  }
  // ensure default refers to one of the engine ids
  const defaultId = result.data.default
  const found = result.data.engines.find(e => e.id === defaultId)
  if (!found) {
    throw new Error(`AI engines config default '${defaultId}' does not match any engine id`)
  }
  return result.data
}

export function getAIEnginesConfig(): AIEnginesConfig {
  return loadAIEnginesConfig()
}

export default getAIEnginesConfig

/**
 * Returns a unique list of provider strings derived from the config.
 */
export function getProviderTypesFromConfig(cfg?: AIEnginesConfig): string[] {
  const data = cfg ?? loadAIEnginesConfig()
  const set = new Set<string>()
  for (const e of data.engines) set.add(e.provider)
  return Array.from(set)
}

/**
 * Return engine entry by id or undefined
 */
export function getEngineById(id: string, cfg?: AIEnginesConfig): EngineEntry | undefined {
  const data = cfg ?? loadAIEnginesConfig()
  return data.engines.find(e => e.id === id)
}
