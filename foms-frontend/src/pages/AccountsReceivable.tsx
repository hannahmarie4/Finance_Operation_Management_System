import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ToastContext';
import { useAppData } from '../context/AppDataContext';
import { StatusCard } from '../components/StatusCard';
import { DataTable } from '../components/DataTable';
import { TableContainer } from '../components/TableContainer';

const getDaysOverdue = (dueDate: string) => {
  if (!dueDate || dueDate === 'N/A') return 0;
  const diff = (new Date().getTime() - new Date(dueDate).getTime()) / (1000 * 60 * 60 * 24);
  return Math.max(0, Math.round(diff));
};

const formatPeso = (n: number) => `₱${(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;

const getEmployeeNameByRole = (role: string, defaultName: string) => {
  const r = (role || '').toLowerCase();
  if (r.includes('head accountant')) return 'Misty';
  if (r.includes('assistant of finance manager') || r.includes('assistant of fm')) return 'Joana Marie Ogaya';
  if (r.includes('finance manager')) return 'Crystalyn Joyce C. Fajardo';
  if (r.includes('accountant')) return 'Maria Mariel Jane Anonuevo';
  return defaultName;
};

const SharedKPIs = ({ arRecords }: { arRecords: any[] }) => {
  const activeArRecords = arRecords.filter(r => r.outstandingBalance > 0);
  const totalAr = activeArRecords.reduce((s, r) => s + r.outstandingBalance, 0);

  const agingTotals = {
    '0-30 days': 0,
    '31-60 days': 0,
    '61-90 days': 0,
    '90+ days': 0,
  };
  
  const mapBracket = (bracket: string) => bracket === 'Current' ? '0-30 days' : bracket;

  activeArRecords.forEach(r => {
    if (r.outstandingBalance > 0) {
       const mapped = mapBracket(r.agingBracket);
       if (mapped in agingTotals) {
         agingTotals[mapped as keyof typeof agingTotals] += r.outstandingBalance;
       }
    }
  });

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px' }}>
      <StatusCard label="Total AR" value={formatPeso(totalAr)} icon="ti-wallet" variant="info" />
      <StatusCard label="0-30 days" value={formatPeso(agingTotals['0-30 days'])} icon="ti-alert-circle" variant="warning" />
      <StatusCard label="31-60 days" value={formatPeso(agingTotals['31-60 days'])} icon="ti-alert-triangle" variant="warning" />
      <StatusCard label="61-90 days" value={formatPeso(agingTotals['61-90 days'])} icon="ti-alert-triangle" variant="danger" />
      <StatusCard label="90+ days" value={formatPeso(agingTotals['90+ days'])} icon="ti-skull" variant="danger" />
    </div>
  );
};

const CustomSearchFilter = ({ searchQuery, setSearchQuery, priorityFilter, setPriorityFilter }: any) => {
  const [isFocused, setIsFocused] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>(['Shopee and', 'Lazada Account']);

  return (
    <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginTop: 12 }}>
      <div style={{ position: 'relative', width: '280px' }}>
        <i className="ti ti-search" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#0D9488', zIndex: 2, fontSize: 18 }}></i>
        <input 
          type="text" 
          placeholder="Search clients..." 
          value={searchQuery}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setTimeout(() => setIsFocused(false), 200)}
          onChange={e => setSearchQuery(e.target.value)}
          style={{ width: '100%', padding: '10px 16px 10px 42px', border: '1px solid #0D9488', borderRadius: '9999px', fontSize: '0.9rem', outline: 'none', color: '#111827' }}
        />
        {isFocused && (
          <div style={{ position: 'absolute', top: 'calc(100% + 8px)', left: 0, right: 0, background: '#fff', border: '1px solid #E2E8F0', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)', zIndex: 10, overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 700, color: '#6B7280', letterSpacing: '0.05em', borderBottom: '1px solid #F1F5F9' }}>
              RECENT
            </div>
            {recentSearches.map((term, idx) => (
              <div 
                key={idx}
                onClick={() => { setSearchQuery(term); setIsFocused(false); }}
                style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', transition: 'background 0.2s', color: '#111827', fontSize: '14px' }}
                onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'}
                onMouseLeave={e => e.currentTarget.style.background = '#fff'}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <i className="ti ti-history" style={{ color: '#64748B', fontSize: 16 }}></i>
                  </div>
                  <span style={{ fontWeight: 600 }}>{term}</span>
                </div>
                <span style={{ fontSize: 12, color: '#94A3B8' }}>Search</span>
              </div>
            ))}
          </div>
        )}
      </div>
      <select 
        value={priorityFilter}
        onChange={e => setPriorityFilter(e.target.value)}
        style={{ padding: '10px 16px', border: '1px solid #E2E8F0', borderRadius: '8px', fontSize: '0.9rem', outline: 'none', background: '#fff', cursor: 'pointer', color: '#111827' }}
      >
        <option value="All">Status</option>
        <option value="High Priority">High Priority</option>
        <option value="Medium Priority">Medium Priority</option>
        <option value="Low Priority">Low Priority</option>
      </select>
    </div>
  );
};

// ============================================================================
// MANAGER VIEW (Logged Decisions / Ready for Manager Approval)
// ============================================================================
const ManagerView = ({ token, user, arRecords }: any) => {
  const { toast } = useToast() as any;
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecord, setSelectedRecord] = useState<any | null>(null);

  const [decision, setDecision] = useState('Accept & Close');
  const [actionTaken, setActionTaken] = useState('');
  const [remarks, setRemarks] = useState('');
  const [modalLoading, setModalLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('All');

  const fetchData = async () => {
    setLoading(true);
    const mockData = [
      {
        id: 'REV-999',
        timestamp: new Date().toLocaleString(),
        invoiceNumber: 'INV-2026-009',
        clientName: 'Lazada Philippines',
        balanceValue: 120500,
        balance: '₱120,500.00',
        priorityLevel: 'HIGH PRIORITY',
        dueDate: new Date(Date.now() - 45 * 86400000).toISOString(),
        decision: 'Sent to Manager for Approval',
        loggedBy: 'Maria Mariel Jane Anonuevo',
        loggedByRole: 'Accountant',
        actionTaken: 'Sent a final demand letter.',
        remarks: 'Requires manager approval for legal escalation.'
      },
      {
        id: 'REV-998',
        timestamp: new Date().toLocaleString(),
        invoiceNumber: 'INV-2026-015',
        clientName: 'Shopee Philippines',
        balanceValue: 45000,
        balance: '₱45,000.00',
        priorityLevel: 'HIGH PRIORITY',
        dueDate: new Date(Date.now() - 20 * 86400000).toISOString(),
        decision: 'Reject Priority Assignment',
        loggedBy: 'Joana Marie Ogaya',
        loggedByRole: 'Assistant of Finance Manager',
        actionTaken: 'Reviewed client dispute.',
        remarks: 'Please revise priority as the client promised to pay tomorrow.'
      }
    ];

    try {
      const res = await fetch('/api/ai/collection/recommendations?status=all', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const json = await res.json();
        const logged = Array.isArray(json) 
          ? json.filter((r: any) => 
              r.review_status && 
              r.review_status !== 'Pending Review' && 
              r.review_status !== 'Reject Priority Assignment'
            ) 
          : [];
          
        const mapped = logged.map((r: any) => {
          const role = r.reviewer_role || 'Accountant';
          return {
            id: String(r.id),
            timestamp: r.reviewed_at ? new Date(r.reviewed_at).toLocaleString() : 'N/A',
            invoiceNumber: r.priority?.normalized_invoice_number || r.priority?.invoice_number || 'N/A',
            clientName: r.priority?.client_name || 'N/A',
            balanceValue: r.priority?.outstanding_balance || 0,
            balance: `₱${(r.priority?.outstanding_balance || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`,
            priorityLevel: r.priority?.priority_level || 'HIGH PRIORITY',
            dueDate: r.priority?.due_date || 'N/A',
            decision: r.review_status || 'Pending',
            loggedBy: getEmployeeNameByRole(role, r.reviewed_by || r.reviewer_username || 'Maria Mariel Jane Anonuevo'),
            loggedByRole: role,
            actionTaken: r.remarks || 'No action taken',
            remarks: r.recommended_action || 'No remarks',
          };
        });
        
        if (mapped.length === 0) {
          setData(mockData);
        } else {
          setData(mapped);
        }
      } else {
        setData(mockData);
      }
    } catch (e) {
      console.error(e);
      setData(mockData);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  const handleOpenModal = (row: any) => {
    setSelectedRecord(row);
    setDecision('Accept & Close');
    setActionTaken('');
    setRemarks('');
  };

  const handleSubmit = async () => {
    if (!selectedRecord) return;
    if (!actionTaken.trim()) {
      toast.warning('Manager Action Taken is required.', 'Validation');
      return;
    }
    setModalLoading(true);
    try {
      if (String(selectedRecord.id).startsWith('REV-')) {
        // Simulate success for mock data
        await new Promise(resolve => setTimeout(resolve, 600));
        toast.success(`Decision saved successfully.`, 'Manager Review Logged');
        setData(prev => prev.filter(item => item.id !== selectedRecord.id));
        setSelectedRecord(null);
        setModalLoading(false);
        return;
      }

      const realId = selectedRecord.id;
      const res = await fetch(`/api/ai/collection/recommendations/${realId}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ decision, remarks: actionTaken, recommendedAction: remarks }),
      });
      if (res.ok) {
        toast.success(`Decision saved successfully.`, 'Manager Review Logged');
        setSelectedRecord(null);
        fetchData();
      } else {
        const errData = await res.json().catch(() => ({}));
        toast.error(errData?.message || 'Failed to update decision.', 'Error');
      }
    } catch (e) {
      toast.error('Network error while saving decision.', 'Error');
    } finally {
      setModalLoading(false);
    }
  };
  const filteredData = data.filter(row => {
    const matchesSearch = (row.clientName || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (row.invoiceNumber || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPriority = priorityFilter === 'All' || (row.priorityLevel || '').toLowerCase().includes(priorityFilter.toLowerCase());
    return matchesSearch && matchesPriority;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <SharedKPIs arRecords={arRecords} />

      <div style={{ marginTop: 24, background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ padding: '16px 24px', borderBottom: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column' }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: '#111827', margin: 0 }}>
            For Manager Approval / Logged Decisions
          </h2>
          <CustomSearchFilter searchQuery={searchQuery} setSearchQuery={setSearchQuery} priorityFilter={priorityFilter} setPriorityFilter={setPriorityFilter} />
        </div>

        <div style={{ padding: 24 }}>
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40, color: '#9CA3AF', gap: 10 }}>
              <i className="ti ti-refresh" style={{ fontSize: 20, animation: 'spin 1s linear infinite' }} />
              <span style={{ fontSize: 14 }}>Loading logged decisions...</span>
            </div>
          ) : filteredData.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 48, color: '#9CA3AF', fontSize: 14 }}>
              <i className="ti ti-search" style={{ fontSize: 40, display: 'block', marginBottom: 12 }} />
              No matching records found.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
              {filteredData.map((row, i) => {
                const p = String(row.priorityLevel || '').toUpperCase();
                const isHigh = p.includes('HIGH') || p.includes('CRITICAL');
                const isMed = p.includes('MEDIUM');
                const badgeColor = isHigh ? '#DC2626' : isMed ? '#D97706' : '#059669';
                const badgeBg = isHigh ? '#FEF2F2' : isMed ? '#FFFBEB' : '#F0FDF4';
                const borderColor = isHigh ? '#FECACA' : isMed ? '#FDE68A' : '#A7F3D0';
                
                const overdue = getDaysOverdue(row.dueDate);
                const score = isHigh ? 82 : isMed ? 55 : 15;
                
                const isRejected = String(row.decision).toLowerCase().includes('reject');
                const isApproved = String(row.decision).toLowerCase().includes('accept') || String(row.decision).toLowerCase().includes('process');
                const decisionColor = isRejected ? '#DC2626' : isApproved ? '#059669' : '#7C3AED';
                const decisionBg = isRejected ? '#FEF2F2' : isApproved ? '#F0FDF4' : '#EDE9FE';

                return (
                  <div
                    key={row.id || i}
                    style={{
                      background: '#fff', border: `1px solid ${borderColor}`,
                      borderRadius: 12, padding: 24,
                      display: 'flex', flexDirection: 'column', gap: 16,
                      boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                    }}
                  >
                    {/* Top Row */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ background: badgeBg, color: badgeColor, padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' }}>
                        {row.priorityLevel || 'High Priority'}
                      </span>
                      <span style={{ fontWeight: 800, fontSize: 16, color: badgeColor }}>
                        {score}%
                      </span>
                    </div>

                    {/* Title */}
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 18, color: '#111827' }}>
                        {row.clientName || 'Unknown Account'}
                      </div>
                      <div style={{ fontSize: 13, color: '#9CA3AF', marginTop: 4 }}>
                        {row.invoiceNumber || '—'}
                      </div>
                      
                      <div style={{ marginTop: 12, display: 'inline-flex', alignItems: 'center', gap: 6, background: decisionBg, color: decisionColor, padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700 }}>
                        {row.decision}
                      </div>
                    </div>

                    {/* Details Row */}
                    <div style={{ display: 'flex', gap: 40, marginTop: 4 }}>
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', letterSpacing: '0.05em' }}>OUTSTANDING BALANCE</div>
                        <div style={{ fontWeight: 800, fontSize: 16, color: '#111827', marginTop: 4 }}>
                          {row.balance}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', letterSpacing: '0.05em' }}>DUE DATE</div>
                        <div style={{ fontWeight: 800, fontSize: 14, color: '#111827', marginTop: 4 }}>
                          {row.dueDate && row.dueDate !== 'N/A'
                            ? new Date(row.dueDate).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
                            : '—'}
                        </div>
                      </div>
                    </div>

                    {/* Overdue Badge */}
                    {overdue > 0 && (
                      <div style={{ marginTop: 4 }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700 }}>
                          <i className="ti ti-clock" style={{ fontSize: 14 }} />
                          {overdue} Days Overdue
                        </div>
                      </div>
                    )}

                    {/* Logged By */}
                    <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B', fontWeight: 700, fontSize: 14 }}>
                        {row.loggedBy.charAt(0)}
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>{row.loggedBy}</div>
                        <div style={{ fontSize: 11, color: '#64748B' }}>{row.loggedByRole}</div>
                      </div>
                    </div>

                    <div style={{ marginTop: 'auto', paddingTop: 8 }}>
                      <button
                        onClick={() => handleOpenModal(row)}
                        style={{
                          width: '100%', padding: '12px 0', background: '#0D9488',
                          color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 13,
                          cursor: 'pointer', transition: 'background 0.2s'
                        }}
                        onMouseEnter={e => { e.currentTarget.style.opacity = '0.9'; }}
                        onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
                      >
                        View & Decide
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {selectedRecord && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }} onClick={() => setSelectedRecord(null)}>
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 600, boxShadow: '0 20px 60px rgba(0,0,0,0.18)', overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '90vh' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px', borderBottom: '1px solid #E2E8F0' }}>
              <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 800, color: '#0F172A' }}>Decision Log Details</h3>
              <button onClick={() => setSelectedRecord(null)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#94A3B8' }}><i className="ti ti-x" style={{ fontSize: 20 }} /></button>
            </div>
            <div style={{ padding: '24px', overflowY: 'auto' }}>
              <div style={{ border: '1px solid #E2E8F0', borderRadius: '12px', padding: '16px', marginBottom: 20 }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Official FOMS Account</div>
                <div style={{ fontSize: '1.125rem', fontWeight: 800, color: '#0F172A', marginBottom: 16 }}>{selectedRecord.clientName}</div>
                <div style={{ display: 'flex', gap: 40 }}>
                  <div><div style={{ fontSize: '0.75rem', color: '#64748B', marginBottom: 4 }}>Invoice Number</div><div style={{ fontWeight: 700, color: '#0F172A' }}>{selectedRecord.invoiceNumber}</div></div>
                  <div><div style={{ fontSize: '0.75rem', color: '#64748B', marginBottom: 4 }}>Outstanding Balance</div><div style={{ fontWeight: 700, color: '#0F172A' }}>{selectedRecord.balance}</div></div>
                </div>
              </div>
              <div style={{ border: '1px solid #E2E8F0', borderRadius: '12px', padding: '16px', marginBottom: 20 }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>Accountant Audit Trail</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: '0.875rem' }}>
                  <div><strong style={{ color: '#0F172A' }}>Initial Decision:</strong> <span style={{ color: '#475569' }}>{selectedRecord.decision}</span></div>
                  <div><strong style={{ color: '#0F172A' }}>Logged By:</strong> <span style={{ color: '#475569' }}>{selectedRecord.loggedBy} ({selectedRecord.loggedByRole})</span></div>
                  <div><strong style={{ color: '#0F172A' }}>Timestamp:</strong> <span style={{ color: '#475569' }}>{selectedRecord.timestamp}</span></div>
                </div>
                <div style={{ background: '#F8FAFC', padding: '12px', borderRadius: '8px', marginTop: 12, border: '1px solid #E2E8F0', fontSize: '0.85rem' }}>
                  <strong style={{ color: '#0F172A' }}>Action Taken:</strong> <span style={{ color: '#475569' }}>{selectedRecord.actionTaken}</span><br/>
                  <strong style={{ color: '#0F172A' }}>Notes:</strong> <span style={{ color: '#475569' }}>{selectedRecord.remarks}</span>
                </div>
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', fontWeight: 800, color: '#0F172A', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}><i className="ti ti-circle-check" style={{ fontSize: 16 }} /> Manager Review</div>
                <div style={{ marginBottom: 8, fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>Manager Decision</div>
                <div style={{ position: 'relative', marginBottom: 16 }}>
                  <select value={decision} onChange={e => setDecision(e.target.value)} style={{ width: '100%', appearance: 'none', padding: '12px 16px', border: '1px solid #CBD5E1', borderRadius: '8px', fontSize: '0.95rem', color: '#0F172A', outline: 'none' }}>
                    <option value="Accept & Close">Accept &amp; Close (Mark Completed)</option>
                    <option value="Proceed with Legal Escalation">Proceed with Legal Escalation</option>
                    <option value="Reject Priority Assignment">Reject &amp; Return to Accountant</option>
                  </select>
                  <i className="ti ti-chevron-down" style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', color: '#64748B', pointerEvents: 'none' }} />
                </div>
                <div style={{ marginBottom: 8, fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>Manager Action Taken <span style={{ color: '#EF4444' }}>*</span></div>
                <div style={{ marginBottom: 16 }}><input type="text" value={actionTaken} onChange={e => setActionTaken(e.target.value)} placeholder="e.g. Approved and closed." style={{ width: '100%', padding: '12px 16px', border: '1px solid #CBD5E1', borderRadius: '8px', fontSize: '0.95rem', color: '#0F172A', outline: 'none' }} /></div>
                <div style={{ marginBottom: 8, fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>Manager Remarks</div>
                <div><textarea value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="Notes..." rows={3} style={{ width: '100%', padding: '12px 16px', border: '1px solid #CBD5E1', borderRadius: '8px', fontSize: '0.95rem', color: '#0F172A', outline: 'none', resize: 'vertical' }} /></div>
              </div>
            </div>
            <div style={{ padding: '16px 24px', borderTop: '1px solid #E2E8F0', display: 'flex', gap: 12 }}>
              <button onClick={() => setSelectedRecord(null)} style={{ flex: 1, padding: '12px', background: '#fff', border: '1px solid #CBD5E1', borderRadius: '8px', fontWeight: 700, color: '#475569', cursor: 'pointer' }}>Cancel</button>
              <button disabled={modalLoading || !actionTaken.trim()} onClick={handleSubmit} style={{ flex: 1, padding: '12px', background: (!actionTaken.trim() || modalLoading) ? '#94A3B8' : '#0F172A', border: 'none', borderRadius: '8px', fontWeight: 700, color: '#fff', cursor: (!actionTaken.trim() || modalLoading) ? 'not-allowed' : 'pointer' }}>
                {modalLoading ? 'Saving...' : 'Log Manager Decision'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// ACCOUNTANT VIEW (Pending Priorities)
// ============================================================================
const AccountantView = ({ token, user, arRecords }: any) => {
  const { toast } = useToast() as any;
  const [recs, setRecs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedPriority, setSelectedPriority] = useState<any | null>(null);
  const [decision, setDecision] = useState('Accept Recommendation');
  const [remarks, setRemarks] = useState('');
  const [modalLoading, setModalLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('All');

  const fetchRecommendations = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/ai/collection/recommendations?status=all`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setRecs(Array.isArray(data) ? data : []);
      }
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    fetchRecommendations();
  }, [token]);

  const priorityList = useMemo(() => {
    const list = arRecords
      .filter((r: any) => r.outstandingBalance > 0 && getDaysOverdue(r.dueDate) >= 1)
      .map((r: any) => {
        const overdue = getDaysOverdue(r.dueDate);
        let level = 'Low Priority';
        let score = 30;
        
        if (overdue >= 31) {
          level = 'High Priority';
          score = 95;
        } else if (overdue >= 15) {
          level = 'Medium Priority';
          score = 65;
        }

        const rejectedRec = recs.find(rec => (rec.priority?.invoice_number === r.invoiceNumber || rec.invoice_number === r.invoiceNumber) && rec.review_status === 'Reject Priority Assignment');

        return {
          id: r.id,
          invoice_number: r.invoiceNumber,
          client_name: r.clientName,
          outstanding_balance: r.outstandingBalance,
          due_date: r.dueDate,
          priority_level: level,
          priority_score: score,
          overdue_days: overdue,
          is_rejected: !!rejectedRec,
          rejected_remarks: rejectedRec?.remarks || 'Manager requested revision.',
          rec_id: rejectedRec?.id || null
        };
      })
      .sort((a: any, b: any) => b.priority_score - a.priority_score);

    if (list.length === 0) {
      return [
        {
          id: 'AR-MOCK-1',
          invoice_number: 'LZD-2026-0004',
          client_name: 'Lazada Philippines',
          outstanding_balance: 13440,
          due_date: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString(),
          priority_level: 'High Priority',
          priority_score: 95,
          overdue_days: 35,
          is_rejected: true,
          rejected_remarks: 'Please revise priority as the client promised to pay tomorrow.',
          rec_id: null
        },
        {
          id: 'AR-MOCK-2',
          invoice_number: 'SHP-2026-0001',
          client_name: 'Shopee Express',
          outstanding_balance: 28500,
          due_date: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
          priority_level: 'Medium Priority',
          priority_score: 65,
          overdue_days: 20,
          is_rejected: false,
          rejected_remarks: '',
          rec_id: null
        },
        {
          id: 'AR-MOCK-3',
          invoice_number: 'TK-2026-0003',
          client_name: 'TikTok Shop',
          outstanding_balance: 4500,
          due_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          priority_level: 'Low Priority',
          priority_score: 30,
          overdue_days: 5,
          is_rejected: false,
          rejected_remarks: '',
          rec_id: null
        }
      ];
    }
    return list;
  }, [arRecords, recs]);

  const handleOpenModal = (row: any) => {
    setSelectedPriority(row);
    setDecision('Accept Recommendation');
    setRemarks('');
  };

  const handleSubmit = async () => {
    if (!selectedPriority) return;
    setModalLoading(true);
    try {
      const endpoint = selectedPriority.rec_id 
        ? `/api/ai/collection/recommendations/${selectedPriority.rec_id}/review`
        : `/api/ai/collection/recommendations/new`;
        
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ priority_id: selectedPriority.id, decision, remarks, recommendedAction: remarks }),
      });
      if (res.ok) {
        toast.success(`Priority updated and submitted!`, 'Success');
        setSelectedPriority(null);
        fetchRecommendations();
      } else {
        const err = await res.json().catch(()=>({}));
        toast.error(err.message || 'Failed to submit priority', 'Error');
      }
    } catch (e) {
      toast.error('Network error.', 'Error');
    } finally {
      setModalLoading(false);
    }
  };
  const filteredPriorityList = priorityList.filter((row: any) => {
    const matchesSearch = (row.client_name || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (row.invoice_number || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPriority = priorityFilter === 'All' || (row.priority_level || '').toLowerCase().includes(priorityFilter.toLowerCase());
    return matchesSearch && matchesPriority;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <SharedKPIs arRecords={arRecords} />

      <div style={{ marginTop: 24, background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ padding: '16px 24px', borderBottom: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column' }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: '#111827', margin: 0 }}>
            Pending Priority Accounts
          </h2>
          <CustomSearchFilter searchQuery={searchQuery} setSearchQuery={setSearchQuery} priorityFilter={priorityFilter} setPriorityFilter={setPriorityFilter} />
        </div>
        
        <div style={{ padding: 24 }}>
          {filteredPriorityList.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 48, color: '#9CA3AF', fontSize: 14 }}>
              <i className="ti ti-search" style={{ fontSize: 40, display: 'block', marginBottom: 12 }} />
              No matching priorities found.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
              {filteredPriorityList.map((row: any, i: number) => {
                const p = String(row.priority_level).toUpperCase();
                const isHigh = p.includes('HIGH');
                const isMed = p.includes('MEDIUM');
                const badgeColor = isHigh ? '#DC2626' : isMed ? '#D97706' : '#059669';
                const badgeBg = isHigh ? '#FEF2F2' : isMed ? '#FFFBEB' : '#F0FDF4';
                const borderColor = isHigh ? '#FECACA' : isMed ? '#FDE68A' : '#A7F3D0';
                
                const overdue = row.overdue_days || getDaysOverdue(row.due_date);
                const score = p.includes('HIGH') ? 82 : p.includes('MEDIUM') ? 55 : 15;
                const actionBasis = 'Client has consistently missed payment deadlines and has a high outstanding balance.';

                return (
                  <div
                    key={row.id || i}
                    style={{
                      background: '#fff', border: `1px solid ${borderColor}`,
                      borderRadius: 12, padding: 24,
                      display: 'flex', flexDirection: 'column', gap: 16,
                      boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                    }}
                  >
                    {/* Top Row */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ background: badgeBg, color: badgeColor, padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' }}>
                        {row.priority_level}
                      </span>
                      <span style={{ fontWeight: 800, fontSize: 16, color: badgeColor }}>
                        {score}%
                      </span>
                    </div>

                    {/* Title */}
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 18, color: '#111827' }}>
                        {row.client_name || 'Unknown Account'}
                      </div>
                      <div style={{ fontSize: 13, color: '#9CA3AF', marginTop: 4 }}>
                        {row.invoice_number || '—'}
                      </div>
                      {row.is_rejected && (
                        <div style={{ color: '#DC2626', fontSize: 11, fontWeight: 700, marginTop: 8 }}>
                          <i className="ti ti-alert-circle" /> Rejected by Manager
                        </div>
                      )}
                    </div>

                    {/* Details Row */}
                    <div style={{ display: 'flex', gap: 40, marginTop: 4 }}>
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', letterSpacing: '0.05em' }}>OUTSTANDING BALANCE</div>
                        <div style={{ fontWeight: 800, fontSize: 16, color: '#111827', marginTop: 4 }}>
                          ₱{(row.outstanding_balance || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', letterSpacing: '0.05em' }}>DUE DATE</div>
                        <div style={{ fontWeight: 800, fontSize: 14, color: '#111827', marginTop: 4 }}>
                          {row.due_date && row.due_date !== 'N/A'
                            ? new Date(row.due_date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
                            : '—'}
                        </div>
                      </div>
                    </div>

                    {/* Overdue Badge */}
                    {overdue > 0 && (
                      <div style={{ marginTop: 4 }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700 }}>
                          <i className="ti ti-clock" style={{ fontSize: 14 }} />
                          {overdue} Days Overdue
                        </div>
                      </div>
                    )}

                    {/* Action Basis */}
                    <div style={{ marginTop: 8 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', letterSpacing: '0.05em', marginBottom: 4 }}>ACTION BASIS</div>
                      <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.4 }}>
                        {actionBasis}
                      </div>
                    </div>

                    <div style={{ marginTop: 'auto', paddingTop: 8 }}>
                      <button
                        onClick={() => handleOpenModal(row)}
                        style={{
                          width: '100%', padding: '12px 0', background: row.is_rejected ? '#DC2626' : '#0D9488',
                          color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 13,
                          cursor: 'pointer', transition: 'background 0.2s'
                        }}
                        onMouseEnter={e => { e.currentTarget.style.opacity = '0.9'; }}
                        onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
                      >
                        {row.is_rejected ? 'Revise Recommendation' : 'Review Recommendation'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {selectedPriority && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }} onClick={() => setSelectedPriority(null)}>
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 560, boxShadow: '0 20px 60px rgba(0,0,0,0.18)', overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '90vh' }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '24px 32px', overflowY: 'auto' }}>
              
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
                <div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748B', marginBottom: 4 }}>{selectedPriority.invoice_number || 'INV-XXXX-XXXX'}</div>
                  <h3 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: '#0F172A', marginBottom: 12 }}>{selectedPriority.client_name}</h3>
                  <span style={{ 
                    background: String(selectedPriority.priority_level).includes('High') ? '#FEF2F2' : String(selectedPriority.priority_level).includes('Medium') ? '#FFFBEB' : '#F0FDF4', 
                    color: String(selectedPriority.priority_level).includes('High') ? '#DC2626' : String(selectedPriority.priority_level).includes('Medium') ? '#D97706' : '#059669', 
                    padding: '4px 12px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 700 
                  }}>
                    {selectedPriority.priority_level || 'High Priority'}
                  </span>
                </div>
                <button onClick={() => setSelectedPriority(null)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#0F172A' }}><i className="ti ti-x" style={{ fontSize: 24 }} /></button>
              </div>

              {/* OVERVIEW */}
              <div style={{ marginBottom: 28 }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0F172A', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 16 }}>OVERVIEW</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                    <span style={{ color: '#475569' }}>Client Name</span>
                    <span style={{ fontWeight: 700, color: '#0F172A' }}>{selectedPriority.client_name}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                    <span style={{ color: '#475569' }}>Outstanding Balance</span>
                    <span style={{ fontWeight: 700, color: '#0F172A' }}>₱{(selectedPriority.outstanding_balance || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                    <span style={{ color: '#475569' }}>Due Date</span>
                    <span style={{ fontWeight: 700, color: '#0F172A' }}>
                      {selectedPriority.due_date && selectedPriority.due_date !== 'N/A'
                        ? new Date(selectedPriority.due_date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
                        : '—'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                    <span style={{ color: '#475569' }}>Days Overdue</span>
                    <span style={{ fontWeight: 700, color: '#0F172A' }}>{selectedPriority.overdue_days || 0} days</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                    <span style={{ color: '#475569' }}>Priority Score</span>
                    <span style={{ fontWeight: 700, color: '#0F172A' }}>{selectedPriority.priority_score}%</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                    <span style={{ color: '#475569' }}>Priority Level</span>
                    <span style={{ fontWeight: 700, color: String(selectedPriority.priority_level).includes('High') ? '#DC2626' : String(selectedPriority.priority_level).includes('Medium') ? '#D97706' : '#059669' }}>{selectedPriority.priority_level || 'High Priority'}</span>
                  </div>
                </div>
              </div>

              {/* ACTION BASIS */}
              <div style={{ marginBottom: 28 }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0F172A', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>ACTION BASIS</div>
                <div style={{ fontSize: '0.9rem', color: '#475569', lineHeight: 1.5 }}>
                  Client has consistently missed payment deadlines and has a high outstanding balance.
                </div>
              </div>

              {/* AI RECOMMENDATION */}
              <div style={{ marginBottom: 32 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.95rem', fontWeight: 800, color: '#0D9488', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
                  <i className="ti ti-wand" style={{ fontSize: 18 }} /> AI RECOMMENDATION
                </div>
                <div style={{ background: '#F0FDF4', border: '1px solid #A7F3D0', borderRadius: 8, padding: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.9rem', fontWeight: 800, color: '#0F172A', marginBottom: 8 }}>
                    <i className="ti ti-file-description" style={{ fontSize: 16 }} /> Suggested Action Plan
                  </div>
                  <div style={{ fontSize: '0.9rem', color: '#334155', lineHeight: 1.5 }}>
                    Schedule a priority follow-up call immediately to secure payment commitments for the overdue ₱{(selectedPriority.outstanding_balance || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}.
                  </div>
                </div>
              </div>

              {/* FINANCE REVIEW */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.95rem', fontWeight: 800, color: '#0F172A', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 16 }}>
                  <i className="ti ti-file-invoice" style={{ fontSize: 18 }} /> FINANCE REVIEW
                </div>
                
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#475569', marginBottom: 8 }}>Review Decision</label>
                  <div style={{ position: 'relative' }}>
                    <select value={decision} onChange={e => setDecision(e.target.value)} style={{ width: '100%', appearance: 'none', padding: '10px 14px', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '0.9rem', color: '#0F172A', outline: 'none' }}>
                      <option value="Accept Recommendation">Accept Recommendation</option>
                      <option value="Reviewed & Closed">Reviewed & Closed</option>
                      <option value="Reject Priority Assignment">Reject Priority Assignment</option>
                    </select>
                    <i className="ti ti-chevron-down" style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', color: '#64748B', pointerEvents: 'none' }} />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#475569', marginBottom: 8 }}>Remarks / Validation Notes (Optional)</label>
                  <textarea value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="Optional validation steps or extra context..." rows={3} style={{ width: '100%', padding: '10px 14px', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '0.9rem', color: '#0F172A', outline: 'none', resize: 'vertical' }} />
                </div>
              </div>

              {/* Buttons */}
              <div style={{ display: 'flex', gap: 16, marginTop: 32 }}>
                <button onClick={() => setSelectedPriority(null)} style={{ flex: 1, padding: '12px', background: '#fff', border: '1px solid #CBD5E1', borderRadius: '8px', fontWeight: 700, color: '#0F172A', cursor: 'pointer' }}>Cancel</button>
                <button disabled={modalLoading} onClick={handleSubmit} style={{ flex: 1, padding: '12px', background: modalLoading ? '#94A3B8' : '#4FD1C5', border: 'none', borderRadius: '8px', fontWeight: 700, color: '#fff', cursor: modalLoading ? 'not-allowed' : 'pointer' }}>
                  {modalLoading ? 'Saving...' : 'Log Decision'}
                </button>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// MAIN WRAPPER
// ============================================================================
const AccountsReceivable: React.FC = () => {
  const { token, user } = useAuth() as any;
  const { arRecords } = useAppData();
  
  const isManager = user?.role === 'Finance Manager' || user?.role === 'Head Accountant';

  return (
    <>
      {isManager ? (
        <ManagerView token={token} user={user} arRecords={arRecords} />
      ) : (
        <AccountantView token={token} user={user} arRecords={arRecords} />
      )}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
};

export default AccountsReceivable;

