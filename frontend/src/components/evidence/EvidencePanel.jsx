// frontend/src/components/evidence/EvidencePanel.jsx
// RF08 — Gestión de Evidencias Fotográficas

import { useEffect, useRef, useState } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const ACCEPTED = '.jpg,.jpeg,.png,.webp,.gif';

export default function EvidencePanel({ projectId }) {
  const { user } = useAuth();
  const [evidence, setEvidence] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError]       = useState('');
  const [preview, setPreview]   = useState(null);
  const fileRef = useRef();

  useEffect(() => { fetchEvidence(); }, [projectId]);

  async function fetchEvidence() {
    try {
      const { data } = await api.get(`/projects/${projectId}/evidence`);
      setEvidence(data);
    } catch (_) {}
    setLoading(false);
  }

  async function handleUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    setUploading(true);

    const formData = new FormData();
    formData.append('photo', file);

    try {
      await api.post(`/projects/${projectId}/evidence`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      fetchEvidence();
      if (fileRef.current) fileRef.current.value = '';
    } catch (err) {
      setError(err.response?.data?.error || 'Error al subir la imagen.');
    } finally {
      setUploading(false);
    }
  }

  const baseUrl = import.meta.env.VITE_API_URL || '';

  return (
    <div className="space-y-4">
      {/* Upload (solo operador) */}
      {user?.role === 'operador' && (
        <div className="card">
          <h3 className="font-semibold text-gray-700 mb-3">Subir evidencia fotográfica</h3>
          {error && (
            <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
          )}
          <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors">
            <span className="text-3xl mb-1">📷</span>
            <span className="text-sm text-gray-500">
              {uploading ? 'Subiendo...' : 'Toca para seleccionar una foto'}
            </span>
            <span className="text-xs text-gray-400 mt-0.5">JPG, PNG, WEBP, GIF — máx. 10 MB</span>
            <input
              ref={fileRef}
              type="file"
              accept={ACCEPTED}
              className="hidden"
              onChange={handleUpload}
              disabled={uploading}
            />
          </label>
        </div>
      )}

      {/* Galería */}
      <div className="card">
        <h3 className="font-semibold text-gray-700 mb-4">
          Evidencias ({evidence.length})
        </h3>
        {loading ? (
          <p className="text-center text-gray-400 py-6">Cargando...</p>
        ) : evidence.length === 0 ? (
          <p className="text-center text-gray-400 py-10">Sin evidencias registradas.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {evidence.map((ev) => (
              <div key={ev.id} className="group relative">
                <div
                  className="aspect-square rounded-lg overflow-hidden bg-gray-100 cursor-pointer"
                  onClick={() => setPreview(ev)}
                >
                  <img
                    src={`${baseUrl}${ev.url}`}
                    alt={ev.original_name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1 truncate">{ev.original_name}</p>
                <p className="text-xs text-gray-400">
                  {new Date(ev.uploaded_at).toLocaleDateString('es-CO')} · {ev.uploaded_by}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de preview */}
      {preview && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setPreview(null)}
        >
          <div className="max-w-3xl w-full" onClick={(e) => e.stopPropagation()}>
            <img
              src={`${baseUrl}${preview.url}`}
              alt={preview.original_name}
              className="w-full rounded-xl max-h-[80vh] object-contain"
            />
            <div className="text-white text-sm mt-3 flex justify-between">
              <span>{preview.original_name}</span>
              <span>
                {new Date(preview.uploaded_at).toLocaleString('es-CO')} · {preview.uploaded_by}
              </span>
            </div>
            <button
              onClick={() => setPreview(null)}
              className="mt-3 w-full text-center text-gray-300 hover:text-white text-sm"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
