"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api";
import { obtenerUsuario } from "@/lib/auth";
import { iconoCategoria } from "@/lib/iconosCategoria";
import { Usuario } from "@/types/auth";
import { OrdenEnCurso } from "@/types/ordenes";

// "Trabajo en curso" (24/09, a pedido del usuario): pantalla completa animada con timer en vivo,
// espejo de fixit-mobile/src/components/TrabajoEnCursoOverlay.tsx y del mismo mockup aprobado
// (Artifact "Trabajo en curso — FixIt"). Se monta una sola vez en app/layout.tsx, así queda fija
// arriba de cualquier página. Se refresca sola con el mismo evento "fixit:ordenes-actualizadas"
// que ya retransmite Navbar.tsx desde SignalR ("ActualizacionOrdenes").
function formatearTiempo(segundosTotales: number): string {
  const s = Math.max(0, Math.floor(segundosTotales));
  const horas = Math.floor(s / 3600);
  const minutos = Math.floor((s % 3600) / 60);
  const segundos = s % 60;
  if (horas > 0) {
    return `${String(horas).padStart(2, "0")}:${String(minutos).padStart(2, "0")}:${String(segundos).padStart(2, "0")}`;
  }
  return `${String(minutos).padStart(2, "0")}:${String(segundos).padStart(2, "0")}`;
}

export default function TrabajoEnCursoOverlay() {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [ordenEnCurso, setOrdenEnCurso] = useState<OrdenEnCurso | null>(null);
  const [minimizado, setMinimizado] = useState(false);
  const [finalizando, setFinalizando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tiempo, setTiempo] = useState("00:00");
  const ordenIdAnteriorRef = useRef<string | null>(null);

  // Pausar trabajo en curso (03/10, a pedido del usuario: "poder pausar un trabajo en curso para
  // continuar al otro día") — solo el Prestador decide, el Cliente solo ve el estado "Pausado" y
  // la nota (si dejó una), sin tener que aprobar nada.
  const [mostrarFormPausa, setMostrarFormPausa] = useState(false);
  const [notaPausa, setNotaPausa] = useState("");
  const [pausando, setPausando] = useState(false);
  const [reanudando, setReanudando] = useState(false);

  useEffect(() => {
    setUsuario(obtenerUsuario());
  }, []);

  async function refrescar() {
    const u = obtenerUsuario();
    setUsuario(u);
    if (!u || (u.rol !== "Cliente" && u.rol !== "Prestador")) {
      setOrdenEnCurso(null);
      return;
    }
    try {
      const data = await apiFetch<OrdenEnCurso | undefined>("/api/ordenes/en-curso");
      setOrdenEnCurso(data ?? null);
    } catch {
      // Best-effort, igual que el resto de los refrescos en tiempo real de la app.
    }
  }

  useEffect(() => {
    refrescar();
    window.addEventListener("fixit:ordenes-actualizadas", refrescar);
    return () => window.removeEventListener("fixit:ordenes-actualizadas", refrescar);
  }, []);

  useEffect(() => {
    const idActual = ordenEnCurso?.ordenId ?? null;
    if (idActual !== ordenIdAnteriorRef.current) {
      setMinimizado(false);
      setError(null);
    }
    ordenIdAnteriorRef.current = idActual;
  }, [ordenEnCurso?.ordenId]);

  useEffect(() => {
    if (!ordenEnCurso) return;
    const inicio = new Date(ordenEnCurso.iniciadoEn).getTime();

    // Pausado: el timer se congela en el momento de la pausa en vez de seguir sumando — no hace
    // falta un intervalo, un solo cálculo alcanza (vuelve a correr si cambia pausadoEn).
    if (ordenEnCurso.pausadoEn) {
      const pausa = new Date(ordenEnCurso.pausadoEn).getTime();
      setTiempo(formatearTiempo((pausa - inicio) / 1000));
      return;
    }

    const actualizar = () => setTiempo(formatearTiempo((Date.now() - inicio) / 1000));
    actualizar();
    const intervalo = setInterval(actualizar, 1000);
    return () => clearInterval(intervalo);
  }, [ordenEnCurso?.iniciadoEn, ordenEnCurso?.pausadoEn]);

  async function pausarTrabajo() {
    if (!ordenEnCurso) return;
    setPausando(true);
    setError(null);
    try {
      await apiFetch(`/api/ordenes/${ordenEnCurso.ordenId}/pausar`, {
        method: "PUT",
        body: JSON.stringify({ nota: notaPausa.trim() || undefined }),
      });
      setOrdenEnCurso({ ...ordenEnCurso, pausadoEn: new Date().toISOString(), notaPausa: notaPausa.trim() || null });
      setMostrarFormPausa(false);
      setNotaPausa("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No pudimos pausar el trabajo.");
    } finally {
      setPausando(false);
    }
  }

  async function reanudarTrabajo() {
    if (!ordenEnCurso) return;
    setReanudando(true);
    setError(null);
    try {
      await apiFetch(`/api/ordenes/${ordenEnCurso.ordenId}/reanudar`, { method: "PUT" });
      setOrdenEnCurso({ ...ordenEnCurso, pausadoEn: null, notaPausa: null });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No pudimos reanudar el trabajo.");
    } finally {
      setReanudando(false);
    }
  }

  async function finalizarTrabajo() {
    if (!ordenEnCurso) return;
    setFinalizando(true);
    setError(null);
    try {
      await apiFetch(`/api/ordenes/${ordenEnCurso.ordenId}/completar`, { method: "PUT" });
      setOrdenEnCurso(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No pudimos finalizar el trabajo.");
    } finally {
      setFinalizando(false);
    }
  }

  if (!ordenEnCurso || !usuario) return null;

  const Icono = iconoCategoria(ordenEnCurso.categoriaIcono);
  const esCliente = usuario.rol === "Cliente";
  const otraParte = esCliente ? ordenEnCurso.prestadorNombreCompleto : ordenEnCurso.clienteNombreCompleto;

  if (minimizado) {
    return (
      <button
        onClick={() => setMinimizado(false)}
        className="sticky top-0 z-40 w-full flex items-center gap-3 px-4 py-3 bg-copper text-left"
      >
        <span className="w-8 h-8 rounded-full bg-ink/20 flex items-center justify-center shrink-0">
          <Icono size={16} className="text-ink" style={{ animation: "fixitRockTool 2.4s ease-in-out infinite" }} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            {!ordenEnCurso.pausadoEn && <span className="w-1.5 h-1.5 rounded-full bg-ink animate-pulse" />}
            <span className="text-xs font-bold text-ink uppercase tracking-wide">
              {ordenEnCurso.pausadoEn ? "Pausado" : "Trabajo en curso"}
            </span>
          </span>
          <span className="block text-xs text-ink/70 truncate">
            {ordenEnCurso.categoriaNombre} · con {otraParte}
          </span>
        </span>
        <span className="font-mono text-base font-semibold text-ink whitespace-nowrap tabular-nums">{tiempo}</span>
        <ChevronRight size={16} className="text-ink/65 shrink-0" />
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#12151b] text-[#F4F1EA]">
      <style jsx>{`
        @keyframes fixitPulseRing {
          0% { transform: scale(0.82); opacity: 0.55; }
          70% { transform: scale(1.45); opacity: 0; }
          100% { opacity: 0; }
        }
        @keyframes fixitRockTool {
          0%, 100% { transform: rotate(-14deg); }
          50% { transform: rotate(14deg); }
        }
        @keyframes fixitSpinDash {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .fixit-ring { animation: fixitPulseRing 2.6s ease-out infinite; }
        .fixit-ring-2 { animation-delay: 1.3s; }
        .fixit-tool { animation: fixitRockTool 2.4s ease-in-out infinite; transform-origin: 50% 50%; }
        .fixit-dash { animation: fixitSpinDash 5s linear infinite; }
      `}</style>

      <div className="flex items-center justify-between px-5 pt-5">
        <div className="flex items-center gap-2 bg-white/10 rounded-full py-1.5 pl-2.5 pr-3">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[11px] font-semibold tracking-wider opacity-85">EN VIVO</span>
        </div>
        <button
          onClick={() => setMinimizado(true)}
          aria-label="Minimizar"
          className="w-9 h-9 rounded-full border border-white/15 flex items-center justify-center hover:bg-white/5 transition-colors"
        >
          <ChevronDown size={18} />
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center gap-7 px-8">
        <div className="relative flex items-center justify-center" style={{ width: 152, height: 152 }}>
          <div className="fixit-ring absolute inset-0 rounded-full border-2 border-[#C9703F]" />
          <div className="fixit-ring fixit-ring-2 absolute inset-0 rounded-full border-2 border-[#C9703F]" />
          <svg
            className="fixit-dash absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
            width="118"
            height="118"
            viewBox="0 0 118 118"
          >
            <circle cx="59" cy="59" r="55" fill="none" stroke="#C9703F" strokeWidth="1.5" strokeDasharray="4 10" strokeLinecap="round" opacity="0.5" />
          </svg>
          <div
            className="relative rounded-full flex items-center justify-center shadow-lg"
            style={{ width: 96, height: 96, background: "linear-gradient(155deg, #D2824F 0%, #A85F35 100%)" }}
          >
            <Icono className="fixit-tool" size={48} color="#12151b" strokeWidth={1.8} />
          </div>
        </div>

        <div className="flex flex-col items-center gap-1.5 text-center">
          <h1 className="text-2xl font-bold">Trabajo en curso</h1>
          <p className="text-sm opacity-65">
            {ordenEnCurso.categoriaNombre} · con {otraParte}
          </p>
        </div>

        <div className="flex flex-col items-center gap-1">
          <span className="font-mono text-5xl font-semibold tracking-wide tabular-nums">{tiempo}</span>
          <span className="text-[11px] tracking-wider opacity-50 uppercase">Tiempo transcurrido</span>
        </div>
      </div>

      <div className="px-6 pb-9 flex flex-col gap-3">
        {error && <p className="text-sm text-red-400 text-center">{error}</p>}
        {esCliente ? (
          ordenEnCurso.pausadoEn ? (
            <div className="flex flex-col gap-1.5 bg-white/[0.06] border border-white/10 rounded-2xl p-3.5">
              <span className="text-sm font-medium">El prestador pausó el trabajo</span>
              <span className="text-sm opacity-65">
                {ordenEnCurso.notaPausa || "Lo van a continuar más adelante."}
              </span>
            </div>
          ) : (
            <>
              <button
                onClick={finalizarTrabajo}
                disabled={finalizando}
                className="w-full h-[54px] rounded-2xl bg-safety text-ink font-bold text-base disabled:opacity-60 transition-opacity"
              >
                {finalizando ? "Finalizando..." : "Finalizar trabajo"}
              </button>
              <button
                onClick={() =>
                  alert("Pronto vas a poder reportar un problema desde acá. Mientras tanto, contactanos por el chat.")
                }
                className="text-sm opacity-55 hover:opacity-80 transition-opacity"
              >
                Reportar un problema
              </button>
            </>
          )
        ) : ordenEnCurso.pausadoEn ? (
          <>
            <div className="flex flex-col gap-1.5 bg-white/[0.06] border border-white/10 rounded-2xl p-3.5">
              <span className="text-sm font-medium">Pausado</span>
              {ordenEnCurso.notaPausa && <span className="text-sm opacity-65">{ordenEnCurso.notaPausa}</span>}
            </div>
            <button
              onClick={reanudarTrabajo}
              disabled={reanudando}
              className="w-full h-[54px] rounded-2xl bg-safety text-ink font-bold text-base disabled:opacity-60 transition-opacity"
            >
              {reanudando ? "Reanudando..." : "Reanudar trabajo"}
            </button>
          </>
        ) : mostrarFormPausa ? (
          <div className="flex flex-col gap-2.5 bg-white/[0.06] border border-white/10 rounded-2xl p-3.5">
            <textarea
              placeholder="Nota para el cliente (opcional) — ej. «Seguimos mañana a la misma hora»"
              value={notaPausa}
              onChange={(e) => setNotaPausa(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-lg p-2.5 text-sm text-paper placeholder:text-paper/40 resize-none"
              rows={2}
            />
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setMostrarFormPausa(false);
                  setNotaPausa("");
                }}
                className="flex-1 h-10 rounded-lg border border-white/15 text-sm opacity-80"
              >
                Cancelar
              </button>
              <button
                onClick={pausarTrabajo}
                disabled={pausando}
                className="flex-1 h-10 rounded-lg bg-copper text-paper text-sm font-medium disabled:opacity-60"
              >
                {pausando ? "Pausando..." : "Confirmar pausa"}
              </button>
            </div>
          </div>
        ) : (
          <>
            <button
              onClick={() => setMostrarFormPausa(true)}
              className="w-full h-[54px] rounded-2xl border border-white/20 text-paper font-bold text-base hover:bg-white/5 transition-colors"
            >
              Pausar trabajo
            </button>
            <div className="flex items-center gap-2.5 bg-white/[0.06] border border-white/10 rounded-2xl p-3.5">
              <span className="flex gap-1 items-center">
                <span className="w-1.5 h-1.5 rounded-full bg-[#F4F1EA] animate-bounce [animation-delay:0ms]" />
                <span className="w-1.5 h-1.5 rounded-full bg-[#F4F1EA] animate-bounce [animation-delay:150ms]" />
                <span className="w-1.5 h-1.5 rounded-full bg-[#F4F1EA] animate-bounce [animation-delay:300ms]" />
              </span>
              <span className="text-sm opacity-75">Esperando que el cliente confirme la finalización</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
