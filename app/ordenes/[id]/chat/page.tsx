"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import * as signalR from "@microsoft/signalr";
import { apiFetch, ApiError } from "@/lib/api";
import { obtenerUsuario } from "@/lib/auth";
import { crearConexionChat } from "@/lib/chatConnection";
import { Mensaje } from "@/types/mensajes";

export default function ChatOrdenPage() {
  const params = useParams();
  const router = useRouter();
  const ordenId = params.id as string;

  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [nuevoMensaje, setNuevoMensaje] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [conectado, setConectado] = useState(false);

  const conexionRef = useRef<signalR.HubConnection | null>(null);
  const finalMensajesRef = useRef<HTMLDivElement>(null);
  const [usuario] = useState(() => obtenerUsuario());

  useEffect(() => {
    if (!usuario) {
      router.push("/login");
      return;
    }

    let activo = true;

    async function iniciar() {
      try {
        const historial = await apiFetch<Mensaje[]>(`/api/ordenes/${ordenId}/mensajes`);
        if (!activo) return;
        setMensajes(historial);

        const conexion = crearConexionChat();
        conexionRef.current = conexion;

        conexion.on("RecibirMensaje", (mensaje: Mensaje) => {
          setMensajes((prev) => [...prev, mensaje]);
        });

        await conexion.start();
        await conexion.invoke("UnirseAOrden", ordenId);

        if (activo) setConectado(true);
      } catch (err) {
        if (err instanceof ApiError && err.status === 403) {
          setError("No tenés acceso a esta orden.");
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
  }, [ordenId, router]);

  useEffect(() => {
    finalMensajesRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensajes]);

  async function handleEnviar(e: React.FormEvent) {
    e.preventDefault();
    if (!nuevoMensaje.trim() || !conexionRef.current) return;

    try {
      await conexionRef.current.invoke("EnviarMensaje", ordenId, nuevoMensaje);
      setNuevoMensaje("");
    } catch {
      setError("No se pudo enviar el mensaje.");
    }
  }

  if (error) return <p className="p-6 text-red-700">{error}</p>;

  return (
    <div className="max-w-lg mx-auto mt-8 p-6 flex flex-col h-[80vh] w-full">
      <p className="font-mono text-xs tracking-widest text-copper uppercase mb-1">Orden #{ordenId.slice(0, 8).toUpperCase()}</p>
      <h1 className="font-display text-xl text-ink mb-4">Chat</h1>

      <div className="flex-1 overflow-y-auto bg-white border border-ink/10 rounded-lg p-3 flex flex-col gap-2 mb-3">
        {mensajes.map((m) => {
          const esMio = m.emisorId === usuario?.id;
          return (
            <div
              key={m.id}
              className={`max-w-[75%] rounded-lg p-2 text-sm ${
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

      <form onSubmit={handleEnviar} className="flex gap-2">
        <input
          type="text"
          placeholder={conectado ? "Escribí un mensaje..." : "Conectando..."}
          disabled={!conectado}
          className="border border-ink/20 rounded p-2 flex-1 bg-white disabled:opacity-50"
          value={nuevoMensaje}
          onChange={(e) => setNuevoMensaje(e.target.value)}
        />
        <button
          type="submit"
          disabled={!conectado}
          className="bg-copper text-paper rounded px-4 hover:bg-copper-dark transition-colors disabled:opacity-40"
        >
          Enviar
        </button>
      </form>
    </div>
  );
}