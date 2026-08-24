"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api";
import { obtenerUsuario } from "@/lib/auth";
import { Orden } from "@/types/ordenes";

const ESTADO_LABELS: Record<string, string> = {
  PendientePago: "Pendiente de pago",
  Pagado: "Pagado",
  EnCurso: "En curso",
  Completado: "Completado",
  Cancelado: "Cancelado",
  EnDisputa: "En disputa",
};

export default function OrdenesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const ordenCreadaId = searchParams.get("creada");

  const [ordenes, setOrdenes] = useState<Orden[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    if (!obtenerUsuario()) {
      router.push("/login");
      return;
    }

    apiFetch<Orden[]>("/api/ordenes/mias")
      .then(setOrdenes)
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : "Error al cargar tus órdenes");
      })
      .finally(() => setCargando(false));
  }, [router]);

  if (cargando) return <p className="p-6">Cargando...</p>;

  return (
    <div className="max-w-lg mx-auto mt-16 p-6">
      <h1 className="text-2xl font-bold mb-6">Mis órdenes</h1>

      {ordenCreadaId && (
        <p className="bg-green-50 text-green-700 text-sm rounded p-3 mb-4">
          ¡Listo! Tu solicitud fue creada. El pago todavía no está implementado — por ahora queda en estado &quot;Pendiente de pago&quot;.
        </p>
      )}

      {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

      {ordenes.length === 0 && !error && (
        <p className="text-gray-500 text-sm">Todavía no tenés órdenes.</p>
      )}

      <ul className="flex flex-col gap-3">
        {ordenes.map((o) => (
          <li key={o.id} className="border rounded p-3">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-medium">{o.categoriaNombre}</p>
                <p className="text-sm text-gray-600">Con {o.prestadorNombreCompleto}</p>
                <p className="text-sm text-gray-600">${o.montoTotal}</p>
              </div>
              <span className="text-xs bg-gray-100 rounded px-2 py-1 whitespace-nowrap">
                {ESTADO_LABELS[o.estado] ?? o.estado}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}