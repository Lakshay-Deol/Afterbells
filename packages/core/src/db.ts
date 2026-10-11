import * as fs from 'fs';
import * as path from 'path';
import { Plan, Sample, Order, DxEvent } from './models';

export interface DatabaseState {
  plans: Plan[];
  samples: Sample[];
  orders: Order[];
  dx_events: DxEvent[];
}

export class MemoryOrFileDatabase {
  private state: DatabaseState;
  private filePath?: string;

  constructor(filePath?: string) {
    this.filePath = filePath;
    this.state = this.loadInitialState();
  }

  private loadInitialState(): DatabaseState {
    if (this.filePath && fs.existsSync(this.filePath)) {
      try {
        const raw = fs.readFileSync(this.filePath, 'utf-8');
        return JSON.parse(raw);
      } catch {
        // fallback to seed
      }
    }
    return this.createSeedState();
  }

  private save() {
    if (this.filePath) {
      try {
        const dir = path.dirname(this.filePath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(this.filePath, JSON.stringify(this.state, null, 2), 'utf-8');
      } catch {
        // ignore write error in transient envs
      }
    }
  }

  private createSeedState(): DatabaseState {
    const now = Date.now();
    const oneDay = 86400000;
    const oneHour = 3600000;

    // 1. Seed plans
    const plans: Plan[] = [
      {
        id: 'plan-meera-nvda',
        ticker: 'NVDA',
        amount_usdt: 25,
        cron: '0 10 * * 5', // Every Friday 10:00 UTC
        tolerance_bps: 50,  // 0.5%
        window_hours: 24,
        must_buy: false,
        active: true,
        created_at: new Date(now - 7 * oneDay).toISOString()
      },
      {
        id: 'plan-tech-aapl',
        ticker: 'AAPL',
        amount_usdt: 50,
        cron: '0 14 * * 1', // Every Monday 14:00 UTC
        tolerance_bps: 40,
        window_hours: 12,
        must_buy: false,
        active: true,
        created_at: new Date(now - 5 * oneDay).toISOString()
      }
    ];

    // 2. Seed samples (spanning regular, overnight, weekend, across issuers Ondo & bStock, sizes $10, $100, $500)
    const samples: Sample[] = [];
    const tickers = ['NVDA', 'AAPL', 'TSLA'];
    const issuers = ['bstock', 'ondo'];
    const sizes = [10, 100, 500];
    const statuses = ['regular', 'overnight', 'closed'];

    let sampleId = 1;
    // Generate historical samples across last 7 days (including weekend)
    for (let dayOffset = 7; dayOffset >= 0; dayOffset--) {
      const isWeekend = dayOffset === 1 || dayOffset === 2; // e.g. Saturday/Sunday
      const dayTime = now - dayOffset * oneDay;

      for (const ticker of tickers) {
        for (const issuer of issuers) {
          for (const size of sizes) {
            const marketStatus = isWeekend ? 'closed' : (dayOffset % 2 === 0 ? 'regular' : 'overnight');
            const isOndo = issuer === 'ondo';

            // Cost calculation realistic models:
            // Weekend/overnight spreads are wider (+35 to +75 bps)
            // Regular hours are tighter (+12 to +28 bps)
            // $500 size has more price impact than $10
            let baseCostBps = marketStatus === 'regular' ? 18 : (marketStatus === 'overnight' ? 38 : 65);
            if (size === 500) baseCostBps += 12;
            if (isOndo) baseCostBps += 9;

            const basePrice = ticker === 'NVDA' ? 126.40 : (ticker === 'AAPL' ? 232.10 : 218.75);
            const tokenPrice = basePrice * (1 + (baseCostBps / 20000));
            const tokensOut = size / tokenPrice;

            samples.push({
              id: sampleId++,
              ts: new Date(dayTime + (size * 1000)).toISOString(),
              ticker,
              issuer,
              token_address: isOndo
                ? '0x438644A14352D75e3E1Fe2F8D4058d926b47E537'
                : '0xaEc4B58ff2270921008781B85D9d3809C0637Ff0',
              size_usdt: size,
              market_status: marketStatus,
              reason_code: isWeekend ? 'MARKET_CLOSED' : 'TRADING',
              vendor: isOndo ? 'InchFusion' : 'PcsXRfq',
              price_impact_pct: size > 100 ? 0.15 : 0.05,
              fee_usd: isOndo ? size * 0.0025 : size * 0.0015,
              tokens_out: Math.round(tokensOut * 10000) / 10000,
              token_price: Math.round(tokenPrice * 100) / 100,
              reference_price: basePrice,
              share_ratio: 1.0,
              benchmark_price: basePrice,
              benchmark_kind: 'on_chain_token_price',
              cost_bps: baseCostBps,
              latency_ms: Math.floor(Math.random() * 40) + 20
            });
          }
        }
      }
    }

    // 3. Seed orders
    const orders: Order[] = [
      {
        id: 'ord-meera-friday-1',
        plan_id: 'plan-meera-nvda',
        ts: new Date(now - 7 * oneDay + 10 * oneHour).toISOString(),
        state: 'FILLED',
        issuer: 'bstock',
        vendor: 'PcsXRfq',
        request_id: 'req-019a-4f51-b883',
        quote_id: 'quote-pcs-8921',
        rfq_order_id: 'rfq-pcs-ord-8921',
        retries: 0,
        tx_hash: '0x8f2a1b94e3207c917b2b415a7cf3008d6c771fae890b23f510cd57a229a1b021',
        usdt_spent: 25.00,
        tokens_out: 0.1977,
        cost_bps: 22,
        receipt_text:
          'Bought 0.1977 NVDA shares ($25.00 USDT) via bstock on BSC.\n' +
          'Effective price: $126.45 / share (+22 bps extra cost vs on chain token price: $126.40).\n' +
          'Route: Executed with vendor PcsXRfq via RFQ.\n' +
          'Protocol fees: $0.04 | Price impact: 0.05%.\n' +
          'Attestation: Daily reserve verification link active.\n' +
          'Transaction: 0x8f2a1b94...29a1b021. Status: FILLED.',
        transitions: [
          { state: 'PLANNED', timestamp: new Date(now - 7 * oneDay + 10 * oneHour).toISOString() },
          { state: 'READINESS_OK', timestamp: new Date(now - 7 * oneDay + 10 * oneHour + 1000).toISOString() },
          { state: 'QUOTED', timestamp: new Date(now - 7 * oneDay + 10 * oneHour + 2000).toISOString() },
          { state: 'APPROVED', timestamp: new Date(now - 7 * oneDay + 10 * oneHour + 4000).toISOString() },
          { state: 'BUILT', timestamp: new Date(now - 7 * oneDay + 10 * oneHour + 5000).toISOString() },
          { state: 'SIGNED', timestamp: new Date(now - 7 * oneDay + 10 * oneHour + 6000).toISOString() },
          { state: 'SUBMITTED', timestamp: new Date(now - 7 * oneDay + 10 * oneHour + 7000).toISOString() },
          { state: 'FILLED', timestamp: new Date(now - 7 * oneDay + 10 * oneHour + 9000).toISOString() }
        ]
      },
      {
        id: 'ord-meera-earnings-deferred',
        plan_id: 'plan-meera-nvda',
        ts: new Date(now - 2 * oneHour).toISOString(),
        state: 'DEFERRED',
        issuer: 'bstock',
        vendor: 'PcsXRfq',
        request_id: 'req-019b-7e12-c419',
        quote_id: 'none',
        retries: 0,
        usdt_spent: 25.00,
        tokens_out: 0,
        cost_bps: 0,
        defer_reason: 'Trading restricted: corporate earnings window in effect (ASSET_LIMITED: earnings)',
        receipt_text:
          'Order Deferred: NVDA recurring buy ($25.00 USDT) was deferred.\n' +
          'Reason: Trading restricted: corporate earnings window in effect (ASSET_LIMITED: earnings).\n' +
          'Status: Waiting for next trading window. No funds were spent.',
        transitions: [
          { state: 'PLANNED', timestamp: new Date(now - 2 * oneHour).toISOString() },
          { state: 'DEFERRED', timestamp: new Date(now - 2 * oneHour + 500).toISOString(), details: 'ASSET_LIMITED' }
        ]
      }
    ];

    // 4. Seed DX events (documenting onboarding, docs discrepancy, latency, rfq orderId discovery)
    const dx_events: DxEvent[] = [
      {
        id: 1,
        ts: '2026-10-01T10:14:02.112Z',
        category: 'onboarding',
        endpoint: '/api/v1/dex/market/rwa/platforms',
        latency_ms: 142,
        docs_page: 'https://web3.binance.com/en/dev-docs/authentication',
        note: 'First successful signed call. Used HMAC-SHA256 with ISO-8601 UTC timestamp and Base64 signature. Time to first call: 18 min.'
      },
      {
        id: 2,
        ts: '2026-10-01T10:25:40.540Z',
        category: 'docs',
        endpoint: '/api/v1/dex/aggregator/swap',
        latency_ms: 88,
        error_code: 'DOCS_DISCREPANCY',
        docs_page: 'https://web3.binance.com/en/dev-docs/introduction#aggregator-swap',
        note: 'Discrepancy: Swap documentation mentions orderId in rfq object, but returned payload encapsulates typedDataToSign directly with quoteId matching.'
      },
      {
        id: 3,
        ts: '2026-10-02T14:05:11.205Z',
        category: 'tokenized_stock',
        endpoint: '/api/v1/dex/market/rwa/tokens',
        latency_ms: 45,
        docs_page: 'https://web3.binance.com/en/dev-docs/introduction#rwa-tokens',
        note: 'Confirmed: referencePrice is directly derived from on-chain price (referencePrice ≈ tokenPrice / tokenToShareRatio); cannot serve as independent off-chain quote.'
      },
      {
        id: 4,
        ts: '2026-10-04T22:30:19.412Z',
        category: 'tokenized_stock',
        endpoint: '/api/v1/dex/aggregator/quote',
        latency_ms: 110,
        docs_page: 'https://web3.binance.com/en/dev-docs/introduction#aggregator-quote',
        note: 'Overnight execution spread on bStock expands by +20 bps compared to regular hours, but remains tradable via RFQ.'
      },
      {
        id: 5,
        ts: '2026-10-06T09:15:33.801Z',
        category: 'api_pitfall',
        endpoint: '/api/v1/dex/aggregator/quote',
        latency_ms: 32,
        error_code: '40401',
        error_message: 'QUOTE_EXPIRED',
        docs_page: 'https://web3.binance.com/en/dev-docs/introduction#errors',
        note: 'Quote expired after 30 seconds TTL. Re-quote triggered cleanly (attempt 1 of 3) without crash.'
      }
    ];

    return { plans, samples, orders, dx_events };
  }

  // Plan methods
  public getPlans(): Plan[] {
    return this.state.plans;
  }

  public getPlan(id: string): Plan | undefined {
    return this.state.plans.find(p => p.id === id);
  }

  public savePlan(plan: Plan) {
    const idx = this.state.plans.findIndex(p => p.id === plan.id);
    if (idx >= 0) {
      this.state.plans[idx] = plan;
    } else {
      this.state.plans.unshift(plan);
    }
    this.save();
  }

  public deletePlan(id: string) {
    this.state.plans = this.state.plans.filter(p => p.id !== id);
    this.save();
  }

  // Sample methods
  public getSamples(limit: number = 200, ticker?: string): Sample[] {
    let list = this.state.samples;
    if (ticker) {
      list = list.filter(s => s.ticker.toUpperCase() === ticker.toUpperCase());
    }
    return list.slice(-limit);
  }

  public addSample(sample: Omit<Sample, 'id'>): Sample {
    const newSample: Sample = {
      ...sample,
      id: this.state.samples.length + 1
    };
    this.state.samples.push(newSample);
    this.save();
    return newSample;
  }

  // Order methods
  public getOrders(limit: number = 50): Order[] {
    return this.state.orders.slice(-limit).reverse();
  }

  public getOrder(id: string): Order | undefined {
    return this.state.orders.find(o => o.id === id);
  }

  public saveOrder(order: Order) {
    const idx = this.state.orders.findIndex(o => o.id === order.id);
    if (idx >= 0) {
      this.state.orders[idx] = order;
    } else {
      this.state.orders.unshift(order);
    }
    this.save();
  }

  // DxEvent methods
  public getDxEvents(limit: number = 200): DxEvent[] {
    return this.state.dx_events.slice(-limit).reverse();
  }

  public addDxEvent(event: Omit<DxEvent, 'id' | 'ts'>): DxEvent {
    const newEvent: DxEvent = {
      ...event,
      id: this.state.dx_events.length + 1,
      ts: new Date().toISOString()
    };
    this.state.dx_events.push(newEvent);
    this.save();
    return newEvent;
  }
}

// Global default db instance
let defaultDbInstance: MemoryOrFileDatabase | null = null;

export function getDatabase(): MemoryOrFileDatabase {
  if (!defaultDbInstance) {
    const storagePath = path.resolve(process.cwd(), 'data/afterbells.json');
    defaultDbInstance = new MemoryOrFileDatabase(storagePath);
  }
  return defaultDbInstance;
}
