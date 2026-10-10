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

    // Handle speedpay portal mock endpoints
    if (url.includes('/api/auth/client-login')) {
      const client = SEEDED_CLIENTS[0];
      return okResponse({
        token: 'mock_speedpay_token',
        user: { id: client.id, name: client.name, businessName: client.businessName, email: client.email }
      });
    }

    if (url.includes('/api/speedpay/invoices')) {
      const clientIdMatch = url.match(/clientId=([^&]+)/);
      const clientId = clientIdMatch ? decodeURIComponent(clientIdMatch[1]) : null;
      let invoices = SEEDED_INVOICES;
      if (clientId) {
        invoices = invoices.filter(i => i.clientId === clientId);
      }
      return okResponse({ items: invoices });
    }

    if (url.includes('/api/speedpay/transactions')) {
      const clientIdMatch = url.match(/clientId=([^&]+)/);
      const clientId = clientIdMatch ? decodeURIComponent(clientIdMatch[1]) : null;
      let payments = SEEDED_PAYMENTS;
      if (clientId) {
        payments = payments.filter(p => p.clientId === clientId);
      }
      return okResponse({ items: payments });
    }

    if (url.includes('/api/speedpay/notifications')) {
      return okResponse({ items: [] });
    }
    
    if (url.includes('/api/speedpay/submissions')) {
      return okResponse({ message: 'Mock submitted successfully' });
    }

    if (url.includes('/api/speedpay/initiate-invoice') || url.includes('/api/paymongo-link')) {
      return okResponse({ checkoutUrl: 'https://paymongo.com/mock-checkout' });
    }

    // General fallback for mocked API
    console.log(`[Mock Interceptor] Unhandled API call: ${url}`);
    return okResponse({ message: 'Mocked Response', items: [] });
  }

  return originalFetch(input, init);
};

console.log('[Mock Interceptor] Enabled: All /api calls will be intercepted with static data.');
