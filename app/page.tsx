"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch, ApiError } from "@/lib/api";
import { obtenerUsuario } from "@/lib/auth";
import { obtenerUbicacionActual } from "@/lib/geolocation";
import { Usuario } from "@/types/auth";
import { PrestadorDestacado } from "@/types/destacados";
import { OrdenAgenda, formatoDuracion } from "@/types/agenda";
import { ESTADO_LABELS } from "@/components/OrdenTicket";
import Estrellas from "@/components/Estrellas";

function fechaHoyEsIgual(a: Date, b: Date): boolean {
  return a.toDateString() === b.toDateString();
}

export default function Home() {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [destacados, setDestacados] = useState<PrestadorDestacado[]>([]);
  const [cargandoDestacados, setCargandoDestacados] = useState(true);

  const [trabajosHoy, setTrabajosHoy] = useState<OrdenAgenda[]>([]);
  const [trabajosSemana, setTrabajosSemana] = useState<OrdenAgenda[]>([]);
  const [cargandoTrabajos, setCargandoTrabajos] = useState(true);
  const [errorTrabajos, setErrorTrabajos] = useState<string | null>(null);
  const [iniciandoId, setIniciandoId] = useState<string | null>(null);

  useEffect(() => {
    setUsuario(obtenerUsuario());
  }, []);

  useEffect(() => {
    if (usuario?.rol !== "Prestador") return;
    cargarTrabajos();
  }, [usuario]);

  async function cargarTrabajos() {
    setCargandoTrabajos(true);
    try {
      const hoy = new Date();
      const inicioHoy = new Date(hoy);
      inicioHoy.setHours(0, 0, 0, 0);

      // Fin de la semana actual (domingo a sábado, mismo criterio que /prestador/agenda)
      const finSemana = new Date(inicioHoy);
      finSemana.setDate(finSemana.getDate() + (6 - hoy.getDay()));
      finSemana.setHours(23, 59, 59, 999);

      const data = await apiFetch<OrdenAgenda[]>(
        `/api/prestador/agenda?desde=${inicioHoy.toISOString()}&hasta=${finSemana.toISOString()}`
      );

      const deHoy = data.filter((o) => o.fechaHoraProgramada && fechaHoyEsIgual(new Date(o.fechaHoraProgramada), hoy));
      const deLaSemana = data.filter(
        (o) => o.fechaHoraProgramada && !fechaHoyEsIgual(new Date(o.fechaHoraProgramada), hoy)
      );

      setTrabajosHoy(deHoy);
      setTrabajosSemana(deLaSemana);
    } catch (err) {
      setErrorTrabajos(err instanceof ApiError ? err.message : "No pudimos cargar tus trabajos programados.");
    } finally {
      setCargandoTrabajos(false);
    }
  }

  async function iniciarTrabajo(id: string) {
    setIniciandoId(id);
    setErrorTrabajos(null);
    try {
      await apiFetch(`/api/ordenes/${id}/iniciar`, { method: "PUT" });
      await cargarTrabajos();
    } catch (err) {
      setErrorTrabajos(err instanceof ApiError ? err.message : "No pudimos iniciar el trabajo.");
    } finally {
      setIniciandoId(null);
    }
  }

  useEffect(() => {
    async function cargarDestacados() {
      let params = "";
      try {
        const coords = await obtenerUbicacionActual();
        params = `?latitud=${coords.latitud}&longitud=${coords.longitud}`;
      } catch {
        // Sin ubicación no pasa nada: el backend devuelve destacados sin filtrar por distancia
      }

      try {
        const data = await apiFetch<PrestadorDestacado[]>(`/api/prestadores/destacados${params}`);
        setDestacados(data);
      } catch {
        // Si falla, simplemente no mostramos la sección de destacados
      } finally {
        setCargandoDestacados(false);
      }
    }

    cargarDestacados();
  }, []);

  return (
    <div className="flex-1 flex flex-col items-center px-6">
      <div className="flex flex-col items-center text-center pt-20 pb-14">
        <p className="font-mono text-xs tracking-widest text-copper uppercase mb-3">
          Plomería · Electricidad · Gas · Jardinería
        </p>
        <h1 className="font-display text-4xl sm:text-5xl text-ink tracking-tight mb-4 max-w-xl">
          El oficio que necesitás, a la vuelta de la esquina
        </h1>
        <p className="text-ink/70 mb-10 max-w-md">
          Buscá por categoría y ubicación, chateá con el prestador y pagá con confianza.
        </p>

        {!usuario && (
          <div className="flex gap-3">
            <Link href="/registro" className="bg-copper text-paper rounded px-5 py-2.5 font-medium hover:bg-copper-dark transition-colors">
              Crear cuenta
            </Link>
            <Link href="/login" className="border border-ink/20 text-ink rounded px-5 py-2.5 font-medium hover:border-ink/40 transition-colors">
              Iniciar sesión
            </Link>
          </div>
        )}

        {usuario?.rol === "Cliente" && (
          <Link href="/buscar" className="bg-copper text-paper rounded px-5 py-2.5 font-medium hover:bg-copper-dark transition-colors">
            Buscar un servicio
          </Link>
        )}

        {usuario?.rol === "Prestador" && (
          <Link href="/prestador/servicios" className="bg-copper text-paper rounded px-5 py-2.5 font-medium hover:bg-copper-dark transition-colors">
            Gestionar mis servicios
          </Link>
        )}
      </div>

      {usuario?.rol === "Prestador" && (
        <div className="w-full max-w-2xl pb-14 flex flex-col gap-6">
          {errorTrabajos && <p className="text-red-700 dark:text-red-400 text-sm text-center">{errorTrabajos}</p>}

          <div className="bg-surface border border-ink/10 rounded-lg p-5">
            <p className="font-mono text-xs tracking-widest text-copper uppercase mb-3">Hoy</p>
            {cargandoTrabajos ? (
              <p className="text-sm text-ink/40">Cargando...</p>
            ) : trabajosHoy.length === 0 ? (
              <p className="text-sm text-ink/50">No tenés trabajos programados para hoy.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {trabajosHoy.map((o) => (
                  <li
                    key={o.id}
                    className="flex items-center justify-between gap-3 bg-paper rounded p-3 flex-wrap"
                  >
                    <div className="min-w-0">
                      <p className="font-mono text-xs text-ink/45">
                        {new Date(o.fechaHoraProgramada!).toLocaleTimeString("es-AR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                        {o.duracionMinutos ? ` · ${formatoDuracion(o.duracionMinutos)}` : ""}
                      </p>
                      <p className="font-medium text-ink truncate">{o.clienteNombreCompleto}</p>
                      <p className="text-sm text-ink/55 truncate">{o.categoriaNombre}</p>
                    </div>
                    {o.estado === "Pagado" ? (
                      <button
                        onClick={() => iniciarTrabajo(o.id)}
                        disabled={iniciandoId === o.id}
                        className="bg-safety text-ink rounded px-3 py-1.5 text-sm font-medium hover:brightness-95 transition disabled:opacity-50 whitespace-nowrap"
                      >
                        {iniciandoId === o.id ? "Iniciando..." : "Iniciar trabajo"}
                      </button>
                    ) : (
                      <span className="text-xs font-mono uppercase text-stamp border border-stamp rounded px-2 py-1 whitespace-nowrap">
                        {ESTADO_LABELS[o.estado] ?? o.estado}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="bg-surface border border-ink/10 rounded-lg p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="font-mono text-xs tracking-widest text-copper uppercase">Esta semana</p>
              <Link href="/prestador/agenda" className="text-xs text-copper hover:underline whitespace-nowrap">
                Ver agenda completa →
              </Link>
            </div>
            {cargandoTrabajos ? (
              <p className="text-sm text-ink/40">Cargando...</p>
            ) : trabajosSemana.length === 0 ? (
              <p className="text-sm text-ink/50">No tenés más trabajos programados esta semana.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {trabajosSemana.map((o) => (
                  <li key={o.id} className="flex items-center justify-between gap-3 bg-paper rounded p-3">
                    <div className="min-w-0">
                      <p className="font-mono text-xs text-ink/45">
                        {new Date(o.fechaHoraProgramada!).toLocaleDateString("es-AR", {
                          weekday: "short",
                          day: "numeric",
                          month: "short",
                        })}{" "}
                        ·{" "}
                        {new Date(o.fechaHoraProgramada!).toLocaleTimeString("es-AR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                        {o.duracionMinutos ? ` · ${formatoDuracion(o.duracionMinutos)}` : ""}
                      </p>
                      <p className="font-medium text-ink truncate">{o.clienteNombreCompleto}</p>
                      <p className="text-sm text-ink/55 truncate">{o.categoriaNombre}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {usuario?.rol !== "Prestador" && !cargandoDestacados && destacados.length > 0 && (
        <div className="w-full max-w-4xl pb-20">
          <p className="font-mono text-xs tracking-widest text-copper uppercase mb-4 text-center">
            Los mejor calificados
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {destacados.map((p) => (
              <Link
                key={p.id}
                href={`/prestador/${p.id}`}
                className="bg-surface border border-ink/10 rounded-lg p-4 hover:border-copper transition-colors"
              >
                <div className="flex items-center gap-3 mb-2">
                  {p.fotoPerfilUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.fotoPerfilUrl} alt={p.nombre} className="w-11 h-11 rounded-full object-cover" />
                  ) : (
                    <div className="w-11 h-11 rounded-full bg-ink/10 flex items-center justify-center font-display text-xs text-ink shrink-0">
                      {p.nombre[0]}{p.apellido[0]}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="font-medium text-ink truncate">
                      {p.nombre} {p.apellido}
                      {p.verificado && <span className="text-stamp text-xs ml-1">✓</span>}
                    </p>
                    <p className="text-xs text-ink/50 truncate">{p.categorias.join(" · ")}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  {p.cantidadCalificaciones > 0 ? (
                    <div className="flex items-center gap-1">
                      <Estrellas valor={p.promedioCalificacion!} tamaño="text-xs" />
                      <span className="text-xs text-ink/50">({p.cantidadCalificaciones})</span>
                    </div>
                  ) : (
                    <span className="text-xs text-ink/40">Sin reseñas todavía</span>
                  )}
                  {p.distanciaKm != null && (
                    <span className="font-mono text-xs text-copper">{p.distanciaKm.toFixed(1)} km</span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}