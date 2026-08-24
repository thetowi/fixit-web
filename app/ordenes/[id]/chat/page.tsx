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
        // 1. Cargar historial existente
        const historial = await apiFetch<Mensaje[]>(`/api/ordenes/${ordenId}/mensajes`);
        if (!activo) return;
        setMensajes(historial);

        // 2. Conectar a SignalR
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

    // Cleanup: al salir de la pantalla, cerramos la conexión para no dejarla abierta de más
    return () => {
      activo = false;
      conexionRef.current?.stop();
    };
  }, [ordenId, router]);

  // Scroll automático al último mensaje
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

  if (error) return <p className="p-6 text-red-600">{error}</p>;

  return (
    <div className="max-w-lg mx-auto mt-8 p-6 flex flex-col h-[80vh]">
      <h1 className="text-xl font-bold mb-4">Chat de la orden</h1>

      <div className="flex-1 overflow-y-auto border rounded p-3 flex flex-col gap-2 mb-3">
        {mensajes.map((m) => {
          const esMio = m.emisorId === usuario?.id;
          return (
            <div
              key={m.id}
              className={`max-w-[75%] rounded p-2 text-sm ${
                esMio ? "bg-black text-white self-end" : "bg-gray-100 self-start"
              }`}
            >
              {!esMio && <p className="text-xs opacity-70 mb-1">{m.emisorNombre}</p>}
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
          className="border rounded p-2 flex-1"
          value={nuevoMensaje}
          onChange={(e) => setNuevoMensaje(e.target.value)}
        />
        <button
          type="submit"
          disabled={!conectado}
          className="bg-black text-white rounded px-4 disabled:opacity-50"
        >
          Enviar
        </button>
      </form>
    </div>
  );
}