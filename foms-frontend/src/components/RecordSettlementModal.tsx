import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import Button from './Buttons';
import { useToast } from './ToastContext';

interface RecordSettlementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const RecordSettlementModal: React.FC<RecordSettlementModalProps> = ({ isOpen, onClose }) => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'leftover' | 'overspending'>('leftover');
  
  // Form State
  const [cashAdvanceGiven, setCashAdvanceGiven] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);
  
  if (!isOpen) return null;

  // Computations
  const variance = cashAdvanceGiven - totalExpenses;
  const isLeftover = variance > 0;
  const isOverspending = variance < 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success('Settlement record sent to Head Accountant for validation.');
    onClose();
  };

  const modalContent = (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.6)',
      display: 'flex', justifyContent: 'center', alignItems: 'center',
      zIndex: 9999, padding: '20px'
    }}>
      <div style={{
        background: '#ffffff',
        width: '100%', maxWidth: '600px',
        maxHeight: '90vh',
        borderRadius: '12px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{ padding: '24px 24px 16px', borderBottom: '1px solid #E2E8F0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h2 style={{ margin: '0 0 4px', fontSize: '1.25rem', fontWeight: 700, color: '#0F172A' }}>Record Settlement</h2>
              <p style={{ margin: 0, fontSize: '0.875rem', color: '#64748B' }}>
                Sent to the Head Accountant for validation after you submit.
              </p>
            </div>
            <button 
              onClick={onClose}
              style={{ background: 'none', border: 'none', fontSize: '1.5rem', color: '#94A3B8', cursor: 'pointer', lineHeight: 1 }}
            >
              &times;
            </button>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
            <button
              onClick={() => setActiveTab('leftover')}
              style={{
                flex: 1, padding: '10px 16px', borderRadius: '6px', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer',
                transition: 'all 0.2s',
                background: activeTab === 'leftover' ? '#ECFDF5' : '#F8FAFC',
                color: activeTab === 'leftover' ? '#065F46' : '#64748B',
                border: activeTab === 'leftover' ? '1px solid #10B981' : '1px solid #E2E8F0',
              }}
            >
              Return leftover cash
            </button>
            <button
              onClick={() => setActiveTab('overspending')}
              style={{
                flex: 1, padding: '10px 16px', borderRadius: '6px', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer',
                transition: 'all 0.2s',
                background: activeTab === 'overspending' ? '#ECFDF5' : '#F8FAFC',
                color: activeTab === 'overspending' ? '#065F46' : '#64748B',
                border: activeTab === 'overspending' ? '1px solid #10B981' : '1px solid #E2E8F0',
              }}
            >
              Overspending reimbursement
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
          <form id="settlement-form" onSubmit={handleSubmit}>
            <h3 style={{ margin: '0 0 16px', fontSize: '0.75rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Cash Advance Details
            </h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Cash advance ref.</label>
                <input type="text" placeholder="Type CF-### or courier" style={inputStyle} required />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Courier</label>
                <input type="text" placeholder="Full name" style={inputStyle} required />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Trip ref.</label>
                <input type="text" placeholder="TRIP-MNL-XXX-000" style={inputStyle} required />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Cash advance given (₱)</label>
                <input 
                  type="number" 
                  placeholder="0.00" 
                  step="0.01"
                  min="0"
                  value={cashAdvanceGiven || ''}
                  onChange={(e) => setCashAdvanceGiven(parseFloat(e.target.value) || 0)}
                  style={inputStyle} 
                  required 
                />
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Total expenses per receipts (₱)</label>
              <input 
                type="number" 
                placeholder="0.00" 
                step="0.01"
                min="0"
                value={totalExpenses || ''}
                onChange={(e) => setTotalExpenses(parseFloat(e.target.value) || 0)}
                style={inputStyle} 
                required 
              />
            </div>

            {/* Computed Info Box */}
            <div style={{ 
              padding: '12px 16px', 
              background: '#F1F5F9', 
              borderRadius: '8px', 
              border: '1px solid #E2E8F0',
              marginBottom: '24px',
              fontSize: '0.875rem',
              color: '#334155',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <i className="ti ti-calculator" style={{ fontSize: '1.25rem', color: '#64748B' }}></i>
              {cashAdvanceGiven === 0 && totalExpenses === 0 ? (
                <span>Enter cash advance and expenses to compute.</span>
              ) : isLeftover ? (
                <span>Leftover cash to return: <strong style={{ color: '#15803D' }}>₱{variance.toLocaleString('en-PH', {minimumFractionDigits: 2})}</strong></span>
              ) : isOverspending ? (
                <span>Amount to reimburse: <strong style={{ color: '#B91C1C' }}>₱{Math.abs(variance).toLocaleString('en-PH', {minimumFractionDigits: 2})}</strong></span>
              ) : (
                <span>Expenses exactly match the cash advance. No variance.</span>
              )}
            </div>

            {/* Dynamic Section based on Active Tab */}
            {activeTab === 'leftover' && (
              <>
                <h3 style={{ margin: '0 0 16px', fontSize: '0.75rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', borderTop: '1px dashed #E2E8F0', paddingTop: '24px' }}>
                  Cash Returned
                </h3>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Envelope no.</label>
                    <input type="text" placeholder="e.g. ENV-JDC-0929" style={inputStyle} required />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Date received</label>
                    <input type="date" style={inputStyle} required defaultValue={new Date().toISOString().split('T')[0]} />
                  </div>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Cash counted in envelope (₱)</label>
                  <input type="number" placeholder="0.00" step="0.01" style={inputStyle} required />
                </div>

                <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input type="checkbox" id="check-envelope" required style={{ width: '16px', height: '16px' }} />
                  <label htmlFor="check-envelope" style={{ fontSize: '0.875rem', color: '#334155', cursor: 'pointer' }}>
                    I counted the cash and matched it to the courier's envelope slip.
                  </label>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Remarks</label>
                  <textarea placeholder="Required if the cash does not match" style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }}></textarea>
                </div>
              </>
            )}

            {activeTab === 'overspending' && (
              <>
                <h3 style={{ margin: '0 0 16px', fontSize: '0.75rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', borderTop: '1px dashed #E2E8F0', paddingTop: '24px' }}>
                  Prior Approval & Receipts
                </h3>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Supervisor who approved</label>
                    <input type="text" placeholder="Supervisor name" style={inputStyle} required />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Approval date / ref.</label>
                    <input type="text" placeholder="e.g. 2026-09-24 / email ref" style={inputStyle} required />
                  </div>
                </div>

                <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input type="checkbox" id="check-approval" required style={{ width: '16px', height: '16px' }} />
                  <label htmlFor="check-approval" style={{ fontSize: '0.875rem', color: '#334155', cursor: 'pointer' }}>
                    Supervisor approved before the courier used their own money.
                  </label>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>No. of original receipts</label>
                  <input type="number" placeholder="0" min="1" style={inputStyle} required />
                </div>

                <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input type="checkbox" id="check-receipts" required style={{ width: '16px', height: '16px' }} />
                  <label htmlFor="check-receipts" style={{ fontSize: '0.875rem', color: '#334155', cursor: 'pointer' }}>
                    I received and checked the original receipts (no photocopies).
                  </label>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Remarks</label>
                  <textarea placeholder="Required if there are missing documents" style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }}></textarea>
                </div>
              </>
            )}

          </form>
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 24px', background: '#F8FAFC', borderTop: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ fontSize: '0.75rem', color: '#64748B', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <i className="ti ti-route" style={{ fontSize: '1rem' }}></i>
            Routing: Accountant records &rarr; Head Accountant validates &rarr; Asst. Finance Manager approves
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <Button title="Cancel" variant="secondary" onClick={onClose} />
            <Button title="Submit to Head Accountant" variant="primary" form="settlement-form" type="submit" />
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: '6px',
  border: '1px solid #CBD5E1',
  fontSize: '0.875rem',
  color: '#1E293B',
  outline: 'none',
  boxSizing: 'border-box',
  transition: 'border-color 0.2s'
};

export default RecordSettlementModal;
