"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api";
import { obtenerUsuario } from "@/lib/auth";
import { BloqueDisponibilidad, AgregarBloqueRequest, OrdenAgenda } from "@/types/agenda";
import CalendarioSemanal from "@/components/CalendarioSemanal";

const DIAS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

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
  const [diaNuevo, setDiaNuevo] = useState(1);
  const [horaInicioNueva, setHoraInicioNueva] = useState("09:00");
  const [horaFinNueva, setHoraFinNueva] = useState("18:00");

  const [sinProgramar, setSinProgramar] = useState<OrdenAgenda[]>([]);
  const [programadas, setProgramadas] = useState<OrdenAgenda[]>([]);
  const [offsetSemana, setOffsetSemana] = useState(0);
  const [ordenAProgramar, setOrdenAProgramar] = useState<OrdenAgenda | null>(null);
  const [fechaTurno, setFechaTurno] = useState("");
  const [horaTurno, setHoraTurno] = useState("09:00");

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

  async function handleAgregarBloque(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const body: AgregarBloqueRequest = {
      diaSemana: diaNuevo,
      horaInicio: `${horaInicioNueva}:00`,
      horaFin: `${horaFinNueva}:00`,
    };

    try {
      await apiFetch("/api/prestador/disponibilidad", { method: "POST", body: JSON.stringify(body) });
      await refrescarTodo();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error al agregar el bloque");
    }
  }

  async function handleQuitarBloque(id: number) {
    try {
      await apiFetch(`/api/prestador/disponibilidad/${id}`, { method: "DELETE" });
      await refrescarTodo();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error al quitar el bloque");
    }
  }

  function abrirProgramar(orden: OrdenAgenda) {
    setOrdenAProgramar(orden);
    setFechaTurno("");
    setHoraTurno("09:00");
    setError(null);
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
        body: JSON.stringify({ fechaHora: fechaHora.toISOString() }),
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

      {error && <p className="text-red-700 text-sm mb-4">{error}</p>}

      <div className="bg-white border border-ink/10 rounded-lg p-5 mb-6">
        <p className="font-medium text-ink mb-3">Horarios en los que trabajo</p>

        <ul className="flex flex-col gap-2 mb-4">
          {bloques.length === 0 && (
            <p className="text-ink/50 text-sm">Todavía no cargaste tus horarios.</p>
          )}
          {bloques.map((b) => (
            <li key={b.id} className="flex justify-between items-center text-sm bg-paper rounded p-2">
              <span className="text-ink">
                {DIAS[b.diaSemana]} · {b.horaInicio.slice(0, 5)} a {b.horaFin.slice(0, 5)}
              </span>
              <button onClick={() => handleQuitarBloque(b.id)} className="text-red-700/70 hover:text-red-700 text-xs">
                Quitar
              </button>
            </li>
          ))}
        </ul>

        <form onSubmit={handleAgregarBloque} className="flex gap-2 items-end flex-wrap">
          <label className="text-xs text-ink/60">
            Día
            <select
              className="border border-ink/20 rounded p-2 bg-paper block mt-1"
              value={diaNuevo}
              onChange={(e) => setDiaNuevo(Number(e.target.value))}
            >
              {DIAS.map((d, i) => (
                <option key={i} value={i}>{d}</option>
              ))}
            </select>
          </label>
          <label className="text-xs text-ink/60">
            Desde
            <input
              type="time"
              className="border border-ink/20 rounded p-2 bg-paper block mt-1"
              value={horaInicioNueva}
              onChange={(e) => setHoraInicioNueva(e.target.value)}
            />
          </label>
          <label className="text-xs text-ink/60">
            Hasta
            <input
              type="time"
              className="border border-ink/20 rounded p-2 bg-paper block mt-1"
              value={horaFinNueva}
              onChange={(e) => setHoraFinNueva(e.target.value)}
            />
          </label>
          <button type="submit" className="bg-copper text-paper rounded px-4 py-2 text-sm hover:bg-copper-dark transition-colors">
            Agregar
          </button>
        </form>
      </div>

      <div className="bg-white border border-ink/10 rounded-lg p-5 mb-6">
        <p className="font-medium text-ink mb-3">Pendientes de programar</p>
        {sinProgramar.length === 0 ? (
          <p className="text-ink/50 text-sm">No tenés trabajos pendientes de agendar.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {sinProgramar.map((o) => (
              <li key={o.id} className="flex justify-between items-center text-sm bg-paper rounded p-2">
                <span className="text-ink">{o.categoriaNombre} · {o.clienteNombreCompleto}</span>
                <button
                  onClick={() => abrirProgramar(o)}
                  className="bg-ink text-paper rounded px-3 py-1 text-xs hover:bg-ink/80 transition-colors"
                >
                  Programar
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="bg-white border border-ink/10 rounded-lg p-5">
        <div className="flex items-center justify-between mb-4">
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
          <CalendarioSemanal inicioSemana={inicioSemana} bloques={bloques} ordenes={programadas} />
        )}
      </div>

      {ordenAProgramar && (
        <div className="fixed inset-0 bg-ink/50 flex items-center justify-center p-6">
          <div className="bg-paper rounded-lg p-6 max-w-sm w-full border border-ink/10">
            <h3 className="font-display text-lg text-ink mb-4">
              Programar: {ordenAProgramar.categoriaNombre}
            </h3>
            <form onSubmit={handleProgramar} className="flex flex-col gap-3">
              <label className="text-sm text-ink/60">
                Fecha
                <input
                  type="date"
                  required
                  className="border border-ink/20 rounded p-2 w-full mt-1 bg-white"
                  value={fechaTurno}
                  onChange={(e) => setFechaTurno(e.target.value)}
                />
              </label>
              <label className="text-sm text-ink/60">
                Hora
                <input
                  type="time"
                  required
                  className="border border-ink/20 rounded p-2 w-full mt-1 bg-white"
                  value={horaTurno}
                  onChange={(e) => setHoraTurno(e.target.value)}
                />
              </label>

              {error && <p className="text-red-700 text-sm">{error}</p>}

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