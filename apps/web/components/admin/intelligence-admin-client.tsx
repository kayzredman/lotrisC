'use client';

import { useEffect, useState } from 'react';
import { useConnectEntra, useIntelligenceConfig, useUpdateIntelligenceConfig } from '@/lib/api/hooks/useIntelligence';

export default function IntelligenceAdminClient() {
  const { data: config, isLoading } = useIntelligenceConfig();
  const updateMutation = useUpdateIntelligenceConfig();
  const connectMutation = useConnectEntra();

  const [entraTenantId, setEntraTenantId] = useState('');
  const [form, setForm] = useState({
    providerPath: 'ENTERPRISE',
    azureOpenaiEndpoint: '',
    azureOpenaiDeploymentChat: '',
    azureOpenaiDeploymentEmbed: '',
    azureOpenaiApiKey: '',
    featureRcaSuggest: true,
    featureKnowledgeCopilot: true,
    featureReportNarrative: false,
    teamsEnabled: false,
    teamsWebhookUrl: '',
    monthlyQueryQuota: 500,
  });

  useEffect(() => {
    if (!config) return;
    const c = config as Record<string, unknown>;
    setForm({
      providerPath: String(c.providerPath ?? 'ENTERPRISE'),
      azureOpenaiEndpoint: String(c.azureOpenaiEndpoint ?? ''),
      azureOpenaiDeploymentChat: String(c.azureOpenaiDeploymentChat ?? ''),
      azureOpenaiDeploymentEmbed: String(c.azureOpenaiDeploymentEmbed ?? ''),
      azureOpenaiApiKey: '',
      featureRcaSuggest: Boolean(c.featureRcaSuggest),
      featureKnowledgeCopilot: Boolean(c.featureKnowledgeCopilot),
      featureReportNarrative: Boolean(c.featureReportNarrative),
      teamsEnabled: Boolean(c.teamsEnabled),
      teamsWebhookUrl: String(c.teamsWebhookUrl ?? ''),
      monthlyQueryQuota: Number(c.monthlyQueryQuota ?? 500),
    });
    setEntraTenantId(String(c.entraTenantId ?? ''));
  }, [config]);

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    updateMutation.mutate(form);
  }

  function handleMicrosoftConnect() {
    const tid = entraTenantId.trim();
    if (!tid) return;
    connectMutation.mutate({ entraTenantId: tid });
  }

  return (
    <div>
      <div className="v2-page-header">
        <div>
          <h1>Intelligence &amp; Copilot</h1>
          <p>Enterprise Microsoft path — Azure OpenAI in your Entra tenant</p>
        </div>
      </div>

      <div className="v2-card" style={{ marginBottom: 20 }}>
        <div className="v2-card-header">
          <div className="v2-card-title">Sign in with Microsoft (Enterprise)</div>
        </div>
        <div className="v2-card-body">
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>
            Connect your organisation&apos;s Entra tenant. Lotris routes copilot features through Azure OpenAI in the same tenant — no external AI sign-in.
          </p>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <button type="button" className="v2-btn v2-btn-primary v2-btn-sm" onClick={handleMicrosoftConnect} disabled={connectMutation.isPending}>
              {connectMutation.isPending ? 'Connecting…' : 'Sign in with Microsoft'}
            </button>
            <input
              type="text"
              placeholder="Entra Tenant ID (from Azure portal)"
              value={entraTenantId}
              onChange={(e) => setEntraTenantId(e.target.value)}
              style={{ flex: 1, minWidth: 240, padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: 13 }}
            />
          </div>
          {(config as { entraConnectedAt?: string } | undefined)?.entraConnectedAt && (
            <p style={{ fontSize: 12, color: 'var(--green)', marginTop: 10 }}>
              Connected {new Date(String((config as { entraConnectedAt: string }).entraConnectedAt)).toLocaleString()}
            </p>
          )}
        </div>
      </div>

      <form className="v2-card" onSubmit={handleSave}>
        <div className="v2-card-header">
          <div className="v2-card-title">Azure OpenAI (internal copilot)</div>
        </div>
        <div className="v2-card-body">
          {isLoading ? (
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Loading…</p>
          ) : (
            <div style={{ display: 'grid', gap: 14, maxWidth: 560 }}>
              {[
                { key: 'azureOpenaiEndpoint', label: 'Endpoint', placeholder: 'https://your-resource.openai.azure.com' },
                { key: 'azureOpenaiDeploymentChat', label: 'Chat deployment', placeholder: 'gpt-4o' },
                { key: 'azureOpenaiDeploymentEmbed', label: 'Embedding deployment', placeholder: 'text-embedding-3-small' },
              ].map((f) => (
                <div key={f.key}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 5 }}>{f.label}</label>
                  <input
                    type="text"
                    placeholder={f.placeholder}
                    value={form[f.key as keyof typeof form] as string}
                    onChange={(e) => setForm((p) => ({ ...p, [f.key]: e.target.value }))}
                    style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: 13 }}
                  />
                </div>
              ))}
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 5 }}>API key</label>
                <input
                  type="password"
                  placeholder={(config as { hasApiKey?: boolean })?.hasApiKey ? '•••••••• (leave blank to keep)' : 'Azure OpenAI key'}
                  value={form.azureOpenaiApiKey}
                  onChange={(e) => setForm((p) => ({ ...p, azureOpenaiApiKey: e.target.value }))}
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: 13 }}
                />
              </div>

              <div style={{ display: 'grid', gap: 8 }}>
                {[
                  { key: 'featureRcaSuggest', label: 'RCA AI suggest (wizard)' },
                  { key: 'featureKnowledgeCopilot', label: 'Knowledge copilot Q&A' },
                  { key: 'featureReportNarrative', label: 'Report narrative summaries' },
                  { key: 'teamsEnabled', label: 'Teams webhook alerts' },
                ].map((item) => (
                  <label key={item.key} style={{ display: 'flex', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={form[item.key as keyof typeof form] as boolean}
                      onChange={(e) => setForm((p) => ({ ...p, [item.key]: e.target.checked }))}
                    />
                    {item.label}
                  </label>
                ))}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 5 }}>Teams incoming webhook URL</label>
                <input
                  type="url"
                  value={form.teamsWebhookUrl}
                  onChange={(e) => setForm((p) => ({ ...p, teamsWebhookUrl: e.target.value }))}
                  placeholder="https://outlook.office.com/webhook/…"
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: 13 }}
                />
              </div>

              <button type="submit" className="v2-btn v2-btn-primary" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? 'Saving…' : 'Save intelligence settings'}
              </button>
              {updateMutation.isSuccess && <p style={{ fontSize: 12, color: 'var(--green)' }}>Saved.</p>}
              <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                Queries this month: {(config as { queriesThisMonth?: number })?.queriesThisMonth ?? 0} / {form.monthlyQueryQuota}
              </p>
            </div>
          )}
        </div>
      </form>
    </div>
  );
}
