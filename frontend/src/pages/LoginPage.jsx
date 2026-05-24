import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate  = useNavigate();
  const [form, setForm]     = useState({ email: '', password: '' });
  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(form.email, form.password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Error al iniciar sesión.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-marfil flex items-center justify-center px-4">
      <div className="w-full max-w-md">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-eco-600 text-4xl mb-4 shadow-lg">
            🌱
          </div>
          <h1 className="text-3xl font-bold text-eco-600">Nexus Eco</h1>
          <p className="text-gray-500 mt-1 text-sm">Plataforma de Monitoreo Ambiental</p>
          <div className="mt-2 h-1 w-16 bg-mandarina-400 rounded-full mx-auto" />
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-md border border-marfil-100 p-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-6">Iniciar sesión</h2>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
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

          <p className="text-center text-sm text-gray-500 mt-5">
            ¿No tienes cuenta?{' '}
            <Link to="/register" className="text-eco-600 font-medium hover:underline">Regístrate aquí</Link>
          </p>
        </div>

        {/* Credenciales de prueba */}
        <div className="mt-4 p-4 bg-eco-50 border border-eco-200 rounded-xl text-xs text-eco-700">
          <p className="font-semibold mb-1 text-eco-600">Usuarios de prueba:</p>
          <p>🏢 empresa@nexuseco.com / Empresa123!</p>
          <p>🌿 operador@nexuseco.com / Operador123!</p>
          <p>🔍 auditor@nexuseco.com / Auditor123!</p>
        </div>
      </div>
    </div>
  );
}
