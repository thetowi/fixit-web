"use client";

import { useEffect, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import { VerificacionCategoriaAdmin } from "@/types/verificacion";

export default function AdminMatriculasPage() {
  const [matriculas, setMatriculas] = useState<VerificacionCategoriaAdmin[]>([]);
  const [motivosMatricula, setMotivosMatricula] = useState<Record<number, string>>({});
  const [procesandoMatricula, setProcesandoMatricula] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    cargarDatos();
  }, []);

  async function cargarDatos() {
    try {
      const matrs = await apiFetch<VerificacionCategoriaAdmin[]>("/api/admin/matriculas");
      setMatriculas(matrs);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error al cargar las matrículas");
    } finally {
      setCargando(false);
    }
  }

  async function handleVerDocumentoMatricula(prestadorCategoriaId: number) {
    try {
      const data = await apiFetch<{ url: string }>(`/api/admin/matriculas/${prestadorCategoriaId}/documento`);
      window.open(data.url, "_blank");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error al abrir el documento");
    }
  }

  async function handleRevisarMatricula(prestadorCategoriaId: number, aprobar: boolean) {
    const motivoRechazo = motivosMatricula[prestadorCategoriaId]?.trim();
    if (!aprobar && !motivoRechazo) {
      setError("Indicá un motivo de rechazo.");
      return;
    }

    setProcesandoMatricula(prestadorCategoriaId);
    try {
      await apiFetch(`/api/admin/matriculas/${prestadorCategoriaId}`, {
        method: "PUT",
        body: JSON.stringify({ aprobar, motivoRechazo: aprobar ? null : motivoRechazo }),
      });
      setMotivosMatricula((prev) => ({ ...prev, [prestadorCategoriaId]: "" }));
      setError(null);
      await cargarDatos();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error al procesar la matrícula");
    } finally {
      setProcesandoMatricula(null);
    }
  }

  if (cargando) return <p className="text-ink/60">Cargando...</p>;

  return (
    <>
      {error && <p className="text-red-700 dark:text-red-400 text-sm mb-4">{error}</p>}

      <ul className="flex flex-col gap-3">
        {matriculas.length === 0 && (
          <p className="text-ink/50 text-sm">No hay matrículas enviadas todavía.</p>
        )}
        {matriculas.map((m) => (
          <li key={m.prestadorCategoriaId} className="bg-surface border border-ink/10 rounded-lg p-4">
            <div className="flex justify-between items-start gap-2 mb-3">
              <div>
                <p className="font-medium text-ink">
                  {m.nombreCompleto} <span className="text-ink/50 font-normal">· {m.categoriaNombre}</span>
                </p>
                <p className="text-xs text-ink/50">{m.email}</p>
              </div>
              <span
                className={`text-xs font-mono uppercase rounded-full px-2 py-0.5 shrink-0 ${
                  m.estado === "Pendiente"
                    ? "bg-safety/20 text-ink"
                    : m.estado === "Aprobado"
                    ? "bg-stamp/15 text-stamp"
                    : "bg-red-700/10 dark:bg-red-400/10 text-red-700 dark:text-red-400"
                }`}
              >
                {m.estado}
              </span>
            </div>

            <div className="flex gap-2 mb-3 flex-wrap">
              <button
                onClick={() => handleVerDocumentoMatricula(m.prestadorCategoriaId)}
                className="text-xs text-copper hover:underline border border-copper/30 rounded px-2 py-1"
              >
                Ver matrícula
              </button>
            </div>

            {m.estado === "Pendiente" && (
              <div className="flex gap-2 items-center flex-wrap pt-3 border-t border-ink/10">
                <input
                  type="text"
                  placeholder="Motivo si vas a rechazar"
                  className="border border-ink/20 rounded p-1.5 text-sm flex-1 min-w-[180px] bg-paper"
                  value={motivosMatricula[m.prestadorCategoriaId] ?? ""}
                  onChange={(e) =>
                    setMotivosMatricula((prev) => ({ ...prev, [m.prestadorCategoriaId]: e.target.value }))
                  }
                />
                <button
                  onClick={() => handleRevisarMatricula(m.prestadorCategoriaId, true)}
                  disabled={procesandoMatricula === m.prestadorCategoriaId}
                  className="text-sm bg-stamp text-paper rounded px-3 py-1.5 hover:brightness-95 transition-all disabled:opacity-40"
                >
                  Aprobar
                </button>
                <button
                  onClick={() => handleRevisarMatricula(m.prestadorCategoriaId, false)}
                  disabled={procesandoMatricula === m.prestadorCategoriaId}
                  className="text-sm border border-red-700/40 dark:border-red-400/40 text-red-700 dark:text-red-400 rounded px-3 py-1.5 hover:bg-red-700/5 dark:hover:bg-red-400/5 transition-colors disabled:opacity-40"
                >
                  Rechazar
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </>
  );
}
