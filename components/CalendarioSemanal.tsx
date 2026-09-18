"use client";

import { useState } from "react";
import { BloqueDisponibilidad, formatoDistancia, formatoDuracion, OrdenAgenda } from "@/types/agenda";
import { linkGoogleMaps } from "@/lib/mapas";

const DURACION_POR_DEFECTO = 60; // para turnos viejos que quedaron sin duracionMinutos cargado
import { ESTADO_COLOR } from "@/components/OrdenTicket";

const DIAS_CORTOS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const PASO_MINUTOS = 30;
const RANGO_POR_DEFECTO = { desde: 8 * 60, hasta: 20 * 60 }; // 8:00 a 20:00, si no hay disponibilidad cargada

function minutosDelString(hora: string): number {
  const [h, m] = hora.split(":").map(Number);
  return h * 60 + (m || 0);
}

function minutosDelDia(fecha: Date): number {
  return fecha.getHours() * 60 + fecha.getMinutes();
}

function formatoHora(minutos: number): string {
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function fechaHoyEsIgual(a: Date, b: Date): boolean {
  return a.toDateString() === b.toDateString();
}

// Código corto tipo "remito" para la etiqueta del turno: "Plomería" -> "PLOM"
function codigoCategoria(nombre: string): string {
  const sinAcentos = nombre
    .normalize("NFD")
    .replace(new RegExp("[\\u0300-\\u036f]", "g"), "");
  return sinAcentos.slice(0, 4).toUpperCase();
}

export default function CalendarioSemanal({
  inicioSemana,
  bloques,
  ordenes,
  onCeldaDisponibleClick,
}: {
  inicioSemana: Date;
  bloques: BloqueDisponibilidad[];
  ordenes: OrdenAgenda[];
  onCeldaDisponibleClick?: (dia: Date, horaHHMM: string) => void;
}) {
  const hoy = new Date();
  // Turno tocado para ver el detalle completo (nombre, dirección, teléfono, rubro, título del
  // trabajo) — las celdas de la grilla son muy chicas para mostrar todo eso de una, así que se
  // abre un detalle aparte al tocar el turno.
  const [ordenSeleccionada, setOrdenSeleccionada] = useState<OrdenAgenda | null>(null);
  const [diaMovilIndex, setDiaMovilIndex] = useState(() => {
    const diff = Math.round((hoy.getTime() - inicioSemana.getTime()) / 86400000);
    return diff >= 0 && diff <= 6 ? diff : 0;
  });

  const dias = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(inicioSemana);
    d.setDate(d.getDate() + i);
    return d;
  });

  // Rango de horas: si hay disponibilidad cargada, mostramos desde la más temprana hasta la más
  // tardía (redondeando a la hora); si no, usamos el rango por defecto para no mostrar una grilla vacía.
  const { desde: inicioRango, hasta: finRango } = (() => {
    if (bloques.length === 0) return RANGO_POR_DEFECTO;
    const inicios = bloques.map((b) => minutosDelString(b.horaInicio));
    const fines = bloques.map((b) => minutosDelString(b.horaFin));
    const desde = Math.floor(Math.min(...inicios) / 60) * 60;
    const hasta = Math.ceil(Math.max(...fines) / 60) * 60;
    // Siempre cubrimos al menos el rango por defecto, y lo extendemos si la disponibilidad
    // real del prestador cae fuera de esa franja (por ejemplo, si trabaja de noche).
    return {
      desde: Math.min(desde, RANGO_POR_DEFECTO.desde),
      hasta: Math.max(hasta, RANGO_POR_DEFECTO.hasta),
    };
  })();

  const slots: number[] = [];
  for (let m = inicioRango; m < finRango; m += PASO_MINUTOS) slots.push(m);

  function estaDisponible(dia: Date, slotInicio: number): boolean {
    return bloques.some(
      (b) =>
        b.diaSemana === dia.getDay() &&
        slotInicio >= minutosDelString(b.horaInicio) &&
        slotInicio < minutosDelString(b.horaFin)
    );
  }

  function rangoDeOrden(o: OrdenAgenda): { inicio: number; fin: number } {
    const inicio = minutosDelDia(new Date(o.fechaHoraProgramada!));
    return { inicio, fin: inicio + (o.duracionMinutos ?? DURACION_POR_DEFECTO) };
  }

  // Devuelve la orden que ocupa este casillero de 30 min, ya sea porque arranca ahí o porque
  // el trabajo (con su duración) todavía sigue en curso a esa hora.
  function ordenEnCelda(dia: Date, slotInicio: number): OrdenAgenda | undefined {
    return ordenes.find((o) => {
      if (!o.fechaHoraProgramada) return false;
      const fecha = new Date(o.fechaHoraProgramada);
      if (!fechaHoyEsIgual(fecha, dia)) return false;
      const { inicio, fin } = rangoDeOrden(o);
      return slotInicio < fin && slotInicio + PASO_MINUTOS > inicio;
    });
  }

  // Turnos del día, ordenados cronológicamente (para la vista mobile en lista).
  function turnosDelDia(dia: Date): OrdenAgenda[] {
    return ordenes
      .filter((o) => o.fechaHoraProgramada && fechaHoyEsIgual(new Date(o.fechaHoraProgramada), dia))
      .sort((a, b) => new Date(a.fechaHoraProgramada!).getTime() - new Date(b.fechaHoraProgramada!).getTime());
  }

  // Franjas libres del día, fusionando slots de 30 min consecutivos disponibles y sin turno
  // (para mostrarlas como chips tocables en la vista mobile en lugar de celda por celda).
  function franjasLibresDelDia(dia: Date): { inicio: number; fin: number }[] {
    const libres: { inicio: number; fin: number }[] = [];
    let actual: { inicio: number; fin: number } | null = null;
    for (const slot of slots) {
      const libre = estaDisponible(dia, slot) && !ordenEnCelda(dia, slot);
      if (libre) {
        if (actual && actual.fin === slot) {
          actual.fin = slot + PASO_MINUTOS;
        } else {
          if (actual) libres.push(actual);
          actual = { inicio: slot, fin: slot + PASO_MINUTOS };
        }
      } else if (actual) {
        libres.push(actual);
        actual = null;
      }
    }
    if (actual) libres.push(actual);
    return libres;
  }

  const minutosAhora = minutosDelDia(hoy);

  function renderCelda(dia: Date, slotInicio: number, key: React.Key) {
    const disponible = estaDisponible(dia, slotInicio);
    const orden = ordenEnCelda(dia, slotInicio);
    const esHoy = fechaHoyEsIgual(dia, hoy);
    const esAhora = esHoy && minutosAhora >= slotInicio && minutosAhora < slotInicio + PASO_MINUTOS;
    const clickeable = disponible && !orden && !!onCeldaDisponibleClick;
    const colorEstado = orden ? ESTADO_COLOR[orden.estado] ?? "border-ink/30 text-ink/50" : "";

    // El turno se dibuja como una píldora continua a lo largo de todos los casilleros que dura el
    // trabajo: acá determinamos si este casillero es el inicio, el final, o un tramo del medio,
    // para redondear y bordear solo en las puntas y que se vea como un único bloque.
    let esInicioOrden = false;
    let esFinOrden = false;
    if (orden) {
      const { inicio, fin } = rangoDeOrden(orden);
      esInicioOrden = slotInicio <= inicio && slotInicio + PASO_MINUTOS > inicio;
      esFinOrden = slotInicio < fin && slotInicio + PASO_MINUTOS >= fin;
    }

    const bordesOrden = esInicioOrden && esFinOrden
      ? "rounded border"
      : esInicioOrden
      ? "rounded-t border-t border-l border-r"
      : esFinOrden
      ? "rounded-b border-b border-l border-r"
      : "border-l border-r";

    return (
      <div
        key={key}
        onClick={clickeable ? () => onCeldaDisponibleClick!(dia, formatoHora(slotInicio)) : undefined}
        className={`min-h-[26px] p-0.5 relative ${
          esAhora ? "border-t-2 border-copper" : "border-t border-dashed border-ink/10"
        } ${disponible ? "border-l-2 border-dashed border-stamp/40" : ""} ${
          clickeable ? "cursor-pointer hover:bg-stamp/10 transition-colors" : ""
        }`}
      >
        {esAhora && (
          <span className="absolute -top-[5px] -left-[5px] w-2 h-2 rounded-full bg-copper" />
        )}
        {orden && (
          <div
            onClick={(e) => {
              e.stopPropagation();
              setOrdenSeleccionada(orden);
            }}
            title={`${orden.clienteNombreCompleto} · ${orden.descripcion || orden.categoriaNombre}`}
            className={`relative bg-surface border-dashed border-ink/40 p-1 h-full cursor-pointer hover:border-copper/60 transition-colors ${bordesOrden}`}
          >
            {esInicioOrden && (
              <>
                <span
                  className={`absolute -top-1.5 -right-1 border rounded px-1 text-[7px] font-display rotate-6 bg-surface z-10 ${colorEstado}`}
                >
                  {codigoCategoria(orden.categoriaNombre)}
                </span>
                <p className="font-mono text-[9px] text-ink/40 leading-none">
                  {new Date(orden.fechaHoraProgramada!).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}
                  {orden.duracionMinutos ? ` · ${formatoDuracion(orden.duracionMinutos)}` : ""}
                </p>
                <p className="text-[10px] font-medium text-ink leading-tight truncate">{orden.clienteNombreCompleto}</p>
                {orden.descripcion && (
                  <p className="text-[9px] text-ink/50 leading-tight truncate">{orden.descripcion}</p>
                )}
              </>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      {/* --- Vista semanal (md en adelante) --- */}
      <div className="hidden md:block overflow-x-auto">
        <div className="grid grid-cols-[50px_repeat(7,minmax(90px,1fr))] w-full min-w-[680px]">
          <div />
          {dias.map((d, i) => (
            <div
              key={i}
              className={`relative text-center pb-2 pt-5 border-b ${
                fechaHoyEsIgual(d, hoy) ? "border-stamp" : "border-dashed border-ink/15"
              }`}
            >
              {fechaHoyEsIgual(d, hoy) && (
                <span className="absolute top-1 left-1/2 -translate-x-1/2 border-2 border-stamp text-stamp rounded px-1 text-[7px] font-display rotate-6 bg-paper whitespace-nowrap z-10">
                  HOY
                </span>
              )}
              <p className={`font-mono text-[10px] uppercase ${fechaHoyEsIgual(d, hoy) ? "text-stamp font-medium" : "text-ink/40"}`}>
                {DIAS_CORTOS[d.getDay()]}
              </p>
              <p className={`font-mono text-xs ${fechaHoyEsIgual(d, hoy) ? "text-stamp font-medium" : "text-ink/70"}`}>
                {d.getDate()}
              </p>
            </div>
          ))}

          {slots.map((slot) => (
            <div key={slot} className="contents">
              <div className="text-right pr-2 py-0.5 font-mono text-[10px] text-ink/35">
                {slot % 60 === 0 ? formatoHora(slot) : ""}
              </div>
              {dias.map((dia, i) => renderCelda(dia, slot, i))}
            </div>
          ))}
        </div>
      </div>

      {/* --- Vista día a día (mobile): lista de turnos + franjas libres --- */}
      <div className="md:hidden">
        <div className="grid grid-cols-7 gap-1 mb-4">
          {dias.map((d, i) => (
            <button
              key={i}
              onClick={() => setDiaMovilIndex(i)}
              className={`flex flex-col items-center rounded-lg px-1 py-1.5 border border-dashed ${
                i === diaMovilIndex
                  ? "bg-copper text-paper border-copper"
                  : fechaHoyEsIgual(d, hoy)
                  ? "border-stamp text-stamp"
                  : "border-ink/15 text-ink/60"
              }`}
            >
              <span className="font-mono text-[10px] uppercase">{DIAS_CORTOS[d.getDay()]}</span>
              <span className="font-mono text-sm">{d.getDate()}</span>
            </button>
          ))}
        </div>

        {(() => {
          const diaSel = dias[diaMovilIndex];
          const turnosDia = turnosDelDia(diaSel);
          const libresDia = franjasLibresDelDia(diaSel);

          return (
            <div>
              <p className="font-mono text-[10px] uppercase tracking-wide text-ink/40 mb-2">Turnos de hoy</p>
              {turnosDia.length === 0 ? (
                <p className="text-sm text-ink/40 mb-5">No tenés turnos agendados este día.</p>
              ) : (
                <div className="space-y-2 mb-5">
                  {turnosDia.map((orden, i) => {
                    const colorEstado = ESTADO_COLOR[orden.estado] ?? "border-ink/30 text-ink/50";
                    return (
                      <div
                        key={`${orden.fechaHoraProgramada}-${i}`}
                        onClick={() => setOrdenSeleccionada(orden)}
                        className="relative bg-surface border border-dashed border-ink/40 rounded-lg p-3 cursor-pointer hover:border-copper/60 transition-colors"
                      >
                        <span
                          className={`absolute top-2.5 right-3 border-2 rounded px-1.5 py-0.5 text-[9px] font-display rotate-6 bg-surface ${colorEstado}`}
                        >
                          {codigoCategoria(orden.categoriaNombre)}
                        </span>
                        <p className="font-mono text-xs text-ink/45 mb-0.5">
                          {new Date(orden.fechaHoraProgramada!).toLocaleTimeString("es-AR", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                          {orden.duracionMinutos ? ` · ${formatoDuracion(orden.duracionMinutos)}` : ""}
                        </p>
                        <p className="font-medium text-ink pr-16">{orden.clienteNombreCompleto}</p>
                        <p className="text-sm text-ink/55">{orden.descripcion || orden.categoriaNombre}</p>
                        {orden.clienteDireccion && (
                          <p className="text-xs text-ink/40 mt-0.5">
                            <a
                              href={linkGoogleMaps(orden.clienteDireccion, orden.clienteDireccionLat, orden.clienteDireccionLon)}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()} // no abrir el modal de detalle al tocar el link
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
                      </div>
                    );
                  })}
                </div>
              )}

              <p className="font-mono text-[10px] uppercase tracking-wide text-ink/40 mb-2">Horarios libres</p>
              {libresDia.length === 0 ? (
                <p className="text-sm text-ink/40">No hay horarios libres cargados para este día.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {libresDia.map((franja, i) => (
                    <button
                      key={i}
                      onClick={
                        onCeldaDisponibleClick
                          ? () => onCeldaDisponibleClick!(diaSel, formatoHora(franja.inicio))
                          : undefined
                      }
                      disabled={!onCeldaDisponibleClick}
                      className="border border-dashed border-stamp text-stamp bg-stamp/5 rounded-lg px-3 py-2 font-mono text-xs disabled:opacity-60 disabled:cursor-default hover:bg-stamp/10 transition-colors"
                    >
                      {formatoHora(franja.inicio)}–{formatoHora(franja.fin)}
                    </button>
                  ))}
                </div>
              )}
              {onCeldaDisponibleClick && libresDia.length > 0 && (
                <p className="text-xs text-ink/40 mt-2">Tocá un horario libre para agendar un turno pendiente ahí</p>
              )}
            </div>
          );
        })()}
      </div>

      <div className="hidden md:flex items-center gap-4 mt-3 pt-2 border-t border-dashed border-ink/15 text-xs text-ink/50">
        <span className="flex items-center gap-1.5">
          <span className="w-3 border-t-2 border-dashed border-stamp/50 inline-block" /> Disponible
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm border border-dashed border-ink/40 bg-surface inline-block" /> Turno agendado
        </span>
        {onCeldaDisponibleClick && (
          <span className="text-ink/40">Tocá un horario disponible para agendar un turno pendiente ahí</span>
        )}
      </div>

      {ordenSeleccionada && (
        <div
          onClick={() => setOrdenSeleccionada(null)}
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-surface border border-dashed border-ink/30 rounded-lg p-5 max-w-sm w-full"
          >
            <div className="flex items-start justify-between gap-3 mb-3">
              <p className="font-display text-lg text-ink leading-tight">
                {ordenSeleccionada.descripcion || ordenSeleccionada.categoriaNombre}
              </p>
              <button
                onClick={() => setOrdenSeleccionada(null)}
                className="text-ink/40 hover:text-ink shrink-0"
                aria-label="Cerrar"
              >
                ✕
              </button>
            </div>

            <dl className="text-sm space-y-2">
              <div>
                <dt className="text-[10px] uppercase tracking-wide text-ink/40 font-mono">Cliente</dt>
                <dd className="text-ink">{ordenSeleccionada.clienteNombreCompleto}</dd>
              </div>
              <div>
                <dt className="text-[10px] uppercase tracking-wide text-ink/40 font-mono">Rubro</dt>
                <dd className="text-ink">{ordenSeleccionada.categoriaNombre}</dd>
              </div>
              <div>
                <dt className="text-[10px] uppercase tracking-wide text-ink/40 font-mono">Dirección</dt>
                <dd className="text-ink flex items-center gap-1 flex-wrap">
                  {ordenSeleccionada.clienteDireccion ? (
                    <a
                      href={linkGoogleMaps(
                        ordenSeleccionada.clienteDireccion,
                        ordenSeleccionada.clienteDireccionLat,
                        ordenSeleccionada.clienteDireccionLon
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-copper underline decoration-dotted hover:text-copper-dark"
                    >
                      {ordenSeleccionada.clienteDireccion}
                    </a>
                  ) : (
                    "Sin dirección cargada"
                  )}
                  {ordenSeleccionada.clienteDireccion && ordenSeleccionada.clienteDireccionVerificada && (
                    <span className="text-stamp text-xs" title="Dirección verificada">✓</span>
                  )}
                </dd>
                {ordenSeleccionada.clienteDistanciaKm != null && (
                  <dd className="text-xs text-ink/50">{formatoDistancia(ordenSeleccionada.clienteDistanciaKm)}</dd>
                )}
              </div>
              <div>
                <dt className="text-[10px] uppercase tracking-wide text-ink/40 font-mono">Teléfono</dt>
                <dd className="text-ink">{ordenSeleccionada.clienteTelefono || "Sin teléfono cargado"}</dd>
              </div>
              {ordenSeleccionada.fechaHoraProgramada && (
                <div>
                  <dt className="text-[10px] uppercase tracking-wide text-ink/40 font-mono">Turno</dt>
                  <dd className="text-ink">
                    {new Date(ordenSeleccionada.fechaHoraProgramada).toLocaleString("es-AR", {
                      weekday: "long",
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    {ordenSeleccionada.duracionMinutos ? ` · ${formatoDuracion(ordenSeleccionada.duracionMinutos)}` : ""}
                  </dd>
                </div>
              )}
            </dl>
          </div>
        </div>
      )}
    </div>
  );
}
