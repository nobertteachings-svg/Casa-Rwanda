import { Navigate, Route, Routes } from "react-router-dom";
import { getSessionToken } from "./api/client";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Listings from "./pages/Listings";
import Login from "./pages/Login";
import Moderation from "./pages/Moderation";
import Users from "./pages/Users";
import Verifications from "./pages/Verifications";
import Payments from "./pages/Payments";
import SettingsPage from "./pages/Settings";
import Insights from "./pages/Insights";
import AuditLog from "./pages/AuditLog";

function Protected({ children }: { children: React.ReactNode }) {
  if (!getSessionToken()) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <Protected>
            <Layout />
          </Protected>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="users" element={<Users />} />
        <Route path="listings" element={<Listings />} />
        <Route path="moderation" element={<Moderation />} />
        <Route path="verifications" element={<Verifications />} />
        <Route path="payments" element={<Payments />} />
        <Route path="insights" element={<Insights />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="audit" element={<AuditLog />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
