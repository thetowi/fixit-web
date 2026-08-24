"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api";
import { PerfilPrestador } from "@/types/perfil";

export default function PerfilPrestadorPage() {
  const params = useParams();
  const id = params.id as string;

  const [perfil, setPerfil] = useState<PerfilPrestador | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    apiFetch<PerfilPrestador>(`/api/prestadores/${id}`)
      .then(setPerfil)
      .catch((err) => {
        setError(err instanceof ApiError && err.status === 404
          ? "No encontramos este prestador."
          : "Error al cargar el perfil.");
      })
      .finally(() => setCargando(false));
  }, [id]);

  if (cargando) return <p className="p-6">Cargando...</p>;
  if (error) return <p className="p-6 text-red-600">{error}</p>;
  if (!perfil) return null;

  const miembroDesde = new Date(perfil.miembroDesde).toLocaleDateString("es-AR", {
    year: "numeric",
    month: "long",
  });

  return (
    <div className="max-w-lg mx-auto mt-16 p-6">
      <div className="flex items-center gap-4 mb-6">
        <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center text-xl font-semibold">
          {perfil.nombre[0]}{perfil.apellido[0]}
        </div>
        <div>
          <h1 className="text-2xl font-bold">
            {perfil.nombre} {perfil.apellido}
            {perfil.verificado && (
              <span className="text-green-600 text-sm ml-2">✓ Verificado</span>
            )}
          </h1>
          <p className="text-sm text-gray-500">Miembro desde {miembroDesde}</p>
        </div>
      </div>

      <h2 className="font-semibold mb-3">Servicios</h2>
      {perfil.servicios.length === 0 && (
        <p className="text-gray-500 text-sm">Este prestador todavía no cargó servicios.</p>
      )}
      <ul className="flex flex-col gap-3">
        {perfil.servicios.map((s) => (
          <li key={s.categoriaId} className="border rounded p-3">
            <p className="font-medium">{s.categoriaNombre}</p>
            {s.descripcion && <p className="text-sm text-gray-600">{s.descripcion}</p>}
            {s.precioReferencia && (
              <p className="text-sm text-gray-600">Desde ${s.precioReferencia}</p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}