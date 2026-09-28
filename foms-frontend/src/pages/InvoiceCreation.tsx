import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { DataTable } from '../components/DataTable';
import { StatusBadge } from '../components/StatusBadge';
import { Card } from '../components/Card';
import { Button } from '../components/Buttons';
import { CustomDatePicker } from '../components/CustomDatePicker';
import {
  SEEDED_CLIENTS, SEEDED_RATES,
  Waybill, Invoice, BillingRate
} from '../data/seed';
import { useToast } from '../components/ToastContext';
import { useAppData } from '../context/AppDataContext';
import { TableContainer } from '../components/TableContainer';

import { useAuth } from '../context/AuthContext';

type Step = 1 | 2 | 3;

export const InvoiceCreation: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { waybills, invoices, addInvoice, updateInvoice, updateWaybill, clients, addAuditLog } = useAppData();

  const [searchParams] = useSearchParams();
  const editInvoiceId = searchParams.get('edit');
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>(1);
  const [selectedWaybills, setSelectedWaybills] = useState<string[]>([]);
  const [billingPeriod, setBillingPeriod] = useState('');
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

  const todayStr = new Date().toISOString().split('T')[0];
  const defaultDueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const [issueDate, setIssueDate] = useState(todayStr);
  const [dueDate, setDueDate] = useState(defaultDueDate);

  useEffect(() => {
    if (issueDate) {
      const d = new Date(issueDate);
      d.setDate(d.getDate() + 30);
      setDueDate(d.toISOString().split('T')[0]);
    }
  }, [issueDate]);

  useEffect(() => {
    if (editInvoiceId) {
      const invoice = invoices.find(i => i.id === editInvoiceId || i.invoiceNumber === editInvoiceId);
      if (invoice && invoice.status === 'Draft') {
        setSelectedWaybills(invoice.waybillIds || []);
        if (invoice.billingPeriod) setBillingPeriod(invoice.billingPeriod);
        if (invoice.createdAt) setIssueDate(new Date(invoice.createdAt).toISOString().split('T')[0]);
        if (invoice.dueDate) setDueDate(new Date(invoice.dueDate).toISOString().split('T')[0]);
        setNotes(invoice.notes || '');
        if (invoice.clientId) setSelectedClientId(invoice.clientId);
        setStep(2);
      }
    }
  }, [editInvoiceId, invoices]);

  // Derive client and schedule from first selected waybill
  const firstSelectedWaybill = waybills.find(w => w.id === selectedWaybills[0]);
  const invoiceClient = clients.find(c => c.id === firstSelectedWaybill?.clientCode);
  const derivedBillingSchedule = invoiceClient?.billingSchedule ?? 'Monthly';

  const generatePeriodForDate = (dateStr: string, schedule: string) => {
    const d = new Date(dateStr);
    let start = new Date(d);
    let end = new Date(d);
    if (schedule === 'Weekly') {
      const day = start.getDay();
      start.setDate(start.getDate() - day);
      end = new Date(start);
      end.setDate(end.getDate() + 6);
    } else if (schedule === 'Semi-monthly') {
      if (start.getDate() <= 15) {
        start.setDate(1);
        end.setDate(15);
      } else {
        start.setDate(16);
        end = new Date(start.getFullYear(), start.getMonth() + 1, 0);
      }
    } else {
      start.setDate(1);
      end = new Date(start.getFullYear(), start.getMonth() + 1, 0);
    }

    let label = "";
    if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
      label = `${start.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} – ${end.getDate()}, ${end.getFullYear()}`;
    } else {
      label = `${start.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} – ${end.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`;
    }
    return { label, start, end };
  };

  const [periodOptions, setPeriodOptions] = useState<{ label: string, start: Date, end: Date }[]>([]);
  const [selectedPeriodInfo, setSelectedPeriodInfo] = useState<{ label: string, start: Date, end: Date } | null>(null);

  useEffect(() => {
    if (selectedWaybills.length > 0) {
      const uniquePeriods = new Map<string, { label: string, start: Date, end: Date }>();
      selectedWaybills.forEach(id => {
        const wb = waybills.find(w => w.id === id);
        if (wb && wb.deliveryDate) {
          const p = generatePeriodForDate(wb.deliveryDate, derivedBillingSchedule);
          uniquePeriods.set(p.label, p);
        }
      });
      const options = Array.from(uniquePeriods.values());
      options.sort((a, b) => a.start.getTime() - b.start.getTime());
      setPeriodOptions(options);

      if (options.length > 0) {
        if (!options.find(o => o.label === billingPeriod)) {
          setBillingPeriod(options[0].label);
          setSelectedPeriodInfo(options[0]);
          setIssueDate(options[0].end.toISOString().split('T')[0]);
        }
      }
    } else {
      setPeriodOptions([]);
      setBillingPeriod('');
      setSelectedPeriodInfo(null);
    }
  }, [selectedWaybills, derivedBillingSchedule, waybills, billingPeriod]);

  const [notes, setNotes] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);

  const isDateInvalid = new Date(dueDate) < new Date(issueDate);
  const isBillingPeriodInvalid = !billingPeriod;

  // Show all unbilled waybills (for TC-75 to show they cannot be added)
  const availableWaybills = waybills.filter(w => !w.invoiceId || w.invoiceId === editInvoiceId);

  // ── Billing Calculation ────────────────────────────────────────
  const computeInvoice = () => {
    let base = 0;
    let vat = 0;
    let surcharge = 0;
    let validIds: string[] = [];

    if (selectedPeriodInfo) {
      selectedWaybills.forEach(wbId => {
        const wb = waybills.find(w => w.id === wbId);
        if (!wb) return;
        const p = generatePeriodForDate(wb.deliveryDate, derivedBillingSchedule);
        if (p.label !== selectedPeriodInfo.label) return;

        validIds.push(wbId);
        const rate = SEEDED_RATES.find(r => r.clientId === wb.clientCode);
        const client = clients.find(c => c.id === wb.clientCode);
        if (!rate) return;
        const lineBase = rate.baseRate;
        base += lineBase;
        vat += lineBase * (client?.vatRate ?? 0);
        surcharge += lineBase * rate.surchargeRate;
      });
    }

    return { base, vat, surcharge, total: base + vat + surcharge, validIds };
  };

  const calc = computeInvoice();

  // ── Client Validation ───────────────────────────────────────────
  const selectedClientCodes = new Set(
    selectedWaybills.map(id => waybills.find(w => w.id === id)?.clientCode)
  );
  const hasMultipleClients = selectedClientCodes.size > 1;

  const waybillColumns = [
    { key: 'waybillNumber', label: 'WAYBILL NO.', sortable: true },
    {
      key: 'clientCode', label: 'CLIENT', render: (row: any) => (
        !selectedClientId ? (
          <span onClick={() => setSelectedClientId(row.clientCode)} style={{ color: '#0F172A', fontWeight: 700, cursor: 'pointer', textDecoration: 'none' }}>
            {row.clientName}
          </span>
        ) : (
          <span style={{ fontWeight: 600 }}>{row.clientName}</span>
        )
      ), sortable: true
    },
    { key: 'deliveryDate', label: 'DELIVERY DATE', render: (row: any) => new Date(row.deliveryDate).toLocaleDateString('en-PH'), sortable: true },
    {
      key: 'billingSchedule', label: 'SCHEDULE', render: (row: any) => (
        <span style={{ background: '#F1F5F9', color: '#475569', padding: '2px 8px', borderRadius: 12, fontSize: '0.75rem', fontWeight: 600 }}>
          {row.billingSchedule}
        </span>
      ), sortable: true
    },
    { key: 'status', label: 'DOCUMENT STATUS', render: (row: any) => <StatusBadge status={row.status} /> },
    { key: 'baseRate', label: 'BASE RATE', render: (row: any) => `₱${(row.baseRate || 0).toFixed(2)}` }
  ];

  const filteredAvailableWaybills = availableWaybills.map(wb => {
    const rate = SEEDED_RATES.find(r => r.clientId === wb.clientCode);
    const client = clients.find(c => c.id === wb.clientCode);
    return {
      ...wb,
      clientName: client?.name ?? wb.clientCode,
      baseRate: rate ? rate.baseRate : 600,
      billingSchedule: client?.billingSchedule ?? 'Monthly'
    };
  });

  const availableClients = Array.from(new Set(filteredAvailableWaybills.map(w => w.clientName)));

  if (submitted) {
    return (
      <Card style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 24px', gap: 20 }}>
        <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#F0FDF4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <i className="ti ti-circle-check" style={{ fontSize: 36, color: '#10B981' }} />
        </div>
        <h2 style={{ margin: 0, color: '#0F172A', fontSize: '1.4rem' }}>Invoice Submitted for Review</h2>
        <p style={{ margin: 0, color: '#64748B', textAlign: 'center', maxWidth: 400 }}>
          Your invoice has been created and is now <strong>Pending Approval</strong> by the Head Accountant.
        </p>
        <Button
          title="Create Another Invoice"
          variant="primary"
          style={{ marginTop: 8 }}
          onClick={() => { setSubmitted(false); setStep(1); setSelectedWaybills([]); setBillingPeriod(''); setNotes(''); }}
        />
      </Card>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Progress Steps */}
      <Card noPadding style={{ padding: '24px 32px' }}>
        <h3 style={{ margin: '0 0 24px 0', fontSize: '0.85rem', fontWeight: 800, color: '#0F172A', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          INVOICE CREATION PROGRESS
        </h3>
        <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          {/* Background Line */}
          <div style={{ position: 'absolute', top: '16px', left: '50px', right: '50px', height: '2px', background: '#E2E8F0', zIndex: 0 }} />
          {/* Active Line */}
          <div style={{ position: 'absolute', top: '16px', left: '50px', height: '2px', background: '#059669', zIndex: 1, width: `calc(${((step - 1) / 2) * 100}% - ${((step - 1) / 2) * 100}px)`, transition: 'width 0.3s ease' }} />

          {([{ n: 1, label: 'Select Waybills', icon: 'ti-file-invoice' }, { n: 2, label: 'Billing Details', icon: 'ti-calculator' }, { n: 3, label: 'Confirm & Submit', icon: 'ti-send' }] as const).map(({ n, label, icon }, idx) => {
            const isCompleted = step > n;
            const isActive = step === n;

            return (
              <div
                key={n}
                onClick={() => {
                  if (n === 1) setStep(1);
                  else if (n === 2 && selectedWaybills.length > 0) setStep(2);
                  else if (n === 3 && selectedWaybills.length > 0 && !isBillingPeriodInvalid && !isDateInvalid) setStep(3);
                }}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                  cursor: (n === 1 || selectedWaybills.length > 0) ? 'pointer' : 'not-allowed',
                  position: 'relative', zIndex: 2, width: '120px'
                }}
              >
                <div style={{
                  width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: isCompleted || isActive ? '#059669' : '#F8FAFC',
                  color: isCompleted || isActive ? '#fff' : '#94A3B8',
                  border: `2px solid ${isCompleted || isActive ? '#059669' : '#E2E8F0'}`,
                  fontWeight: 700, fontSize: '1rem', transition: 'all 0.2s',
                  boxShadow: isActive ? '0 0 0 4px #D1FAE5' : 'none'
                }}>
                  <i className={`ti ${isCompleted ? 'ti-check' : icon}`} />
                </div>
                <span style={{
                  fontSize: '0.75rem',
                  fontWeight: isActive ? 700 : 600,
                  color: isCompleted || isActive ? '#059669' : '#64748B',
                  textAlign: 'center',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>
                  {label}
                </span>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Step 1: Select Waybills */}
      {step === 1 && (
        <>
          <TableContainer style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 24 }}>
            <DataTable
              title="Select Validated Waybills"
              data={filteredAvailableWaybills}
              columns={waybillColumns}
              rowKey="id"
              selectable={true}
              isRowSelectable={(row: any) => row.status === 'Validated' || row.status === 'Validated (CTC)' || row.status === 'CTC Submitted'}
              onSelectionChange={(keys) => setSelectedWaybills(keys as string[])}
              searchPlaceholder="Search waybill no. or client..."
              searchFields={['waybillNumber', 'clientName']}
              defaultPageSize={10}
              pageSizeOptions={[10, 25, 50]}
              columnToggle={true}
              filters={[
                {
                  key: 'clientName',
                  label: 'Client',
                  options: availableClients.map(c => ({ label: c, value: c }))
                },
                {
                  key: 'status',
                  label: 'Document Status',
                  options: [
                    { label: 'Validated', value: 'Validated' },
                    { label: 'CTC Submitted', value: 'CTC Submitted' }
                  ]
                },
                {
                  key: 'billingSchedule',
                  label: 'Billing Schedule',
                  options: [
                    { label: 'Weekly', value: 'Weekly' },
                    { label: 'Semi-monthly', value: 'Semi-monthly' },
                    { label: 'Monthly', value: 'Monthly' }
                  ]
                }
              ]}
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginTop: 8, padding: '0 32px' }}>

              <Button
                title="Next: Set Billing Period"
                variant="primary"
                onClick={() => {
                  if (selectedWaybills.length === 0) {
                    toast.error('Required client validation: Please select a client by choosing their validated delivery records.', 'Validation Error');
                    return;
                  }
                  if (hasMultipleClients) {
                    toast.error('Validation Error: All selected waybills must belong to the same client.', 'Warning');
                    return;
                  }
                  setStep(2);
                }}
              />
            </div>
          </TableContainer>
        </>
      )}

      {/* Step 2: Review & Compute */}
      {step === 2 && (
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24, alignItems: 'start' }}>

          {/* Left Column: Billing Details */}
          <Card>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
              <div style={{ background: '#EEF2FF', color: '#4F46E5', width: 40, height: 40, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className="ti ti-file-invoice" style={{ fontSize: 20 }} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#0F172A' }}>Billing Details</h3>
                <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#64748B' }}>Configure the billing information for the selected waybills.</p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: 8 }}>Billing Schedule</label>
                <div style={{ position: 'relative' }}>
                  <input type="text" value={derivedBillingSchedule} readOnly disabled
                    style={{ width: '100%', padding: '12px 14px', borderRadius: 8, border: '1px solid #E2E8F0', background: '#fff', fontSize: '0.9rem', color: '#0F172A', boxSizing: 'border-box' }} />
                  <i className="ti ti-chevron-down" style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                <div>
                  <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: 8 }}>Issue Date</label>
                  <CustomDatePicker value={issueDate} onChange={setIssueDate} />
                </div>
                <div>
                  <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: 8 }}>Due Date (Auto-computed)</label>
                  <CustomDatePicker value={dueDate} isInvalid={isDateInvalid} disabled={true} />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: 8 }}>Billing Period</label>
                <div style={{ position: 'relative' }}>
                  <i className="ti ti-calendar" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
                  <select
                    value={billingPeriod}
                    onChange={e => {
                      const label = e.target.value;
                      setBillingPeriod(label);
                      const info = periodOptions.find(o => o.label === label);
                      if (info) {
                        setSelectedPeriodInfo(info);
                        setIssueDate(info.end.toISOString().split('T')[0]);
                      }
                    }}
                    style={{ width: '100%', padding: '12px 14px 12px 42px', borderRadius: 8, border: '1px solid #E2E8F0', background: '#fff', fontSize: '0.9rem', color: '#0F172A', boxSizing: 'border-box' }}
                  >
                    {periodOptions.map(p => <option key={p.label} value={p.label}>{p.label}</option>)}
                  </select>
                  <i className="ti ti-chevron-down" style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', pointerEvents: 'none' }} />
                </div>
                {calc.validIds.length < selectedWaybills.length && (
                  <p style={{ margin: '6px 0 0', fontSize: '0.75rem', color: '#EF4444' }}>
                    <i className="ti ti-alert-circle" /> {selectedWaybills.length - calc.validIds.length} out-of-period record(s) excluded.
                  </p>
                )}
              </div>

              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: 8 }}>Notes (Optional)</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="Additional billing notes..."
                  style={{ width: '100%', padding: '12px 14px', borderRadius: 8, border: '1px solid #E2E8F0', background: '#fff', fontSize: '0.9rem', resize: 'vertical', boxSizing: 'border-box' }} />
              </div>
            </div>

            <div style={{ marginTop: 32 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#0F172A' }}>Included Waybills</h4>
                <span style={{ background: '#D1FAE5', color: '#065F46', padding: '2px 8px', borderRadius: 12, fontSize: '0.75rem', fontWeight: 700 }}>{calc.validIds.length}</span>
              </div>
              <div style={{ border: '1px solid #E2E8F0', borderRadius: 8, overflow: 'hidden' }}>
                {calc.validIds.map((id, idx) => {
                  const wb = waybills.find(w => w.id === id);
                  const client = wb ? clients.find(c => c.id === wb.clientCode) : null;
                  const rate = SEEDED_RATES.find(r => r.clientId === wb?.clientCode);
                  return wb ? (
                    <div key={id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: idx % 2 === 0 ? '#fff' : '#F8FAFC', borderBottom: idx < calc.validIds.length - 1 ? '1px solid #E2E8F0' : 'none' }}>
                      <span style={{ fontSize: '0.85rem', color: '#0F172A', fontWeight: 600, width: '100px' }}>{wb.waybillNumber}</span>
                      <span style={{ fontSize: '0.85rem', color: '#64748B', flex: 1 }}>{client?.name}</span>
                      <span style={{ fontSize: '0.85rem', color: '#64748B', width: '120px', textAlign: 'center' }}>{new Date(wb.deliveryDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                      <span style={{ fontSize: '0.85rem', color: '#0F172A', fontWeight: 600, width: '100px', textAlign: 'right', marginRight: 16 }}>₱{(rate?.baseRate || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                      <StatusBadge status="Validated" />
                    </div>
                  ) : null;
                })}
              </div>
            </div>
          </Card>

          {/* Right Column: Summary Card */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div style={{ background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>

              {/* Summary Header */}
              <div style={{ background: '#0F172A', padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ color: '#fff', background: 'rgba(255,255,255,0.1)', padding: 8, borderRadius: 8 }}>
                    <i className="ti ti-receipt" style={{ fontSize: 24 }} />
                  </div>
                  <div>
                    <h3 style={{ margin: '0 0 4px', fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}>Invoice Summary</h3>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: '#94A3B8' }}>{invoiceClient?.name ?? 'Client'}</p>
                  </div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', padding: '4px 10px', borderRadius: 16, fontSize: '0.75rem', fontWeight: 600 }}>
                  {derivedBillingSchedule}
                </div>
              </div>

              {/* Summary Body */}
              <div style={{ padding: '24px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.9rem', color: '#475569' }}>Base Freight Amount</span>
                    <span style={{ fontSize: '0.95rem', fontWeight: 600, color: '#0F172A' }}>₱{calc.base.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.9rem', color: '#475569' }}>VAT ({(invoiceClient?.vatRate ?? 0.12) * 100}%)</span>
                    <span style={{ fontSize: '0.95rem', fontWeight: 600, color: '#0F172A' }}>₱{calc.vat.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.9rem', color: '#475569' }}>Surcharge</span>
                    <span style={{ fontSize: '0.95rem', fontWeight: 600, color: '#0F172A' }}>₱{calc.surcharge.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>

                <div style={{ height: 1, background: '#E2E8F0', margin: '20px 0' }} />

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 800, fontSize: '1.1rem', color: '#0F172A' }}>TOTAL</span>
                  <span style={{ fontWeight: 800, fontSize: '1.4rem', color: '#10B981' }}>₱{calc.total.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                </div>

                {/* Info Note */}
                <div style={{ marginTop: 24, padding: '16px', background: '#ECFDF5', borderRadius: 8, display: 'flex', gap: 12, alignItems: 'start' }}>
                  <i className="ti ti-info-circle" style={{ color: '#059669', fontSize: 18, marginTop: 2 }} />
                  <p style={{ margin: 0, fontSize: '0.8rem', color: '#065F46', lineHeight: 1.5 }}>
                    These amounts are automatically calculated based on the selected waybills and billing details.
                  </p>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'space-between' }}>
              <Button
                title="Back"
                variant="secondary"
                onClick={() => setStep(1)}
              />
              <button
                disabled={isBillingPeriodInvalid || isDateInvalid}
                onClick={() => setStep(3)}
                style={{
                  background: (isBillingPeriodInvalid || isDateInvalid) ? '#94A3B8' : '#0F172A',
                  color: '#fff',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: 8,
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  cursor: (isBillingPeriodInvalid || isDateInvalid) ? 'not-allowed' : 'pointer',
                  flex: 1,
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: 8,
                  transition: 'background 0.2s'
                }}
              >
                Next: Confirm & Submit <i className="ti ti-arrow-right" style={{ fontSize: 18 }} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Confirm & Submit */}
      {step === 3 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div>
            <h3 style={{ margin: '0 0 6px', fontSize: '1.2rem', fontWeight: 700, color: '#0F172A' }}>Final Review</h3>
            <p style={{ margin: 0, color: '#64748B', fontSize: '0.9rem' }}>Please verify the details before submitting the invoice.</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24, alignItems: 'stretch' }}>
            {/* Left Column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

              {/* Card 1: Invoice Details */}
              <Card style={{ padding: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <i className="ti ti-file-invoice" style={{ color: '#3B82F6', fontSize: 18 }} />
                    <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#0F172A' }}>Invoice Details</h4>
                  </div>
                  <button onClick={() => setStep(2)} style={{ background: 'none', border: 'none', color: '#3B82F6', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', padding: 0 }}>Edit</button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span style={{ color: '#64748B', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase' }}>Client</span>
                    <span style={{ color: '#0F172A', fontSize: '0.9rem', fontWeight: 600 }}>{invoiceClient?.name}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span style={{ color: '#64748B', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase' }}>Billing Schedule</span>
                    <span style={{ color: '#0F172A', fontSize: '0.9rem', fontWeight: 600 }}>{derivedBillingSchedule}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span style={{ color: '#64748B', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase' }}>Issue Date</span>
                    <span style={{ color: '#0F172A', fontSize: '0.9rem', fontWeight: 600 }}>{new Date(issueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span style={{ color: '#64748B', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase' }}>Due Date</span>
                    <span style={{ color: '#0F172A', fontSize: '0.9rem', fontWeight: 600 }}>{new Date(dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, gridColumn: 'span 2' }}>
                    <span style={{ color: '#64748B', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase' }}>Billing Period</span>
                    <span style={{ color: '#0F172A', fontSize: '0.9rem', fontWeight: 600 }}>{billingPeriod}</span>
                  </div>
                </div>
              </Card>

              {/* Card 2: Waybills */}
              <Card style={{ padding: 24, display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <i className="ti ti-box" style={{ color: '#3B82F6', fontSize: 18 }} />
                    <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#0F172A' }}>Waybills</h4>
                  </div>
                  <button onClick={() => setStep(1)} style={{ background: 'none', border: 'none', color: '#3B82F6', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', padding: 0 }}>Edit</button>
                </div>
                <div style={{ overflowX: 'auto', marginBottom: 16 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                    <thead>
                      <tr>
                        <th style={{ textAlign: 'left', paddingBottom: 8, color: '#64748B', fontWeight: 600, borderBottom: '1px solid #E2E8F0', fontSize: '0.75rem' }}>WAYBILL NO.</th>
                        <th style={{ textAlign: 'left', paddingBottom: 8, color: '#64748B', fontWeight: 600, borderBottom: '1px solid #E2E8F0', fontSize: '0.75rem' }}>CLIENT</th>
                        <th style={{ textAlign: 'left', paddingBottom: 8, color: '#64748B', fontWeight: 600, borderBottom: '1px solid #E2E8F0', fontSize: '0.75rem' }}>DELIVERY DATE</th>
                        <th style={{ textAlign: 'right', paddingBottom: 8, color: '#64748B', fontWeight: 600, borderBottom: '1px solid #E2E8F0', fontSize: '0.75rem' }}>AMOUNT</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedWaybills.slice(0, 3).map((id) => {
                        const wb = waybills.find(w => w.id === id);
                        const rate = SEEDED_RATES.find(r => r.clientId === wb?.clientCode);
                        return wb ? (
                          <tr key={id}>
                            <td style={{ padding: '8px 0', color: '#0F172A', fontWeight: 600, borderBottom: '1px solid #F1F5F9' }}>{wb.waybillNumber}</td>
                            <td style={{ padding: '8px 0', color: '#64748B', borderBottom: '1px solid #F1F5F9' }}>{invoiceClient?.name}</td>
                            <td style={{ padding: '8px 0', color: '#64748B', borderBottom: '1px solid #F1F5F9' }}>{new Date(wb.deliveryDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                            <td style={{ padding: '8px 0', color: '#0F172A', fontWeight: 600, textAlign: 'right', borderBottom: '1px solid #F1F5F9' }}>₱{(rate?.baseRate || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td>
                          </tr>
                        ) : null;
                      })}
                    </tbody>
                  </table>
                  {calc.validIds.length > 3 && <div style={{ fontSize: '0.8rem', color: '#64748B', textAlign: 'center', marginTop: 8 }}>+ {calc.validIds.length - 3} more</div>}
                </div>
                <div>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: '#ECFEFF', color: '#0D9488', borderRadius: 6, fontSize: '0.75rem', fontWeight: 700, border: '1px solid #CCFBF1' }}>
                    <i className="ti ti-checkbox" style={{ fontSize: 14 }} />
                    {calc.validIds.length} waybill{calc.validIds.length !== 1 ? 's' : ''} selected
                  </span>
                </div>
              </Card>

              {/* Checkbox and Back Button */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input type="checkbox" id="confirm-check" checked={isConfirmed} onChange={e => setIsConfirmed(e.target.checked)} style={{ width: 16, height: 16, cursor: 'pointer', accentColor: '#3B82F6' }} />
                  <label htmlFor="confirm-check" style={{ fontSize: '0.9rem', color: '#334155', cursor: 'pointer', fontWeight: 500 }}>I have reviewed and confirmed the invoice details.</label>
                </div>
                <div>
                  <Button title="Back" variant="secondary" onClick={() => setStep(2)} />
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <Card style={{ padding: 24, height: '100%', display: 'flex', flexDirection: 'column' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <i className="ti ti-receipt" style={{ color: '#3B82F6', fontSize: 18 }} />
                      <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#0F172A' }}>Payment Summary</h4>
                    </div>
                    <button onClick={() => setStep(2)} style={{ background: 'none', border: 'none', color: '#3B82F6', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', padding: 0 }}>Edit</button>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#64748B', fontSize: '0.85rem' }}>Base Freight Amount</span><span style={{ color: '#0F172A', fontSize: '0.85rem', fontWeight: 600 }}>₱{calc.base.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#64748B', fontSize: '0.85rem' }}>VAT ({(invoiceClient?.vatRate ?? 0.12) * 100}%)</span><span style={{ color: '#0F172A', fontSize: '0.85rem', fontWeight: 600 }}>₱{calc.vat.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#64748B', fontSize: '0.85rem' }}>Surcharge</span><span style={{ color: '#0F172A', fontSize: '0.85rem', fontWeight: 600 }}>₱{calc.surcharge.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span></div>
                  </div>
                  <div style={{ height: 1, background: '#E2E8F0', margin: '16px 0' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 800, fontSize: '1rem', color: '#0F172A' }}>TOTAL</span>
                    <span style={{ fontWeight: 800, fontSize: '1.4rem', color: '#059669' }}>₱{calc.total.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
                <div style={{ marginTop: 32, display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <button
                    disabled={!isConfirmed}
                    onClick={() => {
                      if (editInvoiceId) {
                        const existing = invoices.find(i => i.id === editInvoiceId || i.invoiceNumber === editInvoiceId);
                        if (existing) {
                          updateInvoice(existing.id, {
                            waybillIds: calc.validIds,
                            amount: calc.base,
                            vatAmount: calc.vat,
                            surchargeAmount: calc.surcharge,
                            totalAmount: calc.total,
                            billingSchedule: derivedBillingSchedule,
                            billingPeriod,
                            status: 'Pending Approval',
                            createdAt: new Date(issueDate).toISOString(),
                            dueDate: new Date(dueDate).toISOString(),
                            notes,
                          });
                          calc.validIds.forEach(id => updateWaybill(id, { status: 'Billed' }));
                          addAuditLog({
                            id: `AL-${Date.now()}`,
                            userId: user?.employeeId || 'U-000',
                            userFullName: user?.fullName || 'System',
                            userRole: user?.role || 'Accountant',
                            action: 'SUBMIT_INVOICE',
                            module: 'InvoiceCreation',
                            recordId: existing.invoiceNumber,
                            recordType: 'Invoice',
                            ipAddress: '127.0.0.1',
                            details: `Submitted invoice ${existing.invoiceNumber} for approval`,
                            timestamp: new Date().toISOString()
                          });
                          setSubmitted(true);
                          toast.success(`Invoice ${existing.invoiceNumber} submitted for review.`, 'Success');
                          return;
                        }
                      }

                      const newInvoiceId = `INV-${Date.now()}`;
                      const invNum = `INV-${new Date().getFullYear()}-${String(invoices.length + 1).padStart(3, '0')}`;
                      const newInvoice: Invoice = {
                        id: newInvoiceId,
                        invoiceNumber: invNum,
                        clientId: invoiceClient?.id ?? '',
                        waybillIds: calc.validIds,
                        amount: calc.base,
                        vatAmount: calc.vat,
                        surchargeAmount: calc.surcharge,
                        totalAmount: calc.total,
                        billingSchedule: derivedBillingSchedule,
                        billingPeriod,
                        status: 'Pending Approval',
                        createdBy: 'EMP-003',
                        createdAt: new Date(issueDate).toISOString(),
                        dueDate: new Date(dueDate).toISOString(),
                        notes,
                      };
                      addInvoice(newInvoice);
                      calc.validIds.forEach(id => updateWaybill(id, { status: 'Billed' }));
                      addAuditLog({
                        id: `AL-${Date.now()}`,
                        userId: user?.employeeId || 'U-000',
                        userFullName: user?.fullName || 'System',
                        userRole: user?.role || 'Accountant',
                        action: 'CREATE_INVOICE',
                        module: 'InvoiceCreation',
                        recordId: invNum,
                        recordType: 'Invoice',
                        ipAddress: '127.0.0.1',
                        details: `Created and submitted invoice ${invNum}`,
                        timestamp: new Date().toISOString()
                      });
                      setSubmitted(true);
                      toast.success(`Invoice ${invNum} submitted for Head Accountant approval.`, 'Invoice Submitted');
                    }}
                    style={{
                      width: '100%',
                      background: !isConfirmed ? '#94A3B8' : '#059669',
                      color: '#fff',
                      border: 'none',
                      padding: '14px 24px',
                      borderRadius: 8,
                      fontWeight: 600,
                      fontSize: '0.95rem',
                      cursor: !isConfirmed ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      transition: 'background 0.2s, transform 0.1s'
                    }}
                  >
                    <i className="ti ti-send" style={{ fontSize: 18 }} /> Submit Invoice
                  </button>

                  <button
                    disabled={!isConfirmed}
                    onClick={() => {
                      if (editInvoiceId) {
                        const existing = invoices.find(i => i.id === editInvoiceId || i.invoiceNumber === editInvoiceId);
                        if (existing) {
                          updateInvoice(existing.id, {
                            waybillIds: calc.validIds,
                            amount: calc.base,
                            vatAmount: calc.vat,
                            surchargeAmount: calc.surcharge,
                            totalAmount: calc.total,
                            billingSchedule: derivedBillingSchedule,
                            billingPeriod,
                            createdAt: new Date(issueDate).toISOString(),
                            dueDate: new Date(dueDate).toISOString(),
                            notes,
                          });
                          addAuditLog({
                            id: `AL-${Date.now()}`,
                            userId: user?.employeeId || 'U-000',
                            userFullName: user?.fullName || 'System',
                            userRole: user?.role || 'Accountant',
                            action: 'SAVE_INVOICE_DRAFT',
                            module: 'InvoiceCreation',
                            recordId: existing.invoiceNumber,
                            recordType: 'Invoice',
                            ipAddress: '127.0.0.1',
                            details: `Updated draft invoice ${existing.invoiceNumber}`,
                            timestamp: new Date().toISOString()
                          });
                          setSubmitted(true);
                          toast.success(`Draft Invoice ${existing.invoiceNumber} updated.`, 'Draft Updated');
                          return;
                        }
                      }

                      const newInvoiceId = `INV-${Date.now()}`;
                      const invNum = `INV-${new Date().getFullYear()}-${String(invoices.length + 1).padStart(3, '0')}`;
                      const newInvoice: Invoice = {
                        id: newInvoiceId,
                        invoiceNumber: invNum,
                        clientId: invoiceClient?.id ?? '',
                        waybillIds: calc.validIds,
                        amount: calc.base,
                        vatAmount: calc.vat,
                        surchargeAmount: calc.surcharge,
                        totalAmount: calc.total,
                        billingSchedule: derivedBillingSchedule,
                        billingPeriod,
                        status: 'Draft',
                        createdBy: 'EMP-003',
                        createdAt: new Date(issueDate).toISOString(),
                        dueDate: new Date(dueDate).toISOString(),
                        notes,
                      };
                      addInvoice(newInvoice);
                      // Don't mark waybills as billed yet for Drafts
                      addAuditLog({
                        id: `AL-${Date.now()}`,
                        userId: user?.employeeId || 'U-000',
                        userFullName: user?.fullName || 'System',
                        userRole: user?.role || 'Accountant',
                        action: 'SAVE_INVOICE_DRAFT',
                        module: 'InvoiceCreation',
                        recordId: invNum,
                        recordType: 'Invoice',
                        ipAddress: '127.0.0.1',
                        details: `Created draft invoice ${invNum}`,
                        timestamp: new Date().toISOString()
                      });
                      setSubmitted(true);
                      toast.success(`Invoice ${invNum} saved as Draft.`, 'Draft Saved');
                    }}
                    style={{
                      width: '100%',
                      background: 'transparent',
                      color: !isConfirmed ? '#94A3B8' : '#3B82F6',
                      border: `1px solid ${!isConfirmed ? '#94A3B8' : '#3B82F6'}`,
                      padding: '14px 24px',
                      borderRadius: 8,
                      fontWeight: 600,
                      fontSize: '0.95rem',
                      cursor: !isConfirmed ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      transition: 'background 0.2s, transform 0.1s'
                    }}
                  >
                    <i className="ti ti-device-floppy" style={{ fontSize: 18 }} /> Save as Draft
                  </button>
                </div>
              </Card>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvoiceCreation;
