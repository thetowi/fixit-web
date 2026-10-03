"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api";
import { Notificacion } from "@/types/notificaciones";

// Centro de notificaciones (03/10, a pedido del usuario: "algo como Notificaciones donde
// alojemos todas las notificaciones disponibles o no leídas") — lista todo lo que ya se le manda
// a este usuario por PushNotificationService.NotificarAsync (chat, ofertas, repostos, pausar/
// reanudar un trabajo, etc.), ahora con historial persistente (ver backend Notificacion.cs).
function tiempoRelativo(fechaISO: string): string {
  const fecha = new Date(fechaISO);
  const diffMin = Math.floor((Date.now() - fecha.getTime()) / (1000 * 60));

  if (diffMin < 1) return "ahora";
  if (diffMin < 60) return `hace ${diffMin} min`;
  const diffHoras = Math.floor(diffMin / 60);
  if (diffHoras < 24) return `hace ${diffHoras} h`;
  const diffDias = Math.floor(diffHoras / 24);
  if (diffDias < 30) return `hace ${diffDias} día${diffDias === 1 ? "" : "s"}`;
  return fecha.toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "numeric" });
}

export default function NotificacionesPage() {
  const router = useRouter();
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [marcandoTodas, setMarcandoTodas] = useState(false);

  useEffect(() => {
    cargar();
  }, []);

  async function cargar() {
    try {
      const data = await apiFetch<Notificacion[]>("/api/notificaciones");
      setNotificaciones(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error al cargar tus notificaciones");
    } finally {
      setCargando(false);
    }
  }

  async function abrirNotificacion(n: Notificacion) {
    if (!n.leida) {
      setNotificaciones((prev) => prev.map((x) => (x.id === n.id ? { ...x, leida: true } : x)));
      apiFetch(`/api/notificaciones/${n.id}/marcar-leida`, { method: "PUT" }).catch(() => {});
      // El badge del Navbar (ver Navbar.tsx) se refresca solo con el próximo evento en vivo o su
      // polling — no hace falta avisarle nada específico desde acá.
    }
    router.push(n.url || "/");
  }

  async function marcarTodasLeidas() {
    setMarcandoTodas(true);
    try {
      await apiFetch("/api/notificaciones/marcar-todas-leidas", { method: "PUT" });
      setNotificaciones((prev) => prev.map((n) => ({ ...n, leida: true })));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error al marcar las notificaciones como leídas");
    } finally {
      setMarcandoTodas(false);
    }
  }

  if (cargando) return <p className="p-6 text-ink/60">Cargando...</p>;

  const hayNoLeidas = notificaciones.some((n) => !n.leida);

  return (
    <div className="max-w-lg mx-auto mt-16 p-6 w-full">
      <div className="flex items-center justify-between gap-3 mb-6">
        <h1 className="font-display text-2xl text-ink">Notificaciones</h1>
        {hayNoLeidas && (
          <button
            onClick={marcarTodasLeidas}
            disabled={marcandoTodas}
            className="text-sm text-copper hover:underline disabled:opacity-50"
          >
            {marcandoTodas ? "Marcando..." : "Marcar todas como leídas"}
          </button>
        )}
      </div>

      {error && <p className="text-red-700 dark:text-red-400 text-sm mb-4">{error}</p>}

      {notificaciones.length === 0 && !error && (
        <p className="text-ink/50 text-sm">Todavía no tenés notificaciones.</p>
      )}

      <ul className="flex flex-col gap-2">
        {notificaciones.map((n) => (
          <li key={n.id}>
            <button
              onClick={() => abrirNotificacion(n)}
              className={`w-full text-left bg-surface border rounded-lg p-4 transition-colors ${
                n.leida ? "border-ink/10" : "border-copper/40 hover:border-copper"
              }`}
            >
              <div className="flex items-start gap-2.5">
                {!n.leida && <span className="w-2 h-2 rounded-full bg-copper mt-1.5 shrink-0" />}
                <div className="min-w-0 flex-1">
                  <p className={`text-sm text-ink ${n.leida ? "" : "font-semibold"}`}>{n.titulo}</p>
                  <p className="text-sm text-ink/60 mt-0.5">{n.cuerpo}</p>
                  <p className="text-xs text-ink/40 mt-1.5">{tiempoRelativo(n.creadoEn)}</p>
                </div>
              </div>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
