import { Navigate, Route, Routes, useParams } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { PanicProvider, usePanic } from "./context/PanicContext";
import { StreamProvider } from "./context/StreamContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";
import DisguiseScreen from "./components/DisguiseScreen";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import VerifyEmailPage from "./pages/VerifyEmailPage";
import DiscoverPage from "./pages/DiscoverPage";
import AdminGuard from "./admin/AdminGuard";
import AdminLayout from "./admin/AdminLayout";
import AdminHome from "./admin/AdminHome";
import AuditLogPage from "./admin/AuditLogPage";
import ReportsPage from "./admin/ReportsPage";
import UsersPage from "./admin/UsersPage";
import UserDetailPage from "./admin/UserDetailPage";
import RecentPhotosPage from "./admin/RecentPhotosPage";
import ReportDetailPage from "./admin/ReportDetailPage";
import LikesPage from "./pages/LikesPage";
import BlockedPage from "./pages/BlockedPage";
import MatchesPage from "./pages/MatchesPage";
import MessagesPage from "./pages/MessagesPage";
import ProfilePage from "./pages/ProfilePage";
import ProfileViewPage from "./pages/ProfileViewPage";

/** Notifications created before the split view linked to /chat/:id. */
function ChatRedirect() {
  const { matchId } = useParams<{ matchId: string }>();
  return <Navigate to={`/messages/${matchId}`} replace />;
}

function AppRoutes() {
  const { isAuthenticated } = useAuth();

  return (
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
            <Layout>
              <MessagesPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/messages"
        element={
          <ProtectedRoute>
            <Layout>
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
