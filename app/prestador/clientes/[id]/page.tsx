"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch, ApiError } from "@/lib/api";
import { obtenerUsuario } from "@/lib/auth";
import { PerfilCliente } from "@/types/clientes";
import { ESTADO_LABELS } from "@/components/OrdenTicket";
import { estiloEtiquetaCategoria } from "@/lib/coloresCategoria";
import Estrellas from "@/components/Estrellas";

// Perfil del cliente visto por el prestador (28/09) — a partir del mockup "Perfil del cliente
// (visible para el prestador)" aprobado por el usuario. Las 4 tarjetas de métricas del mockup
// (trabajos con vos / en la plataforma / calificación como cliente / inasistencias) se muestran
// SIEMPRE las 4, en ese orden — cuando el cliente no tiene calificaciones o inasistencias todavía,
// se muestra "0" en vez de ocultar la tarjeta, a pedido explícito del usuario ("tiene que aparecer
// exactamente respetando todo como el mockup... si no tiene calificaciones o inasistencias tiene
// que mostrarlo el 0 también").
//
// Rediseño de desktop (28/09, quinta pasada) — el layout original (una sola columna angosta
// max-w-2xl, igual a Mi cuenta/Mis órdenes) se veía "como la vista de mobile" en una pantalla
// grande: las 4 tarjetas quedaban apretadas dentro de una columna chica rodeada de espacio vacío.
// El usuario pidió tomar como referencia el perfil del prestador (rediseñado el 27/09) y aplicar
// el mismo patrón acá: header oscuro de ancho completo con la identidad, barra de estadísticas
// también de ancho completo debajo, y el resto del contenido en una columna max-w-3xl centrada
// (más ancha que antes). En mobile colapsa igual que el perfil del prestador, sin necesidad de
// breakpoints extra — los bloques ya son de una sola columna por defecto.

const ESTADO_ESTILO: Record<string, string> = {
  Completado: "bg-stamp/10 text-stamp",
  Cancelado: "bg-ink/8 text-ink/50",
  EnDisputa: "bg-red-700/10 text-red-700",
};

function formatoMesAno(fechaISO: string): string {
  return new Date(fechaISO).toLocaleDateString("es-AR", { month: "long", year: "numeric" });
}

function formatoFechaLarga(fechaISO: string): string {
  return new Date(fechaISO).toLocaleDateString("es-AR", { day: "numeric", month: "short" });
}

function formatoFechaCorta(fechaISO: string): string {
  return new Date(fechaISO).toLocaleDateString("es-AR", { day: "numeric", month: "short" });
}

// Mismo criterio que en /prestador/[id] (tiempoRelativoReseña) — "hace 3 días" en vez de una fecha
// completa para los comentarios de "Lo que dicen otros prestadores".
function tiempoRelativo(fechaISO: string): string {
  const fecha = new Date(fechaISO);
  const diffDias = Math.floor((Date.now() - fecha.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDias < 1) return "hoy";
  if (diffDias === 1) return "ayer";
  if (diffDias < 30) return `hace ${diffDias} días`;
  if (diffDias < 365) return `hace ${Math.floor(diffDias / 30)} meses`;
  return fecha.toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "numeric" });
}

export default function PerfilClientePage() {
  const router = useRouter();
  const params = useParams();
  const clienteId = params?.id as string;

  const [perfil, setPerfil] = useState<PerfilCliente | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Foto del cliente en pantalla grande, tipo modal, cerrable — mismo patrón que /prestador/[id]
  // (agregado el 27/09 a pedido del usuario para la foto del prestador; se reutiliza acá para
  // mantener el mismo comportamiento en ambos perfiles).
  const [fotoModalAbierta, setFotoModalAbierta] = useState(false);

  useEffect(() => {
    const usuario = obtenerUsuario();
    if (!usuario) {
      router.push("/login");
      return;
    }
    if (usuario.rol !== "Prestador") {
      router.push("/cuenta");
      return;
    }

    (async () => {
      try {
        const resultado = await apiFetch<PerfilCliente>(`/api/prestador/clientes/${clienteId}/perfil`);
        setPerfil(resultado);
      } catch (e) {
        setError(e instanceof ApiError ? e.message : "No se pudo cargar el perfil del cliente.");
      } finally {
        setCargando(false);
      }
    })();
  }, [clienteId, router]);

  if (cargando) {
    return <p className="p-6 text-ink/60">Cargando...</p>;
  }

  if (error || !perfil) {
    return (
      <div className="max-w-2xl mx-auto mt-10 p-6">
        <p className="text-red-700 dark:text-red-400 text-sm">{error || "No se encontró ese cliente."}</p>
        <button onClick={() => router.back()} className="text-sm text-copper hover:underline mt-3">
          Volver
        </button>
      </div>
    );
  }

  const iniciales = `${perfil.nombre[0] ?? ""}${perfil.apellido[0] ?? ""}`.toUpperCase();

  return (
    <div className="w-full">
      {/* ---- Barra superior de navegación ---- */}
      <div className="max-w-3xl mx-auto px-6 pt-6">
        <button
          onClick={() => router.back()}
          className="text-sm text-ink/50 hover:text-ink inline-flex items-center gap-1"
        >
          <span className="text-lg leading-none">‹</span> Volver
        </button>
      </div>

      {/* ---- Header oscuro de ancho completo (mismo patrón que /prestador/[id]) ----
          Rediseño (28/09, octava pasada) — a partir de 3 mockups (Artifact
          https://claude.ai/artifact/1fZhVjLHZ4SFpf9APkNW4B) el usuario eligió combinar la
          Opción C (identidad suelta arriba + tarjeta de contacto angosta y centrada, contenida,
          para que nunca quede "todo hacia la izquierda") con la estética de datos de la Opción B
          (celdas rotuladas con etiqueta chica arriba y valor en negrita, en vez de ícono + oración).
          Ya no hace falta ningún breakpoint `sm` especial: la tarjeta de contacto queda centrada
          y acotada a un ancho fijo (max-w-[320px]) en cualquier tamaño de pantalla. */}
      <div className="w-full bg-ink text-paper mt-4">
        <div className="max-w-3xl mx-auto px-6 py-10 flex flex-col items-center text-center gap-5">
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
              <>{iniciales}</>
            )}
          </button>

          <div className="flex flex-col items-center gap-2">
            <h1 className="font-display text-2xl">
              {perfil.nombre} {perfil.apellido}
            </h1>
            {perfil.verificado && (
              <span className="inline-flex items-center gap-1 bg-copper/20 border border-copper/40 text-paper text-xs font-bold px-2.5 py-1 rounded-full">
                ✓ Identidad verificada
              </span>
            )}
          </div>

          {/* Tarjeta de contacto: celdas rotuladas (etiqueta chica + valor en negrita), estilo
              Opción B, dentro de una caja angosta y centrada, estructura Opción C. */}
          <div className="w-full max-w-[320px] grid grid-cols-2 divide-x divide-y divide-paper/10 border border-paper/10 rounded-2xl overflow-hidden bg-paper/5">
            <div className="px-4 py-3">
              <p className="text-[9px] uppercase tracking-wider font-bold text-paper/40 mb-1">Cliente desde</p>
              <p className="text-[12.5px] font-bold">{formatoMesAno(perfil.clienteDesde)}</p>
            </div>
            <div className="px-4 py-3">
              <p className="text-[9px] uppercase tracking-wider font-bold text-paper/40 mb-1">Teléfono</p>
              <p className="text-[12.5px] font-bold">{perfil.telefono || "—"}</p>
            </div>
            <div className="px-4 py-3 col-span-2">
              <p className="text-[9px] uppercase tracking-wider font-bold text-paper/40 mb-1">Dirección</p>
              {perfil.mostrarDireccion ? (
                perfil.direccion ? (
                  <p className="text-[12.5px] font-bold flex items-center gap-1.5">
                    {perfil.direccion}
                    {perfil.direccionVerificada && <span className="text-stamp text-xs">✓</span>}
                  </p>
                ) : (
                  <p className="text-[12.5px] font-bold text-paper/50">No cargada</p>
                )
              ) : (
                <p className="text-[11px] italic font-normal normal-case tracking-normal text-paper/40">
                  Se muestra una vez que pague o agende un turno con vos.
                </p>
              )}
            </div>
          </div>
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

      {/* ---- Barra de estadísticas de ancho completo (mismo patrón que /prestador/[id]) ----
          Las 4 tarjetas del mockup SIEMPRE se muestran, con 0 cuando no hay datos todavía. */}
      <div className="max-w-3xl mx-auto px-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 -mt-px py-6 border-b border-ink/10">
          <div className="text-center">
            <p className="font-display text-2xl text-ink">{perfil.trabajosCompletadosConEstePrestador}</p>
            <p className="text-xs text-ink/50">Trabajos con vos</p>
          </div>
          <div className="text-center">
            <p className="font-display text-2xl text-ink">{perfil.trabajosCompletadosEnLaPlataforma}</p>
            <p className="text-xs text-ink/50">Trabajos en la plataforma</p>
          </div>
          <div className="text-center">
            <p className="font-display text-2xl text-ink">
              {perfil.calificacionComoClientePromedio.toFixed(1)} <span className="text-copper">★</span>
            </p>
            <p className="text-xs text-ink/50">
              Calificación como cliente ({perfil.calificacionComoClienteCantidad})
            </p>
          </div>
          <div className="text-center">
            {/* Verde cuando nunca dejó a un prestador sin trabajar (0), rojo si tiene alguna
                registrada — a pedido del usuario, para que el 0 se lea como algo positivo y no
                como un dato neutro más. */}
            <p
              className={`font-display text-2xl ${
                perfil.inasistenciasUltimos3Meses > 0 ? "text-red-700 dark:text-red-400" : "text-stamp"
              }`}
            >
              {perfil.inasistenciasUltimos3Meses}
            </p>
            <p
              className={`text-xs ${
                perfil.inasistenciasUltimos3Meses > 0 ? "text-red-700/70 dark:text-red-400/70" : "text-stamp/70"
              }`}
            >
              Inasistencia{perfil.inasistenciasUltimos3Meses === 1 ? "" : "s"} registrada
              {perfil.inasistenciasUltimos3Meses === 1 ? "" : "s"}
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8 flex flex-col gap-10">
        {/* Inasistencias (28/09): reportadas por algún prestador, no necesariamente confirmadas —
            ver claude/backlog.md sobre por qué esto es una señal a tener en cuenta y no un hecho
            probado (no hay forma de verificar quién dice la verdad todavía). */}
        {perfil.inasistenciasUltimos3Meses > 0 && (
          <div className="bg-red-700/5 border border-red-700/20 rounded-xl p-4 flex gap-2 items-start">
            <span className="text-red-700 dark:text-red-400 text-sm shrink-0">⚠</span>
            <p className="text-sm text-ink/65">
              Registra {perfil.inasistenciasUltimos3Meses} inasistencia
              {perfil.inasistenciasUltimos3Meses > 1 ? "s" : ""} en los últimos 3 meses
              {perfil.ultimaInasistenciaFecha && (
                <> (la más reciente, del {formatoFechaLarga(perfil.ultimaInasistenciaFecha)})</>
              )}
              . Son reportes de otros prestadores, todavía sin una forma de confirmarlos del todo — tenelo en
              cuenta al coordinar el horario.
            </p>
          </div>
        )}

        {/* ---- "Lo que dicen otros prestadores" (mismo patrón que "Reseñas de clientes" del
            perfil del prestador) — solo se muestra si hay al menos un comentario; a diferencia de
            las tarjetas de arriba, acá no tiene sentido mostrar un estado vacío con "0". ---- */}
        {perfil.comentariosDeOtrosPrestadores.length > 0 && (
          <div>
            <p className="font-mono text-xs tracking-widest text-copper uppercase mb-3">
              Lo que dicen otros prestadores · {perfil.calificacionComoClientePromedio.toFixed(1)} ★ ·{" "}
              {perfil.calificacionComoClienteCantidad} calificacion
              {perfil.calificacionComoClienteCantidad === 1 ? "" : "es"}
            </p>
            <ul className="flex flex-col gap-3">
              {perfil.comentariosDeOtrosPrestadores.map((c, i) => (
                <li key={i} className="bg-surface border border-ink/10 rounded-lg p-5">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-copper/10 text-copper flex items-center justify-center font-display font-bold text-sm shrink-0">
                        {c.prestadorNombreCompleto
                          .split(" ")
                          .filter(Boolean)
                          .slice(0, 2)
                          .map((p) => p[0])
                          .join("")
                          .toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm text-ink truncate">{c.prestadorNombreCompleto}</p>
                        <p className="text-xs text-ink/40">{tiempoRelativo(c.creadoEn)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Estrellas valor={c.promedio} tamaño="text-sm" />
                      <span className="text-xs text-ink/50 font-medium">{c.promedio.toFixed(1)}</span>
                    </div>
                  </div>
                  <p className="text-sm text-ink/70 leading-snug">&ldquo;{c.comentario}&rdquo;</p>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* ---- Historial con vos ---- */}
        <div>
          <p className="font-mono text-xs tracking-widest text-copper uppercase mb-3">Historial con vos</p>
          {perfil.historialConEstePrestador.length === 0 ? (
            <p className="text-ink/50 text-sm">Todavía no tuviste ninguna orden con este cliente.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {perfil.historialConEstePrestador.map((o) => {
                const etiqueta = estiloEtiquetaCategoria(o.categoriaNombre);
                return (
                  <li key={o.ordenId} className="bg-surface border border-ink/10 rounded-lg px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs text-ink/45 w-14 shrink-0">
                        {o.fecha ? formatoFechaCorta(o.fecha) : "—"}
                      </span>
                      <span
                        style={etiqueta}
                        className="text-[9.5px] font-semibold px-2 py-0.5 rounded-full shrink-0 hidden sm:inline-block"
                      >
                        {o.categoriaNombre}
                      </span>
                      <span className="text-sm text-ink flex-1 truncate">{o.descripcion || o.categoriaNombre}</span>
                      <span
                        className={`text-[10px] font-semibold px-2.5 py-1 rounded-full shrink-0 ${
                          o.inasistenciaReportada
                            ? "bg-red-700/10 text-red-700 dark:text-red-400"
                            : ESTADO_ESTILO[o.estado] ?? "bg-ink/8 text-ink/50"
                        }`}
                      >
                        {o.inasistenciaReportada ? "No se presentó" : ESTADO_LABELS[o.estado] ?? o.estado}
                      </span>
                    </div>

                    {/* Reseña que el cliente dejó sobre este trabajo puntual (28/09, a pedido del
                        usuario: "abajo en los trabajos se tiene que poder visualizar las reseñas
                        que ese cliente haya hecho") — solo aparece si esa orden ya fue calificada. */}
                    {o.resenaComentario && o.resenaPromedio != null && (
                      <div className="mt-2.5 pt-2.5 border-t border-ink/6 flex items-start gap-2">
                        <Estrellas valor={o.resenaPromedio} tamaño="text-xs" />
                        <p className="text-sm text-ink/65 leading-snug flex-1">
                          &ldquo;{o.resenaComentario}&rdquo;
                        </p>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <p className="text-xs text-ink/35 text-center">
          ¿Algo no coincide?{" "}
          <Link href="/mensajes" className="text-copper hover:underline">
            Volver a tus mensajes
          </Link>
        </p>
      </div>
    </div>
  );
}
