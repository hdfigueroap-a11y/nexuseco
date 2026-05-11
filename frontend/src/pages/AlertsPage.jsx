// frontend/src/pages/AlertsPage.jsx
// RF07 — Vista global de alertas del usuario

import Navbar from '../components/shared/Navbar';
import AlertsPanel from '../components/alerts/AlertsPanel';

export default function AlertsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Mis Alertas</h1>
      <AlertsPanel projectId={null} />
    </div>
  );
}
