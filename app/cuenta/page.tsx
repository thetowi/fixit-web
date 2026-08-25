"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api";
import { obtenerUsuario, cerrarSesion, guardarSesion } from "@/lib/auth";
import { PerfilPropio, ActualizarPerfilRequest } from "@/types/perfilPropio";

export default function CuentaPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [perfil, setPerfil] = useState<PerfilPropio | null>(null);
  const [form, setForm] = useState<ActualizarPerfilRequest>({ nombre: "", apellido: "", telefono: "" });
  const [error, setError] = useState<string | null>(null);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [subiendoFoto, setSubiendoFoto] = useState(false);

  useEffect(() => {
    if (!obtenerUsuario()) {
      router.push("/login");
      return;
    }
    cargarPerfil();
  }, [router]);

  async function cargarPerfil() {
    try {
      const data = await apiFetch<PerfilPropio>("/api/usuarios/perfil");
      setPerfil(data);
      setForm({ nombre: data.nombre, apellido: data.apellido, telefono: data.telefono });
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
      const actualizado = await apiFetch<PerfilPropio>("/api/usuarios/perfil", {
        method: "PUT",
        body: JSON.stringify(form),
      });
      setPerfil(actualizado);

      const usuarioActual = obtenerUsuario();
      const token = localStorage.getItem("fixit_token");
      if (usuarioActual && token) {
        guardarSesion(token, { ...usuarioActual, nombre: actualizado.nombre, apellido: actualizado.apellido });
      }

      setMensajeExito("Datos actualizados correctamente.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error al guardar los cambios");
    } finally {
      setGuardando(false);
    }
  }

  async function handleCambiarFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    if (!archivo) return;

    setError(null);
    setSubiendoFoto(true);

    const token = localStorage.getItem("fixit_token");
    const formData = new FormData();
    formData.append("archivo", archivo);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      const response = await fetch(`${apiUrl}/api/usuarios/foto-perfil`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => null);
        throw new Error(errorBody?.error ?? "Error al subir la imagen");
      }

      const data = await response.json();
      setPerfil((prev) => (prev ? { ...prev, fotoPerfilUrl: data.fotoPerfilUrl } : prev));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al subir la imagen");
    } finally {
      setSubiendoFoto(false);
    }
  }

  function handleLogout() {
    cerrarSesion();
    router.push("/login");
  }

  if (cargando) return <p className="p-6 text-ink/60">Cargando...</p>;
  if (!perfil) return null;

  return (
    <div className="max-w-md mx-auto mt-16 p-6 w-full">
      <p className="font-mono text-xs tracking-widest text-copper uppercase mb-2">Mi cuenta</p>
      <h1 className="font-display text-2xl text-ink mb-6">
        {perfil.nombre} {perfil.apellido}
      </h1>

      <div className="bg-white border border-ink/10 rounded-lg p-5 mb-6">
        <div className="flex items-center gap-4 mb-5">
          {perfil.fotoPerfilUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={perfil.fotoPerfilUrl}
              alt="Foto de perfil"
              className="w-16 h-16 rounded-full object-cover border-2 border-copper"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-ink/10 flex items-center justify-center font-display text-lg text-ink">
              {perfil.nombre[0]}{perfil.apellido[0]}
            </div>
          )}
          <div>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={subiendoFoto}
              className="text-sm text-copper hover:underline disabled:opacity-40"
            >
              {subiendoFoto ? "Subiendo..." : "Cambiar foto"}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleCambiarFoto}
            />
            <p className="text-xs text-ink/50 mt-1">
              {perfil.email} · <span className="uppercase">{perfil.rol}</span>
              {perfil.verificado && <span className="text-stamp ml-1">✓</span>}
            </p>
          </div>
        </div>

        <form onSubmit={handleGuardar} className="flex flex-col gap-3">
          <label className="text-sm text-ink/60">
            Nombre
            <input
              type="text"
              required
              className="border border-ink/20 rounded p-2 w-full mt-1 bg-paper"
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
            />
          </label>
          <label className="text-sm text-ink/60">
            Apellido
            <input
              type="text"
              required
              className="border border-ink/20 rounded p-2 w-full mt-1 bg-paper"
              value={form.apellido}
              onChange={(e) => setForm({ ...form, apellido: e.target.value })}
            />
          </label>
          <label className="text-sm text-ink/60">
            Teléfono
            <input
              type="tel"
              className="border border-ink/20 rounded p-2 w-full mt-1 bg-paper"
              value={form.telefono}
              onChange={(e) => setForm({ ...form, telefono: e.target.value })}
            />
          </label>

          {error && <p className="text-red-700 text-sm">{error}</p>}
          {mensajeExito && <p className="text-stamp text-sm">{mensajeExito}</p>}

          <button
            type="submit"
            disabled={guardando}
            className="bg-copper text-paper rounded p-2 font-medium hover:bg-copper-dark transition-colors disabled:opacity-40 mt-1"
          >
            {guardando ? "Guardando..." : "Guardar cambios"}
          </button>
        </form>
      </div>

      <button onClick={handleLogout} className="text-sm text-ink/40 hover:text-ink/70 transition-colors">
        Cerrar sesión
      </button>
    </div>
  );
}