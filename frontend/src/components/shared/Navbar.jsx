import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const ROLE_LABELS = { empresa: '🏢', operador: '🌿', auditor: '🔍' };

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <nav className="bg-eco-600 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <Link to="/dashboard" className="flex items-center gap-2 font-bold text-xl tracking-tight">
            <span className="text-mandarina-400 text-2xl">🌱</span>
            <span>Nexus <span className="text-mandarina-400">Eco</span></span>
          </Link>

          {/* Links */}
          <div className="hidden md:flex items-center gap-6 text-sm font-medium">
            <Link to="/dashboard" className="hover:text-mandarina-400 transition-colors">Dashboard</Link>
            <Link to="/projects"  className="hover:text-mandarina-400 transition-colors">Proyectos</Link>
            <Link to="/alerts"    className="hover:text-mandarina-400 transition-colors">Alertas</Link>
            {user?.role === 'auditor' && <>
              <Link to="/auditor"    className="hover:text-mandarina-400 transition-colors">Auditoría</Link>
              <Link to="/audit/logs" className="hover:text-mandarina-400 transition-colors">Logs</Link>
            </>}
          </div>

          {/* Usuario */}
          <div className="flex items-center gap-4">
            <span className="text-white/70 text-sm hidden sm:block">
              {ROLE_LABELS[user?.role]} {user?.full_name || user?.email}
            </span>
            <button
              onClick={() => { logout(); navigate('/login'); }}
              className="text-sm bg-eco-700 hover:bg-eco-800 border border-white/20 px-3 py-1.5 rounded-lg transition-colors"
            >
              Salir
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
