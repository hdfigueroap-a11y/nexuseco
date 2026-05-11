// frontend/src/components/alerts/AlertsPanel.jsx
// RF07 — Sistema de Alertas

import { useEffect, useState } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const ALERT_ICONS = {
  ivi_critico:         '⚠️',
  cumplimiento_bajo:   '📉',
  baja_supervivencia:  '🌱',
  temperatura_critica: '🌡️',
  inactividad:         '💤',
};

const ALERT_LABELS = {
  ivi_critico:         'IVI Crítico',
  cumplimiento_bajo:   'Cumplimiento Bajo',
  baja_supervivencia:  'Baja Supervivencia',
  temperatura_critica: 'Temperatura Crítica',
  inactividad:         'Inactividad',
};

export default function AlertsPanel({ projectId }) {
  const { user } = useAuth();
  const [alerts, setAlerts]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchAlerts(); }, [projectId]);

  async function fetchAlerts() {
    try {
      const url = projectId ? `/projects/${projectId}/alerts` : '/alerts';
      const { data } = await api.get(url);
      setAlerts(data);
    } catch (_) {}
    setLoading(false);
  }

  async function markReviewed(alertId) {
    try {
      await api.patch(`/alerts/${alertId}/review`);
      fetchAlerts();
    } catch (_) {}
  }

  if (loading) return <div className="text-center py-6 text-gray-400">Cargando alertas...</div>;

  const activas  = alerts.filter((a) => a.status === 'activa');
  const revisadas = alerts.filter((a) => a.status === 'revisada');

  return (
    <div className="space-y-4">
      {activas.length === 0 && revisadas.length === 0 && (
        <div className="card text-center py-12 text-gray-400">
          <p className="text-4xl mb-2">✅</p>
          <p>Sin alertas registradas para este proyecto.</p>
        </div>
      )}

      {activas.length > 0 && (
        <div className="card">
          <h3 className="font-semibold text-red-700 mb-3">
            🔔 Alertas activas ({activas.length})
          </h3>
          <ul className="space-y-3">
            {activas.map((a) => (
              <li key={a.id} className="flex items-start justify-between gap-4 p-3 bg-red-50 border border-red-100 rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span>{ALERT_ICONS[a.type] || '🔔'}</span>
                    <span className="text-sm font-semibold text-red-800">
                      {ALERT_LABELS[a.type] || a.type}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600">{a.message}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(a.created_at).toLocaleString('es-CO')}
                    {a.project_name && ` · ${a.project_name}`}
                  </p>
                </div>
                {(user?.role === 'operador' || user?.role === 'auditor') && (
                  <button
                    onClick={() => markReviewed(a.id)}
                    className="shrink-0 text-xs bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    Marcar revisada
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {revisadas.length > 0 && (
        <div className="card">
          <h3 className="font-semibold text-gray-500 mb-3">
            Alertas revisadas ({revisadas.length})
          </h3>
          <ul className="space-y-2">
            {revisadas.map((a) => (
              <li key={a.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-400">{ALERT_ICONS[a.type] || '🔔'}</span>
                <div>
                  <p className="text-sm text-gray-600 font-medium">{ALERT_LABELS[a.type] || a.type}</p>
                  <p className="text-xs text-gray-400">{a.message}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Revisada: {a.reviewed_at ? new Date(a.reviewed_at).toLocaleString('es-CO') : '—'}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
