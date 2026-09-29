"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import * as signalR from "@microsoft/signalr";
import { Paperclip, Mic, Check, X, Send, BanknoteArrowUp, ShieldCheck } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api";
import { obtenerUsuario } from "@/lib/auth";
import { crearConexionChat } from "@/lib/chatConnection";
import { Mensaje } from "@/types/mensajes";
import { Usuario } from "@/types/auth";
import { Conversacion } from "@/types/conversaciones";
import { formatoDuracion } from "@/types/agenda";
import Link from "next/link";
import { colorCategoria } from "@/lib/coloresCategoria";
import IconoLucide from "@/components/IconoLucide";

// Tope de duración de un audio grabado en el chat, para que nadie mande sin querer una nota de
// voz de 10 minutos que tarda una eternidad en subir — 2 minutos alcanza de sobra para explicar
// un problema o coordinar algo.
const MAX_SEGUNDOS_AUDIO = 120;

// Mismo valor que Comision:PorcentajeDefault en appsettings.json del backend (22/09) — hardcodeado
// acá porque hoy no hay ningún endpoint que lo exponga al frontend. Si se cambia el valor en el
// backend, hay que actualizar este número a mano (o, mejor, exponerlo por API antes de sumar la
// lógica real de los 10 trabajos gratis).
const PORCENTAJE_COMISION_ESTIMADO = 0.1;

// Aviso de "no pagues/cobres por fuera de la app" (28/09, a pedido del usuario) — combina las dos
// opciones del mockup (Artifact 8dV5p5kqPaK1zATarpm2bV): la Opción A (modal que bloquea el paso)
// se muestra solo la primera vez que cada parte entra a ESTA conversación puntual, y la Opción B
// (tarjeta fija arriba del todo) queda de recordatorio permanente después de eso — y también para
// quien ya lo confirmó, aunque no se le vuelva a mostrar el modal. Textos aprobados por el usuario
// en el mockup; el texto de la tarjeta fija es una versión corta del mismo mensaje.
const AVISO_PAGO_TEXTO = {
  cliente: {
    modal:
      "Coordiná y pagá todo dentro de Oficy. Si acordás el pago por fuera de la app, la garantía de Oficy no va a estar vigente para este trabajo, y no vamos a poder ayudarte si algo sale mal.",
    banner: "Pagá siempre dentro de Oficy — fuera de la app perdés la garantía de este trabajo.",
  },
  prestador: {
    modal:
      "Coordiná y cobrá todo dentro de Oficy. Si arreglás el cobro por fuera de la app, no vas a estar cubierto por el seguro ni por el soporte de Oficy para este trabajo.",
    banner: "Cobrá siempre dentro de Oficy — fuera de la app no tenés cobertura de Oficy.",
  },
};

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
  // Diagnóstico temporal (19/09): cuando el navegador no puede reproducir un audio, guardamos
  // acá el código de error real del elemento <audio> (MediaError) para mostrarlo directo en la
  // burbuja del chat — así se puede ver la causa exacta desde el celular mismo, sin necesitar
  // conectar el teléfono a una compu para abrir la consola del navegador.
  const [erroresAudio, setErroresAudio] = useState<Record<string, string>>({});
  // Indicador de "está escribiendo..." (29/09). Nada de esto se persiste: es un aviso efímero por
  // SignalR (ver NotificarEscribiendo/UsuarioEscribiendo en ChatHub.cs). No hay un evento explícito
  // de "dejó de escribir" — en vez de eso, cada aviso que llega reinicia un timeout propio que
  // apaga el indicador si pasan 3s sin que llegue uno nuevo (typeof abajo).
  const [otroEscribiendo, setOtroEscribiendo] = useState(false);

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
  // Timeout que apaga "está escribiendo..." si no llega un nuevo aviso (ver más arriba), y el
  // control de cuándo mandamos NOSOTROS ese aviso al escribir (throttle: como mucho uno cada
  // INTERVALO_AVISO_ESCRIBIENDO ms mientras la persona sigue tipeando, no en cada tecla).
  const timeoutEscribiendoRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ultimoAvisoEscribiendoRef = useRef(0);
  // obtenerUsuario() lee localStorage, que no existe en el server: si lo leyéramos ya en el
  // useState inicial, el primer render del cliente (hidratación) no coincidiría con el HTML
  // que mandó el server (que siempre lo ve como null) y React tira "Hydration failed". Por eso
  // arrancamos en null y lo cargamos recién en el efecto, ya del lado del cliente.
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [conversacion, setConversacion] = useState<Conversacion | null>(null);
  const [mostrandoAvisoPago, setMostrandoAvisoPago] = useState(false);
  const [confirmandoAvisoPago, setConfirmandoAvisoPago] = useState(false);

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
        if (!datosConversacion.avisoPagoVisto) {
          setMostrandoAvisoPago(true);
        }

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
            let actualizados = mensaje.tipo === "Oferta"
              ? prev.map((m) => (m.tipo === "Oferta" ? { ...m, ofertaVigente: false } : m))
              : prev;
            // Mismo criterio para un turno reprogramado (22/09): el mensaje viejo queda tachado
            if (mensaje.tipo === "Turno") {
              actualizados = actualizados.map((m) => (m.tipo === "Turno" ? { ...m, turnoVigente: false } : m));
            }
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

        // Ver el comentario de NotificarEscribiendo en ChatHub.cs: no hay evento de "dejó de
        // escribir", así que cada aviso reinicia este timeout de 3s que apaga el indicador solo.
        conexion.on("UsuarioEscribiendo", () => {
          setOtroEscribiendo(true);
          if (timeoutEscribiendoRef.current) clearTimeout(timeoutEscribiendoRef.current);
          timeoutEscribiendoRef.current = setTimeout(() => setOtroEscribiendo(false), 3000);
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
      if (timeoutEscribiendoRef.current) clearTimeout(timeoutEscribiendoRef.current);
    };
  }, [conversacionId, router]);

  // Se llama en cada tecla del input (onChange, más abajo), pero solo le pega al hub como mucho
  // una vez cada 1.5s mientras la persona sigue tipeando — evitar mandar un mensaje de SignalR por
  // cada letra.
  const INTERVALO_AVISO_ESCRIBIENDO = 1500;
  function avisarQueEstoyEscribiendo() {
    const ahora = Date.now();
    if (ahora - ultimoAvisoEscribiendoRef.current < INTERVALO_AVISO_ESCRIBIENDO) return;
    ultimoAvisoEscribiendoRef.current = ahora;
    conexionRef.current?.invoke("NotificarEscribiendo", conversacionId).catch(() => {});
  }

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
          // guardarse y abrirse después). Habíamos probado reescribir ese header con
          // fix-webm-duration antes de subir, pero en producción (19/09) eso rompió la
          // reproducción del audio en el MISMO celular Android que lo grabó (MediaError código 4,
          // "formato no soportado") aunque en la PC receptora sí andaba: el parcheo de bytes que
          // hace esa librería arma un archivo que el demuxer más estricto de ese celular rechaza
          // directamente, algo que Chrome de escritorio tolera. Como la duración que mostramos en
          // pantalla (más abajo, "m.duracionSegundos") ya viene aparte —contada en vivo con un
          // contador propio, no leída del header del archivo—, no hace falta tocar el blob para
          // nada: lo subimos tal cual lo entrega MediaRecorder. El único costo es que el control
          // nativo del navegador puede no mostrar bien su propia barra de progreso/duración, pero
          // el audio se reproduce sin problemas en cualquier dispositivo.
          subirArchivo(blobCrudo, "Audio", "audio.webm", segundosGrabadosRef.current);
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
    } catch (err) {
      // getUserMedia es justo lo que dispara el cartel nativo del navegador pidiendo permiso
      // de micrófono la primera vez — pero si el usuario ya lo bloqueó una vez (o el navegador
      // lo negó de entrada), el navegador NO vuelve a mostrar ese cartel solo: hay que habilitarlo
      // a mano desde la configuración del sitio. Por eso acá distinguimos ese caso puntual
      // (NotAllowedError/PermissionDeniedError) para explicar los pasos concretos, en vez de un
      // mensaje genérico que no ayuda a resolverlo.
      const nombreError = err instanceof Error ? err.name : "";
      if (nombreError === "NotAllowedError" || nombreError === "PermissionDeniedError") {
        setError(
          "El micrófono está bloqueado para este sitio. Para habilitarlo: tocá el ícono de candado/información (ⓘ) al lado de la URL, arriba del navegador, entrá a \"Permisos\" y activá \"Micrófono\". Después volvé a intentar."
        );
      } else if (nombreError === "NotFoundError" || nombreError === "DevicesNotFoundError") {
        setError("No encontramos ningún micrófono en este dispositivo.");
      } else {
        setError("No pudimos acceder al micrófono. Revisá los permisos del navegador.");
      }
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

  async function handleConfirmarAvisoPago() {
    setConfirmandoAvisoPago(true);
    try {
      await apiFetch(`/api/conversaciones/${conversacionId}/aviso-pago-visto`, { method: "PUT" });
      setConversacion((prev) => (prev ? { ...prev, avisoPagoVisto: true } : prev));
      setMostrandoAvisoPago(false);
    } catch {
      // Si falla la confirmación, dejamos el modal abierto para reintentar — no tiene sentido
      // dejar pasar al chat sin que haya quedado registrado que lo vio, y reintentar es gratis.
      setError("No pudimos confirmar el aviso. Probá de nuevo.");
    } finally {
      setConfirmandoAvisoPago(false);
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

  // El cliente ve la foto/nombre del prestador y viceversa. El prestador tiene perfil público
  // (/prestador/[id]); el cliente tiene un perfil propio, visible solo para el prestador con el
  // que tuvo alguna orden (/prestador/clientes/[id], 28/09 — ver ClientesController), así que
  // ambos nombres terminan siendo clickeables, cada uno hacia su perfil correspondiente.
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

  // Un mismo prestador puede tener una conversación separada por cada rubro que ofrece (22/09) —
  // la etiqueta con ícono debajo del nombre y el tinte de fondo del chat son lo que deja claro,
  // sin ambigüedad, de qué rubro es ESTA conversación en particular.
  const colorRubro = conversacion ? colorCategoria(conversacion.categoriaNombre) : null;

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
          {otroNombre && conversacion && (
            <Link
              href={esCliente ? `/prestador/${conversacion.prestadorId}` : `/prestador/clientes/${conversacion.clienteId}`}
              className="font-display text-xl text-ink hover:text-copper truncate block"
            >
              {otroNombre}
            </Link>
          )}
          {conversacion && colorRubro && (
            <div
              className="inline-flex items-center gap-1 rounded-lg px-2 py-0.5 mt-0.5 w-fit"
              style={{ background: `${colorRubro}1F` }}
            >
              <span style={{ color: colorRubro }}>
                <IconoLucide nombre={conversacion.categoriaIcono} size={11} strokeWidth={2.5} />
              </span>
              <span className="text-[11px] font-semibold" style={{ color: colorRubro }}>
                {conversacion.categoriaNombre}
              </span>
            </div>
          )}
        </div>
      </div>

      <div
        className="relative flex-1 min-h-0 overflow-hidden border border-ink/10 rounded-lg mb-3"
        style={{ background: colorRubro ? `${colorRubro}0D` : undefined }}
      >
        {colorRubro && conversacion?.categoriaIcono && (
          <div
            className="absolute top-1/2 left-1/2 pointer-events-none"
            style={{ transform: "translate(-50%, -50%)", opacity: 0.07, color: colorRubro }}
          >
            <IconoLucide nombre={conversacion.categoriaIcono} size={190} strokeWidth={1} />
          </div>
        )}
        <div className="relative h-full overflow-y-auto p-3 flex flex-col gap-2">
        {conversacion && (esCliente || esPrestador) && (
          // Tarjeta fija de recordatorio (Opción B del mockup) — no es un mensaje real entre las
          // partes, es del sistema, por eso no tiene emisor ni entra al array de `mensajes`. Se ve
          // siempre, tanto antes como después de confirmar el modal de la primera vez.
          <div className="sticky top-0 z-10 -mx-3 -mt-3 mb-1 px-3 py-2 bg-copper/10 border-b border-copper/20 flex items-center gap-2 backdrop-blur-sm">
            <ShieldCheck size={15} className="text-copper shrink-0" />
            <p className="text-xs text-ink/70 leading-snug">
              {esCliente ? AVISO_PAGO_TEXTO.cliente.banner : AVISO_PAGO_TEXTO.prestador.banner}
            </p>
          </div>
        )}
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
                    <>
                      <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-3 flex items-center gap-1.5 font-medium">
                        <span className="text-emerald-600">✓</span> Esta oferta ya fue pagada
                      </p>
                      {m.ofertaAgendadaEn && (
                        <p className="text-xs text-ink/50 mt-1">
                          Agendada el{" "}
                          {new Date(m.ofertaAgendadaEn).toLocaleDateString("es-AR", { day: "numeric", month: "short" })} a las{" "}
                          {new Date(m.ofertaAgendadaEn).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      )}
                    </>
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

          if (m.tipo === "Turno") {
            // Turno agendado enviado al chat (22/09) — misma tarjeta visual que la Oferta,
            // tachada cuando el prestador reprograma y manda una nueva (turnoVigente = false).
            const fecha = m.turnoFechaHora ? new Date(m.turnoFechaHora) : null;
            const fechaTexto = fecha
              ? fecha.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" })
              : "";
            const horaTexto = fecha
              ? fecha.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })
              : "";
            const colorBorde = m.turnoVigente ? "border-copper" : "border-ink/10 opacity-60";
            const colorHeader = m.turnoVigente ? "bg-copper text-paper" : "bg-ink/10 text-ink/50";

            return (
              <div
                key={m.id}
                className={`max-w-[90%] w-[280px] shrink-0 rounded-xl overflow-hidden shadow-md border-2 ${colorBorde} ${
                  esMio ? "self-end" : "self-start"
                }`}
              >
                <div className={`flex items-center gap-2 px-3.5 py-2 ${colorHeader}`}>
                  <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px] font-display shrink-0">
                    📅
                  </span>
                  <p className="font-mono text-[10px] uppercase tracking-widest truncate">
                    {esMio ? "Agendaste un turno" : `${m.emisorNombre} agendó un turno`}
                  </p>
                  {!m.turnoVigente && (
                    <span className="ml-auto font-mono text-[9px] uppercase tracking-widest bg-white/20 rounded-full px-2 py-0.5 shrink-0">
                      Reprogramado
                    </span>
                  )}
                </div>

                <div className="bg-surface px-3.5 py-3">
                  <p className={`text-base font-semibold text-ink capitalize ${m.turnoVigente ? "" : "line-through"}`}>
                    {fechaTexto}
                  </p>
                  <p className={`text-sm text-ink/60 mt-0.5 ${m.turnoVigente ? "" : "line-through"}`}>
                    {horaTexto}
                    {m.turnoDuracionMinutos ? ` · ${formatoDuracion(m.turnoDuracionMinutos)}` : ""}
                  </p>
                  {!m.turnoVigente && (
                    <p className="text-xs text-ink/40 mt-2">Este turno se reprogramó — ver el mensaje más reciente</p>
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
                <audio
                  controls
                  src={m.archivoUrl ?? ""}
                  className="w-full h-9"
                  onError={(e) => {
                    const codigo = e.currentTarget.error?.code;
                    // Códigos estándar de MediaError (spec HTML5): 1 abortado, 2 red, 3 no se
                    // pudo decodificar el archivo (lo más probable acá), 4 formato/fuente no
                    // soportada por este navegador/dispositivo en particular.
                    const nombres: Record<number, string> = {
                      1: "cancelado",
                      2: "de red",
                      3: "no se pudo decodificar el archivo",
                      4: "formato no soportado en este dispositivo",
                    };
                    setErroresAudio((prev) => ({
                      ...prev,
                      [m.id]: codigo ? (nombres[codigo] ?? `código ${codigo}`) : "desconocido",
                    }));
                  }}
                />
                {erroresAudio[m.id] && (
                  <p className="text-[11px] mt-1 text-red-400">
                    Error de audio: {erroresAudio[m.id]}
                  </p>
                )}
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
      </div>

      {error && !mostrandoOferta && <p className="text-red-700 dark:text-red-400 text-sm mb-2">{error}</p>}
      {subiendoArchivo && <p className="text-ink/40 text-xs mb-2">Enviando...</p>}
      {!subiendoArchivo && otroEscribiendo && (
        <p className="text-ink/40 text-xs mb-2 italic">Escribiendo...</p>
      )}

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
            onChange={(e) => {
              setNuevoMensaje(e.target.value);
              if (e.target.value.trim()) avisarQueEstoyEscribiendo();
            }}
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
              aria-label="Ofertar un trabajo"
              className="border border-copper text-copper rounded px-3 shrink-0 hover:bg-copper/5 transition-colors flex items-center justify-center"
            >
              <BanknoteArrowUp size={18} />
            </button>
          )}
          <button
            type="submit"
            disabled={!conectado || !nuevoMensaje.trim()}
            aria-label="Enviar mensaje"
            className="bg-ink text-paper rounded px-4 hover:bg-ink/80 transition-colors disabled:opacity-40 flex items-center justify-center"
          >
            <Send size={18} />
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

            {/* Vista previa de cuánto cobraría el prestador (22/09, a pedido del usuario) — por ahora
                es SOLO visual, siempre resta el % de comisión configurado en el backend
                (Comision:PorcentajeDefault, hoy 10%), sin todavía chequear si el prestador ya superó
                los primeros 10 trabajos gratis (ReglasNegocio.TrabajosGratisPorPrestador) — eso queda
                para una vuelta futura, una vez validada la parte visual. */}
            {Number(montoOferta) > 0 && (
              <p className="text-sm text-ink/60">
                Vos cobrarías del trabajo:{" "}
                <span className="text-ink font-semibold">
                  ${Math.round(Number(montoOferta) * (1 - PORCENTAJE_COMISION_ESTIMADO)).toLocaleString("es-AR")}
                </span>
              </p>
            )}

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

      {mostrandoAvisoPago && (esCliente || esPrestador) && (
        // Opción A del mockup: modal que bloquea el paso, solo la primera vez que ESTA parte entra
        // a ESTA conversación puntual. A propósito sin onClick en el fondo ni botón de cerrar —
        // tiene que confirmarse con el botón para forzar a leerlo antes de escribir nada.
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 backdrop-blur-sm p-4">
          <div className="bg-surface rounded-xl shadow-xl border border-ink/10 w-full max-w-sm p-6 flex flex-col items-center text-center gap-4">
            <div className="w-12 h-12 rounded-full bg-copper/10 flex items-center justify-center">
              <ShieldCheck size={26} className="text-copper" />
            </div>
            <div>
              <h2 className="font-display text-lg text-ink mb-1">
                {esCliente ? "Coordiná y pagá todo dentro de Oficy" : "Coordiná y cobrá todo dentro de Oficy"}
              </h2>
              <p className="text-sm text-ink/60">
                {esCliente ? AVISO_PAGO_TEXTO.cliente.modal : AVISO_PAGO_TEXTO.prestador.modal}
              </p>
            </div>
            <Link href="/terminos" className="text-xs text-copper hover:underline">
              Ver cómo funciona la garantía de Oficy
            </Link>
            <button
              type="button"
              onClick={handleConfirmarAvisoPago}
              disabled={confirmandoAvisoPago}
              className="w-full bg-copper text-paper rounded-lg py-2.5 font-medium hover:bg-copper-dark transition-colors disabled:opacity-40"
            >
              {confirmandoAvisoPago ? "Confirmando..." : "Entendido, ir al chat"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}