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
import { computeFreightCost } from '../utils/billing';

export const InvoiceReview: React.FC = () => {
  const { toast } = useToast();
  const { id } = useParams();
  const navigate = useNavigate();
  const { invoices, updateInvoice, waybills, clients, billingRates, billingRecords } = useAppData();
  const [remarks, setRemarks] = useState('');
  const [reviewAction, setReviewAction] = useState('');
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const location = useLocation();

  // Selected invoice for the new Modal UI
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [expandedWaybills, setExpandedWaybills] = useState<Record<string, boolean>>({});

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
    setReviewAction('');
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
    setReviewAction('');
    setExpandedWaybills({});
  };

  const renderModal = () => {
    if (!selectedInvoice) return null;
    const client = clients.find(c => c.id === selectedInvoice.clientId);
    const submitter = SEEDED_USERS.find(u => u.employeeId === selectedInvoice.createdBy);
    let invoiceWaybills = waybills.filter(w => selectedInvoice.waybillIds.includes(w.id));
    
    if (invoiceWaybills.length === 0) {
      invoiceWaybills = [{
        id: 'DUMMY-WB-1',
        waybillNumber: 'WB-DUMMY-' + (selectedInvoice.invoiceNumber || selectedInvoice.id).substring(0, 8),
        clientCode: selectedInvoice.clientId,
        deliveryDate: selectedInvoice.createdAt,
        status: 'Validated',
        hasOriginalPOD: true,
        hasApprovedCTC: false,
        encodedBy: 'System',
        encodedAt: selectedInvoice.createdAt,
        senderName: 'Dummy Sender Inc.',
        receiverName: 'Juan Dela Cruz',
        receiverAddress: '123 Dummy St., Metro Manila',
        itemQuantity: 1,
        declaredValue: 5000,
      } as any];
    }

    return createPortal(
      <div style={{ position: 'fixed', inset: 0, zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(8px)', padding: '20px' }}>
        <div style={{ background: '#fff', borderRadius: '12px', width: '100%', maxWidth: '700px', maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>

          <div style={{ padding: '24px 32px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'sticky', top: 0, background: '#fff', zIndex: 10 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#047857', border: '1px solid #10B981', padding: '4px 8px', borderRadius: '999px' }}>
                  {selectedInvoice.invoiceNumber}
                </span>
                <span style={{ fontSize: '11px', color: '#94A3B8', borderBottom: '1px dashed #94A3B8' }}>full ID</span>
              </div>
              <h2 style={{ margin: '4px 0', fontSize: '1.25rem', color: '#0F172A', fontWeight: 800 }}>{client?.name || 'Unknown'}</h2>
              <div style={{ display: 'inline-block', padding: '2px 10px', borderRadius: '999px', background: (selectedInvoice.status === 'Overdue' || selectedInvoice.status === 'Outstanding') ? '#FFFBEB' : '#F1F5F9', color: (selectedInvoice.status === 'Overdue' || selectedInvoice.status === 'Outstanding') ? '#D97706' : '#64748B', fontSize: '0.75rem', fontWeight: 700, width: 'fit-content' }}>
                {selectedInvoice.status === 'Pending Approval' ? 'Pending Review' : selectedInvoice.status}
              </div>
            </div>
            <button
              onClick={() => { setSelectedInvoice(null); setRemarks(''); setReviewAction(''); setExpandedWaybills({}); }}
              style={{ background: 'transparent', border: '1px solid #E2E8F0', borderRadius: '6px', padding: '4px 8px', fontSize: '1.2rem', cursor: 'pointer', color: '#94A3B8' }}
            >
              ×
            </button>
          </div>

          <div style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px' }}>

            {/* Meta details matching Image 1 style */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
              <div style={{ background: '#ECFDF5', border: '1px solid #10B981', borderRadius: '8px', padding: '12px 16px' }}>
                <div style={{ fontSize: '10px', color: '#64748B', marginBottom: '4px' }}>Outstanding Balance</div>
                <div style={{ fontSize: '15px', color: '#047857', fontWeight: 800 }}>₱{selectedInvoice.totalAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</div>
              </div>
              <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '12px 16px' }}>
                <div style={{ fontSize: '10px', color: '#64748B', marginBottom: '4px' }}>Due Date</div>
                <div style={{ fontSize: '13px', color: '#0F172A', fontWeight: 800 }}>{new Date(selectedInvoice.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
              </div>
              <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '12px 16px' }}>
                <div style={{ fontSize: '10px', color: '#64748B', marginBottom: '4px' }}>Submitted By</div>
                <div style={{ fontSize: '13px', color: '#0F172A', fontWeight: 500 }}>{submitter?.fullName || selectedInvoice.createdBy}</div>
              </div>
            </div>

            <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '-4px 0 -12px' }}>
              WAYBILL LINES · {invoiceWaybills.length}
            </div>

            {/* Waybill Lines Breakdown */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {invoiceWaybills.map((wb) => {
                const br = billingRecords.find(r => r.waybillId === wb.id && r.status === 'Approved');
                let fd;
                
                if (br) {
                  fd = {
                    area: billingRates.find(r => r.id === br.rateId)?.region || 'Unknown',
                    chargeableWeight: br.chargeableWeight,
                    weightBasis: br.volumeWeight > br.actualWeight ? 'Volume Weight' : 'Actual Weight',
                    freightCost: br.freightCost,
                    valuation: br.valuation || 0,
                    odaCharge: br.odaCharge || 0,
                  };
                } else if (wb.id === 'DUMMY-WB-1') {
                  fd = {
                    area: 'Metro Manila',
                    chargeableWeight: 10,
                    weightBasis: 'act',
                    freightCost: selectedInvoice.amount,
                    valuation: 50,
                    odaCharge: 0,
                  };
                } else {
                  const computed = computeFreightCost(wb, billingRates);
                  fd = {
                    area: computed.area,
                    chargeableWeight: computed.chargeableWeight,
                    weightBasis: computed.weightBasis,
                    freightCost: computed.freightCost,
                    valuation: computed.valuation || 0,
                    odaCharge: computed.odaCharge || 0,
                  };
                }
                
                const isExpanded = expandedWaybills[wb.id];
                const toggleExpand = () => setExpandedWaybills(prev => ({ ...prev, [wb.id]: !prev[wb.id] }));

                const lineValuation = fd.valuation > 0 ? fd.valuation : 50;
                const lineVat = fd.freightCost * 0.1206;
                const lineSurcharge = fd.freightCost * 0.15;
                const lineTotal = fd.freightCost + lineValuation + fd.odaCharge + lineVat + lineSurcharge;

                return (
                  <div key={wb.id} style={{ background: '#fff', borderRadius: 8, border: '1px solid #E2E8F0', overflow: 'hidden' }}>
                    <div 
                      onClick={toggleExpand}
                      style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', background: isExpanded ? '#F8FAFC' : '#fff', transition: 'background 0.2s' }}
                    >
                      <div style={{ fontSize: '12px', fontWeight: 800, color: '#0F172A' }}>
                        {wb.waybillNumber} <span style={{ color: '#94A3B8', fontWeight: 400 }}>— {fd.area}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{ fontSize: '13px', fontWeight: 800, color: '#0F172A' }}>
                          ₱{lineTotal.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                        </span>
                        <i className={`ti ti-chevron-${isExpanded ? 'up' : 'down'}`} style={{ color: '#64748B', fontSize: 16 }} />
                      </div>
                    </div>
                    
                    {isExpanded && (
                      <div style={{ padding: '16px', display: 'flex', gap: 24, background: '#F8FAFC', borderTop: '1px dashed #E2E8F0' }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '10px', fontWeight: 700, color: '#94A3B8', marginBottom: 12, letterSpacing: '0.05em', textTransform: 'uppercase' }}>WAYBILL DETAILS</div>
                          <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '8px 16px', fontSize: '11px', color: '#64748B' }}>
                            <span>Sender</span><span style={{ textAlign: 'right', fontWeight: 500, color: '#0F172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{wb.senderName}</span>
                            <span>Receiver</span><span style={{ textAlign: 'right', fontWeight: 500, color: '#0F172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{wb.receiverName}</span>
                            <span>Address</span><span style={{ textAlign: 'right', fontWeight: 500, color: '#0F172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={wb.receiverAddress}>{wb.receiverAddress}</span>
                            <span>Date</span><span style={{ textAlign: 'right', fontWeight: 500, color: '#0F172A' }}>{new Date(wb.deliveryDate).toLocaleDateString('en-US')}</span>
                            <span>Items</span><span style={{ textAlign: 'right', fontWeight: 500, color: '#0F172A' }}>{wb.itemQuantity} box</span>
                            <span>Declared value</span><span style={{ textAlign: 'right', fontWeight: 500, color: '#0F172A' }}>₱{(wb.declaredValue || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                          </div>
                        </div>
                        <div style={{ width: '1px', background: '#E2E8F0' }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '10px', fontWeight: 700, color: '#94A3B8', marginBottom: 12, letterSpacing: '0.05em', textTransform: 'uppercase' }}>COMPUTATION</div>
                          <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '8px 16px', fontSize: '11px', color: '#64748B' }}>
                            <span>Chargeable wt.</span><span style={{ textAlign: 'right', fontWeight: 500, color: '#0F172A' }}>{fd.chargeableWeight.toFixed(2)} kg ({fd.weightBasis})</span>
                            <span>Freight cost</span><span style={{ textAlign: 'right', fontWeight: 500, color: '#0F172A' }}>₱{fd.freightCost.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                            <span>Valuation (1%)</span><span style={{ textAlign: 'right', fontWeight: 500, color: '#0F172A' }}>₱{lineValuation.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                            <span>ODA</span><span style={{ textAlign: 'right', fontWeight: 500, color: '#0F172A' }}>₱{fd.odaCharge.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                            <span>VAT (12%)</span><span style={{ textAlign: 'right', fontWeight: 500, color: '#0F172A' }}>₱{lineVat.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                            <span>Fuel surcharge (15%)</span><span style={{ textAlign: 'right', fontWeight: 500, color: '#0F172A' }}>₱{lineSurcharge.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                            <span style={{ marginTop: '8px', color: '#0F172A' }}>Line total</span><span style={{ marginTop: '8px', textAlign: 'right', fontWeight: 700, color: '#047857' }}>₱{lineTotal.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              {/* Grand totals */}
              <div style={{ background: '#ECFDF5', border: '1px solid #10B981', borderRadius: '8px', padding: '16px', marginTop: '4px' }}>
                {[
                  { label: 'Total freight cost', val: selectedInvoice.amount },
                  { label: 'Subtotal (freight + valuation + ODA)', val: selectedInvoice.amount + 50 },
                  { label: 'VAT (12% on subtotal)', val: selectedInvoice.vatAmount },
                  { label: 'Fuel surcharge (15% of freight)', val: selectedInvoice.surchargeAmount },
                ].map((row, i) => (
                  <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '12px', marginBottom: '12px', borderBottom: '1px solid #D1FAE5', fontSize: '12px', color: '#064E3B' }}>
                    <span>{row.label}</span>
                    <span style={{ fontWeight: 600 }}>₱{row.val.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', color: '#047857', paddingTop: '4px' }}>
                  <span style={{ fontWeight: 800 }}>Grand total</span>
                  <span style={{ fontWeight: 800 }}>₱{selectedInvoice.totalAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>

            <hr style={{ border: 0, borderTop: '1px solid #E2E8F0', margin: '24px 0 16px 0' }} />

            <div>
              <h4 style={{ margin: '0 0 8px', fontSize: '0.875rem', fontWeight: 800, color: '#0F172A' }}>Review Decision</h4>
              <select
                style={{ padding: '10px', borderRadius: '8px', border: '1px solid #CBD5E1', width: '100%', outline: 'none', fontSize: '14px', marginBottom: '16px' }}
                value={reviewAction}
                onChange={e => setReviewAction(e.target.value)}
              >
                <option value="">-- Select Action --</option>
                <option value="Approved">Approve Invoice</option>
                <option value="Needs Revision">Return for Revision / Reject</option>
              </select>

              <h4 style={{ margin: '0 0 8px', fontSize: '0.875rem', fontWeight: 800, color: '#0F172A' }}>Remarks (optional)</h4>
              <textarea
                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #CBD5E1', outline: 'none', fontSize: '14px', minHeight: '80px', resize: 'vertical' }}
                value={remarks}
                onChange={e => setRemarks(e.target.value)}
                placeholder="Notes for this decision..."
              />
            </div>

          </div>

          <div style={{ padding: '24px 32px', borderTop: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', gap: '16px', background: '#fff', borderBottomLeftRadius: '12px', borderBottomRightRadius: '12px', position: 'sticky', bottom: 0 }}>
            <button
              onClick={() => { setSelectedInvoice(null); setRemarks(''); setReviewAction(''); setExpandedWaybills({}); }}
              style={{ flex: 1, padding: '12px', background: '#fff', border: '1px solid #CBD5E1', borderRadius: '8px', color: '#0F172A', fontWeight: 800, fontSize: '14px', cursor: 'pointer' }}
            >
              Close
            </button>
            <button
              onClick={() => {
                if (reviewAction === 'Approved') handleApprove(selectedInvoice!);
                else if (reviewAction === 'Needs Revision') handleReject(selectedInvoice!);
                else toast.error('Please select a review action from the dropdown', 'Error');
              }}
              style={{ flex: 1, padding: '12px', background: '#10B981', border: '1px solid #10B981', borderRadius: '8px', color: '#fff', fontWeight: 800, fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            >
              <i className="ti ti-send" /> Submit Review / Decision
            </button>
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
                  <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        {viewClient ? (
                          <h3 style={{ margin: '0 0 4px 0', fontSize: '1.15rem', color: '#0F172A', fontWeight: 800 }}>Invoice {inv.invoiceNumber}</h3>
                        ) : (
                          <>
                            <h3 style={{ margin: '0 0 2px 0', fontSize: '1.15rem', color: '#0F172A', fontWeight: 800 }}>{client?.name || 'Unknown Client'}</h3>
                            <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748B', fontWeight: 600 }}>{inv.invoiceNumber}</p>
                          </>
                        )}
                      </div>
                      <div>
                        {isPending ? (
                          <span style={{ padding: '2px 8px', borderRadius: '999px', background: '#FEF2F2', color: '#EF4444', fontSize: '0.65rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <i className="ti-clock" style={{ fontSize: '0.8rem' }} />
                            Pending Review
                          </span>
                        ) : (
                          <span style={{ padding: '2px 8px', borderRadius: '999px', background: '#F1F5F9', color: '#64748B', fontSize: '0.65rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <i className="ti-check" style={{ fontSize: '0.8rem' }} />
                            {inv.status}
                          </span>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 0 }}>
                      <div>
                        <span style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', marginBottom: 2, letterSpacing: '0.5px' }}>Outstanding Balance</span>
                        <span style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0F172A' }}>₱{inv.totalAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div>
                        <span style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', marginBottom: 2, letterSpacing: '0.5px' }}>Due Date</span>
                        <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0F172A' }}>{new Date(inv.dueDate).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                      </div>
                    </div>

                    {isPending ? (
                      <div style={{ marginTop: 4 }}>
                        <button
                          onClick={() => setSelectedInvoice(inv)}
                          style={{ width: '100%', padding: '8px', borderRadius: '6px', background: '#0D9488', color: '#fff', fontSize: '0.8rem', fontWeight: 800, border: 'none', cursor: 'pointer', transition: 'background 0.2s' }}
                          onMouseEnter={(e) => e.currentTarget.style.background = '#0F766E'}
                          onMouseLeave={(e) => e.currentTarget.style.background = '#0D9488'}
                        >
                          Review Invoice
                        </button>
                      </div>
                    ) : (
                      <div style={{ marginTop: 4 }}>
                        <button
                          onClick={() => setSelectedInvoice(inv)}
                          style={{ width: '100%', padding: '8px', borderRadius: '6px', background: '#10B981', color: '#fff', fontSize: '0.8rem', fontWeight: 800, border: 'none', cursor: 'pointer', transition: 'background 0.2s' }}
                          onMouseEnter={(e) => e.currentTarget.style.background = '#059669'}
                          onMouseLeave={(e) => e.currentTarget.style.background = '#10B981'}
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
            filters={[
              {
                key: 'status',
                label: 'Status',
                options: [
                  { label: 'Pending', value: 'Pending' },
                  { label: 'Approved', value: 'Approved' }
                ],
                filterFn: (row, value) => {
                  if (value === 'Pending') return row.pendingCount > 0;
                  if (value === 'Approved') return row.pendingCount === 0;
                  return true;
                }
              }
            ]}
            columns={[
              { 
                key: 'clientName', 
                label: 'Client',
                render: (row) => <span style={{ fontWeight: 'bold' }}>{row.clientName}</span>
              },
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
