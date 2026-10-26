"use client";

// "Mi plan" del prestador (26/10, nuevo sistema de cobros — ver claude/diseno-nuevo-sistema-cobros-26-10.md
// en el proyecto). El cliente le paga directo al profesional; Oficy le cobra al profesional un monto
// fijo por cada trabajo confirmado, con tope mensual. Acá el prestador ve cuánto lleva en el mes,
// si es fundador (sin cargo durante el primer año), sus resúmenes mensuales y los paga con Mercado Pago.

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { apiFetch, ApiError } from "@/lib/api";
import { obtenerUsuario } from "@/lib/auth";
import { nombrePeriodo, pesos } from "@/lib/cobros";
import { ESTADO_RESUMEN_COLOR, ESTADO_RESUMEN_LABEL, MiPlan } from "@/types/cobros";

export default function MiPlanPage() {
  return (
    <Suspense fallback={<p className="p-6 text-ink-muted">Cargando...</p>}>
      <MiPlanContenido />
    </Suspense>
  );
}

function fecha(iso: string): string {
  return new Date(iso).toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" });
}

function MiPlanContenido() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const estadoPago = searchParams.get("pago"); // vuelta de Mercado Pago: "exitoso" | "pendiente" | "fallido"

  const [plan, setPlan] = useState<MiPlan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pagandoId, setPagandoId] = useState<string | null>(null);

  useEffect(() => {
    const usuario = obtenerUsuario();
    if (!usuario) {
      router.push("/login");
      return;
    }
    if (usuario.rol !== "Prestador") {
      router.push("/");
      return;
    }
    cargar();
    // El webhook de Mercado Pago puede tardar unos segundos: si volvemos de pagar, refrescamos
    // un par de veces para que el resumen aparezca como pagado sin recargar a mano.
    if (estadoPago === "exitoso" || estadoPago === "pendiente") {
      const t1 = setTimeout(cargar, 4000);
      const t2 = setTimeout(cargar, 10000);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function cargar() {
    try {
      setPlan(await apiFetch<MiPlan>("/api/cobros/mi-plan"));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No pudimos cargar tu plan");
    }
  }

  async function pagar(resumenId: string) {
    setPagandoId(resumenId);
    setError(null);
    try {
      const { initPoint } = await apiFetch<{ initPoint: string }>(`/api/cobros/resumenes/${resumenId}/pagar`, {
        method: "POST",
      });
      window.location.href = initPoint;
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No pudimos generar el link de pago");
      setPagandoId(null);
    }
  }

  if (!plan) {
    return (
      <div className="max-w-lg mx-auto mt-16 p-6 w-full">
        {error ? <p className="text-red-700 dark:text-red-400 text-sm">{error}</p> : <p className="text-ink-muted">Cargando...</p>}
      </div>
    );
  }

  const tarifa = plan.tarifa;
  const porcentajeTope = tarifa && tarifa.topeMensual > 0 ? Math.min(100, (plan.cargoMesActual / tarifa.topeMensual) * 100) : 0;
  const pendientes = plan.resumenes.filter((r) => r.estado === "Pendiente" || r.estado === "Vencido");

  return (
    <div className="max-w-lg mx-auto mt-16 p-6 w-full flex flex-col gap-5">
      <div>
        <p className="font-mono text-xs tracking-widest text-copper-text uppercase mb-2">Profesional</p>
        <h1 className="font-display text-2xl text-ink">Mi plan</h1>
      </div>

      {estadoPago === "exitoso" && (
        <p className="bg-stamp/10 text-stamp text-sm rounded p-3 border border-stamp/30">
          ¡Pago recibido! Puede tardar unos segundos en reflejarse acá.
        </p>
      )}
      {estadoPago === "pendiente" && (
        <p className="bg-safety/10 text-safety-text text-sm rounded p-3 border border-safety/30">
          Tu pago quedó pendiente de aprobación en Mercado Pago. Se va a reflejar acá apenas se confirme.
        </p>
      )}
      {estadoPago === "fallido" && (
        <p className="bg-red-700/10 text-red-700 dark:text-red-400 text-sm rounded p-3 border border-red-700/30">
          El pago no se pudo completar. Probá de nuevo.
        </p>
      )}
      {error && <p className="text-red-700 dark:text-red-400 text-sm">{error}</p>}

      {plan.suspendido && (
        <div className="rounded-lg border border-red-700/40 bg-red-700/5 p-4">
          <p className="font-medium text-red-700 dark:text-red-400">Tu cuenta está suspendida</p>
          <p className="text-sm text-ink/70 mt-1">
            Tenés un resumen vencido sin pagar. Mientras tanto no aparecés en las búsquedas y no podés chatear con
            clientes nuevos. Apenas lo pagás, se reactiva todo.
          </p>
        </div>
      )}

      {/* Fundador */}
      {plan.esFundador && plan.fundadorHasta && (
        <div className="rounded-xl border-2 border-copper bg-copper/5 p-4">
          <p className="font-mono text-[11px] tracking-widest uppercase text-copper-text">Profesional fundador</p>
          <p className="text-ink mt-1">
            No pagás nada hasta el <strong>{fecha(plan.fundadorHasta)}</strong>. Gracias por ayudarnos a construir Oficy.
          </p>
          {plan.ahorroFundadorTotal > 0 && (
            <p className="text-sm text-ink-muted mt-1">Hasta ahora te ahorraste {pesos(plan.ahorroFundadorTotal)}.</p>
          )}
        </div>
      )}

      {/* Mes en curso */}
      <div className="bg-surface border border-ink/10 rounded-xl p-4">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-sm text-ink-muted capitalize">{nombrePeriodo(plan.periodoActual)}</p>
          <p className="text-xs text-ink-muted">
            {plan.trabajosMesActual} {plan.trabajosMesActual === 1 ? "trabajo confirmado" : "trabajos confirmados"}
          </p>
        </div>
        <p className="font-display text-3xl text-ink mt-1">{pesos(plan.cargoMesActual)}</p>
        <p className="text-xs text-ink-muted">
          {plan.esFundador ? "Bonificado: no se te cobra." : "Acumulado este mes. Se factura el día 1 del mes que viene."}
        </p>

        {tarifa && tarifa.topeMensual > 0 && !plan.esFundador && (
          <div className="mt-3">
            <div className="h-2 rounded-full bg-ink/10 overflow-hidden">
              <div className="h-full bg-copper-accion rounded-full transition-all" style={{ width: `${porcentajeTope}%` }} />
            </div>
            <p className="text-xs text-ink-muted mt-1.5">
              {plan.topeAlcanzado
                ? `Llegaste al tope de ${pesos(tarifa.topeMensual)}: el resto de los trabajos del mes no te cuestan nada.`
                : `Tope del mes: ${pesos(tarifa.topeMensual)}. Pasado ese monto, los trabajos del mes no te cuestan nada.`}
            </p>
          </div>
        )}
      </div>

      {/* Deuda */}
      {pendientes.length > 0 && (
        <div className="rounded-xl border border-safety/40 bg-safety/5 p-4 flex flex-col gap-3">
          <p className="text-sm text-ink">
            Tenés {pendientes.length === 1 ? "un resumen" : `${pendientes.length} resúmenes`} para pagar por un total de{" "}
            <strong>{pesos(plan.deudaTotal)}</strong>.
          </p>
          {pendientes.map((r) => (
            <div key={r.id} className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <p className="text-sm text-ink capitalize">{nombrePeriodo(r.periodo)}</p>
                <p className={`text-xs ${r.estado === "Vencido" ? "text-red-700 dark:text-red-400" : "text-ink-muted"}`}>
                  {r.estado === "Vencido" ? "Venció" : "Vence"} el {fecha(r.venceEn)}
                </p>
              </div>
              <button
                onClick={() => pagar(r.id)}
                disabled={pagandoId !== null}
                className="text-sm bg-safety text-on-safety font-semibold rounded-lg px-4 py-2 hover:brightness-95 transition-all disabled:opacity-40"
              >
                {pagandoId === r.id ? "Redirigiendo..." : `Pagar ${pesos(r.total)}`}
              </button>
            </div>
          ))}
          <p className="text-[11px] text-ink-muted">
            Se paga con Mercado Pago. Si preferís transferencia, escribinos y lo registramos a mano.
          </p>
        </div>
      )}

      {/* Historial */}
      <div>
        <h2 className="font-display text-lg text-ink mb-2">Resúmenes</h2>
        {plan.resumenes.length === 0 ? (
          <p className="text-sm text-ink-muted">Todavía no tenés resúmenes. El primero se genera el día 1 del mes que viene.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {plan.resumenes.map((r) => (
              <li key={r.id} className="bg-surface border border-ink/10 rounded-lg p-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-ink capitalize">{nombrePeriodo(r.periodo)}</p>
                  <p className="text-xs text-ink-muted">
                    {r.cantidadTrabajos} {r.cantidadTrabajos === 1 ? "trabajo" : "trabajos"}
                    {r.trabajosBonificados > 0 ? ` · ${r.trabajosBonificados} bonificados` : ""}
                    {r.ahorro > 0 ? ` · ahorraste ${pesos(r.ahorro)}` : ""}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-mono text-sm text-ink">{pesos(r.total)}</p>
                  <span className={`inline-block mt-0.5 border rounded px-1.5 text-[10px] font-display tracking-wide ${ESTADO_RESUMEN_COLOR[r.estado]}`}>
                    {ESTADO_RESUMEN_LABEL[r.estado].toUpperCase()}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Cómo funciona */}
      {tarifa && (
        <div className="border-t border-ink/10 pt-4 text-sm text-ink-muted flex flex-col gap-1.5">
          <p className="font-medium text-ink">Cómo funciona</p>
          <p>El cliente te paga directo a vos, como prefieran (efectivo, transferencia, Mercado Pago). Cobrás el total.</p>
          <p>
            Oficy te cobra {pesos(tarifa.montoPorTrabajo)} por cada trabajo confirmado en la app, con un tope de{" "}
            {pesos(tarifa.topeMensual)} por mes.
          </p>
          <p>
            Un trabajo se confirma cuando el cliente lo confirma, cuando cargás su código de cierre o, si marcaste
            «Terminé», a las 72 horas sin respuesta.
          </p>
          <p>
            El resumen del mes se genera el día 1 y vence el día 10. Si a los 5 días sigue sin pagar, la cuenta se
            suspende hasta que se pague.
          </p>
          <Link href="/ordenes" className="text-copper-text hover:underline mt-1 self-start">
            Ver mis órdenes
          </Link>
        </div>
      )}
    </div>
  );
}
