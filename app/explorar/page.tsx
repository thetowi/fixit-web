"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { Categoria } from "@/types/categorias";
import { iconoCategoria } from "@/lib/iconosCategoria";

export default function ExplorarPage() {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    apiFetch<Categoria[]>("/api/Categorias")
      .then(setCategorias)
      .finally(() => setCargando(false));
  }, []);

  if (cargando) return <p className="p-6 text-ink/60">Cargando...</p>;

  return (
    <div className="max-w-2xl mx-auto mt-16 p-6 w-full">
      <p className="font-mono text-xs tracking-widest text-copper uppercase mb-2">Explorar</p>
      <h1 className="font-display text-2xl text-ink mb-6">¿Qué necesitás arreglar?</h1>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {categorias.map((c) => {
          const IconoCategoria = iconoCategoria(c.icono);
          return (
            <Link
              key={c.id}
              href={`/explorar/${c.id}`}
              className="bg-surface border border-ink/10 rounded-lg p-5 flex flex-col items-center gap-2 hover:border-copper transition-colors"
            >
              <IconoCategoria size={26} strokeWidth={1.75} className="text-copper" />
              <span className="font-medium text-ink text-sm text-center">{c.nombre}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}