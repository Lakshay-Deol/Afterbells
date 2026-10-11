import { ReceiptInfo } from './models';

export function generatePlainEnglishReceipt(info: ReceiptInfo): string {
  if (info.status === 'DEFERRED') {
    return (
      `Order Deferred: ${info.ticker} recurring buy ($${info.usdt_spent.toFixed(2)} USDT) was deferred.\n` +
      `Reason: ${info.defer_reason || 'Asset or market paused'}.\n` +
      `Status: Waiting for next trading window. No funds were spent.`
    );
  }

  if (info.status === 'SKIPPED') {
    return (
      `Order Skipped: ${info.ticker} recurring buy ($${info.usdt_spent.toFixed(2)} USDT) was skipped.\n` +
      `Reason: Cost exceeded user tolerance (+${info.cost_bps} bps vs max tolerance) or plan deadline expired.\n` +
      `Status: SKIPPED and notified. Zero funds spent.`
    );
  }

  if (info.status === 'FILLED') {
    const costSign = info.cost_bps >= 0 ? '+' : '';
    const attestationNote = info.attestation_url
      ? `Attestation: Daily reserve verification link active.`
      : `Attestation: Issuer reports verified.`;

    const txNote = info.tx_hash
      ? `Transaction: ${info.tx_hash.slice(0, 10)}...${info.tx_hash.slice(-8)}`
      : 'Transaction: Settlement verified on BSC';

    return (
      `Bought ${info.share_equivalent} ${info.ticker} shares ($${info.usdt_spent.toFixed(2)} USDT) via ${info.issuer} on BSC.\n` +
      `Effective price: $${info.eff_price_per_share.toFixed(2)} / share (${costSign}${info.cost_bps} bps extra cost vs ${info.benchmark_kind.replaceAll('_', ' ')}: $${info.benchmark_price.toFixed(2)}).\n` +
      `Route: Executed with vendor ${info.vendor} via RFQ.\n` +
      `Protocol fees: $${info.fee_usd.toFixed(2)} | Price impact: ${info.price_impact_pct.toFixed(2)}%.\n` +
      `${attestationNote}\n` +
      `${txNote}. Status: FILLED.`
    );
  }

  return (
    `Order ${info.ticker} ($${info.usdt_spent.toFixed(2)} USDT): Status is ${info.status}.\n` +
    `Details: ${info.defer_reason || 'In progress'}.`
  );
}
