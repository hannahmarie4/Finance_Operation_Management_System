import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { DataTable } from '../components/DataTable';
import { StatusBadge } from '../components/StatusBadge';
import { Button } from '../components/Buttons';
import { Card } from '../components/Card';
import { Client } from '../data/seed';
import { useToast } from '../components/ToastContext';
import { useAuth } from '../context/AuthContext';
import { useAppData } from '../context/AppDataContext';
import { TableContainer } from '../components/TableContainer';
import { Dropdown } from '../components/Dropdown';
import { Users, FileText, Phone, Mail, MapPin, Calendar as CalIcon, Hash, Settings, CreditCard } from 'lucide-react';
import api from '../services/api';
import { computeFreightCost } from '../utils/billing';

export const ClientManagement: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { clients, invoices, payments, waybills, billingRecords, billingRates, updateClient, addClient, addAuditLog } = useAppData();

  // List view state
  const [isAddingNew, setIsAddingNew] = useState(false);

  // Form State (used for both Edit and Add)
  const [formData, setFormData] = useState({
    name: '',
    contactPerson: '',
    contactNumber: '',
    address: '',
    rateType: 'Standard',
    billingSchedule: 'Monthly',
    status: 'Active'
  });

  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedInvoiceForModal, setSelectedInvoiceForModal] = useState<any | null>(null);
  const [selectedReceiptForModal, setSelectedReceiptForModal] = useState<any | null>(null);
  // Sync form data when editing client changes (for Detail View)
  useEffect(() => {
    if (id) {
      const client = clients.find(c => c.id === id);
      if (client && !isEditMode) {
        setFormData({
          name: client.name,
          contactPerson: client.contactPerson,
          contactNumber: client.phone || '',
          address: client.address,
          rateType: 'Standard',
          billingSchedule: client.billingSchedule,
          status: client.status
        });
      }
    }
  }, [id, clients, isEditMode]);

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (id) {
      updateClient(id, {
        name: formData.name,
        contactPerson: formData.contactPerson,
        phone: formData.contactNumber,
        address: formData.address,
        billingSchedule: formData.billingSchedule as any,
        status: formData.status as any,
      });
      addAuditLog({
        id: `AL-${Date.now()}`,
        userId: user?.employeeId || 'U-000',
        userFullName: user?.fullName || 'System',
        userRole: user?.role || 'Accountant',
        action: 'UPDATE_CLIENT',
        module: 'ClientManagement',
        recordId: id,
        recordType: 'Client',
        ipAddress: '127.0.0.1',
        details: `Updated client profile: ${id}`,
        timestamp: new Date().toISOString()
      });
      toast.success(`Client ${id} successfully updated.`);
      setIsEditMode(false);
    }
  };

  const handleAddNewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        clientCode: `CLI-${Math.floor(1000 + Math.random() * 9000)}`,
        name: formData.name,
        businessName: formData.name,
        contactPerson: formData.contactPerson,
        contactNumber: formData.contactNumber,
        email: `no-reply-${Math.floor(1000 + Math.random() * 9000)}@speedex.com`,
        address: formData.address,
        tin: '',
        creditLimit: 0
      };

      const res = await api.post('/clients', payload);
      const newClient = res.data;

      const clientRecord: Client = {
        id: newClient.id ?? newClient.clientCode ?? `CLI-${Date.now()}`,
        name: newClient.name ?? newClient.businessName ?? formData.name,
        contactPerson: newClient.contactPerson ?? formData.contactPerson,
        email: newClient.email ?? '',
        phone: newClient.contactNumber ?? '',
        address: newClient.address ?? formData.address,
        region: newClient.region ?? 'Metro Manila',
        billingSchedule: newClient.billingSchedule ?? formData.billingSchedule,
        status: newClient.status === 'Active' ? 'Active' : 'Inactive',
        vatStatus: newClient.vatStatus ?? 'VATable',
        vatRate: newClient.vatRate ?? 12,
        createdAt: newClient.dateRegistered ?? new Date().toISOString(),
      };

      addClient(clientRecord);
      addAuditLog({
        id: `AL-${Date.now()}`,
        userId: user?.employeeId || 'U-000',
        userFullName: user?.fullName || 'System',
        userRole: user?.role || 'Accountant',
        action: 'CREATE_CLIENT',
        module: 'ClientManagement',
        recordId: clientRecord.id,
        recordType: 'Client',
        ipAddress: '127.0.0.1',
        details: `Created new client: ${clientRecord.id}`,
        timestamp: new Date().toISOString()
      });
      toast.success(`Client successfully created.`);
      setIsAddingNew(false);
    } catch (err) {
      console.error(err);
      toast.error('Failed to create client.');
    }
  };

  if (id) {
    const editingClient = clients.find(c => c.id === id);
    if (!editingClient) return <div>Client not found</div>;

    const billedInvoices = invoices.filter(inv => inv.clientId === editingClient.id);

    const totalBilled = billedInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
    const totalPaid = billedInvoices.filter(inv => inv.status === 'Paid').reduce((sum, inv) => sum + inv.totalAmount, 0);
    const currentBalance = totalBilled - totalPaid;
    const overdue = billedInvoices.filter(inv => inv.status === 'Overdue').reduce((sum, inv) => sum + inv.totalAmount, 0);
    const clientPayments = payments.filter(p => p.clientId === editingClient.id);

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Header Card */}
            <div style={{ background: '#0F172A', color: 'white', padding: '32px 24px', borderRadius: '12px' }}>
              <p style={{ margin: '0 0 8px', fontSize: '0.75rem', fontWeight: 600, color: '#94A3B8', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Company Code</p>
              <h2 style={{ margin: '0 0 16px', fontSize: '1.25rem', fontWeight: 700, color: 'white' }}>{editingClient.id} · {editingClient.name}</h2>
              <div style={{ width: 'fit-content' }}>
                <StatusBadge status={editingClient.status} />
              </div>
            </div>

            {/* Client Profile */}
            <div style={{ background: '#fff', border: '1px solid #E2E8F0', padding: '24px', borderRadius: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Users size={18} color="#64748B" />
                  <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#0F172A' }}>Client Profile</h3>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                {/* Row 1 */}
                <div>
                  <p style={{ margin: '0 0 4px', fontSize: '0.75rem', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase' }}>Contact Person</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Users size={14} color="#94A3B8" />
                    <p style={{ margin: 0, fontSize: '0.9rem', color: '#334155', fontWeight: 500 }}>
                      {editingClient.contactPerson}
                    </p>
                  </div>
                </div>
                <div>
                  <p style={{ margin: '0 0 4px', fontSize: '0.75rem', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase' }}>Contact Number</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Phone size={14} color="#94A3B8" />
                    <p style={{ margin: 0, fontSize: '0.9rem', color: '#334155', fontWeight: 500 }}>{editingClient.phone}</p>
                  </div>
                </div>

                {/* Row 2 */}
                <div>
                  <p style={{ margin: '0 0 4px', fontSize: '0.75rem', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase' }}>Email</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Mail size={14} color="#94A3B8" />
                    <p style={{ margin: 0, fontSize: '0.9rem', color: '#334155', fontWeight: 500 }}>{editingClient.email}</p>
                  </div>
                </div>


                {/* Row 3 */}
                <div style={{ gridColumn: '1 / -1' }}>
                  <p style={{ margin: '0 0 4px', fontSize: '0.75rem', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase' }}>Address</p>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                    <MapPin size={14} color="#94A3B8" style={{ marginTop: '2px' }} />
                    <p style={{ margin: 0, fontSize: '0.9rem', color: '#334155', fontWeight: 500 }}>{editingClient.address}</p>
                  </div>
                </div>

                {/* Row 4 */}
                <div>
                  <p style={{ margin: '0 0 4px', fontSize: '0.75rem', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase' }}>Registered</p>
                  <p style={{ margin: 0, fontSize: '0.9rem', color: '#334155', fontWeight: 500 }}>
                    {new Date(editingClient.createdAt).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })}
                  </p>
                </div>
              </div>
            </div>

            {/* Billing History Card */}
            <div style={{ background: '#fff', border: '1px solid #E2E8F0', padding: '24px', borderRadius: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <FileText size={18} color="#F59E0B" />
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#0F172A' }}>Billing History</h3>
              </div>
              <div style={{ borderRadius: '8px', overflow: 'visible' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', borderTop: '1px solid #E2E8F0' }}>
                    <tr>
                      <th style={{ padding: '12px 16px', textAlign: 'left', color: '#475569', fontWeight: 600 }}>Invoice No.</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', color: '#475569', fontWeight: 600 }}>Invoice Date</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', color: '#475569', fontWeight: 600 }}>Billing Period</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', color: '#475569', fontWeight: 600 }}>Waybill Count</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', color: '#475569', fontWeight: 600 }}>Total Amount</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', color: '#475569', fontWeight: 600 }}>Status</th>
                      <th style={{ padding: '12px 16px', textAlign: 'center', color: '#475569', fontWeight: 600 }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {billedInvoices.length > 0 ? (
                      billedInvoices.map(inv => (
                        <tr key={inv.id} style={{ borderBottom: '1px solid #E2E8F0', background: 'transparent' }}>
                          <td style={{ padding: '12px 16px', color: '#0F172A', fontWeight: 600 }}>
                            {inv.invoiceNumber}
                          </td>
                          <td style={{ padding: '12px 16px', color: '#475569' }}>{new Date(inv.createdAt).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })}</td>
                          <td style={{ padding: '12px 16px', color: '#475569' }}>{inv.billingPeriod}</td>
                          <td style={{ padding: '12px 16px', color: '#475569' }}>{inv.waybillIds?.length || 0}</td>
                          <td style={{ padding: '12px 16px', color: '#0F172A', fontWeight: 600 }}>₱ {inv.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                          <td style={{ padding: '12px 16px' }}><StatusBadge status={inv.status} /></td>
                          <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                            <Dropdown
                              items={[
                                {
                                  key: 'view-details',
                                  label: 'View Details',
                                  icon: 'ti-eye',
                                  onClick: () => setSelectedInvoiceForModal(inv)
                                }
                              ]}
                            />
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} style={{ padding: '20px', textAlign: 'center', color: '#94A3B8' }}>No billing history found for this client.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Payment Records Card */}
            {user?.role === 'Accountant' && (
              <div style={{ background: '#fff', border: '1px solid #E2E8F0', padding: '24px', borderRadius: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                  <CreditCard size={18} color="#10B981" />
                  <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#0F172A' }}>Payment Records</h3>
                </div>
                <div style={{ borderRadius: '8px', overflow: 'visible' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                    <thead style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', borderTop: '1px solid #E2E8F0' }}>
                      <tr>
                        <th style={{ padding: '12px 16px', textAlign: 'left', color: '#475569', fontWeight: 600 }}>Payment ID / OR No.</th>
                        <th style={{ padding: '12px 16px', textAlign: 'left', color: '#475569', fontWeight: 600 }}>Payment Date</th>
                        <th style={{ padding: '12px 16px', textAlign: 'left', color: '#475569', fontWeight: 600 }}>Invoice No.</th>
                        <th style={{ padding: '12px 16px', textAlign: 'left', color: '#475569', fontWeight: 600 }}>Payment Method</th>
                        <th style={{ padding: '12px 16px', textAlign: 'left', color: '#475569', fontWeight: 600 }}>Amount Paid</th>
                        <th style={{ padding: '12px 16px', textAlign: 'left', color: '#475569', fontWeight: 600 }}>Status</th>
                        <th style={{ padding: '12px 16px', textAlign: 'center', color: '#475569', fontWeight: 600 }}>Action / Receipt</th>
                      </tr>
                    </thead>
                    <tbody>
                      {clientPayments.length > 0 ? (
                        clientPayments.map(pay => (
                          <tr key={pay.id} style={{ borderBottom: '1px solid #E2E8F0' }}>
                            <td style={{ padding: '12px 16px', color: '#0F172A', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                              {pay.orNumber || pay.referenceNumber || pay.id} <FileText size={14} color="#94A3B8" />
                            </td>
                            <td style={{ padding: '12px 16px', color: '#475569' }}>{new Date(pay.recordedAt).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })}</td>
                            <td style={{ padding: '12px 16px', color: '#475569' }}>{pay.invoiceNumber || pay.invoiceId || 'N/A'}</td>
                            <td style={{ padding: '12px 16px', color: '#475569' }}>{pay.paymentMethod}</td>
                            <td style={{ padding: '12px 16px', color: '#0F172A', fontWeight: 600 }}>₱ {pay.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                            <td style={{ padding: '12px 16px' }}><StatusBadge status="Paid" /></td>
                            <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                              <Dropdown
                                items={[
                                  {
                                    key: 'view-details',
                                    label: 'View Details',
                                    icon: 'ti-eye',
                                    onClick: () => setSelectedReceiptForModal(pay)
                                  }
                                ]}
                              />
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={7} style={{ padding: '20px', textAlign: 'center', color: '#94A3B8' }}>No payment records found for this client.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Modal for Invoice Details */}
            {selectedInvoiceForModal && createPortal(
              <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', zIndex: 99999, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }} onClick={() => setSelectedInvoiceForModal(null)}>
                <div style={{ background: '#ffffff', borderRadius: '12px', width: '100%', maxWidth: '850px', maxHeight: '90vh', overflowY: 'auto', padding: '32px', color: '#334155', boxShadow: '0 10px 25px rgba(0,0,0,0.3)' }} onClick={e => e.stopPropagation()}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: '#0F172A' }}>Invoice Details</h3>
                    <button onClick={() => setSelectedInvoiceForModal(null)} style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', fontSize: '1.5rem', display: 'flex', alignItems: 'center' }}><i className="ti ti-x" /></button>
                  </div>

                  {(() => {
                    let invoiceWaybills = waybills.filter(w => w.invoiceId === selectedInvoiceForModal.id || w.invoiceId === selectedInvoiceForModal.invoiceNumber || selectedInvoiceForModal.waybillIds?.includes(w.id));
                    if (invoiceWaybills.length === 0) {
                      // Fallback for mock data or missing backend relations
                      invoiceWaybills = waybills.filter(w => w.clientCode === selectedInvoiceForModal.clientId);
                    }
                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        {/* Included Waybills */}
                        <div style={{ border: '1px solid var(--border, #E2E8F0)', borderRadius: '8px', overflow: 'hidden' }}>
                          <div style={{ background: 'var(--s1, #F7F9FF)', padding: '10px 14px', borderBottom: '1px solid var(--border, #E2E8F0)', fontSize: '11px', fontWeight: 700, color: 'var(--tt, #6B7280)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                            Included Waybills ({invoiceWaybills.length})
                          </div>
                          <div style={{ padding: '0 14px', maxHeight: '160px', overflowY: 'auto' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1fr 1fr', padding: '10px 0', borderBottom: '1px solid var(--border, #E2E8F0)', fontSize: '11px', fontWeight: 700, color: 'var(--tt, #6B7280)', textTransform: 'uppercase' }}>
                              <span>Waybill No.</span>
                              <span>Delivery Date</span>
                              <span>Status</span>
                              <span>Docs</span>
                              <span style={{ textAlign: 'right' }}>Amount</span>
                            </div>
                            {invoiceWaybills.map((wb, i) => {
                              let freightAmount = 0;
                              let errorMsg = null;
                              try {
                                const breakdown = computeFreightCost(wb, billingRates);
                                freightAmount = breakdown.grandTotal;
                              } catch (e) {
                                errorMsg = 'No Rate config';
                              }

                              return (
                                <div key={wb.id} style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1fr 1fr', padding: '10px 0', borderBottom: i < invoiceWaybills.length - 1 ? '1px solid #F1F5F9' : 'none', fontSize: '13px', color: 'var(--ts, #374151)', alignItems: 'center' }}>
                                  <span style={{ fontWeight: 600, color: 'var(--tp, #0F172A)' }}>{wb.waybillNumber}</span>
                                  <span>{new Date(wb.deliveryDate).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                                  <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '999px', background: wb.status === 'Validated' ? '#DCFCE7' : '#F1F5F9', color: wb.status === 'Validated' ? '#166534' : '#475569', display: 'inline-block', width: 'fit-content', fontWeight: 600 }}>{wb.status}</span>
                                  <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '999px', background: wb.hasOriginalPOD ? '#DBEAFE' : (wb.hasApprovedCTC ? '#FEF9C3' : '#FEE2E2'), color: wb.hasOriginalPOD ? '#1E40AF' : (wb.hasApprovedCTC ? '#854D0E' : '#991B1B'), display: 'inline-block', width: 'fit-content', fontWeight: 600 }}>
                                    {wb.hasOriginalPOD ? 'Orig POD' : (wb.hasApprovedCTC ? 'CTC' : 'Missing')}
                                  </span>
                                  <span style={{ textAlign: 'right', fontWeight: 600 }}>
                                    {errorMsg ? <span style={{ color: '#DC2626', fontSize: '11px' }}>{errorMsg}</span> : `₱${freightAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`}
                                  </span>
                                </div>
                              );
                            })}
                            {invoiceWaybills.length === 0 && (
                              <div style={{ padding: '16px', textAlign: 'center', color: '#94A3B8' }}>No waybill details found for this invoice.</div>
                            )}
                          </div>
                        </div>

                        {/* Computation Breakdown */}
                        <div style={{ background: 'var(--s1, #F7F9FF)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border, #E2E8F0)' }}>
                          {/* Per-waybill freight details */}
                          {invoiceWaybills.map((wb) => {
                            let fd = null;
                            let errorMsg = null;
                            try {
                              const br = computeFreightCost(wb, billingRates);
                              fd = {
                                area: br.area || 'Unknown',
                                chargeableWeight: br.chargeableWeight,
                                weightBasis: br.volumeWeight > br.actualWeight ? 'Volume Weight' : 'Actual Weight',
                                freightCost: br.freightCost,
                                valuation: br.valuation || 0,
                                odaCharge: br.odaCharge || 0,
                              };
                            } catch (e) {
                              errorMsg = 'No Rate config';
                            }
                            
                            return (
                              <div key={wb.id} style={{ marginBottom: 10, padding: '10px 12px', background: '#fff', borderRadius: 6, border: '1px solid #E2E8F0' }}>
                                <div style={{ fontSize: '11px', fontWeight: 700, color: '#0F172A', marginBottom: 6 }}>{wb.waybillNumber} {fd ? `— ${fd.area}` : ''}</div>
                                {errorMsg ? (
                                  <div style={{ color: '#DC2626', fontSize: '12px', fontWeight: 600 }}>
                                    <i className="ti ti-alert-circle" style={{ marginRight: 4 }}></i>
                                    {errorMsg}
                                  </div>
                                ) : fd ? (
                                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 12px', fontSize: '11px', color: '#475569' }}>
                                    <span>Chargeable Weight</span><span style={{ textAlign: 'right', fontWeight: 600 }}>{fd.chargeableWeight.toFixed(2)} kg ({fd.weightBasis})</span>
                                    <span>Freight Cost</span><span style={{ textAlign: 'right', fontWeight: 600 }}>₱{fd.freightCost.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                                    {fd.valuation > 0 && <><span>Valuation (1%)</span><span style={{ textAlign: 'right', fontWeight: 600 }}>₱{fd.valuation.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span></>}
                                    {fd.odaCharge > 0 && <><span>ODA Charge</span><span style={{ textAlign: 'right', fontWeight: 600 }}>₱{fd.odaCharge.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span></>}
                                  </div>
                                ) : null}
                              </div>
                            );
                          })}
                          {/* Grand totals */}
                          <div style={{ marginTop: 8 }}>
                            {[
                              { label: 'Total Freight Cost', val: selectedInvoiceForModal.amount },
                              { label: 'Subtotal (Freight + Valuation + ODA)', val: selectedInvoiceForModal.amount },
                              { label: '12% VAT (on Subtotal)', val: selectedInvoiceForModal.vatAmount },
                              { label: 'Fuel Surcharge (15% of Freight)', val: selectedInvoiceForModal.surchargeAmount },
                            ].map((row, i) => (
                              <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '13px' }}>
                                <span style={{ color: 'var(--ts, #374151)' }}>{row.label}</span>
                                <span style={{ fontWeight: 600, color: 'var(--tp, #0F172A)' }}>₱{row.val.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                              </div>
                            ))}
                            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '10px', borderTop: '2px solid var(--border, #0F172A)', fontSize: '14px' }}>
                              <span style={{ color: 'var(--tp, #0F172A)', fontWeight: 800 }}>GRAND TOTAL</span>
                              <span style={{ fontWeight: 800, color: 'var(--ok, #059669)', fontSize: '16px' }}>₱{selectedInvoiceForModal.totalAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* SHIPMENT DETAILS */}

                </div>
              </div>,
              document.body
            )}

            {/* Modal for Official Receipt */}
            {selectedReceiptForModal && createPortal(
              <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', zIndex: 99999, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }} onClick={() => setSelectedReceiptForModal(null)}>
                <div style={{ background: '#ffffff', borderRadius: '12px', width: '100%', maxWidth: '850px', maxHeight: '90vh', overflowY: 'auto', padding: '32px', color: '#334155', boxShadow: '0 10px 25px rgba(0,0,0,0.3)', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>

                  {/* Top Bar with Download Button */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: '#0F172A' }}>Official Receipt</h3>
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <button style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#3B82F6', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', fontWeight: 600, cursor: 'pointer', transition: 'background 0.2s' }} onMouseOver={e => e.currentTarget.style.background = '#2563EB'} onMouseOut={e => e.currentTarget.style.background = '#3B82F6'}>
                        <i className="ti ti-download" /> Download
                      </button>
                      <button onClick={() => setSelectedReceiptForModal(null)} style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', fontSize: '1.5rem', display: 'flex', alignItems: 'center' }}><i className="ti ti-x" /></button>
                    </div>
                  </div>

                  {/* Receipt Content */}
                  <div style={{ border: '2px solid #E2E8F0', padding: '40px', borderRadius: '8px', position: 'relative', background: '#F8FAFC' }}>
                    <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                      <h2 style={{ margin: '0 0 8px 0', color: '#0F172A', fontSize: '1.5rem', fontWeight: 900, letterSpacing: '-0.5px' }}>FOMS COURIER & FORWARDER, INC.</h2>
                      <p style={{ margin: 0, color: '#475569', fontSize: '0.9rem' }}>123 Logistics Way, Transport City, Metro Manila</p>
                      <p style={{ margin: 0, color: '#475569', fontSize: '0.9rem' }}>VAT Reg. TIN: 000-123-456-000</p>
                      <h3 style={{ marginTop: '32px', color: '#2563EB', letterSpacing: '3px', textTransform: 'uppercase', fontSize: '1.3rem', fontWeight: 800 }}>Official Receipt</h3>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '32px', borderBottom: '1px dashed #CBD5E1', paddingBottom: '24px' }}>
                      <div>
                        <p style={{ margin: '0 0 6px 0', fontSize: '0.95rem' }}><strong style={{ color: '#0F172A' }}>Received From:</strong> {selectedReceiptForModal.clientName || editingClient.name}</p>
                        <p style={{ margin: '0 0 6px 0', fontSize: '0.95rem' }}><strong style={{ color: '#0F172A' }}>Address:</strong> {editingClient.address}</p>
                        <p style={{ margin: '0 0 6px 0', fontSize: '0.95rem' }}><strong style={{ color: '#0F172A' }}>TIN:</strong> N/A</p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ margin: '0 0 6px 0', fontSize: '0.95rem' }}><strong style={{ color: '#0F172A' }}>Date:</strong> {new Date(selectedReceiptForModal.recordedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                        <p style={{ margin: '0 0 6px 0', fontSize: '0.95rem' }}><strong style={{ color: '#0F172A' }}>O.R. No.:</strong> <span style={{ color: '#EF4444', fontWeight: 700, fontSize: '1.1rem' }}>{selectedReceiptForModal.orNumber || selectedReceiptForModal.referenceNumber || selectedReceiptForModal.id}</span></p>
                        <p style={{ margin: '0 0 6px 0', fontSize: '0.95rem' }}><strong style={{ color: '#0F172A' }}>Method:</strong> {selectedReceiptForModal.paymentMethod}</p>
                      </div>
                    </div>

                    <div style={{ marginBottom: '40px' }}>
                      <p style={{ fontSize: '1.1rem', lineHeight: '1.8', color: '#334155' }}>
                        Received the sum of <strong style={{ color: '#0F172A', fontSize: '1.2rem', textDecoration: 'underline' }}>PHP {selectedReceiptForModal.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong> in partial/full payment of <strong style={{ color: '#0F172A' }}>Invoice No. {selectedReceiptForModal.invoiceNumber || selectedReceiptForModal.invoiceId || 'N/A'}</strong>.
                      </p>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '64px' }}>
                      <div style={{ width: '250px', textAlign: 'center' }}>
                        <div style={{ borderBottom: '1px solid #0F172A', marginBottom: '8px', paddingBottom: '4px' }}>
                          <strong style={{ color: '#0F172A' }}>{selectedReceiptForModal.recordedBy || 'Authorized Signatory'}</strong>
                        </div>
                        <span style={{ fontSize: '0.85rem', color: '#64748B', textTransform: 'uppercase', letterSpacing: '1px' }}>Authorized Representative</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>,
              document.body
            )}

        {/* Edit Client Modal */}
        {isEditMode && createPortal(
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)',
            display: 'flex', justifyContent: 'center', alignItems: 'center',
            zIndex: 99999, padding: '20px'
          }}>
            <Card style={{ width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
              <div style={{ padding: '24px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 600, color: '#64748B', letterSpacing: '0.05em' }}>EDIT CLIENT</h2>
                  <h3 style={{ margin: '4px 0 0', fontSize: '1.25rem', fontWeight: 700, color: '#0F172A' }}>{editingClient.id}</h3>
                </div>
                <button onClick={() => setIsEditMode(false)} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#94A3B8' }}>×</button>
              </div>

              <div style={{ padding: '24px' }}>
                <form onSubmit={handleEditSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>Client Name <span style={{ color: '#EF4444' }}>*</span></label>
                    <input required type="text" name="name" value={formData.name} onChange={handleFormChange} style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #E2E8F0', background: '#F8FAFC' }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>Contact Person <span style={{ color: '#EF4444' }}>*</span></label>
                    <input required type="text" name="contactPerson" value={formData.contactPerson} onChange={handleFormChange} style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #E2E8F0', background: '#F8FAFC' }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>Contact Number <span style={{ color: '#EF4444' }}>*</span></label>
                    <input required type="text" name="contactNumber" value={formData.contactNumber} onChange={handleFormChange} style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #E2E8F0', background: '#F8FAFC' }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>Rate Type <span style={{ color: '#EF4444' }}>*</span></label>
                    <input required type="text" name="rateType" value={formData.rateType} onChange={handleFormChange} style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #E2E8F0', background: '#F8FAFC' }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', gridColumn: '1 / -1' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>Address <span style={{ color: '#EF4444' }}>*</span></label>
                    <input required type="text" name="address" value={formData.address} onChange={handleFormChange} style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #E2E8F0', background: '#F8FAFC' }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>Billing Cycle</label>
                    <select name="billingSchedule" value={formData.billingSchedule} onChange={handleFormChange} style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #E2E8F0', background: '#F8FAFC' }}>
                      <option value="Monthly">Monthly</option>
                      <option value="Semi-monthly">Semi-monthly</option>
                      <option value="Weekly">Weekly</option>
                    </select>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>Status</label>
                    <select name="status" value={formData.status} onChange={handleFormChange} style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #E2E8F0', background: '#F8FAFC' }}>
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>
                  <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' }}>
                    <Button variant="secondary" title="Cancel" type="button" onClick={() => setIsEditMode(false)} />
                    <Button variant="primary" title="Save Changes" type="submit" />
                  </div>
                </form>
              </div>
            </Card>
          </div>,
          document.body
        )}
      </div>
    );
  }

  // --- List View ---
  const tableColumns = [
    {
      key: 'name', label: 'CLIENT NAME', sortable: true, render: (row: Client) => (
        <span style={{ color: '#0F172A', fontWeight: 700, textDecoration: 'none' }}>
          {row.name}
        </span>
      )
    },
    {
      key: 'id', label: 'CLIENT ID', sortable: true, render: (row: Client) => {
        if (row.id && row.id.length > 15 && row.id.includes('-')) {
          // Simple hash to create a short CA-XXX format for UUIDs to make it look clean
          let hash = 0;
          for (let i = 0; i < row.id.length; i++) {
            hash = ((hash << 5) - hash) + row.id.charCodeAt(i);
            hash |= 0;
          }
          const shortNum = Math.abs(hash) % 900 + 100;
          return `CA-${shortNum}`;
        }
        return row.id;
      }
    },
    {
      key: 'status',
      label: 'STATUS',
      render: (row: Client) => (
        <StatusBadge status={row.status} />
      )
    }
  ];

  const tableActions = [
    { label: 'View Details', icon: 'ti-eye', onClick: (row: Client) => navigate(`/clients/${row.id}`) }
  ];

  const handleAddNew = () => {
    setFormData({
      name: '',
      contactPerson: '',
      contactNumber: '',
      address: '',
      rateType: 'Standard',
      billingSchedule: 'Monthly',
      status: 'Active'
    });
    setIsAddingNew(true);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* Modal for ADD NEW CLIENT ONLY */}
      {isAddingNew && createPortal(
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)',
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          zIndex: 99999, padding: '20px'
        }}>
          <Card style={{ width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ padding: '24px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 600, color: '#64748B', letterSpacing: '0.05em' }}>NEW CLIENT</h2>
                <h3 style={{ margin: '4px 0 0', fontSize: '1.25rem', fontWeight: 700, color: '#0F172A' }}>Create New Client</h3>
              </div>
              <button onClick={() => setIsAddingNew(false)} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#94A3B8' }}>×</button>
            </div>

            <div style={{ padding: '24px' }}>
              <form onSubmit={handleAddNewSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>Client Name <span style={{ color: '#EF4444' }}>*</span></label>
                  <input required type="text" name="name" value={formData.name} onChange={handleFormChange} style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #E2E8F0', background: '#F8FAFC' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>Contact Person <span style={{ color: '#EF4444' }}>*</span></label>
                  <input required type="text" name="contactPerson" value={formData.contactPerson} onChange={handleFormChange} style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #E2E8F0', background: '#F8FAFC' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>Contact Number <span style={{ color: '#EF4444' }}>*</span></label>
                  <input required type="text" name="contactNumber" value={formData.contactNumber} onChange={handleFormChange} style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #E2E8F0', background: '#F8FAFC' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>Rate Type <span style={{ color: '#EF4444' }}>*</span></label>
                  <input required type="text" name="rateType" value={formData.rateType} onChange={handleFormChange} style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #E2E8F0', background: '#F8FAFC' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', gridColumn: '1 / -1' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>Address <span style={{ color: '#EF4444' }}>*</span></label>
                  <input required type="text" name="address" value={formData.address} onChange={handleFormChange} style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #E2E8F0', background: '#F8FAFC' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>Billing Cycle</label>
                  <select name="billingSchedule" value={formData.billingSchedule} onChange={handleFormChange} style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #E2E8F0', background: '#F8FAFC' }}>
                    <option value="Monthly">Monthly</option>
                    <option value="Semi-monthly">Semi-monthly</option>
                    <option value="Weekly">Weekly</option>
                  </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>Status</label>
                  <select name="status" value={formData.status} onChange={handleFormChange} style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #E2E8F0', background: '#F8FAFC' }}>
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
                <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' }}>
                  <Button variant="secondary" title="Cancel" type="button" onClick={() => setIsAddingNew(false)} />
                  <Button variant="primary" title="Create Client" type="submit" />
                </div>
              </form>
            </div>
          </Card>
        </div>,
        document.body
      )}

      {/* Data Table */}
      <TableContainer>
        <DataTable
          title={user?.role === 'Coordinator' ? "Client Search" : "Client Accounts"}
          data={clients}
          columns={tableColumns}
          actions={tableActions}
          rowKey="id"
          emptyMessage="No clients found matching criteria."
          searchPlaceholder="Search client name..."
          searchFields={['name']}
          filters={[
            {
              key: 'status',
              label: 'Status',
              options: [
                { label: 'Active', value: 'Active' },
                { label: 'Inactive', value: 'Inactive' }
              ]
            },
            {
              key: 'billingSchedule',
              label: 'Billing Cycle',
              options: [
                { label: 'Monthly', value: 'Monthly' },
                { label: 'Semi-monthly', value: 'Semi-monthly' },
                { label: 'Weekly', value: 'Weekly' }
              ]
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

export default ClientManagement;
