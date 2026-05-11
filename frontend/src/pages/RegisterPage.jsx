// frontend/src/pages/RegisterPage.jsx
// RF01 — Registro de nuevo usuario

import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    full_name: '',
    email: '',
    password: '',
    role: 'operador',
  });
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (form.password.length < 8) {
      return setError('La contraseña debe tener al menos 8 caracteres.');
    }
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
    <div className="min-h-screen bg-eco-50 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-6xl mb-3">🌱</div>
          <h1 className="text-3xl font-bold text-eco-800">Nexus Eco</h1>
          <p className="text-gray-500 mt-1">Crear cuenta</p>
        </div>

        <div className="card">
          <h2 className="text-xl font-semibold text-gray-800 mb-6">Registro</h2>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Nombre completo</label>
              <input
                type="text"
                className="input"
                placeholder="Juan García"
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="label">Correo electrónico</label>
              <input
                type="email"
                className="input"
                placeholder="usuario@empresa.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="label">Contraseña (mínimo 8 caracteres)</label>
              <input
                type="password"
                className="input"
                placeholder="••••••••"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="label">Rol</label>
              <select
                className="input"
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
              >
                <option value="empresa">🏢 Empresa (Financiador)</option>
                <option value="operador">🌿 Operador de Campo</option>
                <option value="auditor">🔍 Auditor / Verificador</option>
              </select>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full mt-2">
              {loading ? 'Registrando...' : 'Crear cuenta'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-5">
            ¿Ya tienes cuenta?{' '}
            <Link to="/login" className="text-eco-600 font-medium hover:underline">
              Inicia sesión
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
