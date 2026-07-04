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
  ChevronDown,
  FileText,
  MessageSquare,
  PlugZap,
  Ticket,
  Zap,
} from 'lucide-react';

type ProviderId = AiProviderId;

type ProviderMeta = {
  id: ProviderId;
  label: string;
  desc: string;
  color: string;
  bg: string;
  badge?: string;
};

const STANDARD_PROVIDERS: ProviderMeta[] = [
  { id: 'CHATGPT', label: 'ChatGPT', desc: 'OpenAI ChatGPT', color: '#10A37F', bg: 'rgba(16,163,127,0.1)' },
  { id: 'OPENAI', label: 'OpenAI', desc: 'OpenAI API direct', color: '#412991', bg: 'rgba(65,41,145,0.1)' },
  { id: 'CLAUDE', label: 'Claude', desc: 'Anthropic Claude API', color: '#D97757', bg: 'rgba(217,119,87,0.1)' },
  {
    id: 'CURSOR',
    label: 'Cursor',
    desc: 'Cursor IDE account',
    color: '#0B0B0B',
    bg: 'rgba(11,11,11,0.06)',
    badge: 'Verify only',
  },
];

const COPILOT_PROVIDER: ProviderMeta = {
  id: 'COPILOT',
  label: 'Copilot',
  desc: 'Microsoft 365 Copilot',
  color: '#0078D4',
  bg: 'rgba(0,120,212,0.1)',
};

const ALL_PROVIDERS: ProviderMeta[] = [...STANDARD_PROVIDERS, COPILOT_PROVIDER];

const CAPABILITY_ROWS = [
  { provider: 'ChatGPT / OpenAI', chat: 'Yes', embeddings: 'If key supports', localDev: 'Yes' },
  { provider: 'Claude', chat: 'Yes', embeddings: 'No', localDev: 'Yes' },
  { provider: 'Cursor', chat: 'No (crsr_)', embeddings: 'No', localDev: 'No' },
  { provider: 'Copilot', chat: 'Yes (with Azure)', embeddings: 'Yes (with Azure)', localDev: 'Customer deploy' },
] as const;

const FEATURES = [
  { key: 'featureRcaSuggest', label: 'RCA AI suggest', desc: 'Draft RCA fields in the wizard', icon: Bot },
  { key: 'featureKnowledgeCopilot', label: 'Knowledge base Q&A', desc: 'Ask Knowledge Base on incidents', icon: BookOpen },
  { key: 'featureAutoIndexTickets', label: 'Auto-index closed tickets', desc: 'Add closed tickets to the knowledge base', icon: Ticket },
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

function ProviderCard({
  provider,
  isSelected,
  isActive,
  onSelect,
}: {
  provider: ProviderMeta;
  isSelected: boolean;
  isActive: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
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
      {provider.badge && (
        <span style={{
          position: 'absolute', top: 10, left: 10,
          fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.3px',
          padding: '2px 6px', borderRadius: 4,
          background: 'var(--bg-subtle)', color: 'var(--text-muted)', border: '1px solid var(--border)',
        }}>
          {provider.badge}
        </span>
      )}
      <div style={{
        width: 40, height: 40, borderRadius: 10,
        background: isSelected ? provider.bg : 'var(--bg-subtle)',
        border: `1px solid ${isSelected ? provider.color + '33' : 'var(--border)'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 12, marginTop: provider.badge ? 8 : 0,
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
}

export default function IntelligenceAdminClient() {
  const searchParams = useSearchParams();
  const { data: config, isLoading, refetch } = useIntelligenceConfig();
  const { data: providers } = useAiProviders();
  const connectMutation = useConnectAiProvider();
  const testMutation = useTestAiConnection();
  const updateMutation = useUpdateIntelligenceConfig();

  const [microsoftEnabled, setMicrosoftEnabled] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<ProviderId>('CHATGPT');
  const [enterpriseOpen, setEnterpriseOpen] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [form, setForm] = useState({
    providerPath: 'DISABLED',
    featureRcaSuggest: true,
    featureKnowledgeCopilot: true,
    featureAutoIndexTickets: false,
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
      setEnterpriseOpen(true);
      setSelectedProvider('COPILOT');
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
      featureAutoIndexTickets: Boolean(c.featureAutoIndexTickets),
      featureReportNarrative: Boolean(c.featureReportNarrative),
      teamsEnabled: Boolean(c.teamsEnabled),
      teamsWebhookUrl: String(c.teamsWebhookUrl ?? ''),
      monthlyQueryQuota: Number(c.monthlyQueryQuota ?? 500),
      azureOpenaiEndpoint: String(c.azureOpenaiEndpoint ?? ''),
      azureOpenaiDeploymentChat: String(c.azureOpenaiDeploymentChat ?? ''),
      azureOpenaiDeploymentEmbed: String(c.azureOpenaiDeploymentEmbed ?? ''),
      azureOpenaiApiKey: '',
    });
    if (provider !== 'DISABLED' && ALL_PROVIDERS.some((p) => p.id === provider)) {
      setSelectedProvider(provider as ProviderId);
      if (provider === 'COPILOT') setEnterpriseOpen(true);
    }
    if (c.aiUsername) setUsername(String(c.aiUsername));
  }, [config]);

  const selectedMeta = (providers as Array<{ id: string; label: string; authType: string; hint?: string }> | undefined)
    ?.find((p) => p.id === selectedProvider);
  const selectedProviderMeta = ALL_PROVIDERS.find((p) => p.id === selectedProvider) ?? STANDARD_PROVIDERS[0];
  const isConnected = Boolean((config as { isConnected?: boolean } | undefined)?.isConnected);
  const connectedProvider = String((config as { providerPath?: string } | undefined)?.providerPath ?? '');
  const connectedAt = (config as { aiConnectedAt?: string; entraConnectedAt?: string } | undefined);
  const connectedProviderMeta = ALL_PROVIDERS.find((p) => p.id === connectedProvider);
  const queriesUsed = (config as { queriesThisMonth?: number })?.queriesThisMonth ?? 0;
  const isCopilotSelected = selectedProvider === 'COPILOT';

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

  function selectCopilot() {
    setSelectedProvider('COPILOT');
    setEnterpriseOpen(true);
  }

  const messageIsError = message && (message.toLowerCase().includes('fail') || message.toLowerCase().includes('reject') || message.toLowerCase().includes('error'));

  return (
    <div>
      <div className="v2-page-header" style={{ marginBottom: 24 }}>
        <div>
          <h1>Intelligence and AI Setup</h1>
          <p>
            Local dev: connect ChatGPT or OpenAI with an API key. Enterprise Microsoft Copilot is optional — see{' '}
            <code style={{ fontSize: 12 }}>docs/INTELLIGENCE-ENTERPRISE-SETUP.md</code>.
          </p>
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

      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: 20, marginBottom: 24,
        padding: '14px 18px', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border)',
      }}>
        <StepBadge n={1} label="Choose provider" active={!isConnected} done={isConnected} />
        <StepBadge n={2} label="Connect provider" active={!isConnected} done={isConnected} />
        <StepBadge n={3} label="Enable features" active={isConnected} done={false} />
      </div>

      {/* Standard providers */}
      <div className="v2-card" style={{ marginBottom: 20 }}>
        <div className="v2-card-header">
          <div className="v2-card-title">Standard providers</div>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Recommended for local development</span>
        </div>
        <div className="v2-card-body">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, marginBottom: 16 }}>
            {STANDARD_PROVIDERS.map((provider) => (
              <ProviderCard
                key={provider.id}
                provider={provider}
                isSelected={selectedProvider === provider.id}
                isActive={isConnected && connectedProvider === provider.id}
                onSelect={() => setSelectedProvider(provider.id)}
              />
            ))}
          </div>

          <div style={{ overflowX: 'auto', marginBottom: 20 }}>
            <table className="v2-table" style={{ fontSize: 12, minWidth: 480 }}>
              <thead>
                <tr>
                  <th>Provider</th>
                  <th>Chat</th>
                  <th>Embeddings</th>
                  <th>Local dev</th>
                </tr>
              </thead>
              <tbody>
                {CAPABILITY_ROWS.map((row) => (
                  <tr key={row.provider}>
                    <td>{row.provider}</td>
                    <td>{row.chat}</td>
                    <td>{row.embeddings}</td>
                    <td>{row.localDev}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {!isCopilotSelected && (
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 20, borderTopWidth: 1, borderTopStyle: 'solid', borderTopColor: 'var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 7,
                  background: selectedProviderMeta.bg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <AiProviderLogo provider={selectedProviderMeta.id} size={18} />
                </div>
                <span style={{ fontSize: 14, fontWeight: 600 }}>Connect {selectedProviderMeta.label}</span>
              </div>
              <form onSubmit={handleConnect} style={{ display: 'grid', gap: 14, maxWidth: 440 }}>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
                  {selectedMeta?.hint ?? 'Enter your account email and API key or password.'}
                </p>
                {selectedProvider === 'CURSOR' && (
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0, lineHeight: 1.45, padding: '8px 10px', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)' }}>
                    Account verify only — use OpenAI/ChatGPT for AI-generated answers. Cursor <code>crsr_</code> keys enable knowledge retrieval fallback only.
                  </p>
                )}
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
                    placeholder={selectedProvider === 'CURSOR' ? 'crsr_… from cursor.com/dashboard' : 'sk-… OpenAI or Anthropic API key'}
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
            </div>
          )}
        </div>
      </div>

      {/* Enterprise accordion */}
      <div className="v2-card" style={{ marginBottom: 20 }}>
        <button
          type="button"
          onClick={() => setEnterpriseOpen((o) => !o)}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%',
            padding: '14px 18px', border: 'none', background: 'transparent', cursor: 'pointer',
            fontFamily: 'inherit', textAlign: 'left',
          }}
        >
          <div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>Enterprise — Microsoft Copilot</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
              Configure in your organisation&apos;s Azure tenant. Not required for local development.
            </div>
          </div>
          <ChevronDown
            size={18}
            style={{
              color: 'var(--text-muted)',
              transform: enterpriseOpen ? 'rotate(180deg)' : 'none',
              transition: 'transform 0.15s',
            }}
          />
        </button>
        {enterpriseOpen && (
          <div className="v2-card-body" style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
            <div style={{ maxWidth: 200, marginBottom: 16 }}>
              <ProviderCard
                provider={COPILOT_PROVIDER}
                isSelected={isCopilotSelected}
                isActive={isConnected && connectedProvider === 'COPILOT'}
                onSelect={selectCopilot}
              />
            </div>
            <div style={{ maxWidth: 560 }}>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16, lineHeight: 1.5 }}>
                Copilot uses your Microsoft work account and Azure OpenAI for chat. Customer IT configures Entra on the deployment — see{' '}
                <code style={{ fontSize: 11 }}>docs/INTELLIGENCE-ENTERPRISE-SETUP.md</code>.
              </p>
              <MicrosoftSignInButton
                size="sm"
                onClick={handleMicrosoftConnect}
                disabled={!microsoftEnabled}
                hint={
                  microsoftEnabled
                    ? undefined
                    : 'Entra is not configured on this deployment. Customer IT sets ENTRA_* in .env — see INTELLIGENCE-ENTERPRISE-SETUP.md.'
                }
              />
              <div style={{
                display: 'grid', gap: 10, marginTop: 20,
                padding: 16, background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border)',
              }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>Azure OpenAI (required for Copilot chat)</div>
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
                <input
                  type="text"
                  placeholder="Embedding deployment name"
                  value={form.azureOpenaiDeploymentEmbed}
                  onChange={(e) => setForm((p) => ({ ...p, azureOpenaiDeploymentEmbed: e.target.value }))}
                  style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: 13, background: 'var(--bg)' }}
                />
                <input
                  type="password"
                  placeholder="Azure OpenAI API key (leave blank to keep existing)"
                  value={form.azureOpenaiApiKey}
                  onChange={(e) => setForm((p) => ({ ...p, azureOpenaiApiKey: e.target.value }))}
                  style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: 13, background: 'var(--bg)' }}
                />
                <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>
                  Save Azure settings with <strong>Save feature settings</strong> below after connecting Copilot.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Connection status + test */}
      {isConnected && (
        <div className="v2-card" style={{ marginBottom: 20 }}>
          <div className="v2-card-body">
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
        </div>
      )}

      {message && (
        <div style={{
          marginBottom: 20, padding: '10px 14px', borderRadius: 'var(--radius-sm)', fontSize: 12, lineHeight: 1.5,
          background: messageIsError ? 'rgba(220,38,38,0.06)' : 'rgba(34,197,94,0.06)',
          border: `1px solid ${messageIsError ? 'rgba(220,38,38,0.2)' : 'rgba(34,197,94,0.2)'}`,
          color: messageIsError ? '#dc2626' : 'var(--green)',
          maxWidth: 560,
        }}>
          {message}
        </div>
      )}

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
