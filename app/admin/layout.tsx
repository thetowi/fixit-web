"use client";

// Panel admin separado en páginas propias (04/10) — antes era un único archivo de ~870 líneas
// con pestañas por estado (`seccion`), todo metido en un contenedor angosto `max-w-2xl`. Se
// separa en rutas reales (/admin/categorias, /admin/usuarios, etc.) para que cada sección sea un
// archivo manejable y la URL refleje en qué parte del panel estás (se puede compartir un link
// directo a /admin/ordenes, recargar sin perder la sección, etc.). Este layout es lo único que
// queda común a todas: el guard de "¿es Admin?" y la barra de navegación.

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { obtenerUsuario } from "@/lib/auth";
import { VerificacionAdmin, VerificacionCategoriaAdmin } from "@/types/verificacion";

const TABS = [
  { href: "/admin/categorias", label: "Categorías" },
  { href: "/admin/usuarios", label: "Usuarios" },
  { href: "/admin/ordenes", label: "Órdenes" },
  { href: "/admin/reportes", label: "Reportes" },
  { href: "/admin/verificaciones", label: "Identidad", contador: "verificaciones" as const },
  { href: "/admin/matriculas", label: "Matrículas", contador: "matriculas" as const },
] as const;

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [autorizado, setAutorizado] = useState(false);
  const [pendientesVerificacion, setPendientesVerificacion] = useState(0);
  const [pendientesMatricula, setPendientesMatricula] = useState(0);

  useEffect(() => {
    const usuario = obtenerUsuario();
    if (!usuario) {
      router.push("/login");
      return;
    }
    if (usuario.rol !== "Admin") {
      router.push("/");
      return;
    }
    setAutorizado(true);

    // Solo para los contadores de la barra de navegación — cada página de abajo carga sus
    // propios datos completos, esto es liviano a propósito (son las mismas dos listas que ya se
    // piden en /admin/verificaciones y /admin/matriculas, nomás que acá solo se cuenta).
    Promise.all([
      apiFetch<VerificacionAdmin[]>("/api/admin/verificaciones").catch(() => []),
      apiFetch<VerificacionCategoriaAdmin[]>("/api/admin/matriculas").catch(() => []),
    ]).then(([verifs, matrs]) => {
      setPendientesVerificacion(verifs.filter((v) => v.estado === "Pendiente").length);
      setPendientesMatricula(matrs.filter((m) => m.estado === "Pendiente").length);
    });
  }, [router]);

  if (!autorizado) return <p className="p-6 text-ink/60">Cargando...</p>;

  return (
    <div className="max-w-5xl mx-auto mt-16 p-6 w-full">
      <p className="font-mono text-xs tracking-widest text-copper uppercase mb-2">Panel</p>
      <h1 className="font-display text-2xl text-ink mb-6">Administración</h1>

      <div className="flex gap-1 mb-6 bg-ink/5 rounded-lg p-1 w-fit flex-wrap">
        {TABS.map((tab) => {
          const activo = pathname?.startsWith(tab.href);
          const contador =
            tab.contador === "verificaciones"
              ? pendientesVerificacion
              : tab.contador === "matriculas"
              ? pendientesMatricula
              : 0;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${
                activo ? "bg-surface text-ink shadow-sm" : "text-ink/50 hover:text-ink"
              }`}
            >
              {contador > 0 ? `${tab.label} (${contador})` : tab.label}
            </Link>
          );
        })}
      </div>

      {children}
    </div>
  );
}
