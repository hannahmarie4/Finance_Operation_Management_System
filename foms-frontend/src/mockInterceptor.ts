import { SEEDED_CLIENTS, SEEDED_INVOICES, SEEDED_WAYBILLS, SEEDED_PAYMENTS, SEEDED_USERS } from './data/seed';
import { shouldLoadDemoSeeds } from './config/runtimeMode';

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
    if (url.includes('/api/ai-data/clients')) return okResponse({ items: shouldLoadDemoSeeds ? SEEDED_CLIENTS : [] });
    if (url.includes('/api/ai-data/invoices')) return okResponse({ items: shouldLoadDemoSeeds ? SEEDED_INVOICES : [] });
    if (url.includes('/api/ai-data/waybills')) return okResponse({ items: shouldLoadDemoSeeds ? SEEDED_WAYBILLS : [] });
    if (url.includes('/api/ai-data/payments')) return okResponse({ items: shouldLoadDemoSeeds ? SEEDED_PAYMENTS : [] });

    // /api/ai/dashboard/...
    if (url.includes('/api/ai/dashboard/summary')) {
      return okResponse(shouldLoadDemoSeeds ? {
        totalDuplicateAlerts: 12,
        pendingDuplicateReviews: 5,
        exactMatchAlerts: 3,
        urgentCollectionAccounts: 8,
        recommendationsAwaitingValidation: 4,
        lastUpdatedAt: new Date().toISOString()
      } : {
        totalDuplicateAlerts: 0,
        pendingDuplicateReviews: 0,
        exactMatchAlerts: 0,
        urgentCollectionAccounts: 0,
        recommendationsAwaitingValidation: 0,
        lastUpdatedAt: new Date().toISOString()
      });
    }
    if (url.includes('/api/ai/dashboard/attention-accounts')) {
      return okResponse({
        items: shouldLoadDemoSeeds ? [
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
        ] : []
      });
    }

    // Auth
    if (url.includes('/api/auth/login')) {
      let username = '';
      if (init && init.body && typeof init.body === 'string') {
        try {
          const body = JSON.parse(init.body);
          if (body.username) username = body.username.trim().toUpperCase();
        } catch (e) {}
      }

      let customUsers: any[] = [];
      try {
        const saved = localStorage.getItem('foms_staff_users');
        if (saved) customUsers = JSON.parse(saved);
      } catch (e) {}

      const foundUser = SEEDED_USERS.find(u => u.employeeId.toUpperCase() === username) ||
        customUsers.find((u: any) => u.employeeId?.toUpperCase() === username);

      if (!foundUser) {
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
          user: { id: foundUser.employeeId, fullName: foundUser.fullName, role: foundUser.role }
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
      return okResponse([]);
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

console.info('[Demo mode] Fetch requests are served with simulated data. Changes are not saved to the real backend or database.');
