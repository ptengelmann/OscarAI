import {
  AIProviderInterface,
  AIResponse,
  AIStructuredResponse,
  AIProviderConfig
} from './ai-provider-types'

/**
 * MockAIProvider
 * - Accepts an optional predefined response (or a function to generate one)
 * - Logs all inputs to console for visibility in tests
 */
export class MockAIProvider implements AIProviderInterface {
  private predefined: AIResponse | AIStructuredResponse | ((prompt: string, schema?: any, options?: AIProviderConfig) => AIResponse | AIStructuredResponse)

  constructor(predefined?: AIResponse | AIStructuredResponse | ((prompt: string, schema?: any, options?: AIProviderConfig) => AIResponse | AIStructuredResponse)) {
    this.predefined = predefined || {
      content: 'mock response',
      usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
      model: 'mock-model',
  provider: 'mock',
      timestamp: new Date().toISOString()
    }
  }

  getProviderType(): string {
    return 'mock'
  }

  async isAvailable(): Promise<boolean> {
    return true
  }

  isLocal(): boolean {
    // Mock provider is local by nature (no network calls)
    return true
  }

  async validateConfig(): Promise<boolean> {
    return true
  }

  private resolvePredefined(prompt: string, schema?: any, options?: AIProviderConfig): AIResponse | AIStructuredResponse {
    if (typeof this.predefined === 'function') {
      return (this.predefined as any)(prompt, schema, options)
    }
    return this.predefined as AIResponse | AIStructuredResponse
  }

  async generateCompletion(prompt: string, options?: AIProviderConfig): Promise<AIResponse> {

    const resolved = this.resolvePredefined(prompt, undefined, options)

    // If resolved is a structured response, return a plain AIResponse view
    const response: AIResponse = {
      content: (resolved as any).content ?? JSON.stringify((resolved as any).parsed ?? ''),
      usage: (resolved as any).usage,
      model: (resolved as any).model,
      provider: 'mock',
      timestamp: new Date().toISOString()
    }

    return response
  }

  async generateStructuredResponse<T = any>(prompt: string, schema?: any, options?: AIProviderConfig): Promise<AIStructuredResponse<T>> {

    const resolved = this.resolvePredefined(prompt, schema, options)

    // If the predefined response already has parsed, return it
    if ((resolved as AIStructuredResponse<T>).parsed !== undefined) {
      return {
        content: (resolved as any).content ?? JSON.stringify((resolved as any).parsed),
        parsed: (resolved as any).parsed,
        raw_content: (resolved as any).raw_content ?? (resolved as any).content,
        usage: (resolved as any).usage,
        model: (resolved as any).model,
        provider: 'mock',
        timestamp: new Date().toISOString()
      }
    }

    // Otherwise, attempt to parse content as JSON; if not possible, return a wrapper
    const content = (resolved as any).content ?? JSON.stringify(null)
    let parsed: any = null
    try {
      parsed = JSON.parse(content)
    } catch (e) {
      // if parse fails, return the content under a generic field
      parsed = { result: content }
    }

    return {
      content,
      parsed,
      raw_content: content,
      usage: (resolved as any).usage,
      model: (resolved as any).model,
      provider: 'mock',
      timestamp: new Date().toISOString()
    }
  }
}

export default MockAIProvider
