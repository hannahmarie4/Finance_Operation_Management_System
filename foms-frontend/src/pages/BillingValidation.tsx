import React, { useState } from 'react';
import { useAppData } from '../context/AppDataContext';
import { useAuth } from '../context/AuthContext';
import { DataTable } from '../components/DataTable';
import { StatusBadge } from '../components/StatusBadge';
import { Button } from '../components/Buttons';
import { Card } from '../components/Card';
import { useToast } from '../components/ToastContext';
import { BillingRecord } from '../data/seed';
import { computeFreightCost } from '../utils/billing';
import { TableContainer } from '../components/TableContainer';

export const BillingValidation: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { waybills, billingRates, billingRecords, updateBillingRecord, addBillingRecord, clients } = useAppData();

  const isHead = user?.role === 'Head Accountant' || user?.role === 'Finance Manager';

  // State
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // 1. Validated Waybills WITHOUT Billing Records (For Accountant to Submit)
  const availableWaybills = waybills.filter(wb => 
    wb.status === 'Validated' && 
    !billingRecords.some(br => br.waybillId === wb.id)
  );

  // 2. Billing Records in Pending Review (For Head Accountant to Approve/Reject)
  const pendingRecords = billingRecords.filter(br => br.status === 'Pending Review');

  const handleSubmitBilling = () => {
    if (selectedIds.length === 0) return;
    
    let successCount = 0;
    let errorCount = 0;

    selectedIds.forEach(wbId => {
      const wb = waybills.find(w => w.id === wbId);
      if (!wb) return;
      
      try {
        const clientRates = billingRates.filter(r => r.clientId === wb.clientCode && r.status === 'Active');
        const freightData = computeFreightCost(wb, clientRates);
        const rateUsed = clientRates.find(r => r.region.toUpperCase() === freightData.area.toUpperCase());
        
        if (rateUsed) {
          const newRecord: BillingRecord = {
            id: `BR-${Date.now()}-${wbId}`,
            waybillId: wbId,
            clientId: wb.clientCode,
            rateId: rateUsed.id,
            volumeWeight: freightData.volumeWeight,
            actualWeight: freightData.actualWeight,
            chargeableWeight: freightData.chargeableWeight,
            freightCost: freightData.freightCost,
            valuation: freightData.valuation,
            odaCharge: freightData.odaCharge,
            subtotal: freightData.subtotal,
            vat: freightData.vat,
            fuelSurcharge: freightData.fuelSurcharge,
            grandTotal: freightData.grandTotal,
            status: 'Pending Review',
            computedBy: user?.employeeId || 'Unknown',
            computedAt: new Date().toISOString(),
          };
          addBillingRecord(newRecord);
          successCount++;
        }
      } catch (e: any) {
        errorCount++;
      }
    });

    if (successCount > 0) toast.success(`Submitted ${successCount} billing records for review.`, 'Success');
    if (errorCount > 0) toast.error(`Failed to compute ${errorCount} records. Check billing rates.`, 'Error');
    
    setSelectedIds([]);
  };

  const handleApprove = (recordId: string) => {
    updateBillingRecord(recordId, {
      status: 'Approved',
      reviewedBy: user?.employeeId,
      reviewedAt: new Date().toISOString()
    });
    toast.success('Billing record approved.', 'Success');
  };

  const handleReject = (recordId: string) => {
    updateBillingRecord(recordId, {
      status: 'Returned'
    });
    toast.info('Billing record returned for revision.', 'Returned');
  };

  // UI rendering
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {!isHead && (
        <Card>
          <div style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0F172A', margin: 0 }}>Unbilled Waybills</h2>
              <Button title="Compute & Submit" variant="primary" icon="ti-calculator" onClick={handleSubmitBilling} disabled={selectedIds.length === 0} />
            </div>
            <TableContainer>
              <DataTable
                title=""
                data={availableWaybills.map(wb => {
                  const client = clients.find(c => c.id === wb.clientCode);
                  let amount = 0;
                  try {
                    amount = computeFreightCost(wb, billingRates).calculatedAmount;
                  } catch (e) {}
                  return {
                    ...wb,
                    clientName: client?.name || wb.clientCode,
                    estimatedAmount: amount
                  };
                })}
                columns={[
                  { key: 'waybillNumber', label: 'Waybill No.', sortable: true },
                  { key: 'clientName', label: 'Client', sortable: true },
                  { key: 'deliveryDate', label: 'Delivery Date', render: (row) => new Date(row.deliveryDate).toLocaleDateString() },
                  { key: 'estimatedAmount', label: 'Estimated Freight', render: (row) => `₱${row.estimatedAmount.toLocaleString('en-PH', {minimumFractionDigits: 2})}` }
                ]}
                rowKey="id"
                selectable={true}
                selectedKeys={selectedIds}
                onSelectionChange={(keys) => setSelectedIds(keys.map(String))}
              />
            </TableContainer>
          </div>
        </Card>
      )}

      {isHead && (
        <Card>
          <div style={{ padding: '24px' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0F172A', marginBottom: '16px', marginTop: 0 }}>Pending Billing Approvals</h2>
            <TableContainer>
              <DataTable
                title=""
                data={pendingRecords.map(br => {
                  const wb = waybills.find(w => w.id === br.waybillId);
                  const client = clients.find(c => c.id === br.clientId);
                  return {
                    ...br,
                    waybillNumber: wb?.waybillNumber || br.waybillId,
                    clientName: client?.name || br.clientId,
                  };
                })}
                columns={[
                  { key: 'waybillNumber', label: 'Waybill No.', sortable: true },
                  { key: 'clientName', label: 'Client', sortable: true },
                  { key: 'grandTotal', label: 'Computed Amount', render: (row) => `₱${row.grandTotal.toLocaleString('en-PH', {minimumFractionDigits: 2})}` },
                  { key: 'status', label: 'Status', render: (row) => <StatusBadge status={row.status} /> }
                ]}
                actions={[
                  { label: 'Approve', icon: 'ti-check', onClick: (row) => handleApprove(row.id) },
                  { label: 'Reject', icon: 'ti-x', onClick: (row) => handleReject(row.id) }
                ]}
                rowKey="id"
              />
            </TableContainer>
          </div>
        </Card>
      )}
    </div>
  );
};

export default BillingValidation;
