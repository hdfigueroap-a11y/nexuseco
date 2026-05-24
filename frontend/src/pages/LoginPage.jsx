import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate  = useNavigate();
  const [form, setForm]       = useState({ email: '', password: '' });
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(form.email, form.password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Error al iniciar sesión.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-negro-300 flex items-center justify-center px-4">
      {/* Fondo con gradiente sutil */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-80 h-80 bg-neon-400/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-80 h-80 bg-heliotropo-300/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-malaquita-300/5 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-neon text-4xl mb-4 shadow-[0_0_30px_rgba(34,114,255,0.4)]">
            🌱
          </div>
          <h1 className="text-3xl font-bold">
            Nexus <span className="text-neon-400">Eco</span>
          </h1>
          <p className="text-white/50 mt-1 text-sm">Plataforma de Monitoreo Ambiental</p>
          <div className="mt-3 h-0.5 w-20 bg-gradient-neon rounded-full mx-auto" />
        </div>

        {/* Card */}
        <div className="bg-negro-200 rounded-2xl border border-white/10 p-8 shadow-2xl">
          <h2 className="text-lg font-semibold text-white mb-6">Iniciar sesión</h2>

          {error && (
            <div className="mb-4 p-3 bg-razzmatazz-400/10 border border-razzmatazz-400/30 rounded-lg text-razzmatazz-300 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Correo electrónico</label>
              <input type="email" className="input" placeholder="usuario@empresa.com"
                value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                required autoComplete="email" />
            </div>
            <div>
              <label className="label">Contraseña</label>
              <input type="password" className="input" placeholder="••••••••"
                value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
                required autoComplete="current-password" />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full mt-2">
              {loading ? 'Ingresando...' : 'Ingresar'}
            </button>
          </form>

          <p className="text-center text-sm text-white/50 mt-5">
            ¿No tienes cuenta?{' '}
            <Link to="/register" className="text-neon-400 font-medium hover:text-neon-300 transition-colors">
              Regístrate aquí
            </Link>
          </p>
        </div>

        {/* Credenciales */}
        <div className="mt-4 p-4 bg-negro-200/50 border border-white/10 rounded-xl text-xs text-white/50">
          <p className="font-semibold mb-1 text-malaquita-300">Usuarios de prueba:</p>
          <p>🏢 empresa@nexuseco.com / Empresa123!</p>
          <p>🌿 operador@nexuseco.com / Operador123!</p>
          <p>🔍 auditor@nexuseco.com / Auditor123!</p>
        </div>
      </div>
    </div>
  );
}
