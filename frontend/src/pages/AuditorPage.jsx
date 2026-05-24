// frontend/src/pages/AuditorPage.jsx
// RF10 + RF11 — Panel del Auditor: confiabilidad y sospechosos globales

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

export default function AuditorPage() {
  const [reliability, setReliability] = useState([]);
  const [suspicious,  setSuspicious]  = useState([]);
  const [loading, setLoading]         = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/fraud/reliability/all'),
      api.get('/fraud/suspicious'),
    ]).then(([relRes, suspRes]) => {
      setReliability(relRes.data);
      setSuspicious(suspRes.data);
    }).catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleValidate(indicatorId, action) {
    const observation = action === 'reject'
      ? prompt('Escribe la observación:')
      : 'Validado por auditor';
    if (action === 'reject' && !observation) return;
    try {
      await api.patch(`/fraud/indicators/${indicatorId}/validate`, { action, observation });
      setSuspicious((prev) => prev.filter((i) => i.id !== indicatorId));
    } catch (err) {
      alert(err.response?.data?.error || 'Error.');
    }
  }

  if (loading) return (
    <div className="flex justify-center py-16">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-eco-600" />
    </div>
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Panel del Auditor</h1>

      {/* Índice de confiabilidad global — RF11 */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-700">Índice de Confiabilidad por Proyecto</h2>
          <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded-full">🔒 Solo auditor</span>
        </div>
        {reliability.length === 0 ? (
          <p className="text-center text-gray-400 py-6">Sin proyectos registrados.</p>
        ) : (
          <div className="space-y-3">
            {reliability.map((r) => {
              const color = r.index >= 80 ? 'eco' : r.index >= 60 ? 'yellow' : 'red';
              const barColor = { eco: 'bg-eco-500', yellow: 'bg-yellow-400', red: 'bg-red-500' }[color];
              const textColor = { eco: 'text-eco-700', yellow: 'text-yellow-700', red: 'text-red-700' }[color];
              return (
                <div key={r.project_id} className="flex items-center gap-4">
                  <Link to={`/projects/${r.project_id}`}
                    className="w-48 text-sm font-medium text-eco-700 hover:underline truncate shrink-0">
                    {r.project_name}
                  </Link>
                  <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden">
                    <div className={`h-full ${barColor} rounded-full`} style={{ width: `${r.index}%` }} />
                  </div>
                  <span className={`text-sm font-bold w-12 text-right ${textColor}`}>{r.index}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium w-16 text-center ${
                    color === 'eco' ? 'bg-eco-100 text-eco-700' :
                    color === 'yellow' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-700'
                  }`}>{r.level}</span>
                  {r.alert && <span className="text-red-500 text-xs">⚠️ Revisar</span>}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Registros sospechosos globales — RF10 */}
      <div className="card">
        <h2 className="font-semibold text-gray-700 mb-4">
          Registros Sospechosos ({suspicious.length})
        </h2>
        {suspicious.length === 0 ? (
          <p className="text-center text-gray-400 py-8">✅ Sin registros sospechosos en ningún proyecto.</p>
        ) : (
          <div className="space-y-3">
            {suspicious.map((ind) => (
              <div key={ind.id} className="border border-yellow-200 bg-yellow-50 rounded-lg p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-yellow-800 mb-1">
                      ⚠️ {ind.project_name}
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-gray-600 mb-1">
                      <span>🌡️ {ind.temperature ?? '—'}°C</span>
                      <span>💧 {ind.humidity ?? '—'}%</span>
                      <span>🌱 {ind.trees_planted} sembrados</span>
                      <span>✅ {ind.trees_survived} sobreviv.</span>
                    </div>
                    <p className="text-xs text-gray-400">
                      {ind.recorded_by} · {new Date(ind.recorded_at).toLocaleString('es-CO')}
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 shrink-0">
                    <button onClick={() => handleValidate(ind.id, 'validate')}
                      className="text-xs bg-eco-600 hover:bg-eco-700 text-white px-3 py-1.5 rounded-lg">
                      ✅ Validar
                    </button>
                    <button onClick={() => handleValidate(ind.id, 'reject')}
                      className="text-xs bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg">
                      ❌ Rechazar
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
