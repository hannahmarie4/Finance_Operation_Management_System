import { SEEDED_CLIENTS, SEEDED_INVOICES, SEEDED_WAYBILLS, SEEDED_PAYMENTS } from './data/seed';

const originalFetch = window.fetch;

window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = typeof input === 'string' ? input : input.toString();

  // Helper to simulate network delay
  const delay = (ms = 300) => new Promise((resolve) => setTimeout(resolve, ms));

  if (url.startsWith('/api/')) {
    await delay();

    const okResponse = (body: any) =>
      new Response(JSON.stringify(body), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });

    // /api/ai-data/...
    if (url.includes('/api/ai-data/clients')) return okResponse({ items: SEEDED_CLIENTS });
    if (url.includes('/api/ai-data/invoices')) return okResponse({ items: SEEDED_INVOICES });
    if (url.includes('/api/ai-data/waybills')) return okResponse({ items: SEEDED_WAYBILLS });
    if (url.includes('/api/ai-data/payments')) return okResponse({ items: SEEDED_PAYMENTS });

    // /api/ai/dashboard/...
    if (url.includes('/api/ai/dashboard/summary')) {
      return okResponse({
        totalDuplicateAlerts: 12,
        pendingDuplicateReviews: 5,
        exactMatchAlerts: 3,
        urgentCollectionAccounts: 8,
        recommendationsAwaitingValidation: 4,
        lastUpdatedAt: new Date().toISOString()
      });
    }
    if (url.includes('/api/ai/dashboard/attention-accounts')) {
      return okResponse({
        items: [
          {
            priorityId: 'P-1001',
            clientName: SEEDED_CLIENTS[0]?.name || 'Client A',
            invoiceNumber: 'INV-1001',
            outstandingBalance: 50000,
            dueDate: new Date(Date.now() - 86400000 * 45).toISOString(),
            daysOverdue: 45,
            priorityLevel: 'High',
            recommendationBasis: ['Consistently late', 'High balance'],
            reviewStatus: 'Pending Review'
          }
        ]
      });
    }

    // Auth
    if (url.includes('/api/auth/login')) {
      let username = '';
      if (init && init.body && typeof init.body === 'string') {
        try {
          const body = JSON.parse(init.body);
          if (body.username) username = body.username.toUpperCase();
        } catch (e) {}
      }

      let role = '';
      let fullName = '';
      if (username === 'EMP-001') {
        role = 'Finance Manager';
        fullName = 'Juan Dela Cruz';
      } else if (username === 'EMP-002') {
        role = 'Head Accountant';
        fullName = 'Maria Clara Garcia';
      } else if (username === 'EMP-003') {
        role = 'Accountant';
        fullName = 'Pedro Penduko';
      } else if (username === 'EMP-004') {
        role = 'Assistant of Finance Manager';
        fullName = 'Ana Reyes';
      } else {
        return new Response(
          JSON.stringify({ success: false, message: 'Invalid Employee ID or password.' }),
          { status: 401, headers: { 'Content-Type': 'application/json' } }
        );
      }

      return okResponse({
        success: true,
        data: {
          accessToken: 'mock_token',
          refreshToken: 'mock_refresh_token',
          user: { id: username, fullName: fullName, role: role }
        }
      });
    }
    if (url.includes('/api/ai/me')) {
      let user = { name: 'Demo User', role: 'admin' };
      try {
        const stored = localStorage.getItem('foms_ai_user');
        if (stored) user = JSON.parse(stored);
      } catch (e) {}
      return okResponse({ user });
    }

    // AI endpoints mock
    if (url.includes('/api/ai/duplicates') || url.includes('/api/ai/collection')) {
      return okResponse({ items: [] });
    }
    
    // Notifications mock from previous system
    if (url.includes('/api/notifications/finance')) {
      return okResponse([]);
    }

    // General fallback for mocked API
    console.log(`[Mock Interceptor] Unhandled API call: ${url}`);
    return okResponse({ message: 'Mocked Response', items: [] });
  }

  return originalFetch(input, init);
};

console.log('[Mock Interceptor] Enabled: All /api calls will be intercepted with static data.');
