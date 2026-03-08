import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import ErrorBoundary from "@/components/ErrorBoundary";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import AdminDashboard from "./pages/admin/AdminDashboard";
import IssuersPage from "./pages/admin/IssuersPage";
import BadgesPage from "./pages/admin/BadgesPage";
import AssertionsPage from "./pages/admin/AssertionsPage";
import LearnersPage from "./pages/admin/LearnersPage";
import AnalyticsPage from "./pages/admin/AnalyticsPage";
import AuditLogPage from "./pages/admin/AuditLogPage";
import ApiKeysPage from "./pages/admin/ApiKeysPage";
import WebhooksPage from "./pages/admin/WebhooksPage";
import Settings from "./pages/Settings";
import Verify from "./pages/Verify";
import PublicProfile from "./pages/PublicProfile";
import ClaimBadge from "./pages/ClaimBadge";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/verify/:assertionId" element={<Verify />} />
              <Route path="/profile/:userId" element={<PublicProfile />} />
              <Route path="/claim/:token" element={<ClaimBadge />} />
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
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </HelmetProvider>
);

export default App;
