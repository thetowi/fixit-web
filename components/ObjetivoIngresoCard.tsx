"use client";

import { useEffect, useState } from "react";
import { Target, ArrowRight, Sparkles } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api";
import { ObjetivoIngreso } from "@/types/objetivoIngreso";

// "Sueldo pretendido" (28/09) — ver claude/aviso-pago-y-sueldo-pretendido-28-09.md y el mockup
// aprobado (https://claude.ai/artifact/P9fv7JsS3icspJp99dasT4). Vive en el dashboard del
// prestador (app/app/page.tsx). 3 estados: sin objetivo todavía (formulario), en progreso (barra
// + camino) y cumplido (festejo).

function formatoMonto(monto: number): string {
  return `$${Math.round(monto).toLocaleString("es-AR")}`;
}

function limpiarMonto(texto: string): number {
  // El input se escribe con puntos de miles ("2.000.000") — nos quedamos solo con los dígitos.
  const soloDigitos = texto.replace(/[^\d]/g, "");
  return soloDigitos ? parseInt(soloDigitos, 10) : 0;
}

export default function ObjetivoIngresoCard() {
  const [objetivo, setObjetivo] = useState<ObjetivoIngreso | null>(null);
  const [cargando, setCargando] = useState(true);
  const [editando, setEditando] = useState(false);
  const [montoInput, setMontoInput] = useState("");
  const [ticketInput, setTicketInput] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function cargar() {
    try {
      const data = await apiFetch<ObjetivoIngreso>("/api/prestador/objetivo-ingreso");
      setObjetivo(data);
    } catch {
      // Best-effort: si falla, la tarjeta simplemente no se muestra esta vez.
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargar();
  }, []);

  function abrirEdicion() {
    setMontoInput(objetivo?.montoMensual ? Math.round(objetivo.montoMensual).toLocaleString("es-AR") : "");
    setTicketInput(
      objetivo?.ticketEsManual && objetivo.ticketPromedio ? Math.round(objetivo.ticketPromedio).toLocaleString("es-AR") : ""
    );
    setError(null);
    setEditando(true);
  }

  async function guardarObjetivo() {
    const monto = limpiarMonto(montoInput);
    if (monto <= 0) {
      setError("Ingresá un monto mayor a cero.");
      return;
    }
    const ticket = ticketInput.trim() ? limpiarMonto(ticketInput) : null;

    setGuardando(true);
    setError(null);
    try {
      const data = await apiFetch<ObjetivoIngreso>("/api/prestador/objetivo-ingreso", {
        method: "PUT",
        body: JSON.stringify({ montoMensual: monto, ticketPromedioManual: ticket }),
      });
      setObjetivo(data);
      setEditando(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No pudimos guardar tu objetivo.");
    } finally {
      setGuardando(false);
    }
  }

  if (cargando || !objetivo) return null;

  const mesActual = new Date().toLocaleDateString("es-AR", { month: "long" });

  // Estado: formulario (sin objetivo todavía, o editando uno existente)
  if (!objetivo.tieneObjetivo || editando) {
    return (
      <div className="w-full bg-surface border border-ink/10 rounded-lg p-6 flex flex-col items-center text-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-copper flex items-center justify-center">
          <Target size={22} className="text-paper" />
        </div>
        <div className="flex flex-col gap-1">
          <p className="font-display text-lg text-ink">¿Cuánto querés ganar este mes?</p>
          <p className="text-sm text-ink/60 max-w-sm">
            Contanos tu objetivo y te mostramos el camino: cuántos trabajos más te faltan según tu ticket promedio.
          </p>
        </div>

        <div className="w-full max-w-xs flex flex-col gap-1.5 text-left mt-2">
          <label htmlFor="objetivo-monto" className="font-mono text-xs uppercase tracking-wider text-ink/50">
            Sueldo pretendido este mes
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/50 font-medium">$</span>
            <input
              id="objetivo-monto"
              type="text"
              inputMode="numeric"
              value={montoInput}
              onChange={(e) => setMontoInput(e.target.value)}
              placeholder="2.000.000"
              className="w-full pl-7 pr-3 py-2.5 rounded-md border border-ink/15 bg-paper text-ink font-medium focus:outline-none focus:ring-2 focus:ring-copper"
            />
          </div>
        </div>

        <div className="w-full max-w-xs flex flex-col gap-1.5 text-left">
          <label htmlFor="objetivo-ticket" className="font-mono text-xs uppercase tracking-wider text-ink/50">
            Tu ticket promedio (opcional)
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/50 font-medium">$</span>
            <input
              id="objetivo-ticket"
              type="text"
              inputMode="numeric"
              value={ticketInput}
              onChange={(e) => setTicketInput(e.target.value)}
              placeholder={objetivo.ticketDisponible ? formatoMonto(objetivo.ticketPromedio).slice(1) : "Ej. 100.000"}
              className="w-full pl-7 pr-3 py-2.5 rounded-md border border-ink/15 bg-paper text-ink focus:outline-none focus:ring-2 focus:ring-copper"
            />
          </div>
          <span className="text-xs text-ink/45">
            {objetivo.ticketDisponible
              ? "Si no lo completás, usamos el promedio real de tus trabajos."
              : "Todavía no tenés trabajos completados — sin este dato no podemos calcular el camino."}
          </span>
        </div>

        {error && <p className="text-red-700 dark:text-red-400 text-sm">{error}</p>}

        <div className="flex items-center gap-3 mt-1">
          {editando && objetivo.tieneObjetivo && (
            <button
              onClick={() => setEditando(false)}
              className="text-sm text-ink/50 hover:underline px-2"
            >
              Cancelar
            </button>
          )}
          <button
            onClick={guardarObjetivo}
            disabled={guardando}
            className="bg-copper text-paper rounded px-5 py-2.5 font-medium hover:bg-copper-dark transition-colors disabled:opacity-50"
          >
            {guardando ? "Guardando..." : "Establecer objetivo"}
          </button>
        </div>
      </div>
    );
  }

  // Estado: cumplido
  if (objetivo.cumplido) {
    return (
      <div className="w-full bg-surface border border-ink/10 rounded-lg p-6">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <Target size={16} className="text-stamp" />
              <span className="font-mono text-xs uppercase tracking-wider text-stamp">
                Objetivo de {mesActual} — cumplido
              </span>
            </div>
            <p className="text-2xl font-display text-ink">{formatoMonto(objetivo.montoMensual ?? 0)}</p>
          </div>
          <button onClick={abrirEdicion} className="text-xs font-medium text-ink/50 hover:underline whitespace-nowrap">
            Nuevo objetivo
          </button>
        </div>

        <div className="mb-4">
          <div className="flex items-baseline justify-between mb-1.5 text-sm">
            <span className="text-ink/70">
              Llevás <strong className="text-ink">{formatoMonto(objetivo.gananciaDelMes)}</strong> este mes
            </span>
            <span className="font-bold text-stamp">{Math.round(objetivo.porcentajeProgreso)}%</span>
          </div>
          <div className="w-full h-3 bg-ink/10 rounded-full overflow-hidden">
            <div className="h-full bg-stamp rounded-full" style={{ width: "100%" }} />
          </div>
        </div>

        <div className="flex flex-col items-center gap-2 text-center bg-stamp/10 border border-stamp/25 rounded-lg p-5">
          <div className="w-10 h-10 rounded-lg bg-stamp flex items-center justify-center">
            <Sparkles size={18} className="text-paper" />
          </div>
          <p className="font-medium text-ink">¡Llegaste a tu objetivo!</p>
          <p className="text-sm text-ink/60 max-w-sm">
            Completaste {objetivo.trabajosCompletadosDelMes} trabajos este mes. Es un buen momento para pensar tu próxima meta.
          </p>
        </div>
      </div>
    );
  }

  // Estado: en progreso
  return (
    <div className="w-full bg-surface border border-ink/10 rounded-lg p-6">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <Target size={16} className="text-copper" />
            <span className="font-mono text-xs uppercase tracking-wider text-copper">
              Tu objetivo de {mesActual}
            </span>
          </div>
          <p className="text-2xl font-display text-ink">{formatoMonto(objetivo.montoMensual ?? 0)}</p>
        </div>
        <button onClick={abrirEdicion} className="text-xs font-medium text-ink/50 hover:underline whitespace-nowrap">
          Cambiar objetivo
        </button>
      </div>

      <div className="mb-4">
        <div className="flex items-baseline justify-between mb-1.5 text-sm">
          <span className="text-ink/70">
            Llevás <strong className="text-ink">{formatoMonto(objetivo.gananciaDelMes)}</strong> este mes
          </span>
          <span className="font-bold text-copper">{Math.round(objetivo.porcentajeProgreso)}%</span>
        </div>
        <div className="w-full h-3 bg-ink/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-copper rounded-full transition-all"
            style={{ width: `${Math.min(100, Math.max(0, objetivo.porcentajeProgreso))}%` }}
          />
        </div>
      </div>

      {objetivo.ticketDisponible && objetivo.trabajosFaltantes !== null ? (
        <div className="flex items-start gap-3 bg-copper/10 border border-copper/25 rounded-lg p-4">
          <div className="w-8 h-8 rounded-md bg-copper flex items-center justify-center shrink-0">
            <ArrowRight size={16} className="text-paper" />
          </div>
          <p className="text-sm text-ink/75">
            Con tu ticket promedio de <strong>{formatoMonto(objetivo.ticketPromedio)}</strong>, te faltan{" "}
            <strong>{objetivo.trabajosFaltantes} trabajos más</strong> este mes para llegar a tu objetivo.
          </p>
        </div>
      ) : (
        <div className="flex items-start gap-3 bg-ink/5 rounded-lg p-4">
          <p className="text-sm text-ink/60">
            Todavía no tenemos suficientes datos para calcular tu camino — completá tu ticket promedio en{" "}
            <button onClick={abrirEdicion} className="text-copper underline">
              tu objetivo
            </button>{" "}
            para verlo.
          </p>
        </div>
      )}
    </div>
  );
}
