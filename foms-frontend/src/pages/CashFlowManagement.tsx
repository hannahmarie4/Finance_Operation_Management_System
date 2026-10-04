import React, { useState, useMemo } from 'react';
import { useAppData } from '../context/AppDataContext';
import { DataTable } from '../components/DataTable';
import { TableContainer } from '../components/TableContainer';
import { Card } from '../components/Card';
import { Button } from '../components/Buttons';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ToastContext';
import RecordSettlementModal from '../components/RecordSettlementModal';

export default function CashFlowManagement() {
  const { cashFlowRecords, addCashFlowRecord, payments, liquidations, addAuditLog, clients } = useAppData();
  const { user } = useAuth();
  const { toast } = useToast();

  const isAccountant = user?.role === 'Accountant' || user?.role === 'Head Accountant';
  const isFinancialManager = user?.role === 'Financial Manager' || user?.role === 'Finance Manager';

  // Filters
  const [filterType, setFilterType] = useState('All');
  const [filterDateRange, setFilterDateRange] = useState('All');
  const [isRecordSettlementModalOpen, setIsRecordSettlementModalOpen] = useState(false);

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
    return filtered.map(c => {
      let involvedParty = 'Unknown';
      let methodOrCategory = 'N/A';
      let paymentDate = c.date || new Date().toISOString();
      let referenceNumber = 'N/A';

      if (c.type === 'Inflow') {
        const payment = payments.find(p => p.id === c.sourceReference);
        if (payment) {
          const client = clients.find(cl => cl.id === payment.clientId);
          involvedParty = client ? client.name : 'Unknown Client';
          methodOrCategory = payment.paymentMethod || 'N/A';
          paymentDate = payment.recordedAt || c.date;
          referenceNumber = payment.referenceNumber || payment.orNumber || 'N/A';
        } else if (c.sourceReference.startsWith('Payments')) {
          involvedParty = 'Multiple Clients (Historical)';
        } else {
          // Seeded historical data where sourceReference is the client name
          involvedParty = c.sourceReference;
          methodOrCategory = 'Bank Transfer (Historical)';
          referenceNumber = 'N/A';
        }
      } else if (c.type === 'Outflow') {
        const liquidation = liquidations.find(l => l.id === c.sourceReference);
        if (liquidation) {
          involvedParty = liquidation.submittedBy || 'Unknown Employee';
          methodOrCategory = liquidation.expenses.map(e => e.type).join(', ') || 'N/A';
          paymentDate = liquidation.submittedAt || c.date;
          referenceNumber = liquidation.reference || 'N/A';
        } else if (c.sourceReference.startsWith('Expenses')) {
          involvedParty = 'Various Employees (Historical)';
        } else {
           // Seeded historical outflow data (e.g., "Shell SLEX (Fuel)")
           let parsedParty = c.sourceReference;
           let parsedCategory = 'Operating Expense (Historical)';
           
           if (c.sourceReference.includes('(') && c.sourceReference.includes(')')) {
             const match = c.sourceReference.match(/(.*?)\((.*?)\)/);
             if (match) {
               parsedParty = match[1].trim();
               parsedCategory = match[2].trim() + ' (Historical)';
             }
           }
           involvedParty = parsedParty;
           methodOrCategory = parsedCategory;
           referenceNumber = 'N/A';
        }
      }
      return { ...c, involvedParty, methodOrCategory, paymentDate, referenceNumber };
    });
  }, [cashFlowRecords, filterType, filterDateRange, payments, liquidations, clients]);

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

  const [selectedViewRecord, setSelectedViewRecord] = useState<any>(null);

  const KpiCard: React.FC<{ label: string; value: string; color: string; bgColor: string; textColor: string }> = ({ label, value, color, bgColor, textColor }) => {
    const [hovered, setHovered] = React.useState(false);
    return (
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          background: hovered ? bgColor : '#fff',
          border: `1px solid ${hovered ? color : '#E2E8F0'}`,
          borderLeft: `4px solid ${hovered ? color : '#E2E8F0'}`,
          borderRadius: 12,
          padding: '20px 24px',
          transition: 'all 0.25s ease',
          cursor: 'default',
          boxShadow: hovered ? `0 4px 16px ${color}25` : 'none',
          transform: hovered ? 'translateY(-3px)' : 'none',
        }}
      >
        <h4 style={{ margin: '0 0 8px', fontSize: '12px', color: hovered ? color : '#64748B', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em', transition: 'color 0.25s' }}>{label}</h4>
        <span style={{ fontSize: '24px', fontWeight: 800, color: hovered ? textColor : '#0F172A', transition: 'color 0.25s' }}>{value}</span>
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* Financial Manager Summaries */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
        <KpiCard label="Total Cash Inflow" value={`₱${totalInflow.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`} color="#10B981" bgColor="#F0FDF4" textColor="#15803D" />
        <KpiCard label="Total Cash Outflow" value={`₱${totalOutflow.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`} color="#EF4444" bgColor="#FEF2F2" textColor="#B91C1C" />
        <KpiCard label="Net Cash Flow" value={`₱${Math.abs(netCashFlow).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`} color={netCashFlow >= 0 ? '#3B82F6' : '#EF4444'} bgColor={netCashFlow >= 0 ? '#EFF6FF' : '#FEF2F2'} textColor={netCashFlow >= 0 ? '#1D4ED8' : '#B91C1C'} />
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

      {/* Cash Flow Records Table */}
      <Card style={{ padding: '24px' }}>
        <DataTable
          title="All Cash Flow Records"
          data={filteredRecords}
          columns={columns}
          rowKey="id"
          searchPlaceholder="Search by ID, source reference, or type..."
          searchFields={['id', 'sourceReference', 'type']}
          filters={[
            {
              key: 'type',
              label: 'Filter by Type',
              options: [
                { label: 'All Types', value: '' },
                { label: 'Inflow', value: 'Inflow' },
                { label: 'Outflow', value: 'Outflow' }
              ]
            }
          ]}
          createButtons={[
            {
              label: 'Record Settlement',
              icon: 'ti-plus',
              variant: 'primary',
              onClick: () => setIsRecordSettlementModalOpen(true)
            }
          ]}
          actions={[
            {
              label: 'View Details',
              icon: 'ti-eye',
              onClick: (row) => setSelectedViewRecord(row)
            }
          ]}
          defaultPageSize={10}
        />
      </Card>

      {/* View Details Modal */}
      {selectedViewRecord && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }}>
          <div style={{ background: '#FFF', borderRadius: '16px', width: '100%', maxWidth: '500px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#F8FAFC' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className={selectedViewRecord.type === 'Inflow' ? 'ti ti-arrow-down-right' : 'ti ti-arrow-up-right'} style={{ color: selectedViewRecord.type === 'Inflow' ? '#10B981' : '#EF4444' }}></i>
                Cash {selectedViewRecord.type} Details
              </h3>
              <button onClick={() => setSelectedViewRecord(null)} style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', padding: '4px', display: 'flex' }}>
                <i className="ti ti-x" style={{ fontSize: '1.2rem' }}></i>
              </button>
            </div>
            
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <span style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', marginBottom: '4px' }}>Record ID</span>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: '#1E293B' }}>{selectedViewRecord.id}</span>
                </div>
                <div>
                  <span style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', marginBottom: '4px' }}>Source Reference</span>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: '#1E293B' }}>{selectedViewRecord.sourceReference}</span>
                </div>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={{ padding: '12px', background: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                  <span style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: '4px' }}>Amount</span>
                  <span style={{ fontSize: '1.25rem', fontWeight: 800, color: selectedViewRecord.type === 'Inflow' ? '#15803D' : '#B91C1C' }}>
                    {selectedViewRecord.type === 'Inflow' ? '+' : '-'}₱{selectedViewRecord.amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div style={{ padding: '12px', background: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                  <span style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: '4px' }}>Date Recorded</span>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: '#1E293B' }}>
                    {new Date(selectedViewRecord.date).toLocaleString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <span style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', marginBottom: '4px' }}>
                    {selectedViewRecord.type === 'Inflow' ? 'Paid By (Client)' : 'Paid To (Payee/Employee)'}
                  </span>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: '#1E293B' }}>{selectedViewRecord.involvedParty}</span>
                </div>
                <div>
                  <span style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', marginBottom: '4px' }}>Recorded By</span>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: '#1E293B' }}>{selectedViewRecord.recordedBy || 'System'}</span>
                </div>
              </div>

              <div style={{ height: 1, background: '#E2E8F0', margin: '4px 0' }} />
              <h4 style={{ margin: '0', fontSize: '0.9rem', fontWeight: 700, color: '#0F172A' }}>
                {selectedViewRecord.type === 'Inflow' ? 'Payment Details' : 'Disbursement Details'}
              </h4>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <span style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', marginBottom: '4px' }}>
                    {selectedViewRecord.type === 'Inflow' ? 'Date Received' : 'Date Disbursed'}
                  </span>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: '#1E293B' }}>
                    {new Date(selectedViewRecord.paymentDate || selectedViewRecord.date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>
                <div>
                  <span style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', marginBottom: '4px' }}>
                    {selectedViewRecord.type === 'Inflow' ? 'Payment Method' : 'Expense Category'}
                  </span>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: '#1E293B' }}>{selectedViewRecord.methodOrCategory}</span>
                </div>
              </div>
              <div style={{ marginTop: '16px' }}>
                <span style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', marginBottom: '4px' }}>
                  {selectedViewRecord.type === 'Inflow' ? 'OR / Reference Number' : 'Reference / Voucher Number'}
                </span>
                <span style={{ fontSize: '14px', fontWeight: 600, color: '#1E293B' }}>{selectedViewRecord.referenceNumber}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Record Settlement Modal */}
      <RecordSettlementModal 
        isOpen={isRecordSettlementModalOpen}
        onClose={() => setIsRecordSettlementModalOpen(false)}
      />
    </div>
  );
}
