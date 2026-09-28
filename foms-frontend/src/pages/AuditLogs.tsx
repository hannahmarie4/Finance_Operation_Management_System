import React, { useState } from 'react';
import { useAppData } from '../context/AppDataContext';
import { useAuth } from '../context/AuthContext';
import { DataTable } from '../components/DataTable';
import { TableContainer } from '../components/TableContainer';

export const AuditLogs: React.FC = () => {
  const { auditLogs } = useAppData();
  const { user } = useAuth();
  const [selectedLog, setSelectedLog] = useState<any>(null);

  // Custom filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [actionType, setActionType] = useState('');
  const [userRole, setUserRole] = useState('');

  const uniqueActions = Array.from(new Set(auditLogs.map(l => l.action)));
  const uniqueModules = Array.from(new Set(auditLogs.map(l => l.module)));

  const filteredLogs = auditLogs.filter(log => {
    let match = true;
    if (startDate) {
      match = match && new Date(log.timestamp) >= new Date(startDate);
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      match = match && new Date(log.timestamp) <= end;
    }
    if (actionType) {
      match = match && log.action === actionType;
    }
    if (userRole) {
      match = match && log.userRole === userRole;
    }
    return match;
  });

  const resetFilters = () => {
    setStartDate('');
    setEndDate('');
    setActionType('');
    setUserRole('');
  };

  const columns = [
    { key: 'timestamp', label: 'DATE & TIME', sortable: true, render: (row: any) => new Date(row.timestamp).toLocaleString('en-PH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) },
    { key: 'userFullName', label: 'USER', sortable: true },
    { key: 'userRole', label: 'ROLE', sortable: true },
    { key: 'action', label: 'ACTION', sortable: true, render: (row: any) => row.action.replace(/_/g, ' ') },
    { key: 'module', label: 'MODULE', sortable: true },
    { key: 'recordId', label: 'AFFECTED RECORD', sortable: true },
  ];

  const actions = [
    {
      label: 'View Details',
      icon: 'ti-eye',
      onClick: (row: any) => setSelectedLog(row),
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <TableContainer>
        <DataTable
          title="System Audit Logs"
          data={filteredLogs}
          columns={columns}
          rowKey="id"
          searchPlaceholder="Search logs by user, role, action, or details..."
          searchFields={['userFullName', 'userRole', 'action', 'details', 'module', 'recordId']}
          defaultPageSize={20}
          pageSizeOptions={[20, 50, 100]}
          columnToggle={true}
          customFilters={
            user?.role === 'Finance Manager' ? (
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                <input type="text" placeholder="Start Date" onFocus={(e) => e.target.type = 'date'} onBlur={(e) => { if (!e.target.value) e.target.type = 'text'; }} value={startDate} onChange={e => setStartDate(e.target.value)} style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px', width: '130px', background: '#FFF' }} />
                
                <input type="text" placeholder="End Date" onFocus={(e) => e.target.type = 'date'} onBlur={(e) => { if (!e.target.value) e.target.type = 'text'; }} value={endDate} onChange={e => setEndDate(e.target.value)} style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px', width: '130px', background: '#FFF' }} />
                
                <select value={actionType} onChange={e => setActionType(e.target.value)} style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px', background: '#FFF' }}>
                  <option value="">Action Type</option>
                  {uniqueActions.map(a => <option key={a} value={a}>{a.replace(/_/g, ' ')}</option>)}
                </select>
                
                <select value={userRole} onChange={e => setUserRole(e.target.value)} style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px', background: '#FFF' }}>
                  <option value="">User</option>
                  <option value="Coordinator">Coordinator</option>
                  <option value="Accountant">Accountant</option>
                  <option value="Head Accountant">Head Accountant</option>
                  <option value="Assistant of Finance Manager">Assistant of Finance Manager</option>
                </select>
                
                <button onClick={resetFilters} style={{ background: 'none', border: 'none', color: '#10B981', fontWeight: 600, fontSize: '12px', cursor: 'pointer', padding: '8px' }}>
                  Reset Filters
                </button>
              </div>
            ) : null
          }
        />
      </TableContainer>

      {/* Audit Log Details Modal */}
      {selectedLog && (
        <div className="tf-modal-overlay">
          <div className="tf-modal-container" style={{ maxWidth: '600px', width: '90%' }}>
            <div className="tf-modal-header">
              <h2 className="tf-modal-title">Audit Log Details</h2>
              <button className="tf-modal-close" onClick={() => setSelectedLog(null)}>
                <i className="ti ti-x"></i>
              </button>
            </div>
            <div className="tf-modal-content">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: '4px' }}>Date & Time</span>
                    <span style={{ fontSize: '0.875rem', color: '#0F172A', fontWeight: 600 }}>
                      {new Date(selectedLog.timestamp).toLocaleString('en-PH', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div>
                    <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: '4px' }}>IP Address</span>
                    <span style={{ fontSize: '0.875rem', color: '#0F172A', fontWeight: 600 }}>{selectedLog.ipAddress || '127.0.0.1'}</span>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: '4px' }}>User</span>
                    <span style={{ fontSize: '0.875rem', color: '#0F172A', fontWeight: 600 }}>{selectedLog.userFullName}</span>
                  </div>
                  <div>
                    <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: '4px' }}>Role</span>
                    <span style={{ fontSize: '0.875rem', color: '#0F172A', fontWeight: 600 }}>{selectedLog.userRole}</span>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', background: '#F8FAFC', padding: '16px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                  <div>
                    <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: '4px' }}>Action Performed</span>
                    <span style={{ fontSize: '0.875rem', color: '#3B82F6', fontWeight: 700 }}>{selectedLog.action.replace(/_/g, ' ')}</span>
                  </div>
                  <div>
                    <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: '4px' }}>Affected Record</span>
                    <span style={{ fontSize: '0.875rem', color: '#0F172A', fontWeight: 600 }}>{selectedLog.recordType} - {selectedLog.recordId}</span>
                  </div>
                </div>

                <div>
                  <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: '4px' }}>Full Details</span>
                  <div style={{ background: '#F1F5F9', padding: '12px', borderRadius: '6px', border: '1px solid #E2E8F0', fontSize: '0.875rem', color: '#334155' }}>
                    {selectedLog.details}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
