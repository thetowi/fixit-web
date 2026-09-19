"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch, ApiError } from "@/lib/api";
import { obtenerUbicacionActual, Coordenadas } from "@/lib/geolocation";
import { Categoria } from "@/types/categorias";
import { PrestadorEncontrado } from "@/types/busqueda";
import Estrellas from "@/components/Estrellas";
import InsigniaVerificado from "@/components/InsigniaVerificado";

export default function BuscarPage() {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [categoriaId, setCategoriaId] = useState<number | "">("");
  const [ubicacion, setUbicacion] = useState<Coordenadas | null>(null);
  const [resultados, setResultados] = useState<PrestadorEncontrado[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    apiFetch<Categoria[]>("/api/Categorias")
      .then(setCategorias)
      .catch(() => setError("No pudimos cargar las categorías."));

    obtenerUbicacionActual()
      .then(setUbicacion)
      .catch(() => {
        // Sin problema: la búsqueda funciona igual sin ubicación, solo no vamos a poder mostrar
        // la distancia a cada prestador ni ordenar los resultados por cercanía.
      });
  }, []);

  async function handleBuscar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!categoriaId) {
      setError("Elegí una categoría.");
      return;
    }

    setCargando(true);
    try {
      const params = new URLSearchParams({ categoriaId: String(categoriaId) });
      if (ubicacion) {
        params.set("latitud", String(ubicacion.latitud));
        params.set("longitud", String(ubicacion.longitud));
      }

      const data = await apiFetch<PrestadorEncontrado[]>(`/api/prestadores/buscar?${params}`);
      setResultados(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error al buscar");
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="max-w-lg mx-auto mt-16 p-6 w-full">
      <p className="font-mono text-xs tracking-widest text-copper uppercase mb-2">Buscar</p>
      <h1 className="font-display text-2xl text-ink mb-6">Encontrá tu prestador</h1>

      <form onSubmit={handleBuscar} className="flex flex-col gap-4 mb-8 bg-surface border border-ink/10 rounded-lg p-4">
        <select
          className="border border-ink/20 rounded p-2 bg-paper"
          value={categoriaId}
          onChange={(e) => setCategoriaId(e.target.value ? Number(e.target.value) : "")}
        >
          <option value="">Elegí una categoría</option>
          {categorias.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre}
            </option>
          ))}
        </select>

        {!ubicacion && (
          <p className="text-xs text-ink/40">
            Sin acceso a tu ubicación — vamos a mostrar los mejor calificados, sin filtrar por distancia.
          </p>
        )}

        {error && <p className="text-red-700 dark:text-red-400 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={cargando}
          className="bg-copper text-paper rounded p-2 font-medium hover:bg-copper-dark transition-colors disabled:opacity-40"
        >
          {cargando ? "Buscando..." : "Buscar"}
        </button>
      </form>

      {resultados !== null && (
        <>
          <p className="font-mono text-xs text-ink/40 mb-3 uppercase tracking-wide">
            {resultados.length} resultado{resultados.length !== 1 ? "s" : ""}
          </p>
          {resultados.length === 0 && (
            <p className="text-ink/50 text-sm">
              No encontramos prestadores de esta categoría{ubicacion ? " que lleguen hasta tu zona" : ""}.
            </p>
          )}
          <ul className="flex flex-col gap-3">
            {resultados.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/prestador/${p.id}`}
                  className="flex justify-between items-start bg-surface border border-ink/10 rounded-lg p-4 hover:border-copper transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-ink/10 flex items-center justify-center font-display text-xs text-ink shrink-0">
                      {p.nombre[0]}{p.apellido[0]}
                    </div>
                    <div>
                      <p className="font-medium text-ink">
                        {p.nombre} {p.apellido}
                        {p.verificado && <InsigniaVerificado size={14} conTexto className="ml-2" />}
                      </p>
                      {p.descripcion && <p className="text-sm text-ink/60">{p.descripcion}</p>}
                      {p.precioReferencia && (
                        <p className="font-mono text-sm text-ink/80 mt-1">
                          Desde ${p.precioReferencia.toLocaleString("es-AR")} /hora
                        </p>
                      )}
                    </div>
                  </div>
                  {p.distanciaKm != null ? (
                    <span className="font-mono text-xs text-copper whitespace-nowrap">
                      {p.distanciaKm.toFixed(1)} km
                    </span>
                  ) : p.cantidadCalificaciones > 0 ? (
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <Estrellas valor={p.promedioCalificacion!} tamaño="text-xs" />
                    </div>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}