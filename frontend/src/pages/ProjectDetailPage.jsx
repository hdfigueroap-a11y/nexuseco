// frontend/src/pages/ProjectDetailPage.jsx
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import IndicatorForm    from '../components/indicators/IndicatorForm';
import IndicatorHistory from '../components/indicators/IndicatorHistory';
import AlertsPanel      from '../components/alerts/AlertsPanel';
import EvidencePanel    from '../components/evidence/EvidencePanel';
import ChangeHistory    from '../components/projects/ChangeHistory';
import FraudPanel       from '../components/fraud/FraudPanel';
import ReliabilityIndex from '../components/fraud/ReliabilityIndex';
import ReportsPanel     from '../components/reports/ReportsPanel';

export default function ProjectDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Indicadores');

  const TABS = [
    'Indicadores',
    'Alertas',
    'Evidencias',
    'Reportes',
    ...(user?.role === 'auditor' ? ['Antifraude', 'Historial'] : []),
  ];

  useEffect(() => { fetchProject(); }, [id]);

  async function fetchProject() {
    try {
      const { data } = await api.get(`/projects/${id}`);
      setProject(data);
    } catch (err) {
      if (err.response?.status === 403 || err.response?.status === 404) navigate('/projects');
    } finally {
      setLoading(false);
    }
  }

  if (loading) return (
    <div className="flex justify-center py-16">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-eco-600" />
    </div>
  );
  if (!project) return null;

  const iviOk = (project.current_ivi ?? 100) >= 60;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
              project.status === 'activo' ? 'bg-eco-100 text-eco-700' : 'bg-gray-100 text-gray-600'
            }`}>{project.status}</span>
            <h1 className="text-2xl font-bold text-gray-900 mt-1">{project.name}</h1>
            <p className="text-gray-500 text-sm mt-1">{project.description}</p>
          </div>
          <div className="flex gap-4 shrink-0">
            <MetricBox value={`${project.current_ivi ?? '—'}%`} label="IVI" critical={!iviOk} />
            <MetricBox value={`${project.compliance_pct ?? '—'}%`} label="Cumplimiento"
              critical={(project.compliance_pct ?? 100) < 70} />
          </div>
        </div>
        {project.area_km2 && (
          <div className="mt-4 pt-4 border-t border-gray-100 text-sm text-gray-500">
            📍 Área: <strong>{project.area_km2} km²</strong>
            <span className="ml-4">N:{project.north} S:{project.south} E:{project.east} O:{project.west}</span>
          </div>
        )}
        <div className="mt-2 text-sm text-gray-500">
          🌳 Meta: <strong>{project.tree_goal?.toLocaleString('es-CO')}</strong> árboles
        </div>

        {/* Índice de confiabilidad solo auditor */}
        {user?.role === 'auditor' && (
          <div className="mt-4">
            <ReliabilityIndex projectId={id} />
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex gap-6 overflow-x-auto">
          {TABS.map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`pb-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-eco-600 text-eco-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}>
              {tab}
            </button>
          ))}
        </nav>
      </div>

      {/* Contenido */}
      <div>
        {activeTab === 'Indicadores' && (
          <div className="space-y-6">
            {user?.role === 'operador' && (
              <IndicatorForm projectId={id} treeGoal={project.tree_goal} onSaved={fetchProject} />
            )}
            <IndicatorHistory projectId={id} />
          </div>
        )}
        {activeTab === 'Alertas'    && <AlertsPanel   projectId={id} />}
        {activeTab === 'Evidencias' && <EvidencePanel  projectId={id} />}
        {activeTab === 'Reportes'   && <ReportsPanel   projectId={id} />}
        {activeTab === 'Antifraude' && user?.role === 'auditor' && <FraudPanel projectId={id} />}
        {activeTab === 'Historial'  && user?.role === 'auditor' && <ChangeHistory projectId={id} />}
      </div>
    </div>
  );
}

function MetricBox({ value, label, critical }) {
  return (
    <div className={`rounded-xl p-4 text-center min-w-[90px] ${
      critical ? 'bg-red-50 border border-red-200' : 'bg-eco-50 border border-eco-200'
    }`}>
      <div className={`text-2xl font-bold ${critical ? 'text-red-600' : 'text-eco-700'}`}>{value}</div>
      <div className={`text-xs font-medium mt-0.5 ${critical ? 'text-red-500' : 'text-eco-600'}`}>{label}</div>
    </div>
  );
}
