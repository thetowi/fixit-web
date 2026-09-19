"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api";
import { obtenerUsuario } from "@/lib/auth";
import { Orden } from "@/types/ordenes";
import { CrearCalificacionRequest, CRITERIOS_CALIFICACION } from "@/types/calificaciones";
import OrdenTicket, { ESTADO_LABELS } from "@/components/OrdenTicket";
import SelectorEstrellas from "@/components/SelectorEstrellas";

// Orden fijo (sigue el flujo real de una orden) para que el filtro de estado no salte de forma
// arbitraria según qué estados haya en los datos.
const ORDEN_ESTADOS = ["PendientePago", "Pagado", "EnCurso", "Completado", "Cancelado", "EnDisputa"];

const CALIFICACION_INICIAL: Omit<CrearCalificacionRequest, "comentario"> = {
  puntualidad: 0,
  calidad: 0,
  precio: 0,
  comunicacion: 0,
  limpieza: 0,
  garantia: 0,
};

function claveMes(fechaISO: string): string {
  const fecha = new Date(fechaISO);
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}`;
}

function etiquetaMes(clave: string): string {
  const [anio, mes] = clave.split("-").map(Number);
  const texto = new Date(anio, mes - 1, 1).toLocaleDateString("es-AR", { month: "long", year: "numeric" });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

export default function OrdenesPage() {
  return (
    <Suspense fallback={<p className="p-6 text-ink/60">Cargando...</p>}>
      <OrdenesContenido />
    </Suspense>
  );
}

function OrdenesContenido() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const ordenCreadaId = searchParams.get("creada");
  const estadoPago = searchParams.get("pago"); // "exitoso" | "fallido" | "pendiente", tras volver de Mercado Pago

  const [ordenes, setOrdenes] = useState<Orden[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [ordenCalificando, setOrdenCalificando] = useState<string | null>(null);
  const [calificacionForm, setCalificacionForm] = useState(CALIFICACION_INICIAL);
  const [criterioExpandido, setCriterioExpandido] = useState<string | null>(null);
  const [comentario, setComentario] = useState("");
  const [filtroMes, setFiltroMes] = useState("todos");
  const [filtroEstado, setFiltroEstado] = useState("todos");

  const popoverRef = useRef<HTMLDivElement>(null);

  const usuario = obtenerUsuario();

  useEffect(() => {
    if (!usuario) {
      router.push("/login");
      return;
    }
    cargarOrdenes();
  }, [router]);

  useEffect(() => {
    // El webhook de Mercado Pago puede tardar unos segundos en confirmar el pago y actualizar
    // la orden acá. Si venimos de un pago exitoso o pendiente, reintentamos una vez más al ratito
    // para no dejar al usuario mirando "Pendiente de pago" innecesariamente.
    if (estadoPago === "exitoso" || estadoPago === "pendiente") {
      const timeoutId = setTimeout(() => cargarOrdenes(), 4000);
      return () => clearTimeout(timeoutId);
    }
  }, [estadoPago]);

  useEffect(() => {
    if (!criterioExpandido) return;

    function handleClickFuera(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setCriterioExpandido(null);
      }
    }

    document.addEventListener("mousedown", handleClickFuera);
    return () => document.removeEventListener("mousedown", handleClickFuera);
  }, [criterioExpandido]);

  async function cargarOrdenes() {
    try {
      const data = await apiFetch<Orden[]>("/api/ordenes/mias");
      setOrdenes(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error al cargar tus órdenes");
    } finally {
      setCargando(false);
    }
  }

  async function handleAccion(ordenId: string, accion: "iniciar" | "completar") {
    setError(null);
    try {
      await apiFetch(`/api/ordenes/${ordenId}/${accion}`, { method: "PUT" });
      await cargarOrdenes();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error al actualizar la orden");
    }
  }

  async function handleEnviarCalificacion(e: React.FormEvent) {
    e.preventDefault();
    if (!ordenCalificando) return;

    const faltantes = CRITERIOS_CALIFICACION.filter((c) => calificacionForm[c.key] === 0);
    if (faltantes.length > 0) {
      setError(`Te falta calificar: ${faltantes.map((c) => c.label).join(", ")}.`);
      return;
    }

    const body: CrearCalificacionRequest = { ...calificacionForm, comentario: comentario || undefined };

    try {
      await apiFetch(`/api/ordenes/${ordenCalificando}/calificacion`, {
        method: "POST",
        body: JSON.stringify(body),
      });
      setOrdenCalificando(null);
      setCalificacionForm(CALIFICACION_INICIAL);
      setComentario("");
      await cargarOrdenes();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error al enviar la calificación");
    }
  }

  if (cargando) return <p className="p-6 text-ink/60">Cargando...</p>;

  const esCliente = usuario?.rol === "Cliente";

  const mesesDisponibles = Array.from(new Set(ordenes.map((o) => claveMes(o.creadoEn)))).sort().reverse();
  const estadosDisponibles = ORDEN_ESTADOS.filter((e) => ordenes.some((o) => o.estado === e));
  const ordenesFiltradas = ordenes
    .filter((o) => filtroMes === "todos" || claveMes(o.creadoEn) === filtroMes)
    .filter((o) => filtroEstado === "todos" || o.estado === filtroEstado);
  const hayFiltrosActivos = filtroMes !== "todos" || filtroEstado !== "todos";

  return (
    <div className="max-w-lg mx-auto mt-16 p-6 w-full">
      <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
        <h1 className="font-display text-2xl text-ink">Mis órdenes</h1>

        <div className="flex items-center gap-2 flex-wrap">
          {estadosDisponibles.length > 0 && (
            <select
              className="border border-ink/20 rounded p-2 bg-surface text-sm"
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
            >
              <option value="todos">Todos los estados</option>
              {estadosDisponibles.map((estado) => (
                <option key={estado} value={estado}>
                  {ESTADO_LABELS[estado] ?? estado}
                </option>
              ))}
            </select>
          )}

          {mesesDisponibles.length > 0 && (
            <select
              className="border border-ink/20 rounded p-2 bg-surface text-sm"
              value={filtroMes}
              onChange={(e) => setFiltroMes(e.target.value)}
            >
              <option value="todos">Todos los meses</option>
              {mesesDisponibles.map((clave) => (
                <option key={clave} value={clave}>
                  {etiquetaMes(clave)}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {ordenCreadaId && (
        <p className="bg-stamp/10 text-stamp text-sm rounded p-3 mb-4 border border-stamp/30">
          Tu solicitud fue creada. Un administrador debe confirmar el pago antes de continuar.
        </p>
      )}

      {estadoPago === "exitoso" && (
        <p className="bg-stamp/10 text-stamp text-sm rounded p-3 mb-4 border border-stamp/30">
          ¡Pago recibido! Puede tardar unos segundos en reflejarse acá abajo.
        </p>
      )}

      {estadoPago === "pendiente" && (
        <p className="bg-safety/10 text-safety text-sm rounded p-3 mb-4 border border-safety/30">
          Tu pago quedó pendiente de aprobación en Mercado Pago. Te va a figurar acá apenas se confirme.
        </p>
      )}

      {estadoPago === "fallido" && (
        <p className="bg-red-700/10 text-red-700 dark:text-red-400 text-sm rounded p-3 mb-4 border border-red-700/30">
          El pago no se pudo completar. Volvé al chat y probá pagar de nuevo la oferta.
        </p>
      )}

      {error && <p className="text-red-700 dark:text-red-400 text-sm mb-4">{error}</p>}

      {ordenes.length === 0 && !error && (
        <p className="text-ink/50 text-sm">Todavía no tenés órdenes.</p>
      )}

      {ordenes.length > 0 && ordenesFiltradas.length === 0 && (
        <p className="text-ink/50 text-sm">
          {hayFiltrosActivos ? "No tenés órdenes con ese filtro." : "No tenés órdenes."}
        </p>
      )}

      <ul className="flex flex-col gap-4">
        {ordenesFiltradas.map((o) => {
          const esPrestador = usuario?.rol === "Prestador";
          const nombreContraparte = esCliente ? o.prestadorNombreCompleto : o.clienteNombreCompleto;

          return (
            <li key={o.id}>
              <OrdenTicket orden={o} nombreContraparte={nombreContraparte}>
                <div className="flex items-center gap-3 flex-wrap">
                  {esPrestador && o.estado === "Pagado" && (
                    <button
                      onClick={() => handleAccion(o.id, "iniciar")}
                      className="text-sm bg-ink text-paper rounded px-3 py-1 hover:bg-ink/80 transition-colors"
                    >
                      Iniciar trabajo
                    </button>
                  )}

                  {esCliente && o.estado === "EnCurso" && (
                    <button
                      onClick={() => handleAccion(o.id, "completar")}
                      className="text-sm bg-ink text-paper rounded px-3 py-1 hover:bg-ink/80 transition-colors"
                    >
                      Confirmar trabajo terminado
                    </button>
                  )}

                  {esCliente && o.estado === "Completado" && !o.yaCalificada && (
                    <button
                      onClick={() => {
                        setError(null);
                        setOrdenCalificando(o.id);
                      }}
                      className="text-sm border border-ink/30 text-ink rounded px-3 py-1 hover:border-ink transition-colors"
                    >
                      Calificar
                    </button>
                  )}

                  {o.yaCalificada && (
                    <span className="text-sm text-ink/40">Ya calificaste este trabajo</span>
                  )}
                </div>

                {ordenCalificando === o.id && (
                  <form onSubmit={handleEnviarCalificacion} className="mt-3 pt-3 border-t border-ink/10 flex flex-col gap-3">
                    <p className="text-xs text-ink/50">
                      Calificá cada aspecto del trabajo. Con esto armamos la calificación general del prestador.
                    </p>

                    {CRITERIOS_CALIFICACION.map((criterio) => (
                      <div key={criterio.key} className="flex items-center justify-between gap-2">
                        <span className="relative flex items-center gap-1">
                          <label className="text-sm text-ink/70">{criterio.label}</label>
                          <button
                            type="button"
                            onClick={() =>
                              setCriterioExpandido((prev) => (prev === criterio.key ? null : criterio.key))
                            }
                            className="text-ink/40 hover:text-ink/70 text-xs w-4 h-4 rounded-full border border-ink/30 flex items-center justify-center leading-none shrink-0"
                            aria-label={`Qué significa ${criterio.label}`}
                          >
                            i
                          </button>

                          {criterioExpandido === criterio.key && (
                            <div
                              ref={popoverRef}
                              className="absolute z-10 top-full left-0 mt-1 w-48 bg-ink text-paper text-xs rounded-md shadow-lg p-2.5 leading-snug"
                            >
                              {criterio.descripcion}
                            </div>
                          )}
                        </span>
                        <SelectorEstrellas
                          valor={calificacionForm[criterio.key]}
                          onChange={(valor) =>
                            setCalificacionForm((prev) => ({ ...prev, [criterio.key]: valor }))
                          }
                          tamaño="text-base"
                        />
                      </div>
                    ))}

                    <textarea
                      placeholder="Comentario (opcional)"
                      className="border border-ink/20 rounded p-2 bg-paper"
                      value={comentario}
                      onChange={(e) => setComentario(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setError(null);
                          setOrdenCalificando(null);
                          setCalificacionForm(CALIFICACION_INICIAL);
                        }}
                        className="border border-ink/20 rounded p-2 flex-1 text-sm"
                      >
                        Cancelar
                      </button>
                      <button type="submit" className="bg-copper text-paper rounded p-2 flex-1 text-sm">
                        Enviar calificación
                      </button>
                    </div>
                  </form>
                )}
              </OrdenTicket>
            </li>
          );
        })}
      </ul>
    </div>
  );
}