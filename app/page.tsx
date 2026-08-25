"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { obtenerUsuario } from "@/lib/auth";
import { Usuario } from "@/types/auth";

export default function Home() {
  const [usuario, setUsuario] = useState<Usuario | null>(null);

  useEffect(() => {
    setUsuario(obtenerUsuario());
  }, []);

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
      <p className="font-mono text-xs tracking-widest text-copper uppercase mb-3">
        Plomería · Electricidad · Gas · Jardinería
      </p>
      <h1 className="font-display text-4xl sm:text-5xl text-ink tracking-tight mb-4 max-w-xl">
        El oficio que necesitás, a la vuelta de la esquina
      </h1>
      <p className="text-ink/70 mb-10 max-w-md">
        Buscá por categoría y ubicación, chateá con el prestador y pagá con confianza.
      </p>

      {!usuario && (
        <div className="flex gap-3">
          <Link
            href="/registro"
            className="bg-copper text-paper rounded px-5 py-2.5 font-medium hover:bg-copper-dark transition-colors"
          >
            Crear cuenta
          </Link>
          <Link
            href="/login"
            className="border border-ink/20 text-ink rounded px-5 py-2.5 font-medium hover:border-ink/40 transition-colors"
          >
            Iniciar sesión
          </Link>
        </div>
      )}

      {usuario?.rol === "Cliente" && (
        <Link
          href="/buscar"
          className="bg-copper text-paper rounded px-5 py-2.5 font-medium hover:bg-copper-dark transition-colors"
        >
          Buscar un servicio
        </Link>
      )}

      {usuario?.rol === "Prestador" && (
        <Link
          href="/prestador/servicios"
          className="bg-copper text-paper rounded px-5 py-2.5 font-medium hover:bg-copper-dark transition-colors"
        >
          Gestionar mis servicios
        </Link>
      )}
    </div>
  );
}