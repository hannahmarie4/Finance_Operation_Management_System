import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useAppData } from '../context/AppDataContext';

// Removing inner Card so it inherits from MainLayout Container

const BoardOverview: React.FC = () => {
  const { user } = useAuth();
  const { clients } = useAppData();
  const location = useLocation();
  const [currentTime, setCurrentTime] = useState<string>('');

  useEffect(() => {
    const date = new Date();
    setCurrentTime(
      date.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      })
    );
  }, []);

  if (!user) return null;

  const role = user.role;
  const path = location.pathname;

  let pageName = 'Dashboard';
  let title = 'Overview';

  // Mapping logic based on user request
  if (role === 'Accountant') {
    if (path.startsWith('/dashboard')) {
      pageName = 'Dashboard';
      title = 'Overview';
    } else if (path.startsWith('/rate-configuration')) {
      pageName = 'Client Rates Matrix';
      title = 'Client Billing Rates';
    } else if (path.startsWith('/invoicing-desk')) {
      pageName = 'Invoicing';
      title = 'Invoice Records';
    } else if (path.startsWith('/invoice-create')) {
      pageName = 'Create Invoice';
      title = 'New Invoice';
    } else if (path.startsWith('/clients')) {
      pageName = 'Client Accounts';
      title = 'Client Records';
    } else if (path.startsWith('/payments')) {
      pageName = 'Payments';
      title = 'Payment Records';
    } else if (path.startsWith('/receipts')) {
      pageName = 'Official Receipts';
      title = 'Receipts';
    }
  } else if (role === 'Head Accountant') {
    if (path.startsWith('/dashboard')) {
      pageName = 'Dashboard';
      title = 'Overview';
    } else if (path.startsWith('/invoice-review')) {
      pageName = 'Invoice Review';
      title = 'Invoice Verification Queue';
    } else if (path.startsWith('/accounts-receivable')) {
      pageName = 'Accounts Receivable';
      title = 'Receivables Summary';
    } else if (path.startsWith('/reports')) {
      pageName = 'Reports';
      title = 'Financial Reports';
    }
  } else if (role === 'Assistant of Finance Manager') {
    if (path.startsWith('/dashboard')) {
      pageName = 'Dashboard';
      title = 'Overview';
    } else if (path.startsWith('/payments')) {
      pageName = 'Payment Validation';
      title = 'Payment Validation Queue';
    } else if (path.startsWith('/finance-master') || path.startsWith('/speedpay-validation')) {
      pageName = 'SpeedPay Monitoring';
      title = 'SpeedPay Submissions';
    } else if (path.startsWith('/invoices')) {
      pageName = 'Invoices';
      title = 'Invoice Records';
    } else if (path.startsWith('/clients')) {
      pageName = 'Client Accounts';
      title = 'Client Records';
    } else if (path.startsWith('/accounts-receivable')) {
      pageName = 'Accounts Receivable';
      title = 'Receivables Summary';
    } else if (path.startsWith('/reports')) {
      pageName = 'Reports';
      title = 'Financial Reports';
    } else if (path.startsWith('/receipts')) {
      pageName = 'Official Receipts';
      title = 'Receipts';
    }
  } else if (role === 'Finance Manager') {
    if (path.startsWith('/dashboard')) {
      pageName = 'Dashboard';
      title = 'Executive Overview';
    } else if (path.startsWith('/accounts-receivable')) {
      pageName = 'Accounts Receivable';
      title = 'Receivables & Aging';
    } else if (path.startsWith('/payments')) {
      pageName = 'Payment Approval';
      title = 'Payment Approvals';
    } else if (path.startsWith('/reports')) {
      pageName = 'Reports';
      title = 'Financial Reports';
    } else if (path.startsWith('/audit-trail') || path.startsWith('/waybill-logs')) {
      pageName = 'Audit Trail';
      title = 'System Audit Log';
    } else if (path.startsWith('/clients')) {
      pageName = 'Client Accounts';
      title = 'Client Records';
    } else if (path.startsWith('/invoices')) {
      pageName = 'Invoices';
      title = 'Invoice Records';
    } else if (path.startsWith('/receipts')) {
      pageName = 'Official Receipts';
      title = 'Receipts';
    } else if (path.startsWith('/speedpay-validation')) {
      pageName = 'SpeedPay Validation';
      title = 'SpeedPay Validation Queue';
    }
  }

  // Handle profile specifically
  if (path.startsWith('/profile')) {
    pageName = 'Profile';
    title = 'User Profile';
  }

  // Check if we are in a detail view for client-based modules
  const pathParts = path.split('/').filter(Boolean);
  if (pathParts.length > 1) {
    const moduleId = pathParts[0];
    const entityId = pathParts[1];
    
    // Modules where the detail view is a Client Drill-Down
    if (['accounts-receivable', 'payments', 'receipts', 'waybills'].includes(moduleId)) {
      const client = clients.find(c => c.id === entityId);
      if (client) {
        title = client.name;
      }
    }
  }

  const roleLabel = role === 'Assistant of Finance Manager' ? 'Assistant Finance Manager' : role;
  const breadcrumb = `${roleLabel} · ${pageName}`;

  return (
    <div style={{ marginBottom: 24, paddingBottom: 24, borderBottom: '1px solid #E2E8F0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2 style={{
            margin: 0,
            fontSize: '1.5rem',
            fontWeight: 800,
            color: '#0F172A',
            fontFamily: "var(--fh, 'Montserrat', sans-serif)"
          }}>
            {title}
          </h2>
          <p style={{
            margin: '4px 0 0',
            fontSize: '0.875rem',
            color: '#64748B',
            fontWeight: 500
          }}>
            {breadcrumb}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            color: '#64748B',
            fontSize: '0.8125rem',
            fontWeight: 500
          }}>
            Last Sync: Just now
          </div>
          <div style={{
            background: '#F1F5F9',
            padding: '8px 16px',
            borderRadius: '8px',
            fontSize: '0.8125rem',
            fontWeight: 600,
            color: '#334155',
            border: '1px solid #E2E8F0'
          }}>
            {currentTime}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BoardOverview;
