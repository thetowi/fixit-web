"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api";
import { obtenerUsuario } from "@/lib/auth";
import { BloqueDisponibilidad, DURACIONES_PREDEFINIDAS_MINUTOS, formatoDistancia, formatoDuracion, OrdenAgenda } from "@/types/agenda";
import CalendarioSemanal from "@/components/CalendarioSemanal";
import CalendarioMensual from "@/components/CalendarioMensual";
import { colorCategoria } from "@/lib/coloresCategoria";
import { linkGoogleMaps } from "@/lib/mapas";

type Vista = "semana" | "mes";

function inicioDeSemana(fecha: Date): Date {
  const d = new Date(fecha);
  const dia = d.getDay();
  d.setDate(d.getDate() - dia);
  d.setHours(0, 0, 0, 0);
  return d;
}

// Primer día del mes que corresponde a offsetMes meses desde hoy (offsetMes 0 = mes actual).
// Se fija el día en 1 antes de sumar meses para no pisarse con meses de distinta longitud
// (ej. 31 de enero + 1 mes no puede dar "31 de febrero").
function mesBaseDesdeOffset(offsetMes: number): Date {
  const base = new Date();
  base.setDate(1);
  base.setMonth(base.getMonth() + offsetMes);
  base.setHours(0, 0, 0, 0);
  return base;
}

// La grilla del mes muestra semanas completas, así que puede incluir algunos días del mes
// anterior/siguiente: para no dejar turnos afuera, el rango a pedir cubre toda la grilla visible.
function rangoVisibleDelMes(mesBase: Date): { desde: Date; hasta: Date } {
  const primerDia = new Date(mesBase.getFullYear(), mesBase.getMonth(), 1);
  const ultimoDia = new Date(mesBase.getFullYear(), mesBase.getMonth() + 1, 0);
  const desde = new Date(primerDia);
  desde.setDate(desde.getDate() - desde.getDay());
  const hasta = new Date(ultimoDia);
  hasta.setDate(hasta.getDate() + (6 - hasta.getDay()));
  hasta.setHours(23, 59, 59, 999);
  return { desde, hasta };
}

export default function AgendaPage() {
  const router = useRouter();

  const [bloques, setBloques] = useState<BloqueDisponibilidad[]>([]);

  const [sinProgramar, setSinProgramar] = useState<OrdenAgenda[]>([]);
  const [programadas, setProgramadas] = useState<OrdenAgenda[]>([]);
  const [vista, setVista] = useState<Vista>("semana");
  const [offsetSemana, setOffsetSemana] = useState(0);
  const [offsetMes, setOffsetMes] = useState(0);
  const [ordenAProgramar, setOrdenAProgramar] = useState<OrdenAgenda | null>(null);
  const [fechaTurno, setFechaTurno] = useState("");
  const [horaTurno, setHoraTurno] = useState("09:00");
  const [duracionTurno, setDuracionTurno] = useState(60);

  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [cargandoRango, setCargandoRango] = useState(false);

  const inicioSemana = (() => {
    const base = new Date();
    base.setDate(base.getDate() + offsetSemana * 7);
    return inicioDeSemana(base);
  })();

  const mesBase = mesBaseDesdeOffset(offsetMes);

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
    cargarRango();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vista, offsetSemana, offsetMes]);

  async function cargarBase() {
    try {
      const [bloquesData, sinProgramarData] = await Promise.all([
        apiFetch<BloqueDisponibilidad[]>("/api/prestador/disponibilidad"),
        apiFetch<OrdenAgenda[]>("/api/prestador/agenda/sin-programar"),
      ]);
      setBloques(bloquesData);
      setSinProgramar(sinProgramarData);
      await cargarRango();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error al cargar la agenda");
    } finally {
      setCargando(false);
    }
  }

  async function cargarRango() {
    setCargandoRango(true);
    try {
      let desde: Date;
      let hasta: Date;

      if (vista === "semana") {
        const base = new Date();
        base.setDate(base.getDate() + offsetSemana * 7);
        desde = inicioDeSemana(base);
        hasta = new Date(desde);
        hasta.setDate(hasta.getDate() + 6);
        hasta.setHours(23, 59, 59, 999);
      } else {
        ({ desde, hasta } = rangoVisibleDelMes(mesBaseDesdeOffset(offsetMes)));
      }

      const data = await apiFetch<OrdenAgenda[]>(
        `/api/prestador/agenda?desde=${desde.toISOString()}&hasta=${hasta.toISOString()}`
      );
      setProgramadas(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error al cargar la agenda");
    } finally {
      setCargandoRango(false);
    }
  }

  async function refrescarTodo() {
    const [bloquesData, sinProgramarData] = await Promise.all([
      apiFetch<BloqueDisponibilidad[]>("/api/prestador/disponibilidad"),
      apiFetch<OrdenAgenda[]>("/api/prestador/agenda/sin-programar"),
    ]);
    setBloques(bloquesData);
    setSinProgramar(sinProgramarData);
    await cargarRango();
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

  // Al tocar un día en la vista de mes saltamos a la vista de semana, centrada en la semana de
  // ese día — ahí es donde se puede tocar un horario puntual para agendar.
  function handleSeleccionarDiaMes(dia: Date) {
    const inicioSemanaDeHoy = inicioDeSemana(new Date());
    const inicioSemanaDelDia = inicioDeSemana(dia);
    const diffSemanas = Math.round((inicioSemanaDelDia.getTime() - inicioSemanaDeHoy.getTime()) / (7 * 86400000));
    setOffsetSemana(diffSemanas);
    setVista("semana");
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
  const rangoSemanaLabel = `${inicioSemana.toLocaleDateString("es-AR", { day: "numeric", month: "short" })} — ${finSemana.toLocaleDateString("es-AR", { day: "numeric", month: "short" })}`;
  const mesLabel = mesBase.toLocaleDateString("es-AR", { month: "long", year: "numeric" });
  const mesLabelCapitalizado = mesLabel.charAt(0).toUpperCase() + mesLabel.slice(1);

  function irAHoy() {
    if (vista === "semana") setOffsetSemana(0);
    else setOffsetMes(0);
  }

  const enHoy = vista === "semana" ? offsetSemana === 0 : offsetMes === 0;

  return (
    <div className="max-w-3xl mx-auto mt-16 p-6 w-full">
      <div className="flex items-end justify-between gap-4 flex-wrap mb-6">
        <div>
          <p className="font-mono text-xs tracking-widest text-copper uppercase mb-2">Prestador</p>
          <h1 className="font-display text-2xl text-ink">Mi agenda</h1>
        </div>

        <div className="flex bg-surface border border-ink/10 rounded-full p-0.5 gap-0.5">
          <button
            onClick={() => setVista("semana")}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              vista === "semana" ? "bg-copper text-paper" : "text-ink/55 hover:text-ink"
            }`}
          >
            Semana
          </button>
          <button
            onClick={() => setVista("mes")}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              vista === "mes" ? "bg-copper text-paper" : "text-ink/55 hover:text-ink"
            }`}
          >
            Mes
          </button>
        </div>
      </div>

      {error && <p className="text-red-700 dark:text-red-400 text-sm mb-4">{error}</p>}

      {bloques.length === 0 && (
        <div className="bg-surface border border-ink/10 rounded-lg p-4 mb-6 flex items-center justify-between gap-3 flex-wrap">
          <p className="text-sm text-ink/60">Todavía no cargaste los horarios en los que trabajás.</p>
          <a href="/cuenta" className="text-sm text-copper hover:underline whitespace-nowrap">
            Configurar en Mi cuenta →
          </a>
        </div>
      )}

      <div className="bg-surface border border-ink/10 rounded-xl p-5 mb-6">
        <p className="font-semibold text-ink mb-3">
          Pendientes de programar {sinProgramar.length > 0 && <span className="text-ink/40 font-normal">({sinProgramar.length})</span>}
        </p>
        {sinProgramar.length === 0 ? (
          <p className="text-ink/50 text-sm">No tenés trabajos pendientes de agendar.</p>
        ) : (
          <ul className="flex flex-col gap-2.5">
            {sinProgramar.map((o) => (
              <li key={o.id} className="flex items-center gap-3 bg-paper rounded-lg p-3">
                <span
                  className="w-1 self-stretch rounded-full shrink-0"
                  style={{ background: colorCategoria(o.categoriaNombre) }}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-ink font-medium truncate">
                    {o.descripcion || o.categoriaNombre} · {o.clienteNombreCompleto}
                  </p>
                  <p className="text-xs text-ink/45 truncate">
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
                  className="bg-copper text-paper rounded-lg px-4 py-2.5 text-sm font-semibold hover:bg-copper-dark transition-colors shrink-0"
                >
                  Programar
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="bg-surface border border-ink/10 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-ink/8">
          <p className="font-semibold text-ink">{vista === "semana" ? rangoSemanaLabel : mesLabelCapitalizado}</p>
          <div className="flex items-center gap-3">
            <button
              onClick={() => (vista === "semana" ? setOffsetSemana((s) => s - 1) : setOffsetMes((m) => m - 1))}
              className="text-ink/45 hover:text-ink text-sm px-1.5"
              aria-label="Anterior"
            >
              ←
            </button>
            {!enHoy && (
              <button onClick={irAHoy} className="text-xs text-copper hover:underline whitespace-nowrap">
                Hoy
              </button>
            )}
            <button
              onClick={() => (vista === "semana" ? setOffsetSemana((s) => s + 1) : setOffsetMes((m) => m + 1))}
              className="text-ink/45 hover:text-ink text-sm px-1.5"
              aria-label="Siguiente"
            >
              →
            </button>
          </div>
        </div>

        {cargandoRango ? (
          <p className="text-ink/50 text-sm">Cargando...</p>
        ) : vista === "semana" ? (
          <CalendarioSemanal
            inicioSemana={inicioSemana}
            bloques={bloques}
            ordenes={programadas}
            onCeldaDisponibleClick={handleCeldaDisponibleClick}
          />
        ) : (
          <CalendarioMensual mesBase={mesBase} ordenes={programadas} onSeleccionarDia={handleSeleccionarDiaMes} />
        )}
      </div>

      {ordenAProgramar && (
        <div
          className="fixed inset-0 bg-ink/50 backdrop-blur-sm flex items-center justify-center p-6 z-50"
          onClick={() => setOrdenAProgramar(null)}
        >
          <div onClick={(e) => e.stopPropagation()} className="bg-surface rounded-xl shadow-xl p-6 max-w-sm w-full border border-ink/10">
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
                  className="border border-ink/20 rounded p-2 w-full mt-1 bg-paper"
                  value={fechaTurno}
                  onChange={(e) => setFechaTurno(e.target.value)}
                />
              </label>
              <label className="text-sm text-ink/60">
                Hora de inicio
                <input
                  type="time"
                  required
                  className="border border-ink/20 rounded p-2 w-full mt-1 bg-paper"
                  value={horaTurno}
                  onChange={(e) => setHoraTurno(e.target.value)}
                />
              </label>
              <label className="text-sm text-ink/60">
                Duración del trabajo
                <select
                  className="border border-ink/20 rounded p-2 w-full mt-1 bg-paper"
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
                <button type="button" onClick={() => setOrdenAProgramar(null)} className="border border-ink/20 rounded-lg p-2.5 flex-1 text-ink hover:border-ink/40 transition-colors">
                  Cancelar
                </button>
                <button type="submit" className="bg-copper text-paper rounded-lg p-2.5 flex-1 font-semibold hover:bg-copper-dark transition-colors">
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
