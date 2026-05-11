// frontend/src/pages/ProjectsPage.jsx
// RF02 — Gestión de Proyectos
// RF03 — Definición Geográfica

import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

export default function ProjectsPage() {
  const { user }    = useAuth();
  const navigate    = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => { fetchProjects(); }, []);

  async function fetchProjects() {
    setLoading(true);
    try {
      const { data } = await api.get('/projects');
      setProjects(data);
    } catch (_) {}
    setLoading(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Proyectos Ambientales</h1>
        {user?.role === 'operador' && (
          <button onClick={() => setShowForm(true)} className="btn-primary">
            + Nuevo proyecto
          </button>
        )}
      </div>

      {showForm && (
        <ProjectForm
          onClose={() => setShowForm(false)}
          onCreated={() => { setShowForm(false); fetchProjects(); }}
        />
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-eco-600" />
        </div>
      ) : projects.length === 0 ? (
        <div className="card text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">🌱</p>
          <p>No hay proyectos registrados.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {projects.map((p) => (
            <ProjectCard key={p.id} project={p} />
          ))}
        </div>
      )}
    </div>
  );
}

function ProjectCard({ project: p }) {
  const iviOk = (p.current_ivi ?? 100) >= 60;
  return (
    <Link to={`/projects/${p.id}`} className="card hover:shadow-md transition-shadow block">
      <div className="flex items-start justify-between mb-3">
        <h3 className="font-semibold text-gray-800 leading-tight">{p.name}</h3>
        <span className={`ml-2 shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${
          p.status === 'activo' ? 'bg-eco-100 text-eco-700' : 'bg-gray-100 text-gray-600'
        }`}>{p.status}</span>
      </div>

      <p className="text-gray-500 text-sm mb-4 line-clamp-2">{p.description || 'Sin descripción.'}</p>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="bg-gray-50 rounded-lg p-2 text-center">
          <div className={`font-bold text-lg ${iviOk ? 'text-eco-600' : 'text-red-600'}`}>
            {p.current_ivi ?? '—'}%
          </div>
          <div className="text-gray-500 text-xs">IVI</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-2 text-center">
          <div className="font-bold text-lg text-gray-700">{p.compliance_pct ?? '—'}%</div>
          <div className="text-gray-500 text-xs">Cumplimiento</div>
        </div>
      </div>

      <div className="mt-3 text-xs text-gray-400">
        Meta: {p.tree_goal?.toLocaleString('es-CO')} árboles
      </div>
    </Link>
  );
}

function ProjectForm({ onClose, onCreated }) {
  const [form, setForm]   = useState({ name: '', description: '', tree_goal: '' });
  const [geo, setGeo]     = useState({ north: '', south: '', east: '', west: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [step, setStep]   = useState(1); // 1: datos básicos, 2: geo

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const { data: project } = await api.post('/projects', {
        ...form,
        tree_goal: parseInt(form.tree_goal) || 0,
      });

      // RF03: guardar geo si se completó
      if (geo.north && geo.south && geo.east && geo.west) {
        await api.put(`/projects/${project.id}/geo`, {
          north: parseFloat(geo.north),
          south: parseFloat(geo.south),
          east:  parseFloat(geo.east),
          west:  parseFloat(geo.west),
        });
      }

      onCreated();
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.details?.[0]?.message || 'Error al crear el proyecto.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-lg font-semibold">Nuevo Proyecto</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
          )}

          {/* Paso 1: Datos del proyecto */}
          <div>
            <label className="label">Nombre del proyecto *</label>
            <input className="input" value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div>
            <label className="label">Descripción</label>
            <textarea className="input" rows={3} value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div>
            <label className="label">Meta de árboles *</label>
            <input type="number" min="1" className="input" value={form.tree_goal}
              onChange={(e) => setForm({ ...form, tree_goal: e.target.value })} required />
          </div>

          {/* RF03: Área geográfica (opcional en el formulario) */}
          <fieldset className="border border-gray-200 rounded-lg p-4 space-y-3">
            <legend className="text-sm font-medium text-gray-600 px-1">
              Área geográfica (opcional — RF03)
            </legend>
            <div className="grid grid-cols-2 gap-3">
              {[
                ['north', 'Latitud Norte'],
                ['south', 'Latitud Sur'],
                ['east',  'Longitud Este'],
                ['west',  'Longitud Oeste'],
              ].map(([key, label]) => (
                <div key={key}>
                  <label className="label">{label}</label>
                  <input type="number" step="0.000001" className="input"
                    placeholder="ej. 4.6097"
                    value={geo[key]}
                    onChange={(e) => setGeo({ ...geo, [key]: e.target.value })} />
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-400">El área se calcula automáticamente al guardar.</p>
          </fieldset>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Guardando...' : 'Crear proyecto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
