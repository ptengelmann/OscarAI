import { loadAIEnginesConfig, getAIEnginesConfig, AIEnginesConfig } from '@/lib/ai-engines-config'
import fs from 'fs'
import path from 'path'

describe('ai-engines-config (unit)', () => {
  const configPath = path.resolve(process.cwd(), 'config', 'ai-engines.config.json')
  let originalEnv: string | undefined
  let configBackup: string | undefined

  beforeAll(() => {
    if (fs.existsSync(configPath)) {
      configBackup = fs.readFileSync(configPath, 'utf-8')
    }
  })

  afterAll(() => {
    if (configBackup !== undefined) {
      fs.writeFileSync(configPath, configBackup, 'utf-8')
    }
  })

  it('loads a valid config file', () => {
    const config = loadAIEnginesConfig()
    expect(config).toHaveProperty('default')
    expect(Array.isArray(config.engines)).toBe(true)
    expect(config.engines.length).toBeGreaterThan(0)
  })

  it('throws if config file is missing', () => {
    if (fs.existsSync(configPath)) {
      fs.renameSync(configPath, configPath + '.bak')
    }
    expect(() => loadAIEnginesConfig()).toThrow(/not found/)
    if (fs.existsSync(configPath + '.bak')) {
      fs.renameSync(configPath + '.bak', configPath)
    }
  })
})
