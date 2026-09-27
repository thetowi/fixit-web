"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api";
import { obtenerUsuario } from "@/lib/auth";
import { PerfilPrestador } from "@/types/perfil";
import { IniciarConversacionRequest, Conversacion } from "@/types/conversaciones";
import Estrellas from "@/components/Estrellas";
import { Calificacion, CRITERIOS_CALIFICACION } from "@/types/calificaciones";
import InsigniaVerificado from "@/components/InsigniaVerificado";

function inicialesCliente(nombre: string): string {
  return nombre
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

// Mismo criterio que en /mensajes (tiempoRelativo) — evita que cada reseña muestre una fecha
// completa cuando alcanza con "hace 3 días", que ocupa menos y se lee más natural en la tarjeta.
function tiempoRelativoReseña(fechaISO: string): string {
  const fecha = new Date(fechaISO);
  const diffDias = Math.floor((Date.now() - fecha.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDias < 1) return "hoy";
  if (diffDias === 1) return "ayer";
  if (diffDias < 30) return `hace ${diffDias} días`;
  if (diffDias < 365) return `hace ${Math.floor(diffDias / 30)} meses`;
  return fecha.toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "numeric" });
}

// Rediseño del 27/09 (a pedido del usuario: "hoy se ve muy vacio") — se abandonan las pestañas
// Servicios/Reseñas/Acerca de mí de la versión anterior a favor de una sola página que fluye de
// arriba a abajo, siguiendo el mockup aprobado (Artifact "Perfil de prestador y reseñas con fotos
// — Oficy"): header oscuro con la identidad del prestador, barra de estadísticas, galería de
// trabajos realizados, reseñas con fotos, y por último servicios/contacto + acerca de mí.
export default function PerfilPrestadorPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [perfil, setPerfil] = useState<PerfilPrestador | null>(null);
  const [calificaciones, setCalificaciones] = useState<Calificacion[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [iniciandoChat, setIniciandoChat] = useState<number | null>(null);
  const [soloConFotos, setSoloConFotos] = useState(false);

  // Foto del prestador en pantalla grande, tipo modal, cerrable (27/09, a pedido explícito del
  // usuario al aprobar el mockup: "cuando tocas la foto del prestador te debe dejar verla en
  // pantalla grande tipo modal, luego poder cerrarla").
  const [fotoModalAbierta, setFotoModalAbierta] = useState(false);

  // "Repostear" fotos de reseña (27/09): solo tiene sentido cuando el que mira su propio perfil
  // es el prestador dueño — ver botón "Pedir permiso" en cada foto de reseña más abajo.
  const [solicitandoRepost, setSolicitandoRepost] = useState<string | null>(null);
  const [repostSolicitados, setRepostSolicitados] = useState<Set<string>>(new Set());

  const usuario = obtenerUsuario();

  useEffect(() => {
    Promise.all([
      apiFetch<PerfilPrestador>(`/api/prestadores/${id}`),
      apiFetch<Calificacion[]>(`/api/prestadores/${id}/calificaciones`),
    ])
      .then(([perfilData, calificacionesData]) => {
        setPerfil(perfilData);
        setCalificaciones(calificacionesData);
      })
      .catch((err) => {
        setError(err instanceof ApiError && err.status === 404
          ? "No encontramos este prestador."
          : "Error al cargar el perfil.");
      })
      .finally(() => setCargando(false));
  }, [id]);

  async function handleContratar(categoriaId: number) {
    if (!usuario) {
      router.push("/login");
      return;
    }

    setIniciandoChat(categoriaId);
    setError(null);

    const body: IniciarConversacionRequest = { prestadorId: id, categoriaId };

    try {
      const conversacion = await apiFetch<Conversacion>("/api/conversaciones", {
        method: "POST",
        body: JSON.stringify(body),
      });
      router.push(`/conversaciones/${conversacion.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error al iniciar el chat");
      setIniciandoChat(null);
    }
  }

  async function handlePedirRepost(calificacionFotoId: string) {
    setError(null);
    setSolicitandoRepost(calificacionFotoId);
    try {
      await apiFetch(`/api/repostos/${calificacionFotoId}/solicitar`, { method: "POST" });
      setRepostSolicitados((prev) => new Set(prev).add(calificacionFotoId));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error al pedir permiso");
    } finally {
      setSolicitandoRepost(null);
    }
  }

  if (cargando) return <p className="p-6 text-ink/60">Cargando...</p>;
  if (error && !perfil) return <p className="p-6 text-red-700 dark:text-red-400">{error}</p>;
  if (!perfil) return null;

  const miembroDesde = new Date(perfil.miembroDesde);
  const miembroDesdeTexto = miembroDesde.toLocaleDateString("es-AR", { year: "numeric", month: "long" });
  const añosEnOficy = Math.max(0, Math.floor((Date.now() - miembroDesde.getTime()) / (1000 * 60 * 60 * 24 * 365)));

  const esClientePropio = usuario?.rol === "Cliente";
  const esDuenioDelPerfil = usuario?.rol === "Prestador" && usuario.id === perfil.id;

  const rubros = Array.from(new Set(perfil.servicios.map((s) => s.categoriaNombre)));
  const cantidadFotosTrabajo = perfil.fotosTrabajo.length;
  const cantidadReseñasConFotos = calificaciones.filter((c) => c.fotos.length > 0).length;
  const calificacionesAMostrar = soloConFotos ? calificaciones.filter((c) => c.fotos.length > 0) : calificaciones;

  return (
    <div className="w-full">
      {/* ---- Header oscuro (ver mockup PerfilPrestador.dc.html) ---- */}
      <div className="w-full bg-ink text-paper">
        <div className="max-w-3xl mx-auto px-6 py-10 flex flex-col sm:flex-row sm:items-center gap-6">
          <button
            type="button"
            onClick={() => perfil.fotoPerfilUrl && setFotoModalAbierta(true)}
            className="w-24 h-24 rounded-full bg-paper/10 border-2 border-copper/50 flex items-center justify-center font-display text-2xl shrink-0 overflow-hidden"
            aria-label="Ver foto de perfil en grande"
          >
            {perfil.fotoPerfilUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={perfil.fotoPerfilUrl} alt={`${perfil.nombre} ${perfil.apellido}`} className="w-full h-full object-cover" />
            ) : (
              <>{perfil.nombre[0]}{perfil.apellido[0]}</>
            )}
          </button>

          <div className="flex-1 min-w-0">
            <h1 className="font-display text-2xl flex items-center flex-wrap gap-2">
              {perfil.nombre} {perfil.apellido}
              {perfil.verificado && <InsigniaVerificado size={18} conTexto />}
            </h1>

            {rubros.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {rubros.map((r) => (
                  <span key={r} className="text-xs bg-paper/10 rounded-full px-2.5 py-1">
                    {r}
                  </span>
                ))}
              </div>
            )}

            <p className="text-sm text-paper/60 mt-2">
              Miembro desde {miembroDesdeTexto}
              {perfil.radioAlcanceKm != null && ` · ${perfil.radioAlcanceKm} km de alcance`}
            </p>
          </div>

          {perfil.cantidadCalificaciones > 0 && (
            <div className="text-center sm:text-right shrink-0">
              <p className="font-display text-3xl leading-none">{perfil.promedioCalificacion!.toFixed(1)}</p>
              <Estrellas valor={perfil.promedioCalificacion!} />
              <p className="text-xs text-paper/50 mt-1">Promedio general · {perfil.cantidadCalificaciones} reseñas</p>
            </div>
          )}
        </div>
      </div>

      {fotoModalAbierta && perfil.fotoPerfilUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-6"
          onClick={() => setFotoModalAbierta(false)}
        >
          <button
            type="button"
            onClick={() => setFotoModalAbierta(false)}
            className="absolute top-4 right-4 text-white/80 hover:text-white text-3xl leading-none w-10 h-10 flex items-center justify-center"
            aria-label="Cerrar"
          >
            ✕
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={perfil.fotoPerfilUrl}
            alt={`${perfil.nombre} ${perfil.apellido}`}
            className="max-w-full max-h-full rounded-lg object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* ---- Barra de estadísticas (27/09) — antes el perfil solo mostraba el promedio. ---- */}
      <div className="max-w-3xl mx-auto px-6">
        <div className="grid grid-cols-3 gap-3 -mt-px py-6 border-b border-ink/10">
          <div className="text-center">
            <p className="font-display text-2xl text-ink">{perfil.cantidadCalificaciones}</p>
            <p className="text-xs text-ink/50">Trabajos calificados</p>
          </div>
          <div className="text-center">
            <p className="font-display text-2xl text-ink">{cantidadReseñasConFotos}</p>
            <p className="text-xs text-ink/50">Reseñas con fotos</p>
          </div>
          <div className="text-center">
            <p className="font-display text-2xl text-ink">{cantidadFotosTrabajo}</p>
            <p className="text-xs text-ink/50">Fotos de trabajos</p>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8 flex flex-col gap-10">
        {error && <p className="text-red-700 dark:text-red-400 text-sm">{error}</p>}

        {/* ---- Servicios / contacto ---- */}
        <div>
          <p className="font-mono text-xs tracking-widest text-copper uppercase mb-3">Servicios</p>
          {perfil.servicios.length === 0 ? (
            <p className="text-ink/50 text-sm">Este prestador todavía no cargó servicios.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {perfil.servicios.map((s) => (
                <li key={s.categoriaId} className="bg-surface border border-ink/10 rounded-lg p-4">
                  <div className="flex justify-between items-start gap-3">
                    <div>
                      <p className="font-medium text-ink">{s.categoriaNombre}</p>
                      {s.descripcion && <p className="text-sm text-ink/60">{s.descripcion}</p>}
                      {s.precioReferencia && (
                        <p className="font-mono text-sm text-ink/70 mt-1">
                          Desde ${s.precioReferencia.toLocaleString("es-AR")} /hora
                        </p>
                      )}
                    </div>
                    {esClientePropio && (
                      <button
                        onClick={() => handleContratar(s.categoriaId)}
                        disabled={iniciandoChat === s.categoriaId}
                        className="bg-copper text-paper text-sm rounded px-3 py-1.5 whitespace-nowrap hover:bg-copper-dark transition-colors disabled:opacity-40"
                      >
                        {iniciandoChat === s.categoriaId ? "Abriendo chat..." : "Contactar"}
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
          {!usuario && (
            <p className="text-sm text-ink/50 mt-3">Iniciá sesión como cliente para poder contratar.</p>
          )}
        </div>

        {/* ---- Trabajos realizados (galería) ---- */}
        {perfil.fotosTrabajo.length > 0 && (
          <div>
            <p className="font-mono text-xs tracking-widest text-copper uppercase mb-3">Trabajos realizados</p>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {perfil.fotosTrabajo.map((f) => (
                <div key={f.id} className="relative aspect-square rounded-lg overflow-hidden bg-ink/5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={f.url} alt={f.descripcion ?? "Trabajo realizado"} className="w-full h-full object-cover" />
                  {f.esDeResenia && (
                    <span className="absolute bottom-1 left-1 right-1 text-center bg-black/60 text-white text-[10px] rounded px-1 py-0.5">
                      {f.clienteNombre ? `De la reseña de ${f.clienteNombre}` : "De una reseña"}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ---- Reseñas de clientes ---- */}
        <div>
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <p className="font-mono text-xs tracking-widest text-copper uppercase">Reseñas de clientes</p>
            {cantidadReseñasConFotos > 0 && (
              <div className="flex gap-1 bg-ink/5 rounded-lg p-1">
                <button
                  onClick={() => setSoloConFotos(false)}
                  className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                    !soloConFotos ? "bg-surface text-ink shadow-sm" : "text-ink/50 hover:text-ink"
                  }`}
                >
                  Más recientes
                </button>
                <button
                  onClick={() => setSoloConFotos(true)}
                  className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                    soloConFotos ? "bg-surface text-ink shadow-sm" : "text-ink/50 hover:text-ink"
                  }`}
                >
                  Con fotos
                </button>
              </div>
            )}
          </div>

          {calificaciones.length === 0 && (
            <p className="text-ink/50 text-sm">Este prestador todavía no tiene reseñas.</p>
          )}
          {calificaciones.length > 0 && calificacionesAMostrar.length === 0 && (
            <p className="text-ink/50 text-sm">Ninguna reseña tiene fotos todavía.</p>
          )}

          <ul className="flex flex-col gap-3">
            {calificacionesAMostrar.map((c) => (
              <li key={c.id} className="bg-surface border border-ink/10 rounded-lg p-5">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-copper/10 text-copper flex items-center justify-center font-display font-bold text-sm shrink-0">
                      {inicialesCliente(c.clienteNombre)}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm text-ink truncate">{c.clienteNombre}</p>
                      <p className="text-xs text-ink/40">{tiempoRelativoReseña(c.creadoEn)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Estrellas valor={c.promedio} tamaño="text-sm" />
                    <span className="text-xs text-ink/50 font-medium">{c.promedio.toFixed(1)}</span>
                  </div>
                </div>
                {c.comentario && (
                  <p className="text-sm text-ink/70 leading-snug mb-3">&ldquo;{c.comentario}&rdquo;</p>
                )}

                {c.fotos.length > 0 && (
                  <div className="flex gap-2 mb-2 flex-wrap">
                    {c.fotos.map((foto) => (
                      <div key={foto.id} className="flex flex-col items-center gap-1">
                        <div className="w-16 h-16 rounded overflow-hidden bg-ink/5">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={foto.url} alt="Foto de la reseña" className="w-full h-full object-cover" />
                        </div>
                        {esDuenioDelPerfil && (
                          <>
                            {foto.estadoRepost === "SinSolicitar" || foto.estadoRepost === "Rechazado" ? (
                              repostSolicitados.has(foto.id) ? (
                                <span className="text-[10px] text-ink/40">Pedido enviado</span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handlePedirRepost(foto.id)}
                                  disabled={solicitandoRepost === foto.id}
                                  className="text-[10px] text-copper hover:underline disabled:opacity-40"
                                >
                                  {solicitandoRepost === foto.id ? "Pidiendo..." : "Pedir permiso"}
                                </button>
                              )
                            ) : foto.estadoRepost === "Pendiente" ? (
                              <span className="text-[10px] text-ink/40">Esperando respuesta</span>
                            ) : (
                              <span className="text-[10px] text-stamp">En tu perfil</span>
                            )}
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex flex-wrap gap-1.5 pt-3 mt-1 border-t border-ink/10">
                  {CRITERIOS_CALIFICACION.map((criterio) => (
                    <span
                      key={criterio.key}
                      className="inline-flex items-center gap-1 text-xs bg-ink/5 text-ink/60 rounded-full pl-2.5 pr-2 py-1"
                    >
                      {criterio.label}
                      <span className="text-copper font-semibold">{c[criterio.key]}★</span>
                    </span>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* ---- Acerca de mí ---- */}
        <div>
          <p className="font-mono text-xs tracking-widest text-copper uppercase mb-3">Acerca de mí</p>
          {perfil.biografia ? (
            <p className="text-sm text-ink/70 whitespace-pre-wrap">{perfil.biografia}</p>
          ) : (
            <p className="text-ink/50 text-sm">Este prestador todavía no agregó una descripción.</p>
          )}
          {añosEnOficy > 0 && (
            <p className="text-sm text-ink/50 mt-2">
              <span className="font-mono text-copper">{añosEnOficy}</span> {añosEnOficy === 1 ? "año" : "años"} en Oficy
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
