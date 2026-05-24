import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const ALERT_TYPE_LABELS = {
  ivi_critico:         '⚠️ IVI Crítico',
  cumplimiento_bajo:   '📉 Cumplimiento Bajo',
  baja_supervivencia:  '🌱 Baja Supervivencia',
  temperatura_critica: '🌡️ Temperatura Crítica',
  inactividad:         '💤 Inactividad',
};

export default function DashboardPage() {
  const { user } = useAuth();
  const [projects, setProjects]     = useState([]);
  const [alerts, setAlerts]         = useState([]);
  const [indicators, setIndicators] = useState([]);
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [projRes, alertRes] = await Promise.all([
          api.get('/projects'),
          api.get('/alerts'),
        ]);
        setProjects(projRes.data);
        setAlerts(alertRes.data.filter((a) => a.status === 'activa').slice(0, 5));
        if (projRes.data.length > 0) {
          const indRes = await api.get(`/projects/${projRes.data[0].id}/indicators`, { params: { limit: 10 } });
          setIndicators(indRes.data.reverse());
        }
      } catch (_) {}
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-eco-600" />
    </div>
  );

  const avgIVI        = projects.length
    ? (projects.reduce((s, p) => s + (p.current_ivi || 0), 0) / projects.length).toFixed(1) : '—';
  const avgCompliance = projects.length
    ? (projects.reduce((s, p) => s + (p.compliance_pct || 0), 0) / projects.length).toFixed(1) : '—';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Bienvenido, <span className="text-eco-600">{user?.full_name || user?.email}</span>
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">Panel de monitoreo ambiental · Nexus Eco</p>
        </div>
        <div className="h-1 w-12 bg-mandarina-400 rounded-full hidden sm:block" />
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Proyectos"      value={projects.length}        icon="📁" variant="eco" />
        <StatCard label="IVI Promedio"   value={`${avgIVI}%`}           icon="🌿"
          variant={parseFloat(avgIVI) < 60 ? 'red' : 'eco'} />
        <StatCard label="Cumplimiento"   value={`${avgCompliance}%`}    icon="📊"
          variant={parseFloat(avgCompliance) < 70 ? 'yellow' : 'eco'} />
        <StatCard label="Alertas activas" value={alerts.length}         icon="🔔"
          variant={alerts.length > 0 ? 'red' : 'eco'} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gráfico IVI */}
        <div className="card lg:col-span-2">
          <h2 className="font-semibold text-gray-700 mb-4">Evolución del IVI</h2>
          {indicators.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={indicators}>
                <XAxis dataKey="recorded_at"
                  tickFormatter={(v) => new Date(v).toLocaleDateString('es-CO', { month: 'short', day: 'numeric' })}
                  tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(v) => [`${v}%`, 'IVI']}
                  labelFormatter={(l) => new Date(l).toLocaleDateString('es-CO')}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #FAF5E9' }}
                />
                <ReferenceLine y={60} stroke="#FFCC00" strokeDasharray="4 4"
                  label={{ value: 'Umbral 60%', position: 'right', fontSize: 10, fill: '#a37d00' }} />
                <Line type="monotone" dataKey="ivi" stroke="#009B4D" strokeWidth={2} dot={{ r: 3, fill: '#009B4D' }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-400 text-sm text-center py-12">Sin indicadores registrados aún.</p>
          )}
        </div>

        {/* Alertas */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-700">Alertas activas</h2>
            <Link to="/alerts" className="text-xs text-eco-600 hover:underline">Ver todas</Link>
          </div>
          {alerts.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">✅ Sin alertas activas</p>
          ) : (
            <ul className="space-y-3">
              {alerts.map((a) => (
                <li key={a.id} className="p-3 bg-mandarina-50 border border-mandarina-200 rounded-lg">
                  <span className="text-xs font-semibold text-mandarina-700">
                    {ALERT_TYPE_LABELS[a.type] || a.type}
                  </span>
                  <p className="text-xs text-gray-600 mt-0.5">{a.project_name}</p>
                  <p className="text-xs text-gray-400">{a.message}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Proyectos recientes */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-700">Proyectos recientes</h2>
          <Link to="/projects" className="text-xs text-eco-600 hover:underline">Ver todos</Link>
        </div>
        {projects.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-6">No hay proyectos registrados.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-400 border-b text-xs uppercase tracking-wider">
                  <th className="pb-2 font-medium">Proyecto</th>
                  <th className="pb-2 font-medium text-center">IVI</th>
                  <th className="pb-2 font-medium text-center">Cumplimiento</th>
                  <th className="pb-2 font-medium text-center">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-marfil">
                {projects.slice(0, 5).map((p) => (
                  <tr key={p.id} className="hover:bg-marfil/50 transition-colors">
                    <td className="py-2.5">
                      <Link to={`/projects/${p.id}`} className="font-medium text-eco-700 hover:underline">
                        {p.name}
                      </Link>
                    </td>
                    <td className="py-2.5 text-center">
                      <span className={p.current_ivi < 60 ? 'badge-ivi-critico' : 'badge-ivi-ok'}>
                        {p.current_ivi ?? '—'}%
                      </span>
                    </td>
                    <td className="py-2.5 text-center">
                      {(p.compliance_pct ?? 100) < 70
                        ? <span className="badge-warning">{p.compliance_pct ?? '—'}%</span>
                        : <span className="text-gray-600">{p.compliance_pct ?? '—'}%</span>
                      }
                    </td>
                    <td className="py-2.5 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        p.status === 'activo' ? 'bg-eco-100 text-eco-700' : 'bg-gray-100 text-gray-600'
                      }`}>{p.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, variant }) {
  const variants = {
    eco:    'border-eco-200 bg-eco-50 text-eco-700',
    red:    'border-red-200 bg-red-50 text-red-700',
    yellow: 'border-mandarina-200 bg-mandarina-50 text-mandarina-700',
  };
  return (
    <div className={`border rounded-xl p-4 ${variants[variant] || variants.eco}`}>
      <div className="text-2xl mb-1">{icon}</div>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-sm font-medium opacity-80">{label}</div>
    </div>
  );
}
