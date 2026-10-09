import React, { useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { DataTable } from '../components/DataTable';
import { CalendarPicker } from '../components/FormModals';
import { StatusBadge } from '../components/StatusBadge';
import { SpeedPaySubmission } from '../data/seed';
import { Card } from '../components/Card';
import { Button } from '../components/Buttons';
import { useToast } from '../components/ToastContext';
import { useAppData } from '../context/AppDataContext';
import { useAuth } from '../context/AuthContext';
import { TableContainer } from '../components/TableContainer';
import api from '../services/api';

// ─── Mini Bar Chart ───────────────────────────────────────────────
function BarChart({ data, color = '#6366F1', height = 120 }: { data: { label: string; value: number }[]; color?: string; height?: number }) {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height, padding: '0 4px' }}>
      {data.map((d, i) => (
        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <div style={{ fontSize: 9, color: '#64748B', fontWeight: 700, textAlign: 'center' }}>
            {d.value > 0 ? (d.value >= 1000 ? `₱${(d.value / 1000).toFixed(0)}k` : `₱${d.value}`) : ''}
          </div>
          <div
            style={{
              width: '100%',
              background: `linear-gradient(180deg, ${color}, ${color}99)`,
              borderRadius: '4px 4px 0 0',
              height: `${(d.value / max) * (height - 30)}px`,
              minHeight: d.value > 0 ? 4 : 0,
              transition: 'height 0.4s ease',
            }}
          />
          <div style={{ fontSize: 9, color: '#94A3B8', fontWeight: 600, textAlign: 'center', lineHeight: 1.2 }}>{d.label}</div>
        </div>
      ))}
    </div>
  );
}

// ─── Mini Donut Chart ──────────────────────────────────────────────
function DonutChart({ segments, size = 100 }: { segments: { label: string; value: number; color: string }[]; size?: number }) {
  const total = segments.reduce((s, d) => s + d.value, 0) || 1;
  const r = size / 2 - 10;
  const cx = size / 2;
  const cy = size / 2;
  const strokeWidth = 16;
  let cumulative = 0;

  const arcs = segments.map(seg => {
    const pct = seg.value / total;
    const startAngle = cumulative * 2 * Math.PI - Math.PI / 2;
    cumulative += pct;
    const endAngle = cumulative * 2 * Math.PI - Math.PI / 2;
    const x1 = cx + r * Math.cos(startAngle);
    const y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(endAngle);
    const y2 = cy + r * Math.sin(endAngle);
    const largeArc = pct > 0.5 ? 1 : 0;
    return { ...seg, d: pct > 0.001 ? `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}` : '' };
  });

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#F1F5F9" strokeWidth={strokeWidth} />
      {arcs.map((arc, i) =>
        arc.d ? (
          <path key={i} d={arc.d} fill="none" stroke={arc.color} strokeWidth={strokeWidth} strokeLinecap="round" />
        ) : null
      )}
      <text x={cx} y={cy + 5} textAnchor="middle" fontSize={12} fontWeight={800} fill="#0F172A">
        {total}
      </text>
    </svg>
  );
}

export const SpeedPayValidation: React.FC = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedSubmission, setSelectedSubmission] = useState<any | null>(null);
  const { speedPay, invoices, clients, receipts, refreshSpeedPay, refreshPayments, refreshInvoices, refreshReceipts, waybills, billingRecords } = useAppData();

  const [validationStatus, setValidationStatus] = useState<'Approve' | 'Reject' | 'Endorse' | 'Return' | ''>('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');

  // ─── Enrich SpeedPay submissions ─────────────────────────────────
  const allEnriched = speedPay.map(sub => {
    const invoice = invoices.find(i => i.id === sub.invoiceId);
    const clientId = (sub as any).clientId || (invoice ? invoice.clientId : 'UNKNOWN');
    const client = clients.find(c => c.id === clientId);

    // Ensure the submittedAt string is treated as UTC if it doesn't have timezone info
    let submittedTimeStr = sub.submittedAt || new Date().toISOString();
    if (!submittedTimeStr.endsWith('Z') && !submittedTimeStr.includes('+')) {
      submittedTimeStr += 'Z';
    }

    return {
      ...sub,
      clientId,
      clientName: sub.clientName ?? client?.name ?? 'Unknown',
      invoiceNumber: sub.invoiceNumber ?? invoice?.invoiceNumber ?? sub.invoiceId,
      invoiceAmount: invoice?.totalAmount ?? sub.amountPaid ?? 0,
      submittedAt: submittedTimeStr
    };
  });
  console.log('[SpeedPayValidation] selectedSubmission:', selectedSubmission?.id);
  console.log('[SpeedPayValidation] allEnriched ids:', allEnriched.map(s => s.id));

  // ─── Chart Data ───────────────────────────────────────────────────
  const pending = allEnriched.filter(s => s.status === 'Pending Validation').length;
  const validated = allEnriched.filter(s => s.status === 'Validated').length;
  const rejected = allEnriched.filter(s => s.status === 'Rejected').length;
  const todayStr = new Date().toLocaleDateString('en-PH');
  const validatedToday = allEnriched.filter(s => s.status === 'Validated' && new Date((s as any).validatedAt || '').toLocaleDateString('en-PH') === todayStr).length;
  const rejectedToday = allEnriched.filter(s => s.status === 'Rejected').length;

  const totalCollected = useMemo(() =>
    allEnriched.filter(s => s.status === 'Validated').reduce((sum, s) => sum + (s.amountPaid ?? 0), 0),
    [allEnriched]
  );

  const totalOutstanding = useMemo(() =>
    invoices.filter(i => i.status !== 'Paid').reduce((sum, i) => sum + (i.totalAmount ?? 0), 0),
    [invoices]
  );

  const totalPaid = useMemo(() =>
    invoices.filter(i => i.status === 'Paid').reduce((sum, i) => sum + (i.totalAmount ?? 0), 0),
    [invoices]
  );

  const pendingAmount = useMemo(() =>
    allEnriched.filter(s => s.status === 'Pending Validation').reduce((sum, s) => sum + (s.amountPaid ?? 0), 0),
    [allEnriched]
  );

  // Monthly payment summary (last 6 months)
  const monthlyData = useMemo(() => {
    const months: { label: string; value: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const label = d.toLocaleDateString('en-US', { month: 'short' });
      const year = d.getFullYear();
      const month = d.getMonth();
      const value = allEnriched
        .filter(s => {
          const sd = new Date(s.submittedAt);
          return sd.getFullYear() === year && sd.getMonth() === month && s.status === 'Validated';
        })
        .reduce((sum, s) => sum + (s.amountPaid ?? 0), 0);
      months.push({ label, value });
    }
    return months;
  }, [allEnriched]);

  // Payment method breakdown
  const methodBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    allEnriched.forEach(s => {
      const m = s.paymentMethod ?? 'Unknown';
      counts[m] = (counts[m] ?? 0) + 1;
    });
    const colors: Record<string, string> = {
      GCash: '#007AFF', Maya: '#00AA6C', 'Bank Transfer': '#1E3A5F',
      'BDO Online': '#0066CC', 'BPI Online': '#CC0000', Unknown: '#94A3B8'
    };
    return Object.entries(counts).map(([label, value]) => ({ label, value, color: colors[label] ?? '#6366F1' }));
  }, [allEnriched]);

  // ─── Handle Validate/Reject — PERSISTS TO DB ────────────────────
  const handleValidate = async (sub: any) => {
    if ((validationStatus === 'Reject' || validationStatus === 'Return') && !rejectionReason.trim()) {
      toast.error(`Please provide a ${validationStatus === 'Reject' ? 'rejection' : 'return'} reason.`, 'Required Field Missing');
      return;
    }
    setIsSubmitting(true);
    try {
      if (validationStatus === 'Approve') {
        // Backend atomically: validates payment, marks invoice Paid, updates AR to 0, creates OR
        await api.put(`/speedpay/submissions/${sub.id}/status`, { Status: 'Validated', Remarks: 'Approved via SpeedPay Validation' });
        toast.success(`Payment from ${sub.clientName} approved. Invoice = Paid. OR generated.`, 'Payment Validated');
      } else if (validationStatus === 'Reject') {
        await api.put(`/speedpay/submissions/${sub.id}/status`, { Status: 'Rejected', Remarks: rejectionReason });
        toast.error(`Payment from ${sub.clientName} has been Rejected.`, 'Payment Rejected');
      } else if (validationStatus === 'Endorse') {
        await api.put(`/speedpay/submissions/${sub.id}/status`, { Status: 'Pending Finance Validation', Remarks: 'Endorsed for final validation by Accountant' });
        toast.success(`Payment from ${sub.clientName} endorsed to Finance Manager.`, 'Endorsed');
      } else if (validationStatus === 'Return') {
        await api.put(`/speedpay/submissions/${sub.id}/status`, { Status: 'Returned / Needs Correction', Remarks: rejectionReason });
        toast.error(`Payment from ${sub.clientName} returned for correction.`, 'Payment Returned');
      }
      
      // Refresh all from DB — single source of truth, persists after refresh/restart
      await Promise.all([refreshSpeedPay(), refreshPayments(), refreshInvoices(), refreshReceipts()]);
      navigate('/speedpay-validation');
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? err?.message ?? 'Action failed.';
      toast.error(msg, 'Validation Error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns = [
    { key: 'id', label: 'TRANSACTION ID', render: (row: any) => <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#64748B' }}>{row.id.substring(0, 8)}...</span> },
    {
      key: 'clientName', label: 'CLIENT NAME', sortable: true,
      render: (row: any) => (
        <div>
          <div style={{ fontWeight: 700, color: '#0F172A' }}>{row.clientName}</div>
          {row.clientId && row.clientId !== 'UNKNOWN' && <div style={{ fontSize: 11, color: '#64748B' }}>{row.clientId}</div>}
        </div>
      )
    },
    { key: 'invoiceNumber', label: 'INVOICE NO.' },
    { key: 'paymentMethod', label: 'METHOD' },
    {
      key: 'amountPaid', label: 'AMOUNT', sortable: true,
      render: (row: any) => <span style={{ fontWeight: 700, color: '#0F172A' }}>₱{Number(row.amountPaid).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
    },
    {
      key: 'proofFileName', label: 'PROOF',
      render: (row: any) => row.proofFileName
        ? <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><i className="ti ti-photo" style={{ fontSize: 16, color: '#0EA5E9' }} /><span style={{ fontSize: 12, color: '#64748B' }}>{row.proofFileName}</span></span>
        : <span style={{ color: '#94A3B8' }}>None</span>
    },
    {
      key: 'submittedAt', label: 'SUBMITTED',
      render: (row: any) => new Date(row.submittedAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
    },
    { key: 'status', label: 'STATUS', render: (row: any) => <StatusBadge status={row.status} /> },
  ];

  const actions = [
    {
      label: 'View Details',
      icon: 'ti-eye',
      onClick: (row: any) => setSelectedSubmission(row),
    },
  ];

  // ─── Main Dashboard View ────────────────────────────────────────────

  const filteredData = useMemo(() => {
    let result = allEnriched;
    if (dateFrom) {
      const fromD = new Date(dateFrom);
      result = result.filter(r => new Date(r.submittedAt) >= fromD);
    }
    if (dateTo) {
      const toD = new Date(dateTo);
      toD.setHours(23, 59, 59, 999);
      result = result.filter(r => new Date(r.submittedAt) <= toD);
    }
    return result;
  }, [allEnriched, dateFrom, dateTo]);

  const methodFilterOptions = [
    { label: 'GCash', value: 'GCash' },
    { label: 'Maya', value: 'Maya' },
    { label: 'BDO Online', value: 'BDO Online' },
    { label: 'BPI Online', value: 'BPI Online' },
    { label: 'Bank Transfer', value: 'Bank Transfer' },
  ];

  const statusFilterOptions = [
    { label: 'Pending Validation', value: 'Pending Validation' },
    { label: 'Validated', value: 'Validated' },
    { label: 'Rejected', value: 'Rejected' },
  ];

  const dtFilters = [
    {
      key: 'paymentMethod',
      label: 'Method',
      options: methodFilterOptions,
    },
    {
      key: 'status',
      label: 'Status',
      options: statusFilterOptions,
    }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 16 }}>
        {[
          { label: 'PENDING VALIDATION', value: pending, border: '#FDE68A', bg: '#fff', color: '#D97706', sub: `₱${pendingAmount.toLocaleString('en-PH', { maximumFractionDigits: 0 })} awaiting` },
          { label: 'VALIDATED', value: validated, border: '#BBF7D0', bg: '#fff', color: '#16A34A', sub: `Today: ${validatedToday}` },
          { label: 'REJECTED', value: rejected, border: '#FECACA', bg: '#fff', color: '#B91C1C', sub: `Total returned` },
          { label: 'TOTAL COLLECTED', value: `₱${(totalCollected / 1000).toFixed(1)}k`, border: '#C7D2FE', bg: '#fff', color: '#4F46E5', sub: `From validated payments` },
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
            <p style={{ margin: '0 0 4px', fontSize: 32, fontWeight: 800, color: '#111827', lineHeight: 1 }}>{kpi.value}</p>
            <p style={{ margin: 0, fontSize: 12, color: '#9CA3AF' }}>{kpi.sub}</p>
          </div>
        ))}
      </div>


      <TableContainer>
        <DataTable
          title="SpeedPay Validations"
          subtitle={
            <span style={{ color: '#92400E', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <i className="ti ti-info-circle" style={{ color: '#F59E0B', fontSize: 16 }} />
              <span><strong>Validation Policy:</strong> Confirm that the submitted amount matches the invoice total and that the payment has been received in the company account before approving.</span>
            </span>
          }
          data={filteredData}
          columns={columns}
          actions={actions}
          rowKey="id"
          searchPlaceholder="Search by client, invoice, or reference..."
          filters={dtFilters}
          customFilters={
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#64748B' }}>From:</span>
              <div style={{ width: 140 }}>
                <CalendarPicker
                  label=""
                  value={dateFrom}
                  onChange={setDateFrom}
                  placeholder="Start date..."
                  variant="filter"
                  maxDate="2024-12-31"
                />
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#64748B' }}>To:</span>
              <div style={{ width: 140 }}>
                <CalendarPicker
                  label=""
                  value={dateTo}
                  onChange={setDateTo}
                  placeholder="End date..."
                  variant="filter"
                  minDate={dateFrom}
                  maxDate="2024-12-31"
                />
              </div>
              </div>
            </div>
          }
        />
      </TableContainer>

      {/* SpeedPay Details Modal */}
      {selectedSubmission && (
        <div 
          style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15, 23, 42, 0.4)', padding: 40 }}
          onClick={() => setSelectedSubmission(null)}
        >
          <div 
            style={{ width: '100%', maxWidth: 700, maxHeight: '90vh', background: '#fff', borderRadius: 16, display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', overflow: 'hidden' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ background: '#0F172A', padding: '20px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>SpeedPay Submission · {selectedSubmission.id}</div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#fff', fontWeight: 800 }}>Payment Information</h3>
              </div>
              <button 
                onClick={() => setSelectedSubmission(null)}
                style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              >
                <i className="ti ti-x" style={{ fontSize: 20 }} />
              </button>
            </div>

            {/* Scrollable Content */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px' }}>
              {/* TOP — Client & Payment Details */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 28, paddingBottom: 28, borderBottom: '1px solid #E2E8F0' }}>
                <h4 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>CLIENT & PAYMENT DETAILS</h4>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#64748B', marginBottom: 6 }}>Client Name</label>
                    <div style={{ fontSize: 16, color: '#0F172A', fontWeight: 700 }}>{selectedSubmission.clientName}</div>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#64748B', marginBottom: 6 }}>Linked Invoice No.</label>
                    <div style={{ fontSize: 15, color: '#0F172A' }}>{selectedSubmission.invoiceNumber}</div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#64748B', marginBottom: 6 }}>Payment Method</label>
                    <div style={{ fontSize: 15, color: '#0F172A' }}>{selectedSubmission.paymentMethod}</div>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#64748B', marginBottom: 6 }}>Reference Number</label>
                    <div style={{ fontSize: 15, color: '#0F172A' }}>{selectedSubmission.referenceNumber}</div>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 800, color: '#64748B', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>AMOUNT PAID</label>
                  <div style={{ padding: '16px 20px', background: '#F0FDF4', border: '1px solid #16A34A', borderLeft: '4px solid #16A34A', borderRadius: 8, fontSize: 24, color: '#15803D', fontWeight: 800 }}>
                    ₱{Number(selectedSubmission.amountPaid).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>

              {/* BOTTOM — Proof */}
              <div style={{ paddingTop: 28 }}>
                <h4 style={{ margin: '0 0 20px 0', fontSize: '0.85rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>PROOF OF PAYMENT</h4>
                {selectedSubmission.proofFileUrl ? (
                  <div
                    onClick={() => setPreviewImage(selectedSubmission.proofFileUrl!)}
                    style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', background: '#fff', border: '1px solid #E2E8F0', borderRadius: 8, overflow: 'hidden' }}
                  >
                    <div style={{ position: 'relative', width: '100%', height: 200, background: '#F1F5F9' }}>
                      <img src={selectedSubmission.proofFileUrl} alt="Proof" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ background: 'rgba(0,0,0,0.75)', color: '#fff', padding: '8px 16px', fontWeight: 700, fontSize: 13, pointerEvents: 'none', borderRadius: 4 }}>
                          Click to view full size
                        </span>
                      </div>
                    </div>
                    <div style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#FAFAFA', borderTop: '1px solid #F1F5F9' }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#3B82F6' }}>Original Document</span>
                      <span style={{ fontSize: 12, color: '#64748B' }}>System Integration</span>
                    </div>
                  </div>
                ) : (
                  <div style={{ fontSize: 14, color: '#94A3B8' }}>No proof uploaded</div>
                )}
              </div>
            </div>

            {/* Validation Decision (Bottom Fixed) */}
            <div style={{ background: '#F8FAFC', padding: '24px 32px', borderTop: '1px solid #E2E8F0', flexShrink: 0 }}>
              {(selectedSubmission.status !== 'Validated' && selectedSubmission.status !== 'Rejected') ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#0F172A', marginBottom: 8 }}>Decision</label>
                    <select
                      value={validationStatus}
                      onChange={(e) => setValidationStatus(e.target.value as 'Approve' | 'Reject' | 'Endorse' | 'Return')}
                      style={{ width: '100%', padding: '10px 14px', border: '1px solid #E2E8F0', borderRadius: 6, fontSize: 14, background: '#fff', color: '#0F172A', outline: 'none' }}
                    >
                      <option value="" disabled>Select Decision...</option>
                      {user?.role === 'Accountant' ? (
                        <>
                          <option value="Endorse">Endorse for Validation</option>
                          <option value="Return">Return for Correction</option>
                        </>
                      ) : (
                        <>
                          <option value="Approve">Validate payment</option>
                          <option value="Reject">Reject payment</option>
                        </>
                      )}
                    </select>
                  </div>
                  {(validationStatus === 'Reject' || validationStatus === 'Return') && (
                    <textarea
                      value={rejectionReason}
                      onChange={e => setRejectionReason(e.target.value)}
                      placeholder={`Reason for ${validationStatus === 'Reject' ? 'rejection' : 'return'}...`}
                      rows={2}
                      style={{ width: '100%', padding: '10px 14px', border: '1px solid #FECACA', borderRadius: 6, fontSize: 14, outline: 'none', resize: 'none', boxSizing: 'border-box' }}
                    />
                  )}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 4 }}>
                    <button onClick={() => setSelectedSubmission(null)} style={{ background: 'transparent', color: '#64748B', border: 'none', fontWeight: 600, cursor: 'pointer', fontSize: 14 }}>Cancel</button>
                    <button
                      onClick={() => handleValidate(selectedSubmission)}
                      disabled={isSubmitting || validationStatus === '' || ((validationStatus === 'Reject' || validationStatus === 'Return') && !rejectionReason.trim())}
                      style={{ padding: '10px 24px', borderRadius: 6, border: 'none', fontWeight: 700, fontSize: 14, cursor: (isSubmitting || validationStatus === '') ? 'not-allowed' : 'pointer', background: (isSubmitting || validationStatus === '') ? '#94A3B8' : '#0F172A', color: '#fff' }}
                    >
                      {isSubmitting ? 'Processing...' : 'Submit Validation'}
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ color: selectedSubmission.status === 'Validated' ? '#10B981' : '#EF4444', fontWeight: 700, fontSize: 15 }}>
                    This submission has been {selectedSubmission.status}.
                  </div>
                  <button onClick={() => setSelectedSubmission(null)} style={{ background: '#0F172A', color: '#fff', border: 'none', padding: '8px 20px', borderRadius: 6, fontWeight: 600, cursor: 'pointer', fontSize: 14 }}>
                    Close
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Full Size Image Preview Modal */}
      {previewImage && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.85)', padding: 40 }} onClick={() => setPreviewImage(null)}>
          <div style={{ position: 'relative', maxWidth: '90%', maxHeight: '90%', display: 'flex', background: '#fff', padding: 8, borderRadius: 12 }} onClick={e => e.stopPropagation()}>
            <button onClick={() => setPreviewImage(null)} style={{ position: 'absolute', top: -16, right: -16, background: '#EF4444', border: 'none', color: '#fff', fontSize: 24, width: 32, height: 32, borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 6px rgba(0,0,0,0.2)' }}>&times;</button>
            <img src={previewImage} alt="Proof of Payment Preview" style={{ maxWidth: '100%', maxHeight: 'calc(90vh - 40px)', objectFit: 'contain', borderRadius: 8 }} />
          </div>
        </div>
      )}

    </div>
  );
};

export default SpeedPayValidation;
