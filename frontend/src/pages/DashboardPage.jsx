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
        const [projRes, alertRes] = await Promise.all([api.get('/projects'), api.get('/alerts')]);
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
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-neon-400" />
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
          <h1 className="text-2xl font-bold">
            Bienvenido, <span className="text-neon-400">{user?.full_name || user?.email}</span>
          </h1>
          <p className="text-white/50 text-sm mt-0.5">Panel de monitoreo ambiental · Nexus Eco</p>
        </div>
        <div className="h-0.5 w-12 bg-gradient-neon rounded-full hidden sm:block" />
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Proyectos"       value={projects.length}     icon="📁" color="neon" />
        <StatCard label="IVI Promedio"    value={`${avgIVI}%`}        icon="🌿"
          color={parseFloat(avgIVI) < 60 ? 'red' : 'green'} />
        <StatCard label="Cumplimiento"    value={`${avgCompliance}%`} icon="📊"
          color={parseFloat(avgCompliance) < 70 ? 'purple' : 'green'} />
        <StatCard label="Alertas activas" value={alerts.length}       icon="🔔"
          color={alerts.length > 0 ? 'red' : 'green'} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gráfico IVI */}
        <div className="card lg:col-span-2">
          <h2 className="font-semibold text-white/80 mb-4">Evolución del IVI</h2>
          {indicators.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={indicators}>
                <XAxis dataKey="recorded_at"
                  tickFormatter={(v) => new Date(v).toLocaleDateString('es-CO', { month: 'short', day: 'numeric' })}
                  tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.4)' }}
                  axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} tickLine={false} />
                <YAxis domain={[0, 100]}
                  tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.4)' }}
                  axisLine={false} tickLine={false} />
                <Tooltip
                  formatter={(v) => [`${v}%`, 'IVI']}
                  labelFormatter={(l) => new Date(l).toLocaleDateString('es-CO')}
                  contentStyle={{ background: '#252525', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }}
                />
                <ReferenceLine y={60} stroke="#EF036C" strokeDasharray="4 4"
                  label={{ value: 'Umbral 60%', position: 'right', fontSize: 10, fill: '#EF036C' }} />
                <Line type="monotone" dataKey="ivi" stroke="#31EC56" strokeWidth={2}
                  dot={{ r: 3, fill: '#31EC56', strokeWidth: 0 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-white/30 text-sm text-center py-12">Sin indicadores registrados aún.</p>
          )}
        </div>

        {/* Alertas */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-white/80">Alertas activas</h2>
            <Link to="/alerts" className="text-xs text-neon-400 hover:text-neon-300 transition-colors">Ver todas</Link>
          </div>
          {alerts.length === 0 ? (
            <p className="text-white/30 text-sm text-center py-8">✅ Sin alertas activas</p>
          ) : (
            <ul className="space-y-3">
              {alerts.map((a) => (
                <li key={a.id} className="p-3 bg-razzmatazz-400/10 border border-razzmatazz-400/20 rounded-lg">
                  <span className="text-xs font-semibold text-razzmatazz-300">
                    {ALERT_TYPE_LABELS[a.type] || a.type}
                  </span>
                  <p className="text-xs text-white/60 mt-0.5">{a.project_name}</p>
                  <p className="text-xs text-white/40">{a.message}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Proyectos recientes */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-white/80">Proyectos recientes</h2>
          <Link to="/projects" className="text-xs text-neon-400 hover:text-neon-300 transition-colors">Ver todos</Link>
        </div>
        {projects.length === 0 ? (
          <p className="text-white/30 text-sm text-center py-6">No hay proyectos registrados.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-white/30 border-b border-white/10 text-xs uppercase tracking-wider">
                  <th className="pb-2 font-medium">Proyecto</th>
                  <th className="pb-2 font-medium text-center">IVI</th>
                  <th className="pb-2 font-medium text-center">Cumplimiento</th>
                  <th className="pb-2 font-medium text-center">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {projects.slice(0, 5).map((p) => (
                  <tr key={p.id} className="hover:bg-white/5 transition-colors">
                    <td className="py-2.5">
                      <Link to={`/projects/${p.id}`} className="font-medium text-neon-400 hover:text-neon-300 transition-colors">
                        {p.name}
                      </Link>
                    </td>
                    <td className="py-2.5 text-center">
                      <span className={p.current_ivi < 60 ? 'badge-danger' : 'badge-ok'}>
                        {p.current_ivi ?? '—'}%
                      </span>
                    </td>
                    <td className="py-2.5 text-center">
                      <span className={(p.compliance_pct ?? 100) < 70 ? 'badge-purple' : 'badge-ok'}>
                        {p.compliance_pct ?? '—'}%
                      </span>
                    </td>
                    <td className="py-2.5 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        p.status === 'activo'
                          ? 'bg-malaquita-300/20 text-malaquita-300'
                          : 'bg-white/10 text-white/40'
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

function StatCard({ label, value, icon, color }) {
  const colors = {
    neon:   'border-neon-400/30 bg-neon-400/10 text-neon-400 shadow-[0_0_15px_rgba(34,114,255,0.1)]',
    green:  'border-malaquita-300/30 bg-malaquita-300/10 text-malaquita-300 shadow-[0_0_15px_rgba(49,236,86,0.1)]',
    red:    'border-razzmatazz-400/30 bg-razzmatazz-400/10 text-razzmatazz-300 shadow-[0_0_15px_rgba(239,3,108,0.1)]',
    purple: 'border-heliotropo-300/30 bg-heliotropo-300/10 text-heliotropo-300 shadow-[0_0_15px_rgba(238,114,248,0.1)]',
  };
  return (
    <div className={`border rounded-xl p-4 ${colors[color] || colors.neon}`}>
      <div className="text-2xl mb-1">{icon}</div>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-sm font-medium opacity-70">{label}</div>
    </div>
  );
}
