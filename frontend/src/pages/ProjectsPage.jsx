// frontend/src/pages/ProjectsPage.jsx
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

export default function ProjectsPage() {
  const { user }  = useAuth();
  const [tab, setTab] = useState('mis');
  const [myProjects, setMyProjects]       = useState([]);
  const [availableProjects, setAvailable] = useState([]);
  const [loading, setLoading]             = useState(true);
  const [showForm, setShowForm]           = useState(false);
  const [investing, setInvesting]         = useState(null);

  useEffect(() => { fetchAll(); }, []);

  async function fetchAll() {
    setLoading(true);
    try {
      const myRes = await api.get('/projects');
      setMyProjects(myRes.data);
      if (user?.role === 'empresa') {
        const availRes = await api.get('/projects/explore/available');
        setAvailable(availRes.data);
      }
    } catch (_) {}
    setLoading(false);
  }

  async function handleInvest(projectId) {
    setInvesting(projectId);
    try {
      await api.post(`/projects/${projectId}/invest`);
      await fetchAll();
      setTab('mis');
    } catch (err) {
      alert(err.response?.data?.error || 'Error al invertir.');
    } finally {
      setInvesting(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Proyectos Ambientales</h1>
        {user?.role === 'operador' && (
          <button onClick={() => setShowForm(true)} className="btn-primary">+ Nuevo proyecto</button>
        )}
      </div>

      {user?.role === 'empresa' && (
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex gap-6">
            {[['mis', `Mis inversiones (${myProjects.length})`], ['explorar', `Explorar (${availableProjects.length})`]].map(([key, label]) => (
              <button key={key} onClick={() => setTab(key)}
                className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                  tab === key ? 'border-eco-600 text-eco-700' : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}>
                {label}
              </button>
            ))}
          </nav>
        </div>
      )}

      {showForm && (
        <ProjectForm onClose={() => setShowForm(false)} onCreated={() => { setShowForm(false); fetchAll(); }} />
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-eco-600" />
        </div>
      ) : (
        <>
          {tab === 'mis' && (
            myProjects.length === 0 ? (
              <div className="card text-center py-16 text-gray-400">
                <p className="text-4xl mb-3">🌱</p>
                {user?.role === 'empresa'
                  ? <p>Aún no has invertido en ningún proyecto. <button onClick={() => setTab('explorar')} className="text-eco-600 hover:underline">Explorar proyectos</button></p>
                  : <p>No hay proyectos registrados.</p>}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {myProjects.map((p) => <ProjectCard key={p.id} project={p} />)}
              </div>
            )
          )}

          {tab === 'explorar' && (
            availableProjects.length === 0 ? (
              <div className="card text-center py-16 text-gray-400">
                <p className="text-4xl mb-3">✅</p>
                <p>No hay proyectos disponibles en este momento.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {availableProjects.map((p) => (
                  <ExploreCard key={p.id} project={p}
                    investing={investing === p.id}
                    onInvest={() => handleInvest(p.id)} />
                ))}
              </div>
            )
          )}
        </>
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
        <span className={`ml-2 shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${p.status === 'activo' ? 'bg-eco-100 text-eco-700' : 'bg-gray-100 text-gray-600'}`}>{p.status}</span>
      </div>
      <p className="text-gray-500 text-sm mb-4 line-clamp-2">{p.description || 'Sin descripción.'}</p>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="bg-gray-50 rounded-lg p-2 text-center">
          <div className={`font-bold text-lg ${iviOk ? 'text-eco-600' : 'text-red-600'}`}>{p.current_ivi ?? '—'}%</div>
          <div className="text-gray-500 text-xs">IVI</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-2 text-center">
          <div className="font-bold text-lg text-gray-700">{p.compliance_pct ?? '—'}%</div>
          <div className="text-gray-500 text-xs">Cumplimiento</div>
        </div>
      </div>
      <div className="mt-3 text-xs text-gray-400">Meta: {p.tree_goal?.toLocaleString('es-CO')} árboles</div>
    </Link>
  );
}

function ExploreCard({ project: p, onInvest, investing }) {
  return (
    <div className="card hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <h3 className="font-semibold text-gray-800 leading-tight">{p.name}</h3>
        <span className="ml-2 shrink-0 px-2 py-0.5 rounded-full text-xs font-medium bg-eco-100 text-eco-700">{p.status}</span>
      </div>
      <p className="text-gray-500 text-sm mb-3 line-clamp-2">{p.description || 'Sin descripción.'}</p>
      {p.owner_name && <p className="text-xs text-gray-400 mb-3">👤 Operador: {p.owner_name}</p>}
      <div className="grid grid-cols-2 gap-2 text-sm mb-4">
        <div className="bg-gray-50 rounded-lg p-2 text-center">
          <div className="font-bold text-gray-700">{p.tree_goal?.toLocaleString('es-CO')}</div>
          <div className="text-gray-400 text-xs">Meta árboles</div>
        </div>
        {p.area_km2 && (
          <div className="bg-gray-50 rounded-lg p-2 text-center">
            <div className="font-bold text-gray-700">{p.area_km2} km²</div>
            <div className="text-gray-400 text-xs">Área</div>
          </div>
        )}
      </div>
      <div className="flex gap-2">
        <Link to={`/projects/${p.id}`} className="btn-secondary text-sm flex-1 text-center">Ver detalles</Link>
        <button onClick={onInvest} disabled={investing} className="btn-primary text-sm flex-1">
          {investing ? 'Invirtiendo...' : '💰 Invertir'}
        </button>
      </div>
    </div>
  );
}

function ProjectForm({ onClose, onCreated }) {
  const [form, setForm]     = useState({ name: '', description: '', tree_goal: '' });
  const [geo, setGeo]       = useState({ north: '', south: '', east: '', west: '' });
  const [error, setError]   = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const { data: project } = await api.post('/projects', { ...form, tree_goal: parseInt(form.tree_goal) || 0 });
      if (geo.north && geo.south && geo.east && geo.west) {
        await api.put(`/projects/${project.id}/geo`, {
          north: parseFloat(geo.north), south: parseFloat(geo.south),
          east: parseFloat(geo.east),  west: parseFloat(geo.west),
        });
      }
      onCreated();
    } catch (err) {
      setError(err.response?.data?.error || 'Error al crear el proyecto.');
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
          {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}
          <div>
            <label className="label">Nombre del proyecto *</label>
            <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div>
            <label className="label">Descripción</label>
            <textarea className="input" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div>
            <label className="label">Meta de árboles *</label>
            <input type="number" min="1" className="input" value={form.tree_goal} onChange={(e) => setForm({ ...form, tree_goal: e.target.value })} required />
          </div>
          <fieldset className="border border-gray-200 rounded-lg p-4 space-y-3">
            <legend className="text-sm font-medium text-gray-600 px-1">Área geográfica (opcional)</legend>
            <div className="grid grid-cols-2 gap-3">
              {[['north','Latitud Norte'],['south','Latitud Sur'],['east','Longitud Este'],['west','Longitud Oeste']].map(([key, label]) => (
                <div key={key}>
                  <label className="label">{label}</label>
                  <input type="number" step="0.000001" className="input" placeholder="ej. 4.6097"
                    value={geo[key]} onChange={(e) => setGeo({ ...geo, [key]: e.target.value })} />
                </div>
              ))}
            </div>
          </fieldset>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Guardando...' : 'Crear proyecto'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
