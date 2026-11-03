const API_URL = process.env.NEXT_PUBLIC_API_URL;

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = typeof window !== "undefined" ? localStorage.getItem("fixit_token") : null;

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

      // 03/11 (CU-06/AD-01): si el servidor rechaza la sesión (vencida o cuenta desactivada), se cierra
  // y se manda al login, en vez de dejar la pantalla "logueada" con errores. No aplica a /api/auth
  // (ahí un 401 es "contraseña incorrecta" o "email sin confirmar").
  if (response.status === 401 && token && !path.toLowerCase().startsWith("/api/auth") && typeof window !== "undefined") {
    localStorage.removeItem("fixit_token");
    localStorage.removeItem("fixit_usuario");
    if (!window.location.pathname.startsWith("/login")) {
      window.location.href = "/login?sesion=vencida";
    }
    throw new ApiError("Tu sesión venció. Iniciá sesión de nuevo.", 401);
  }

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    throw new ApiError(errorBody?.error ?? "Ocurrió un error", response.status);
  }

  // 204 No Content (o cualquier respuesta sin body) no tiene JSON para parsear
  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}