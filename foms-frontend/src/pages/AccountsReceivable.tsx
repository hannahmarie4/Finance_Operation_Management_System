import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { DataTable } from '../components/DataTable';
import { StatusBadge } from '../components/StatusBadge';
import { Card } from '../components/Card';
import { useAppData } from '../context/AppDataContext';
import { TableContainer } from '../components/TableContainer';
import { ClientInfoCard } from '../components/ClientInfoCard';
import { StatusCard } from '../components/StatusCard';



const safeDate = (val: any) => {
  if (!val) return '—';
  const d = new Date(val);
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const formatPeso = (n: number) =>
  `₱${n.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;

const agingBracketColor: Record<string, string> = {
  '0-30 days':   '#F59E0B',
  '31-60 days':  '#F97316',
  '61-90 days':  '#EF4444',
  '90+ days':    '#7C3AED',
};

const mapBracket = (bracket: string) => bracket === 'Current' ? '0-30 days' : bracket;

export const AccountsReceivable: React.FC = () => {
  const { user } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();
  const { arRecords, clients, invoices } = useAppData();



  // Only deal with unpaid records in Accounts Receivable
  const activeArRecords = arRecords.filter(r => r.outstandingBalance > 0);

  if (!user) return null;

  // ── Per-client detail view ──────────────────────────────────────────
  const client = clients.find(c => c.id === id);
  if (id && client) {
    const clientInvoices = activeArRecords
      .filter(r => r.clientId === id)
      .map((rec, index) => {
        const inv = invoices.find(i => i.id === rec.invoiceId);
        const dueDate = inv?.dueDate || rec.dueDate || null;
        const agingDays = dueDate
          ? Math.max(0, Math.floor((Date.now() - new Date(dueDate).getTime()) / (1000 * 60 * 60 * 24)))
          : 0;
        let invNo = inv?.invoiceNumber ?? rec.invoiceId;
        if (invNo.startsWith('DUMMY-INV-')) {
          invNo = `INV-${String(index + 1).padStart(3, '0')}`;
        }
        return {
          ...rec,
          invoiceNumber: invNo,
          invoiceDate: inv?.createdAt ?? rec.invoiceDate,
          dueDate,
          originalAmount: rec.originalAmount,
          paidAmount: rec.paidAmount,
          outstandingBalance: rec.outstandingBalance,
          agingDays,
          agingBracket: rec.agingBracket,
          status: rec.status,
          isPaid: rec.outstandingBalance === 0,
        };
      });

    const visibleData = clientInvoices;

    const totalOutstanding = visibleData.reduce((s, r) => s + r.outstandingBalance, 0);
    const totalOriginal = visibleData.reduce((s, r) => s + r.originalAmount, 0);

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <button 
          onClick={() => navigate('/accounts-receivable')}
          style={{ alignSelf: 'flex-start', background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600, padding: 0 }}
        >
          <i className="ti ti-arrow-left"></i> Back to Accounts Receivable
        </button>

        <ClientInfoCard client={client} />

        {/* Summary Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
          {[
            { label: 'Total Billed', value: formatPeso(totalOriginal), icon: 'ti-file-invoice', color: '#6366F1', bg: '#EEF2FF' },
            { label: 'Total Outstanding', value: formatPeso(totalOutstanding), icon: 'ti-clock-exclamation', color: '#EF4444', bg: '#FEF2F2' },
          ].map(card => (
            <div key={card.label} style={{ background: '#fff', borderRadius: 14, padding: '20px 24px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: card.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <i className={`ti ${card.icon}`} style={{ fontSize: 22, color: card.color }} />
              </div>
              <div>
                <div style={{ fontSize: '0.78rem', color: '#94A3B8', fontWeight: 600 }}>{card.label}</div>
                <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0F172A' }}>{card.value}</div>
              </div>
            </div>
          ))}
        </div>

        <Card>
          <div style={{ padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: '1rem', color: '#0F172A', fontWeight: 700 }}>Accounts Receivable History</h3>
            </div>
            <DataTable
              columns={[
                { key: 'invoiceNumber', label: 'INVOICE NO.', sortable: true, render: (row: any) => (
                  <span style={{ color: '#0F172A', fontWeight: 700 }}>
                    {row.invoiceNumber}
                  </span>
                )},
                { key: 'invoiceDate', label: 'INVOICE DATE', sortable: true, render: (row: any) => safeDate(row.invoiceDate) },
                { key: 'dueDate', label: 'DUE DATE', sortable: true, render: (row: any) => safeDate(row.dueDate) },
                { key: 'originalAmount', label: 'AMOUNT', sortable: true, render: (row: any) => formatPeso(row.originalAmount) },
                { key: 'paidAmount', label: 'PAID', sortable: true, render: (row: any) => <span style={{ color: '#10B981', fontWeight: 700 }}>{formatPeso(row.paidAmount)}</span> },
                { key: 'outstandingBalance', label: 'OUTSTANDING', sortable: true, render: (row: any) => (
                  <span style={{ color: row.outstandingBalance > 0 ? '#EF4444' : row.outstandingBalance === 0 ? '#10B981' : '#F59E0B', fontWeight: 700 }}>
                    {formatPeso(row.outstandingBalance)}
                  </span>
                )},
                { key: 'agingBracket', label: 'AGING BRACKET', render: (row: any) => {
                  const mapped = mapBracket(row.agingBracket);
                  return (
                  <span style={{
                    padding: '3px 12px', borderRadius: 9999, fontWeight: 700, fontSize: '0.75rem',
                    color: agingBracketColor[mapped] || '#64748B',
                    background: (agingBracketColor[mapped] || '#64748B') + '18',
                  }}>
                    {mapped}
                  </span>
                )}},
                { key: 'agingDays', label: 'DAYS OVERDUE', sortable: true, render: (row: any) => (
                  <span style={{ color: row.agingDays > 0 ? '#EF4444' : '#64748B', fontWeight: 600 }}>
                    {row.outstandingBalance > 0 ? `${row.agingDays} days` : '—'}
                  </span>
                )}
              ]}
              data={visibleData}
              rowKey="id"
              searchPlaceholder="Search invoices..."
              actions={[
                {
                  label: 'View Details',
                  icon: 'ti-eye',
                  onClick: (row: any) => navigate(`/invoicing-desk/${row.invoiceId}`)
                }
              ]}
              filters={[{
                key: 'agingBracket', label: 'Aging Overdue', options: [
                  { label: 'Current', value: 'Current' },
                  { label: '0-30 days', value: '0-30 days' },
                  { label: '31-60 days', value: '31-60 days' },
                  { label: '61-90 days', value: '61-90 days' },
                  { label: '90+ days', value: '90+ days' },
                ],
                filterFn: (row: any, val: string) => {
                  const mapped = mapBracket(row.agingBracket);
                  return row.agingBracket === val || mapped === val;
                },
              }]}
            />
          </div>
        </Card>
      </div>
    );
  }

  // ── List View ───────────────────────────────────────────────────────
  const grouped = new Map<string, any[]>();
  activeArRecords.forEach(r => {
    if (!grouped.has(r.clientId)) grouped.set(r.clientId, []);
    grouped.get(r.clientId)!.push(r);
  });

  const listData = Array.from(grouped.entries()).map(([clientId, recs]) => {
    const cli = clients.find(c => c.id === clientId);
    const totalOriginal = recs.reduce((s, r) => s + r.originalAmount, 0);
    const totalOutstanding = recs.reduce((s, r) => s + r.outstandingBalance, 0);
    const unpaidCount = recs.filter(r => r.outstandingBalance > 0).length;

    // Determine worst aging bracket
    const bracketOrder = ['0-30 days', '31-60 days', '61-90 days', '90+ days'];
    const worstBracket = recs
      .filter(r => r.outstandingBalance > 0)
      .map(r => mapBracket(r.agingBracket))
      .sort((a, b) => bracketOrder.indexOf(b) - bracketOrder.indexOf(a))[0] ?? '0-30 days';

    let computedStatus = 'Unpaid';
    if (recs.some(r => r.status === 'Overdue' || r.agingDays > 0)) {
      computedStatus = 'Overdue';
    }

    return {
      id: clientId,
      clientName: cli?.name ?? 'Unknown',
      totalOriginal,
      totalOutstanding,
      unpaidCount,
      paidCount: 0,
      worstBracket,
      status: computedStatus,
    };
  });

  const totalAr = activeArRecords.reduce((s, r) => s + r.outstandingBalance, 0);

  // Calculate Aging Totals Summary
  const agingTotals = {
    '0-30 days': 0,
    '31-60 days': 0,
    '61-90 days': 0,
    '90+ days': 0,
  };
  
  activeArRecords.forEach(r => {
    if (r.outstandingBalance > 0) {
       const mapped = mapBracket(r.agingBracket);
       if (mapped in agingTotals) {
         agingTotals[mapped as keyof typeof agingTotals] += r.outstandingBalance;
       }
    }
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px' }}>
        <StatusCard label="Total AR" value={formatPeso(totalAr)} icon="ti-wallet" variant="info" />
            <StatusCard label="0-30 days" value={formatPeso(agingTotals['0-30 days'])} icon="ti-alert-circle" variant="warning" />
            <StatusCard label="31-60 days" value={formatPeso(agingTotals['31-60 days'])} icon="ti-alert-triangle" variant="warning" />
            <StatusCard label="61-90 days" value={formatPeso(agingTotals['61-90 days'])} icon="ti-alert-triangle" variant="danger" />
            <StatusCard label="90+ days" value={formatPeso(agingTotals['90+ days'])} icon="ti-skull" variant="danger" />
          </div>
          <TableContainer>
            <DataTable
            columns={[
              { key: 'id', label: 'CLIENT ID', sortable: true },
              { key: 'clientName', label: 'CLIENT NAME', sortable: true, render: (row: any) => (
                <span onClick={() => navigate(`/accounts-receivable/${row.id}`)} style={{ color: '#0F172A', fontWeight: 700, cursor: 'pointer' }}>
                  {row.clientName}
                </span>
              )},
              { key: 'unpaidCount', label: 'UNPAID INVOICES', sortable: true, render: (row: any) => (
                <span style={{ fontWeight: 700, color: row.unpaidCount > 0 ? '#EF4444' : '#10B981' }}>
                  {row.unpaidCount}
                </span>
              )},
              { key: 'totalOriginal', label: 'TOTAL BILLED', sortable: true, render: (row: any) => formatPeso(row.totalOriginal) },
              { key: 'totalOutstanding', label: 'OUTSTANDING BALANCE', sortable: true, render: (row: any) => (
                <span style={{ fontWeight: 700, color: row.totalOutstanding > 0 ? '#EF4444' : '#10B981' }}>
                  {formatPeso(row.totalOutstanding)}
                </span>
              )},
              { key: 'worstBracket', label: 'AGING CATEGORY', render: (row: any) => (
                <span style={{
                  padding: '3px 12px', borderRadius: 9999, fontWeight: 700, fontSize: '0.75rem',
                  color: agingBracketColor[row.worstBracket] || '#64748B',
                  background: (agingBracketColor[row.worstBracket] || '#64748B') + '18',
                }}>
                  {row.worstBracket}
                </span>
              )},
              { key: 'status', label: 'STATUS', render: (row: any) => <StatusBadge status={row.status} /> },
            ]}
            data={listData}
            rowKey="id"
            searchPlaceholder="Search accounts receivable..."
            actions={[
              {
                label: 'View Details',
                icon: 'ti-eye',
                onClick: (row: any) => navigate(`/accounts-receivable/${row.id}`)
              }
            ]}
            filters={[{
              key: 'status', label: 'All Statuses', options: [
                { label: 'Overdue', value: 'Overdue' },
                { label: 'Unpaid', value: 'Unpaid' }
              ],
              filterFn: (row: any, val: string) => row.status === val,
            }]}
          />
          </TableContainer>
    </div>
  );
};

export default AccountsReceivable;

