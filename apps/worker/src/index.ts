import {
  BinanceClient,
  ProbeRunner,
  OrderExecutor,
  getDatabase,
  Plan
} from '@afterbells/core';

async function runProbeOnce() {
  console.log('[Worker] Starting execution quality probe cycle...');
  const client = new BinanceClient();
  const runner = new ProbeRunner(client);
  const result = await runner.runSampleCycle();
  console.log(`[Worker] Probe completed: ${result.sampledCount} samples collected (${result.errors} errors).`);
}

async function runSchedulerOnce() {
  console.log('[Worker] Checking active recurring plans...');
  const db = getDatabase();
  const plans = db.getPlans().filter(p => p.active);
  const executor = new OrderExecutor();

  for (const plan of plans) {
    console.log(`[Worker] Evaluating plan ${plan.id} (${plan.ticker} $${plan.amount_usdt} tolerance ${plan.tolerance_bps} bps)...`);
    const order = await executor.executeScheduledBuy({
      plan,
      ticker: plan.ticker,
      amountUsdt: plan.amount_usdt,
      toleranceBps: plan.tolerance_bps,
      mustBuy: plan.must_buy
    });
    console.log(`[Worker] Plan ${plan.id} executed -> Order ${order.id} status: ${order.state}`);
  }
}

async function startLoop() {
  console.log('[Worker] Afterbell background worker started.');
  console.log('[Worker] Probe interval: 15m (denser 5m near open/close). Scheduler interval: 1m.');

  // Run initial probe on start
  await runProbeOnce();
  await runSchedulerOnce();

  // Periodic scheduler (every 60s)
  setInterval(async () => {
    try {
      await runSchedulerOnce();
    } catch (e) {
      console.error('[Worker] Scheduler tick error:', e);
    }
  }, 60000);

  // Periodic probe (every 15m)
  setInterval(async () => {
    try {
      await runProbeOnce();
    } catch (e) {
      console.error('[Worker] Probe tick error:', e);
    }
  }, 15 * 60000);
}

// Entrypoint
const args = process.argv.slice(2);
if (args.includes('--probe-once')) {
  runProbeOnce().then(() => process.exit(0)).catch((err) => {
    console.error(err);
    process.exit(1);
  });
} else if (args.includes('--schedule-once')) {
  runSchedulerOnce().then(() => process.exit(0)).catch((err) => {
    console.error(err);
    process.exit(1);
  });
} else {
  startLoop().catch(console.error);
}
