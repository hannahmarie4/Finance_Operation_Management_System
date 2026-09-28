import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { DataTable } from '../components/DataTable';
import { StatusBadge } from '../components/StatusBadge';
import { Button } from '../components/Buttons';
import { Card } from '../components/Card';
import { InvoiceDocument } from '../components/InvoiceDocument';
import { Invoice } from '../data/seed';
import { useAppData } from '../context/AppDataContext';
import { useAuth } from '../context/AuthContext';
import { TableContainer } from '../components/TableContainer';
import { useToast } from '../components/ToastContext';
import { ClientInfoCard } from '../components/ClientInfoCard';
// @ts-ignore
import html2pdf from 'html2pdf.js';

// ─── Workflow helpers ──────────────────────────────────────────────────────────

const VALID_TRANSITIONS: Record<string, string[]> = {
  'Draft': ['Pending Approval'],
  'Needs Revision': ['Pending Approval'],
  'Pending Approval': ['Approved', 'Needs Revision'],
  'Approved': ['Sent'],
  'Sent': [],
  'Paid': [],
  'Overdue': [],
};

/** Derive payment status from invoice */
function derivePaymentStatus(inv: Invoice): 'Unpaid' | 'Due Soon' | 'Overdue' | 'Paid' {
  if (inv.paymentStatus === 'Paid') return 'Paid';
  const now = Date.now();
  const due = new Date(inv.dueDate).getTime();
  const daysUntilDue = Math.ceil((due - now) / (1000 * 60 * 60 * 24));
  if (daysUntilDue < 0) return 'Overdue';
  if (daysUntilDue <= 7) return 'Due Soon';
  return 'Unpaid';
}

// ─── Component ────────────────────────────────────────────────────────────────

export const InvoicingDesk: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const actionParam = searchParams.get('action');

  const { toast } = useToast();
  const { invoices, clients, updateInvoice, receipts, payments } = useAppData();
  const { user } = useAuth();
  const canApprove = ['Finance Manager', 'Head Accountant', 'Assistant of Finance Manager'].includes(user?.role || '');

  const [isPrintMode, setIsPrintMode] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{ action: string; invId: string } | null>(null);

  let viewInvoice: Invoice | undefined = undefined;
  let viewClient = null;

  if (id) {
    viewInvoice = invoices.find(i => i.id === id);
    if (!viewInvoice) {
      viewClient = clients.find(c => c.id === id);
    }
  }

  const selectedClientId = viewClient ? viewClient.id : null;

  // Enrich invoices with derived payment status
  const enrichedInvoices = useMemo(() => {
    const base = selectedClientId
      ? invoices.filter(i => i.clientId === selectedClientId)
      : invoices;

    // Only show invoices that are pre-sent (once sent, they move to Accounts Receivable)
    const activeInvoices = base.filter(i => ['Draft', 'Needs Revision', 'Pending Approval', 'Approved'].includes(i.status));

    return activeInvoices.map(inv => {
      const client = clients.find(c => c.id === inv.clientId);
      const ps = derivePaymentStatus(inv);
      return {
        ...inv,
        clientName: client?.name ?? 'Unknown Client',
        waybillCount: inv.waybillIds.length,
        derivedPaymentStatus: ps,
      };
    });
  }, [invoices, clients, selectedClientId]);

  const allClients = Array.from(new Set(invoices.map(inv => {
    const client = clients.find(c => c.id === inv.clientId);
    return client?.name ?? 'Unknown Client';
  })));

  // ── Action Handler ──────────────────────────────────────────────────────────

  const handleTransition = (invId: string, newStatus: Invoice['status'], successMsg: string, updates?: Partial<Invoice>) => {
    const inv = invoices.find(i => i.id === invId);
    if (!inv) return;

    const allowed = VALID_TRANSITIONS[inv.status] ?? [];
    if (!allowed.includes(newStatus)) {
      toast.error(
        `Invalid transition: cannot move invoice from "${inv.status}" to "${newStatus}". ` +
        (allowed.length > 0 ? `Allowed next states: ${allowed.join(', ')}.` : 'No transitions allowed.'),
        'Invalid Workflow Transition'
      );
      return;
    }

    updateInvoice(invId, { status: newStatus, ...updates });
    toast.success(successMsg, 'Success');
  };

  const handleAction = (invId: string, action: string) => {
    const inv = invoices.find(i => i.invoiceNumber === invId || i.id === invId);
    if (!inv) return;

    switch (action) {
      case 'Viewing':
        navigate(`/invoicing-desk/${inv.id}`);
        break;
      case 'Downloading':
        navigate(`/invoicing-desk/${inv.id}?action=download`);
        break;

      // TC-100,101: Submit Draft → Pending Approval
      case 'SubmitForReview':
        handleTransition(inv.id, 'Pending Approval', `Invoice ${inv.invoiceNumber} submitted for review.`);
        break;

      // TC-102: Approve → Approved
      case 'Approve':
        handleTransition(inv.id, 'Approved', `Invoice ${inv.invoiceNumber} has been approved.`, {
          approvedBy: 'EMP-HEAD',
          approvedAt: new Date().toISOString()
        });
        break;

      case 'Reject':
        handleTransition(inv.id, 'Needs Revision', `Invoice ${inv.invoiceNumber} has been rejected and needs revision.`, {
          notes: 'Rejected by Head Accountant'
        });
        break;

      // TC-103: Send → Sent + sets paymentStatus=Unpaid
      case 'Sending':
        handleTransition(inv.id, 'Sent', `Invoice ${inv.invoiceNumber} sent to client.`, {
          sentAt: new Date().toISOString(),
          paymentStatus: 'Unpaid'
        });
        break;

      case 'MarkPaid': {
        const invoicePayments = payments.filter(p => p.invoiceId === inv.id && (p.status === 'Validated' || p.status === 'Approved'));
        const totalPaid = invoicePayments.reduce((sum, p) => sum + p.amount, 0);

        if (totalPaid < inv.totalAmount) {
          toast.error(`Cannot manually mark as Paid. Outstanding balance is ₱${(inv.totalAmount - totalPaid).toLocaleString('en-PH', { minimumFractionDigits: 2 })}.`, 'Incomplete Payment');
          return;
        }

        updateInvoice(inv.id, { paymentStatus: 'Paid', status: 'Paid' });
        toast.success(`Invoice ${inv.invoiceNumber} payment status changed to Paid.`, 'Payment Recorded');
        break;
      }

      case 'ViewReceipt': {
        const receipt = receipts.find(r => r.invoiceId === inv.id);
        if (receipt) {
          navigate(`/receipts/${receipt.clientId}?receiptId=${receipt.id}`);
        } else {
          toast.info('Receipt not yet generated for this invoice.', 'Info');
        }
        break;
      }

      case 'ViewPayment': {
        // Need to find the payment associated with this invoice
        const payment = payments?.find((p: any) => p.invoiceId === inv.id);
        if (payment) {
          navigate(`/payments?paymentId=${payment.id}&action=view`);
        } else {
          toast.info('No payment record found for this invoice yet.', 'Info');
        }
        break;
      }

      case 'SetReceiptDate': {
        const dateStr = window.prompt("Enter Client Receipt Date (YYYY-MM-DD):", new Date().toISOString().split('T')[0]);
        if (dateStr) {
          const rd = new Date(dateStr);
          if (!isNaN(rd.getTime())) {
            const newDue = new Date(rd.getTime() + 30 * 24 * 60 * 60 * 1000);
            updateInvoice(inv.id, {
              clientReceiptDate: rd.toISOString(),
              dueDate: newDue.toISOString()
            });
            toast.success(`Receipt date saved. Due date recalculated to ${newDue.toLocaleDateString()}.`, 'Success');
          } else {
            toast.error("Invalid date format.", "Error");
          }
        }
        break;
      }
    }
  };

  // PDF download
  useEffect(() => {
    if (viewInvoice && actionParam === 'download') {
      if (!isPrintMode) {
        setIsPrintMode(true);
        toast.info(`Generating PDF for ${viewInvoice.invoiceNumber}...`, 'Please wait');

        setTimeout(() => {
          const element = document.getElementById('hidden-print-area');
          if (element) {
            const opt = {
              margin: 10,
              filename: `${viewInvoice!.invoiceNumber}.pdf`,
              image: { type: 'jpeg' as const, quality: 0.98 },
              html2canvas: { scale: 2, useCORS: true },
              jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const }
            };

            html2pdf().from(element).set(opt).save().then(() => {
              setIsPrintMode(false);
              toast.success('PDF Downloaded successfully!', 'Success');
              navigate('/invoicing-desk');
            });
          }
        }, 500);
      }
    }
  }, [viewInvoice, actionParam, isPrintMode, navigate, toast]);

  // ── Table Columns ───────────────────────────────────────────────────────────

  const tableColumns = [
    { key: 'invoiceNumber', label: 'INVOICE NO.', sortable: true },
    {
      key: 'clientName', label: 'CLIENT NAME', sortable: true, render: (row: any) => (
        <span style={{ color: '#0F172A', fontWeight: !selectedClientId ? 700 : 600 }}>
          {row.clientName}
        </span>
      )
    },
    {
      key: 'createdAt',
      label: 'DATE CREATED',
      sortable: true,
      render: (row: any) => new Date(row.createdAt).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' }),
    },
    { key: 'waybillCount', label: 'WAYBILLS' },
    {
      key: 'totalAmount',
      label: 'TOTAL AMOUNT',
      sortable: true,
      render: (row: any) => `₱${row.totalAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`,
    },
    {
      key: 'status',
      label: 'INVOICE STATUS',
      render: (row: any) => <StatusBadge status={row.status} />
    }
  ];

  const filterOptions = ['Draft', 'Needs Revision', 'Pending Approval', 'Approved'];

  const actions = [
    {
      label: 'Edit Draft',
      icon: 'ti-pencil',
      onClick: (row: any) => navigate(`/invoice-create?edit=${row.id || row.invoiceId}`),
      hidden: (row: any) => row.status !== 'Draft' && row.status !== 'Needs Revision'
    },
    {
      label: 'View Details',
      icon: 'ti-eye',
      onClick: (row: any) => handleAction(row.invoiceId || row.id, 'Viewing')
    }
  ];

  // ── Invoice Detail View ─────────────────────────────────────────────────────
  if (viewInvoice && actionParam !== 'download') {
    const derivedPs = derivePaymentStatus(viewInvoice);

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <style>{`
          @media print {
            .app-layout, .sidebar, .global-header, .main-area,
            .no-print, [class*="sidebar"], [class*="header"] {
              display: none !important;
              visibility: hidden !important;
            }
            .printable-section, .printable-section * {
              visibility: visible !important;
            }
          }
        `}</style>

        {/* Invoice Status Bar */}
        <Card style={{ padding: '20px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div>
                <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: 600, color: '#94A3B8', letterSpacing: '0.05em' }}>INVOICE STATUS</p>
                <div style={{ marginTop: 4 }}><StatusBadge status={viewInvoice.status} /></div>
              </div>
              {derivedPs && (
                <>
                  <div style={{ width: 1, height: 32, background: '#E2E8F0' }} />
                  <div>
                    <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: 600, color: '#94A3B8', letterSpacing: '0.05em' }}>PAYMENT STATUS</p>
                    <div style={{ marginTop: 4 }}>
                      {(() => {
                        const colors: Record<string, { bg: string; color: string; icon: string }> = {
                          'Unpaid': { bg: '#FEF9C3', color: '#854D0E', icon: 'ti-wallet' },
                          'Due Soon': { bg: '#FED7AA', color: '#9A3412', icon: 'ti-clock' },
                          'Overdue': { bg: '#FEE2E2', color: '#991B1B', icon: 'ti-alert-triangle' },
                          'Paid': { bg: '#D1FAE5', color: '#065F46', icon: 'ti-circle-check' },
                        };
                        const c = colors[derivedPs] ?? { bg: '#F1F5F9', color: '#475569', icon: 'ti-circle' };
                        return (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: c.bg, color: c.color, padding: '3px 10px', borderRadius: 999, fontSize: '0.75rem', fontWeight: 700 }}>
                            <i className={`ti ${c.icon}`} style={{ fontSize: '0.85rem' }}></i> {derivedPs}
                          </span>
                        );
                      })()}
                    </div>
                  </div>
                </>
              )}
              {viewInvoice.dueDate && (
                <>
                  <div style={{ width: 1, height: 32, background: '#E2E8F0' }} />
                  <div>
                    <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: 600, color: '#94A3B8', letterSpacing: '0.05em' }}>DUE DATE</p>
                    <p style={{ margin: '4px 0 0', fontSize: '0.9rem', fontWeight: 600, color: '#0F172A' }}>
                      {new Date(viewInvoice.dueDate).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                </>
              )}
            </div>

            {/* Action Buttons */}
            <div className="no-print" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <Button title="Print" variant="secondary" icon="ti-printer" onClick={() => window.print()} />
              <Button title="Download PDF" variant="primary" icon="ti-file-download" onClick={() => handleAction(viewInvoice!.id, 'Downloading')} />

              {(viewInvoice.status === 'Draft' || viewInvoice.status === 'Needs Revision') && (
                <Button title="Submit for Review" variant="primary" icon="ti-send" onClick={() => handleAction(viewInvoice!.id, 'SubmitForReview')} />
              )}
              {(viewInvoice.status === 'Pending Approval' && canApprove) && (
                <>
                  <Button title="Approve" variant="success" icon="ti-circle-check" onClick={() => handleAction(viewInvoice!.id, 'Approve')} />
                  <Button title="Reject" variant="danger" icon="ti-x" onClick={() => handleAction(viewInvoice!.id, 'Reject')} />
                </>
              )}
              {viewInvoice.status === 'Approved' && (
                <Button title="Send to Client" variant="primary" icon="ti-mail" onClick={() => handleAction(viewInvoice!.id, 'Sending')} />
              )}
              {viewInvoice.status === 'Sent' && derivedPs !== 'Paid' && (
                <>
                  <Button title="Set Receipt Date" variant="secondary" icon="ti-calendar-event" onClick={() => handleAction(viewInvoice!.id, 'SetReceiptDate')} />
                  <Button title="Mark as Paid" variant="success" icon="ti-cash" onClick={() => handleAction(viewInvoice!.id, 'MarkPaid')} />
                </>
              )}
              {viewInvoice.status === 'Paid' && (
                <>
                  <Button title="View Payment" variant="secondary" icon="ti-credit-card" onClick={() => handleAction(viewInvoice!.id, 'ViewPayment')} />
                  {receipts.some(r => r.invoiceId === viewInvoice!.id) && (
                    <Button title="View Receipt" variant="primary" icon="ti-receipt" onClick={() => handleAction(viewInvoice!.id, 'ViewReceipt')} />
                  )}
                </>
              )}
            </div>
          </div>


        </Card>

        <Card>
          <div style={{ padding: '32px' }}>
            <InvoiceDocument invoice={viewInvoice} compact={false} />
          </div>
        </Card>
      </div>
    );
  }

  // ── Client Detail View ──────────────────────────────────────────────────────
  if (viewClient) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <ClientInfoCard client={viewClient} />
        <Card>
          <div style={{ padding: '24px' }}>
            <DataTable
              title="Client Invoices"
              data={enrichedInvoices}
              columns={tableColumns}
              actions={actions}
              rowKey="id"
              searchPlaceholder="Search by invoice no..."
              searchFields={['invoiceNumber']}
              emptyMessage="No invoices found."
              filters={[{
                key: 'status',
                label: 'Status',
                options: filterOptions.map(opt => ({ label: opt, value: opt }))
              }]}
              columnToggle={true}
              densityToggle={true}
              exportable={false}
            />
          </div>
        </Card>
      </div>
    );
  }

  // ── List View ───────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <TableContainer>
        <DataTable
          title="Invoicing"
          data={enrichedInvoices}
          columns={tableColumns.filter(c => !['invoiceNumber', 'waybillCount'].includes(c.key as string))}
          actions={actions}
          rowKey="id"
          createButtons={[{ label: 'Create Invoice', icon: 'ti-file-plus', onClick: () => navigate('/invoice-create') }]}
          searchPlaceholder="Search by client..."
          searchFields={['clientName']}
          emptyMessage="No invoices found."
          filters={[
            {
              key: 'clientName',
              label: 'All Clients',
              options: allClients.map(client => ({ label: client, value: client }))
            },
            {
              key: 'status',
              label: 'Invoice Status',
              options: filterOptions.map(opt => ({ label: opt, value: opt }))
            }
          ]}
          columnToggle={true}
          densityToggle={true}
          exportable={false}
        />
      </TableContainer>

      {/* Hidden Print Area for html2pdf */}
      {viewInvoice && actionParam === 'download' && isPrintMode && (
        <div style={{ position: 'absolute', left: '-9999px', top: 0, width: '800px', background: '#fff', zIndex: -1 }}>
          <div id="hidden-print-area">
            <InvoiceDocument invoice={viewInvoice} />
          </div>
        </div>
      )}
    </div>
  );
};

export default InvoicingDesk;
