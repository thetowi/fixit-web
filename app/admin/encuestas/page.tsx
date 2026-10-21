"use client";

// Resultados de la encuesta pública de prestadores (16/10) — ver app/encuesta/page.tsx y
// FixIt.Domain/Entities/RespuestaEncuesta.cs. Todo se cuenta en el navegador a partir de la lista
// completa (GET /api/admin/encuestas): para las cantidades de respuestas esperadas en una
// pre-validación de mercado (cientos, no millones) no hace falta agregar nada en el servidor.

import { useEffect, useMemo, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";

interface RespuestaEncuesta {
  id: string;
  creadoEn: string;
  rubros: string[];
  rubroOtro: string | null;
  antiguedad: string | null;
  canalesTrabajo: string[];
  canalOtro: string | null;
  frecuenciaSinTrabajo: string | null;
  interesApp: string | null;
  valorEsperado: string[];
  valorOtro: string | null;
  dispuestoComision: string | null;
  porcentajeComision: string | null;
  formaCobroPreferida: string | null;
  prioridadCobro: string | null;
  opinionSena: string | null;
  opinionPrepagoComision: string | null;
  opinionGarantia: string | null;
  dudas: string | null;
  interesProbar: string | null;
  nombre: string | null;
  whatsApp: string | null;
  localidad: string | null;
}

const NO_POR_AHORA = "No por el momento";

function contar(valores: (string | null | undefined)[]): [string, number][] {
  const mapa = new Map<string, number>();
  for (const v of valores) {
    if (!v) continue;
    mapa.set(v, (mapa.get(v) ?? 0) + 1);
  }
  return [...mapa.entries()].sort((a, b) => b[1] - a[1]);
}

function Grafico({ titulo, datos, total }: { titulo: string; datos: [string, number][]; total: number }) {
  const max = Math.max(1, ...datos.map(([, n]) => n));
  return (
    <div className="bg-surface border border-ink/10 rounded-lg p-4">
      <p className="font-medium text-ink text-sm mb-3">{titulo}</p>
      {datos.length === 0 && <p className="text-xs text-ink/50">Sin respuestas todavía.</p>}
      <ul className="flex flex-col gap-2">
        {datos.map(([etiqueta, n]) => (
          <li key={etiqueta}>
            <div className="flex justify-between gap-2 text-xs text-ink/70 mb-0.5">
              <span>{etiqueta}</span>
              <span className="font-mono shrink-0">
                {n} ({total > 0 ? Math.round((n / total) * 100) : 0}%)
              </span>
            </div>
            <div className="h-2 bg-ink/10 rounded-full overflow-hidden">
              <div className="h-full bg-copper" style={{ width: `${(n / max) * 100}%` }} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Ficha individual (17/10, a pedido del usuario: "ver discriminadamente las respuestas de cada
// uno"): todas las respuestas de una persona, en el mismo orden que la encuesta.
function lista(valores: string[], otro: string | null) {
  const todos = [...valores, ...(otro ? [`Otro: ${otro}`] : [])];
  return todos.length > 0 ? todos.join(" · ") : null;
}

function FichaRespuesta({ r }: { r: RespuestaEncuesta }) {
  const filas: [string, string | null][] = [
    ["Rubros", lista(r.rubros.filter((x) => x !== "Otro" || !r.rubroOtro), r.rubroOtro)],
    ["Antigüedad en el rubro", r.antiguedad],
    ["Cómo consigue trabajo hoy", lista(r.canalesTrabajo, r.canalOtro)],
    ["Períodos sin trabajo", r.frecuenciaSinTrabajo],
    ["¿Usaría una app así?", r.interesApp],
    ["Qué valoraría más", lista(r.valorEsperado, r.valorOtro)],
    ["¿Pagaría comisión?", r.dispuestoComision],
    ["Comisión que ve razonable", r.porcentajeComision],
    ["Cómo prefiere que le pague el cliente", r.formaCobroPreferida],
    ["Qué prefiere al terminar un trabajo", r.prioridadCobro],
    ["Seña por la app", r.opinionSena],
    ["Cómo pagaría la comisión", r.opinionPrepagoComision],
    ["Garantía con plazo para corregir", r.opinionGarantia],
    ["Dudas o comentarios", r.dudas],
    ["Interés en probar", r.interesProbar],
  ];
  return (
    <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2 pt-3 mt-3 border-t border-ink/10">
      {filas.map(([pregunta, respuesta]) => (
        <div key={pregunta} className={pregunta === "Dudas o comentarios" ? "sm:col-span-2" : ""}>
          <dt className="text-xs text-ink/50">{pregunta}</dt>
          <dd className={`text-sm mt-0.5 ${respuesta ? "text-ink" : "text-ink/35 italic"}`}>{respuesta ?? "Sin responder"}</dd>
        </div>
      ))}
      <div className="sm:col-span-2 text-xs text-ink/40">
        Respondió el {new Date(r.creadoEn).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" })}
      </div>
    </dl>
  );
}

function csvCelda(valor: string | string[] | null | undefined): string {
  const texto = Array.isArray(valor) ? valor.join(" | ") : valor ?? "";
  return `"${texto.replace(/"/g, '""')}"`;
}

export default function AdminEncuestasPage() {
  const [respuestas, setRespuestas] = useState<RespuestaEncuesta[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    apiFetch<RespuestaEncuesta[]>("/api/admin/encuestas")
      .then(setRespuestas)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Error al cargar la encuesta"))
      .finally(() => setCargando(false));
  }, []);

  const total = respuestas.length;

  // Desde el 16/10 el contacto es obligatorio para todos (también para quien responde "No por el
  // momento"), así que la lista se separa por interés en vez de mostrar solo a los interesados.
  const [filtroContactos, setFiltroContactos] = useState<"interesados" | "sin_interes" | "todos">("interesados");
  const conContacto = useMemo(() => respuestas.filter((r) => r.whatsApp), [respuestas]);
  const interesados = useMemo(() => conContacto.filter((r) => r.interesProbar !== NO_POR_AHORA), [conContacto]);
  const sinInteres = useMemo(() => conContacto.filter((r) => r.interesProbar === NO_POR_AHORA), [conContacto]);
  const porInteres = filtroContactos === "interesados" ? interesados : filtroContactos === "sin_interes" ? sinInteres : conContacto;

  // Búsqueda por nombre / WhatsApp / localidad y filtro por rubro (17/10).
  const [busqueda, setBusqueda] = useState("");
  const [filtroRubro, setFiltroRubro] = useState("");
  const [abierta, setAbierta] = useState<string | null>(null);
  const rubrosDisponibles = useMemo(
    () => Array.from(new Set(respuestas.flatMap((r) => r.rubros))).filter((x) => x !== "Otro").sort((a, b) => a.localeCompare(b, "es")),
    [respuestas]
  );
  const contactos = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    const qDigitos = q.replace(/\D/g, "");
    return porInteres.filter((r) => {
      if (filtroRubro === "__otro") {
        if (!r.rubroOtro) return false;
      } else if (filtroRubro && !r.rubros.includes(filtroRubro)) {
        return false;
      }
      if (!q) return true;
      return (
        (r.nombre ?? "").toLowerCase().includes(q) ||
        (r.localidad ?? "").toLowerCase().includes(q) ||
        (r.rubroOtro ?? "").toLowerCase().includes(q) ||
        (qDigitos.length >= 3 && (r.whatsApp ?? "").replace(/\D/g, "").includes(qDigitos))
      );
    });
  }, [porInteres, busqueda, filtroRubro]);
  const dudas = useMemo(() => respuestas.filter((r) => r.dudas), [respuestas]);

  function descargarCsv() {
    const columnas: [string, (r: RespuestaEncuesta) => string | string[] | null][] = [
      ["Fecha", (r) => r.creadoEn],
      ["Rubros", (r) => [...r.rubros, ...(r.rubroOtro ? [`Otro: ${r.rubroOtro}`] : [])]],
      ["Antigüedad", (r) => r.antiguedad],
      ["Canales", (r) => [...r.canalesTrabajo, ...(r.canalOtro ? [`Otro: ${r.canalOtro}`] : [])]],
      ["Períodos sin trabajo", (r) => r.frecuenciaSinTrabajo],
      ["Interés en la app", (r) => r.interesApp],
      ["Valor esperado", (r) => [...r.valorEsperado, ...(r.valorOtro ? [`Otro: ${r.valorOtro}`] : [])]],
      ["Dispuesto a comisión", (r) => r.dispuestoComision],
      ["Comisión razonable", (r) => r.porcentajeComision],
      ["Forma de cobro", (r) => r.formaCobroPreferida],
      ["Prioridad de cobro", (r) => r.prioridadCobro],
      ["Seña", (r) => r.opinionSena],
      ["Pago de comisión", (r) => r.opinionPrepagoComision],
      ["Garantía", (r) => r.opinionGarantia],
      ["Dudas", (r) => r.dudas],
      ["Interés en probar", (r) => r.interesProbar],
      ["Nombre", (r) => r.nombre],
      ["WhatsApp", (r) => r.whatsApp],
      ["Localidad", (r) => r.localidad],
    ];
    const lineas = [
      columnas.map(([titulo]) => csvCelda(titulo)).join(","),
      ...respuestas.map((r) => columnas.map(([, f]) => csvCelda(f(r))).join(",")),
    ];
    // BOM al principio para que Excel abra bien las tildes.
    const blob = new Blob(["\uFEFF" + lineas.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "encuesta-prestadores-oficy.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  if (cargando) return <p className="text-ink/60">Cargando...</p>;
  if (error) return <p className="text-red-700 dark:text-red-400 text-sm">{error}</p>;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center gap-3 flex-wrap">
        <div className="flex gap-6">
          <div>
            <p className="font-display text-3xl text-ink">{total}</p>
            <p className="text-xs text-ink/50">respuestas</p>
          </div>
          <div>
            <p className="font-display text-3xl text-ink">{interesados.length}</p>
            <p className="text-xs text-ink/50">quieren probarla</p>
          </div>
        </div>
        <button
          onClick={descargarCsv}
          disabled={total === 0}
          className="text-sm border border-copper/30 text-copper rounded px-3 py-1.5 hover:bg-copper/5 transition-colors disabled:opacity-40"
        >
          Descargar CSV
        </button>
      </div>

      {total === 0 ? (
        <p className="text-ink/50 text-sm">Todavía no hay respuestas. El link para compartir es /encuesta.</p>
      ) : (
        <>
          <section className="grid gap-4 md:grid-cols-2">
            <Grafico titulo="Rubros" datos={contar(respuestas.flatMap((r) => r.rubros))} total={total} />
            <Grafico titulo="Antigüedad en el rubro" datos={contar(respuestas.map((r) => r.antiguedad))} total={total} />
            <Grafico titulo="Cómo consiguen trabajo hoy" datos={contar(respuestas.flatMap((r) => r.canalesTrabajo))} total={total} />
            <Grafico titulo="Períodos sin trabajo" datos={contar(respuestas.map((r) => r.frecuenciaSinTrabajo))} total={total} />
            <Grafico titulo="¿Usarían una app así?" datos={contar(respuestas.map((r) => r.interesApp))} total={total} />
            <Grafico titulo="Qué valorarían más" datos={contar(respuestas.flatMap((r) => r.valorEsperado))} total={total} />
            <Grafico titulo="¿Pagarían comisión?" datos={contar(respuestas.map((r) => r.dispuestoComision))} total={total} />
            <Grafico titulo="Comisión que ven razonable" datos={contar(respuestas.map((r) => r.porcentajeComision))} total={total} />
          </section>

          <section>
            <h2 className="font-display text-lg text-ink mb-3">Cobros y garantía</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <Grafico titulo="Cómo prefieren que les pague el cliente" datos={contar(respuestas.map((r) => r.formaCobroPreferida))} total={total} />
              <Grafico titulo="Qué prefieren al terminar un trabajo" datos={contar(respuestas.map((r) => r.prioridadCobro))} total={total} />
              <Grafico titulo="Seña por la app" datos={contar(respuestas.map((r) => r.opinionSena))} total={total} />
              <Grafico titulo="Cómo pagarían la comisión" datos={contar(respuestas.map((r) => r.opinionPrepagoComision))} total={total} />
              <Grafico titulo="Garantía de Oficy con descuento al prestador" datos={contar(respuestas.map((r) => r.opinionGarantia))} total={total} />
              <Grafico titulo="Interés en probar Oficy" datos={contar(respuestas.map((r) => r.interesProbar))} total={total} />
            </div>
          </section>

          <section>
            <h2 className="font-display text-lg text-ink mb-3">Dudas y comentarios ({dudas.length})</h2>
            <ul className="flex flex-col gap-2">
              {dudas.length === 0 && <p className="text-ink/50 text-sm">Nadie escribió comentarios todavía.</p>}
              {dudas.map((r) => (
                <li key={r.id} className="bg-surface border border-ink/10 rounded-lg p-3 text-sm text-ink/80">
                  {r.dudas}
                  <span className="block text-xs text-ink/40 mt-1">
                    {r.nombre ?? "Sin nombre"} · {r.rubros.join(", ")} · {new Date(r.creadoEn).toLocaleDateString("es-AR")}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <div className="flex justify-between items-center gap-3 flex-wrap mb-3">
              <h2 className="font-display text-lg text-ink">Contactos ({contactos.length})</h2>
              <div className="flex gap-1 bg-ink/5 rounded-lg p-1">
                {(
                  [
                    ["interesados", `Quieren probarla (${interesados.length})`],
                    ["sin_interes", `No por el momento (${sinInteres.length})`],
                    ["todos", `Todos (${conContacto.length})`],
                  ] as const
                ).map(([valor, etiqueta]) => (
                  <button
                    key={valor}
                    type="button"
                    onClick={() => setFiltroContactos(valor)}
                    className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                      filtroContactos === valor ? "bg-surface text-ink shadow-sm" : "text-ink/50 hover:text-ink"
                    }`}
                  >
                    {etiqueta}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2 flex-wrap mb-3">
              <input
                type="search"
                placeholder="Buscar por nombre, WhatsApp o localidad"
                className="border border-ink/20 rounded p-1.5 text-sm flex-1 min-w-[220px] bg-paper"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
              <select
                className="border border-ink/20 rounded p-1.5 text-sm bg-paper text-ink"
                value={filtroRubro}
                onChange={(e) => setFiltroRubro(e.target.value)}
                aria-label="Filtrar por rubro"
              >
                <option value="">Todos los rubros</option>
                {rubrosDisponibles.map((rubro) => (
                  <option key={rubro} value={rubro}>
                    {rubro}
                  </option>
                ))}
                <option value="__otro">Otro rubro (escrito a mano)</option>
              </select>
            </div>
            <p className="text-xs text-ink/50 mb-2">Tocá a una persona para ver todas sus respuestas.</p>
            <ul className="flex flex-col gap-2">
              {contactos.length === 0 && <p className="text-ink/50 text-sm">No hay contactos que coincidan.</p>}
              {contactos.map((r) => (
                <li
                  key={r.id}
                  className={`bg-surface border rounded-lg p-3 transition-colors ${abierta === r.id ? "border-copper/50" : "border-ink/10"}`}
                >
                  <div className="flex justify-between items-center gap-3 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setAbierta(abierta === r.id ? null : r.id)}
                      aria-expanded={abierta === r.id}
                      className="text-left flex-1 min-w-0 group"
                    >
                      <p className="font-medium text-ink text-sm group-hover:text-copper transition-colors">
                        <span className="inline-block w-4 text-ink/40">{abierta === r.id ? "−" : "+"}</span>
                        {r.nombre}{" "}
                        <span className="text-ink/50 font-normal">
                          · {[...r.rubros.filter((x) => x !== "Otro" || !r.rubroOtro), ...(r.rubroOtro ? [r.rubroOtro] : [])].join(", ")}
                        </span>
                      </p>
                      <p className="text-xs text-ink/50 pl-4">
                        {r.interesProbar} · {r.localidad ?? "—"} · {new Date(r.creadoEn).toLocaleDateString("es-AR")}
                      </p>
                    </button>
                    <a
                      href={`https://wa.me/${(r.whatsApp ?? "").replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-copper hover:underline border border-copper/30 rounded px-2 py-1"
                    >
                      {r.whatsApp}
                    </a>
                  </div>
                  {abierta === r.id && <FichaRespuesta r={r} />}
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}
