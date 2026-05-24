import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const ROLE_LABELS = { empresa: '🏢', operador: '🌿', auditor: '🔍' };

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <nav className="bg-eco-700 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/dashboard" className="flex items-center gap-2 font-bold text-xl">
            <span>🌱</span><span>Nexus Eco</span>
          </Link>

          <div className="hidden md:flex items-center gap-6 text-sm font-medium">
            <Link to="/dashboard" className="hover:text-eco-200 transition-colors">Dashboard</Link>
            <Link to="/projects"  className="hover:text-eco-200 transition-colors">Proyectos</Link>
            <Link to="/alerts"    className="hover:text-eco-200 transition-colors">Alertas</Link>
            {user?.role === 'auditor' && <>
              <Link to="/auditor"    className="hover:text-eco-200 transition-colors">Auditoría</Link>
              <Link to="/audit/logs" className="hover:text-eco-200 transition-colors">Logs</Link>
            </>}
          </div>

          <div className="flex items-center gap-4">
            <span className="text-eco-200 text-sm hidden sm:block">
              {ROLE_LABELS[user?.role]} {user?.full_name || user?.email}
            </span>
            <button onClick={() => { logout(); navigate('/login'); }}
              className="text-sm bg-eco-800 hover:bg-eco-900 px-3 py-1.5 rounded-lg transition-colors">
              Salir
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
