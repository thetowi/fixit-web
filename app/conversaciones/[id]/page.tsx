"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import * as signalR from "@microsoft/signalr";
import { Paperclip, Mic, Check, X } from "lucide-react";
import fixWebmDuration from "fix-webm-duration";
import { apiFetch, ApiError } from "@/lib/api";
import { obtenerUsuario } from "@/lib/auth";
import { crearConexionChat } from "@/lib/chatConnection";
import { Mensaje } from "@/types/mensajes";
import { Usuario } from "@/types/auth";
import { Conversacion } from "@/types/conversaciones";
import Link from "next/link";

// Tope de duración de un audio grabado en el chat, para que nadie mande sin querer una nota de
// voz de 10 minutos que tarda una eternidad en subir — 2 minutos alcanza de sobra para explicar
// un problema o coordinar algo.
const MAX_SEGUNDOS_AUDIO = 120;

export default function ConversacionPage() {
  const params = useParams();
  const router = useRouter();
  const conversacionId = params.id as string;

  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [nuevoMensaje, setNuevoMensaje] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [conectado, setConectado] = useState(false);
  const [mostrandoOferta, setMostrandoOferta] = useState(false);
  const [descripcionOferta, setDescripcionOferta] = useState("");
  const [montoOferta, setMontoOferta] = useState("");
  const [enviandoOferta, setEnviandoOferta] = useState(false);
  const [pagando, setPagando] = useState(false);
  const [cancelandoOfertaId, setCancelandoOfertaId] = useState<string | null>(null);
  const [subiendoArchivo, setSubiendoArchivo] = useState(false);
  const [grabando, setGrabando] = useState(false);
  const [segundosGrabados, setSegundosGrabados] = useState(0);
  const [imagenAmpliada, setImagenAmpliada] = useState<string | null>(null);

  const conexionRef = useRef<signalR.HubConnection | null>(null);
  const finalMensajesRef = useRef<HTMLDivElement>(null);
  const inputArchivoRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksAudioRef = useRef<Blob[]>([]);
  const streamAudioRef = useRef<MediaStream | null>(null);
  const timerGrabacionRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const descartarGrabacionRef = useRef(false);
  // Además del estado (para repintar el contador en pantalla), guardamos los segundos en un ref:
  // el callback `onstop` de MediaRecorder se define una sola vez al iniciar la grabación, así que
  // si leyera el estado de React ahí adentro vería siempre el valor de ese momento (0), no el
  // último.
  const segundosGrabadosRef = useRef(0);
  // obtenerUsuario() lee localStorage, que no existe en el server: si lo leyéramos ya en el
  // useState inicial, el primer render del cliente (hidratación) no coincidiría con el HTML
  // que mandó el server (que siempre lo ve como null) y React tira "Hydration failed". Por eso
  // arrancamos en null y lo cargamos recién en el efecto, ya del lado del cliente.
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [conversacion, setConversacion] = useState<Conversacion | null>(null);

  useEffect(() => {
    const usuarioActual = obtenerUsuario();
    if (!usuarioActual) {
      router.push("/login");
      return;
    }
    setUsuario(usuarioActual);

    let activo = true;

    function marcarLeidoYAvisar() {
      apiFetch(`/api/conversaciones/${conversacionId}/mensajes/leido`, { method: "PUT" })
        .then(() => window.dispatchEvent(new Event("fixit:no-leidos-actualizado")))
        .catch(() => {
          // silencioso: si falla, el badge simplemente no se actualiza al toque
        });
    }

    async function iniciar() {
      try {
        const [historial, datosConversacion] = await Promise.all([
          apiFetch<Mensaje[]>(`/api/conversaciones/${conversacionId}/mensajes`),
          apiFetch<Conversacion>(`/api/conversaciones/${conversacionId}`),
        ]);
        if (!activo) return;
        setMensajes(historial);
        setConversacion(datosConversacion);

        marcarLeidoYAvisar();

        const conexion = crearConexionChat();
        conexionRef.current = conexion;

        conexion.on("RecibirMensaje", (mensaje: Mensaje) => {
          setMensajes((prev) => {
            // El backend difunde este mismo mensaje a TODO el grupo de la conversación, incluido
            // quien lo mandó (que además ya lo agrega apenas le llega la respuesta del POST/invoke
            // correspondiente). Sin este chequeo, a quien envía una oferta le terminaba apareciendo
            // duplicada: una vez por la respuesta directa y otra por este broadcast.
            if (prev.some((m) => m.id === mensaje.id)) return prev;

            // Si llega una oferta nueva, marcamos las anteriores como no vigentes en pantalla también
            const actualizados = mensaje.tipo === "Oferta"
              ? prev.map((m) => (m.tipo === "Oferta" ? { ...m, ofertaVigente: false } : m))
              : prev;
            return [...actualizados, mensaje];
          });

          if (usuarioActual && mensaje.emisorId !== usuarioActual.id) {
            marcarLeidoYAvisar();
          }
        });

        // A diferencia de RecibirMensaje, esto no agrega un mensaje nuevo: actualiza en el
        // lugar una oferta existente (ej. cuando el prestador la cancela)
        conexion.on("OfertaActualizada", (mensaje: Mensaje) => {
          setMensajes((prev) => prev.map((m) => (m.id === mensaje.id ? mensaje : m)));
        });

        conexion.onreconnected(() => {
          // SignalR no restaura solo la membresía a grupos tras reconectar: hay que volver a unirse
          conexion.invoke("UnirseAConversacion", conversacionId).catch(() => {
            setError("Se reconectó el chat pero no pudimos volver a unirte a la conversación. Recargá la página.");
          });
        });

        await conexion.start();
        await conexion.invoke("UnirseAConversacion", conversacionId);

        if (activo) setConectado(true);
      } catch (err) {
        if (err instanceof ApiError && err.status === 403) {
          setError("No tenés acceso a esta conversación.");
        } else {
          setError("No pudimos conectar el chat. Intentá recargar la página.");
        }
      }
    }

    iniciar();

    return () => {
      activo = false;
      conexionRef.current?.stop();
    };
  }, [conversacionId, router]);

  // Con ofertas que vencen en 30 minutos, refrescamos el contador cada 30s aunque no llegue
  // ningún mensaje nuevo, para que no se quede mostrando un tiempo viejo mientras el chat está abierto
  const [, forzarRefrescoVencimiento] = useState(0);
  useEffect(() => {
    const intervalId = setInterval(() => forzarRefrescoVencimiento((t) => t + 1), 30000);
    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    finalMensajesRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensajes]);

  async function handleEnviar(e: React.FormEvent) {
    e.preventDefault();
    if (!nuevoMensaje.trim() || !conexionRef.current) return;

    try {
      await conexionRef.current.invoke("EnviarMensaje", conversacionId, nuevoMensaje);
      setNuevoMensaje("");
    } catch {
      setError("No se pudo enviar el mensaje.");
    }
  }

  // Sube un archivo (foto/cámara, video, o el blob de un audio grabado) y lo agrega al chat.
  // Mismo patrón que las ofertas: POST directo (no un método de Hub, que no es buen canal para
  // binarios) y el broadcast de SignalR es lo que lo hace aparecer en tiempo real de los dos lados.
  async function subirArchivo(
    archivo: Blob,
    tipo: "Imagen" | "Audio" | "Video",
    nombreArchivo: string,
    duracionSegundos?: number
  ) {
    setError(null);
    setSubiendoArchivo(true);

    const token = localStorage.getItem("fixit_token");
    const formData = new FormData();
    formData.append("tipo", tipo);
    formData.append("archivo", archivo, nombreArchivo);
    if (duracionSegundos !== undefined) {
      formData.append("duracionSegundos", String(duracionSegundos));
    }

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      const response = await fetch(`${apiUrl}/api/conversaciones/${conversacionId}/mensajes/archivo`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => null);
        throw new Error(errorBody?.error ?? "No se pudo enviar el archivo");
      }

      const mensaje: Mensaje = await response.json();
      setMensajes((prev) => {
        // Mismo chequeo de siempre: si el broadcast de SignalR ya llegó antes que esta respuesta
        // del POST se resuelva, no lo dupliquemos.
        if (prev.some((m) => m.id === mensaje.id)) return prev;
        return [...prev, mensaje];
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo enviar el archivo");
    } finally {
      setSubiendoArchivo(false);
    }
  }

  function handleArchivoSeleccionado(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    e.target.value = ""; // permite elegir el mismo archivo dos veces seguidas
    if (!archivo) return;

    const tipo = archivo.type.startsWith("video/") ? "Video" : "Imagen";
    subirArchivo(archivo, tipo, archivo.name || (tipo === "Video" ? "video.mp4" : "foto.jpg"));
  }

  async function iniciarGrabacion() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamAudioRef.current = stream;
      chunksAudioRef.current = [];
      descartarGrabacionRef.current = false;

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (evento) => {
        if (evento.data.size > 0) chunksAudioRef.current.push(evento.data);
      };

      mediaRecorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        streamAudioRef.current = null;

        if (!descartarGrabacionRef.current && chunksAudioRef.current.length > 0) {
          const blobCrudo = new Blob(chunksAudioRef.current, { type: mediaRecorder.mimeType || "audio/webm" });
          // Los .webm que arma MediaRecorder no traen la duración en el header del contenedor
          // (se arma "en vivo", pensado para irse reproduciendo mientras se graba, no para
          // guardarse y abrirse después). Por eso al subirlo y reproducirlo desde una URL —a
          // diferencia de reproducirlo al toque desde el mismo blob en memoria— Chrome no puede
          // calcular la duración y el reproductor nativo queda pegado en "0:00 / 0:00" sin poder
          // arrancar. fix-webm-duration reescribe ese header con la duración real (bug conocido
          // de Chrome/MediaRecorder) antes de subirlo.
          const duracionMs = segundosGrabadosRef.current * 1000;
          fixWebmDuration(blobCrudo, duracionMs, (blobCorregido: Blob) => {
            subirArchivo(blobCorregido, "Audio", "audio.webm", segundosGrabadosRef.current);
          });
        }
        chunksAudioRef.current = [];
      };

      mediaRecorder.start();
      setGrabando(true);
      setSegundosGrabados(0);
      segundosGrabadosRef.current = 0;

      timerGrabacionRef.current = setInterval(() => {
        segundosGrabadosRef.current += 1;
        setSegundosGrabados(segundosGrabadosRef.current);
        if (segundosGrabadosRef.current >= MAX_SEGUNDOS_AUDIO) {
          detenerGrabacion(true);
        }
      }, 1000);
    } catch {
      setError("No pudimos acceder al micrófono. Revisá los permisos del navegador.");
    }
  }

  function detenerGrabacion(enviar: boolean) {
    descartarGrabacionRef.current = !enviar;
    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current = null;

    if (timerGrabacionRef.current) {
      clearInterval(timerGrabacionRef.current);
      timerGrabacionRef.current = null;
    }
    setGrabando(false);
    setSegundosGrabados(0);
  }

  // Por si el usuario cierra/navega afuera de la página con el micrófono todavía abierto
  useEffect(() => {
    return () => {
      if (timerGrabacionRef.current) clearInterval(timerGrabacionRef.current);
      streamAudioRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  function formatoTiempo(segundos: number): string {
    const min = Math.floor(segundos / 60);
    const seg = segundos % 60;
    return `${min}:${seg.toString().padStart(2, "0")}`;
  }

  async function handleEnviarOferta(e: React.FormEvent) {
    e.preventDefault();
    // Guard contra doble envío: sin esto, un doble click/doble tap en "Ofertar" dispara dos
    // POST antes de que termine el primero (el botón solo se deshabilitaba por validación de los
    // campos, no mientras la request estaba en curso) y quedaban dos ofertas cargadas de verdad.
    if (enviandoOferta) return;

    const monto = Number(montoOferta);
    if (!descripcionOferta.trim()) {
      setError('Contá brevemente qué trabajo es (ej. "Arreglo farola").');
      return;
    }
    if (!monto || monto <= 0) {
      setError("Ingresá un monto válido.");
      return;
    }

    setEnviandoOferta(true);
    try {
      const mensaje = await apiFetch<Mensaje>(`/api/conversaciones/${conversacionId}/ofertas`, {
        method: "POST",
        body: JSON.stringify({ monto, descripcion: descripcionOferta.trim() }),
      });
      setMensajes((prev) => {
        // Mismo chequeo que en RecibirMensaje: si el broadcast de SignalR ya llegó antes de que
        // esta respuesta del POST se resuelva, no la dupliquemos.
        if (prev.some((m) => m.id === mensaje.id)) return prev;
        return [
          ...prev.map((m) => (m.tipo === "Oferta" ? { ...m, ofertaVigente: false } : m)),
          mensaje,
        ];
      });
      setMostrandoOferta(false);
      setDescripcionOferta("");
      setMontoOferta("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error al enviar la oferta");
    } finally {
      setEnviandoOferta(false);
    }
  }

  async function handlePagar(mensajeId: string) {
    setPagando(true);
    setError(null);
    try {
      const resultado = await apiFetch<{ initPoint: string }>(`/api/conversaciones/ofertas/${mensajeId}/pagar`, {
        method: "POST",
      });
      window.location.href = resultado.initPoint;
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error al iniciar el pago");
      setPagando(false);
    }
  }

  async function handleCancelarOferta(mensajeId: string) {
    setCancelandoOfertaId(mensajeId);
    setError(null);
    try {
      const mensaje = await apiFetch<Mensaje>(`/api/conversaciones/${conversacionId}/ofertas/${mensajeId}/cancelar`, {
        method: "POST",
      });
      setMensajes((prev) => prev.map((m) => (m.id === mensaje.id ? mensaje : m)));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo cancelar la oferta");
    } finally {
      setCancelandoOfertaId(null);
    }
  }

  function textoVencimiento(ofertaExpiraEn: string | null): string | null {
    if (!ofertaExpiraEn) return null;
    const minutosRestantes = (new Date(ofertaExpiraEn).getTime() - Date.now()) / (1000 * 60);
    if (minutosRestantes <= 0) return "Venció";
    if (minutosRestantes < 1) return "Vence en instantes";
    if (minutosRestantes < 60) return `Vence en ${Math.round(minutosRestantes)} min`;
    if (minutosRestantes < 60 * 24) return `Vence en ${Math.round(minutosRestantes / 60)} hs`;
    return `Vence en ${Math.round(minutosRestantes / (60 * 24))} días`;
  }

  if (error && mensajes.length === 0) return <p className="p-6 text-red-700 dark:text-red-400">{error}</p>;

  const esPrestador = usuario?.rol === "Prestador";
  const esCliente = usuario?.rol === "Cliente";

  // El cliente ve la foto/nombre del prestador y viceversa; solo el prestador tiene perfil
  // público hoy (/prestador/[id]), así que el nombre solo es clickeable en ese sentido
  const otroNombre = conversacion
    ? esCliente
      ? conversacion.prestadorNombreCompleto
      : conversacion.clienteNombreCompleto
    : null;
  const otroFoto = conversacion
    ? esCliente
      ? conversacion.prestadorFotoUrl
      : conversacion.clienteFotoUrl
    : null;
  const iniciales = otroNombre
    ? otroNombre.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("")
    : "";

  return (
    <div className="max-w-lg mx-auto mt-8 p-6 flex flex-col h-[85vh] w-full">
      <div className="flex items-center gap-3 mb-4">
        {otroFoto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={otroFoto} alt="" className="w-10 h-10 rounded-full object-cover shrink-0" />
        ) : (
          otroNombre && (
            <div className="w-10 h-10 rounded-full bg-ink/10 flex items-center justify-center font-display text-sm text-ink shrink-0">
              {iniciales}
            </div>
          )
        )}
        <div className="min-w-0">
          <h1 className="font-display text-xl text-ink truncate">Chat</h1>
          {otroNombre && (
            esCliente && conversacion ? (
              <Link
                href={`/prestador/${conversacion.prestadorId}`}
                className="text-xs text-copper hover:underline truncate block"
              >
                {otroNombre} · ver perfil
              </Link>
            ) : (
              <p className="text-xs text-ink/50 truncate">{otroNombre}</p>
            )
          )}
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto bg-surface border border-ink/10 rounded-lg p-3 flex flex-col gap-2 mb-3">
        {mensajes.map((m) => {
          const esMio = m.emisorId === usuario?.id;

          if (m.tipo === "Oferta") {
            const colorBorde = m.ofertaPagada
              ? "border-emerald-600"
              : m.ofertaVigente
              ? "border-copper"
              : "border-ink/10 opacity-60";
            const colorHeader = m.ofertaPagada
              ? "bg-emerald-600 text-paper"
              : m.ofertaVigente
              ? "bg-copper text-paper"
              : "bg-ink/10 text-ink/50";

            return (
              <div
                key={m.id}
                className={`max-w-[90%] w-[280px] shrink-0 rounded-xl overflow-hidden shadow-md border-2 ${colorBorde} ${
                  esMio ? "self-end" : "self-start"
                }`}
              >
                <div className={`flex items-center gap-2 px-3.5 py-2 ${colorHeader}`}>
                  <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px] font-display shrink-0">
                    {m.ofertaPagada ? "✓" : "$"}
                  </span>
                  <p className="font-mono text-[10px] uppercase tracking-widest truncate">
                    {esMio ? "Enviaste una oferta" : `${m.emisorNombre} te envió una oferta`}
                  </p>
                  {(m.ofertaPagada || m.ofertaVigente) && (
                    <span className="ml-auto font-mono text-[9px] uppercase tracking-widest bg-white/20 rounded-full px-2 py-0.5 shrink-0">
                      {m.ofertaPagada ? "Pagada" : "Vigente"}
                    </span>
                  )}
                </div>

                <div className="bg-surface px-3.5 py-3">
                  {m.descripcionOferta && (
                    <p className="text-sm text-ink/70 mb-1">{m.descripcionOferta}</p>
                  )}
                  <p className="font-display text-3xl text-ink leading-none">
                    ${m.montoOferta!.toLocaleString("es-AR")}
                  </p>

                  {m.ofertaPagada ? (
                    <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-3 flex items-center gap-1.5 font-medium">
                      <span className="text-emerald-600">✓</span> Esta oferta ya fue pagada
                    </p>
                  ) : (
                    <>
                      {!m.ofertaVigente && (
                        <p className="text-xs text-ink/40 mt-2">
                          {m.ofertaExpiraEn && new Date(m.ofertaExpiraEn).getTime() <= Date.now()
                            ? "Esta oferta venció"
                            : "Superada por una oferta más reciente"}
                        </p>
                      )}

                      {m.ofertaVigente && esCliente && !esMio && (
                        <button
                          onClick={() => handlePagar(m.id)}
                          disabled={pagando}
                          className="w-full mt-3 bg-safety text-ink text-sm font-semibold rounded-lg px-3 py-2.5 hover:brightness-95 transition-all disabled:opacity-40"
                        >
                          {pagando ? "Redirigiendo..." : "Pagar con Mercado Pago"}
                        </button>
                      )}

                      {m.ofertaVigente && esMio && (
                        <>
                          <p className="text-xs text-ink/50 mt-3 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-safety animate-pulse shrink-0" />
                            Esperando que el cliente pague...
                          </p>
                          <button
                            onClick={() => handleCancelarOferta(m.id)}
                            disabled={cancelandoOfertaId === m.id}
                            className="w-full mt-2 border border-ink/20 text-ink/60 text-xs rounded-lg px-3 py-1.5 hover:border-ink/40 hover:text-ink transition-colors disabled:opacity-40"
                          >
                            {cancelandoOfertaId === m.id ? "Cancelando..." : "Cancelar oferta"}
                          </button>
                        </>
                      )}

                      {m.ofertaVigente && textoVencimiento(m.ofertaExpiraEn) && (
                        <p className="text-[11px] text-ink/40 mt-2">{textoVencimiento(m.ofertaExpiraEn)}</p>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          }

          if (m.tipo === "Imagen") {
            return (
              <div
                key={m.id}
                className={`max-w-[70%] shrink-0 rounded-lg overflow-hidden ${esMio ? "self-end" : "self-start"}`}
              >
                {!esMio && <p className="text-xs text-copper mb-1">{m.emisorNombre}</p>}
                <button type="button" onClick={() => setImagenAmpliada(m.archivoUrl)} className="block">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={m.archivoUrl ?? ""}
                    alt="Foto enviada en el chat"
                    className="max-h-64 w-auto rounded-lg object-cover hover:brightness-95 transition-all"
                  />
                </button>
              </div>
            );
          }

          if (m.tipo === "Video") {
            return (
              <div
                key={m.id}
                className={`max-w-[70%] shrink-0 rounded-lg overflow-hidden ${esMio ? "self-end" : "self-start"}`}
              >
                {!esMio && <p className="text-xs text-copper mb-1">{m.emisorNombre}</p>}
                <video controls src={m.archivoUrl ?? ""} className="max-h-64 w-auto rounded-lg" />
              </div>
            );
          }

          if (m.tipo === "Audio") {
            return (
              <div
                key={m.id}
                className={`max-w-[85%] w-[260px] shrink-0 rounded-lg p-2 ${
                  esMio ? "bg-ink text-paper self-end" : "bg-paper border border-ink/10 self-start"
                }`}
              >
                {!esMio && <p className="text-xs text-copper mb-1">{m.emisorNombre}</p>}
                <audio controls src={m.archivoUrl ?? ""} className="w-full h-9" />
                {m.duracionSegundos != null && (
                  <p className={`text-[11px] mt-1 ${esMio ? "text-paper/60" : "text-ink/40"}`}>
                    {formatoTiempo(m.duracionSegundos)}
                  </p>
                )}
              </div>
            );
          }

          return (
            <div
              key={m.id}
              className={`max-w-[75%] shrink-0 rounded-lg p-2 text-sm ${
                esMio ? "bg-ink text-paper self-end" : "bg-paper border border-ink/10 self-start"
              }`}
            >
              {!esMio && <p className="text-xs text-copper mb-1">{m.emisorNombre}</p>}
              <p>{m.contenido}</p>
            </div>
          );
        })}
        <div ref={finalMensajesRef} />
      </div>

      {error && !mostrandoOferta && <p className="text-red-700 dark:text-red-400 text-sm mb-2">{error}</p>}
      {subiendoArchivo && <p className="text-ink/40 text-xs mb-2">Enviando...</p>}

      <input
        ref={inputArchivoRef}
        type="file"
        accept="image/*,video/*"
        className="hidden"
        onChange={handleArchivoSeleccionado}
      />

      {grabando ? (
        <div className="flex items-center gap-2 border border-ink/20 rounded p-2">
          <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse shrink-0" />
          <p className="text-sm text-ink flex-1">Grabando audio... {formatoTiempo(segundosGrabados)}</p>
          <button
            type="button"
            onClick={() => detenerGrabacion(false)}
            aria-label="Cancelar grabación"
            className="text-ink/50 hover:text-ink transition-colors p-1"
          >
            <X size={18} />
          </button>
          <button
            type="button"
            onClick={() => detenerGrabacion(true)}
            aria-label="Enviar audio"
            className="bg-ink text-paper rounded-full p-1.5 hover:bg-ink/80 transition-colors"
          >
            <Check size={16} />
          </button>
        </div>
      ) : (
        <form onSubmit={handleEnviar} className="flex gap-2">
          <button
            type="button"
            onClick={() => inputArchivoRef.current?.click()}
            disabled={!conectado || subiendoArchivo}
            aria-label="Adjuntar foto o video"
            className="text-ink/50 hover:text-ink transition-colors disabled:opacity-40 shrink-0 px-1"
          >
            <Paperclip size={20} />
          </button>
          <input
            type="text"
            placeholder={conectado ? "Escribí un mensaje..." : "Conectando..."}
            disabled={!conectado}
            className="border border-ink/20 rounded p-2 flex-1 min-w-0 bg-surface disabled:opacity-50"
            value={nuevoMensaje}
            onChange={(e) => setNuevoMensaje(e.target.value)}
          />
          {!nuevoMensaje.trim() && (
            <button
              type="button"
              onClick={iniciarGrabacion}
              disabled={!conectado || subiendoArchivo}
              aria-label="Grabar audio"
              className="text-ink/50 hover:text-ink transition-colors disabled:opacity-40 shrink-0 px-1"
            >
              <Mic size={20} />
            </button>
          )}
          {esPrestador && (
            <button
              type="button"
              onClick={() => {
                setError(null);
                setMostrandoOferta(true);
              }}
              className="border border-copper text-copper rounded px-3 whitespace-nowrap hover:bg-copper/5 transition-colors"
            >
              Ofertar
            </button>
          )}
          <button
            type="submit"
            disabled={!conectado || !nuevoMensaje.trim()}
            className="bg-ink text-paper rounded px-4 hover:bg-ink/80 transition-colors disabled:opacity-40"
          >
            Enviar
          </button>
        </form>
      )}

      {imagenAmpliada && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/80 backdrop-blur-sm p-4"
          onClick={() => setImagenAmpliada(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imagenAmpliada} alt="Foto ampliada" className="max-w-full max-h-full rounded-lg" />
          <button
            type="button"
            onClick={() => setImagenAmpliada(null)}
            aria-label="Cerrar"
            className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors"
          >
            <X size={28} />
          </button>
        </div>
      )}

      {mostrandoOferta && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 backdrop-blur-sm p-4"
          onClick={() => {
            if (enviandoOferta) return;
            setError(null);
            setMostrandoOferta(false);
            setDescripcionOferta("");
            setMontoOferta("");
          }}
        >
          <form
            onSubmit={handleEnviarOferta}
            onClick={(e) => e.stopPropagation()}
            className="bg-surface rounded-xl shadow-xl border border-ink/10 w-full max-w-sm p-5 flex flex-col gap-4"
          >
            <div>
              <p className="font-mono text-xs tracking-widest text-copper uppercase mb-1">Nueva oferta</p>
              <h2 className="font-display text-lg text-ink">
                {otroNombre ? `Ofertale un trabajo a ${otroNombre}` : "Ofertale un trabajo a tu cliente"}
              </h2>
            </div>

            <label className="text-sm text-ink/60">
              Título
              <input
                type="text"
                placeholder="¿Qué trabajo es? (ej. Arreglo farola)"
                autoFocus
                className="border border-ink/20 rounded p-2 w-full mt-1 bg-paper"
                value={descripcionOferta}
                onChange={(e) => setDescripcionOferta(e.target.value)}
              />
            </label>

            <label className="text-sm text-ink/60">
              Precio
              <div className="relative mt-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/40 text-sm pointer-events-none">$</span>
                <input
                  type="number"
                  placeholder="0"
                  className="border border-ink/20 rounded p-2 pl-6 w-full bg-paper"
                  value={montoOferta}
                  onChange={(e) => setMontoOferta(e.target.value)}
                />
              </div>
            </label>

            {error && <p className="text-red-700 dark:text-red-400 text-sm">{error}</p>}

            <div className="flex gap-2 mt-1">
              <button
                type="button"
                disabled={enviandoOferta}
                onClick={() => {
                  setError(null);
                  setMostrandoOferta(false);
                  setDescripcionOferta("");
                  setMontoOferta("");
                }}
                className="flex-1 border border-ink/20 text-ink rounded-lg py-2.5 font-medium hover:border-ink/40 transition-colors disabled:opacity-40"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={enviandoOferta || !descripcionOferta.trim() || !montoOferta || Number(montoOferta) <= 0}
                className="flex-1 bg-copper text-paper rounded-lg py-2.5 font-medium hover:bg-copper-dark transition-colors disabled:opacity-40"
              >
                {enviandoOferta ? "Enviando..." : "Ofertar"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}