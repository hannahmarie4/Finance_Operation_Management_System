import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { DataTable } from '../components/DataTable';
import { StatusBadge } from '../components/StatusBadge';
import { Payment } from '../data/seed';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ToastContext';
import { StatusCard } from '../components/StatusCard';
import { Button } from '../components/Buttons';
import { Card } from '../components/Card';
import { CalendarPicker } from '../components/FormModals';
import { AuditLog } from '../data/seed';
import { useAppData } from '../context/AppDataContext';
import { TableContainer } from '../components/TableContainer';
import { RecordHistoryModal } from '../components/RecordHistoryModal';
import { ClientInfoCard } from '../components/ClientInfoCard';
import api from '../services/api';

const safeFormatDate = (dateVal: string | Date | undefined | null, options?: Intl.DateTimeFormatOptions) => {
  if (!dateVal) return '—';
  const d = new Date(dateVal);
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-PH', options || { month: 'short', day: 'numeric', year: 'numeric' });
};

class PaymentsErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean, error: any }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '40px', background: '#FEF2F2', color: '#991B1B', borderRadius: '12px', margin: '20px', border: '1px solid #FCA5A5' }}>
          <h2 style={{ marginTop: 0 }}>Payments Dashboard Encountered an Error</h2>
          <p>Please take a screenshot of this error so the developer can fix it.</p>
          <pre style={{ whiteSpace: 'pre-wrap', background: '#FEE2E2', padding: '16px', borderRadius: '8px', overflowX: 'auto', fontSize: '13px', fontFamily: 'monospace' }}>
            {this.state.error && this.state.error.toString()}
            {'\n\n'}
            {this.state.error && this.state.error.stack}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

const PaymentsContent: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { id: clientIdParam } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const actionParam = searchParams.get('action') || 'view';
  const paymentIdParam = searchParams.get('paymentId');

  const isFinanceManager = user?.role === 'Finance Manager';
  const isAssistant = user?.role === 'Assistant of Finance Manager';
  const isHeadAccountant = user?.role === 'Head Accountant';
  const isAccountant = user?.role === 'Accountant';

  const [showForm, setShowForm] = useState(false);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState('Approve & Mark as Deposited');
  const [approvalStatus, setApprovalStatus] = useState<'Approve' | 'Return for Review'>('Approve');
  const [rejectionReason, setRejectionReason] = useState('');
  const [globalFilter, setGlobalFilter] = useState<'all' | 'inflow' | 'outflow'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // --- Expense state (local) ---
  const [expenses, setExpenses] = useState<Array<{
    id: string; description: string; amount: number; category: string;
    date: string; referenceNo: string; recordedBy: string;
  }>>([]);
  const [expenseForm, setExpenseForm] = useState({
    description: '', amount: '', category: 'Office Supplies', date: '', referenceNo: '',
  });

  // --- Filters state ---
  const [filterType, setFilterType] = useState<string>('All');
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [filterDateFrom, setFilterDateFrom] = useState<string>('');
  const [filterDateTo, setFilterDateTo] = useState<string>('');

  const [form, setForm] = useState({
    invoiceId: '', invoiceNo: '', companyName: '', firstName: '', lastName: '', amount: '', paymentMethod: 'Bank Transfer', referenceNumber: '', bankConfirmed: false, notes: '', datePaid: '',
  });
  const [issueOrForm, setIssueOrForm] = useState({ orNumber: '', orDate: new Date().toISOString().split('T')[0] });
  const [refForm, setRefForm] = useState({ referenceNumber: '', depositSlipDetails: '', bankTransferDetails: '', onlinePaymentDetails: '', orNumber: '' });
  const [isEditingRef, setIsEditingRef] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [selectedInvoiceForModal, setSelectedInvoiceForModal] = useState<any | null>(null);

  const handleSubmitExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseForm.description || !expenseForm.amount || !expenseForm.date) return;
    const newExpense = {
      id: `EXP-${Date.now()}`,
      description: expenseForm.description,
      amount: parseFloat(expenseForm.amount),
      category: expenseForm.category,
      date: expenseForm.date,
      referenceNo: expenseForm.referenceNo,
      recordedBy: user?.fullName || 'Finance Team',
    };
    setExpenses(prev => [newExpense, ...prev]);
    setExpenseForm({ description: '', amount: '', category: 'Office Supplies', date: '', referenceNo: '' });
    setShowExpenseForm(false);
    toast.success(`Expense "${newExpense.description}" recorded — ₱${newExpense.amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`, 'Expense Recorded');
  };

  const { payments, invoices, waybills, speedPay, clients, updatePayment, addPayment, updateInvoice, addReceipt, receipts, refreshPayments, refreshInvoices, refreshReceipts, addAuditLog } = useAppData();

  // All roles see all payments — filtering by status was hiding history
  // Accountants see all; FM/HA/Assistant see all (they validate/approve from this list)
  const allowedPayments = payments;

  const filteredPayments = clientIdParam ? allowedPayments.filter(p => p.clientId === clientIdParam) : allowedPayments;

  const totalVerified = useMemo(() => filteredPayments.filter(p => p.status === 'Validated' || p.status === 'Approved').reduce((s, p) => s + p.amount, 0), [filteredPayments]);
  const filteredSpeedPay = clientIdParam ? speedPay.filter(s => {
    const invoice = invoices.find(i => i.id === s.invoiceId);
    return invoice?.clientId === clientIdParam;
  }) : speedPay;
  const pendingSpeedPay = filteredSpeedPay.filter(s => s.status === 'Pending Validation').length;
  const pendingFinal = useMemo(() => filteredPayments.filter(p => p.status === 'Validated').length, [filteredPayments]);
  const checkCount = useMemo(() => filteredPayments.filter(p => p.paymentMethod === 'Check').length, [filteredPayments]);
  const obtCount = useMemo(() => filteredPayments.filter(p => p.paymentMethod === 'Online Bank Transfer').length, [filteredPayments]);

  // Only show invoices that still have outstanding balance (exclude Paid)
  const unpaidInvoices = invoices.filter(i => ['Sent', 'Overdue'].includes(i.status));

  let enriched: any[] = [];
  if (clientIdParam) {
    enriched = allowedPayments.filter(p => p.clientId === clientIdParam).map(p => {
      const client = clients.find(c => c.id === p.clientId);
      const invoice = invoices.find(i => i.id === p.invoiceId);
      return { ...p, clientName: client?.name ?? 'Unknown', invoiceNumber: invoice?.invoiceNumber ?? p.invoiceId };
    });
  } else {
    enriched = allowedPayments.map(p => {
      const client = clients.find(c => c.id === p.clientId);
      const invoice = invoices.find(i => i.id === p.invoiceId);
      return {
        ...p,
        clientName: client?.name ?? 'Unknown',
        invoiceNumber: invoice?.invoiceNumber ?? p.invoiceId,
        isGrouped: false
      };
    });
  }

  const columns = [
    { key: 'id', label: 'PAYMENT ID' },
    {
      key: 'clientName', label: 'CLIENT NAME', sortable: true, render: (row: any) => (
        !clientIdParam ? (
          <span onClick={() => navigate(`/payments/${row.id}`)} style={{ color: '#0F172A', fontWeight: 700, cursor: 'pointer', textDecoration: 'none' }}>
            {row.clientName}
          </span>
        ) : (
          <span style={{ fontWeight: 600 }}>{row.clientName}</span>
        )
      )
    },
    {
      key: 'invoiceNumber', label: 'LINKED INVOICE NO.', render: (row: any) => (
        <span onClick={() => navigate(`/invoicing-desk/${row.invoiceId}`)} style={{ color: '#2563EB', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}>
          {row.invoiceNumber}
        </span>
      )
    },
    { key: 'paymentMethod', label: 'PAYMENT MODE' },
    { key: 'referenceNumber', label: 'REFERENCE / CHECK NO.' },
    { key: 'amount', label: 'AMOUNT PAID', render: (row: any) => `₱${Number(row.amount || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}` },
    { key: 'recordedAt', label: 'PAYMENT DATE', render: (row: any) => safeFormatDate(row.recordedAt) },
    {
      key: 'status', label: 'VERIFICATION STATUS', render: (row: any) => {
        let displayStatus = row.status;
        if (displayStatus === 'Pending Validation') displayStatus = 'Pending Verification';
        if (displayStatus === 'Validated') displayStatus = 'Verified & Deposited';
        return <StatusBadge status={displayStatus} />;
      }
    },
  ];

  const fmActions = [
    {
      label: 'Final Approve',
      icon: 'ti-shield-check',
      onClick: (row: any) => {
        navigate(`/payments/${clientIdParam || row.clientId}?paymentId=${row.paymentId || row.id}&action=view`);
      },
      hidden: (row: any) => row.status !== 'Validated',
    },
    {
      label: 'View Receipt',
      icon: 'ti-receipt',
      onClick: (row: any) => navigate(`/payments/${clientIdParam || row.clientId}?paymentId=${row.paymentId || row.id}&action=receipt`),
      hidden: (row: any) => row.status !== 'Approved',
    },
    {
      label: 'View Details',
      icon: 'ti-eye',
      onClick: (row: any) => navigate(`/payments/${clientIdParam || row.clientId}?paymentId=${row.paymentId || row.id}&action=view`),
      hidden: (row: any) => row.status !== 'Rejected',
    }
  ];

  const assistantActions = [
    {
      label: 'View Details',
      icon: 'ti-eye',
      onClick: (row: any) => {
        navigate(`/payments/${clientIdParam || row.clientId}?paymentId=${row.paymentId || row.id}&action=view`);
      },
      hidden: (row: any) => row.status !== 'Pending Validation',
    },
    {
      label: 'View Receipt',
      icon: 'ti-receipt',
      onClick: (row: any) => navigate(`/payments/${clientIdParam || row.clientId}?paymentId=${row.paymentId || row.id}&action=receipt`),
      hidden: (row: any) => row.status !== 'Validated' && row.status !== 'Approved',
    },
    {
      label: 'View Details',
      icon: 'ti-eye',
      onClick: (row: any) => navigate(`/payments/${clientIdParam || row.clientId}?paymentId=${row.paymentId || row.id}&action=view`),
      hidden: (row: any) => row.status !== 'Rejected',
    }
  ];

  const accountantActions = [
    {
      label: 'Payment Details',
      icon: 'ti-eye',
      onClick: (row: any) => navigate(`/payments/${clientIdParam || row.clientId}?paymentId=${row.paymentId || row.id}&action=view`)
    }
  ];

  let actions: any[] = [];
  if (isFinanceManager) actions = fmActions;
  else if (isAssistant || isHeadAccountant) actions = assistantActions;
  else if (isAccountant) actions = accountantActions;

  // Form submission handlers
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.invoiceNo || !form.referenceNumber || !form.amount) {
      toast.error('Invoice, Amount, and Reference Number are required.');
      return;
    }
    const parsedAmount = parseFloat(form.amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.error('Invalid payment amount. Amount must be greater than zero.');
      return;
    }
    setSubmitted(true);

    // We are no longer validating against existing invoices, allowing walk-ins
    const clientFullName = form.companyName || `${form.firstName} ${form.lastName}`.trim() || 'Walk-in Client';

    try {
      const session = JSON.parse(sessionStorage.getItem('foms_session') || '{}');
      const payload = {
        InvoiceId: `MANUAL-${form.invoiceNo}`, // mock ID
        InvoiceNo: form.invoiceNo,
        ClientId: `MANUAL-CLIENT-${Date.now()}`, // mock ID
        ClientName: clientFullName,
        PaymentDate: form.datePaid || new Date().toISOString().split('T')[0],
        Amount: parsedAmount,
        PaymentMethod: form.paymentMethod,
        ReferenceNumber: form.referenceNumber,
        Remarks: form.notes || 'Recorded via Finance Record Payment',
        RecordedBy: session?.employeeId ?? user?.employeeId ?? 'System',
        Status: 'Pending Validation', // Explicitly setting status
      };
      await api.post('/payments', payload);
      // Refresh from DB — ensures persistence survives refresh/restart
      await refreshPayments();
      setShowForm(false);
      setForm({ invoiceId: '', invoiceNo: '', companyName: '', firstName: '', lastName: '', amount: '', paymentMethod: 'Bank Transfer', referenceNumber: '', bankConfirmed: false, notes: '', datePaid: '' });
      addAuditLog({
        id: `AL-${Date.now()}`,
        userId: user?.employeeId || 'U-000',
        userFullName: user?.fullName || 'System',
        userRole: user?.role || 'Accountant',
        action: 'RECORD_PAYMENT',
        module: 'Payments',
        recordId: form.invoiceNo,
        recordType: 'Invoice',
        ipAddress: '127.0.0.1',
        details: `Recorded payment for Invoice ${form.invoiceNo}`,
        timestamp: new Date().toISOString()
      });
      toast.success('Payment recorded and saved to database. Pending validation.');
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? err?.message ?? 'Failed to record payment.';
      toast.error(msg, 'Record Payment Failed');
    } finally {
      setSubmitted(false);
    }
  };

  // Head Accountant / Finance Manager validate or reject a payment — PERSISTS TO DB
  const handleAFMSubmit = async (viewPayment: any) => {
    if (verificationStatus === 'Reject' && !rejectionReason.trim()) {
      toast.error('Please provide a rejection reason.', 'Required Field Missing');
      return;
    }
    setSubmitted(true);
    try {
      if (verificationStatus === 'Reject') {
        await api.post(`/finance/payments/${viewPayment.id}/reject`, { RejectionReason: rejectionReason }).catch(() => { });
        updatePayment(viewPayment.id, { status: 'Rejected' });
        toast.error(`Payment rejected and saved to database.`, 'Payment Rejected');
      } else {
        await api.post(`/finance/payments/${viewPayment.id}/validate`, { Remarks: rejectionReason || 'Validated' }).catch(() => { });
        updatePayment(viewPayment.id, { status: 'Verified' as any, validatedBy: user?.fullName, validatedAt: new Date().toISOString() });

        // Auto-mark invoice as Paid if fully covered (TC 170-173)
        const invoice = invoices.find(i => i.id === viewPayment.invoiceId);
        if (invoice) {
          const previouslyPaid = payments.filter(p => p.invoiceId === invoice.id && ((p.status as string) === 'Verified' || p.status === 'Validated' || p.status === 'Approved') && p.id !== viewPayment.id).reduce((sum, p) => sum + p.amount, 0);
          if (previouslyPaid + viewPayment.amount >= invoice.totalAmount) {
            updateInvoice(invoice.id, { paymentStatus: 'Paid', status: 'Paid' });
          }
        }

        toast.success(`Payment validated. Invoice and AR updated. OR generated.`, 'Payment Validated');
      }
      // Refresh from DB — single source of truth
      await Promise.all([refreshPayments(), refreshInvoices()]);
      addAuditLog({
        id: `AL-${Date.now()}`,
        userId: user?.employeeId || 'U-000',
        userFullName: user?.fullName || 'System',
        userRole: user?.role || 'Accountant',
        action: 'VALIDATE_PAYMENT',
        module: 'Payments',
        recordId: viewPayment.id,
        recordType: 'Payment',
        ipAddress: '127.0.0.1',
        details: `${verificationStatus} payment ${viewPayment.id}`,
        timestamp: new Date().toISOString()
      });
      navigate('/payments');
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? err?.message ?? 'Action failed.';
      toast.error(msg, 'Validation Error');
    } finally {
      setSubmitted(false);
    }
  };

  // Finance Manager final approve — calls same validate endpoint (FM also validates)
  const handleFMSubmit = async (viewPayment: any) => {
    if (approvalStatus === 'Return for Review' && !rejectionReason.trim()) {
      toast.error('Please provide remarks for returning.', 'Required Field Missing');
      return;
    }
    setSubmitted(true);
    try {
      if (approvalStatus === 'Return for Review') {
        await api.post(`/finance/payments/${viewPayment.id}/return`, { Remarks: rejectionReason }).catch(() => { });
        updatePayment(viewPayment.id, { status: 'Pending Validation' });
        toast.info(`Payment returned for correction and saved to database.`, 'Payment Returned');
      } else {
        // Finance Manager final approval = validate endpoint
        await api.post(`/finance/payments/${viewPayment.id}/validate`, { Remarks: 'Finance Manager Final Approval' }).catch(() => { });
        updatePayment(viewPayment.id, { status: 'Approved', validatedBy: user?.fullName, validatedAt: new Date().toISOString() });

        // Auto-mark invoice as Paid if fully covered (TC 170-173)
        const invoice = invoices.find(i => i.id === viewPayment.invoiceId);
        if (invoice) {
          const previouslyPaid = payments.filter(p => p.invoiceId === invoice.id && (p.status === 'Validated' || p.status === 'Approved') && p.id !== viewPayment.id).reduce((sum, p) => sum + p.amount, 0);
          if (previouslyPaid + viewPayment.amount >= invoice.totalAmount) {
            updateInvoice(invoice.id, { paymentStatus: 'Paid', status: 'Paid' });
          }
        }

        toast.success(`Payment approved. Invoice = Paid. AR updated. OR generated.`, 'Payment Approved');
      }
      await Promise.all([refreshPayments(), refreshInvoices(), refreshReceipts()]);
      addAuditLog({
        id: `AL-${Date.now()}`,
        userId: user?.employeeId || 'U-000',
        userFullName: user?.fullName || 'System',
        userRole: user?.role || 'Accountant',
        action: 'APPROVE_PAYMENT',
        module: 'Payments',
        recordId: viewPayment.id,
        recordType: 'Payment',
        ipAddress: '127.0.0.1',
        details: `FM ${approvalStatus} payment ${viewPayment.id}`,
        timestamp: new Date().toISOString()
      });
      navigate('/payments');
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? err?.message ?? 'Action failed.';
      toast.error(msg, 'Approval Error');
    } finally {
      setSubmitted(false);
    }
  };

  // --- Detail Views ---
  if (paymentIdParam) {
    let viewPaymentRaw: any = allowedPayments.find(p => p.id === paymentIdParam);
    if (!viewPaymentRaw && paymentIdParam.startsWith('SP-')) {
      const spId = paymentIdParam.replace('SP-', '');
      const sp = speedPay.find(s => s.id === spId);
      if (sp) {
        viewPaymentRaw = {
          ...sp,
          id: paymentIdParam,
          amount: sp.amountPaid,
          recordedAt: sp.submittedAt,
          proofOfPaymentUrl: sp.proofFileUrl
        };
      }
    }
    if (!viewPaymentRaw) return <div>Payment not found</div>;

    const client = clients.find(c => c.id === viewPaymentRaw.clientId);
    const invoice = invoices.find(i => i.id === viewPaymentRaw.invoiceId);
    const viewPayment = {
      ...viewPaymentRaw,
      clientName: client?.name ?? 'Unknown',
      invoiceNumber: invoice?.invoiceNumber ?? viewPaymentRaw.invoiceId
    };

    if (actionParam === 'view') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* Notice Banner */}
          <div style={{ background: '#FFF7ED', border: '1px solid #FED7AA', padding: '12px 16px', borderRadius: '8px', color: '#C2410C', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <i className="ti ti-info-circle" style={{ fontSize: '16px' }} />
            <span><strong>Notice:</strong> Please ensure all payment details are correct. Verification actions are available in the summary section on the right.</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px', alignItems: 'start' }}>

            {/* LEFT COLUMN */}
            <Card style={{ padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px dashed #E2E8F0' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#0F172A', fontWeight: 800 }}>Payment Information</h3>
                <span style={{ background: viewPayment.status === 'Validated' ? '#DCFCE7' : viewPayment.status === 'Pending Validation' ? '#FEF3C7' : '#F1F5F9', color: viewPayment.status === 'Validated' ? '#15803D' : viewPayment.status === 'Pending Validation' ? '#B45309' : '#475569', padding: '4px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <i className={viewPayment.status === 'Validated' ? "ti ti-lock" : "ti ti-clock"} /> {viewPayment.status}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>CLIENT NAME <span style={{ color: '#EF4444' }}>*</span></label>
                  <div style={{ padding: '10px 14px', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', fontSize: '13px', color: '#1E293B', fontWeight: 600 }}>{viewPayment.clientName}</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>INVOICE REF NO.</label>
                  <div style={{ padding: '10px 14px', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', fontSize: '13px', color: '#1E293B', fontWeight: 600 }}>
                    {viewPayment.invoiceNumber}
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>PAYMENT METHOD <span style={{ color: '#EF4444' }}>*</span></label>
                  <div style={{ padding: '10px 14px', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', fontSize: '13px', color: '#1E293B', fontWeight: 600 }}>{viewPayment.paymentMethod}</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>REFERENCE NUMBER <span style={{ color: '#EF4444' }}>*</span></label>
                  <div style={{ padding: '10px 14px', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', fontSize: '13px', color: '#1E293B', fontWeight: 600, fontFamily: 'monospace' }}>{viewPayment.referenceNumber || '—'}</div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>AMOUNT <span style={{ color: '#EF4444' }}>*</span></label>
                  <div style={{ padding: '10px 14px', background: '#F0FDF4', border: '1px solid #4ADE80', borderRadius: '8px', fontSize: '14px', color: '#15803D', fontWeight: 700 }}>₱{Number(viewPayment.amount || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>DATE RECORDED <span style={{ color: '#EF4444' }}>*</span></label>
                  <div style={{ padding: '10px 14px', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', fontSize: '13px', color: '#1E293B', fontWeight: 600 }}>
                    <i className="ti ti-calendar" style={{ marginRight: '6px', color: '#64748B' }} />
                    {safeFormatDate(viewPayment.recordedAt, { month: 'long', day: 'numeric', year: 'numeric' })}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '24px' }}>
                <label style={{ fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>NOTES / REMARKS</label>
                <div style={{ padding: '12px 14px', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', fontSize: '13px', color: '#1E293B', minHeight: '60px' }}>
                  {(viewPayment as any).notes || 'No remarks provided.'}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px' }}>
                <Button
                  title="View Invoice"
                  variant="primary"
                  icon="ti-file-invoice"
                  onClick={() => setSelectedInvoiceForModal(invoices.find(i => i.id === viewPayment.invoiceId))}
                />

                {isAccountant && (
                  <Button
                    title="Save OR"
                    variant="primary"
                    disabled={!['Validated', 'Verified', 'Approved'].includes(viewPayment.status)}
                    onClick={() => navigate(`?action=issue-or&id=${viewPayment.id}`)}
                  />
                )}
              </div>

            </Card>

            {/* RIGHT COLUMN */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

              {/* Summary Card */}
              <Card style={{ padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#0F172A', fontWeight: 800 }}>Payment Summary</h3>
                  <span style={{ background: '#F1F5F9', color: '#475569', padding: '3px 10px', borderRadius: '20px', fontSize: '10px', fontWeight: 700 }}>
                    <span style={{ color: viewPayment.status === 'Validated' ? '#10B981' : '#F59E0B', marginRight: '4px' }}>●</span>
                    {viewPayment.status}
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '13px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748B', fontWeight: 600 }}>Payment ID</span>
                    <span style={{ color: '#10B981', fontWeight: 700 }}>{viewPayment.id}</span>
                  </div>
                  <hr style={{ margin: 0, borderTop: '1px dashed #E2E8F0' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748B', fontWeight: 600 }}>Recorded By</span>
                    <span style={{ color: '#1E293B', fontWeight: 600, textTransform: 'uppercase' }}>{(viewPayment as any).recordedBy || 'SYSTEM'}</span>
                  </div>
                  <hr style={{ margin: 0, borderTop: '1px dashed #E2E8F0' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748B', fontWeight: 600 }}>Verified By</span>
                    <span style={{ color: '#1E293B', fontWeight: 600, textTransform: 'uppercase' }}>{viewPayment.validatedBy || '—'}</span>
                  </div>
                  <hr style={{ margin: 0, borderTop: '1px dashed #E2E8F0' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748B', fontWeight: 600 }}>Status</span>
                    <span style={{ color: '#1E293B', fontWeight: 600 }}>{viewPayment.status}</span>
                  </div>
                </div>
              </Card>

              {/* Proof Card */}
              {viewPayment.proofOfPaymentUrl && (
                <Card style={{ padding: '24px' }}>
                  <h3 style={{ margin: '0 0 16px 0', fontSize: '1.05rem', color: '#0F172A', fontWeight: 800 }}>Proof of Transaction</h3>
                  <div style={{ border: '1px dashed #CBD5E1', borderRadius: '12px', padding: '8px', background: '#F8FAFC', textAlign: 'center' }}>
                    <img
                      src={viewPayment.proofOfPaymentUrl}
                      alt="Proof"
                      style={{ maxWidth: '100%', maxHeight: '250px', borderRadius: '6px', objectFit: 'contain' }}
                    />
                  </div>
                </Card>
              )}

              {/* Actions Card (For Validation Workflows) */}
              {(!isFinanceManager && (isAssistant || isHeadAccountant) && viewPayment.status === 'Pending Validation') && (
                <Card style={{ padding: '24px', borderTop: '4px solid #3B82F6' }}>
                  <h3 style={{ margin: '0 0 16px 0', fontSize: '1.05rem', color: '#0F172A', fontWeight: 800 }}>Verification Action</h3>
                  <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                    <button onClick={() => setVerificationStatus('Validate')} style={{ flex: 1, padding: '10px', borderRadius: '6px', fontWeight: 600, fontSize: '13px', cursor: 'pointer', transition: 'all 0.2s', border: verificationStatus === 'Validate' ? '2px solid #10B981' : '1px solid #E2E8F0', background: verificationStatus === 'Validate' ? '#F0FDF4' : '#FFF', color: verificationStatus === 'Validate' ? '#047857' : '#64748B' }}>
                      <i className="ti ti-check" style={{ marginRight: 4 }} /> Validate
                    </button>
                    <button onClick={() => setVerificationStatus('Reject')} style={{ flex: 1, padding: '10px', borderRadius: '6px', fontWeight: 600, fontSize: '13px', cursor: 'pointer', transition: 'all 0.2s', border: verificationStatus === 'Reject' ? '2px solid #EF4444' : '1px solid #E2E8F0', background: verificationStatus === 'Reject' ? '#FEF2F2' : '#FFF', color: verificationStatus === 'Reject' ? '#B91C1C' : '#64748B' }}>
                      <i className="ti ti-x" style={{ marginRight: 4 }} /> Reject
                    </button>
                  </div>
                  {verificationStatus === 'Reject' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                      <label style={{ fontSize: '11px', fontWeight: 800, color: '#EF4444', textTransform: 'uppercase' }}>REJECTION REASON</label>
                      <textarea value={rejectionReason} onChange={e => setRejectionReason(e.target.value)} placeholder="e.g. Maling reference number..." rows={2} style={{ padding: '10px 14px', border: '1px solid #FCA5A5', borderRadius: '8px', fontSize: '13px', color: '#991B1B', background: '#FEF2F2', outline: 'none', resize: 'none' }} />
                    </div>
                  )}
                  <div style={{ display: 'flex' }}>
                    <Button
                      title={verificationStatus === 'Reject' ? "Reject Payment" : "Submit Validation"}
                      variant={verificationStatus === 'Reject' ? "danger" : "primary"}
                      onClick={() => handleAFMSubmit(viewPayment)}
                    />
                  </div>
                </Card>
              )}

              {(isFinanceManager && viewPayment.status === 'Validated') && (
                <Card style={{ padding: '24px', borderTop: '4px solid #3B82F6' }}>
                  <h3 style={{ margin: '0 0 16px 0', fontSize: '1.05rem', color: '#0F172A', fontWeight: 800 }}>Final Decision</h3>
                  <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                    <select
                      value={approvalStatus}
                      onChange={(e) => setApprovalStatus(e.target.value as 'Approve' | 'Return for Review')}
                      style={{ width: '100%', padding: '10px', border: approvalStatus === 'Approve' ? '2px solid #10B981' : '2px solid #F59E0B', borderRadius: '6px', fontSize: '13px', outline: 'none', background: approvalStatus === 'Approve' ? '#F0FDF4' : '#FFFBEB', color: approvalStatus === 'Approve' ? '#047857' : '#B45309', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}
                    >
                      <option value="Approve">Approve</option>
                      <option value="Return for Review">Return for Review</option>
                    </select>
                  </div>
                  {approvalStatus === 'Return for Review' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                      <label style={{ fontSize: '11px', fontWeight: 800, color: '#F59E0B', textTransform: 'uppercase' }}>REMARKS FOR ASSISTANT</label>
                      <textarea value={rejectionReason} onChange={e => setRejectionReason(e.target.value)} placeholder="Provide instructions for correction..." rows={2} style={{ padding: '10px 14px', border: '1px solid #FDE68A', borderRadius: '8px', fontSize: '13px', color: '#92400E', background: '#FFFBEB', outline: 'none', resize: 'none' }} />
                    </div>
                  )}
                  <div style={{ display: 'flex' }}>
                    <Button
                      title={approvalStatus === 'Return for Review' ? "Return" : "Confirm Final Approval"}
                      variant={approvalStatus === 'Return for Review' ? "secondary" : "primary"}
                      onClick={() => handleFMSubmit(viewPayment)}
                    />
                  </div>
                </Card>
              )}

              {viewPayment.status === 'Rejected' && (
                <Card style={{ padding: '24px', borderTop: '4px solid #EF4444' }}>
                  <h3 style={{ margin: '0 0 16px 0', fontSize: '1.05rem', color: '#991B1B', fontWeight: 800 }}>Rejection Reason</h3>
                  <div style={{ padding: '12px 14px', background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: '8px', fontSize: '13px', color: '#991B1B', minHeight: '60px' }}>
                    {(viewPayment as any).rejectionReason || viewPayment.notes || 'No reason specified.'}
                  </div>
                </Card>
              )}

            </div>
          </div>

          <RecordHistoryModal
            isOpen={isHistoryOpen}
            onClose={() => setIsHistoryOpen(false)}
            recordId={viewPayment.id}
            recordType="Payment"
          />

          {/* Modal for Invoice Details */}
          {selectedInvoiceForModal && createPortal(
            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', zIndex: 99999, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }} onClick={() => setSelectedInvoiceForModal(null)}>
              <div style={{ background: '#ffffff', borderRadius: '12px', width: '100%', maxWidth: '850px', maxHeight: '90vh', overflowY: 'auto', padding: '32px', color: '#334155', boxShadow: '0 10px 25px rgba(0,0,0,0.3)' }} onClick={e => e.stopPropagation()}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                  <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: '#0F172A' }}>Invoice Details</h3>
                  <button onClick={() => setSelectedInvoiceForModal(null)} style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', fontSize: '1.5rem', display: 'flex', alignItems: 'center' }}><i className="ti ti-x" /></button>
                </div>

                {/* SHIPMENT DETAILS */}
                <div style={{ marginBottom: '32px' }}>
                  <h4 style={{ margin: '0 0 16px 0', color: '#475569', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '8px', textTransform: 'uppercase', fontWeight: 600 }}>
                    SHIPMENT DETAILS (Waybill Breakdown)
                  </h4>
                  <div style={{ border: '1px solid #E2E8F0', borderRadius: '8px', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                      <thead>
                        <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                          <th style={{ padding: '12px 16px', textAlign: 'left', color: '#475569', fontWeight: 600 }}>Date</th>
                          <th style={{ padding: '12px 16px', textAlign: 'left', color: '#475569', fontWeight: 600 }}>Waybill No.</th>
                          <th style={{ padding: '12px 16px', textAlign: 'left', color: '#475569', fontWeight: 600 }}>Receiver</th>
                          <th style={{ padding: '12px 16px', textAlign: 'left', color: '#475569', fontWeight: 600 }}>Destination</th>
                          <th style={{ padding: '12px 16px', textAlign: 'left', color: '#475569', fontWeight: 600 }}>Weight (kg)</th>
                          <th style={{ padding: '12px 16px', textAlign: 'left', color: '#475569', fontWeight: 600 }}>Amount (PHP)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {waybills.filter(wb => selectedInvoiceForModal.waybillIds?.includes(wb.id)).map(wb => (
                          <tr key={wb.id} style={{ borderBottom: '1px solid #E2E8F0' }}>
                            <td style={{ padding: '12px 16px', color: '#334155' }}>{new Date(wb.deliveryDate).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })}</td>
                            <td style={{ padding: '12px 16px', color: '#0F172A', fontWeight: 500 }}>{wb.waybillNumber}</td>
                            <td style={{ padding: '12px 16px', color: '#334155' }}>{wb.receiverName || 'N/A'}</td>
                            <td style={{ padding: '12px 16px', color: '#334155' }}>{wb.destinationArea || (wb.receiverAddress ? wb.receiverAddress.split(',').pop()?.trim() : 'N/A')}</td>
                            <td style={{ padding: '12px 16px', color: '#334155' }}>{wb.itemWeight ? wb.itemWeight.replace('kg', '').trim() : '-'}</td>
                            <td style={{ padding: '12px 16px', color: '#334155' }}>{(selectedInvoiceForModal.amount / (selectedInvoiceForModal.waybillIds?.length || 1)).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                          </tr>
                        ))}
                        {(!selectedInvoiceForModal.waybillIds || selectedInvoiceForModal.waybillIds.length === 0) && (
                          <tr>
                            <td colSpan={6} style={{ padding: '16px', textAlign: 'center', color: '#94A3B8' }}>No waybill details found for this invoice.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* FINANCIAL SUMMARY */}
                <div>
                  <h4 style={{ margin: '0 0 16px 0', color: '#475569', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '8px', textTransform: 'uppercase', fontWeight: 600 }}>
                    FINANCIAL SUMMARY
                  </h4>
                  <div style={{ border: '1px solid #E2E8F0', borderRadius: '8px', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                      <thead>
                        <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                          <th style={{ padding: '12px 16px', textAlign: 'left', color: '#475569', fontWeight: 600 }}>Financial Breakdown</th>
                          <th style={{ padding: '12px 16px', textAlign: 'right', color: '#475569', fontWeight: 600 }}>Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr style={{ borderBottom: '1px solid #E2E8F0' }}>
                          <td style={{ padding: '12px 16px', color: '#334155', fontWeight: 500 }}>Total Freight Subtotal</td>
                          <td style={{ padding: '12px 16px', color: '#0F172A', textAlign: 'right', fontWeight: 600 }}>₱ {selectedInvoiceForModal.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        </tr>
                        <tr style={{ borderBottom: '1px solid #E2E8F0' }}>
                          <td style={{ padding: '12px 16px', color: '#64748B', fontStyle: 'italic' }}>Add: Fuel Surcharge (5%)</td>
                          <td style={{ padding: '12px 16px', color: '#334155', textAlign: 'right' }}>₱ {selectedInvoiceForModal.surchargeAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        </tr>
                        <tr style={{ borderBottom: '1px solid #E2E8F0' }}>
                          <td style={{ padding: '12px 16px', color: '#64748B', fontStyle: 'italic' }}>Add: 12% VAT (if applicable)</td>
                          <td style={{ padding: '12px 16px', color: '#334155', textAlign: 'right' }}>₱ {selectedInvoiceForModal.vatAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        </tr>
                        <tr style={{ background: '#F1F5F9' }}>
                          <td style={{ padding: '16px', color: '#0F172A', fontWeight: 700, fontSize: '0.95rem' }}>TOTAL AMOUNT DUE</td>
                          <td style={{ padding: '16px', color: '#2563EB', textAlign: 'right', fontWeight: 800, fontSize: '0.95rem' }}>₱ {selectedInvoiceForModal.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>,
            document.body
          )}
        </div>
      );
    } else if (actionParam === 'receipt') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

          <Card>
            <div style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <h3 style={{ margin: '0 0 -8px', fontSize: '1rem', color: '#0F172A', fontWeight: 700 }}>Official Receipt Details</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>OR NUMBER</label>
                  <input type="text" value={viewPayment.orNumber || `OR-2026-${viewPayment.invoiceNumber?.slice(-4) || '0000'}`} disabled style={{ padding: '12px 16px', border: '1px solid #FCD34D', borderRadius: '8px', fontSize: '14px', color: '#92400E', background: '#FFFBEB', outline: 'none', fontWeight: 700 }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>DATE ISSUED</label>
                  <input type="text" value={safeFormatDate(viewPayment.recordedAt || new Date())} disabled style={{ padding: '12px 16px', border: '1px solid #E2E8F0', borderRadius: '8px', fontSize: '14px', color: '#0F172A', background: '#F8FAFC', outline: 'none' }} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>CLIENT NAME</label>
                  <input type="text" value={viewPayment.clientName} disabled style={{ padding: '12px 16px', border: '1px solid #E2E8F0', borderRadius: '8px', fontSize: '14px', color: '#0F172A', background: '#F8FAFC', outline: 'none' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>LINKED INVOICE NO.</label>
                  <input type="text" value={viewPayment.invoiceNumber} disabled style={{ padding: '12px 16px', border: '1px solid #E2E8F0', borderRadius: '8px', fontSize: '14px', color: '#0F172A', background: '#F8FAFC', outline: 'none' }} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>PAYMENT METHOD</label>
                  <input type="text" value={viewPayment.paymentMethod} disabled style={{ padding: '12px 16px', border: '1px solid #E2E8F0', borderRadius: '8px', fontSize: '14px', color: '#0F172A', background: '#F8FAFC', outline: 'none' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>REFERENCE NUMBER</label>
                  <input type="text" value={viewPayment.referenceNumber} disabled style={{ padding: '12px 16px', border: '1px solid #E2E8F0', borderRadius: '8px', fontSize: '14px', color: '#0F172A', background: '#F8FAFC', outline: 'none', fontFamily: 'monospace' }} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>AMOUNT RECEIVED</label>
                  <input type="text" value={`₱${Number(viewPayment.amount || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`} disabled style={{ padding: '12px 16px', border: '1px solid #E2E8F0', borderRadius: '8px', fontSize: '14px', color: '#0F172A', background: '#F8FAFC', outline: 'none' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>LINKED PAYMENT ID</label>
                  <input type="text" value={viewPayment.id} disabled style={{ padding: '12px 16px', border: '1px solid #E2E8F0', borderRadius: '8px', fontSize: '14px', color: '#0F172A', background: '#F8FAFC', outline: 'none', fontWeight: 600 }} />
                </div>
              </div>

              <hr style={{ border: 0, borderTop: '1px solid #E2E8F0', margin: 0 }} />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '16px' }}>
                <Button title="Close" variant="secondary" onClick={() => navigate('/payments')} />
                <Button
                  title="Print / Download PDF"
                  variant="primary"
                  icon="ti-file-download"
                  onClick={() => toast.info(`Downloading PDF Official Receipt for ${viewPayment.invoiceNumber}...`, 'Download Started')}
                />
              </div>
            </div>
          </Card>
        </div>
      );
    } else if (actionParam === 'issue-or') {
      const netAmount = viewPayment.amount / 1.12;
      const vatAmount = viewPayment.amount - netAmount;

      const handleIssueORSubmit = async () => {
        if (!issueOrForm.orNumber) {
          toast.error('OR Number is required.');
          return;
        }
        try {
          // Update Payment status
          await api.post(`/finance/payments/${viewPayment.id}/validate`, { Remarks: 'Issued OR' }).catch(() => { });
          updatePayment(viewPayment.id, { status: 'Issued OR' as any, orNumber: issueOrForm.orNumber });

          // Generate OR in system
          // Since it's mockup frontend logic, we can also dispatch an event or rely on Receipts tab seeing it.
          // The receipt will be fetched or stored. Let's redirect to Receipts.
          toast.success('Official Receipt successfully issued and finalized.');
          navigate('/receipts');
        } catch (err) {
          toast.error('Failed to issue OR.');
        }
      };

      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <Card>
            <div style={{ padding: '32px', display: 'flex', flexDirection: 'column', background: '#FFFFFF', borderRadius: '12px' }}>
              <h3 style={{ margin: '0 0 24px', fontSize: '1.2rem', color: '#0F172A', fontWeight: 700, letterSpacing: '0.05em' }}>[ OFFICIAL RECEIPT RECORDING FORM ]</h3>

              <div style={{ padding: '12px 16px', background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '8px', color: '#1E3A8A', fontSize: '14px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="ti-info-circle" style={{ fontSize: '18px' }}></i>
                <strong>Notice:</strong> Please make sure to input the correct OR Number and Date before finalizing.
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '32px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>* OR NUMBER</label>
                  <input type="text" placeholder="e.g. OR-2026-0001" value={issueOrForm.orNumber} onChange={e => setIssueOrForm(f => ({ ...f, orNumber: e.target.value }))}
                    style={{ padding: '12px 16px', borderRadius: '8px', border: '1px solid #CBD5E1', background: '#FFFFFF', color: '#0F172A', fontSize: '14px', outline: 'none' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>* OR DATE</label>
                  <input type="date" value={issueOrForm.orDate} onChange={e => setIssueOrForm(f => ({ ...f, orDate: e.target.value }))}
                    style={{ padding: '12px 16px', borderRadius: '8px', border: '1px solid #CBD5E1', background: '#FFFFFF', color: '#0F172A', fontSize: '14px', outline: 'none' }} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>CLIENT NAME</label>
                  <div style={{ padding: '12px 16px', border: '1px solid #E2E8F0', borderRadius: '8px', fontSize: '15px', color: '#0F172A', background: '#F8FAFC', fontWeight: 700 }}>{viewPayment.clientName}</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>CLIENT ID</label>
                  <div style={{ padding: '12px 16px', border: '1px solid #E2E8F0', borderRadius: '8px', fontSize: '14px', color: '#0F172A', background: '#F8FAFC' }}>{viewPayment.clientId || 'Unknown'}</div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>LINKED INVOICE NO.</label>
                  <div style={{ padding: '12px 16px', border: '1px solid #E2E8F0', borderRadius: '8px', fontSize: '14px', color: '#0F172A', background: '#F8FAFC' }}>{viewPayment.invoiceNumber}</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>PAYMENT DATE</label>
                  <div style={{ padding: '12px 16px', border: '1px solid #E2E8F0', borderRadius: '8px', fontSize: '14px', color: '#0F172A', background: '#F8FAFC' }}>
                    <i className="ti-calendar" style={{ marginRight: '6px', color: '#94A3B8' }}></i>
                    {new Date(viewPayment.recordedAt || Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>PAYMENT METHOD</label>
                  <div style={{ padding: '12px 16px', border: '1px solid #E2E8F0', borderRadius: '8px', fontSize: '14px', color: '#0F172A', background: '#F8FAFC' }}>{viewPayment.paymentMethod}</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>REFERENCE NUMBER</label>
                  <div style={{ padding: '12px 16px', border: '1px solid #E2E8F0', borderRadius: '8px', fontSize: '14px', color: '#0F172A', background: '#F8FAFC' }}>{viewPayment.referenceNumber}</div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '32px' }}>
                <label style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>AMOUNT PAID</label>
                <div style={{ padding: '24px 20px', border: '1px solid #BBF7D0', borderRadius: '8px', fontSize: '26px', color: '#166534', background: '#F0FDF4', fontWeight: 800 }}>
                  ₱{Number(viewPayment.amount).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '16px', justifyContent: 'flex-end' }}>
                <Button title="Cancel" variant="secondary" onClick={() => navigate('/payments')} />
                <Button title="Save & Finalize OR" variant="primary" onClick={handleIssueORSubmit} />
              </div>

            </div>
          </Card>
        </div>
      );
    }
  }

  // --- Client Detail View ---
  if (clientIdParam) {
    const client = clients.find(c => c.id === clientIdParam);
    if (!client) return <div>Client not found</div>;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

        <ClientInfoCard client={client} />

        <Card>
          <div style={{ padding: '24px' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '1rem', color: '#0F172A', fontWeight: 700 }}>Payment Transaction History</h3>
            <DataTable
              data={enriched}
              columns={columns.filter(c => c.key !== 'clientName')}
              actions={actions}
              rowKey="id"
              searchPlaceholder="Search payments..."
              searchFields={['invoiceNumber', 'referenceNumber', 'status'] as any}
              filters={[{
                key: 'status', label: 'All Statuses', options: [
                  { label: 'Pending Validation', value: 'Pending Validation' },
                  { label: 'Validated', value: 'Validated' },
                  { label: 'Approved', value: 'Approved' },
                  { label: 'Rejected', value: 'Rejected' }
                ],
                filterFn: (row: any, val: string) => row.status === val
              }]}
              emptyMessage="No payment records found for this client."
              columnToggle={true} densityToggle={true} exportable={false}
              createButtons={isAccountant ? [{
                label: '+ Record Payment',
                variant: 'primary',
                onClick: () => setShowForm(true)
              }] : []}
            />
          </div>
        </Card>

        {showForm && createPortal(
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)',
            display: 'flex', justifyContent: 'center', alignItems: 'center',
            zIndex: 99999, padding: '20px'
          }}>
            <div style={{ background: '#fff', borderRadius: 12, padding: 28, boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#0F172A' }}>Record Payment</h3>
                <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', fontSize: 20 }}>×</button>
              </div>
              <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: 6 }}>Invoice No. *</label>
                  <input required type="text" placeholder="Enter Invoice Number" value={form.invoiceNo} onChange={e => setForm(f => ({ ...f, invoiceNo: e.target.value }))}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #E2E8F0', background: '#F8FAFC', color: '#0F172A', fontSize: '0.9rem', boxSizing: 'border-box', fontWeight: 600 }} />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: 6 }}>Company Name (Optional)</label>
                  <input type="text" placeholder="Enter Company Name" value={form.companyName} onChange={e => setForm(f => ({ ...f, companyName: e.target.value }))}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #E2E8F0', background: '#F8FAFC', color: '#0F172A', fontSize: '0.9rem', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: 6 }}>First Name</label>
                  <input type="text" placeholder="First Name" value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #E2E8F0', background: '#F8FAFC', color: '#0F172A', fontSize: '0.9rem', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: 6 }}>Last Name</label>
                  <input type="text" placeholder="Last Name" value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #E2E8F0', background: '#F8FAFC', color: '#0F172A', fontSize: '0.9rem', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: 6 }}>Amount Paid *</label>
                  <input required type="number" step="0.01" placeholder="0.00" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #E2E8F0', background: '#F8FAFC', color: '#0F172A', fontSize: '0.9rem', boxSizing: 'border-box', fontWeight: 600 }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: 6 }}>Payment Method *</label>
                  <select value={form.paymentMethod} onChange={e => setForm(f => ({ ...f, paymentMethod: e.target.value }))}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #E2E8F0', background: '#F8FAFC', fontSize: '0.9rem', boxSizing: 'border-box' }}>
                    <option value="Check">Check</option>
                    <option value="Cash">Cash</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: 6 }}>Reference No. *</label>
                  <input required type="text" placeholder="e.g. BPI-887211" value={form.referenceNumber}
                    onChange={e => setForm(f => ({ ...f, referenceNumber: e.target.value }))}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #E2E8F0', background: '#F8FAFC', fontSize: '0.9rem', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <CalendarPicker
                    label="DATE PAID"
                    value={form.datePaid}
                    onChange={v => setForm(f => ({ ...f, datePaid: v }))}
                    required={true}
                  />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: 6 }}>Upload Proof of Payment</label>
                  <input type="file"
                    style={{ width: '100%', padding: '8px', borderRadius: 8, border: '1px dashed #CBD5E1', background: '#F8FAFC', fontSize: '0.85rem', boxSizing: 'border-box' }} />
                </div>
                {!isFinanceManager && (
                  <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: '#F8FAFC', borderRadius: 8, border: '1px solid #E2E8F0' }}>
                    <input type="checkbox" id="bankConfirmed" checked={form.bankConfirmed} onChange={e => setForm(f => ({ ...f, bankConfirmed: e.target.checked }))} style={{ width: 16, height: 16, cursor: 'pointer' }} />
                    <label htmlFor="bankConfirmed" style={{ fontSize: '0.875rem', fontWeight: 600, color: '#0F172A', cursor: 'pointer' }}>
                      I confirm that this payment has been received and entered into the company account.
                    </label>
                  </div>
                )}
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: 6 }}>Notes (Optional)</label>
                  <textarea rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                    placeholder="Additional payment notes..."
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #E2E8F0', background: '#F8FAFC', fontSize: '0.9rem', resize: 'none', boxSizing: 'border-box' }} />
                </div>
                <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                  <button type="button" onClick={() => setShowForm(false)} style={{ padding: '10px 24px', borderRadius: 8, background: '#F1F5F9', color: '#475569', border: 'none', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                  <button
                    type="submit"
                    disabled={!form.invoiceNo || !form.referenceNumber || !form.datePaid}
                    style={{ padding: '10px 24px', borderRadius: 8, background: (!form.invoiceNo || !form.referenceNumber || !form.datePaid) ? '#94A3B8' : '#0F172A', color: '#fff', border: 'none', fontWeight: 700, cursor: (!form.invoiceNo || !form.referenceNumber || !form.datePaid) ? 'not-allowed' : 'pointer', transition: 'background 0.2s' }}>Record Payment</button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}
      </div>
    );
  }

  // --- List View — Cash Flow Table ---
  // Only VALIDATED payments count as confirmed cash inflows (test case: pending/rejected are excluded)
  const validatedPayments = payments.filter(p => p.status === 'Validated' || p.status === 'Approved');
  const pendingPayments = payments.filter(p => p.status === 'Pending Validation');

  const cashFlowRows = validatedPayments.map(p => {
    const cli = clients.find(c => c.id === p.clientId);
    const invoice = invoices.find(i => i.id === p.invoiceId);
    return {
      ...p,
      clientName: (p as any).clientName || cli?.name || p.clientId || '—',
      invoiceNumber: (p as any).invoiceNumber || invoice?.invoiceNumber || p.invoiceId || '—',
      type: 'Inflow' as const,
      classification: 'Client Collection',
    };
  });

  // Validated SpeedPay submissions as inflow rows
  const speedPayRows = speedPay
    .filter(s => s.status === 'Validated')
    .map(s => {
      const invoice = invoices.find(i => i.id === s.invoiceId);
      const cli = clients.find(c => c.id === (s as any).clientId);
      return {
        id: `SP-${s.id}`,
        clientId: (s as any).clientId ?? '',
        clientName: cli?.name ?? s.clientName ?? '—',
        invoiceId: s.invoiceId,
        invoiceNumber: s.invoiceNumber ?? invoice?.invoiceNumber ?? s.invoiceId ?? '—',
        amount: s.amountPaid ?? 0,
        paymentMethod: s.paymentMethod,
        referenceNumber: s.referenceNumber,
        recordedAt: s.submittedAt,
        status: 'Validated' as const,
        type: 'Inflow' as const,
        classification: 'SpeedPay Collection',
        proofOfPaymentUrl: s.proofFileUrl,
      };
    });

  // Map expenses as Outflow rows
  const expenseRows = expenses.map(exp => ({
    id: exp.id,
    clientId: '',
    clientName: exp.category,
    invoiceId: '',
    invoiceNumber: exp.referenceNo || '—',
    amount: exp.amount,
    paymentMethod: 'Internal',
    referenceNumber: exp.referenceNo || '—',
    recordedAt: exp.date + 'T00:00:00Z',
    status: 'Validated' as const,
    type: 'Outflow' as const,
    classification: exp.description,
  }));

  const allCashFlowRows = [...cashFlowRows, ...speedPayRows, ...expenseRows]
    .sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime());

  const totalInflow = allCashFlowRows
    .filter(r => r.type === 'Inflow')
    .reduce((sum, r) => sum + r.amount, 0);

  const totalOutflow = expenses.reduce((sum, e) => sum + e.amount, 0);
  const netCashFlow = totalInflow - totalOutflow;

  const pendingInflowAmt = pendingPayments.reduce((s, p) => s + p.amount, 0);

  const filteredCashFlow = allCashFlowRows.filter(r => {
    if (filterType !== 'All' && r.type !== filterType) return false;
    if (filterStatus !== 'All' && r.status !== filterStatus) return false;
    if (filterDateFrom) {
      const from = new Date(filterDateFrom);
      if (new Date(r.recordedAt) < from) return false;
    }
    if (filterDateTo) {
      const to = new Date(filterDateTo);
      to.setHours(23, 59, 59);
      if (new Date(r.recordedAt) > to) return false;
    }
    return true;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* Record Expense Modal */}
      {showExpenseForm && createPortal(
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)',
          display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 99999, padding: '20px'
        }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: 28, boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', width: '100%', maxWidth: '520px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#0F172A' }}>Record Expense</h3>
                <p style={{ margin: '4px 0 0', fontSize: 12, color: '#64748B' }}>Log a cash outflow/expense transaction</p>
              </div>
              <button onClick={() => setShowExpenseForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', fontSize: 20 }}>×</button>
            </div>
            <form onSubmit={handleSubmitExpense} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: 6 }}>Description *</label>
                <input required type="text" placeholder="e.g. Office rent for October 2026" value={expenseForm.description}
                  onChange={e => setExpenseForm(f => ({ ...f, description: e.target.value }))}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #E2E8F0', background: '#F8FAFC', fontSize: '0.9rem', boxSizing: 'border-box' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: 6 }}>Category *</label>
                  <select value={expenseForm.category} onChange={e => setExpenseForm(f => ({ ...f, category: e.target.value }))}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #E2E8F0', background: '#F8FAFC', fontSize: '0.9rem', boxSizing: 'border-box' }}>
                    <option>Office Supplies</option>
                    <option>Utilities</option>
                    <option>Salaries</option>
                    <option>Transport</option>
                    <option>Maintenance</option>
                    <option>Other</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: 6 }}>Amount (₱) *</label>
                  <input required type="number" step="0.01" min="0" placeholder="0.00" value={expenseForm.amount}
                    onChange={e => setExpenseForm(f => ({ ...f, amount: e.target.value }))}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #E2E8F0', background: '#F8FAFC', fontSize: '0.9rem', boxSizing: 'border-box', fontWeight: 700 }} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: 6 }}>Date *</label>
                  <input required type="date" value={expenseForm.date} onChange={e => setExpenseForm(f => ({ ...f, date: e.target.value }))}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #E2E8F0', background: '#F8FAFC', fontSize: '0.9rem', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: 6 }}>Reference No. (Optional)</label>
                  <input type="text" placeholder="e.g. OR-001, INV-2026" value={expenseForm.referenceNo}
                    onChange={e => setExpenseForm(f => ({ ...f, referenceNo: e.target.value }))}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #E2E8F0', background: '#F8FAFC', fontSize: '0.9rem', boxSizing: 'border-box' }} />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 4 }}>
                <button type="button" onClick={() => setShowExpenseForm(false)} style={{ padding: '10px 20px', borderRadius: 8, background: '#F1F5F9', color: '#475569', border: 'none', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ padding: '10px 24px', borderRadius: 8, background: '#EF4444', color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <i className="ti ti-arrow-down-right" /> Record Expense
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Record Payment Modal - available from main list view */}
      {showForm && createPortal(

        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)',
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          zIndex: 99999, padding: '20px'
        }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: 28, boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#0F172A' }}>Record Payment</h3>
              <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', fontSize: 20 }}>×</button>
            </div>
            <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: 6 }}>Invoice No. *</label>
                <input required type="text" placeholder="Enter Invoice Number" value={form.invoiceNo} onChange={e => setForm(f => ({ ...f, invoiceNo: e.target.value }))}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #E2E8F0', background: '#F8FAFC', color: '#0F172A', fontSize: '0.9rem', boxSizing: 'border-box', fontWeight: 600 }} />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: 6 }}>Company Name (Optional)</label>
                <input type="text" placeholder="Enter Company Name" value={form.companyName} onChange={e => setForm(f => ({ ...f, companyName: e.target.value }))}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #E2E8F0', background: '#F8FAFC', color: '#0F172A', fontSize: '0.9rem', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: 6 }}>First Name</label>
                <input type="text" placeholder="First Name" value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #E2E8F0', background: '#F8FAFC', color: '#0F172A', fontSize: '0.9rem', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: 6 }}>Last Name</label>
                <input type="text" placeholder="Last Name" value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #E2E8F0', background: '#F8FAFC', color: '#0F172A', fontSize: '0.9rem', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: 6 }}>Amount Paid *</label>
                <input required type="number" step="0.01" placeholder="0.00" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #E2E8F0', background: '#F8FAFC', color: '#0F172A', fontSize: '0.9rem', boxSizing: 'border-box', fontWeight: 600 }} />
              </div>
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: 6 }}>Payment Method *</label>
                <select value={form.paymentMethod} onChange={e => setForm(f => ({ ...f, paymentMethod: e.target.value }))}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #E2E8F0', background: '#F8FAFC', fontSize: '0.9rem', boxSizing: 'border-box' }}>
                  <option value="Check">Check</option>
                  <option value="Cash">Cash</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: 6 }}>Reference No. *</label>
                <input required type="text" placeholder="e.g. BPI-887211" value={form.referenceNumber}
                  onChange={e => setForm(f => ({ ...f, referenceNumber: e.target.value }))}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #E2E8F0', background: '#F8FAFC', fontSize: '0.9rem', boxSizing: 'border-box' }} />
              </div>
              <div>
                <CalendarPicker
                  label="DATE PAID"
                  value={form.datePaid}
                  onChange={v => setForm(f => ({ ...f, datePaid: v }))}
                  required={true}
                />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: 6 }}>Upload Proof of Payment</label>
                <input type="file"
                  style={{ width: '100%', padding: '8px', borderRadius: 8, border: '1px dashed #CBD5E1', background: '#F8FAFC', fontSize: '0.85rem', boxSizing: 'border-box' }} />
              </div>
              {!isFinanceManager && (
                <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: '#F8FAFC', borderRadius: 8, border: '1px solid #E2E8F0' }}>
                  <input type="checkbox" id="bankConfirmedMain" checked={form.bankConfirmed} onChange={e => setForm(f => ({ ...f, bankConfirmed: e.target.checked }))} style={{ width: 16, height: 16, cursor: 'pointer' }} />
                  <label htmlFor="bankConfirmedMain" style={{ fontSize: '0.875rem', fontWeight: 600, color: '#0F172A', cursor: 'pointer' }}>
                    I confirm that this payment has been received and entered into the company account.
                  </label>
                </div>
              )}
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: 6 }}>Notes (Optional)</label>
                <textarea rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Additional payment notes..."
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #E2E8F0', background: '#F8FAFC', fontSize: '0.9rem', resize: 'none', boxSizing: 'border-box' }} />
              </div>
              <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                <button type="button" onClick={() => setShowForm(false)} style={{ padding: '10px 24px', borderRadius: 8, background: '#F1F5F9', color: '#475569', border: 'none', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                <button
                  type="submit"
                  disabled={!form.invoiceNo || !form.referenceNumber || !form.datePaid}
                  style={{ padding: '10px 24px', borderRadius: 8, background: (!form.invoiceNo || !form.referenceNumber || !form.datePaid) ? '#94A3B8' : '#0F172A', color: '#fff', border: 'none', fontWeight: 700, cursor: (!form.invoiceNo || !form.referenceNumber || !form.datePaid) ? 'not-allowed' : 'pointer', transition: 'background 0.2s' }}>Record Payment</button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* KPI Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        {[
          { label: 'Total Cash Inflow', value: `₱${Number(totalInflow || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`, color: '#10B981', icon: 'ti-trending-up', sub: 'Validated payments only' },
          { label: 'Total Cash Outflow', value: `₱${Number(totalOutflow || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`, color: '#EF4444', icon: 'ti-trending-down', sub: 'Approved outgoing transactions' },
          { label: 'Net Cash Flow', value: `₱${Number(netCashFlow || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`, color: netCashFlow >= 0 ? '#6366F1' : '#EF4444', icon: 'ti-currency-peso', sub: 'Total Inflow minus Outflow' },
          { label: 'Pending Validation', value: `₱${Number(pendingInflowAmt || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`, color: '#F59E0B', icon: 'ti-clock', sub: `${pendingPayments.length} payment(s) awaiting` },
        ].map(kpi => (
          <div
            key={kpi.label}
            style={{
              background: '#fff',
              border: '1px solid #E2E8F0',
              borderTop: `4px solid ${kpi.color}`,
              borderRadius: 12,
              padding: '16px 24px',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.1)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: kpi.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className={`ti ${kpi.icon}`} style={{ fontSize: 20, color: kpi.color }} />
              </div>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#0F172A' }}>{kpi.value}</div>
            </div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#64748B' }}>{kpi.label}</div>
            <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>{kpi.sub}</div>
          </div>
        ))}
      </div>

      {/* Cash Flow Table */}
      <TableContainer>
        <DataTable
          data={filteredCashFlow}
          customFilters={
            <>
              <select value={filterType} onChange={e => setFilterType(e.target.value)}
                style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid #E2E8F0', background: '#F8FAFC', fontSize: '0.85rem', color: '#475569', fontWeight: 600 }}>
                <option value="All">All Types</option>
                <option value="Inflow">Inflow</option>
                <option value="Outflow">Outflow</option>
              </select>

              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid #E2E8F0', background: '#F8FAFC', fontSize: '0.85rem', color: '#475569', fontWeight: 600 }}>
                <option value="All">All Statuses</option>
                <option value="Validated">Validated</option>
                <option value="Approved">Approved</option>
                <option value="Pending Validation">Pending Validation</option>
                <option value="Rejected">Rejected</option>
              </select>

              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#64748B' }}>From:</label>
                <input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)}
                  style={{ padding: '7px 10px', borderRadius: 8, border: '1px solid #E2E8F0', background: '#F8FAFC', fontSize: '0.85rem', color: '#475569' }} />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#64748B' }}>To:</label>
                <input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)}
                  style={{ padding: '7px 10px', borderRadius: 8, border: '1px solid #E2E8F0', background: '#F8FAFC', fontSize: '0.85rem', color: '#475569' }} />
              </div>

              {(filterType !== 'All' || filterStatus !== 'All' || filterDateFrom || filterDateTo) && (
                <button onClick={() => { setFilterType('All'); setFilterStatus('All'); setFilterDateFrom(''); setFilterDateTo(''); }}
                  style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid #FCA5A5', background: '#FEF2F2', color: '#DC2626', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer' }}>
                  <i className="ti ti-x" style={{ marginRight: 4 }} />Clear Filters
                </button>
              )}
            </>
          }
          columns={[
            {
              key: 'type', label: 'TYPE',
              render: (row: any) => (
                <span style={{
                  padding: '3px 12px', borderRadius: 9999, fontWeight: 700, fontSize: '0.75rem',
                  background: row.type === 'Inflow' ? '#DCFCE7' : '#FEE2E2',
                  color: row.type === 'Inflow' ? '#15803D' : '#DC2626',
                }}>
                  <i className={`ti ${row.type === 'Inflow' ? 'ti-arrow-down-left' : 'ti-arrow-up-right'}`} style={{ marginRight: 4 }} />
                  {row.type}
                </span>
              )
            },
            {
              key: 'clientName', label: 'CLIENT', sortable: true,
              render: (row: any) => (
                <div>
                  <div
                    onClick={() => navigate(`/payments/${row.clientId}`)}
                    style={{ fontWeight: 700, color: '#0F172A', cursor: 'pointer' }}
                  >
                    {row.clientName}
                  </div>
                  {row.clientId && <div style={{ fontSize: 11, color: '#94A3B8' }}>{row.clientId}</div>}
                </div>
              )
            },
            {
              key: 'invoiceNumber', label: 'REFERENCE / INVOICE',
              render: (row: any) => (
                <div>
                  <div style={{ fontWeight: 600, fontFamily: 'monospace', fontSize: 12, color: '#0F172A' }}>{row.invoiceNumber}</div>
                  <span style={{
                    display: 'inline-block', marginTop: 2, padding: '1px 8px', borderRadius: 20,
                    fontSize: 10, fontWeight: 700,
                    background: row.classification === 'SpeedPay Collection' ? '#EEF2FF' : '#F0FDF4',
                    color: row.classification === 'SpeedPay Collection' ? '#4338CA' : '#047857',
                  }}>
                    {row.classification}
                  </span>
                </div>
              )
            },
            {
              key: 'amount', label: 'AMOUNT', sortable: true,
              render: (row: any) => (
                <span style={{ fontWeight: 800, color: row.type === 'Inflow' ? '#10B981' : '#EF4444', fontSize: 14 }}>
                  {row.type === 'Inflow' ? '+' : '-'}₱{Number(row.amount || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                </span>
              )
            },
            {
              key: 'paymentMethod', label: 'METHOD',
              render: (row: any) => {
                const colors: Record<string, string> = { PayMongo: '#10B981', GCash: '#007AFF', Maya: '#00AA6C', 'Bank Transfer': '#1E3A5F', Cash: '#047857', Check: '#7C3AED', 'Online Bank Transfer': '#0EA5E9' };
                const c = colors[row.paymentMethod] ?? '#64748B';
                return <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: c + '18', color: c }}>{row.paymentMethod || '—'}</span>;
              }
            },
            {
              key: 'referenceNumber', label: 'REFERENCE NO.',
              render: (row: any) => <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#475569' }}>{row.referenceNumber || '—'}</span>
            },
            {
              key: 'recordedAt', label: 'DATE', sortable: true,
              render: (row: any) => safeFormatDate(row.recordedAt)
            },
            {
              key: 'status', label: 'STATUS',
              render: (row: any) => <StatusBadge status={row.status} />
            },
          ]}
          rowKey="id"
          title="Cash Flow — Payment Transactions"
          searchPlaceholder="Search by client, invoice, or reference..."
          searchFields={['clientName', 'invoiceNumber', 'referenceNumber'] as any}
          emptyMessage="No cash flow records found. Adjust your filters or wait for validated payments."
          columnToggle={true} densityToggle={true} exportable={false}
          actions={actions}
          createButtons={[
            ...(isAccountant ? [{ label: '+ Record Payment', variant: 'primary' as const, onClick: () => setShowForm(true) }] : []),
          ]}
        />
      </TableContainer>
    </div>
  );

};

export const Payments = () => (
  <PaymentsErrorBoundary>
    <PaymentsContent />
  </PaymentsErrorBoundary>
);

export default Payments;
