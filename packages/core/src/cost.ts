export interface CostMetricResult {
  effPricePerToken: number;
  effPricePerShare: number;
  costBps: number;
  costUsd: number;
  shareEquivalent: number;
  benchmarkPrice: number;
  benchmarkKind: 'on_chain_token_price' | 'small_size_quote' | 'peer_issuer_quote';
}

export function computeCostMetric(
  usdtSpent: number,
  tokensReceived: number,
  tokenToShareRatio: number,
  benchmarkPrice: number,
  benchmarkKind: 'on_chain_token_price' | 'small_size_quote' | 'peer_issuer_quote' = 'on_chain_token_price'
): CostMetricResult {
  if (tokensReceived <= 0) {
    throw new Error('tokensReceived must be greater than zero');
  }
  if (benchmarkPrice <= 0) {
    throw new Error('benchmarkPrice must be greater than zero');
  }

  const effPricePerToken = usdtSpent / tokensReceived;
  const costBps = ((effPricePerToken - benchmarkPrice) / benchmarkPrice) * 10000;
  const shareEquivalent = tokensReceived * tokenToShareRatio;
  const effPricePerShare = effPricePerToken / (tokenToShareRatio || 1);
  const costUsd = (costBps / 10000) * usdtSpent;

  return {
    effPricePerToken,
    effPricePerShare,
    costBps: Math.round(costBps * 10) / 10,
    costUsd: Math.round(costUsd * 100) / 100,
    shareEquivalent: Math.round(shareEquivalent * 10000) / 10000,
    benchmarkPrice,
    benchmarkKind
  };
}
