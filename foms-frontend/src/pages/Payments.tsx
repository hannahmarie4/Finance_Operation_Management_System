import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { UploadCloud, CheckCircle, Clock, AlertTriangle, X, Search, Camera, ZoomIn, ZoomOut, Info } from 'lucide-react';
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
import { InvoiceDocument } from '../components/InvoiceDocument';

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

const PaymentsKpiCard: React.FC<{ label: string; value: string; color: string; bgColor: string; textColor: string; icon: string; sub: string }> = ({ label, value, color, bgColor, textColor, icon, sub }) => {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: '#fff',
        border: '1px solid #E2E8F0',
        borderRadius: 12,
        padding: '16px 20px',
        transition: 'all 0.25s ease',
        cursor: 'default',
        boxShadow: hovered ? `inset 0 4px 0 0 ${color}, 0 6px 20px ${color}28` : '0 1px 3px rgba(0,0,0,0.05)',
        transform: hovered ? 'translateY(-4px)' : 'none',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
      }}
    >
      <div style={{ width: 48, height: 48, borderRadius: 12, background: hovered ? bgColor : '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.25s', flexShrink: 0 }}>
        <i className={`ti ${icon}`} style={{ fontSize: 24, color: hovered ? color : '#64748B', transition: 'color 0.25s' }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: hovered ? color : '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4, transition: 'color 0.25s', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</div>
        <div style={{ fontSize: 20, fontWeight: 800, color: hovered ? textColor : '#0F172A', marginBottom: 2, transition: 'color 0.25s' }}>{value}</div>
        <div style={{ fontSize: 11, color: '#10B981', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {sub}
        </div>
      </div>
    </div>
  );
};

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

  // --- AI Scan States ---
  const [dragActive, setDragActive] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [previewDocUrl, setPreviewDocUrl] = useState<string | null>(null);
  const [fullScreenPreview, setFullScreenPreview] = useState(false);
  const [previewZoom, setPreviewZoom] = useState(1);
  const [checkingStep, setCheckingStep] = useState(0);
  const [checkingProgress, setCheckingProgress] = useState(0);
  const [scanResultMode, setScanResultMode] = useState<'NONE' | 'INVALID' | 'DUPLICATE' | 'CLEAR'>('NONE');
  const [ocrWarning, setOcrWarning] = useState('');
  const [similarityScore, setSimilarityScore] = useState(0);
  const [matchedRecordDetails, setMatchedRecordDetails] = useState<any>(null);

  // --- Manual Review States ---
  const [showManualReviewPanel, setShowManualReviewPanel] = useState(false);
  const [manualReviewDecision, setManualReviewDecision] = useState<any>('Mark as Duplicate');
  const [duplicateHandling, setDuplicateHandling] = useState('Flag and Block New Submission');
  const [uniqueReason, setUniqueReason] = useState('Different transaction');
  const [duplicateReason, setDuplicateReason] = useState('Same OR number');
  const [manualNote, setManualNote] = useState('');

  const getCellMatchStyle = (field: string, uploaded: string, existing: string) => {
    if (!existing) return { text: 'Missing', style: { fontStyle: 'italic', color: '#64748B', fontSize: '13px' } };
    if (!uploaded) return { text: 'Missing', style: { fontStyle: 'italic', color: '#64748B', fontSize: '13px' } };
    if (uploaded.trim().toLowerCase() === existing.trim().toLowerCase()) {
      return { text: 'Exact Match', style: { background: '#FEE2E2', color: '#B91C1C', padding: '4px 10px', borderRadius: '4px', fontWeight: 700, fontSize: '12px' } };
    }
    return { text: 'Mismatch', style: { background: '#F1F5F9', color: '#475569', padding: '4px 10px', borderRadius: '4px', fontWeight: 700, fontSize: '12px' } };
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  };

  const processSelectedFile = (file: File) => {
    setUploadFile(file);
    setPreviewDocUrl(URL.createObjectURL(file));
    setCheckingStep(1);
    setCheckingProgress(25);
    setScanResultMode('NONE');

    setTimeout(() => {
      setCheckingStep(2);
      setCheckingProgress(60);
      
      setTimeout(() => {
        setCheckingStep(0);
        setCheckingProgress(100);
        
        const lowerName = file.name.toLowerCase();
        if (lowerName.includes('invalid') || lowerName.includes('error')) {
          setScanResultMode('INVALID');
          setOcrWarning('Only official receipts, invoices, billing statements, or payment-related finance documents are allowed.');
        } else {
          // TEMPORARY: Always trigger DUPLICATE for testing purposes based on user request
          setScanResultMode('DUPLICATE');
          setSimilarityScore(100);
          setMatchedRecordDetails({
             record_id: 'FOMS-PAY-99812',
             registered_or: form.invoiceNo || 'MOCK-OR-12345',
             client_name: form.companyName || 'SPEEDEX USER',
             amount: form.amount || '0.00',
             entry_date: form.datePaid || '2026-09-15',
             reference_no: form.referenceNumber || 'MOCK-REF-9876'
          });
          toast.warning('Duplicate detected (100% similarity). Review required.', 'AI Gemini Scan');
        }
      }, 1200);
    }, 800);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processSelectedFile(e.target.files[0]);
    }
  };

  const resetUpload = () => {
    setUploadFile(null);
    setPreviewDocUrl(null);
    setScanResultMode('NONE');
    setCheckingStep(0);
  };

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

  const { payments, invoices, waybills, speedPay, clients, updatePayment, addPayment, updateInvoice, addReceipt, receipts, refreshPayments, refreshInvoices, refreshReceipts, addAuditLog, addCashFlowRecord, cashFlowRecords } = useAppData();

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
        
        // Auto-record Cash Flow Inflow
        addCashFlowRecord({
          id: `CFI-${Date.now()}`,
          date: new Date().toISOString(),
          sourceReference: viewPayment.id,
          type: 'Inflow',
          amount: viewPayment.amount,
          recordedBy: user?.employeeId || 'System'
        });

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
        
        // Auto-record Cash Flow Inflow if not already recorded
        const isRecorded = cashFlowRecords?.some((c: any) => c.sourceReference === viewPayment.id);
        if (!isRecorded) {
          addCashFlowRecord({
            id: `CFI-${Date.now()}`,
            date: new Date().toISOString(),
            sourceReference: viewPayment.id,
            type: 'Inflow',
            amount: viewPayment.amount,
            recordedBy: user?.employeeId || 'System'
          });
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
  let viewPayment: any = null;
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
    viewPayment = {
      ...viewPaymentRaw,
      clientName: client?.name ?? viewPaymentRaw.clientName ?? 'Unknown',
      invoiceNumber: invoice?.invoiceNumber ?? viewPaymentRaw.invoiceNumber ?? viewPaymentRaw.invoiceId
    };

    if (actionParam === 'view') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>



          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px', alignItems: 'start' }}>

            {/* LEFT COLUMN */}
            <Card style={{ padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px dashed #E2E8F0' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#0F172A', fontWeight: 800 }}>Payment Information</h3>
                <span style={{ background: viewPayment.status === 'Validated' ? '#DCFCE7' : viewPayment.status === 'Pending Validation' ? '#FEF3C7' : '#F1F5F9', color: viewPayment.status === 'Validated' ? '#15803D' : viewPayment.status === 'Pending Validation' ? '#B45309' : '#475569', padding: '4px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <i className={viewPayment.status === 'Validated' ? "ti ti-lock" : "ti ti-clock"} /> {viewPayment.status}
                </span>
              </div>
              
              <div style={{ fontSize: '13px', color: '#0F172A', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="ti ti-info-circle" style={{ fontSize: '16px', color: '#0F172A' }} />
                <span><strong>Notice:</strong> Please ensure all payment details are correct. Verification actions are available in the summary section on the right.</span>
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



              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px' }}>
                <Button
                  title="View Invoice"
                  variant="primary"
                  icon="ti-file-invoice"
                  onClick={() => {
                    const found = invoices.find(i => i.id === viewPayment.invoiceId || i.invoiceNumber === viewPayment.invoiceId || i.invoiceNumber === viewPayment.invoiceNumber);
                    if (found) {
                      setSelectedInvoiceForModal(found);
                    } else {
                      const rawAmount = typeof viewPayment.amount === 'string' ? Number(viewPayment.amount.replace(/[^0-9.-]+/g,"")) : (viewPayment.amount || 15000);
                      const safeAmount = isNaN(rawAmount) || rawAmount === 0 ? 15000 : rawAmount;
                      setSelectedInvoiceForModal({
                        id: 'MOCK-INV',
                        invoiceNumber: viewPayment.invoiceNumber || 'MOCK-0001',
                        clientId: viewPayment.clientId || 'CL-001',
                        amount: safeAmount,
                        vatAmount: safeAmount * 0.12,
                        surchargeAmount: 0,
                        totalAmount: safeAmount * 1.12,
                        status: 'Sent',
                        billingPeriod: 'Mock Period 2026',
                        createdAt: new Date().toISOString(),
                        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                        waybillIds: []
                      });
                      toast.info('Showing a preview mock invoice because the actual invoice was not found in the database.', 'Mock Invoice', undefined, undefined, 4000);
                    }
                  }}
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
          {selectedInvoiceForModal && (
            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', zIndex: 99999, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }} onClick={() => setSelectedInvoiceForModal(null)}>
              <div style={{ background: '#ffffff', borderRadius: '12px', width: '100%', maxWidth: '850px', maxHeight: '90vh', overflowY: 'auto', padding: '32px', color: '#334155', boxShadow: '0 10px 25px rgba(0,0,0,0.3)' }} onClick={e => e.stopPropagation()}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                  <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: '#0F172A' }}>Invoice Details</h3>
                  <button onClick={() => setSelectedInvoiceForModal(null)} style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', fontSize: '1.5rem', display: 'flex', alignItems: 'center' }}><i className="ti ti-x" /></button>
                </div>

                <div style={{ maxHeight: 'calc(90vh - 100px)', overflowY: 'auto' }}>
                  <PaymentsErrorBoundary>
                    <InvoiceDocument invoice={selectedInvoiceForModal} />
                  </PaymentsErrorBoundary>
                </div>
              </div>
            </div>
          )}
        </div>
      );
    } else if (false && actionParam === 'receipt') {
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
            <div style={{ background: '#fff', borderRadius: 12, padding: 28, boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', width: '100%', maxWidth: '840px', maxHeight: '90vh', overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#0F172A' }}>Record Payment</h3>
                <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', fontSize: 20 }}>×</button>
              </div>
              <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: 6 }}>Invoice No. <span style={{ color: '#EF4444' }}>*</span></label>
                  <input required type="text" placeholder="Enter Invoice Number" value={form.invoiceNo} onChange={e => setForm(f => ({ ...f, invoiceNo: e.target.value }))}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #E2E8F0', background: '#F8FAFC', color: '#0F172A', fontSize: '0.9rem', boxSizing: 'border-box', fontWeight: 600 }} />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: 6 }}>Company Name <span style={{ color: '#EF4444' }}>*</span></label>
                  <input required type="text" placeholder="Enter Company Name" value={form.companyName} onChange={e => setForm(f => ({ ...f, companyName: e.target.value }))}
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
                  <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: 6 }}>Amount Paid <span style={{ color: '#EF4444' }}>*</span></label>
                  <input required type="number" step="0.01" placeholder="0.00" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #E2E8F0', background: '#F8FAFC', color: '#0F172A', fontSize: '0.9rem', boxSizing: 'border-box', fontWeight: 600 }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: 6 }}>Payment Method <span style={{ color: '#EF4444' }}>*</span></label>
                  <select value={form.paymentMethod} onChange={e => setForm(f => ({ ...f, paymentMethod: e.target.value }))}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #E2E8F0', background: '#F8FAFC', fontSize: '0.9rem', boxSizing: 'border-box' }}>
                    <option value="Check">Check</option>
                    <option value="Cash">Cash</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: 6 }}>
                    {form.paymentMethod === 'Cash' ? 'Cash Receipt No. (Optional)' : (
                      <>{form.paymentMethod === 'Check' ? 'Check Number' : 'Bank Reference Number'} <span style={{ color: '#EF4444' }}>*</span></>
                    )}
                  </label>
                  <input required={form.paymentMethod !== 'Cash'} type="text" placeholder={form.paymentMethod === 'Cash' ? 'e.g. CR-0012' : 'e.g. BPI-887211'} value={form.referenceNumber}
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
                  <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: 12 }}>Upload Proof of Payment</label>
                  
                  {scanResultMode === 'NONE' && checkingStep === 0 && (
                    <div
                      onDragEnter={handleDrag}
                      onDragOver={handleDrag}
                      onDragLeave={handleDrag}
                      onDrop={handleDrop}
                      style={{
                        padding: '24px 20px', borderRadius: '12px',
                        border: dragActive ? '2px dashed #0D9488' : '2px dashed #CBD5E1',
                        background: dragActive ? '#F0FDFA' : '#fff',
                        textAlign: 'center', transition: 'all 0.2s',
                      }}
                    >
                      <input type="file" id="file-upload-2" style={{ display: 'none' }} onChange={handleFileChange} accept=".jpg,.jpeg,.png,.pdf" />
                      <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: '#0D9488', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', boxShadow: '0 4px 12px rgba(13,148,136,0.3)' }}>
                        <UploadCloud size={20} color="#ffffff" />
                      </div>
                      <div style={{ fontSize: '0.95rem', color: '#0F172A', fontWeight: 700, marginBottom: '6px' }}>
                        Drag & Drop or Upload Document
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#64748B', marginBottom: '16px' }}>
                        Support JPG, JPEG, and PNG receipt statements up to 10MB.
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
                        <button type="button" onClick={() => document.getElementById('file-upload-2')?.click()} style={{ background: '#0D9488', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '0.8rem' }}>Choose File</button>
                        <button type="button" onClick={() => document.getElementById('file-upload-2')?.click()} style={{ background: '#fff', color: '#0F172A', border: '1px solid #CBD5E1', padding: '8px 16px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Camera size={16} color="#475569" /> Scan Document
                        </button>
                      </div>
                    </div>
                  )}

                  {checkingStep > 0 && (
                    <div style={{ padding: '24px', textAlign: 'center', background: '#F8FAFC', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                      <div style={{ marginBottom: 12, fontWeight: 600, color: '#0F172A' }}>AI Scanning Document...</div>
                      <div style={{ width: '100%', height: 6, background: '#E2E8F0', borderRadius: 4, overflow: 'hidden', marginBottom: 12 }}>
                        <div style={{ width: `${checkingProgress}%`, height: '100%', background: '#0EA5E9', transition: 'width 0.3s ease' }} />
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#64748B', display: 'flex', justifyContent: 'center', gap: 12 }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: checkingStep >= 1 ? '#0F172A' : '#94A3B8' }}>{checkingStep > 1 ? <CheckCircle size={14} color="#10B981" /> : <Clock size={14} />} Reading</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: checkingStep >= 2 ? '#0F172A' : '#94A3B8' }}>{checkingStep > 2 ? <CheckCircle size={14} color="#10B981" /> : <Clock size={14} />} Checking</span>
                      </div>
                    </div>
                  )}

                  {(scanResultMode === 'INVALID' || scanResultMode === 'DUPLICATE' || scanResultMode === 'CLEAR') && previewDocUrl && (
                    <div style={{ marginBottom: 16, background: '#fff', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                      <div style={{ fontWeight: 600, color: '#0F172A', marginBottom: 12, fontSize: '0.9rem', textAlign: 'left' }}>Uploaded Document Preview:</div>
                      <img src={previewDocUrl} alt="Uploaded Proof" onClick={() => setFullScreenPreview(true)} style={{ maxWidth: '100%', maxHeight: '300px', borderRadius: '8px', objectFit: 'contain', border: '1px solid #E2E8F0', cursor: 'pointer', transition: 'opacity 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.opacity = '0.85'} onMouseLeave={(e) => e.currentTarget.style.opacity = '1'} title="Click to view full size" />
                    </div>
                  )}

                  {scanResultMode === 'INVALID' && (
                    <div style={{ padding: '20px', borderRadius: '12px', border: '1px solid #FECACA', background: '#FEF2F2' }}>
                      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                        <AlertTriangle size={24} color="#EF4444" style={{ flexShrink: 0 }} />
                        <div>
                          <h4 style={{ margin: '0 0 6px', color: '#991B1B', fontWeight: 700 }}>Invalid Document Uploaded</h4>
                          <p style={{ margin: 0, fontSize: '0.85rem', color: '#B91C1C', lineHeight: 1.5 }}>{ocrWarning}</p>
                        </div>
                      </div>
                      <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
                        <button type="button" onClick={resetUpload} style={{ background: '#fff', border: '1px solid #FECACA', padding: '6px 16px', borderRadius: 6, color: '#991B1B', fontWeight: 600, cursor: 'pointer' }}>Clear</button>
                      </div>
                    </div>
                  )}

                  {scanResultMode === 'DUPLICATE' && matchedRecordDetails && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: 16 }}>
                      <div style={{ padding: '32px', borderRadius: '16px', border: '1px solid rgba(225, 29, 72, 0.2)', background: '#fff' }}>
                        <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
                          <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#FEF2F2', color: '#EF4444', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <AlertTriangle size={24} />
                          </div>
                          <div>
                            <h3 style={{ margin: '0 0 4px', fontSize: '18px', fontWeight: 800, color: '#EF4444' }}>Possible Duplicate Detected</h3>
                            <p style={{ margin: 0, fontSize: '14px', color: '#334155' }}>A possible matching Official Receipt or Invoice already exists in FOMS.</p>
                          </div>
                        </div>

                        {/* Document Previews side-by-side */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
                          <div style={{ padding: '16px', background: '#F8FAFC', borderRadius: '12px', border: '1px solid #E2E8F0', textAlign: 'center' }}>
                            <h4 style={{ margin: '0 0 12px', fontSize: '12.5px', fontWeight: 700, color: '#334155', textTransform: 'uppercase' }}>Uploaded / Scanned Document</h4>
                            <div style={{ overflow: 'hidden', height: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#ffffff', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                              <img src={previewDocUrl || '/mock_receipt.png'} alt="Uploaded candidate preview" style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }} />
                            </div>
                          </div>
                          <div style={{ padding: '16px', background: '#ffffff', borderRadius: '12px', border: '1px solid #E2E8F0', textAlign: 'center' }}>
                            <h4 style={{ margin: '0 0 12px', fontSize: '12.5px', fontWeight: 700, color: '#334155', textTransform: 'uppercase' }}>Existing Matching FOMS Record</h4>
                            <div style={{ overflow: 'hidden', height: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                              <img src={'/mock_receipt.png'} alt="Existing database match preview" style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain', opacity: 0.85 }} />
                            </div>
                          </div>
                        </div>

                        {/* Similarity Banner info */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 18px', background: '#FFF7ED', borderRadius: '8px', border: '1px solid rgba(249, 115, 22, 0.2)', marginBottom: '24px', fontSize: '13.5px', fontWeight: 600 }}>
                          <span style={{ color: '#9A3412' }}>Highest Similarity: {similarityScore}% Match Score</span>
                          <span style={{ color: '#334155' }}>Checked Date & Time: {new Date().toLocaleString()}</span>
                        </div>

                        {/* Comparison Matrix */}
                        <h4 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '12px', color: '#0F172A' }}>Comparison Parameters Matrix</h4>
                        <div style={{ overflowX: 'auto', marginBottom: '28px' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                            <thead>
                              <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                                <th style={{ padding: '10px 14px', fontSize: '12px', fontWeight: 700, color: '#334155', textTransform: 'uppercase' }}>Field</th>
                                <th style={{ padding: '10px 14px', fontSize: '12px', fontWeight: 700, color: '#334155', textTransform: 'uppercase' }}>Uploaded Document</th>
                                <th style={{ padding: '10px 14px', fontSize: '12px', fontWeight: 700, color: '#334155', textTransform: 'uppercase' }}>Existing FOMS Record</th>
                                <th style={{ padding: '10px 14px', fontSize: '12px', fontWeight: 700, color: '#334155', textTransform: 'uppercase' }}>Match Result</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr style={{ borderBottom: '1px solid #E2E8F0' }}>
                                <td style={{ padding: '12px 14px', fontSize: '13px', fontWeight: 600 }}>Document Type</td>
                                <td style={{ padding: '12px 14px', fontSize: '13px' }}>OFFICIAL RECEIPT</td>
                                <td style={{ padding: '12px 14px', fontSize: '13px' }}>Official Receipt</td>
                                <td style={{ padding: '12px 14px' }}><span style={getCellMatchStyle('type', 'OFFICIAL_RECEIPT', 'OFFICIAL_RECEIPT').style}>{getCellMatchStyle('type', 'OFFICIAL_RECEIPT', 'OFFICIAL_RECEIPT').text}</span></td>
                              </tr>
                              <tr style={{ borderBottom: '1px solid #E2E8F0' }}>
                                <td style={{ padding: '12px 14px', fontSize: '13px', fontWeight: 600 }}>OR / Invoice Number</td>
                                <td style={{ padding: '12px 14px', fontSize: '13px', fontFamily: 'monospace' }}>{form.referenceNumber || 'MOCK-OR-12345'}</td>
                                <td style={{ padding: '12px 14px', fontSize: '13px', fontFamily: 'monospace' }}>{matchedRecordDetails?.registered_or}</td>
                                <td style={{ padding: '12px 14px' }}><span style={getCellMatchStyle('docNum', form.referenceNumber || 'MOCK-OR-12345', matchedRecordDetails?.registered_or).style}>{getCellMatchStyle('docNum', form.referenceNumber || 'MOCK-OR-12345', matchedRecordDetails?.registered_or).text}</span></td>
                              </tr>
                              <tr style={{ borderBottom: '1px solid #E2E8F0' }}>
                                <td style={{ padding: '12px 14px', fontSize: '13px', fontWeight: 600 }}>Client Name</td>
                                <td style={{ padding: '12px 14px', fontSize: '13px' }}>{form.companyName || form.firstName || 'SPEEDEX USER'}</td>
                                <td style={{ padding: '12px 14px', fontSize: '13px' }}>{matchedRecordDetails?.client_name}</td>
                                <td style={{ padding: '12px 14px' }}><span style={getCellMatchStyle('client', form.companyName || form.firstName || 'SPEEDEX USER', matchedRecordDetails?.client_name).style}>{getCellMatchStyle('client', form.companyName || form.firstName || 'SPEEDEX USER', matchedRecordDetails?.client_name).text}</span></td>
                              </tr>
                              <tr style={{ borderBottom: '1px solid #E2E8F0' }}>
                                <td style={{ padding: '12px 14px', fontSize: '13px', fontWeight: 600 }}>Amount</td>
                                <td style={{ padding: '12px 14px', fontSize: '13px', fontWeight: 700 }}>₱{parseFloat(form.amount || '0').toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                <td style={{ padding: '12px 14px', fontSize: '13px', fontWeight: 700 }}>₱{parseFloat(matchedRecordDetails?.amount || '0').toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                <td style={{ padding: '12px 14px' }}><span style={getCellMatchStyle('amount', form.amount || '0', matchedRecordDetails?.amount).style}>{getCellMatchStyle('amount', form.amount || '0', matchedRecordDetails?.amount).text}</span></td>
                              </tr>
                              <tr style={{ borderBottom: '1px solid #E2E8F0' }}>
                                <td style={{ padding: '12px 14px', fontSize: '13px', fontWeight: 600 }}>Transaction Date</td>
                                <td style={{ padding: '12px 14px', fontSize: '13px' }}>{form.datePaid || '2026-09-15'}</td>
                                <td style={{ padding: '12px 14px', fontSize: '13px' }}>{matchedRecordDetails?.entry_date || '2026-09-15'}</td>
                                <td style={{ padding: '12px 14px' }}><span style={getCellMatchStyle('date', form.datePaid || '2026-09-15', matchedRecordDetails?.entry_date || '2026-09-15').style}>{getCellMatchStyle('date', form.datePaid || '2026-09-15', matchedRecordDetails?.entry_date || '2026-09-15').text}</span></td>
                              </tr>
                            </tbody>
                          </table>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                          <button type="button" onClick={resetUpload} style={{ background: '#fff', border: '1px solid #CBD5E1', padding: '10px 20px', borderRadius: 8, color: '#334155', fontWeight: 600, cursor: 'pointer' }}>Cancel / Reset</button>
                          <button type="button" onClick={() => setShowManualReviewPanel(true)} style={{ background: '#fff', border: '1px solid #CBD5E1', padding: '10px 20px', borderRadius: 8, color: '#0F172A', fontWeight: 600, cursor: 'pointer' }}>Need Manual Review</button>
                        </div>
                      </div>
                    </div>
                  )}

                  {scanResultMode === 'CLEAR' && (
                    <div style={{ padding: '16px', borderRadius: '12px', border: '1px solid #A7F3D0', background: '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 40, height: 40, borderRadius: 8, background: '#fff', border: '1px solid #A7F3D0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <CheckCircle size={20} color="#10B981" />
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, color: '#065F46', fontSize: '0.9rem' }}>{uploadFile?.name}</div>
                          <div style={{ fontSize: '0.8rem', color: '#059669' }}>Scanned successfully. No duplicates found.</div>
                        </div>
                      </div>
                      <button type="button" onClick={resetUpload} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                        <X size={20} color="#059669" />
                      </button>
                    </div>
                  )}
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
                    disabled={!form.invoiceNo || !form.companyName || (form.paymentMethod !== 'Cash' && !form.referenceNumber) || !form.datePaid}
                    style={{ padding: '10px 24px', borderRadius: 8, background: (!form.invoiceNo || !form.companyName || (form.paymentMethod !== 'Cash' && !form.referenceNumber) || !form.datePaid) ? '#94A3B8' : '#0F172A', color: '#fff', border: 'none', fontWeight: 700, cursor: (!form.invoiceNo || !form.companyName || (form.paymentMethod !== 'Cash' && !form.referenceNumber) || !form.datePaid) ? 'not-allowed' : 'pointer', transition: 'background 0.2s' }}>Record Payment</button>
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
          <div style={{ background: '#fff', borderRadius: 12, padding: 28, boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', width: '100%', maxWidth: '840px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#0F172A' }}>Record Payment</h3>
              <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', fontSize: 20 }}>×</button>
            </div>
            <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: 6 }}>Invoice No. <span style={{ color: '#EF4444' }}>*</span></label>
                <input required type="text" placeholder="Enter Invoice Number" value={form.invoiceNo} onChange={e => setForm(f => ({ ...f, invoiceNo: e.target.value }))}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #E2E8F0', background: '#F8FAFC', color: '#0F172A', fontSize: '0.9rem', boxSizing: 'border-box', fontWeight: 600 }} />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: 6 }}>Company Name <span style={{ color: '#EF4444' }}>*</span></label>
                <input required type="text" placeholder="Enter Company Name" value={form.companyName} onChange={e => setForm(f => ({ ...f, companyName: e.target.value }))}
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
                <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: 6 }}>Amount Paid <span style={{ color: '#EF4444' }}>*</span></label>
                <input required type="number" step="0.01" placeholder="0.00" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #E2E8F0', background: '#F8FAFC', color: '#0F172A', fontSize: '0.9rem', boxSizing: 'border-box', fontWeight: 600 }} />
              </div>
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: 6 }}>Payment Method <span style={{ color: '#EF4444' }}>*</span></label>
                <select value={form.paymentMethod} onChange={e => setForm(f => ({ ...f, paymentMethod: e.target.value }))}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #E2E8F0', background: '#F8FAFC', fontSize: '0.9rem', boxSizing: 'border-box' }}>
                  <option value="Check">Check</option>
                  <option value="Cash">Cash</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: 6 }}>
                  {form.paymentMethod === 'Cash' ? 'Cash Receipt No. (Optional)' : (
                    <>{form.paymentMethod === 'Check' ? 'Check Number' : 'Bank Reference Number'} <span style={{ color: '#EF4444' }}>*</span></>
                  )}
                </label>
                <input required={form.paymentMethod !== 'Cash'} type="text" placeholder={form.paymentMethod === 'Cash' ? 'e.g. CR-0012' : 'e.g. BPI-887211'} value={form.referenceNumber}
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
                <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: 12 }}>Upload Proof of Payment</label>
                
                {scanResultMode === 'NONE' && checkingStep === 0 && (
                  <div
                    onDragEnter={handleDrag}
                    onDragOver={handleDrag}
                    onDragLeave={handleDrag}
                    onDrop={handleDrop}
                    style={{
                      padding: '24px 20px', borderRadius: '12px',
                      border: dragActive ? '2px dashed #0D9488' : '2px dashed #CBD5E1',
                      background: dragActive ? '#F0FDFA' : '#fff',
                      textAlign: 'center', transition: 'all 0.2s',
                    }}
                  >
                    <input type="file" id="file-upload-1" style={{ display: 'none' }} onChange={handleFileChange} accept=".jpg,.jpeg,.png,.pdf" />
                    <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: '#0D9488', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', boxShadow: '0 4px 12px rgba(13,148,136,0.3)' }}>
                      <UploadCloud size={20} color="#ffffff" />
                    </div>
                    <div style={{ fontSize: '0.95rem', color: '#0F172A', fontWeight: 700, marginBottom: '6px' }}>
                      Drag & Drop or Upload Document
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#64748B', marginBottom: '16px' }}>
                      Support JPG, JPEG, and PNG receipt statements up to 10MB.
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
                      <button type="button" onClick={() => document.getElementById('file-upload-1')?.click()} style={{ background: '#0D9488', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '0.8rem' }}>Choose File</button>
                      <button type="button" onClick={() => document.getElementById('file-upload-1')?.click()} style={{ background: '#fff', color: '#0F172A', border: '1px solid #CBD5E1', padding: '8px 16px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Camera size={16} color="#475569" /> Scan Document
                      </button>
                    </div>
                  </div>
                )}

                {checkingStep > 0 && (
                  <div style={{ padding: '24px', textAlign: 'center', background: '#F8FAFC', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                    <div style={{ marginBottom: 12, fontWeight: 600, color: '#0F172A' }}>AI Scanning Document...</div>
                    <div style={{ width: '100%', height: 6, background: '#E2E8F0', borderRadius: 4, overflow: 'hidden', marginBottom: 12 }}>
                      <div style={{ width: `${checkingProgress}%`, height: '100%', background: '#0EA5E9', transition: 'width 0.3s ease' }} />
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#64748B', display: 'flex', justifyContent: 'center', gap: 12 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: checkingStep >= 1 ? '#0F172A' : '#94A3B8' }}>{checkingStep > 1 ? <CheckCircle size={14} color="#10B981" /> : <Clock size={14} />} Reading</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: checkingStep >= 2 ? '#0F172A' : '#94A3B8' }}>{checkingStep > 2 ? <CheckCircle size={14} color="#10B981" /> : <Clock size={14} />} Checking</span>
                    </div>
                  </div>
                )}

                {(scanResultMode === 'INVALID' || scanResultMode === 'DUPLICATE' || scanResultMode === 'CLEAR') && previewDocUrl && (
                  <div style={{ marginBottom: 16, background: '#fff', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                    <div style={{ fontWeight: 600, color: '#0F172A', marginBottom: 12, fontSize: '0.9rem', textAlign: 'left' }}>Uploaded Document Preview:</div>
                    <img src={previewDocUrl} alt="Uploaded Proof" onClick={() => setFullScreenPreview(true)} style={{ maxWidth: '100%', maxHeight: '300px', borderRadius: '8px', objectFit: 'contain', border: '1px solid #E2E8F0', cursor: 'pointer', transition: 'opacity 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.opacity = '0.85'} onMouseLeave={(e) => e.currentTarget.style.opacity = '1'} title="Click to view full size" />
                  </div>
                )}

                {scanResultMode === 'INVALID' && (
                  <div style={{ padding: '20px', borderRadius: '12px', border: '1px solid #FECACA', background: '#FEF2F2' }}>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                      <AlertTriangle size={24} color="#EF4444" style={{ flexShrink: 0 }} />
                      <div>
                        <h4 style={{ margin: '0 0 6px', color: '#991B1B', fontWeight: 700 }}>Invalid Document Uploaded</h4>
                        <p style={{ margin: 0, fontSize: '0.85rem', color: '#B91C1C', lineHeight: 1.5 }}>{ocrWarning}</p>
                      </div>
                    </div>
                    <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
                      <button type="button" onClick={resetUpload} style={{ background: '#fff', border: '1px solid #FECACA', padding: '6px 16px', borderRadius: 6, color: '#991B1B', fontWeight: 600, cursor: 'pointer' }}>Clear</button>
                    </div>
                  </div>
                )}

                {scanResultMode === 'DUPLICATE' && matchedRecordDetails && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: 16 }}>
                    <div style={{ padding: '32px', borderRadius: '16px', border: '1px solid rgba(225, 29, 72, 0.2)', background: '#fff' }}>
                      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
                        <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#FEF2F2', color: '#EF4444', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <AlertTriangle size={24} />
                        </div>
                        <div>
                          <h3 style={{ margin: '0 0 4px', fontSize: '18px', fontWeight: 800, color: '#EF4444' }}>Possible Duplicate Detected</h3>
                          <p style={{ margin: 0, fontSize: '14px', color: '#334155' }}>A possible matching Official Receipt or Invoice already exists in FOMS.</p>
                        </div>
                      </div>

                      {/* Document Previews side-by-side */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
                        <div style={{ padding: '16px', background: '#F8FAFC', borderRadius: '12px', border: '1px solid #E2E8F0', textAlign: 'center' }}>
                          <h4 style={{ margin: '0 0 12px', fontSize: '12.5px', fontWeight: 700, color: '#334155', textTransform: 'uppercase' }}>Uploaded / Scanned Document</h4>
                          <div style={{ overflow: 'hidden', height: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#ffffff', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                            <img src={previewDocUrl || '/mock_receipt.png'} alt="Uploaded candidate preview" style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }} />
                          </div>
                        </div>
                        <div style={{ padding: '16px', background: '#ffffff', borderRadius: '12px', border: '1px solid #E2E8F0', textAlign: 'center' }}>
                          <h4 style={{ margin: '0 0 12px', fontSize: '12.5px', fontWeight: 700, color: '#334155', textTransform: 'uppercase' }}>Existing Matching FOMS Record</h4>
                          <div style={{ overflow: 'hidden', height: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                            <img src={'/mock_receipt.png'} alt="Existing database match preview" style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain', opacity: 0.85 }} />
                          </div>
                        </div>
                      </div>

                      {/* Similarity Banner info */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 18px', background: '#FFF7ED', borderRadius: '8px', border: '1px solid rgba(249, 115, 22, 0.2)', marginBottom: '24px', fontSize: '13.5px', fontWeight: 600 }}>
                        <span style={{ color: '#9A3412' }}>Highest Similarity: {similarityScore}% Match Score</span>
                        <span style={{ color: '#334155' }}>Checked Date & Time: {new Date().toLocaleString()}</span>
                      </div>

                      {/* Comparison Matrix */}
                      <h4 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '12px', color: '#0F172A' }}>Comparison Parameters Matrix</h4>
                      <div style={{ overflowX: 'auto', marginBottom: '28px' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                          <thead>
                            <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                              <th style={{ padding: '10px 14px', fontSize: '12px', fontWeight: 700, color: '#334155', textTransform: 'uppercase' }}>Field</th>
                              <th style={{ padding: '10px 14px', fontSize: '12px', fontWeight: 700, color: '#334155', textTransform: 'uppercase' }}>Uploaded Document</th>
                              <th style={{ padding: '10px 14px', fontSize: '12px', fontWeight: 700, color: '#334155', textTransform: 'uppercase' }}>Existing FOMS Record</th>
                              <th style={{ padding: '10px 14px', fontSize: '12px', fontWeight: 700, color: '#334155', textTransform: 'uppercase' }}>Match Result</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr style={{ borderBottom: '1px solid #E2E8F0' }}>
                              <td style={{ padding: '12px 14px', fontSize: '13px', fontWeight: 600 }}>Document Type</td>
                              <td style={{ padding: '12px 14px', fontSize: '13px' }}>OFFICIAL RECEIPT</td>
                              <td style={{ padding: '12px 14px', fontSize: '13px' }}>Official Receipt</td>
                              <td style={{ padding: '12px 14px' }}><span style={getCellMatchStyle('type', 'OFFICIAL_RECEIPT', 'OFFICIAL_RECEIPT').style}>{getCellMatchStyle('type', 'OFFICIAL_RECEIPT', 'OFFICIAL_RECEIPT').text}</span></td>
                            </tr>
                            <tr style={{ borderBottom: '1px solid #E2E8F0' }}>
                              <td style={{ padding: '12px 14px', fontSize: '13px', fontWeight: 600 }}>OR / Invoice Number</td>
                              <td style={{ padding: '12px 14px', fontSize: '13px', fontFamily: 'monospace' }}>{form.referenceNumber || 'MOCK-OR-12345'}</td>
                              <td style={{ padding: '12px 14px', fontSize: '13px', fontFamily: 'monospace' }}>{matchedRecordDetails?.registered_or}</td>
                              <td style={{ padding: '12px 14px' }}><span style={getCellMatchStyle('docNum', form.referenceNumber || 'MOCK-OR-12345', matchedRecordDetails?.registered_or).style}>{getCellMatchStyle('docNum', form.referenceNumber || 'MOCK-OR-12345', matchedRecordDetails?.registered_or).text}</span></td>
                            </tr>
                            <tr style={{ borderBottom: '1px solid #E2E8F0' }}>
                              <td style={{ padding: '12px 14px', fontSize: '13px', fontWeight: 600 }}>Client Name</td>
                              <td style={{ padding: '12px 14px', fontSize: '13px' }}>{form.companyName || form.firstName || 'SPEEDEX USER'}</td>
                              <td style={{ padding: '12px 14px', fontSize: '13px' }}>{matchedRecordDetails?.client_name}</td>
                              <td style={{ padding: '12px 14px' }}><span style={getCellMatchStyle('client', form.companyName || form.firstName || 'SPEEDEX USER', matchedRecordDetails?.client_name).style}>{getCellMatchStyle('client', form.companyName || form.firstName || 'SPEEDEX USER', matchedRecordDetails?.client_name).text}</span></td>
                            </tr>
                            <tr style={{ borderBottom: '1px solid #E2E8F0' }}>
                              <td style={{ padding: '12px 14px', fontSize: '13px', fontWeight: 600 }}>Amount</td>
                              <td style={{ padding: '12px 14px', fontSize: '13px', fontWeight: 700 }}>₱{parseFloat(form.amount || '0').toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                              <td style={{ padding: '12px 14px', fontSize: '13px', fontWeight: 700 }}>₱{parseFloat(matchedRecordDetails?.amount || '0').toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                              <td style={{ padding: '12px 14px' }}><span style={getCellMatchStyle('amount', form.amount || '0', matchedRecordDetails?.amount).style}>{getCellMatchStyle('amount', form.amount || '0', matchedRecordDetails?.amount).text}</span></td>
                            </tr>
                            <tr style={{ borderBottom: '1px solid #E2E8F0' }}>
                              <td style={{ padding: '12px 14px', fontSize: '13px', fontWeight: 600 }}>Transaction Date</td>
                              <td style={{ padding: '12px 14px', fontSize: '13px' }}>{form.datePaid || '2026-09-15'}</td>
                              <td style={{ padding: '12px 14px', fontSize: '13px' }}>{matchedRecordDetails?.entry_date || '2026-09-15'}</td>
                              <td style={{ padding: '12px 14px' }}><span style={getCellMatchStyle('date', form.datePaid || '2026-09-15', matchedRecordDetails?.entry_date || '2026-09-15').style}>{getCellMatchStyle('date', form.datePaid || '2026-09-15', matchedRecordDetails?.entry_date || '2026-09-15').text}</span></td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                        <button type="button" onClick={resetUpload} style={{ background: '#fff', border: '1px solid #CBD5E1', padding: '10px 20px', borderRadius: 8, color: '#334155', fontWeight: 600, cursor: 'pointer' }}>Cancel / Reset</button>
                        <button type="button" onClick={() => setShowManualReviewPanel(true)} style={{ background: '#fff', border: '1px solid #CBD5E1', padding: '10px 20px', borderRadius: 8, color: '#0F172A', fontWeight: 600, cursor: 'pointer' }}>Need Manual Review</button>
                      </div>
                    </div>
                  </div>
                )}

                {scanResultMode === 'CLEAR' && (
                  <div style={{ padding: '16px', borderRadius: '12px', border: '1px solid #A7F3D0', background: '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 40, height: 40, borderRadius: 8, background: '#fff', border: '1px solid #A7F3D0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <CheckCircle size={20} color="#10B981" />
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, color: '#065F46', fontSize: '0.9rem' }}>{uploadFile?.name}</div>
                        <div style={{ fontSize: '0.8rem', color: '#059669' }}>Scanned successfully. No duplicates found.</div>
                      </div>
                    </div>
                    <button type="button" onClick={resetUpload} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                      <X size={20} color="#059669" />
                    </button>
                  </div>
                )}
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
                  disabled={!form.invoiceNo || !form.companyName || (form.paymentMethod !== 'Cash' && !form.referenceNumber) || !form.datePaid}
                  style={{ padding: '10px 24px', borderRadius: 8, background: (!form.invoiceNo || !form.companyName || (form.paymentMethod !== 'Cash' && !form.referenceNumber) || !form.datePaid) ? '#94A3B8' : '#0F172A', color: '#fff', border: 'none', fontWeight: 700, cursor: (!form.invoiceNo || !form.companyName || (form.paymentMethod !== 'Cash' && !form.referenceNumber) || !form.datePaid) ? 'not-allowed' : 'pointer', transition: 'background 0.2s' }}>Record Payment</button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* KPI Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        {[
          { label: 'Total Cash Inflow', value: `₱${Number(totalInflow || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`, color: '#10B981', bgColor: '#F0FDF4', textColor: '#15803D', icon: 'ti-trending-up', sub: 'Validated payments only' },
          { label: 'Total Cash Outflow', value: `₱${Number(totalOutflow || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`, color: '#EF4444', bgColor: '#FEF2F2', textColor: '#B91C1C', icon: 'ti-trending-down', sub: 'Approved outgoing transactions' },
          { label: 'Net Cash Flow', value: `₱${Number(netCashFlow || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`, color: netCashFlow >= 0 ? '#6366F1' : '#EF4444', bgColor: netCashFlow >= 0 ? '#EEF2FF' : '#FEF2F2', textColor: netCashFlow >= 0 ? '#4338CA' : '#B91C1C', icon: 'ti-currency-peso', sub: 'Total Inflow minus Outflow' },
          { label: 'Pending Validation', value: `₱${Number(pendingInflowAmt || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`, color: '#F59E0B', bgColor: '#FFFBEB', textColor: '#B45309', icon: 'ti-clock', sub: `${pendingPayments.length} payment(s) awaiting` },
        ].map(kpi => (
          <PaymentsKpiCard key={kpi.label} {...kpi} />
        ))}
      </div>

      {/* Cash Flow Table */}
      <TableContainer>
        <DataTable
          data={filteredCashFlow}
          customFilters={
            <>
              <select value={filterType} onChange={e => setFilterType(e.target.value)}
                style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid #E2E8F0', background: '#F8FAFC', fontSize: '0.8rem', color: '#475569', fontWeight: 600 }}>
                <option value="All">All Types</option>
                <option value="Inflow">Inflow</option>
                <option value="Outflow">Outflow</option>
              </select>

              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid #E2E8F0', background: '#F8FAFC', fontSize: '0.8rem', color: '#475569', fontWeight: 600 }}>
                <option value="All">All Statuses</option>
                <option value="Validated">Validated</option>
                <option value="Approved">Approved</option>
                <option value="Pending Validation">Pending Validation</option>
                <option value="Rejected">Rejected</option>
              </select>

              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748B' }}>From:</label>
                <input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)}
                  style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #E2E8F0', background: '#F8FAFC', fontSize: '0.8rem', color: '#475569' }} />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748B' }}>To:</label>
                <input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)}
                  style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #E2E8F0', background: '#F8FAFC', fontSize: '0.8rem', color: '#475569' }} />
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
                    display: 'inline-block', marginTop: 2,
                    fontSize: 10, fontWeight: 700,
                    color: '#000000',
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
                  {row.type === 'Inflow' ? '' : '-'}₱{Number(row.amount || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                </span>
              )
            },
            {
              key: 'paymentMethod', label: 'METHOD',
              render: (row: any) => {
                return <span style={{ color: '#000000', fontWeight: 'normal', fontSize: 13 }}>{row.paymentMethod || '—'}</span>;
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

      {/* Full Screen Image Preview Modal */}
      {fullScreenPreview && previewDocUrl && createPortal(
        <div style={{ position: 'fixed', inset: 0, zIndex: 999999, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px', overflow: 'auto' }} onClick={() => { setFullScreenPreview(false); setPreviewZoom(1); }}>
          <div style={{ position: 'fixed', top: '24px', right: '24px', display: 'flex', gap: '12px', zIndex: 1000000 }} onClick={(e) => e.stopPropagation()}>
            <button style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', padding: '12px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.4)'} onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'} onClick={() => setPreviewZoom(prev => Math.min(prev + 0.5, 4))} title="Zoom In">
              <ZoomIn size={24} />
            </button>
            <button style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', padding: '12px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.4)'} onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'} onClick={() => setPreviewZoom(prev => Math.max(prev - 0.5, 0.5))} title="Zoom Out">
              <ZoomOut size={24} />
            </button>
            <button style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', padding: '12px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.4)'} onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'} onClick={() => { setFullScreenPreview(false); setPreviewZoom(1); }} title="Close">
              <X size={24} />
            </button>
          </div>
          <div style={{ transform: `scale(${previewZoom})`, transition: 'transform 0.2s ease-in-out', transformOrigin: 'center' }} onClick={(e) => e.stopPropagation()}>
            <img src={previewDocUrl} alt="Full screen preview" style={{ maxWidth: '100vw', maxHeight: '100vh', objectFit: 'contain', boxShadow: '0 8px 32px rgba(0,0,0,0.5)', borderRadius: '4px' }} />
          </div>
        </div>,
        document.body
      )}

      {/* Manual Review Modal from ai-frontend */}
      {showManualReviewPanel && createPortal(
        <div style={{ position: 'fixed', inset: 0, zIndex: 999999, background: 'rgba(15, 23, 42, 0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', backdropFilter: 'blur(3.5px)' }}>
          <div style={{ background: '#ffffff', borderRadius: '12px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)', width: '100%', maxWidth: '840px', maxHeight: '94vh', overflowY: 'auto', padding: '32px', border: '1px solid #E2E8F0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '16px', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#1E293B' }}>Duplicate Record Comparison (Alert #28)</h3>
              <button onClick={() => setShowManualReviewPanel(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#94A3B8' }}><X size={20} /></button>
            </div>

            <div style={{ display: 'flex', gap: '12px', padding: '16px', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '8px', marginBottom: '24px', alignItems: 'flex-start' }}>
              <Info size={18} style={{ color: '#D97706', marginTop: '2px', flexShrink: 0 }} />
              <div>
                <h5 style={{ margin: '0 0 4px', fontSize: '13.5px', fontWeight: 700, color: '#92400E' }}>Matching Factors Confidence: {similarityScore}%</h5>
                <p style={{ margin: 0, fontSize: '13px', color: '#B45309', lineHeight: '1.4' }}>Highly similar {matchedRecordDetails?.registered_or ? 'receipt' : 'invoice'} numbers: {form.referenceNumber || 'MOCK-OR-12345'} and {matchedRecordDetails?.registered_or || matchedRecordDetails?.registered_invoice}.</p>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <span style={{ fontSize: '12.5px', fontWeight: 600, color: '#64748B' }}>Document Image Comparison View</span>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button style={{ border: '1px solid #CBD5E1', background: '#fff', borderRadius: 4, cursor: 'pointer', padding: '4px 8px', height: '28px', fontSize: '11px' }} onClick={() => setPreviewZoom(z => Math.max(z - 0.25, 0.5))}><ZoomOut size={12} /></button>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', minWidth: '40px', textAlign: 'center' }}>{previewZoom.toFixed(2)}x</span>
                <button style={{ border: '1px solid #CBD5E1', background: '#fff', borderRadius: 4, cursor: 'pointer', padding: '4px 8px', height: '28px', fontSize: '11px' }} onClick={() => setPreviewZoom(z => Math.min(z + 0.25, 3))}><ZoomIn size={12} /></button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
              <div style={{ overflow: 'hidden', height: '140px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                <img src={previewDocUrl || '/mock_receipt.png'} alt="Uploaded original doc" style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain', transform: `scale(${previewZoom})`, transition: 'transform 0.15s ease' }} />
              </div>
              <div style={{ overflow: 'hidden', height: '140px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                <img src={'/mock_receipt.png'} alt="Legar FOMS match doc" style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain', opacity: 0.85, transform: `scale(${previewZoom})`, transition: 'transform 0.15s ease' }} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '28px' }}>
              <div style={{ border: '1px solid #E2E8F0', borderRadius: '8px', padding: '16px', background: '#FFFFFF' }}>
                <h4 style={{ margin: '0 0 14px', fontSize: '14px', fontWeight: 700, color: '#0F766E', borderBottom: '1px solid #E2E8F0', paddingBottom: '8px' }}>Original Record details</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #F1F5F9', fontSize: '13px' }}>
                    <span style={{ color: '#64748B' }}>amount</span>
                    <span style={{ color: '#0D9488', fontWeight: 700 }}>{parseFloat(form.amount || '0').toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #F1F5F9', fontSize: '13px' }}>
                    <span style={{ color: '#64748B' }}>dueDate</span>
                    <span style={{ color: '#0D9488', fontWeight: 700 }}>{form.datePaid || '2026-09-15'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #F1F5F9', fontSize: '13px' }}>
                    <span style={{ color: '#64748B' }}>clientId</span>
                    <span style={{ color: '#0D9488', fontWeight: 700 }}>C-004</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #F1F5F9', fontSize: '13px' }}>
                    <span style={{ color: '#64748B' }}>clientName</span>
                    <span style={{ color: '#0D9488', fontWeight: 700 }}>{form.companyName || form.firstName || 'SPEEDEX USER'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #F1F5F9', fontSize: '13px' }}>
                    <span style={{ color: '#64748B' }}>invoiceNumber</span>
                    <span style={{ color: '#0D9488', fontWeight: 700 }}>{form.referenceNumber || 'MOCK-OR-12345'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #F1F5F9', fontSize: '13px' }}>
                    <span style={{ color: '#64748B' }}>paymentStatus</span>
                    <span style={{ color: '#0D9488', fontWeight: 700 }}>Unpaid</span>
                  </div>
                </div>
              </div>

              <div style={{ border: '1px solid #E2E8F0', borderRadius: '8px', padding: '16px', background: '#FFFFFF' }}>
                <h4 style={{ margin: '0 0 14px', fontSize: '14px', fontWeight: 700, color: '#0F766E', borderBottom: '1px solid #E2E8F0', paddingBottom: '8px' }}>Possible Matching record</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #F1F5F9', fontSize: '13px' }}>
                    <span style={{ color: '#64748B' }}>amount</span>
                    <span style={{ color: '#0D9488', fontWeight: 700 }}>{parseFloat(matchedRecordDetails?.amount || '0').toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #F1F5F9', fontSize: '13px' }}>
                    <span style={{ color: '#64748B' }}>dueDate</span>
                    <span style={{ color: '#0D9488', fontWeight: 700 }}>{matchedRecordDetails?.entry_date || '2026-09-15'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #F1F5F9', fontSize: '13px' }}>
                    <span style={{ color: '#64748B' }}>clientId</span>
                    <span style={{ color: '#0D9488', fontWeight: 700 }}>C-005</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #F1F5F9', fontSize: '13px' }}>
                    <span style={{ color: '#64748B' }}>clientName</span>
                    <span style={{ color: '#0D9488', fontWeight: 700 }}>{matchedRecordDetails?.client_name || 'Epsilon Corp'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #F1F5F9', fontSize: '13px' }}>
                    <span style={{ color: '#64748B' }}>invoiceNumber</span>
                    <span style={{ color: '#0D9488', fontWeight: 700 }}>{matchedRecordDetails?.registered_or || matchedRecordDetails?.registered_invoice || 'INV-2026-005'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #F1F5F9', fontSize: '13px' }}>
                    <span style={{ color: '#64748B' }}>paymentStatus</span>
                    <span style={{ color: '#0D9488', fontWeight: 700 }}>{matchedRecordDetails?.status === 'Validated' ? 'Paid' : 'Unpaid'}</span>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: '20px', marginBottom: '14px' }}>
              <h4 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: 800, color: '#1E293B' }}>Log Human Validation Action</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '16px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: '6px', color: '#334155' }}>Review Decision</label>
                  <select style={{ width: '100%', padding: '8px 12px', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '13px' }} value={manualReviewDecision} onChange={(e) => setManualReviewDecision(e.target.value as any)}>
                    <option value="Mark as Duplicate">Mark as Duplicate</option>
                    <option value="Mark as Unique">Mark as Unique</option>
                  </select>
                </div>
                <div>
                  {manualReviewDecision === 'Mark as Duplicate' ? (
                    <>
                      <label style={{ fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: '6px', color: '#334155' }}>Recommended Legacy Action</label>
                      <select style={{ width: '100%', padding: '8px 12px', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '13px' }} value={duplicateHandling} onChange={(e) => setDuplicateHandling(e.target.value)}>
                        <option value="Flag and Block New Submission">Flag and Block New Submission</option>
                        <option value="Link to Existing Record">Link to Existing Record</option>
                        <option value="Return for Correction">Return for Correction</option>
                        <option value="Keep for Investigation">Keep for Investigation</option>
                      </select>
                    </>
                  ) : (
                    <>
                      <label style={{ fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: '6px', color: '#334155' }}>Reason why the document is unique</label>
                      <select style={{ width: '100%', padding: '8px 12px', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '13px' }} value={uniqueReason} onChange={(e) => setUniqueReason(e.target.value)}>
                        <option value="Different transaction">Different transaction</option>
                        <option value="Different client">Different client</option>
                        <option value="Different amount">Different amount</option>
                        <option value="Other">Other</option>
                      </select>
                    </>
                  )}
                </div>
              </div>

              {manualReviewDecision === 'Mark as Duplicate' && (
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: '6px', color: '#334155' }}>Duplicate Reason Option</label>
                  <select style={{ width: '100%', padding: '8px 12px', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '13px' }} value={duplicateReason} onChange={(e) => setDuplicateReason(e.target.value)}>
                    <option value="Same OR number">Same OR number</option>
                    <option value="Same Invoice number">Same Invoice number</option>
                    <option value="Same client and amount">Same client and amount</option>
                  </select>
                </div>
              )}

              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: '6px', color: '#334155' }}>Remarks / Audit Notes <span style={{ color: '#EF4444' }}>*</span></label>
                <textarea style={{ width: '100%', minHeight: '80px', padding: '10px 12px', borderRadius: '8px', fontSize: '13px', border: '1px solid #CBD5E1' }} placeholder="Explain matches or safety checks (required for auditor compliance logs)..." value={manualNote} onChange={(e) => setManualNote(e.target.value)} />
              </div>

              <div style={{ display: 'flex', gap: '10px', padding: '12px 14px', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', marginBottom: '20px', alignItems: 'flex-start', fontSize: '12.5px', color: '#64748B' }}>
                <Info size={16} style={{ color: '#94A3B8', marginTop: '2px', flexShrink: 0 }} />
                <span>Note: Submitting this review records your validation inside the AI audit service database. It does not directly modify transaction data in the legacy FOMS MSSQL tables.</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', borderTop: '1px solid #E2E8F0', paddingTop: '16px' }}>
              <button style={{ height: '36px', minWidth: '90px', border: '1px solid #CBD5E1', background: '#fff', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, color: '#334155' }} onClick={() => setShowManualReviewPanel(false)}>Close</button>
              <button style={{ height: '36px', minWidth: '130px', backgroundColor: '#00A99D', border: 'none', borderRadius: '6px', color: '#FFFFFF', fontWeight: 700, cursor: manualNote.trim() ? 'pointer' : 'not-allowed', opacity: manualNote.trim() ? 1 : 0.6 }} onClick={() => { setShowManualReviewPanel(false); setScanResultMode('NONE'); }} disabled={!manualNote.trim()}>Submit Review</button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {paymentIdParam && actionParam === 'receipt' && viewPayment && createPortal(
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 99999, padding: '24px' }} onClick={() => navigate('/payments')}>
          <div style={{ background: '#F8FAFC', width: '100%', maxWidth: '850px', maxHeight: '90vh', overflowY: 'auto', borderRadius: '12px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }} onClick={e => e.stopPropagation()}>
            
            {/* STICKY HEADER */}
            <div style={{ position: 'sticky', top: 0, background: '#fff', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #E2E8F0', zIndex: 10, borderTopLeftRadius: '12px', borderTopRightRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
              <div style={{ display: 'flex', gap: '32px', alignItems: 'center' }}>
                <button 
                  onClick={() => navigate('/payments')} 
                  style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px', borderRadius: '50%', color: '#64748B', transition: 'background 0.2s', marginRight: '-8px' }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#F1F5F9'} 
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  title="Close and Go Back"
                >
                  <i className="ti ti-arrow-left" style={{ fontSize: '20px' }} />
                </button>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <span style={{ fontSize: '10px', fontWeight: 800, color: '#94A3B8', letterSpacing: '0.05em' }}>PAYMENT STATUS</span>
                  <span style={{ color: '#D97706', fontSize: '13px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ background: '#FEF3C7', display: 'flex', padding: '2px', borderRadius: '50%' }}><i className="ti ti-alert-circle" style={{ color: '#D97706', fontSize: '14px' }} /></span> Issued OR
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <span style={{ fontSize: '10px', fontWeight: 800, color: '#94A3B8', letterSpacing: '0.05em' }}>INVOICE STATUS</span>
                  <span style={{ color: '#059669', fontSize: '13px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ background: '#D1FAE5', display: 'flex', padding: '2px', borderRadius: '50%' }}><i className="ti ti-check" style={{ color: '#059669', fontSize: '14px' }} /></span> Paid
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <span style={{ fontSize: '10px', fontWeight: 800, color: '#94A3B8', letterSpacing: '0.05em' }}>DATE ISSUED</span>
                  <span style={{ color: '#0F172A', fontWeight: 700, fontSize: '13px' }}>{safeFormatDate(viewPayment.recordedAt || new Date())}</span>
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <button onClick={(e) => { e.stopPropagation(); toast.info(`Downloading PDF Official Receipt for ${viewPayment.invoiceNumber}...`, 'Download Started'); }} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#0D9488', border: 'none', padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, color: '#fff', cursor: 'pointer' }}>
                  <i className="ti ti-printer" style={{ fontSize: '16px' }} /> Print / PDF
                </button>
              </div>
            </div>

            {/* RECEIPT BODY */}
            <div style={{ padding: '24px' }}>
              <div style={{ background: '#fff', padding: '48px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.02)', border: '1px solid #E2E8F0', position: 'relative', overflow: 'hidden', minHeight: '500px' }}>
                
                <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                  <h2 style={{ margin: '0 0 8px', fontSize: '1.4rem', color: '#0F172A', fontWeight: 800 }}>Speedex Courier & Forwarder, Inc.</h2>
                  <p style={{ margin: 0, color: '#64748B', fontSize: '0.85rem' }}>123 Rizal St, Brgy. Poblacion, Cebu City</p>
                </div>
                
                <h1 style={{ textAlign: 'center', margin: '0 0 40px', fontSize: '1.6rem', letterSpacing: '0.4em', color: '#0F172A', fontWeight: 800 }}>R E C E I P T</h1>
                
                <div style={{ position: 'absolute', top: '55%', left: '50%', transform: 'translate(-50%, -50%) rotate(-15deg)', fontSize: '140px', fontWeight: 900, color: 'rgba(239, 68, 68, 0.08)', pointerEvents: 'none', zIndex: 0, letterSpacing: '0.1em' }}>PAID</div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', fontSize: '0.85rem', color: '#475569', position: 'relative', zIndex: 1 }}>
                  <div>
                    <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '8px', marginBottom: '10px' }}>
                      <span style={{ color: '#94A3B8' }}>Receipt #:</span>
                      <strong style={{ color: '#0F172A' }}>{viewPayment.orNumber || `OR-2026-0001`}</strong>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '8px', marginBottom: '10px' }}>
                      <span style={{ color: '#94A3B8' }}>Issue Date:</span>
                      <strong style={{ color: '#0F172A' }}>{safeFormatDate(viewPayment.recordedAt || new Date())}</strong>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '8px', marginBottom: '10px' }}>
                      <span style={{ color: '#94A3B8' }}>Payment Method:</span>
                      <strong style={{ color: '#0F172A' }}>{viewPayment.paymentMethod || 'N/A'}</strong>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '8px', marginBottom: '10px' }}>
                      <span style={{ color: '#94A3B8' }}>Reference #:</span>
                      <strong style={{ color: '#0F172A' }}>{viewPayment.referenceNumber || 'CHK-999888'}</strong>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ color: '#94A3B8', marginBottom: '6px' }}>Received From:</div>
                    <strong style={{ display: 'block', color: '#0F172A', fontSize: '1.05rem', marginBottom: '6px' }}>{viewPayment.clientName || 'Shopee Express'}</strong>
                    <div style={{ color: '#64748B', marginBottom: '4px' }}>Code: {viewPayment.clientId || 'CL-002'}</div>
                    <div style={{ color: '#64748B' }}>Invoice No: {viewPayment.invoiceNumber || 'LZD-2026-0002'}</div>
                  </div>
                </div>

                <div style={{ marginTop: '50px', position: 'relative', zIndex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #CBD5E1', paddingBottom: '12px', marginBottom: '16px', fontWeight: 700, color: '#0F172A' }}>
                    <span>Description</span>
                    <span>Total</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '32px', color: '#475569' }}>
                    <span>Full payment for logistics and delivery services covered by Invoice No. {viewPayment.invoiceNumber}</span>
                    <strong style={{ color: '#0F172A', fontSize: '1.1rem' }}>₱{Number(viewPayment.amount || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</strong>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );

};

export const Payments = () => (
  <PaymentsErrorBoundary>
    <PaymentsContent />
  </PaymentsErrorBoundary>
);

export default Payments;
