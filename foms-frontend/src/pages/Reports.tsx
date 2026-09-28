import React, { Component, ErrorInfo, useState } from 'react';
import { useSearchParams, useNavigate, useParams } from 'react-router-dom';
import { useAppData } from '../context/AppDataContext';
import { TableContainer } from '../components/TableContainer';
import { StatusCard } from '../components/StatusCard';
import { DataTable } from '../components/DataTable';
import { CustomDatePicker } from '../components/CustomDatePicker';
import { StatusBadge } from '../components/StatusBadge';
import { ClientInfoCard } from '../components/ClientInfoCard';
import { Card } from '../components/Card';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend, LineChart, Line, ComposedChart } from 'recharts';
import { useToast } from '../components/ToastContext';
import { useAuth } from '../context/AuthContext';

class ErrorBoundary extends Component<{ children: React.ReactNode }, { hasError: boolean, error: Error | null }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 20, background: '#fee2e2', color: '#991b1b', borderRadius: 8 }}>
          <h2>Something went wrong in Reports.tsx.</h2>
          <pre style={{ whiteSpace: 'pre-wrap' }}>{this.state.error?.toString()}</pre>
          <pre style={{ whiteSpace: 'pre-wrap' }}>{this.state.error?.stack}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

const BRACKET_COLORS: Record<string, { bg: string; color: string; border: string }> = {
  '0-30 days': { bg: '#F0FDF4', color: '#10B981', border: '#BBF7D0' },
  '31-60 days': { bg: '#FFFBEB', color: '#F59E0B', border: '#FDE68A' },
  '61-90 days': { bg: '#FFF7ED', color: '#F97316', border: '#FED7AA' },
  '90+ days': { bg: '#FEF2F2', color: '#EF4444', border: '#FECACA' },
};

type ReportTab = 'aging' | 'invoices' | 'collections';

const ReportsContent: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { invoices, clients, arRecords, payments, addAuditLog } = useAppData();

  const { id } = useParams();
  const selectedClientId = id;
  const [reportType, setReportType] = useState(searchParams.get('tab') || 'aging');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [isGenerated, setIsGenerated] = useState(false);
  const activeTab = reportType;
  const { toast } = useToast();
  const [scheduleFilter, setScheduleFilter] = useState<'Weekly' | 'Semi-monthly' | 'Monthly' | ''>('');
  const [hoveredReportType, setHoveredReportType] = useState<string | null>(null);
  const [clientSearch, setClientSearch] = useState('');
  const [isClientDropdownOpen, setIsClientDropdownOpen] = useState(false);

  const applyScheduleDates = (schedule: 'Weekly' | 'Semi-monthly' | 'Monthly' | '') => {
    setScheduleFilter(schedule);
    setIsGenerated(false);
    if (!schedule) return;

    const now = new Date();
    let start = new Date(now);
    let end = new Date(now);

    if (schedule === 'Weekly') {
      const day = start.getDay();
      start.setDate(start.getDate() - day + (day === 0 ? -6 : 1)); // start on Monday
      end = new Date(start);
      end.setDate(end.getDate() + 6); // end on Sunday
    } else if (schedule === 'Semi-monthly') {
      if (start.getDate() <= 15) {
        start.setDate(1);
        end.setDate(15);
      } else {
        start.setDate(16);
        end = new Date(start.getFullYear(), start.getMonth() + 1, 0);
      }
    } else if (schedule === 'Monthly') {
      start.setDate(1);
      end = new Date(start.getFullYear(), start.getMonth() + 1, 0);
    }

    setDateFrom(start.toISOString().split('T')[0]);
    setDateTo(end.toISOString().split('T')[0]);
  };

  const handleGenerateReport = () => {
    if (!dateFrom) {
      toast.error("Please select a 'Date From' value.");
      return;
    }
    if (!dateTo) {
      toast.error("Please select a 'Date To' value.");
      return;
    }
    if (new Date(dateFrom) > new Date(dateTo)) {
      toast.error("'Date From' cannot be after 'Date To'.");
      return;
    }
    setIsGenerated(true);
    addAuditLog({
      id: `AL-${Date.now()}`,
      userId: user?.employeeId || 'U-000',
      userFullName: user?.fullName || 'System',
      userRole: user?.role || 'Finance Manager',
      action: 'GENERATE_REPORT',
      module: 'Reports',
      recordId: 'N/A',
      recordType: 'Report',
      ipAddress: '127.0.0.1',
      details: `Generated ${reportType} report for ${dateFrom} to ${dateTo}`,
      timestamp: new Date().toISOString()
    });
  };

  const getFilteredAR = () => {
    if (!isGenerated || !dateFrom || !dateTo) return arRecords;
    return arRecords.filter(ar => {
      const d = ar.invoiceDate.split('T')[0];
      return d >= dateFrom && d <= dateTo;
    });
  };

  const getFilteredInvoices = () => {
    if (!isGenerated || !dateFrom || !dateTo) return invoices;
    return invoices.filter(inv => {
      const d = inv.createdAt.split('T')[0];
      return d >= dateFrom && d <= dateTo;
    });
  };

  const getFilteredPayments = () => {
    if (!isGenerated || !dateFrom || !dateTo) return payments;
    return payments.filter(p => {
      const d = p.recordedAt.split('T')[0];
      return d >= dateFrom && d <= dateTo;
    });
  };

  const filteredClientsForDropdown = Array.from(new Map(clients.map(c => [c.name, c])).values())
    .filter(c => c.name.toLowerCase().includes(clientSearch.toLowerCase()));

  let agingRecords: any[] = [];
  if (selectedClientId) {
    agingRecords = getFilteredAR().filter(ar => ar.clientId === selectedClientId).map(ar => {
      const client = clients.find(c => c.id === ar.clientId);
      const invoice = getFilteredInvoices().find(i => i.id === ar.invoiceId);
      return {
        ...ar,
        clientName: client?.name ?? 'Unknown',
        invoiceNumber: invoice?.invoiceNumber ?? ar.invoiceId,
        amount: ar.outstandingBalance,
        status: ar.status
      };
    });
  } else {
    const grouped = new Map<string, any[]>();
    getFilteredAR().forEach(ar => {
      if (!grouped.has(ar.clientId)) grouped.set(ar.clientId, []);
      grouped.get(ar.clientId)!.push(ar);
    });
    agingRecords = Array.from(grouped.entries()).map(([clientId, recs]) => {
      const client = clients.find(c => c.id === clientId);
      const statuses = Array.from(new Set(recs.map(r => r.status)));
      const status = statuses.length === 1 ? statuses[0] : 'Mixed';
      const validTimes = recs.map(r => new Date(r.invoiceDate).getTime()).filter(t => !isNaN(t));
      const maxDate = new Date(validTimes.length > 0 ? Math.max(...validTimes) : Date.now());

      return {
        id: clientId,
        clientId,
        invoiceNumber: recs.length === 1 ? recs[0].invoiceNumber : '[Multiple]',
        clientName: client?.name ?? 'Unknown',
        invoiceDate: maxDate.toISOString(),
        dueDate: maxDate.toISOString(),
        amount: recs.reduce((sum, r) => sum + r.outstandingBalance, 0),
        agingDays: Math.max(...recs.map(r => r.agingDays)),
        agingBracket: 'Mixed',
        status: status,
        isGrouped: true
      };
    });
  }

  // For bracket cards always count from ALL AR records (not grouped)
  const getAgingBracketData = (bracket: string) => {
    const base = selectedClientId
      ? getFilteredAR().filter(r => r.clientId === selectedClientId)
      : getFilteredAR();
    const recs = base.filter(r => r.agingBracket === bracket);
    return {
      count: recs.length,
      total: recs.reduce((sum, r) => sum + r.outstandingBalance, 0)
    };
  };

  const agingChartData = ['0-30 days', '31-60 days', '61-90 days', '90+ days'].map(bracket => {
    const data = getAgingBracketData(bracket);
    return {
      name: bracket,
      value: data.total,
      color: BRACKET_COLORS[bracket].color
    };
  });

  const agingColumns = [
    {
      key: 'clientName', label: 'CLIENT', sortable: true, render: (row: any) => (
        <span onClick={() => navigate(`/reports/${row.clientId}?tab=${activeTab}`)} style={{ color: '#0F172A', fontWeight: 700, cursor: 'pointer', textDecoration: 'none' }}>
          {row.clientName}
        </span>
      )
    },
    { key: 'invoiceDate', label: 'INVOICE DATE', render: (row: any) => row.invoiceDate ? new Date(row.invoiceDate).toLocaleDateString('en-PH') : 'N/A' },
    { key: 'dueDate', label: 'DUE DATE', render: (row: any) => row.dueDate ? new Date(row.dueDate).toLocaleDateString('en-PH') : 'N/A' },
    { key: 'amount', label: 'AMOUNT', render: (row: any) => `₱${row.amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}` },
    { key: 'agingDays', label: 'DAYS OUTSTANDING', sortable: true },
    { key: 'status', label: 'PAYMENT STATUS', render: (row: any) => <StatusBadge status={row.status} /> }
  ];

  // ── 2. Invoice Summary Tab Data ────────────────────────────────
  let allInvoices: any[] = [];
  if (selectedClientId) {
    allInvoices = getFilteredInvoices().filter(i => i.clientId === selectedClientId).map(i => {
      const client = clients.find(c => c.id === i.clientId);
      return {
        ...i,
        clientName: client?.name ?? 'Unknown'
      };
    });
  } else {
    const grouped = new Map<string, any[]>();
    getFilteredInvoices().forEach(inv => {
      if (!grouped.has(inv.clientId)) grouped.set(inv.clientId, []);
      grouped.get(inv.clientId)!.push(inv);
    });
    allInvoices = Array.from(grouped.entries()).map(([clientId, recs]) => {
      const client = clients.find(c => c.id === clientId);
      const statuses = Array.from(new Set(recs.map(r => r.status)));
      const status = statuses.length === 1 ? statuses[0] : 'Mixed';
      const validTimes = recs.map(r => new Date(r.createdAt).getTime()).filter(t => !isNaN(t));
      const maxDate = new Date(validTimes.length > 0 ? Math.max(...validTimes) : Date.now());

      return {
        id: clientId,
        clientId,
        invoiceNumber: recs.length === 1 ? recs[0].invoiceNumber : '[Multiple]',
        clientName: client?.name ?? 'Unknown',
        createdAt: maxDate.toISOString(),
        dueDate: maxDate.toISOString(),
        totalAmount: recs.reduce((sum, r) => sum + r.totalAmount, 0),
        status: status,
        isGrouped: true
      };
    });
  }

  const totalInvoiced = allInvoices.reduce((sum, i) => sum + i.totalAmount, 0);
  const totalPaid = allInvoices.filter(i => i.status === 'Paid').reduce((sum, i) => sum + i.totalAmount, 0);
  const totalOutstanding = allInvoices.filter(i => ['Sent', 'Overdue'].includes(i.status)).reduce((sum, i) => sum + i.totalAmount, 0);

  const invoiceMonthlyData = allInvoices.reduce((acc, inv) => {
    const date = new Date(inv.createdAt);
    const month = date.toLocaleString('default', { month: 'short', year: 'numeric' });
    if (!acc[month]) acc[month] = { name: month, Invoiced: 0, Paid: 0, Outstanding: 0 };
    acc[month].Invoiced += inv.totalAmount;
    if (inv.status === 'Paid') acc[month].Paid += inv.totalAmount;
    else if (['Sent', 'Overdue'].includes(inv.status)) acc[month].Outstanding += inv.totalAmount;
    return acc;
  }, {} as Record<string, any>);
  const invoiceChartData = Object.values(invoiceMonthlyData).sort((a: any, b: any) => new Date(`1 ${a.name}`).getTime() - new Date(`1 ${b.name}`).getTime());

  const invoiceColumns = [
    { key: 'invoiceNumber', label: 'INVOICE NO.', sortable: true },
    {
      key: 'clientName', label: 'CLIENT', sortable: true, render: (row: any) => (
        !selectedClientId ? (
          <span onClick={() => navigate(`/reports/${row.clientId}?tab=${activeTab}`)} style={{ color: '#0F172A', fontWeight: 700, cursor: 'pointer', textDecoration: 'none' }}>
            {row.clientName}
          </span>
        ) : (
          <span style={{ fontWeight: 600 }}>{row.clientName}</span>
        )
      )
    },
    { key: 'createdAt', label: 'ISSUE DATE', render: (row: any) => new Date(row.createdAt).toLocaleDateString('en-PH') },
    { key: 'dueDate', label: 'DUE DATE', render: (row: any) => new Date(row.dueDate).toLocaleDateString('en-PH') },
    { key: 'totalAmount', label: 'TOTAL AMOUNT', render: (row: any) => `₱${row.totalAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}` },
    { key: 'status', label: 'STATUS', render: (row: any) => <StatusBadge status={row.status} /> }
  ];

  // ── 3. Collection Report Tab Data ──────────────────────────────
  let collections: any[] = [];
  const baseCollections = getFilteredPayments().filter(p => p.status === 'Validated' || p.status === 'Approved');
  if (selectedClientId) {
    collections = baseCollections.filter(p => p.clientId === selectedClientId).map(p => {
      const client = clients.find(c => c.id === p.clientId);
      const invoice = getFilteredInvoices().find(i => i.id === p.invoiceId);
      return {
        ...p,
        clientName: client?.name ?? 'Unknown',
        invoiceNumber: invoice?.invoiceNumber ?? p.invoiceId
      };
    });
  } else {
    const grouped = new Map<string, any[]>();
    baseCollections.forEach(col => {
      if (!grouped.has(col.clientId)) grouped.set(col.clientId, []);
      grouped.get(col.clientId)!.push(col);
    });
    collections = Array.from(grouped.entries()).map(([clientId, recs]) => {
      const client = clients.find(c => c.id === clientId);
      const validTimes = recs.map(r => new Date(r.recordedAt).getTime()).filter(t => !isNaN(t));
      const maxDate = new Date(validTimes.length > 0 ? Math.max(...validTimes) : Date.now());

      return {
        id: clientId,
        clientId,
        invoiceNumber: recs.length === 1 ? recs[0].invoiceNumber : '[Multiple]',
        clientName: client?.name ?? 'Unknown',
        paymentMethod: 'Mixed',
        amount: recs.reduce((sum, r) => sum + r.amount, 0),
        recordedAt: maxDate.toISOString(),
        isGrouped: true
      };
    });
  }

  const totalCollected = getFilteredPayments().filter(p => p.status === 'Validated' || p.status === 'Approved').reduce((sum, c) => sum + c.amount, 0);
  // Breakdown by method from individual (non-grouped) payments
  const methodBreakdown = getFilteredPayments()
    .filter(p => p.status === 'Validated' || p.status === 'Approved')
    .reduce((acc, p) => {
      acc[p.paymentMethod] = (acc[p.paymentMethod] || 0) + p.amount;
      return acc;
    }, {} as Record<string, number>);

  const collectionMonthlyData = baseCollections.reduce((acc, col) => {
    if (selectedClientId && col.clientId !== selectedClientId) return acc;
    const date = new Date(col.recordedAt);
    const month = date.toLocaleString('default', { month: 'short', year: 'numeric' });
    if (!acc[month]) acc[month] = { name: month, Collected: 0 };
    acc[month].Collected += col.amount;
    return acc;
  }, {} as Record<string, any>);
  const collectionChartData = Object.values(collectionMonthlyData).sort((a: any, b: any) => new Date(`1 ${a.name}`).getTime() - new Date(`1 ${b.name}`).getTime());

  const breakdownString = Object.entries(methodBreakdown)
    .map(([method, amount]: [string, any]) => `${method}: ₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`)
    .join(' | ');

  const collectionColumns = [
    { key: 'id', label: 'PAYMENT ID', sortable: true },
    { key: 'invoiceNumber', label: 'INVOICE NO.' },
    {
      key: 'clientName', label: 'CLIENT', sortable: true, render: (row: any) => (
        !selectedClientId ? (
          <span onClick={() => navigate(`/reports/${row.clientId}?tab=${activeTab}`)} style={{ color: '#0F172A', fontWeight: 700, cursor: 'pointer', textDecoration: 'none' }}>
            {row.clientName}
          </span>
        ) : (
          <span style={{ fontWeight: 600 }}>{row.clientName}</span>
        )
      )
    },
    { key: 'amount', label: 'AMOUNT PAID', render: (row: any) => <span style={{ fontWeight: 700, color: '#10B981' }}>₱{row.amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span> },
    { key: 'paymentMethod', label: 'PAYMENT METHOD' },
    { key: 'recordedAt', label: 'DATE COLLECTED', render: (row: any) => new Date(row.recordedAt).toLocaleDateString('en-PH') }
  ];

  const BillingScheduleFilter = () => (
    <div style={{
      position: 'absolute',
      left: '100%',
      top: '50%',
      transform: 'translateY(-50%)',
      marginLeft: '16px',
      background: '#fff',
      border: '1px solid #10B981',
      borderRadius: '12px',
      padding: '16px 20px',
      boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
      zIndex: 50,
      width: 'max-content',
      display: 'flex',
      flexDirection: 'column',
      gap: '10px'
    }}>
      <div style={{ position: 'absolute', left: '-6px', top: '50%', marginTop: '-5px', width: '10px', height: '10px', background: '#fff', borderLeft: '1px solid #10B981', borderBottom: '1px solid #10B981', transform: 'rotate(45deg)' }}></div>

      <label style={{ fontSize: '0.7rem', fontWeight: 800, color: '#10B981', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Filter by Schedule</label>
      {['Weekly', 'Semi-monthly', 'Monthly'].map((opt) => (
        <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: isGenerated ? 'not-allowed' : 'pointer', opacity: isGenerated ? 0.6 : 1 }}>
          <input
            type="radio"
            name="billingSchedule"
            value={opt}
            checked={scheduleFilter === opt}
            onChange={() => !isGenerated && applyScheduleDates(opt as any)}
            disabled={isGenerated}
            style={{ margin: 0, cursor: isGenerated ? 'not-allowed' : 'pointer', accentColor: '#10B981' }}
          />
          <span style={{ fontSize: '0.85rem', color: scheduleFilter === opt ? '#0F172A' : '#475569', fontWeight: scheduleFilter === opt ? 700 : 500 }}>{opt}</span>
        </label>
      ))}
    </div>
  );

  const ReportTypeOption = ({ value, label, subLabel, current, onChange, disabled }: any) => {
    const isActive = current === value;
    return (
      <div
        onClick={() => !disabled && onChange(value)}
        style={{
          padding: '12px 14px',
          borderRadius: 12,
          border: isActive ? '1.5px solid #10B981' : '1px solid #E2E8F0',
          background: isActive ? '#F0FDF4' : '#fff',
          cursor: disabled ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          opacity: disabled && !isActive ? 0.6 : 1,
          transition: 'all 0.2s'
        }}
      >
        <div>
          <div style={{ fontSize: '0.85rem', fontWeight: 700, color: isActive ? '#065F46' : '#1E293B', marginBottom: 2 }}>{label}</div>
          <div style={{ fontSize: '0.7rem', color: isActive ? '#047857' : '#64748B', lineHeight: 1.2 }}>{subLabel}</div>
        </div>
        <div style={{ width: 16, height: 16, borderRadius: '50%', border: isActive ? '5px solid #10B981' : '1.5px solid #CBD5E1', background: '#fff', flexShrink: 0 }} />
      </div>
    );
  };

  const MetricCard = ({ label, value, icon, color, bg }: any) => (
    <div style={{ background: '#fff', borderRadius: 12, padding: '16px', border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', gap: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', lineHeight: 1.2, maxWidth: '70%' }}>{label}</div>
        <div style={{ width: 28, height: 28, borderRadius: 8, background: bg, color: color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <i className={`ti ${icon}`} style={{ fontSize: '1.1rem' }}></i>
        </div>
      </div>
      <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0F172A' }}>{value}</div>
    </div>
  );

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 24, alignItems: 'start' }}>

      {/* ── Filter Controls (Left Sidebar) ── */}
      <div style={{ background: '#F8FAFC', borderRadius: 12, padding: '24px 20px', border: '1px solid #E2E8F0', position: 'sticky', top: 24 }}>
        <h3 style={{ margin: '0 0 4px', color: '#0F172A', fontSize: '1.1rem', fontWeight: 800 }}>Report Configuration</h3>
        <p style={{ margin: '0 0 24px', color: '#64748B', fontSize: '0.8rem', lineHeight: 1.4 }}>Select options to quickly adjust standard bounds</p>

        <label style={{ fontSize: '0.7rem', fontWeight: 800, color: '#475569', display: 'block', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>CLIENT</label>
        <div style={{ marginBottom: 24, position: 'relative' }}>
          <div
            onClick={() => !isGenerated && setIsClientDropdownOpen(!isClientDropdownOpen)}
            style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: '0.9rem', color: '#0F172A', background: isGenerated ? '#F1F5F9' : '#fff', cursor: isGenerated ? 'not-allowed' : 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
          >
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {selectedClientId ? clients.find(c => c.id === selectedClientId)?.name : 'All Clients'}
            </span>
            <i className={`ti ti-chevron-${isClientDropdownOpen ? 'up' : 'down'}`} style={{ color: '#94A3B8', flexShrink: 0, marginLeft: 8 }}></i>
          </div>

          {isClientDropdownOpen && !isGenerated && (
            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4, background: '#fff', border: '1px solid #E2E8F0', borderRadius: 8, boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)', zIndex: 50, maxHeight: 280, display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: '8px', borderBottom: '1px solid #E2E8F0', background: '#F8FAFC', borderTopLeftRadius: 8, borderTopRightRadius: 8 }}>
                <div style={{ position: 'relative' }}>
                  <i className="ti ti-search" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#64748B', fontSize: '0.9rem' }}></i>
                  <input
                    type="text"
                    placeholder="Search clients..."
                    value={clientSearch}
                    onChange={(e) => setClientSearch(e.target.value)}
                    style={{ width: '100%', padding: '8px 10px 8px 30px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: '0.85rem', outline: 'none', background: '#fff' }}
                    onClick={e => e.stopPropagation()}
                  />
                </div>
              </div>
              <div style={{ overflowY: 'auto', flex: 1, padding: '4px 0' }}>
                <div
                  onClick={() => {
                    navigate(`/reports?tab=${reportType}`);
                    setIsClientDropdownOpen(false);
                    setClientSearch('');
                    setIsGenerated(false);
                  }}
                  style={{ padding: '10px 16px', fontSize: '0.85rem', cursor: 'pointer', background: !selectedClientId ? '#F0FDF4' : 'transparent', fontWeight: !selectedClientId ? 700 : 400, color: !selectedClientId ? '#065F46' : '#0F172A', transition: 'background 0.2s' }}
                  onMouseEnter={e => { if (selectedClientId) e.currentTarget.style.background = '#F8FAFC'; }}
                  onMouseLeave={e => { if (selectedClientId) e.currentTarget.style.background = 'transparent'; }}
                >
                  All Clients
                </div>
                {filteredClientsForDropdown.length > 0 ? filteredClientsForDropdown.map(c => (
                  <div
                    key={c.id}
                    onClick={() => {
                      navigate(`/reports/${c.id}?tab=${reportType}`);
                      setIsClientDropdownOpen(false);
                      setClientSearch('');
                      setIsGenerated(false);
                    }}
                    style={{ padding: '10px 16px', fontSize: '0.85rem', cursor: 'pointer', background: selectedClientId === c.id ? '#F0FDF4' : 'transparent', fontWeight: selectedClientId === c.id ? 700 : 400, color: selectedClientId === c.id ? '#065F46' : '#0F172A', transition: 'background 0.2s' }}
                    onMouseEnter={e => { if (selectedClientId !== c.id) e.currentTarget.style.background = '#F8FAFC'; }}
                    onMouseLeave={e => { if (selectedClientId !== c.id) e.currentTarget.style.background = 'transparent'; }}
                  >
                    {c.name}
                  </div>
                )) : (
                  <div style={{ padding: '16px 14px', fontSize: '0.85rem', color: '#64748B', textAlign: 'center' }}>No clients found matching "{clientSearch}"</div>
                )}
              </div>
            </div>
          )}
        </div>

        <label style={{ fontSize: '0.7rem', fontWeight: 800, color: '#475569', display: 'block', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>REPORT TYPE</label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
          <div style={{ position: 'relative' }} onMouseEnter={() => !isGenerated && setHoveredReportType('aging')} onMouseLeave={() => setHoveredReportType(null)}>
            <ReportTypeOption value="aging" label="Aging of Accounts" subLabel="Outstanding AR by age" current={reportType} onChange={(v: string) => { setReportType(v); setIsGenerated(false); }} disabled={isGenerated} />
            {hoveredReportType === 'aging' && <BillingScheduleFilter />}
          </div>
          <div style={{ position: 'relative' }} onMouseEnter={() => !isGenerated && setHoveredReportType('invoices')} onMouseLeave={() => setHoveredReportType(null)}>
            <ReportTypeOption value="invoices" label="Invoice Summary" subLabel="Total billed and status" current={reportType} onChange={(v: string) => { setReportType(v); setIsGenerated(false); }} disabled={isGenerated} />
            {hoveredReportType === 'invoices' && <BillingScheduleFilter />}
          </div>
          <div style={{ position: 'relative' }} onMouseEnter={() => !isGenerated && setHoveredReportType('collections')} onMouseLeave={() => setHoveredReportType(null)}>
            <ReportTypeOption value="collections" label="Collection Summary" subLabel="Payments received" current={reportType} onChange={(v: string) => { setReportType(v); setIsGenerated(false); }} disabled={isGenerated} />
            {hoveredReportType === 'collections' && <BillingScheduleFilter />}
          </div>
        </div>

        <label style={{ fontSize: '0.7rem', fontWeight: 800, color: '#475569', display: 'block', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>DATE BOUNDS</label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
          <div>
            <CustomDatePicker value={dateFrom} onChange={val => { setDateFrom(val); setIsGenerated(false); }} maxDate={dateTo || undefined} placeholder="Date From" />
          </div>
          <div>
            <CustomDatePicker value={dateTo} onChange={val => { setDateTo(val); setIsGenerated(false); }} minDate={dateFrom || undefined} placeholder="Date To" />
          </div>
        </div>

        {!isGenerated ? (
          <button onClick={handleGenerateReport} style={{ width: '100%', background: '#10B981', color: '#fff', padding: '12px', borderRadius: 8, border: 'none', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'background 0.2s', boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.2)' }}>
            <i className="ti ti-file-analytics" style={{ fontSize: '1.1rem' }}></i> GENERATE REPORT
          </button>
        ) : (
          <button onClick={() => setIsGenerated(false)} style={{ width: '100%', background: '#fff', color: '#0F172A', padding: '12px', borderRadius: 8, border: '1px solid #CBD5E1', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'background 0.2s' }}>
            <i className="ti ti-refresh" style={{ fontSize: '1.1rem' }}></i> EDIT REPORT CONFIG
          </button>
        )}
      </div>

      {/* ── Main Content (Right Area) ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20, minWidth: 0 }}>
        {selectedClientId && clients.find(c => c.id === selectedClientId) && (
          <div style={{ marginBottom: -8 }}>
            <ClientInfoCard client={clients.find(c => c.id === selectedClientId)!} />
          </div>
        )}

        {!isGenerated ? (
          <div style={{ background: '#fff', borderRadius: 12, padding: 64, textAlign: 'center', border: '1px dashed #CBD5E1', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
            <div style={{ width: 80, height: 80, borderRadius: '50%', background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
              <i className="ti ti-chart-bar" style={{ fontSize: 36, color: '#94A3B8' }}></i>
            </div>
            <h3 style={{ margin: '0 0 8px', color: '#0F172A', fontSize: '1.2rem', fontWeight: 700 }}>Ready to Generate</h3>
            <p style={{ margin: 0, color: '#64748B', fontSize: '0.95rem', maxWidth: 300, lineHeight: 1.5 }}>Configure your report criteria on the left panel to fetch insights and analytics.</p>
          </div>
        ) : (
          <>
            {/* Dynamic Report Header */}
            <div style={{ background: '#fff', borderRadius: 12, padding: '20px 24px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
              <p style={{ margin: '0 0 6px', fontSize: '0.75rem', fontWeight: 800, color: '#0EA5E9', textTransform: 'uppercase', letterSpacing: '0.05em' }}>DYNAMIC REPORT</p>
              <h2 style={{ margin: '0 0 8px', fontSize: '1.5rem', fontWeight: 800, color: '#0F172A' }}>
                {reportType === 'aging' ? 'Aging of Accounts Report' : reportType === 'invoices' ? 'Invoice Summary Report' : 'Collection Summary Report'}
              </h2>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748B', fontWeight: 500 }}>
                Generated {new Date().toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' })} &bull; Date Bound: {new Date(dateFrom).toLocaleDateString()} to {new Date(dateTo).toLocaleDateString()} &bull; Client Filter: {selectedClientId ? clients.find(c => c.id === selectedClientId)?.name : 'All Clients'}
              </p>
            </div>

            {/* ── Tab 1: Aging of Accounts ── */}
            {activeTab === 'aging' && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
                  {['0-30 days', '31-60 days', '61-90 days', '90+ days'].map(bracket => {
                    const data = getAgingBracketData(bracket);
                    const { color, border, bg } = BRACKET_COLORS[bracket];
                    return (
                      <MetricCard key={bracket} label={bracket + ' UNPAID'} value={data.count} icon="ti-clock" color={color} bg={bg} />
                    );
                  })}
                </div>

                <div className="kpi-anim-wrapper" style={{ background: '#fff', borderRadius: 12, padding: '20px', border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Receivables Aging Breakdown</p>
                    <i className="ti ti-chart-pie" style={{ color: '#F97316', fontSize: '1.2rem' }}></i>
                  </div>
                  <div style={{ width: '100%', height: 220 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={agingChartData.filter(d => d.value > 0)} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={2} dataKey="value" stroke="none">
                          {agingChartData.filter(d => d.value > 0).map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                        </Pie>
                        <Tooltip formatter={(val: any) => `₱${Number(val).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '12px', fontWeight: 600 }} />
                        <Legend wrapperStyle={{ fontSize: '12px', marginTop: '10px' }} iconType="circle" />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <TableContainer>
                  <DataTable
                    title="Detailed Aging Ledger"
                    data={agingRecords}
                    columns={agingColumns}
                    rowKey="id"
                    exportable={true}
                    columnToggle={true}
                    densityToggle={true}
                    searchPlaceholder="Search aging records (Client, Invoice)..."
                    searchFields={['clientName', 'invoiceNumber']}
                  />
                </TableContainer>
              </>
            )}

            {/* ── Tab 2: Invoice Summary ── */}
            {activeTab === 'invoices' && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
                  <MetricCard label="TOTAL INVOICED" value={`₱${(totalInvoiced / 1000).toFixed(1)}k`} icon="ti-file-invoice" color="#0EA5E9" bg="#E0F2FE" />
                  <MetricCard label="PAID AMOUNT" value={`₱${(totalPaid / 1000).toFixed(1)}k`} icon="ti-check" color="#10B981" bg="#D1FAE5" />
                  <MetricCard label="OUTSTANDING" value={`₱${(totalOutstanding / 1000).toFixed(1)}k`} icon="ti-alert-circle" color="#F59E0B" bg="#FEF3C7" />
                  <MetricCard label="INVOICE COUNT" value={allInvoices.length} icon="ti-file-description" color="#8B5CF6" bg="#EDE9FE" />
                </div>

                <div className="kpi-anim-wrapper" style={{ background: '#fff', borderRadius: 12, padding: '24px', border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                  <p style={{ margin: '0 0 20px', fontSize: '0.85rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Invoicing Timeline</p>
                  <div style={{ height: 280, width: '100%' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={invoiceChartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748B' }} dy={10} />
                        <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748B' }} tickFormatter={(val) => `₱${val >= 1000 ? (val / 1000).toFixed(1).replace('.0', '') + 'k' : val}`} width={60} />
                        <Tooltip formatter={(val: any) => `₱${Number(val).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                        <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '12px' }} iconType="circle" />
                        <Bar yAxisId="left" dataKey="Invoiced" fill="#0EA5E9" radius={[4, 4, 0, 0]} maxBarSize={40} />
                        <Bar yAxisId="left" dataKey="Paid" fill="#10B981" radius={[4, 4, 0, 0]} maxBarSize={40} />
                        <Bar yAxisId="left" dataKey="Outstanding" fill="#F59E0B" radius={[4, 4, 0, 0]} maxBarSize={40} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <TableContainer>
                  <DataTable
                    title="Invoice Summary Report"
                    data={allInvoices}
                    columns={selectedClientId ? invoiceColumns : invoiceColumns.filter(c => !['invoiceNumber', 'status'].includes(c.key))}
                    rowKey="id"
                    exportable={true}
                    columnToggle={true}
                    densityToggle={true}
                    searchPlaceholder="Search invoices (No, Client, Status)..."
                    searchFields={['invoiceNumber', 'clientName', 'status']}
                  />
                </TableContainer>
              </>
            )}

            {/* ── Tab 3: Collection Report ── */}
            {activeTab === 'collections' && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
                  <MetricCard label="TOTAL COLLECTED" value={`₱${(totalCollected / 1000).toFixed(1)}k`} icon="ti-cash" color="#10B981" bg="#D1FAE5" />
                  <MetricCard label="TRANSACTIONS" value={collections.length} icon="ti-receipt" color="#8B5CF6" bg="#EDE9FE" />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  {/* Timeline Chart */}
                  <div className="kpi-anim-wrapper" style={{ background: '#fff', borderRadius: 12, padding: '24px', border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                      <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Collection Trend</p>
                      <i className="ti ti-chart-line" style={{ color: '#10B981', fontSize: '1.2rem' }}></i>
                    </div>
                    <div style={{ height: 220, width: '100%' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={collectionChartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748B' }} dy={10} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748B' }} tickFormatter={(val) => `₱${val >= 1000 ? (val / 1000).toFixed(1).replace('.0', '') + 'k' : val}`} width={60} />
                          <Tooltip formatter={(val: any) => `₱${Number(val).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                          <Line type="monotone" dataKey="Collected" stroke="#10B981" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Method Breakdown */}
                  <div className="kpi-anim-wrapper" style={{ background: '#fff', borderRadius: 12, padding: '24px', border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                      <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Method Breakdown</p>
                      <i className="ti ti-chart-pie" style={{ color: '#0EA5E9', fontSize: '1.2rem' }}></i>
                    </div>

                    {Object.keys(methodBreakdown).length > 0 ? (
                      <div style={{ display: 'flex', alignItems: 'center', flex: 1, gap: '20px' }}>
                        <div style={{ width: 140, height: 140, flexShrink: 0 }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={Object.entries(methodBreakdown).map(([method, amount]) => {
                                  let color = '#3B82F6';
                                  const lower = method.toLowerCase();
                                  if (lower.includes('gcash')) color = '#2563EB';
                                  else if (lower.includes('maya')) color = '#10B981';
                                  else if (lower.includes('check')) color = '#F59E0B';
                                  else if (lower.includes('bank')) color = '#8B5CF6';
                                  return { name: method, value: amount, color };
                                })}
                                cx="50%" cy="50%" innerRadius={45} outerRadius={65} paddingAngle={3} dataKey="value" stroke="none"
                              >
                                {Object.entries(methodBreakdown).map(([method, _], index) => {
                                  let color = '#3B82F6';
                                  const lower = method.toLowerCase();
                                  if (lower.includes('gcash')) color = '#2563EB';
                                  else if (lower.includes('maya')) color = '#10B981';
                                  else if (lower.includes('check')) color = '#F59E0B';
                                  else if (lower.includes('bank')) color = '#8B5CF6';
                                  return <Cell key={`cell-${index}`} fill={color} />;
                                })}
                              </Pie>
                              <Tooltip formatter={(val: any) => `₱${Number(val).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '12px', fontWeight: 600 }} />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, justifyContent: 'center' }}>
                          {Object.entries(methodBreakdown).map(([method, amount]: [string, any]) => {
                            let color = '#3B82F6'; let bg = '#EFF6FF';
                            const lower = method.toLowerCase();
                            if (lower.includes('gcash')) { color = '#2563EB'; bg = '#DBEAFE'; }
                            else if (lower.includes('maya')) { color = '#10B981'; bg = '#D1FAE5'; }
                            else if (lower.includes('check')) { color = '#F59E0B'; bg = '#FEF3C7'; }
                            else if (lower.includes('bank')) { color = '#8B5CF6'; bg = '#EDE9FE'; }
                            return (
                              <div key={method} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: bg, padding: '6px 10px', borderRadius: '6px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
                                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#1E293B' }}>{method}</span>
                                </div>
                                <span style={{ fontSize: '0.85rem', fontWeight: 800, color }}>₱{amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
                        <span style={{ fontSize: '0.9rem', color: '#94A3B8', fontWeight: 500 }}>No collections recorded.</span>
                      </div>
                    )}
                  </div>
                </div>

                <TableContainer>
                  <DataTable
                    title="Collection Report"
                    data={collections}
                    columns={selectedClientId ? collectionColumns : collectionColumns.filter(c => !['id', 'invoiceNumber', 'paymentMethod'].includes(c.key))}
                    rowKey="id"
                    exportable={true}
                    columnToggle={true}
                    densityToggle={true}
                    searchPlaceholder="Search collections (Payment ID, Invoice, Method)..."
                    searchFields={['id', 'invoiceNumber', 'clientName', 'paymentMethod']}
                  />
                </TableContainer>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export const Reports: React.FC = () => (
  <ErrorBoundary>
    <ReportsContent />
  </ErrorBoundary>
);

export default Reports;
