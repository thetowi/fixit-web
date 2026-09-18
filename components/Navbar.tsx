"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { obtenerUsuario, cerrarSesion } from "@/lib/auth";
import { Usuario } from "@/types/auth";
import { apiFetch } from "@/lib/api";
import { crearConexionChat } from "@/lib/chatConnection";
import { TITULO_BASE, mostrarNotificacionNavegador, pedirPermisoNotificaciones } from "@/lib/notificacionesNavegador";

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [noLeidos, setNoLeidos] = useState(0);
  // Mientras esto esté en true, el título de la pestaña parpadea entre "FixIt" y el aviso.
  // Se prende cuando llega un mensaje nuevo con la pestaña en segundo plano, y se apaga solo
  // al volver a mirarla (no hace falta entrar a leer el mensaje puntual para que pare).
  const [parpadeando, setParpadeando] = useState(false);
  // Menú desplegable de mobile: en pantallas angostas los links no entran en una
  // sola fila (se pisaban entre sí), así que a partir de "md" se esconden detrás
  // de un botón de hamburguesa que despliega un panel vertical.
  const [menuAbierto, setMenuAbierto] = useState(false);

  useEffect(() => {
    setUsuario(obtenerUsuario());
    setMenuAbierto(false); // navegar a otra página cierra el menú mobile
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
    pedirPermisoNotificaciones();

    async function conectar() {
      try {
        conexion = crearConexionChat();
        conexion.on("NuevaActividad", (data: { conversacionId: string; emisorNombre?: string; preview?: string }) => {
          console.info("[FixIt] Evento NuevaActividad recibido, actualizando contador de no leídos.");
          actualizarConteo();

          // NuevaActividad también se dispara al cancelar una oferta (para refrescar el badge),
          // que no es un "mensaje nuevo" — esos eventos no traen emisorNombre, así que solo
          // parpadeamos/notificamos para los que sí son mensajes o ofertas de verdad
          if (data.emisorNombre) {
            setParpadeando(true);
            mostrarNotificacionNavegador(`${data.emisorNombre} te escribió`, {
              body: data.preview || undefined,
              tag: data.conversacionId,
            });
          }
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

  // El parpadeo se apaga solo con volver a mirar la pestaña (no hace falta leer el mensaje)
  useEffect(() => {
    function detenerParpadeo() {
      if (document.visibilityState === "visible") setParpadeando(false);
    }
    document.addEventListener("visibilitychange", detenerParpadeo);
    window.addEventListener("focus", detenerParpadeo);
    return () => {
      document.removeEventListener("visibilitychange", detenerParpadeo);
      window.removeEventListener("focus", detenerParpadeo);
    };
  }, []);

  useEffect(() => {
    if (!parpadeando) {
      document.title = TITULO_BASE;
      return;
    }
    let mostrandoAviso = false;
    const intervalId = setInterval(() => {
      mostrandoAviso = !mostrandoAviso;
      document.title = mostrandoAviso ? "¡Tenés mensajes nuevos!" : TITULO_BASE;
    }, 1500);
    return () => {
      clearInterval(intervalId);
      document.title = TITULO_BASE;
    };
  }, [parpadeando]);

  function handleLogout() {
    cerrarSesion();
    setUsuario(null);
    setMenuAbierto(false);
    router.push("/login");
  }

  function BadgeNoLeidos() {
    if (noLeidos <= 0) return null;
    return (
      <span className="absolute -top-2 -right-3 bg-copper text-on-nav text-[9px] font-mono rounded-full min-w-[16px] h-[16px] flex items-center justify-center px-1">
        {noLeidos > 9 ? "9+" : noLeidos}
      </span>
    );
  }

  return (
    <nav className="bg-nav relative">
      <div className="px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <Image
              src="/logo-icon.png"
              alt=""
              width={28}
              height={28}
              className="w-7 h-7 object-contain"
              priority
            />
            <span className="font-display text-lg text-on-nav tracking-tight">
              FixIt
            </span>
          </Link>
          {usuario?.rol !== "Prestador" && (
            <Link
              href="/explorar"
              className="hidden md:inline text-sm text-on-nav/70 hover:text-safety transition-colors"
              data-tour="nav-explorar"
            >
              Explorar
            </Link>
          )}
        </div>

        {/* Links de escritorio: ocultos en mobile, se reemplazan por el botón de hamburguesa */}
        <div className="hidden md:flex items-center gap-5 text-sm text-on-nav/90">
          {!usuario && (
            <>
              <Link href="/login" className="hover:text-safety transition-colors">
                Iniciar sesion
              </Link>
              <Link
                href="/registro"
                className="bg-copper text-on-nav rounded px-3 py-1.5 font-medium hover:bg-copper-dark transition-colors"
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
                <BadgeNoLeidos />
              </Link>
              <Link href="/ordenes" className="hover:text-safety transition-colors" data-tour="nav-ordenes">Mis ordenes</Link>
              <Link href="/cuenta" className="hover:text-safety transition-colors" data-tour="nav-cuenta">Mi cuenta</Link>

              <button onClick={handleLogout} className="text-on-nav/60 hover:text-on-nav transition-colors">
                Cerrar sesion
              </button>
            </>
          )}

          {usuario?.rol === "Prestador" && (
            <>
              <Link href="/prestador/agenda" className="hover:text-safety transition-colors" data-tour="nav-agenda">Agenda</Link>
              <Link href="/mensajes" className="relative hover:text-safety transition-colors" data-tour="nav-mensajes">
                Mensajes
                <BadgeNoLeidos />
              </Link>
              <Link href="/ordenes" className="hover:text-safety transition-colors" data-tour="nav-ordenes">Mis ordenes</Link>
              <Link href="/cuenta" className="hover:text-safety transition-colors" data-tour="nav-cuenta">Mi cuenta</Link>
              <button onClick={handleLogout} className="text-on-nav/60 hover:text-on-nav transition-colors">
                Cerrar sesion
              </button>
            </>
          )}

          {usuario?.rol === "Admin" && (
            <>
              <Link href="/admin" className="hover:text-safety transition-colors">Admin</Link>
              <button onClick={handleLogout} className="text-on-nav/60 hover:text-on-nav transition-colors">
                Cerrar sesion
              </button>
            </>
          )}
        </div>

        {/* Botón de hamburguesa: solo mobile */}
        <button
          type="button"
          onClick={() => setMenuAbierto((v) => !v)}
          aria-label={menuAbierto ? "Cerrar menú" : "Abrir menú"}
          aria-expanded={menuAbierto}
          className="md:hidden relative w-9 h-9 flex items-center justify-center text-on-nav/90 hover:text-on-nav transition-colors shrink-0"
        >
          {noLeidos > 0 && !menuAbierto && (
            <span className="absolute top-0.5 right-0.5 bg-copper text-on-nav text-[9px] font-mono rounded-full min-w-[14px] h-[14px] flex items-center justify-center px-0.5">
              {noLeidos > 9 ? "9+" : noLeidos}
            </span>
          )}
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            {menuAbierto ? (
              <path d="M6 6l12 12M18 6L6 18" />
            ) : (
              <path d="M4 7h16M4 12h16M4 17h16" />
            )}
          </svg>
        </button>
      </div>

      {/* Fondo oscuro detrás del drawer: tocarlo lo cierra. Se mantiene montado siempre
          (solo cambia opacidad/pointer-events) para que la transición de salida se vea. */}
      <div
        onClick={() => setMenuAbierto(false)}
        aria-hidden="true"
        className={`md:hidden fixed inset-0 bg-black/50 transition-opacity duration-300 z-40 ${
          menuAbierto ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      />

      {/* Drawer de mobile: entra deslizando desde la derecha, mismos links que la versión de escritorio. */}
      <div
        className={`md:hidden fixed top-0 right-0 z-50 h-full w-72 max-w-[80%] bg-nav shadow-xl flex flex-col text-sm text-on-nav/90 transition-transform duration-300 ease-in-out ${
          menuAbierto ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-on-nav/10">
          <span className="font-display text-base text-on-nav tracking-tight">Menú</span>
          <button
            type="button"
            onClick={() => setMenuAbierto(false)}
            aria-label="Cerrar menú"
            className="w-8 h-8 flex items-center justify-center text-on-nav/70 hover:text-on-nav transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <div className="flex flex-col px-5 py-2 overflow-y-auto">
          {usuario?.rol !== "Prestador" && (
            <Link href="/explorar" className="py-3 border-b border-on-nav/10 hover:text-safety transition-colors">
              Explorar
            </Link>
          )}

          {!usuario && (
            <>
              <Link href="/login" className="py-3 border-b border-on-nav/10 hover:text-safety transition-colors">
                Iniciar sesion
              </Link>
              <Link href="/registro" className="py-3 text-copper font-medium hover:text-copper-dark transition-colors">
                Crear cuenta
              </Link>
            </>
          )}

          {usuario?.rol === "Cliente" && (
            <>
              <Link href="/buscar" className="py-3 border-b border-on-nav/10 hover:text-safety transition-colors">Buscar</Link>
              <Link href="/mensajes" className="relative py-3 border-b border-on-nav/10 hover:text-safety transition-colors">
                Mensajes
                <BadgeNoLeidos />
              </Link>
              <Link href="/ordenes" className="py-3 border-b border-on-nav/10 hover:text-safety transition-colors">Mis ordenes</Link>
              <Link href="/cuenta" className="py-3 border-b border-on-nav/10 hover:text-safety transition-colors">Mi cuenta</Link>
              <button onClick={handleLogout} className="py-3 text-left text-on-nav/60 hover:text-on-nav transition-colors">
                Cerrar sesion
              </button>
            </>
          )}

          {usuario?.rol === "Prestador" && (
            <>
              <Link href="/prestador/agenda" className="py-3 border-b border-on-nav/10 hover:text-safety transition-colors">Agenda</Link>
              <Link href="/mensajes" className="relative py-3 border-b border-on-nav/10 hover:text-safety transition-colors">
                Mensajes
                <BadgeNoLeidos />
              </Link>
              <Link href="/ordenes" className="py-3 border-b border-on-nav/10 hover:text-safety transition-colors">Mis ordenes</Link>
              <Link href="/cuenta" className="py-3 border-b border-on-nav/10 hover:text-safety transition-colors">Mi cuenta</Link>
              <button onClick={handleLogout} className="py-3 text-left text-on-nav/60 hover:text-on-nav transition-colors">
                Cerrar sesion
              </button>
            </>
          )}

          {usuario?.rol === "Admin" && (
            <>
              <Link href="/admin" className="py-3 border-b border-on-nav/10 hover:text-safety transition-colors">Admin</Link>
              <button onClick={handleLogout} className="py-3 text-left text-on-nav/60 hover:text-on-nav transition-colors">
                Cerrar sesion
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
