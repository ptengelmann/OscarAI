import fs from 'fs'
import path from 'path'

describe('AI engines config error cases and helpers', () => {
  const TMP = path.resolve(process.cwd(), 'tmp-ai-engines.json')

  afterEach(() => {
    try { fs.unlinkSync(TMP) } catch (e) { /* ignore */ }
    delete process.env.AI_ENGINES_CONFIG
    jest.resetModules()
  })

  it('throws when file is missing', () => {
    process.env.AI_ENGINES_CONFIG = path.resolve(process.cwd(), 'does-not-exist.json')
    jest.resetModules()
    const { loadAIEnginesConfig } = require('@/lib/ai-engines-config')
    expect(() => loadAIEnginesConfig()).toThrow(/not found/)
  })

  it('throws on invalid JSON', () => {
    fs.writeFileSync(TMP, '{ invalid json')
    process.env.AI_ENGINES_CONFIG = TMP
    jest.resetModules()
    const { loadAIEnginesConfig } = require('@/lib/ai-engines-config')
    expect(() => loadAIEnginesConfig()).toThrow(/Failed to parse/)
  })

  it('throws on invalid schema', () => {
    fs.writeFileSync(TMP, JSON.stringify({ engines: [] }))
    process.env.AI_ENGINES_CONFIG = TMP
    jest.resetModules()
    const { loadAIEnginesConfig } = require('@/lib/ai-engines-config')
    expect(() => loadAIEnginesConfig()).toThrow(/validation error/)
  })

  it('throws when default does not match any engine id', () => {
    fs.writeFileSync(TMP, JSON.stringify({ default: 'nope', engines: [{ id: 'a', provider: 'x' }] }))
    process.env.AI_ENGINES_CONFIG = TMP
    jest.resetModules()
    const { loadAIEnginesConfig } = require('@/lib/ai-engines-config')
    expect(() => loadAIEnginesConfig()).toThrow(/does not match any engine id/)
  })

  it('getProviderTypesFromConfig and getEngineById work', () => {
    const cfg = { default: 'a', engines: [{ id: 'a', provider: 'p1' }, { id: 'b', provider: 'p2' }] }
    const { getProviderTypesFromConfig, getEngineById } = require('@/lib/ai-engines-config')
    const providers = getProviderTypesFromConfig(cfg)
    expect(providers.sort()).toEqual(['p1', 'p2'].sort())
    expect(getEngineById('b', cfg)).toEqual({ id: 'b', provider: 'p2' })
  })
})
