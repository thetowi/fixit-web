"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { obtenerUsuario } from "@/lib/auth";
import { obtenerUbicacionActual } from "@/lib/geolocation";
import { Usuario } from "@/types/auth";
import { PrestadorDestacado } from "@/types/destacados";
import Estrellas from "@/components/Estrellas";

export default function Home() {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [destacados, setDestacados] = useState<PrestadorDestacado[]>([]);
  const [cargandoDestacados, setCargandoDestacados] = useState(true);

  useEffect(() => {
    setUsuario(obtenerUsuario());
  }, []);

  useEffect(() => {
    async function cargarDestacados() {
      let params = "";
      try {
        const coords = await obtenerUbicacionActual();
        params = `?latitud=${coords.latitud}&longitud=${coords.longitud}`;
      } catch {
        // Sin ubicación no pasa nada: el backend devuelve destacados sin filtrar por distancia
      }

      try {
        const data = await apiFetch<PrestadorDestacado[]>(`/api/prestadores/destacados${params}`);
        setDestacados(data);
      } catch {
        // Si falla, simplemente no mostramos la sección de destacados
      } finally {
        setCargandoDestacados(false);
      }
    }

    cargarDestacados();
  }, []);

  return (
    <div className="flex-1 flex flex-col items-center px-6">
      <div className="flex flex-col items-center text-center pt-20 pb-14">
        <p className="font-mono text-xs tracking-widest text-copper uppercase mb-3">
          Plomería · Electricidad · Gas · Jardinería
        </p>
        <h1 className="font-display text-4xl sm:text-5xl text-ink tracking-tight mb-4 max-w-xl">
          El oficio que necesitás, a la vuelta de la esquina
        </h1>
        <p className="text-ink/70 mb-10 max-w-md">
          Buscá por categoría y ubicación, chateá con el prestador y pagá con confianza.
        </p>

        {!usuario && (
          <div className="flex gap-3">
            <Link href="/registro" className="bg-copper text-paper rounded px-5 py-2.5 font-medium hover:bg-copper-dark transition-colors">
              Crear cuenta
            </Link>
            <Link href="/login" className="border border-ink/20 text-ink rounded px-5 py-2.5 font-medium hover:border-ink/40 transition-colors">
              Iniciar sesión
            </Link>
          </div>
        )}

        {usuario?.rol === "Cliente" && (
          <Link href="/buscar" className="bg-copper text-paper rounded px-5 py-2.5 font-medium hover:bg-copper-dark transition-colors">
            Buscar un servicio
          </Link>
        )}

        {usuario?.rol === "Prestador" && (
          <Link href="/prestador/servicios" className="bg-copper text-paper rounded px-5 py-2.5 font-medium hover:bg-copper-dark transition-colors">
            Gestionar mis servicios
          </Link>
        )}
      </div>

      {usuario?.rol !== "Prestador" && !cargandoDestacados && destacados.length > 0 && (
        <div className="w-full max-w-4xl pb-20">
          <p className="font-mono text-xs tracking-widest text-copper uppercase mb-4 text-center">
            Los mejor calificados
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {destacados.map((p) => (
              <Link
                key={p.id}
                href={`/prestador/${p.id}`}
                className="bg-white border border-ink/10 rounded-lg p-4 hover:border-copper transition-colors"
              >
                <div className="flex items-center gap-3 mb-2">
                  {p.fotoPerfilUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.fotoPerfilUrl} alt={p.nombre} className="w-11 h-11 rounded-full object-cover" />
                  ) : (
                    <div className="w-11 h-11 rounded-full bg-ink/10 flex items-center justify-center font-display text-xs text-ink shrink-0">
                      {p.nombre[0]}{p.apellido[0]}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="font-medium text-ink truncate">
                      {p.nombre} {p.apellido}
                      {p.verificado && <span className="text-stamp text-xs ml-1">✓</span>}
                    </p>
                    <p className="text-xs text-ink/50 truncate">{p.categorias.join(" · ")}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  {p.cantidadCalificaciones > 0 ? (
                    <div className="flex items-center gap-1">
                      <Estrellas valor={p.promedioCalificacion!} tamaño="text-xs" />
                      <span className="text-xs text-ink/50">({p.cantidadCalificaciones})</span>
                    </div>
                  ) : (
                    <span className="text-xs text-ink/40">Sin reseñas todavía</span>
                  )}
                  {p.distanciaKm != null && (
                    <span className="font-mono text-xs text-copper">{p.distanciaKm.toFixed(1)} km</span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}