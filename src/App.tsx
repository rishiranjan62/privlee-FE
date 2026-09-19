import { Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { PanicProvider, usePanic } from "./context/PanicContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";
import DisguiseScreen from "./components/DisguiseScreen";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import DiscoverPage from "./pages/DiscoverPage";
import MatchesPage from "./pages/MatchesPage";
import ChatPage from "./pages/ChatPage";
import ProfilePage from "./pages/ProfilePage";

function AppRoutes() {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/discover" replace /> : <LoginPage />}
      />
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
        path="/chat/:matchId"
        element={
          <ProtectedRoute>
            <Layout>
              <ChatPage />
            </Layout>
          </ProtectedRoute>
        }
      />
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
      <Route path="*" element={<Navigate to={isAuthenticated ? "/discover" : "/login"} replace />} />
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
      <PanicProvider>
        <Gate />
      </PanicProvider>
    </AuthProvider>
  );
}
