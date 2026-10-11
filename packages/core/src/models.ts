export interface Plan {
  id: string;
  ticker: string;
  amount_usdt: number;
  cron: string;
  tolerance_bps: number;
  window_hours: number;
  must_buy: boolean;
  active: boolean;
  created_at: string;
}

export interface Sample {
  id: number;
  ts: string;
  ticker: string;
  issuer: string;
  token_address: string;
  size_usdt: number;
  market_status: string;
  reason_code: string;
  vendor?: string;
  price_impact_pct?: number;
  fee_usd?: number;
  tokens_out?: number;
  token_price?: number;
  reference_price?: number;
  share_ratio?: number;
  benchmark_price?: number;
  benchmark_kind?: 'on_chain_token_price' | 'small_size_quote' | 'peer_issuer_quote';
  cost_bps?: number;
  latency_ms?: number;
  error?: string;
}

export type OrderState =
  | 'PLANNED'
  | 'READINESS_OK'
  | 'QUOTED'
  | 'APPROVED'
  | 'BUILT'
  | 'SIGNED'
  | 'SUBMITTED'
  | 'PENDING_VENDOR'
  | 'PENDING_ONCHAIN'
  | 'FILLED'
  | 'DEFERRED'
  | 'SKIPPED'
  | 'EXPIRED'
  | 'FAILED'
  | 'CANCELLED';

export interface OrderTransition {
  state: OrderState;
  timestamp: string;
  details?: string;
}

export interface Order {
  id: string;
  plan_id?: string;
  ts: string;
  state: OrderState;
  issuer: string;
  vendor: string;
  request_id: string;
  quote_id: string;
  rfq_order_id?: string;
  retries: number;
  tx_hash?: string;
  usdt_spent: number;
  tokens_out: number;
  cost_bps: number;
  defer_reason?: string;
  receipt_text: string;
  transitions: OrderTransition[];
}

export interface DxEvent {
  id: number;
  ts: string;
  category: 'onboarding' | 'docs' | 'api_pitfall' | 'latency' | 'ai_stack' | 'tokenized_stock' | 'redesign' | 'capability';
  endpoint: string;
  latency_ms: number;
  error_code?: string;
  error_message?: string;
  docs_page?: string;
  note: string;
}

export interface ReceiptInfo {
  ticker: string;
  usdt_spent: number;
  tokens_received: number;
  share_equivalent: number;
  eff_price_per_share: number;
  benchmark_price: number;
  benchmark_kind: string;
  cost_bps: number;
  cost_usd: number;
  issuer: string;
  vendor: string;
  fee_usd: number;
  price_impact_pct: number;
  status: OrderState;
  tx_hash?: string;
  attestation_url?: string;
  retries: number;
  defer_reason?: string;
  receipt_text: string;
}
