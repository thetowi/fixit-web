"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { obtenerUsuario, cerrarSesion } from "@/lib/auth";
import { Usuario } from "@/types/auth";

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [usuario, setUsuario] = useState<Usuario | null>(null);

  useEffect(() => {
    setUsuario(obtenerUsuario());
  }, [pathname]);

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
        <Link href="/explorar" className="text-sm text-paper/70 hover:text-safety transition-colors">
          Explorar
        </Link>
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
            <Link href="/buscar" className="hover:text-safety transition-colors">Buscar</Link>
            <Link href="/ordenes" className="hover:text-safety transition-colors">Mis ordenes</Link>
            <Link href="/cuenta" className="hover:text-safety transition-colors">Mi cuenta</Link>
            <button onClick={handleLogout} className="text-paper/60 hover:text-paper transition-colors">
              Cerrar sesion
            </button>
          </>
        )}

        {usuario?.rol === "Prestador" && (
          <>
            <Link href="/prestador/servicios" className="hover:text-safety transition-colors">Mis servicios</Link>
            <Link href="/ordenes" className="hover:text-safety transition-colors">Mis ordenes</Link>
            <Link href="/cuenta" className="hover:text-safety transition-colors">Mi cuenta</Link>
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