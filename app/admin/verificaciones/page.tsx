"use client";

import { useEffect, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import { VerificacionAdmin } from "@/types/verificacion";

export default function AdminVerificacionesPage() {
  const [verificaciones, setVerificaciones] = useState<VerificacionAdmin[]>([]);
  const [motivos, setMotivos] = useState<Record<string, string>>({});
  const [procesandoVerif, setProcesandoVerif] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    cargarDatos();
  }, []);

  async function cargarDatos() {
    try {
      const verifs = await apiFetch<VerificacionAdmin[]>("/api/admin/verificaciones");
      setVerificaciones(verifs);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error al cargar las verificaciones");
    } finally {
      setCargando(false);
    }
  }

  async function handleVerDocumento(usuarioId: string, documento: string) {
    try {
      const data = await apiFetch<{ url: string }>(`/api/admin/verificaciones/${usuarioId}/documento/${documento}`);
      window.open(data.url, "_blank");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error al abrir el documento");
    }
  }

  async function handleRevisarVerificacion(usuarioId: string, aprobar: boolean) {
    const motivoRechazo = motivos[usuarioId]?.trim();
    if (!aprobar && !motivoRechazo) {
      setError("Indicá un motivo de rechazo.");
      return;
    }

    setProcesandoVerif(usuarioId);
    try {
      await apiFetch(`/api/admin/verificaciones/${usuarioId}`, {
        method: "PUT",
        body: JSON.stringify({ aprobar, motivoRechazo: aprobar ? null : motivoRechazo }),
      });
      setMotivos((prev) => ({ ...prev, [usuarioId]: "" }));
      setError(null);
      await cargarDatos();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error al procesar la verificación");
    } finally {
      setProcesandoVerif(null);
    }
  }

  if (cargando) return <p className="text-ink/60">Cargando...</p>;

  return (
    <>
      {error && <p className="text-red-700 dark:text-red-400 text-sm mb-4">{error}</p>}

      <ul className="flex flex-col gap-3">
        {verificaciones.length === 0 && (
          <p className="text-ink/50 text-sm">No hay verificaciones enviadas todavía.</p>
        )}
        {verificaciones.map((v) => (
          <li key={v.usuarioId} className="bg-surface border border-ink/10 rounded-lg p-4">
            <div className="flex justify-between items-start gap-2 mb-3">
              <div>
                <p className="font-medium text-ink">{v.nombreCompleto}</p>
                <p className="text-xs text-ink/50">
                  {v.email}
                  {v.dniNumero ? ` · DNI ${v.dniNumero}` : ""}
                </p>
              </div>
              <span
                className={`text-xs font-mono uppercase rounded-full px-2 py-0.5 shrink-0 ${
                  v.estado === "Pendiente"
                    ? "bg-safety/20 text-ink"
                    : v.estado === "Aprobado"
                    ? "bg-stamp/15 text-stamp"
                    : "bg-red-700/10 dark:bg-red-400/10 text-red-700 dark:text-red-400"
                }`}
              >
                {v.estado}
              </span>
            </div>

            <div className="flex gap-2 mb-3 flex-wrap">
              <button
                onClick={() => handleVerDocumento(v.usuarioId, "dni")}
                className="text-xs text-copper hover:underline border border-copper/30 rounded px-2 py-1"
              >
                Ver DNI
              </button>
              <button
                onClick={() => handleVerDocumento(v.usuarioId, "antecedentes")}
                className="text-xs text-copper hover:underline border border-copper/30 rounded px-2 py-1"
              >
                Ver antecedentes
              </button>
            </div>

            {v.estado === "Pendiente" && (
              <div className="flex gap-2 items-center flex-wrap pt-3 border-t border-ink/10">
                <input
                  type="text"
                  placeholder="Motivo si vas a rechazar"
                  className="border border-ink/20 rounded p-1.5 text-sm flex-1 min-w-[180px] bg-paper"
                  value={motivos[v.usuarioId] ?? ""}
                  onChange={(e) => setMotivos((prev) => ({ ...prev, [v.usuarioId]: e.target.value }))}
                />
                <button
                  onClick={() => handleRevisarVerificacion(v.usuarioId, true)}
                  disabled={procesandoVerif === v.usuarioId}
                  className="text-sm bg-stamp text-paper rounded px-3 py-1.5 hover:brightness-95 transition-all disabled:opacity-40"
                >
                  Aprobar
                </button>
                <button
                  onClick={() => handleRevisarVerificacion(v.usuarioId, false)}
                  disabled={procesandoVerif === v.usuarioId}
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
