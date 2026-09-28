import React from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import Button from '../components/Buttons';
import { DataTable } from '../components/DataTable';
import { StatusBadge } from '../components/StatusBadge';
import { useToast } from '../components/ToastContext';
import { StatusCard } from '../components/StatusCard';
import { useAppData } from '../context/AppDataContext';
import { TableContainer } from '../components/TableContainer';

export const InvoiceArchives: React.FC = () => {
  const { toast } = useToast();
  const { invoices, clients } = useAppData();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const selectedClientId = searchParams.get('client');
  const setSelectedClientId = (id: string | null) => {
    if (id) setSearchParams({ client: id });
    else setSearchParams({});
  };

  let enriched: any[] = [];
  if (selectedClientId) {
    enriched = invoices.filter(i => i.clientId === selectedClientId).map(inv => {
      const client = clients.find(c => c.id === inv.clientId);
      return { ...inv, clientName: client?.name ?? 'Unknown Client', waybillCount: inv.waybillIds.length };
    });
  } else {
    const grouped = new Map<string, any[]>();
    invoices.forEach(inv => {
      if (!grouped.has(inv.clientId)) grouped.set(inv.clientId, []);
      grouped.get(inv.clientId)!.push(inv);
    });
    enriched = Array.from(grouped.entries()).map(([clientId, recs]) => {
      const client = clients.find(c => c.id === clientId);
      const statuses = Array.from(new Set(recs.map((r: any) => r.status)));
      const status = statuses.length === 1 ? statuses[0] : 'Mixed';
      const validTimes = recs.map((r: any) => new Date(r.createdAt).getTime()).filter((t: number) => !isNaN(t));
      const maxDate = new Date(validTimes.length > 0 ? Math.max(...validTimes) : Date.now());
      return {
        id: clientId, clientId,
        invoiceNumber: recs.length === 1 ? recs[0].invoiceNumber : '[Multiple]',
        clientName: client?.name ?? 'Unknown',
        waybillCount: recs.reduce((sum: number, r: any) => sum + r.waybillIds.length, 0),
        amount: recs.reduce((sum: number, r: any) => sum + r.amount, 0),
        vatAmount: recs.reduce((sum: number, r: any) => sum + r.vatAmount, 0),
        totalAmount: recs.reduce((sum: number, r: any) => sum + r.totalAmount, 0),
        createdAt: maxDate.toISOString(),
        status, isGrouped: true
      };
    });
  }

  const kpiInvoices = selectedClientId ? invoices.filter(i => i.clientId === selectedClientId) : invoices;
  const totalBilled = kpiInvoices.reduce((sum, i) => sum + i.totalAmount, 0);
  const totalPaid = kpiInvoices.filter(i => i.status === 'Paid').reduce((sum, i) => sum + i.totalAmount, 0);
  const totalOutstanding = kpiInvoices.filter(i => ['Sent', 'Overdue'].includes(i.status)).reduce((sum, i) => sum + i.totalAmount, 0);

  const columns = [
    { key: 'invoiceNumber', label: 'INVOICE NO.', sortable: true },
    {
      key: 'clientName', label: 'CLIENT NAME', sortable: true, render: (row: any) => (
        !selectedClientId
          ? <button onClick={() => setSelectedClientId(row.clientId)} style={{ background: 'none', border: 'none', padding: 0, color: '#3B82F6', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}>{row.clientName}</button>
          : <span style={{ fontWeight: 600 }}>{row.clientName}</span>
      )
    },
    { key: 'createdAt', label: 'DATE CREATED', sortable: true, render: (row: any) => new Date(row.createdAt).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' }) },
    { key: 'waybillCount', label: 'WAYBILLS COVERED' },
    { key: 'amount', label: 'BASE AMOUNT', render: (row: any) => `₱${row.amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}` },
    { key: 'vatAmount', label: 'VAT', render: (row: any) => `₱${row.vatAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}` },
    { key: 'totalAmount', label: 'TOTAL', render: (row: any) => `₱${row.totalAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}` },
    { key: 'status', label: 'STATUS', render: (row: any) => <StatusBadge status={row.status} /> },
  ];

  const actions = [
    { label: 'View Invoice', icon: 'ti-eye', onClick: (row: any) => navigate(`/invoicing-desk/${row.id}`) },
    { label: 'Download PDF', icon: 'ti-file-download', onClick: (row: any) => navigate(`/invoicing-desk/${row.id}?action=download`) },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
        <StatusCard label="Total Invoiced" value={`₱${totalBilled.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`} icon="ti-coin" variant="new" />
        <StatusCard label="Collected" value={`₱${totalPaid.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`} icon="ti-circle-check" variant="success" />
        <StatusCard label="Outstanding" value={`₱${totalOutstanding.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`} icon="ti-alert-circle" variant="warning" />
        <StatusCard label="Total Records" value={kpiInvoices.length} icon="ti-file-invoice" variant="info" />
      </div>
      <TableContainer>
        <DataTable
          title="Invoice Archive"
          data={enriched}
          columns={selectedClientId ? columns : columns.filter(c => !['invoiceNumber', 'status'].includes(c.key as string))}
          actions={selectedClientId ? actions : undefined}
          rowKey="id"
          searchPlaceholder="Search invoices..."
          searchFields={['invoiceNumber', 'clientName', 'status'] as any}
          filters={[{
            key: 'status', label: 'Status', options: [
              { label: 'Draft', value: 'Draft' }, { label: 'Pending Approval', value: 'Pending Approval' },
              { label: 'Approved', value: 'Approved' }, { label: 'Sent', value: 'Sent' },
              { label: 'Paid', value: 'Paid' }, { label: 'Overdue', value: 'Overdue' }
            ], filterFn: (row: any, val: string) => row.status === val
          }]}
          exportable={false} columnToggle={true} densityToggle={true}
        />
      </TableContainer>
    </div>
  );
};

export default InvoiceArchives;
