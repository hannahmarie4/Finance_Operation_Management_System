import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Button from '../components/Buttons';
import { DataTable } from '../components/DataTable';
import { SEEDED_RATES, SEEDED_CLIENTS, BillingRate } from '../data/seed';
import { TableContainer } from '../components/TableContainer';
import { ClientInfoCard } from '../components/ClientInfoCard';
import { Card } from '../components/Card';
import { useToast } from '../components/ToastContext';

export const RateConfiguration: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const selectedClientId = id;
  const { triggerToast } = useToast();

  // Local state for rates to support add/edit functionality (Test Cases 51-57)
  const [ratesData, setRatesData] = useState<BillingRate[]>(SEEDED_RATES);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalData, setModalData] = useState<Partial<BillingRate>>({});
  const [formError, setFormError] = useState<string | null>(null);

  // Combine Rates with Client Data
  let ratesWithClientData: any[] = [];
  if (selectedClientId) {
    ratesWithClientData = ratesData.filter(r => r.clientId === selectedClientId).map(rate => {
      const client = SEEDED_CLIENTS.find(c => c.id === rate.clientId);
      return {
        ...rate,
        clientName: client ? client.name : 'Unknown Client',
        vatStatus: client ? client.vatStatus : 'Non-VATable',
        vatRateDisplay: rate.vatRate !== null ? `${(rate.vatRate * 100).toFixed(0)}%` : '—',
        agreedSchedule: client ? client.billingSchedule : 'Monthly'
      };
    });
  } else {
    const grouped = new Map<string, any[]>();
    ratesData.forEach(rate => {
      if (!grouped.has(rate.clientId)) grouped.set(rate.clientId, []);
      grouped.get(rate.clientId)!.push(rate);
    });
    ratesWithClientData = Array.from(grouped.entries()).map(([clientId, recs]) => {
      const client = SEEDED_CLIENTS.find(c => c.id === clientId);
      const statuses = Array.from(new Set(recs.map(r => r.region)));
      const region = statuses.length === 1 ? statuses[0] : 'Mixed';

      return {
        id: clientId,
        clientId,
        clientName: client ? client.name : 'Unknown Client',
        region: region,
        baseRate: recs.reduce((sum, r) => sum + r.baseRate, 0),
        vatStatus: client ? client.vatStatus : 'Non-VATable',
        vatRateDisplay: client && client.vatRate !== null ? `${(client.vatRate * 100).toFixed(0)}%` : '—',
        agreedSchedule: client ? client.billingSchedule : 'Monthly',
        isGrouped: true
      };
    });
  }

  const tableColumns = [
    {
      key: 'clientName', label: 'CLIENT NAME', render: (row: any) => (
        !selectedClientId ? (
          <span onClick={() => navigate(`/rate-configuration/${row.clientId}`)} style={{ color: '#0F172A', fontWeight: 700, cursor: 'pointer', textDecoration: 'none' }}>
            {row.clientName}
          </span>
        ) : (
          <span style={{ fontWeight: 600 }}>{row.clientName}</span>
        )
      )
    },
    { key: 'region', label: 'SERVICE AREA' },
    {
      key: 'baseRate',
      label: 'BASE FREIGHT RATE',
      render: (row: any) => `₱${row.baseRate.toFixed(2)}`
    },
    { key: 'vatStatus', label: 'VAT STATUS' },
    { key: 'vatRateDisplay', label: 'VAT RATE' },
    { key: 'agreedSchedule', label: 'AGREED SCHEDULE' }
  ];

  const tableActions = selectedClientId ? [
    { label: 'Add Billing Rate', icon: 'ti-plus', onClick: () => openModal() }
  ] : undefined;


  const openModal = (rate?: any) => {
    setFormError(null);
    if (rate) {
      setModalData(rate);
    } else {
      // Defaults for a new rate
      const client = SEEDED_CLIENTS.find(c => c.id === selectedClientId);
      setModalData({
        id: `RATE-NEW-${Date.now()}`,
        clientId: selectedClientId,
        region: 'Metro Manila',
        baseRate: 0,
        vatRate: client?.vatRate || 0.12,
        surchargeRate: 0.05,
        effectiveDate: new Date().toISOString().split('T')[0]
      });
    }
    setIsModalOpen(true);
  };

  const handleSaveRate = () => {
    // Validation
    const baseRateVal = modalData.baseRate;

    // Test 54: Check for blank base rate (treat undefined/null/empty string as blank)
    if (baseRateVal === undefined || baseRateVal === null || baseRateVal === '' as any) {
      setFormError('Base Freight Rate cannot be blank.');
      return;
    }

    const numBaseRate = Number(baseRateVal);

    // Test 55: Check for negative or invalid rate
    if (isNaN(numBaseRate) || numBaseRate < 0) {
      setFormError('Base Freight Rate must be a valid positive number.');
      return;
    }

    // Success (Tests 56 & 57)
    const existingIndex = ratesData.findIndex(r => r.id === modalData.id);
    const updatedRates = [...ratesData];
    const newRate = { ...modalData, baseRate: numBaseRate } as BillingRate;

    if (existingIndex >= 0) {
      updatedRates[existingIndex] = newRate;
      triggerToast('success', 'Success', 'Billing Rate updated successfully.');
    } else {
      updatedRates.push(newRate);
      triggerToast('success', 'Success', 'New Billing Rate created successfully.');
    }

    setRatesData(updatedRates);
    setIsModalOpen(false);
  };

  if (selectedClientId && SEEDED_CLIENTS.find(c => c.id === selectedClientId)) {
    const client = SEEDED_CLIENTS.find(c => c.id === selectedClientId)!;
    const clientRates = ratesData.filter(r => r.clientId === selectedClientId);

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', position: 'relative' }}>

        <ClientInfoCard client={client} />

        <Card>
          <div style={{ padding: '24px' }}>
            <DataTable
              title="Client Rates"
              data={ratesWithClientData}
              columns={tableColumns}
              actions={tableActions}
              rowKey="id"
              columnToggle={true}
              densityToggle={true}
              exportable={false}
            />
          </div>
        </Card>

        {/* ── Computation Breakdown Card ── */}
        {clientRates.length > 0 && (
          <Card>
            <div style={{ padding: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <i className="ti ti-calculator" style={{ fontSize: 20, color: '#6366F1' }} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#0F172A' }}>Rate Computation Breakdown</h3>
                  <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: '#64748B' }}>How the billing total is computed per waybill</p>
                </div>
              </div>

              {clientRates.map(rate => {
                const vatAmt = rate.baseRate * (rate.vatRate ?? 0);
                const surchargeAmt = rate.baseRate * (rate.surchargeRate ?? 0);
                const lineTotal = rate.baseRate + vatAmt + surchargeAmt;

                return (
                  <div key={rate.id} style={{ border: '1px solid #E2E8F0', borderRadius: 0, overflow: 'hidden', marginBottom: 16, background: '#fff', fontFamily: 'Arial, sans-serif' }}>
                    <div style={{ padding: '24px 32px' }}>
                      <h4 style={{ margin: '0 0 16px 0', fontSize: '1.1rem', fontWeight: 700, color: '#000', borderBottom: '2px solid #000', paddingBottom: '8px' }}>
                        Rate Computation Summary
                      </h4>

                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#000' }}>Service Area: {rate.region}</span>
                        <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#000' }}>{lineTotal.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                      </div>
                      <p style={{ margin: '0 0 24px 0', fontSize: '0.75rem', fontStyle: 'italic', color: '#4b5563', lineHeight: 1.4, maxWidth: '80%' }}>
                        (base freight rate agreed upon for this service area plus applicable taxes and surcharges; does not include unpaid previous balances)
                      </p>

                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#000' }}>Charges for this waybill</span>
                        <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#000' }}>{lineTotal.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                      </div>

                      <div style={{ paddingLeft: '16px', display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '24px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: '0.85rem', color: '#1f2937' }}>Base Freight Rate</span>
                          <span style={{ fontSize: '0.85rem', color: '#1f2937' }}>{rate.baseRate.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: '0.85rem', color: '#1f2937' }}>VAT ({((rate.vatRate ?? 0) * 100).toFixed(0)}%)</span>
                          <span style={{ fontSize: '0.85rem', color: '#1f2937' }}>{vatAmt.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: '0.85rem', color: '#1f2937' }}>Surcharge ({((rate.surchargeRate ?? 0) * 100).toFixed(0)}%)</span>
                          <span style={{ fontSize: '0.85rem', color: '#1f2937' }}>{surchargeAmt.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                        </div>
                      </div>

                      <div style={{ borderTop: '2px solid #000', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '1.2rem', fontWeight: 700, color: '#000' }}>Total Rate Per Waybill</span>
                        <span style={{ fontSize: '1.2rem', fontWeight: 700, color: '#000' }}>₱ {lineTotal.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                  </div>
                );
              })}

              <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 8, padding: '12px 16px', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <i className="ti ti-alert-circle" style={{ fontSize: 16, color: '#D97706', marginTop: 1 }} />
                <p style={{ margin: 0, fontSize: '0.8rem', color: '#92400E' }}>
                  <strong>Note:</strong> The above rates are per-waybill. The invoice total is the sum of all waybill line totals for the billing period. VAT status for this client: <strong>{client.vatStatus}</strong>.
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Modal Overlay for Add/Edit Billing Rate */}
        {isModalOpen && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ background: '#fff', borderRadius: 12, width: '400px', padding: '24px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#0F172A' }}>
                  {ratesData.find(r => r.id === modalData.id) ? 'Edit Client Billing Rate' : 'Add Client Billing Rate'}
                </h2>
                <i className="ti ti-x" style={{ cursor: 'pointer', fontSize: 20, color: '#64748B' }} onClick={() => setIsModalOpen(false)} />
              </div>

              {formError && (
                <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', padding: '12px', borderRadius: 8, fontSize: '0.85rem', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <i className="ti ti-alert-circle" style={{ fontSize: 16 }} />
                  {formError}
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: 6 }}>Service Area / Region</label>
                  <input
                    type="text"
                    value={modalData.region || ''}
                    onChange={e => setModalData({ ...modalData, region: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: '0.9rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: 6 }}>Base Freight Rate (₱) <span style={{ color: 'red' }}>*</span></label>
                  <input
                    type="number"
                    value={modalData.baseRate !== undefined ? modalData.baseRate : ''}
                    onChange={e => setModalData({ ...modalData, baseRate: e.target.value as any })}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: formError && (modalData.baseRate === undefined || modalData.baseRate === '' as any || Number(modalData.baseRate) < 0) ? '1px solid #DC2626' : '1px solid #CBD5E1', fontSize: '0.9rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: 6 }}>VAT Rate (Decimal)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={modalData.vatRate || 0}
                    onChange={e => setModalData({ ...modalData, vatRate: Number(e.target.value) })}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: '0.9rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: 6 }}>Surcharge Rate (Decimal)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={modalData.surchargeRate || 0}
                    onChange={e => setModalData({ ...modalData, surchargeRate: Number(e.target.value) })}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: '0.9rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24 }}>
                <Button variant="secondary" onClick={() => setIsModalOpen(false)} title="Cancel" />
                <Button variant="primary" onClick={handleSaveRate} title="Save Billing Rate" />
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

      <TableContainer>
        <DataTable
          title="Client Rates"
          data={ratesWithClientData}
          columns={tableColumns.filter(c => !['region', 'actions'].includes(c.key as string))}
          rowKey="id"
          columnToggle={true}
          densityToggle={true}
          exportable={false}
        />
      </TableContainer>
    </div>
  );
};

export default RateConfiguration;

