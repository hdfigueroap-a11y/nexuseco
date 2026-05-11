// frontend/src/App.jsx
// Enrutador principal — Sprint 1 y Sprint 2

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/shared/ProtectedRoute';
import Layout from './components/shared/Layout';

import LoginPage         from './pages/LoginPage';
import RegisterPage      from './pages/RegisterPage';
import DashboardPage     from './pages/DashboardPage';
import ProjectsPage      from './pages/ProjectsPage';
import ProjectDetailPage from './pages/ProjectDetailPage';
import AlertsPage        from './pages/AlertsPage';
import AuditLogsPage     from './pages/AuditLogsPage';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Rutas públicas */}
          <Route path="/login"    element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Rutas protegidas — todos los roles */}
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <Layout><DashboardPage /></Layout>
            </ProtectedRoute>
          }/>

          <Route path="/projects" element={
            <ProtectedRoute>
              <Layout><ProjectsPage /></Layout>
            </ProtectedRoute>
          }/>

          <Route path="/projects/:id" element={
            <ProtectedRoute>
              <Layout><ProjectDetailPage /></Layout>
            </ProtectedRoute>
          }/>

          <Route path="/alerts" element={
            <ProtectedRoute>
              <Layout><AlertsPage /></Layout>
            </ProtectedRoute>
          }/>

          {/* Ruta exclusiva Auditor — RNF05 */}
          <Route path="/audit/logs" element={
            <ProtectedRoute roles={['auditor']}>
              <Layout><AuditLogsPage /></Layout>
            </ProtectedRoute>
          }/>

          {/* Redirecciones */}
          <Route path="/"   element={<Navigate to="/dashboard" replace />} />
          <Route path="*"   element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
