import { describe, it, expect, vi } from 'vitest';
import { parseNaturalLanguagePlan } from './parser';
import { computeCostMetric } from './cost';
import { checkReadiness } from './readiness';
import { SafetyGovernor } from './safety';
import { OrderExecutor } from './executor';
import { MemoryOrFileDatabase } from './db';
import * as storage from './db';
import { BurnerWalletManager } from './wallet';
import { RwaToken, BinanceClient } from '@afterbells/binance-client';

describe('Core Engine - Afterbell Specification Parity', () => {
  it('parses Meera persona recurring buy intent into structured parameters', () => {
    const text = 'Buy $25 of NVDA every Friday. Only if the extra cost is under 0.5%. Try for 24 hours.';
    const parsed = parseNaturalLanguagePlan(text);

    expect(parsed.ticker).toBe('NVDA');
    expect(parsed.amount_usdt).toBe(25);
    expect(parsed.tolerance_bps).toBe(50); // 0.5% = 50 bps
    expect(parsed.window_hours).toBe(24);
    expect(parsed.cron).toBe('0 10 * * 5'); // Friday
    expect(parsed.must_buy).toBe(false);
  });

  it('accurately computes effective price per token, cost in bps, and share equivalent', () => {
    // Spent 25 USDT, received 0.1977 tokens, 1:1 share ratio, benchmark 126.40
    const result = computeCostMetric(25, 0.1977, 1.0, 126.40);

    expect(result.effPricePerToken).toBeCloseTo(126.454, 2);
    expect(result.shareEquivalent).toBe(0.1977);
    expect(result.costBps).toBeGreaterThan(0);
  });

  it('defers and explains when token is in an earnings window (ASSET_LIMITED)', () => {
    const earningsToken: RwaToken = {
      platformId: 'bstock',
      underlyingTicker: 'NVDA',
      tokenContractAddress: '0xaEc4B58ff2270921008781B85D9d3809C0637Ff0',
      tokenSymbol: 'bNVDA',
      decimals: 18,
      tokenToShareRatio: 1.0,
      tokenPrice: '126.42',
      referencePrice: '126.40',
      statusInfo: {
        openState: 'pause',
        marketStatus: 'pause',
        reasonCode: 'ASSET_LIMITED',
        reasonMsg: 'Trading restricted: corporate earnings window in effect'
      }
    };

    const readiness = checkReadiness(earningsToken);
    expect(readiness.ready).toBe(false);
    expect(readiness.status).toBe('DEFERRED');
    expect(readiness.reasonCode).toBe('ASSET_LIMITED');
    expect(readiness.deferReason).toContain('earnings');
  });

  it('cannot initialize execution without an explicitly configured signing identity', () => {
    const previousKey = process.env.BURNER_PRIVATE_KEY;
    delete process.env.BURNER_PRIVATE_KEY;
    try {
      expect(() => new OrderExecutor()).toThrow('Signing identity not configured');
    } finally {
      if (previousKey !== undefined) process.env.BURNER_PRIVATE_KEY = previousKey;
    }
  });

  it('starts storage without fabricated plans, financial observations or orders', () => {
    const db = new MemoryOrFileDatabase();
    expect(db.getPlans()).toEqual([]);
    expect(db.getSamples()).toEqual([]);
    expect(db.getOrders()).toEqual([]);
    expect(db.getDxEvents()).toEqual([]);
  });

  it('keeps provider completion without transaction evidence unverified', async () => {
    // Explicit test doubles: no signing key, RPC request or order submission.
    const client = new BinanceClient({ mockMode: true });
    vi.spyOn(client, 'getOrderStatus').mockResolvedValue({ orderId: 'test-order', status: 'FILLED' });
    const wallet = {
      getBalances: async () => ({ bnb: 1, usdt: 100, allowance: 100 }),
      getAddress: () => '0x1111111111111111111111111111111111111111',
      signTypedData: async () => 'test-only-signature'
    } as unknown as BurnerWalletManager;
    vi.spyOn(storage, 'getDatabase').mockReturnValue(new MemoryOrFileDatabase());
    const governor = new SafetyGovernor({ killSwitch: false });
    try {
      const order = await new OrderExecutor(client, wallet, governor).executeScheduledBuy({ ticker: 'NVDA', amountUsdt: 25, toleranceBps: 500 });
      expect(order.state).toBe('PENDING_ONCHAIN');
      expect(order.tx_hash).toBeUndefined();
      expect(order.receipt_text).toContain('Settlement unverified');
      expect(governor.getDailySpent()).toBe(0);
    } finally {
      vi.restoreAllMocks();
    }
  });

  it('enforces safety rails (kill switch and daily spend cap)', () => {
    const governor = new SafetyGovernor({ dailyCapUsdt: 50 });

    governor.setKillSwitch(true);
    const check1 = governor.validateOrderIntent('NVDA', 25);
    expect(check1.ok).toBe(false);
    expect(check1.reason).toContain('kill switch');

    governor.setKillSwitch(false);
    const check2 = governor.validateOrderIntent('NVDA', 25);
    expect(check2.ok).toBe(true);

    governor.recordSpend(40);
    const check3 = governor.validateOrderIntent('NVDA', 20); // 40 + 20 > 50
    expect(check3.ok).toBe(false);
    expect(check3.reason).toContain('Daily spend cap');
  });
});
