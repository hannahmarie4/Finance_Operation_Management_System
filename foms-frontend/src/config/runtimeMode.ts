/**
 * Demo mode is intentionally opt-in. The application uses the real API unless
 * the host explicitly supplies VITE_ENABLE_MOCKS=true at build/dev-server time.
 */
export const isDemoMode = import.meta.env.VITE_ENABLE_MOCKS === 'true';

/**
 * Empty-state demo mode is the default whenever demo mode is active.
 * Populated seed fixtures are retained for testing and can be opted into via
 * VITE_DEMO_POPULATE_SEEDS=true or local storage override.
 */
export const shouldLoadDemoSeeds =
  isDemoMode &&
  (import.meta.env.VITE_DEMO_POPULATE_SEEDS === 'true' ||
    (typeof window !== 'undefined' && window.localStorage?.getItem('foms_demo_populate_seeds') === 'true'));
