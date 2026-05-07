'use client';

import { useState } from 'react';
import { Plus, Edit2, Trash2, ChevronRight } from 'lucide-react';

// ── Marketing demo data ──────────────────────────────────────────────────────
const KPI_DEFINITIONS = [
  { id: 'k1', name: 'First Response Time',  unit: 'hours',   target: '≤ 2',    direction: 'lower',  category: 'Response',   weight: 20, active: true  },
  { id: 'k2', name: 'SLA Compliance Rate',  unit: '%',       target: '≥ 95',   direction: 'higher', category: 'SLA',        weight: 25, active: true  },
  { id: 'k3', name: 'Resolution Rate',      unit: '%',       target: '≥ 95',   direction: 'higher', category: 'Resolution', weight: 20, active: true  },
  { id: 'k4', name: 'CSAT Score',           unit: '/ 5',     target: '≥ 4.2',  direction: 'higher', category: 'Quality',    weight: 20, active: true  },
  { id: 'k5', name: 'Avg Resolution Time',  unit: 'hours',   target: '≤ 4',    direction: 'lower',  category: 'Resolution', weight: 10, active: true  },
  { id: 'k6', name: 'Reopen Rate',          unit: '%',       target: '≤ 5',    direction: 'lower',  category: 'Quality',    weight: 5,  active: true  },
  { id: 'k7', name: 'Escalation Rate',      unit: '%',       target: '≤ 10',   direction: 'lower',  category: 'Quality',    weight: 0,  active: false },
];

const CATEGORIES = ['All', 'Response', 'SLA', 'Resolution', 'Quality'];

export default function KpiSetupClient() {
  const [activeCategory, setActiveCategory] = useState('All');
  const [showAdd, setShowAdd] = useState(false);

  const filtered = activeCategory === 'All'
    ? KPI_DEFINITIONS
    : KPI_DEFINITIONS.filter(k => k.category === activeCategory);

  return (
    <div>
      {/* Page header */}
      <div className="v2-page-header">
        <div>
          <h1>KPI Setup</h1>
          <p>Define, weight and manage KPI definitions for all teams</p>
        </div>
        <div className="v2-page-header-actions">
          <button className="v2-btn v2-btn-primary v2-btn-sm" onClick={() => setShowAdd(!showAdd)}>
            <Plus size={12} /> Add KPI Definition
          </button>
        </div>
      </div>

      {/* Add form (toggle) */}
      {showAdd && (
        <div className="v2-card" style={{ marginBottom: 20 }}>
          <div className="v2-card-header">
            <div className="v2-card-title">New KPI Definition</div>
            <button className="v2-btn v2-btn-ghost v2-btn-sm" onClick={() => setShowAdd(false)}>Cancel</button>
          </div>
          <div className="v2-card-body">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              {[
                { label: 'KPI Name', placeholder: 'e.g. First Response Time' },
                { label: 'Unit', placeholder: 'e.g. hours, %, score' },
                { label: 'Target Value', placeholder: 'e.g. ≤ 2 or ≥ 95' },
              ].map(f => (
                <div key={f.label}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 5 }}>{f.label}</label>
                  <input type="text" placeholder={f.placeholder} style={{ width: '100%', padding: '7px 10px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: 12.5, fontFamily: 'inherit', outline: 'none', background: 'var(--bg)', color: 'var(--text-primary)' }} />
                </div>
              ))}
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 5 }}>Direction</label>
                <select className="v2-select" style={{ width: '100%' }}>
                  <option>Lower is better</option>
                  <option>Higher is better</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 5 }}>Category</label>
                <select className="v2-select" style={{ width: '100%' }}>
                  <option>Response</option><option>SLA</option><option>Resolution</option><option>Quality</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 5 }}>Weight (%)</label>
                <input type="number" min={0} max={100} placeholder="0–100" style={{ width: '100%', padding: '7px 10px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: 12.5, fontFamily: 'inherit', outline: 'none', background: 'var(--bg)', color: 'var(--text-primary)' }} />
              </div>
            </div>
            <div style={{ marginTop: 16 }}>
              <button className="v2-btn v2-btn-primary">Save KPI</button>
            </div>
          </div>
        </div>
      )}

      {/* Category filters */}
      <div className="v2-filter-bar" style={{ marginBottom: 14 }}>
        <div className="v2-filter-tabs">
          {CATEGORIES.map(c => (
            <button key={c} className={`v2-filter-tab${activeCategory === c ? ' active' : ''}`} onClick={() => setActiveCategory(c)}>{c}</button>
          ))}
        </div>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Total weight: <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>100%</span></span>
      </div>

      {/* KPI definitions table */}
      <div className="v2-card">
        <div className="v2-table-wrap">
          <table className="v2-table">
            <thead>
              <tr>
                <th>KPI Name</th>
                <th>Category</th>
                <th>Target</th>
                <th>Unit</th>
                <th>Direction</th>
                <th>Weight</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(k => (
                <tr key={k.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <ChevronRight size={12} style={{ color: 'var(--indigo)', flexShrink: 0 }} />
                      <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{k.name}</span>
                    </div>
                  </td>
                  <td><span className="v2-badge v2-badge-indigo">{k.category}</span></td>
                  <td><span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{k.target}</span></td>
                  <td><span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{k.unit}</span></td>
                  <td>
                    <span className={k.direction === 'lower' ? 'v2-badge v2-badge-blue' : 'v2-badge v2-badge-green'}>
                      {k.direction === 'lower' ? '↓ Lower' : '↑ Higher'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div className="v2-progress-bg" style={{ width: 60 }}>
                        <div className="v2-progress-fill" style={{ width: `${k.weight}%`, background: 'var(--indigo)' }} />
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', width: 28 }}>{k.weight}%</span>
                    </div>
                  </td>
                  <td>
                    <span className={`v2-badge ${k.active ? 'v2-badge-green' : 'v2-badge-gray'}`}>
                      {k.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    <div className="v2-row-actions" style={{ opacity: 1 }}>
                      <button className="v2-row-action-btn" title="Edit"><Edit2 size={11} /></button>
                      <button className="v2-row-action-btn" title="Delete"><Trash2 size={11} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
