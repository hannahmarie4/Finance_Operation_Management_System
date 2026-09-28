import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate } from 'react-router-dom';
import { DataTable } from '../components/DataTable';
import { StatusBadge } from '../components/StatusBadge';
import { Card } from '../components/Card';
import { StatusCard } from '../components/StatusCard';
import { Button } from '../components/Buttons';
import { useToast } from '../components/ToastContext';
import { useAppData } from '../context/AppDataContext';
import { TableContainer } from '../components/TableContainer';
import { ClientInfoCard } from '../components/ClientInfoCard';

export const WaybillLogs: React.FC = () => {
  const { toast } = useToast();
  const { waybills, clients, updateWaybill } = useAppData();
  const [ctcModal, setCtcModal] = useState<any>(null);
  const [ctcFile, setCtcFile] = useState<File | null>(null);
  const [selectedWaybill, setSelectedWaybill] = useState<any>(null);
  const { id } = useParams();
  const navigate = useNavigate();
  const selectedClientId = id;

  let enriched: any[] = [];
  if (selectedClientId) {
    enriched = waybills.filter(wb => wb.clientCode === selectedClientId).map(wb => {
      const client = clients.find(c => c.id === wb.clientCode);
      return {
        ...wb,
        clientName: client?.name ?? 'Unknown Client',
        podVerification: wb.hasOriginalPOD ? 'Original POD' : wb.hasApprovedCTC ? 'Approved CTC' : 'Missing',
      };
    });
  } else {
    const grouped = new Map<string, any[]>();
    waybills.forEach(wb => {
      if (!grouped.has(wb.clientCode)) grouped.set(wb.clientCode, []);
      grouped.get(wb.clientCode)!.push(wb);
    });
    enriched = Array.from(grouped.entries()).map(([clientId, recs]) => {
      const client = clients.find(c => c.id === clientId);
      const maxDate = new Date(Math.max(...recs.map(r => new Date(r.deliveryDate).getTime())));
      const statuses = Array.from(new Set(recs.map(r => r.status)));
      const status = statuses.length === 1 ? statuses[0] : 'Mixed';

      return {
        id: clientId,
        clientCode: clientId,
        waybillNumber: recs.length === 1 ? recs[0].waybillNumber : '[Multiple]',
        clientName: client?.name ?? 'Unknown',
        deliveryDate: maxDate.toISOString(),
        podVerification: 'Mixed',
        status: status,
        isGrouped: true
      };
    });
  }

  const columns = [
    { key: 'waybillNumber', label: 'WAYBILL NO.', sortable: true },
    {
      key: 'clientName', label: 'CLIENT NAME', sortable: true, render: (row: any) => (
        !selectedClientId ? (
          <span onClick={() => navigate(`/waybills/${row.clientCode}`)} style={{ color: '#0F172A', fontWeight: 700, cursor: 'pointer', textDecoration: 'none' }}>
            {row.clientName}
          </span>
        ) : (
          <span style={{ fontWeight: 600 }}>{row.clientName}</span>
        )
      )
    },
    {
      key: 'deliveryDate',
      label: 'DELIVERY DATE',
      sortable: true,
      render: (row: any) => new Date(row.deliveryDate).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' }),
    },
    {
      key: 'podVerification',
      label: 'POD VERIFICATION',
      render: (row: any) => <StatusBadge status={row.podVerification} />,
    },
    {
      key: 'status',
      label: 'STATUS',
      render: (row: any) => <StatusBadge status={row.status} />,
    },
    {
      key: 'encodedAt',
      label: 'ENCODED AT',
      render: (row: any) => new Date(row.encodedAt).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' }),
    },
  ];

  const actions = [
    { label: 'View Timeline', icon: 'ti-list-details', onClick: (row: any) => setSelectedWaybill(row) },
    {
      label: 'Upload CTC',
      icon: 'ti-upload',
      onClick: (row: any) => setCtcModal(row),
      hidden: (row: any) => row.podVerification !== 'Missing'
    },
  ];

  if (selectedClientId && clients.find(c => c.id === selectedClientId)) {
    const client = clients.find(c => c.id === selectedClientId)!;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

        <ClientInfoCard client={client} />

        <Card>
          <div style={{ padding: '24px' }}>
            <DataTable
              title="Client Waybill Records"
              data={enriched}
              columns={columns}
              actions={actions}
              rowKey="id"
              searchPlaceholder="Search waybills..."
              searchFields={['waybillNumber', 'clientName', 'status'] as any}
              filters={[
                {
                  key: 'status',
                  label: 'Status',
                  options: [
                    { label: 'Draft', value: 'Draft' },
                    { label: 'Pending Validation', value: 'Pending Validation' },
                    { label: 'Validated', value: 'Validated' },
                    { label: 'CTC Submitted', value: 'CTC Submitted' },
                    { label: 'Validated (CTC)', value: 'Validated (CTC)' },
                    { label: 'Billed', value: 'Billed' },
                    { label: 'Rejected', value: 'Rejected' }
                  ],
                  filterFn: (row: any, val: string) => row.status === val
                }
              ]}
              columnToggle={true}
              densityToggle={true}
              exportable={false}
            />
          </div>
        </Card>

        {ctcModal && createPortal(
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15,23,42,0.4)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
            <div style={{ background: '#fff', borderRadius: '12px', width: '100%', maxWidth: '400px', padding: '24px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
              <h2 style={{ margin: '0 0 16px', fontSize: '1.2rem', color: '#0F172A' }}>Upload Certified True Copy</h2>
              <p style={{ margin: '0 0 20px', fontSize: '0.875rem', color: '#64748B' }}>Waybill: <strong>{ctcModal.waybillNumber}</strong></p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '16px', background: '#F8FAFC', borderRadius: '8px', border: '1px dashed #CBD5E1', marginBottom: '24px' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>Select File</label>
                <input type="file" accept=".jpg,.jpeg,.png,.pdf" onChange={e => setCtcFile(e.target.files?.[0] ?? null)} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <Button variant="secondary" title="Cancel" onClick={() => { setCtcModal(null); setCtcFile(null); }} />
                <Button variant="primary" title="Submit CTC" disabled={!ctcFile} onClick={() => {
                  updateWaybill(ctcModal.id, { hasApprovedCTC: false, status: 'CTC Submitted' });
                  toast.success(`CTC for ${ctcModal.waybillNumber} submitted for verification.`, 'CTC Uploaded');
                  setCtcModal(null);
                  setCtcFile(null);
                }} />
              </div>
            </div>
          </div>,
          document.body
        )}

        {selectedWaybill && createPortal(
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15,23,42,0.4)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
            <div style={{ background: '#fff', borderRadius: '12px', width: '100%', maxWidth: '500px', padding: '24px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', maxHeight: '90vh', overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div>
                  <h2 style={{ margin: '0', fontSize: '1.2rem', color: '#0F172A' }}>Waybill Timeline</h2>
                  <p style={{ margin: '4px 0 0', fontSize: '0.875rem', color: '#64748B' }}>Tracking: <strong>{selectedWaybill.waybillNumber}</strong></p>
                </div>
                <button onClick={() => setSelectedWaybill(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', fontSize: 20 }}>×</button>
              </div>

              <div style={{ padding: '0 8px', marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '24px', position: 'relative' }}>
                <div style={{ position: 'absolute', left: '19px', top: '10px', bottom: '10px', width: '2px', background: '#E2E8F0' }} />

                {[
                  { title: 'Encoded', desc: 'Waybill entered into the system', time: selectedWaybill.encodedAt, icon: 'ti-file-text', color: '#3B82F6', done: true },
                  { title: 'Picked Up', desc: 'Items collected from sender', time: new Date(new Date(selectedWaybill.encodedAt).getTime() + 86400000).toISOString(), icon: 'ti-package', color: '#F59E0B', done: true },
                  { title: 'In Transit', desc: 'Package is on the way', time: new Date(new Date(selectedWaybill.encodedAt).getTime() + 86400000 * 2).toISOString(), icon: 'ti-truck', color: '#8B5CF6', done: true },
                  { title: 'Delivered', desc: 'Successfully delivered to consignee', time: selectedWaybill.deliveryDate, icon: 'ti-map-pin', color: '#10B981', done: selectedWaybill.status !== 'Pending Validation' && selectedWaybill.status !== 'Draft' }
                ].map((ev, i) => (
                  <div key={i} style={{ display: 'flex', gap: '16px', position: 'relative', opacity: ev.done ? 1 : 0.4 }}>
                    <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: ev.done ? ev.color : '#E2E8F0', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1, border: `2px solid ${ev.done ? ev.color : '#E2E8F0'}` }}>
                      <i className={`ti ${ev.icon}`} style={{ fontSize: '13px' }} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, color: '#0F172A', fontSize: '0.95rem' }}>{ev.title}</div>
                      <div style={{ fontSize: '0.8rem', color: '#64748B', marginTop: 2 }}>{ev.desc}</div>
                      <div style={{ fontSize: '0.75rem', color: '#94A3B8', marginTop: 4, fontWeight: 600 }}>
                        {new Date(ev.time).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: '32px', display: 'flex', justifyContent: 'flex-end' }}>
                <Button variant="primary" title="Close" onClick={() => setSelectedWaybill(null)} />
              </div>
            </div>
          </div>,
          document.body
        )}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
        <StatusCard label="Total Waybills" value={waybills.length} icon="ti-file-description" variant="new" />
        <StatusCard label="Validated" value={waybills.filter((w: any) => w.status === 'Validated' || w.status === 'Validated (CTC)').length} icon="ti-circle-check" variant="success" />
        <StatusCard label="Pending Validation" value={waybills.filter((w: any) => w.status === 'Pending Validation' || w.status === 'CTC Submitted').length} icon="ti-clock-hour-4" variant="warning" />
        <StatusCard label="Billed" value={waybills.filter((w: any) => w.status === 'Billed').length} icon="ti-file-invoice" variant="info" />
      </div>

      {/* Table */}

      <TableContainer>
        <DataTable
          title="All Waybill Records"
          data={enriched}
          columns={columns.filter(c => !['waybillNumber', 'status'].includes(c.key as string))}
          rowKey="id"
          searchPlaceholder="Search waybills..."
          searchFields={['waybillNumber', 'clientName', 'status'] as any}
          filters={[
            {
              key: 'status',
              label: 'Status',
              options: [
                { label: 'Draft', value: 'Draft' },
                { label: 'Pending Validation', value: 'Pending Validation' },
                { label: 'Validated', value: 'Validated' },
                { label: 'CTC Submitted', value: 'CTC Submitted' },
                { label: 'Validated (CTC)', value: 'Validated (CTC)' },
                { label: 'Billed', value: 'Billed' },
                { label: 'Rejected', value: 'Rejected' }
              ],
              filterFn: (row: any, val: string) => row.status === val
            }
          ]}
          columnToggle={true}
          densityToggle={true}
          exportable={false}
        />
      </TableContainer>
    </div>
  );
};

export default WaybillLogs;
