/**
 * ─── FOMS Seed Data ───────────────────────────────────────────────
 * Single source of truth for all static/mock data in the application.
 * NO data should be hardcoded directly in components or contexts.
 * Import the constants you need from this file instead.
 * ─────────────────────────────────────────────────────────────────
 */

import type { User, UserRole } from '../types/auth';

// ─── Seeded User Accounts ─────────────────────────────────────────

export interface SeededUser extends User {
  password: string;
}

export const SEEDED_USERS: SeededUser[] = [
  {
    employeeId: 'EMP-001',
    fullName: 'Crystalyn Joyce C. Fajardo',
    role: 'Finance Manager',
    avatarInitials: 'CF',
    password: 'Password@123',
  },
  {
    employeeId: 'EMP-002',
    fullName: 'Misty',
    role: 'Head Accountant',
    avatarInitials: 'M',
    password: 'Password@123',
  },
  {
    employeeId: 'EMP-003',
    fullName: 'Maria Mariel Jane Anonuevo',
    role: 'Accountant',
    avatarInitials: 'MA',
    password: 'Password@123',
  },
  {
    employeeId: 'EMP-004',
    fullName: 'Hannah Estrera',
    role: 'Coordinator',
    avatarInitials: 'HE',
    password: 'Password@123',
  },
  {
    employeeId: 'EMP-005',
    fullName: 'Joana Marie Ogaya',
    role: 'Assistant of Finance Manager',
    avatarInitials: 'JO',
    password: 'Password@123',
  },
];

// ─── Login Feature Highlights ────────────────────────────────────

export interface FeatureHighlight {
  step: number;
  title: string;
  description: string;
}

export const FEATURE_HIGHLIGHTS: FeatureHighlight[] = [
  {
    step: 1,
    title: 'Enter Credentials',
    description: 'Use your assigned Employee ID and password to access the secure portal.'
  },
  {
    step: 2,
    title: 'Manage Receivables',
    description: 'Create invoices, track customer accounts, and monitor outstanding balances.'
  },
  {
    step: 3,
    title: 'Track Collections',
    description: 'Review real-time collection aging analytics, duplicates, and AI predictions.'
  }
];
// ─── Session Config ───────────────────────────────────────────────

export const SESSION_CONFIG = {
  INACTIVITY_TIMEOUT_MS: 30 * 60 * 1000,
  STORAGE_KEY: 'foms_session',
};

// ─── Role Display Labels ──────────────────────────────────────────

export const ROLE_LABELS: Record<UserRole, string> = {
  'Finance Manager': 'Finance Manager',
  'Financial Manager': 'Financial Manager',
  'Head Accountant': 'Head Accountant',
  'Accountant': 'Accountant',
  'Assistant of Finance Manager': 'Asst. Finance Manager',
  'Assistant of Financial Manager': 'Asst. Financial Manager',
  'Coordinator': 'Coordinator',
};

// ─── Clients ──────────────────────────────────────────────────────

export interface Client {
  id: string;
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  region: 'Luzon' | 'Visayas' | 'Mindanao' | 'Metro Manila';
  billingSchedule: 'Monthly' | 'Semi-monthly' | 'Weekly';
  status: 'Active' | 'Inactive';
  vatStatus: 'VATable' | 'Non-VATable';
  vatRate: number | null;
  createdAt: string;
}

export const SEEDED_CLIENTS: Client[] = [
  { id: 'CL-001', name: 'Lazada Philippines', contactPerson: 'Maria Dela Cruz', email: 'finance@lazada.com.ph', phone: '0917-123-4567', address: 'Rockwell Dr., Makati City', region: 'Metro Manila', billingSchedule: 'Monthly', status: 'Active', vatStatus: 'VATable', vatRate: 0.12, createdAt: '2024-11-26' },
  { id: 'CL-002', name: 'Shopee Express', contactPerson: 'Jose Santos', email: 'ap@shopee.ph', phone: '0917-555-9876', address: 'Ayala Ave., Makati City', region: 'Metro Manila', billingSchedule: 'Monthly', status: 'Active', vatStatus: 'VATable', vatRate: 0.12, createdAt: '2024-12-26' },
  { id: 'CL-003', name: 'TikTok Shop', contactPerson: 'Robert Lim', email: 'billing@tiktok.ph', phone: '0917-333-4444', address: 'BGC High St., Taguig City', region: 'Metro Manila', billingSchedule: 'Semi-monthly', status: 'Active', vatStatus: 'VATable', vatRate: 0.12, createdAt: '2025-01-25' },
  { id: 'CA-001', name: 'Lazada Account', contactPerson: 'Maria Dela Cruz', email: 'finance@lazada.com.ph', phone: '0917-123-4567', address: 'Rockwell Dr., Makati City', region: 'Metro Manila', billingSchedule: 'Monthly', status: 'Active', vatStatus: 'VATable', vatRate: 0.12, createdAt: '2024-11-26' },
  { id: 'CA-002', name: 'Shopee Express Account', contactPerson: 'Jose Santos', email: 'ap@shopee.ph', phone: '0917-555-9876', address: 'Ayala Ave., Makati City', region: 'Metro Manila', billingSchedule: 'Monthly', status: 'Active', vatStatus: 'VATable', vatRate: 0.12, createdAt: '2024-12-26' },
  { id: 'CA-003', name: 'Lazada Philippines', contactPerson: 'Lazada Admin', email: 'billing@lazada.ph', phone: '+63 917 123 4567', address: 'BGC High St., Taguig City', region: 'Metro Manila', billingSchedule: 'Monthly', status: 'Active', vatStatus: 'VATable', vatRate: 0.12, createdAt: '2024-11-26' },
];


// ─── Billing Rates ────────────────────────────────────────────────

export interface BillingRate {
  id: string;
  clientId: string;
  region: 'NCR' | 'Luzon' | 'Visayas' | 'Mindanao' | 'ODA';
  minimumWeight: number;
  minimumRate: number;
  excessRate: number;
  valuationRate: number;
  fuelSurchargeRate: number;
  vatRate: number;
  effectiveDate: string;
  status: 'Active' | 'Inactive';
}

export const SEEDED_RATES: BillingRate[] = [
  { id: 'RATE-001', clientId: 'CL-001', region: 'NCR', minimumWeight: 5, minimumRate: 100, excessRate: 25, valuationRate: 0.01, fuelSurchargeRate: 0.15, vatRate: 0.12, effectiveDate: '2024-01-01', status: 'Active' },
  { id: 'RATE-002', clientId: 'CL-001', region: 'Luzon', minimumWeight: 5, minimumRate: 130, excessRate: 45, valuationRate: 0.01, fuelSurchargeRate: 0.15, vatRate: 0.12, effectiveDate: '2024-01-01', status: 'Active' },
  { id: 'RATE-003', clientId: 'CL-001', region: 'Visayas', minimumWeight: 5, minimumRate: 150, excessRate: 50, valuationRate: 0.01, fuelSurchargeRate: 0.15, vatRate: 0.12, effectiveDate: '2024-01-01', status: 'Active' },
  { id: 'RATE-004', clientId: 'CL-001', region: 'Mindanao', minimumWeight: 5, minimumRate: 150, excessRate: 50, valuationRate: 0.01, fuelSurchargeRate: 0.15, vatRate: 0.12, effectiveDate: '2024-01-01', status: 'Active' },
  { id: 'RATE-005', clientId: 'CL-001', region: 'ODA', minimumWeight: 0, minimumRate: 500, excessRate: 0, valuationRate: 0.01, fuelSurchargeRate: 0.15, vatRate: 0.12, effectiveDate: '2024-01-01', status: 'Active' },
];

// ─── Billing Records ──────────────────────────────────────────────

export type BillingRecordStatus = 'Pending Review' | 'Approved' | 'Returned';

export interface BillingRecord {
  id: string;
  waybillId: string;
  clientId: string;
  rateId: string; // Rate configuration used
  
  volumeWeight: number;
  actualWeight: number;
  chargeableWeight: number;
  
  freightCost: number;
  valuation: number;
  odaCharge: number;
  subtotal: number;
  vat: number;
  fuelSurcharge: number;
  grandTotal: number;

  status: BillingRecordStatus;
  remarks?: string;
  computedBy: string;
  computedAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
}

export const SEEDED_BILLING_RECORDS: BillingRecord[] = [];

// ─── Waybills ─────────────────────────────────────────────────────

export type WaybillStatus = 'For Checking' | 'Validated' | 'Validated (CTC)' | 'Missing' | 'Pending' | 'Billed' | 'Failed' | 'Pending Validation' | 'Returned' | 'Not Completed';

export interface Waybill {
  id: string;
  waybillNumber: string;
  clientCode: string;
  deliveryDate: string;
  status: WaybillStatus;
  hasOriginalPOD: boolean;
  hasApprovedCTC: boolean;
  encodedBy: string;
  encodedAt: string;
  destinationArea?: string;
  
  // Verification features
  pod_image_url?: string;
  uploaded_by?: string;
  uploaded_date?: string;
  is_ctc?: boolean;
  certified_by?: string;
  certification_date?: string;
  reason_for_missing?: string;
  invoiceId?: string | null;
  notes?: string;

  // Extended Waybill Details
  senderName?: string;
  senderContact?: string;
  senderAddress?: string;
  receiverName?: string;
  receiverContact?: string;
  receiverAddress?: string;
  itemDescription?: string;
  itemQuantity?: number; // Number of boxes
  itemWeight?: string | number; // Actual weight in kg
  itemDimensions?: { length: number; width: number; height: number };
  deliveryType?: 'Delivery' | 'Pick Up';
  assignedCourier?: string;
  specialInstructions?: string;
  declaredValue?: number;
  isODA?: boolean; // Outside Delivery Area
}

export const SEEDED_WAYBILLS: Waybill[] = [
  { 
    id: 'WB-001', waybillNumber: 'WB-2026-0001', clientCode: 'CL-001', deliveryDate: new Date().toISOString(), status: 'Validated', hasOriginalPOD: true, hasApprovedCTC: true, encodedBy: 'EMP-004', encodedAt: new Date().toISOString(),
    senderName: 'Lazada Philippines', senderContact: '0917-123-4567', senderAddress: 'Rockwell Dr., Makati City',
    receiverName: 'Juan Dela Cruz', receiverContact: '0999-888-7777', receiverAddress: '123 Sampaguita St., Quezon City',
    itemDescription: 'Electronics & Gadgets', itemQuantity: 2, itemWeight: '1.5 kg',
    deliveryType: 'Delivery', assignedCourier: 'Rider John Doe', specialInstructions: 'Fragile, please handle with care.'
  },
  { 
    id: 'WB-002', waybillNumber: 'WB-2026-0002', clientCode: 'CL-001', deliveryDate: new Date().toISOString(), status: 'Pending', is_ctc: false, hasOriginalPOD: true, hasApprovedCTC: false, encodedBy: 'EMP-004', encodedAt: new Date().toISOString(), pod_image_url: 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?q=80&w=600&auto=format&fit=crop',
    senderName: 'Lazada Philippines', senderContact: '0917-123-4567', senderAddress: 'Rockwell Dr., Makati City',
    receiverName: 'Maria Santos', receiverContact: '0918-222-3333', receiverAddress: '456 Mango Ave., Cebu City',
    itemDescription: 'Clothing & Apparel', itemQuantity: 5, itemWeight: '2.0 kg',
    deliveryType: 'Delivery', assignedCourier: 'Rider Jane Smith', specialInstructions: 'Leave at the front desk.'
  },
  { id: 'WB-003', waybillNumber: 'WB-2026-0003', clientCode: 'CL-001', deliveryDate: new Date().toISOString(), status: 'Missing', hasOriginalPOD: false, hasApprovedCTC: false, encodedBy: 'EMP-004', encodedAt: new Date().toISOString(), senderName: 'Shopee Express', senderContact: '0917-555-9876', senderAddress: 'Ayala Ave., Makati City', receiverName: 'Pedro Penduko', receiverContact: '0922-333-4444', receiverAddress: '789 Rizal St., Davao City', itemDescription: 'Home Appliances', itemQuantity: 1, itemWeight: '5.5 kg', deliveryType: 'Pick Up', assignedCourier: 'Rider Mark', specialInstructions: 'Heavy item.' },
  { id: 'WB-004', waybillNumber: 'WB-2026-0004', clientCode: 'CL-003', deliveryDate: new Date().toISOString(), status: 'Pending', is_ctc: false, hasOriginalPOD: true, hasApprovedCTC: false, encodedBy: 'EMP-004', encodedAt: new Date().toISOString(), pod_image_url: 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?q=80&w=600&auto=format&fit=crop', senderName: 'TikTok Shop', senderContact: '0917-333-4444', senderAddress: 'BGC High St., Taguig City', receiverName: 'Ana Gomez', receiverContact: '0919-444-5555', receiverAddress: '101 Mabini St., Manila', itemDescription: 'Cosmetics', itemQuantity: 10, itemWeight: '0.5 kg', deliveryType: 'Delivery', assignedCourier: 'Rider Paul', specialInstructions: 'Do not expose to direct sunlight.' },
  { id: 'WB-E2E-001', waybillNumber: 'WB-E2E-001', clientCode: 'CA-001', deliveryDate: new Date().toISOString(), status: 'Validated', hasOriginalPOD: true, hasApprovedCTC: true, encodedBy: 'EMP-004', encodedAt: new Date().toISOString(), senderName: 'Lazada Account', senderContact: '0917-123-4567', senderAddress: 'Rockwell Dr., Makati City', receiverName: 'Customer A', receiverContact: '0900-000-0001', receiverAddress: 'Makati City, Metro Manila', itemDescription: 'General Merchandise', itemQuantity: 1, itemWeight: '1.0 kg', deliveryType: 'Delivery', assignedCourier: 'Rider A', specialInstructions: 'None' },
  { id: 'WB-E2E-002', waybillNumber: 'WB-E2E-002', clientCode: 'CA-001', deliveryDate: new Date().toISOString(), status: 'Pending', is_ctc: false, hasOriginalPOD: true, hasApprovedCTC: false, encodedBy: 'EMP-004', encodedAt: new Date().toISOString(), pod_image_url: 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?q=80&w=600&auto=format&fit=crop', senderName: 'Lazada Account', senderContact: '0917-123-4567', senderAddress: 'Rockwell Dr., Makati City', receiverName: 'Customer B', receiverContact: '0900-000-0002', receiverAddress: 'Cebu Business Park, Cebu City', itemDescription: 'General Merchandise', itemQuantity: 1, itemWeight: '1.0 kg', deliveryType: 'Delivery', assignedCourier: 'Rider B', specialInstructions: 'None' },
  { id: 'WB-E2E-003', waybillNumber: 'WB-E2E-003', clientCode: 'CA-002', deliveryDate: new Date().toISOString(), status: 'Validated', hasOriginalPOD: true, hasApprovedCTC: true, encodedBy: 'EMP-004', encodedAt: new Date().toISOString(), senderName: 'Shopee Express Account', senderContact: '0917-555-9876', senderAddress: 'Ayala Ave., Makati City', receiverName: 'Customer C', receiverContact: '0900-000-0003', receiverAddress: 'BGC, Taguig City', itemDescription: 'General Merchandise', itemQuantity: 1, itemWeight: '1.0 kg', deliveryType: 'Pick Up', assignedCourier: 'Rider C', specialInstructions: 'None' }
];



// ─── Invoices ─────────────────────────────────────────────────────

export interface Invoice {
  id: string;
  invoiceNumber: string;
  clientId: string;
  waybillIds: string[];
  amount: number;
  vatAmount: number;
  surchargeAmount: number;
  totalAmount: number;
  billingSchedule: 'Monthly' | 'Semi-monthly' | 'Weekly';
  billingPeriod: string;
  status: 'Draft' | 'Pending Approval' | 'Needs Revision' | 'Approved' | 'Sent' | 'Paid' | 'Overdue';
  paymentStatus?: 'Unpaid' | 'Due Soon' | 'Overdue' | 'Paid';
  createdBy: string;
  createdAt: string;
  dueDate: string;
  approvedBy?: string;
  approvedAt?: string;
  sentAt?: string;
  finalizedAt?: string;
  notes?: string;
  proofFileUrl?: string;
  clientReceiptDate?: string;
  appliedRates?: any[];
}

export const SEEDED_INVOICES: Invoice[] = [
  {
    id: 'INV-001',
    invoiceNumber: 'LZD-2026-0001',
    clientId: 'CL-001',
    waybillIds: ['WB-001', 'WB-002'],
    amount: 15400,
    vatAmount: 1848,
    surchargeAmount: 0,
    totalAmount: 17248,
    billingSchedule: 'Monthly',
    billingPeriod: 'Jan 2026',
    status: 'Paid',
    createdBy: 'EMP-003',
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    dueDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'INV-002',
    invoiceNumber: 'LZD-2026-0002',
    clientId: 'CL-001',
    waybillIds: ['WB-003'],
    amount: 8000,
    vatAmount: 960,
    surchargeAmount: 0,
    totalAmount: 8960,
    billingSchedule: 'Monthly',
    billingPeriod: 'Feb 2026',
    status: 'Approved',
    createdBy: 'EMP-003',
    createdAt: new Date().toISOString(),
    dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'INV-003',
    invoiceNumber: 'SHP-2026-0001',
    clientId: 'CL-002',
    waybillIds: ['WB-004'],
    amount: 25000,
    vatAmount: 3000,
    surchargeAmount: 500,
    totalAmount: 28500,
    billingSchedule: 'Semi-monthly',
    billingPeriod: 'Jan 1-15 2026',
    status: 'Overdue',
    createdBy: 'EMP-003',
    createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
    dueDate: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'INV-004',
    invoiceNumber: 'LZD-2026-0004',
    clientId: 'CL-001',
    waybillIds: ['WB-001'],
    amount: 12000,
    vatAmount: 1440,
    surchargeAmount: 0,
    totalAmount: 13440,
    billingSchedule: 'Monthly',
    billingPeriod: 'Mar 2026',
    status: 'Sent',
    createdBy: 'EMP-003',
    createdAt: new Date().toISOString(),
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'INV-CA001-1',
    invoiceNumber: 'LZD-CA001-0001',
    clientId: 'CA-001',
    waybillIds: ['WB-E2E-001', 'WB-E2E-002'],
    amount: 11200,
    vatAmount: 1344,
    surchargeAmount: 0,
    totalAmount: 12544,
    billingSchedule: 'Monthly',
    billingPeriod: 'Aug 2026',
    status: 'Sent',
    createdBy: 'EMP-003',
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    dueDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'INV-CA001-2',
    invoiceNumber: 'LZD-CA001-0002',
    clientId: 'CA-001',
    waybillIds: [], 
    amount: 5000,
    vatAmount: 600,
    surchargeAmount: 0,
    totalAmount: 5600,
    billingSchedule: 'Monthly',
    billingPeriod: 'Sep 2026',
    status: 'Paid',
    createdBy: 'EMP-003',
    createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
    dueDate: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'INV-CA001-3',
    invoiceNumber: 'LZD-CA001-0003',
    clientId: 'CA-001',
    waybillIds: [], 
    amount: 7500,
    vatAmount: 900,
    surchargeAmount: 0,
    totalAmount: 8400,
    billingSchedule: 'Monthly',
    billingPeriod: 'Oct 2026',
    status: 'Overdue',
    createdBy: 'EMP-003',
    createdAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
    dueDate: new Date(Date.now() - 75 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'INV-CA002-1',
    invoiceNumber: 'SHP-CA002-0001',
    clientId: 'CA-002',
    waybillIds: ['WB-E2E-003'],
    amount: 15000,
    vatAmount: 1800,
    surchargeAmount: 0,
    totalAmount: 16800,
    billingSchedule: 'Monthly',
    billingPeriod: 'Aug 2026',
    status: 'Approved',
    createdBy: 'EMP-003',
    createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
  }
];


// ─── Payments ────────────────────────────────────────────────────

export interface Payment {
  id: string;
  invoiceId: string;
  invoiceNumber?: string;
  clientId: string;
  clientName?: string;
  amount: number;
  paymentMethod: 'Check' | 'Cash' | 'Bank Transfer' | 'Online Bank Transfer' | 'GCash' | 'Maya';
  referenceNumber: string;
  bankConfirmed: boolean;
  proofOfPaymentUrl?: string;
  recordedBy: string;
  recordedAt: string;
  validatedBy?: string;
  validatedAt?: string;
  status: 'Pending Validation' | 'Validated' | 'Approved' | 'Rejected';
  notes?: string;
  orNumber?: string;
  depositSlipDetails?: string;
  bankTransferDetails?: string;
  onlinePaymentDetails?: string;
}

export const SEEDED_PAYMENTS: Payment[] = [
  {
    id: 'PAY-001',
    invoiceId: 'INV-001',
    invoiceNumber: 'LZD-2026-0001',
    clientId: 'CL-001',
    clientName: 'Lazada Philippines',
    amount: 15400,
    paymentMethod: 'Bank Transfer',
    referenceNumber: 'REF-889922',
    bankConfirmed: false,
    recordedBy: 'EMP-003',
    recordedAt: new Date().toISOString(),
    status: 'Pending Validation'
  },
  {
    id: 'PAY-002',
    invoiceId: 'INV-002',
    invoiceNumber: 'SHP-2026-0002',
    clientId: 'CL-002',
    clientName: 'Shopee Express',
    amount: 8500,
    paymentMethod: 'Check',
    referenceNumber: 'CHK-999888',
    bankConfirmed: true,
    recordedBy: 'EMP-003',
    recordedAt: new Date().toISOString(),
    validatedBy: 'EMP-002',
    validatedAt: new Date().toISOString(),
    status: 'Validated'
  }
];

// ─── Accounts Receivable ──────────────────────────────────────────

export interface ARRecord {
  id: string;
  invoiceId: string;
  clientId: string;
  invoiceDate: string;
  dueDate: string;
  originalAmount: number;
  paidAmount: number;
  outstandingBalance: number;
  agingBracket: 'Current' | '0-30 days' | '31-60 days' | '61-90 days' | '90+ days';
  agingDays: number;
  status: 'Current' | 'Due Soon' | 'Overdue';
}

// Helper to compute aging bracket
function computeAging(dueDateStr: string): { bracket: ARRecord['agingBracket']; days: number; status: ARRecord['status'] } {
  const now = new Date();
  const due = new Date(dueDateStr);
  const diffDays = Math.floor((now.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
  const daysUntilDue = Math.floor((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  let bracket: ARRecord['agingBracket'] = 'Current';
  let status: ARRecord['status'] = 'Current';

  if (diffDays > 0) {
    status = 'Overdue';
    if (diffDays <= 30) bracket = '0-30 days';
    else if (diffDays <= 60) bracket = '31-60 days';
    else if (diffDays <= 90) bracket = '61-90 days';
    else bracket = '90+ days';
  } else if (daysUntilDue <= 15) {
    status = 'Due Soon';
    bracket = '0-30 days';
  }

  return { bracket, days: Math.abs(diffDays), status };
}

export const SEEDED_AR_RECORDS: ARRecord[] = SEEDED_INVOICES
  .filter(inv => ['Finalized', 'Overdue', 'Verified'].includes(inv.status))
  .map((inv, i) => {
    const { bracket, days, status } = computeAging(inv.dueDate);
    const paid = SEEDED_PAYMENTS.filter(p => p.invoiceId === inv.id && p.status === 'Validated').reduce((s, p) => s + p.amount, 0);
    return {
      id: `AR-${String(i + 1).padStart(3, '0')}`,
      invoiceId: inv.id,
      clientId: inv.clientId,
      invoiceDate: inv.createdAt,
      dueDate: inv.dueDate,
      originalAmount: inv.totalAmount,
      paidAmount: paid,
      outstandingBalance: inv.totalAmount - paid,
      agingBracket: bracket,
      agingDays: days,
      status,
    };
  });

// ─── Official Receipts ────────────────────────────────────────────

export interface Receipt {
  id: string;
  receiptNumber: string;
  invoiceId: string;
  paymentId: string;
  clientId: string;
  amount: number;
  referenceNumber: string;
  issuedBy: string;
  issuedAt: string;
}

export const SEEDED_RECEIPTS: Receipt[] = [
  {
    id: 'OR-001',
    receiptNumber: 'OR-2026-0001',
    invoiceId: 'INV-002',
    paymentId: 'PAY-002',
    clientId: 'CL-002',
    amount: 8500,
    referenceNumber: 'CHK-999888',
    issuedBy: 'EMP-003',
    issuedAt: new Date().toISOString()
  }
];

// ─── SpeedPay Submissions ─────────────────────────────────────────

export interface SpeedPaySubmission {
  id: string;
  invoiceId: string;
  invoiceNumber?: string;
  clientId?: string;
  clientName: string;
  clientEmail: string;
  paymentMethod: 'GCash' | 'Maya' | 'BDO Online' | 'BPI Online';
  referenceNumber: string;
  amountPaid: number;
  proofFileName: string;
  proofFileUrl?: string;
  submittedAt: string;
  status: 'Pending Validation' | 'Validated' | 'Rejected';
  validatedBy?: string;
  validatedAt?: string;
  rejectionReason?: string;
}

export const SEEDED_SPEEDPAY: SpeedPaySubmission[] = [
  {
    id: 'SP-001',
    invoiceId: 'INV-003',
    invoiceNumber: 'TK-2026-0003',
    clientName: 'TikTok Shop',
    clientEmail: 'billing@tiktok.ph',
    paymentMethod: 'GCash',
    referenceNumber: 'GC-999000111',
    amountPaid: 4500,
    proofFileName: 'gcash_receipt.jpg',
    submittedAt: new Date().toISOString(),
    status: 'Pending Validation'
  },
  {
    id: 'SP-002',
    invoiceId: 'INV-004',
    invoiceNumber: 'LZD-2026-0004',
    clientName: 'Lazada Philippines',
    clientEmail: 'finance@lazada.com.ph',
    paymentMethod: 'BDO Online',
    referenceNumber: 'BDO-555666777',
    amountPaid: 12000,
    proofFileName: 'bdo_transfer.png',
    submittedAt: new Date().toISOString(),
    status: 'Validated',
    validatedBy: 'EMP-002',
    validatedAt: new Date().toISOString()
  }
];

// ─── Audit Trail ─────────────────────────────────────────────────

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userFullName: string;
  userRole: UserRole;
  action: string;
  module: string;
  recordId: string;
  recordType: string;
  details: string;
  ipAddress: string;
}

export const SEEDED_AUDIT_LOGS: AuditLog[] = [
  {
    id: 'AL-1001',
    timestamp: '2026-09-26T08:30:00Z',
    userId: 'EMP-004',
    userFullName: 'Hannah Estrera',
    userRole: 'Coordinator',
    action: 'CREATE_WAYBILL',
    module: 'Operations',
    recordId: 'WB-12345',
    recordType: 'Waybill',
    ipAddress: '192.168.1.15',
    details: 'Created a new waybill for Lazada Account with 30kg shipment.'
  },
  {
    id: 'AL-1002',
    timestamp: '2026-09-26T09:15:22Z',
    userId: 'EMP-003',
    userFullName: 'Maria Mariel Jane Anonuevo',
    userRole: 'Accountant',
    action: 'GENERATE_INVOICE',
    module: 'Billing',
    recordId: 'INV-2026-001',
    recordType: 'Invoice',
    ipAddress: '192.168.1.42',
    details: 'Generated invoice INV-2026-001 for Shopee Express.'
  },
  {
    id: 'AL-1003',
    timestamp: '2026-09-26T10:05:10Z',
    userId: 'EMP-002',
    userFullName: 'Misty',
    userRole: 'Head Accountant',
    action: 'APPROVE_PAYMENT',
    module: 'Finance',
    recordId: 'PAY-88221',
    recordType: 'Payment',
    ipAddress: '192.168.1.55',
    details: 'Approved payment receipt PAY-88221 via Bank Transfer.'
  },
  {
    id: 'AL-1004',
    timestamp: '2026-09-26T11:45:00Z',
    userId: 'EMP-005',
    userFullName: 'Joana Marie Ogaya',
    userRole: 'Assistant of Finance Manager',
    action: 'UPDATE_CLIENT',
    module: 'ClientManagement',
    recordId: 'CL-002',
    recordType: 'Client',
    ipAddress: '192.168.1.60',
    details: 'Updated billing schedule for Shopee Express to Semi-monthly.'
  },
  {
    id: 'AL-1005',
    timestamp: '2026-09-26T13:20:30Z',
    userId: 'EMP-001',
    userFullName: 'Crystalyn Joyce C. Fajardo',
    userRole: 'Finance Manager',
    action: 'GENERATE_REPORT',
    module: 'Reports',
    recordId: 'REP-SEP2026',
    recordType: 'Report',
    ipAddress: '192.168.1.100',
    details: 'Generated and exported Monthly Revenue Report for September 2026.'
  }
];

// ─── Role-Based Navigation Configuration ──────────────────────────

export interface NavLinkConfig {
  label: string;
  path: string;
  icon: string;
  badge?: { text: string; bg: string; color: string };
  children?: { label: string; path: string }[];
}

export const NAV_CONFIG: Record<UserRole, { groups: { label?: string; items: NavLinkConfig[] }[] }> = {
  'Coordinator': {
    groups: [
      {
        label: 'Overview',
        items: [
          { label: 'Dashboard', path: '/dashboard', icon: 'ti ti-layout-dashboard' },
        ],
      },
      {
        label: 'Operations',
        items: [
          { label: 'Client Search', path: '/clients', icon: 'ti ti-search' },
          { label: 'Waybill / POD Records', path: '/waybills', icon: 'ti ti-file-import' },
        ],
      },
      {
        label: 'Duplicate Detection',
        items: [
          { label: 'Unique Documents', path: '/unique-documents', icon: 'ti ti-file-check' },
          { label: 'Flagged Duplicates', path: '/flagged-duplicates', icon: 'ti ti-alert-triangle' },
          { label: 'Review History', path: '/review-history', icon: 'ti ti-history' },
        ],
      },
      {
        label: 'Collection Intelligence',
        items: [
          { label: 'Collection Priorities', path: '/collection-priorities', icon: 'ti ti-target' },
        ]
      },
    ],
  },
  'Accountant': {
    groups: [
      {
        label: 'Overview',
        items: [
          { label: 'Dashboard', path: '/dashboard', icon: 'ti ti-layout-dashboard' },
        ],
      },
      {
        label: 'Client Management',
        items: [
          { label: 'Client Accounts', path: '/clients', icon: 'ti ti-users' },
        ],
      },
      {
        label: 'Invoicing',
        items: [
          { label: 'Create Invoice', path: '/invoice-create', icon: 'ti ti-file-plus' },
          { label: 'Invoice List', path: '/invoicing-desk', icon: 'ti ti-file-invoice' },
        ],
      },
      {
        label: 'Receivables & Payments',
        items: [
          { label: 'Accounts Receivable', path: '/accounts-receivable', icon: 'ti ti-report-money' },
          { label: 'Payments', path: '/payments', icon: 'ti ti-cash' },
          { label: 'Financial Adjustments', path: '/adjustments', icon: 'ti ti-adjustments-alt' },
          { label: 'SpeedPay Validation', path: '/speedpay-validation', icon: 'ti ti-device-mobile-message' },
          { label: 'Official Receipts', path: '/receipts', icon: 'ti ti-receipt' },
        ],
      },
      {
        label: 'Treasury & Cash Flow',
        items: [
          { label: 'Cash Flow', path: '/cash-flow', icon: 'ti ti-chart-arrows' },
        ],
      },
      {
        label: 'Duplicate Detection',
        items: [
          { label: 'Unique Documents', path: '/unique-documents', icon: 'ti ti-file-check' },
          { label: 'Flagged Duplicates', path: '/flagged-duplicates', icon: 'ti ti-alert-triangle' },
          { label: 'Review History', path: '/review-history', icon: 'ti ti-history' },
        ],
      },
      {
        label: 'Collection Intelligence',
        items: [
          { label: 'Collection Priorities', path: '/collection-priorities', icon: 'ti ti-target' },
        ]
      },
      {
        label: 'Analytics',
        items: [
          { label: 'Reports', path: '/reports', icon: 'ti ti-chart-bar' },
        ],
      },
    ],
  },
  'Head Accountant': {
    groups: [
      {
        label: 'Overview',
        items: [
          { label: 'Dashboard', path: '/dashboard', icon: 'ti ti-layout-dashboard' },
        ],
      },
      {
        label: 'Auditing & Verification',
        items: [
          { label: 'Invoice Review', path: '/invoice-review', icon: 'ti ti-file-check' },
          { label: 'Accounts Receivable', path: '/accounts-receivable', icon: 'ti ti-report-money' },
          { label: 'Payment Validation', path: '/payments', icon: 'ti ti-cash' },
          { label: 'Financial Adjustments', path: '/adjustments', icon: 'ti ti-adjustments-alt' },
          { label: 'SpeedPay Validation', path: '/speedpay-validation', icon: 'ti ti-device-mobile-message' },
        ],
      },
      {
        label: 'Duplicate Detection',
        items: [
          { label: 'Unique Documents', path: '/unique-documents', icon: 'ti ti-file-check' },
          { label: 'Flagged Duplicates', path: '/flagged-duplicates', icon: 'ti ti-alert-triangle' },
          { label: 'Review History', path: '/review-history', icon: 'ti ti-history' },
        ],
      },
      {
        label: 'Collection Intelligence',
        items: [
          { label: 'For Review', path: '/for-review', icon: 'ti ti-clipboard-list' },
        ]
      },
      {
        label: 'Analytics & Control',
        items: [
          { label: 'Reports', path: '/reports', icon: 'ti ti-chart-bar' },
          { label: 'Audit Logs', path: '/audit-logs', icon: 'ti ti-list-details' },
        ],
      },
    ],
  },
  'Assistant of Finance Manager': {
    groups: [
      {
        label: 'Overview',
        items: [
          { label: 'Dashboard', path: '/dashboard', icon: 'ti ti-layout-dashboard' },
        ],
      },
      {
        label: 'Liquidation & Validation',
        items: [
          { label: 'Liquidation Reports', path: '/liquidations', icon: 'ti ti-cash' },
          { label: 'SpeedPay Validation', path: '/speedpay-validation', icon: 'ti ti-device-mobile-message' },
        ],
      },
      {
        label: 'Duplicate Detection',
        items: [
          { label: 'Unique Documents', path: '/unique-documents', icon: 'ti ti-file-check' },
          { label: 'Flagged Duplicates', path: '/flagged-duplicates', icon: 'ti ti-alert-triangle' },
          { label: 'Review History', path: '/review-history', icon: 'ti ti-history' },
        ],
      },
      {
        label: 'Collection Intelligence',
        items: [
          { label: 'Collection Priorities', path: '/collection-priorities', icon: 'ti ti-target' },
        ]
      },
      {
        label: 'Analytics & Control',
        items: [
          { label: 'Audit Logs', path: '/audit-logs', icon: 'ti ti-list-details' },
        ],
      },
    ],
  },
  'Assistant of Financial Manager': {
    groups: [
      {
        label: 'Overview',
        items: [
          { label: 'Dashboard', path: '/dashboard', icon: 'ti ti-layout-dashboard' },
        ],
      },
      {
        label: 'Liquidation & Validation',
        items: [
          { label: 'Liquidation Reports', path: '/liquidations', icon: 'ti ti-cash' },
          { label: 'SpeedPay Validation', path: '/speedpay-validation', icon: 'ti ti-device-mobile-message' },
        ],
      },
    ],
  },
  'Finance Manager': {
    groups: [
      {
        label: 'Executive',
        items: [
          { label: 'Executive Dashboard', path: '/dashboard', icon: 'ti ti-layout-dashboard' },
        ],
      },
      {
        label: 'Review & Receivables',
        items: [
          { label: 'Invoice Review', path: '/invoice-review', icon: 'ti ti-file-check' },
          { label: 'Accounts Receivable', path: '/accounts-receivable', icon: 'ti ti-report-money' },
          { label: 'Payments & Cash Flow', path: '/payments', icon: 'ti ti-cash' },
          { label: 'Settlement Validation', path: '/settlements', icon: 'ti ti-calculator' },
          { label: 'Financial Adjustments', path: '/adjustments', icon: 'ti ti-adjustments-alt' },
          { label: 'SpeedPay Validation', path: '/speedpay-validation', icon: 'ti ti-device-mobile-message' },
        ],
      },

      {
        label: 'Duplicate Detection',
        items: [
          { label: 'Unique Documents', path: '/unique-documents', icon: 'ti ti-file-check' },
          { label: 'Flagged Duplicates', path: '/flagged-duplicates', icon: 'ti ti-alert-triangle' },
          { label: 'Review History', path: '/review-history', icon: 'ti ti-history' },
        ],
      },
      {
        label: 'Collection Intelligence',
        items: [
          { label: 'For Review', path: '/for-review', icon: 'ti ti-clipboard-list' },
        ]
      },
      {
        label: 'Analytics & Control',
        items: [
          { label: 'Reports', path: '/reports', icon: 'ti ti-chart-bar' },
          { label: 'Audit Logs', path: '/audit-logs', icon: 'ti ti-list-details' },
        ],
      },
    ],
  },
  'Financial Manager': {
    groups: [
      {
        label: 'Executive',
        items: [
          { label: 'Executive Dashboard', path: '/dashboard', icon: 'ti ti-layout-dashboard' },
        ],
      },
      {
        label: 'Review & Receivables',
        items: [
          { label: 'Invoice Review', path: '/invoice-review', icon: 'ti ti-file-check' },
          { label: 'Accounts Receivable', path: '/accounts-receivable', icon: 'ti ti-report-money' },
          { label: 'Payments & Cash Flow', path: '/payments', icon: 'ti ti-cash' },
          { label: 'Settlement Validation', path: '/settlements', icon: 'ti ti-calculator' },
          { label: 'Financial Adjustments', path: '/adjustments', icon: 'ti ti-adjustments-alt' },
          { label: 'SpeedPay Validation', path: '/speedpay-validation', icon: 'ti ti-device-mobile-message' },
        ],
      },

      {
        label: 'Analytics & Control',
        items: [
          { label: 'Reports', path: '/reports', icon: 'ti ti-chart-bar' },
          { label: 'Audit Logs', path: '/audit-logs', icon: 'ti ti-list-details' },
        ],
      },
    ],
  },
};

// ─── Extended Invoice Data for Modals ─────────────────────────────

export interface ExtendedInvoice {
  id: string;
  invoiceNumber: string;
  clientId: string;
  clientName: string;
  clientBillingAddress: string;
  clientContactDetails: string;
  billingSchedule: 'Weekly' | 'Semi-monthly' | 'Monthly';
  invoiceDate: string;
  dueDate: string;
  waybills: {
    waybillNumber: string;
    documentType: 'Original' | 'Certified True Copy';
    deliveryDate: string;
    deliveryArea: string;
    baseFreightRate: number;
  }[];
  financials: {
    totalBaseFreight: number;
    vatAmount: number;
    surcharges: number;
    invoiceGrossTotal: number;
    creditMemos: number;
    netOutstandingBalance: number;
    invoiceStatus: 'Unpaid' | 'Overdue' | 'Paid';
  };
}

export const SEEDED_EXTENDED_INVOICES: ExtendedInvoice[] = [];

// ─── Follow Up Logs ───────────────────────────────────────────────

export interface FollowUpRecord {
  id: string;
  invoiceId: string;
  referenceFields: {
    clientName: string;
    invoiceRefNumber: string;
    agingCategory: '0-30 days' | '31-60 days' | '61-90 days' | '90+ days';
    totalOutstandingAmount: number;
  };
  formInputs: {
    followUpTimestamp: string;
    communicationChannel: 'Phone Call' | 'Email' | 'SMS';
    clientContactPerson: string;
    clientPaymentStatus: 'Billing Approved/Processing Check' | 'Billing Under Review' | 'Check Ready for Pick-up' | 'Discrepancy Flagged by Client';
    expectedCollectionDate: string;
    actionRemarks: string;
    authorizedUserLogged: string;
  };
}

export const FOLLOW_UP_CHANNELS = ['Phone Call', 'Email', 'SMS'] as const;
export const FOLLOW_UP_STATUSES = ['Billing Approved/Processing Check', 'Billing Under Review', 'Check Ready for Pick-up', 'Discrepancy Flagged by Client'] as const;

export const SEEDED_FOLLOW_UP_RECORDS: FollowUpRecord[] = [];

// ─── Liquidations ──────────────────────────────────────────────────

export interface SpeedPayValidation {
  id: string;
  invoiceId: string;
  clientId: string;
  amountPaid: number;
  paymentMethod: string;
  referenceNumber: string;
  receiptUrl: string;
  status: 'Pending Validation' | 'Validated' | 'Rejected';
  submittedAt: string;
  remarks?: string;
  screenshotUrl?: string;
}

// ─── Financial Adjustment ──────────────────────────────────────────

export interface FinancialAdjustment {
  id: string;
  type: 'Adjustment' | 'Credit Memo';
  amount: number;
  reason: string;
  referenceNo: string;
  status: 'Draft' | 'Pending Approval' | 'Approved' | 'Rejected' | 'Recorded';
  affectedRecordId: string;
  clientId: string;
  createdAt: string;
  createdBy: string;
  remarks?: string;
}

export const SEEDED_ADJUSTMENTS: FinancialAdjustment[] = [
  {
    id: 'ADJ-2026-001',
    type: 'Adjustment',
    amount: 1000.00,
    reason: 'System pricing error on initial billing',
    referenceNo: 'REF-ERR-001',
    status: 'Approved',
    affectedRecordId: 'INV-001',
    clientId: 'CA-001',
    createdAt: '2026-05-18T10:00:00Z',
    createdBy: 'EMP-003'
  },
  {
    id: 'CM-2026-001',
    type: 'Credit Memo',
    amount: 500.00,
    reason: 'Promotional discount applied late',
    referenceNo: 'PROMO-500',
    status: 'Pending Approval',
    affectedRecordId: 'INV-002',
    clientId: 'CL-002',
    createdAt: '2026-05-19T14:30:00Z',
    createdBy: 'EMP-003'
  }
];

// ─── Liquidations ──────────────────────────────────────────────────

export interface LiquidationExpense {
  type: 'Fuel' | 'Toll Fee' | 'Parking Fee' | 'Vehicle Maintenance' | 'Trip Expense' | 'Other';
  description: string;
  amount: number;
}

export interface Liquidation {
  id: string;
  reference: string;
  amount: number;
  submittedBy: string;
  submittedAt: string;
  status: 'Pending Validation' | 'Validated' | 'Returned';
  documents: { name: string; url: string; size: string }[];
  remarks?: string;
  expenses: LiquidationExpense[];
}

export const SEEDED_LIQUIDATIONS: Liquidation[] = [
  {
    id: 'LIQ-2026-001',
    reference: 'TRIP-MNL-CEB-001',
    amount: 15450.00,
    submittedBy: 'Operations Dept (Driver Juan)',
    submittedAt: '2026-09-21T08:30:00Z',
    status: 'Pending Validation',
    expenses: [
      { type: 'Fuel', description: 'Diesel refill at Shell SLEX', amount: 8500.00 },
      { type: 'Toll Fee', description: 'SLEX and STAR Tollway fees', amount: 1450.00 },
      { type: 'Trip Expense', description: 'Driver and helper meal allowance', amount: 5500.00 }
    ],
    documents: [
      { name: 'shell_receipt_slex.jpg', url: 'https://via.placeholder.com/150', size: '250 KB' },
      { name: 'toll_receipts_compiled.pdf', url: 'https://via.placeholder.com/150', size: '1.2 MB' },
      { name: 'trip_allowance_sheet.pdf', url: 'https://via.placeholder.com/150', size: '500 KB' }
    ]
  },
  {
    id: 'LIQ-2026-002',
    reference: 'VEH-MAINT-VAN01',
    amount: 8200.00,
    submittedBy: 'Logistics Fleet Team',
    submittedAt: '2026-09-22T09:15:00Z',
    status: 'Validated',
    expenses: [
      { type: 'Vehicle Maintenance', description: 'Change oil and brake pad replacement', amount: 8200.00 }
    ],
    documents: [
      { name: 'mechanic_invoice.pdf', url: 'https://via.placeholder.com/150', size: '3.1 MB' }
    ],
    remarks: 'Validated against submitted invoice from auto repair shop.'
  },
  {
    id: 'LIQ-2026-003',
    reference: 'TRIP-NTH-045',
    amount: 2400.00,
    submittedBy: 'Operations Dept (Driver Marco)',
    submittedAt: new Date().toISOString(),
    status: 'Pending Validation',
    expenses: [
      { type: 'Fuel', description: 'Gasoline refill Petron NLEX', amount: 1500.00 },
      { type: 'Toll Fee', description: 'NLEX toll fees', amount: 800.00 },
      { type: 'Parking Fee', description: 'Client warehouse parking fee', amount: 100.00 }
    ],
    documents: [
      { name: 'petron_receipt.jpg', url: 'https://via.placeholder.com/150', size: '400 KB' },
      { name: 'nlex_toll.jpg', url: 'https://via.placeholder.com/150', size: '300 KB' }
    ]
  }
];

// ─── Cash Flow Records ───────────────────────────────────────────

export interface CashFlowRecord {
  id: string;
  type: 'Inflow' | 'Outflow';
  amount: number;
  sourceReference: string;
  date: string;
  recordedBy: string;
}

export const SEEDED_CASH_FLOW_RECORDS: CashFlowRecord[] = [
  { id: 'CF-001', type: 'Inflow', amount: 120000, sourceReference: 'Lazada Philippines', date: '2026-01-15T10:00:00Z', recordedBy: 'System' },
  { id: 'CF-002', type: 'Outflow', amount: 80000, sourceReference: 'Shell SLEX (Fuel)', date: '2026-01-20T10:00:00Z', recordedBy: 'System' },
  { id: 'CF-003', type: 'Inflow', amount: 150000, sourceReference: 'Shopee Express', date: '2026-02-15T10:00:00Z', recordedBy: 'System' },
  { id: 'CF-004', type: 'Outflow', amount: 110000, sourceReference: 'Meralco (Utilities)', date: '2026-02-20T10:00:00Z', recordedBy: 'System' },
  { id: 'CF-005', type: 'Inflow', amount: 180000, sourceReference: 'TikTok Shop', date: '2026-03-15T10:00:00Z', recordedBy: 'System' },
  { id: 'CF-006', type: 'Outflow', amount: 130000, sourceReference: 'PLDT (Internet)', date: '2026-03-20T10:00:00Z', recordedBy: 'System' },
  { id: 'CF-007', type: 'Inflow', amount: 140000, sourceReference: 'Lazada Philippines', date: '2026-04-15T10:00:00Z', recordedBy: 'System' },
  { id: 'CF-008', type: 'Outflow', amount: 120000, sourceReference: 'Auto Repair Shop (Vehicle Maintenance)', date: '2026-04-20T10:00:00Z', recordedBy: 'System' },
  { id: 'CF-009', type: 'Inflow', amount: 190000, sourceReference: 'Shopee Express', date: '2026-05-15T10:00:00Z', recordedBy: 'System' },
  { id: 'CF-010', type: 'Outflow', amount: 150000, sourceReference: 'Office Supplies Inc.', date: '2026-05-20T10:00:00Z', recordedBy: 'System' },
  { id: 'CF-011', type: 'Inflow', amount: 210000, sourceReference: 'TikTok Shop', date: '2026-06-15T10:00:00Z', recordedBy: 'System' },
  { id: 'CF-012', type: 'Outflow', amount: 170000, sourceReference: 'SLEX Tollway Corp', date: '2026-06-20T10:00:00Z', recordedBy: 'System' },
  { id: 'CF-013', type: 'Inflow', amount: 220000, sourceReference: 'Lazada Philippines', date: '2026-07-15T10:00:00Z', recordedBy: 'System' },
  { id: 'CF-014', type: 'Outflow', amount: 180000, sourceReference: 'Petron NLEX (Fuel)', date: '2026-07-20T10:00:00Z', recordedBy: 'System' },
  { id: 'CF-015', type: 'Inflow', amount: 200000, sourceReference: 'Shopee Express', date: '2026-08-15T10:00:00Z', recordedBy: 'System' },
  { id: 'CF-016', type: 'Outflow', amount: 160000, sourceReference: 'Meralco (Utilities)', date: '2026-08-20T10:00:00Z', recordedBy: 'System' },
  // September Weekly breakdown
  { id: 'CF-017', type: 'Inflow', amount: 45000, sourceReference: 'TikTok Shop', date: '2026-09-04T10:00:00Z', recordedBy: 'System' },
  { id: 'CF-018', type: 'Outflow', amount: 30000, sourceReference: 'Shell SLEX (Fuel)', date: '2026-09-05T10:00:00Z', recordedBy: 'System' },
  { id: 'CF-019', type: 'Inflow', amount: 55000, sourceReference: 'Lazada Philippines', date: '2026-09-11T10:00:00Z', recordedBy: 'System' },
  { id: 'CF-020', type: 'Outflow', amount: 40000, sourceReference: 'Auto Repair Shop (Vehicle Maintenance)', date: '2026-09-12T10:00:00Z', recordedBy: 'System' },
  { id: 'CF-021', type: 'Inflow', amount: 65000, sourceReference: 'Shopee Express', date: '2026-09-18T10:00:00Z', recordedBy: 'System' },
  { id: 'CF-022', type: 'Outflow', amount: 50000, sourceReference: 'Petron NLEX (Fuel)', date: '2026-09-19T10:00:00Z', recordedBy: 'System' },
  { id: 'CF-023', type: 'Inflow', amount: 55000, sourceReference: 'TikTok Shop', date: '2026-09-25T10:00:00Z', recordedBy: 'System' },
  { id: 'CF-024', type: 'Outflow', amount: 60000, sourceReference: 'PLDT (Internet)', date: '2026-09-26T10:00:00Z', recordedBy: 'System' },
];
