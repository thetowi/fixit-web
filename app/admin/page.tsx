"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api";
import { obtenerUsuario } from "@/lib/auth";
import { CategoriaAdmin, CrearCategoriaRequest, UsuarioAdmin } from "@/types/admin";
import { Orden } from "@/types/ordenes";
import { VerificacionAdmin } from "@/types/verificacion";

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
  const [verificaciones, setVerificaciones] = useState<VerificacionAdmin[]>([]);
  const [motivos, setMotivos] = useState<Record<string, string>>({});
  const [procesandoVerif, setProcesandoVerif] = useState<string | null>(null);
  const [nombreNueva, setNombreNueva] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [seccion, setSeccion] = useState<"categorias" | "usuarios" | "ordenes" | "verificaciones">("categorias");

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
      const [cats, users, ords, verifs] = await Promise.all([
        apiFetch<CategoriaAdmin[]>("/api/admin/categorias"),
        apiFetch<UsuarioAdmin[]>("/api/admin/usuarios"),
        apiFetch<Orden[]>("/api/admin/ordenes"),
        apiFetch<VerificacionAdmin[]>("/api/admin/verificaciones"),
      ]);
      setCategorias(cats);
      setUsuarios(users);
      setOrdenes(ords);
      setVerificaciones(verifs);
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

  async function handleVerDocumento(usuarioId: string, documento: string) {
    try {
      const data = await apiFetch<{ url: string }>(`/api/admin/verificaciones/${usuarioId}/documento/${documento}`);
      window.open(data.url, "_blank");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error al abrir el documento");
    }
  }

  async function handleRevisarVerificacion(usuarioId: string, aprobar: boolean) {
    const motivoRechazo = motivos[usuarioId]?.trim();
    if (!aprobar && !motivoRechazo) {
      setError("Indicá un motivo de rechazo.");
      return;
    }

    setProcesandoVerif(usuarioId);
    try {
      await apiFetch(`/api/admin/verificaciones/${usuarioId}`, {
        method: "PUT",
        body: JSON.stringify({ aprobar, motivoRechazo: aprobar ? null : motivoRechazo }),
      });
      setMotivos((prev) => ({ ...prev, [usuarioId]: "" }));
      await cargarDatos();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error al procesar la verificación");
    } finally {
      setProcesandoVerif(null);
    }
  }

  if (cargando) return <p className="p-6 text-ink/60">Cargando...</p>;

  const pendientesVerificacion = verificaciones.filter((v) => v.estado === "Pendiente").length;

  const tabs: { id: typeof seccion; label: string }[] = [
    { id: "categorias", label: "Categorías" },
    { id: "usuarios", label: "Usuarios" },
    { id: "ordenes", label: "Órdenes" },
    { id: "verificaciones", label: pendientesVerificacion > 0 ? `Verificaciones (${pendientesVerificacion})` : "Verificaciones" },
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
              seccion === tab.id ? "bg-surface text-ink shadow-sm" : "text-ink/50 hover:text-ink"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {error && <p className="text-red-700 dark:text-red-400 text-sm mb-4">{error}</p>}

      {seccion === "categorias" && (
        <>
          <form onSubmit={handleCrearCategoria} className="flex gap-2 mb-6">
            <input
              type="text"
              placeholder="Nombre de la categoría nueva"
              className="border border-ink/20 rounded p-2 flex-1 bg-surface"
              value={nombreNueva}
              onChange={(e) => setNombreNueva(e.target.value)}
            />
            <button type="submit" className="bg-copper text-paper rounded px-4 hover:bg-copper-dark transition-colors">
              Crear
            </button>
          </form>

          <ul className="flex flex-col gap-2">
            {categorias.map((c) => (
              <li key={c.id} className="bg-surface border border-ink/10 rounded-lg p-3 flex justify-between items-center">
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
        <div className="bg-surface border border-ink/10 rounded-lg overflow-hidden">
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
            <li key={o.id} className="bg-surface border border-ink/10 rounded-lg p-3 flex justify-between items-center">
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

      {seccion === "verificaciones" && (
        <ul className="flex flex-col gap-3">
          {verificaciones.length === 0 && (
            <p className="text-ink/50 text-sm">No hay verificaciones enviadas todavía.</p>
          )}
          {verificaciones.map((v) => (
            <li key={v.usuarioId} className="bg-surface border border-ink/10 rounded-lg p-4">
              <div className="flex justify-between items-start gap-2 mb-3">
                <div>
                  <p className="font-medium text-ink">{v.nombreCompleto}</p>
                  <p className="text-xs text-ink/50">
                    {v.email}
                    {v.dniNumero ? ` · DNI ${v.dniNumero}` : ""}
                  </p>
                </div>
                <span
                  className={`text-xs font-mono uppercase rounded-full px-2 py-0.5 shrink-0 ${
                    v.estado === "Pendiente"
                      ? "bg-safety/20 text-ink"
                      : v.estado === "Aprobado"
                      ? "bg-stamp/15 text-stamp"
                      : "bg-red-700/10 dark:bg-red-400/10 text-red-700 dark:text-red-400"
                  }`}
                >
                  {v.estado}
                </span>
              </div>

              <div className="flex gap-2 mb-3 flex-wrap">
                <button
                  onClick={() => handleVerDocumento(v.usuarioId, "dni")}
                  className="text-xs text-copper hover:underline border border-copper/30 rounded px-2 py-1"
                >
                  Ver DNI
                </button>
                <button
                  onClick={() => handleVerDocumento(v.usuarioId, "antecedentes")}
                  className="text-xs text-copper hover:underline border border-copper/30 rounded px-2 py-1"
                >
                  Ver antecedentes
                </button>
                <button
                  onClick={() => handleVerDocumento(v.usuarioId, "matricula")}
                  className="text-xs text-copper hover:underline border border-copper/30 rounded px-2 py-1"
                >
                  Ver matrícula
                </button>
              </div>

              {v.estado === "Pendiente" && (
                <div className="flex gap-2 items-center flex-wrap pt-3 border-t border-ink/10">
                  <input
                    type="text"
                    placeholder="Motivo si vas a rechazar"
                    className="border border-ink/20 rounded p-1.5 text-sm flex-1 min-w-[180px] bg-paper"
                    value={motivos[v.usuarioId] ?? ""}
                    onChange={(e) => setMotivos((prev) => ({ ...prev, [v.usuarioId]: e.target.value }))}
                  />
                  <button
                    onClick={() => handleRevisarVerificacion(v.usuarioId, true)}
                    disabled={procesandoVerif === v.usuarioId}
                    className="text-sm bg-stamp text-paper rounded px-3 py-1.5 hover:brightness-95 transition-all disabled:opacity-40"
                  >
                    Aprobar
                  </button>
                  <button
                    onClick={() => handleRevisarVerificacion(v.usuarioId, false)}
                    disabled={procesandoVerif === v.usuarioId}
                    className="text-sm border border-red-700/40 dark:border-red-400/40 text-red-700 dark:text-red-400 rounded px-3 py-1.5 hover:bg-red-700/5 dark:hover:bg-red-400/5 transition-colors disabled:opacity-40"
                  >
                    Rechazar
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
