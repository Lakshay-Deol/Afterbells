import { BinanceClient } from '@afterbells/binance-client';
import { getDatabase } from './db';
import { computeCostMetric } from './cost';
import { BurnerWalletManager } from './wallet';

export class ProbeRunner {
  private client: BinanceClient;
  private wallet: BurnerWalletManager;
  private tickers: string[];
  private sizesUsdt: number[];

  constructor(
    client?: BinanceClient,
    wallet?: BurnerWalletManager,
    tickers: string[] = ['NVDA', 'AAPL', 'TSLA'],
    sizesUsdt: number[] = [10, 100, 500]
  ) {
    this.client = client || new BinanceClient();
    this.wallet = wallet || new BurnerWalletManager();
    this.tickers = tickers;
    this.sizesUsdt = sizesUsdt;
  }

  public async runSampleCycle(): Promise<{ sampledCount: number; errors: number }> {
    const db = getDatabase();
    const userWallet = this.wallet.getAddress();
    let sampledCount = 0;
    let errors = 0;

    for (const ticker of this.tickers) {
      try {
        const search = await this.client.searchTokens(ticker);
        const assets = search.assets || [];

        for (const asset of assets) {
          const platformId = asset.platformId;
          const tokenAddress = asset.tokenContractAddress;

          // Fetch token status & prices
          const prices = await this.client.getPrices([tokenAddress]);
          const priceObj = prices[0];
          const tokenPrice = parseFloat(priceObj?.tokenPrice || '120.00');
          const refPrice = parseFloat(priceObj?.referencePrice || '120.00');

          for (const size of this.sizesUsdt) {
            try {
              const start = Date.now();
              const amountWei = BigInt(Math.floor(size * 1e18)).toString();

              const quote = await this.client.getQuote({
                amount: amountWei,
                fromTokenAddress: '0x55d398326f99059fF775485246999027B3197955',
                toTokenAddress: tokenAddress,
                userWalletAddress: userWallet
              });

              const route = quote.routes?.[0];
              const latency = Date.now() - start;

              if (route) {
                const tokensOut = Number(BigInt(route.toTokenAmount)) / 1e18;
                const cost = computeCostMetric(
                  size,
                  tokensOut,
                  1.0,
                  tokenPrice,
                  'on_chain_token_price'
                );

                db.addSample({
                  ts: new Date().toISOString(),
                  ticker,
                  issuer: platformId,
                  token_address: tokenAddress,
                  size_usdt: size,
                  market_status: 'regular',
                  reason_code: 'TRADING',
                  vendor: route.vendorName,
                  price_impact_pct: parseFloat(route.priceImpactPercent || '0.05'),
                  fee_usd: parseFloat(route.tradeFee || '0.15'),
                  tokens_out: tokensOut,
                  token_price: tokenPrice,
                  reference_price: refPrice,
                  share_ratio: 1.0,
                  benchmark_price: tokenPrice,
                  benchmark_kind: 'on_chain_token_price',
                  cost_bps: cost.costBps,
                  latency_ms: latency
                });
                sampledCount++;
              }
            } catch (err: any) {
              errors++;
              db.addSample({
                ts: new Date().toISOString(),
                ticker,
                issuer: platformId,
                token_address: tokenAddress,
                size_usdt: size,
                market_status: 'unknown',
                reason_code: 'QUOTE_ERROR',
                error: err.message
              });
            }
          }
        }
      } catch (err: any) {
        errors++;
      }
    }

    return { sampledCount, errors };
  }
}
