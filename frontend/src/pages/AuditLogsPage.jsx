// frontend/src/pages/AuditLogsPage.jsx
// RNF05 — Logs de auditoría (solo Auditor)

import { useEffect, useState } from 'react';
import api from '../services/api';

export default function AuditLogsPage() {
  const [logs, setLogs]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [filters, setFilters]   = useState({ role: '', action: '', from: '', to: '' });

  useEffect(() => { fetchLogs(); }, []);

  async function fetchLogs() {
    setLoading(true);
    try {
      const params = {};
      if (filters.role)   params.role   = filters.role;
      if (filters.action) params.action = filters.action;
      if (filters.from)   params.from   = filters.from;
      if (filters.to)     params.to     = filters.to;
      const { data } = await api.get('/audit/logs', { params });
      setLogs(data);
    } catch (_) {}
    setLoading(false);
  }

  function handleSearch(e) {
    e.preventDefault();
    fetchLogs();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Log de Auditoría</h1>
        <span className="text-xs text-gray-400 bg-gray-100 px-3 py-1 rounded-full">
          🔒 Solo visible para Auditor — RNF05
        </span>
      </div>

      {/* Filtros */}
      <form onSubmit={handleSearch} className="card">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="label">Rol</label>
            <select className="input" value={filters.role}
              onChange={(e) => setFilters({ ...filters, role: e.target.value })}>
              <option value="">Todos</option>
              <option value="empresa">Empresa</option>
              <option value="operador">Operador</option>
              <option value="auditor">Auditor</option>
            </select>
          </div>
          <div>
            <label className="label">Acción</label>
            <input className="input" placeholder="ej. login"
              value={filters.action}
              onChange={(e) => setFilters({ ...filters, action: e.target.value })} />
          </div>
          <div>
            <label className="label">Desde</label>
            <input type="date" className="input" value={filters.from}
              onChange={(e) => setFilters({ ...filters, from: e.target.value })} />
          </div>
          <div>
            <label className="label">Hasta</label>
            <input type="date" className="input" value={filters.to}
              onChange={(e) => setFilters({ ...filters, to: e.target.value })} />
          </div>
        </div>
        <button type="submit" className="btn-primary mt-4">Filtrar</button>
      </form>

      {/* Tabla */}
      <div className="card overflow-x-auto">
        {loading ? (
          <p className="text-center py-10 text-gray-400">Cargando logs...</p>
        ) : logs.length === 0 ? (
          <p className="text-center py-10 text-gray-400">Sin registros con los filtros aplicados.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-400 uppercase tracking-wider border-b">
                <th className="pb-2 font-medium">Fecha</th>
                <th className="pb-2 font-medium">Usuario</th>
                <th className="pb-2 font-medium">Rol</th>
                <th className="pb-2 font-medium">Acción</th>
                <th className="pb-2 font-medium">Entidad</th>
                <th className="pb-2 font-medium">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="py-2 text-gray-500 whitespace-nowrap">
                    {new Date(log.created_at).toLocaleString('es-CO')}
                  </td>
                  <td className="py-2 text-gray-700">{log.email || '—'}</td>
                  <td className="py-2">
                    <span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-600">
                      {log.role || '—'}
                    </span>
                  </td>
                  <td className="py-2 font-mono text-xs text-eco-700">{log.action}</td>
                  <td className="py-2 text-gray-500">{log.entity || '—'}</td>
                  <td className="py-2 text-gray-400 text-xs">{log.ip_address || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
