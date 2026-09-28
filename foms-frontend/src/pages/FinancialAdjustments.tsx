import React, { useState } from 'react';
import { useAppData } from '../context/AppDataContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ToastContext';
import { DataTable } from '../components/DataTable';
import { TableContainer } from '../components/TableContainer';
import { Card } from '../components/Card';
import { Button } from '../components/Buttons';
import { StatusBadge } from '../components/StatusBadge';
import type { FinancialAdjustment } from '../data/seed';
import '../components/FormModals.css';

export default function FinancialAdjustments() {
  const { financialAdjustments, addAdjustment, updateAdjustment, addAuditLog, invoices, arRecords } = useAppData();
  const { user } = useAuth();
  const { toast } = useToast();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewRecordId, setViewRecordId] = useState<string | null>(null);

  // Form State
  const [type, setType] = useState<'Adjustment' | 'Credit Memo'>('Adjustment');
  const [amount, setAmount] = useState<number | ''>('');
  const [reason, setReason] = useState('');
  const [referenceNo, setReferenceNo] = useState('');
  const [affectedRecordId, setAffectedRecordId] = useState('');
  const [notes, setNotes] = useState('');

  const handleOpenModal = () => {
    setIsModalOpen(true);
    setType('Adjustment');
    setAmount('');
    setReason('');
    setReferenceNo('');
    setAffectedRecordId('');
    setNotes('');
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
    toast.success(`${adj.type} approved successfully. It can now be finalized by the Accountant.`, 'Approved');
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
    {
      key: 'type',
      label: 'TYPE',
      sortable: true,
      render: (row: FinancialAdjustment) => (
        <span style={{ fontWeight: 'bold', color: '#0F172A' }}>
          {row.type}
        </span>
      )
    },
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <TableContainer>
        <DataTable
          title="Adjustment Records"
          subtitle="Manage and apply adjustments or credit memos to client accounts."
          createButtons={[
            {
              label: 'New Adjustment / Memo',
              icon: 'ti-plus',
              onClick: handleOpenModal
            }
          ]}
          data={financialAdjustments}
          columns={columns}
          actions={actions}
          rowKey="id"
          searchPlaceholder="Search adjustments by ID, Invoice, or Reason..."
          searchFields={['id', 'affectedRecordId', 'reason']}
          defaultPageSize={10}
        />
      </TableContainer>

      {/* CREATE MODAL */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ width: '500px' }}>
            <div className="modal-hd">
              <h3 className="modal-hd-title">Record Financial Adjustment / Credit Memo</h3>
              <button className="modal-x-btn" onClick={handleCloseModal}>&times;</button>
            </div>
            <div className="modal-bd">
              <div className="tf-group state-default">
                <label className="tf-label">Record Type</label>
                <div className="tf-wrapper">
                  <select className="tf-input" value={type} onChange={e => setType(e.target.value as any)}>
                    <option value="Adjustment">Financial Adjustment</option>
                    <option value="Credit Memo">Credit Memo</option>
                  </select>
                </div>
              </div>

              <div className="tf-group state-default">
                <label className="tf-label">Link to Finance Record (Invoice) <span style={{ color: 'red' }}>*</span></label>
                <div className="tf-wrapper">
                  <select className="tf-input" value={affectedRecordId} onChange={e => setAffectedRecordId(e.target.value)}>
                    <option value="">Select Invoice to apply to...</option>
                    {invoices.filter(i => ['Sent', 'Overdue'].includes(i.status)).map(i => (
                      <option key={i.id} value={i.id}>{i.id} ({i.clientId}) - Balance: ₱{(arRecords.find(a => a.invoiceId === i.id)?.outstandingBalance || 0).toLocaleString('en-PH')}</option>
                    ))}
                  </select>
                </div>
                <div className="tf-help-text">An adjustment must be linked to a valid affected record (TC 327).</div>
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
            </div>
            <div className="modal-ft">
              <Button title="Cancel" variant="secondary" onClick={handleCloseModal} />
              {/* QA testing allows saving directly as approved to verify AR logic */}
              <Button title="Submit for Review" variant="primary" onClick={() => handleSubmit('Pending Approval')} />
              <Button title="Save & Approve (QA)" variant="success" icon="ti-check" onClick={() => handleSubmit('Approved')} />
            </div>
          </div>
        </div>
      )}

      {/* VIEW MODAL (TC 330: Reopen a saved adjustment) */}
      {viewRecord && (
        <div className="modal-overlay">
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
                  <span style={{ fontSize: '12px', fontWeight: 600 }}>{viewRecord.createdBy}</span>
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
                  <div className="tf-group state-default" style={{ marginBottom: '16px' }}>
                    <label className="tf-label">Accountant Notes <span style={{ color: 'red' }}>*</span></label>
                    <div className="tf-wrapper tf-textarea-wrapper">
                      <textarea className="tf-textarea" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Required notes before finalizing..." />
                    </div>
                  </div>
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
                </>
              )}
            </div>
            <div className="modal-ft" style={{ justifyContent: 'space-between' }}>
              <Button title="Close" variant="secondary" onClick={handleCloseModal} />

              {viewRecord.status === 'Pending Approval' && (user?.role === 'Head Accountant' || user?.role === 'Finance Manager') && (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <Button title="Reject" variant="danger" onClick={() => { handleReject(viewRecord); handleCloseModal(); }} />
                  <Button title="Approve" variant="success" onClick={() => { handleApprove(viewRecord); handleCloseModal(); }} />
                </div>
              )}
              {viewRecord.status === 'Approved' && user?.role === 'Accountant' && (
                <Button
                  title={viewRecord.type === 'Credit Memo' ? "Apply Credit Memo" : "Record / Finalize"}
                  variant="primary"
                  icon="ti-check"
                  onClick={() => handleRecordFinalize(viewRecord)}
                />
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
