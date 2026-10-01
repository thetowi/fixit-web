"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api";
import { obtenerUsuario } from "@/lib/auth";
import { Orden } from "@/types/ordenes";
import { SaludOperativa } from "@/types/tesoreria";

// 0 = Domingo ... 6 = Sábado, mismo orden que devuelve el backend (DayOfWeek de .NET).
const DIAS_SEMANA = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

const ALTURA_MAX_BARRA = 160; // px — igual al mockup aprobado

function formatoMonto(n: number) {
  return `$${Math.round(n).toLocaleString("es-AR")}`;
}

// Lunes de la semana que contiene `fecha` (para agrupar el volumen semanal) — igual de simple
// que el resto de la agrupación client-side de este panel (ver comentario de más abajo sobre por
// qué todo esto se calcula acá y no en el backend).
function lunesDeLaSemana(fecha: Date): Date {
  const d = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
  const diff = (d.getDay() + 6) % 7; // 0 = Lunes
  d.setDate(d.getDate() - diff);
  return d;
}

function formatoFechaCorta(d: Date) {
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function TesoreriaPage() {
  const router = useRouter();
  const [ordenes, setOrdenes] = useState<Orden[]>([]);
  const [salud, setSalud] = useState<SaludOperativa | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [procesandoOrdenId, setProcesandoOrdenId] = useState<string | null>(null);

  useEffect(() => {
    const usuario = obtenerUsuario();
    if (!usuario) {
      router.push("/login");
      return;
    }
    // Admin también puede entrar acá (mismos endpoints, widenados a "Admin,Tesorero" en el
    // backend) — pero su atajo natural sigue siendo /admin, este panel es sobre todo para el
    // Tesorero.
    if (usuario.rol !== "Tesorero" && usuario.rol !== "Admin") {
      router.push("/");
      return;
    }
    cargarDatos();
  }, [router]);

  async function cargarDatos() {
    try {
      const [ords, saludData] = await Promise.all([
        apiFetch<Orden[]>("/api/tesoreria/ordenes"),
        apiFetch<SaludOperativa>("/api/tesoreria/salud"),
      ]);
      setOrdenes(ords);
      setSalud(saludData);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error al cargar los datos");
    } finally {
      setCargando(false);
    }
  }

  // Las 3 acciones de abajo pegan a los MISMOS endpoints que ya usaba /admin
  // (OrdenesController.cs, widenados a "Admin,Tesorero" el 01/10) — no hay lógica nueva de
  // negocio, solo esta pantalla.
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

  if (cargando) return <p className="p-6 text-ink/60">Cargando...</p>;

  // --- KPIs y agrupaciones (01/10) — todo calculado acá, a partir del mismo Orden[] que ya
  // consumía /admin (igual que YA hacía app/admin/page.tsx con "Pagos pendientes de transferir"):
  // así el backend no tuvo que duplicar ningún cálculo de agregados, ver TesoreriaController.cs. ---

  const pagadas = ordenes.filter((o) => o.pagoEstado && o.pagoEstado !== "Reembolsado");

  const retenidas = ordenes.filter((o) => o.pagoEstado === "Retenido");
  const retenidoTotal = retenidas.reduce((acc, o) => acc + o.montoTotal, 0);

  const pendientesTransferir = ordenes.filter((o) => o.pagoEstado === "Liberado" && !o.transferenciaPrestadorConfirmadaEn);
  const pendienteTransferirMonto = pendientesTransferir.reduce((acc, o) => acc + (o.montoATransferirPrestador ?? 0), 0);
  const prestadoresPendientes = new Set(pendientesTransferir.map((o) => o.prestadorId)).size;

  const ahora = new Date();
  const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
  const inicioMesAnterior = new Date(ahora.getFullYear(), ahora.getMonth() - 1, 1);

  const comisionDelMes = pagadas
    .filter((o) => new Date(o.creadoEn) >= inicioMes)
    .reduce((acc, o) => acc + o.comisionPlataforma, 0);
  const comisionMesAnterior = pagadas
    .filter((o) => new Date(o.creadoEn) >= inicioMesAnterior && new Date(o.creadoEn) < inicioMes)
    .reduce((acc, o) => acc + o.comisionPlataforma, 0);
  const variacionComision =
    comisionMesAnterior > 0 ? Math.round(((comisionDelMes - comisionMesAnterior) / comisionMesAnterior) * 100) : null;

  const disputasAbiertas = ordenes.filter((o) => o.estado === "EnDisputa" && o.inasistenciaClienteReportadaEn && !o.inasistenciaResueltaEn);
  const disputasResueltasDelMes = ordenes.filter(
    (o) => o.inasistenciaResueltaEn && new Date(o.inasistenciaResueltaEn) >= inicioMes
  );
  const tiempoPromedioResolucionHoras = (() => {
    const conAmbasFechas = disputasResueltasDelMes.filter((o) => o.inasistenciaClienteReportadaEn && o.inasistenciaResueltaEn);
    if (conAmbasFechas.length === 0) return null;
    const totalHoras = conAmbasFechas.reduce((acc, o) => {
      const ms = new Date(o.inasistenciaResueltaEn!).getTime() - new Date(o.inasistenciaClienteReportadaEn!).getTime();
      return acc + ms / 36e5;
    }, 0);
    return totalHoras / conAmbasFechas.length;
  })();

  // Volumen por semana (últimas 8 semanas) — comisión de Oficy vs. pagado a prestadores.
  const semanas: { inicio: Date; comision: number; pagado: number }[] = [];
  {
    const lunesActual = lunesDeLaSemana(ahora);
    for (let i = 7; i >= 0; i--) {
      const inicio = new Date(lunesActual);
      inicio.setDate(inicio.getDate() - i * 7);
      semanas.push({ inicio, comision: 0, pagado: 0 });
    }
    for (const o of pagadas) {
      const lunes = lunesDeLaSemana(new Date(o.creadoEn)).getTime();
      const bucket = semanas.find((s) => s.inicio.getTime() === lunes);
      if (bucket) {
        bucket.comision += o.comisionPlataforma;
        bucket.pagado += o.montoATransferirPrestador ?? o.montoTotal - o.comisionPlataforma;
      }
    }
  }
  const maxTotalSemana = Math.max(1, ...semanas.map((s) => s.comision + s.pagado));

  // Mismo agrupado por prestador que ya usaba /admin, para la tabla de pagos pendientes.
  const hoy = ahora.getDay();
  const porPrestador = new Map<
    string,
    { nombre: string; cbuOAlias: string | null; titular: string | null; dia: number | null; total: number; cantidad: number; ordenId: string }
  >();
  for (const o of pendientesTransferir) {
    const existente = porPrestador.get(o.prestadorId);
    const monto = o.montoATransferirPrestador ?? 0;
    if (existente) {
      existente.total += monto;
      existente.cantidad += 1;
    } else {
      porPrestador.set(o.prestadorId, {
        nombre: o.prestadorNombreCompleto,
        cbuOAlias: o.prestadorCbuOAlias ?? null,
        titular: o.prestadorTitularCuentaCobro ?? null,
        dia: o.prestadorDiaPreferidoDeCobro ?? null,
        total: monto,
        cantidad: 1,
        ordenId: o.id,
      });
    }
  }
  const gruposPendientes = Array.from(porPrestador.values()).sort((a, b) => {
    const aHoy = a.dia === hoy ? 0 : 1;
    const bHoy = b.dia === hoy ? 0 : 1;
    return aHoy - bHoy;
  });

  // Clases completas y literales a propósito (nada de `bg-${color}/5`) — Tailwind analiza el
  // código fuente de forma estática, así que una clase armada por interpolación de string nunca
  // se genera en el CSS final.
  const ESTILOS_ESTADO: Record<string, { fila: string; punto: string }> = {
    Ok: { fila: "bg-stamp/5", punto: "bg-stamp" },
    Atencion: { fila: "bg-safety/10", punto: "bg-safety" },
    Critico: { fila: "bg-red-700/5 dark:bg-red-400/5", punto: "bg-red-700 dark:bg-red-400" },
  };

  return (
    <div className="max-w-5xl mx-auto mt-10 mb-20 p-6 w-full flex flex-col gap-7">
      <div className="flex items-end justify-between">
        <div>
          <p className="font-mono text-xs tracking-widest text-copper uppercase mb-2">Oficy · Tesorería</p>
          <h1 className="font-display text-2xl text-ink">Panel del Tesorero</h1>
        </div>
      </div>

      {error && <p className="text-red-700 dark:text-red-400 text-sm">{error}</p>}

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-surface border border-ink/10 rounded-lg p-4">
          <p className="font-mono text-[11px] uppercase tracking-wide text-ink/50">Retenido total</p>
          <p className="font-mono text-2xl mt-1">{formatoMonto(retenidoTotal)}</p>
          <p className="text-xs text-ink/50 mt-1">{retenidas.length} órdenes pagadas, sin liberar</p>
        </div>
        <div className="bg-surface border border-ink/10 rounded-lg p-4">
          <p className="font-mono text-[11px] uppercase tracking-wide text-ink/50">Pendiente de transferir</p>
          <p className="font-mono text-2xl mt-1 text-copper">{formatoMonto(pendienteTransferirMonto)}</p>
          <p className="text-xs text-ink/50 mt-1">a {prestadoresPendientes} {prestadoresPendientes === 1 ? "prestador" : "prestadores"}</p>
        </div>
        <div className="bg-surface border border-ink/10 rounded-lg p-4">
          <p className="font-mono text-[11px] uppercase tracking-wide text-ink/50">Comisión del mes</p>
          <div className="flex items-baseline gap-2 mt-1">
            <p className="font-mono text-2xl">{formatoMonto(comisionDelMes)}</p>
            {variacionComision !== null && (
              <span className={`font-mono text-xs font-semibold ${variacionComision >= 0 ? "text-stamp" : "text-red-700 dark:text-red-400"}`}>
                {variacionComision >= 0 ? "▲" : "▼"} {Math.abs(variacionComision)}%
              </span>
            )}
          </div>
          <p className="text-xs text-ink/50 mt-1">vs. mes anterior</p>
        </div>
        <div className="bg-surface border border-safety/40 rounded-lg p-4">
          <p className="font-mono text-[11px] uppercase tracking-wide text-ink/50">Disputas abiertas</p>
          <p className="font-mono text-2xl mt-1 text-safety">{disputasAbiertas.length}</p>
          <p className="text-xs text-ink/50 mt-1">
            {disputasResueltasDelMes.length} resueltas este mes
            {tiempoPromedioResolucionHoras !== null && <> · prom. {(tiempoPromedioResolucionHoras / 24).toFixed(1)}d</>}
          </p>
        </div>
      </div>

      {/* Volumen por semana */}
      <div className="bg-surface border border-ink/10 rounded-lg p-5">
        <div className="flex justify-between items-start mb-4 flex-wrap gap-2">
          <div>
            <h2 className="font-display text-base font-bold text-ink">Volumen de pagos por semana</h2>
            <p className="text-xs text-ink/50">Últimas 8 semanas — comisión de Oficy vs. lo que se le paga al prestador</p>
          </div>
          <div className="flex gap-4 text-xs text-ink/70">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-tesoreria-comision inline-block" /> Comisión Oficy
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-tesoreria-prestadores inline-block" /> Pagado a prestadores
            </span>
          </div>
        </div>

        <div className="flex items-end gap-3 border-b border-ink/10" style={{ height: ALTURA_MAX_BARRA + 24 }}>
          {semanas.map((s, i) => {
            const total = s.comision + s.pagado;
            const alturaTotal = (total / maxTotalSemana) * ALTURA_MAX_BARRA;
            const alturaComision = total > 0 ? (s.comision / total) * alturaTotal : 0;
            const alturaPagado = alturaTotal - alturaComision;
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                <span className="font-mono text-[11px] text-ink/50">{total > 0 ? formatoMonto(total) : ""}</span>
                <div className="w-full flex flex-col gap-0.5 justify-end" style={{ height: ALTURA_MAX_BARRA }}>
                  {alturaComision > 0 && <div className="bg-tesoreria-comision rounded-t-sm" style={{ height: alturaComision }} />}
                  {alturaPagado > 0 && <div className="bg-tesoreria-prestadores rounded-b-sm" style={{ height: alturaPagado }} />}
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex gap-3 pt-1.5">
          {semanas.map((s, i) => (
            <span key={i} className="flex-1 text-center text-[11px] text-ink/40">{formatoFechaCorta(s.inicio)}</span>
          ))}
        </div>
      </div>

      {/* Pagos pendientes + Disputas */}
      <div className="grid md:grid-cols-[1.4fr_1fr] gap-5 items-start">
        <div className="bg-surface border border-ink/10 rounded-lg p-5">
          <div className="flex justify-between items-baseline mb-3">
            <h2 className="font-display text-base font-bold text-ink">Pagos pendientes de transferir</h2>
            <span className="font-mono text-xs text-ink/50">
              {gruposPendientes.length} {gruposPendientes.length === 1 ? "prestador" : "prestadores"}
            </span>
          </div>

          {gruposPendientes.length === 0 ? (
            <p className="text-sm text-ink/50">No hay transferencias pendientes en este momento.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {gruposPendientes.map((g) => (
                <li
                  key={g.nombre + g.cbuOAlias}
                  className={`rounded-lg p-3 flex justify-between items-center gap-3 flex-wrap ${
                    g.dia === hoy ? "bg-copper/10 border border-copper/40" : "bg-paper border border-ink/10"
                  }`}
                >
                  <div>
                    <p className="text-sm text-ink font-medium">
                      {g.nombre} {g.dia === hoy && <span className="text-copper text-xs font-semibold ml-1">· Hoy</span>}
                    </p>
                    <p className="text-xs text-ink/60">
                      {g.cbuOAlias ? (
                        <>
                          <span className="font-mono">{g.cbuOAlias}</span> ({g.titular})
                        </>
                      ) : (
                        <span className="text-safety">Todavía no cargó su CBU/alias</span>
                      )}
                      {g.dia !== null && <> · Prefiere cobrar los {DIAS_SEMANA[g.dia]}</>}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-mono text-ink whitespace-nowrap">
                      {formatoMonto(g.total)} · {g.cantidad} {g.cantidad === 1 ? "trabajo" : "trabajos"}
                    </p>
                    <button
                      onClick={() => handleMarcarTransferidoPrestador(g.ordenId)}
                      disabled={procesandoOrdenId === g.ordenId}
                      className="text-xs bg-copper text-paper rounded px-2.5 py-1.5 hover:bg-copper-dark transition-colors disabled:opacity-50 whitespace-nowrap"
                    >
                      Marcar transferido
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <p className="text-xs text-ink/40 mt-3">
            "Marcar transferido" confirma UNA orden de este prestador por vez — si tiene varios trabajos pendientes, hacelo
            tantas veces como haga falta (o abrí /admin → Órdenes para verlas una por una).
          </p>
        </div>

        <div className="bg-surface border border-ink/10 rounded-lg p-5 flex flex-col gap-4">
          <div>
            <h2 className="font-display text-base font-bold text-ink mb-1">Disputas por inasistencia</h2>
            <p className="text-xs text-ink/50">Reportes de "el cliente no estaba"</p>
          </div>

          {disputasAbiertas.length === 0 ? (
            <p className="text-sm text-ink/50">No hay disputas abiertas en este momento.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {disputasAbiertas.map((o) => (
                <li key={o.id} className="border border-safety/40 bg-safety/5 rounded-lg p-3">
                  <div className="flex justify-between items-baseline">
                    <span className="text-sm font-semibold text-ink">{o.categoriaNombre} — {o.prestadorNombreCompleto}</span>
                    <span className="font-mono text-xs text-safety font-semibold">
                      {o.inasistenciaClienteReportadaEn && new Date(o.inasistenciaClienteReportadaEn).toLocaleDateString("es-AR")}
                    </span>
                  </div>
                  {o.inasistenciaClienteComentario && (
                    <p className="text-xs text-ink/70 mt-1.5">"{o.inasistenciaClienteComentario}"</p>
                  )}
                  <div className="flex gap-2 mt-2.5">
                    <button
                      onClick={() => handleResolverInasistenciaPrestador(o.id)}
                      disabled={procesandoOrdenId === o.id}
                      className="flex-1 text-xs bg-stamp text-paper rounded px-2 py-1.5 hover:opacity-90 transition-colors disabled:opacity-50"
                    >
                      A favor del prestador
                    </button>
                    {o.pagoEstado === "Retenido" && (
                      <button
                        onClick={() => handleReembolsarOrden(o.id)}
                        disabled={procesandoOrdenId === o.id}
                        className="flex-1 text-xs border border-red-700/40 text-red-700 dark:text-red-400 rounded px-2 py-1.5 hover:bg-red-700/10 transition-colors disabled:opacity-50"
                      >
                        A favor del cliente
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Salud operativa */}
      <div className="bg-surface border border-ink/10 rounded-lg p-5">
        <h2 className="font-display text-base font-bold text-ink mb-3">Salud operativa</h2>
        <div className="flex flex-col gap-2">
          {salud?.items.map((item) => {
            const estilo = ESTILOS_ESTADO[item.estado] ?? ESTILOS_ESTADO.Ok;
            return (
              <div key={item.nombre} className={`flex items-center gap-3 p-2.5 rounded-lg ${estilo.fila}`}>
                <span className={`w-2 h-2 rounded-full shrink-0 ${estilo.punto}`} />
                <span className="text-sm font-medium flex-1">{item.nombre}</span>
                <span className="text-xs text-ink/55">{item.detalle}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
