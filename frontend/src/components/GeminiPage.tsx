import React from 'react';
import AIProviderPage from './AIProviderPage';

export default function GeminiPage() {
  return (
    <AIProviderPage config={{
      provider: 'gemini',
      label: 'Gemini',
      emoji: '💎',
      color: '#3b82f6',
      modelLabel: 'gemini-2.0-flash · Google DeepMind',
      envKey: 'GEMINI_API_KEY',
      docsUrl: 'https://aistudio.google.com/app/apikeys',
    }} />
  );
}
