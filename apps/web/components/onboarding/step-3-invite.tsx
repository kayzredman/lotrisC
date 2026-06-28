'use client';

import { useState } from 'react';
import { useAdminTeams, useCreateAdminUser } from '@/lib/api/hooks/useAdmin';
import { Zap, Mail, X } from 'lucide-react';

const ROLES = [
  { label: 'Engineer',    id: 5 },
  { label: 'Team Lead',   id: 4 },
  { label: 'IT Manager',  id: 3 },
];

interface SentInvite {
  email: string;
  teamName: string;
  roleName: string;
  status: 'sent' | 'awaiting';
}

interface Props { onSuccess: () => void; }

export function Step3Invite({ onSuccess }: Props) {
  const [emailInput, setEmailInput]   = useState('');
  const [stagedEmails, setStagedEmails] = useState<string[]>([]);
  const [teamId, setTeamId]           = useState('');
  const [roleId, setRoleId]           = useState(5);
  const [sentInvites, setSentInvites] = useState<SentInvite[]>([]);
  const [sending, setSending]         = useState(false);
  const [sendError, setSendError]     = useState('');

  const { data: teamsData } = useAdminTeams();
  const teams = (teamsData ?? []) as { id: string; name: string }[];

  const createUser = useCreateAdminUser();

  function stageEmail(raw: string) {
    const emails = raw.split(/[\s,;]+/).map(e => e.trim()).filter(e => e.includes('@'));
    if (emails.length === 0) return;
    setStagedEmails(prev => {
      const next = [...prev];
      emails.forEach(e => { if (!next.includes(e)) next.push(e); });
      return next;
    });
    setEmailInput('');
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      stageEmail(emailInput);
    }
  }

  function handleBlur() {
    if (emailInput.trim()) stageEmail(emailInput);
  }

  function removeStaged(email: string) {
    setStagedEmails(prev => prev.filter(e => e !== email));
  }

  async function handleSend() {
    setSendError('');
    // Also stage whatever is still in the input box
    const allEmails = [...stagedEmails];
    if (emailInput.trim().includes('@')) {
      const extra = emailInput.split(/[\s,;]+/).map(e => e.trim()).filter(e => e.includes('@'));
      extra.forEach(e => { if (!allEmails.includes(e)) allEmails.push(e); });
    }
    if (allEmails.length === 0) return setSendError('Add at least one email address first.');
    const roleName = ROLES.find(r => r.id === roleId)?.label ?? 'Engineer';
    const team = teams.find(t => t.id === teamId);
    setSending(true);
    let failed = 0;
    for (const email of allEmails) {
      try {
        await createUser.mutateAsync({
          email,
          fullName: email.split('@')[0].replace(/[._]/g, ' '),
          roleId,
          teamId: teamId || undefined,
        });
        setSentInvites(prev => [...prev, { email, teamName: team?.name ?? '—', roleName, status: 'sent' }]);
      } catch { failed++; }
    }
    if (failed > 0) setSendError(`${failed} invite(s) failed. Others were sent.`);
    setStagedEmails([]);
    setEmailInput('');
    setSending(false);
  }

  function handleRemoveInvite(email: string) {
    setSentInvites(prev => prev.filter(i => i.email !== email));
  }

  function handleContinue(e: React.FormEvent) {
    e.preventDefault();
    onSuccess();
  }

  return (
    <form id="ob-step-form" onSubmit={handleContinue}>
      <h1 style={{ fontSize: 26, fontWeight: 700, color: '#0F172A', margin: '0 0 8px', letterSpacing: '-0.4px' }}>
        Invite your engineers
      </h1>
      <p style={{ fontSize: 14, color: '#64748B', margin: '0 0 24px', lineHeight: 1.6 }}>
        Send sign-up invitations now. Engineers don&apos;t need to accept before you finish setup — your work continues uninterrupted.
      </p>

      {/* Tip callout */}
      <div style={{ display: 'flex', gap: 12, background: 'rgba(79,70,229,0.06)', border: '1px solid rgba(79,70,229,0.18)', borderRadius: 10, padding: '14px 16px', marginBottom: 28 }}>
        <Zap size={15} style={{ color: '#4F46E5', flexShrink: 0, marginTop: 1 }} />
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#4F46E5', marginBottom: 3 }}>Invites don&apos;t block your setup</div>
          <div style={{ fontSize: 13, color: '#64748B', lineHeight: 1.55 }}>
            Invitation emails are sent immediately. Engineers can sign up at their own pace — your wizard and ticket queue work either way.
          </div>
        </div>
      </div>

      {/* Email chip input */}
      <div style={{ marginBottom: 16 }}>
        <label style={labelSt}>Email addresses</label>
        {/* Chip container */}
        <div style={{
          display: 'flex', flexWrap: 'wrap', gap: 6,
          padding: stagedEmails.length > 0 ? '8px 10px 4px' : '0',
          border: stagedEmails.length > 0 ? '1px solid #C7D2FE' : 'none',
          borderRadius: 8, background: stagedEmails.length > 0 ? 'rgba(79,70,229,0.03)' : 'transparent',
          marginBottom: stagedEmails.length > 0 ? 8 : 0,
        }}>
          {stagedEmails.map(email => (
            <span key={email} style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              background: '#EEF2FF', border: '1px solid #C7D2FE', color: '#3730A3',
              borderRadius: 6, padding: '3px 8px', fontSize: 12.5, fontWeight: 500,
            }}>
              {email}
              <button type="button" onClick={() => removeStaged(email)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#818CF8', padding: 0, lineHeight: 1, display: 'flex', alignItems: 'center' }}>
                <X size={11} />
              </button>
            </span>
          ))}
        </div>
        <input
          value={emailInput}
          onChange={e => setEmailInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          placeholder={stagedEmails.length > 0 ? 'Add another email…' : 'alice@acme.io, bob@acme.io…'}
          style={{ ...inputSt, marginBottom: 6 }}
        />
        <span style={{ fontSize: 11.5, color: '#94A3B8' }}>
          Press <kbd style={{ background: '#F1F5F9', border: '1px solid #E2E8F0', borderRadius: 4, padding: '1px 5px', fontSize: 10 }}>Enter</kbd> or <kbd style={{ background: '#F1F5F9', border: '1px solid #E2E8F0', borderRadius: 4, padding: '1px 5px', fontSize: 10 }}>,</kbd> after each address to queue it.
          {stagedEmails.length > 0 && <strong style={{ color: '#4F46E5', marginLeft: 6 }}>{stagedEmails.length} queued</strong>}
        </span>
      </div>

      {/* Team + Role + Send row */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', marginBottom: 24, flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 160px' }}>
          <label style={labelSt}>Team</label>
          <select value={teamId} onChange={e => setTeamId(e.target.value)} style={selectSt}>
            <option value="">— no team —</option>
            {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
        <div style={{ flex: '1 1 140px' }}>
          <label style={labelSt}>Role</label>
          <select value={roleId} onChange={e => setRoleId(Number(e.target.value))} style={selectSt}>
            {ROLES.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
          </select>
        </div>
        <button
          type="button"
          onClick={handleSend}
          disabled={sending}
          style={{ padding: '9px 20px', background: '#4F46E5', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap', flexShrink: 0 }}
        >
          {sending ? 'Sending…' : 'Send Invites'}
        </button>
      </div>

      {sendError && <p style={{ color: '#EF4444', fontSize: 13, marginBottom: 16 }}>{sendError}</p>}

      {/* Sent invites list */}
      {sentInvites.length > 0 && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', letterSpacing: '0.8px', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Sent invites</span>
            <div style={{ flex: 1, height: 1, background: '#E2E8F0' }} />
          </div>
          {sentInvites.map((invite) => (
            <div key={invite.email} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 10, alignItems: 'center', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8, padding: '10px 12px', marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                <Mail size={13} style={{ color: '#94A3B8', flexShrink: 0 }} />
                <span style={{ fontSize: 13, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{invite.email}</span>
                {invite.teamName !== '—' && <span style={{ fontSize: 11, color: '#64748B', whiteSpace: 'nowrap' }}>· {invite.teamName}</span>}
              </div>
              <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 10px', borderRadius: 99, background: '#DBEAFE', color: '#1D4ED8', whiteSpace: 'nowrap' }}>
                Invite sent
              </span>
              <button type="button" onClick={() => handleRemoveInvite(invite.email)} style={{ width: 22, height: 22, borderRadius: 5, border: '1px solid #E2E8F0', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#94A3B8', flexShrink: 0 }}>
                <X size={11} />
              </button>
            </div>
          ))}

          {/* Info callout */}
          <div style={{ display: 'flex', gap: 8, background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 8, padding: '10px 14px', marginTop: 12, fontSize: 13, color: '#1E40AF' }}>
            <span style={{ fontWeight: 600 }}>{sentInvites.length} invite{sentInvites.length !== 1 ? 's' : ''} sent.</span>
            <span style={{ color: '#3B82F6' }}>Engineers will receive sign-up links by email. You can manage invites in the Admin panel.</span>
          </div>
        </>
      )}
    </form>
  );
}

const labelSt: React.CSSProperties = { display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 };
const inputSt: React.CSSProperties = { width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 13.5, color: '#0F172A', background: '#fff', boxSizing: 'border-box', fontFamily: 'inherit' };
const selectSt: React.CSSProperties = { ...inputSt, cursor: 'pointer' };

