import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import ErrorBoundary from "@/components/ErrorBoundary";

// Lazy-loaded route components for code splitting
const Index = lazy(() => import("./pages/Index"));
const Login = lazy(() => import("./pages/Login"));
const Signup = lazy(() => import("./pages/Signup"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const IssuersPage = lazy(() => import("./pages/admin/IssuersPage"));
const BadgesPage = lazy(() => import("./pages/admin/BadgesPage"));
const AssertionsPage = lazy(() => import("./pages/admin/AssertionsPage"));
const LearnersPage = lazy(() => import("./pages/admin/LearnersPage"));
const AnalyticsPage = lazy(() => import("./pages/admin/AnalyticsPage"));
const AuditLogPage = lazy(() => import("./pages/admin/AuditLogPage"));
const ApiKeysPage = lazy(() => import("./pages/admin/ApiKeysPage"));
const WebhooksPage = lazy(() => import("./pages/admin/WebhooksPage"));
const RolesPage = lazy(() => import("./pages/admin/RolesPage"));
const Settings = lazy(() => import("./pages/Settings"));
const Verify = lazy(() => import("./pages/Verify"));
const PublicProfile = lazy(() => import("./pages/PublicProfile"));
const ClaimBadge = lazy(() => import("./pages/ClaimBadge"));
const Documentation = lazy(() => import("./pages/Documentation"));
const MigrationGuide = lazy(() => import("./pages/MigrationGuide"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes — reduces redundant refetches
      refetchOnWindowFocus: false,
    },
  },
});

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  );
}

const App = () => (
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <ErrorBoundary>
            <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/verify/:assertionId" element={<Verify />} />
              <Route path="/profile/:userId" element={<PublicProfile />} />
              <Route path="/claim/:token" element={<ClaimBadge />} />
              <Route path="/docs" element={<Documentation />} />
              <Route path="/migration" element={<MigrationGuide />} />
              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/dashboard/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
              <Route path="/admin" element={<ProtectedRoute requireAdmin><AdminDashboard /></ProtectedRoute>} />
              <Route path="/admin/issuers" element={<ProtectedRoute requireAdmin><IssuersPage /></ProtectedRoute>} />
              <Route path="/admin/badges" element={<ProtectedRoute requireAdmin><BadgesPage /></ProtectedRoute>} />
              <Route path="/admin/assertions" element={<ProtectedRoute requireAdmin><AssertionsPage /></ProtectedRoute>} />
              <Route path="/admin/learners" element={<ProtectedRoute requireAdmin><LearnersPage /></ProtectedRoute>} />
              <Route path="/admin/analytics" element={<ProtectedRoute requireAdmin><AnalyticsPage /></ProtectedRoute>} />
              <Route path="/admin/audit-log" element={<ProtectedRoute requireAdmin><AuditLogPage /></ProtectedRoute>} />
              <Route path="/admin/api-keys" element={<ProtectedRoute requireAdmin><ApiKeysPage /></ProtectedRoute>} />
              <Route path="/admin/webhooks" element={<ProtectedRoute requireAdmin><WebhooksPage /></ProtectedRoute>} />
              <Route path="/admin/roles" element={<ProtectedRoute requireAdmin><RolesPage /></ProtectedRoute>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
            </Suspense>
            </ErrorBoundary>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </HelmetProvider>
);

export default App;
