import { useState, useEffect } from 'react';
import axios from 'axios';

export function useSampleData(dataset: 'sales' | 'employees' | 'products') {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    axios.get(`/api/sample-data/${dataset}`)
      .then(res => { setData(res.data.records || []); setLoading(false); })
      .catch(() => {
        // Fallback: generate minimal synthetic data client-side
        setData(generateFallback(dataset));
        setLoading(false);
        setError(null);
      });
  }, [dataset]);

  return { data, loading, error };
}

function generateFallback(dataset: string): any[] {
  if (dataset === 'sales') {
    const regions = ['North', 'South', 'East', 'West', 'Central'];
    const cats = ['Electronics', 'Clothing', 'Home', 'Sports', 'Books'];
    return Array.from({ length: 200 }, (_, i) => ({
      order_id: i + 1,
      customer_id: Math.floor(Math.random() * 100) + 1,
      product_id: Math.floor(Math.random() * 50) + 1,
      order_date: new Date(2023, Math.floor(Math.random() * 24), Math.floor(Math.random() * 28) + 1)
        .toISOString().slice(0, 10),
      quantity: Math.floor(Math.random() * 20) + 1,
      unit_price: +(Math.random() * 495 + 5).toFixed(2),
      total_amount: +(Math.random() * 2000 + 10).toFixed(2),
      region: regions[Math.floor(Math.random() * regions.length)],
      category: cats[Math.floor(Math.random() * cats.length)],
    }));
  }
  if (dataset === 'employees') {
    const depts = ['Engineering', 'Sales', 'Marketing', 'HR', 'Finance'];
    return Array.from({ length: 100 }, (_, i) => ({
      employee_id: i + 1,
      department: depts[Math.floor(Math.random() * depts.length)],
      salary: +(Math.random() * 80000 + 40000).toFixed(2),
      performance_score: +(Math.random() * 3 + 2).toFixed(1),
      years_experience: Math.floor(Math.random() * 20),
    }));
  }
  return [];
}
