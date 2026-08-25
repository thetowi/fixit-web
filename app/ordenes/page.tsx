"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { apiFetch, ApiError } from "@/lib/api";
import { obtenerUsuario } from "@/lib/auth";
import { Orden } from "@/types/ordenes";
import { CrearCalificacionRequest } from "@/types/calificaciones";

const ESTADO_LABELS: Record<string, string> = {
  PendientePago: "Pendiente de pago",
  Pagado: "Pagado",
  EnCurso: "En curso",
  Completado: "Completado",
  Cancelado: "Cancelado",
  EnDisputa: "En disputa",
};

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

  if (cargando) return <p className="p-6">Cargando...</p>;

  return (
    <div className="max-w-lg mx-auto mt-16 p-6">
      <h1 className="text-2xl font-bold mb-6">Mis órdenes</h1>

      {ordenCreadaId && (
        <p className="bg-green-50 text-green-700 text-sm rounded p-3 mb-4">
          ¡Listo! Tu solicitud fue creada. Un administrador debe confirmar el pago antes de continuar.
        </p>
      )}

      {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

      {ordenes.length === 0 && !error && (
        <p className="text-gray-500 text-sm">Todavía no tenés órdenes.</p>
      )}

      <ul className="flex flex-col gap-3">
        {ordenes.map((o) => {
          const esCliente = usuario?.rol === "Cliente";
          const esPrestador = usuario?.rol === "Prestador";

          return (
            <li key={o.id} className="border rounded p-3">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="font-medium">{o.categoriaNombre}</p>
                  <p className="text-sm text-gray-600">Con {o.prestadorNombreCompleto}</p>
                  <p className="text-sm text-gray-600">${o.montoTotal}</p>
                </div>
                <span className="text-xs bg-gray-100 rounded px-2 py-1 whitespace-nowrap">
                  {ESTADO_LABELS[o.estado] ?? o.estado}
                </span>
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                <Link href={`/ordenes/${o.id}/chat`} className="text-sm underline">
                  Abrir chat
                </Link>

                {esPrestador && o.estado === "Pagado" && (
                  <button
                    onClick={() => handleAccion(o.id, "iniciar")}
                    className="text-sm bg-black text-white rounded px-3 py-1"
                  >
                    Iniciar trabajo
                  </button>
                )}

                {esCliente && o.estado === "EnCurso" && (
                  <button
                    onClick={() => handleAccion(o.id, "completar")}
                    className="text-sm bg-black text-white rounded px-3 py-1"
                  >
                    Confirmar trabajo terminado
                  </button>
                )}

                {esCliente && o.estado === "Completado" && !o.yaCalificada && (
                  <button
                    onClick={() => setOrdenCalificando(o.id)}
                    className="text-sm border rounded px-3 py-1"
                  >
                    Calificar
                  </button>
                )}

                {o.yaCalificada && (
                  <span className="text-sm text-gray-400">Ya calificaste este trabajo</span>
                )}
              </div>

              {ordenCalificando === o.id && (
                <form onSubmit={handleEnviarCalificacion} className="mt-3 border-t pt-3 flex flex-col gap-2">
                  <label className="text-sm text-gray-600">
                    Puntuación
                    <select
                      className="border rounded p-2 w-full mt-1"
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
                    className="border rounded p-2"
                    value={comentario}
                    onChange={(e) => setComentario(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setOrdenCalificando(null)}
                      className="border rounded p-2 flex-1 text-sm"
                    >
                      Cancelar
                    </button>
                    <button type="submit" className="bg-black text-white rounded p-2 flex-1 text-sm">
                      Enviar calificación
                    </button>
                  </div>
                </form>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}