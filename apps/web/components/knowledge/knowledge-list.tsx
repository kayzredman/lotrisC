'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useKnownErrors } from '@/lib/api/hooks/useKnowledge';
import { useKnowledgeQuery } from '@/lib/api/hooks/useIntelligence';
import { EmptyState } from '@/components/ui/empty-state';
import { BookOpen, Search } from 'lucide-react';

export default function KnowledgeList() {
  const [copilotQuery, setCopilotQuery] = useState('');
  const [copilotAnswer, setCopilotAnswer] = useState<Record<string, unknown> | null>(null);
  const { data: errors, isLoading } = useKnownErrors({ staleTime: 60_000 });
  const copilotMutation = useKnowledgeQuery();
  const rows = (errors ?? []) as Array<Record<string, unknown>>;

  function handleCopilot(e: React.FormEvent) {
    e.preventDefault();
    if (!copilotQuery.trim()) return;
    copilotMutation.mutate(
      { query: copilotQuery.trim(), topK: 5 },
      { onSuccess: (data) => setCopilotAnswer(data as Record<string, unknown>) },
    );
  }

  const citations = (copilotAnswer?.citations ?? []) as Array<Record<string, unknown>>;

  return (
    <div>
      <div className="v2-page-header">
        <div>
          <h1>Knowledge Base</h1>
          <p>Known errors and workarounds from published RCAs (KEDB)</p>
        </div>
      </div>

      <div className="v2-card" style={{ marginBottom: 20 }}>
        <div className="v2-card-header">
          <div className="v2-card-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <BookOpen size={14} style={{ color: 'var(--indigo)' }} /> Ask Knowledge Base
          </div>
        </div>
        <form className="v2-card-body" onSubmit={handleCopilot}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            <input
              type="text"
              value={copilotQuery}
              onChange={(e) => setCopilotQuery(e.target.value)}
              placeholder="Ask: How did we fix database timeouts before?"
              style={{ flex: 1, padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: 13 }}
            />
            <button type="submit" className="v2-btn v2-btn-primary v2-btn-sm" disabled={copilotMutation.isPending} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
              <Search size={14} />
              {copilotMutation.isPending ? 'Searching…' : 'Ask Knowledge Base'}
            </button>
          </div>
          {copilotMutation.isError && (
            <p style={{ fontSize: 12, color: 'var(--red)', marginTop: 10 }}>{copilotMutation.error.message}</p>
          )}
          {copilotAnswer?.answer ? (
            <div style={{ marginTop: 14, fontSize: 13, lineHeight: 1.6 }}>
              <p>{String(copilotAnswer.answer)}</p>
              {citations.length > 0 && (
                <div style={{ marginTop: 10, fontSize: 11, color: 'var(--text-muted)' }}>
                  Sources: {citations.map((c, i) => (
                    <span key={String(c.articleId ?? i)}> [{i + 1}] {String(c.title)}</span>
                  ))}
                </div>
              )}
            </div>
          ) : null}
        </form>
      </div>

      <div className="v2-card">
        {isLoading ? (
          <div className="v2-card-body"><EmptyState title="Loading knowledge articles…" /></div>
        ) : rows.length === 0 ? (
          <div className="v2-card-body">
            <EmptyState
              title="No known errors yet"
              message="Published RCAs automatically create entries here for engineers to reference during incidents."
            />
          </div>
        ) : (
          <div className="v2-card-body" style={{ display: 'grid', gap: 12 }}>
            {rows.map((e) => (
              <div
                key={String(e.id)}
                style={{ padding: 16, border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', background: 'var(--bg)' }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
                  <BookOpen size={16} style={{ color: 'var(--indigo)', marginTop: 2, flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{String(e.title)}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                      From {String(e.rcaRef ?? 'RCA')} · {new Date(String(e.publishedAt)).toLocaleDateString()}
                    </div>
                  </div>
                  {e.rcaId ? (
                    <Link href={`/rca/${String(e.rcaId)}`} className="v2-btn v2-btn-ghost v2-btn-sm">View RCA</Link>
                  ) : null}
                </div>
                <p style={{ fontSize: 13, color: 'var(--text-primary)', marginBottom: 10, lineHeight: 1.5 }}>
                  {String(e.errorDescription)}
                </p>
                {e.workaround ? (
                  <div style={{ fontSize: 12, marginBottom: 6 }}>
                    <strong style={{ color: 'var(--orange)' }}>Workaround:</strong> {String(e.workaround)}
                  </div>
                ) : null}
                {e.permanentFix ? (
                  <div style={{ fontSize: 12 }}>
                    <strong style={{ color: 'var(--green)' }}>Permanent fix:</strong> {String(e.permanentFix)}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
