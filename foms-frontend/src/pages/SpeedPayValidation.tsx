import React, { useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { DataTable } from '../components/DataTable';
import { StatusBadge } from '../components/StatusBadge';
import { SpeedPaySubmission } from '../data/seed';
import { Card } from '../components/Card';
import { Button } from '../components/Buttons';
import { useToast } from '../components/ToastContext';
import { useAppData } from '../context/AppDataContext';
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
  const [searchParams] = useSearchParams();
  const submissionId = searchParams.get('submissionId');
  const navigate = useNavigate();
  const { speedPay, invoices, clients, receipts, refreshSpeedPay, refreshPayments, refreshInvoices, refreshReceipts } = useAppData();

  const [validationStatus, setValidationStatus] = useState<'Approve' | 'Reject' | ''>('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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
  console.log('[SpeedPayValidation] submissionId:', submissionId);
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
    if (validationStatus === 'Reject' && !rejectionReason.trim()) {
      toast.error('Please provide a rejection reason.', 'Required Field Missing');
      return;
    }
    setIsSubmitting(true);
    try {
      if (validationStatus === 'Approve') {
        // Backend atomically: validates payment, marks invoice Paid, updates AR to 0, creates OR
        await api.post(`/finance/payments/${sub.id}/validate`, { Remarks: 'Approved via SpeedPay Validation' });
        toast.success(`Payment from ${sub.clientName} approved. Invoice = Paid. OR generated.`, 'Payment Validated');
      } else {
        await api.post(`/finance/payments/${sub.id}/reject`, { RejectionReason: rejectionReason });
        toast.error(`Payment from ${sub.clientName} has been Rejected.`, 'Payment Rejected');
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
      onClick: (row: any) => navigate(`/speedpay-validation?submissionId=${row.id}`),
    },
  ];

  // ─── Detail / Validation View ──────────────────────────────────────
  if (submissionId) {
    const sub = allEnriched.find(s => s.id === submissionId);
    if (!sub) return <div style={{ padding: 32 }}>Submission not found.</div>;
    console.log('[SpeedPayValidation] sub.status is:', sub.status);

    const statusColor = sub.status === 'Validated' ? '#10B981' : sub.status === 'Rejected' ? '#EF4444' : '#F59E0B';
    const statusBg = sub.status === 'Validated' ? '#DCFCE7' : sub.status === 'Rejected' ? '#FEE2E2' : '#FEF3C7';

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Notice Banner */}
        <div style={{ background: '#FFF7ED', border: '1px solid #FED7AA', padding: '12px 18px', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 12 }}>
          <i className="ti ti-alert-triangle" style={{ color: '#F97316', fontSize: 18, flexShrink: 0 }} />
          <span style={{ fontSize: '0.85rem', color: '#9A3412' }}>
            <strong>Notice:</strong> Please ensure all payment details are correct before approving. Verify the amount, reference number, and proof of payment carefully.
          </span>
        </div>

        {/* Two-column layout */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24, alignItems: 'start' }}>

          {/* LEFT — Payment Information + Validation Decision */}
          <Card style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ background: '#0F172A', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>SpeedPay Submission</div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#fff', fontWeight: 800 }}>Payment Information</h3>
              </div>
              <span style={{ background: statusBg, color: statusColor, padding: '4px 14px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: statusColor, display: 'inline-block' }} />
                {sub.status}
              </span>
            </div>

            <div style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 20 }}>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#64748B', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>CLIENT NAME</label>
                  <div style={{ padding: '11px 14px', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 14, color: '#0F172A', fontWeight: 700 }}>{sub.clientName}</div>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#64748B', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>CLIENT ID</label>
                  <div style={{ padding: '11px 14px', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 14, color: '#0F172A', fontFamily: 'monospace' }}>{(sub as any).clientId || '—'}</div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#64748B', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>LINKED INVOICE NO.</label>
                  <div style={{ padding: '11px 14px', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 14, color: '#0F172A', fontFamily: 'monospace', fontWeight: 600 }}>{sub.invoiceNumber}</div>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#64748B', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>PAYMENT DATE</label>
                  <div style={{ padding: '11px 14px', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 14, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <i className="ti ti-calendar" style={{ color: '#64748B' }} />
                    {new Date(sub.submittedAt.endsWith('Z') ? sub.submittedAt : sub.submittedAt + 'Z').toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#64748B', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>PAYMENT METHOD</label>
                  <div style={{ padding: '11px 14px', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 14, color: '#0F172A' }}>{sub.paymentMethod}</div>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#64748B', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>REFERENCE NUMBER</label>
                  <div style={{ padding: '11px 14px', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 14, color: '#0F172A', fontFamily: 'monospace' }}>{sub.referenceNumber}</div>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#64748B', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>AMOUNT PAID</label>
                <div style={{ padding: '14px 18px', background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 10, fontSize: 22, color: '#15803D', fontWeight: 800 }}>
                  ₱{Number(sub.amountPaid).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                </div>
              </div>

              {/* Validation Decision — moved here below Amount Paid */}
              {(sub.status !== 'Validated' && sub.status !== 'Rejected') ? (
                <div style={{ background: '#fff', borderRadius: 12, overflow: 'hidden', border: '1px solid #E2E8F0' }}>
                  <div style={{ padding: '14px 20px', borderBottom: '1px solid #E2E8F0', background: '#F8FAFC' }}>
                    <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 800, color: '#0F172A' }}>Log Decision</h4>
                  </div>
                  <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <select
                      value={validationStatus}
                      onChange={(e) => setValidationStatus(e.target.value as 'Approve' | 'Reject')}
                      style={{
                        width: '100%', padding: '11px 14px',
                        border: validationStatus === 'Approve' ? '2px solid #10B981' : validationStatus === 'Reject' ? '2px solid #EF4444' : '1px solid #E2E8F0',
                        borderRadius: 8, fontSize: 14, outline: 'none',
                        background: validationStatus === 'Approve' ? '#F0FDF4' : validationStatus === 'Reject' ? '#FEF2F2' : '#F8FAFC',
                        color: validationStatus === 'Approve' ? '#047857' : validationStatus === 'Reject' ? '#B91C1C' : '#64748B',
                        cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700
                      }}
                    >
                      <option value="" disabled style={{ color: '#64748B' }}>Select Decision...</option>
                      <option value="Approve" style={{ color: '#0F172A' }}>✓ Accept Payment</option>
                      <option value="Reject" style={{ color: '#0F172A' }}>✗ Reject Payment</option>
                    </select>
                    {validationStatus === 'Reject' && (
                      <textarea
                        value={rejectionReason}
                        onChange={e => setRejectionReason(e.target.value)}
                        placeholder="Reason for rejection (e.g., amount mismatch, invalid proof)..."
                        rows={3}
                        style={{ width: '100%', padding: '11px 14px', border: '1px solid #FECACA', borderRadius: 8, fontSize: 13, outline: 'none', resize: 'none', fontFamily: 'inherit', boxSizing: 'border-box', background: '#FEF2F2', color: '#7F1D1D' }}
                      />
                    )}
                    <div style={{ display: 'flex', gap: 10 }}>
                      <button onClick={() => navigate('/speedpay-validation')} style={{ background: '#F1F5F9', color: '#475569', border: '1px solid #E2E8F0', padding: '10px 16px', borderRadius: 8, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                        <i className="ti ti-arrow-left" /> Back
                      </button>
                      <button
                        onClick={() => handleValidate(sub)}
                        disabled={isSubmitting || validationStatus === '' || (validationStatus === 'Reject' && !rejectionReason.trim())}
                        style={{
                          flex: 1, padding: '11px', borderRadius: 8, border: 'none', fontWeight: 700, fontSize: 14, cursor: (isSubmitting || validationStatus === '') ? 'not-allowed' : 'pointer', transition: 'background 0.2s',
                          background: (isSubmitting || validationStatus === '') ? '#94A3B8' : validationStatus === 'Approve' ? '#10B981' : '#EF4444',
                          color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
                        }}
                      >
                        <i className={`ti ${validationStatus === 'Reject' ? 'ti-x' : 'ti-check'}`} />
                        {isSubmitting ? 'Processing...' : validationStatus === 'Approve' ? 'Approve Payment' : validationStatus === 'Reject' ? 'Reject Payment' : 'Submit Decision'}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ background: sub.status === 'Validated' ? '#F0FDF4' : '#FEF2F2', borderRadius: 10, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12, border: `1px solid ${statusColor}44` }}>
                  <i className={`ti ${sub.status === 'Validated' ? 'ti-circle-check' : 'ti-circle-x'}`} style={{ fontSize: 28, color: statusColor }} />
                  <div style={{ fontWeight: 700, color: statusColor }}>
                    This submission has already been <strong>{sub.status}</strong>.
                  </div>
                </div>
              )}

              {!(sub.status !== 'Validated' && sub.status !== 'Rejected') && (
                <div style={{ borderTop: '1px dashed #E2E8F0', paddingTop: 16 }}>
                  <button onClick={() => navigate('/speedpay-validation')} style={{ background: '#F1F5F9', color: '#475569', border: 'none', padding: '10px 20px', borderRadius: 8, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 14 }}>
                    <i className="ti ti-arrow-left" /> Back to List
                  </button>
                </div>
              )}

            </div>
          </Card>

          {/* RIGHT — Order Summary + Proof of Transaction (full-width, no Decision) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Order Summary Card */}
            <Card style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 800, color: '#0F172A' }}>Order Summary</h4>
                <span style={{ background: statusBg, color: statusColor, padding: '2px 10px', borderRadius: 20, fontSize: '0.7rem', fontWeight: 800 }}>{sub.status}</span>
              </div>
              <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12, fontSize: 13 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#64748B', fontWeight: 600 }}>Submission ID</span>
                  <span style={{ color: '#0F172A', fontWeight: 700, fontFamily: 'monospace', fontSize: 12 }}>{sub.id}</span>
                </div>
                <div style={{ height: 1, background: '#F1F5F9' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#64748B', fontWeight: 600 }}>Invoice No.</span>
                  <span style={{ color: '#0F172A', fontWeight: 700, fontFamily: 'monospace', fontSize: 12 }}>{sub.invoiceNumber}</span>
                </div>
                <div style={{ height: 1, background: '#F1F5F9' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#64748B', fontWeight: 600 }}>Submitted By</span>
                  <span style={{ color: '#0F172A', fontWeight: 600 }}>{sub.clientName}</span>
                </div>
                <div style={{ height: 1, background: '#F1F5F9' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#64748B', fontWeight: 600 }}>Last Updated</span>
                  <span style={{ color: '#0F172A', fontWeight: 600 }}>
                    {new Date(sub.submittedAt).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div style={{ height: 1, background: '#F1F5F9' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#64748B', fontWeight: 600 }}>Invoice Amount</span>
                  <span style={{ color: '#0F172A', fontWeight: 800 }}>₱{Number(sub.invoiceAmount || sub.amountPaid).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </Card>

            {/* Proof of Transaction — full-width, taller, clickable image */}
            <Card style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 800, color: '#0F172A' }}>Proof of Transaction</h4>
                {sub.proofFileUrl && (
                  <a href={sub.proofFileUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: '#0EA5E9', fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <i className="ti ti-external-link" /> View Full
                  </a>
                )}
              </div>
              <div style={{ padding: 12 }}>
                {sub.proofFileUrl ? (
                  <a href={sub.proofFileUrl} target="_blank" rel="noopener noreferrer" title="Click to view full image" style={{ display: 'block', cursor: 'zoom-in', position: 'relative' }}>
                    <img
                      src={sub.proofFileUrl}
                      alt="Proof of Payment"
                      style={{ width: '100%', borderRadius: 8, objectFit: 'cover', maxHeight: 280, display: 'block', transition: 'opacity 0.2s' }}
                      onMouseOver={e => (e.currentTarget.style.opacity = '0.85')}
                      onMouseOut={e => (e.currentTarget.style.opacity = '1')}
                    />
                    <div style={{ position: 'absolute', bottom: 8, right: 8, background: 'rgba(0,0,0,0.55)', color: '#fff', borderRadius: 6, padding: '3px 10px', fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <i className="ti ti-zoom-in" /> Click to enlarge
                    </div>
                  </a>
                ) : sub.proofFileName ? (
                  <div style={{ border: '2px dashed #E2E8F0', borderRadius: 10, padding: '40px 16px', textAlign: 'center', color: '#94A3B8', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                    <i className="ti ti-file-description" style={{ fontSize: 48 }} />
                    <span style={{ fontSize: 14, fontWeight: 600, color: '#475569' }}>{sub.proofFileName}</span>
                    <span style={{ fontSize: 12 }}>File uploaded — image preview unavailable</span>
                  </div>
                ) : (
                  <div style={{ border: '2px dashed #E2E8F0', borderRadius: 10, padding: '40px 16px', textAlign: 'center', color: '#94A3B8', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                    <i className="ti ti-photo-off" style={{ fontSize: 48 }} />
                    <span style={{ fontSize: 13 }}>No proof of payment uploaded</span>
                  </div>
                )}
              </div>
            </Card>

          </div>
        </div>

      </div>
    );
  }

  // ─── Main Dashboard View ────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        {[
          { label: 'Pending Validation', value: pending, color: '#F59E0B', icon: 'ti-clock', sub: `₱${pendingAmount.toLocaleString('en-PH', { maximumFractionDigits: 0 })} awaiting` },
          { label: 'Validated', value: validated, color: '#10B981', icon: 'ti-check', sub: `Today: ${validatedToday}` },
          { label: 'Rejected', value: rejected, color: '#EF4444', icon: 'ti-x', sub: `Total returned` },
          { label: 'Total Collected', value: `₱${(totalCollected / 1000).toFixed(1)}k`, color: '#6366F1', icon: 'ti-cash', sub: `From validated payments` },
        ].map(kpi => (
          <div key={kpi.label} style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, padding: '20px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: kpi.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className={`ti ${kpi.icon}`} style={{ fontSize: 20, color: kpi.color }} />
              </div>
              <div style={{ fontSize: 26, fontWeight: 800, color: '#0F172A' }}>{kpi.value}</div>
            </div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#64748B' }}>{kpi.label}</div>
            <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>{kpi.sub}</div>
          </div>
        ))}
      </div>


      {/* Policy banner */}
      <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 10, padding: '12px 18px', display: 'flex', gap: 12, alignItems: 'center' }}>
        <i className="ti ti-info-circle" style={{ color: '#F59E0B', fontSize: 20, flexShrink: 0 }} />
        <p style={{ margin: 0, fontSize: '0.85rem', color: '#92400E' }}>
          <strong>Validation Policy:</strong> Confirm that the submitted amount matches the invoice total and that the payment has been received in the company account before approving.
        </p>
      </div>

      <TableContainer>
        <DataTable
          title="SpeedPay Validations"
          data={allEnriched}
          columns={columns}
          actions={actions}
          rowKey="id"
          searchPlaceholder="Search by client, invoice, or reference..."
        />
      </TableContainer>
    </div>
  );
};

export default SpeedPayValidation;
