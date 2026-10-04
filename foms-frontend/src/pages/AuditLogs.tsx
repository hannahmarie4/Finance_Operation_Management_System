import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useAppData } from '../context/AppDataContext';

/* ─── helpers ─── */
const fmtDate = (ts: string) =>
  new Date(ts).toLocaleString('en-US', {
    month: 'numeric', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true,
  });

const ACTION_LABEL: Record<string, string> = {
  DOCUMENT_UPLOADED:                   'Uploaded a document',
  DOCUMENT_INFORMATION_EXTRACTED:      'Extracted document information',
  INVALID_DOCUMENT_REJECTED:           'Rejected an invalid document',
  DUPLICATE_FLAGGED:                   'Flagged a duplicate document',
  DUPLICATE_DISMISSED:                 'Dismissed a duplicate flag',
  USER_LOGIN:                          'Logged into the system',
  USER_LOGOUT:                         'Logged out of the system',
  COLLECTION_RECORDED:                 'Recorded a collection entry',
  PAYMENT_PROCESSED:                   'Processed a payment',
  INVOICE_CREATED:                     'Created a new invoice',
  INVOICE_UPDATED:                     'Updated an invoice',
  INVOICE_DELETED:                     'Deleted an invoice',
  RECORD_VIEWED:                       'Viewed a record',
  REPORT_GENERATED:                    'Generated a report',
  SETTINGS_UPDATED:                    'Updated system settings',
};
const actionLabel = (a: string) => ACTION_LABEL[a] ?? a.replace(/_/g, ' ').toLowerCase().replace(/^\w/, c => c.toUpperCase());

const FAILED_ACTIONS = new Set(['INVALID_DOCUMENT_REJECTED', 'DUPLICATE_FLAGGED', 'USER_LOGOUT']);
const isSuccess = (action: string) => !FAILED_ACTIONS.has(action);

const EVENT_COLOR: Record<string, string> = {
  DOCUMENT_UPLOADED:                   '#0D9488',
  DOCUMENT_INFORMATION_EXTRACTED:      '#0D9488',
  INVALID_DOCUMENT_REJECTED:           '#DC2626',
  DUPLICATE_FLAGGED:                   '#D97706',
  USER_LOGIN:                          '#2563EB',
  USER_LOGOUT:                         '#6B7280',
  COLLECTION_RECORDED:                 '#7C3AED',
  PAYMENT_PROCESSED:                   '#059669',
};
const eventColor = (a: string) => EVENT_COLOR[a] ?? '#0D9488';

/* ─── KPI Card ─── */
const KpiCard: React.FC<{ label: string; value: number; icon: string; iconColor: string; iconBg: string }> = ({ label, value, icon, iconColor, iconBg }) => (
  <div style={{ background: '#fff', borderRadius: 12, padding: '18px 20px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', gap: 10, flex: '1 1 160px', minWidth: 140 }}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
      <div style={{ width: 32, height: 32, borderRadius: 8, background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <i className={`ti ${icon}`} style={{ fontSize: '1rem', color: iconColor }} />
      </div>
    </div>
    <span style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0F172A', lineHeight: 1 }}>{value}</span>
  </div>
);

/* ─── Row Action Menu ─── */
const RowMenu: React.FC<{ onView: () => void }> = ({ onView }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid #E2E8F0', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.15s' }}
        onMouseEnter={e => (e.currentTarget.style.background = '#F8FAFC')}
        onMouseLeave={e => (e.currentTarget.style.background = '#fff')}>
        <i className="ti ti-dots-vertical" style={{ fontSize: 15, color: '#64748B' }} />
      </button>
      {open && (
        <div style={{ position: 'absolute', right: 0, top: '100%', marginTop: 4, background: '#fff', border: '1px solid #E2E8F0', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.1)', zIndex: 100, minWidth: 150, overflow: 'hidden' }}>
          <button
            onClick={() => { onView(); setOpen(false); }}
            style={{ width: '100%', padding: '10px 16px', background: 'none', border: 'none', textAlign: 'left', fontSize: '0.83rem', fontWeight: 600, color: '#0F172A', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, transition: 'background 0.15s' }}
            onMouseEnter={e => (e.currentTarget.style.background = '#F0FDFA')}
            onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
            <i className="ti ti-eye" style={{ color: '#0D9488', fontSize: 15 }} /> View Details
          </button>
        </div>
      )}
    </div>
  );
};

/* ─── Main Page ─── */
export const AuditLogs: React.FC = () => {
  const { auditLogs } = useAppData();

  const [search, setSearch]         = useState('');
  const [eventType, setEventType]   = useState('');
  const [resultFilter, setResult]   = useState('');
  const [userFilter, setUserFilter] = useState('');
  const [dateFrom, setDateFrom]     = useState('');
  const [dateTo, setDateTo]         = useState('');
  const [selectedLog, setSelectedLog] = useState<any>(null);
  const [sortKey, setSortKey]       = useState<string>('timestamp');
  const [sortDir, setSortDir]       = useState<'asc' | 'desc'>('desc');
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [page, setPage] = useState(1);

  const uniqueActions = useMemo(() => Array.from(new Set(auditLogs.map(l => l.action))).sort(), [auditLogs]);
  const uniqueUsers   = useMemo(() => Array.from(new Set(auditLogs.map(l => l.userFullName))).sort(), [auditLogs]);

  const filtered = useMemo(() => {
    let list = [...auditLogs];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(l =>
        l.userFullName.toLowerCase().includes(q) ||
        l.userRole.toLowerCase().includes(q) ||
        l.action.toLowerCase().includes(q) ||
        (l.details || '').toLowerCase().includes(q),
      );
    }
    if (eventType)    list = list.filter(l => l.action === eventType);
    if (userFilter)   list = list.filter(l => l.userFullName === userFilter);
    if (resultFilter === 'success') list = list.filter(l => isSuccess(l.action));
    if (resultFilter === 'failed')  list = list.filter(l => !isSuccess(l.action));
    if (dateFrom)     list = list.filter(l => new Date(l.timestamp) >= new Date(dateFrom));
    if (dateTo) {
      const end = new Date(dateTo); end.setHours(23, 59, 59, 999);
      list = list.filter(l => new Date(l.timestamp) <= end);
    }
    list.sort((a: any, b: any) => {
      let cmp = 0;
      if (sortKey === 'timestamp') cmp = new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
      else cmp = String(a[sortKey] ?? '').localeCompare(String(b[sortKey] ?? ''));
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [auditLogs, search, eventType, userFilter, resultFilter, dateFrom, dateTo, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage));
  const paged = filtered.slice((page - 1) * rowsPerPage, page * rowsPerPage);

  const totalEvents = auditLogs.length;
  const loginEvents = auditLogs.filter(l => l.action === 'USER_LOGIN').length;
  const dupChecks   = auditLogs.filter(l => l.action.includes('DUPLICATE') || l.action.includes('DOCUMENT')).length;
  const collEvents  = auditLogs.filter(l => l.action.includes('COLLECTION') || l.action.includes('PAYMENT')).length;
  const failedAuth  = auditLogs.filter(l => l.action.includes('FAILED') || l.action.includes('REJECTED')).length;

  const toggleSort = (key: string) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };
  const SortIcon = ({ col }: { col: string }) => (
    <i className="ti ti-arrows-sort" style={{ fontSize: 11, color: sortKey === col ? '#0D9488' : '#CBD5E1', marginLeft: 4 }} />
  );

  const resetFilters = () => { setSearch(''); setEventType(''); setResult(''); setUserFilter(''); setDateFrom(''); setDateTo(''); };

  const selStyle: React.CSSProperties = {
    height: 38, padding: '0 28px 0 12px', borderRadius: 8, border: '1px solid #E2E8F0',
    fontSize: '0.82rem', background: '#fff', color: '#374151', outline: 'none', appearance: 'none' as any,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── KPI Row ── */}
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
        <KpiCard label="Total Audit Events"   value={totalEvents} icon="ti-file-description" iconColor="#0D9488" iconBg="#F0FDFA" />
        <KpiCard label="User Login Activity"  value={loginEvents} icon="ti-login"            iconColor="#2563EB" iconBg="#EFF6FF" />
        <KpiCard label="Duplicate Checks"     value={dupChecks}   icon="ti-copy"             iconColor="#D97706" iconBg="#FFFBEB" />
        <KpiCard label="Collection Events"    value={collEvents}  icon="ti-trending-up"      iconColor="#7C3AED" iconBg="#F5F3FF" />
        <KpiCard label="Failed Auth Attempts" value={failedAuth}  icon="ti-shield-x"         iconColor="#DC2626" iconBg="#FEF2F2" />
      </div>

      {/* ── Audit Trail Card ── */}
      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #E2E8F0', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', overflow: 'hidden' }}>

        {/* ── Card Header: title + Export + Refresh ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: '1px solid #F1F5F9' }}>
          <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0F172A' }}>Audit Trail</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button style={{ height: 36, padding: '0 14px', background: '#fff', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: '0.82rem', fontWeight: 600, color: '#374151', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
              onMouseEnter={e => (e.currentTarget.style.background = '#F8FAFC')}
              onMouseLeave={e => (e.currentTarget.style.background = '#fff')}>
              <i className="ti ti-download" style={{ fontSize: 14 }} /> Export
            </button>
            <button style={{ height: 36, padding: '0 14px', background: '#0D9488', border: 'none', borderRadius: 8, fontSize: '0.82rem', fontWeight: 700, color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, boxShadow: '0 2px 6px rgba(13,148,136,0.25)' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#0F766E')}
              onMouseLeave={e => (e.currentTarget.style.background = '#0D9488')}>
              <i className="ti ti-refresh" style={{ fontSize: 14 }} /> Refresh Data
            </button>
          </div>
        </div>

        {/* ── Toolbar: filters ── */}
        <div style={{ padding: '14px 24px', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', borderBottom: '1px solid #F1F5F9' }}>

          {/* Search — matches app search bar style */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8, padding: '0 14px', flex: '1 1 200px', minWidth: 180, height: 38 }}>
            <i className="ti ti-search" style={{ color: '#94A3B8', fontSize: 15, flexShrink: 0 }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search audit events..."
              style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: '0.85rem', color: '#0F172A', width: '100%' }}
            />
          </div>

          {/* Event Type */}
          <div style={{ position: 'relative' }}>
            <select value={eventType} onChange={e => setEventType(e.target.value)}
              style={{ ...selStyle, paddingRight: 28, minWidth: 150, border: '1.5px solid #0D9488', color: eventType ? '#0D9488' : '#374151', fontWeight: 600 }}>
              <option value="">All Event Types</option>
              {uniqueActions.map(a => <option key={a} value={a}>{a.replace(/_/g, ' ')}</option>)}
            </select>
            <i className="ti ti-chevron-down" style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', color: '#0D9488', fontSize: 12, pointerEvents: 'none' }} />
          </div>

          {/* All Results */}
          <div style={{ position: 'relative' }}>
            <select value={resultFilter} onChange={e => setResult(e.target.value)} style={{ ...selStyle, minWidth: 120 }}>
              <option value="">All Results</option>
              <option value="success">Success</option>
              <option value="failed">Failed</option>
            </select>
            <i className="ti ti-chevron-down" style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', fontSize: 12, pointerEvents: 'none' }} />
          </div>

          {/* User */}
          <div style={{ position: 'relative' }}>
            <select value={userFilter} onChange={e => setUserFilter(e.target.value)} style={{ ...selStyle, minWidth: 130 }}>
              <option value="">All Users</option>
              {uniqueUsers.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
            <i className="ti ti-chevron-down" style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', fontSize: 12, pointerEvents: 'none' }} />
          </div>

          {/* From */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748B', whiteSpace: 'nowrap' }}>From:</span>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
              style={{ ...selStyle, width: 140, padding: '0 10px', appearance: 'auto' as any }} />
          </div>

          {/* To */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748B', whiteSpace: 'nowrap' }}>To:</span>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
              style={{ ...selStyle, width: 140, padding: '0 10px', appearance: 'auto' as any }} />
          </div>

          {(search || eventType || resultFilter || userFilter || dateFrom || dateTo) && (
            <button onClick={resetFilters}
              style={{ height: 38, padding: '0 12px', background: 'none', border: 'none', color: '#94A3B8', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}>
              Reset
            </button>
          )}
        </div>

        {/* ── Table ── */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                {[
                  { key: 'timestamp',    label: 'DATE & TIME' },
                  { key: 'userFullName', label: 'USER' },
                  { key: 'userRole',     label: 'ROLE' },
                  { key: 'action',       label: 'EVENT TYPE' },
                  { key: '_actionLabel', label: 'ACTION' },
                  { key: 'recordId',     label: 'RELATED RECORD' },
                  { key: '_result',      label: 'RESULT' },
                ].map(col => (
                  <th key={col.key}
                    onClick={() => !col.key.startsWith('_') && toggleSort(col.key)}
                    style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 700, fontSize: '0.72rem', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap', cursor: col.key.startsWith('_') ? 'default' : 'pointer', userSelect: 'none' }}>
                    {col.label}
                    {!col.key.startsWith('_') && <SortIcon col={col.key} />}
                  </th>
                ))}
                <th style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 700, fontSize: '0.72rem', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: '48px 24px', textAlign: 'center', color: '#94A3B8' }}>
                    <i className="ti ti-database-off" style={{ fontSize: 32, display: 'block', marginBottom: 8 }} />
                    No audit events found
                  </td>
                </tr>
              ) : paged.map((log, i) => {
                const color = eventColor(log.action);
                const success = isSuccess(log.action);
                return (
                  <tr key={log.id}
                    style={{ borderBottom: '1px solid #F1F5F9', background: i % 2 === 0 ? '#fff' : '#FAFAFA', transition: 'background 0.15s' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#F0FDFA')}
                    onMouseLeave={e => (e.currentTarget.style.background = i % 2 === 0 ? '#fff' : '#FAFAFA')}>

                    {/* DATE & TIME */}
                    <td style={{ padding: '11px 16px', color: '#475569', whiteSpace: 'nowrap', fontSize: '0.82rem' }}>
                      {fmtDate(log.timestamp)}
                    </td>

                    {/* USER */}
                    <td style={{ padding: '11px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#E0F2FE', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <i className="ti ti-user" style={{ fontSize: 13, color: '#0284C7' }} />
                        </div>
                        <span style={{ maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500, color: '#0F172A' }}>
                          {log.userFullName}
                        </span>
                      </div>
                    </td>

                    {/* ROLE */}
                    <td style={{ padding: '11px 16px', color: '#64748B', whiteSpace: 'nowrap', fontSize: '0.82rem' }}>
                      {log.userRole}
                    </td>

                    {/* EVENT TYPE */}
                    <td style={{ padding: '11px 16px' }}>
                      <span style={{ color, fontWeight: 700, fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
                        {log.action.length > 26 ? log.action.slice(0, 26) + '…' : log.action}
                      </span>
                    </td>

                    {/* ACTION — human-readable */}
                    <td style={{ padding: '11px 16px', color: '#334155', fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
                      {actionLabel(log.action)}
                    </td>

                    {/* RELATED RECORD */}
                    <td style={{ padding: '11px 16px', color: log.recordId ? '#475569' : '#CBD5E1', fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
                      {log.recordId || '—'}
                    </td>

                    {/* RESULT badge */}
                    <td style={{ padding: '11px 16px' }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                        padding: '3px 10px', borderRadius: 999, fontSize: '0.75rem', fontWeight: 700,
                        background: success ? '#ECFDF5' : '#FEF2F2',
                        color:      success ? '#059669' : '#DC2626',
                        border: `1px solid ${success ? '#A7F3D0' : '#FECACA'}`,
                      }}>
                        <i className={`ti ${success ? 'ti-circle-check' : 'ti-xbox-x'}`} style={{ fontSize: 12 }} />
                        {success ? 'Success' : 'Failed'}
                      </span>
                    </td>

                    {/* ACTIONS — ⋮ menu */}
                    <td style={{ padding: '11px 16px', textAlign: 'right' }}>
                      <RowMenu onView={() => setSelectedLog(log)} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer */}
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
                {[10, 25, 50].map(n => <option key={n} value={n}>{n}</option>)}
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

      {/* ── Detail Modal ── */}
      {selectedLog && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
          onClick={() => setSelectedLog(null)}>
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 560, boxShadow: '0 20px 60px rgba(0,0,0,0.18)', overflow: 'hidden' }}
            onClick={e => e.stopPropagation()}>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px', borderBottom: '1px solid #E2E8F0' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#0F172A' }}>Audit Log Details</h3>
                <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748B' }}>{fmtDate(selectedLog.timestamp)}</p>
              </div>
              <button onClick={() => setSelectedLog(null)}
                style={{ background: '#F1F5F9', border: 'none', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className="ti ti-x" style={{ fontSize: 16, color: '#64748B' }} />
              </button>
            </div>

            <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                {[
                  { label: 'User',       value: selectedLog.userFullName },
                  { label: 'Role',       value: selectedLog.userRole },
                  { label: 'IP Address', value: selectedLog.ipAddress || '127.0.0.1' },
                  { label: 'Related Record', value: [selectedLog.recordType, selectedLog.recordId].filter(Boolean).join(' — ') || '—' },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <span style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{label}</span>
                    <span style={{ fontSize: '0.875rem', color: '#0F172A', fontWeight: 600 }}>{value}</span>
                  </div>
                ))}
              </div>

              <div style={{ background: '#F0FDFA', borderRadius: 8, padding: '12px 16px', border: '1px solid #99F6E4', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#0D9488', textTransform: 'uppercase', marginBottom: 4 }}>Event Type</span>
                  <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0F172A' }}>{selectedLog.action}</span>
                </div>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 12px', borderRadius: 999,
                  fontSize: '0.78rem', fontWeight: 700, background: isSuccess(selectedLog.action) ? '#ECFDF5' : '#FEF2F2',
                  color: isSuccess(selectedLog.action) ? '#059669' : '#DC2626',
                  border: `1px solid ${isSuccess(selectedLog.action) ? '#A7F3D0' : '#FECACA'}`,
                }}>
                  <i className={`ti ${isSuccess(selectedLog.action) ? 'ti-circle-check' : 'ti-xbox-x'}`} style={{ fontSize: 12 }} />
                  {isSuccess(selectedLog.action) ? 'Success' : 'Failed'}
                </span>
              </div>

              <div>
                <span style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: 4 }}>Action Performed</span>
                <p style={{ margin: 0, fontSize: '0.875rem', color: '#0F172A', fontWeight: 600 }}>{actionLabel(selectedLog.action)}</p>
              </div>

              {selectedLog.details && (
                <div>
                  <span style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: 6 }}>Details</span>
                  <div style={{ background: '#F8FAFC', padding: 12, borderRadius: 8, border: '1px solid #E2E8F0', fontSize: '0.85rem', color: '#334155', lineHeight: 1.5 }}>
                    {selectedLog.details}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
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

export default AuditLogs;
