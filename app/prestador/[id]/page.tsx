"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api";
import { obtenerUsuario } from "@/lib/auth";
import { PerfilPrestador } from "@/types/perfil";
import { IniciarConversacionRequest, Conversacion } from "@/types/conversaciones";
import Estrellas from "@/components/Estrellas";
import { Calificacion, CRITERIOS_CALIFICACION } from "@/types/calificaciones";

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
  const [iniciandoChat, setIniciandoChat] = useState<number | null>(null);

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

  async function handleContratar(categoriaId: number) {
    if (!usuario) {
      router.push("/login");
      return;
    }

    setIniciandoChat(categoriaId);
    setError(null);

    const body: IniciarConversacionRequest = { prestadorId: id, categoriaId };

    try {
      const conversacion = await apiFetch<Conversacion>("/api/conversaciones", {
        method: "POST",
        body: JSON.stringify(body),
      });
      router.push(`/conversaciones/${conversacion.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error al iniciar el chat");
      setIniciandoChat(null);
    }
  }

  if (cargando) return <p className="p-6 text-ink/60">Cargando...</p>;
  if (error) return <p className="p-6 text-red-700 dark:text-red-400">{error}</p>;
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
              pestaña === tab.id ? "bg-surface text-ink shadow-sm" : "text-ink/50 hover:text-ink"
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
              <li key={s.categoriaId} className="bg-surface border border-ink/10 rounded-lg p-4">
                <div className="flex justify-between items-start gap-3">
                  <div>
                    <p className="font-medium text-ink">{s.categoriaNombre}</p>
                    {s.descripcion && <p className="text-sm text-ink/60">{s.descripcion}</p>}
                    {s.precioReferencia && (
                      <p className="font-mono text-sm text-ink/70 mt-1">
                        Desde ${s.precioReferencia.toLocaleString("es-AR")} /hora
                      </p>
                    )}
                  </div>
                  {esClientePropio && (
                    <button
                      onClick={() => handleContratar(s.categoriaId)}
                      disabled={iniciandoChat === s.categoriaId}
                      className="bg-copper text-paper text-sm rounded px-3 py-1.5 whitespace-nowrap hover:bg-copper-dark transition-colors disabled:opacity-40"
                    >
                      {iniciandoChat === s.categoriaId ? "Abriendo chat..." : "Contactar"}
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
              <li key={c.id} className="bg-surface border border-ink/10 rounded-lg p-4">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-medium text-sm text-ink">{c.clienteNombre}</span>
                  <div className="flex items-center gap-1">
                    <Estrellas valor={c.promedio} tamaño="text-sm" />
                    <span className="text-xs text-ink/50">{c.promedio.toFixed(1)}</span>
                  </div>
                </div>
                {c.comentario && <p className="text-sm text-ink/60 mb-2">{c.comentario}</p>}
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-ink/40 font-mono">
                  {CRITERIOS_CALIFICACION.map((criterio) => (
                    <span key={criterio.key}>
                      {criterio.label}: {c[criterio.key]}★
                    </span>
                  ))}
                </div>
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
    </div>
  );
}