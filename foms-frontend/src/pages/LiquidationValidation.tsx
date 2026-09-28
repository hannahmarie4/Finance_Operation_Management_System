import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppData } from '../context/AppDataContext';
import { DataTable } from '../components/DataTable';
import { TableContainer } from '../components/TableContainer';
import { Card } from '../components/Card';
import { Button } from '../components/Buttons';
import { StatusBadge } from '../components/StatusBadge';
import { useToast } from '../components/ToastContext';
import { useAuth } from '../context/AuthContext';
import { RecordHistoryModal } from '../components/RecordHistoryModal';
import Dropdown from '../components/Dropdown';
import '../components/FormModals.css';

export default function LiquidationValidation() {
  const { liquidations, updateLiquidation, addAuditLog, addCashFlowRecord } = useAppData();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { id } = useParams();

  const [remarks, setRemarks] = useState('');
  const [reviewDecision, setReviewDecision] = useState('Validate Liquidation');
  const [isRejecting, setIsRejecting] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<any>(null);

  const columns = [
    { key: 'reference', label: 'REFERENCE NO.', sortable: true },
    { key: 'submittedBy', label: 'SUBMITTED BY', sortable: true },
    {
      key: 'submittedAt',
      label: 'DATE SUBMITTED',
      sortable: true,
      render: (row: any) => new Date(row.submittedAt).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })
    },
    {
      key: 'amount',
      label: 'AMOUNT',
      sortable: true,
      render: (row: any) => `₱${row.amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`
    },
    {
      key: 'status',
      label: 'STATUS',
      render: (row: any) => <StatusBadge status={row.status} />
    }
  ];

  const actions = [
    {
      label: 'Review Liquidation',
      icon: 'ti-file-search',
      onClick: (row: any) => navigate(`/liquidations/${row.id}`)
    }
  ];

  const viewRecord = liquidations.find(l => l.id === id);

  const handleLogDecision = () => {
    if (reviewDecision === 'Validate Liquidation') {
      handleValidate();
    } else {
      handleReject();
    }
  };

  const handleValidate = () => {
    if (!viewRecord) return;

    updateLiquidation(viewRecord.id, { status: 'Validated', remarks: 'Successfully validated.' });

    addCashFlowRecord({
      id: `CFO-${Date.now()}`,
      date: new Date().toISOString(),
      description: `Liquidation Validated: ${viewRecord.id} - ${viewRecord.reference}`,
      type: 'Outflow',
      category: 'Operations',
      amount: viewRecord.amount,
      reference: viewRecord.id,
      recordedBy: user?.employeeId || 'System',
      status: 'Completed'
    });

    addAuditLog({
      id: `AL-${Date.now()}`,
      userId: user?.employeeId || 'System',
      userFullName: user?.fullName || 'System',
      userRole: user?.role || 'Assistant of Financial Manager',
      action: 'VALIDATE_LIQUIDATION',
      module: 'Liquidation Validation',
      recordId: viewRecord.id,
      recordType: 'Liquidation',
      ipAddress: '127.0.0.1',
      details: 'Liquidation report completely validated against supporting documents.',
      timestamp: new Date().toISOString()
    });

    toast.success(`Liquidation ${viewRecord.id} successfully validated.`, 'Success');
    navigate('/liquidations');
  };

  const handleReject = () => {
    if (!viewRecord) return;
    if (!remarks.trim()) {
      toast.error('Please enter remarks for rejection.', 'Required Field');
      return;
    }

    updateLiquidation(viewRecord.id, { status: 'Returned', remarks });
    addAuditLog({
      id: `AL-${Date.now()}`,
      userId: user?.employeeId || 'System',
      userFullName: user?.fullName || 'System',
      userRole: user?.role || 'Assistant of Financial Manager',
      action: 'REJECT_LIQUIDATION',
      module: 'Liquidation Validation',
      recordId: viewRecord.id,
      recordType: 'Liquidation',
      ipAddress: '127.0.0.1',
      details: `Liquidation returned. Reason: ${remarks}`,
      timestamp: new Date().toISOString()
    });

    toast.error(`Liquidation ${viewRecord.id} returned for correction.`, 'Returned');
    setIsRejecting(false);
    setRemarks('');
    navigate('/liquidations');
  };

  if (viewRecord) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <Card style={{ padding: '40px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
            <h3 style={{ margin: 0, fontSize: '1.75rem', color: '#0F172A', fontWeight: 800 }}>{viewRecord.id}</h3>
            <StatusBadge status={viewRecord.status} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '32px' }}>
            <div style={{ border: '1px solid #E2E8F0', borderRadius: '8px', padding: '16px', background: '#fff' }}>
              <div style={{ fontSize: '12px', color: '#64748B', marginBottom: '6px' }}>Operations / trip reference</div>
              <div style={{ fontSize: '15px', color: '#0F172A', fontWeight: 700 }}>{viewRecord.reference}</div>
            </div>
            <div style={{ border: '1px solid #10B981', borderRadius: '8px', padding: '16px', background: '#F0FDF4' }}>
              <div style={{ fontSize: '12px', color: '#047857', marginBottom: '6px' }}>Total computed amount</div>
              <div style={{ fontSize: '18px', color: '#047857', fontWeight: 800 }}>₱{viewRecord.amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</div>
            </div>
          </div>

          <div style={{ marginBottom: '32px' }}>
            <h4 style={{ margin: '0 0 16px 0', fontSize: '15px', fontWeight: 800, color: '#0F172A' }}>Expense breakdown</h4>
            <div style={{ border: '1px solid #E2E8F0', borderRadius: '8px', overflow: 'hidden', background: '#fff' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead style={{ background: '#F8FAFC' }}>
                  <tr>
                    <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 600, color: '#64748B', borderBottom: '1px solid #E2E8F0' }}>Type</th>
                    <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 600, color: '#64748B', borderBottom: '1px solid #E2E8F0', textAlign: 'right' }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {viewRecord.expenses?.map((exp, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #E2E8F0' }}>
                      <td style={{ padding: '16px', verticalAlign: 'top' }}>
                        <div style={{ fontSize: '14px', color: '#0F172A', fontWeight: 700, marginBottom: '4px' }}>{exp.type}</div>
                        <div style={{ fontSize: '13px', color: '#64748B' }}>{exp.description}</div>
                      </td>
                      <td style={{ padding: '16px', fontSize: '14px', color: '#0F172A', fontWeight: 700, textAlign: 'right', verticalAlign: 'top' }}>
                        ₱{exp.amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                  <tr style={{ background: '#F8FAFC' }}>
                    <td style={{ padding: '16px', fontSize: '14px', color: '#0F172A', fontWeight: 800 }}>Total</td>
                    <td style={{ padding: '16px', fontSize: '15px', color: '#10B981', fontWeight: 800, textAlign: 'right' }}>
                      ₱{viewRecord.amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div style={{ marginBottom: '40px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#0F172A' }}>Supporting documents</h4>
              <span style={{ fontSize: '13px', color: '#64748B', fontWeight: 600 }}>{viewRecord.documents.length} files</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {viewRecord.documents.map((doc, idx) => (
                <div key={idx} style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '6px', background: '#F1F5F9', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <i className="ti ti-file-text" style={{ color: '#64748B', fontSize: '20px' }} />
                    </div>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A' }}>{doc.name}</div>
                      <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>{doc.size}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedDoc(doc)}
                    style={{ padding: '6px 16px', background: '#fff', border: '1px solid #E2E8F0', borderRadius: '6px', fontSize: '13px', fontWeight: 700, color: '#0F172A', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <i className="ti ti-eye" /> View
                  </button>
                </div>
              ))}
            </div>
          </div>

          {viewRecord.remarks && viewRecord.status !== 'Pending Validation' && (
            <div style={{ marginBottom: '32px', padding: '16px', background: '#F1F5F9', borderLeft: '4px solid #64748B', borderRadius: '4px' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#475569', display: 'block', textTransform: 'uppercase', marginBottom: '6px' }}>Previous Remarks</span>
              <span style={{ fontSize: '14px', color: '#1E293B' }}>{viewRecord.remarks}</span>
            </div>
          )}

          {selectedDoc && (
            <div className="modal-overlay" style={{ zIndex: 1000 }}>
              <div className="modal-card" style={{ width: '500px' }}>
                <div className="modal-hd">
                  <h3 className="modal-hd-title">View Document: {selectedDoc.name}</h3>
                  <button className="modal-x-btn" onClick={() => setSelectedDoc(null)}>&times;</button>
                </div>
                <div className="modal-bd" style={{ textAlign: 'center', padding: '32px 24px' }}>
                  <i className="ti ti-file-text" style={{ fontSize: '48px', color: '#94A3B8', marginBottom: '16px', display: 'block' }} />
                  <p style={{ color: '#475569', fontSize: '14px', marginBottom: '24px' }}>
                    Previewing <strong>{selectedDoc.name}</strong> ({selectedDoc.size}).<br /><br />
                    This is a mock view. In a real system, the actual image or PDF would be displayed here.
                  </p>
                  <Button title="Download Document" variant="secondary" icon="ti-download" onClick={() => toast.success(`Downloading ${selectedDoc.name}...`)} />
                </div>
              </div>
            </div>
          )}

          {viewRecord.status === 'Pending Validation' ? (
            <div style={{ border: '2px solid #14B8A6', borderRadius: '8px', overflow: 'hidden', background: '#fff' }}>
              <div style={{ background: '#F0FDFA', borderBottom: '1px solid #CCFBF1', padding: '16px 24px' }}>
                <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#047857' }}>Finance review</h4>
              </div>
              <div style={{ padding: '24px' }}>
                <div className="tf-group state-default" style={{ marginBottom: '20px' }}>
                  <label className="tf-label" style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>Review decision</label>
                  <div className="tf-wrapper">
                    <select
                      className="tf-input"
                      value={reviewDecision}
                      onChange={(e) => setReviewDecision(e.target.value)}
                      style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A', padding: '10px 14px' }}
                    >
                      <option value="Validate Liquidation">Validate liquidation</option>
                      <option value="Return for Correction">Return for correction</option>
                    </select>
                  </div>
                </div>

                <div className="tf-group state-default" style={{ marginBottom: '32px' }}>
                  <label className="tf-label" style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>Remarks / validation notes (optional)</label>
                  <div className="tf-wrapper tf-textarea-wrapper">
                    <textarea
                      className="tf-textarea"
                      value={remarks}
                      onChange={e => setRemarks(e.target.value)}
                      placeholder="Optional validation steps or extra context..."
                      style={{ padding: '12px 14px', fontSize: '14px', minHeight: '80px' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                  <button
                    onClick={() => navigate('/liquidations')}
                    style={{ padding: '10px 24px', background: '#fff', color: '#0F172A', border: '1px solid #E2E8F0', borderRadius: '6px', fontSize: '14px', fontWeight: 700, cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleLogDecision}
                    style={{ padding: '10px 24px', background: '#14B8A6', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '14px', fontWeight: 700, cursor: 'pointer' }}
                  >
                    Log decision
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
              <Button title="Close" variant="secondary" onClick={() => navigate('/liquidations')} />
            </div>
          )}
        </Card>

        <RecordHistoryModal
          isOpen={isHistoryOpen}
          onClose={() => setIsHistoryOpen(false)}
          recordId={viewRecord.id}
          recordType="Liquidation"
        />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <TableContainer>
        <DataTable
          title="Liquidation Validation Queue"
          data={liquidations}
          columns={columns}
          actions={actions}
          rowKey="id"
          searchPlaceholder="Search liquidations..."
          searchFields={['id', 'reference', 'submittedBy']}
          defaultPageSize={10}
          filters={[
            {
              key: 'status',
              label: 'All Statuses',
              options: [
                { label: 'Pending Validation', value: 'Pending Validation' },
                { label: 'Validated', value: 'Validated' },
                { label: 'Returned', value: 'Returned' }
              ],
              filterFn: (row: any, value: string) => row.status === value
            }
          ]}
        />
      </TableContainer>
    </div>
  );
}
