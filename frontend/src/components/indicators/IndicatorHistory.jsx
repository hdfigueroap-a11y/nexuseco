// frontend/src/components/indicators/IndicatorHistory.jsx

import { useEffect, useState } from 'react';
import api from '../../services/api';

export default function IndicatorHistory({ projectId }) {
  const [indicators, setIndicators] = useState([]);
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
    api.get(`/projects/${projectId}/indicators`, { params: { limit: 30 } })
      .then(({ data }) => setIndicators(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [projectId]);

  if (loading) return <div className="text-center py-6 text-gray-400">Cargando historial...</div>;

  return (
    <div className="card">
      <h3 className="font-semibold text-gray-700 mb-4">Historial de indicadores</h3>
      {indicators.length === 0 ? (
        <p className="text-gray-400 text-sm text-center py-6">Sin registros aún.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-400 border-b text-xs uppercase tracking-wider">
                <th className="pb-2 font-medium">Fecha</th>
                <th className="pb-2 font-medium text-center">Temp.</th>
                <th className="pb-2 font-medium text-center">Humedad</th>
                <th className="pb-2 font-medium text-center">Sembrados</th>
                <th className="pb-2 font-medium text-center">Sobreviv.</th>
                <th className="pb-2 font-medium text-center">IVI</th>
                <th className="pb-2 font-medium">Registrado por</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {indicators.map((ind) => (
                <tr key={ind.id} className="hover:bg-gray-50">
                  <td className="py-2 text-gray-500">
                    {new Date(ind.recorded_at).toLocaleDateString('es-CO', {
                      year: 'numeric', month: 'short', day: 'numeric',
                    })}
                  </td>
                  <td className="py-2 text-center">{ind.temperature ?? '—'}°C</td>
                  <td className="py-2 text-center">{ind.humidity ?? '—'}%</td>
                  <td className="py-2 text-center">{ind.trees_planted}</td>
                  <td className="py-2 text-center">{ind.trees_survived}</td>
                  <td className="py-2 text-center">
                    {ind.ivi !== null ? (
                      <span className={ind.ivi < 60 ? 'badge-ivi-critico' : 'badge-ivi-ok'}>
                        {ind.ivi}%
                      </span>
                    ) : '—'}
                  </td>
                  <td className="py-2 text-gray-500 text-xs">{ind.recorded_by || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
