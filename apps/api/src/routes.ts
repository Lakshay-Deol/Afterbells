import {
  getDatabase,
  parseNaturalLanguagePlan,
  OrderExecutor,
  ProbeRunner,
  SafetyGovernor,
  BurnerWalletManager,
  BinanceClient,
  Plan
} from '@afterbells/core';

export interface ApiResponse<T = any> {
  status: number;
  data: T;
}

export async function handleApiRequest(
  method: string,
  pathname: string,
  body?: any
): Promise<ApiResponse> {
  const db = getDatabase();
  const wallet = new BurnerWalletManager();
  const safety = new SafetyGovernor();
  const client = new BinanceClient();

  // 1. Health
  if (method === 'GET' && pathname === '/api/health') {
    return {
      status: 200,
      data: {
        app: 'ok',
        service: 'afterbells-api',
        version: '0.1.0',
        mockMode: client.isMockMode(),
        killSwitch: safety.isKillSwitchActive(),
        dailyCapUsdt: safety.getDailyCap(),
        dailySpentUsdt: safety.getDailySpent()
      }
    };
  }

  // 2. Wallet setup checklist
  if (method === 'GET' && pathname === '/api/wallet/setup') {
    const balances = await wallet.getBalances();
    return {
      status: 200,
      data: {
        walletAddress: wallet.getAddress(),
        isBurnerGenerated: wallet.isGeneratedKey(),
        bnbGasBalance: balances.bnb,
        usdtBalance: balances.usdt,
        usdtAllowance: balances.allowance,
        gasFunded: balances.bnb >= 0.002,
        usdtFunded: balances.usdt >= 25,
        allowanceSufficient: balances.allowance >= 25,
        dailyCapUsdt: safety.getDailyCap(),
        dailySpentUsdt: safety.getDailySpent(),
        killSwitch: safety.isKillSwitchActive()
      }
    };
  }

  // 3. Plans: parse natural language intent
  if (method === 'POST' && pathname === '/api/plans/parse-intent') {
    const text = body?.text || 'Buy $25 of NVDA every Friday. Only if the extra cost is under 0.5%. Try for 24 hours.';
    const parsed = parseNaturalLanguagePlan(text);
    return {
      status: 200,
      data: parsed
    };
  }

  // 4. Plans: list
  if (method === 'GET' && pathname === '/api/plans') {
    return {
      status: 200,
      data: { plans: db.getPlans() }
    };
  }

  // 5. Plans: create
  if (method === 'POST' && pathname === '/api/plans') {
    const plan: Plan = {
      id: `plan-${Date.now()}`,
      ticker: body.ticker || 'NVDA',
      amount_usdt: Number(body.amount_usdt) || 25,
      cron: body.cron || '0 10 * * 5',
      tolerance_bps: Number(body.tolerance_bps) || 50,
      window_hours: Number(body.window_hours) || 24,
      must_buy: Boolean(body.must_buy),
      active: true,
      created_at: new Date().toISOString()
    };
    db.savePlan(plan);
    return {
      status: 201,
      data: plan
    };
  }

  // 6. Plans: delete
  if (method === 'DELETE' && pathname.startsWith('/api/plans/')) {
    const id = pathname.replace('/api/plans/', '');
    db.deletePlan(id);
    return {
      status: 200,
      data: { deleted: true, id }
    };
  }

  // 7. Samples: probe data & stats
  if (method === 'GET' && pathname.startsWith('/api/samples')) {
    const url = new URL(`http://localhost${pathname}`);
    const ticker = url.searchParams.get('ticker') || undefined;
    const samples = db.getSamples(300, ticker);

    // Compute aggregations by issuer and size
    const ondoSamples = samples.filter(s => s.issuer === 'ondo' && s.cost_bps !== undefined);
    const bstockSamples = samples.filter(s => s.issuer === 'bstock' && s.cost_bps !== undefined);

    const avgCostOndo = ondoSamples.length
      ? Math.round(ondoSamples.reduce((acc, s) => acc + (s.cost_bps || 0), 0) / ondoSamples.length)
      : 0;
    const avgCostBstock = bstockSamples.length
      ? Math.round(bstockSamples.reduce((acc, s) => acc + (s.cost_bps || 0), 0) / bstockSamples.length)
      : 0;

    return {
      status: 200,
      data: {
        samples,
        stats: {
          total: samples.length,
          avgCostOndoBps: avgCostOndo,
          avgCostBstockBps: avgCostBstock,
          costDeltaBps: avgCostOndo - avgCostBstock
        }
      }
    };
  }

  // 8. Orders: list
  if (method === 'GET' && pathname === '/api/orders') {
    return {
      status: 200,
      data: { orders: db.getOrders() }
    };
  }

  // 9. Orders: execute now (immediate test/trigger)
  if (method === 'POST' && pathname === '/api/orders/execute-now') {
    const executor = new OrderExecutor();
    const order = await executor.executeScheduledBuy({
      ticker: body?.ticker || 'NVDA',
      amountUsdt: Number(body?.amountUsdt) || 25,
      toleranceBps: Number(body?.toleranceBps) || 50,
      mustBuy: Boolean(body?.mustBuy),
      simulateEarningsPause: Boolean(body?.simulateEarningsPause)
    });
    return {
      status: 200,
      data: order
    };
  }

  // 10. DX Events: list
  if (method === 'GET' && pathname === '/api/dx/events') {
    return {
      status: 200,
      data: { events: db.getDxEvents() }
    };
  }

  // 11. DX Data Appendix Export (Markdown & CSV)
  if (method === 'GET' && pathname === '/api/dx/appendix') {
    const events = db.getDxEvents();
    const samples = db.getSamples();

    // Generate markdown table
    let markdown = '# Afterbell Developer Experience (DX) Appendix\n\n';
    markdown += '## 1. API Verification Events & Findings\n\n';
    markdown += '| Timestamp | Category | Endpoint | Latency | Error / Note |\n';
    markdown += '| --- | --- | --- | --- | --- |\n';
    for (const e of events) {
      markdown += `| ${e.ts} | ${e.category} | \`${e.endpoint}\` | ${e.latency_ms}ms | ${e.note} |\n`;
    }

    markdown += '\n## 2. Tokenized Stocks Execution Spreads\n\n';
    markdown += '| Issuer | Size (USDT) | Market Status | Cost (bps) | Vendor |\n';
    markdown += '| --- | --- | --- | --- | --- |\n';
    for (const s of samples.slice(-15)) {
      markdown += `| ${s.issuer} | $${s.size_usdt} | ${s.market_status} | +${s.cost_bps} bps | ${s.vendor || 'N/A'} |\n`;
    }

    // Generate CSV
    let csv = 'timestamp,category,endpoint,latency_ms,error_code,note\n';
    for (const e of events) {
      csv += `"${e.ts}","${e.category}","${e.endpoint}",${e.latency_ms},"${e.error_code || ''}","${e.note.replaceAll('"', '""')}"\n`;
    }

    return {
      status: 200,
      data: { markdown, csv }
    };
  }

  // 12. Probe: trigger cycle
  if (method === 'POST' && pathname === '/api/probe/run-once') {
    const runner = new ProbeRunner();
    const res = await runner.runSampleCycle();
    return {
      status: 200,
      data: {
        success: true,
        sampledCount: res.sampledCount,
        errors: res.errors,
        timestamp: new Date().toISOString()
      }
    };
  }

  return {
    status: 404,
    data: { error: `Endpoint ${method} ${pathname} not found` }
  };
}
