// frontend/src/components/shared/Navbar.jsx

import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const ROLE_LABELS = {
  empresa:  '🏢 Empresa',
  operador: '🌿 Operador',
  auditor:  '🔍 Auditor',
};

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <nav className="bg-eco-700 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/dashboard" className="flex items-center gap-2 font-bold text-xl">
            <span>🌱</span>
            <span>Nexus Eco</span>
          </Link>

          {/* Links según rol */}
          <div className="hidden md:flex items-center gap-6 text-sm font-medium">
            <Link to="/dashboard"  className="hover:text-eco-200 transition-colors">Dashboard</Link>
            <Link to="/projects"   className="hover:text-eco-200 transition-colors">Proyectos</Link>

            {user?.role === 'operador' && (
              <Link to="/indicators/new" className="hover:text-eco-200 transition-colors">Registrar</Link>
            )}

            <Link to="/alerts" className="hover:text-eco-200 transition-colors">Alertas</Link>

            {user?.role === 'auditor' && (
              <Link to="/audit/logs" className="hover:text-eco-200 transition-colors">Logs</Link>
            )}
          </div>

          {/* Usuario y logout */}
          <div className="flex items-center gap-4">
            <span className="text-eco-200 text-sm hidden sm:block">
              {ROLE_LABELS[user?.role]}  {user?.full_name || user?.email}
            </span>
            <button
              onClick={handleLogout}
              className="text-sm bg-eco-800 hover:bg-eco-900 px-3 py-1.5 rounded-lg transition-colors"
            >
              Salir
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
