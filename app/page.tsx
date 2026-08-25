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

      // Actualizamos también los datos guardados en localStorage (nombre puede aparecer en otros lados, como el chat)
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
        headers: {
          Authorization: `Bearer ${token}`,
          // Sin Content-Type: el navegador lo arma solo para FormData
        },
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

  if (cargando) return <p className="p-6">Cargando...</p>;
  if (!perfil) return null;

  return (
    <div className="max-w-md mx-auto mt-16 p-6">
      <h1 className="text-2xl font-bold mb-6">Mi cuenta</h1>

      <div className="flex items-center gap-4 mb-6">
        <div className="relative">
          {perfil.fotoPerfilUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={perfil.fotoPerfilUrl}
              alt="Foto de perfil"
              className="w-20 h-20 rounded-full object-cover"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center text-xl font-semibold">
              {perfil.nombre[0]}{perfil.apellido[0]}
            </div>
          )}
        </div>
        <div>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={subiendoFoto}
            className="text-sm underline disabled:opacity-50"
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
        </div>
      </div>

      <p className="text-sm text-gray-500 mb-6">
        {perfil.email} · {perfil.rol}
        {perfil.verificado && <span className="text-green-600 ml-2">✓ Verificado</span>}
      </p>

      <form onSubmit={handleGuardar} className="flex flex-col gap-4">
        <label className="text-sm text-gray-600">
          Nombre
          <input
            type="text"
            required
            className="border rounded p-2 w-full mt-1"
            value={form.nombre}
            onChange={(e) => setForm({ ...form, nombre: e.target.value })}
          />
        </label>
        <label className="text-sm text-gray-600">
          Apellido
          <input
            type="text"
            required
            className="border rounded p-2 w-full mt-1"
            value={form.apellido}
            onChange={(e) => setForm({ ...form, apellido: e.target.value })}
          />
        </label>
        <label className="text-sm text-gray-600">
          Teléfono
          <input
            type="tel"
            className="border rounded p-2 w-full mt-1"
            value={form.telefono}
            onChange={(e) => setForm({ ...form, telefono: e.target.value })}
          />
        </label>

        {error && <p className="text-red-600 text-sm">{error}</p>}
        {mensajeExito && <p className="text-green-600 text-sm">{mensajeExito}</p>}

        <button
          type="submit"
          disabled={guardando}
          className="bg-black text-white rounded p-2 disabled:opacity-50"
        >
          {guardando ? "Guardando..." : "Guardar cambios"}
        </button>
      </form>

      <button onClick={handleLogout} className="mt-6 text-sm text-gray-500 underline">
        Cerrar sesión
      </button>
    </div>
  );
}