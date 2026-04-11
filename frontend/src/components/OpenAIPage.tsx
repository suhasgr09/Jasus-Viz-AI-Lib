import React from 'react';
import AIProviderPage from './AIProviderPage';

export default function OpenAIPage() {
  return (
    <AIProviderPage config={{
      provider: 'openai',
      label: 'OpenAI',
      emoji: '⚡',
      color: '#10b981',
      modelLabel: 'gpt-4o · OpenAI',
      envKey: 'OPENAI_API_KEY',
      docsUrl: 'https://platform.openai.com/api-keys',
    }} />
  );
}
