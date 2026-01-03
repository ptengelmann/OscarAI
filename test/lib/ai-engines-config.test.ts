import fs from 'fs'
import path from 'path'

describe('AI engines config loader', () => {
  const TEST_CONFIG_PATH = './test/lib/fixtures/ai-engines.config.json'
  const TEST_CONFIG_ABS = path.resolve(process.cwd(), TEST_CONFIG_PATH)
  const validConfig = {
    default: 'mock-default',
    engines: [
      { id: 'mock-default', provider: 'mock', description: 'Mock engine' },
      { id: 'openai-text-davinci', provider: 'openai', description: 'OpenAI engine' }
    ]
  }

  beforeAll(() => {
    fs.mkdirSync(path.dirname(TEST_CONFIG_ABS), { recursive: true })
    fs.writeFileSync(TEST_CONFIG_ABS, JSON.stringify(validConfig, null, 2))
  })

  afterAll(() => {
    fs.unlinkSync(TEST_CONFIG_ABS)
  })

  it('loads and validates the config file', () => {
    jest.resetModules()
    jest.doMock('@/lib/config', () => ({
      __esModule: true,
      default: { aiEngineConfigPath: TEST_CONFIG_PATH }
    }))
    const { getAIEnginesConfig } = require('@/lib/ai-engines-config') as {
      getAIEnginesConfig: () => any
    }
    const cfg = getAIEnginesConfig()
    // print the loaded config for visibility in test output
    // eslint-disable-next-line no-console
    console.log('\nLoaded AI engines config:\n', JSON.stringify(cfg, null, 2))
    expect(cfg).toBeDefined()
    expect(cfg.default).toBe('mock-default')
    expect(Array.isArray(cfg.engines)).toBe(true)
    const ids = cfg.engines.map((e: any) => e.id)
    expect(ids).toContain('mock-default')
    expect(ids).toContain('openai-text-davinci')
  })
})
