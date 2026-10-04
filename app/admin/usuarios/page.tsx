"use client";

import { useEffect, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import { obtenerUsuario } from "@/lib/auth";
import { CrearTesoreroRequest, UsuarioAdmin } from "@/types/admin";

const ROLES_FILTRO = ["Todos", "Cliente", "Prestador", "Admin", "Tesorero"] as const;

export default function AdminUsuariosPage() {
  const [usuarios, setUsuarios] = useState<UsuarioAdmin[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [filtroRol, setFiltroRol] = useState<typeof ROLES_FILTRO[number]>("Todos");
  const [procesandoId, setProcesandoId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);

  // Rol Tesorero (01/10) — formulario para que un Admin cree la cuenta a mano, no hay registro
  // público para este rol (ver claude/backlog.md).
  const [mostrarFormTesorero, setMostrarFormTesorero] = useState(false);
  const [nuevoTesorero, setNuevoTesorero] = useState({ email: "", password: "", nombre: "", apellido: "" });
  const [creandoTesorero, setCreandoTesorero] = useState(false);

  const miId = obtenerUsuario()?.id;

  useEffect(() => {
    cargarDatos();
  }, []);

  async function cargarDatos() {
    try {
      const users = await apiFetch<UsuarioAdmin[]>("/api/admin/usuarios");
      setUsuarios(users);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error al cargar los usuarios");
    } finally {
      setCargando(false);
    }
  }

  async function handleCrearTesorero(e: React.FormEvent) {
    e.preventDefault();
    if (!nuevoTesorero.email.trim() || !nuevoTesorero.password || !nuevoTesorero.nombre.trim() || !nuevoTesorero.apellido.trim()) {
      setError("Completá todos los campos para crear la cuenta de Tesorero.");
      return;
    }

    const body: CrearTesoreroRequest = {
      email: nuevoTesorero.email.trim(),
      password: nuevoTesorero.password,
      nombre: nuevoTesorero.nombre.trim(),
      apellido: nuevoTesorero.apellido.trim(),
    };

    setCreandoTesorero(true);
    try {
      await apiFetch("/api/admin/tesoreros", { method: "POST", body: JSON.stringify(body) });
      setNuevoTesorero({ email: "", password: "", nombre: "", apellido: "" });
      setMostrarFormTesorero(false);
      setError(null);
      await cargarDatos();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error al crear la cuenta de Tesorero");
    } finally {
      setCreandoTesorero(false);
    }
  }

  // Desactivar/reactivar una cuenta (04/10) — el backend ya bloquea desactivarse a sí mismo o a
  // otro Admin/Tesorero (ver AdminService.CambiarEstadoUsuarioAsync), este botón ni se muestra
  // para esos casos para no ofrecer una acción que el backend va a rechazar.
  async function handleCambiarEstado(usuario: UsuarioAdmin) {
    const accion = usuario.activo ? "desactivar" : "reactivar";
    if (!window.confirm(`¿Confirmás que querés ${accion} la cuenta de ${usuario.nombre} ${usuario.apellido}?`)) return;

    setProcesandoId(usuario.id);
    try {
      await apiFetch(`/api/admin/usuarios/${usuario.id}/estado`, {
        method: "PUT",
        body: JSON.stringify(!usuario.activo),
      });
      setError(null);
      await cargarDatos();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error al cambiar el estado de la cuenta");
    } finally {
      setProcesandoId(null);
    }
  }

  if (cargando) return <p className="text-ink/60">Cargando...</p>;

  const usuariosFiltrados = usuarios.filter((u) => {
    const coincideBusqueda =
      busqueda.trim() === "" ||
      `${u.nombre} ${u.apellido}`.toLowerCase().includes(busqueda.trim().toLowerCase()) ||
      u.email.toLowerCase().includes(busqueda.trim().toLowerCase());
    const coincideRol = filtroRol === "Todos" || u.rol === filtroRol;
    return coincideBusqueda && coincideRol;
  });

  return (
    <>
      {error && <p className="text-red-700 dark:text-red-400 text-sm mb-4">{error}</p>}

      <div className="bg-surface border border-ink/10 rounded-lg p-4 mb-4">
        {mostrarFormTesorero ? (
          <form onSubmit={handleCrearTesorero} className="flex flex-col gap-3">
            <p className="font-medium text-ink text-sm">Crear cuenta de Tesorero</p>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="Nombre"
                className="border border-ink/20 rounded p-2 bg-paper text-sm"
                value={nuevoTesorero.nombre}
                onChange={(e) => setNuevoTesorero((p) => ({ ...p, nombre: e.target.value }))}
              />
              <input
                type="text"
                placeholder="Apellido"
                className="border border-ink/20 rounded p-2 bg-paper text-sm"
                value={nuevoTesorero.apellido}
                onChange={(e) => setNuevoTesorero((p) => ({ ...p, apellido: e.target.value }))}
              />
            </div>
            <input
              type="email"
              placeholder="Email"
              className="border border-ink/20 rounded p-2 bg-paper text-sm"
              value={nuevoTesorero.email}
              onChange={(e) => setNuevoTesorero((p) => ({ ...p, email: e.target.value }))}
            />
            <input
              type="password"
              placeholder="Contraseña (mínimo 6 caracteres)"
              className="border border-ink/20 rounded p-2 bg-paper text-sm"
              value={nuevoTesorero.password}
              onChange={(e) => setNuevoTesorero((p) => ({ ...p, password: e.target.value }))}
            />
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={creandoTesorero}
                className="text-sm bg-copper text-paper rounded px-3 py-1.5 hover:bg-copper-dark transition-colors disabled:opacity-40"
              >
                {creandoTesorero ? "Creando..." : "Crear cuenta"}
              </button>
              <button
                type="button"
                onClick={() => setMostrarFormTesorero(false)}
                disabled={creandoTesorero}
                className="text-sm border border-ink/20 text-ink/60 rounded px-3 py-1.5 hover:text-ink transition-colors disabled:opacity-40"
              >
                Cancelar
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setMostrarFormTesorero(true)}
            className="text-sm bg-copper text-paper rounded px-4 py-2 hover:bg-copper-dark transition-colors"
          >
            Crear cuenta de Tesorero
          </button>
        )}
      </div>

      <div className="flex gap-3 mb-4 flex-wrap items-center">
        <input
          type="text"
          placeholder="Buscar por nombre o email..."
          className="border border-ink/20 rounded p-2 bg-paper text-sm flex-1 min-w-[220px]"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
        <select
          className="border border-ink/20 rounded p-2 bg-paper text-sm"
          value={filtroRol}
          onChange={(e) => setFiltroRol(e.target.value as typeof filtroRol)}
        >
          {ROLES_FILTRO.map((r) => (
            <option key={r} value={r}>
              {r === "Todos" ? "Todos los roles" : r}
            </option>
          ))}
        </select>
        <span className="text-xs text-ink/40">
          {usuariosFiltrados.length} de {usuarios.length}
        </span>
      </div>

      <div className="bg-surface border border-ink/10 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left bg-ink/5 text-ink/60 text-xs uppercase tracking-wide">
              <th className="p-3 font-medium">Nombre</th>
              <th className="p-3 font-medium">Email</th>
              <th className="p-3 font-medium">Rol</th>
              <th className="p-3 font-medium">Estado</th>
              <th className="p-3 font-medium">Alta</th>
              <th className="p-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {usuariosFiltrados.length === 0 && (
              <tr>
                <td colSpan={6} className="p-3 text-ink/50 text-center">
                  No hay usuarios que coincidan con esa búsqueda.
                </td>
              </tr>
            )}
            {usuariosFiltrados.map((u) => {
              const puedeGestionar = u.id !== miId && u.rol !== "Admin" && u.rol !== "Tesorero";
              return (
                <tr key={u.id} className="border-t border-ink/10">
                  <td className="p-3 text-ink">{u.nombre} {u.apellido}</td>
                  <td className="p-3 text-ink/70">{u.email}</td>
                  <td className="p-3 font-mono text-xs text-ink/70">{u.rol}</td>
                  <td className="p-3">
                    <span
                      className={`text-xs font-mono uppercase rounded-full px-2 py-0.5 ${
                        u.activo ? "bg-stamp/15 text-stamp" : "bg-red-700/10 dark:bg-red-400/10 text-red-700 dark:text-red-400"
                      }`}
                    >
                      {u.activo ? "Activo" : "Desactivado"}
                    </span>
                  </td>
                  <td className="p-3 text-ink/50 text-xs">{new Date(u.creadoEn).toLocaleDateString("es-AR")}</td>
                  <td className="p-3 text-right">
                    {puedeGestionar && (
                      <button
                        onClick={() => handleCambiarEstado(u)}
                        disabled={procesandoId === u.id}
                        className={`text-xs rounded px-2 py-1 border whitespace-nowrap transition-colors disabled:opacity-40 ${
                          u.activo
                            ? "border-red-700/40 text-red-700 dark:text-red-400 hover:bg-red-700/10"
                            : "border-stamp/40 text-stamp hover:bg-stamp/10"
                        }`}
                      >
                        {procesandoId === u.id ? "..." : u.activo ? "Desactivar" : "Reactivar"}
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
