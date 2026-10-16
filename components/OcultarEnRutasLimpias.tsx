"use client";

// Oculta lo que envuelve (Navbar, Footer, tour, overlay de trabajo en curso) en las rutas que
// tienen que verse "limpias", sin nada de la app alrededor. Agregado el 16/10 para la encuesta
// pública de prestadores: a pedido del usuario, en /encuesta no tiene que aparecer el logo, ni
// "Iniciar sesión" ni "Crear cuenta" — solo la encuesta. Para sumar otra ruta así, agregarla a
// RUTAS_LIMPIAS.
import { usePathname } from "next/navigation";

const RUTAS_LIMPIAS = ["/encuesta"];

export default function OcultarEnRutasLimpias({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const esLimpia = RUTAS_LIMPIAS.some((ruta) => pathname === ruta || pathname?.startsWith(`${ruta}/`));
  if (esLimpia) return null;
  return <>{children}</>;
}
