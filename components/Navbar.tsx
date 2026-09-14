"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { obtenerUsuario, cerrarSesion } from "@/lib/auth";
import { Usuario } from "@/types/auth";
import { apiFetch } from "@/lib/api";
import { crearConexionChat } from "@/lib/chatConnection";

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [noLeidos, setNoLeidos] = useState(0);

  useEffect(() => {
    setUsuario(obtenerUsuario());
  }, [pathname]);

  useEffect(() => {
    if (!usuario || (usuario.rol !== "Cliente" && usuario.rol !== "Prestador")) {
      setNoLeidos(0);
      return;
    }

    let activo = true;
    let conexion: ReturnType<typeof crearConexionChat> | null = null;

    function actualizarConteo() {
      apiFetch<{ cantidad: number }>("/api/conversaciones/no-leidos")
        .then((data) => {
          if (activo) setNoLeidos(data.cantidad);
        })
        .catch((err) => {
          // el badge simplemente no se actualiza, pero dejamos rastro en consola para poder diagnosticarlo
          console.error("[FixIt] Error al consultar /api/conversaciones/no-leidos:", err);
        });
    }

    actualizarConteo();

    async function conectar() {
      try {
        conexion = crearConexionChat();
        conexion.on("NuevaActividad", () => {
          console.info("[FixIt] Evento NuevaActividad recibido, actualizando contador de no leídos.");
          actualizarConteo();
        });
        conexion.onreconnected(() => {
          console.info("[FixIt] SignalR reconectado, volviendo a unirse a notificaciones.");
          conexion?.invoke("UnirseAMisNotificaciones").catch((err) =>
            console.error("[FixIt] Error al re-unirse a notificaciones tras reconectar:", err)
          );
        });
        await conexion.start();
        await conexion.invoke("UnirseAMisNotificaciones");
        console.info("[FixIt] Conectado a SignalR y unido a notificaciones personales.");
      } catch (err) {
        // si falla la conexión en tiempo real, el badge queda con el valor cargado al entrar
        console.error("[FixIt] Error al conectar/unirse a notificaciones por SignalR:", err);
      }
    }

    conectar();
    window.addEventListener("fixit:no-leidos-actualizado", actualizarConteo);

    return () => {
      activo = false;
      conexion?.stop();
      window.removeEventListener("fixit:no-leidos-actualizado", actualizarConteo);
    };
  }, [usuario?.id, usuario?.rol]);

  function handleLogout() {
    cerrarSesion();
    setUsuario(null);
    router.push("/login");
  }

  return (
    <nav className="bg-ink px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <Link href="/" className="font-display text-lg text-paper tracking-tight">
          FIXIT
        </Link>
        {usuario?.rol !== "Prestador" && (
          <Link href="/explorar" className="text-sm text-paper/70 hover:text-safety transition-colors" data-tour="nav-explorar">
            Explorar
          </Link>
        )}
      </div>

      <div className="flex items-center gap-5 text-sm text-paper/90">
        {!usuario && (
          <>
            <Link href="/login" className="hover:text-safety transition-colors">
              Iniciar sesion
            </Link>
            <Link
              href="/registro"
              className="bg-copper text-paper rounded px-3 py-1.5 font-medium hover:bg-copper-dark transition-colors"
            >
              Crear cuenta
            </Link>
          </>
        )}

        {usuario?.rol === "Cliente" && (
          <>
            <Link href="/buscar" className="hover:text-safety transition-colors" data-tour="nav-buscar">Buscar</Link>
            <Link href="/mensajes" className="relative hover:text-safety transition-colors" data-tour="nav-mensajes">
              Mensajes
              {noLeidos > 0 && (
                <span className="absolute -top-2 -right-3 bg-copper text-paper text-[9px] font-mono rounded-full min-w-[16px] h-[16px] flex items-center justify-center px-1">
                  {noLeidos > 9 ? "9+" : noLeidos}
                </span>
              )}
            </Link>
            <Link href="/ordenes" className="hover:text-safety transition-colors" data-tour="nav-ordenes">Mis ordenes</Link>
            <Link href="/cuenta" className="hover:text-safety transition-colors" data-tour="nav-cuenta">Mi cuenta</Link>
            
            <button onClick={handleLogout} className="text-paper/60 hover:text-paper transition-colors">
              Cerrar sesion
            </button>
          </>
        )}

        {usuario?.rol === "Prestador" && (
          <>
            <Link href="/prestador/agenda" className="hover:text-safety transition-colors" data-tour="nav-agenda">Agenda</Link>
            <Link href="/mensajes" className="relative hover:text-safety transition-colors" data-tour="nav-mensajes">
              Mensajes
              {noLeidos > 0 && (
                <span className="absolute -top-2 -right-3 bg-copper text-paper text-[9px] font-mono rounded-full min-w-[16px] h-[16px] flex items-center justify-center px-1">
                  {noLeidos > 9 ? "9+" : noLeidos}
                </span>
              )}
            </Link>
            <Link href="/ordenes" className="hover:text-safety transition-colors" data-tour="nav-ordenes">Mis ordenes</Link>
            <Link href="/cuenta" className="hover:text-safety transition-colors" data-tour="nav-cuenta">Mi cuenta</Link>
            <button onClick={handleLogout} className="text-paper/60 hover:text-paper transition-colors">
              Cerrar sesion
            </button>
          </>
        )}

        {usuario?.rol === "Admin" && (
          <>
            <Link href="/admin" className="hover:text-safety transition-colors">Admin</Link>
            <button onClick={handleLogout} className="text-paper/60 hover:text-paper transition-colors">
              Cerrar sesion
            </button>
          </>
        )}
      </div>
    </nav>
  );
}