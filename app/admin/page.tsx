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

  if (cargando) return <p className="p-6">Cargando...</p>;

  return (
    <div className="max-w-2xl mx-auto mt-16 p-6">
      <h1 className="text-2xl font-bold mb-6">Panel de administración</h1>

      <div className="flex gap-4 mb-6 border-b">
        <button
          onClick={() => setSeccion("categorias")}
          className={`pb-2 ${seccion === "categorias" ? "border-b-2 border-black font-medium" : "text-gray-500"}`}
        >
          Categorías
        </button>
        <button
          onClick={() => setSeccion("usuarios")}
          className={`pb-2 ${seccion === "usuarios" ? "border-b-2 border-black font-medium" : "text-gray-500"}`}
        >
          Usuarios
        </button>
        <button
          onClick={() => setSeccion("ordenes")}
          className={`pb-2 ${seccion === "ordenes" ? "border-b-2 border-black font-medium" : "text-gray-500"}`}
        >
          Órdenes
        </button>
      </div>

      {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

      {seccion === "categorias" && (
        <>
          <form onSubmit={handleCrearCategoria} className="flex gap-2 mb-6">
            <input
              type="text"
              placeholder="Nombre de la categoría nueva"
              className="border rounded p-2 flex-1"
              value={nombreNueva}
              onChange={(e) => setNombreNueva(e.target.value)}
            />
            <button type="submit" className="bg-black text-white rounded px-4">
              Crear
            </button>
          </form>

          <ul className="flex flex-col gap-2">
            {categorias.map((c) => (
              <li key={c.id} className="border rounded p-3 flex justify-between items-center">
                <span className={c.activa ? "" : "text-gray-400 line-through"}>
                  {c.nombre}
                </span>
                <button
                  onClick={() => handleCambiarEstado(c)}
                  className={`text-sm rounded px-3 py-1 ${
                    c.activa ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"
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
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left border-b">
              <th className="pb-2">Nombre</th>
              <th className="pb-2">Email</th>
              <th className="pb-2">Rol</th>
            </tr>
          </thead>
          <tbody>
            {usuarios.map((u) => (
              <tr key={u.id} className="border-b">
                <td className="py-2">{u.nombre} {u.apellido}</td>
                <td className="py-2">{u.email}</td>
                <td className="py-2">{u.rol}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {seccion === "ordenes" && (
        <ul className="flex flex-col gap-2">
          {ordenes.map((o) => (
            <li key={o.id} className="border rounded p-3 flex justify-between items-center">
              <div>
                <p className="font-medium">{o.categoriaNombre} — ${o.montoTotal}</p>
                <p className="text-sm text-gray-600">Con {o.prestadorNombreCompleto}</p>
                <span className="text-xs bg-gray-100 rounded px-2 py-1">
                  {ESTADO_LABELS[o.estado] ?? o.estado}
                </span>
              </div>
              {o.estado === "PendientePago" && (
                <button
                  onClick={() => handleMarcarPagada(o.id)}
                  className="text-sm bg-black text-white rounded px-3 py-1 whitespace-nowrap"
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