import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm]       = useState({ full_name: '', email: '', password: '', role: 'operador' });
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (form.password.length < 8) return setError('La contraseña debe tener al menos 8 caracteres.');
    setLoading(true);
    try {
      await register(form);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Error al registrar la cuenta.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-negro-300 flex items-center justify-center px-4 py-8">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-heliotropo-300/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-malaquita-300/10 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-neon text-4xl mb-4 shadow-[0_0_30px_rgba(34,114,255,0.4)]">
            🌱
          </div>
          <h1 className="text-3xl font-bold">Nexus <span className="text-neon-400">Eco</span></h1>
          <p className="text-white/50 mt-1 text-sm">Crear cuenta</p>
          <div className="mt-3 h-0.5 w-20 bg-gradient-neon rounded-full mx-auto" />
        </div>

        <div className="bg-negro-200 rounded-2xl border border-white/10 p-8 shadow-2xl">
          <h2 className="text-lg font-semibold text-white mb-6">Registro</h2>

          {error && (
            <div className="mb-4 p-3 bg-razzmatazz-400/10 border border-razzmatazz-400/30 rounded-lg text-razzmatazz-300 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Nombre completo</label>
              <input type="text" className="input" placeholder="Juan García"
                value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required />
            </div>
            <div>
              <label className="label">Correo electrónico</label>
              <input type="email" className="input" placeholder="usuario@empresa.com"
                value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            </div>
            <div>
              <label className="label">Contraseña (mínimo 8 caracteres)</label>
              <input type="password" className="input" placeholder="••••••••"
                value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
            </div>
            <div>
              <label className="label">Rol</label>
              <select className="input" value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}>
                <option value="empresa">🏢 Empresa (Financiador)</option>
                <option value="operador">🌿 Operador de Campo</option>
                <option value="auditor">🔍 Auditor / Verificador</option>
              </select>
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full mt-2">
              {loading ? 'Registrando...' : 'Crear cuenta'}
            </button>
          </form>

          <p className="text-center text-sm text-white/50 mt-5">
            ¿Ya tienes cuenta?{' '}
            <Link to="/login" className="text-neon-400 font-medium hover:text-neon-300 transition-colors">
              Inicia sesión
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
