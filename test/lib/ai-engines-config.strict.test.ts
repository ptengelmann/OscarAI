import fs from 'fs'
import path from 'path'
import { loadAIEnginesConfig } from '../../src/lib/ai-engines-config'

describe('AI engines config loader (strict config path)', () => {
  const TEST_CONFIG_PATH = './test/lib/fixtures/ai-engines.config.json'
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

  it('loads a valid config from config.aiEngineConfigPath', () => {
    jest.resetModules()
    jest.doMock('../../src/lib/config', () => ({
      __esModule: true,
      default: { aiEngineConfigPath: TEST_CONFIG_PATH }
    }))
    const { loadAIEnginesConfig } = require('../../src/lib/ai-engines-config')
    const cfg = loadAIEnginesConfig()
    expect(cfg.default).toBe('mock')
    expect(cfg.engines[0].provider).toBe('mock')
  })

  it('throws if aiEngineConfigPath is missing in config', () => {
    jest.resetModules()
    jest.doMock('../../src/lib/config', () => ({
      __esModule: true,
      default: { }
    }))
    expect(() => require('../../src/lib/ai-engines-config').loadAIEnginesConfig()).toThrow(/aiEngineConfigPath is missing/)
  })

  it('throws if config file does not exist', () => {
    jest.resetModules()
    jest.doMock('../../src/lib/config', () => ({
      __esModule: true,
      default: { aiEngineConfigPath: './does-not-exist.json' }
    }))
    expect(() => require('../../src/lib/ai-engines-config').loadAIEnginesConfig()).toThrow(/not found at path/)
  })

  it('throws if config file is invalid JSON', () => {
    const badPath = './test/lib/fixtures/bad-ai-engines.config.json'
    fs.writeFileSync(badPath, '{ not json }')
    jest.resetModules()
    jest.doMock('../../src/lib/config', () => ({
      __esModule: true,
      default: { aiEngineConfigPath: badPath }
    }))
    expect(() => require('../../src/lib/ai-engines-config').loadAIEnginesConfig()).toThrow(/Failed to parse/)
    fs.unlinkSync(badPath)
  })

  it('throws if config file fails schema validation', () => {
    const badPath = './test/lib/fixtures/bad-ai-engines.config.json'
    fs.writeFileSync(badPath, JSON.stringify({ foo: 'bar' }))
    jest.resetModules()
    jest.doMock('../../src/lib/config', () => ({
      __esModule: true,
      default: { aiEngineConfigPath: badPath }
    }))
    expect(() => require('../../src/lib/ai-engines-config').loadAIEnginesConfig()).toThrow(/validation error/)
    fs.unlinkSync(badPath)
  })

  it('throws if default engine id is not found', () => {
    const badConfig = { default: 'notfound', engines: [{ id: 'mock', provider: 'mock' }] }
    const badPath = './test/lib/fixtures/bad-ai-engines.config.json'
    fs.writeFileSync(badPath, JSON.stringify(badConfig))
    jest.resetModules()
    jest.doMock('../../src/lib/config', () => ({
      __esModule: true,
      default: { aiEngineConfigPath: badPath }
    }))
    expect(() => require('../../src/lib/ai-engines-config').loadAIEnginesConfig()).toThrow(/does not match any engine id/)
    fs.unlinkSync(badPath)
  })
})
