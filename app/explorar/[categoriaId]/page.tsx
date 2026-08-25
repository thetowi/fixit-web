"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { apiFetch, ApiError } from "@/lib/api";
import { PrestadorEncontrado } from "@/types/busqueda";
import Estrellas from "@/components/Estrellas";

export default function ExplorarCategoriaPage() {
  const params = useParams();
  const categoriaId = params.categoriaId as string;

  const [resultados, setResultados] = useState<PrestadorEncontrado[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    apiFetch<PrestadorEncontrado[]>(`/api/prestadores/buscar?categoriaId=${categoriaId}`)
      .then(setResultados)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Error al cargar"))
      .finally(() => setCargando(false));
  }, [categoriaId]);

  if (cargando) return <p className="p-6 text-ink/60">Cargando...</p>;
  if (error) return <p className="p-6 text-red-700">{error}</p>;

  return (
    <div className="max-w-lg mx-auto mt-16 p-6 w-full">
      <Link href="/explorar" className="text-sm text-copper hover:underline">← Todas las categorías</Link>
      <h1 className="font-display text-2xl text-ink mt-2 mb-6">Prestadores disponibles</h1>

      {resultados.length === 0 && (
        <p className="text-ink/50 text-sm">Todavía no hay prestadores en esta categoría.</p>
      )}

      <ul className="flex flex-col gap-3">
        {resultados.map((p) => (
          <li key={p.id}>
            <Link
              href={`/prestador/${p.id}`}
              className="flex justify-between items-start bg-white border border-ink/10 rounded-lg p-4 hover:border-copper transition-colors"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-ink/10 flex items-center justify-center font-display text-xs text-ink shrink-0">
                  {p.nombre[0]}{p.apellido[0]}
                </div>
                <div>
                  <p className="font-medium text-ink">
                    {p.nombre} {p.apellido}
                    {p.verificado && <span className="text-stamp text-xs ml-2">✓ Verificado</span>}
                  </p>
                  {p.descripcion && <p className="text-sm text-ink/60">{p.descripcion}</p>}
                  {p.precioReferencia && (
                    <p className="font-mono text-sm text-ink/80 mt-1">
                      Desde ${p.precioReferencia.toLocaleString("es-AR")}
                    </p>
                  )}
                </div>
              </div>
              {p.cantidadCalificaciones > 0 ? (
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <Estrellas valor={p.promedioCalificacion!} tamaño="text-xs" />
                  <span className="text-xs text-ink/40">({p.cantidadCalificaciones})</span>
                </div>
              ) : (
                <span className="text-xs text-ink/40 shrink-0">Sin reseñas</span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}