'use client';

import { useState, useEffect } from 'react';
import { Settings, Save, AlertCircle, CheckCircle } from 'lucide-react';
import { useReportConfig, useUpdateReportConfig } from '@/lib/api/hooks/useReports';

export function ReportSettingsPanel() {
  const { data: configRaw, isLoading, refetch } = useReportConfig({ staleTime: 60_000 });
  const config = configRaw as {
    brandName?: string;
    defaultTimezone?: string;
    attachmentSizeLimitMb?: number;
    retentionDays?: number;
    defaultRecipients?: string[];
  } | undefined;
  const updateMutation = useUpdateReportConfig();

  const [brandName, setBrandName] = useState('');
  const [defaultTimezone, setDefaultTimezone] = useState('');
  const [attachmentSizeLimitMb, setAttachmentSizeLimitMb] = useState('');
  const [retentionDays, setRetentionDays] = useState('');
  const [defaultRecipients, setDefaultRecipients] = useState('');
  const [status, setStatus] = useState<{ ok: boolean; message: string } | null>(null);

  useEffect(() => {
    if (config) {
      setBrandName(config.brandName ?? '');
      setDefaultTimezone(config.defaultTimezone ?? '');
      setAttachmentSizeLimitMb(String(config.attachmentSizeLimitMb ?? ''));
      setRetentionDays(String(config.retentionDays ?? ''));
      setDefaultRecipients((config.defaultRecipients ?? []).join(', '));
    }
  }, [config]);

  const handleSave = () => {
    setStatus(null);
    const recipientList = defaultRecipients
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);

    updateMutation.mutate(
      {
        brandName: brandName || undefined,
        defaultTimezone: defaultTimezone || undefined,
        attachmentSizeLimitMb: attachmentSizeLimitMb ? parseInt(attachmentSizeLimitMb, 10) : undefined,
        retentionDays: retentionDays ? parseInt(retentionDays, 10) : undefined,
        defaultRecipients: JSON.stringify(recipientList),
      },
      {
        onSuccess: () => {
          setStatus({ ok: true, message: 'Settings saved successfully.' });
          void refetch();
        },
        onError: (err) => {
          setStatus({ ok: false, message: err.message ?? 'Failed to save settings.' });
        },
      },
    );
  };

  if (isLoading) {
    return (
      <div style={{ padding: 24, color: 'var(--text-muted)', fontSize: 13 }}>
        Loading settings…
      </div>
    );
  }

  return (
    <div className="v2-card">
      <div className="v2-card-header">
        <div className="v2-card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Settings size={15} style={{ color: 'var(--indigo)' }} />
          Report Settings
        </div>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          Applies to all scheduled reports for this tenant
        </span>
      </div>
      <div className="v2-card-body">
        {status && (
          <div style={{
            marginBottom: 16, padding: '10px 14px', borderRadius: 8,
            display: 'flex', alignItems: 'center', gap: 8,
            background: status.ok ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
            border: `1px solid ${status.ok ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
            color: status.ok ? '#16a34a' : '#dc2626', fontSize: 13,
          }}>
            {status.ok ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
            {status.message}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {/* Brand Name */}
          <div>
            <label htmlFor="rs-brand" style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 5 }}>
              Brand / Company Name
            </label>
            <input
              id="rs-brand"
              type="text"
              className="v2-input"
              style={{ width: '100%' }}
              maxLength={120}
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
              placeholder="Lotris"
            />
            <p style={{ fontSize: 11, color: 'var(--text-light)', marginTop: 4 }}>
              Appears in PDF and Excel report headers.
            </p>
          </div>

          {/* Default Timezone */}
          <div>
            <label htmlFor="rs-tz" style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 5 }}>
              Default Timezone
            </label>
            <input
              id="rs-tz"
              type="text"
              className="v2-input"
              style={{ width: '100%' }}
              maxLength={60}
              value={defaultTimezone}
              onChange={(e) => setDefaultTimezone(e.target.value)}
              placeholder="UTC"
            />
            <p style={{ fontSize: 11, color: 'var(--text-light)', marginTop: 4 }}>
              IANA timezone string, e.g. &ldquo;Africa/Lagos&rdquo;.
            </p>
          </div>

          {/* Attachment Size Limit */}
          <div>
            <label htmlFor="rs-size" style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 5 }}>
              Attachment Size Limit (MB)
            </label>
            <input
              id="rs-size"
              type="number"
              className="v2-input"
              style={{ width: '100%' }}
              min={1}
              max={50}
              value={attachmentSizeLimitMb}
              onChange={(e) => setAttachmentSizeLimitMb(e.target.value)}
              placeholder="10"
            />
            <p style={{ fontSize: 11, color: 'var(--text-light)', marginTop: 4 }}>
              Reports above this size send a download link instead of an attachment.
            </p>
          </div>

          {/* Retention Days */}
          <div>
            <label htmlFor="rs-ret" style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 5 }}>
              Report Retention (days)
            </label>
            <input
              id="rs-ret"
              type="number"
              className="v2-input"
              style={{ width: '100%' }}
              min={0}
              max={365}
              value={retentionDays}
              onChange={(e) => setRetentionDays(e.target.value)}
              placeholder="30"
            />
            <p style={{ fontSize: 11, color: 'var(--text-light)', marginTop: 4 }}>
              Generated files older than this are automatically purged. 0 = keep forever.
            </p>
          </div>

          {/* Default Recipients — full width */}
          <div style={{ gridColumn: '1 / -1' }}>
            <label htmlFor="rs-recv" style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 5 }}>
              Default Email Recipients
            </label>
            <input
              id="rs-recv"
              type="text"
              className="v2-input"
              style={{ width: '100%' }}
              value={defaultRecipients}
              onChange={(e) => setDefaultRecipients(e.target.value)}
              placeholder="manager@example.com, exec@example.com"
            />
            <p style={{ fontSize: 11, color: 'var(--text-light)', marginTop: 4 }}>
              Comma-separated. These addresses receive every scheduled report in addition to per-schedule recipients.
            </p>
          </div>
        </div>

        <div style={{ marginTop: 20 }}>
          <button
            type="button"
            className="v2-btn v2-btn-primary"
            onClick={handleSave}
            disabled={updateMutation.isPending}
          >
            <Save size={13} />
            {updateMutation.isPending ? 'Saving…' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}
