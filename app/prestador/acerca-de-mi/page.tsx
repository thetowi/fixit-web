"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api";
import { obtenerUsuario } from "@/lib/auth";
import { PerfilPrestador, FotoTrabajo } from "@/types/perfil";

export default function AcercaDeMiPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [perfil, setPerfil] = useState<PerfilPrestador | null>(null);
  const [biografia, setBiografia] = useState("");
  const [radioAlcanceKm, setRadioAlcanceKm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [subiendoFoto, setSubiendoFoto] = useState(false);

  const usuario = obtenerUsuario();

  useEffect(() => {
    if (!usuario) {
      router.push("/login");
      return;
    }
    if (usuario.rol !== "Prestador") {
      router.push("/cuenta");
      return;
    }
    cargarPerfil();
  }, [router]);

  async function cargarPerfil() {
    try {
      const data = await apiFetch<PerfilPrestador>(`/api/prestadores/${usuario!.id}`);
      setPerfil(data);
      setBiografia(data.biografia ?? "");
      setRadioAlcanceKm(data.radioAlcanceKm ? String(data.radioAlcanceKm) : "");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error al cargar tu perfil");
    } finally {
      setCargando(false);
    }
  }

  async function handleGuardar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMensajeExito(null);
    setGuardando(true);

    try {
      await apiFetch("/api/prestador/acerca-de-mi", {
        method: "PUT",
        body: JSON.stringify({
          biografia: biografia || null,
          radioAlcanceKm: radioAlcanceKm ? Number(radioAlcanceKm) : null,
        }),
      });
      setMensajeExito("Datos actualizados correctamente.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error al guardar los cambios");
    } finally {
      setGuardando(false);
    }
  }

  async function handleSubirFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    if (!archivo) return;

    setError(null);
    setSubiendoFoto(true);

    const token = localStorage.getItem("fixit_token");
    const formData = new FormData();
    formData.append("archivo", archivo);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      const response = await fetch(`${apiUrl}/api/prestador/fotos-trabajo`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => null);
        throw new Error(errorBody?.error ?? "Error al subir la imagen");
      }

      const nuevaFoto: FotoTrabajo = await response.json();
      setPerfil((prev) => (prev ? { ...prev, fotosTrabajo: [nuevaFoto, ...prev.fotosTrabajo] } : prev));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al subir la imagen");
    } finally {
      setSubiendoFoto(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleEliminarFoto(fotoId: string) {
    try {
      await apiFetch(`/api/prestador/fotos-trabajo/${fotoId}`, { method: "DELETE" });
      setPerfil((prev) =>
        prev ? { ...prev, fotosTrabajo: prev.fotosTrabajo.filter((f) => f.id !== fotoId) } : prev
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error al eliminar la foto");
    }
  }

  if (cargando) return <p className="p-6 text-ink/60">Cargando...</p>;
  if (!perfil) return null;

  return (
    <div className="max-w-lg mx-auto mt-16 p-6 w-full">
      <p className="font-mono text-xs tracking-widest text-copper uppercase mb-2">Prestador</p>
      <h1 className="font-display text-2xl text-ink mb-6">Acerca de mí</h1>

      <form onSubmit={handleGuardar} className="bg-white border border-ink/10 rounded-lg p-5 flex flex-col gap-4 mb-6">
        <label className="text-sm text-ink/60">
          Contanos sobre vos
          <textarea
            placeholder="Edad, años de experiencia, a qué te dedicás dentro del oficio..."
            rows={5}
            className="border border-ink/20 rounded p-2 w-full mt-1 bg-paper"
            value={biografia}
            onChange={(e) => setBiografia(e.target.value)}
          />
        </label>

        <label className="text-sm text-ink/60">
          Radio de alcance (km desde tu zona)
          <input
            type="number"
            min={0}
            className="border border-ink/20 rounded p-2 w-full mt-1 bg-paper"
            value={radioAlcanceKm}
            onChange={(e) => setRadioAlcanceKm(e.target.value)}
          />
        </label>

        {error && <p className="text-red-700 text-sm">{error}</p>}
        {mensajeExito && <p className="text-stamp text-sm">{mensajeExito}</p>}

        <button
          type="submit"
          disabled={guardando}
          className="bg-copper text-paper rounded p-2 font-medium hover:bg-copper-dark transition-colors disabled:opacity-40"
        >
          {guardando ? "Guardando..." : "Guardar cambios"}
        </button>
      </form>

      <div className="bg-white border border-ink/10 rounded-lg p-5">
        <div className="flex justify-between items-center mb-3">
          <p className="font-mono text-xs tracking-widest text-copper uppercase">Fotos de trabajos</p>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={subiendoFoto}
            className="text-sm text-copper hover:underline disabled:opacity-40"
          >
            {subiendoFoto ? "Subiendo..." : "+ Agregar foto"}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleSubirFoto}
          />
        </div>

        {perfil.fotosTrabajo.length === 0 ? (
          <p className="text-ink/50 text-sm">Todavía no subiste fotos de trabajos.</p>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {perfil.fotosTrabajo.map((f) => (
              <div key={f.id} className="relative aspect-square rounded-lg overflow-hidden bg-ink/5 group">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={f.url} alt="" className="w-full h-full object-cover" />
                <button
                  onClick={() => handleEliminarFoto(f.id)}
                  className="absolute top-1 right-1 bg-ink/70 text-paper text-xs rounded px-1.5 py-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  Quitar
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}