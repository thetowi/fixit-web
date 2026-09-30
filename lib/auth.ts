import { Usuario } from "@/types/auth";

const TOKEN_KEY = "fixit_token";
const USUARIO_KEY = "fixit_usuario";

export function guardarSesion(token: string, usuario: Usuario) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USUARIO_KEY, JSON.stringify(usuario));
  // Aviso para componentes que ya están montados de antes de loguearse (ej. TourOnboarding, que
  // vive en el layout global y no se remonta al navegar de /login al dashboard con el router de
  // Next.js) — sin esto, un componente que leyó localStorage una sola vez al montarse nunca se
  // enteraba de que ya hay sesión hasta que se recargaba la página entera (30/09).
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("fixit:sesion-actualizada"));
  }
}

export function obtenerUsuario(): Usuario | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(USUARIO_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function cerrarSesion() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USUARIO_KEY);
}