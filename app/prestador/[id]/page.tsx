"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api";
import { obtenerUsuario } from "@/lib/auth";
import { PerfilPrestador, ServicioOfrecido } from "@/types/perfil";
import { CrearOrdenRequest, Orden } from "@/types/ordenes";
import Estrellas from "@/components/Estrellas";
import { Calificacion } from "@/types/calificaciones";

export default function PerfilPrestadorPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [perfil, setPerfil] = useState<PerfilPrestador | null>(null);
  const [calificaciones, setCalificaciones] = useState<Calificacion[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);

  const [servicioAContratar, setServicioAContratar] = useState<ServicioOfrecido | null>(null);
  const [monto, setMonto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [errorContratacion, setErrorContratacion] = useState<string | null>(null);

  const usuario = obtenerUsuario();

  useEffect(() => {
    Promise.all([
      apiFetch<PerfilPrestador>(`/api/prestadores/${id}`),
      apiFetch<Calificacion[]>(`/api/prestadores/${id}/calificaciones`),
    ])
      .then(([perfilData, calificacionesData]) => {
        setPerfil(perfilData);
        setCalificaciones(calificacionesData);
      })
      .catch((err) => {
        setError(err instanceof ApiError && err.status === 404
          ? "No encontramos este prestador."
          : "Error al cargar el perfil.");
      })
      .finally(() => setCargando(false));
  }, [id]);

  function abrirFormularioContratacion(servicio: ServicioOfrecido) {
    if (!usuario) {
      router.push("/login");
      return;
    }
    setServicioAContratar(servicio);
    setMonto(servicio.precioReferencia ? String(servicio.precioReferencia) : "");
    setErrorContratacion(null);
  }

  async function handleContratar(e: React.FormEvent) {
    e.preventDefault();
    if (!servicioAContratar) return;

    const montoNumerico = Number(monto);
    if (!montoNumerico || montoNumerico <= 0) {
      setErrorContratacion("Ingresá un monto válido.");
      return;
    }

    setEnviando(true);
    setErrorContratacion(null);

    const body: CrearOrdenRequest = {
      prestadorId: id,
      categoriaId: servicioAContratar.categoriaId,
      montoTotal: montoNumerico,
    };

    try {
      const orden = await apiFetch<Orden>("/api/ordenes", {
        method: "POST",
        body: JSON.stringify(body),
      });
      router.push(`/ordenes?creada=${orden.id}`);
    } catch (err) {
      setErrorContratacion(err instanceof ApiError ? err.message : "Error al crear la solicitud");
      setEnviando(false);
    }
  }

  if (cargando) return <p className="p-6 text-ink/60">Cargando...</p>;
  if (error) return <p className="p-6 text-red-700">{error}</p>;
  if (!perfil) return null;

  const miembroDesde = new Date(perfil.miembroDesde).toLocaleDateString("es-AR", {
    year: "numeric",
    month: "long",
  });

  const esClientePropio = usuario?.rol === "Cliente";

  return (
    <div className="max-w-lg mx-auto mt-16 p-6 w-full">
      <div className="flex items-center gap-4 mb-2">
        <div className="w-16 h-16 rounded-full bg-ink/10 flex items-center justify-center font-display text-lg text-ink shrink-0">
          {perfil.nombre[0]}{perfil.apellido[0]}
        </div>
        <div>
          <h1 className="font-display text-2xl text-ink">
            {perfil.nombre} {perfil.apellido}
            {perfil.verificado && (
              <span className="text-stamp text-sm ml-2 align-middle">✓ Verificado</span>
            )}
          </h1>
          <p className="text-sm text-ink/50">Miembro desde {miembroDesde}</p>
          {perfil.cantidadCalificaciones > 0 && (
            <div className="flex items-center gap-1 mt-1">
              <Estrellas valor={perfil.promedioCalificacion!} />
              <span className="text-sm text-ink/60">
                {perfil.promedioCalificacion!.toFixed(1)} ({perfil.cantidadCalificaciones})
              </span>
            </div>
          )}
        </div>
      </div>

      <p className="font-mono text-xs tracking-widest text-copper uppercase mt-6 mb-3">Servicios</p>
      {perfil.servicios.length === 0 && (
        <p className="text-ink/50 text-sm">Este prestador todavía no cargó servicios.</p>
      )}
      <ul className="flex flex-col gap-3">
        {perfil.servicios.map((s) => (
          <li key={s.categoriaId} className="bg-white border border-ink/10 rounded-lg p-4">
            <div className="flex justify-between items-start gap-3">
              <div>
                <p className="font-medium text-ink">{s.categoriaNombre}</p>
                {s.descripcion && <p className="text-sm text-ink/60">{s.descripcion}</p>}
                {s.precioReferencia && (
                  <p className="font-mono text-sm text-ink/70 mt-1">
                    Desde ${s.precioReferencia.toLocaleString("es-AR")}
                  </p>
                )}
              </div>
              {esClientePropio && (
                <button
                  onClick={() => abrirFormularioContratacion(s)}
                  className="bg-copper text-paper text-sm rounded px-3 py-1.5 whitespace-nowrap hover:bg-copper-dark transition-colors"
                >
                  Contratar
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>

      {!usuario && (
        <p className="text-sm text-ink/50 mt-4">
          Iniciá sesión como cliente para poder contratar.
        </p>
      )}

      <p className="font-mono text-xs tracking-widest text-copper uppercase mt-8 mb-3">Reseñas</p>
      {calificaciones.length === 0 && (
        <p className="text-ink/50 text-sm">Este prestador todavía no tiene reseñas.</p>
      )}
      <ul className="flex flex-col gap-3">
        {calificaciones.map((c) => (
          <li key={c.id} className="bg-white border border-ink/10 rounded-lg p-4">
            <div className="flex justify-between items-center mb-1">
              <span className="font-medium text-sm text-ink">{c.clienteNombre}</span>
              <Estrellas valor={c.puntuacion} tamaño="text-sm" />
            </div>
            {c.comentario && <p className="text-sm text-ink/60">{c.comentario}</p>}
          </li>
        ))}
      </ul>

      {servicioAContratar && (
        <div className="fixed inset-0 bg-ink/50 flex items-center justify-center p-6">
          <div className="bg-paper rounded-lg p-6 max-w-sm w-full border border-ink/10">
            <h3 className="font-display text-lg text-ink mb-4">
              Contratar: {servicioAContratar.categoriaNombre}
            </h3>
            <form onSubmit={handleContratar} className="flex flex-col gap-3">
              <label className="text-sm text-ink/60">
                Monto acordado
                <input
                  type="number"
                  min={1}
                  required
                  className="border border-ink/20 rounded p-2 w-full mt-1 bg-white"
                  value={monto}
                  onChange={(e) => setMonto(e.target.value)}
                />
              </label>

              {errorContratacion && (
                <p className="text-red-700 text-sm">{errorContratacion}</p>
              )}

              <div className="flex gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => setServicioAContratar(null)}
                  className="border border-ink/20 rounded p-2 flex-1 text-ink"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={enviando}
                  className="bg-copper text-paper rounded p-2 flex-1 hover:bg-copper-dark transition-colors disabled:opacity-40"
                >
                  {enviando ? "Enviando..." : "Confirmar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}