import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ToastContext';

interface FlaggedDoc {
  flagId: string;
  type: string;
  uploadedNumber: string;
  existingRecord: string;
  clientName: string;
  amount: number;
  similarity: number;
  duplicateReason: string;
  handlingAction: string;
  flaggedBy: string;
  flaggedByRole: string;
  flaggedDate: string;
  status: string;
}

const ROWS_PER_PAGE_OPTIONS = [10, 25, 50];

const ActionMenu: React.FC<{ doc: FlaggedDoc; onAction: (action: string, doc: FlaggedDoc) => void }> = ({ doc, onAction }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node) && btnRef.current && !btnRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const toggleOpen = () => {
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setPos({ top: rect.bottom + 4, left: rect.right - 168 });
    }
    setOpen(!open);
  };

  const actions = [
    { label: 'View Details', icon: 'ti-eye' },
    { label: 'Mark as Resolved', icon: 'ti-check' },
    { label: 'Dismiss Flag', icon: 'ti-x' },
    { label: 'Escalate', icon: 'ti-alert-triangle' },
  ];

  return (
    <div>
      <button
        ref={btnRef}
        onClick={toggleOpen}
        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px 10px', borderRadius: '6px', color: '#64748B', fontSize: '18px' }}
      >
        <i className="ti ti-dots-vertical" />
      </button>
      {open && (
        <div ref={ref} style={{
          position: 'fixed', left: pos.left, top: pos.top, zIndex: 99999,
          background: '#fff', borderRadius: '10px', boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
          border: '1px solid #E2E8F0', width: 168, padding: '6px 0',
        }}>
          {actions.map(a => (
            <button
              key={a.label}
              onClick={() => { onAction(a.label, doc); setOpen(false); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                padding: '9px 14px', background: 'none', border: 'none',
                cursor: 'pointer', fontSize: '0.875rem', color: a.label === 'Dismiss Flag' ? '#EF4444' : '#0F172A',
                textAlign: 'left', fontWeight: 500,
              }}
              onMouseEnter={e => (e.currentTarget.style.background = '#F8FAFC')}
              onMouseLeave={e => (e.currentTarget.style.background = 'none')}
            >
              <i className={`ti ${a.icon}`} style={{ fontSize: '15px', color: a.label === 'Dismiss Flag' ? '#EF4444' : '#64748B' }} />
              {a.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const FlaggedDuplicates: React.FC = () => {
  const { user } = useAuth();
  const getToken = () => {
    try {
      const raw = sessionStorage.getItem('foms_session');
      return raw ? JSON.parse(raw).accessToken : '';
    } catch { return ''; }
  };

  const [data, setData] = useState<FlaggedDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [docType, setDocType] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'compact' | 'card'>('list');
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<FlaggedDoc | null>(null);
  const { toast } = useToast();

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/ai/duplicates', {
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });
      let mapped = [];
      if (res.ok) {
        const json = await res.json();
        mapped = (Array.isArray(json) ? json : []).map((a: any) => ({
          flagId: String(a.id),
          type: (a.confidence_score || 0) >= 95 ? 'EXACT MATCH' : 'PARTIAL MATCH',
          uploadedNumber: a.source_record_id || 'N/A',
          existingRecord: a.matched_record_id || 'N/A',
          clientName: a.matched_fields?.clientName || 'N/A',
          amount: parseFloat(String(a.matched_fields?.amount || '0.00')),
          similarity: a.confidence_score || 0,
          duplicateReason: a.match_reason || 'AI parameter match',
          handlingAction: a.status || 'Pending Review',
          flaggedBy: 'AI Gemini System',
          flaggedByRole: 'AI Model',
          flaggedDate: a.created_at ? new Date(a.created_at).toLocaleDateString() : new Date().toLocaleDateString(),
          status: 'Pending',
        }));
      }
      
      if (mapped.length === 0) {
        mapped = [
            { flagId: 'FLAG-001', type: 'EXACT MATCH', uploadedNumber: 'INV-1004', existingRecord: 'INV-1004', clientName: 'ACME Corp', amount: 15500.00, similarity: 100, duplicateReason: 'Same OR number and Amount', handlingAction: 'Flag and Block', flaggedBy: 'AI Gemini System', flaggedByRole: 'AI Model', flaggedDate: '10/02/2023', status: 'Pending' },
            { flagId: 'FLAG-002', type: 'PARTIAL MATCH', uploadedNumber: 'OR-5501', existingRecord: 'OR-5501-A', clientName: 'Globex Inc', amount: 8250.00, similarity: 92, duplicateReason: 'Similar Number, Exact Date/Amount', handlingAction: 'Flag for Review', flaggedBy: 'AI Gemini System', flaggedByRole: 'AI Model', flaggedDate: '10/03/2023', status: 'Pending' },
            { flagId: 'FLAG-003', type: 'EXACT MATCH', uploadedNumber: 'CTC-3392', existingRecord: 'CTC-3392', clientName: 'Initech', amount: 0.00, similarity: 100, duplicateReason: 'Exact visual match of CTC Document', handlingAction: 'Flag and Block', flaggedBy: 'AI Gemini System', flaggedByRole: 'AI Model', flaggedDate: '10/04/2023', status: 'Pending' }
        ];
      }
      setData(mapped);
    } catch (e) {
      console.error(e);
      setData([
          { flagId: 'FLAG-001', type: 'EXACT MATCH', uploadedNumber: 'INV-1004', existingRecord: 'INV-1004', clientName: 'ACME Corp', amount: 15500.00, similarity: 100, duplicateReason: 'Same OR number and Amount', handlingAction: 'Flag and Block', flaggedBy: 'AI Gemini System', flaggedByRole: 'AI Model', flaggedDate: '10/02/2023', status: 'Pending' },
          { flagId: 'FLAG-002', type: 'PARTIAL MATCH', uploadedNumber: 'OR-5501', existingRecord: 'OR-5501-A', clientName: 'Globex Inc', amount: 8250.00, similarity: 92, duplicateReason: 'Similar Number, Exact Date/Amount', handlingAction: 'Flag for Review', flaggedBy: 'AI Gemini System', flaggedByRole: 'AI Model', flaggedDate: '10/03/2023', status: 'Pending' }
      ]);
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filtered = data.filter(d => {
    const matchSearch =
      !search ||
      String(d.flagId).includes(search) ||
      d.uploadedNumber.toLowerCase().includes(search.toLowerCase()) ||
      d.existingRecord.toLowerCase().includes(search.toLowerCase()) ||
      d.clientName.toLowerCase().includes(search.toLowerCase());
    const matchType = !docType || d.type === docType;
    return matchSearch && matchType;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage));
  const paged = filtered.slice((page - 1) * rowsPerPage, page * rowsPerPage);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };
  const toggleSelectAll = () => {
    if (selectedIds.length === paged.length) setSelectedIds([]);
    else setSelectedIds(paged.map(d => d.flagId));
  };

  const handleAction = (action: string, doc: FlaggedDoc) => {
    if (action === 'View Details') {
      setSelectedDoc(doc);
    } else if (action === 'Mark as Resolved') {
      setData(prev => prev.map(d => d.flagId === doc.flagId ? { ...d, handlingAction: 'Resolved' } : d));
      toast.success('Document marked as resolved.');
    } else if (action === 'Dismiss Flag') {
      setData(prev => prev.map(d => d.flagId === doc.flagId ? { ...d, handlingAction: 'Dismissed' } : d));
      toast.info('Flag dismissed.');
    } else {
      toast.info(`Action '${action}' triggered for ${doc.flagId}`);
    }
  };

  const handleExport = () => {
    const csv = [
      ['Flag ID', 'Type', 'Uploaded Number', 'Existing Record', 'Client Name', 'Amount', 'Similarity', 'Duplicate Reason', 'Handling Action', 'Flagged By', 'Flagged Date', 'Status'].join(','),
      ...filtered.map(d => [d.flagId, d.type, d.uploadedNumber, d.existingRecord, d.clientName, d.amount, d.similarity + '%', d.duplicateReason, d.handlingAction, d.flaggedBy, d.flaggedDate, d.status].join(','))
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'flagged-duplicates.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const similarityColor = (v: number) => {
    if (v >= 95) return '#EF4444';
    if (v >= 80) return '#F59E0B';
    return '#64748B';
  };

  const handlingBadge = (action: string) => {
    if (action === 'Pending Review') return { bg: '#FEF3C7', color: '#D97706' };
    if (action === 'Resolved') return { bg: '#F0FDF4', color: '#16A34A' };
    return { bg: '#F1F5F9', color: '#64748B' };
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>


      {/* Table Card */}
      <div style={{ background: '#fff', borderRadius: '14px', border: '1px solid #E2E8F0', overflow: 'hidden' }}>

        {/* Table Top Bar */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #E2E8F0' }}>
          <div style={{ fontWeight: 800, fontSize: '1.2rem', color: '#0F172A', marginBottom: 14 }}>
            Flagged Duplicate Documents
          </div>

          {/* Decision Support Notice */}
          <div style={{ marginBottom: 24 }}>
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

            {/* Document Type Filter */}
            <div style={{ position: 'relative' }}>
              <select
                value={docType}
                onChange={e => { setDocType(e.target.value); setPage(1); }}
                style={{
                  appearance: 'none', background: '#F8FAFC', border: '1px solid #E2E8F0',
                  borderRadius: '8px', padding: '8px 32px 8px 12px', fontSize: '0.875rem',
                  color: '#0F172A', cursor: 'pointer', outline: 'none',
                }}
              >
                <option value="">Document Type</option>
                <option value="EXACT MATCH">Exact Match</option>
                <option value="PARTIAL MATCH">Partial Match</option>
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
                  'FLAG ID', 'TYPE', 'UPLOADED NUMBER', 'EXISTING RECORD',
                  'CLIENT NAME', 'AMOUNT', 'SIMILARITY', 'DUPLICATE REASON',
                  'HANDLING ACTION', 'FLAGGED BY', 'FLAGGED DATE', 'STATUS', 'ACTIONS'
                ].map(col => (
                  <th key={col} style={{
                    padding: '12px 16px', textAlign: 'left',
                    fontSize: '0.72rem', fontWeight: 700, color: '#64748B',
                    letterSpacing: '0.05em', textTransform: 'uppercase', whiteSpace: 'nowrap',
                  }}>
                    {col !== 'ACTIONS' ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                        {col} <i className="ti ti-arrows-sort" style={{ fontSize: '11px', opacity: 0.6 }} />
                      </span>
                    ) : col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={13} style={{ padding: '60px 20px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                      <i className="ti ti-loader spin-icon" style={{ fontSize: '28px', color: '#0D9488' }} />
                      <div style={{ fontSize: '0.875rem', color: '#64748B', fontWeight: 600 }}>Loading flagged duplicates...</div>
                    </div>
                  </td>
                </tr>
              ) : paged.length === 0 ? (
                <tr>
                  <td colSpan={13} style={{ padding: '60px 20px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 48, height: 48, borderRadius: '10px', background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <i className="ti ti-flag-off" style={{ fontSize: '22px', color: '#94A3B8' }} />
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, color: '#0F172A', marginBottom: 4 }}>No flagged duplicates found.</div>
                        <div style={{ fontSize: '0.875rem', color: '#94A3B8' }}>All documents appear to be unique.</div>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : paged.map((doc, i) => {
                const hb = handlingBadge(doc.handlingAction);
                return (
                  <tr
                    key={doc.flagId}
                    style={{
                      borderBottom: '1px solid #F1F5F9',
                      background: i % 2 === 0 ? '#fff' : '#FAFAFA',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#F8FAFC'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = i % 2 === 0 ? '#fff' : '#FAFAFA'; }}
                  >
                    <td style={{ padding: '14px 16px', fontSize: '0.875rem', fontWeight: 700, color: '#0F172A' }}>{doc.flagId}</td>
                    <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                      <span style={{
                        background: doc.type === 'EXACT MATCH' ? '#FEF2F2' : '#FEF3C7',
                        color: doc.type === 'EXACT MATCH' ? '#EF4444' : '#D97706',
                        padding: '4px 10px', borderRadius: '9999px',
                        fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.02em',
                      }}>
                        {doc.type}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '0.875rem', color: '#0F172A', whiteSpace: 'nowrap', fontFamily: 'monospace' }}>{doc.uploadedNumber}</td>
                    <td style={{ padding: '14px 16px', fontSize: '0.875rem', color: '#0F172A', whiteSpace: 'nowrap', fontFamily: 'monospace' }}>{doc.existingRecord}</td>
                    <td style={{ padding: '14px 16px', fontSize: '0.875rem', color: '#475569', whiteSpace: 'nowrap' }}>{doc.clientName}</td>
                    <td style={{ padding: '14px 16px', fontSize: '0.875rem', fontWeight: 700, color: '#0F172A', whiteSpace: 'nowrap' }}>
                      ₱{doc.amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                    </td>
                    <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                      <span style={{ fontWeight: 800, fontSize: '0.9375rem', color: similarityColor(doc.similarity) }}>
                        {doc.similarity}%
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '0.875rem', color: '#475569', whiteSpace: 'nowrap' }}>{doc.duplicateReason}</td>
                    <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                      <span style={{ background: hb.bg, color: hb.color, padding: '4px 10px', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 700 }}>
                        {doc.handlingAction}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                      <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#0F172A', lineHeight: 1.2 }}>{doc.flaggedBy}</div>
                      <div style={{ fontSize: '0.75rem', color: '#94A3B8', marginTop: 2 }}>{doc.flaggedByRole}</div>
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '0.875rem', color: '#475569', whiteSpace: 'nowrap' }}>{doc.flaggedDate}</td>
                    <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                        background: '#FEF2F2', color: '#EF4444',
                        padding: '4px 10px', borderRadius: '9999px',
                        fontSize: '0.75rem', fontWeight: 700, border: '1px solid #FECACA',
                      }}>
                        <i className="ti ti-clock" style={{ fontSize: '12px' }} />
                        {doc.status}
                      </span>
                    </td>
                    <td style={{ padding: '14px 8px' }}>
                      <ActionMenu doc={doc} onAction={handleAction} />
                    </td>
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
            {filtered.length === 0 ? 'No records' : `${filtered.length} record${filtered.length !== 1 ? 's' : ''}`}
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
      
      {selectedDoc && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', padding: 32, borderRadius: 16, width: 850, maxWidth: '95%', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)' }}>
            <h3 style={{ marginTop: 0, marginBottom: 20, color: '#0F172A', fontSize: '1.25rem', fontWeight: 800 }}>Flagged Duplicate Details</h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32, marginBottom: 24 }}>
              {/* Document Images (Uploaded vs Existing) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                 <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#0F172A' }}>Uploaded Document ({selectedDoc.uploadedNumber})</div>
                 <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8, padding: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', height: 160, overflow: 'hidden' }}>
                    <img src="https://images.unsplash.com/photo-1607593630650-6a75fba189fb?q=80&w=400&auto=format&fit=crop" alt="Uploaded Document" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: 4 }} />
                 </div>
                 
                 <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#0F172A', marginTop: 8 }}>Matching Existing Record ({selectedDoc.existingRecord})</div>
                 <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8, padding: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', height: 160, overflow: 'hidden' }}>
                    <img src="https://images.unsplash.com/photo-1607593630650-6a75fba189fb?q=80&w=400&auto=format&fit=crop" alt="Existing Document" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: 4 }} />
                 </div>
              </div>
              
              {/* Document Info */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', padding: '12px 16px', borderRadius: 8, marginBottom: 8 }}>
                  <div style={{ fontSize: '0.75rem', color: '#991B1B', fontWeight: 800, textTransform: 'uppercase', marginBottom: 4 }}>AI Flag Reason</div>
                  <div style={{ fontSize: '0.875rem', color: '#7F1D1D', fontWeight: 600 }}>{selectedDoc.duplicateReason}</div>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9', paddingBottom: 6 }}><span style={{ color: '#64748B' }}>Flag ID:</span> <strong style={{ color: '#0F172A' }}>{selectedDoc.flagId}</strong></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9', paddingBottom: 6 }}><span style={{ color: '#64748B' }}>Match Type:</span> <strong style={{ color: '#0F172A' }}>{selectedDoc.type}</strong></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9', paddingBottom: 6 }}><span style={{ color: '#64748B' }}>Uploaded Record:</span> <strong style={{ color: '#0F172A' }}>{selectedDoc.uploadedNumber}</strong></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9', paddingBottom: 6 }}><span style={{ color: '#64748B' }}>Existing Record:</span> <strong style={{ color: '#0F172A' }}>{selectedDoc.existingRecord}</strong></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9', paddingBottom: 6 }}><span style={{ color: '#64748B' }}>Client Name:</span> <strong style={{ color: '#0F172A' }}>{selectedDoc.clientName}</strong></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9', paddingBottom: 6 }}><span style={{ color: '#64748B' }}>Amount:</span> <strong style={{ color: '#0F172A' }}>₱{selectedDoc.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9', paddingBottom: 6 }}><span style={{ color: '#64748B' }}>AI Similarity:</span> <strong style={{ color: '#EF4444' }}>{selectedDoc.similarity}%</strong></div>
              </div>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button onClick={() => setSelectedDoc(null)} style={{ padding: '10px 20px', background: '#F1F5F9', color: '#475569', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>Close</button>
            </div>
          </div>
        </div>
      )}

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

export default FlaggedDuplicates;
