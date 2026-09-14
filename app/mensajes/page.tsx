"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api";
import { obtenerUsuario } from "@/lib/auth";
import { Conversacion } from "@/types/conversaciones";

function iniciales(nombre: string): string {
  return nombre
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function tiempoRelativo(fechaISO: string): string {
  const fecha = new Date(fechaISO);
  const ahora = new Date();
  const diffMin = Math.floor((ahora.getTime() - fecha.getTime()) / 60000);

  if (diffMin < 1) return "ahora";
  if (diffMin < 60) return `hace ${diffMin} min`;
  const diffHoras = Math.floor(diffMin / 60);
  if (diffHoras < 24) return `hace ${diffHoras} h`;
  const diffDias = Math.floor(diffHoras / 24);
  if (diffDias === 1) return "ayer";
  if (diffDias < 7) return `hace ${diffDias} días`;
  return fecha.toLocaleDateString("es-AR", { day: "numeric", month: "short" });
}

export default function MensajesPage() {
  const router = useRouter();
  const [usuario] = useState(() => obtenerUsuario());
  const [conversaciones, setConversaciones] = useState<Conversacion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!usuario) {
      router.push("/login");
      return;
    }
    cargar();
  }, [router]);

  async function cargar() {
    try {
      const data = await apiFetch<Conversacion[]>("/api/conversaciones/mias");
      setConversaciones(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error al cargar tus mensajes");
    } finally {
      setCargando(false);
    }
  }

  if (cargando) return <p className="p-6 text-ink/60">Cargando...</p>;

  const esCliente = usuario?.rol === "Cliente";

  return (
    <div className="max-w-2xl mx-auto mt-16 p-6 w-full">
      <p className="font-mono text-xs tracking-widest text-copper uppercase mb-2">
        {esCliente ? "Cliente" : "Prestador"}
      </p>
      <h1 className="font-display text-2xl text-ink mb-6">Mensajes</h1>

      {error && <p className="text-red-700 text-sm mb-4">{error}</p>}

      {conversaciones.length === 0 ? (
        <div className="bg-white border border-ink/10 rounded-lg p-6 text-center">
          <p className="text-ink/50 text-sm">Todavía no tenés conversaciones.</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {conversaciones.map((c) => {
            const otroNombre = esCliente ? c.prestadorNombreCompleto : c.clienteNombreCompleto;
            const otroFoto = esCliente ? c.prestadorFotoUrl : c.clienteFotoUrl;
            const tieneNoLeidos = c.mensajesNoLeidos > 0;

            return (
              <li key={c.id}>
                <button
                  onClick={() => router.push(`/conversaciones/${c.id}`)}
                  className="w-full flex items-center gap-3 bg-white border border-ink/10 rounded-lg p-3 text-left hover:border-ink/25 transition-colors"
                >
                  {otroFoto ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={otroFoto} alt="" className="w-11 h-11 rounded-full object-cover shrink-0" />
                  ) : (
                    <div className="w-11 h-11 rounded-full bg-ink/10 flex items-center justify-center font-display text-sm text-ink shrink-0">
                      {iniciales(otroNombre)}
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className={`text-sm truncate ${tieneNoLeidos ? "font-semibold text-ink" : "font-medium text-ink"}`}>
                        {otroNombre}
                      </p>
                      {c.ultimoMensajeEn && (
                        <span className="font-mono text-[10px] text-ink/40 shrink-0">
                          {tiempoRelativo(c.ultimoMensajeEn)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-2 mt-0.5">
                      <p className={`text-xs truncate ${tieneNoLeidos ? "text-ink/80" : "text-ink/50"}`}>
                        {c.ultimoMensaje ?? `${c.categoriaNombre} · sin mensajes todavía`}
                      </p>
                      {tieneNoLeidos && (
                        <span className="bg-copper text-paper text-[10px] font-mono rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 shrink-0">
                          {c.mensajesNoLeidos}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
