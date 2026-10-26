"use client";

// Panel de Admin > Cobros (26/10, nuevo sistema de cobros — ver claude/diseno-nuevo-sistema-cobros-26-10.md
// en el proyecto). Tres partes:
// - Resúmenes: lo que debe cada prestador por mes; marcar pagado a mano (transferencia/efectivo).
// - Fundadores: 2 cupos por rubro, 1 año sin cargo.
// - Tarifa: monto por trabajo y tope mensual, con fecha de vigencia (para ajustar por inflación).

import { useEffect, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import { nombrePeriodo, pesos } from "@/lib/cobros";
import {
  ESTADO_RESUMEN_COLOR,
  ESTADO_RESUMEN_LABEL,
  EstadoResumen,
  FundadoresRubro,
  ResumenMensual,
  SenalesFuga,
  TarifaVigente,
} from "@/types/cobros";

type Seccion = "resumenes" | "fundadores" | "tarifa" | "senales";
const ESTADOS: (EstadoResumen | "todos")[] = ["todos", "Pendiente", "Vencido", "Pagado", "Bonificado", "SinCargo"];

function fecha(iso: string): string {
  return new Date(iso).toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "numeric" });
}

export default function AdminCobrosPage() {
  const [seccion, setSeccion] = useState<Seccion>("resumenes");
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex gap-2 flex-wrap">
        {(
          [
            ["resumenes", "Resúmenes"],
            ["fundadores", "Fundadores"],
            ["tarifa", "Tarifa"],
            ["senales", "Señales de fuga"],
          ] as [Seccion, string][]
        ).map(([clave, label]) => (
          <button
            key={clave}
            onClick={() => {
              setError(null);
              setSeccion(clave);
            }}
            className={`text-sm rounded-full px-4 py-1.5 border transition-colors ${
              seccion === clave ? "bg-ink text-paper border-ink" : "border-ink/20 text-ink-muted hover:text-ink"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {error && <p className="text-red-700 dark:text-red-400 text-sm">{error}</p>}

      {seccion === "resumenes" && <Resumenes onError={setError} />}
      {seccion === "fundadores" && <Fundadores onError={setError} />}
      {seccion === "tarifa" && <Tarifa onError={setError} />}
      {seccion === "senales" && <Senales onError={setError} />}
    </div>
  );
}

function mensaje(err: unknown, porDefecto: string) {
  return err instanceof ApiError ? err.message : porDefecto;
}

// ---------------- Resúmenes ----------------

function Resumenes({ onError }: { onError: (e: string | null) => void }) {
  const [resumenes, setResumenes] = useState<ResumenMensual[]>([]);
  const [periodo, setPeriodo] = useState("");
  const [estado, setEstado] = useState<EstadoResumen | "todos">("todos");
  const [cargando, setCargando] = useState(true);
  const [procesandoId, setProcesandoId] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodo, estado]);

  async function cargar() {
    setCargando(true);
    try {
      const params = new URLSearchParams();
      if (periodo) params.set("periodo", periodo);
      if (estado !== "todos") params.set("estado", estado);
      setResumenes(await apiFetch<ResumenMensual[]>(`/api/admin/cobros/resumenes?${params.toString()}`));
    } catch (err) {
      onError(mensaje(err, "Error al cargar los resúmenes"));
    } finally {
      setCargando(false);
    }
  }

  async function marcarPagado(r: ResumenMensual) {
    const medio = window.prompt(
      `Marcar pagado el resumen de ${r.prestadorNombreCompleto} (${nombrePeriodo(r.periodo)}, ${pesos(r.total)}).\n\n¿Medio de pago? Escribí: Transferencia, Efectivo o MercadoPago`,
      "Transferencia"
    );
    if (medio === null) return;
    const nota = window.prompt("Nota (opcional), ej. número de operación:") ?? undefined;
    setProcesandoId(r.id);
    onError(null);
    try {
      await apiFetch(`/api/admin/cobros/resumenes/${r.id}/marcar-pagado`, {
        method: "PUT",
        body: JSON.stringify({ medioPago: medio.trim() || "Transferencia", nota: nota?.trim() || undefined }),
      });
      await cargar();
    } catch (err) {
      onError(mensaje(err, "No se pudo marcar como pagado"));
    } finally {
      setProcesandoId(null);
    }
  }

  async function generar() {
    const p = window.prompt("¿Qué período querés generar? (AAAA-MM). Vacío = el mes anterior.", "");
    if (p === null) return;
    onError(null);
    try {
      const qs = p.trim() ? `?periodo=${encodeURIComponent(p.trim())}` : "";
      const { generados } = await apiFetch<{ generados: number }>(`/api/admin/cobros/resumenes/generar${qs}`, {
        method: "POST",
      });
      setAviso(generados > 0 ? `Se generaron ${generados} resúmenes.` : "No había resúmenes nuevos para generar.");
      await cargar();
    } catch (err) {
      onError(mensaje(err, "No se pudieron generar los resúmenes"));
    }
  }

  const totalPendiente = resumenes
    .filter((r) => r.estado === "Pendiente" || r.estado === "Vencido")
    .reduce((s, r) => s + r.total, 0);
  const totalCobrado = resumenes.filter((r) => r.estado === "Pagado").reduce((s, r) => s + r.total, 0);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-3 flex-wrap items-center">
        <input
          type="month"
          value={periodo}
          onChange={(e) => setPeriodo(e.target.value)}
          className="border border-ink/20 rounded p-2 bg-paper text-sm"
        />
        <select
          value={estado}
          onChange={(e) => setEstado(e.target.value as EstadoResumen | "todos")}
          className="border border-ink/20 rounded p-2 bg-paper text-sm"
        >
          {ESTADOS.map((e) => (
            <option key={e} value={e}>
              {e === "todos" ? "Todos los estados" : ESTADO_RESUMEN_LABEL[e]}
            </option>
          ))}
        </select>
        <button
          onClick={generar}
          className="text-sm border border-ink/20 text-ink/70 rounded px-3 py-2 hover:text-ink hover:border-ink/40 transition-colors ml-auto"
        >
          Generar resúmenes
        </button>
      </div>

      {aviso && <p className="text-sm text-stamp">{aviso}</p>}

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-surface border border-ink/10 rounded-lg p-3">
          <p className="text-xs text-ink-muted">Por cobrar (pendiente + vencido)</p>
          <p className="font-display text-xl text-ink">{pesos(totalPendiente)}</p>
        </div>
        <div className="bg-surface border border-ink/10 rounded-lg p-3">
          <p className="text-xs text-ink-muted">Cobrado</p>
          <p className="font-display text-xl text-ink">{pesos(totalCobrado)}</p>
        </div>
      </div>

      {cargando ? (
        <p className="text-sm text-ink-muted">Cargando...</p>
      ) : resumenes.length === 0 ? (
        <p className="text-sm text-ink-muted">No hay resúmenes con ese filtro.</p>
      ) : (
        <div className="bg-surface border border-ink/10 rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left bg-ink/5 text-ink-muted text-xs uppercase tracking-wide">
                <th className="p-3 font-medium">Prestador</th>
                <th className="p-3 font-medium">Período</th>
                <th className="p-3 font-medium">Trabajos</th>
                <th className="p-3 font-medium">Total</th>
                <th className="p-3 font-medium">Estado</th>
                <th className="p-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {resumenes.map((r) => (
                <tr key={r.id} className="border-t border-ink/10 align-top">
                  <td className="p-3">
                    <p className="text-ink">{r.prestadorNombreCompleto}</p>
                    {r.prestadorTelefono && <p className="text-xs text-ink-muted">{r.prestadorTelefono}</p>}
                  </td>
                  <td className="p-3 capitalize">{nombrePeriodo(r.periodo)}</td>
                  <td className="p-3">
                    {r.cantidadTrabajos}
                    {r.trabajosBonificados > 0 && <span className="text-xs text-ink-muted"> ({r.trabajosBonificados} bonif.)</span>}
                  </td>
                  <td className="p-3 font-mono">{pesos(r.total)}</td>
                  <td className="p-3">
                    <span className={`inline-block border rounded px-1.5 text-[10px] font-display tracking-wide ${ESTADO_RESUMEN_COLOR[r.estado]}`}>
                      {ESTADO_RESUMEN_LABEL[r.estado].toUpperCase()}
                    </span>
                    <p className="text-xs text-ink-muted mt-1">
                      {r.pagadoEn ? `Pagado el ${fecha(r.pagadoEn)}${r.medioPago ? ` · ${r.medioPago}` : ""}` : `Vence ${fecha(r.venceEn)}`}
                    </p>
                    {r.notaAdmin && <p className="text-xs text-ink-muted">{r.notaAdmin}</p>}
                  </td>
                  <td className="p-3 text-right">
                    {(r.estado === "Pendiente" || r.estado === "Vencido") && (
                      <button
                        onClick={() => marcarPagado(r)}
                        disabled={procesandoId === r.id}
                        className="text-xs bg-copper-accion text-paper rounded px-2.5 py-1 hover:bg-copper-dark transition-colors disabled:opacity-40 whitespace-nowrap"
                      >
                        Marcar pagado
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ---------------- Fundadores ----------------

function Fundadores({ onError }: { onError: (e: string | null) => void }) {
  const [rubros, setRubros] = useState<FundadoresRubro[]>([]);
  const [cargando, setCargando] = useState(true);
  const [seleccion, setSeleccion] = useState<Record<number, string>>({});
  const [procesando, setProcesando] = useState(false);

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function cargar() {
    try {
      setRubros(await apiFetch<FundadoresRubro[]>("/api/admin/cobros/fundadores"));
    } catch (err) {
      onError(mensaje(err, "Error al cargar los fundadores"));
    } finally {
      setCargando(false);
    }
  }

  async function marcar(categoriaId: number) {
    const prestadorId = seleccion[categoriaId];
    if (!prestadorId) return;
    setProcesando(true);
    onError(null);
    try {
      await apiFetch("/api/admin/cobros/fundadores", {
        method: "POST",
        body: JSON.stringify({ prestadorId, categoriaId }),
      });
      setSeleccion((s) => ({ ...s, [categoriaId]: "" }));
      await cargar();
    } catch (err) {
      onError(mensaje(err, "No se pudo marcar como fundador"));
    } finally {
      setProcesando(false);
    }
  }

  async function quitar(prestadorId: string, nombre: string) {
    if (!window.confirm(`¿Quitarle el beneficio de fundador a ${nombre}? Desde ahora sus trabajos tienen cargo.`)) return;
    setProcesando(true);
    onError(null);
    try {
      await apiFetch(`/api/admin/cobros/fundadores/${prestadorId}`, { method: "DELETE" });
      await cargar();
    } catch (err) {
      onError(mensaje(err, "No se pudo quitar"));
    } finally {
      setProcesando(false);
    }
  }

  if (cargando) return <p className="text-sm text-ink-muted">Cargando...</p>;

  const ocupados = rubros.reduce((s, r) => s + r.fundadores.length, 0);
  const cupoTotal = rubros.reduce((s, r) => s + r.cupo, 0);

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-ink-muted">
        {ocupados} de {cupoTotal} cupos ocupados. Cada fundador tiene 1 año sin cargo desde que lo marcás. Solo aparecen
        como candidatos los prestadores con ese rubro aprobado.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {rubros.map((r) => {
          const lleno = r.fundadores.length >= r.cupo;
          return (
            <div key={r.categoriaId} className="bg-surface border border-ink/10 rounded-lg p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <p className="font-medium text-ink">{r.categoriaNombre}</p>
                <span className={`text-xs font-mono ${lleno ? "text-stamp" : "text-ink-muted"}`}>
                  {r.fundadores.length}/{r.cupo}
                </span>
              </div>

              {r.fundadores.length === 0 && <p className="text-xs text-ink-muted">Sin fundadores todavía.</p>}
              {r.fundadores.map((f) => (
                <div key={f.prestadorId} className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm text-ink">{f.nombreCompleto}</p>
                    <p className="text-xs text-ink-muted">
                      Hasta {f.fundadorHasta ? fecha(f.fundadorHasta) : "-"} · {f.trabajosConfirmados} trabajos
                    </p>
                  </div>
                  <button
                    onClick={() => quitar(f.prestadorId, f.nombreCompleto)}
                    disabled={procesando}
                    className="text-xs text-red-700 dark:text-red-400 hover:underline disabled:opacity-40"
                  >
                    Quitar
                  </button>
                </div>
              ))}

              {!lleno && (
                <div className="flex gap-2">
                  <select
                    value={seleccion[r.categoriaId] ?? ""}
                    onChange={(e) => setSeleccion((s) => ({ ...s, [r.categoriaId]: e.target.value }))}
                    className="border border-ink/20 rounded p-1.5 bg-paper text-sm flex-1 min-w-0"
                  >
                    <option value="">
                      {r.candidatos.length === 0 ? "No hay candidatos aprobados" : "Elegir prestador..."}
                    </option>
                    {r.candidatos.map((c) => (
                      <option key={c.prestadorId} value={c.prestadorId}>
                        {c.nombreCompleto} ({c.trabajosConfirmados} trabajos)
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => marcar(r.categoriaId)}
                    disabled={procesando || !seleccion[r.categoriaId]}
                    className="text-sm bg-copper-accion text-paper rounded px-3 hover:bg-copper-dark transition-colors disabled:opacity-40"
                  >
                    Marcar
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------- Tarifa ----------------

function Tarifa({ onError }: { onError: (e: string | null) => void }) {
  const [tarifas, setTarifas] = useState<TarifaVigente[]>([]);
  const [monto, setMonto] = useState("");
  const [tope, setTope] = useState("");
  const [desde, setDesde] = useState("");
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function cargar() {
    try {
      setTarifas(await apiFetch<TarifaVigente[]>("/api/admin/cobros/tarifas"));
    } catch (err) {
      onError(mensaje(err, "Error al cargar las tarifas"));
    }
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    if (!monto || !tope || !desde) return;
    if (!window.confirm(`Nueva tarifa: ${pesos(Number(monto))} por trabajo, tope ${pesos(Number(tope))}, desde el ${desde}. ¿Confirmás?`)) return;
    setGuardando(true);
    onError(null);
    try {
      // Desde las 00:00 de ese día, hora de Argentina.
      const vigenteDesde = new Date(`${desde}T00:00:00-03:00`).toISOString();
      await apiFetch("/api/admin/cobros/tarifas", {
        method: "POST",
        body: JSON.stringify({ montoPorTrabajo: Number(monto), topeMensual: Number(tope), vigenteDesde }),
      });
      setMonto("");
      setTope("");
      setDesde("");
      await cargar();
    } catch (err) {
      onError(mensaje(err, "No se pudo guardar la tarifa"));
    } finally {
      setGuardando(false);
    }
  }

  const ahora = Date.now();
  const vigente = tarifas.find((t) => new Date(t.vigenteDesde).getTime() <= ahora);

  return (
    <div className="flex flex-col gap-4">
      {vigente && (
        <div className="bg-surface border border-ink/10 rounded-lg p-4">
          <p className="text-xs text-ink-muted">Tarifa vigente</p>
          <p className="font-display text-xl text-ink">
            {pesos(vigente.montoPorTrabajo)} por trabajo · tope {pesos(vigente.topeMensual)}/mes
          </p>
          <p className="text-xs text-ink-muted">Desde el {fecha(vigente.vigenteDesde)}</p>
        </div>
      )}

      <form onSubmit={guardar} className="bg-surface border border-ink/10 rounded-lg p-4 flex flex-col gap-3">
        <p className="text-sm font-medium text-ink">Cargar una tarifa nueva</p>
        <p className="text-xs text-ink-muted">
          Para un período se usa la tarifa vigente el día 1 de ese mes. Conviene cargarla con fecha día 1 del mes que
          viene y avisarles a los prestadores antes.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <label className="text-xs text-ink-muted flex flex-col gap-1">
            Por trabajo
            <input type="number" min={0} value={monto} onChange={(e) => setMonto(e.target.value)} className="border border-ink/20 rounded p-2 bg-paper text-sm" />
          </label>
          <label className="text-xs text-ink-muted flex flex-col gap-1">
            Tope mensual
            <input type="number" min={0} value={tope} onChange={(e) => setTope(e.target.value)} className="border border-ink/20 rounded p-2 bg-paper text-sm" />
          </label>
          <label className="text-xs text-ink-muted flex flex-col gap-1">
            Vigente desde
            <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className="border border-ink/20 rounded p-2 bg-paper text-sm" />
          </label>
        </div>
        <button
          type="submit"
          disabled={guardando || !monto || !tope || !desde}
          className="self-start text-sm bg-copper-accion text-paper rounded px-4 py-2 hover:bg-copper-dark transition-colors disabled:opacity-40"
        >
          {guardando ? "Guardando..." : "Guardar tarifa"}
        </button>
      </form>

      {tarifas.length > 0 && (
        <div>
          <p className="text-sm font-medium text-ink mb-2">Historial</p>
          <ul className="flex flex-col gap-1 text-sm">
            {tarifas.map((t) => (
              <li key={t.vigenteDesde} className="flex justify-between border-b border-ink/10 py-1.5">
                <span className="text-ink-muted">Desde {fecha(t.vigenteDesde)}</span>
                <span className="font-mono text-ink">
                  {pesos(t.montoPorTrabajo)} · tope {pesos(t.topeMensual)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ---------------- Señales de fuga (fase 4) ----------------
// Indicios de trabajos arreglados por fuera de la app. No son pruebas: sirven para saber con
// quién hablar primero.

function Senales({ onError }: { onError: (e: string | null) => void }) {
  const [datos, setDatos] = useState<SenalesFuga | null>(null);

  useEffect(() => {
    apiFetch<SenalesFuga>("/api/admin/cobros/senales")
      .then(setDatos)
      .catch((err) => onError(mensaje(err, "Error al cargar las señales")));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!datos) return <p className="text-sm text-ink-muted">Cargando...</p>;

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-ink-muted">
        Son indicios, no pruebas. Sirven para saber con quién conviene hablar primero.
      </p>

      <div>
        <h2 className="font-display text-lg text-ink mb-2">Prestadores para revisar</h2>
        {datos.prestadores.length === 0 ? (
          <p className="text-sm text-ink-muted">Ninguno por ahora.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {datos.prestadores.map((p) => (
              <li key={p.prestadorId} className="bg-surface border border-ink/10 rounded-lg p-3">
                <div className="flex items-baseline justify-between gap-3 flex-wrap">
                  <p className="text-ink font-medium">{p.nombre}</p>
                  {p.telefono && <span className="text-xs text-ink-muted">{p.telefono}</span>}
                </div>
                <p className="text-xs text-ink-muted mt-0.5">
                  {p.conversaciones} consultas · {p.trabajosAceptados} aceptados (60 días) · {p.completados} completados ·{" "}
                  {p.confirmadosAutomaticamente} confirmados solos · {p.intentosContacto} intentos de contacto
                </p>
                <ul className="mt-2 flex flex-col gap-1">
                  {p.alertas.map((a) => (
                    <li key={a} className="text-sm text-safety-text">
                      {a}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <h2 className="font-display text-lg text-ink mb-2">Chats con intentos de pasar el contacto</h2>
        {datos.conversaciones.length === 0 ? (
          <p className="text-sm text-ink-muted">Ninguno por ahora.</p>
        ) : (
          <div className="bg-surface border border-ink/10 rounded-lg overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left bg-ink/5 text-ink-muted text-xs uppercase tracking-wide">
                  <th className="p-3 font-medium">Prestador</th>
                  <th className="p-3 font-medium">Cliente</th>
                  <th className="p-3 font-medium">Rubro</th>
                  <th className="p-3 font-medium">Intentos</th>
                  <th className="p-3 font-medium">Último</th>
                  <th className="p-3 font-medium">¿Trabajo aceptado?</th>
                </tr>
              </thead>
              <tbody>
                {datos.conversaciones.map((c) => (
                  <tr key={c.conversacionId} className="border-t border-ink/10">
                    <td className="p-3">{c.prestadorNombre}</td>
                    <td className="p-3">{c.clienteNombre}</td>
                    <td className="p-3">{c.categoriaNombre}</td>
                    <td className="p-3 font-mono">{c.intentosContacto}</td>
                    <td className="p-3 text-ink-muted">{c.ultimoIntentoEn ? fecha(c.ultimoIntentoEn) : "-"}</td>
                    <td className={`p-3 ${c.tieneTrabajoAceptado ? "text-stamp" : "text-safety-text"}`}>
                      {c.tieneTrabajoAceptado ? "Sí" : "No"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
