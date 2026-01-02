import fs from 'fs'
import path from 'path'

describe('ai-engines-config (unit)', () => {
  const TEST_CONFIG_PATH = './test/lib/fixtures/unit-ai-engines.config.json'
  const TEST_CONFIG_ABS = path.resolve(process.cwd(), TEST_CONFIG_PATH)
  const validConfig = {
    default: 'mock',
    engines: [
      { id: 'mock', provider: 'mock', description: 'Mock engine' }
    ]
  }

  beforeAll(() => {
    fs.mkdirSync(path.dirname(TEST_CONFIG_ABS), { recursive: true })
    fs.writeFileSync(TEST_CONFIG_ABS, JSON.stringify(validConfig, null, 2))
  })

  afterAll(() => {
    fs.unlinkSync(TEST_CONFIG_ABS)
  })

  it('loads a valid config file', () => {
    jest.resetModules()
    jest.doMock('@/lib/config', () => ({
      __esModule: true,
      default: { aiEngineConfigPath: TEST_CONFIG_PATH }
    }))
    const { loadAIEnginesConfig } = require('@/lib/ai-engines-config')
    const config = loadAIEnginesConfig()
    expect(config).toHaveProperty('default')
    expect(Array.isArray(config.engines)).toBe(true)
    expect(config.engines.length).toBeGreaterThan(0)
  })

  it('throws if config file is missing', () => {
    jest.resetModules()
    jest.doMock('@/lib/config', () => ({
      __esModule: true,
      default: { aiEngineConfigPath: './does-not-exist.json' }
    }))
    const { loadAIEnginesConfig } = require('@/lib/ai-engines-config')
    expect(() => loadAIEnginesConfig()).toThrow(/not found/)
  })
})
