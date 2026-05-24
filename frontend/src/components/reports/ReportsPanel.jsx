// frontend/src/components/reports/ReportsPanel.jsx
// RF12 — Generación de Reporte PDF
// RF13 — Firma Digital

import { useEffect, useState } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const STATUS_LABELS = {
  pendiente: { label: 'Pendiente',  color: 'bg-yellow-100 text-yellow-800' },
  firmado:   { label: '✅ Firmado',  color: 'bg-eco-100 text-eco-800' },
  rechazado: { label: '❌ Rechazado', color: 'bg-red-100 text-red-800' },
};

export default function ReportsPanel({ projectId }) {
  const { user } = useAuth();
  const [reports, setReports]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [generating, setGenerating] = useState(false);
  const [viewing, setViewing]     = useState(null);
  const [period, setPeriod]       = useState({ from: '', to: '' });
  const [rejectModal, setRejectModal] = useState(null);
  const [observation, setObservation] = useState('');

  useEffect(() => { fetchReports(); }, [projectId]);

  async function fetchReports() {
    try {
      const { data } = await api.get(`/projects/${projectId}/reports`);
      setReports(data);
    } catch (_) {}
    setLoading(false);
  }

  async function handleGenerate() {
    setGenerating(true);
    try {
      const { data } = await api.post(`/projects/${projectId}/reports`, {
        from: period.from || undefined,
        to:   period.to   || undefined,
      });
      setReports([data, ...reports]);
      setViewing(data);
    } catch (err) {
      alert(err.response?.data?.error || 'Error al generar reporte.');
    } finally {
      setGenerating(false);
    }
  }

  async function handleView(reportId) {
    try {
      const { data } = await api.get(`/reports/${reportId}`);
      setViewing(data);
    } catch (_) {}
  }

  async function handleSign(reportId) {
    if (!confirm('¿Confirmas la firma digital de este reporte?')) return;
    try {
      await api.post(`/reports/${reportId}/sign`);
      fetchReports();
      if (viewing?.id === reportId) {
        handleView(reportId);
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Error al firmar.');
    }
  }

  async function handleReject() {
    if (!observation.trim()) return;
    try {
      await api.post(`/reports/${rejectModal}/reject`, { observation });
      setRejectModal(null);
      setObservation('');
      fetchReports();
    } catch (err) {
      alert(err.response?.data?.error || 'Error al rechazar.');
    }
  }

  function downloadPDF(report) {
    if (!report.report_data) return;
    const d = report.report_data;
    const content = buildPDFText(d, report);
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `reporte_${d.project?.name || projectId}_${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function buildPDFText(d, report) {
    const p = d.project || {};
    const m = d.metrics || {};
    const lines = [
      '═══════════════════════════════════════════════════',
      '           NEXUS ECO — REPORTE DE PROYECTO',
      '═══════════════════════════════════════════════════',
      '',
      `Proyecto:      ${p.name || '—'}`,
      `Descripción:   ${p.description || '—'}`,
      `Meta árboles:  ${p.tree_goal || 0}`,
      `Estado:        ${p.status || '—'}`,
      `Operador:      ${p.owner_name || '—'}`,
      `Empresa:       ${p.company_name || '—'}`,
      '',
      '─── MÉTRICAS ───────────────────────────────────────',
      `IVI actual:       ${m.current_ivi ?? '—'}%`,
      `Cumplimiento:     ${m.compliance_pct ?? '—'}%`,
      `Confiabilidad:    ${d.reliability_index ?? '—'}/100`,
      '',
      '─── INDICADORES REGISTRADOS ────────────────────────',
      ...(d.indicators || []).map((i) =>
        `${new Date(i.recorded_at).toLocaleDateString('es-CO')} | Temp: ${i.temperature ?? '—'}°C | Hum: ${i.humidity ?? '—'}% | Sembrados: ${i.trees_planted} | Sobreviv: ${i.trees_survived} | IVI: ${i.ivi ?? '—'}%`
      ),
      '',
      '─── ALERTAS ────────────────────────────────────────',
      ...(d.alerts || []).map((a) =>
        `[${a.status.toUpperCase()}] ${a.type}: ${a.message}`
      ),
      '',
      '─── INTEGRIDAD ─────────────────────────────────────',
      `Hash SHA-256:  ${report.hash}`,
      `Estado:        ${report.status}`,
      report.status === 'firmado' ? `Firma:         ${report.signature}` : '',
      report.status === 'firmado' ? `Firmado:       ${new Date(report.signed_at).toLocaleString('es-CO')}` : '',
      report.observation ? `Observación:   ${report.observation}` : '',
      '',
      `Generado:      ${new Date(d.generated_at).toLocaleString('es-CO')}`,
      '═══════════════════════════════════════════════════',
    ];
    return lines.filter((l) => l !== undefined).join('\n');
  }

  return (
    <div className="space-y-4">
      {/* Generar reporte */}
      <div className="card">
        <h3 className="font-semibold text-gray-700 mb-4">Generar Reporte PDF</h3>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="label">Desde (opcional)</label>
            <input type="date" className="input" value={period.from}
              onChange={(e) => setPeriod({ ...period, from: e.target.value })} />
          </div>
          <div>
            <label className="label">Hasta (opcional)</label>
            <input type="date" className="input" value={period.to}
              onChange={(e) => setPeriod({ ...period, to: e.target.value })} />
          </div>
        </div>
        <button onClick={handleGenerate} disabled={generating} className="btn-primary">
          {generating ? 'Generando...' : '📄 Generar reporte'}
        </button>
      </div>

      {/* Lista de reportes */}
      <div className="card">
        <h3 className="font-semibold text-gray-700 mb-4">Reportes generados ({reports.length})</h3>
        {loading ? (
          <p className="text-center text-gray-400 py-6">Cargando...</p>
        ) : reports.length === 0 ? (
          <p className="text-center text-gray-400 py-8">Sin reportes generados.</p>
        ) : (
          <div className="space-y-3">
            {reports.map((r) => {
              const st = STATUS_LABELS[r.status] || STATUS_LABELS.pendiente;
              return (
                <div key={r.id} className="border border-gray-100 rounded-lg p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${st.color}`}>
                          {st.label}
                        </span>
                        <span className="text-xs text-gray-400">
                          {new Date(r.created_at).toLocaleString('es-CO')}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">
                        Por: {r.generated_by_name} · Hash: {r.hash?.slice(0, 16)}...
                      </p>
                      {r.period_from && (
                        <p className="text-xs text-gray-400 mt-0.5">
                          Período: {r.period_from} → {r.period_to || 'hoy'}
                        </p>
                      )}
                      {r.observation && (
                        <p className="text-xs text-red-600 mt-1">Obs: {r.observation}</p>
                      )}
                    </div>

                    <div className="flex flex-col gap-1.5 shrink-0">
                      <button onClick={() => handleView(r.id)}
                        className="text-xs btn-secondary py-1">
                        Ver
                      </button>
                      {user?.role === 'auditor' && r.status === 'pendiente' && (
                        <>
                          <button onClick={() => handleSign(r.id)}
                            className="text-xs bg-eco-600 hover:bg-eco-700 text-white px-3 py-1 rounded-lg">
                            ✍️ Firmar
                          </button>
                          <button onClick={() => setRejectModal(r.id)}
                            className="text-xs bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-lg">
                            Rechazar
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal visor de reporte */}
      {viewing && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="font-semibold text-gray-800">
                Reporte — {viewing.report_data?.project?.name}
              </h2>
              <button onClick={() => setViewing(null)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>

            <div className="overflow-y-auto p-6 flex-1 space-y-4 text-sm">
              {viewing.report_data && <ReportContent data={viewing.report_data} report={viewing} />}
            </div>

            <div className="p-4 border-t flex justify-between">
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_LABELS[viewing.status]?.color}`}>
                  {STATUS_LABELS[viewing.status]?.label}
                </span>
                {viewing.status === 'firmado' && (
                  <span className="text-xs text-gray-400">
                    Firmado: {new Date(viewing.signed_at).toLocaleString('es-CO')}
                  </span>
                )}
              </div>
              <button onClick={() => downloadPDF(viewing)} className="btn-primary text-sm">
                ⬇️ Descargar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal rechazo */}
      {rejectModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h3 className="font-semibold text-gray-800 mb-4">Rechazar reporte</h3>
            <label className="label">Observación *</label>
            <textarea className="input mb-4" rows={4}
              placeholder="Describe el motivo del rechazo..."
              value={observation}
              onChange={(e) => setObservation(e.target.value)} />
            <div className="flex justify-end gap-3">
              <button onClick={() => { setRejectModal(null); setObservation(''); }} className="btn-secondary">
                Cancelar
              </button>
              <button onClick={handleReject} className="btn-danger">
                Confirmar rechazo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ReportContent({ data, report }) {
  const p = data.project || {};
  const m = data.metrics || {};
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <InfoBox label="Proyecto" value={p.name} />
        <InfoBox label="Estado" value={p.status} />
        <InfoBox label="IVI Actual" value={`${m.current_ivi ?? '—'}%`} />
        <InfoBox label="Cumplimiento" value={`${m.compliance_pct ?? '—'}%`} />
        <InfoBox label="Confiabilidad" value={`${data.reliability_index ?? '—'}/100`} />
        <InfoBox label="Meta árboles" value={p.tree_goal?.toLocaleString('es-CO')} />
      </div>

      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
          Indicadores ({data.indicators?.length || 0})
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-gray-400 border-b">
                <th className="pb-1 text-left font-medium">Fecha</th>
                <th className="pb-1 text-center font-medium">Temp</th>
                <th className="pb-1 text-center font-medium">Hum</th>
                <th className="pb-1 text-center font-medium">Sembrados</th>
                <th className="pb-1 text-center font-medium">Sobreviv</th>
                <th className="pb-1 text-center font-medium">IVI</th>
              </tr>
            </thead>
            <tbody>
              {(data.indicators || []).slice(0, 10).map((i) => (
                <tr key={i.id} className="border-b border-gray-50">
                  <td className="py-1 text-gray-500">{new Date(i.recorded_at).toLocaleDateString('es-CO')}</td>
                  <td className="py-1 text-center">{i.temperature ?? '—'}°C</td>
                  <td className="py-1 text-center">{i.humidity ?? '—'}%</td>
                  <td className="py-1 text-center">{i.trees_planted}</td>
                  <td className="py-1 text-center">{i.trees_survived}</td>
                  <td className="py-1 text-center">{i.ivi ?? '—'}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
          Alertas ({data.alerts?.length || 0})
        </p>
        {data.alerts?.length === 0 ? (
          <p className="text-xs text-gray-400">Sin alertas.</p>
        ) : (
          <ul className="space-y-1">
            {data.alerts?.map((a) => (
              <li key={a.id} className="text-xs text-gray-600">
                [{a.status}] {a.type}: {a.message}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="bg-gray-50 rounded-lg p-3">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Integridad</p>
        <p className="text-xs text-gray-500 font-mono break-all">Hash: {report.hash}</p>
        {report.signature && (
          <p className="text-xs text-eco-600 font-mono break-all mt-1">Firma: {report.signature}</p>
        )}
      </div>
    </div>
  );
}

function InfoBox({ label, value }) {
  return (
    <div className="bg-gray-50 rounded-lg p-3">
      <p className="text-xs text-gray-400">{label}</p>
      <p className="font-semibold text-gray-800">{value || '—'}</p>
    </div>
  );
}
