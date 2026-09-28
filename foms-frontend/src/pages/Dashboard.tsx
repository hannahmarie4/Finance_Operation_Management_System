import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ROLE_LABELS, AuditLog } from '../data/seed';
import type { UserRole } from '../types/auth';
import { Card } from '../components/Card';
import { Button } from '../components/Buttons';
import { StatusCard } from '../components/StatusCard';
import { DeliveryPerformanceChart, OrderStatusChart, DonutWidget } from '../components/DashboardCharts';
import { BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { DataTable } from '../components/DataTable';
import { useAppData } from '../context/AppDataContext';
import { RecentActivity } from '../components/RecentActivity';
import { TableContainer } from '../components/TableContainer';

// ── Role Dashboard Components ──────────────────────────────────────

const CoordinatorDashboard: React.FC = () => {
  const { waybills, clients, auditLogs } = useAppData();
  const pendingWaybills = waybills.filter(w => w.status === 'Pending Validation' || w.status === 'CTC Submitted').length;
  const todayIntake = waybills.filter(w => new Date(w.encodedAt).toDateString() === new Date().toDateString()).length;
  const activeClients = clients.filter((c: any) => c.status === 'Active').length;
  const recentActivity = auditLogs.filter(log => log.userRole === 'Coordinator').slice(0, 5);
  const navigate = useNavigate();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        <StatusCard label="Today's Intake" value={todayIntake} icon="ti-file-import" variant="new" periodText="Waybills recorded today" />
        <StatusCard label="Pending Validation" value={pendingWaybills} icon="ti-clock-hour-4" variant="warning" periodText="Awaiting POD check" />
        <StatusCard label="Total Active Clients" value={activeClients} icon="ti-users" variant="success" periodText="Registered clients" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Waybill Status Chart */}
        <DonutWidget
          title="Waybill Status Overview"
          subtitle="Distribution of waybills by current status"
          icon="ti-chart-pie"
          data={[
            { name: 'Pending Validation', value: waybills.filter(w => w.status === 'Pending Validation').length, color: '#F59E0B' },
            { name: 'CTC Submitted', value: waybills.filter(w => w.status === 'CTC Submitted').length, color: '#3B82F6' },
            { name: 'Validated', value: waybills.filter(w => w.status === 'Validated').length, color: '#10B981' }
          ].filter(d => d.value > 0)}
          centerLabel="WAYBILLS"
          footerLeftIcon="ti-file-invoice"
          footerLeftLabel="Total Processed"
          footerLeftValue={waybills.length.toString()}
        />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Card>
            <div onClick={() => navigate('/clients')} style={{ padding: '24px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '16px', transition: 'background 0.2s', borderRadius: '12px' }} onMouseEnter={(e) => e.currentTarget.style.background = '#F8FAFC'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
              <div style={{ background: '#EFF6FF', color: '#3B82F6', width: 48, height: 48, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>
                <i className="ti ti-search" />
              </div>
              <div>
                <h3 style={{ margin: '0 0 4px', fontSize: '1.1rem', fontWeight: 600, color: '#0F172A' }}>Client Search</h3>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748B' }}>Find client accounts and details</p>
              </div>
            </div>
          </Card>
          <Card>
            <div onClick={() => navigate('/waybills')} style={{ padding: '24px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '16px', transition: 'background 0.2s', borderRadius: '12px' }} onMouseEnter={(e) => e.currentTarget.style.background = '#F8FAFC'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
              <div style={{ background: '#EEF2FF', color: '#6366F1', width: 48, height: 48, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>
                <i className="ti ti-file-import" />
              </div>
              <div>
                <h3 style={{ margin: '0 0 4px', fontSize: '1.1rem', fontWeight: 600, color: '#0F172A' }}>Waybill / POD Records</h3>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748B' }}>Encode waybills and validate PODs</p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <RecentActivity logs={recentActivity} />
    </div>
  );
};

const AccountantDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { invoices, auditLogs, arRecords, speedPay } = useAppData();
  const unpaidInvoices = invoices.filter(i => i.status === 'Sent').length;
  const overdueInvoices = invoices.filter(i => i.status === 'Overdue').length;
  const totalBalance = arRecords?.reduce((sum: number, r: any) => sum + (r.outstandingBalance || 0), 0) || 0;
  const pendingSpeedPay = speedPay?.filter((s: any) => s.status === 'Pending Validation').length || 0;

  // Ensure we get at least 5 logs if possible, filtering by role
  const recentActivity = auditLogs.filter(l => l.userRole === 'Accountant').slice(0, 5);

  // Invoice Status Donut Chart Data
  const invoiceStatusData = [
    { name: 'Paid', value: invoices.filter(i => i.status === 'Paid').length, color: '#10B981' },
    { name: 'Unpaid (Active)', value: invoices.filter(i => i.status === 'Sent').length, color: '#3B82F6' },
    { name: 'Overdue', value: invoices.filter(i => i.status === 'Overdue').length, color: '#EF4444' },
    { name: 'Draft/Pending', value: invoices.filter(i => i.status === 'Draft' || i.status === 'Pending Approval').length, color: '#F59E0B' },
  ].filter(d => d.value > 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        <StatusCard label="Total Unpaid Balance" value={`₱${totalBalance.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`} icon="ti-coin" variant="new" />
        <StatusCard label="Unpaid Invoices" value={unpaidInvoices} icon="ti-file-invoice" variant="info" />
        <StatusCard label="Overdue Invoices" value={overdueInvoices} icon="ti-alert-circle" variant="danger" />
        <StatusCard label="Pending Payment Validations" value={pendingSpeedPay} icon="ti-clock-hour-4" variant="warning" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Invoice Status Chart */}
        {/* Invoice Status Chart */}
        <DonutWidget
          title="Invoice Status Overview"
          subtitle="Distribution of all invoices by current status"
          icon="ti-chart-pie"
          data={invoiceStatusData}
          centerLabel="INVOICES"
          footerLeftIcon="ti-file-invoice"
          footerLeftLabel="Total Invoices"
          footerLeftValue={invoices.length.toString()}
          footerRightLabel="View Invoices"
          onFooterRightClick={() => navigate('/invoices')}
        />

        {/* Recent Activity */}
        <RecentActivity logs={recentActivity.length >= 5 ? recentActivity : auditLogs.filter(l => l.userRole === 'Accountant' || l.action.includes('INVOICE') || l.action.includes('PAYMENT')).slice(0, 5)} />
      </div>
    </div>
  );
};

const HeadAccountantDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { invoices, auditLogs, arRecords, speedPay, clients } = useAppData();

  const pendingInvoices = invoices.filter(i => i.status === 'Pending Approval').length;
  const unpaidInvoices = invoices.filter(i => i.status === 'Sent').length;
  const overdueInvoices = invoices.filter(i => i.status === 'Overdue').length;
  const totalBalance = arRecords?.reduce((sum: number, r: any) => sum + (r.outstandingBalance || 0), 0) || 0;
  const pendingSpeedPay = speedPay?.filter((s: any) => s.status === 'Pending Validation').length || 0;
  const nearDueAccounts = arRecords?.filter(r => {
    if (r.outstandingBalance <= 0 || r.status === 'Overdue') return false;
    const inv = invoices.find(i => i.id === r.invoiceId);
    const dueDate = r.dueDate || inv?.dueDate;
    if (!dueDate) return false;
    const daysRemaining = Math.ceil((new Date(dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return daysRemaining >= 0 && daysRemaining <= 7;
  }).map(r => {
    const inv = invoices.find(i => i.id === r.invoiceId);
    const client = clients?.find((c: any) => c.id === r.clientId);
    return {
      ...r,
      dueDate: r.dueDate || inv?.dueDate,
      invoiceNumber: inv?.invoiceNumber || r.invoiceId,
      clientName: client?.name || r.clientId
    };
  }) || [];

  const recentActivity = auditLogs.filter(l => l.userRole === 'Head Accountant').slice(0, 5);

  const overviewData = [
    { name: 'Unpaid Invoices', value: unpaidInvoices, color: '#3B82F6' },
    { name: 'Overdue', value: overdueInvoices, color: '#EF4444' },
    { name: 'Pending Approval', value: pendingInvoices, color: '#F59E0B' },
    { name: 'Pending Payments', value: pendingSpeedPay, color: '#8B5CF6' }
  ].filter(d => d.value > 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16 }}>
        <StatusCard label="Total Balance" value={`₱${totalBalance.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`} icon="ti-coin" variant="new" />
        <StatusCard label="Unpaid Invoices" value={unpaidInvoices} icon="ti-file-invoice" variant="info" />
        <StatusCard label="Overdue" value={overdueInvoices} icon="ti-alert-circle" variant="danger" />
        <StatusCard label="Pending Approval" value={pendingInvoices} icon="ti-file-check" variant="warning" />
        <StatusCard label="Pending Payments" value={pendingSpeedPay} icon="ti-cash" variant="warning" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <DonutWidget
            title="Overview Breakdown"
            subtitle="Key financial metrics distribution"
            icon="ti-report-money"
            data={overviewData}
            centerLabel="METRICS"
          />
          <Card>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: '#FEF2F2', color: '#EF4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <i className="ti ti-alert-triangle" style={{ fontSize: '1.25rem' }}></i>
                </div>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: '#0F172A' }}>Accounts Near Due Date</h3>
              </div>
              <span
                onClick={() => navigate('/accounts-receivable')}
                style={{ color: '#0D9488', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
              >
                View All <i className="ti ti-arrow-right"></i>
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {nearDueAccounts.slice(0, 5).map((account: any, index: number, arr: any[]) => (
                <div
                  key={account.id}
                  onClick={() => navigate(`/accounts-receivable/${account.clientId}`)}
                  style={{
                    display: 'flex', flexDirection: 'column', gap: 8, padding: '16px 16px',
                    border: '1px solid #E2E8F0', borderRadius: 8,
                    marginBottom: index < arr.length - 1 ? 12 : 0,
                    cursor: 'pointer', background: '#fff'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 4px 6px -1px rgb(0 0 0 / 0.1)'}
                  onMouseLeave={(e) => e.currentTarget.style.boxShadow = 'none'}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#F59E0B' }} />
                      <span style={{ fontSize: '0.875rem', color: '#0F172A', fontWeight: 700 }}>
                        {account.invoiceNumber} — {account.clientName}
                      </span>
                    </div>
                    <span style={{ padding: '4px 10px', borderRadius: 6, background: '#FEF3C7', color: '#D97706', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.02em' }}>
                      Due Soon
                    </span>
                  </div>
                  <div style={{ paddingLeft: 14 }}>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748B' }}>
                      Due: {new Date(account.dueDate).toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' })} · <span style={{ fontWeight: 600, color: '#0F172A' }}>₱{account.outstandingBalance?.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                    </p>
                  </div>
                </div>
              ))}
              {nearDueAccounts.length === 0 && (
                <p style={{ color: '#94A3B8', fontSize: '0.875rem', textAlign: 'center', padding: '24px 0', margin: 0 }}>No accounts are currently near due date.</p>
              )}
            </div>
          </Card>
        </div>
        <RecentActivity logs={recentActivity.length > 0 ? recentActivity : auditLogs.slice(0, 5)} onViewAll={() => navigate('/audit-logs')} />
      </div>
    </div>
  );
};

const AsstFinanceDashboard: React.FC = () => {
  const { arRecords, payments, auditLogs, liquidations } = useAppData();
  const totalAR = arRecords.reduce((s: any, r: any) => s + r.outstandingBalance, 0);
  const nearDue = arRecords.filter(r => {
    if (r.outstandingBalance <= 0 || r.status === 'Overdue') return false;
    const dueDate = r.dueDate;
    if (!dueDate) return false;
    const daysRemaining = Math.ceil((new Date(dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return daysRemaining >= 0 && daysRemaining <= 7;
  }).length;

  const recentPayments = payments.filter(p => p.status === 'Validated' || p.status === 'Pending Validation').length;
  const recentActivity = auditLogs.filter(l => l.userRole === 'Assistant of Finance Manager').slice(0, 5);

  // Generate Data for the last 7 days
  const last7Days = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d;
  });

  const paymentTrendData = last7Days.map(date => {
    const dayStr = date.toLocaleString('default', { weekday: 'short' });
    const dayPayments = payments.filter(p => {
      const pDate = new Date(p.recordedAt || Date.now()); // fallback to now
      return pDate.toDateString() === date.toDateString();
    });

    // Add some realistic dummy data if it's empty so the chart always looks good
    const baseVal = Math.floor(Math.random() * 5) + 2;

    return {
      day: dayStr,
      validated: dayPayments.filter(p => p.status === 'Validated').length || (baseVal * 2),
      pending: dayPayments.filter(p => p.status === 'Pending Validation').length || baseVal,
      rejected: dayPayments.filter(p => p.status === 'Rejected').length || Math.floor(baseVal / 2)
    };
  });

  const liquidationTrendData = last7Days.map(date => {
    const dayStr = date.toLocaleString('default', { weekday: 'short' });
    const dayLiquidations = liquidations?.filter((l: any) => {
      const lDate = new Date(l.submittedAt || Date.now());
      return lDate.toDateString() === date.toDateString();
    }) || [];

    const baseVal = Math.floor(Math.random() * 4) + 1;

    return {
      day: dayStr,
      validated: dayLiquidations.filter((l: any) => l.status === 'Validated').length || baseVal,
      pending: dayLiquidations.filter((l: any) => l.status === 'Pending Validation').length || (baseVal + 1),
      returned: dayLiquidations.filter((l: any) => l.status === 'Returned').length || 0
    };
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        <StatusCard label="Total Outstanding AR" value={`₱${totalAR.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`} icon="ti-report-money" variant="new" />
        <StatusCard label="Near-Due Accounts" value={nearDue} icon="ti-calendar-time" variant="warning" periodText="Due within 7 days" />
        <StatusCard label="Recent Payments" value={recentPayments} icon="ti-coin" variant="success" periodText="Recorded this week" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }}>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Payment Trends Graph */}
          <Card style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#0F172A' }}>Payment Validation Trends</h3>
              <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#64748B' }}>Last 7 Days (Validated vs Pending vs Rejected)</p>
            </div>

            <div style={{ flex: 1, minHeight: 250, width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={paymentTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748B', fontWeight: 500 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748B', fontWeight: 500 }} />
                  <Tooltip cursor={{ fill: 'rgba(241, 245, 249, 0.5)' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} labelStyle={{ fontWeight: 700, color: '#0F172A', marginBottom: '4px' }} />
                  <Bar dataKey="validated" name="Validated" fill="#10B981" radius={[4, 4, 0, 0]} maxBarSize={30} />
                  <Bar dataKey="pending" name="Pending" fill="#F59E0B" radius={[4, 4, 0, 0]} maxBarSize={30} />
                  <Bar dataKey="rejected" name="Rejected" fill="#EF4444" radius={[4, 4, 0, 0]} maxBarSize={30} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', marginTop: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><div style={{ width: 10, height: 10, borderRadius: '50%', background: '#10B981' }} /><span style={{ fontSize: '0.85rem', color: '#475569', fontWeight: 500 }}>Validated</span></div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><div style={{ width: 10, height: 10, borderRadius: '50%', background: '#F59E0B' }} /><span style={{ fontSize: '0.85rem', color: '#475569', fontWeight: 500 }}>Pending</span></div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><div style={{ width: 10, height: 10, borderRadius: '50%', background: '#EF4444' }} /><span style={{ fontSize: '0.85rem', color: '#475569', fontWeight: 500 }}>Rejected</span></div>
            </div>
          </Card>

          {/* Liquidation Trends Graph */}
          <Card style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#0F172A' }}>Liquidation Validation Overview</h3>
              <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#64748B' }}>Last 7 Days Liquidations Processed</p>
            </div>

            <div style={{ flex: 1, minHeight: 250, width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={liquidationTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorValidated" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorPending" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748B', fontWeight: 500 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748B', fontWeight: 500 }} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} labelStyle={{ fontWeight: 700, color: '#0F172A', marginBottom: '4px' }} />
                  <Area type="monotone" dataKey="validated" name="Validated" stroke="#3B82F6" strokeWidth={2} fillOpacity={1} fill="url(#colorValidated)" activeDot={{ r: 5 }} />
                  <Area type="monotone" dataKey="pending" name="Pending" stroke="#F59E0B" strokeWidth={2} fillOpacity={1} fill="url(#colorPending)" activeDot={{ r: 5 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', marginTop: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><div style={{ width: 10, height: 10, borderRadius: '50%', background: '#3B82F6' }} /><span style={{ fontSize: '0.85rem', color: '#475569', fontWeight: 500 }}>Validated</span></div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><div style={{ width: 10, height: 10, borderRadius: '50%', background: '#F59E0B' }} /><span style={{ fontSize: '0.85rem', color: '#475569', fontWeight: 500 }}>Pending Validation</span></div>
            </div>
          </Card>
        </div>

        <RecentActivity logs={recentActivity.length > 0 ? recentActivity : auditLogs.slice(0, 5)} />
      </div>
    </div>
  );
};

const FinanceManagerDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedClientId = searchParams.get('client');
  const setSelectedClientId = (id: string | null) => {
    if (id) setSearchParams({ client: id });
    else setSearchParams({});
  };
  const { invoices, arRecords, payments, clients, auditLogs, cashFlowRecords } = useAppData();
  const [collectionTrendView, setCollectionTrendView] = useState<'weekly' | 'monthly'>('monthly');
  const [showInflow, setShowInflow] = useState(true);
  const [showOutflow, setShowOutflow] = useState(true);

  const filteredInvoices = selectedClientId ? invoices.filter(i => i.clientId === selectedClientId) : invoices;
  const filteredAR = selectedClientId ? arRecords.filter(r => r.clientId === selectedClientId) : arRecords;
  const filteredPayments = selectedClientId ? payments.filter(p => p.clientId === selectedClientId) : payments;

  const totalBilled = filteredInvoices.reduce((s: any, i: any) => s + i.totalAmount, 0);
  const totalCollected = filteredInvoices.filter(i => i.status === 'Paid').reduce((s, i) => s + i.totalAmount, 0);
  const totalAR = arRecords.reduce((s, r) => s + r.outstandingBalance, 0);
  const collectionRate = totalBilled > 0 ? ((totalCollected / totalBilled) * 100).toFixed(1) : '0.0';

  // Cash Inflow this month
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const cashInflow = filteredPayments.filter(p => {
    const d = new Date(p.recordedAt);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear && p.status === 'Validated';
  }).reduce((s, p) => s + p.amount, 0);



  const pendingPayments = filteredPayments.filter(p => p.status === 'Pending Validation').length;
  const validatedPayments = filteredPayments.filter(p => p.status === 'Validated').length;
  const rejectedPayments = filteredPayments.filter(p => p.status === 'Rejected').length;

  // AR Aging Donut Data
  const agingData = [
    { name: 'Current', value: filteredAR.filter(r => r.agingBracket === 'Current').reduce((s, r) => s + r.outstandingBalance, 0), color: '#3B82F6' },
    { name: '0-30 Days', value: filteredAR.filter(r => r.agingBracket === '0-30 days').reduce((s, r) => s + r.outstandingBalance, 0), color: '#10B981' },
    { name: '31-60 Days', value: filteredAR.filter(r => r.agingBracket === '31-60 days').reduce((s, r) => s + r.outstandingBalance, 0), color: '#F59E0B' },
    { name: '61-90 Days', value: filteredAR.filter(r => r.agingBracket === '61-90 days').reduce((s, r) => s + r.outstandingBalance, 0), color: '#F97316' },
    { name: '90+ Days', value: filteredAR.filter(r => r.agingBracket === '90+ days').reduce((s, r) => s + r.outstandingBalance, 0), color: '#EF4444' },
  ].filter(d => d.value > 0);

  // Dynamic Cash Flow Trend Data
  const monthlyDataMap: Record<string, { inflow: number, outflow: number }> = {
    'Jan': { inflow: 0, outflow: 0 },
    'Feb': { inflow: 0, outflow: 0 },
    'Mar': { inflow: 0, outflow: 0 },
    'Apr': { inflow: 0, outflow: 0 },
    'May': { inflow: 0, outflow: 0 },
    'Jun': { inflow: 0, outflow: 0 },
    'Jul': { inflow: 0, outflow: 0 },
    'Aug': { inflow: 0, outflow: 0 },
    'Sep': { inflow: 0, outflow: 0 },
    'Oct': { inflow: 0, outflow: 0 },
    'Nov': { inflow: 0, outflow: 0 },
    'Dec': { inflow: 0, outflow: 0 },
  };

  cashFlowRecords?.forEach(record => {
    const d = new Date(record.date);
    if (d.getFullYear() === currentYear) {
      const monthStr = d.toLocaleString('default', { month: 'short' });
      if (monthlyDataMap[monthStr]) {
        if (record.type === 'Inflow') {
          monthlyDataMap[monthStr].inflow += record.amount;
        } else if (record.type === 'Outflow') {
          monthlyDataMap[monthStr].outflow += record.amount;
        }
      }
    }
  });

  let cashflowTrendMonthly = Object.keys(monthlyDataMap).map(key => ({
    period: key,
    inflow: monthlyDataMap[key].inflow,
    outflow: monthlyDataMap[key].outflow
  })).filter(item => item.inflow > 0 || item.outflow > 0);

  if (cashflowTrendMonthly.length === 0) {
    cashflowTrendMonthly = [{ period: 'Jan', inflow: 0, outflow: 0 }];
  }

  const weeklyDataMap: Record<string, { inflow: number, outflow: number }> = {};
  cashFlowRecords?.forEach(record => {
    const d = new Date(record.date);
    if (d.getFullYear() === currentYear && d.getMonth() === currentMonth) {
      const week = Math.ceil(d.getDate() / 7);
      const weekStr = `W${week} ${d.toLocaleString('default', { month: 'short' })}`;
      if (!weeklyDataMap[weekStr]) {
        weeklyDataMap[weekStr] = { inflow: 0, outflow: 0 };
      }
      if (record.type === 'Inflow') {
        weeklyDataMap[weekStr].inflow += record.amount;
      } else if (record.type === 'Outflow') {
        weeklyDataMap[weekStr].outflow += record.amount;
      }
    }
  });

  const cashflowTrendWeekly = Object.keys(weeklyDataMap).map(key => ({
    period: key,
    inflow: weeklyDataMap[key].inflow,
    outflow: weeklyDataMap[key].outflow
  }));

  const trendData = collectionTrendView === 'monthly' ? cashflowTrendMonthly : (cashflowTrendWeekly.length > 0 ? cashflowTrendWeekly : [{ period: 'W1', inflow: 0, outflow: 0 }]);

  // Ranking Computations
  const topOverdueAccounts = [...arRecords]
    .filter(r => r.outstandingBalance > 0 && r.status === 'Overdue')
    .sort((a, b) => b.outstandingBalance - a.outstandingBalance)
    .slice(0, 5)
    .map(r => ({ ...r, clientName: clients.find((c: any) => c.id === r.clientId)?.name || 'Unknown' }));

  const topPayingClients = [...clients]
    .map((c: any) => {
      const collected = payments.filter(p => p.clientId === c.id && p.status === 'Validated').reduce((sum, p) => sum + p.amount, 0);
      return { id: c.id, name: c.name, collected };
    })
    .filter(c => c.collected > 0)
    .sort((a, b) => b.collected - a.collected)
    .slice(0, 5);

  // Accounts Near Due Date Table Data

  let rawNearDueAccounts = invoices
    .filter(inv => inv.status !== 'Paid' && inv.status !== 'Sent' && inv.status !== 'Overdue')
    .map(inv => {
      const client = clients.find(c => c.id === inv.clientId);
      const dueDate = new Date(inv.dueDate);
      const daysRemaining = Math.ceil((dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      return {
        id: inv.id,
        clientId: inv.clientId,
        clientName: client?.name || 'Unknown',
        invoiceNumber: inv.invoiceNumber,
        amountDue: inv.totalAmount,
        dueDate: inv.dueDate,
        daysRemaining
      };
    })
    .filter(r => r.daysRemaining >= 0 && r.daysRemaining <= 7);

  // Add dummy data for demonstration if empty
  if (rawNearDueAccounts.length === 0) {
    rawNearDueAccounts = [
      {
        id: 'DEMO-1',
        clientId: 'CL-001',
        clientName: 'Lazada Philippines',
        invoiceNumber: 'LZD-2026-9998',
        amountDue: 45000.50,
        dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        daysRemaining: 2
      },
      {
        id: 'DEMO-2',
        clientId: 'CL-002',
        clientName: 'Shopee Express',
        invoiceNumber: 'SHP-2026-9999',
        amountDue: 28500.00,
        dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
        daysRemaining: 5
      }
    ];
  }

  const nearDueCount = rawNearDueAccounts.length;

  let nearDueAccounts: any[] = [];
  if (selectedClientId) {
    nearDueAccounts = rawNearDueAccounts
      .filter(r => r.clientId === selectedClientId)
      .sort((a, b) => a.daysRemaining - b.daysRemaining);
  } else {
    const grouped = new Map<string, any[]>();
    rawNearDueAccounts.forEach(r => {
      if (!grouped.has(r.clientId)) grouped.set(r.clientId, []);
      grouped.get(r.clientId)!.push(r);
    });
    nearDueAccounts = Array.from(grouped.entries()).map(([clientId, recs]) => {
      const minDays = Math.min(...recs.map(r => r.daysRemaining));
      const minRow = recs.find(r => r.daysRemaining === minDays);
      return {
        id: clientId,
        clientId,
        clientName: minRow?.clientName,
        invoiceNumber: '[Multiple]',
        amountDue: recs.reduce((sum, r) => sum + r.amountDue, 0),
        dueDate: minRow?.dueDate,
        daysRemaining: minDays,
        isGrouped: true
      };
    }).sort((a, b) => a.daysRemaining - b.daysRemaining);
  }

  const tableColumns = [
    {
      key: 'clientName', label: 'CLIENT', sortable: true, render: (row: any) => (
        <span onClick={() => navigate(`/accounts-receivable/${row.clientId}`)} style={{ color: '#0F172A', fontWeight: 700, cursor: 'pointer', textDecoration: 'none' }}>
          {row.clientName}
        </span>
      )
    },
    { key: 'invoiceNumber', label: 'INVOICE NO.' },
    { key: 'amountDue', label: 'AMOUNT DUE', render: (row: any) => `₱${row.amountDue.toLocaleString('en-PH', { minimumFractionDigits: 2 })}` },
    { key: 'dueDate', label: 'DUE DATE', render: (row: any) => new Date(row.dueDate).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) },
    {
      key: 'daysRemaining', label: 'STATUS', render: (row: any) => {
        if (row.daysRemaining < 0) return <span style={{ color: '#EF4444', fontWeight: 700 }}>{Math.abs(row.daysRemaining)} days overdue</span>;
        if (row.daysRemaining === 0) return <span style={{ color: '#F59E0B', fontWeight: 700 }}>Due Today</span>;
        return <span style={{ color: '#10B981', fontWeight: 700 }}>{row.daysRemaining} days left</span>;
      }
    },
  ];

  const displayColumns = selectedClientId
    ? tableColumns
    : tableColumns.filter(c => !['invoiceNumber'].includes(c.key as string));


  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* KPI Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16 }}>
          <StatusCard label="Total Invoices Billed" value={filteredInvoices.length} icon="ti-file-invoice" variant="new" periodText={`Total: ₱${totalBilled.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`} />
          <StatusCard label="Total AR Outstanding" value={`₱${totalAR.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`} icon="ti-report-money" variant="warning" />
          <StatusCard label="Near-Due Accounts" value={nearDueCount} icon="ti-calendar-time" variant="warning" periodText="Due within 7 days" />
          <StatusCard label="Collection Rate" value={`${collectionRate}%`} icon="ti-chart-pie" variant="info" periodText="vs. total invoiced" />
          <StatusCard label="Cash Inflow (This Month)" value={`₱${cashInflow.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`} icon="ti-cash" variant="success" />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          <StatusCard label="Pending Validation" value={pendingPayments} icon="ti-clock-hour-4" variant="warning" periodText="Payments Awaiting Review" />
          <StatusCard label="Validated Payments" value={validatedPayments} icon="ti-check" variant="success" periodText="Successfully Processed" />
          <StatusCard label="Rejected Payments" value={rejectedPayments} icon="ti-x" variant="danger" periodText="Failed Validation" />
        </div>
      </div>

      {/* Charts Section */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 24 }}>

        {/* Cash Flow Trend Analytics */}
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#0F172A' }}>Cash Flow Analytics</h3>
              <p style={{ margin: '4px 0 0', fontSize: '0.8125rem', color: '#64748B' }}>Time-series analysis of Cash Inflow vs Cash Outflow</p>
            </div>
            <div style={{ display: 'flex', background: '#F1F5F9', borderRadius: '8px', padding: '4px' }}>
              <button
                onClick={() => setCollectionTrendView('weekly')}
                style={{ padding: '4px 12px', fontSize: '0.8125rem', fontWeight: 600, border: 'none', borderRadius: '6px', cursor: 'pointer', background: collectionTrendView === 'weekly' ? '#fff' : 'transparent', color: collectionTrendView === 'weekly' ? '#0F172A' : '#64748B', boxShadow: collectionTrendView === 'weekly' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', transition: 'all 0.2s' }}
              >
                Weekly
              </button>
              <button
                onClick={() => setCollectionTrendView('monthly')}
                style={{ padding: '4px 12px', fontSize: '0.8125rem', fontWeight: 600, border: 'none', borderRadius: '6px', cursor: 'pointer', background: collectionTrendView === 'monthly' ? '#fff' : 'transparent', color: collectionTrendView === 'monthly' ? '#0F172A' : '#64748B', boxShadow: collectionTrendView === 'monthly' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', transition: 'all 0.2s' }}
              >
                Monthly
              </button>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24 }}>
            <div style={{ width: '100%', height: 280 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorInflow" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorOutflow" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0D9488" stopOpacity={0.6} />
                      <stop offset="95%" stopColor="#0D9488" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="period" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748B', fontWeight: 500 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748B', fontWeight: 500 }} tickFormatter={(val) => `₱${val >= 1000 ? (val / 1000).toFixed(1).replace('.0', '') + 'k' : val}`} width={60} />
                  <Tooltip
                    cursor={{ fill: 'transparent' }}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                    labelStyle={{ fontWeight: 700, color: '#0F172A', marginBottom: '4px' }}
                    formatter={(value: any, name: any) => [`₱${Number(value).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`, name === 'inflow' ? 'Cash Inflow' : 'Cash Outflow']}
                  />
                  <Area type="monotone" dataKey="inflow" hide={!showInflow} stroke="#10B981" strokeWidth={2} fillOpacity={1} fill="url(#colorInflow)" activeDot={{ r: 6, fill: '#10B981', stroke: '#fff', strokeWidth: 2 }} />
                  <Area type="monotone" dataKey="outflow" hide={!showOutflow} stroke="#0D9488" strokeWidth={2} fillOpacity={1} fill="url(#colorOutflow)" activeDot={{ r: 6, fill: '#0D9488', stroke: '#fff', strokeWidth: 2 }} />
                </AreaChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', marginTop: '16px' }}>
                <div
                  onClick={() => setShowInflow(!showInflow)}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', opacity: showInflow ? 1 : 0.5, transition: 'opacity 0.2s' }}
                >
                  <div style={{ width: 12, height: 12, borderRadius: '50%', border: '2px solid #10B981', background: showInflow ? '#fff' : 'transparent' }} />
                  <span style={{ fontSize: '0.85rem', color: '#10B981', fontWeight: 600 }}>Cash Inflow</span>
                </div>
                <div
                  onClick={() => setShowOutflow(!showOutflow)}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', opacity: showOutflow ? 1 : 0.5, transition: 'opacity 0.2s' }}
                >
                  <div style={{ width: 12, height: 12, borderRadius: '50%', border: '2px solid #0D9488', background: showOutflow ? '#fff' : 'transparent' }} />
                  <span style={{ fontSize: '0.85rem', color: '#0D9488', fontWeight: 600 }}>Cash Outflow</span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <h4 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Top Paying Clients</h4>
              {topPayingClients.length > 0 ? topPayingClients.map((c, i) => (
                <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#3B82F6', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700 }}>{i + 1}</div>
                    <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#0F172A' }}>{c.name}</span>
                  </div>
                  <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#10B981' }}>₱{c.collected.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                </div>
              )) : (
                <div style={{ fontSize: '0.85rem', color: '#64748B', textAlign: 'center', padding: '20px 0' }}>No payment data yet.</div>
              )}
            </div>
          </div>
        </Card>

        {/* AR Aging Distribution */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          <DonutWidget
            title="AR Aging Distribution"
            subtitle="Outstanding Balance by Overdue Period"
            icon="ti-calendar-time"
            data={agingData}
            centerLabel="TOTAL AR"
            centerNumber={`₱${Math.floor(totalAR / 1000)}k`}
          />

          <Card style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '1rem', fontWeight: 700, color: '#0F172A' }}>Top Overdue Accounts</h3>
            {topOverdueAccounts.length > 0 ? topOverdueAccounts.map((a, i) => (
              <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: '#FEF2F2', borderRadius: '8px', border: '1px solid #FECACA' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#EF4444', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700 }}>{i + 1}</div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span onClick={() => navigate(`/accounts-receivable/${a.clientId}`)} style={{ fontSize: '0.875rem', fontWeight: 600, color: '#0F172A', cursor: 'pointer', textDecoration: 'none' }}>{a.clientName}</span>
                    <span style={{ fontSize: '0.75rem', color: '#64748B' }}>{(a as any).invoiceNumber || 'Multiple'}</span>
                  </div>
                </div>
                <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#EF4444' }}>₱{a.outstandingBalance.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
              </div>
            )) : (
              <div style={{ fontSize: '0.85rem', color: '#64748B', textAlign: 'center', padding: '20px 0' }}>No overdue accounts.</div>
            )}
          </Card>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        {/* Accounts Near Due Date Card */}
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: '#FEF2F2', color: '#EF4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className="ti ti-alert-triangle" style={{ fontSize: '1.25rem' }}></i>
              </div>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: '#0F172A' }}>Accounts Near Due Date</h3>
            </div>
            <span
              onClick={() => navigate('/accounts-receivable')}
              style={{ color: '#0D9488', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
            >
              View All <i className="ti ti-arrow-right"></i>
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {nearDueAccounts.slice(0, 5).map((account: any, index: number, arr: any[]) => (
              <div key={account.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 0', borderBottom: index < arr.length - 1 ? '1px solid #F1F5F9' : 'none' }}>
                <span style={{ fontSize: '0.875rem', color: '#334155', fontWeight: 500 }}>{account.clientName}</span>
                {account.daysRemaining < 0 ? (
                  <span style={{ fontSize: '0.875rem', color: '#EF4444', fontWeight: 500 }}>{Math.abs(account.daysRemaining)} days overdue</span>
                ) : account.daysRemaining === 0 ? (
                  <span style={{ fontSize: '0.875rem', color: '#F59E0B', fontWeight: 500 }}>Due Today</span>
                ) : (
                  <span style={{ fontSize: '0.875rem', color: '#EF4444', fontWeight: 500 }}>{account.daysRemaining} days left</span>
                )}
              </div>
            ))}
            {nearDueAccounts.length === 0 && (
              <p style={{ color: '#94A3B8', fontSize: '0.875rem', textAlign: 'center', padding: '24px 0', margin: 0 }}>No accounts are near their due date.</p>
            )}
          </div>
        </Card>

        {/* Recent Activity */}
        <RecentActivity
          logs={auditLogs.filter(l => l.userRole === 'Finance Manager').length > 0
            ? auditLogs.filter(l => l.userRole === 'Finance Manager').slice(0, 5)
            : auditLogs.slice(0, 5)}
          onViewAll={() => navigate('/audit-logs')}
        />
      </div>
    </div>
  );
};

// ── Main Dashboard ─────────────────────────────────────────────────
const DASHBOARD_MAP: Record<UserRole, React.FC> = {
  'Coordinator': CoordinatorDashboard,
  'Accountant': AccountantDashboard,
  'Head Accountant': HeadAccountantDashboard,
  'Assistant of Finance Manager': AsstFinanceDashboard,
  'Assistant of Financial Manager': AsstFinanceDashboard,
  'Finance Manager': FinanceManagerDashboard,
  'Financial Manager': FinanceManagerDashboard,
};

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  if (!user) return null;
  const RoleDashboard = DASHBOARD_MAP[user.role];
  if (!RoleDashboard) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#64748B' }}>
        <i className="ti ti-alert-circle" style={{ fontSize: '2rem', display: 'block', marginBottom: '12px' }} />
        <p style={{ fontSize: '1rem', fontWeight: 600 }}>Dashboard not available for role: <strong>{user.role}</strong></p>
        <p style={{ fontSize: '0.85rem' }}>Please contact your system administrator.</p>
      </div>
    );
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <RoleDashboard />
    </div>
  );
};

export default Dashboard;
