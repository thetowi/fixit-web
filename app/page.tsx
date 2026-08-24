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
    <div className="max-w-lg mx-auto mt-24 p-6 text-center">
      <h1 className="text-3xl font-bold mb-3">FixIt 🔧</h1>
      <p className="text-gray-600 mb-8">
        Encontrá plomeros, electricistas, gasistas y más, cerca tuyo.
      </p>

      {!usuario && (
        <div className="flex gap-3 justify-center">
          <Link href="/registro" className="bg-black text-white rounded px-4 py-2">
            Crear cuenta
          </Link>
          <Link href="/login" className="border rounded px-4 py-2">
            Iniciar sesión
          </Link>
        </div>
      )}

      {usuario?.rol === "Cliente" && (
        <Link href="/buscar" className="bg-black text-white rounded px-4 py-2 inline-block">
          Buscar un servicio
        </Link>
      )}

      {usuario?.rol === "Prestador" && (
        <Link href="/prestador/servicios" className="bg-black text-white rounded px-4 py-2 inline-block">
          Gestionar mis servicios
        </Link>
      )}
    </div>
  );
}