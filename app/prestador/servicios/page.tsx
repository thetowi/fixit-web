"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api";
import { obtenerUsuario } from "@/lib/auth";
import { Categoria, PrestadorCategoria, AgregarCategoriaRequest } from "@/types/categorias";

export default function ServiciosPrestadorPage() {
  const router = useRouter();
  const [categoriasDisponibles, setCategoriasDisponibles] = useState<Categoria[]>([]);
  const [misCategorias, setMisCategorias] = useState<PrestadorCategoria[]>([]);
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<number | "">("");
  const [descripcion, setDescripcion] = useState("");
  const [precio, setPrecio] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const usuario = obtenerUsuario();
    if (!usuario) {
      router.push("/login");
      return;
    }
    if (usuario.rol !== "Prestador") {
      router.push("/cuenta");
      return;
    }

    cargarDatos();
  }, [router]);

  async function cargarDatos() {
    try {
      const [disponibles, mias] = await Promise.all([
        apiFetch<Categoria[]>("/api/Categorias"),
        apiFetch<PrestadorCategoria[]>("/api/prestador/categorias"),
      ]);
      setCategoriasDisponibles(disponibles);
      setMisCategorias(mias);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error al cargar los datos");
    } finally {
      setCargando(false);
    }
  }

  async function handleAgregar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!categoriaSeleccionada) {
      setError("Elegí una categoría.");
      return;
    }

    const body: AgregarCategoriaRequest = {
      categoriaId: Number(categoriaSeleccionada),
      descripcion: descripcion || undefined,
      precioReferencia: precio ? Number(precio) : undefined,
    };

    try {
      await apiFetch<PrestadorCategoria>("/api/prestador/categorias", {
        method: "POST",
        body: JSON.stringify(body),
      });
      setCategoriaSeleccionada("");
      setDescripcion("");
      setPrecio("");
      await cargarDatos();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error al agregar la categoría");
    }
  }

  async function handleQuitar(id: number) {
    try {
      await apiFetch(`/api/prestador/categorias/${id}`, { method: "DELETE" });
      await cargarDatos();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error al quitar la categoría");
    }
  }

  // Solo mostramos en el selector las categorías que todavía NO agregó
  const categoriasParaAgregar = categoriasDisponibles.filter(
    (c) => !misCategorias.some((mc) => mc.categoriaId === c.id)
  );

  if (cargando) return <p className="p-6">Cargando...</p>;

  return (
    <div className="max-w-lg mx-auto mt-16 p-6">
      <h1 className="text-2xl font-bold mb-6">Mis servicios</h1>

      <form onSubmit={handleAgregar} className="flex flex-col gap-3 border rounded p-4 mb-8">
        <h2 className="font-semibold">Agregar un servicio</h2>

        <select
          className="border rounded p-2"
          value={categoriaSeleccionada}
          onChange={(e) => setCategoriaSeleccionada(e.target.value ? Number(e.target.value) : "")}
        >
          <option value="">Elegí una categoría</option>
          {categoriasParaAgregar.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre}
            </option>
          ))}
        </select>

        <textarea
          placeholder="Descripción (ej: 10 años de experiencia, atiendo urgencias)"
          className="border rounded p-2"
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
        />

        <input
          type="number"
          placeholder="Precio de referencia (opcional)"
          className="border rounded p-2"
          value={precio}
          onChange={(e) => setPrecio(e.target.value)}
        />

        {error && <p className="text-red-600 text-sm">{error}</p>}

        <button type="submit" className="bg-black text-white rounded p-2">
          Agregar
        </button>
      </form>

      <h2 className="font-semibold mb-3">Servicios que ofrecés</h2>
      {misCategorias.length === 0 && (
        <p className="text-gray-500 text-sm">Todavía no agregaste ningún servicio.</p>
      )}
      <ul className="flex flex-col gap-3">
        {misCategorias.map((mc) => (
          <li key={mc.id} className="border rounded p-3 flex justify-between items-start">
            <div>
              <p className="font-medium">{mc.categoriaNombre}</p>
              {mc.descripcion && <p className="text-sm text-gray-600">{mc.descripcion}</p>}
              {mc.precioReferencia && (
                <p className="text-sm text-gray-600">Desde ${mc.precioReferencia}</p>
              )}
            </div>
            <button
              onClick={() => handleQuitar(mc.id)}
              className="text-red-600 text-sm"
            >
              Quitar
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}