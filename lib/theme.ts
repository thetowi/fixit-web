export type Tema = "claro" | "oscuro";

const CLAVE_STORAGE = "fixit_theme";

// Se usa tanto acá como en el script inline de layout.tsx (duplicado a propósito ahí,
// porque ese script corre antes de que cualquier JS de React esté disponible).
export function obtenerTemaGuardado(): Tema | null {
  if (typeof window === "undefined") return null;
  const guardado = localStorage.getItem(CLAVE_STORAGE);
  return guardado === "claro" || guardado === "oscuro" ? guardado : null;
}

export function obtenerTemaActual(): Tema {
  if (typeof document === "undefined") return "claro";
  return document.documentElement.classList.contains("dark") ? "oscuro" : "claro";
}

export function aplicarTema(tema: Tema) {
  document.documentElement.classList.toggle("dark", tema === "oscuro");
  localStorage.setItem(CLAVE_STORAGE, tema);
}
