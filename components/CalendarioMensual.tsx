"use client";

import { useState } from "react";
import { OrdenAgenda, formatoDistancia, formatoDuracion } from "@/types/agenda";
import { colorCategoria } from "@/lib/coloresCategoria";
import { linkGoogleMaps } from "@/lib/mapas";

const DIAS_CORTOS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const MAX_CHIPS_POR_DIA = 2;

function fechaHoyEsIgual(a: Date, b: Date): boolean {
  return a.toDateString() === b.toDateString();
}

// Apellido (o la última palabra del nombre) para el chip del mes, que tiene muy poco lugar —
// mostrar el nombre completo lo cortaría de una forma poco prolija.
function nombreCorto(nombreCompleto: string): string {
  const partes = nombreCompleto.trim().split(/\s+/);
  return partes[partes.length - 1] || nombreCompleto;
}

interface CeldaMes {
  fecha: Date;
  numero: number;
  esOtroMes: boolean;
  esHoy: boolean;
  turnos: OrdenAgenda[];
  restantes: number;
  tieneTurnos: boolean;
}

export default function CalendarioMensual({
  mesBase,
  ordenes,
  onSeleccionarDia,
}: {
  mesBase: Date;
  ordenes: OrdenAgenda[];
  onSeleccionarDia?: (dia: Date) => void;
}) {
  const hoy = new Date();
  const anio = mesBase.getFullYear();
  const mes = mesBase.getMonth();

  // Día cuyos trabajos se están mostrando en el detalle (si tiene turnos, tocarlo abre esto en
  // vez de saltar a la semana — ver todos los trabajos del día debe poder hacerse sin salir del mes).
  const [diaDetalle, setDiaDetalle] = useState<Date | null>(null);

  const primerDiaMes = new Date(anio, mes, 1);
  const ultimoDiaMes = new Date(anio, mes + 1, 0);

  const inicioGrilla = new Date(primerDiaMes);
  inicioGrilla.setDate(inicioGrilla.getDate() - inicioGrilla.getDay());
  const finGrilla = new Date(ultimoDiaMes);
  finGrilla.setDate(finGrilla.getDate() + (6 - finGrilla.getDay()));

  function turnosDelDia(dia: Date): OrdenAgenda[] {
    return ordenes
      .filter((o) => o.fechaHoraProgramada && fechaHoyEsIgual(new Date(o.fechaHoraProgramada), dia))
      .sort((a, b) => new Date(a.fechaHoraProgramada!).getTime() - new Date(b.fechaHoraProgramada!).getTime());
  }

  const celdas: CeldaMes[] = [];
  for (let d = new Date(inicioGrilla); d <= finGrilla; d.setDate(d.getDate() + 1)) {
    const fecha = new Date(d);
    const turnosDia = turnosDelDia(fecha);
    celdas.push({
      fecha,
      numero: fecha.getDate(),
      esOtroMes: fecha.getMonth() !== mes,
      esHoy: fechaHoyEsIgual(fecha, hoy),
      turnos: turnosDia.slice(0, MAX_CHIPS_POR_DIA),
      restantes: Math.max(0, turnosDia.length - MAX_CHIPS_POR_DIA),
      tieneTurnos: turnosDia.length > 0,
    });
  }

  const semanas: CeldaMes[][] = [];
  for (let i = 0; i < celdas.length; i += 7) semanas.push(celdas.slice(i, i + 7));

  // Tocar un día con trabajos muestra el detalle acá mismo; un día vacío (si hay callback) salta
  // a la semana para poder agendar ahí.
  function manejarClickCelda(celda: CeldaMes) {
    if (celda.tieneTurnos) {
      setDiaDetalle(celda.fecha);
    } else if (onSeleccionarDia) {
      onSeleccionarDia(celda.fecha);
    }
  }

  const turnosDelDiaDetalle = diaDetalle ? turnosDelDia(diaDetalle) : [];

  return (
    <div>
      <div className="grid grid-cols-7 gap-px bg-ink/8 border border-ink/8 rounded-lg overflow-hidden">
        {DIAS_CORTOS.map((d) => (
          <div key={d} className="bg-paper text-center py-2 font-mono text-[10px] uppercase tracking-wide text-ink/40">
            {d}
          </div>
        ))}

        {semanas.map((semana, si) =>
          semana.map((celda, di) => {
            const clickeable = celda.tieneTurnos || !!onSeleccionarDia;
            return (
              <div
                key={`${si}-${di}`}
                onClick={clickeable ? () => manejarClickCelda(celda) : undefined}
                className={`bg-surface min-h-[86px] sm:min-h-[104px] p-1.5 ${
                  celda.esOtroMes ? "opacity-40" : ""
                } ${clickeable ? "cursor-pointer hover:bg-copper/[0.04] transition-colors" : ""}`}
              >
                <span
                  className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-semibold ${
                    celda.esHoy ? "bg-copper text-paper" : "text-ink"
                  }`}
                >
                  {celda.numero}
                </span>
                <div className="mt-1 flex flex-col gap-1">
                  {celda.turnos.map((t) => (
                    <div
                      key={t.id}
                      className="flex items-center gap-1.5 bg-paper rounded px-1.5 py-0.5 min-w-0"
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full shrink-0"
                        style={{ background: colorCategoria(t.categoriaNombre) }}
                      />
                      <span className="text-[10px] font-medium text-ink truncate">{nombreCorto(t.clienteNombreCompleto)}</span>
                    </div>
                  ))}
                  {celda.restantes > 0 && (
                    <span className="text-[9px] text-ink/40 pl-1.5">+{celda.restantes} más</span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
      {onSeleccionarDia && (
        <p className="text-xs text-ink/40 mt-3">Tocá un día para ver sus trabajos, o para programar uno nuevo si está libre.</p>
      )}

      {diaDetalle && (
        <div
          onClick={() => setDiaDetalle(null)}
          className="fixed inset-0 bg-ink/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-surface border border-ink/10 rounded-xl shadow-xl p-5 max-w-sm w-full max-h-[80vh] overflow-y-auto"
          >
            <div className="flex items-start justify-between gap-3 mb-4">
              <p className="font-display text-lg text-ink leading-tight capitalize">
                {diaDetalle.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" })}
              </p>
              <button
                onClick={() => setDiaDetalle(null)}
                className="text-ink/40 hover:text-ink shrink-0"
                aria-label="Cerrar"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2.5">
              {turnosDelDiaDetalle.map((orden) => {
                const color = colorCategoria(orden.categoriaNombre);
                return (
                  <div key={orden.id} style={{ borderLeftColor: color }} className="bg-paper border-l-4 rounded-lg p-3">
                    <p className="font-mono text-xs text-ink/45 mb-0.5">
                      {new Date(orden.fechaHoraProgramada!).toLocaleTimeString("es-AR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      {orden.duracionMinutos ? ` · ${formatoDuracion(orden.duracionMinutos)}` : ""}
                      {" · "}
                      {orden.categoriaNombre}
                    </p>
                    <p className="font-medium text-ink">{orden.clienteNombreCompleto}</p>
                    <p className="text-sm text-ink/55">{orden.descripcion || orden.categoriaNombre}</p>
                    {orden.clienteDireccion && (
                      <p className="text-xs text-ink/40 mt-0.5">
                        <a
                          href={linkGoogleMaps(orden.clienteDireccion, orden.clienteDireccionLat, orden.clienteDireccionLon)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline decoration-dotted hover:text-copper"
                        >
                          📍 {orden.clienteDireccion}
                        </a>
                        {orden.clienteDireccionVerificada && <span className="text-stamp"> ✓</span>}
                        {orden.clienteDistanciaKm != null && (
                          <span className="block text-ink/35">{formatoDistancia(orden.clienteDistanciaKm)}</span>
                        )}
                      </p>
                    )}
                    {orden.clienteTelefono && <p className="text-xs text-ink/40 mt-0.5">{orden.clienteTelefono}</p>}
                  </div>
                );
              })}
            </div>

            {onSeleccionarDia && (
              <button
                onClick={() => {
                  const dia = diaDetalle;
                  setDiaDetalle(null);
                  onSeleccionarDia(dia);
                }}
                className="mt-4 w-full text-center text-sm text-copper hover:underline"
              >
                Ver este día en la agenda semanal →
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
