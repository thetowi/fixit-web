"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api";
import { obtenerUsuario } from "@/lib/auth";
import { Orden } from "@/types/ordenes";
import { CrearCalificacionRequest } from "@/types/calificaciones";
import OrdenTicket from "@/components/OrdenTicket";

export default function OrdenesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const ordenCreadaId = searchParams.get("creada");

  const [ordenes, setOrdenes] = useState<Orden[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [ordenCalificando, setOrdenCalificando] = useState<string | null>(null);
  const [puntuacion, setPuntuacion] = useState(5);
  const [comentario, setComentario] = useState("");

  const usuario = obtenerUsuario();

  useEffect(() => {
    if (!usuario) {
      router.push("/login");
      return;
    }
    cargarOrdenes();
  }, [router]);

  async function cargarOrdenes() {
    try {
      const data = await apiFetch<Orden[]>("/api/ordenes/mias");
      setOrdenes(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error al cargar tus órdenes");
    } finally {
      setCargando(false);
    }
  }

  async function handleAccion(ordenId: string, accion: "iniciar" | "completar") {
    setError(null);
    try {
      await apiFetch(`/api/ordenes/${ordenId}/${accion}`, { method: "PUT" });
      await cargarOrdenes();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error al actualizar la orden");
    }
  }

  async function handleEnviarCalificacion(e: React.FormEvent) {
    e.preventDefault();
    if (!ordenCalificando) return;

    const body: CrearCalificacionRequest = { puntuacion, comentario: comentario || undefined };

    try {
      await apiFetch(`/api/ordenes/${ordenCalificando}/calificacion`, {
        method: "POST",
        body: JSON.stringify(body),
      });
      setOrdenCalificando(null);
      setPuntuacion(5);
      setComentario("");
      await cargarOrdenes();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error al enviar la calificación");
    }
  }

  if (cargando) return <p className="p-6 text-ink/60">Cargando...</p>;

  return (
    <div className="max-w-lg mx-auto mt-16 p-6 w-full">
      <h1 className="font-display text-2xl text-ink mb-6">Mis órdenes</h1>

      {ordenCreadaId && (
        <p className="bg-stamp/10 text-stamp text-sm rounded p-3 mb-4 border border-stamp/30">
          Tu solicitud fue creada. Un administrador debe confirmar el pago antes de continuar.
        </p>
      )}

      {error && <p className="text-red-700 text-sm mb-4">{error}</p>}

      {ordenes.length === 0 && !error && (
        <p className="text-ink/50 text-sm">Todavía no tenés órdenes.</p>
      )}

      <ul className="flex flex-col gap-4">
        {ordenes.map((o) => {
          const esCliente = usuario?.rol === "Cliente";
          const esPrestador = usuario?.rol === "Prestador";

          return (
            <li key={o.id}>
              <OrdenTicket orden={o}>
                <div className="flex items-center gap-3 flex-wrap">
                  {esPrestador && o.estado === "Pagado" && (
                    <button
                      onClick={() => handleAccion(o.id, "iniciar")}
                      className="text-sm bg-ink text-paper rounded px-3 py-1 hover:bg-ink/80 transition-colors"
                    >
                      Iniciar trabajo
                    </button>
                  )}

                  {esCliente && o.estado === "EnCurso" && (
                    <button
                      onClick={() => handleAccion(o.id, "completar")}
                      className="text-sm bg-ink text-paper rounded px-3 py-1 hover:bg-ink/80 transition-colors"
                    >
                      Confirmar trabajo terminado
                    </button>
                  )}

                  {esCliente && o.estado === "Completado" && !o.yaCalificada && (
                    <button
                      onClick={() => setOrdenCalificando(o.id)}
                      className="text-sm border border-ink/30 text-ink rounded px-3 py-1 hover:border-ink transition-colors"
                    >
                      Calificar
                    </button>
                  )}

                  {o.yaCalificada && (
                    <span className="text-sm text-ink/40">Ya calificaste este trabajo</span>
                  )}
                </div>

                {ordenCalificando === o.id && (
                  <form onSubmit={handleEnviarCalificacion} className="mt-3 pt-3 border-t border-ink/10 flex flex-col gap-2">
                    <label className="text-sm text-ink/70">
                      Puntuación
                      <select
                        className="border border-ink/20 rounded p-2 w-full mt-1 bg-paper"
                        value={puntuacion}
                        onChange={(e) => setPuntuacion(Number(e.target.value))}
                      >
                        {[5, 4, 3, 2, 1].map((n) => (
                          <option key={n} value={n}>
                            {"★".repeat(n)} ({n})
                          </option>
                        ))}
                      </select>
                    </label>
                    <textarea
                      placeholder="Comentario (opcional)"
                      className="border border-ink/20 rounded p-2 bg-paper"
                      value={comentario}
                      onChange={(e) => setComentario(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setOrdenCalificando(null)}
                        className="border border-ink/20 rounded p-2 flex-1 text-sm"
                      >
                        Cancelar
                      </button>
                      <button type="submit" className="bg-copper text-paper rounded p-2 flex-1 text-sm">
                        Enviar calificación
                      </button>
                    </div>
                  </form>
                )}
              </OrdenTicket>
            </li>
          );
        })}
      </ul>
    </div>
  );
}