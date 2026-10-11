import { Plan } from './models';

export function parseNaturalLanguagePlan(input: string): Omit<Plan, 'id' | 'active' | 'created_at'> {
  const text = input.trim();

  // 1. Amount: e.g. "$25" or "25 usdt" or "25 dollars"
  let amountUsdt = 25;
  const amountMatch = text.match(/\$\s*(\d+(?:\.\d+)?)/i) || text.match(/(\d+(?:\.\d+)?)\s*(?:usdt|usd|dollars)/i);
  if (amountMatch) {
    amountUsdt = parseFloat(amountMatch[1]);
  }

  // 2. Ticker: NVDA, AAPL, TSLA, MSFT, etc.
  let ticker = 'NVDA';
  const tickerMatch = text.match(/\b(NVDA|AAPL|TSLA|MSFT|GOOGL|AMZN|META|COIN|MSTR)\b/i);
  if (tickerMatch) {
    ticker = tickerMatch[1].toUpperCase();
  }

  // 3. Frequency / Schedule: "every Friday", "daily", "every Monday", etc.
  let cron = '0 10 * * 5'; // default Friday 10:00 UTC
  const lower = text.toLowerCase();
  if (lower.includes('every friday') || lower.includes('fridays')) {
    cron = '0 10 * * 5';
  } else if (lower.includes('every monday') || lower.includes('mondays')) {
    cron = '0 10 * * 1';
  } else if (lower.includes('daily') || lower.includes('every day')) {
    cron = '0 10 * * *';
  } else if (lower.includes('hourly') || lower.includes('every hour')) {
    cron = '0 * * * *';
  }

  // 4. Tolerance: "under 0.5%" or "under 50 bps" or "tolerance 1%"
  let toleranceBps = 50; // default 0.5% (50 bps)
  const pctMatch = text.match(/(?:under|less than|max(?:imum)?)\s*(\d+(?:\.\d+)?)\s*%/i) ||
                   text.match(/(\d+(?:\.\d+)?)\s*%\s*(?:cost|tolerance|slippage)/i);
  if (pctMatch) {
    toleranceBps = Math.round(parseFloat(pctMatch[1]) * 100);
  } else {
    const bpsMatch = text.match(/(\d+)\s*bps/i);
    if (bpsMatch) {
      toleranceBps = parseInt(bpsMatch[1], 10);
    }
  }

  // 5. Window / Deadline: "Try for 24 hours" or "within 12 hours"
  let windowHours = 24;
  const windowMatch = text.match(/(?:for|within)\s*(\d+)\s*(?:hours|hrs|h)/i);
  if (windowMatch) {
    windowHours = parseInt(windowMatch[1], 10);
  }

  // 6. Must buy opt-in
  const mustBuy = lower.includes('must buy') || lower.includes('force buy') || lower.includes('must_buy');

  return {
    ticker,
    amount_usdt: amountUsdt,
    cron,
    tolerance_bps: toleranceBps,
    window_hours: windowHours,
    must_buy: mustBuy
  };
}
