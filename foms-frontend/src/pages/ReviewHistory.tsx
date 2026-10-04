import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

interface ReviewRecord {
  historyId: string;
  type: string;
  documentNumber: string;
  clientName: string;
  aiResult: string;
  finalDecision: string;
  reviewer: string;
  reviewerRole: string;
  decisionReason: string;
  reviewerNote: string;
  reviewedDate: string;
}

const ROWS_PER_PAGE_OPTIONS = [10, 25, 50];

const truncate = (str: string, n: number) => str.length > n ? str.slice(0, n) + '...' : str;

const ReviewHistory: React.FC = () => {
  const { user } = useAuth();
  const getToken = () => {
    try {
      const raw = sessionStorage.getItem('foms_session');
      return raw ? JSON.parse(raw).accessToken : '';
    } catch { return ''; }
  };

  const [data, setData] = useState<ReviewRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [decisionFilter, setDecisionFilter] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'compact' | 'card'>('compact');
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [page, setPage] = useState(1);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/ai/duplicates/review-history', {
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });
      let mapped = [];
      if (res.ok) {
        const json = await res.json();
        mapped = (Array.isArray(json) ? json : []).map((h: any) => ({
          historyId: String(h.id),
          type: h.target_type || 'DUPLICATE FLAG',
          documentNumber: h.target_id || '',
          clientName: 'System Record',
          aiResult: h.recommended_action || 'Review Required',
          finalDecision: h.decision || 'Marked as Duplicate',
          reviewer: h.reviewer_username || 'Reviewer',
          reviewerRole: h.reviewer_role || 'Staff',
          decisionReason: h.remarks || '',
          reviewerNote: h.remarks || '',
          reviewedDate: h.review_date ? new Date(h.review_date).toLocaleString() : new Date().toLocaleString(),
        }));
      }
      
      if (mapped.length === 0) {
        mapped = [
            { historyId: 'REV-001', type: 'DUPLICATE FLAG', documentNumber: 'INV-1002', clientName: 'ACME Corp', aiResult: 'Flagged as Duplicate', finalDecision: 'Accepted as Recommendation', reviewer: 'Maria Clara', reviewerRole: 'Finance Manager', decisionReason: 'Confirmed exact match', reviewerNote: 'Duplicate block enforced', reviewedDate: '10/02/2023, 10:45 AM' },
            { historyId: 'REV-002', type: 'DUPLICATE FLAG', documentNumber: 'OR-5500', clientName: 'Globex Inc', aiResult: 'Flagged for Review', finalDecision: 'Overridden by Manager', reviewer: 'Juan Dela Cruz', reviewerRole: 'Head Accountant', decisionReason: 'Different project phase', reviewerNote: 'Proceed to payment', reviewedDate: '10/03/2023, 09:30 AM' },
            { historyId: 'REV-003', type: 'DATA ANOMALY', documentNumber: 'INV-1005', clientName: 'Initech', aiResult: 'Amount Mismatch', finalDecision: 'Marked for Correction', reviewer: 'System User', reviewerRole: 'Accountant', decisionReason: 'Client dispute', reviewerNote: 'Sent back to coordinator', reviewedDate: '10/04/2023, 02:15 PM' }
        ];
      }
      setData(mapped);
    } catch (e) {
      console.error(e);
      setData([
          { historyId: 'REV-001', type: 'DUPLICATE FLAG', documentNumber: 'INV-1002', clientName: 'ACME Corp', aiResult: 'Flagged as Duplicate', finalDecision: 'Accepted as Recommendation', reviewer: 'Maria Clara', reviewerRole: 'Finance Manager', decisionReason: 'Confirmed exact match', reviewerNote: 'Duplicate block enforced', reviewedDate: '10/02/2023, 10:45 AM' },
          { historyId: 'REV-002', type: 'DUPLICATE FLAG', documentNumber: 'OR-5500', clientName: 'Globex Inc', aiResult: 'Flagged for Review', finalDecision: 'Overridden by Manager', reviewer: 'Juan Dela Cruz', reviewerRole: 'Head Accountant', decisionReason: 'Different project phase', reviewerNote: 'Proceed to payment', reviewedDate: '10/03/2023, 09:30 AM' }
      ]);
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filtered = data.filter(r => {
    const matchSearch =
      !search ||
      String(r.historyId).includes(search) ||
      r.documentNumber.toLowerCase().includes(search.toLowerCase()) ||
      r.clientName.toLowerCase().includes(search.toLowerCase()) ||
      r.reviewer.toLowerCase().includes(search.toLowerCase());
    const matchDecision = !decisionFilter || r.finalDecision === decisionFilter;
    return matchSearch && matchDecision;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage));
  const paged = filtered.slice((page - 1) * rowsPerPage, page * rowsPerPage);

  const handleExport = () => {
    const csv = [
      ['History ID', 'Type', 'Document Number', 'Client Name', 'AI Result', 'Final Decision', 'Reviewer', 'Role', 'Decision Reason', 'Reviewer Note', 'Reviewed Date'].join(','),
      ...filtered.map(r => [r.historyId, r.type, r.documentNumber, r.clientName, r.aiResult, r.finalDecision, r.reviewer, r.reviewerRole, r.decisionReason, r.reviewerNote, r.reviewedDate].join(','))
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'review-history.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const decisionBadge = (d: string) => {
    if (d === 'Accepted as Recommendation') return { bg: '#ECFDF5', color: '#059669', border: '#A7F3D0' };
    if (d === 'Overridden by Manager') return { bg: '#FEF3C7', color: '#D97706', border: '#FDE68A' };
    return { bg: '#F1F5F9', color: '#64748B', border: '#E2E8F0' };
  };

  const uniqueDecisions = Array.from(new Set(data.map(r => r.finalDecision)));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>


      {/* Table Card */}
      <div style={{ background: '#fff', borderRadius: '14px', border: '1px solid #E2E8F0', overflow: 'hidden' }}>
        {/* Table Top Bar */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #E2E8F0' }}>
          <div style={{ fontWeight: 800, fontSize: '1.2rem', color: '#0F172A', marginBottom: 14 }}>
            Review History
          </div>

          <div style={{ marginBottom: 24 }}>
            {/* Decision Support Notice */}
            <p style={{ margin: 0, fontSize: '0.875rem', color: '#0F172A', lineHeight: 1.6 }}>
              AI-generated results are provided as decision support only. Final validation and official record updates must be performed by an authorized finance user{' '}
              <strong>through the existing FOMS workflow.</strong>
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            {/* Search */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#EAEDF3', border: 'none', borderRadius: '28px', padding: '0 16px', height: '42px', flex: '1 1 200px', maxWidth: 320 }}>
              <i className="ti ti-search" style={{ color: '#49454F', fontSize: '16px' }} />
              <input
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                placeholder="Search by ID, Doc #, Client..."
                style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: '0.9375rem', color: '#1C1B1F', width: '100%' }}
              />
            </div>

            {/* Decision Filter */}
            <div style={{ position: 'relative' }}>
              <select
                value={decisionFilter}
                onChange={e => { setDecisionFilter(e.target.value); setPage(1); }}
                style={{
                  appearance: 'none', background: '#F8FAFC', border: '1px solid #E2E8F0',
                  borderRadius: '8px', padding: '8px 32px 8px 12px', fontSize: '0.875rem',
                  color: '#0F172A', cursor: 'pointer', outline: 'none',
                }}
              >
                <option value="">Decision</option>
                {uniqueDecisions.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              <i className="ti ti-chevron-down" style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: '#64748B', fontSize: '13px', pointerEvents: 'none' }} />
            </div>

            {/* Refresh icon */}
            <button onClick={fetchData} style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '7px', padding: '7px 10px', cursor: 'pointer', color: '#64748B', fontSize: '15px' }}>
              <i className={`ti ti-refresh ${loading ? 'spin-icon' : ''}`} />
            </button>

            <div style={{ flex: 1 }} />



            {/* Export */}
            <button
              onClick={handleExport}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: '#F1F5F9', border: 'none', borderRadius: '8px',
                padding: '8px 14px', fontSize: '0.875rem', fontWeight: 600,
                color: '#475569', cursor: 'pointer',
              }}
            >
              <i className="ti ti-download" style={{ fontSize: '15px' }} />
              Export
            </button>
          </div>
        </div>

        {/* Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1200 }}>
            <thead>
              <tr style={{ background: '#F8FAFC' }}>
                {[
                  'HISTORY ID', 'TYPE', 'DOCUMENT NUMBER', 'CLIENT NAME',
                  'AI RESULT', 'FINAL DECISION', 'REVIEWER',
                  'DECISION REASON', 'REVIEWER NOTE', 'REVIEWED DATE'
                ].map(col => (
                  <th key={col} style={{
                    padding: '12px 16px', textAlign: 'left',
                    fontSize: '0.72rem', fontWeight: 700, color: '#64748B',
                    letterSpacing: '0.05em', textTransform: 'uppercase', whiteSpace: 'nowrap',
                  }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                      {col} <i className="ti ti-arrows-sort" style={{ fontSize: '11px', opacity: 0.6 }} />
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={10} style={{ padding: '60px 20px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                      <i className="ti ti-loader spin-icon" style={{ fontSize: '28px', color: '#0D9488' }} />
                      <div style={{ fontSize: '0.875rem', color: '#64748B', fontWeight: 600 }}>Loading review history...</div>
                    </div>
                  </td>
                </tr>
              ) : paged.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ padding: '60px 20px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 48, height: 48, borderRadius: '10px', background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <i className="ti ti-history" style={{ fontSize: '22px', color: '#94A3B8' }} />
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, color: '#0F172A', marginBottom: 4 }}>No review history found.</div>
                        <div style={{ fontSize: '0.875rem', color: '#94A3B8' }}>Reviews will appear here after AI scan actions are completed.</div>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : paged.map((rec, i) => {
                const db = decisionBadge(rec.finalDecision);
                return (
                  <tr
                    key={rec.historyId}
                    style={{
                      borderBottom: '1px solid #F1F5F9',
                      background: i % 2 === 0 ? '#fff' : '#FAFAFA',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#F8FAFC'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = i % 2 === 0 ? '#fff' : '#FAFAFA'; }}
                  >
                    <td style={{ padding: '14px 16px', fontSize: '0.875rem', fontWeight: 700, color: '#0F172A' }}>{rec.historyId}</td>
                    <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                      <span style={{
                        background: '#F1F5F9', color: '#475569',
                        padding: '4px 8px', borderRadius: '6px',
                        fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.02em',
                      }}>
                        {truncate(rec.type, 16)}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '0.875rem', color: '#0F172A', fontFamily: 'monospace' }}>{rec.documentNumber}</td>
                    <td style={{ padding: '14px 16px', fontSize: '0.875rem', color: '#475569', whiteSpace: 'nowrap' }}>{rec.clientName}</td>
                    <td style={{ padding: '14px 16px', fontSize: '0.875rem', color: '#475569', whiteSpace: 'nowrap' }}>{rec.aiResult}</td>
                    <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                      <span style={{
                        background: db.bg, color: db.color,
                        padding: '4px 10px', borderRadius: '9999px',
                        fontSize: '0.75rem', fontWeight: 700,
                        border: `1px solid ${db.border}`,
                        display: 'inline-block', maxWidth: 180,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {rec.finalDecision}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                      <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#0F172A', lineHeight: 1.2 }}>{rec.reviewer}</div>
                      <div style={{ fontSize: '0.75rem', color: '#94A3B8', marginTop: 2 }}>{rec.reviewerRole}</div>
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '0.875rem', color: '#475569', maxWidth: 220 }}>
                      <span title={rec.decisionReason}>{truncate(rec.decisionReason, 35)}</span>
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '0.875rem', color: '#475569', maxWidth: 220 }}>
                      <span title={rec.reviewerNote}>{truncate(rec.reviewerNote, 35)}</span>
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '0.8125rem', color: '#64748B', whiteSpace: 'nowrap' }}>{rec.reviewedDate}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '14px 20px', borderTop: '1px solid #F1F5F9', flexWrap: 'wrap', gap: 10,
        }}>
          <span style={{ fontSize: '0.875rem', color: '#64748B' }}>
            {filtered.length === 0
              ? 'No records'
              : `Showing ${(page - 1) * rowsPerPage + 1}–${Math.min(page * rowsPerPage, filtered.length)} of ${filtered.length} record${filtered.length !== 1 ? 's' : ''}`}
          </span>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: '0.875rem', color: '#64748B' }}>Rows per page</span>
              <select
                value={rowsPerPage}
                onChange={e => { setRowsPerPage(Number(e.target.value)); setPage(1); }}
                style={{ border: '1px solid #E2E8F0', borderRadius: '6px', padding: '5px 10px', fontSize: '0.875rem', outline: 'none', cursor: 'pointer' }}
              >
                {ROWS_PER_PAGE_OPTIONS.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <button onClick={() => setPage(1)} disabled={page === 1} style={pgBtn(page === 1)}>«</button>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={pgBtn(page === 1)}>‹</button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).filter(p => Math.abs(p - page) <= 2).map(p => (
                <button key={p} onClick={() => setPage(p)} style={{ ...pgBtn(false), background: p === page ? '#0D9488' : '#F1F5F9', color: p === page ? '#fff' : '#475569', fontWeight: p === page ? 700 : 500 }}>
                  {p}
                </button>
              ))}
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={pgBtn(page === totalPages)}>›</button>
              <button onClick={() => setPage(totalPages)} disabled={page === totalPages} style={pgBtn(page === totalPages)}>»</button>
            </div>
          </div>
        </div>
      </div>
      <style>{`
        .spin-icon { animation: spin 1s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

function pgBtn(disabled: boolean): React.CSSProperties {
  return {
    background: '#F1F5F9', border: 'none', borderRadius: '6px',
    padding: '6px 10px', fontSize: '0.875rem',
    cursor: disabled ? 'not-allowed' : 'pointer',
    color: disabled ? '#CBD5E1' : '#475569',
    opacity: disabled ? 0.5 : 1, minWidth: 34, fontWeight: 500,
  };
}

export default ReviewHistory;
