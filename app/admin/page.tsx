"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api";
import { obtenerUsuario } from "@/lib/auth";
import { CategoriaAdmin, CrearCategoriaRequest, UsuarioAdmin } from "@/types/admin";
import { Orden } from "@/types/ordenes";

const ESTADO_LABELS: Record<string, string> = {
  PendientePago: "Pendiente de pago",
  Pagado: "Pagado",
  EnCurso: "En curso",
  Completado: "Completado",
  Cancelado: "Cancelado",
  EnDisputa: "En disputa",
};

export default function AdminPage() {
  const router = useRouter();
  const [categorias, setCategorias] = useState<CategoriaAdmin[]>([]);
  const [usuarios, setUsuarios] = useState<UsuarioAdmin[]>([]);
  const [ordenes, setOrdenes] = useState<Orden[]>([]);
  const [nombreNueva, setNombreNueva] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [seccion, setSeccion] = useState<"categorias" | "usuarios" | "ordenes">("categorias");

  useEffect(() => {
    const usuario = obtenerUsuario();
    if (!usuario) {
      router.push("/login");
      return;
    }
    if (usuario.rol !== "Admin") {
      router.push("/");
      return;
    }
    cargarDatos();
  }, [router]);

  async function cargarDatos() {
    try {
      const [cats, users, ords] = await Promise.all([
        apiFetch<CategoriaAdmin[]>("/api/admin/categorias"),
        apiFetch<UsuarioAdmin[]>("/api/admin/usuarios"),
        apiFetch<Orden[]>("/api/admin/ordenes"),
      ]);
      setCategorias(cats);
      setUsuarios(users);
      setOrdenes(ords);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error al cargar los datos");
    } finally {
      setCargando(false);
    }
  }

  async function handleCrearCategoria(e: React.FormEvent) {
    e.preventDefault();
    if (!nombreNueva.trim()) return;

    const body: CrearCategoriaRequest = { nombre: nombreNueva };

    try {
      await apiFetch<CategoriaAdmin>("/api/admin/categorias", {
        method: "POST",
        body: JSON.stringify(body),
      });
      setNombreNueva("");
      await cargarDatos();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error al crear la categoría");
    }
  }

  async function handleCambiarEstado(categoria: CategoriaAdmin) {
    try {
      await apiFetch(`/api/admin/categorias/${categoria.id}/estado`, {
        method: "PUT",
        body: JSON.stringify(!categoria.activa),
      });
      await cargarDatos();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error al cambiar el estado");
    }
  }

  async function handleMarcarPagada(ordenId: string) {
    try {
      await apiFetch(`/api/ordenes/${ordenId}/marcar-pagada`, { method: "PUT" });
      await cargarDatos();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error al marcar como pagada");
    }
  }

  if (cargando) return <p className="p-6 text-ink/60">Cargando...</p>;

  const tabs: { id: typeof seccion; label: string }[] = [
    { id: "categorias", label: "Categorías" },
    { id: "usuarios", label: "Usuarios" },
    { id: "ordenes", label: "Órdenes" },
  ];

  return (
    <div className="max-w-2xl mx-auto mt-16 p-6 w-full">
      <p className="font-mono text-xs tracking-widest text-copper uppercase mb-2">Panel</p>
      <h1 className="font-display text-2xl text-ink mb-6">Administración</h1>

      <div className="flex gap-1 mb-6 bg-ink/5 rounded-lg p-1 w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSeccion(tab.id)}
            className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${
              seccion === tab.id ? "bg-white text-ink shadow-sm" : "text-ink/50 hover:text-ink"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {error && <p className="text-red-700 text-sm mb-4">{error}</p>}

      {seccion === "categorias" && (
        <>
          <form onSubmit={handleCrearCategoria} className="flex gap-2 mb-6">
            <input
              type="text"
              placeholder="Nombre de la categoría nueva"
              className="border border-ink/20 rounded p-2 flex-1 bg-white"
              value={nombreNueva}
              onChange={(e) => setNombreNueva(e.target.value)}
            />
            <button type="submit" className="bg-copper text-paper rounded px-4 hover:bg-copper-dark transition-colors">
              Crear
            </button>
          </form>

          <ul className="flex flex-col gap-2">
            {categorias.map((c) => (
              <li key={c.id} className="bg-white border border-ink/10 rounded-lg p-3 flex justify-between items-center">
                <span className={c.activa ? "text-ink" : "text-ink/30 line-through"}>
                  {c.nombre}
                </span>
                <button
                  onClick={() => handleCambiarEstado(c)}
                  className={`text-sm rounded px-3 py-1 border ${
                    c.activa ? "border-stamp text-stamp" : "border-ink/20 text-ink/50"
                  }`}
                >
                  {c.activa ? "Desactivar" : "Activar"}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      {seccion === "usuarios" && (
        <div className="bg-white border border-ink/10 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left bg-ink/5 text-ink/60 text-xs uppercase tracking-wide">
                <th className="p-3 font-medium">Nombre</th>
                <th className="p-3 font-medium">Email</th>
                <th className="p-3 font-medium">Rol</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map((u) => (
                <tr key={u.id} className="border-t border-ink/10">
                  <td className="p-3 text-ink">{u.nombre} {u.apellido}</td>
                  <td className="p-3 text-ink/70">{u.email}</td>
                  <td className="p-3 font-mono text-xs text-ink/70">{u.rol}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {seccion === "ordenes" && (
        <ul className="flex flex-col gap-2">
          {ordenes.map((o) => (
            <li key={o.id} className="bg-white border border-ink/10 rounded-lg p-3 flex justify-between items-center">
              <div>
                <p className="font-medium text-ink">
                  {o.categoriaNombre} <span className="font-mono text-ink/60">${o.montoTotal.toLocaleString("es-AR")}</span>
                </p>
                <p className="text-sm text-ink/50">Con {o.prestadorNombreCompleto}</p>
                <span className="text-xs font-mono text-ink/40 uppercase">
                  {ESTADO_LABELS[o.estado] ?? o.estado}
                </span>
              </div>
              {o.estado === "PendientePago" && (
                <button
                  onClick={() => handleMarcarPagada(o.id)}
                  className="text-sm bg-ink text-paper rounded px-3 py-1 whitespace-nowrap hover:bg-ink/80 transition-colors"
                >
                  Marcar como pagada
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
