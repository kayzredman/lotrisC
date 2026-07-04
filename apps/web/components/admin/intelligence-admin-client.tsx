'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  useAiProviders,
  useConnectAiProvider,
  useIntelligenceConfig,
  useTestAiConnection,
  useUpdateIntelligenceConfig,
} from '@/lib/api/hooks/useIntelligence';
import { MicrosoftSignInButton } from '@/components/auth/microsoft-sign-in-button';
import { AiProviderLogo, type AiProviderId } from '@/components/brand/ai-provider-logos';
import { apiFetch } from '@/lib/api/client';
import {
  BookOpen,
  Bot,
  Check,
  CheckCircle2,
  FileText,
  MessageSquare,
  PlugZap,
  Zap,
} from 'lucide-react';

type ProviderId = AiProviderId;

type ProviderMeta = {
  id: ProviderId;
  label: string;
  desc: string;
  color: string;
  bg: string;
};

const PROVIDERS: ProviderMeta[] = [
  { id: 'CLAUDE', label: 'Claude', desc: 'Anthropic Claude API', color: '#D97757', bg: 'rgba(217,119,87,0.1)' },
  { id: 'CURSOR', label: 'Cursor', desc: 'Cursor IDE account', color: '#0B0B0B', bg: 'rgba(11,11,11,0.06)' },
  { id: 'CHATGPT', label: 'ChatGPT', desc: 'OpenAI ChatGPT', color: '#10A37F', bg: 'rgba(16,163,127,0.1)' },
  { id: 'COPILOT', label: 'Copilot', desc: 'Microsoft 365 Copilot', color: '#0078D4', bg: 'rgba(0,120,212,0.1)' },
  { id: 'OPENAI', label: 'OpenAI', desc: 'OpenAI API direct', color: '#412991', bg: 'rgba(65,41,145,0.1)' },
];

const FEATURES = [
  { key: 'featureRcaSuggest', label: 'RCA AI suggest', desc: 'Draft RCA fields in the wizard', icon: Bot },
  { key: 'featureKnowledgeCopilot', label: 'Knowledge base Q&A', desc: 'Ask Knowledge Base on incidents', icon: BookOpen },
  { key: 'featureReportNarrative', label: 'Report narratives', desc: 'AI summaries for reports', icon: FileText },
  { key: 'teamsEnabled', label: 'Teams alerts', desc: 'Webhook notifications to Teams', icon: MessageSquare },
] as const;

function StepBadge({ n, label, active, done }: { n: number; label: string; active: boolean; done: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{
        width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 12, fontWeight: 700,
        background: done ? 'var(--green)' : active ? 'var(--indigo)' : 'var(--bg-subtle)',
        color: done || active ? '#fff' : 'var(--text-muted)',
        border: done || active ? 'none' : '1px solid var(--border)',
      }}>
        {done ? <Check size={13} strokeWidth={3} /> : n}
      </span>
      <span style={{ fontSize: 12, fontWeight: 600, color: active ? 'var(--text-primary)' : 'var(--text-muted)' }}>{label}</span>
    </div>
  );
}

export default function IntelligenceAdminClient() {
  const searchParams = useSearchParams();
  const { data: config, isLoading, refetch } = useIntelligenceConfig();
  const { data: providers } = useAiProviders();
  const connectMutation = useConnectAiProvider();
  const testMutation = useTestAiConnection();
  const updateMutation = useUpdateIntelligenceConfig();

  const [microsoftEnabled, setMicrosoftEnabled] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<ProviderId>('CURSOR');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [form, setForm] = useState({
    providerPath: 'DISABLED',
    featureRcaSuggest: true,
    featureKnowledgeCopilot: true,
    featureReportNarrative: false,
    teamsEnabled: false,
    teamsWebhookUrl: '',
    monthlyQueryQuota: 500,
    azureOpenaiEndpoint: '',
    azureOpenaiDeploymentChat: '',
    azureOpenaiDeploymentEmbed: '',
    azureOpenaiApiKey: '',
  });

  useEffect(() => {
    void apiFetch<{ microsoft?: boolean }>('/api/v1/auth/providers')
      .then((p) => setMicrosoftEnabled(Boolean(p.microsoft)))
      .catch(() => setMicrosoftEnabled(false));
  }, []);

  useEffect(() => {
    const entra = searchParams.get('entra');
    if (entra === 'connected') {
      setMessage('Copilot connected via Microsoft sign-in.');
      void refetch();
    } else if (entra === 'error') {
      setMessage(searchParams.get('message') ?? 'Microsoft connect failed.');
    }
  }, [searchParams, refetch]);

  useEffect(() => {
    if (!config) return;
    const c = config as Record<string, unknown>;
    const provider = String(c.providerPath ?? 'DISABLED');
    setForm({
      providerPath: provider,
      featureRcaSuggest: Boolean(c.featureRcaSuggest),
      featureKnowledgeCopilot: Boolean(c.featureKnowledgeCopilot),
      featureReportNarrative: Boolean(c.featureReportNarrative),
      teamsEnabled: Boolean(c.teamsEnabled),
      teamsWebhookUrl: String(c.teamsWebhookUrl ?? ''),
      monthlyQueryQuota: Number(c.monthlyQueryQuota ?? 500),
      azureOpenaiEndpoint: String(c.azureOpenaiEndpoint ?? ''),
      azureOpenaiDeploymentChat: String(c.azureOpenaiDeploymentChat ?? ''),
      azureOpenaiDeploymentEmbed: String(c.azureOpenaiDeploymentEmbed ?? ''),
      azureOpenaiApiKey: '',
    });
    if (provider !== 'DISABLED' && PROVIDERS.some((p) => p.id === provider)) {
      setSelectedProvider(provider as ProviderId);
    }
    if (c.aiUsername) setUsername(String(c.aiUsername));
  }, [config]);

  const selectedMeta = (providers as Array<{ id: string; label: string; authType: string; hint?: string }> | undefined)
    ?.find((p) => p.id === selectedProvider);
  const selectedProviderMeta = PROVIDERS.find((p) => p.id === selectedProvider)!;
  const isConnected = Boolean((config as { isConnected?: boolean } | undefined)?.isConnected);
  const connectedProvider = String((config as { providerPath?: string } | undefined)?.providerPath ?? '');
  const connectedAt = (config as { aiConnectedAt?: string; entraConnectedAt?: string } | undefined);
  const connectedProviderMeta = PROVIDERS.find((p) => p.id === connectedProvider);
  const queriesUsed = (config as { queriesThisMonth?: number })?.queriesThisMonth ?? 0;

  function handleConnect(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    connectMutation.mutate(
      { provider: selectedProvider, username, password },
      {
        onSuccess: (res) => {
          const r = res as { message?: string };
          setMessage(r.message ?? 'Connected.');
          setPassword('');
          void refetch();
        },
        onError: (err) => setMessage(err.message),
      },
    );
  }

  function handleMicrosoftConnect() {
    window.location.href = `/api/intelligence/microsoft-login?returnUrl=${encodeURIComponent('/admin/intelligence')}`;
  }

  function handleTest() {
    setMessage(null);
    testMutation.mutate(undefined, {
      onSuccess: (res) => setMessage(String((res as { answer?: string }).answer ?? 'Connection test passed.')),
      onError: (err) => setMessage(err.message),
    });
  }

  function handleSaveFeatures(e: React.FormEvent) {
    e.preventDefault();
    updateMutation.mutate({ ...form, providerPath: connectedProvider || form.providerPath });
  }

  const messageIsError = message && (message.toLowerCase().includes('fail') || message.toLowerCase().includes('reject') || message.toLowerCase().includes('error'));

  return (
    <div>
      <div className="v2-page-header" style={{ marginBottom: 24 }}>
        <div>
          <h1>Intelligence and AI Setup</h1>
          <p>Connect your AI provider and enable intelligence features across Lotris</p>
        </div>
        {isConnected && connectedProviderMeta && (
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '8px 14px', borderRadius: 'var(--radius-md)',
            background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)',
          }}>
            <CheckCircle2 size={16} style={{ color: 'var(--green)' }} />
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--green)' }}>
                Connected to {connectedProviderMeta.label}
              </div>
              {(connectedAt?.aiConnectedAt || connectedAt?.entraConnectedAt) && (
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  {new Date(String(connectedAt.aiConnectedAt ?? connectedAt.entraConnectedAt)).toLocaleString()}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Step progress */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: 20, marginBottom: 24,
        padding: '14px 18px', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border)',
      }}>
        <StepBadge n={1} label="Choose provider" active={!isConnected} done={isConnected} />
        <StepBadge n={2} label="Sign in" active={!isConnected} done={isConnected} />
        <StepBadge n={3} label="Enable features" active={isConnected} done={false} />
      </div>

      {/* Provider picker */}
      <div className="v2-card" style={{ marginBottom: 20 }}>
        <div className="v2-card-header">
          <div className="v2-card-title">Choose your AI provider</div>
        </div>
        <div className="v2-card-body">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
            {PROVIDERS.map((provider) => {
              const isSelected = selectedProvider === provider.id;
              const isActive = isConnected && connectedProvider === provider.id;
              return (
                <button
                  key={provider.id}
                  type="button"
                  onClick={() => setSelectedProvider(provider.id)}
                  style={{
                    position: 'relative',
                    textAlign: 'left',
                    padding: '16px 14px',
                    borderRadius: 'var(--radius-md)',
                    border: isSelected ? `2px solid ${provider.color}` : '1px solid var(--border)',
                    background: isSelected ? provider.bg : 'var(--bg)',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    transition: 'border-color 0.15s, background 0.15s, box-shadow 0.15s',
                    boxShadow: isSelected ? 'var(--shadow-sm)' : 'none',
                  }}
                >
                  {isActive && (
                    <span style={{
                      position: 'absolute', top: 10, right: 10,
                      width: 8, height: 8, borderRadius: '50%', background: 'var(--green)',
                    }} title="Currently connected" />
                  )}
                  <div style={{
                    width: 40, height: 40, borderRadius: 10,
                    background: isSelected ? provider.bg : 'var(--bg-subtle)',
                    border: `1px solid ${isSelected ? provider.color + '33' : 'var(--border)'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    marginBottom: 12,
                  }}>
                    <AiProviderLogo provider={provider.id} size={22} />
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
                    {provider.label}
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--text-muted)', lineHeight: 1.4 }}>
                    {provider.desc}
                  </div>
                  {isSelected && (
                    <div style={{
                      position: 'absolute', bottom: 10, right: 10,
                      width: 20, height: 20, borderRadius: '50%',
                      background: provider.color,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Check size={11} strokeWidth={3} style={{ color: '#fff' }} />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Sign in */}
      <div className="v2-card" style={{ marginBottom: 20, borderTop: `3px solid ${selectedProviderMeta.color}` }}>
        <div className="v2-card-header">
          <div className="v2-card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 28, height: 28, borderRadius: 7,
              background: selectedProviderMeta.bg,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <AiProviderLogo provider={selectedProviderMeta.id} size={18} />
            </div>
            Sign in to {selectedProviderMeta.label}
          </div>
        </div>
        <div className="v2-card-body">
          {selectedProvider === 'COPILOT' ? (
            <div style={{ maxWidth: 480 }}>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16, lineHeight: 1.5 }}>
                Copilot uses your Microsoft work account. You will be redirected to Microsoft&apos;s sign-in page to enter your email and password.
              </p>
              <MicrosoftSignInButton
                size="sm"
                onClick={handleMicrosoftConnect}
                disabled={!microsoftEnabled}
                hint={microsoftEnabled ? undefined : 'Configure Entra in .env (docs/ENTRA-DEV-SETUP.md) and restart the API.'}
              />
            </div>
          ) : (
            <form onSubmit={handleConnect} style={{ display: 'grid', gap: 14, maxWidth: 440 }}>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
                {selectedMeta?.hint ?? 'Enter your account email and API key or password.'}
              </p>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6, color: 'var(--text-muted)' }}>
                  Username / email
                </label>
                <input
                  type="email"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="you@company.com"
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: 13, background: 'var(--bg)' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6, color: 'var(--text-muted)' }}>
                  Password / API key
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={selectedProvider === 'CURSOR' ? 'crsr_… from cursor.com/dashboard' : 'API key or password'}
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: 13, background: 'var(--bg)' }}
                />
              </div>
              <button
                type="submit"
                className="v2-btn v2-btn-primary"
                disabled={connectMutation.isPending}
                style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  alignSelf: 'flex-start', minWidth: 180,
                  background: selectedProviderMeta.color, borderColor: selectedProviderMeta.color,
                }}
              >
                <PlugZap size={16} />
                {connectMutation.isPending ? 'Connecting…' : `Connect ${selectedProviderMeta.label}`}
              </button>
            </form>
          )}

          {isConnected && (
            <div style={{
              marginTop: 20, padding: 16,
              background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border)',
              maxWidth: 440,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <CheckCircle2 size={18} style={{ color: 'var(--green)' }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                  Active connection: {connectedProviderMeta?.label ?? connectedProvider}
                </span>
              </div>
              <button
                type="button"
                className="v2-btn v2-btn-secondary v2-btn-sm"
                onClick={handleTest}
                disabled={testMutation.isPending}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                <Zap size={14} />
                {testMutation.isPending ? 'Testing…' : 'Test connection'}
              </button>
            </div>
          )}

          {message && (
            <div style={{
              marginTop: 16, padding: '10px 14px', borderRadius: 'var(--radius-sm)', fontSize: 12, lineHeight: 1.5,
              background: messageIsError ? 'rgba(220,38,38,0.06)' : 'rgba(34,197,94,0.06)',
              border: `1px solid ${messageIsError ? 'rgba(220,38,38,0.2)' : 'rgba(34,197,94,0.2)'}`,
              color: messageIsError ? '#dc2626' : 'var(--green)',
              maxWidth: 560,
            }}>
              {message}
            </div>
          )}
        </div>
      </div>

      {/* Features */}
      <form className="v2-card" onSubmit={handleSaveFeatures}>
        <div className="v2-card-header">
          <div className="v2-card-title">Intelligence features</div>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            {queriesUsed} / {form.monthlyQueryQuota} queries this month
          </span>
        </div>
        <div className="v2-card-body">
          {isLoading ? (
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Loading…</p>
          ) : (
            <div style={{ display: 'grid', gap: 20 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
                {FEATURES.map((item) => {
                  const enabled = form[item.key as keyof typeof form] as boolean;
                  const Icon = item.icon;
                  return (
                    <label
                      key={item.key}
                      style={{
                        display: 'flex', alignItems: 'flex-start', gap: 12,
                        padding: '14px 16px', borderRadius: 'var(--radius-md)', cursor: 'pointer',
                        border: enabled ? '2px solid var(--indigo)' : '1px solid var(--border)',
                        background: enabled ? 'var(--indigo-dim)' : 'var(--bg)',
                        transition: 'border-color 0.15s, background 0.15s',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={enabled}
                        onChange={(e) => setForm((p) => ({ ...p, [item.key]: e.target.checked }))}
                        style={{ marginTop: 3, accentColor: 'var(--indigo)' }}
                      />
                      <div style={{
                        width: 36, height: 36, borderRadius: 8, flexShrink: 0,
                        background: enabled ? 'rgba(79,70,229,0.12)' : 'var(--bg-subtle)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <Icon size={17} style={{ color: enabled ? 'var(--indigo)' : 'var(--text-muted)' }} />
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 3 }}>{item.label}</div>
                        <div style={{ fontSize: 11.5, color: 'var(--text-muted)', lineHeight: 1.4 }}>{item.desc}</div>
                      </div>
                    </label>
                  );
                })}
              </div>

              {selectedProvider === 'COPILOT' && (
                <div style={{
                  display: 'grid', gap: 10, maxWidth: 560,
                  padding: 16, background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border)',
                }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>Azure OpenAI (Copilot)</div>
                  <input
                    type="text"
                    placeholder="Azure OpenAI endpoint"
                    value={form.azureOpenaiEndpoint}
                    onChange={(e) => setForm((p) => ({ ...p, azureOpenaiEndpoint: e.target.value }))}
                    style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: 13, background: 'var(--bg)' }}
                  />
                  <input
                    type="text"
                    placeholder="Chat deployment name"
                    value={form.azureOpenaiDeploymentChat}
                    onChange={(e) => setForm((p) => ({ ...p, azureOpenaiDeploymentChat: e.target.value }))}
                    style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: 13, background: 'var(--bg)' }}
                  />
                </div>
              )}

              <button
                type="submit"
                className="v2-btn v2-btn-primary"
                disabled={updateMutation.isPending}
                style={{ alignSelf: 'flex-start', minWidth: 200, display: 'inline-flex', alignItems: 'center', gap: 8 }}
              >
                <Check size={16} />
                {updateMutation.isPending ? 'Saving…' : 'Save feature settings'}
              </button>
            </div>
          )}
        </div>
      </form>
    </div>
  );
}
