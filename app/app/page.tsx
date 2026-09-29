"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api";
import { obtenerUsuario } from "@/lib/auth";
import { irALandingPublica } from "@/lib/dominio";
import { obtenerUbicacionActual } from "@/lib/geolocation";
import { Usuario } from "@/types/auth";
import { PrestadorDestacado } from "@/types/destacados";
import { OrdenAgenda, formatoDuracion } from "@/types/agenda";
import { Orden } from "@/types/ordenes";
import { GananciasResponse } from "@/types/ganancias";
import { PerfilPrestador } from "@/types/perfil";
import { ESTADO_LABELS } from "@/components/OrdenTicket";
import Estrellas from "@/components/Estrellas";
import InsigniaVerificado from "@/components/InsigniaVerificado";
import ObjetivoIngresoCard from "@/components/ObjetivoIngresoCard";

// "/app" (24/09): esto ES el antiguo "/" — el dashboard operativo de Cliente/Prestador logueado.
// Se movió acá cuando se separó la landing publicitaria (ver claude/backlog-landing-publicitaria-24-09.md)
// para que "/" pueda ser una vidriera pública sin login, al estilo tegu.ar. Un usuario sin sesión
// que entra acá directamente (ej. un link viejo a "/" guardado, o escribiendo "/app" a mano) se
// manda de vuelta a la landing en vez de mostrarle un dashboard vacío.
function fechaHoyEsIgual(a: Date, b: Date): boolean {
  return a.toDateString() === b.toDateString();
}

// Frases del hero (25/09, a pedido del usuario: no quería que se repitiera siempre la misma
// frase para Cliente — "que vaya cambiando esa frase entre esas opciones"). En vez de una frase
// fija por rol, hay un pool de 3 por rol y se elige una al azar cada vez que se entra a /app
// (ver `elegirFraseHero` más abajo, se resuelve una sola vez por carga con useState lazy init).
// Ninguna repite la frase de la landing pública ("/"), que sigue siendo la fija "El oficio que
// necesitás, a la vuelta de la esquina" ahí.
const FRASES_HERO_CLIENTE: { titulo: string; subtitulo: string }[] = [
  {
    titulo: "Encontrá el profesional justo para lo que necesitás",
    subtitulo: "Buscá por categoría y ubicación, chateá con el prestador y pagá con confianza.",
  },
  {
    titulo: "Tu problema, resuelto por alguien de confianza",
    subtitulo: "Elegí un prestador verificado cerca tuyo y coordiná todo desde acá.",
  },
  {
    titulo: "¿Qué necesitás arreglar hoy?",
    subtitulo: "Buscá, chateá y contratá un profesional verificado en minutos.",
  },
];

const FRASES_HERO_PRESTADOR: { titulo: string; subtitulo: string }[] = [
  {
    titulo: "Encontrá tu próximo trabajo, a la vuelta de la esquina",
    subtitulo: "Gestioná tus servicios, recibí pedidos de clientes cerca tuyo y cobrá con confianza.",
  },
  {
    titulo: "Tu oficio, más pedidos",
    subtitulo: "Recibí solicitudes de clientes cerca tuyo y gestioná tu agenda desde un solo lugar.",
  },
  {
    titulo: "Convertí tu experiencia en tu próximo trabajo",
    subtitulo: "Mostrá tus servicios, coordiná por chat y cobrá seguro con cada trabajo completado.",
  },
];

function elegirFraseHero(pool: { titulo: string; subtitulo: string }[]) {
  return pool[Math.floor(Math.random() * pool.length)];
}

// Aviso destacado de "Hoy" (24/09, a pedido del usuario: "que destaque como un recuadro de tipo
// alerta, visualmente más llamativo"), compartido entre Cliente y Prestador — solo cambia el
// texto y a dónde lleva al tocarlo.
function AvisoHoy({ titulo, subtitulo, href }: { titulo: string; subtitulo: string; href: string }) {
  return (
    <Link
      href={href}
      className="w-full flex items-center gap-3 bg-safety text-ink rounded-xl px-4 py-3.5 shadow-lg shadow-safety/20 hover:brightness-95 transition"
    >
      <span className="w-10 h-10 rounded-lg bg-black/10 flex items-center justify-center shrink-0">
        <Bell size={20} strokeWidth={2.2} />
      </span>
      <span className="min-w-0 text-left">
        <span className="block font-bold text-[15px] truncate">{titulo}</span>
        <span className="block text-xs font-medium opacity-85 truncate">{subtitulo}</span>
      </span>
    </Link>
  );
}

export default function AppHome() {
  const router = useRouter();
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [listo, setListo] = useState(false);
  // Se elige una sola vez, al confirmar quién es el usuario (ver el useEffect de abajo) — así
  // no cambia sola en medio de la visita, solo entre una entrada a /app y la siguiente.
  const [fraseHero, setFraseHero] = useState<{ titulo: string; subtitulo: string } | null>(null);
  const [destacados, setDestacados] = useState<PrestadorDestacado[]>([]);
  const [cargandoDestacados, setCargandoDestacados] = useState(true);

  const [trabajosHoy, setTrabajosHoy] = useState<OrdenAgenda[]>([]);
  const [trabajosSemana, setTrabajosSemana] = useState<OrdenAgenda[]>([]);
  const [cargandoTrabajos, setCargandoTrabajos] = useState(true);
  const [errorTrabajos, setErrorTrabajos] = useState<string | null>(null);
  const [iniciandoId, setIniciandoId] = useState<string | null>(null);

  // Fila de estadísticas rápidas del dashboard del prestador (28/09, rediseño de la landing del
  // prestador — ver claude/aviso-pago-y-sueldo-pretendido-28-09.md). Reusa endpoints que ya
  // existían (Ganancias, perfil público del propio prestador) en vez de crear uno nuevo.
  const [gananciasMes, setGananciasMes] = useState<GananciasResponse | null>(null);
  const [perfilPropio, setPerfilPropio] = useState<PerfilPrestador | null>(null);

  // Aviso de "Hoy" del lado del Cliente (24/09) — /api/ordenes/mias ahora trae
  // fechaHoraProgramada/duracionMinutos (ver OrdenResponse.cs), así que no hace falta un endpoint
  // nuevo para saber si tiene una visita programada para hoy.
  const [ordenesCliente, setOrdenesCliente] = useState<Orden[]>([]);

  async function cargarOrdenesCliente() {
    try {
      const data = await apiFetch<Orden[]>("/api/ordenes/mias");
      setOrdenesCliente(data);
    } catch {
      // Best-effort: si falla, simplemente no mostramos el aviso destacado esta vez.
    }
  }

  useEffect(() => {
    if (usuario?.rol !== "Cliente") return;
    cargarOrdenesCliente();
    window.addEventListener("fixit:ordenes-actualizadas", cargarOrdenesCliente);
    return () => window.removeEventListener("fixit:ordenes-actualizadas", cargarOrdenesCliente);
  }, [usuario]);

  useEffect(() => {
    const u = obtenerUsuario();
    if (!u) {
      // Sin sesión, este dashboard no tiene nada que mostrar — a la landing pública. En
      // app.oficy.ar esto tiene que cruzar de verdad a oficy.ar (ver irALandingPublica en
      // lib/dominio.ts) — un router.replace("/") liso se queda dando vueltas en el mismo
      // subdominio, porque el middleware reescribe esa "/" de nuevo a este mismo /app vacío.
      irALandingPublica(router);
      return;
    }
    setUsuario(u);
    setFraseHero(elegirFraseHero(u.rol === "Prestador" ? FRASES_HERO_PRESTADOR : FRASES_HERO_CLIENTE));
    setListo(true);
  }, [router]);

  useEffect(() => {
    if (usuario?.rol !== "Prestador") return;
    cargarTrabajos();
    apiFetch<GananciasResponse>("/api/prestador/ganancias?periodo=mes&offset=0").then(setGananciasMes).catch(() => {});
    apiFetch<PerfilPrestador>(`/api/prestadores/${usuario.id}`).then(setPerfilPropio).catch(() => {});
  }, [usuario]);

  // Refresco en tiempo real (23/09, ver backlog ítem 13 de la Tanda 2): antes el dashboard de
  // "Hoy"/"Esta semana" del prestador solo se cargaba al entrar a la home — si un cliente le
  // agendaba un trabajo o pagaba mientras estaba parado en esta pantalla, no se enteraba sin
  // recargar. El Navbar retransmite el evento de SignalR como un evento de `window` (ver
  // Navbar.tsx).
  useEffect(() => {
    if (usuario?.rol !== "Prestador") return;
    window.addEventListener("fixit:ordenes-actualizadas", cargarTrabajos);
    return () => window.removeEventListener("fixit:ordenes-actualizadas", cargarTrabajos);
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

  if (!listo || !usuario || !fraseHero) return null;

  const hoy = new Date();
  const trabajosHoyActivos = trabajosHoy.filter((o) => o.estado !== "Cancelado" && o.estado !== "Completado");
  const avisoHoyPrestador = trabajosHoyActivos[0] ?? null;
  const masTrabajosHoyPrestador = trabajosHoyActivos.length - 1;

  const trabajosHoyCliente = ordenesCliente
    .filter(
      (o) =>
        o.fechaHoraProgramada &&
        fechaHoyEsIgual(new Date(o.fechaHoraProgramada), hoy) &&
        o.estado !== "Cancelado" &&
        o.estado !== "Completado"
    )
    .sort((a, b) => new Date(a.fechaHoraProgramada!).getTime() - new Date(b.fechaHoraProgramada!).getTime());
  const avisoHoyCliente = trabajosHoyCliente[0] ?? null;
  const masTrabajosHoyCliente = trabajosHoyCliente.length - 1;

  // Hero del dashboard (25/09, a pedido del usuario: antes decía siempre lo mismo, tanto entre
  // Cliente/Prestador como entre visitas — ahora la frase se elige al azar de un pool por rol,
  // ver FRASES_HERO_CLIENTE/FRASES_HERO_PRESTADOR y `fraseHero` más arriba). Se mantiene
  // `esPrestador` para el resto de esta sección (aviso de hoy y botón de acción).
  const esPrestador = usuario.rol === "Prestador";

  return (
    <div className="flex-1 flex flex-col items-center px-6">
      <div className="flex flex-col items-center text-center pt-20 pb-14">
        <p className="font-mono text-xs tracking-widest text-copper uppercase mb-3">
          Plomería · Electricidad · Gas · Jardinería
        </p>
        <h1 className="font-display text-4xl sm:text-5xl text-ink tracking-tight mb-4 max-w-xl">
          {fraseHero.titulo}
        </h1>
        <p className="text-ink/70 mb-10 max-w-md">
          {fraseHero.subtitulo}
        </p>

        {usuario.rol === "Cliente" && (
          <div className="w-full max-w-md flex flex-col items-center gap-4">
            {avisoHoyCliente && (
              <AvisoHoy
                titulo={`Hoy te visita ${avisoHoyCliente.prestadorNombreCompleto}`}
                subtitulo={`${avisoHoyCliente.descripcion || avisoHoyCliente.categoriaNombre} · ${new Date(
                  avisoHoyCliente.fechaHoraProgramada!
                ).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}${
                  masTrabajosHoyCliente > 0 ? ` · +${masTrabajosHoyCliente} más hoy` : ""
                }`}
                href="/ordenes"
              />
            )}
            <Link href="/buscar" className="bg-copper text-paper rounded px-5 py-2.5 font-medium hover:bg-copper-dark transition-colors">
              Buscar un servicio
            </Link>
          </div>
        )}

        {usuario.rol === "Prestador" && (
          <Link href="/prestador/servicios" className="bg-copper text-paper rounded px-5 py-2.5 font-medium hover:bg-copper-dark transition-colors">
            Gestionar mis servicios
          </Link>
        )}
      </div>

      {usuario.rol === "Prestador" && (
        <div className="w-full max-w-4xl pb-14 flex flex-col gap-6">
          {errorTrabajos && <p className="text-red-700 dark:text-red-400 text-sm text-center">{errorTrabajos}</p>}

          {avisoHoyPrestador && (
            <AvisoHoy
              titulo={`Hoy visitas a ${avisoHoyPrestador.clienteNombreCompleto}`}
              subtitulo={`${avisoHoyPrestador.descripcion || avisoHoyPrestador.categoriaNombre} · ${new Date(
                avisoHoyPrestador.fechaHoraProgramada!
              ).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}${
                masTrabajosHoyPrestador > 0 ? ` · +${masTrabajosHoyPrestador} más hoy` : ""
              }`}
              href="/prestador/agenda"
            />
          )}

          {/* Estadísticas rápidas (28/09) — para que el prestador vea de un vistazo cómo le va
              sin tener que entrar a Ganancias. gananciasMes/perfilPropio pueden tardar un
              instante más que trabajosHoy en cargar; cada tarjeta muestra "..." mientras tanto
              en vez de esperar a los tres a la vez. */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-surface border border-ink/10 rounded-lg p-4">
              <p className="font-mono text-xs tracking-wider uppercase text-ink/45">Trabajos este mes</p>
              <p className="text-2xl font-display text-ink mt-1">
                {gananciasMes ? gananciasMes.trabajosCompletados : "..."}
              </p>
            </div>
            <div className="bg-surface border border-ink/10 rounded-lg p-4">
              <p className="font-mono text-xs tracking-wider uppercase text-ink/45">Ganancias del mes</p>
              <p className="text-2xl font-display text-ink mt-1">
                {gananciasMes ? `$${Math.round(gananciasMes.totalGanado).toLocaleString("es-AR")}` : "..."}
              </p>
            </div>
            <div className="bg-surface border border-ink/10 rounded-lg p-4">
              <p className="font-mono text-xs tracking-wider uppercase text-ink/45">Calificación</p>
              {perfilPropio && perfilPropio.cantidadCalificaciones > 0 ? (
                <div className="flex items-baseline gap-1.5 mt-1">
                  <span className="text-2xl font-display text-ink">{perfilPropio.promedioCalificacion!.toFixed(1)}</span>
                  <span className="text-xs text-ink/45">★ ({perfilPropio.cantidadCalificaciones})</span>
                </div>
              ) : (
                <p className="text-sm text-ink/40 mt-2">
                  {perfilPropio ? "Sin reseñas todavía" : "..."}
                </p>
              )}
            </div>
          </div>

          {/* "Sueldo pretendido" (28/09) — ver claude/aviso-pago-y-sueldo-pretendido-28-09.md */}
          <ObjetivoIngresoCard />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
        </div>
      )}

      {usuario.rol !== "Prestador" && !cargandoDestacados && destacados.length > 0 && (
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
                      {p.verificado && <InsigniaVerificado size={14} className="ml-1" />}
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
