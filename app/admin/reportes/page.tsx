"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import { ReporteMensual } from "@/types/admin";

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

function formatoPorcentaje(valor: number | null): string {
  if (valor === null) return "—";
  const signo = valor > 0 ? "+" : "";
  return `${signo}${valor.toLocaleString("es-AR")}%`;
}

function colorCrecimiento(valor: number | null): string {
  if (valor === null) return "text-ink/40";
  if (valor > 0) return "text-stamp";
  if (valor < 0) return "text-red-700 dark:text-red-400";
  return "text-ink/50";
}

// Tile de estadística simple (no es un gráfico — ver skill de dataviz, "a veces la respuesta no
// es un gráfico sino un stat tile"): el número grande es el dato, el "vs. mes anterior" es
// contexto secundario, nunca al revés.
function StatTile({
  titulo,
  valor,
  crecimiento,
  detalle,
}: {
  titulo: string;
  valor: string;
  crecimiento?: number | null;
  detalle?: string;
}) {
  return (
    <div className="bg-surface border border-ink/10 rounded-lg p-4 flex flex-col gap-1">
      <p className="text-xs text-ink/50 uppercase tracking-wide font-mono">{titulo}</p>
      <p className="font-display text-2xl text-ink">{valor}</p>
      <div className="flex items-center gap-2 text-xs">
        {crecimiento !== undefined && (
          <span className={colorCrecimiento(crecimiento)}>{formatoPorcentaje(crecimiento)} vs. mes anterior</span>
        )}
        {detalle && <span className="text-ink/40">{detalle}</span>}
      </div>
    </div>
  );
}

// Barra horizontal por criterio de valoración (escala 1-5). El criterio con el promedio más bajo
// del grupo se marca con un ícono + etiqueta de texto (nunca solo con color, ver skill de
// dataviz) — es justo el dato que el usuario pidió poder ver: "para ver qué está fallando".
function BarraCriterio({
  etiqueta,
  valor,
  esElMasBajo,
}: {
  etiqueta: string;
  valor: number | null;
  esElMasBajo: boolean;
}) {
  const porcentaje = valor !== null ? Math.max(0, Math.min(100, (valor / 5) * 100)) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-ink/60 w-24 shrink-0">{etiqueta}</span>
      <div className="flex-1 h-2 rounded-full bg-ink/10 overflow-hidden">
        <div
          className={`h-full rounded-full ${esElMasBajo ? "bg-safety" : "bg-copper"}`}
          style={{ width: `${porcentaje}%` }}
        />
      </div>
      <span className="text-xs font-mono text-ink/70 w-10 text-right">{valor !== null ? valor.toFixed(2) : "—"}</span>
      {esElMasBajo && valor !== null && (
        <span className="text-xs text-safety whitespace-nowrap">⚠ más bajo</span>
      )}
    </div>
  );
}

export default function AdminReportesPage() {
  const ahora = new Date();
  const [anio, setAnio] = useState(ahora.getFullYear());
  const [mes, setMes] = useState(ahora.getMonth() + 1);
  const [reporte, setReporte] = useState<ReporteMensual | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    cargarDatos(anio, mes);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anio, mes]);

  async function cargarDatos(a: number, m: number) {
    setCargando(true);
    try {
      const data = await apiFetch<ReporteMensual>(`/api/admin/reportes?anio=${a}&mes=${m}`);
      setReporte(data);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error al cargar el reporte");
    } finally {
      setCargando(false);
    }
  }

  function irAlMesAnterior() {
    if (mes === 1) {
      setMes(12);
      setAnio((a) => a - 1);
    } else {
      setMes((m) => m - 1);
    }
  }

  function irAlMesSiguiente() {
    if (mes === 12) {
      setMes(1);
      setAnio((a) => a + 1);
    } else {
      setMes((m) => m + 1);
    }
  }

  const esMesActual = anio === ahora.getFullYear() && mes === ahora.getMonth() + 1;

  const criterioMasBajoPrestador = useMemo(() => {
    if (!reporte) return null;
    const v = reporte.valoracionesPrestador;
    const entradas: [string, number | null][] = [
      ["puntualidad", v.puntualidad],
      ["calidad", v.calidad],
      ["precio", v.precio],
      ["comunicacion", v.comunicacion],
      ["limpieza", v.limpieza],
      ["garantia", v.garantia],
    ];
    const conValor = entradas.filter(([, val]) => val !== null) as [string, number][];
    if (conValor.length === 0) return null;
    return conValor.reduce((min, actual) => (actual[1] < min[1] ? actual : min))[0];
  }, [reporte]);

  const criterioMasBajoCliente = useMemo(() => {
    if (!reporte) return null;
    const v = reporte.valoracionesCliente;
    const entradas: [string, number | null][] = [
      ["puntualidad", v.puntualidad],
      ["comunicacion", v.comunicacion],
      ["trato", v.trato],
    ];
    const conValor = entradas.filter(([, val]) => val !== null) as [string, number][];
    if (conValor.length === 0) return null;
    return conValor.reduce((min, actual) => (actual[1] < min[1] ? actual : min))[0];
  }, [reporte]);

  return (
    <>
      {error && <p className="text-red-700 dark:text-red-400 text-sm mb-4">{error}</p>}

      <div className="flex items-center gap-3 mb-5">
        <button
          onClick={irAlMesAnterior}
          className="text-sm border border-ink/20 rounded px-2 py-1 text-ink/60 hover:text-ink hover:border-ink/40 transition-colors"
        >
          ← Anterior
        </button>
        <p className="font-display text-lg text-ink min-w-[180px] text-center">
          {MESES[mes - 1]} {anio}
        </p>
        <button
          onClick={irAlMesSiguiente}
          disabled={esMesActual}
          className="text-sm border border-ink/20 rounded px-2 py-1 text-ink/60 hover:text-ink hover:border-ink/40 transition-colors disabled:opacity-30 disabled:hover:border-ink/20"
        >
          Siguiente →
        </button>
      </div>

      {cargando || !reporte ? (
        <p className="text-ink/60">Cargando...</p>
      ) : (
        <div className="flex flex-col gap-6">
          {/* Crecimiento del mes elegido contra el anterior */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <StatTile
              titulo="Usuarios nuevos"
              valor={reporte.usuariosNuevosTotal.toLocaleString("es-AR")}
              crecimiento={reporte.crecimientoUsuariosPorcentaje}
              detalle={`${reporte.usuariosNuevosClientes} clientes · ${reporte.usuariosNuevosPrestadores} prestadores`}
            />
            <StatTile
              titulo="Órdenes creadas"
              valor={reporte.ordenesCreadas.toLocaleString("es-AR")}
              crecimiento={reporte.crecimientoOrdenesPorcentaje}
            />
            <StatTile
              titulo="Ingresos (completados)"
              valor={`$${reporte.ingresosTotales.toLocaleString("es-AR")}`}
              crecimiento={reporte.crecimientoIngresosPorcentaje}
              detalle={`comisión: $${reporte.comisionPlataforma.toLocaleString("es-AR")}`}
            />
          </div>

          {/* Estadísticas generales — acumulado histórico, no depende del mes elegido */}
          <div>
            <p className="text-xs text-ink/50 uppercase tracking-wide font-mono mb-2">Estadísticas generales</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatTile titulo="Total usuarios" valor={reporte.totalUsuarios.toLocaleString("es-AR")} />
              <StatTile titulo="Clientes" valor={reporte.totalClientes.toLocaleString("es-AR")} />
              <StatTile titulo="Prestadores" valor={reporte.totalPrestadores.toLocaleString("es-AR")} />
              <StatTile
                titulo="Órdenes completadas"
                valor={reporte.totalOrdenesCompletadasHistorico.toLocaleString("es-AR")}
                detalle={
                  reporte.porcentajeUsuariosNuevosSobreTotal !== null
                    ? `${reporte.porcentajeUsuariosNuevosSobreTotal}% de la base es nueva este mes`
                    : undefined
                }
              />
            </div>
          </div>

          {/* Valoraciones — los 2 tipos de reseña, desglosadas por criterio para ver qué anda mal */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-surface border border-ink/10 rounded-lg p-4">
              <div className="flex justify-between items-baseline mb-3">
                <p className="font-medium text-ink text-sm">Valoraciones a prestadores</p>
                <p className="text-xs text-ink/40">
                  {reporte.valoracionesPrestador.cantidad} reseña{reporte.valoracionesPrestador.cantidad === 1 ? "" : "s"} este mes
                </p>
              </div>
              {reporte.valoracionesPrestador.cantidad === 0 ? (
                <p className="text-ink/40 text-sm">No hubo reseñas de clientes a prestadores este mes.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="font-display text-xl text-ink">
                      {reporte.valoracionesPrestador.promedioGeneral?.toFixed(2)}
                    </span>
                    <span className="text-xs text-ink/50">promedio general (ponderado)</span>
                  </div>
                  <BarraCriterio etiqueta="Puntualidad" valor={reporte.valoracionesPrestador.puntualidad} esElMasBajo={criterioMasBajoPrestador === "puntualidad"} />
                  <BarraCriterio etiqueta="Calidad" valor={reporte.valoracionesPrestador.calidad} esElMasBajo={criterioMasBajoPrestador === "calidad"} />
                  <BarraCriterio etiqueta="Precio" valor={reporte.valoracionesPrestador.precio} esElMasBajo={criterioMasBajoPrestador === "precio"} />
                  <BarraCriterio etiqueta="Comunicación" valor={reporte.valoracionesPrestador.comunicacion} esElMasBajo={criterioMasBajoPrestador === "comunicacion"} />
                  <BarraCriterio etiqueta="Limpieza" valor={reporte.valoracionesPrestador.limpieza} esElMasBajo={criterioMasBajoPrestador === "limpieza"} />
                  <BarraCriterio etiqueta="Garantía" valor={reporte.valoracionesPrestador.garantia} esElMasBajo={criterioMasBajoPrestador === "garantia"} />
                </div>
              )}
            </div>

            <div className="bg-surface border border-ink/10 rounded-lg p-4">
              <div className="flex justify-between items-baseline mb-3">
                <p className="font-medium text-ink text-sm">Valoraciones a clientes</p>
                <p className="text-xs text-ink/40">
                  {reporte.valoracionesCliente.cantidad} reseña{reporte.valoracionesCliente.cantidad === 1 ? "" : "s"} este mes
                </p>
              </div>
              {reporte.valoracionesCliente.cantidad === 0 ? (
                <p className="text-ink/40 text-sm">No hubo reseñas de prestadores a clientes este mes.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="font-display text-xl text-ink">
                      {reporte.valoracionesCliente.promedioGeneral?.toFixed(2)}
                    </span>
                    <span className="text-xs text-ink/50">promedio general</span>
                  </div>
                  <BarraCriterio etiqueta="Puntualidad" valor={reporte.valoracionesCliente.puntualidad} esElMasBajo={criterioMasBajoCliente === "puntualidad"} />
                  <BarraCriterio etiqueta="Comunicación" valor={reporte.valoracionesCliente.comunicacion} esElMasBajo={criterioMasBajoCliente === "comunicacion"} />
                  <BarraCriterio etiqueta="Trato" valor={reporte.valoracionesCliente.trato} esElMasBajo={criterioMasBajoCliente === "trato"} />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
