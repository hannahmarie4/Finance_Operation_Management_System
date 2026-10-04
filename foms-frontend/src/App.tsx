import React, { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ToastProvider } from "./components/ToastContext";
import ToastBar from "./components/ToastBar";
import { AuthProvider } from "./context/AuthContext";
import { NotificationProvider } from "./context/NotificationContext";
import { AuditProvider } from "./context/AuditContext";
import { AppDataProvider } from "./context/AppDataContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import MainLayout from "./components/MainLayout";

// ── Universal Pages ──────────────────────────────────────────────
import { LoginPage } from "./pages/LoginPage";
import Dashboard from "./pages/Dashboard";
import ProfilePage from "./pages/ProfilePage";
import NotificationsPage from "./pages/NotificationsPage";

// ── Coordinator Pages ────────────────────────────────────────────
import ClientManagement from "./pages/ClientManagement";
import Waybills from "./pages/Waybills";

// ── Accountant Pages ─────────────────────────────────────────────
import RateConfiguration from "./pages/RateConfiguration";
import InvoicingDesk from "./pages/InvoicingDesk";
import InvoiceCreation from "./pages/InvoiceCreation";
import BillingValidation from "./pages/BillingValidation";

// ── Head Accountant Pages ────────────────────────────────────────
import InvoiceReview from "./pages/InvoiceReview";
import Settlements from "./pages/Settlements";

// ── Asst. Finance Manager Pages ──────────────────────────────────
import FinanceMaster from "./pages/FinanceMaster";

// ── Finance Manager / Shared Pages ──────────────────────────────
import WaybillLogs from "./pages/WaybillLogs";
import InvoiceArchives from "./pages/InvoiceArchives";
import AccountsReceivable from "./pages/AccountsReceivable";
import Payments from "./pages/Payments";
import Receipts from "./pages/Receipts";
import Reports from "./pages/Reports";
import { AuditLogs } from "./pages/AuditLogs";
import LiquidationValidation from "./pages/LiquidationValidation";
import CashFlowManagement from "./pages/CashFlowManagement";
import FinancialAdjustments from "./pages/FinancialAdjustments";

// ── SpeedPay (Public + Finance Validation) ───────────────────────
import SpeedPay from "./pages/SpeedPay";
import SpeedPayValidation from "./pages/SpeedPayValidation";

// ── Finance Manager: Duplicate Detection ────────────────────────
import AIDuplicateScan from "./pages/AIDuplicateScan";
import UniqueDocuments from "./pages/UniqueDocuments";
import FlaggedDuplicates from "./pages/FlaggedDuplicates";
import ReviewHistory from "./pages/ReviewHistory";
import ForReview from "./pages/ForReview";
import CollectionPriorities from "./pages/CollectionPriorities";

function App() {
  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      const btn = (e.target as HTMLElement).closest('button');
      if (btn && (btn.innerText.trim().toLowerCase() === 'cancel' || btn.title.toLowerCase() === 'cancel' || btn.innerText.trim().toLowerCase() === 'close' || btn.title.toLowerCase() === 'close')) {
        btn.style.outline = '2px solid #22C55E';
        btn.style.outlineOffset = '2px';
        btn.dataset.greenOutline = 'true';
      }
    };
    const handleMouseUp = (e: MouseEvent) => {
      const btn = (e.target as HTMLElement).closest('button');
      if (btn && btn.dataset.greenOutline) {
        setTimeout(() => {
          btn.style.outline = '';
          btn.style.outlineOffset = '';
          delete btn.dataset.greenOutline;
        }, 150);
      }
    };
    const handleMouseOut = (e: MouseEvent) => {
      const btn = (e.target as HTMLElement).closest('button');
      if (btn && btn.dataset.greenOutline) {
        btn.style.outline = '';
        btn.style.outlineOffset = '';
        delete btn.dataset.greenOutline;
      }
    };
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('mouseout', handleMouseOut);
    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('mouseout', handleMouseOut);
    };
  }, []);

  return (
    <BrowserRouter>
      <AppDataProvider>
        <AuthProvider>
          <NotificationProvider>
          <AuditProvider>
            <ToastProvider>
              <ToastBar />
              <Routes>
              {/* ── Public Routes ───────────────────────────────── */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/speedpay" element={<SpeedPay />} />

            {/* ── Protected Routes (Main Layout) ──────────────── */}
            <Route
              element={
                <ProtectedRoute>
                  <MainLayout />
                </ProtectedRoute>
              }
            >
              {/* Universal */}
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/notifications" element={<NotificationsPage />} />

              {/* ── Coordinator & Accountant ────────────────────── */}
              <Route
                path="/clients"
                element={
                  <ProtectedRoute allowedRoles={['Coordinator', 'Accountant']}>
                    <ClientManagement />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/clients/:id"
                element={
                  <ProtectedRoute allowedRoles={['Coordinator', 'Accountant']}>
                    <ClientManagement />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/waybills"
                element={
                  <ProtectedRoute allowedRoles={['Coordinator', 'Accountant']}>
                    <Waybills />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/waybills/:id"
                element={
                  <ProtectedRoute allowedRoles={['Coordinator', 'Accountant']}>
                    <Waybills />
                  </ProtectedRoute>
                }
              />

              {/* ── Accountant & Validation ───────────────────── */}
              <Route
                path="/billing-validation"
                element={
                  <ProtectedRoute allowedRoles={['Accountant', 'Head Accountant', 'Finance Manager']}>
                    <BillingValidation />
                  </ProtectedRoute>
                }
              />
              {/* ── Accountant Only ───────────────────────────── */}
              <Route
                path="/rate-configuration"
                element={
                  <ProtectedRoute allowedRoles={['Accountant']}>
                    <RateConfiguration />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/rate-configuration/:id"
                element={
                  <ProtectedRoute allowedRoles={['Accountant']}>
                    <RateConfiguration />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/invoicing-desk"
                element={
                  <ProtectedRoute allowedRoles={['Accountant', 'Head Accountant', 'Finance Manager', 'Financial Manager']}>
                    <InvoicingDesk />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/invoicing-desk/:id"
                element={
                  <ProtectedRoute allowedRoles={['Accountant', 'Head Accountant', 'Finance Manager', 'Financial Manager']}>
                    <InvoicingDesk />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/invoice-create"
                element={
                  <ProtectedRoute allowedRoles={['Accountant']}>
                    <InvoiceCreation />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/receipts"
                element={
                  <ProtectedRoute allowedRoles={['Accountant']}>
                    <Receipts />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/receipts/:id"
                element={
                  <ProtectedRoute allowedRoles={['Accountant']}>
                    <Receipts />
                  </ProtectedRoute>
                }
              />

              {/* ── Head Accountant & Financial Manager ───────── */}
              <Route
                path="/invoice-review"
                element={
                  <ProtectedRoute allowedRoles={['Head Accountant', 'Finance Manager', 'Financial Manager']}>
                    <InvoiceReview />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/invoice-review/:id"
                element={
                  <ProtectedRoute allowedRoles={['Head Accountant', 'Finance Manager', 'Financial Manager']}>
                    <InvoiceReview />
                  </ProtectedRoute>
                }
              />

              {/* ── Shared Finance Roles ──────────────────────── */}
              <Route
                path="/accounts-receivable"
                element={
                  <ProtectedRoute allowedRoles={['Accountant', 'Head Accountant', 'Finance Manager', 'Financial Manager']}>
                    <AccountsReceivable />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/adjustments"
                element={
                  <ProtectedRoute allowedRoles={['Accountant', 'Head Accountant', 'Finance Manager', 'Financial Manager']}>
                    <FinancialAdjustments />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/accounts-receivable/:id"
                element={
                  <ProtectedRoute allowedRoles={['Accountant', 'Head Accountant', 'Finance Manager', 'Financial Manager']}>
                    <AccountsReceivable />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/payments"
                element={
                  <ProtectedRoute allowedRoles={['Accountant', 'Head Accountant', 'Finance Manager', 'Financial Manager']}>
                    <Payments />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/payments/:id"
                element={
                  <ProtectedRoute allowedRoles={['Accountant', 'Head Accountant', 'Finance Manager', 'Financial Manager']}>
                    <Payments />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/settlements"
                element={
                  <ProtectedRoute allowedRoles={['Finance Manager', 'Financial Manager', 'Assistant of Finance Manager', 'Assistant of Financial Manager']}>
                    <Settlements />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/liquidations"
                element={
                  <ProtectedRoute allowedRoles={['Assistant of Finance Manager', 'Assistant of Financial Manager']}>
                    <LiquidationValidation />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/liquidations/:id"
                element={
                  <ProtectedRoute allowedRoles={['Assistant of Finance Manager', 'Assistant of Financial Manager']}>
                    <LiquidationValidation />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/cash-flow"
                element={
                  <ProtectedRoute allowedRoles={['Accountant', 'Finance Manager', 'Financial Manager']}>
                    <CashFlowManagement />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/reports"
                element={
                  <ProtectedRoute allowedRoles={['Accountant', 'Head Accountant', 'Finance Manager', 'Financial Manager']}>
                    <Reports />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/reports/:id"
                element={
                  <ProtectedRoute allowedRoles={['Accountant', 'Head Accountant', 'Finance Manager', 'Financial Manager']}>
                    <Reports />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/audit-logs"
                element={
                  <ProtectedRoute allowedRoles={['Assistant of Finance Manager', 'Assistant of Financial Manager', 'Head Accountant', 'Finance Manager', 'Financial Manager']}>
                    <AuditLogs />
                  </ProtectedRoute>
                }
              />

              {/* Fallbacks */}
              <Route path="/speedpay-validation" element={
                <ProtectedRoute allowedRoles={['Assistant of Finance Manager', 'Assistant of Financial Manager', 'Accountant', 'Head Accountant', 'Finance Manager', 'Financial Manager']}>
                  <SpeedPayValidation />
                </ProtectedRoute>
              } />
              <Route path="/speedpay-validation/:id" element={
                <ProtectedRoute allowedRoles={['Assistant of Finance Manager', 'Assistant of Financial Manager', 'Accountant', 'Head Accountant', 'Finance Manager', 'Financial Manager']}>
                  <SpeedPayValidation />
                </ProtectedRoute>
              } />

              {/* ── Finance Manager, Head Accountant, Coordinator, Accountant, Asst FM: Duplicate Detection ── */}
              <Route
                path="/duplicate-scan"
                element={
                  <ProtectedRoute allowedRoles={['Finance Manager', 'Financial Manager', 'Head Accountant', 'Coordinator', 'Accountant', 'Assistant of Finance Manager', 'Assistant of Financial Manager']}>
                    <AIDuplicateScan />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/unique-documents"
                element={
                  <ProtectedRoute allowedRoles={['Finance Manager', 'Financial Manager', 'Head Accountant', 'Coordinator', 'Accountant', 'Assistant of Finance Manager', 'Assistant of Financial Manager']}>
                    <UniqueDocuments />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/flagged-duplicates"
                element={
                  <ProtectedRoute allowedRoles={['Finance Manager', 'Financial Manager', 'Head Accountant', 'Coordinator', 'Accountant', 'Assistant of Finance Manager', 'Assistant of Financial Manager']}>
                    <FlaggedDuplicates />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/review-history"
                element={
                  <ProtectedRoute allowedRoles={['Finance Manager', 'Financial Manager', 'Head Accountant', 'Coordinator', 'Accountant', 'Assistant of Finance Manager', 'Assistant of Financial Manager']}>
                    <ReviewHistory />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/for-review"
                element={
                  <ProtectedRoute allowedRoles={['Finance Manager', 'Financial Manager', 'Head Accountant']}>
                    <ForReview />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/collection-priorities"
                element={
                  <ProtectedRoute allowedRoles={['Finance Manager', 'Financial Manager', 'Head Accountant', 'Coordinator', 'Accountant', 'Assistant of Finance Manager', 'Assistant of Financial Manager']}>
                    <CollectionPriorities />
                  </ProtectedRoute>
                }
              />
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ToastProvider>
          </AuditProvider>
          </NotificationProvider>
        </AuthProvider>
  </AppDataProvider>
  </BrowserRouter>
  );
}

export default App;
