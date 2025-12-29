import MockAIProvider from '@/lib/ai-providers/mock-provider'

describe('MockAIProvider', () => {
  it('reports available', async () => {
    const provider = new MockAIProvider()
    expect(await provider.isAvailable()).toBe(true)
  expect(provider.getProviderType()).toBe('mock')
  })

  it('returns predefined completion', async () => {
    const predefined = {
      content: 'predefined text',
      usage: { prompt_tokens: 5, completion_tokens: 10, total_tokens: 15 },
      model: 'mock-v1',
  provider: 'mock',
  timestamp: new Date().toISOString(),
    }

    const provider = new MockAIProvider(predefined as any)
    const res = await provider.generateCompletion('hello world', { temperature: 0.5 })

    expect(res.content).toContain('predefined text')
    expect(res.model).toBe('mock-v1')
  expect(res.provider).toBe('mock')
  })

  it('returns parsed structured response when predefined parsed provided', async () => {
    const predefinedStructured = {
      content: JSON.stringify({ foo: 'bar' }),
      parsed: { foo: 'bar' },
      raw_content: JSON.stringify({ foo: 'bar' }),
      usage: { prompt_tokens: 2, completion_tokens: 3, total_tokens: 5 },
  model: 'mock-struct-v1',
  provider: 'mock',
  timestamp: new Date().toISOString(),
    }

    const provider = new MockAIProvider(predefinedStructured as any)
    const res = await provider.generateStructuredResponse('give me json', { type: 'object' })

    expect(res.parsed).toEqual({ foo: 'bar' })
  expect(res.model).toBe('mock-struct-v1')
  expect(res.provider).toBe('mock')
  })

  it('parses JSON when content is JSON string', async () => {
    const predefined = {
      content: JSON.stringify({ a: 1 }),
      usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
  model: 'mock-json',
  provider: 'mock',
  timestamp: new Date().toISOString(),
    }

    const provider = new MockAIProvider(predefined as any)
    const res = await provider.generateStructuredResponse('parse json')

    expect(res.parsed).toEqual({ a: 1 })
  })

  it('uses predefined function and handles non-JSON content', async () => {
    const predefinedFn = (prompt: string) => ({ content: `not json: ${prompt}`, model: 'fn-model', provider: 'mock', usage: {} })
    const provider = new MockAIProvider(predefinedFn as any)
    const res = await provider.generateCompletion('hello fn')
    expect(res.model).toBe('fn-model')
    // now structured response should attempt to parse and return wrapper
    const structured = await provider.generateStructuredResponse('parse me')
    expect(structured.parsed).toHaveProperty('result')
  })
})
