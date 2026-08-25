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

  const categoriasParaAgregar = categoriasDisponibles.filter(
    (c) => !misCategorias.some((mc) => mc.categoriaId === c.id)
  );

  if (cargando) return <p className="p-6 text-ink/60">Cargando...</p>;

  return (
    <div className="max-w-lg mx-auto mt-16 p-6 w-full">
      <p className="font-mono text-xs tracking-widest text-copper uppercase mb-2">Prestador</p>
      <h1 className="font-display text-2xl text-ink mb-6">Mis servicios</h1>

      <form onSubmit={handleAgregar} className="flex flex-col gap-3 bg-white border border-ink/10 rounded-lg p-4 mb-8">
        <p className="text-sm font-medium text-ink">Agregar un servicio</p>

        <select
          className="border border-ink/20 rounded p-2 bg-paper"
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
          className="border border-ink/20 rounded p-2 bg-paper"
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
        />

        <input
          type="number"
          placeholder="Precio de referencia (opcional)"
          className="border border-ink/20 rounded p-2 bg-paper"
          value={precio}
          onChange={(e) => setPrecio(e.target.value)}
        />

        {error && <p className="text-red-700 text-sm">{error}</p>}

        <button type="submit" className="bg-copper text-paper rounded p-2 font-medium hover:bg-copper-dark transition-colors">
          Agregar
        </button>
      </form>

      <p className="font-mono text-xs tracking-widest text-copper uppercase mb-3">Servicios que ofrecés</p>
      {misCategorias.length === 0 && (
        <p className="text-ink/50 text-sm">Todavía no agregaste ningún servicio.</p>
      )}
      <ul className="flex flex-col gap-3">
        {misCategorias.map((mc) => (
          <li key={mc.id} className="bg-white border border-ink/10 rounded-lg p-3 flex justify-between items-start">
            <div>
              <p className="font-medium text-ink">{mc.categoriaNombre}</p>
              {mc.descripcion && <p className="text-sm text-ink/60">{mc.descripcion}</p>}
              {mc.precioReferencia && (
                <p className="font-mono text-sm text-ink/70 mt-1">
                  Desde ${mc.precioReferencia.toLocaleString("es-AR")}
                </p>
              )}
            </div>
            <button
              onClick={() => handleQuitar(mc.id)}
              className="text-sm text-red-700/70 hover:text-red-700 transition-colors"
            >
              Quitar
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}