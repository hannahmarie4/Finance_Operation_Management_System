import React, { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { Card } from '../components/Card';
import { Button } from '../components/Buttons';
import { TableContainer } from '../components/TableContainer';
import { DataTable } from '../components/DataTable';
import { StatusCard } from '../components/StatusCard';
import Dropdown from '../components/Dropdown';
import { useToast } from '../components/ToastContext';
import { createPortal } from 'react-dom';

interface Settlement {
  id: string;
  type: 'Leftover return' | 'Reimbursement';
  courierName: string;
  tripRef: string;
  submittedAt: string;
  amount: number;
  discrepancy?: number;
  status: 'For validation' | 'Validated' | 'Rejected';
  cashAdvance: number;
  totalExpenses: number;
  envelopeNo?: string;
  cashCounted?: number;
  recordedBy: string;
  recordedAt: string;
}

const MOCK_SETTLEMENTS: Settlement[] = [
  {
    id: 'CF-007',
    type: 'Leftover return',
    courierName: 'Juan Dela Cruz',
    tripRef: 'TRIP-MNL-CEB-001',
    submittedAt: '2026-09-29T10:15:00',
    amount: 4550.00,
    status: 'For validation',
    cashAdvance: 20000.00,
    totalExpenses: 15450.00,
    envelopeNo: 'ENV-JDC-0929',
    cashCounted: 4550.00,
    recordedBy: 'Maria Mariel Jane A. (Accountant)',
    recordedAt: '2026-09-29T10:15:00'
  },
  {
    id: 'CF-008',
    type: 'Leftover return',
    courierName: 'Luis Garcia',
    tripRef: 'TRIP-MNL-ILO-004',
    submittedAt: '2026-09-29T10:40:00',
    amount: 5000.00,
    discrepancy: 200.00,
    status: 'For validation',
    cashAdvance: 25000.00,
    totalExpenses: 19800.00,
    envelopeNo: 'ENV-LG-0929',
    cashCounted: 5000.00,
    recordedBy: 'Maria Mariel Jane A. (Accountant)',
    recordedAt: '2026-09-29T10:40:00'
  },
  {
    id: 'CF-009',
    type: 'Reimbursement',
    courierName: 'Pedro Ramos',
    tripRef: 'TRIP-MNL-DVO-002',
    submittedAt: '2026-09-29T11:05:00',
    amount: 3100.00,
    status: 'For validation',
    cashAdvance: 15000.00,
    totalExpenses: 18100.00,
    recordedBy: 'Maria Mariel Jane A. (Accountant)',
    recordedAt: '2026-09-29T11:05:00'
  },
  {
    id: 'CF-005',
    type: 'Leftover return',
    courierName: 'Mark Reyes',
    tripRef: 'TRIP-MNL-CEB-005',
    submittedAt: '2026-09-28T09:15:00',
    amount: 1500.00,
    status: 'Validated',
    cashAdvance: 10000.00,
    totalExpenses: 8500.00,
    envelopeNo: 'ENV-MR-0928',
    cashCounted: 1500.00,
    recordedBy: 'Maria Mariel Jane A. (Accountant)',
    recordedAt: '2026-09-28T09:15:00'
  },
  {
    id: 'CF-006',
    type: 'Reimbursement',
    courierName: 'Alex Santos',
    tripRef: 'TRIP-MNL-MIN-010',
    submittedAt: '2026-09-28T14:20:00',
    amount: 2000.00,
    status: 'Rejected',
    cashAdvance: 12000.00,
    totalExpenses: 14000.00,
    recordedBy: 'Maria Mariel Jane A. (Accountant)',
    recordedAt: '2026-09-28T14:20:00'
  }
];

const Settlements: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [settlements, setSettlements] = useState<Settlement[]>(MOCK_SETTLEMENTS);
  const [filterTab, setFilterTab] = useState<'Pending' | 'Validated' | 'Rejected' | 'All'>('Pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  
  const [selectedRecord, setSelectedRecord] = useState<Settlement | null>(null);
  const [decision, setDecision] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [remarks, setRemarks] = useState('');

  // Stats
  const pendingCount = settlements.filter(s => s.status === 'For validation').length;
  const validatedCount = settlements.filter(s => s.status === 'Validated').length;
  const rejectedCount = settlements.filter(s => s.status === 'Rejected').length;
  const allCount = settlements.length;

  const pendingLeftoverAmount = settlements.filter(s => s.status === 'For validation' && s.type === 'Leftover return').reduce((sum, s) => sum + s.amount, 0);
  const leftoverEnvelopesCount = settlements.filter(s => s.status === 'For validation' && s.type === 'Leftover return').length;
  
  const pendingReimbAmount = settlements.filter(s => s.status === 'For validation' && s.type === 'Reimbursement').reduce((sum, s) => sum + s.amount, 0);
  const reimbRequestsCount = settlements.filter(s => s.status === 'For validation' && s.type === 'Reimbursement').length;

  // Filter Data
  const filteredData = useMemo(() => {
    return settlements.filter(s => {
      // Tab filter
      if (filterTab === 'Pending' && s.status !== 'For validation') return false;
      if (filterTab === 'Validated' && s.status !== 'Validated') return false;
      if (filterTab === 'Rejected' && s.status !== 'Rejected') return false;
      
      // Type filter
      if (typeFilter && s.type !== typeFilter) return false;

      // Search query
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          s.id.toLowerCase().includes(q) ||
          s.courierName.toLowerCase().includes(q) ||
          s.tripRef.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [settlements, filterTab, searchQuery, typeFilter]);

  const handleReviewClick = (row: Settlement) => {
    setSelectedRecord(row);
    setDecision('');
    setRejectionReason('');
    setRemarks('');
  };

  const handleConfirmDecision = () => {
    if (!decision) {
      toast.error('Please select a decision first.');
      return;
    }
    
    // Update local state for mock
    setSettlements(prev => prev.map(s => {
      if (s.id === selectedRecord?.id) {
        return { ...s, status: decision === 'approve' ? 'Validated' : 'Rejected' };
      }
      return s;
    }));
    
    toast.success(`Settlement ${selectedRecord?.id} has been ${decision === 'approve' ? 'validated' : 'rejected'}.`);
    setSelectedRecord(null);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
        <StatusCard 
          label="Pending Validation" 
          value={pendingCount} 
          icon="ti-clock-hour-4" 
          variant="warning" 
          periodText="waiting for you" 
        />
        <StatusCard 
          label="Leftover Cash" 
          value={`₱${pendingLeftoverAmount.toLocaleString('en-PH', {minimumFractionDigits: 2})}`} 
          icon="ti-cash" 
          variant="success" 
          periodText={`${leftoverEnvelopesCount} envelopes recorded`} 
        />
        <StatusCard 
          label="Reimbursements" 
          value={`₱${pendingReimbAmount.toLocaleString('en-PH', {minimumFractionDigits: 2})}`} 
          icon="ti-receipt-refund" 
          variant="info" 
          periodText={`${reimbRequestsCount} requests`} 
        />
      </div>

      {/* Table Section */}
      <Card style={{ padding: '24px' }}>
        <h2 style={{ margin: '0 0 20px', fontSize: '1.25rem', fontWeight: 800, color: '#0F172A' }}>Settlements from Accountant</h2>
        
        {/* Filters */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '20px' }}>
          <input 
            type="text" 
            placeholder="Search by ID, courier, or trip ref.." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #E2E8F0', fontSize: '13px', width: '250px', outline: 'none' }}
          />
          <select 
            value={filterTab} 
            onChange={(e) => setFilterTab(e.target.value as any)}
            style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #E2E8F0', fontSize: '13px', outline: 'none' }}
          >
            <option value="Pending">Pending ({pendingCount})</option>
            <option value="Validated">Validated ({validatedCount})</option>
            <option value="Rejected">Rejected ({rejectedCount})</option>
            <option value="All">All ({allCount})</option>
          </select>
          <select 
            value={typeFilter} 
            onChange={(e) => setTypeFilter(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #E2E8F0', fontSize: '13px', outline: 'none' }}
          >
            <option value="">Filter by Type</option>
            <option value="Leftover return">Leftover return</option>
            <option value="Reimbursement">Reimbursement</option>
          </select>
        </div>

        {/* Custom Table to exactly match the requested design */}
        <div style={{ border: '1px solid #E2E8F0', borderRadius: '8px', overflow: 'visible' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                <th style={thStyle}>RECORD ID</th>
                <th style={thStyle}>TYPE</th>
                <th style={thStyle}>COURIER / TRIP</th>
                <th style={thStyle}>SUBMITTED</th>
                <th style={thStyle}>AMOUNT</th>
                <th style={thStyle}>STATUS</th>
                <th style={thStyle}>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '24px', textAlign: 'center', color: '#64748B', fontSize: '14px' }}>
                    No settlements found.
                  </td>
                </tr>
              ) : filteredData.map(row => (
                <tr key={row.id} style={{ borderBottom: '1px solid #E2E8F0' }}>
                  <td style={{ ...tdStyle, fontWeight: 700 }}>{row.id}</td>
                  <td style={tdStyle}>
                    <span style={{ 
                      padding: '4px 10px', 
                      borderRadius: '20px', 
                      fontSize: '11px', 
                      fontWeight: 700,
                      background: row.type === 'Leftover return' ? '#ECFDF5' : '#FFFBEB',
                      color: row.type === 'Leftover return' ? '#065F46' : '#92400E'
                    }}>
                      {row.type}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    <div style={{ fontWeight: 600, color: '#1E293B', marginBottom: '2px' }}>{row.courierName}</div>
                    <div style={{ fontSize: '12px', color: '#64748B' }}>{row.tripRef}</div>
                  </td>
                  <td style={tdStyle}>
                    <div style={{ fontWeight: 600, color: '#1E293B', marginBottom: '2px' }}>
                      {new Date(row.submittedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      , {new Date(row.submittedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </td>
                  <td style={tdStyle}>
                    <div style={{ fontWeight: 800, color: row.type === 'Leftover return' ? '#10B981' : '#3B82F6' }}>
                      ₱{row.amount.toLocaleString('en-PH', {minimumFractionDigits: 2})}
                    </div>
                    {row.discrepancy && (
                      <div style={{ fontSize: '11px', color: '#EA580C', fontWeight: 600, marginTop: '2px' }}>
                        Discrepancy ₱{row.discrepancy.toLocaleString('en-PH', {minimumFractionDigits: 2})}
                      </div>
                    )}
                  </td>
                  <td style={tdStyle}>
                    <span style={{ 
                      padding: '4px 10px', 
                      borderRadius: '20px', 
                      fontSize: '11px', 
                      fontWeight: 700,
                      background: row.status === 'For validation' ? '#FFFBEB' : row.status === 'Validated' ? '#ECFDF5' : '#FEF2F2',
                      color: row.status === 'For validation' ? '#B45309' : row.status === 'Validated' ? '#047857' : '#991B1B'
                    }}>
                      {row.status}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    {row.status === 'For validation' && (
                      <Dropdown
                        align="right"
                        items={[
                          {
                            key: 'review',
                            label: 'Review Details',
                            icon: 'ti-file-search',
                            onClick: () => handleReviewClick(row)
                          }
                        ]}
                      />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Review Modal */}
      {selectedRecord && createPortal(
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999 }}>
          <div style={{ background: 'white', borderRadius: '12px', width: '100%', maxWidth: '500px', maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ padding: '24px' }}>
              <h2 style={{ margin: '0 0 4px', fontSize: '1.25rem', fontWeight: 800, color: '#0F172A' }}>
                {selectedRecord.id} • {selectedRecord.type}
              </h2>
              <p style={{ margin: '0 0 24px', fontSize: '13px', color: '#64748B' }}>
                Submitted by the Accountant. Review the details, then choose a decision.
              </p>

              {/* Box 1 */}
              <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '16px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
                  <span style={{ color: '#475569', fontWeight: 600 }}>{selectedRecord.courierName}</span>
                  <span style={{ color: '#1E293B', fontWeight: 700 }}>{selectedRecord.tripRef}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
                  <span style={{ color: '#475569', fontWeight: 600 }}>Cash advance</span>
                  <span style={{ color: '#1E293B', fontWeight: 700 }}>₱{selectedRecord.cashAdvance.toLocaleString('en-PH', {minimumFractionDigits: 2})}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', fontSize: '13px' }}>
                  <span style={{ color: '#475569', fontWeight: 600 }}>Total expenses</span>
                  <span style={{ color: '#1E293B', fontWeight: 700 }}>− ₱{selectedRecord.totalExpenses.toLocaleString('en-PH', {minimumFractionDigits: 2})}</span>
                </div>
                
                <div style={{ height: '1px', background: '#E2E8F0', margin: '0 -16px 12px' }}></div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                  <span style={{ color: '#0F172A', fontWeight: 800 }}>Expected {selectedRecord.type === 'Leftover return' ? 'leftover' : 'reimbursement'}</span>
                  <span style={{ color: '#0F172A', fontWeight: 800 }}>₱{selectedRecord.amount.toLocaleString('en-PH', {minimumFractionDigits: 2})}</span>
                </div>
              </div>

              {/* Box 2 */}
              {selectedRecord.type === 'Leftover return' && (
                <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '16px', marginBottom: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
                    <span style={{ color: '#475569', fontWeight: 600 }}>Envelope no.</span>
                    <span style={{ color: '#1E293B', fontWeight: 700 }}>{selectedRecord.envelopeNo}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '13px' }}>
                    <span style={{ color: '#475569', fontWeight: 600 }}>Cash counted by Accountant</span>
                    <span style={{ color: '#1E293B', fontWeight: 700 }}>₱{selectedRecord.cashCounted?.toLocaleString('en-PH', {minimumFractionDigits: 2})}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                    <span style={{ color: '#475569', fontWeight: 600 }}>Matches expected leftover</span>
                    <span style={{ color: '#10B981', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <i className="ti ti-check" /> Yes
                    </span>
                  </div>
                </div>
              )}

              {selectedRecord.type === 'Reimbursement' && (
                <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '16px', marginBottom: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
                    <span style={{ color: '#475569', fontWeight: 600 }}>Supervisor Approval</span>
                    <span style={{ color: '#1E293B', fontWeight: 700 }}>Checked</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                    <span style={{ color: '#475569', fontWeight: 600 }}>Original Receipts Submitted</span>
                    <span style={{ color: '#10B981', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <i className="ti ti-check" /> Yes
                    </span>
                  </div>
                </div>
              )}

              <div style={{ fontSize: '12px', color: '#64748B', marginBottom: '12px' }}>
                Recorded by {selectedRecord.recordedBy} • {new Date(selectedRecord.recordedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, {new Date(selectedRecord.recordedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
              </div>

              <div style={{ marginBottom: decision ? '16px' : '24px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: '#0F172A', marginBottom: '6px' }}>Decision</label>
                <select 
                  value={decision}
                  onChange={(e) => setDecision(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '14px', outline: 'none' }}
                >
                  <option value="">Select decision...</option>
                  <option value="approve">✓ Validate</option>
                  <option value="reject">✕ Reject</option>
                </select>
              </div>

              {decision === 'reject' && (
                <>
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: '#0F172A', marginBottom: '6px' }}>Reason for rejection</label>
                    <select 
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '14px', outline: 'none' }}
                    >
                      <option value="">Select a reason...</option>
                      <option value="Cash short / over not explained">Cash short / over not explained</option>
                      <option value="Wrong computation (advance / expenses)">Wrong computation (advance / expenses)</option>
                      <option value="Envelope not received / wrong envelope no.">Envelope not received / wrong envelope no.</option>
                      <option value="Missing original receipts">Missing original receipts</option>
                      <option value="No prior supervisor approval">No prior supervisor approval</option>
                      <option value="Duplicate record">Duplicate record</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div style={{ marginBottom: '24px' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: '#0F172A', marginBottom: '6px' }}>Details for the Accountant</label>
                    <textarea 
                      placeholder="What should be corrected?"
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                      rows={3}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '14px', outline: 'none', resize: 'none' }}
                    />
                  </div>
                </>
              )}

              {decision === 'approve' && (
                <div style={{ marginBottom: '24px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: '#0F172A', marginBottom: '6px' }}>Remarks (optional)</label>
                  <textarea 
                    placeholder="Sent to Asst. Finance Manager for approval"
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    rows={2}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '14px', outline: 'none', resize: 'none' }}
                  />
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <Button title="Close" variant="secondary" onClick={() => setSelectedRecord(null)} />
                <button 
                  onClick={handleConfirmDecision}
                  style={{ 
                    padding: '8px 16px', 
                    borderRadius: '6px', 
                    fontSize: '13px', 
                    fontWeight: 700, 
                    border: 'none', 
                    cursor: 'pointer',
                    background: decision === 'reject' ? '#EF4444' : '#10B981',
                    color: 'white',
                    opacity: decision ? 1 : 0.5
                  }}
                  disabled={!decision}
                >
                  {decision === 'reject' ? 'Confirm reject' : decision === 'approve' ? 'Confirm validate' : 'Confirm'}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
};

const thStyle: React.CSSProperties = {
  padding: '12px 16px',
  fontSize: '11px',
  fontWeight: 800,
  color: '#64748B',
  textTransform: 'uppercase',
  letterSpacing: '0.05em'
};

const tdStyle: React.CSSProperties = {
  padding: '16px',
  fontSize: '13px',
  color: '#1E293B'
};

export default Settlements;
