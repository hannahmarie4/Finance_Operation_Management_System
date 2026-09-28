import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useParams, useNavigate } from 'react-router-dom';
import { StatusBadge } from '../components/StatusBadge';
import { Card } from '../components/Card';
import { StatusCard } from '../components/StatusCard';
import { Button } from '../components/Buttons';
import { useToast } from '../components/ToastContext';
import { ClientInfoCard } from '../components/ClientInfoCard';
import '../components/FormModals.css';
import {
  Invoice,
  SEEDED_USERS
} from '../data/seed';
import { useAppData } from '../context/AppDataContext';
import { RecordHistoryModal } from '../components/RecordHistoryModal';
import { DataTable } from '../components/DataTable';
import { TableContainer } from '../components/TableContainer';

export const InvoiceReview: React.FC = () => {
  const { toast } = useToast();
  const { id } = useParams();
  const navigate = useNavigate();
  const { invoices, updateInvoice, waybills, clients } = useAppData();
  const [remarks, setRemarks] = useState('');
  const [isFlagging, setIsFlagging] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const location = useLocation();

  // Selected invoice for the new Modal UI
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  useEffect(() => {
    if (location.state?.clientId) {
      if (location.state?.invoiceId) {
        const inv = invoices.find(i => i.id === location.state.invoiceId);
        if (inv) setSelectedInvoice(inv);
        // Clear state to avoid reopening if dismissed
        navigate(location.pathname, { replace: true, state: {} });
      }
    }
  }, [location.state, navigate, invoices, location.pathname]);

  // Handle URL param (legacy support, or if they reload page with /:id)
  const viewClient = clients.find(c => c.id === id);
  const selectedClientId = viewClient ? viewClient.id : location.state?.clientId;

  useEffect(() => {
    if (id && !viewClient) {
      const inv = invoices.find(i => i.id === id);
      if (inv) {
        setSelectedInvoice(inv);
        navigate('/invoice-review', { replace: true });
      }
    }
  }, [id, invoices, navigate, viewClient]);

  const visibleInvoices = invoices.filter(i => i.status !== 'Draft');
  const filteredInvoices = selectedClientId ? visibleInvoices.filter(i => i.clientId === selectedClientId) : visibleInvoices;
  const sortedInvoices = [...filteredInvoices].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // ENRICH CLIENTS
  const enrichedClients = clients.map(client => {
    const clientInvoices = visibleInvoices.filter(i => i.clientId === client.id);
    const pendingCount = clientInvoices.filter(i => i.status === 'Pending Approval').length;
    const totalAmount = clientInvoices.reduce((sum, i) => sum + i.totalAmount, 0);
    return {
      id: client.id,
      clientName: client.name,
      pendingCount,
      totalAmount
    };
  }).filter(c => c.pendingCount > 0 || c.totalAmount > 0);

  // KPI Calculations
  const pendingCount = filteredInvoices.filter(i => i.status === 'Pending Approval').length;
  const approvedCount = filteredInvoices.filter(i => i.status === 'Approved').length;
  const totalAmount = filteredInvoices
    .filter(i => i.status === 'Pending Approval' || i.status === 'Approved')
    .reduce((sum, i) => sum + i.totalAmount, 0);

  // Status Handlers
  const handleApprove = (viewInvoice: Invoice) => {
    updateInvoice(viewInvoice.id, { status: 'Approved' });
    toast.success(`Invoice ${viewInvoice.invoiceNumber} has been Approved.`, 'Success');
    setSelectedInvoice(null);
    setIsFlagging(false);
  };

  const handleReject = (viewInvoice: Invoice) => {
    if (!remarks.trim()) {
      toast.error('Please provide remarks for the correction.', 'Error');
      return;
    }
    updateInvoice(viewInvoice.id, { status: 'Needs Revision', notes: remarks });
    toast.error(`Invoice ${viewInvoice.invoiceNumber} returned for correction.`, 'Returned');
    setSelectedInvoice(null);
    setRemarks('');
    setIsFlagging(false);
  };

  const renderModal = () => {
    if (!selectedInvoice) return null;
    const client = clients.find(c => c.id === selectedInvoice.clientId);
    const submitter = SEEDED_USERS.find(u => u.employeeId === selectedInvoice.createdBy);
    const invoiceWaybills = waybills.filter(w => selectedInvoice.waybillIds.includes(w.id));

    return createPortal(
      <div style={{ position: 'fixed', inset: 0, zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(8px)', padding: '20px' }}>
        <div style={{ background: '#fff', borderRadius: '12px', width: '100%', maxWidth: '700px', maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>

          <div style={{ padding: '24px 32px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'sticky', top: 0, background: '#fff', zIndex: 10 }}>
            <div>
              <p style={{ margin: '0 0 4px', fontSize: '0.875rem', color: '#64748B', fontWeight: 600 }}>{selectedInvoice.invoiceNumber}</p>
              <h2 style={{ margin: '0 0 12px', fontSize: '1.5rem', color: '#0F172A', fontWeight: 800 }}>{client?.name || 'Unknown'}</h2>
              <div style={{ display: 'inline-block', padding: '4px 10px', borderRadius: '999px', background: selectedInvoice.status === 'Pending Approval' ? '#FEE2E2' : '#F1F5F9', color: selectedInvoice.status === 'Pending Approval' ? '#EF4444' : '#64748B', fontSize: '0.75rem', fontWeight: 700 }}>
                {selectedInvoice.status === 'Pending Approval' ? 'Pending Review' : selectedInvoice.status}
              </div>
            </div>
            <button
              onClick={() => { setSelectedInvoice(null); setRemarks(''); setIsFlagging(false); }}
              style={{ background: 'transparent', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#94A3B8' }}
            >
              ×
            </button>
          </div>

          <div style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px' }}>

            {/* Meta details matching Image 2 style */}
            <div>
              <h4 style={{ margin: '0 0 16px', fontSize: '0.875rem', fontWeight: 800, color: '#0F172A', letterSpacing: '1px' }}>OVERVIEW</h4>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ fontSize: '0.875rem', color: '#64748B' }}>Outstanding Balance</span>
                <span style={{ fontSize: '0.875rem', color: '#0F172A', fontWeight: 800 }}>₱{selectedInvoice.totalAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ fontSize: '0.875rem', color: '#64748B' }}>Due Date</span>
                <span style={{ fontSize: '0.875rem', color: '#0F172A', fontWeight: 700 }}>{new Date(selectedInvoice.dueDate).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ fontSize: '0.875rem', color: '#64748B' }}>Submitted By</span>
                <span style={{ fontSize: '0.875rem', color: '#0F172A', fontWeight: 700 }}>{submitter?.fullName || selectedInvoice.createdBy}</span>
              </div>
            </div>

            {/* ACTION BASIS */}
            <div>
              <h4 style={{ margin: '0 0 8px', fontSize: '0.875rem', fontWeight: 800, color: '#0F172A', letterSpacing: '1px' }}>ACTION BASIS</h4>
              <p style={{ margin: 0, fontSize: '0.875rem', color: '#475569', lineHeight: 1.5 }}>
                {selectedInvoice.status === 'Pending Approval'
                  ? "This invoice has been generated for recent completed waybills and is awaiting your review and approval before dispatch."
                  : `Invoice has been processed and is currently ${selectedInvoice.status}.`}
              </p>
            </div>

            <hr style={{ border: 0, borderTop: '1px solid #E2E8F0', margin: 0 }} />

            {/* Included Waybills */}
            <div style={{ border: '1px solid var(--border, #E2E8F0)', borderRadius: '8px', overflow: 'hidden' }}>
              <div style={{ background: 'var(--s1, #F7F9FF)', padding: '10px 14px', borderBottom: '1px solid var(--border, #E2E8F0)', fontSize: '11px', fontWeight: 700, color: 'var(--tt, #6B7280)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                Included Waybills ({invoiceWaybills.length})
              </div>
              <div style={{ padding: '0 14px', maxHeight: '160px', overflowY: 'auto' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1fr 1fr', padding: '10px 0', borderBottom: '1px solid var(--border, #E2E8F0)', fontSize: '11px', fontWeight: 700, color: 'var(--tt, #6B7280)', textTransform: 'uppercase' }}>
                  <span>Waybill No.</span>
                  <span>Delivery Date</span>
                  <span>Status</span>
                  <span>Docs</span>
                  <span style={{ textAlign: 'right' }}>Amount</span>
                </div>
                {invoiceWaybills.map((wb, i) => (
                  <div key={wb.id} style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1fr 1fr', padding: '10px 0', borderBottom: i < invoiceWaybills.length - 1 ? '1px solid #F1F5F9' : 'none', fontSize: '13px', color: 'var(--ts, #374151)', alignItems: 'center' }}>
                    <span style={{ fontWeight: 600, color: 'var(--tp, #0F172A)' }}>{wb.waybillNumber}</span>
                    <span>{new Date(wb.deliveryDate).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                    <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '999px', background: wb.status === 'Validated' ? '#DCFCE7' : '#F1F5F9', color: wb.status === 'Validated' ? '#166534' : '#475569', display: 'inline-block', width: 'fit-content', fontWeight: 600 }}>{wb.status}</span>
                    <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '999px', background: wb.hasOriginalPOD ? '#DBEAFE' : (wb.hasApprovedCTC ? '#FEF9C3' : '#FEE2E2'), color: wb.hasOriginalPOD ? '#1E40AF' : (wb.hasApprovedCTC ? '#854D0E' : '#991B1B'), display: 'inline-block', width: 'fit-content', fontWeight: 600 }}>
                      {wb.hasOriginalPOD ? 'Orig POD' : (wb.hasApprovedCTC ? 'CTC' : 'Missing')}
                    </span>
                    <span style={{ textAlign: 'right', fontWeight: 600 }}>₱{(wb as any).amount ? (wb as any).amount.toLocaleString('en-PH', { minimumFractionDigits: 2 }) : '0.00'}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Computation Breakdown */}
            <div style={{ background: 'var(--s1, #F7F9FF)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border, #E2E8F0)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
                <span style={{ color: 'var(--ts, #374151)' }}>Base Amount</span>
                <span style={{ fontWeight: 600, color: 'var(--tp, #0F172A)' }}>₱{selectedInvoice.amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
                <span style={{ color: 'var(--ts, #374151)' }}>VAT (12%)</span>
                <span style={{ fontWeight: 600, color: 'var(--tp, #0F172A)' }}>₱{selectedInvoice.vatAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '13px' }}>
                <span style={{ color: 'var(--ts, #374151)' }}>Surcharge</span>
                <span style={{ fontWeight: 600, color: 'var(--tp, #0F172A)' }}>₱{selectedInvoice.surchargeAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '12px', borderTop: '1px solid var(--border, #CBD5E1)', fontSize: '13px' }}>
                <span style={{ color: 'var(--tp, #0F172A)', fontWeight: 700 }}>TOTAL AMOUNT</span>
                <span style={{ fontWeight: 800, color: 'var(--ok, #059669)', fontSize: '15px' }}>₱{selectedInvoice.totalAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>

            {/* Flag Discrepancy Text Area */}
            {selectedInvoice.status === 'Pending Approval' && isFlagging && (
              <div className="tf-group state-default">
                <label className="tf-label" htmlFor="discrepancy-remarks">What's the issue?</label>
                <div className="tf-wrapper tf-textarea-wrapper">
                  <textarea
                    id="discrepancy-remarks"
                    className="tf-textarea"
                    value={remarks}
                    onChange={e => setRemarks(e.target.value)}
                    placeholder="E.g. VAT computation incorrect, please recompute"
                  />
                </div>
              </div>
            )}

          </div>

          <div style={{ padding: '24px 32px', borderTop: '1px solid #E2E8F0', display: 'flex', justifyContent: 'flex-end', gap: '16px', background: '#F8FAFC', borderBottomLeftRadius: '12px', borderBottomRightRadius: '12px', position: 'sticky', bottom: 0 }}>
            {selectedInvoice.status === 'Pending Approval' && !isFlagging && (
              <>
                <Button
                  title="Close"
                  variant="secondary"
                  onClick={() => { setSelectedInvoice(null); setRemarks(''); setIsFlagging(false); }}
                />
                <Button
                  title="Reject (Needs Revision)"
                  variant="danger"
                  icon="ti-arrow-back-up"
                  onClick={() => setIsFlagging(true)}
                />
                <Button
                  title="Approve"
                  variant="primary"
                  icon="ti-check"
                  onClick={() => handleApprove(selectedInvoice!)}
                />
              </>
            )}

            {selectedInvoice.status === 'Pending Approval' && isFlagging && (
              <>
                <Button
                  title="Cancel"
                  variant="secondary"
                  onClick={() => setIsFlagging(false)}
                />
                <Button
                  title="Submit"
                  variant="danger"
                  onClick={() => handleReject(selectedInvoice!)}
                />
              </>
            )}

            {selectedInvoice.status !== 'Pending Approval' && (
              <Button
                title="Close"
                variant="secondary"
                onClick={() => { setSelectedInvoice(null); setRemarks(''); setIsFlagging(false); }}
              />
            )}
          </div>
        </div>
      </div>,
      document.body
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 64 }}>

      {viewClient && <ClientInfoCard client={viewClient} />}

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
        <StatusCard label="Total Reviewed" value={`₱${totalAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`} icon="ti-coin" variant="new" />
        <StatusCard label="Pending Approval" value={pendingCount} icon="ti-clock-hour-4" variant="warning" />
        <StatusCard label="Approved" value={approvedCount} icon="ti-check" variant="success" />
      </div>

      {viewClient ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {sortedInvoices.length === 0 ? (
            <Card><div style={{ padding: 24, textAlign: 'center', color: '#64748B' }}>No invoices in the queue.</div></Card>
          ) : (
            sortedInvoices.map(inv => {
              const client = clients.find(c => c.id === inv.clientId);
              const isPending = inv.status === 'Pending Approval';

              return (
                <Card key={inv.id}>
                  <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        {viewClient ? (
                          <h3 style={{ margin: '0 0 4px 0', fontSize: '1.25rem', color: '#0F172A', fontWeight: 800 }}>Invoice {inv.invoiceNumber}</h3>
                        ) : (
                          <>
                            <h3 style={{ margin: '0 0 4px 0', fontSize: '1.25rem', color: '#0F172A', fontWeight: 800 }}>{client?.name || 'Unknown Client'}</h3>
                            <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748B', fontWeight: 600 }}>{inv.invoiceNumber}</p>
                          </>
                        )}
                      </div>
                      <div>
                        {isPending ? (
                          <span style={{ padding: '4px 10px', borderRadius: '999px', background: '#FEF2F2', color: '#EF4444', fontSize: '0.7rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <i className="ti-clock" style={{ fontSize: '0.85rem' }} />
                            Pending Review
                          </span>
                        ) : (
                          <span style={{ padding: '4px 10px', borderRadius: '999px', background: '#F1F5F9', color: '#64748B', fontSize: '0.7rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <i className="ti-check" style={{ fontSize: '0.85rem' }} />
                            {inv.status}
                          </span>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 4 }}>
                      <div>
                        <span style={{ display: 'block', fontSize: '0.7rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', marginBottom: 4, letterSpacing: '0.5px' }}>Outstanding Balance</span>
                        <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0F172A' }}>₱{inv.totalAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div>
                        <span style={{ display: 'block', fontSize: '0.7rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', marginBottom: 4, letterSpacing: '0.5px' }}>Due Date</span>
                        <span style={{ fontSize: '1rem', fontWeight: 800, color: '#0F172A' }}>{new Date(inv.dueDate).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                      </div>
                    </div>

                    <div style={{ marginTop: 4 }}>
                      <span style={{ display: 'block', fontSize: '0.7rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', marginBottom: 4, letterSpacing: '0.5px' }}>Action Basis</span>
                      <p style={{ margin: 0, fontSize: '0.8rem', color: '#334155', lineHeight: 1.4 }}>
                        {isPending
                          ? "Invoice requires review and approval before it can be sent to the client. Please verify all waybill calculations."
                          : `Invoice has been processed and is currently ${inv.status}.`}
                      </p>
                    </div>

                    {isPending ? (
                      <div style={{ marginTop: 8 }}>
                        <button
                          onClick={() => setSelectedInvoice(inv)}
                          style={{ width: '100%', padding: '12px', borderRadius: '8px', background: '#0D9488', color: '#fff', fontSize: '0.85rem', fontWeight: 800, border: 'none', cursor: 'pointer', transition: 'background 0.2s' }}
                          onMouseEnter={(e) => e.currentTarget.style.background = '#0F766E'}
                          onMouseLeave={(e) => e.currentTarget.style.background = '#0D9488'}
                        >
                          Review Invoice
                        </button>
                      </div>
                    ) : (
                      <div style={{ marginTop: 8 }}>
                        <button
                          onClick={() => setSelectedInvoice(inv)}
                          style={{ width: '100%', padding: '12px', borderRadius: '8px', background: '#F1F5F9', color: '#475569', fontSize: '0.85rem', fontWeight: 800, border: 'none', cursor: 'pointer', transition: 'background 0.2s' }}
                          onMouseEnter={(e) => e.currentTarget.style.background = '#E2E8F0'}
                          onMouseLeave={(e) => e.currentTarget.style.background = '#F1F5F9'}
                        >
                          View Details
                        </button>
                      </div>
                    )}
                  </div>
                </Card>
              );
            })
          )}
        </div>
      ) : (
        <TableContainer>
          <DataTable
            title="Client Invoice Queue"
            rowKey="id"
            data={enrichedClients}
            searchPlaceholder="Search clients..."
            columns={[
              { key: 'clientName', label: 'Client' },
              {
                key: 'status', label: 'Status', render: (row) => (
                  <StatusBadge status={row.pendingCount > 0 ? 'Pending' : 'Approved'} />
                )
              },
              { key: 'totalAmount', label: 'Total Value', render: (row) => `₱${row.totalAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}` }
            ]}
            actions={[
              {
                label: 'View Details',
                icon: 'ti-eye',
                onClick: (row) => navigate(`/invoice-review/${row.id}`)
              }
            ]}
          />
        </TableContainer>
      )}

      {renderModal()}

    </div>
  );
};

export default InvoiceReview;
