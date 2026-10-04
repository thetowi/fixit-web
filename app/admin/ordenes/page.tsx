"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import { Orden } from "@/types/ordenes";

const ESTADO_LABELS: Record<string, string> = {
  PendientePago: "Pendiente de pago",
  Pagado: "Pagado",
  EnCurso: "En curso",
  Completado: "Completado",
  Cancelado: "Cancelado",
  EnDisputa: "En disputa",
};

const ESTADOS_FILTRO = ["Todos", ...Object.keys(ESTADO_LABELS)] as const;

// 0 = Domingo ... 6 = Sábado, mismo orden que devuelve el backend (DayOfWeek de .NET).
const DIAS_SEMANA = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

export default function AdminOrdenesPage() {
  const [ordenes, setOrdenes] = useState<Orden[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState<typeof ESTADOS_FILTRO[number]>("Todos");
  const [procesandoOrdenId, setProcesandoOrdenId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [ordenExpandidaId, setOrdenExpandidaId] = useState<string | null>(null);

  useEffect(() => {
    cargarDatos();
  }, []);

  async function cargarDatos() {
    try {
      const ords = await apiFetch<Orden[]>("/api/admin/ordenes");
      setOrdenes(ords);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error al cargar las órdenes");
    } finally {
      setCargando(false);
    }
  }

  async function handleMarcarPagada(ordenId: string) {
    try {
      await apiFetch(`/api/ordenes/${ordenId}/marcar-pagada`, { method: "PUT" });
      await cargarDatos();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error al marcar como pagada");
    }
  }

  async function handleReembolsarOrden(ordenId: string) {
    const motivo = window.prompt("Motivo del reembolso (obligatorio):");
    if (!motivo || !motivo.trim()) return;
    setProcesandoOrdenId(ordenId);
    try {
      await apiFetch(`/api/ordenes/${ordenId}/reembolsar`, {
        method: "PUT",
        body: JSON.stringify({ motivo: motivo.trim() }),
      });
      await cargarDatos();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error al reembolsar la orden");
    } finally {
      setProcesandoOrdenId(null);
    }
  }

  async function handleMarcarTransferidoPrestador(ordenId: string) {
    if (!window.confirm("¿Confirmás que ya hiciste la transferencia real (CBU/alias) al prestador?")) return;
    setProcesandoOrdenId(ordenId);
    try {
      await apiFetch(`/api/ordenes/${ordenId}/marcar-transferido-prestador`, { method: "PUT" });
      await cargarDatos();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error al marcar la transferencia");
    } finally {
      setProcesandoOrdenId(null);
    }
  }

  async function handleResolverInasistenciaPrestador(ordenId: string) {
    if (
      !window.confirm(
        "¿Confirmás que le das la razón al prestador y liberás el pago retenido, sin poder verificar si realmente se presentó en el domicilio?"
      )
    )
      return;
    const notaAdmin = window.prompt("Nota interna sobre la resolución (opcional):") ?? undefined;
    setProcesandoOrdenId(ordenId);
    try {
      await apiFetch(`/api/ordenes/${ordenId}/resolver-inasistencia-pagar-prestador`, {
        method: "PUT",
        body: JSON.stringify({ notaAdmin: notaAdmin?.trim() || undefined }),
      });
      await cargarDatos();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error al resolver la disputa");
    } finally {
      setProcesandoOrdenId(null);
    }
  }

  const pendientesTransferencia = useMemo(
    () => ordenes.filter((o) => o.pagoEstado === "Liberado" && !o.transferenciaPrestadorConfirmadaEn),
    [ordenes]
  );

  const resumenTransferencias = useMemo(() => {
    const hoy = new Date().getDay();
    const porPrestador = new Map<
      string,
      { nombre: string; cbu: string | null; alias: string | null; titular: string | null; dia: number | null; total: number; cantidad: number }
    >();
    for (const o of pendientesTransferencia) {
      const existente = porPrestador.get(o.prestadorId);
      const monto = o.montoATransferirPrestador ?? 0;
      if (existente) {
        existente.total += monto;
        existente.cantidad += 1;
      } else {
        porPrestador.set(o.prestadorId, {
          nombre: o.prestadorNombreCompleto,
          cbu: o.prestadorCbu ?? null,
          alias: o.prestadorAlias ?? null,
          titular: o.prestadorTitularCuentaCobro ?? null,
          dia: o.prestadorDiaPreferidoDeCobro ?? null,
          total: monto,
          cantidad: 1,
        });
      }
    }
    return Array.from(porPrestador.values()).sort((a, b) => {
      const aHoy = a.dia === hoy ? 0 : 1;
      const bHoy = b.dia === hoy ? 0 : 1;
      return aHoy - bHoy;
    });
  }, [pendientesTransferencia]);

  if (cargando) return <p className="text-ink/60">Cargando...</p>;

  const hoy = new Date().getDay();

  const ordenesFiltradas = ordenes.filter((o) => {
    const coincideBusqueda =
      busqueda.trim() === "" ||
      o.prestadorNombreCompleto.toLowerCase().includes(busqueda.trim().toLowerCase()) ||
      o.categoriaNombre.toLowerCase().includes(busqueda.trim().toLowerCase());
    const coincideEstado = filtroEstado === "Todos" || o.estado === filtroEstado;
    return coincideBusqueda && coincideEstado;
  });

  return (
    <>
      {error && <p className="text-red-700 dark:text-red-400 text-sm mb-4">{error}</p>}

      {/* Resumen de transferencias pendientes (29/09) — agrupado por prestador, para no tener que
          sumar a mano orden por orden. Ver claude/backlog.md sobre por qué esto sigue siendo manual. */}
      {resumenTransferencias.length > 0 && (
        <div className="bg-surface border border-copper/30 rounded-lg p-4 mb-4">
          <p className="font-medium text-ink mb-3">
            Pagos pendientes de transferir <span className="text-ink/40 font-normal">({pendientesTransferencia.length})</span>
          </p>
          <ul className="flex flex-col gap-2">
            {resumenTransferencias.map((g) => (
              <li
                key={g.nombre + g.cbu}
                className={`rounded-lg p-3 flex justify-between items-center gap-3 flex-wrap ${
                  g.dia === hoy ? "bg-copper/10 border border-copper/40" : "bg-paper border border-ink/10"
                }`}
              >
                <div>
                  <p className="text-sm text-ink font-medium">
                    {g.nombre} {g.dia === hoy && <span className="text-copper text-xs font-semibold ml-1">· Hoy</span>}
                  </p>
                  <p className="text-xs text-ink/60">
                    {g.cbu && g.alias ? (
                      <>
                        CBU <span className="font-mono">{g.cbu}</span> · alias <span className="font-mono">{g.alias}</span> ({g.titular})
                      </>
                    ) : (
                      <span className="text-safety">Todavía no cargó sus datos de cobro completos</span>
                    )}
                    {g.dia !== null && <> · Prefiere cobrar los {DIAS_SEMANA[g.dia]}</>}
                  </p>
                </div>
                <p className="text-sm font-mono text-ink whitespace-nowrap">
                  ${g.total.toLocaleString("es-AR")} · {g.cantidad} {g.cantidad === 1 ? "trabajo" : "trabajos"}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex gap-3 mb-4 flex-wrap items-center">
        <input
          type="text"
          placeholder="Buscar por prestador o rubro..."
          className="border border-ink/20 rounded p-2 bg-paper text-sm flex-1 min-w-[220px]"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
        <select
          className="border border-ink/20 rounded p-2 bg-paper text-sm"
          value={filtroEstado}
          onChange={(e) => setFiltroEstado(e.target.value as typeof filtroEstado)}
        >
          {ESTADOS_FILTRO.map((e) => (
            <option key={e} value={e}>
              {e === "Todos" ? "Todos los estados" : ESTADO_LABELS[e] ?? e}
            </option>
          ))}
        </select>
        <span className="text-xs text-ink/40">
          {ordenesFiltradas.length} de {ordenes.length}
        </span>
      </div>

      <div className="bg-surface border border-ink/10 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left bg-ink/5 text-ink/60 text-xs uppercase tracking-wide">
              <th className="p-3 font-medium">Rubro</th>
              <th className="p-3 font-medium">Prestador</th>
              <th className="p-3 font-medium">Monto</th>
              <th className="p-3 font-medium">Estado</th>
              <th className="p-3 font-medium">Pago</th>
              <th className="p-3 font-medium">Fecha</th>
              <th className="p-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {ordenesFiltradas.length === 0 && (
              <tr>
                <td colSpan={7} className="p-3 text-ink/50 text-center">
                  No hay órdenes que coincidan con esa búsqueda.
                </td>
              </tr>
            )}
            {ordenesFiltradas.map((o) => {
              const expandida = ordenExpandidaId === o.id;
              const tieneDetalle = Boolean(
                o.pagoEstado ||
                  (o.estado === "EnDisputa" && o.inasistenciaClienteReportadaEn && !o.inasistenciaResueltaEn)
              );
              return (
                <Fragment key={o.id}>
                  <tr
                    className={`border-t border-ink/10 ${tieneDetalle ? "cursor-pointer hover:bg-ink/5" : ""}`}
                    onClick={() => tieneDetalle && setOrdenExpandidaId(expandida ? null : o.id)}
                  >
                    <td className="p-3 text-ink font-medium">{o.categoriaNombre}</td>
                    <td className="p-3 text-ink/70">{o.prestadorNombreCompleto}</td>
                    <td className="p-3 font-mono text-ink/80">${o.montoTotal.toLocaleString("es-AR")}</td>
                    <td className="p-3">
                      <span
                        className={`text-xs font-mono uppercase rounded-full px-2 py-0.5 ${
                          o.estado === "EnDisputa"
                            ? "bg-safety/20 text-ink"
                            : o.estado === "Cancelado"
                            ? "bg-red-700/10 dark:bg-red-400/10 text-red-700 dark:text-red-400"
                            : o.estado === "Completado"
                            ? "bg-stamp/15 text-stamp"
                            : "bg-ink/10 text-ink/60"
                        }`}
                      >
                        {ESTADO_LABELS[o.estado] ?? o.estado}
                      </span>
                    </td>
                    <td className="p-3 text-xs font-mono text-ink/60 uppercase">{o.pagoEstado ?? "—"}</td>
                    <td className="p-3 text-ink/50 text-xs whitespace-nowrap">
                      {new Date(o.creadoEn).toLocaleDateString("es-AR")}
                    </td>
                    <td className="p-3 text-right">
                      {o.estado === "PendientePago" && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMarcarPagada(o.id);
                          }}
                          className="text-xs bg-ink text-paper rounded px-2 py-1 whitespace-nowrap hover:bg-ink/80 transition-colors"
                        >
                          Marcar pagada
                        </button>
                      )}
                      {tieneDetalle && <span className="text-ink/30 text-xs ml-2">{expandida ? "▲" : "▼"}</span>}
                    </td>
                  </tr>
                  {expandida && tieneDetalle && (
                    <tr className="border-t border-ink/5 bg-paper/50">
                      <td colSpan={7} className="p-3">
                        {/* Inasistencia del cliente (28/09) */}
                        {o.estado === "EnDisputa" && o.inasistenciaClienteReportadaEn && !o.inasistenciaResueltaEn && (
                          <div className="bg-safety/5 border border-safety/30 rounded-lg p-3 flex flex-col gap-2 mb-2">
                            <p className="text-xs text-ink/70">
                              <span className="font-medium text-safety">Disputa por inasistencia del cliente</span> — reportada el{" "}
                              {new Date(o.inasistenciaClienteReportadaEn).toLocaleString("es-AR")}.
                              {o.inasistenciaClienteComentario && <> Comentario del prestador: “{o.inasistenciaClienteComentario}”.</>}
                            </p>
                            <p className="text-xs text-ink/50">
                              No hay forma de verificar desde el sistema si el prestador realmente se presentó o no — elegí a
                              quién le das la razón según lo que puedas averiguar por fuera (chat, llamada, etc.).
                            </p>
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleResolverInasistenciaPrestador(o.id)}
                                disabled={procesandoOrdenId === o.id}
                                className="text-xs bg-stamp text-paper rounded px-2 py-1 hover:opacity-90 transition-colors disabled:opacity-50"
                              >
                                Dar la razón al prestador (pagarle)
                              </button>
                              {o.pagoEstado === "Retenido" && (
                                <button
                                  onClick={() => handleReembolsarOrden(o.id)}
                                  disabled={procesandoOrdenId === o.id}
                                  className="text-xs border border-red-700/40 text-red-700 dark:text-red-400 rounded px-2 py-1 hover:bg-red-700/10 transition-colors disabled:opacity-50"
                                >
                                  Dar la razón al cliente (reembolsar)
                                </button>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Modelo de retención (23/09) */}
                        {o.pagoEstado && (
                          <div className="flex justify-between items-center gap-2 flex-wrap">
                            <div className="text-xs text-ink/60">
                              <p>
                                Pago: <span className="font-mono uppercase">{o.pagoEstado}</span>
                                {o.pagoEstado !== "Reembolsado" && (
                                  <> · A transferir al prestador: <span className="font-mono">${o.montoATransferirPrestador?.toLocaleString("es-AR")}</span></>
                                )}
                              </p>
                              {o.transferenciaPrestadorConfirmadaEn && (
                                <p className="text-stamp">
                                  Transferido el {new Date(o.transferenciaPrestadorConfirmadaEn).toLocaleString("es-AR")}
                                </p>
                              )}
                              {o.motivoReembolso && <p>Motivo del reembolso: {o.motivoReembolso}</p>}
                              {o.pagoEstado === "Liberado" && !o.transferenciaPrestadorConfirmadaEn && (
                                <p className="mt-1">
                                  {o.prestadorCbu && o.prestadorAlias ? (
                                    <>
                                      Transferir a CBU <span className="font-mono">{o.prestadorCbu}</span> / alias{" "}
                                      <span className="font-mono">{o.prestadorAlias}</span> ({o.prestadorTitularCuentaCobro})
                                      {o.prestadorDiaPreferidoDeCobro !== null && o.prestadorDiaPreferidoDeCobro !== undefined && (
                                        <> · Prefiere cobrar los {DIAS_SEMANA[o.prestadorDiaPreferidoDeCobro]}</>
                                      )}
                                    </>
                                  ) : (
                                    <span className="text-safety">Este prestador todavía no cargó sus datos de cobro completos (CBU + alias).</span>
                                  )}
                                </p>
                              )}
                            </div>

                            <div className="flex gap-2">
                              {o.pagoEstado === "Retenido" && (
                                <button
                                  onClick={() => handleReembolsarOrden(o.id)}
                                  disabled={procesandoOrdenId === o.id}
                                  className="text-xs border border-red-700/40 text-red-700 dark:text-red-400 rounded px-2 py-1 hover:bg-red-700/10 transition-colors disabled:opacity-50"
                                >
                                  Reembolsar
                                </button>
                              )}
                              {o.pagoEstado === "Liberado" && !o.transferenciaPrestadorConfirmadaEn && (
                                <button
                                  onClick={() => handleMarcarTransferidoPrestador(o.id)}
                                  disabled={procesandoOrdenId === o.id}
                                  className="text-xs bg-stamp text-paper rounded px-2 py-1 hover:opacity-90 transition-colors disabled:opacity-50"
                                >
                                  Marcar transferido
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
