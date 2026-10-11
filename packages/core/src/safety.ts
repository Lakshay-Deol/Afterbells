export interface SafetyConfig {
  dailyCapUsdt: number;
  killSwitch: boolean;
  allowedTickers: string[];
  maxPriceImpactPercent: number;
  maxSlippagePercent: number;
  maxRequotes: number;
}

export const DEFAULT_SAFETY_CONFIG: SafetyConfig = {
  dailyCapUsdt: parseFloat(process.env.DAILY_CAP_USDT || '50'),
  killSwitch: process.env.KILL_SWITCH === 'true',
  allowedTickers: ['NVDA', 'AAPL', 'TSLA', 'MSFT', 'GOOGL', 'AMZN'],
  maxPriceImpactPercent: 2.0,
  maxSlippagePercent: 1.0,
  maxRequotes: 3
};

export class SafetyGovernor {
  private config: SafetyConfig;
  private dailySpentToday: number = 0;
  private lastResetDay: number = new Date().getUTCDate();

  constructor(config: Partial<SafetyConfig> = {}) {
    this.config = { ...DEFAULT_SAFETY_CONFIG, ...config };
  }

  public setKillSwitch(active: boolean) {
    this.config.killSwitch = active;
  }

  public isKillSwitchActive(): boolean {
    return this.config.killSwitch;
  }

  public getDailySpent(): number {
    this.checkDayReset();
    return this.dailySpentToday;
  }

  public getDailyCap(): number {
    return this.config.dailyCapUsdt;
  }

  private checkDayReset() {
    const today = new Date().getUTCDate();
    if (today !== this.lastResetDay) {
      this.dailySpentToday = 0;
      this.lastResetDay = today;
    }
  }

  public validateOrderIntent(ticker: string, amountUsdt: number): { ok: boolean; reason?: string } {
    if (this.config.killSwitch) {
      return { ok: false, reason: 'SAFETY HALT: Global kill switch is ACTIVE' };
    }

    const upper = ticker.toUpperCase();
    if (!this.config.allowedTickers.includes(upper)) {
      return {
        ok: false,
        reason: `Ticker ${upper} is not on the allowed list (${this.config.allowedTickers.join(', ')})`
      };
    }

    this.checkDayReset();
    if (this.dailySpentToday + amountUsdt > this.config.dailyCapUsdt) {
      return {
        ok: false,
        reason: `Daily spend cap reached: attempting $${amountUsdt.toFixed(2)}, spent today $${this.dailySpentToday.toFixed(2)}, limit $${this.config.dailyCapUsdt.toFixed(2)}`
      };
    }

    return { ok: true };
  }

  public recordSpend(amountUsdt: number) {
    this.checkDayReset();
    this.dailySpentToday += amountUsdt;
  }

  public validateQuoteParameters(priceImpactPct: number, slippagePct: number): { ok: boolean; reason?: string } {
    if (priceImpactPct > this.config.maxPriceImpactPercent) {
      return {
        ok: false,
        reason: `Price impact (${priceImpactPct.toFixed(2)}%) exceeds safety ceiling (${this.config.maxPriceImpactPercent}%)`
      };
    }
    if (slippagePct > this.config.maxSlippagePercent) {
      return {
        ok: false,
        reason: `Slippage (${slippagePct.toFixed(2)}%) exceeds safety ceiling (${this.config.maxSlippagePercent}%)`
      };
    }
    return { ok: true };
  }

  public calculateBoundedApprovalAmount(orderAmountUsdt: number): bigint {
    // Approve exactly enough for this buy plus a 5% buffer, never infinite uint256
    const boundedUsdt = orderAmountUsdt * 1.05;
    return BigInt(Math.floor(boundedUsdt * 1e18));
  }
}
