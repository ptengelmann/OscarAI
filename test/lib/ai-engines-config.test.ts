import path from 'path'

describe('AI engines config loader', () => {
  const CONFIG_PATH = path.resolve(process.cwd(), 'config', 'ai-engines.config.json')

  beforeEach(() => {
    // set env var to ensure loader picks up the known file
    process.env.AI_ENGINES_CONFIG = CONFIG_PATH
    // clear jest module cache to ensure fresh read
    jest.resetModules()
  })

  afterEach(() => {
    delete process.env.AI_ENGINES_CONFIG
  })

  it('loads and validates the config file', () => {
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
