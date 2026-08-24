"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api";
import { obtenerUsuario } from "@/lib/auth";
import { CategoriaAdmin, CrearCategoriaRequest, UsuarioAdmin } from "@/types/admin";

export default function AdminPage() {
  const router = useRouter();
  const [categorias, setCategorias] = useState<CategoriaAdmin[]>([]);
  const [usuarios, setUsuarios] = useState<UsuarioAdmin[]>([]);
  const [nombreNueva, setNombreNueva] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [seccion, setSeccion] = useState<"categorias" | "usuarios">("categorias");

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
      const [cats, users] = await Promise.all([
        apiFetch<CategoriaAdmin[]>("/api/admin/categorias"),
        apiFetch<UsuarioAdmin[]>("/api/admin/usuarios"),
      ]);
      setCategorias(cats);
      setUsuarios(users);
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
                    c.activa ? "bg-red-50 text-red-600" : "bg-green-50 text-green-600"
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
    </div>
  );
}