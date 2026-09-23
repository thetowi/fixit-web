"use client";

import { useEffect, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import { GananciasResponse, PeriodoGanancias } from "@/types/ganancias";

const PERIODOS: { id: PeriodoGanancias; label: string }[] = [
  { id: "semana", label: "Semana" },
  { id: "mes", label: "Mes" },
  { id: "anio", label: "Año" },
];

function formatearMonto(monto: number): string {
  return monto.toLocaleString("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });
}

function formatearFecha(iso: string): string {
  return new Date(iso).toLocaleDateString("es-AR", { day: "numeric", month: "short" });
}

// Etiqueta del rango mostrado arriba del selector (ej. "15 – 21 sep 2026", "Septiembre 2026", "2026").
function etiquetaRango(datos: GananciasResponse): string {
  const inicio = new Date(datos.inicio);
  const fin = new Date(new Date(datos.fin).getTime() - 1);

  if (datos.periodo === "semana") {
    const mismoMes = inicio.getMonth() === fin.getMonth();
    const mesInicio = inicio.toLocaleDateString("es-AR", { month: "short" });
    const mesFin = fin.toLocaleDateString("es-AR", { month: "short" });
    return mismoMes
      ? `${inicio.getDate()} – ${fin.getDate()} ${mesInicio}`
      : `${inicio.getDate()} ${mesInicio} – ${fin.getDate()} ${mesFin}`;
  }
  if (datos.periodo === "mes") {
    const label = inicio.toLocaleDateString("es-AR", { month: "long", year: "numeric" });
    return label.charAt(0).toUpperCase() + label.slice(1);
  }
  return `${inicio.getFullYear()}`;
}

export default function GananciasSeccion() {
  const [periodo, setPeriodo] = useState<PeriodoGanancias>("semana");
  const [offset, setOffset] = useState(0);
  const [datos, setDatos] = useState<GananciasResponse | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [trabajoAbiertoId, setTrabajoAbiertoId] = useState<string | null>(null);

  useEffect(() => {
    setCargando(true);
    setError(null);
    apiFetch<GananciasResponse>(`/api/prestador/ganancias?periodo=${periodo}&offset=${offset}`)
      .then(setDatos)
      .catch((e) => setError(e instanceof ApiError ? e.message : "No pudimos cargar tus ganancias."))
      .finally(() => setCargando(false));
  }, [periodo, offset]);

  function cambiarPeriodo(nuevo: PeriodoGanancias) {
    setPeriodo(nuevo);
    setOffset(0);
  }

  const maxDesglose = datos ? Math.max(1, ...datos.desglose.map((d) => d.monto)) : 1;

  return (
    <div className="bg-surface border border-ink/10 rounded-lg p-5 mb-6" data-tour="cuenta-ganancias">
      <p className="font-medium text-ink mb-1">Ganancias</p>
      <p className="text-xs text-ink/50 mb-4">
        Lo que ganaste con tus trabajos completados, según el modelo de retención de FixIt.
      </p>

      {/* Selector de período */}
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <div className="flex gap-1 border border-dashed border-ink/20 rounded-lg p-1">
          {PERIODOS.map((p) => (
            <button
              key={p.id}
              onClick={() => cambiarPeriodo(p.id)}
              className={`text-sm rounded px-3 py-1 transition-colors ${
                periodo === p.id ? "bg-copper text-paper" : "text-ink/60 hover:text-ink"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setOffset((o) => o - 1)}
            className="text-ink/50 hover:text-ink px-2 py-1 border border-ink/10 rounded"
            aria-label="Período anterior"
          >
            ‹
          </button>
          <span className="text-sm font-mono text-ink/70 min-w-[9rem] text-center">
            {datos ? etiquetaRango(datos) : "..."}
          </span>
          <button
            onClick={() => setOffset((o) => Math.min(0, o + 1))}
            disabled={offset === 0}
            className="text-ink/50 hover:text-ink px-2 py-1 border border-ink/10 rounded disabled:opacity-30 disabled:hover:text-ink/50"
            aria-label="Período siguiente"
          >
            ›
          </button>
        </div>
      </div>

      {error && (
        <p className="text-red-700 dark:text-red-400 text-sm mb-4">{error}</p>
      )}

      {cargando && !datos && <p className="text-sm text-ink/40">Cargando...</p>}

      {datos && (
        <div className="flex flex-col gap-5">
          {/* Cards resumen */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="border border-ink/10 rounded-lg p-3">
              <p className="text-xs text-ink/50 mb-1">Total ganado</p>
              <p className="font-mono text-lg text-ink">{formatearMonto(datos.totalGanado)}</p>
              {datos.comparacionPorcentaje !== null && (
                <p className={`text-xs mt-1 ${datos.comparacionPorcentaje >= 0 ? "text-stamp" : "text-ink/50"}`}>
                  {datos.comparacionPorcentaje >= 0 ? "▲" : "▼"} {Math.abs(datos.comparacionPorcentaje)}% vs. período anterior
                </p>
              )}
            </div>
            <div className="border border-ink/10 rounded-lg p-3">
              <p className="text-xs text-ink/50 mb-1">Pendiente de cobro</p>
              <p className="font-mono text-lg text-safety">{formatearMonto(datos.totalPendiente)}</p>
              <p className="text-xs text-ink/50 mt-1">
                {datos.totalPendiente > 0
                  ? "Aprobado, esperando que un Admin te transfiera"
                  : "No tenés pagos pendientes de transferir"}
              </p>
            </div>
            <div className="border border-ink/10 rounded-lg p-3">
              <p className="text-xs text-ink/50 mb-1">Ya transferido</p>
              <p className="font-mono text-lg text-stamp">{formatearMonto(datos.totalTransferido)}</p>
              <p className="text-xs text-ink/50 mt-1">
                {datos.trabajosCompletados} trabajo{datos.trabajosCompletados === 1 ? "" : "s"} · promedio {formatearMonto(datos.promedioPorTrabajo)}
              </p>
            </div>
          </div>

          {/* Progreso hacia 10 trabajos gratis */}
          {datos.trabajosGratisRestantes > 0 && (
            <div className="border border-dashed border-ink/15 rounded-lg p-3">
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-xs text-ink/60">Trabajos sin comisión de FixIt</p>
                <p className="text-xs font-mono text-ink/70">
                  {datos.trabajosPagadosTotal}/10
                </p>
              </div>
              <div className="h-1.5 rounded-full bg-ink/10 overflow-hidden">
                <div
                  className="h-full bg-copper rounded-full transition-all"
                  style={{ width: `${Math.min(100, (datos.trabajosPagadosTotal / 10) * 100)}%` }}
                />
              </div>
              <p className="text-xs text-ink/50 mt-1.5">
                Te quedan {datos.trabajosGratisRestantes} trabajo{datos.trabajosGratisRestantes === 1 ? "" : "s"} antes de que empiece a aplicarse la comisión.
              </p>
            </div>
          )}

          {/* Desglose */}
          {datos.desglose.length > 0 && (
            <div>
              <p className="text-xs text-ink/50 mb-2">
                {datos.periodo === "semana" ? "Por día" : datos.periodo === "mes" ? "Por semana" : "Por mes"}
              </p>
              <div className="flex items-end gap-1.5" style={{ height: 90 }}>
                {datos.desglose.map((item, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center justify-end gap-1 h-full">
                    <div
                      className={`w-full rounded-t transition-all ${item.esPeriodoActual ? "bg-copper" : "bg-ink/15"}`}
                      style={{ height: `${Math.max(3, (item.monto / maxDesglose) * 100)}%` }}
                      title={formatearMonto(item.monto)}
                    />
                    <span className={`text-[10px] whitespace-nowrap ${item.esPeriodoActual ? "text-copper font-medium" : "text-ink/40"}`}>
                      {item.etiqueta}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Detalle trabajo por trabajo */}
          <div>
            <p className="text-xs text-ink/50 mb-2">
              Detalle {datos.periodo === "anio" ? "del año" : datos.periodo === "mes" ? "del mes" : "de la semana"}
            </p>

            {datos.trabajos.length === 0 ? (
              <p className="text-sm text-ink/40 border border-dashed border-ink/15 rounded-lg p-4 text-center">
                No completaste trabajos en este período.
              </p>
            ) : datos.periodo === "anio" ? (
              <div className="overflow-x-auto -mx-1">
                <table className="w-full text-sm min-w-[520px]">
                  <thead>
                    <tr className="text-left text-xs text-ink/40 border-b border-ink/10">
                      <th className="font-normal py-2 px-1">Fecha</th>
                      <th className="font-normal py-2 px-1">Rubro</th>
                      <th className="font-normal py-2 px-1">Cliente</th>
                      <th className="font-normal py-2 px-1 text-right">Neto</th>
                      <th className="font-normal py-2 px-1 text-right">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {datos.trabajos.map((t) => (
                      <tr key={t.ordenId} className="border-b border-ink/5 last:border-0">
                        <td className="py-2 px-1 font-mono text-xs text-ink/60">{formatearFecha(t.completadoEn)}</td>
                        <td className="py-2 px-1 text-ink/80">{t.categoriaNombre}</td>
                        <td className="py-2 px-1 text-ink/60">{t.clienteNombreCompleto}</td>
                        <td className="py-2 px-1 text-right font-mono text-ink">{formatearMonto(t.neto)}</td>
                        <td className="py-2 px-1 text-right">
                          <span className={`text-[10px] uppercase font-mono px-1.5 py-0.5 rounded ${t.estado === "Liquidado" ? "bg-stamp/10 text-stamp" : "bg-safety/10 text-safety"}`}>
                            {t.estado}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {datos.trabajos.map((t) => (
                  <button
                    key={t.ordenId}
                    onClick={() => setTrabajoAbiertoId(trabajoAbiertoId === t.ordenId ? null : t.ordenId)}
                    className="text-left border border-dashed border-ink/15 rounded-lg p-3 hover:border-ink/30 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm text-ink truncate">{t.categoriaNombre} · {t.clienteNombreCompleto}</p>
                        <p className="text-xs text-ink/40 font-mono">{formatearFecha(t.completadoEn)}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-mono text-sm text-ink">{formatearMonto(t.neto)}</p>
                        <span className={`text-[10px] uppercase font-mono ${t.estado === "Liquidado" ? "text-stamp" : "text-safety"}`}>
                          {t.estado}
                        </span>
                      </div>
                    </div>
                    {trabajoAbiertoId === t.ordenId && (
                      <div className="mt-2 pt-2 border-t border-ink/10 text-xs text-ink/60 flex flex-col gap-0.5">
                        <p>{t.descripcion}</p>
                        <p>Monto total: {formatearMonto(t.montoTotal)} · Comisión FixIt: {formatearMonto(t.comisionPlataforma)}</p>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
