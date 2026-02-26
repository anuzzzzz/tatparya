import { describe, it, expect } from 'vitest';
import { buildApp } from '../app.js';

describe('Health Router', () => {
  it('GET /health returns ok', async () => {
    const app = await buildApp();
    const response = await app.inject({
      method: 'GET',
      url: '/health',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.status).toBe('ok');
    expect(body.timestamp).toBeDefined();
  });

  it('tRPC health.check returns ok', async () => {
    const app = await buildApp();
    const response = await app.inject({
      method: 'GET',
      url: '/trpc/health.check',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    // tRPC wraps in { result: { data: ... } }
    expect(body.result.data.status).toBe('ok');
    expect(body.result.data.version).toBe('0.1.0');
  });
});
