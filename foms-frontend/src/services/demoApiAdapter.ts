import type { AxiosAdapter, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import {
  SEEDED_AUDIT_LOGS,
  SEEDED_CASH_FLOW_RECORDS,
  SEEDED_CLIENTS,
  SEEDED_INVOICES,
  SEEDED_PAYMENTS,
  SEEDED_RECEIPTS,
  SEEDED_SPEEDPAY,
  SEEDED_USERS,
  SEEDED_WAYBILLS,
} from '../data/seed';
import { shouldLoadDemoSeeds } from '../config/runtimeMode';

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
const parseBody = (data: unknown) => {
  if (typeof data !== 'string') return (data ?? {}) as Record<string, any>;
  try { return JSON.parse(data) as Record<string, any>; } catch { return {}; }
};

// In empty-state demo mode (default), the in-memory store starts with empty collections.
// Populated seed fixtures are only loaded if shouldLoadDemoSeeds is explicitly true.
const store = {
  clients: shouldLoadDemoSeeds ? clone(SEEDED_CLIENTS) : [],
  invoices: shouldLoadDemoSeeds ? clone(SEEDED_INVOICES) : [],
  payments: shouldLoadDemoSeeds ? clone(SEEDED_PAYMENTS) : [],
  receipts: shouldLoadDemoSeeds ? clone(SEEDED_RECEIPTS) : [],
  speedPay: shouldLoadDemoSeeds ? clone(SEEDED_SPEEDPAY) : [],
  waybills: shouldLoadDemoSeeds ? clone(SEEDED_WAYBILLS) : [],
  auditLogs: shouldLoadDemoSeeds ? clone(SEEDED_AUDIT_LOGS) : [],
  cashFlow: shouldLoadDemoSeeds ? clone(SEEDED_CASH_FLOW_RECORDS) : [],
};

export const demoStore = store;

const response = (config: InternalAxiosRequestConfig, data: unknown, status = 200): AxiosResponse => ({
  data,
  status,
  statusText: status >= 400 ? 'Error' : 'OK',
  headers: {},
  config,
});

const demoInvoice = (invoice: any) => ({
  ...invoice,
  invoiceNo: invoice.invoiceNo ?? invoice.invoiceNumber ?? invoice.id,
  billingDate: invoice.billingDate ?? invoice.createdAt,
  dateEncoded: invoice.dateEncoded ?? invoice.createdAt,
  paymentStatus: invoice.paymentStatus ?? (invoice.status === 'Paid' ? 'Paid' : undefined),
});

const demoPayment = (payment: any) => ({
  ...payment,
  invoiceNo: payment.invoiceNo ?? payment.invoiceNumber ?? payment.invoiceId,
  paymentStatus: payment.paymentStatus ?? payment.status,
  paymentDate: payment.paymentDate ?? payment.recordedAt,
  dateRecorded: payment.dateRecorded ?? payment.recordedAt,
});

export const demoApiAdapter: AxiosAdapter = async (config) => {
  const method = (config.method ?? 'get').toLowerCase();
  const url = (config.url ?? '').split('?')[0];
  const body = parseBody(config.data);

  if (method === 'get' && url === '/clients') return response(config, clone(store.clients));
  if (method === 'get' && url === '/invoices') return response(config, store.invoices.map(demoInvoice));
  if (method === 'get' && url === '/payments') return response(config, store.payments.map(demoPayment));
  if (method === 'get' && url === '/official-receipts') return response(config, clone(store.receipts));
  if (method === 'get' && url === '/shipment-records') return response(config, clone(store.waybills));
  if (method === 'get' && url === '/speedpay/submissions') return response(config, clone(store.speedPay));
  if (method === 'get' && url === '/audit-logs') return response(config, clone(store.auditLogs));
  if (method === 'get' && url === '/cash-flow') return response(config, clone(store.cashFlow));

  if (method === 'post' && url === '/auth/login') {
    const username = String(body.username ?? '').trim().toUpperCase();
    let customUsers: any[] = [];
    try {
      const saved = localStorage.getItem('foms_staff_users');
      if (saved) customUsers = JSON.parse(saved);
    } catch {}
    const foundUser = SEEDED_USERS.find(u => u.employeeId.toUpperCase() === username) ||
      customUsers.find((u: any) => u.employeeId?.toUpperCase() === username);

    if (!foundUser) {
      return response(config, { success: false, message: 'Invalid Employee ID or password.' }, 401);
    }

    return response(config, {
      success: true,
      data: {
        accessToken: 'mock_demo_token',
        refreshToken: 'mock_demo_refresh_token',
        user: { id: foundUser.employeeId, fullName: foundUser.fullName, role: foundUser.role }
      }
    });
  }

  if (method === 'post' && url === '/auth/logout') {
    return response(config, { success: true });
  }

  if (method === 'post' && url === '/clients') {
    const id = body.clientCode || `CLI-DEMO-${Date.now()}`;
    const client = {
      id,
      clientCode: id,
      name: body.name ?? body.businessName ?? '',
      businessName: body.businessName ?? body.name ?? '',
      contactPerson: body.contactPerson ?? '',
      email: body.email ?? '',
      contactNumber: body.contactNumber ?? '',
      address: body.address ?? '',
      billingSchedule: body.billingSchedule ?? 'Monthly',
      status: body.status ?? 'Active',
      dateRegistered: new Date().toISOString(),
    };
    store.clients.unshift(client as any);
    return response(config, clone(client), 201);
  }

  if (method === 'put' && /^\/clients\/[^/]+$/.test(url)) {
    const id = decodeURIComponent(url.split('/').pop()!);
    const index = store.clients.findIndex((client: any) => client.id === id || client.clientCode === id);
    if (index < 0) return response(config, { message: 'Demo client not found.' }, 404);
    store.clients[index] = { ...store.clients[index], ...body } as any;
    return response(config, clone(store.clients[index]));
  }

  if (method === 'post' && url === '/payments') {
    const id = `PAY-DEMO-${Date.now()}`;
    const payment = {
      id,
      invoiceId: body.InvoiceId ?? body.invoiceId ?? '',
      invoiceNumber: body.InvoiceNo ?? body.invoiceNo ?? body.invoiceId ?? '',
      clientId: body.ClientId ?? body.clientId ?? '',
      clientName: body.ClientName ?? body.clientName ?? '',
      amount: Number(body.Amount ?? body.amount ?? 0),
      paymentMethod: body.PaymentMethod ?? body.paymentMethod ?? 'Bank Transfer',
      referenceNumber: body.ReferenceNumber ?? body.referenceNumber ?? '',
      recordedBy: body.RecordedBy ?? body.recordedBy ?? 'Demo User',
      recordedAt: body.PaymentDate ?? body.paymentDate ?? new Date().toISOString(),
      status: body.Status ?? body.status ?? 'Pending Validation',
      remarks: body.Remarks ?? body.remarks ?? '',
    };
    store.payments.unshift(payment as any);
    return response(config, demoPayment(payment), 201);
  }

  if (method === 'post' && url === '/invoices') {
    const id = body.id || `INV-DEMO-${Date.now()}`;
    const invoice = {
      ...body,
      id,
      invoiceNumber: body.invoiceNumber || id,
      createdAt: body.createdAt || new Date().toISOString(),
      status: body.status || 'Draft',
    };
    store.invoices.unshift(invoice as any);
    return response(config, demoInvoice(invoice), 201);
  }

  if (method === 'put' && /^\/invoices\/[^/]+$/.test(url)) {
    const id = decodeURIComponent(url.split('/').pop()!);
    const index = store.invoices.findIndex((inv: any) => inv.id === id || inv.invoiceNumber === id);
    if (index < 0) return response(config, { message: 'Demo invoice not found.' }, 404);
    store.invoices[index] = { ...store.invoices[index], ...body } as any;
    return response(config, demoInvoice(store.invoices[index]));
  }

  const financeMatch = url.match(/^\/finance\/payments\/([^/]+)\/(validate|reject|return)$/);
  if (method === 'post' && financeMatch) {
    const [, id, action] = financeMatch;
    const payment = store.payments.find((item: any) => item.id === id) as any;
    if (!payment) return response(config, { message: 'Demo payment not found.' }, 404);
    payment.status = action === 'reject' ? 'Rejected' : action === 'return' ? 'Pending Validation' : 'Validated';
    payment.remarks = body.Remarks ?? body.RejectionReason ?? payment.remarks;
    payment.validatedAt = new Date().toISOString();
    return response(config, demoPayment(payment));
  }

  const speedPayMatch = url.match(/^\/speedpay\/submissions\/([^/]+)\/status$/);
  if (method === 'put' && speedPayMatch) {
    const submission = store.speedPay.find((item: any) => item.id === speedPayMatch[1]) as any;
    if (!submission) return response(config, { message: 'Demo submission not found.' }, 404);
    submission.status = body.Status ?? submission.status;
    submission.rejectionReason = body.Remarks ?? submission.rejectionReason;
    return response(config, clone(submission));
  }

  return response(config, { message: `No demo handler for ${method.toUpperCase()} ${url}` }, 404);
};
