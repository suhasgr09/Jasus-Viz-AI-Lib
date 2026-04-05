import { useState, useEffect } from 'react';
import axios from 'axios';

export interface SaleRow {
  order_id: number;
  customer_id: number;
  product_id: number;
  order_date: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  region: string;
  category: string;
}

export interface PaymentRow {
  payment_id: number;
  order_id: number;
  customer_id: number;
  payment_date: string;
  payment_method: string;
  amount: number;
  status: 'completed' | 'pending' | 'failed' | 'refunded';
  processor_fee: number;
  net_amount: number;
  currency: string;
  region: string;
  category: string;
}

export interface DemoSummary {
  total_orders: number;
  total_revenue: number;
  total_collected: number;
  total_fees: number;
  avg_order_value: number;
  payment_success_rate: number;
  method_totals: Record<string, number>;
  status_counts: Record<string, number>;
}

export interface SalesPaymentData {
  sales: SaleRow[];
  payments: PaymentRow[];
  summary: DemoSummary;
}

/** Derives the full dataset client-side without needing the API. */
function buildFallback(): SalesPaymentData {
  const REGIONS = ['North', 'South', 'East', 'West', 'Central'];
  const CATS = ['Electronics', 'Clothing', 'Home & Garden', 'Sports', 'Books', 'Food'];
  const METHODS = ['Credit Card', 'Debit Card', 'PayPal', 'Bank Transfer', 'Crypto'];
  const METHOD_WEIGHTS = [0.42, 0.24, 0.18, 0.11, 0.05];
  const STATUSES = ['completed', 'pending', 'failed', 'refunded'] as const;
  const STATUS_WEIGHTS = [0.90, 0.04, 0.04, 0.02];
  const FEE_RATE: Record<string, number> = {
    'Credit Card': 0.029, 'Debit Card': 0.015, 'PayPal': 0.034,
    'Bank Transfer': 0.005, 'Crypto': 0.010,
  };

  const weighted = <T>(items: T[], weights: number[]): T => {
    const r = Math.random();
    let cum = 0;
    for (let i = 0; i < items.length; i++) { cum += weights[i]; if (r <= cum) return items[i]; }
    return items[items.length - 1];
  };

  const randDate = (startYear: number, monthOffset: number) => {
    const m = (startYear * 12 + monthOffset) % 24;
    const year = 2023 + Math.floor(m / 12);
    const month = (m % 12) + 1;
    const day = Math.floor(Math.random() * 28) + 1;
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };

  const sales: SaleRow[] = Array.from({ length: 500 }, (_, i) => {
    const qty = Math.floor(Math.random() * 15) + 1;
    const price = +(Math.random() * 490 + 10).toFixed(2);
    return {
      order_id: i + 1, customer_id: Math.floor(Math.random() * 200) + 1,
      product_id: Math.floor(Math.random() * 50) + 1,
      order_date: randDate(0, i % 24), quantity: qty, unit_price: price,
      total_amount: +(qty * price).toFixed(2),
      region: REGIONS[Math.floor(Math.random() * REGIONS.length)],
      category: CATS[Math.floor(Math.random() * CATS.length)],
    };
  });

  const payments: PaymentRow[] = sales.map((s, i) => {
    const method = weighted(METHODS, METHOD_WEIGHTS);
    const status = weighted(STATUSES as unknown as string[], STATUS_WEIGHTS) as PaymentRow['status'];
    const fee = +(s.total_amount * FEE_RATE[method] + Math.random() * 0.4 + 0.1).toFixed(2);
    return {
      payment_id: i + 1, order_id: s.order_id, customer_id: s.customer_id,
      payment_date: s.order_date, payment_method: method, amount: s.total_amount,
      status, processor_fee: fee,
      net_amount: status === 'completed' ? +(s.total_amount - fee).toFixed(2) : 0,
      currency: 'USD', region: s.region, category: s.category,
    };
  });

  const completed = payments.filter(p => p.status === 'completed');
  const method_totals: Record<string, number> = {};
  const status_counts: Record<string, number> = {};
  completed.forEach(p => { method_totals[p.payment_method] = (method_totals[p.payment_method] ?? 0) + p.net_amount; });
  payments.forEach(p => { status_counts[p.status] = (status_counts[p.status] ?? 0) + 1; });

  const total_revenue = sales.reduce((s, r) => s + r.total_amount, 0);
  const total_collected = completed.reduce((s, r) => s + r.net_amount, 0);
  return {
    sales, payments,
    summary: {
      total_orders: sales.length,
      total_revenue: +total_revenue.toFixed(2),
      total_collected: +total_collected.toFixed(2),
      total_fees: +completed.reduce((s, r) => s + r.processor_fee, 0).toFixed(2),
      avg_order_value: +(total_revenue / sales.length).toFixed(2),
      payment_success_rate: +((completed.length / payments.length) * 100).toFixed(1),
      method_totals, status_counts,
    },
  };
}

export function useSalesPaymentData() {
  const [data, setData] = useState<SalesPaymentData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get<SalesPaymentData>('/api/demo/sales-payments')
      .then(res => { setData(res.data); setLoading(false); })
      .catch(() => { setData(buildFallback()); setLoading(false); });
  }, []);

  return { data, loading };
}
