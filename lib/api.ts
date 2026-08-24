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