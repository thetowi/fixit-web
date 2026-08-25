"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { Categoria } from "@/types/categorias";

const ICONOS: Record<string, string> = {
  wrench: "🔧",
  zap: "⚡",
  hammer: "🔨",
  flame: "🔥",
  leaf: "🌿",
  scissors: "✂️",
  brush: "🖌️",
};

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
        {categorias.map((c) => (
          <Link
            key={c.id}
            href={`/explorar/${c.id}`}
            className="bg-white border border-ink/10 rounded-lg p-5 flex flex-col items-center gap-2 hover:border-copper transition-colors"
          >
            <span className="text-2xl">{c.icono ? ICONOS[c.icono] ?? "🛠️" : "🛠️"}</span>
            <span className="font-medium text-ink text-sm text-center">{c.nombre}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}