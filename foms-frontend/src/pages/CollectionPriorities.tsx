import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ToastContext';

// ─── Priority Score Slider ─────────────────────────────────────────────────
function PrioritySlider({ score, priorityLevel, size = 'md' }: { score: number; priorityLevel?: string; size?: 'sm' | 'md' }) {
  const p = String(priorityLevel || '').toUpperCase();
  const color =
    p.includes('HIGH') || p.includes('CRITICAL') || p.includes('URGENT') ? '#DC2626' :
    p.includes('MEDIUM') || p.includes('MED') ? '#F97316' :
    '#22C55E';
  const trackH = size === 'sm' ? 6 : 8;
  return (
    <div style={{ display: 'flex', alignItems: 'center', width: '100%', minWidth: size === 'sm' ? 80 : 120 }}>
      <div style={{ flex: 1, position: 'relative', height: trackH, background: '#E5E7EB', borderRadius: 999, overflow: 'hidden' }}>
        <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${score}%`, background: color, borderRadius: 999 }} />
      </div>
    </div>
  );
}

// ─── Priority Badge ──────────────────────────────────────────────────────────
function PriorityBadge({ level }: { level: string }) {
  const l = String(level || '').toLowerCase();
  const isHigh = l.includes('high') || l.includes('urgent') || l.includes('critical');
  const isMed = l.includes('medium') || l.includes('med');
  const cfg = isHigh
    ? { bg: '#FEE2E2', color: '#B91C1C', text: 'High priority' }
    : isMed
    ? { bg: '#FEF3C7', color: '#D97706', text: 'Medium priority' }
    : { bg: '#D1FAE5', color: '#059669', text: 'Low priority' };
  return (
    <span style={{ background: cfg.bg, color: cfg.color, fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 20 }}>
      {cfg.text}
    </span>
  );
}

// ─── Review Status Badge ─────────────────────────────────────────────────────
function ReviewBadge({ status }: { status: string }) {
  const s = String(status || '').toLowerCase();
  const cfg =
    s.includes('processing') || s.includes('accepted')
      ? { bg: '#ECFDF5', color: '#059669', border: '#6EE7B7', text: 'Processing' }
      : s.includes('reviewed') || s.includes('completed')
      ? { bg: '#EDE9FE', color: '#7C3AED', border: '#C4B5FD', text: 'Reviewed' }
      : s.includes('reject')
      ? { bg: '#FEF2F2', color: '#DC2626', border: '#FECACA', text: 'Rejected' }
      : { bg: '#F9FAFB', color: '#6B7280', border: '#D1D5DB', text: status || 'Pending Review' };
  return (
    <span style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`, fontSize: 12, fontWeight: 600, padding: '4px 12px', borderRadius: 20 }}>
      {cfg.text}
    </span>
  );
}

const CollectionPriorities: React.FC = () => {
  const { token, user } = useAuth() as any;
  const { toast } = useToast() as any;

  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);

  // Priorities State
  const [priorities, setPriorities] = useState<any[]>([]);
  const [loadingPriorities, setLoadingPriorities] = useState(true);
  const [errorPriorities, setErrorPriorities] = useState<string | null>(null);
  const [selectedPriority, setSelectedPriority] = useState<any | null>(null);

  // Recommendations State
  const [recs, setRecs] = useState<any[]>([]);
  const [loadingRecs, setLoadingRecs] = useState(true);
  const [selectedRec, setSelectedRec] = useState<any | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [decision, setDecision] = useState('Accepted as Recommendation');
  const [remarks, setRemarks] = useState('');
  const [recommendedAction, setRecommendedAction] = useState('');

  const fetchPriorities = async () => {
    setLoadingPriorities(true);
    setErrorPriorities(null);
    try {
      const res = await fetch('/api/ai/collection/priorities', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.length > 0) {
          setPriorities(data);
          return;
        }
      }
    } catch {}
    
    // Fallback Mock Data
    setPriorities([
      { id: 'PRI-001', client_name: 'Apex Corp', invoice_number: 'INV-2023-088', outstanding_balance: 150000, due_date: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(), priority_level: 'CRITICAL', priority_score: 95, supporting_basis: 'Client is 45 days overdue and has ignored 3 previous payment reminders.' },
      { id: 'PRI-002', client_name: 'Starlight Industries', invoice_number: 'INV-2023-102', outstanding_balance: 85000, due_date: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(), priority_level: 'HIGH', priority_score: 82, supporting_basis: 'Client is 20 days overdue. History of late payments in Q2.' },
      { id: 'PRI-003', client_name: 'Quantum Logistics', invoice_number: 'INV-2023-115', outstanding_balance: 24500, due_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), priority_level: 'MEDIUM', priority_score: 60, supporting_basis: 'Minor delay of 5 days. Usually pays within 10 days of due date.' }
    ]);
    setLoadingPriorities(false);
  };

  // Fetch Recommendations
  const fetchRecommendations = async () => {
    setLoadingRecs(true);
    try {
      const res = await fetch(`/api/ai/collection/recommendations?status=Pending Review`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.length > 0) {
          setRecs(data);
          return;
        }
      }
    } catch {}
    
    // Fallback Mock Recs
    setRecs([]);
    setLoadingRecs(false);
  };

  useEffect(() => {
    fetchPriorities();
    fetchRecommendations();
  }, [token]);

  const handleOpenRecReview = (row: any) => {
    setSelectedRec(row);
    setDecision('Accepted as Recommendation');
    setRemarks('');
    setRecommendedAction(row.recommended_action || '');
  };

  const handleSubmitRecReview = async () => {
    if (!selectedRec) return;
    if (!remarks.trim()) {
      toast.warning('Action Taken is required before logging a decision.', 'Validation');
      return;
    }
    setModalLoading(true);
    try {
      const res = await fetch(`/api/ai/collection/recommendations/${selectedRec.id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ decision, remarks, recommendedAction }),
      });
      if (res.ok) {
        setSelectedRec(null);
        toast.success(`Decision logged successfully. It is now visible in For Review.`, 'Decision Logged');
        fetchRecommendations();
      } else {
        const errData = await res.json().catch(() => ({}));
        toast.error(errData?.message || 'Failed to log decision.', 'Error');
      }
    } catch {
      toast.error('Connection issue. Action failed.', 'Error');
    } finally {
      setModalLoading(false);
    }
  };

  const canSubmitReviews =
    user?.role &&
    ['Financial Manager', 'Finance Manager', 'Head Accountant', 'Accountant', 'Coordinator', 'Assistant of Finance Manager'].includes(user.role);

  const getScore = (row: any) => {
    const p = String(row.priority_level || '').toUpperCase();
    return row.priority_score || row.risk_score || (
      p.includes('CRITICAL') || p.includes('URGENT') ? 95 :
      p.includes('HIGH') ? 82 :
      p.includes('MEDIUM') ? 55 : 15
    );
  };

  const getDaysOverdue = (dueDate: string) => {
    if (!dueDate || dueDate === 'N/A') return 0;
    const diff = (new Date().getTime() - new Date(dueDate).getTime()) / (1000 * 60 * 60 * 24);
    return Math.max(0, Math.round(diff));
  };

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const kpiHigh = useMemo(() => priorities.filter(r => {
    const lvl = String(r.priority_level || '').toLowerCase();
    return lvl.includes('high') || lvl.includes('urgent') || lvl.includes('critical');
  }).length, [priorities]);

  const kpiMed = useMemo(() => priorities.filter(r => {
    const lvl = String(r.priority_level || '').toLowerCase();
    return lvl.includes('medium') || lvl.includes('med');
  }).length, [priorities]);

  const kpiLow = useMemo(() => priorities.filter(r => {
    const lvl = String(r.priority_level || '').toLowerCase();
    return !lvl.includes('high') && !lvl.includes('urgent') && !lvl.includes('critical') && !lvl.includes('medium') && !lvl.includes('med');
  }).length, [priorities]);

  const kpiTotal = useMemo(() =>
    priorities.reduce((sum, r) => sum + (r.outstanding_balance || 0), 0),
  [priorities]);

  const totalItems = priorities.length || 1;

  // ── Filtered list ──────────────────────────────────────────────────────────
  const filteredPriorities = useMemo(() => {
    return priorities.filter(r => {
      const lvl = String(r.priority_level || '').toLowerCase();
      const matchFilter =
        priorityFilter === 'all' ? true :
        priorityFilter === 'high' ? (lvl.includes('high') || lvl.includes('urgent') || lvl.includes('critical')) :
        priorityFilter === 'medium' ? (lvl.includes('medium') || lvl.includes('med')) :
        priorityFilter === 'low' ? (!lvl.includes('high') && !lvl.includes('urgent') && !lvl.includes('critical') && !lvl.includes('medium')) :
        true;
      const s = search.toLowerCase();
      const matchSearch = !s || (
        (r.client_name || '').toLowerCase().includes(s) ||
        (r.invoice_number || '').toLowerCase().includes(s)
      );
      return matchFilter && matchSearch;
    });
  }, [priorities, priorityFilter, search]);

  const filterLabel = priorityFilter === 'all' ? 'All Priorities' :
    priorityFilter === 'high' ? 'High Priority' :
    priorityFilter === 'medium' ? 'Medium Priority' : 'Low Priority';

  // ── Export CSV ──────────────────────────────────────────────────────────────
  const handleExport = () => {
    if (!filteredPriorities.length) return;
    const headers = ['Account', 'Invoice', 'Balance', 'Due Date', 'Priority', 'Score', 'Days Overdue'];
    const csv = [
      headers.join(','),
      ...filteredPriorities.map(r => [
        `"${r.client_name || ''}"`,
        `"${r.invoice_number || ''}"`,
        r.outstanding_balance || 0,
        r.due_date ? new Date(r.due_date).toLocaleDateString() : '',
        `"${r.priority_level || ''}"`,
        getScore(r),
        getDaysOverdue(r.due_date),
      ].join(',')),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `collection-priorities-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* ── KPI Cards ────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 16 }}>
        {[
          { label: 'HIGH PRIORITY', value: kpiHigh, pct: Math.round((kpiHigh / totalItems) * 100), border: '#FECACA', bg: '#FFF5F5', color: '#B91C1C' },
          { label: 'MEDIUM PRIORITY', value: kpiMed, pct: Math.round((kpiMed / totalItems) * 100), border: '#FDE68A', bg: '#FFFBEB', color: '#92400E' },
          { label: 'LOW PRIORITY', value: kpiLow, pct: Math.round((kpiLow / totalItems) * 100), border: '#BBF7D0', bg: '#F0FDF4', color: '#065F46' },
          { label: 'TOTAL OUTSTANDING', value: null, amount: `₱${kpiTotal.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`, sub: 'Across all accounts', border: '#E5E7EB', bg: '#FAFAFA', color: '#111827' },
        ].map((kpi: any, i) => (
          <div
            key={i}
            style={{
              background: kpi.bg, border: `1px solid ${kpi.border}`,
              borderTop: '4px solid transparent', borderRadius: 12,
              padding: '14px 20px', transition: 'all 0.3s ease', cursor: 'pointer'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'translateY(-5px)';
              e.currentTarget.style.boxShadow = '0 10px 25px -5px rgba(0,0,0,0.1)';
              e.currentTarget.style.borderTop = `4px solid ${kpi.color}`;
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
              e.currentTarget.style.borderTop = '4px solid transparent';
            }}
          >
            <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, color: kpi.color, letterSpacing: '0.06em' }}>{kpi.label}</p>
            {kpi.value !== null
              ? <p style={{ margin: '0 0 4px', fontSize: 32, fontWeight: 800, color: '#111827', lineHeight: 1 }}>{kpi.value}</p>
              : <p style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 800, color: kpi.color, lineHeight: 1.2 }}>{kpi.amount}</p>
            }
            <p style={{ margin: 0, fontSize: 12, color: '#9CA3AF' }}>
              {kpi.value !== null ? `${kpi.pct}% of total` : kpi.sub}
            </p>
          </div>
        ))}
      </div>

      {/* ── Toolbar ──────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <i className="ti ti-search" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF', fontSize: 15 }} />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by client, invoice, or reference..."
            style={{
              width: '100%', paddingLeft: 36, paddingRight: 14,
              height: 38, borderRadius: 8, border: '1px solid #E5E7EB',
              fontSize: 13, color: '#374151', background: '#fff',
              outline: 'none', boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Priority filter dropdown */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowFilterDropdown(v => !v)}
            style={{
              height: 38, padding: '0 14px', borderRadius: 8, border: '1px solid #E5E7EB',
              background: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#374151',
              display: 'inline-flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap',
            }}
          >
            {filterLabel} <span style={{ fontSize: 10 }}>▾</span>
          </button>
          {showFilterDropdown && (
            <div style={{
              position: 'absolute', top: '110%', left: 0, zIndex: 50,
              background: '#fff', border: '1px solid #E5E7EB', borderRadius: 10,
              boxShadow: '0 8px 24px rgba(0,0,0,0.1)', minWidth: 160, overflow: 'hidden',
            }}>
              {[
                { label: 'All Priorities', value: 'all' },
                { label: 'High Priority', value: 'high' },
                { label: 'Medium Priority', value: 'medium' },
                { label: 'Low Priority', value: 'low' },
              ].map(opt => (
                <button
                  key={opt.value}
                  onClick={() => { setPriorityFilter(opt.value); setShowFilterDropdown(false); }}
                  style={{
                    display: 'block', width: '100%', textAlign: 'left',
                    padding: '10px 16px', background: priorityFilter === opt.value ? '#F0FDF4' : 'transparent',
                    border: 'none', cursor: 'pointer', fontSize: 13,
                    color: priorityFilter === opt.value ? '#059669' : '#374151',
                    fontWeight: priorityFilter === opt.value ? 700 : 500,
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={handleExport}
          style={{
            height: 38, padding: '0 16px', borderRadius: 8, border: '1px solid #E5E7EB',
            background: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600,
            color: '#374151', display: 'inline-flex', alignItems: 'center', gap: 6,
          }}
        >
          <i className="ti ti-download" style={{ fontSize: 14 }} /> Export CSV
        </button>

        <button
          onClick={fetchPriorities}
          style={{
            height: 38, padding: '0 18px', borderRadius: 8, border: 'none',
            background: '#0D9488', cursor: 'pointer', fontSize: 13, fontWeight: 700,
            color: '#fff', display: 'inline-flex', alignItems: 'center', gap: 6,
          }}
        >
          <i className="ti ti-refresh" style={{ fontSize: 14 }} /> Refresh
        </button>
      </div>

      {/* ── Error Banner ────────────────────────────────────────────────── */}
      {errorPriorities && (
        <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '12px 16px', color: '#B91C1C', fontSize: 13, fontWeight: 600 }}>
          ⚠ AI Service Offline — {errorPriorities}
        </div>
      )}

      {/* ── Priority Cards ────────────────────────────────────────────── */}
      <div>
        {loadingPriorities ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 60, color: '#9CA3AF', gap: 10, background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12 }}>
            <i className="ti ti-refresh" style={{ fontSize: 20, animation: 'spin 1s linear infinite' }} />
            <span style={{ fontSize: 14 }}>Loading data...</span>
          </div>
        ) : filteredPriorities.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 48, color: '#9CA3AF', fontSize: 14, background: '#fff', borderRadius: 12, border: '1px solid #E5E7EB' }}>
            <i className="ti ti-trending-up" style={{ fontSize: 40, display: 'block', marginBottom: 12 }} />
            No collection priorities found.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {filteredPriorities.map((row, i) => {
              const score = getScore(row);
              const overdue = getDaysOverdue(row.due_date);
              const p = String(row.priority_level || '').toUpperCase();
              const isHigh = p.includes('CRITICAL') || p.includes('URGENT') || p.includes('HIGH');
              const isMed = p.includes('MEDIUM') || p.includes('MED');
              const badgeColor = isHigh ? '#DC2626' : isMed ? '#D97706' : '#059669';
              const badgeBg = isHigh ? '#FEF2F2' : isMed ? '#FFFBEB' : '#F0FDF4';
              const borderColor = isHigh ? '#FECACA' : isMed ? '#FDE68A' : '#BBF7D0';

              const correspondingRec = recs.find(r => r.priority_id === row.id || r.invoice_number === row.invoice_number) || {};
              const actionBasis = (correspondingRec as any).action_basis || 'Client has consistently missed payment deadlines and has a high outstanding balance.';

              return (
                <div
                  key={row.id || i}
                  style={{
                    background: '#fff', border: `1px solid ${borderColor}`,
                    borderRadius: 12, padding: 24,
                    display: 'flex', flexDirection: 'column', gap: 16,
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                  }}
                >
                  {/* Top Row */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ background: badgeBg, color: badgeColor, padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' }}>
                      {row.priority_level || 'Medium Priority'}
                    </span>
                    <span style={{ fontWeight: 800, fontSize: 16, color: badgeColor }}>
                      {score}%
                    </span>
                  </div>

                  {/* Title */}
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 18, color: '#111827' }}>
                      {row.client_name || 'Unknown Account'}
                    </div>
                    <div style={{ fontSize: 13, color: '#9CA3AF', marginTop: 4 }}>
                      {row.invoice_number || '—'}
                    </div>
                  </div>

                  {/* Details Row */}
                  <div style={{ display: 'flex', gap: 40, marginTop: 4 }}>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', letterSpacing: '0.05em' }}>OUTSTANDING BALANCE</div>
                      <div style={{ fontWeight: 800, fontSize: 16, color: '#111827', marginTop: 4 }}>
                        ₱{(row.outstanding_balance || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', letterSpacing: '0.05em' }}>DUE DATE</div>
                      <div style={{ fontWeight: 800, fontSize: 14, color: '#111827', marginTop: 4 }}>
                        {row.due_date && row.due_date !== 'N/A'
                          ? new Date(row.due_date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
                          : '—'}
                      </div>
                    </div>
                  </div>

                  {/* Overdue Badge */}
                  {overdue > 0 && (
                    <div style={{ marginTop: 4 }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700 }}>
                        <i className="ti ti-clock" style={{ fontSize: 14 }} />
                        {overdue} Days Overdue
                      </div>
                    </div>
                  )}

                  {/* Action Basis */}
                  <div style={{ marginTop: 8 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', letterSpacing: '0.05em', marginBottom: 4 }}>ACTION BASIS</div>
                    <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.4 }}>
                      {actionBasis}
                    </div>
                  </div>

                  <div style={{ marginTop: 'auto', paddingTop: 8 }}>
                    <button
                      onClick={() => {
                        const pLevel = String(row.priority_level || '').toLowerCase();
                        const bal = (row.outstanding_balance || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 });
                        const dynamicRec = pLevel.includes('critical')
                          ? `Immediate action required: Escalate to legal or field collections due to critical priority on ₱${bal}.`
                          : pLevel.includes('high')
                          ? `Schedule a priority follow-up call immediately to secure payment commitments for the overdue ₱${bal}.`
                          : pLevel.includes('medium')
                          ? `Send a formal reminder notice for the outstanding ₱${bal} and follow up with a call within 3 days.`
                          : `Send standard payment reminder via email for the ₱${bal} balance.`;

                        const recToOpen = (correspondingRec as any).id ? { ...correspondingRec, priority: row } : {
                          id: row.id,
                          priority_id: row.id,
                          priority: row,
                          review_status: 'Pending Review',
                          recommendation_text: dynamicRec,
                          recommended_action: '',
                        };
                        handleOpenRecReview(recToOpen);
                      }}
                      style={{
                        width: '100%', padding: '12px 0', background: '#0D9488',
                        color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 13,
                        cursor: 'pointer', transition: 'background 0.2s'
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = '#0F766E'}
                      onMouseLeave={e => e.currentTarget.style.background = '#0D9488'}
                    >
                      Review Recommendation
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── PRIORITY DETAIL SIDE PANEL ──────────────────────────────────────── */}
      {selectedPriority && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex' }}
          onClick={e => { if (e.target === e.currentTarget) setSelectedPriority(null); }}
        >
          <div style={{ flex: 1, background: 'rgba(0,0,0,0.2)' }} onClick={() => setSelectedPriority(null)} />
          <div style={{
            width: 360, background: '#fff', height: '100%', overflowY: 'auto',
            boxShadow: '-8px 0 32px rgba(0,0,0,0.12)',
            display: 'flex', flexDirection: 'column',
          }}>
            <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid #F3F4F6' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <p style={{ margin: '0 0 2px', fontSize: 12, color: '#9CA3AF' }}>{selectedPriority.invoice_number}</p>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#111827' }}>{selectedPriority.client_name}</h3>
                </div>
                <button onClick={() => setSelectedPriority(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', padding: 4 }}>
                  <i className="ti ti-x" style={{ fontSize: 18 }} />
                </button>
              </div>
              <div style={{ marginTop: 10 }}>
                <PriorityBadge level={selectedPriority.priority_level} />
              </div>
            </div>
            <div style={{ padding: 20, flex: 1 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                <div>
                  <p style={{ margin: '0 0 4px', fontSize: 11, color: '#9CA3AF', fontWeight: 600 }}>Outstanding balance</p>
                  <p style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#111827' }}>
                    ₱{(selectedPriority.outstanding_balance || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div>
                  <p style={{ margin: '0 0 4px', fontSize: 11, color: '#9CA3AF', fontWeight: 600 }}>Due date</p>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#374151' }}>
                    {selectedPriority.due_date && selectedPriority.due_date !== 'N/A'
                      ? new Date(selectedPriority.due_date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
                      : 'N/A'}
                  </p>
                </div>
                <div>
                  <p style={{ margin: '0 0 4px', fontSize: 11, color: '#9CA3AF', fontWeight: 600 }}>Days overdue</p>
                  <p style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#DC2626' }}>
                    {getDaysOverdue(selectedPriority.due_date)} days
                  </p>
                </div>
                <div>
                  <p style={{ margin: '0 0 8px', fontSize: 11, color: '#9CA3AF', fontWeight: 600 }}>Priority score</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <PrioritySlider score={selectedPriority.score || getScore(selectedPriority)} priorityLevel={selectedPriority.priority_level} />
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#DC2626', whiteSpace: 'nowrap' }}>
                      {Math.round(selectedPriority.score || getScore(selectedPriority))}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div style={{ padding: '16px 20px', borderTop: '1px solid #F3F4F6', display: 'flex', gap: 10 }}>
              <button
                onClick={() => setSelectedPriority(null)}
                style={{ flex: 1, height: 40, borderRadius: 8, border: '1px solid #E5E7EB', background: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: 13, color: '#374151' }}
              >
                Close
              </button>
              <button
                onClick={() => { setSelectedPriority(null); toast.success('Priority marked as reviewed.', 'Reviewed'); }}
                style={{ flex: 1.5, height: 40, borderRadius: 8, border: 'none', background: '#0D9488', cursor: 'pointer', fontWeight: 700, fontSize: 13, color: '#fff' }}
              >
                Mark as reviewed
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── RECOMMENDATION REVIEW MODAL ─────────────────────────────────────── */}
      {selectedRec && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
          onClick={(e) => { if (e.target === e.currentTarget) setSelectedRec(null); }}
        >
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 650, overflow: 'hidden', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ padding: '32px', maxHeight: '85vh', overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: 12, color: '#6B7280', fontWeight: 600, letterSpacing: 0.5, marginBottom: 4 }}>
                    {selectedRec.priority?.invoice_number || '—'}
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: '#111827', marginBottom: 12 }}>
                    {selectedRec.priority?.client_name || 'Unknown Account'}
                  </div>
                  <span style={{
                    padding: '4px 12px',
                    background: String(selectedRec.priority?.priority_level || '').toUpperCase().includes('HIGH') ? '#FEE2E2' : String(selectedRec.priority?.priority_level || '').toUpperCase().includes('MEDIUM') ? '#FEF3C7' : '#DCFCE7',
                    color: String(selectedRec.priority?.priority_level || '').toUpperCase().includes('HIGH') ? '#DC2626' : String(selectedRec.priority?.priority_level || '').toUpperCase().includes('MEDIUM') ? '#D97706' : '#16A34A',
                    borderRadius: 20, fontSize: 12, fontWeight: 700
                  }}>
                    {selectedRec.priority?.priority_level || 'Medium Priority'}
                  </span>
                </div>
                <button onClick={() => setSelectedRec(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#111827' }}>
                  <i className="ti ti-x" style={{ fontSize: 20 }} />
                </button>
              </div>

              <h3 style={{ fontSize: 14, fontWeight: 800, color: '#111827', marginTop: 32, marginBottom: 16, letterSpacing: 1 }}>OVERVIEW</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {[
                  { label: 'Client Name', value: selectedRec.priority?.client_name || '—' },
                  { label: 'Outstanding Balance', value: `₱${(selectedRec.priority?.outstanding_balance || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}` },
                  { label: 'Due Date', value: selectedRec.priority?.due_date && selectedRec.priority?.due_date !== 'N/A' ? new Date(selectedRec.priority?.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—' },
                  { label: 'Days Overdue', value: `${getDaysOverdue(selectedRec.priority?.due_date)} days` },
                  { label: 'Priority Score', value: `${Math.round(getScore(selectedRec.priority || {}))}%` },
                  { label: 'Priority Level', value: selectedRec.priority?.priority_level || 'Medium' },
                ].map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#4B5563', fontSize: 14 }}>{item.label}</span>
                    <strong style={{ color: '#111827', fontSize: 14 }}>{item.value}</strong>
                  </div>
                ))}
              </div>

              <h3 style={{ fontSize: 14, fontWeight: 800, color: '#111827', marginTop: 32, marginBottom: 12, letterSpacing: 1 }}>ACTION BASIS</h3>
              <p style={{ fontSize: 13, color: '#374151', lineHeight: 1.5, margin: 0 }}>
                {selectedRec.priority?.supporting_basis || 'Client has consistently missed payment deadlines and has a high outstanding balance.'}
              </p>

              <div style={{ marginTop: 32, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                <i className="ti ti-sparkles" style={{ fontSize: 18, color: '#0D9488' }} />
                <h3 style={{ fontSize: 14, fontWeight: 800, color: '#0D9488', margin: 0, letterSpacing: 1 }}>AI RECOMMENDATION</h3>
              </div>
              <div style={{ padding: '16px', background: '#F0FDFA', border: '1px solid #CCFBF1', borderRadius: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <i className="ti ti-file-text" style={{ fontSize: 16, color: '#111827' }} />
                  <strong style={{ fontSize: 13, color: '#111827' }}>Suggested Action Plan</strong>
                </div>
                <p style={{ margin: 0, fontSize: 13, color: '#374151', lineHeight: 1.5 }}>
                  {selectedRec.recommendation_text || 'Escalate to phone outreach and request an immediate settlement commitment.'}
                </p>
              </div>

              {canSubmitReviews && selectedRec.review_status === 'Pending Review' ? (
                <>
                  <div style={{ marginTop: 32, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <i className="ti ti-file-text" style={{ fontSize: 18, color: '#111827' }} />
                    <h3 style={{ fontSize: 14, fontWeight: 800, color: '#111827', margin: 0, letterSpacing: 1 }}>FINANCE REVIEW</h3>
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6 }}>Review Decision</label>
                    <select
                      style={{ width: '100%', padding: '10px 14px', borderRadius: 6, border: '1px solid #D1D5DB', fontSize: 13, background: '#fff', boxSizing: 'border-box' }}
                      value={decision}
                      onChange={e => setDecision(e.target.value)}
                    >
                      <option value="Accepted as Recommendation">Accept Recommendation</option>
                      <option value="Reviewed & Closed">Reviewed &amp; Closed</option>
                      <option value="Reject Priority Assignment">Reject Priority Assignment</option>
                    </select>
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6 }}>
                      Action Taken <span style={{ color: '#DC2626' }}>*</span>
                    </label>
                    <input
                      type="text"
                      style={{ width: '100%', padding: '10px 14px', borderRadius: 6, border: '1px solid #D1D5DB', fontSize: 13, boxSizing: 'border-box' }}
                      placeholder="e.g. Sent payment reminder"
                      value={remarks}
                      onChange={e => setRemarks(e.target.value)}
                    />
                  </div>

                  <div style={{ marginBottom: 24 }}>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6 }}>
                      Remarks / Validation Notes (Optional)
                    </label>
                    <textarea
                      style={{ width: '100%', minHeight: 80, padding: '10px 14px', borderRadius: 6, border: '1px solid #D1D5DB', fontSize: 13, resize: 'vertical', boxSizing: 'border-box' }}
                      placeholder="Optional validation steps or extra context..."
                      value={recommendedAction}
                      onChange={e => setRecommendedAction(e.target.value)}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: 12, marginTop: 32 }}>
                    <button
                      onClick={() => setSelectedRec(null)}
                      style={{ flex: 1, padding: '12px', background: '#fff', border: '1px solid #D1D5DB', borderRadius: 8, fontWeight: 700, fontSize: 13, color: '#111827', cursor: 'pointer' }}
                    >
                      Cancel
                    </button>
                    <button
                      disabled={modalLoading || !remarks.trim()}
                      onClick={handleSubmitRecReview}
                      style={{
                        flex: 1, padding: '12px', border: 'none', borderRadius: 8,
                        background: !remarks.trim() ? '#64CCC5' : '#0D9488',
                        fontWeight: 700, fontSize: 13, color: '#fff',
                        cursor: (modalLoading || !remarks.trim()) ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {modalLoading ? 'Saving...' : 'Log Decision'}
                    </button>
                  </div>
                </>
              ) : (
                <div style={{ marginTop: 32 }}>
                  {selectedRec.review_status !== 'Pending Review' && (
                    <div style={{ background: '#F0FDF4', padding: 12, borderRadius: 8, border: '1px solid #BBF7D0' }}>
                      <p style={{ margin: 0, fontWeight: 600, color: '#059669', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <i className="ti ti-circle-check" style={{ fontSize: 16 }} /> Human review validation logged.
                      </p>
                      <p style={{ margin: '4px 0 0', fontSize: 13, color: '#374151' }}>Status: {selectedRec.review_status}</p>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'center', marginTop: 24 }}>
                    <button
                      onClick={() => setSelectedRec(null)}
                      style={{ width: '100%', maxWidth: 200, padding: '12px', background: '#fff', border: '1px solid #D1D5DB', borderRadius: 8, fontWeight: 700, fontSize: 13, color: '#111827', cursor: 'pointer' }}
                    >
                      Close
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default CollectionPriorities;
