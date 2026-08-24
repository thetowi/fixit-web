"use client";

import { useEffect, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import { obtenerUbicacionActual, Coordenadas } from "@/lib/geolocation";
import { Categoria } from "@/types/categorias";
import { PrestadorEncontrado } from "@/types/busqueda";

export default function BuscarPage() {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [categoriaId, setCategoriaId] = useState<number | "">("");
  const [radioKm, setRadioKm] = useState(10);
  const [ubicacion, setUbicacion] = useState<Coordenadas | null>(null);
  const [resultados, setResultados] = useState<PrestadorEncontrado[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [pidiendoUbicacion, setPidiendoUbicacion] = useState(true);

  // Cargar categorías disponibles apenas entra a la pantalla
  useEffect(() => {
    apiFetch<Categoria[]>("/api/Categorias")
      .then(setCategorias)
      .catch(() => setError("No pudimos cargar las categorías."));
  }, []);

  // Pedir ubicación apenas entra a la pantalla
  useEffect(() => {
    obtenerUbicacionActual()
      .then((coords) => {
        setUbicacion(coords);
        setPidiendoUbicacion(false);
      })
      .catch((err) => {
        setError(err.message);
        setPidiendoUbicacion(false);
      });
  }, []);

  async function handleBuscar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!categoriaId) {
      setError("Elegí una categoría.");
      return;
    }
    if (!ubicacion) {
      setError("No tenemos tu ubicación todavía.");
      return;
    }

    setCargando(true);
    try {
      const params = new URLSearchParams({
        categoriaId: String(categoriaId),
        latitud: String(ubicacion.latitud),
        longitud: String(ubicacion.longitud),
        radioKm: String(radioKm),
      });

      const data = await apiFetch<PrestadorEncontrado[]>(`/api/prestadores/buscar?${params}`);
      setResultados(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error al buscar");
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="max-w-lg mx-auto mt-16 p-6">
      <h1 className="text-2xl font-bold mb-6">Buscar prestadores</h1>

      {pidiendoUbicacion && (
        <p className="text-sm text-gray-500 mb-4">Obteniendo tu ubicación...</p>
      )}

      <form onSubmit={handleBuscar} className="flex flex-col gap-3 mb-8">
        <select
          className="border rounded p-2"
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

        <label className="text-sm text-gray-600">
          Radio de búsqueda: {radioKm} km
          <input
            type="range"
            min={1}
            max={50}
            value={radioKm}
            onChange={(e) => setRadioKm(Number(e.target.value))}
            className="w-full"
          />
        </label>

        {error && <p className="text-red-600 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={cargando || !ubicacion}
          className="bg-black text-white rounded p-2 disabled:opacity-50"
        >
          {cargando ? "Buscando..." : "Buscar"}
        </button>
      </form>

      {resultados !== null && (
        <>
          <h2 className="font-semibold mb-3">
            {resultados.length} resultado{resultados.length !== 1 ? "s" : ""}
          </h2>
          {resultados.length === 0 && (
            <p className="text-gray-500 text-sm">
              No encontramos prestadores de esta categoría en el radio elegido. Probá ampliar el radio.
            </p>
          )}
          <ul className="flex flex-col gap-3">
            {resultados.map((p) => (
              <li key={p.id} className="border rounded p-3">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">
                      {p.nombre} {p.apellido}
                      {p.verificado && <span className="text-green-600 text-xs ml-2">✓ Verificado</span>}
                    </p>
                    {p.descripcion && <p className="text-sm text-gray-600">{p.descripcion}</p>}
                    {p.precioReferencia && (
                      <p className="text-sm text-gray-600">Desde ${p.precioReferencia}</p>
                    )}
                  </div>
                  <span className="text-sm text-gray-500 whitespace-nowrap">
                    {p.distanciaKm.toFixed(1)} km
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}