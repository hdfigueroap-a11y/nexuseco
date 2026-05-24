// frontend/src/components/fraud/FraudPanel.jsx
// RF10 — Sistema Antifraude (solo Auditor)

import { useEffect, useState } from 'react';
import api from '../../services/api';

export default function FraudPanel({ projectId }) {
  const [suspicious, setSuspicious] = useState([]);
  const [analyzing, setAnalyzing]   = useState(false);
  const [loading, setLoading]       = useState(true);
  const [result, setResult]         = useState(null);

  useEffect(() => { fetchSuspicious(); }, [projectId]);

  async function fetchSuspicious() {
    try {
      const { data } = await api.get(`/projects/${projectId}/fraud/suspicious`);
      setSuspicious(data);
    } catch (_) {}
    setLoading(false);
  }

  async function handleAnalyze() {
    setAnalyzing(true);
    setResult(null);
    try {
      const { data } = await api.post(`/projects/${projectId}/fraud/analyze`);
      setResult(data);
      fetchSuspicious();
    } catch (err) {
      setResult({ error: err.response?.data?.error || 'Error al analizar.' });
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleValidate(indicatorId, action) {
    const observation = action === 'reject'
      ? prompt('Escribe la observación para el rechazo:')
      : 'Validado por auditor';
    if (action === 'reject' && !observation) return;
    try {
      await api.patch(`/fraud/indicators/${indicatorId}/validate`, { action, observation });
      fetchSuspicious();
    } catch (err) {
      alert(err.response?.data?.error || 'Error.');
    }
  }

  return (
    <div className="space-y-4">
      {/* Botón analizar */}
      <div className="card">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-700">Análisis Antifraude</h3>
            <p className="text-xs text-gray-400 mt-1">
              Detecta valores atípicos comparando con el historial del proyecto
            </p>
          </div>
          <button onClick={handleAnalyze} disabled={analyzing} className="btn-primary">
            {analyzing ? 'Analizando...' : '🔍 Analizar ahora'}
          </button>
        </div>

        {result && (
          <div className={`mt-4 p-3 rounded-lg text-sm ${
            result.error ? 'bg-red-50 text-red-700' :
            result.suspicious ? 'bg-yellow-50 border border-yellow-200 text-yellow-800' :
            'bg-eco-50 text-eco-700'
          }`}>
            {result.error ? result.error :
             result.suspicious ? (
               <div>
                 <p className="font-semibold mb-2">⚠️ Se detectaron anomalías:</p>
                 {result.anomalies.map((a, i) => (
                   <p key={i} className="text-xs">
                     • <strong>{a.field}</strong>: valor {a.value} (promedio {a.mean}, desviación {a.deviation}σ)
                   </p>
                 ))}
               </div>
             ) : '✅ No se detectaron valores atípicos en el último registro.'}
          </div>
        )}
      </div>

      {/* Lista de sospechosos */}
      <div className="card">
        <h3 className="font-semibold text-gray-700 mb-4">
          Registros sospechosos ({suspicious.length})
        </h3>
        {loading ? (
          <p className="text-center text-gray-400 py-6">Cargando...</p>
        ) : suspicious.length === 0 ? (
          <p className="text-center text-gray-400 py-8">✅ Sin registros sospechosos.</p>
        ) : (
          <div className="space-y-3">
            {suspicious.map((ind) => (
              <div key={ind.id} className="border border-yellow-200 bg-yellow-50 rounded-lg p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-yellow-800 mb-1">
                      ⚠️ Registro sospechoso
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-gray-600 mb-2">
                      <span>🌡️ Temp: {ind.temperature ?? '—'}°C</span>
                      <span>💧 Hum: {ind.humidity ?? '—'}%</span>
                      <span>🌱 Sembrados: {ind.trees_planted}</span>
                      <span>✅ Sobreviv: {ind.trees_survived}</span>
                    </div>
                    <p className="text-xs text-gray-400">
                      Por: {ind.recorded_by} · {new Date(ind.recorded_at).toLocaleString('es-CO')}
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 shrink-0">
                    <button
                      onClick={() => handleValidate(ind.id, 'validate')}
                      className="text-xs bg-eco-600 hover:bg-eco-700 text-white px-3 py-1.5 rounded-lg"
                    >
                      ✅ Validar
                    </button>
                    <button
                      onClick={() => handleValidate(ind.id, 'reject')}
                      className="text-xs bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg"
                    >
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
