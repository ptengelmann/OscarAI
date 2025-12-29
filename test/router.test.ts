import MockAIProvider from '@/lib/ai-providers/mock-provider'
import ProviderRouter from '@/lib/ai-providers/router'

describe('ProviderRouter', () => {
  it('forwards completion through to provider', async () => {
    const provider = new MockAIProvider()
    const providers = new Map()
    providers.set(provider.getProviderType(), provider)
    const router = new ProviderRouter(providers, provider.getProviderType())

    const res = await router.generateCompletion('hello through router')
    expect(res.content).toContain('mock response')
  })

  it('forwards structured request', async () => {
    const provider = new MockAIProvider({ content: JSON.stringify({ ok: true }), parsed: { ok: true } } as any)
    const providers = new Map()
    providers.set(provider.getProviderType(), provider)
    const router = new ProviderRouter(providers, provider.getProviderType())

    const res = await router.generateStructuredResponse('please json', { type: 'object' })
    expect(res.parsed).toEqual({ ok: true })
  })

  it('allows caller to pick provider via options.providerType', async () => {
    const primary = new MockAIProvider({ content: 'primary' } as any)
    const secondary = new MockAIProvider({ content: 'secondary' } as any)
    const providers = new Map()
    providers.set(primary.getProviderType(), primary)
    providers.set(secondary.getProviderType(), secondary)

    const router = new ProviderRouter(providers, primary.getProviderType())
    const res = await router.generateCompletion('choose provider', { providerType: secondary.getProviderType() })
    // Expect secondary provider response
    expect(res.content).toContain('secondary')
  })
})
