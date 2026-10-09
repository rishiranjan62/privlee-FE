import { lazy, Suspense, useEffect } from "react";
import { Navigate, Route, Routes, useLocation, useParams } from "react-router-dom";
import { isAdminAccount } from "./lib/adminStatus";
import { trackView } from "./lib/track";
import { usageTracker } from "./lib/usage";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { PanicProvider, usePanic } from "./context/PanicContext";
import { StreamProvider } from "./context/StreamContext";
import ProtectedRoute from "./components/ProtectedRoute";
import DisguiseScreen from "./components/DisguiseScreen";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import VerifyEmailPage from "./pages/VerifyEmailPage";
import { FaqPage, GuidePage, GuidesIndexPage, PrivacyPage, TermsPage } from "./pages/ContentPages";

// Only the pages a first-time visitor sees are in the first download. Everything behind the sign-in -
// the member app and the admin console - loads when it is first needed, which keeps the landing
// page light (a faster page is also ranked higher).
const Layout = lazy(() => import("./components/Layout"));
const DiscoverPage = lazy(() => import("./pages/DiscoverPage"));
const LikesPage = lazy(() => import("./pages/LikesPage"));
const BlockedPage = lazy(() => import("./pages/BlockedPage"));
const MatchesPage = lazy(() => import("./pages/MatchesPage"));
const MessagesPage = lazy(() => import("./pages/MessagesPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const ProfileViewPage = lazy(() => import("./pages/ProfileViewPage"));
const AdminGuard = lazy(() => import("./admin/AdminGuard"));
const AdminLayout = lazy(() => import("./admin/AdminLayout"));
const AdminHome = lazy(() => import("./admin/AdminHome"));
const AuditLogPage = lazy(() => import("./admin/AuditLogPage"));
const AnalyticsPage = lazy(() => import("./admin/AnalyticsPage"));
const ReportsPage = lazy(() => import("./admin/ReportsPage"));
const UsersPage = lazy(() => import("./admin/UsersPage"));
const UserDetailPage = lazy(() => import("./admin/UserDetailPage"));
const RecentPhotosPage = lazy(() => import("./admin/RecentPhotosPage"));
const ReportDetailPage = lazy(() => import("./admin/ReportDetailPage"));

/** Notifications created before the split view linked to /chat/:id. */
function ChatRedirect() {
  const { matchId } = useParams<{ matchId: string }>();
  return <Navigate to={`/messages/${matchId}`} replace />;
}

/**
 * Anonymous page-view counting for every visitor, and time-in-app measuring for signed-in members.
 * Staff are never measured: neither the views nor the time of the people running the product
 * belong in the product's numbers.
 */
function Telemetry() {
  const { pathname } = useLocation();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isAuthenticated) {
      trackView(pathname);
      return;
    }
    // A signed-in staff member is redirected to the console; their browsing is not traffic.
    let cancelled = false;
    isAdminAccount().then((staff) => {
      if (!cancelled && !staff) trackView(pathname);
    });
    return () => {
      cancelled = true;
    };
  }, [pathname, isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    isAdminAccount().then((staff) => {
      if (!cancelled && !staff) usageTracker.start();
    });
    return () => {
      cancelled = true;
      usageTracker.stop();
    };
  }, [isAuthenticated]);

  return null;
}

function AppRoutes() {
  const { isAuthenticated } = useAuth();

  return (
    <>
      <Telemetry />
      <Suspense fallback={<div className="min-h-screen bg-canvas" />}>
        <Routes>
          <Route
            path="/"
            element={isAuthenticated ? <Navigate to="/discover" replace /> : <LandingPage />}
          />
          <Route
            path="/login"
            element={isAuthenticated ? <Navigate to="/discover" replace /> : <LoginPage />}
          />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/faq" element={<FaqPage />} />
          <Route path="/guides" element={<GuidesIndexPage />} />
          <Route path="/guides/:slug" element={<GuidePage />} />
          <Route
            path="/signup"
            element={isAuthenticated ? <Navigate to="/discover" replace /> : <SignupPage />}
          />
          <Route
            path="/discover"
            element={
              <ProtectedRoute>
                <Layout>
                  <DiscoverPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/u/:userId"
            element={
              <ProtectedRoute>
                <Layout>
                  <ProfileViewPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <AdminGuard>
                  {(me) => (
                    <AdminLayout me={me}>
                      <AdminHome />
                    </AdminLayout>
                  )}
                </AdminGuard>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/reports"
            element={
              <ProtectedRoute>
                <AdminGuard>
                  {(me) => (
                    <AdminLayout me={me}>
                      <ReportsPage />
                    </AdminLayout>
                  )}
                </AdminGuard>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/reports/:id"
            element={
              <ProtectedRoute>
                <AdminGuard>
                  {(me) => (
                    <AdminLayout me={me}>
                      <ReportDetailPage />
                    </AdminLayout>
                  )}
                </AdminGuard>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/users"
            element={
              <ProtectedRoute>
                <AdminGuard>
                  {(me) => (
                    <AdminLayout me={me}>
                      <UsersPage />
                    </AdminLayout>
                  )}
                </AdminGuard>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/users/:id"
            element={
              <ProtectedRoute>
                <AdminGuard>
                  {(me) => (
                    <AdminLayout me={me}>
                      <UserDetailPage />
                    </AdminLayout>
                  )}
                </AdminGuard>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/photos"
            element={
              <ProtectedRoute>
                <AdminGuard>
                  {(me) => (
                    <AdminLayout me={me}>
                      <RecentPhotosPage />
                    </AdminLayout>
                  )}
                </AdminGuard>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/analytics"
            element={
              <ProtectedRoute>
                <AdminGuard>
                  {(me) => (
                    <AdminLayout me={me}>
                      <AnalyticsPage />
                    </AdminLayout>
                  )}
                </AdminGuard>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/audit"
            element={
              <ProtectedRoute>
                <AdminGuard>
                  {(me) => (
                    <AdminLayout me={me}>
                      <AuditLogPage />
                    </AdminLayout>
                  )}
                </AdminGuard>
              </ProtectedRoute>
            }
          />
          <Route
            path="/likes"
            element={
              <ProtectedRoute>
                <Layout>
                  <LikesPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/matches"
            element={
              <ProtectedRoute>
                <Layout>
                  <MatchesPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/blocked"
            element={
              <ProtectedRoute>
                <Layout>
                  <BlockedPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/messages/:matchId"
            element={
              <ProtectedRoute>
                <Layout fill>
                  <MessagesPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/messages"
            element={
              <ProtectedRoute>
                <Layout fill>
                  <MessagesPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route path="/chat/:matchId" element={<ChatRedirect />} />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Layout>
                  <ProfilePage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to={isAuthenticated ? "/discover" : "/"} replace />} />
        </Routes>
      </Suspense>
    </>
  );
}

function Gate() {
  const { disguised } = usePanic();
  if (disguised) {
    return <DisguiseScreen />;
  }
  return <AppRoutes />;
}

export default function App() {
  return (
    <AuthProvider>
      <StreamProvider>
        <PanicProvider>
          <Gate />
        </PanicProvider>
      </StreamProvider>
    </AuthProvider>
  );
}
