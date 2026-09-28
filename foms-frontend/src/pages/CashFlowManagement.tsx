import React, { useState, useMemo } from 'react';
import { useAppData } from '../context/AppDataContext';
import { DataTable } from '../components/DataTable';
import { TableContainer } from '../components/TableContainer';
import { Card } from '../components/Card';
import { Button } from '../components/Buttons';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ToastContext';

export default function CashFlowManagement() {
  const { cashFlowRecords, addCashFlowRecord, payments, liquidations, addAuditLog } = useAppData();
  const { user } = useAuth();
  const { toast } = useToast();

  const isAccountant = user?.role === 'Accountant' || user?.role === 'Head Accountant';
  const isFinancialManager = user?.role === 'Financial Manager' || user?.role === 'Finance Manager';

  // Filters
  const [filterType, setFilterType] = useState('All');
  const [filterDateRange, setFilterDateRange] = useState('All');

  // Compute Unrecorded Transactions (For Accountant)
  const unrecordedPayments = useMemo(() => {
    return payments.filter(p => p.status === 'Validated' && !cashFlowRecords.find(c => c.sourceReference === p.id));
  }, [payments, cashFlowRecords]);

  const unrecordedLiquidations = useMemo(() => {
    return liquidations.filter(l => l.status === 'Validated' && !cashFlowRecords.find(c => c.sourceReference === l.id));
  }, [liquidations, cashFlowRecords]);

  // Compute Summaries
  const filteredRecords = useMemo(() => {
    let filtered = cashFlowRecords;
    if (filterType !== 'All') {
      filtered = filtered.filter(c => c.type === filterType);
    }
    // Simplistic date filtering for demo
    if (filterDateRange === 'Today') {
      const today = new Date().toDateString();
      filtered = filtered.filter(c => new Date(c.date).toDateString() === today);
    }
    return filtered;
  }, [cashFlowRecords, filterType, filterDateRange]);

  const totalInflow = filteredRecords.filter(c => c.type === 'Inflow').reduce((sum, c) => sum + c.amount, 0);
  const totalOutflow = filteredRecords.filter(c => c.type === 'Outflow').reduce((sum, c) => sum + c.amount, 0);
  const netCashFlow = totalInflow - totalOutflow;

  const handleRecordInflow = (payment: any) => {
    const newRecord = {
      id: `CFR-${Date.now()}`,
      type: 'Inflow' as const,
      amount: payment.amount,
      sourceReference: payment.id,
      date: new Date().toISOString(),
      recordedBy: user?.employeeId || 'System'
    };
    addCashFlowRecord(newRecord);
    addAuditLog({
      id: `AL-${Date.now()}`,
      userId: user?.employeeId || 'System',
      userFullName: user?.fullName || 'System',
      userRole: user?.role || 'Accountant',
      action: 'RECORD_CASH_INFLOW',
      module: 'Cash Flow Management',
      recordId: newRecord.id,
      recordType: 'Cash Flow',
      ipAddress: '127.0.0.1',
      details: `Recorded cash inflow of ₱${payment.amount} from payment ${payment.id}`,
      timestamp: new Date().toISOString()
    });
    toast.success('Cash inflow successfully recorded.', 'Success');
  };

  const handleRecordOutflow = (liquidation: any) => {
    const newRecord = {
      id: `CFR-${Date.now()}`,
      type: 'Outflow' as const,
      amount: liquidation.amount,
      sourceReference: liquidation.id,
      date: new Date().toISOString(),
      recordedBy: user?.employeeId || 'System'
    };
    addCashFlowRecord(newRecord);
    addAuditLog({
      id: `AL-${Date.now()}`,
      userId: user?.employeeId || 'System',
      userFullName: user?.fullName || 'System',
      userRole: user?.role || 'Accountant',
      action: 'RECORD_CASH_OUTFLOW',
      module: 'Cash Flow Management',
      recordId: newRecord.id,
      recordType: 'Cash Flow',
      ipAddress: '127.0.0.1',
      details: `Recorded cash outflow of ₱${liquidation.amount} from liquidation ${liquidation.id}`,
      timestamp: new Date().toISOString()
    });
    toast.success('Cash outflow successfully recorded.', 'Success');
  };

  const columns = [
    { key: 'id', label: 'RECORD ID', sortable: true },
    {
      key: 'type',
      label: 'TYPE',
      sortable: true,
      render: (row: any) => (
        <span style={{
          padding: '4px 10px',
          borderRadius: '20px',
          fontSize: '11px',
          fontWeight: 700,
          background: row.type === 'Inflow' ? '#DCFCE7' : '#FEE2E2',
          color: row.type === 'Inflow' ? '#15803D' : '#B91C1C'
        }}>
          {row.type}
        </span>
      )
    },
    { key: 'sourceReference', label: 'SOURCE REF.', sortable: true },
    {
      key: 'date',
      label: 'DATE RECORDED',
      sortable: true,
      render: (row: any) => new Date(row.date).toLocaleString('en-PH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    },
    {
      key: 'amount',
      label: 'AMOUNT',
      sortable: true,
      render: (row: any) => <span style={{ fontWeight: 700, color: row.type === 'Inflow' ? '#15803D' : '#B91C1C' }}>{row.type === 'Inflow' ? '+' : '-'}₱{row.amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
    },
  ];

  const [pendingFilter, setPendingFilter] = useState('All');
  const [selectedPendingItem, setSelectedPendingItem] = useState<any>(null);
  const [isHistoryPanelOpen, setIsHistoryPanelOpen] = useState(false);

  const pendingItems = useMemo(() => {
    const items: any[] = [];
    unrecordedPayments.forEach(p => items.push({ ...p, pendingType: 'Inflow' }));
    unrecordedLiquidations.forEach(l => items.push({ ...l, pendingType: 'Outflow' }));

    // Sort by most recent
    items.sort((a, b) => {
      const dateA = new Date(a.recordedAt || a.submittedAt).getTime();
      const dateB = new Date(b.recordedAt || b.submittedAt).getTime();
      return dateB - dateA; // Descending
    });

    if (pendingFilter !== 'All') {
      return items.filter(i => i.pendingType === pendingFilter);
    }
    return items;
  }, [unrecordedPayments, unrecordedLiquidations, pendingFilter]);

  // Modal handlers
  const handleRecordFromModal = () => {
    if (!selectedPendingItem) return;
    if (selectedPendingItem.pendingType === 'Inflow') {
      handleRecordInflow(selectedPendingItem);
    } else {
      handleRecordOutflow(selectedPendingItem);
    }
    setSelectedPendingItem(null);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* Financial Manager Summaries */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
        <Card style={{ padding: '24px', borderLeft: '4px solid #10B981' }}>
          <h4 style={{ margin: '0 0 8px', fontSize: '13px', color: '#64748B', textTransform: 'uppercase', fontWeight: 700 }}>Total Cash Inflow</h4>
          <span style={{ fontSize: '24px', fontWeight: 800, color: '#15803D' }}>₱{totalInflow.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
        </Card>
        <Card style={{ padding: '24px', borderLeft: '4px solid #EF4444' }}>
          <h4 style={{ margin: '0 0 8px', fontSize: '13px', color: '#64748B', textTransform: 'uppercase', fontWeight: 700 }}>Total Cash Outflow</h4>
          <span style={{ fontSize: '24px', fontWeight: 800, color: '#B91C1C' }}>₱{totalOutflow.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
        </Card>
        <Card style={{ padding: '24px', borderLeft: '4px solid #3B82F6' }}>
          <h4 style={{ margin: '0 0 8px', fontSize: '13px', color: '#64748B', textTransform: 'uppercase', fontWeight: 700 }}>Net Cash Flow</h4>
          <span style={{ fontSize: '24px', fontWeight: 800, color: netCashFlow >= 0 ? '#1D4ED8' : '#B91C1C' }}>₱{Math.abs(netCashFlow).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
        </Card>
      </div>

      {isFinancialManager && (
        <Card style={{ padding: '16px 24px', display: 'flex', gap: '16px', alignItems: 'center' }}>
          <span style={{ fontSize: '13px', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Filter By:</span>
          <select value={filterType} onChange={e => setFilterType(e.target.value)} style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #E2E8F0', outline: 'none', fontSize: '13px' }}>
            <option value="All">All Types</option>
            <option value="Inflow">Inflow Only</option>
            <option value="Outflow">Outflow Only</option>
          </select>
          <select value={filterDateRange} onChange={e => setFilterDateRange(e.target.value)} style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #E2E8F0', outline: 'none', fontSize: '13px' }}>
            <option value="All">All Time</option>
            <option value="Today">Today</option>
          </select>
        </Card>
      )}

      {/* Accountant Tasks: Pending Inflows/Outflows */}
      {/* Accountant Tasks: Pending Inflows/Outflows */}
      {isAccountant && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#0F172A', fontWeight: 800 }}>Pending Transactions to Record</h3>
            <div style={{ display: 'flex', gap: '12px' }}>
              <select
                value={pendingFilter}
                onChange={e => setPendingFilter(e.target.value)}
                style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #CBD5E1', outline: 'none', fontSize: '13px', fontWeight: 600, color: '#1E293B', background: '#FFF' }}
              >
                <option value="All">All Transactions</option>
                <option value="Inflow">Cash Inflow Only</option>
                <option value="Outflow">Cash Outflow Only</option>
              </select>
              <button
                onClick={() => setIsHistoryPanelOpen(true)}
                style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #CBD5E1', background: '#F8FAFC', color: '#475569', fontWeight: 600, fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <i className="ti ti-history"></i> View History
              </button>
            </div>
          </div>

          {pendingItems.length === 0 ? (
            <Card style={{ padding: '40px', textAlign: 'center', color: '#64748B', fontSize: '14px' }}>
              No pending transactions to record at the moment.
            </Card>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
              {pendingItems.map(item => (
                <Card key={item.id} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', border: `1px solid ${item.pendingType === 'Inflow' ? '#A7F3D0' : '#FECACA'}`, background: '#FFF' }}>

                  {/* Badge */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ background: item.pendingType === 'Inflow' ? '#DCFCE7' : '#FEE2E2', color: item.pendingType === 'Inflow' ? '#15803D' : '#B91C1C', padding: '4px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase' }}>
                      {item.pendingType === 'Inflow' ? 'Cash Inflow' : 'Cash Outflow'}
                    </span>
                  </div>

                  {/* Header / Titles */}
                  <div>
                    <h4 style={{ margin: '0 0 4px', fontSize: '1rem', fontWeight: 800, color: '#0F172A' }}>
                      {item.pendingType === 'Inflow' ? (item.clientName || 'Client Payment') : (item.submittedBy || 'Liquidation')}
                    </h4>
                    <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 500 }}>{item.id}</span>
                  </div>

                  {/* Amounts & Dates */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', borderTop: '1px solid #F1F5F9', borderBottom: '1px solid #F1F5F9', padding: '12px 0' }}>
                    <div>
                      <span style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', marginBottom: '2px' }}>Amount</span>
                      <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0F172A' }}>₱{item.amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div>
                      <span style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', marginBottom: '2px' }}>Date Validated</span>
                      <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1E293B' }}>
                        {new Date(item.recordedAt || item.submittedAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>
                  </div>

                  {/* Action Basis */}
                  <div>
                    <span style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', marginBottom: '4px' }}>Action Basis</span>
                    <p style={{ margin: 0, fontSize: '12px', color: '#475569', lineHeight: 1.4 }}>
                      {item.pendingType === 'Inflow'
                        ? 'Payment has been successfully validated and is pending recording as cash inflow.'
                        : 'Liquidation has been successfully validated and is pending recording as cash outflow.'}
                    </p>
                  </div>

                  {/* Action Button */}
                  <div style={{ marginTop: 'auto', paddingTop: '8px' }}>
                    <button
                      onClick={() => setSelectedPendingItem(item)}
                      style={{
                        width: '100%',
                        padding: '12px',
                        borderRadius: '8px',
                        border: 'none',
                        background: '#0D9488',
                        color: '#FFF',
                        fontWeight: 700,
                        fontSize: '13px',
                        cursor: 'pointer',
                        transition: 'opacity 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
                      onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                    >
                      <i className="ti ti-eye"></i> View Details
                    </button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal for Recording Details */}
      {selectedPendingItem && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }}>
          <div style={{ background: '#FFF', borderRadius: '16px', width: '100%', maxWidth: '500px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

            {/* Modal Header */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#F8FAFC' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className={selectedPendingItem.pendingType === 'Inflow' ? 'ti ti-arrow-down-right' : 'ti ti-arrow-up-right'} style={{ color: selectedPendingItem.pendingType === 'Inflow' ? '#10B981' : '#EF4444' }}></i>
                {selectedPendingItem.pendingType === 'Inflow' ? 'Record Cash Inflow' : 'Record Cash Outflow'}
              </h3>
              <button onClick={() => setSelectedPendingItem(null)} style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', padding: '4px', display: 'flex' }}>
                <i className="ti ti-x" style={{ fontSize: '1.2rem' }}></i>
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <span style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', marginBottom: '4px' }}>Transaction ID</span>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: '#1E293B' }}>{selectedPendingItem.id}</span>
                </div>
                <div>
                  <span style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', marginBottom: '4px' }}>Reference / Name</span>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: '#1E293B' }}>
                    {selectedPendingItem.pendingType === 'Inflow' ? (selectedPendingItem.clientName || 'Payment') : (selectedPendingItem.reference || 'Liquidation')}
                  </span>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={{ padding: '12px', background: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                  <span style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: '4px' }}>Total Amount</span>
                  <span style={{ fontSize: '1.25rem', fontWeight: 800, color: selectedPendingItem.pendingType === 'Inflow' ? '#15803D' : '#B91C1C' }}>
                    ₱{selectedPendingItem.amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div style={{ padding: '12px', background: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                  <span style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: '4px' }}>Validated On</span>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: '#1E293B' }}>
                    {new Date(selectedPendingItem.recordedAt || selectedPendingItem.submittedAt).toLocaleString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>

              <div>
                <span style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', marginBottom: '8px' }}>Action Basis / Remarks</span>
                <p style={{ margin: 0, padding: '12px', background: '#F1F5F9', borderRadius: '8px', fontSize: '13px', color: '#334155', borderLeft: `4px solid ${selectedPendingItem.pendingType === 'Inflow' ? '#10B981' : '#EF4444'}`, lineHeight: 1.5 }}>
                  {selectedPendingItem.pendingType === 'Inflow'
                    ? `Payment was successfully validated. This represents a confirmed deposit or cash receipt. Click the button below to formally record this as a cash inflow in the treasury.`
                    : `Liquidation was successfully validated by the Assistant Finance Manager. This represents a confirmed business expense. Click the button below to formally record this as a cash outflow from the treasury.`}
                </p>
              </div>

            </div>

            {/* Modal Footer */}
            <div style={{ padding: '16px 24px', borderTop: '1px solid #E2E8F0', background: '#F8FAFC', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setSelectedPendingItem(null)}
                style={{ padding: '10px 16px', borderRadius: '6px', border: '1px solid #CBD5E1', background: '#FFF', color: '#475569', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={handleRecordFromModal}
                style={{
                  padding: '10px 20px',
                  borderRadius: '6px',
                  border: 'none',
                  background: selectedPendingItem.pendingType === 'Inflow' ? '#0D9488' : '#DC2626',
                  color: '#FFF',
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
              >
                <i className={selectedPendingItem.pendingType === 'Inflow' ? 'ti ti-download' : 'ti ti-upload'}></i>
                {selectedPendingItem.pendingType === 'Inflow' ? 'Confirm Record Inflow' : 'Confirm Record Outflow'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* History Side Panel */}
      {isHistoryPanelOpen && (
        <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: '600px', maxWidth: '100vw', background: '#FFF', boxShadow: '-5px 0 25px rgba(0,0,0,0.1)', zIndex: 9999, display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#F8FAFC' }}>
            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <i className="ti ti-history" style={{ color: '#3B82F6', fontSize: '1.4rem' }}></i>
              Cash Flow Records History
            </h3>
            <button onClick={() => setIsHistoryPanelOpen(false)} style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}>
              <i className="ti ti-x" style={{ fontSize: '1.2rem' }}></i>
            </button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
            <DataTable
              title="All Records"
              data={filteredRecords}
              columns={columns}
              rowKey="id"
              searchPlaceholder="Search records..."
              searchFields={['id', 'sourceReference', 'type']}
              defaultPageSize={10}
            />
          </div>
        </div>
      )}

      {/* Background Overlay for Side Panel */}
      {isHistoryPanelOpen && (
        <div
          onClick={() => setIsHistoryPanelOpen(false)}
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.4)', zIndex: 9998 }}
        />
      )}
    </div>
  );
}
