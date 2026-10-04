"use client";

import { useEffect, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import { CategoriaAdmin, CrearCategoriaRequest, EditarCategoriaRequest } from "@/types/admin";
import IconoLucide from "@/components/IconoLucide";
import SelectorIconoLucide from "@/components/SelectorIconoLucide";

export default function AdminCategoriasPage() {
  const [categorias, setCategorias] = useState<CategoriaAdmin[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [nombreNueva, setNombreNueva] = useState("");
  const [iconoNuevo, setIconoNuevo] = useState("wrench");
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [nombreEditado, setNombreEditado] = useState("");
  const [iconoEditado, setIconoEditado] = useState("wrench");
  const [guardandoEdicion, setGuardandoEdicion] = useState(false);
  const [borrandoId, setBorrandoId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    cargarDatos();
  }, []);

  async function cargarDatos() {
    try {
      const cats = await apiFetch<CategoriaAdmin[]>("/api/admin/categorias");
      setCategorias(cats);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error al cargar las categorías");
    } finally {
      setCargando(false);
    }
  }

  async function handleCrearCategoria(e: React.FormEvent) {
    e.preventDefault();
    if (!nombreNueva.trim()) return;

    const body: CrearCategoriaRequest = { nombre: nombreNueva, icono: iconoNuevo };

    try {
      await apiFetch<CategoriaAdmin>("/api/admin/categorias", {
        method: "POST",
        body: JSON.stringify(body),
      });
      setNombreNueva("");
      setIconoNuevo("wrench");
      setError(null);
      await cargarDatos();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error al crear la categoría");
    }
  }

  function iniciarEdicion(categoria: CategoriaAdmin) {
    setEditandoId(categoria.id);
    setNombreEditado(categoria.nombre);
    setIconoEditado(categoria.icono ?? "wrench");
    setError(null);
  }

  function cancelarEdicion() {
    setEditandoId(null);
  }

  async function handleGuardarEdicion(id: number) {
    if (!nombreEditado.trim()) {
      setError("El nombre no puede quedar vacío.");
      return;
    }

    const body: EditarCategoriaRequest = { nombre: nombreEditado, icono: iconoEditado };

    setGuardandoEdicion(true);
    try {
      await apiFetch<CategoriaAdmin>(`/api/admin/categorias/${id}`, {
        method: "PUT",
        body: JSON.stringify(body),
      });
      setEditandoId(null);
      await cargarDatos();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error al editar la categoría");
    } finally {
      setGuardandoEdicion(false);
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

  // Borrado real (04/10) — distinto de Activar/Desactivar de arriba, que solo oculta el rubro de
  // las búsquedas. El backend rechaza el borrado si hay prestadores que lo ofrecen o si hay
  // órdenes históricas con ese rubro (ver AdminService.EliminarCategoriaAsync) — en ese caso el
  // mensaje de error del backend ya explica que hay que desactivarlo en vez de borrarlo.
  async function handleBorrarCategoria(categoria: CategoriaAdmin) {
    if (!window.confirm(`¿Borrar el rubro "${categoria.nombre}"? Esta acción no se puede deshacer.`)) return;
    setBorrandoId(categoria.id);
    try {
      await apiFetch(`/api/admin/categorias/${categoria.id}`, { method: "DELETE" });
      setError(null);
      await cargarDatos();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error al borrar la categoría");
    } finally {
      setBorrandoId(null);
    }
  }

  if (cargando) return <p className="text-ink/60">Cargando...</p>;

  const categoriasFiltradas = categorias.filter((c) =>
    c.nombre.toLowerCase().includes(busqueda.trim().toLowerCase())
  );

  return (
    <>
      {error && <p className="text-red-700 dark:text-red-400 text-sm mb-4">{error}</p>}

      <form onSubmit={handleCrearCategoria} className="bg-surface border border-ink/10 rounded-lg p-4 mb-4 flex flex-col gap-3">
        <input
          type="text"
          placeholder="Nombre de la categoría nueva"
          className="border border-ink/20 rounded p-2 bg-paper"
          value={nombreNueva}
          onChange={(e) => setNombreNueva(e.target.value)}
        />

        <div>
          <p className="text-xs text-ink/50 mb-2">Ícono</p>
          <SelectorIconoLucide valor={iconoNuevo} onChange={setIconoNuevo} />
        </div>

        <button
          type="submit"
          className="bg-copper text-paper rounded px-4 py-2 self-start hover:bg-copper-dark transition-colors"
        >
          Crear
        </button>
      </form>

      <input
        type="text"
        placeholder="Buscar rubro..."
        className="border border-ink/20 rounded p-2 bg-paper w-full max-w-xs mb-4 text-sm"
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
      />

      <ul className="flex flex-col gap-2">
        {categoriasFiltradas.length === 0 && (
          <p className="text-ink/50 text-sm">No hay rubros que coincidan con esa búsqueda.</p>
        )}
        {categoriasFiltradas.map((c) => {
          const enEdicion = editandoId === c.id;
          return (
            <li key={c.id} className="bg-surface border border-ink/10 rounded-lg p-3">
              {enEdicion ? (
                <div className="flex flex-col gap-3">
                  <input
                    type="text"
                    className="border border-ink/20 rounded p-2 bg-paper text-sm"
                    value={nombreEditado}
                    onChange={(e) => setNombreEditado(e.target.value)}
                  />
                  <SelectorIconoLucide valor={iconoEditado} onChange={setIconoEditado} />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleGuardarEdicion(c.id)}
                      disabled={guardandoEdicion}
                      className="text-sm bg-copper text-paper rounded px-3 py-1.5 hover:bg-copper-dark transition-colors disabled:opacity-40"
                    >
                      {guardandoEdicion ? "Guardando..." : "Guardar"}
                    </button>
                    <button
                      onClick={cancelarEdicion}
                      disabled={guardandoEdicion}
                      className="text-sm border border-ink/20 text-ink/60 rounded px-3 py-1.5 hover:text-ink transition-colors disabled:opacity-40"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex justify-between items-center">
                  <span className={`flex items-center gap-2.5 ${c.activa ? "text-ink" : "text-ink/30 line-through"}`}>
                    <IconoLucide nombre={c.icono} size={17} className={c.activa ? "text-copper" : "text-ink/30"} />
                    {c.nombre}
                  </span>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => iniciarEdicion(c)}
                      className="text-sm rounded px-3 py-1 border border-ink/20 text-ink/60 hover:text-ink hover:border-ink/40 transition-colors"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleCambiarEstado(c)}
                      className={`text-sm rounded px-3 py-1 border ${
                        c.activa ? "border-stamp text-stamp" : "border-ink/20 text-ink/50"
                      }`}
                    >
                      {c.activa ? "Desactivar" : "Activar"}
                    </button>
                    <button
                      onClick={() => handleBorrarCategoria(c)}
                      disabled={borrandoId === c.id}
                      className="text-sm rounded px-3 py-1 border border-red-700/40 text-red-700 dark:text-red-400 hover:bg-red-700/10 transition-colors disabled:opacity-40"
                    >
                      {borrandoId === c.id ? "Borrando..." : "Borrar"}
                    </button>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </>
  );
}
