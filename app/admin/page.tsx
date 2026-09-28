"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api";
import { obtenerUsuario } from "@/lib/auth";
import { CategoriaAdmin, CrearCategoriaRequest, EditarCategoriaRequest, UsuarioAdmin } from "@/types/admin";
import { Orden } from "@/types/ordenes";
import { VerificacionAdmin, VerificacionCategoriaAdmin } from "@/types/verificacion";
import IconoLucide from "@/components/IconoLucide";
import SelectorIconoLucide from "@/components/SelectorIconoLucide";

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
  const [procesandoOrdenId, setProcesandoOrdenId] = useState<string | null>(null);
  const [verificaciones, setVerificaciones] = useState<VerificacionAdmin[]>([]);
  const [motivos, setMotivos] = useState<Record<string, string>>({});
  const [procesandoVerif, setProcesandoVerif] = useState<string | null>(null);

  // Matrícula por rubro (22/09) — cola separada de la de identidad de arriba, indexada por
  // PrestadorCategoriaId (número) en vez de UsuarioId.
  const [matriculas, setMatriculas] = useState<VerificacionCategoriaAdmin[]>([]);
  const [motivosMatricula, setMotivosMatricula] = useState<Record<number, string>>({});
  const [procesandoMatricula, setProcesandoMatricula] = useState<number | null>(null);
  const [nombreNueva, setNombreNueva] = useState("");
  const [iconoNuevo, setIconoNuevo] = useState("wrench");
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [nombreEditado, setNombreEditado] = useState("");
  const [iconoEditado, setIconoEditado] = useState("wrench");
  const [guardandoEdicion, setGuardandoEdicion] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [seccion, setSeccion] = useState<"categorias" | "usuarios" | "ordenes" | "verificaciones" | "matriculas">("categorias");

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
      const [cats, users, ords, verifs, matrs] = await Promise.all([
        apiFetch<CategoriaAdmin[]>("/api/admin/categorias"),
        apiFetch<UsuarioAdmin[]>("/api/admin/usuarios"),
        apiFetch<Orden[]>("/api/admin/ordenes"),
        apiFetch<VerificacionAdmin[]>("/api/admin/verificaciones"),
        apiFetch<VerificacionCategoriaAdmin[]>("/api/admin/matriculas"),
      ]);
      setCategorias(cats);
      setUsuarios(users);
      setOrdenes(ords);
      setVerificaciones(verifs);
      setMatriculas(matrs);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error al cargar los datos");
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

  async function handleMarcarPagada(ordenId: string) {
    try {
      await apiFetch(`/api/ordenes/${ordenId}/marcar-pagada`, { method: "PUT" });
      await cargarDatos();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error al marcar como pagada");
    }
  }

  // Modelo de retención (23/09) — antes estos dos endpoints ya existían en el backend
  // (PagoService.ReembolsarAsync / MarcarTransferidoAlPrestadorAsync) pero no tenían ninguna
  // pantalla desde donde dispararlos a mano; se agregan acá mismo, junto al resto de acciones
  // de "Órdenes", para poder probar de punta a punta el flujo de reembolso/transferencia.
  async function handleReembolsarOrden(ordenId: string) {
    const motivo = window.prompt("Motivo del reembolso (obligatorio):");
    if (!motivo || !motivo.trim()) return;
    setProcesandoOrdenId(ordenId);
    try {
      await apiFetch(`/api/ordenes/${ordenId}/reembolsar`, {
        method: "PUT",
        body: JSON.stringify({ motivo: motivo.trim() }),
      });
      await cargarDatos();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error al reembolsar la orden");
    } finally {
      setProcesandoOrdenId(null);
    }
  }

  async function handleMarcarTransferidoPrestador(ordenId: string) {
    if (!window.confirm("¿Confirmás que ya hiciste la transferencia real (CBU/alias) al prestador?")) return;
    setProcesandoOrdenId(ordenId);
    try {
      await apiFetch(`/api/ordenes/${ordenId}/marcar-transferido-prestador`, { method: "PUT" });
      await cargarDatos();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error al marcar la transferencia");
    } finally {
      setProcesandoOrdenId(null);
    }
  }

  // Inasistencia del cliente (28/09): resolver a favor del prestador libera el pago retenido sin
  // que el trabajo haya sucedido — no hay forma de verificar desde el sistema si el prestador
  // realmente fue o no al domicilio (ver claude/backlog.md), así que este es un juicio del Admin
  // caso por caso, no una decisión automática. El otro desenlace (a favor del cliente) es el
  // mismo botón "Reembolsar" de siempre, que ya funciona para una orden EnDisputa.
  async function handleResolverInasistenciaPrestador(ordenId: string) {
    if (
      !window.confirm(
        "¿Confirmás que le das la razón al prestador y liberás el pago retenido, sin poder verificar si realmente se presentó en el domicilio?"
      )
    )
      return;
    const notaAdmin = window.prompt("Nota interna sobre la resolución (opcional):") ?? undefined;
    setProcesandoOrdenId(ordenId);
    try {
      await apiFetch(`/api/ordenes/${ordenId}/resolver-inasistencia-pagar-prestador`, {
        method: "PUT",
        body: JSON.stringify({ notaAdmin: notaAdmin?.trim() || undefined }),
      });
      await cargarDatos();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error al resolver la disputa");
    } finally {
      setProcesandoOrdenId(null);
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

  // --- Matrícula por rubro (22/09) — mismo patrón que handleVerDocumento/handleRevisarVerificacion
  // de arriba, pero apuntando a los endpoints por PrestadorCategoriaId. ---

  async function handleVerDocumentoMatricula(prestadorCategoriaId: number) {
    try {
      const data = await apiFetch<{ url: string }>(`/api/admin/matriculas/${prestadorCategoriaId}/documento`);
      window.open(data.url, "_blank");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error al abrir el documento");
    }
  }

  async function handleRevisarMatricula(prestadorCategoriaId: number, aprobar: boolean) {
    const motivoRechazo = motivosMatricula[prestadorCategoriaId]?.trim();
    if (!aprobar && !motivoRechazo) {
      setError("Indicá un motivo de rechazo.");
      return;
    }

    setProcesandoMatricula(prestadorCategoriaId);
    try {
      await apiFetch(`/api/admin/matriculas/${prestadorCategoriaId}`, {
        method: "PUT",
        body: JSON.stringify({ aprobar, motivoRechazo: aprobar ? null : motivoRechazo }),
      });
      setMotivosMatricula((prev) => ({ ...prev, [prestadorCategoriaId]: "" }));
      await cargarDatos();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error al procesar la matrícula");
    } finally {
      setProcesandoMatricula(null);
    }
  }

  if (cargando) return <p className="p-6 text-ink/60">Cargando...</p>;

  const pendientesVerificacion = verificaciones.filter((v) => v.estado === "Pendiente").length;
  const pendientesMatricula = matriculas.filter((m) => m.estado === "Pendiente").length;

  const tabs: { id: typeof seccion; label: string }[] = [
    { id: "categorias", label: "Categorías" },
    { id: "usuarios", label: "Usuarios" },
    { id: "ordenes", label: "Órdenes" },
    { id: "verificaciones", label: pendientesVerificacion > 0 ? `Identidad (${pendientesVerificacion})` : "Identidad" },
    { id: "matriculas", label: pendientesMatricula > 0 ? `Matrículas (${pendientesMatricula})` : "Matrículas" },
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
          <form onSubmit={handleCrearCategoria} className="bg-surface border border-ink/10 rounded-lg p-4 mb-6 flex flex-col gap-3">
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

          <ul className="flex flex-col gap-2">
            {categorias.map((c) => {
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
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
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
            <li key={o.id} className="bg-surface border border-ink/10 rounded-lg p-3 flex flex-col gap-2">
              <div className="flex justify-between items-center gap-2">
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
              </div>

              {/* Inasistencia del cliente (28/09): el prestador reportó que llegó al domicilio y el
                  cliente no estaba. No se le pagó ni se le reembolsó nada automáticamente — el Admin
                  tiene que elegir a mano a quién le da la razón (ver comentario en
                  handleResolverInasistenciaPrestador sobre por qué no se puede verificar esto). */}
              {o.estado === "EnDisputa" && o.inasistenciaClienteReportadaEn && !o.inasistenciaResueltaEn && (
                <div className="border-t border-safety/30 bg-safety/5 -mx-3 -mb-3 px-3 py-2 rounded-b-lg flex flex-col gap-2">
                  <p className="text-xs text-ink/70">
                    <span className="font-medium text-safety">Disputa por inasistencia del cliente</span> — reportada el{" "}
                    {new Date(o.inasistenciaClienteReportadaEn).toLocaleString("es-AR")}.
                    {o.inasistenciaClienteComentario && <> Comentario del prestador: “{o.inasistenciaClienteComentario}”.</>}
                  </p>
                  <p className="text-xs text-ink/50">
                    No hay forma de verificar desde el sistema si el prestador realmente se presentó o no — elegí a quién
                    le das la razón según lo que puedas averiguar por fuera (chat, llamada, etc.).
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleResolverInasistenciaPrestador(o.id)}
                      disabled={procesandoOrdenId === o.id}
                      className="text-xs bg-stamp text-paper rounded px-2 py-1 hover:opacity-90 transition-colors disabled:opacity-50"
                    >
                      Dar la razón al prestador (pagarle)
                    </button>
                    {o.pagoEstado === "Retenido" && (
                      <button
                        onClick={() => handleReembolsarOrden(o.id)}
                        disabled={procesandoOrdenId === o.id}
                        className="text-xs border border-red-700/40 text-red-700 dark:text-red-400 rounded px-2 py-1 hover:bg-red-700/10 transition-colors disabled:opacity-50"
                      >
                        Dar la razón al cliente (reembolsar)
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Modelo de retención (23/09): estado del pago retenido/liberado/reembolsado, cuánto
                  le corresponde al prestador, y las dos acciones manuales de Admin que antes no
                  tenían pantalla — reembolsar y marcar transferido. */}
              {o.pagoEstado && (
                <div className="border-t border-ink/10 pt-2 flex justify-between items-center gap-2 flex-wrap">
                  <div className="text-xs text-ink/60">
                    <p>
                      Pago: <span className="font-mono uppercase">{o.pagoEstado}</span>
                      {o.pagoEstado !== "Reembolsado" && (
                        <> · A transferir al prestador: <span className="font-mono">${o.montoATransferirPrestador?.toLocaleString("es-AR")}</span></>
                      )}
                    </p>
                    {o.transferenciaPrestadorConfirmadaEn && (
                      <p className="text-stamp">
                        Transferido el {new Date(o.transferenciaPrestadorConfirmadaEn).toLocaleString("es-AR")}
                      </p>
                    )}
                    {o.motivoReembolso && <p>Motivo del reembolso: {o.motivoReembolso}</p>}
                  </div>

                  <div className="flex gap-2">
                    {o.pagoEstado === "Retenido" && (
                      <button
                        onClick={() => handleReembolsarOrden(o.id)}
                        disabled={procesandoOrdenId === o.id}
                        className="text-xs border border-red-700/40 text-red-700 dark:text-red-400 rounded px-2 py-1 hover:bg-red-700/10 transition-colors disabled:opacity-50"
                      >
                        Reembolsar
                      </button>
                    )}
                    {o.pagoEstado === "Liberado" && !o.transferenciaPrestadorConfirmadaEn && (
                      <button
                        onClick={() => handleMarcarTransferidoPrestador(o.id)}
                        disabled={procesandoOrdenId === o.id}
                        className="text-xs bg-stamp text-paper rounded px-2 py-1 hover:opacity-90 transition-colors disabled:opacity-50"
                      >
                        Marcar transferido
                      </button>
                    )}
                  </div>
                </div>
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

      {seccion === "matriculas" && (
        <ul className="flex flex-col gap-3">
          {matriculas.length === 0 && (
            <p className="text-ink/50 text-sm">No hay matrículas enviadas todavía.</p>
          )}
          {matriculas.map((m) => (
            <li key={m.prestadorCategoriaId} className="bg-surface border border-ink/10 rounded-lg p-4">
              <div className="flex justify-between items-start gap-2 mb-3">
                <div>
                  <p className="font-medium text-ink">
                    {m.nombreCompleto} <span className="text-ink/50 font-normal">· {m.categoriaNombre}</span>
                  </p>
                  <p className="text-xs text-ink/50">{m.email}</p>
                </div>
                <span
                  className={`text-xs font-mono uppercase rounded-full px-2 py-0.5 shrink-0 ${
                    m.estado === "Pendiente"
                      ? "bg-safety/20 text-ink"
                      : m.estado === "Aprobado"
                      ? "bg-stamp/15 text-stamp"
                      : "bg-red-700/10 dark:bg-red-400/10 text-red-700 dark:text-red-400"
                  }`}
                >
                  {m.estado}
                </span>
              </div>

              <div className="flex gap-2 mb-3 flex-wrap">
                <button
                  onClick={() => handleVerDocumentoMatricula(m.prestadorCategoriaId)}
                  className="text-xs text-copper hover:underline border border-copper/30 rounded px-2 py-1"
                >
                  Ver matrícula
                </button>
              </div>

              {m.estado === "Pendiente" && (
                <div className="flex gap-2 items-center flex-wrap pt-3 border-t border-ink/10">
                  <input
                    type="text"
                    placeholder="Motivo si vas a rechazar"
                    className="border border-ink/20 rounded p-1.5 text-sm flex-1 min-w-[180px] bg-paper"
                    value={motivosMatricula[m.prestadorCategoriaId] ?? ""}
                    onChange={(e) =>
                      setMotivosMatricula((prev) => ({ ...prev, [m.prestadorCategoriaId]: e.target.value }))
                    }
                  />
                  <button
                    onClick={() => handleRevisarMatricula(m.prestadorCategoriaId, true)}
                    disabled={procesandoMatricula === m.prestadorCategoriaId}
                    className="text-sm bg-stamp text-paper rounded px-3 py-1.5 hover:brightness-95 transition-all disabled:opacity-40"
                  >
                    Aprobar
                  </button>
                  <button
                    onClick={() => handleRevisarMatricula(m.prestadorCategoriaId, false)}
                    disabled={procesandoMatricula === m.prestadorCategoriaId}
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
