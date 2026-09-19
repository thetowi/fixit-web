"use client";

import { useState } from "react";
import { BloqueDisponibilidad, formatoDistancia, formatoDuracion, OrdenAgenda } from "@/types/agenda";
import { linkGoogleMaps } from "@/lib/mapas";
import { colorCategoria } from "@/lib/coloresCategoria";

const DURACION_POR_DEFECTO = 60; // para turnos viejos que quedaron sin duracionMinutos cargado

const DIAS_CORTOS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const PASO_MINUTOS = 30;
const RANGO_POR_DEFECTO = { desde: 8 * 60, hasta: 20 * 60 }; // 8:00 a 20:00, si no hay disponibilidad cargada
const PX_HORA = 56; // alto de una hora en la grilla semanal (desktop)

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
  // trabajo) — las tarjetas de la grilla son chicas para mostrar todo eso de una, así que se
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

  const horas: number[] = [];
  for (let m = inicioRango; m < finRango; m += 60) horas.push(m);
  const altoTotal = ((finRango - inicioRango) / 60) * PX_HORA;

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

  // Devuelve la orden que ocupa este horario, ya sea porque arranca ahí o porque el trabajo (con
  // su duración) todavía sigue en curso a esa hora — se usa para no ofrecer agendar encima de un
  // turno ya agendado.
  function ordenEnMinuto(dia: Date, minuto: number): OrdenAgenda | undefined {
    return ordenes.find((o) => {
      if (!o.fechaHoraProgramada) return false;
      const fecha = new Date(o.fechaHoraProgramada);
      if (!fechaHoyEsIgual(fecha, dia)) return false;
      const { inicio, fin } = rangoDeOrden(o);
      return minuto >= inicio && minuto < fin;
    });
  }

  // Turnos del día, ordenados cronológicamente.
  function turnosDelDia(dia: Date): OrdenAgenda[] {
    return ordenes
      .filter((o) => o.fechaHoraProgramada && fechaHoyEsIgual(new Date(o.fechaHoraProgramada), dia))
      .sort((a, b) => new Date(a.fechaHoraProgramada!).getTime() - new Date(b.fechaHoraProgramada!).getTime());
  }

  // Franjas de disponibilidad declarada del día (independiente de si ya tienen un turno encima:
  // el turno se dibuja arriba, con su propia tarjeta), fusionando slots de 30 min consecutivos
  // para pintar un solo rectángulo de fondo por franja en vez de una rayita por casillero.
  function franjasDisponiblesDia(dia: Date): { inicio: number; fin: number }[] {
    const franjas: { inicio: number; fin: number }[] = [];
    let actual: { inicio: number; fin: number } | null = null;
    for (let slot = inicioRango; slot < finRango; slot += PASO_MINUTOS) {
      if (estaDisponible(dia, slot)) {
        if (actual && actual.fin === slot) {
          actual.fin = slot + PASO_MINUTOS;
        } else {
          if (actual) franjas.push(actual);
          actual = { inicio: slot, fin: slot + PASO_MINUTOS };
        }
      } else if (actual) {
        franjas.push(actual);
        actual = null;
      }
    }
    if (actual) franjas.push(actual);
    return franjas;
  }

  // Igual que arriba, pero restando lo ya ocupado por un turno — es lo que se ofrece como chip
  // tocable en la vista mobile.
  function franjasLibresDelDia(dia: Date): { inicio: number; fin: number }[] {
    const libres: { inicio: number; fin: number }[] = [];
    let actual: { inicio: number; fin: number } | null = null;
    for (let slot = inicioRango; slot < finRango; slot += PASO_MINUTOS) {
      const libre = estaDisponible(dia, slot) && !ordenEnMinuto(dia, slot);
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

  // Tocar un tramo vacío de la columna agenda un turno ahí: convertimos la posición Y del click
  // dentro de la columna a minutos del día, redondeando al escalón de 30 min más cercano.
  function handleClickColumna(e: React.MouseEvent<HTMLDivElement>, dia: Date) {
    if (!onCeldaDisponibleClick) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const offsetY = e.clientY - rect.top;
    let minuto = inicioRango + Math.round((offsetY / PX_HORA) * 60 / PASO_MINUTOS) * PASO_MINUTOS;
    minuto = Math.max(inicioRango, Math.min(finRango - PASO_MINUTOS, minuto));
    if (!estaDisponible(dia, minuto) || ordenEnMinuto(dia, minuto)) return;
    onCeldaDisponibleClick(dia, formatoHora(minuto));
  }

  function TarjetaTurno({ orden, dia }: { orden: OrdenAgenda; dia: Date }) {
    const { inicio, fin } = rangoDeOrden(orden);
    const top = ((Math.max(inicio, inicioRango) - inicioRango) / 60) * PX_HORA;
    const alto = Math.max(((Math.min(fin, finRango) - Math.max(inicio, inicioRango)) / 60) * PX_HORA, 30);
    const color = colorCategoria(orden.categoriaNombre);
    void dia;

    return (
      <div
        onClick={(e) => {
          e.stopPropagation();
          setOrdenSeleccionada(orden);
        }}
        title={`${orden.clienteNombreCompleto} · ${orden.descripcion || orden.categoriaNombre}`}
        style={{ top, height: alto, borderLeftColor: color }}
        className="absolute left-1 right-1 bg-surface rounded-lg border-l-[3px] shadow-sm px-2 py-1 overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
      >
        <p className="font-mono text-[9px] text-ink/40 leading-none">
          {formatoHora(inicio)}
          {orden.duracionMinutos ? ` · ${formatoDuracion(orden.duracionMinutos)}` : ""}
        </p>
        <p className="text-[11px] font-semibold text-ink leading-tight truncate mt-0.5">{orden.clienteNombreCompleto}</p>
        {orden.descripcion && (
          <p className="text-[10px] text-ink/55 leading-tight truncate">{orden.descripcion}</p>
        )}
      </div>
    );
  }

  return (
    <div>
      {/* --- Vista semanal (md en adelante) --- */}
      <div className="hidden md:block overflow-x-auto">
        <div className="grid grid-cols-[52px_repeat(7,minmax(96px,1fr))] w-full min-w-[700px]">
          <div />
          {dias.map((d, i) => {
            const esHoy = fechaHoyEsIgual(d, hoy);
            return (
              <div key={i} className="text-center pb-2.5 border-b border-ink/8">
                <p className={`font-mono text-[10px] uppercase tracking-wide ${esHoy ? "text-copper" : "text-ink/40"}`}>
                  {DIAS_CORTOS[d.getDay()]}
                </p>
                <span
                  className={`inline-flex items-center justify-center w-7 h-7 rounded-full mt-1 text-[13px] font-semibold ${
                    esHoy ? "bg-copper text-paper" : "text-ink"
                  }`}
                >
                  {d.getDate()}
                </span>
              </div>
            );
          })}

          {/* Columna de horas */}
          <div>
            {horas.map((m) => (
              <div key={m} className="font-mono text-[10px] text-ink/35 text-right pr-2" style={{ height: PX_HORA }}>
                <span className="relative -top-1.5">{formatoHora(m)}</span>
              </div>
            ))}
          </div>

          {/* Columnas de días */}
          {dias.map((dia, i) => {
            const esHoy = fechaHoyEsIgual(dia, hoy);
            const clickeable = !!onCeldaDisponibleClick;
            return (
              <div
                key={i}
                onClick={clickeable ? (e) => handleClickColumna(e, dia) : undefined}
                style={{ height: altoTotal }}
                className={`relative border-l border-ink/6 ${esHoy ? "bg-copper/[0.03]" : ""} ${
                  clickeable ? "cursor-pointer" : ""
                }`}
              >
                {franjasDisponiblesDia(dia).map((f, fi) => (
                  <div
                    key={fi}
                    style={{ top: ((f.inicio - inicioRango) / 60) * PX_HORA, height: ((f.fin - f.inicio) / 60) * PX_HORA }}
                    className="absolute left-0 right-0 bg-stamp/[0.09] pointer-events-none"
                  />
                ))}
                {esHoy && minutosAhora >= inicioRango && minutosAhora < finRango && (
                  <div
                    style={{ top: ((minutosAhora - inicioRango) / 60) * PX_HORA }}
                    className="absolute left-0 right-0 border-t-2 border-copper pointer-events-none z-10"
                  >
                    <span className="absolute -left-[3px] -top-[4px] w-2 h-2 rounded-full bg-copper" />
                  </div>
                )}
                {turnosDelDia(dia).map((orden) => (
                  <TarjetaTurno key={orden.id} orden={orden} dia={dia} />
                ))}
              </div>
            );
          })}
        </div>
      </div>

      {/* --- Vista día a día (mobile): lista de turnos + franjas libres --- */}
      <div className="md:hidden">
        <div className="grid grid-cols-7 gap-1 mb-4">
          {dias.map((d, i) => {
            const tieneTrabajos = turnosDelDia(d).length > 0;
            const seleccionado = i === diaMovilIndex;
            return (
              <button
                key={i}
                onClick={() => setDiaMovilIndex(i)}
                className={`flex flex-col items-center rounded-lg px-1 py-1.5 border ${
                  seleccionado
                    ? "bg-copper text-paper border-copper"
                    : fechaHoyEsIgual(d, hoy)
                    ? "border-copper/40 text-copper"
                    : "border-ink/10 text-ink/60"
                }`}
              >
                <span className="font-mono text-[10px] uppercase">{DIAS_CORTOS[d.getDay()]}</span>
                <span className="font-mono text-sm">{d.getDate()}</span>
                <span
                  className={`w-1 h-1 rounded-full mt-0.5 ${
                    tieneTrabajos ? (seleccionado ? "bg-paper" : "bg-copper") : "bg-transparent"
                  }`}
                />
              </button>
            );
          })}
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
                    const color = colorCategoria(orden.categoriaNombre);
                    return (
                      <div
                        key={`${orden.fechaHoraProgramada}-${i}`}
                        onClick={() => setOrdenSeleccionada(orden)}
                        style={{ borderLeftColor: color }}
                        className="relative flex gap-3 bg-surface border border-ink/10 border-l-4 rounded-xl p-3 cursor-pointer hover:border-copper/50 transition-colors"
                      >
                        <div className="min-w-0 flex-1">
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
                      className="bg-stamp/10 text-stamp rounded-full px-3.5 py-2 font-mono text-xs disabled:opacity-60 disabled:cursor-default hover:bg-stamp/15 transition-colors"
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

      <div className="hidden md:flex items-center gap-5 mt-4 pt-3 border-t border-ink/8 text-xs text-ink/50">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-stamp/20 inline-block" /> Disponible
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm border border-ink/15 bg-surface inline-block" /> Turno agendado
        </span>
        {onCeldaDisponibleClick && (
          <span className="text-ink/40">Tocá un horario disponible para agendar un turno pendiente ahí</span>
        )}
      </div>

      {ordenSeleccionada && (
        <div
          onClick={() => setOrdenSeleccionada(null)}
          className="fixed inset-0 bg-ink/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-surface border border-ink/10 rounded-xl shadow-xl p-5 max-w-sm w-full"
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
