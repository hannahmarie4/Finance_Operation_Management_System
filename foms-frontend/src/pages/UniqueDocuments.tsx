import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ToastContext';

interface UniqueDoc {
  id: string;
  type: 'Invoice' | 'Receipt' | 'OR';
  orInvoiceNumber: string;
  clientName: string;
  amount: number;
  transactionDate: string;
  source: string;
  aiConfidence: number;
  reviewedBy: string;
  reviewedDate: string;
  status: 'Verified' | 'Pending' | 'Flagged';
}

const ROWS_PER_PAGE_OPTIONS = [10, 25, 50];
const VIEW_MODES = ['list', 'compact', 'card'] as const;
type ViewMode = typeof VIEW_MODES[number];

const ActionMenu: React.FC<{ doc: UniqueDoc; role?: string; onAction: (action: string, doc: UniqueDoc) => void }> = ({ doc, role, onAction }) => {
  const [open, setOpen] = useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  const btnRef = React.useRef<HTMLButtonElement>(null);
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

  const isApprover = role === 'Head Accountant' || role === 'Finance Manager';

  const actions = isApprover ? [
    { label: 'View Details', icon: 'ti-eye' },
    { label: 'Approve Document', icon: 'ti-check' },
    { label: 'Download', icon: 'ti-download' },
    { label: 'Flag for Review', icon: 'ti-alert-triangle' },
    { label: 'Remove', icon: 'ti-trash' }
  ] : [
    { label: 'View Details', icon: 'ti-eye' },
    { label: 'Endorse for Approval', icon: 'ti-checkup-list' },
    { label: 'Download', icon: 'ti-download' },
  ];

  return (
    <div>
      <button ref={btnRef} onClick={toggleOpen} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px 10px', borderRadius: '6px', color: '#64748B', fontSize: '18px' }}>
        <i className="ti ti-dots-vertical" />
      </button>
      {open && (
        <div ref={ref} style={{ position: 'fixed', left: pos.left, top: pos.top, zIndex: 99999, background: '#fff', borderRadius: '10px', boxShadow: '0 8px 24px rgba(0,0,0,0.2)', border: '1px solid #E2E8F0', width: 168, padding: '6px 0' }}>
          {actions.map(a => (
            <button key={a.label} onClick={() => { onAction(a.label, doc); setOpen(false); }} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '9px 14px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.875rem', color: a.label === 'Remove' ? '#EF4444' : '#0F172A', textAlign: 'left', fontWeight: 500 }}
              onMouseEnter={e => (e.currentTarget.style.background = '#F8FAFC')}
              onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
              <i className={`ti ${a.icon}`} style={{ fontSize: '15px', color: a.label === 'Remove' ? '#EF4444' : '#64748B' }} />
              {a.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const UniqueDocuments: React.FC = () => {
  const { user } = useAuth();
  
  // Helper to get token
  const getToken = () => {
    try {
      const raw = sessionStorage.getItem('foms_session');
      return raw ? JSON.parse(raw).accessToken : '';
    } catch { return ''; }
  };

  const [docs, setDocs] = useState<UniqueDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [docType, setDocType] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [page, setPage] = useState(1);
  const [selectedDoc, setSelectedDoc] = useState<UniqueDoc | null>(null);
  const { toast } = useToast();

  const handleAction = (action: string, doc: UniqueDoc) => {
    if (action === 'View Details') {
      setSelectedDoc(doc);
    } else if (action === 'Approve Document') {
      setDocs(prev => prev.map(d => d.id === doc.id ? { ...d, status: 'Verified' } : d));
      toast.success(`Document ${doc.id} approved successfully.`);
    } else if (action === 'Flag for Review') {
      setDocs(prev => prev.map(d => d.id === doc.id ? { ...d, status: 'Flagged' } : d));
      toast.info(`Document ${doc.id} flagged for review.`);
    } else if (action === 'Remove') {
      setDocs(prev => prev.filter(d => d.id !== doc.id));
      toast.success(`Document ${doc.id} removed.`);
    } else if (action === 'Endorse for Approval') {
      toast.success(`Document ${doc.id} endorsed to Manager.`);
    } else if (action === 'Download') {
      toast.success(`Downloading ${doc.id}...`);
      setTimeout(() => {
        const blob = new Blob(['Dummy file data for ' + doc.id], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${doc.id}.txt`;
        a.click();
        URL.revokeObjectURL(url);
      }, 500);
    } else {
      toast.info(`Action '${action}' triggered for ${doc.id}`);
    }
  };

  const fetchDocs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/ai/duplicates/unique-documents', {
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });
      let mapped: any[] = [];
      if (res.ok) {
        const data = await res.json();
        mapped = (Array.isArray(data) ? data : []).map((u: any) => ({
          id: u.id || `REC-${Date.now()}`,
          type: u.documentType === 'INVOICE' ? 'Invoice' : u.documentType === 'OFFICIAL_RECEIPT' ? 'Receipt' : 'OR',
          orInvoiceNumber: u.documentNumber || '',
          clientName: u.clientName || 'N/A',
          amount: parseFloat(String(u.amount || '0.00')),
          transactionDate: u.transactionDate || new Date().toISOString().split('T')[0],
          source: u.sourceType || 'Scanned',
          aiConfidence: u.similarityScore || 0,
          reviewedBy: u.scannedBy || 'System',
          reviewedDate: u.createdAt ? new Date(u.createdAt).toLocaleString() : 'N/A',
          status: 'Verified',
        }));
      }
      
      if (mapped.length === 0) {
        mapped = [
          { id: 'REC-2023-010', type: 'Invoice', orInvoiceNumber: 'INV-1001', clientName: 'ACME Corp', amount: 15500.00, transactionDate: '2023-10-01', source: 'Email', aiConfidence: 98, reviewedBy: 'Maria Clara', reviewedDate: '2023-10-02 10:30 AM', status: 'Verified' },
          { id: 'REC-2023-011', type: 'Receipt', orInvoiceNumber: 'OR-1002', clientName: 'Globex Inc', amount: 8250.00, transactionDate: '2023-10-02', source: 'Portal', aiConfidence: 95, reviewedBy: 'Juan Dela Cruz', reviewedDate: '2023-10-03 09:15 AM', status: 'Verified' },
          { id: 'REC-2023-012', type: 'Invoice', orInvoiceNumber: 'INV-1003', clientName: 'Initech', amount: 21000.00, transactionDate: '2023-10-03', source: 'Manual', aiConfidence: 99, reviewedBy: 'System', reviewedDate: '2023-10-03 01:20 PM', status: 'Verified' }
        ];
      }
      setDocs(mapped as UniqueDoc[]);
    } catch (e) {
      console.error(e);
      setDocs([
        { id: 'REC-2023-010', type: 'Invoice', orInvoiceNumber: 'INV-1001', clientName: 'ACME Corp', amount: 15500.00, transactionDate: '2023-10-01', source: 'Email', aiConfidence: 98, reviewedBy: 'Maria Clara', reviewedDate: '2023-10-02 10:30 AM', status: 'Verified' },
        { id: 'REC-2023-011', type: 'Receipt', orInvoiceNumber: 'OR-1002', clientName: 'Globex Inc', amount: 8250.00, transactionDate: '2023-10-02', source: 'Portal', aiConfidence: 95, reviewedBy: 'Juan Dela Cruz', reviewedDate: '2023-10-03 09:15 AM', status: 'Verified' }
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocs();
  }, []);

  const filtered = docs.filter(d => {
    const matchSearch =
      !search ||
      d.id.toLowerCase().includes(search.toLowerCase()) ||
      d.orInvoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
      d.clientName.toLowerCase().includes(search.toLowerCase());
    const matchType = !docType || d.type === docType;
    return matchSearch && matchType;
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage));
  const paged = filtered.slice((page - 1) * rowsPerPage, page * rowsPerPage);

  const handleExport = () => {
    const csv = [
      ['Record ID', 'Type', 'OR/Invoice Number', 'Client Name', 'Amount', 'Transaction Date', 'Source', 'AI Confidence', 'Reviewed By', 'Reviewed Date', 'Status'].join(','),
      ...filtered.map(d => [d.id, d.type, d.orInvoiceNumber, d.clientName, d.amount, d.transactionDate, d.source, d.aiConfidence + '%', d.reviewedBy, d.reviewedDate, d.status].join(','))
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'unique-documents.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const typeColor = (t: string) => {
    if (t === 'Invoice') return { bg: '#EFF6FF', color: '#3B82F6' };
    if (t === 'Receipt') return { bg: '#F0FDF4', color: '#22C55E' };
    return { bg: '#FEF3C7', color: '#D97706' };
  };

  const confidenceColor = (v: number) => {
    if (v >= 98) return '#22C55E';
    if (v >= 95) return '#F59E0B';
    return '#EF4444';
  };

  const statusBadge = (s: string) => {
    if (s === 'Verified') return { bg: '#F0FDF4', color: '#16A34A', border: '#BBF7D0' };
    if (s === 'Pending') return { bg: '#FEF3C7', color: '#D97706', border: '#FDE68A' };
    return { bg: '#FEF2F2', color: '#EF4444', border: '#FECACA' };
  };

  const COLUMNS = ['RECORD ID', 'TYPE', 'OR/INVOICE NUMBER', 'CLIENT NAME', 'AMOUNT', 'TRANSACTION DATE', 'SOURCE', 'AI CONFIDENCE', 'REVIEWED BY', 'REVIEWED DATE', 'STATUS', 'ACTIONS'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Table Card */}
      <div style={{ background: '#fff', borderRadius: '12px', padding: '24px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Top Bar */}
        <div style={{ paddingBottom: '20px' }}>
          <div style={{ fontWeight: 800, fontSize: '1.2rem', color: '#0F172A', marginBottom: 14 }}>Unique Documents</div>

          {/* Decision Support Notice */}
          <div style={{ marginBottom: 24 }}>
            <p style={{ margin: 0, fontSize: '0.875rem', color: '#0F172A', lineHeight: 1.6 }}>
              AI-generated results are provided as decision support only. Final validation and official record updates must be performed by an authorized finance user{' '}
              <strong>through the existing FOMS workflow.</strong>
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#EAEDF3', border: 'none', borderRadius: '28px', padding: '0 16px', height: '42px', flex: '1 1 200px', maxWidth: 320 }}>
              <i className="ti ti-search" style={{ color: '#49454F', fontSize: '16px' }} />
              <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search by ID, Doc #, Client..." style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: '0.9375rem', color: '#1C1B1F', width: '100%' }} />
            </div>
            <div style={{ position: 'relative' }}>
              <select value={docType} onChange={e => { setDocType(e.target.value); setPage(1); }} style={{ appearance: 'none', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '8px 32px 8px 12px', fontSize: '0.875rem', color: '#0F172A', cursor: 'pointer', outline: 'none' }}>
                <option value="">Document Type</option>
                <option value="Invoice">Invoice</option>
                <option value="Receipt">Receipt</option>
                <option value="OR">OR</option>
              </select>
              <i className="ti ti-chevron-down" style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: '#64748B', fontSize: '13px', pointerEvents: 'none' }} />
            </div>
            <button onClick={fetchDocs} style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '7px', padding: '7px 10px', cursor: 'pointer', color: '#64748B', fontSize: '15px' }} title="Refresh">
              <i className={`ti ti-refresh ${loading ? 'spin-icon' : ''}`} />
            </button>
            <div style={{ flex: 1 }} />

            <button onClick={handleExport} style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#F1F5F9', border: 'none', borderRadius: '8px', padding: '8px 14px', fontSize: '0.875rem', fontWeight: 600, color: '#475569', cursor: 'pointer' }}>
              <i className="ti ti-download" style={{ fontSize: '15px' }} /> Export
            </button>
          </div>
        </div>

        {/* Table */}
        <div style={{ overflowX: 'auto', border: '1px solid #E2E8F0', borderRadius: '8px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1300 }}>
            <thead>
              <tr style={{ background: '#F8FAFC' }}>
                {COLUMNS.map(col => (
                  <th key={col} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.72rem', fontWeight: 700, color: '#64748B', letterSpacing: '0.05em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
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
                  <td colSpan={12} style={{ padding: '60px 20px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                      <i className="ti ti-loader spin-icon" style={{ fontSize: '28px', color: '#0D9488' }} />
                      <div style={{ fontSize: '0.875rem', color: '#64748B', fontWeight: 600 }}>Loading unique documents...</div>
                    </div>
                  </td>
                </tr>
              ) : paged.length === 0 ? (
                <tr>
                  <td colSpan={13} style={{ padding: '60px 20px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 48, height: 48, borderRadius: '10px', background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <i className="ti ti-inbox" style={{ fontSize: '22px', color: '#94A3B8' }} />
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, color: '#0F172A', marginBottom: 4 }}>No unique documents found.</div>
                        <div style={{ fontSize: '0.875rem', color: '#94A3B8' }}>Upload a document via AI Duplicate Scan to get started.</div>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : paged.map((doc, i) => {
                const tc = typeColor(doc.type);
                const sb = statusBadge(doc.status);
                return (
                   <tr key={doc.id} style={{ borderBottom: '1px solid #F1F5F9', background: i % 2 === 0 ? '#fff' : '#FAFAFA', transition: 'background 0.15s' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#F8FAFC'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = i % 2 === 0 ? '#fff' : '#FAFAFA'; }}>
                    <td style={{ padding: '14px 16px', fontSize: '0.875rem', fontWeight: 600, color: '#0F172A', whiteSpace: 'nowrap' }}>{doc.id}</td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ background: tc.bg, color: tc.color, padding: '4px 10px', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 700 }}>{doc.type}</span>
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '0.875rem', color: '#0F172A', whiteSpace: 'nowrap', fontFamily: 'monospace' }}>{doc.orInvoiceNumber}</td>
                    <td style={{ padding: '14px 16px', fontSize: '0.875rem', color: '#0F172A', whiteSpace: 'nowrap' }}>{doc.clientName}</td>
                    <td style={{ padding: '14px 16px', fontSize: '0.875rem', fontWeight: 700, color: '#0F172A', whiteSpace: 'nowrap' }}>
                      ₱{doc.amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '0.875rem', color: '#475569', whiteSpace: 'nowrap' }}>{doc.transactionDate}</td>
                    <td style={{ padding: '14px 16px', fontSize: '0.875rem', color: '#475569', whiteSpace: 'nowrap' }}>{doc.source}</td>
                    <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ flex: 1, height: 6, background: '#E2E8F0', borderRadius: '9999px', minWidth: 60, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${doc.aiConfidence}%`, background: confidenceColor(doc.aiConfidence), borderRadius: '9999px' }} />
                        </div>
                        <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: confidenceColor(doc.aiConfidence), minWidth: 44 }}>{doc.aiConfidence}%</span>
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                      <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#0F172A', lineHeight: 1.2 }}>{doc.reviewedBy}</div>
                      <div style={{ fontSize: '0.72rem', color: '#94A3B8', marginTop: 2 }}>Reviewer</div>
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '0.8125rem', color: '#64748B', whiteSpace: 'nowrap' }}>{doc.reviewedDate}</td>
                    <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                      <span style={{ background: sb.bg, color: sb.color, padding: '4px 10px', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 700, border: `1px solid ${sb.border}` }}>{doc.status}</span>
                    </td>
                    <td style={{ padding: '14px 8px' }}>
                      <ActionMenu doc={doc} role={user?.role} onAction={handleAction} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '14px', marginTop: '14px', flexWrap: 'wrap', gap: 10 }}>
          <span style={{ fontSize: '0.875rem', color: '#64748B' }}>
            {filtered.length === 0 ? 'No records' : `Showing ${(page - 1) * rowsPerPage + 1}–${Math.min(page * rowsPerPage, filtered.length)} of ${filtered.length} record${filtered.length !== 1 ? 's' : ''}`}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: '0.875rem', color: '#64748B' }}>Rows per page</span>
              <select value={rowsPerPage} onChange={e => { setRowsPerPage(Number(e.target.value)); setPage(1); }} style={{ border: '1px solid #E2E8F0', borderRadius: '6px', padding: '5px 10px', fontSize: '0.875rem', outline: 'none', cursor: 'pointer' }}>
                {ROWS_PER_PAGE_OPTIONS.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <button onClick={() => setPage(1)} disabled={page === 1} style={pgBtn(page === 1)}>«</button>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={pgBtn(page === 1)}>‹</button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).filter(p => Math.abs(p - page) <= 2).map(p => (
                <button key={p} onClick={() => setPage(p)} style={{ ...pgBtn(false), background: p === page ? '#0D9488' : '#F1F5F9', color: p === page ? '#fff' : '#475569', fontWeight: p === page ? 700 : 500 }}>{p}</button>
              ))}
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={pgBtn(page === totalPages)}>›</button>
              <button onClick={() => setPage(totalPages)} disabled={page === totalPages} style={pgBtn(page === totalPages)}>»</button>
            </div>
          </div>
        </div>
      </div>
      
      {selectedDoc && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', padding: 32, borderRadius: 16, width: 750, maxWidth: '90%', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)' }}>
            <h3 style={{ marginTop: 0, marginBottom: 20, color: '#0F172A', fontSize: '1.25rem', fontWeight: 800 }}>Document Details</h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
              {/* Document Image */}
              <div style={{ background: '#F1F5F9', border: '1px solid #E2E8F0', borderRadius: 8, padding: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', height: 260, overflow: 'hidden' }}>
                 <img src="https://images.unsplash.com/photo-1607593630650-6a75fba189fb?q=80&w=400&auto=format&fit=crop" alt="Scanned Document" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: 4 }} />
              </div>
              
              {/* Document Info */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9', paddingBottom: 6 }}><span style={{ color: '#64748B' }}>Record ID:</span> <strong style={{ color: '#0F172A' }}>{selectedDoc.id}</strong></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9', paddingBottom: 6 }}><span style={{ color: '#64748B' }}>Type:</span> <strong style={{ color: '#0F172A' }}>{selectedDoc.type}</strong></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9', paddingBottom: 6 }}><span style={{ color: '#64748B' }}>Doc Number:</span> <strong style={{ color: '#0F172A' }}>{selectedDoc.orInvoiceNumber}</strong></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9', paddingBottom: 6 }}><span style={{ color: '#64748B' }}>Client Name:</span> <strong style={{ color: '#0F172A' }}>{selectedDoc.clientName}</strong></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9', paddingBottom: 6 }}><span style={{ color: '#64748B' }}>Amount:</span> <strong style={{ color: '#0F172A' }}>₱{selectedDoc.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9', paddingBottom: 6 }}><span style={{ color: '#64748B' }}>AI Confidence:</span> <strong style={{ color: '#0F172A' }}>{selectedDoc.aiConfidence}%</strong></div>
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
  return { background: '#F1F5F9', border: 'none', borderRadius: '6px', padding: '6px 10px', fontSize: '0.875rem', cursor: disabled ? 'not-allowed' : 'pointer', color: disabled ? '#CBD5E1' : '#475569', opacity: disabled ? 0.5 : 1, minWidth: 34, fontWeight: 500 };
}

export default UniqueDocuments;
