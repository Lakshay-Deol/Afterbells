import { describe, it, expect } from 'vitest';
import { generateSignatureHeaders } from './signer.js';
import { BinanceClient } from './client.js';

describe('BinanceClient & Signer', () => {
  it('generates valid HMAC-SHA256 signature headers with ISO-8601 UTC timestamp', () => {
    const headers = generateSignatureHeaders(
      'test-api-key',
      'test-secret',
      'GET',
      '/api/v1/dex/market/rwa/platforms'
    );

    expect(headers['X-OC-APIKEY']).toBe('test-api-key');
    expect(headers['X-OC-SIGN']).toBeTruthy();
    expect(headers['X-OC-TIMESTAMP']).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    expect(headers['X-OC-RECV-WINDOW']).toBe('5000');
    expect(headers['X-OC-NONCE']).toBeTruthy();
  });

  it('runs mock client queries and logs DX events', async () => {
    const dxEvents: any[] = [];
    const client = new BinanceClient({
      mockMode: true,
      onDxEvent: (evt) => dxEvents.push(evt)
    });

    const platforms = await client.getPlatforms();
    expect(platforms.length).toBeGreaterThan(0);
    expect(platforms.some(p => p.platformId === 'bstock')).toBe(true);

    const tokens = await client.getTokens();
    expect(tokens.length).toBeGreaterThan(0);

    const quote = await client.getQuote({
      amount: '25000000000000000000',
      fromTokenAddress: '0x55d398326f99059fF775485246999027B3197955',
      toTokenAddress: '0xaEc4B58ff2270921008781B85D9d3809C0637Ff0',
      userWalletAddress: '0x1234567890123456789012345678901234567890'
    });
    expect(quote.routes.length).toBeGreaterThan(0);
    expect(quote.routes[0].vendorName).toBe('PcsXRfq');

    expect(dxEvents.length).toBeGreaterThan(0);
    expect(dxEvents[0].category).toBe('tokenized_stock');
  });
});
