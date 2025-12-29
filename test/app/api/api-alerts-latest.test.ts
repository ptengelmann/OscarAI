// Mock next/server to avoid ReferenceError for Request/NextRequest in Jest
jest.mock('next/server', () => ({
  NextRequest: class MockNextRequest {},
  NextResponse: {
    json: jest.fn((data) => ({
      status: 200,
      json: async () => data
    }))
  }
}))

// Mock PostgreSQLService at the module level to prevent real DB connection
jest.mock('@/lib/database-postgres', () => ({
  PostgreSQLService: {
    getLatestAlerts: jest.fn()
  }
}))

import { GET } from '@/app/api/alerts/latest/route'
import { NextRequest } from 'next/server'

describe('GET /api/alerts/latest (unit)', () => {
  it('returns alerts with expected structure', async () => {
    // Mock PostgreSQLService.getLatestAlerts
    const mockAlerts = [
      {
        id: '1',
        type: 'test',
        severity: 'high',
        title: 'Test Alert',
        message: 'Test message',
        sku: 'SKU1',
        urgency_score: 10,
        revenue_at_risk: 100,
        acknowledged: false,
        created_at: new Date().toISOString(),
        product_name: 'Test Product'
      }
    ]
    const { PostgreSQLService } = require('@/lib/database-postgres')
    PostgreSQLService.getLatestAlerts.mockResolvedValueOnce(mockAlerts)

    // Create a mock NextRequest
    const url = 'http://localhost/api/alerts/latest?userId=test@example.com'
    const req = { url } as unknown as NextRequest

    const res = await GET(req)
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
    expect(Array.isArray(json.alerts)).toBe(true)
    expect(json.alerts.length).toBeGreaterThan(0)
    expect(json.alerts[0]).toHaveProperty('id')
    expect(json.alerts[0]).toHaveProperty('message')
    expect(json.alerts[0]).toHaveProperty('created_at')
  })
})
