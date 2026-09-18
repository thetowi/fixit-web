"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api";
import { obtenerUsuario } from "@/lib/auth";
import { BloqueDisponibilidad, DURACIONES_PREDEFINIDAS_MINUTOS, formatoDistancia, formatoDuracion, OrdenAgenda } from "@/types/agenda";
import CalendarioSemanal from "@/components/CalendarioSemanal";
import { linkGoogleMaps } from "@/lib/mapas";

function inicioDeSemana(fecha: Date): Date {
  const d = new Date(fecha);
  const dia = d.getDay();
  d.setDate(d.getDate() - dia);
  d.setHours(0, 0, 0, 0);
  return d;
}

export default function AgendaPage() {
  const router = useRouter();

  const [bloques, setBloques] = useState<BloqueDisponibilidad[]>([]);

  const [sinProgramar, setSinProgramar] = useState<OrdenAgenda[]>([]);
  const [programadas, setProgramadas] = useState<OrdenAgenda[]>([]);
  const [offsetSemana, setOffsetSemana] = useState(0);
  const [ordenAProgramar, setOrdenAProgramar] = useState<OrdenAgenda | null>(null);
  const [fechaTurno, setFechaTurno] = useState("");
  const [horaTurno, setHoraTurno] = useState("09:00");
  const [duracionTurno, setDuracionTurno] = useState(60);

  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [cargandoSemana, setCargandoSemana] = useState(false);

  const inicioSemana = (() => {
    const base = new Date();
    base.setDate(base.getDate() + offsetSemana * 7);
    return inicioDeSemana(base);
  })();

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
    cargarBase();
  }, [router]);

  useEffect(() => {
    if (cargando) return; // esperamos a que termine la carga inicial
    cargarSemana();
  }, [offsetSemana]);

  async function cargarBase() {
    try {
      const [bloquesData, sinProgramarData] = await Promise.all([
        apiFetch<BloqueDisponibilidad[]>("/api/prestador/disponibilidad"),
        apiFetch<OrdenAgenda[]>("/api/prestador/agenda/sin-programar"),
      ]);
      setBloques(bloquesData);
      setSinProgramar(sinProgramarData);
      await cargarSemana();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error al cargar la agenda");
    } finally {
      setCargando(false);
    }
  }

  async function cargarSemana() {
    setCargandoSemana(true);
    try {
      const base = new Date();
      base.setDate(base.getDate() + offsetSemana * 7);
      const inicio = inicioDeSemana(base);
      const fin = new Date(inicio);
      fin.setDate(fin.getDate() + 6);
      fin.setHours(23, 59, 59, 999);

      const data = await apiFetch<OrdenAgenda[]>(
        `/api/prestador/agenda?desde=${inicio.toISOString()}&hasta=${fin.toISOString()}`
      );
      setProgramadas(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error al cargar la semana");
    } finally {
      setCargandoSemana(false);
    }
  }

  async function refrescarTodo() {
    const [bloquesData, sinProgramarData] = await Promise.all([
      apiFetch<BloqueDisponibilidad[]>("/api/prestador/disponibilidad"),
      apiFetch<OrdenAgenda[]>("/api/prestador/agenda/sin-programar"),
    ]);
    setBloques(bloquesData);
    setSinProgramar(sinProgramarData);
    await cargarSemana();
  }

  function abrirProgramar(orden: OrdenAgenda, fechaPre?: string, horaPre?: string) {
    setOrdenAProgramar(orden);
    setFechaTurno(fechaPre ?? "");
    setHoraTurno(horaPre ?? "09:00");
    setDuracionTurno(60);
    setError(null);
  }

  function fechaAInputDate(fecha: Date): string {
    const anio = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, "0");
    const dia = String(fecha.getDate()).padStart(2, "0");
    return `${anio}-${mes}-${dia}`;
  }

  function handleCeldaDisponibleClick(dia: Date, horaHHMM: string) {
    if (sinProgramar.length === 0) {
      setError("No tenés trabajos pendientes de agendar — primero necesitás una orden pagada sin programar.");
      return;
    }
    if (sinProgramar.length === 1) {
      abrirProgramar(sinProgramar[0], fechaAInputDate(dia), horaHHMM);
      return;
    }
    setError("Tenés más de un trabajo pendiente: elegí cuál desde \"Pendientes de programar\" y después tocá el horario.");
  }

  async function handleProgramar(e: React.FormEvent) {
    e.preventDefault();
    if (!ordenAProgramar || !fechaTurno) {
      setError("Elegí una fecha.");
      return;
    }

    const fechaHora = new Date(`${fechaTurno}T${horaTurno}:00`);

    try {
      await apiFetch(`/api/ordenes/${ordenAProgramar.id}/programar`, {
        method: "PUT",
        body: JSON.stringify({ fechaHora: fechaHora.toISOString(), duracionMinutos: duracionTurno }),
      });
      setOrdenAProgramar(null);
      await refrescarTodo();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error al programar el turno");
    }
  }

  if (cargando) return <p className="p-6 text-ink/60">Cargando...</p>;

  const finSemana = new Date(inicioSemana);
  finSemana.setDate(finSemana.getDate() + 6);
  const rangoLabel = `${inicioSemana.toLocaleDateString("es-AR", { day: "numeric", month: "short" })} — ${finSemana.toLocaleDateString("es-AR", { day: "numeric", month: "short" })}`;

  return (
    <div className="max-w-3xl mx-auto mt-16 p-6 w-full">
      <p className="font-mono text-xs tracking-widest text-copper uppercase mb-2">Prestador</p>
      <h1 className="font-display text-2xl text-ink mb-6">Mi agenda</h1>

      {error && <p className="text-red-700 dark:text-red-400 text-sm mb-4">{error}</p>}

      {bloques.length === 0 && (
        <div className="bg-surface border border-ink/10 rounded-lg p-4 mb-6 flex items-center justify-between gap-3 flex-wrap">
          <p className="text-sm text-ink/60">Todavía no cargaste los horarios en los que trabajás.</p>
          <a href="/cuenta" className="text-sm text-copper hover:underline whitespace-nowrap">
            Configurar en Mi cuenta →
          </a>
        </div>
      )}

      <div className="bg-surface border border-ink/10 rounded-lg p-5 mb-6">
        <p className="font-medium text-ink mb-3">Pendientes de programar</p>
        {sinProgramar.length === 0 ? (
          <p className="text-ink/50 text-sm">No tenés trabajos pendientes de agendar.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {sinProgramar.map((o) => (
              <li key={o.id} className="flex justify-between items-center gap-3 text-sm bg-paper rounded p-2">
                <div className="min-w-0">
                  <p className="text-ink truncate">
                    {o.descripcion || o.categoriaNombre} · {o.clienteNombreCompleto}
                  </p>
                  <p className="text-xs text-ink/40 truncate">
                    {o.categoriaNombre}
                    {o.clienteDireccion && (
                      <>
                        {" · 📍 "}
                        <a
                          href={linkGoogleMaps(o.clienteDireccion, o.clienteDireccionLat, o.clienteDireccionLon)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline decoration-dotted hover:text-copper"
                        >
                          {o.clienteDireccion}
                        </a>
                        {o.clienteDireccionVerificada ? " ✓" : ""}
                      </>
                    )}
                    {o.clienteTelefono ? ` · ${o.clienteTelefono}` : ""}
                  </p>
                  {o.clienteDistanciaKm != null && (
                    <p className="text-xs text-ink/35 truncate">{formatoDistancia(o.clienteDistanciaKm)}</p>
                  )}
                </div>
                <button
                  onClick={() => abrirProgramar(o)}
                  className="bg-ink text-paper rounded px-3 py-1 text-xs hover:bg-ink/80 transition-colors shrink-0"
                >
                  Programar
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="bg-paper border border-dashed border-ink/30 rounded-lg p-5">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-dashed border-ink/20">
          <p className="font-medium text-ink">Calendario</p>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setOffsetSemana((s) => s - 1)}
              className="text-ink/50 hover:text-ink text-sm px-2"
            >
              ←
            </button>
            <span className="font-mono text-xs text-copper w-32 text-center">{rangoLabel}</span>
            <button
              onClick={() => setOffsetSemana((s) => s + 1)}
              className="text-ink/50 hover:text-ink text-sm px-2"
            >
              →
            </button>
            {offsetSemana !== 0 && (
              <button
                onClick={() => setOffsetSemana(0)}
                className="text-xs text-copper hover:underline"
              >
                Hoy
              </button>
            )}
          </div>
        </div>

        {cargandoSemana ? (
          <p className="text-ink/50 text-sm">Cargando semana...</p>
        ) : (
          <CalendarioSemanal
            inicioSemana={inicioSemana}
            bloques={bloques}
            ordenes={programadas}
            onCeldaDisponibleClick={handleCeldaDisponibleClick}
          />
        )}
      </div>

      {ordenAProgramar && (
        <div className="fixed inset-0 bg-ink/50 flex items-center justify-center p-6">
          <div className="bg-paper rounded-lg p-6 max-w-sm w-full border border-ink/10">
            <h3 className="font-display text-lg text-ink mb-1">
              Programar: {ordenAProgramar.descripcion || ordenAProgramar.categoriaNombre}
            </h3>
            <p className={`text-xs text-ink/50 ${ordenAProgramar.clienteDistanciaKm != null ? "mb-1" : "mb-4"}`}>
              {ordenAProgramar.clienteNombreCompleto}
              {ordenAProgramar.clienteDireccion && (
                <>
                  {" · 📍 "}
                  <a
                    href={linkGoogleMaps(ordenAProgramar.clienteDireccion, ordenAProgramar.clienteDireccionLat, ordenAProgramar.clienteDireccionLon)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline decoration-dotted hover:text-copper"
                  >
                    {ordenAProgramar.clienteDireccion}
                  </a>
                  {ordenAProgramar.clienteDireccionVerificada ? " ✓" : ""}
                </>
              )}
            </p>
            {ordenAProgramar.clienteDistanciaKm != null && (
              <p className="text-xs text-ink/35 mb-4">{formatoDistancia(ordenAProgramar.clienteDistanciaKm)}</p>
            )}
            <form onSubmit={handleProgramar} className="flex flex-col gap-3">
              <label className="text-sm text-ink/60">
                Fecha
                <input
                  type="date"
                  required
                  className="border border-ink/20 rounded p-2 w-full mt-1 bg-surface"
                  value={fechaTurno}
                  onChange={(e) => setFechaTurno(e.target.value)}
                />
              </label>
              <label className="text-sm text-ink/60">
                Hora de inicio
                <input
                  type="time"
                  required
                  className="border border-ink/20 rounded p-2 w-full mt-1 bg-surface"
                  value={horaTurno}
                  onChange={(e) => setHoraTurno(e.target.value)}
                />
              </label>
              <label className="text-sm text-ink/60">
                Duración del trabajo
                <select
                  className="border border-ink/20 rounded p-2 w-full mt-1 bg-surface"
                  value={duracionTurno}
                  onChange={(e) => setDuracionTurno(Number(e.target.value))}
                >
                  {DURACIONES_PREDEFINIDAS_MINUTOS.map((min) => (
                    <option key={min} value={min}>
                      {formatoDuracion(min)}
                    </option>
                  ))}
                </select>
              </label>

              {error && <p className="text-red-700 dark:text-red-400 text-sm">{error}</p>}

              <div className="flex gap-2 mt-2">
                <button type="button" onClick={() => setOrdenAProgramar(null)} className="border border-ink/20 rounded p-2 flex-1 text-ink">
                  Cancelar
                </button>
                <button type="submit" className="bg-copper text-paper rounded p-2 flex-1 hover:bg-copper-dark transition-colors">
                  Confirmar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}