// frontend/src/components/fraud/ReliabilityIndex.jsx
// RF11 — Índice de Confiabilidad (solo Auditor)

import { useEffect, useState } from 'react';
import api from '../../services/api';

export default function ReliabilityIndex({ projectId }) {
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/projects/${projectId}/reliability`)
      .then(({ data }) => setData(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [projectId]);

  if (loading) return <div className="text-center py-4 text-gray-400">Calculando índice...</div>;
  if (!data)   return null;

  const color = data.index >= 80 ? 'eco' : data.index >= 60 ? 'yellow' : 'red';
  const colors = {
    eco:    { bar: 'bg-eco-500',    text: 'text-eco-700',    bg: 'bg-eco-50 border-eco-200' },
    yellow: { bar: 'bg-yellow-400', text: 'text-yellow-700', bg: 'bg-yellow-50 border-yellow-200' },
    red:    { bar: 'bg-red-500',    text: 'text-red-700',    bg: 'bg-red-50 border-red-200' },
  };
  const c = colors[color];

  return (
    <div className={`card border ${c.bg}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-700">Índice de Confiabilidad</h3>
        <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded-full">
          🔒 Solo auditor — RF11
        </span>
      </div>

      <div className="flex items-center gap-4">
        <div className={`text-5xl font-bold ${c.text}`}>{data.index}</div>
        <div className="flex-1">
          <div className="h-3 bg-gray-200 rounded-full overflow-hidden mb-2">
            <div
              className={`h-full ${c.bar} rounded-full transition-all`}
              style={{ width: `${data.index}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-400">
            <span>0</span>
            <span className={`font-semibold ${c.text} uppercase`}>
              Nivel {data.level}
            </span>
            <span>100</span>
          </div>
        </div>
      </div>

      {data.alert && (
        <div className="mt-3 p-2 bg-red-100 rounded-lg text-xs text-red-700">
          ⚠️ Índice bajo — se recomienda revisión prioritaria de este proyecto.
        </div>
      )}
    </div>
  );
}
