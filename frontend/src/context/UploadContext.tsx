import React, { createContext, useContext, useState } from 'react';

export interface VizData {
  meta: { row_count: number; columns: string[] };
  records: Record<string, any>[];
  numeric_summaries: Record<string, { min: number; max: number; mean: number }>;
  relationships: Record<string, any>;
}

export interface AIInsights {
  recommendations?: { chart_type: string; reason: string; priority: number }[];
  insights?: string[];
  suggested_title?: string;
  error?: string;
}

export interface UploadResult {
  viz_data: VizData;
  ai_insights: AIInsights;
  fileName: string;
}

interface UploadContextValue {
  result: UploadResult | null;
  setResult: (r: UploadResult | null) => void;
}

const UploadContext = createContext<UploadContextValue>({
  result: null,
  setResult: () => {},
});

export function UploadProvider({ children }: { children: React.ReactNode }) {
  const [result, setResult] = useState<UploadResult | null>(null);
  return (
    <UploadContext.Provider value={{ result, setResult }}>
      {children}
    </UploadContext.Provider>
  );
}

export function useUpload() {
  return useContext(UploadContext);
}
