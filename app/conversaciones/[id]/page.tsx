"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import * as signalR from "@microsoft/signalr";
import { apiFetch, ApiError } from "@/lib/api";
import { obtenerUsuario } from "@/lib/auth";
import { crearConexionChat } from "@/lib/chatConnection";
import { Mensaje } from "@/types/mensajes";
import { Usuario } from "@/types/auth";
import { Conversacion } from "@/types/conversaciones";
import Link from "next/link";

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
  const [pagando, setPagando] = useState(false);
  const [cancelandoOfertaId, setCancelandoOfertaId] = useState<string | null>(null);

  const conexionRef = useRef<signalR.HubConnection | null>(null);
  const finalMensajesRef = useRef<HTMLDivElement>(null);
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
            // Si llega una oferta nueva, marcamos las anteriores como no vigentes en pantalla también
            const actualizados = mensaje.tipo === "Oferta"
              ? prev.map((m) => (m.tipo === "Oferta" ? { ...m, ofertaVigente: false } : m))
              : prev;
            return [...actualizados, mensaje];
          });

          if (mensaje.emisorId !== usuarioActual.id) {
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

  async function handleEnviarOferta(e: React.FormEvent) {
    e.preventDefault();
    const monto = Number(montoOferta);
    if (!descripcionOferta.trim()) {
      setError('Contá brevemente qué trabajo es (ej. "Arreglo farola").');
      return;
    }
    if (!monto || monto <= 0) {
      setError("Ingresá un monto válido.");
      return;
    }

    try {
      const mensaje = await apiFetch<Mensaje>(`/api/conversaciones/${conversacionId}/ofertas`, {
        method: "POST",
        body: JSON.stringify({ monto, descripcion: descripcionOferta.trim() }),
      });
      setMensajes((prev) => [
        ...prev.map((m) => (m.tipo === "Oferta" ? { ...m, ofertaVigente: false } : m)),
        mensaje,
      ]);
      setMostrandoOferta(false);
      setDescripcionOferta("");
      setMontoOferta("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error al enviar la oferta");
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

      {error && <p className="text-red-700 dark:text-red-400 text-sm mb-2">{error}</p>}

      {mostrandoOferta ? (
        <form onSubmit={handleEnviarOferta} className="flex gap-2 mb-2">
          <input
            type="text"
            placeholder="¿Qué trabajo es? (ej. Arreglo farola)"
            autoFocus
            className="border border-ink/20 rounded p-2 flex-[2] bg-surface"
            value={descripcionOferta}
            onChange={(e) => setDescripcionOferta(e.target.value)}
          />
          <input
            type="number"
            placeholder="Monto"
            className="border border-ink/20 rounded p-2 flex-1 bg-surface"
            value={montoOferta}
            onChange={(e) => setMontoOferta(e.target.value)}
          />
          <button
            type="submit"
            disabled={!descripcionOferta.trim() || !montoOferta || Number(montoOferta) <= 0}
            className="bg-copper text-paper rounded px-4 hover:bg-copper-dark transition-colors disabled:opacity-40"
          >
            Enviar
          </button>
          <button
            type="button"
            onClick={() => {
              setError(null);
              setMostrandoOferta(false);
              setDescripcionOferta("");
              setMontoOferta("");
            }}
            className="border border-ink/20 rounded px-3 text-ink"
          >
            Cancelar
          </button>
        </form>
      ) : (
        <form onSubmit={handleEnviar} className="flex gap-2">
          <input
            type="text"
            placeholder={conectado ? "Escribí un mensaje..." : "Conectando..."}
            disabled={!conectado}
            className="border border-ink/20 rounded p-2 flex-1 bg-surface disabled:opacity-50"
            value={nuevoMensaje}
            onChange={(e) => setNuevoMensaje(e.target.value)}
          />
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
            disabled={!conectado}
            className="bg-ink text-paper rounded px-4 hover:bg-ink/80 transition-colors disabled:opacity-40"
          >
            Enviar
          </button>
        </form>
      )}
    </div>
  );
}