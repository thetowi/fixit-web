"use client";

import { useState } from "react";
import Link from "next/link";
import { BloqueDisponibilidad, formatoDistancia, formatoDuracion, OrdenAgenda } from "@/types/agenda";
import { linkGoogleMaps } from "@/lib/mapas";
import { colorCategoria, estiloEtiquetaCategoria } from "@/lib/coloresCategoria";

const DURACION_POR_DEFECTO = 60; // para turnos viejos que quedaron sin duracionMinutos cargado

const DIAS_CORTOS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const PASO_MINUTOS = 30;
const RANGO_POR_DEFECTO = { desde: 8 * 60, hasta: 20 * 60 }; // 8:00 a 20:00, si no hay disponibilidad cargada
const HORA_POR_DEFECTO_AL_AGENDAR = "09:00"; // si el día no tiene ningún horario libre calculable

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
  onReprogramar,
}: {
  inicioSemana: Date;
  bloques: BloqueDisponibilidad[];
  ordenes: OrdenAgenda[];
  onCeldaDisponibleClick?: (dia: Date, horaHHMM: string) => void;
  // Reprogramar un turno ya agendado (22/09, a pedido del usuario) — el padre es quien pide
  // confirmación antes de abrir el formulario de "Programar" pre-cargado con la fecha/hora actual.
  onReprogramar?: (orden: OrdenAgenda) => void;
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

  // Rango de horas de la disponibilidad cargada (28/09: ya no se dibuja una grilla por hora en el
  // desktop, pero se sigue usando este rango para calcular qué franjas están libres — tanto para
  // la vista mobile como para elegir un horario por defecto razonable al tocar "Agregar turno").
  const { desde: inicioRango, hasta: finRango } = (() => {
    if (bloques.length === 0) return RANGO_POR_DEFECTO;
    const inicios = bloques.map((b) => minutosDelString(b.horaInicio));
    const fines = bloques.map((b) => minutosDelString(b.horaFin));
    const desde = Math.floor(Math.min(...inicios) / 60) * 60;
    const hasta = Math.ceil(Math.max(...fines) / 60) * 60;
    return {
      desde: Math.min(desde, RANGO_POR_DEFECTO.desde),
      hasta: Math.max(hasta, RANGO_POR_DEFECTO.hasta),
    };
  })();

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

  // Igual que arriba, pero restando lo ya ocupado por un turno — es lo que se ofrece como chip
  // tocable en la vista mobile, y de dónde sale el horario por defecto al tocar "Agregar turno"
  // en el desktop.
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

  // Al tocar "+ Agregar turno" en una columna del desktop (28/09: reemplaza el click directo
  // sobre un horario de la grilla, que dejó de existir con el rediseño sin franja horaria):
  // proponemos el primer horario libre del día si hay disponibilidad cargada, o un horario por
  // defecto razonable si no — el prestador igual puede cambiar la hora a mano en el formulario.
  function agregarTurno(dia: Date) {
    if (!onCeldaDisponibleClick) return;
    const libres = franjasLibresDelDia(dia);
    const horaSugerida = libres.length > 0 ? formatoHora(libres[0].inicio) : HORA_POR_DEFECTO_AL_AGENDAR;
    onCeldaDisponibleClick(dia, horaSugerida);
  }

  function TarjetaTurno({ orden }: { orden: OrdenAgenda }) {
    const etiqueta = estiloEtiquetaCategoria(orden.categoriaNombre);
    return (
      <button
        onClick={() => setOrdenSeleccionada(orden)}
        className="text-left w-full bg-paper hover:bg-white border border-transparent hover:border-ink/8 hover:shadow-sm rounded-2xl px-3 py-2.5 transition-all"
      >
        <p className="font-mono text-[10px] text-ink/40 leading-none">
          {formatoHora(minutosDelDia(new Date(orden.fechaHoraProgramada!)))}
          {orden.duracionMinutos ? ` · ${formatoDuracion(orden.duracionMinutos)}` : ""}
        </p>
        <p className="text-[13px] font-bold text-ink leading-tight truncate mt-1">{orden.clienteNombreCompleto}</p>
        {orden.descripcion && (
          <p className="text-[11.5px] text-ink/55 leading-snug truncate mt-0.5">{orden.descripcion}</p>
        )}
        <span
          style={etiqueta}
          className="inline-block mt-2 text-[9.5px] font-semibold px-2 py-0.5 rounded-full"
        >
          {orden.categoriaNombre}
        </span>
      </button>
    );
  }

  return (
    <div>
      {/* --- Vista semanal (md en adelante): grilla de 7 columnas, sin franja horaria (28/09) --- */}
      <div className="hidden md:block">
        <div className="bg-surface border border-ink/8 rounded-[18px] p-5 shadow-sm">
          <div className="grid grid-cols-7 gap-2.5">
            {dias.map((dia, i) => {
              const esHoy = fechaHoyEsIgual(dia, hoy);
              const turnosDia = turnosDelDia(dia);
              return (
                <div
                  key={i}
                  className={`flex flex-col gap-2 rounded-2xl ${esHoy ? "bg-copper/[0.055] p-2" : "p-0"}`}
                >
                  <div className="text-center pb-1">
                    <p className={`font-mono text-[10px] uppercase tracking-wide font-semibold ${esHoy ? "text-copper" : "text-ink/40"}`}>
                      {DIAS_CORTOS[dia.getDay()]}
                    </p>
                    {esHoy ? (
                      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full mt-1 text-sm font-bold bg-copper text-paper">
                        {dia.getDate()}
                      </span>
                    ) : (
                      <span className="block mt-1 text-base font-bold text-ink">{dia.getDate()}</span>
                    )}
                  </div>

                  <div className="flex flex-col gap-2 flex-1">
                    {turnosDia.length > 0 ? (
                      turnosDia.map((orden) => <TarjetaTurno key={orden.id} orden={orden} />)
                    ) : (
                      <div className="flex-1 flex flex-col items-center justify-center py-4 text-center">
                        <span className="w-7 h-7 rounded-full border-[1.5px] border-dashed border-ink/20 mb-2" />
                        <span className="text-[10px] text-ink/35">Día libre</span>
                      </div>
                    )}
                  </div>

                  {onCeldaDisponibleClick && (
                    <button
                      onClick={() => agregarTurno(dia)}
                      className="text-[11px] font-medium text-ink/35 hover:text-copper py-1.5 rounded-lg hover:bg-copper/[0.06] transition-colors"
                    >
                      + Agregar turno
                    </button>
                  )}
                </div>
              );
            })}
          </div>
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
                <dd className="text-ink flex items-center gap-2 flex-wrap">
                  <span>{ordenSeleccionada.clienteNombreCompleto}</span>
                  <Link
                    href={`/prestador/clientes/${ordenSeleccionada.clienteId}`}
                    className="text-xs text-copper hover:underline"
                  >
                    Ver perfil
                  </Link>
                </dd>
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

            {onReprogramar && (
              <button
                onClick={() => {
                  const orden = ordenSeleccionada;
                  setOrdenSeleccionada(null);
                  onReprogramar(orden);
                }}
                className="mt-4 w-full text-center text-sm text-copper hover:underline"
              >
                Reprogramar este turno
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
