"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import { Orden } from "@/types/ordenes";

const ESTADO_LABELS: Record<string, string> = {
  PendientePago: "Pendiente de pago",
  Pagado: "Pagado",
  Aceptada: "Aceptada",
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

  if (cargando) return <p className="text-ink-muted">Cargando...</p>;

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
            Pagos pendientes de transferir <span className="text-ink-muted font-normal">({pendientesTransferencia.length})</span>
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
                    {g.nombre} {g.dia === hoy && <span className="text-copper-text text-xs font-semibold ml-1">· Hoy</span>}
                  </p>
                  <p className="text-xs text-ink-muted">
                    {g.cbu && g.alias ? (
                      <>
                        CBU <span className="font-mono">{g.cbu}</span> · alias <span className="font-mono">{g.alias}</span> ({g.titular})
                      </>
                    ) : (
                      <span className="text-safety-text">Todavía no cargó sus datos de cobro completos</span>
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
        <span className="text-xs text-ink-muted">
          {ordenesFiltradas.length} de {ordenes.length}
        </span>
      </div>

      <div className="bg-surface border border-ink/10 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left bg-ink/5 text-ink-muted text-xs uppercase tracking-wide">
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
                <td colSpan={7} className="p-3 text-ink-muted text-center">
                  No hay órdenes que coincidan con esa búsqueda.
                </td>
              </tr>
            )}
            {ordenesFiltradas.map((o) => {
              const expandida = ordenExpandidaId === o.id;
              const tieneDetalle = Boolean(o.pagoEstado || o.estado === "EnDisputa" || o.disputaResueltaEn);
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
                            : "bg-ink/10 text-ink-muted"
                        }`}
                      >
                        {ESTADO_LABELS[o.estado] ?? o.estado}
                      </span>
                    </td>
                    <td className="p-3 text-xs font-mono text-ink-muted uppercase">{o.pagoEstado ?? "—"}</td>
                    <td className="p-3 text-ink-muted text-xs whitespace-nowrap">
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
                        {/* Resolución de disputas del modo Directo (27/10) */}
                        {o.estado === "EnDisputa" && (
                          <ResolverDisputaPanel orden={o} onResuelta={cargarDatos} onError={setError} />
                        )}
                        {o.disputaResueltaEn && (
                          <p className="text-xs text-ink-muted mb-2">
                            Disputa resuelta el {new Date(o.disputaResueltaEn).toLocaleString("es-AR")} a favor{" "}
                            {o.disputaResolucion === "Prestador" ? "del prestador" : "del cliente"} · quedó{" "}
                            {o.estado === "Completado" ? "completada" : "cancelada"}
                            {o.disputaNotaAdmin && <> · Nota: “{o.disputaNotaAdmin}”</>}
                          </p>
                        )}

                        {/* Modelo de retención (23/09) */}
                        {o.pagoEstado && (
                          <div className="flex justify-between items-center gap-2 flex-wrap">
                            <div className="text-xs text-ink-muted">
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
                                    <span className="text-safety-text">Este prestador todavía no cargó sus datos de cobro completos (CBU + alias).</span>
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

// Resolución de disputas del modo Directo (27/10). Sirve para "Hubo un problema" (lo reporta el
// cliente) y "El cliente no estaba" (lo reporta el prestador). No mueve plata: decide el estado
// final de la orden, si se le cobra al prestador el cargo por trabajo y la nota que ven los dos.
function ResolverDisputaPanel({
  orden,
  onResuelta,
  onError,
}: {
  orden: Orden;
  onResuelta: () => Promise<void> | void;
  onError: (msg: string | null) => void;
}) {
  const origen = orden.inasistenciaClienteReportadaEn ? "inasistencia" : "problema";
  // Punto de partida razonable según quién reportó: el prestador dice que fue y el cliente no
  // estaba → el trabajo no se hizo; el cliente reporta un problema → el trabajo se hizo, mal o a medias.
  const [aFavorDe, setAFavorDe] = useState<"Cliente" | "Prestador">("Cliente");
  const [trabajoRealizado, setTrabajoRealizado] = useState(origen === "problema");
  const [cobrarCargo, setCobrarCargo] = useState(false);
  const [nota, setNota] = useState("");
  const [enviando, setEnviando] = useState(false);

  const reportadoEn = orden.inasistenciaClienteReportadaEn ?? orden.problemaClienteReportadoEn;
  const comentario = orden.inasistenciaClienteComentario ?? orden.problemaClienteComentario;

  async function resolver() {
    const resumen =
      `A favor ${aFavorDe === "Prestador" ? "del prestador" : "del cliente"}. ` +
      `La orden queda ${trabajoRealizado ? "completada" : "cancelada"}` +
      (trabajoRealizado ? (cobrarCargo ? " y se registra el cargo al prestador." : " sin cargo al prestador.") : ".") +
      " Les llega un aviso a los dos. ¿Confirmás?";
    if (!window.confirm(resumen)) return;
    setEnviando(true);
    onError(null);
    try {
      await apiFetch(`/api/ordenes/${orden.id}/resolver-disputa`, {
        method: "PUT",
        body: JSON.stringify({
          aFavorDe,
          trabajoRealizado,
          cobrarCargo: trabajoRealizado && cobrarCargo,
          nota: nota.trim() || undefined,
        }),
      });
      await onResuelta();
    } catch (err) {
      onError(err instanceof ApiError ? err.message : "Error al resolver la disputa");
    } finally {
      setEnviando(false);
    }
  }

  const opcion = (activo: boolean) =>
    `text-xs rounded px-2 py-1 border transition-colors ${
      activo ? "bg-ink text-paper border-ink" : "border-ink/20 text-ink/70 hover:bg-ink/5"
    }`;

  return (
    <div className="bg-safety/5 border border-safety/30 rounded-lg p-3 flex flex-col gap-3 mb-2" onClick={(e) => e.stopPropagation()}>
      <div className="text-xs text-ink/70 flex flex-col gap-1">
        <p>
          <span className="font-medium text-safety-text">
            {origen === "inasistencia" ? "El prestador reportó que el cliente no estaba" : "El cliente reportó un problema con el trabajo"}
          </span>
          {reportadoEn && <> · {new Date(reportadoEn).toLocaleString("es-AR")}</>}
        </p>
        {comentario && <p>Comentario: “{comentario}”</p>}
        <p>
          Cliente: <span className="text-ink">{orden.clienteNombreCompleto || "—"}</span> · Prestador:{" "}
          <span className="text-ink">{orden.prestadorNombreCompleto}</span>
        </p>
        {orden.descripcion && <p>Trabajo: {orden.descripcion}</p>}
        <p className="text-ink-muted">
          {orden.checkInEn
            ? `Marcó "Llegué" el ${new Date(orden.checkInEn).toLocaleString("es-AR")}${
                orden.checkInDistanciaMetros != null ? ` a ${orden.checkInDistanciaMetros} m del domicilio` : ""
              }.`
            : 'No marcó "Llegué".'}
          {orden.terminadoPorPrestadorEn && ` Tocó "Terminé" el ${new Date(orden.terminadoPorPrestadorEn).toLocaleString("es-AR")}.`}
        </p>
        <p className="text-ink-muted">Antes de decidir, revisá el chat y, si hace falta, hablá con los dos.</p>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-ink-muted w-36">¿A favor de quién?</span>
          <button type="button" className={opcion(aFavorDe === "Cliente")} onClick={() => setAFavorDe("Cliente")}>
            Cliente
          </button>
          <button type="button" className={opcion(aFavorDe === "Prestador")} onClick={() => setAFavorDe("Prestador")}>
            Prestador
          </button>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-ink-muted w-36">¿Se hizo el trabajo?</span>
          <button type="button" className={opcion(trabajoRealizado)} onClick={() => setTrabajoRealizado(true)}>
            Sí, queda completado
          </button>
          <button
            type="button"
            className={opcion(!trabajoRealizado)}
            onClick={() => {
              setTrabajoRealizado(false);
              setCobrarCargo(false);
            }}
          >
            No, se cancela
          </button>
        </div>
        {trabajoRealizado && (
          <label className="flex items-center gap-2 text-xs text-ink/80">
            <input type="checkbox" checked={cobrarCargo} onChange={(e) => setCobrarCargo(e.target.checked)} />
            Cobrarle al prestador el cargo por trabajo (si es fundador o ya llegó al tope, no suma)
          </label>
        )}
        <textarea
          value={nota}
          onChange={(e) => setNota(e.target.value)}
          rows={2}
          maxLength={500}
          placeholder="Nota para el cliente y el prestador: qué se decidió y por qué (la ven los dos)"
          className="text-xs w-full rounded border border-ink/20 bg-paper text-ink p-2"
        />
      </div>

      <div>
        <button
          type="button"
          onClick={resolver}
          disabled={enviando}
          className="text-xs bg-ink text-paper rounded px-3 py-1.5 hover:bg-ink/80 transition-colors disabled:opacity-50"
        >
          {enviando ? "Resolviendo…" : "Resolver disputa"}
        </button>
      </div>
    </div>
  );
}
