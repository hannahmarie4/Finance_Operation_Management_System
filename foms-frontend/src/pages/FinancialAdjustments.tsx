import React, { useState } from 'react';
import { useAppData } from '../context/AppDataContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ToastContext';
import { DataTable } from '../components/DataTable';
import { TableContainer } from '../components/TableContainer';
import { Card } from '../components/Card';
import { Button } from '../components/Buttons';
import { StatusBadge } from '../components/StatusBadge';
import { CalendarPicker } from '../components/FormModals';
import type { FinancialAdjustment } from '../data/seed';
import '../components/FormModals.css';
function getEmployeeName(userId: string): string {
  if (userId === 'EMP-001') return 'Crystalyn Joyce C. Fajardo';
  if (userId === 'EMP-002') return 'Misty';
  if (userId === 'EMP-003') return 'Maria Mariel Jane Anonuevo';

  if (userId === 'EMP-004') return 'Joana Marie Ogaya';
  return userId;
}

export default function FinancialAdjustments() {
  const { financialAdjustments, addAdjustment, updateAdjustment, addAuditLog, invoices, arRecords, addCashFlowRecord, clients } = useAppData();
  const { user } = useAuth();
  const { toast } = useToast();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewRecordId, setViewRecordId] = useState<string | null>(null);
  
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Form State
  const [type, setType] = useState<'Adjustment' | 'Credit Memo'>('Adjustment');
  const [amount, setAmount] = useState<number | ''>('');
  const [reason, setReason] = useState('');
  const [referenceNo, setReferenceNo] = useState('');
  const [affectedRecordId, setAffectedRecordId] = useState('');
  const [notes, setNotes] = useState('');
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [showFullImage, setShowFullImage] = useState(false);



  const handleOpenModal = () => {
    setIsModalOpen(true);
    setType('Adjustment');
    setAmount('');
    setReason('');
    setReferenceNo('');
    setAffectedRecordId('');
    setNotes('');
    setPreviewImage('https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?q=80&w=600&auto=format&fit=crop');
    setShowFullImage(false);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setViewRecordId(null);
  };

  const handleSubmit = (status: 'Draft' | 'Pending Approval' | 'Approved') => {
    // TC 324: Attempt to apply a financial adjustment without required details
    if (!amount || Number(amount) <= 0) {
      toast.error('Amount must be greater than zero.', 'Validation Error');
      return;
    }
    if (!reason.trim()) {
      toast.error('Reason is required.', 'Validation Error');
      return;
    }
    // TC 327: Attempt to finalize an adjustment or credit memo without an affected record link -> System blocks
    if (!affectedRecordId) {
      toast.error('An affected finance record (e.g., Invoice) must be linked.', 'Missing Link');
      return;
    }

    const linkedInvoice = invoices.find(i => i.id === affectedRecordId);
    if (!linkedInvoice) {
      toast.error('The selected record could not be found.', 'Invalid Link');
      return;
    }

    const newAdjustment: FinancialAdjustment = {
      id: `${type === 'Adjustment' ? 'ADJ' : 'CM'}-${Date.now()}`,
      type,
      amount: Number(amount),
      reason,
      referenceNo: referenceNo || 'N/A',
      status,
      affectedRecordId: linkedInvoice.id,
      clientId: linkedInvoice.clientId,
      createdAt: new Date().toISOString(),
      createdBy: user?.employeeId || 'System'
    };

    addAdjustment(newAdjustment);

    addAuditLog({
      id: `AL-${Date.now()}`,
      userId: user?.employeeId || 'System',
      userFullName: user?.fullName || 'System',
      userRole: user?.role || 'Accountant',
      action: 'RECORD_ADJUSTMENT',
      module: 'Financial Adjustments',
      recordId: newAdjustment.id,
      recordType: 'Adjustment',
      ipAddress: '127.0.0.1',
      details: `Recorded ${type} for ₱${newAdjustment.amount} linked to ${linkedInvoice.id}. Status: ${status}`,
      timestamp: new Date().toISOString()
    });

    toast.success(`${type} recorded successfully.`, 'Success');
    handleCloseModal();
  };

  const handleApprove = (adj: FinancialAdjustment) => {
    updateAdjustment(adj.id, { status: 'Approved' });
    
    // Check if linked invoice is paid or unpaid
    const linkedInvoice = invoices.find(i => i.id === adj.affectedRecordId);
    if (linkedInvoice) {
      // Check payment status from Invoice or AR
      const ar = arRecords.find(a => a.invoiceId === linkedInvoice.id);
      // It's fully paid if status is Paid or if before this adjustment, AR was 0
      // Actually AR already dynamically recalculates, so let's just check invoice.status 
      // or if amountPaid >= originalAmount
      const isPaid = linkedInvoice.status === 'Paid' || (ar && (ar.paidAmount >= ar.originalAmount));

      if (isPaid) {
        // Scenario 2: Paid Invoice -> Refund -> Cash Outflow
        addCashFlowRecord({
          id: `CF-REF-${Date.now()}`,
          type: 'Outflow',
          amount: adj.amount,
          sourceReference: `Refund (Credit Memo: ${adj.id}) - Client: ${adj.clientId}`,
          date: new Date().toISOString(),
          recordedBy: user?.fullName || 'System'
        });
        toast.success(`Approved! Invoice was already paid. A Refund (Cash Outflow) was automatically recorded.`, 'Refund Triggered');
      } else {
        // Scenario 1: Unpaid Invoice -> System automatically deducts AR (done via AppDataContext AR derived state)
        toast.success(`Approved! AR outstanding balance was automatically reduced.`, 'Approved');
      }
    } else {
      toast.success(`${adj.type} approved successfully.`, 'Approved');
    }
  };

  const handleReject = (adj: FinancialAdjustment) => {
    updateAdjustment(adj.id, { status: 'Rejected' });
    toast.error(`${adj.type} rejected.`, 'Rejected');
  };

  const handleRecordFinalize = (adj: FinancialAdjustment) => {
    if (!amount || Number(amount) <= 0) {
      toast.error('Amount must be greater than zero.', 'Validation Error');
      return;
    }
    if (!reason.trim()) {
      toast.error('Reason is required.', 'Validation Error');
      return;
    }
    if (!notes.trim()) {
      toast.error('Accountant notes are required to finalize this record.', 'Validation Error');
      return;
    }

    updateAdjustment(adj.id, {
      status: 'Recorded',
      amount: Number(amount),
      reason,
      referenceNo,
      remarks: notes
    });

    toast.success(
      adj.type === 'Credit Memo'
        ? `Credit Memo applied successfully. Accounts Receivable has been updated.`
        : `Adjustment recorded successfully. AR balances have been updated.`,
      'Finalized'
    );
    handleCloseModal();
  };

  const columns = [
    { key: 'id', label: 'RECORD ID', sortable: true },
    { key: 'affectedRecordId', label: 'LINKED INVOICE', sortable: true },
    {
      key: 'amount',
      label: 'AMOUNT',
      sortable: true,
      render: (row: FinancialAdjustment) => `₱${row.amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`
    },
    {
      key: 'createdAt',
      label: 'DATE RECORDED',
      sortable: true,
      render: (row: FinancialAdjustment) => new Date(row.createdAt).toLocaleDateString('en-PH')
    },
    {
      key: 'status',
      label: 'STATUS',
      sortable: true,
      render: (row: FinancialAdjustment) => <StatusBadge status={row.status} />
    }
  ];

  const actions = [
    {
      label: 'View Details',
      icon: 'ti-eye',
      onClick: (row: FinancialAdjustment) => {
        setViewRecordId(row.id);
        setAmount(row.amount);
        setReason(row.reason);
        setReferenceNo(row.referenceNo);
        setNotes(row.remarks || '');
      }
    }
  ];

  const viewRecord = viewRecordId ? financialAdjustments.find(a => a.id === viewRecordId) : null;

  const filteredAdjustments = financialAdjustments.filter(a => {
    if (fromDate && new Date(a.createdAt) < new Date(fromDate)) return false;
    if (toDate && new Date(a.createdAt) > new Date(toDate + 'T23:59:59')) return false;
    return true;
  });

  const totalAdjustments = filteredAdjustments.length;
  const pendingApprovals = filteredAdjustments.filter(a => a.status === 'Pending Approval').length;
  const totalAmount = filteredAdjustments.reduce((sum, a) => sum + (a.status === 'Recorded' || a.status === 'Approved' ? a.amount : 0), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
        {[
          { label: 'TOTAL ADJUSTMENTS', value: totalAdjustments, border: '#E2E8F0', bg: '#fff', color: '#64748B', sub: 'Across all records' },
          { label: 'PENDING APPROVALS', value: pendingApprovals, border: '#FDE68A', bg: '#fff', color: '#D97706', sub: 'Awaiting manager review' },
          { label: 'APPROVED VALUE', value: `₱${totalAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`, border: '#BBF7D0', bg: '#fff', color: '#16A34A', sub: 'Total amount approved' },
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
            <p style={{ margin: '0 0 4px', fontSize: typeof kpi.value === 'number' ? 32 : 24, fontWeight: 800, color: '#111827', lineHeight: 1 }}>{kpi.value}</p>
            <p style={{ margin: 0, fontSize: 12, color: '#9CA3AF' }}>{kpi.sub}</p>
          </div>
        ))}
      </div>
      <TableContainer>
        <DataTable
          title={user?.role === 'Finance Manager' || user?.role === 'Head Accountant' ? 'Financial Validation' : 'Financial Adjustments'}
          subtitle={user?.role === 'Finance Manager' || user?.role === 'Head Accountant' ? 'Review and validate adjustment requests submitted by the Assistant of Finance Manager.' : 'Create and manage adjustment requests for client accounts.'}
          exportable={true}
          createButtons={user?.role === 'Finance Manager' || user?.role === 'Head Accountant' ? undefined : [
            {
              label: 'New Adjustment / Memo',
              icon: 'ti-plus',
              onClick: handleOpenModal
            }
          ]}
          data={filteredAdjustments}
          columns={columns}
          actions={actions}
          rowKey="id"
          searchPlaceholder="Search adjustments by ID, Invoice, or Reason..."
          searchFields={['id', 'affectedRecordId', 'reason']}
          customFilters={
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: '13px', color: '#64748B', fontWeight: 600 }}>From:</span>
                <div style={{ width: '140px' }}>
                  <CalendarPicker 
                    label=""
                    value={fromDate} 
                    onChange={setFromDate} 
                    placeholder="Start date..." 
                    variant="filter"
                    maxDate="2024-12-31"
                  />
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: '13px', color: '#64748B', fontWeight: 600 }}>To:</span>
                <div style={{ width: '140px' }}>
                  <CalendarPicker 
                    label=""
                    value={toDate} 
                    onChange={setToDate} 
                    placeholder="End date..." 
                    variant="filter"
                    minDate={fromDate}
                    maxDate="2024-12-31"
                  />
                </div>
              </div>
            </div>
          }
          defaultPageSize={10}
        />
      </TableContainer>

      {/* CREATE MODAL */}
      {isModalOpen && (
        <div className="modal-overlay" style={{ backdropFilter: 'none', WebkitBackdropFilter: 'none' }}>
          <div className="modal-card" style={{ width: '500px' }}>
            <div className="modal-hd">
              <h3 className="modal-hd-title">Record Financial Adjustment</h3>
              <button className="modal-x-btn" onClick={handleCloseModal}>&times;</button>
            </div>
            <div className="modal-bd">

              <div className="tf-group state-default">
                <label className="tf-label">Link to Finance Record (Invoice) <span style={{ color: 'red' }}>*</span></label>
                <div className="tf-wrapper">
                  <input
                    type="text"
                    className="tf-input"
                    list="invoice-options"
                    value={affectedRecordId}
                    onChange={e => setAffectedRecordId(e.target.value)}
                    placeholder="Select or type Invoice to apply to..."
                  />
                  <datalist id="invoice-options">
                    {invoices.filter(i => ['Sent', 'Overdue'].includes(i.status)).map(i => {
                      const client = clients?.find(c => c.id === i.clientId);
                      const clientName = client ? client.name : i.clientId;
                      return (
                        <option key={i.id} value={i.id}>
                          {i.id} ({clientName}) - Balance: ₱{(arRecords.find(a => a.invoiceId === i.id)?.outstandingBalance || 0).toLocaleString('en-PH')}
                        </option>
                      );
                    })}
                  </datalist>
                </div>
              </div>

              <div className="tf-group state-default">
                <label className="tf-label">Amount (₱) <span style={{ color: 'red' }}>*</span></label>
                <div className="tf-wrapper">
                  <input type="number" className="tf-input" value={amount} onChange={e => setAmount(Number(e.target.value))} placeholder="0.00" />
                </div>
              </div>

              <div className="tf-group state-default">
                <label className="tf-label">Reason / Justification <span style={{ color: 'red' }}>*</span></label>
                <div className="tf-wrapper tf-textarea-wrapper">
                  <textarea className="tf-textarea" value={reason} onChange={e => setReason(e.target.value)} placeholder="Why is this being applied?" />
                </div>
              </div>

              <div className="tf-group state-default">
                <label className="tf-label">External Reference (Optional)</label>
                <div className="tf-wrapper">
                  <input type="text" className="tf-input" value={referenceNo} onChange={e => setReferenceNo(e.target.value)} placeholder="e.g., CM-2026-001" />
                </div>
              </div>
              <div className="tf-group state-default">
                <label className="tf-label">Credit Memo (Photo)</label>
                  <div style={{ border: '1px solid #E2E8F0', borderRadius: '8px', overflow: 'hidden' }}>
                    <div 
                      style={{ position: 'relative', height: '180px', background: '#E2E8F0', cursor: 'pointer', overflow: 'hidden' }}
                      onClick={() => setShowFullImage(true)}
                      onMouseEnter={e => {
                        const overlay = e.currentTarget.querySelector('.img-overlay') as HTMLElement;
                        if (overlay) overlay.style.opacity = '1';
                      }}
                      onMouseLeave={e => {
                        const overlay = e.currentTarget.querySelector('.img-overlay') as HTMLElement;
                        if (overlay) overlay.style.opacity = '0';
                      }}
                    >
                      <img src={previewImage!} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Credit Memo" />
                      <div className="img-overlay" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity 0.2s' }}>
                        <div style={{ background: 'rgba(0,0,0,0.8)', color: 'white', padding: '8px 16px', fontSize: '13px', display: 'inline-block' }}>
                          Click to view full size
                        </div>
                      </div>
                    </div>
                    <div style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', background: '#F8FAFC' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#3B82F6', fontSize: '12px', fontWeight: 600 }}>
                        <i className="ti-image" /> Original Document
                      </div>
                      <span style={{ fontSize: '11px', color: '#64748B' }}>Source: System Integration</span>
                    </div>
                  </div>
              </div>
            </div>
            <div className="modal-ft" style={{ justifyContent: 'flex-end' }}>
              <Button title="Submit for Review" variant="primary" onClick={() => handleSubmit('Pending Approval')} />
            </div>
          </div>
        </div>
      )}

      {/* FULL IMAGE MODAL */}
      {showFullImage && previewImage && (
        <div className="modal-overlay" style={{ zIndex: 99999, background: 'rgba(0,0,0,0.8)' }} onClick={() => setShowFullImage(false)}>
          <div style={{ position: 'relative', maxWidth: '90%', maxHeight: '90%', margin: 'auto' }} onClick={e => e.stopPropagation()}>
            <img src={previewImage} alt="Full Size" style={{ maxWidth: '100%', maxHeight: '90vh', objectFit: 'contain', borderRadius: '8px' }} />
            <button 
              onClick={() => setShowFullImage(false)}
              style={{ position: 'absolute', top: '-40px', right: 0, background: 'none', border: 'none', color: 'white', fontSize: '32px', cursor: 'pointer' }}
            >&times;</button>
          </div>
        </div>
      )}

      {/* VIEW MODAL (TC 330: Reopen a saved adjustment) */}
      {viewRecord && (
        <div className="modal-overlay" style={{ backdropFilter: 'none', WebkitBackdropFilter: 'none' }}>
          <div className="modal-card" style={{ width: '500px' }}>
            <div className="modal-hd">
              <h3 className="modal-hd-title">{viewRecord.type} Details: {viewRecord.id}</h3>
              <button className="modal-x-btn" onClick={handleCloseModal}>&times;</button>
            </div>
            <div className="modal-bd">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid #E2E8F0' }}>
                <div>
                  <label style={{ fontSize: '11px', color: '#64748B', textTransform: 'uppercase', fontWeight: 700, display: 'block' }}>Status</label>
                  <StatusBadge status={viewRecord.status} />
                </div>
                <div>
                  <label style={{ fontSize: '11px', color: '#64748B', textTransform: 'uppercase', fontWeight: 700, display: 'block' }}>Created By</label>
                  <span style={{ fontSize: '12px', fontWeight: 600 }}>{getEmployeeName(viewRecord.createdBy)}</span>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '16px' }}>
                <div>
                  <label style={{ fontSize: '11px', color: '#64748B', textTransform: 'uppercase', fontWeight: 700 }}>Linked Invoice</label>
                  <div style={{ fontSize: '13px', fontWeight: 600 }}>{viewRecord.affectedRecordId}</div>
                </div>
                <div>
                  <label style={{ fontSize: '11px', color: '#64748B', textTransform: 'uppercase', fontWeight: 700 }}>Amount</label>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: '#15803D' }}>₱{viewRecord.amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</div>
                </div>
              </div>

              {user?.role === 'Accountant' && viewRecord.status === 'Approved' ? (
                <>
                  <div className="tf-group state-default" style={{ marginBottom: '16px' }}>
                    <label className="tf-label">Adjustment Amount (₱) <span style={{ color: 'red' }}>*</span></label>
                    <div className="tf-wrapper">
                      <input type="number" className="tf-input" value={amount} onChange={e => setAmount(Number(e.target.value))} />
                    </div>
                  </div>
                  <div className="tf-group state-default" style={{ marginBottom: '16px' }}>
                    <label className="tf-label">Reference No.</label>
                    <div className="tf-wrapper">
                      <input type="text" className="tf-input" value={referenceNo} onChange={e => setReferenceNo(e.target.value)} />
                    </div>
                  </div>
                  <div className="tf-group state-default" style={{ marginBottom: '16px' }}>
                    <label className="tf-label">Reason <span style={{ color: 'red' }}>*</span></label>
                    <div className="tf-wrapper tf-textarea-wrapper">
                      <textarea className="tf-textarea" value={reason} onChange={e => setReason(e.target.value)} />
                    </div>
                  </div>
                  {/* Notes removed as flow completes on Manager approval */}
                </>
              ) : (
                <>
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ fontSize: '11px', color: '#64748B', textTransform: 'uppercase', fontWeight: 700 }}>Reference No.</label>
                    <div style={{ fontSize: '13px', padding: '10px', background: '#F8FAFC', borderRadius: '4px', border: '1px solid #E2E8F0' }}>{viewRecord.referenceNo || 'N/A'}</div>
                  </div>
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ fontSize: '11px', color: '#64748B', textTransform: 'uppercase', fontWeight: 700 }}>Reason</label>
                    <div style={{ fontSize: '13px', padding: '10px', background: '#F8FAFC', borderRadius: '4px', border: '1px solid #E2E8F0' }}>{viewRecord.reason}</div>
                  </div>
                  {viewRecord.remarks && (
                    <div style={{ marginBottom: '16px' }}>
                      <label style={{ fontSize: '11px', color: '#64748B', textTransform: 'uppercase', fontWeight: 700 }}>Accountant Notes</label>
                      <div style={{ fontSize: '13px', padding: '10px', background: '#F8FAFC', borderRadius: '4px', border: '1px solid #E2E8F0' }}>{viewRecord.remarks}</div>
                    </div>
                  )}
                  <div style={{ marginBottom: '16px' }}>
                    <label className="tf-label">Credit Memo (Photo)</label>
                    <div style={{ border: '1px solid #E2E8F0', borderRadius: '8px', overflow: 'hidden' }}>
                      <div 
                        style={{ position: 'relative', height: '180px', background: '#E2E8F0', cursor: 'pointer', overflow: 'hidden' }}
                        onClick={() => {
                          setPreviewImage('https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?q=80&w=600&auto=format&fit=crop');
                          setShowFullImage(true);
                        }}
                        onMouseEnter={e => {
                          const overlay = e.currentTarget.querySelector('.img-overlay') as HTMLElement;
                          if (overlay) overlay.style.opacity = '1';
                        }}
                        onMouseLeave={e => {
                          const overlay = e.currentTarget.querySelector('.img-overlay') as HTMLElement;
                          if (overlay) overlay.style.opacity = '0';
                        }}
                      >
                        <img src="https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?q=80&w=600&auto=format&fit=crop" style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Credit Memo" />
                        <div className="img-overlay" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity 0.2s' }}>
                          <div style={{ background: 'rgba(0,0,0,0.8)', color: 'white', padding: '8px 16px', fontSize: '13px', display: 'inline-block' }}>
                            Click to view full size
                          </div>
                        </div>
                      </div>
                      <div style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', background: '#F8FAFC' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#3B82F6', fontSize: '12px', fontWeight: 600 }}>
                          <i className="ti-image" /> Original Document
                        </div>
                        <span style={{ fontSize: '11px', color: '#64748B' }}>Source: System Integration</span>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
            <div className="modal-ft" style={{ justifyContent: 'flex-end' }}>
              {viewRecord.status === 'Pending Approval' && (user?.role === 'Head Accountant' || user?.role === 'Finance Manager') && (
                <div style={{ display: 'flex', gap: '16px', width: '100%' }}>
                  <button 
                    onClick={() => { handleReject(viewRecord); handleCloseModal(); }}
                    style={{ flex: 1, padding: '16px 24px', background: '#FEF2F2', color: '#EF4444', border: '2px solid #EF4444', borderRadius: '8px', fontSize: '16px', fontWeight: 800, cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', transition: 'all 0.2s' }}
                  >
                    <i className="ti-close" /> Reject
                  </button>
                  <button 
                    onClick={() => { handleApprove(viewRecord); handleCloseModal(); }}
                    style={{ flex: 1, padding: '16px 24px', background: '#10B981', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: 800, cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.2)', transition: 'all 0.2s' }}
                  >
                    <i className="ti-check" /> Approve
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
