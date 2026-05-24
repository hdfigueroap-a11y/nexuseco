import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const ROLE_LABELS = { empresa: '🏢', operador: '🌿', auditor: '🔍' };

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();

  const isActive = (path) => location.pathname === path;

  const linkClass = (path) =>
    `text-sm font-medium transition-all pb-0.5 border-b-2 ${
      isActive(path)
        ? 'text-malaquita-300 border-malaquita-300'
        : 'text-white/70 border-transparent hover:text-white hover:border-white/30'
    }`;

  return (
    <nav className="bg-negro-400 border-b border-white/10 shadow-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-neon flex items-center justify-center text-sm shadow-[0_0_12px_rgba(34,114,255,0.5)]">
              🌱
            </div>
            <span className="font-bold text-lg tracking-tight">
              Nexus <span className="text-neon-400">Eco</span>
            </span>
          </Link>

          {/* Links */}
          <div className="hidden md:flex items-center gap-8">
            <Link to="/dashboard" className={linkClass('/dashboard')}>Dashboard</Link>
            <Link to="/projects"  className={linkClass('/projects')}>Proyectos</Link>
            <Link to="/alerts"    className={linkClass('/alerts')}>Alertas</Link>
            {user?.role === 'auditor' && <>
              <Link to="/auditor"    className={linkClass('/auditor')}>Auditoría</Link>
              <Link to="/audit/logs" className={linkClass('/audit/logs')}>Logs</Link>
            </>}
          </div>

          {/* Usuario */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 bg-negro-300 border border-white/10 rounded-lg px-3 py-1.5">
              <span>{ROLE_LABELS[user?.role]}</span>
              <span className="text-white/70 text-xs">{user?.full_name || user?.email}</span>
            </div>
            <button
              onClick={() => { logout(); navigate('/login'); }}
              className="text-sm bg-razzmatazz-400/20 hover:bg-razzmatazz-400/40 text-razzmatazz-300
                         border border-razzmatazz-400/30 px-3 py-1.5 rounded-lg transition-all"
            >
              Salir
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
