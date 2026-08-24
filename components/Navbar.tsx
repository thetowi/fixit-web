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

  // Cada vez que cambia la ruta, volvemos a leer localStorage —
  // así detectamos login/logout, que siempre van seguidos de una navegación
  useEffect(() => {
    setUsuario(obtenerUsuario());
  }, [pathname]);

  function handleLogout() {
    cerrarSesion();
    setUsuario(null);
    router.push("/login");
  }

  return (
    <nav className="border-b px-6 py-3 flex items-center justify-between">
      <Link href="/" className="font-bold text-lg">
        FixIt 🔧
      </Link>

      <div className="flex items-center gap-4 text-sm">
        {!usuario && (
          <>
            <Link href="/login">Iniciar sesión</Link>
            <Link href="/registro" className="bg-black text-white rounded px-3 py-1.5">
              Crear cuenta
            </Link>
          </>
        )}

        {usuario?.rol === "Cliente" && (
          <>
            <Link href="/buscar">Buscar</Link>
            <Link href="/ordenes">Mis órdenes</Link>
            <Link href="/cuenta">Mi cuenta</Link>
            <button onClick={handleLogout} className="text-gray-500">
              Cerrar sesión
            </button>
          </>
        )}

        {usuario?.rol === "Prestador" && (
          <>
            <Link href="/prestador/servicios">Mis servicios</Link>
            <Link href="/ordenes">Mis órdenes</Link>
            <Link href="/cuenta">Mi cuenta</Link>
            <button onClick={handleLogout} className="text-gray-500">
              Cerrar sesión
            </button>
          </>
        )}
        {usuario?.rol === "Admin" && (
        <>
            <Link href="/admin">Admin</Link>
            <button onClick={handleLogout} className="text-gray-500">
            Cerrar sesión
            </button>
        </>
        )}
      </div>
    </nav>
  );
}