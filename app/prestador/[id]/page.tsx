"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api";
import { obtenerUsuario } from "@/lib/auth";
import { PerfilPrestador, ServicioOfrecido } from "@/types/perfil";
import { CrearOrdenRequest, Orden } from "@/types/ordenes";
import Estrellas from "@/components/Estrellas";
import { Calificacion } from "@/types/calificaciones";

type Pestaña = "servicios" | "reseñas" | "acerca";

export default function PerfilPrestadorPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [perfil, setPerfil] = useState<PerfilPrestador | null>(null);
  const [calificaciones, setCalificaciones] = useState<Calificacion[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [pestaña, setPestaña] = useState<Pestaña>("servicios");

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

  const tabs: { id: Pestaña; label: string }[] = [
    { id: "servicios", label: "Servicios" },
    { id: "reseñas", label: "Reseñas" },
    { id: "acerca", label: "Acerca de mí" },
  ];

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

      <div className="flex gap-1 mt-6 mb-4 bg-ink/5 rounded-lg p-1 w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setPestaña(tab.id)}
            className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${
              pestaña === tab.id ? "bg-white text-ink shadow-sm" : "text-ink/50 hover:text-ink"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {pestaña === "servicios" && (
        <>
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
        </>
      )}

      {pestaña === "reseñas" && (
        <>
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
        </>
      )}

      {pestaña === "acerca" && (
        <div className="flex flex-col gap-5">
          {perfil.biografia ? (
            <p className="text-sm text-ink/70 whitespace-pre-wrap">{perfil.biografia}</p>
          ) : (
            <p className="text-ink/50 text-sm">Este prestador todavía no agregó una descripción.</p>
          )}

          {perfil.radioAlcanceKm != null && (
            <p className="text-sm text-ink/60">
              <span className="font-mono text-copper">{perfil.radioAlcanceKm} km</span> de alcance para trabajar
            </p>
          )}

          {perfil.fotosTrabajo.length > 0 && (
            <div>
              <p className="font-mono text-xs tracking-widest text-copper uppercase mb-3">Trabajos realizados</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {perfil.fotosTrabajo.map((f) => (
                  <div key={f.id} className="aspect-square rounded-lg overflow-hidden bg-ink/5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={f.url} alt={f.descripcion ?? "Trabajo realizado"} className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

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