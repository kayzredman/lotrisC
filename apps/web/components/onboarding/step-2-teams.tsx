'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc/client';
import { PlusCircle, Pencil, Trash2 } from 'lucide-react';

interface User { id: string; fullName: string; roleName: string; }
interface CreatedTeam { id: string; name: string; description: string; leadName: string; color: string; }

const TEAM_COLORS = ['#4F46E5','#0EA5E9','#10B981','#F59E0B','#EF4444','#8B5CF6'];
function colorFor(idx: number) { return TEAM_COLORS[idx % TEAM_COLORS.length]; }
function initials(name: string) { return name.split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 2); }

interface Props { onSuccess: () => void; }

export function Step2Teams({ onSuccess }: Props) {
  const [createdTeams, setCreatedTeams] = useState<CreatedTeam[]>([]);
  const [showForm, setShowForm]         = useState(true);
  const [teamName, setTeamName]         = useState('');
  const [leadId, setLeadId]             = useState('');
  const [description, setDescription]  = useState('');
  const [formError, setFormError]       = useState('');
  const [continueError, setContinueError] = useState('');
  const [saving, setSaving]             = useState(false);

  const { data: usersData } = trpc['admin.users.list'].useQuery();
  const usersRaw: User[] = (usersData?.users ?? []) as User[];

  const createTeam = trpc['admin.teams.create'].useMutation({
    onError: (e) => setFormError(e.message),
  });

  async function handleAddTeam() {
    setFormError('');
    if (!teamName.trim()) return setFormError('Team name is required.');
    setSaving(true);
    try {
      const result = await createTeam.mutateAsync({ name: teamName.trim() });
      const lead = usersRaw.find(u => u.id === leadId);
      setCreatedTeams(prev => [...prev, {
        id: (result as { id?: string })?.id ?? String(Date.now()),
        name: teamName.trim(),
        description: description.trim(),
        leadName: lead?.fullName ?? '',
        color: colorFor(prev.length),
      }]);
      setTeamName('');
      setLeadId('');
      setDescription('');
      setShowForm(false);
    } catch { /* handled by onError */ }
    setSaving(false);
  }

  function handleRemoveTeam(id: string) {
    setCreatedTeams(prev => prev.filter(t => t.id !== id));
  }

  function handleContinue(e: React.FormEvent) {
    e.preventDefault();
    setContinueError('');
    if (createdTeams.length === 0) {
      setContinueError('Please create at least one team to continue.');
      setShowForm(true);
      return;
    }
    onSuccess();
  }

  return (
    <form id="ob-step-form" onSubmit={handleContinue}>
      <h1 style={{ fontSize: 26, fontWeight: 700, color: '#0F172A', margin: '0 0 8px', letterSpacing: '-0.4px' }}>
        Build your team structure
      </h1>
      <p style={{ fontSize: 14, color: '#64748B', margin: '0 0 32px', lineHeight: 1.6 }}>
        Each team gets its own queue, SLA settings, and KPI targets. You can always add more teams later.
      </p>

      {/* Created team cards */}
      {createdTeams.map((t) => (
        <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 14, background: '#fff', border: '1px solid #E2E8F0', borderRadius: 10, padding: '14px 16px', marginBottom: 10 }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: t.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, color: '#fff', flexShrink: 0 }}>
            {initials(t.name)}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: 14, color: '#0F172A' }}>{t.name}</div>
            {t.description && <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>{t.description}</div>}
            {t.leadName && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 500, background: '#EEF2FF', color: '#4F46E5', padding: '2px 8px', borderRadius: 99, marginTop: 5 }}>
                TL: {t.leadName}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button type="button" onClick={() => handleRemoveTeam(t.id)} style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid #FCA5A5', background: '#FEF2F2', color: '#EF4444', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <Trash2 size={12} />
            </button>
          </div>
        </div>
      ))}

      {/* Inline add-team form */}
      {showForm && (
        <div style={{ background: '#fff', border: '1.5px solid #C7D2FE', borderRadius: 10, padding: 20, marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18, fontSize: 15, fontWeight: 600, color: '#0F172A' }}>
            <PlusCircle size={16} style={{ color: '#4F46E5' }} />
            New Team
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={labelSt}>Team Name</label>
            <input value={teamName} onChange={e => setTeamName(e.target.value)} placeholder="e.g. IT Support — Level 1" style={inputSt} />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={labelSt}>Team Lead</label>
            <select value={leadId} onChange={e => setLeadId(e.target.value)} style={selectSt}>
              <option value="">— assign later —</option>
              {usersRaw.map(u => <option key={u.id} value={u.id}>{u.fullName} · {u.roleName}</option>)}
            </select>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={labelSt}>Description <span style={{ fontWeight: 400, color: '#94A3B8' }}>(optional)</span></label>
            <input value={description} onChange={e => setDescription(e.target.value)} placeholder="e.g. Handles frontline hardware and network tickets" style={inputSt} />
          </div>
          {formError && <p style={{ color: '#EF4444', fontSize: 13, marginBottom: 10 }}>{formError}</p>}
          <button type="button" onClick={handleAddTeam} disabled={saving} style={{ padding: '8px 20px', background: '#4F46E5', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
            {saving ? 'Creating…' : 'Add Team'}
          </button>
        </div>
      )}

      {/* Add another team button */}
      {!showForm && (
        <button
          type="button"
          onClick={() => setShowForm(true)}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', padding: '12px 20px', border: '1.5px dashed #C7D2FE', borderRadius: 10, background: 'none', color: '#4F46E5', fontSize: 13, fontWeight: 500, cursor: 'pointer', marginBottom: 16, fontFamily: 'inherit' }}
        >
          <PlusCircle size={15} /> Add another team
        </button>
      )}

      {continueError && <p style={{ color: '#EF4444', fontSize: 13, marginTop: 8 }}>{continueError}</p>}
    </form>
  );
}

const labelSt: React.CSSProperties = { display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 };
const inputSt: React.CSSProperties = { width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 13.5, color: '#0F172A', background: '#fff', boxSizing: 'border-box', fontFamily: 'inherit' };
const selectSt: React.CSSProperties = { ...inputSt, cursor: 'pointer' };


