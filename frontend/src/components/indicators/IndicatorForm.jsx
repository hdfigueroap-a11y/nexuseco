// frontend/src/components/indicators/IndicatorForm.jsx
// RF04 — Registro de Indicadores
// RF05/RF06 — El IVI y cumplimiento se calculan automáticamente al guardar

import { useState } from 'react';
import api from '../../services/api';

export default function IndicatorForm({ projectId, treeGoal, onSaved }) {
  const [form, setForm] = useState({
    temperature:    '',
    humidity:       '',
    trees_planted:  '',
    trees_survived: '',
  });
  const [warnings, setWarnings]     = useState([]);
  const [needsConfirm, setNeedsConfirm] = useState(false);
  const [result, setResult]         = useState(null);
  const [error, setError]           = useState('');
  const [saving, setSaving]         = useState(false);

  function setField(key, value) {
    setForm({ ...form, [key]: value });
    setWarnings([]);
    setNeedsConfirm(false);
    setResult(null);
  }

  async function submit(forceSave = false) {
    setError('');
    setSaving(true);
    try {
      const payload = {
        temperature:    form.temperature    !== '' ? parseFloat(form.temperature)    : undefined,
        humidity:       form.humidity       !== '' ? parseFloat(form.humidity)       : undefined,
        trees_planted:  parseInt(form.trees_planted)  || 0,
        trees_survived: parseInt(form.trees_survived) || 0,
        force_save:     forceSave,
      };

      const { data } = await api.post(`/projects/${projectId}/indicators`, payload);

      if (data.requires_confirmation) {
        setWarnings(data.warnings);
        setNeedsConfirm(true);
        return;
      }

      // Éxito — mostrar IVI calculado
      setResult({ ivi: data.ivi, compliance: data.compliance_pct });
      setForm({ temperature: '', humidity: '', trees_planted: '', trees_survived: '' });
      setNeedsConfirm(false);
      if (onSaved) onSaved();
    } catch (err) {
      const msg = err.response?.data?.error
        || err.response?.data?.details?.[0]?.message
        || 'Error al guardar el registro.';
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card">
      <h2 className="font-semibold text-gray-800 mb-4">Registrar indicadores</h2>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
      )}

      {result && (
        <div className="mb-4 p-4 bg-eco-50 border border-eco-200 rounded-lg">
          <p className="text-eco-800 font-semibold text-sm">✅ Indicadores guardados correctamente</p>
          <div className="flex gap-6 mt-2 text-sm">
            <span>IVI calculado: <strong className={result.ivi < 60 ? 'text-red-600' : 'text-eco-700'}>{result.ivi}%</strong></span>
            {result.compliance !== null && (
              <span>Cumplimiento: <strong>{result.compliance}%</strong></span>
            )}
          </div>
          {result.ivi < 60 && (
            <p className="text-red-600 text-xs mt-1">⚠️ IVI por debajo del umbral crítico (60%). Se generó una alerta.</p>
          )}
        </div>
      )}

      {/* Advertencias de rango (RF04 Escenario 2) */}
      {needsConfirm && warnings.length > 0 && (
        <div className="mb-4 p-4 bg-yellow-50 border border-yellow-300 rounded-lg">
          <p className="font-semibold text-yellow-800 text-sm mb-2">⚠️ Valores fuera de rango detectados:</p>
          <ul className="text-sm text-yellow-700 list-disc list-inside space-y-1">
            {warnings.map((w, i) => <li key={i}>{w}</li>)}
          </ul>
          <p className="text-yellow-700 text-sm mt-2">¿Confirmas que los datos son correctos?</p>
          <div className="flex gap-2 mt-3">
            <button onClick={() => submit(true)} className="btn-primary text-sm py-1.5">
              Sí, guardar de todas formas
            </button>
            <button onClick={() => { setNeedsConfirm(false); setWarnings([]); }} className="btn-secondary text-sm py-1.5">
              Corregir
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Temperatura (°C)</label>
          <input type="number" step="0.1" className="input"
            placeholder="ej. 22.5"
            value={form.temperature}
            onChange={(e) => setField('temperature', e.target.value)} />
        </div>
        <div>
          <label className="label">Humedad (%)</label>
          <input type="number" step="0.1" min="0" max="100" className="input"
            placeholder="ej. 65"
            value={form.humidity}
            onChange={(e) => setField('humidity', e.target.value)} />
        </div>
        <div>
          <label className="label">Árboles sembrados *</label>
          <input type="number" min="0" className="input"
            placeholder="ej. 100"
            value={form.trees_planted}
            onChange={(e) => setField('trees_planted', e.target.value)}
            required />
        </div>
        <div>
          <label className="label">Árboles sobrevivientes *</label>
          <input type="number" min="0" className="input"
            placeholder="ej. 88"
            value={form.trees_survived}
            onChange={(e) => setField('trees_survived', e.target.value)}
            required />
        </div>
      </div>

      {treeGoal > 0 && (
        <p className="text-xs text-gray-400 mt-2">
          Meta del proyecto: {treeGoal?.toLocaleString('es-CO')} árboles
        </p>
      )}

      {!needsConfirm && (
        <button
          onClick={() => submit(false)}
          disabled={saving || !form.trees_planted}
          className="btn-primary mt-4"
        >
          {saving ? 'Guardando...' : 'Guardar registro'}
        </button>
      )}
    </div>
  );
}
