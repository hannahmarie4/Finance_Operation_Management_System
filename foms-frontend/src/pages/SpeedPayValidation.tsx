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
  const { speedPay, invoices, clients, receipts, refreshSpeedPay, refreshPayments, refreshInvoices, refreshReceipts, waybills, billingRecords } = useAppData();

  const [validationStatus, setValidationStatus] = useState<'Approve' | 'Reject' | ''>('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

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

        {/* New Single-Card Layout matching design request */}
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          {/* Header */}
          <div style={{ background: '#0F172A', padding: '20px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>SpeedPay Submission · {sub.id}</div>
              <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#fff', fontWeight: 800 }}>Payment Information</h3>
            </div>
            <span style={{ border: `1px solid ${statusColor}`, color: statusColor, padding: '6px 16px', borderRadius: 6, fontSize: '0.8rem', fontWeight: 700 }}>
              {sub.status === 'Pending Validation' ? 'Pending Validation' : sub.status}
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 0 }}>
            {/* LEFT — Client & Payment Details */}
            <div style={{ padding: '28px 32px', borderRight: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', gap: 28 }}>
              <h4 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>CLIENT & PAYMENT DETAILS</h4>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#64748B', marginBottom: 6 }}>Client Name</label>
                  <div style={{ fontSize: 16, color: '#0F172A', fontWeight: 700 }}>{sub.clientName}</div>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#64748B', marginBottom: 6 }}>Client ID</label>
                  <div style={{ fontSize: 15, color: '#0F172A' }}>{(sub as any).clientId || '—'}</div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#64748B', marginBottom: 6 }}>Linked Invoice No.</label>
                  <div style={{ fontSize: 15, color: '#0F172A' }}>{sub.invoiceNumber}</div>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#64748B', marginBottom: 6 }}>Payment Date</label>
                  <div style={{ fontSize: 15, color: '#0F172A' }}>
                    {new Date(sub.submittedAt.endsWith('Z') ? sub.submittedAt : sub.submittedAt + 'Z').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, paddingBottom: 28, borderBottom: '1px solid #E2E8F0' }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#64748B', marginBottom: 6 }}>Payment Method</label>
                  <div style={{ fontSize: 15, color: '#0F172A' }}>{sub.paymentMethod}</div>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#64748B', marginBottom: 6 }}>Reference Number</label>
                  <div style={{ fontSize: 15, color: '#0F172A' }}>{sub.referenceNumber}</div>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 800, color: '#64748B', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>AMOUNT PAID</label>
                <div style={{ padding: '20px 24px', background: '#F0FDF4', border: '1px solid #16A34A', borderLeft: '4px solid #16A34A', borderRadius: 8, fontSize: 32, color: '#15803D', fontWeight: 800 }}>
                  ₱{Number(sub.amountPaid).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                </div>
              </div>
            </div>

            {/* RIGHT — Order Summary, Waybills, Proof */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              
              {/* Order Summary */}
              <div style={{ padding: '28px 32px', borderBottom: '1px solid #E2E8F0' }}>
                <h4 style={{ margin: '0 0 20px 0', fontSize: '0.85rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>ORDER SUMMARY</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14, fontSize: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748B' }}>Submission ID</span>
                    <span style={{ color: '#0F172A', fontWeight: 600 }}>{sub.id}</span>
                  </div>
                  <div style={{ height: 1, background: '#F1F5F9' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748B' }}>Invoice No.</span>
                    <span style={{ color: '#0F172A', fontWeight: 600 }}>{sub.invoiceNumber}</span>
                  </div>
                  <div style={{ height: 1, background: '#F1F5F9' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748B' }}>Submitted By</span>
                    <span style={{ color: '#0F172A', fontWeight: 600 }}>{sub.clientName}</span>
                  </div>
                  <div style={{ height: 1, background: '#F1F5F9' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748B' }}>Last Updated</span>
                    <span style={{ color: '#0F172A', fontWeight: 600 }}>{new Date(sub.submittedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div style={{ height: 1, background: '#F1F5F9' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748B' }}>Invoice Amount</span>
                    <span style={{ color: '#0F172A', fontWeight: 800 }}>₱{Number(sub.invoiceAmount || sub.amountPaid).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>

              {/* Waybills Breakdown */}
              <div style={{ padding: '28px 32px', borderBottom: '1px solid #E2E8F0' }}>
                {(() => {
                  const invoice = invoices.find(i => i.id === sub.invoiceId);
                  let invoiceWaybills = waybills.filter(w => w.invoiceId === invoice?.id || w.invoiceId === sub.invoiceNumber || invoice?.waybillIds?.includes(w.id));
                  if (invoiceWaybills.length === 0) {
                    invoiceWaybills = waybills.filter(w => w.clientCode === sub.clientId);
                  }
                  return (
                    <>
                      <h4 style={{ margin: '0 0 20px 0', fontSize: '0.85rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>INCLUDED WAYBILLS ({invoiceWaybills.length})</h4>
                      <div style={{ maxHeight: '180px', overflowY: 'auto', paddingRight: 4 }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1.2fr 1fr', paddingBottom: 10, borderBottom: '1px solid #E2E8F0', fontSize: 11, fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>
                          <span>Waybill No.</span>
                          <span>Delivery Date</span>
                          <span style={{ textAlign: 'right' }}>Amount</span>
                        </div>
                        {invoiceWaybills.length > 0 ? invoiceWaybills.map((wb, i) => {
                          const br = billingRecords.find(r => r.waybillId === wb.id);
                          const amount = br ? br.grandTotal : 0;
                          return (
                            <div key={wb.id} style={{ display: 'grid', gridTemplateColumns: '1.5fr 1.2fr 1fr', padding: '12px 0', borderBottom: i < invoiceWaybills.length - 1 ? '1px solid #F1F5F9' : 'none', fontSize: 13, alignItems: 'center' }}>
                              <span style={{ fontWeight: 600, color: '#0F172A' }}>{wb.waybillNumber}</span>
                              <span style={{ color: '#64748B' }}>{new Date(wb.deliveryDate).toLocaleDateString()}</span>
                              <span style={{ textAlign: 'right', fontWeight: 700, color: '#0F172A' }}>₱{amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                            </div>
                          );
                        }) : (
                          <div style={{ padding: '16px 0', fontSize: 13, color: '#94A3B8' }}>No waybills found.</div>
                        )}
                      </div>
                    </>
                  );
                })()}
              </div>

              {/* Proof of Payment */}
              <div style={{ padding: '28px 32px' }}>
                <h4 style={{ margin: '0 0 20px 0', fontSize: '0.85rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>PROOF OF PAYMENT</h4>
                {sub.proofFileUrl ? (
                  <div
                    onClick={() => setPreviewImage(sub.proofFileUrl!)}
                    style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 16, background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8, padding: '16px', transition: 'all 0.2s', ':hover': { borderColor: '#94A3B8', background: '#F1F5F9' } } as any}
                    title="Click to view full image"
                  >
                    <div style={{ width: 44, height: 44, borderRadius: 8, background: '#E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <i className="ti ti-file-text" style={{ fontSize: 24, color: '#64748B' }} />
                    </div>
                    <div style={{ flex: 1, overflow: 'hidden' }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                        {sub.proofFileName || 'receipt_image.jpg'}
                      </div>
                      <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>Uploaded · Click to preview</div>
                    </div>
                  </div>
                ) : (
                  <div style={{ fontSize: 14, color: '#94A3B8' }}>No proof uploaded</div>
                )}
              </div>
            </div>
          </div>

          {/* Validation Decision (Bottom) */}
          <div style={{ borderTop: '1px solid #E2E8F0', background: '#F8FAFC', padding: '28px 32px' }}>
            <h4 style={{ margin: '0 0 20px 0', fontSize: '0.85rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>LOG DECISION</h4>
            
            {(sub.status !== 'Validated' && sub.status !== 'Rejected') ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#0F172A', marginBottom: 8 }}>Decision</label>
                  <select
                    value={validationStatus}
                    onChange={(e) => setValidationStatus(e.target.value as 'Approve' | 'Reject')}
                    style={{
                      width: '100%', maxWidth: '100%', padding: '12px 16px',
                      border: '1px solid #E2E8F0',
                      borderRadius: 6, fontSize: 15, outline: 'none',
                      background: '#fff', color: '#0F172A',
                      cursor: 'pointer', fontFamily: 'inherit',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                    }}
                  >
                    <option value="" disabled style={{ color: '#64748B' }}>Select Decision...</option>
                    <option value="Approve" style={{ color: '#0F172A' }}>Validate payment</option>
                    <option value="Reject" style={{ color: '#0F172A' }}>Reject payment</option>
                  </select>
                </div>
                {validationStatus === 'Reject' && (
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#0F172A', marginBottom: 8 }}>Rejection Reason <span style={{ color: '#EF4444' }}>*</span></label>
                    <textarea
                      value={rejectionReason}
                      onChange={e => setRejectionReason(e.target.value)}
                      placeholder="Enter reason for rejection..."
                      rows={2}
                      style={{ width: '100%', padding: '12px 16px', border: '1px solid #FECACA', borderRadius: 6, fontSize: 15, outline: 'none', resize: 'none', fontFamily: 'inherit', boxSizing: 'border-box', background: '#FEF2F2', color: '#7F1D1D' }}
                    />
                  </div>
                )}
                
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 16, marginTop: 12 }}>
                  <button onClick={() => navigate('/speedpay-validation')} style={{ background: 'transparent', color: '#0F172A', border: '1px solid #E2E8F0', padding: '12px 24px', borderRadius: 6, fontWeight: 600, cursor: 'pointer', fontSize: 15 }}>
                    Back
                  </button>
                  <button
                    onClick={() => handleValidate(sub)}
                    disabled={isSubmitting || validationStatus === '' || (validationStatus === 'Reject' && !rejectionReason.trim())}
                    style={{
                      padding: '12px 32px', borderRadius: 6, border: 'none', fontWeight: 700, fontSize: 15, cursor: (isSubmitting || validationStatus === '') ? 'not-allowed' : 'pointer', transition: 'opacity 0.2s',
                      background: (isSubmitting || validationStatus === '') ? '#94A3B8' : '#0F172A',
                      color: '#fff'
                    }}
                  >
                    {isSubmitting ? 'Processing...' : 'Submit Validation'}
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: statusColor, fontWeight: 700, fontSize: 16 }}>
                  <i className={`ti ${sub.status === 'Validated' ? 'ti-circle-check' : 'ti-circle-x'}`} style={{ fontSize: 28 }} />
                  This submission has already been {sub.status}.
                </div>
                <button onClick={() => navigate('/speedpay-validation')} style={{ background: '#fff', color: '#0F172A', border: '1px solid #E2E8F0', padding: '10px 24px', borderRadius: 6, fontWeight: 600, cursor: 'pointer', fontSize: 14 }}>
                  Back to List
                </button>
              </div>
            )}
          </div>
        </Card>

        {/* Image Preview Modal */}
        {previewImage && (
          <div 
            style={{ position: 'fixed', inset: 0, zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.7)', padding: 40, backdropFilter: 'blur(4px)' }} 
            onClick={() => setPreviewImage(null)}
          >
            <div style={{ position: 'relative', maxWidth: '90%', maxHeight: '90%', display: 'flex', flexDirection: 'column', background: '#fff', padding: 8, borderRadius: 12 }} onClick={e => e.stopPropagation()}>
              <button 
                onClick={() => setPreviewImage(null)} 
                style={{ position: 'absolute', top: -16, right: -16, background: '#EF4444', border: 'none', color: '#fff', fontSize: 24, width: 32, height: 32, borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 6px rgba(0,0,0,0.2)' }}
              >
                &times;
              </button>
              <img src={previewImage} alt="Proof of Payment Preview" style={{ maxWidth: '100%', maxHeight: 'calc(90vh - 40px)', objectFit: 'contain', borderRadius: 8 }} />
            </div>
          </div>
        )}

      </div>
    );
  }

  // ─── Main Dashboard View ────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 16 }}>
        {[
          { label: 'PENDING VALIDATION', value: pending, border: '#FDE68A', bg: '#FFFBEB', color: '#D97706', sub: `₱${pendingAmount.toLocaleString('en-PH', { maximumFractionDigits: 0 })} awaiting` },
          { label: 'VALIDATED', value: validated, border: '#BBF7D0', bg: '#F0FDF4', color: '#16A34A', sub: `Today: ${validatedToday}` },
          { label: 'REJECTED', value: rejected, border: '#FECACA', bg: '#FFF5F5', color: '#B91C1C', sub: `Total returned` },
          { label: 'TOTAL COLLECTED', value: `₱${(totalCollected / 1000).toFixed(1)}k`, border: '#C7D2FE', bg: '#EEF2FF', color: '#4F46E5', sub: `From validated payments` },
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
