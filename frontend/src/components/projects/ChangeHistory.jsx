// frontend/src/components/projects/ChangeHistory.jsx
// RF09 — Historial de Cambios Inmutable (solo Auditor)

import { useEffect, useState } from 'react';
import api from '../../services/api';

const ACTION_LABELS = {
  create: '➕ Creación',
  update: '✏️ Edición',
  delete: '🗑️ Eliminación',
  upsert: '🔄 Actualización',
};

export default function ChangeHistory({ projectId }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/projects/${projectId}/history`)
      .then(({ data }) => setHistory(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [projectId]);

  if (loading) return <div className="text-center py-6 text-gray-400">Cargando historial...</div>;

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-700">Historial de cambios</h3>
        <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">
          🔒 Inmutable — RF09
        </span>
      </div>

      {history.length === 0 ? (
        <p className="text-center text-gray-400 py-8">Sin cambios registrados.</p>
      ) : (
        <div className="space-y-3">
          {history.map((h) => (
            <div key={h.id} className="border border-gray-100 rounded-lg p-4 hover:bg-gray-50">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700">
                    {ACTION_LABELS[h.action] || h.action}
                  </span>
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                    {h.entity}
                  </span>
                </div>
                <span className="text-xs text-gray-400 shrink-0">
                  {new Date(h.created_at).toLocaleString('es-CO')}
                </span>
              </div>

              <p className="text-xs text-gray-500 mb-2">
                👤 {h.full_name || h.email || 'Sistema'}{' '}
                {h.role && <span className="text-gray-400">({h.role})</span>}
              </p>

              {(h.old_values || h.new_values) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                  {h.old_values && (
                    <div className="bg-red-50 rounded p-2">
                      <p className="text-xs font-medium text-red-700 mb-1">Antes</p>
                      <pre className="text-xs text-red-600 overflow-auto max-h-24 whitespace-pre-wrap">
                        {JSON.stringify(h.old_values, null, 2)}
                      </pre>
                    </div>
                  )}
                  {h.new_values && (
                    <div className="bg-eco-50 rounded p-2">
                      <p className="text-xs font-medium text-eco-700 mb-1">Después</p>
                      <pre className="text-xs text-eco-600 overflow-auto max-h-24 whitespace-pre-wrap">
                        {JSON.stringify(h.new_values, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
