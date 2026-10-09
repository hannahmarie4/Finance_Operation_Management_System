import React, { createContext, useContext, useState, useMemo, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { useAppData } from './AppDataContext';
import { SEEDED_WAYBILLS, SEEDED_INVOICES, SEEDED_PAYMENTS, SEEDED_SPEEDPAY, SEEDED_AR_RECORDS } from '../data/seed';
import type { UserRole } from '../types/auth';

export interface NotificationItem {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  read: boolean;
  type: 'info' | 'alert' | 'success' | 'system';
  category: 'logistics' | 'finance' | 'driver' | 'system';
  isToday: boolean;
  link?: string;
  actionLabel?: string;
}

function relTs(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'Just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function isToday(iso: string): boolean {
  return new Date(iso).toDateString() === new Date().toDateString();
}

function generateNotifications(
  role: UserRole, 
  data: { waybills: any[], invoices: any[], payments: any[], speedPay: any[], arRecords: any[], liquidations: any[], financialAdjustments: any[] }
): NotificationItem[] {
  const now = new Date().toISOString();
  const notes: NotificationItem[] = [];
  const { waybills, invoices, payments, speedPay, arRecords, liquidations, financialAdjustments } = data;



  if (role === 'Accountant') {
    const validated = waybills.filter(w => w.status === 'Validated' || w.status === 'CTC Submitted');
    if (validated.length > 0) {
      notes.push({ id: 'acct-validated', title: 'Waybills Ready for Invoicing', description: `${validated.length} validated waybill(s) are available and ready for invoice creation.`, timestamp: relTs(now), read: false, type: 'success', category: 'finance', isToday: true, link: `/invoicing` });
    }
    const returned = invoices.filter(i => i.status === 'Draft' || i.status === 'Needs Revision');
    returned.forEach(inv => {
      notes.push({ id: `acct-ret-${inv.id}`, title: 'Invoice Needs Revision', description: `Invoice ${inv.invoiceNumber} was returned for revision.`, timestamp: relTs(inv.createdAt), read: false, type: 'alert', category: 'finance', isToday: isToday(inv.createdAt), link: `/invoicing` });
    });
    const rejectedPayments = payments.filter(p => p.status === 'Rejected');
    rejectedPayments.forEach(pay => {
      notes.push({ id: `acct-pay-rej-${pay.id}`, title: 'Payment Rejected', description: `Payment ${pay.id} was rejected by the Assistant Finance Manager.`, timestamp: relTs(pay.recordedAt), read: false, type: 'alert', category: 'finance', isToday: isToday(pay.recordedAt), link: `/payments` });
    });
    const approved = invoices.filter(i => i.status === 'Approved');
    approved.forEach(inv => {
      notes.push({ id: `acct-apr-${inv.id}`, title: 'Invoice Approved', description: `Invoice ${inv.invoiceNumber} has been approved.`, timestamp: relTs(inv.createdAt), read: true, type: 'success', category: 'finance', isToday: isToday(inv.createdAt), link: `/invoicing` });
    });
    const sevenDays = Date.now() + 7 * 86400000;
    const nearDue = invoices.filter(i => ['Sent'].includes(i.status) && new Date(i.dueDate).getTime() < sevenDays && new Date(i.dueDate).getTime() > Date.now());
    nearDue.forEach(inv => {
      notes.push({ id: `acct-due-${inv.id}`, title: 'Invoice Approaching Due Date', description: `Invoice ${inv.invoiceNumber} is due on ${new Date(inv.dueDate).toLocaleDateString('en-PH')}.`, timestamp: relTs(inv.createdAt), read: false, type: 'alert', category: 'finance', isToday: false, link: `/accounts-receivable` });
    });
    const pendingPayments = payments.filter(p => p.status === 'Pending Validation');
    pendingPayments.forEach(pay => {
      notes.push({ id: `acct-pay-pend-${pay.id}`, title: 'Payment Pending Validation', description: `Payment ${pay.id} requires validation.`, timestamp: relTs(pay.recordedAt), read: false, type: 'info', category: 'finance', isToday: isToday(pay.recordedAt), link: `/payments` });
    });
  }

  if (role === 'Head Accountant') {
    const pending = invoices.filter(i => i.status === 'Pending Approval');
    pending.forEach(inv => {
      notes.push({ id: `ha-pend-${inv.id}`, title: 'Invoice Submitted for Review', description: `Invoice ${inv.invoiceNumber} is pending your approval. Amount: ₱${inv.totalAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}.`, timestamp: relTs(inv.createdAt), read: false, type: 'info', category: 'finance', isToday: isToday(inv.createdAt), link: `/invoice-review` });
    });
    const overdue = arRecords.filter(r => r.status === 'Overdue');
    overdue.forEach(rec => {
      notes.push({ id: `ha-ar-${rec.id}`, title: 'Overdue Receivable', description: `Invoice ${rec.invoiceId} is overdue. Outstanding: ₱${rec.outstandingBalance.toFixed(2)}.`, timestamp: relTs(rec.dueDate), read: false, type: 'alert', category: 'finance', isToday: false, link: `/accounts-receivable` });
    });
    const pendingAdj = financialAdjustments.filter(a => a.status === 'Pending Approval');
    pendingAdj.forEach(adj => {
      notes.push({ id: `ha-adj-${adj.id}`, title: 'Adjustment Requires Review', description: `${adj.type} ${adj.id} for ₱${adj.amount} is awaiting your review.`, timestamp: relTs(adj.createdAt), read: false, type: 'info', category: 'finance', isToday: isToday(adj.createdAt), link: `/adjustments` });
    });
  }

  if (role === 'Assistant of Finance Manager') {
    const pendingPayments = payments.filter(p => p.status === 'Pending Validation');
    pendingPayments.forEach(pay => {
      notes.push({ id: `afm-pay-${pay.id}`, title: 'Payment Pending Validation', description: `Payment ${pay.id} of ₱${pay.amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })} via ${pay.paymentMethod} requires validation.`, timestamp: relTs(pay.recordedAt), read: false, type: 'info', category: 'finance', isToday: isToday(pay.recordedAt), link: `/payments` });
    });
    const pendingSP = speedPay.filter(s => s.status === 'Pending Validation');
    pendingSP.forEach(sp => {
      notes.push({ id: `afm-sp-${sp.id}`, title: 'SpeedPay Submission Pending', description: `SpeedPay submission ${sp.id} via ${sp.paymentMethod} for ₱${sp.amountPaid.toLocaleString('en-PH', { minimumFractionDigits: 2 })} awaits validation.`, timestamp: relTs(sp.submittedAt), read: false, type: 'alert', category: 'finance', isToday: isToday(sp.submittedAt), link: `/speedpay-validation` });
    });
    const pendingLiq = liquidations.filter(l => l.status === 'Pending Validation');
    pendingLiq.forEach(liq => {
      notes.push({ id: `afm-liq-${liq.id}`, title: 'Pending Liquidation Review', description: `Liquidation ${liq.reference} for ₱${liq.amount} is awaiting validation.`, timestamp: relTs(liq.submittedAt), read: false, type: 'info', category: 'finance', isToday: isToday(liq.submittedAt), link: `/liquidations` });
    });
  }

  if (role === 'Finance Manager') {
    const validatedPayments = payments.filter(p => p.status === 'Validated');
    validatedPayments.forEach(pay => {
      notes.push({ id: `fm-pay-${pay.id}`, title: 'Payment Validated by Asst. FM', description: `Payment ${pay.id} (₱${pay.amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}) has been validated and is awaiting final approval.`, timestamp: relTs(pay.validatedAt || pay.recordedAt), read: false, type: 'success', category: 'finance', isToday: isToday(pay.validatedAt || pay.recordedAt), link: `/payments` });
    });
    const overdue = arRecords.filter(r => r.status === 'Overdue' && ['31-60 days', '61-90 days', '90+ days'].includes(r.agingBracket));
    overdue.forEach(rec => {
      notes.push({ id: `fm-ar-${rec.id}`, title: 'Overdue Account Alert', description: `Invoice ${rec.invoiceId} has crossed into the ${rec.agingBracket} aging bracket. Outstanding: ₱${rec.outstandingBalance.toFixed(2)}.`, timestamp: relTs(rec.dueDate), read: false, type: 'alert', category: 'finance', isToday: false, link: `/accounts-receivable` });
    });
  }

  return notes;
}

interface NotificationContextValue {
  notifications: NotificationItem[];
  unreadCount: number;
  markAllAsRead: () => void;
  toggleReadStatus: (id: string) => void;
  clearAll: () => void;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  
  const [readIds, setReadIds] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem('foms_read_notifications');
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });

  const [clearedIds, setClearedIds] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem('foms_cleared_notifications');
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });

  useEffect(() => {
    localStorage.setItem('foms_read_notifications', JSON.stringify(Array.from(readIds)));
  }, [readIds]);

  useEffect(() => {
    localStorage.setItem('foms_cleared_notifications', JSON.stringify(Array.from(clearedIds)));
  }, [clearedIds]);

  const { waybills, invoices, payments, speedPay, arRecords, liquidations, financialAdjustments } = useAppData();

  // ── Fetch backend Notification records (payment validated/rejected events) ──
  const [backendNotifs, setBackendNotifs] = useState<NotificationItem[]>([]);

  const fetchBackendNotifs = useCallback(() => {
    fetch('/api/notifications/finance')
      .then(res => res.ok ? res.json() : [])
      .then((data: any[]) => {
        if (!Array.isArray(data)) return;
        const mapped: NotificationItem[] = data.map(n => ({
          id: n.id,
          title: n.title ?? 'Notification',
          description: n.description ?? '',
          timestamp: (() => {
            const diff = Date.now() - new Date(n.createdAt ?? n.timestamp ?? Date.now()).getTime();
            const m = Math.floor(diff / 60000);
            if (m < 1) return 'Just now';
            if (m < 60) return `${m}m ago`;
            const h = Math.floor(m / 60);
            if (h < 24) return `${h}h ago`;
            return `${Math.floor(h / 24)}d ago`;
          })(),
          read: n.read ?? false,
          type: (n.type === 'success' ? 'success' : n.type === 'alert' ? 'alert' : 'info') as NotificationItem['type'],
          category: 'finance' as NotificationItem['category'],
          isToday: new Date(n.createdAt ?? Date.now()).toDateString() === new Date().toDateString(),
          link: '/speedpay-validation'
        }));
        setBackendNotifs(mapped);
      })
      .catch(() => { /* silently ignore */ });
  }, []);

  useEffect(() => {
    if (!user) return;
    fetchBackendNotifs();
    const interval = setInterval(fetchBackendNotifs, 30000);
    return () => clearInterval(interval);
  }, [user, fetchBackendNotifs]);

  const allNotifications = useMemo(() => {
    if (!user) return [];
    const generated = generateNotifications(user.role, { waybills, invoices, payments, speedPay, arRecords, liquidations, financialAdjustments });
    // Merge backend notifications (deduplicate by id)
    const existingIds = new Set(generated.map(n => n.id));
    const merged = backendNotifs.filter(n => !existingIds.has(n.id));
    return [...generated, ...merged];
  }, [user, waybills, invoices, payments, speedPay, arRecords, liquidations, financialAdjustments, backendNotifs]);

  const notifications = useMemo(() => {
    return allNotifications
      .filter(n => !clearedIds.has(n.id))
      .map(n => ({ ...n, read: readIds.has(n.id) || n.read }));
  }, [allNotifications, readIds, clearedIds]);

  const unreadCount = useMemo(() => notifications.filter(n => !n.read).length, [notifications]);

  const markAllAsRead = () => {
    setReadIds(prev => {
      const next = new Set(prev);
      notifications.forEach(n => next.add(n.id));
      return next;
    });
  };

  const toggleReadStatus = (id: string) => {
    setReadIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const clearAll = () => {
    setClearedIds(prev => {
      const next = new Set(prev);
      notifications.forEach(n => next.add(n.id));
      return next;
    });
  };

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, markAllAsRead, toggleReadStatus, clearAll }}>
      {children}
    </NotificationContext.Provider>
  );
};

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
  return ctx;
}
