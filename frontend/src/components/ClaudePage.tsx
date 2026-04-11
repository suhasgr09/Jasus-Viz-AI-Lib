import React from 'react';
import AIProviderPage from './AIProviderPage';

export default function ClaudePage() {
  return (
    <AIProviderPage config={{
      provider: 'claude',
      label: 'Claude',
      emoji: '🧠',
      color: '#a78bfa',
      modelLabel: 'claude-sonnet-4-5 · Anthropic',
      envKey: 'ANTHROPIC_API_KEY',
      docsUrl: 'https://console.anthropic.com/settings/keys',
    }} />
  );
}
