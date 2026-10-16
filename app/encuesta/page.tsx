"use client";

// Encuesta pública para profesionales de oficio (16/10, a pedido del usuario: "una especie de
// encuesta en alguna parte de nuestra página, para poder empezar a ver devoluciones de la gente").
// Rediseñada el mismo día a partir de un mockup aprobado: UNA pregunta por pantalla, las de
// elección única saltan solas a la siguiente, sin emojis (a pedido del usuario: "no me parece
// profesional"), y los datos de contacto se piden al final a todos — también a quien responde que
// no quiere probar la app. Es una página SIN login (la responden prestadores que todavía no están
// en Oficy) y manda todo a POST /api/publico/encuesta-prestadores. Las preguntas de cobro/garantía
// sirven para decidir el modelo de pagos con datos reales — ver
// claude/analisis-hold-escrow-argentina-06-10.md.

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { apiFetch, ApiError } from "@/lib/api";

type Pregunta =
  | { id: string; seccion: string; tipo: "single"; titulo: string; ayuda?: string; nota?: string; opciones: string[] }
  | { id: string; seccion: string; tipo: "multi"; titulo: string; ayuda?: string; nota?: string; opciones: string[]; max?: number; obligatoria?: boolean; otro: string }
  | { id: string; seccion: string; tipo: "texto"; titulo: string; ayuda?: string; nota?: string };

const NO_POR_AHORA = "No por el momento";

const PREGUNTAS: Pregunta[] = [
  {
    id: "rubros", seccion: "Sobre vos", tipo: "multi", obligatoria: true, otro: "Otro rubro",
    titulo: "¿A qué rubro te dedicás?", ayuda: "Podés elegir más de uno.",
    opciones: ["Electricidad", "Plomería", "Gas", "Pintura", "Albañilería", "Cerrajería", "Jardinería", "Refrigeración / Aire acondicionado", "Carpintería", "Mecánica"],
  },
  {
    id: "antiguedad", seccion: "Sobre vos", tipo: "single",
    titulo: "¿Hace cuánto trabajás en este rubro?",
    opciones: ["Menos de 1 año", "1 a 3 años", "3 a 5 años", "5 a 10 años", "Más de 10 años"],
  },
  {
    id: "canalesTrabajo", seccion: "Cómo trabajás hoy", tipo: "multi", otro: "Otro canal",
    titulo: "¿Cómo conseguís actualmente la mayoría de tus trabajos?", ayuda: "Podés elegir más de uno.",
    opciones: ["Recomendaciones de clientes", "Familiares y conocidos", "Redes sociales", "WhatsApp", "Publicaciones en grupos", "Publicidad", "Plataformas o apps"],
  },
  {
    id: "frecuenciaSinTrabajo", seccion: "Cómo trabajás hoy", tipo: "single",
    titulo: "¿Te pasa que tenés períodos en los que cuesta conseguir nuevos trabajos?",
    opciones: ["Sí, frecuentemente", "Sí, algunas veces", "Muy pocas veces", "No, generalmente tengo trabajo"],
  },
  {
    id: "interesApp", seccion: "La aplicación", tipo: "single",
    titulo: "Si existiera una aplicación donde personas de tu zona publican trabajos y vos podés tomarlos, ¿te interesaría usarla?",
    opciones: ["Sí, definitivamente", "Sí, probablemente", "No estoy seguro/a", "Probablemente no", "No"],
  },
  {
    id: "valorEsperado", seccion: "La aplicación", tipo: "multi", max: 3, otro: "Otra cosa",
    titulo: "¿Qué sería lo que más valorarías de una aplicación así?", ayuda: "Elegí hasta 3.",
    opciones: [
      "Conseguir trabajos cerca de mi ubicación", "Conseguir nuevos clientes", "Tener más continuidad de trabajos",
      "Dar a conocer mi perfil y experiencia", "Mostrar mis trabajos realizados", "Construir una reputación y calificaciones",
      "Contactarme fácil con clientes", "Conseguir trabajos de mayor valor",
    ],
  },
  {
    id: "dispuestoComision", seccion: "Comisión", tipo: "single",
    titulo: "Oficy cobraría una pequeña comisión solo cuando un trabajo se concreta por la plataforma. ¿Estarías dispuesto/a a pagarla a cambio de conseguir nuevos trabajos?",
    opciones: ["Sí", "Sí, dependiendo del porcentaje", "No estoy seguro/a", "No"],
  },
  {
    id: "porcentajeComision", seccion: "Comisión", tipo: "single",
    titulo: "¿Qué porcentaje de comisión te parecería razonable por un trabajo conseguido por la plataforma?",
    opciones: ["De 0% a 5%", "De 5% a 10%", "De 10% a 15%", "Más del 15%"],
  },
  {
    id: "formaCobroPreferida", seccion: "Cobros y garantía", tipo: "single",
    nota: "Todavía estamos definiendo cómo van a funcionar los pagos. No hay respuestas buenas ni malas: queremos saber qué te resultaría más cómodo.",
    titulo: "¿Cómo preferís que te pague el cliente?",
    opciones: ["Transferencia bancaria", "Mercado Pago u otra billetera virtual", "Efectivo", "Tarjeta, pagada por el cliente en la app", "Depende del trabajo"],
  },
  {
    id: "prioridadCobro", seccion: "Cobros y garantía", tipo: "single",
    // Reescrita el 16/10 (el usuario: "esta pregunta y respuestas están raras"): ahora contrapone
    // las dos opciones reales en palabras simples — cobrar en el momento vs. pago asegurado por la
    // app que llega unos días después.
    titulo: "Cuando terminás un trabajo, ¿qué preferís?",
    opciones: [
      "Cobrar en el momento, directo del cliente",
      "Que el cliente pague antes por la app y me llegue unos días después, con el pago asegurado",
      "Me da igual, mientras cobre",
    ],
  },
  {
    id: "opinionSena", seccion: "Cobros y garantía", tipo: "single",
    titulo: "Para asegurar que el cliente confirme, podría dejar una seña chica por la app (por ejemplo, el 20%) y el resto te lo paga directo al terminar. ¿Qué te parece?",
    opciones: ["Me da más seguridad, me gusta", "Me da igual", "Prefiero cobrar todo al final", "Haría que algunos clientes no contraten"],
  },
  {
    id: "opinionPrepagoComision", seccion: "Cobros y garantía", tipo: "single",
    titulo: "Si el cliente te paga todo directo a vos, ¿cómo preferirías pagarle la comisión a Oficy?",
    opciones: [
      "Cargar saldo y que se descuente en cada trabajo",
      "Que me descuenten la comisión del pago, aunque me llegue unos días después",
      "Pagar la comisión después, por transferencia, cada semana o mes",
      "Me da igual",
      "No me convence",
    ],
  },
  {
    id: "opinionGarantia", seccion: "Cobros y garantía", tipo: "single",
    titulo: "Para dar confianza a los clientes, si hay un problema (por ejemplo, el trabajo quedó mal hecho o sin terminar), primero te damos un plazo para que lo soluciones y lo finalices correctamente. Si no se resuelve, Oficy le devolvería la plata al cliente y, si fue responsabilidad tuya, te lo descontaría de tu saldo o de trabajos futuros. ¿Qué opinás?",
    opciones: ["Me parece justo, si se revisa cada caso", "Me parece bien solo si hay mediación con una persona de Oficy", "No estaría de acuerdo", "No estoy seguro/a"],
  },
  {
    id: "dudas", seccion: "Para cerrar", tipo: "texto",
    titulo: "¿Qué cosas te generarían dudas o te impedirían usar una aplicación de este tipo?",
    ayuda: "Por ejemplo: comisión, cantidad de trabajos, seguridad, pagos, clientes, privacidad.",
  },
  {
    id: "interesProbar", seccion: "Para cerrar", tipo: "single",
    titulo: "Si Oficy estuviera disponible pronto, ¿te interesaría registrarte como profesional para probarla?",
    opciones: ["Sí, quiero ser de los primeros", "Sí, me gustaría probarla", "Me gustaría recibir más información", NO_POR_AHORA],
  },
];

const TOTAL = PREGUNTAS.length;
const PASO_CONTACTO = TOTAL; // después de la última pregunta
const PASO_GRACIAS = TOTAL + 1;
const PASO_PORTADA = -1;
const DEMORA_SALTO_MS = 380; // se ve la opción marcada un instante antes de pasar a la siguiente

// Estilos de las transiciones entre preguntas (no hay un lugar mejor en globals.css para algo que
// solo usa esta página). Se respetan las preferencias de "reducir movimiento".
const ESTILOS = `
@keyframes enc-in { from { opacity: 0; transform: translateX(32px); } to { opacity: 1; transform: none; } }
@keyframes enc-in-back { from { opacity: 0; transform: translateX(-32px); } to { opacity: 1; transform: none; } }
@keyframes enc-check { to { stroke-dashoffset: 0; } }
.enc-slide { animation: enc-in .36s cubic-bezier(.2,.8,.2,1) both; }
.enc-slide.enc-back { animation-name: enc-in-back; }
.enc-check { stroke-dasharray: 30; stroke-dashoffset: 30; animation: enc-check .5s .15s ease-out forwards; }
@media (prefers-reduced-motion: reduce) { .enc-slide { animation: none; } .enc-check { animation: none; stroke-dashoffset: 0; } }
`;

type Valor = string | string[];

export default function EncuestaPage() {
  const [paso, setPaso] = useState(PASO_PORTADA);
  const [direccion, setDireccion] = useState<"adelante" | "atras">("adelante");
  const [resp, setResp] = useState<Record<string, Valor>>({});
  const [otros, setOtros] = useState<Record<string, string>>({});
  const [nombre, setNombre] = useState("");
  const [whatsApp, setWhatsApp] = useState("");
  const [localidad, setLocalidad] = useState("Paraná");
  const [website, setWebsite] = useState(""); // honeypot anti-bots
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bloqueado = useRef(false); // evita doble toque durante el salto automático

  const ir = useCallback((destino: number, dir: "adelante" | "atras" = "adelante") => {
    setDireccion(dir);
    setError(null);
    setPaso(destino);
    window.scrollTo({ top: 0, behavior: "smooth" });
    bloqueado.current = false;
  }, []);

  const pregunta = paso >= 0 && paso < TOTAL ? PREGUNTAS[paso] : null;

  function elegirUnica(p: Pregunta, opcion: string) {
    if (bloqueado.current) return;
    bloqueado.current = true;
    setResp((prev) => ({ ...prev, [p.id]: opcion }));
    window.setTimeout(() => ir(paso + 1), DEMORA_SALTO_MS);
  }

  function alternar(p: Extract<Pregunta, { tipo: "multi" }>, opcion: string) {
    setResp((prev) => {
      const actual = (prev[p.id] as string[] | undefined) ?? [];
      if (actual.includes(opcion)) return { ...prev, [p.id]: actual.filter((o) => o !== opcion) };
      if (p.max && actual.length >= p.max) return prev;
      return { ...prev, [p.id]: [...actual, opcion] };
    });
  }

  function multiValida(p: Extract<Pregunta, { tipo: "multi" }>) {
    const elegidas = (resp[p.id] as string[] | undefined) ?? [];
    return !p.obligatoria || elegidas.length > 0 || !!otros[p.id]?.trim();
  }

  const contactoValido = nombre.trim().length > 0 && whatsApp.replace(/\D/g, "").length >= 8;

  async function enviar() {
    if (!contactoValido) {
      setError("Para enviar la encuesta necesitamos tu nombre y un WhatsApp válido.");
      return;
    }
    setEnviando(true);
    setError(null);
    const lista = (id: string) => (resp[id] as string[] | undefined) ?? [];
    const texto = (id: string) => (resp[id] as string | undefined) ?? "";
    try {
      await apiFetch("/api/publico/encuesta-prestadores", {
        method: "POST",
        body: JSON.stringify({
          // "Otro rubro" sin ninguna opción tildada se manda como ["Otro"]: el backend exige al menos uno.
          rubros: lista("rubros").length > 0 ? lista("rubros") : ["Otro"],
          rubroOtro: otros.rubros ?? "",
          antiguedad: texto("antiguedad"),
          canalesTrabajo: lista("canalesTrabajo"),
          canalOtro: otros.canalesTrabajo ?? "",
          frecuenciaSinTrabajo: texto("frecuenciaSinTrabajo"),
          interesApp: texto("interesApp"),
          valorEsperado: lista("valorEsperado"),
          valorOtro: otros.valorEsperado ?? "",
          dispuestoComision: texto("dispuestoComision"),
          porcentajeComision: texto("porcentajeComision"),
          formaCobroPreferida: texto("formaCobroPreferida"),
          prioridadCobro: texto("prioridadCobro"),
          opinionSena: texto("opinionSena"),
          opinionPrepagoComision: texto("opinionPrepagoComision"),
          opinionGarantia: texto("opinionGarantia"),
          dudas: texto("dudas"),
          interesProbar: texto("interesProbar"),
          nombre,
          whatsApp,
          localidad,
          website,
        }),
      });
      ir(PASO_GRACIAS);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No pudimos enviar tus respuestas. Probá de nuevo en un rato.");
    } finally {
      setEnviando(false);
    }
  }

  // Atajos de teclado (en pantallas grandes): 1 a 9 eligen la opción, Enter continúa.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement | null)?.tagName?.toLowerCase();
      if (paso === PASO_PORTADA && e.key === "Enter") {
        ir(0);
        return;
      }
      if (tag === "input" || tag === "textarea") return;
      if (!pregunta) return;
      if (/^[1-9]$/.test(e.key) && pregunta.tipo !== "texto") {
        const opcion = pregunta.opciones[Number(e.key) - 1];
        if (!opcion) return;
        if (pregunta.tipo === "single") elegirUnica(pregunta, opcion);
        else alternar(pregunta, opcion);
      }
      if (e.key === "Enter") {
        if (pregunta.tipo === "multi" && multiValida(pregunta)) ir(paso + 1);
        if (pregunta.tipo === "texto") ir(paso + 1);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paso, resp, otros]);

  const campo = "border border-ink/20 rounded-lg p-3 text-base w-full bg-surface text-ink focus:outline-2 focus:outline-copper";
  const animacion = `enc-slide ${direccion === "atras" ? "enc-back" : ""}`;
  const progreso = paso < 0 ? 0 : Math.min(paso, TOTAL + 1) / (TOTAL + 1);

  return (
    <div className="max-w-xl mx-auto px-4 pt-12 sm:pt-20 w-full pb-24">
      <style>{ESTILOS}</style>

      {paso >= 0 && paso <= PASO_CONTACTO && (
        <div className="mb-8">
          <div
            className="h-[3px] bg-ink/10 rounded-full overflow-hidden"
            role="progressbar"
            aria-label="Progreso de la encuesta"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progreso * 100)}
          >
            <div className="h-full bg-copper transition-all duration-500" style={{ width: `${progreso * 100}%` }} />
          </div>
          <div className="flex justify-between items-center mt-2 min-h-6">
            <p className="font-mono text-[11px] tracking-widest text-copper uppercase">
              {pregunta ? `${pregunta.seccion}  -  ${paso + 1} de ${TOTAL}` : "Último paso"}
            </p>
            <button
              type="button"
              onClick={() => ir(paso === 0 ? PASO_PORTADA : paso - 1, "atras")}
              className="text-sm text-ink/60 hover:text-ink py-1"
            >
              Atrás
            </button>
          </div>
        </div>
      )}

      {/* ---- Portada ---- */}
      {paso === PASO_PORTADA && (
        <div key="portada" className={animacion}>
          <p className="font-mono text-xs tracking-widest text-copper uppercase mb-3">Encuesta para profesionales de oficio</p>
          <h1 className="font-display text-3xl text-ink mb-4">Ayudanos a construir Oficy</h1>
          <p className="text-ink/70 leading-relaxed mb-3">
            Somos una plataforma de Paraná que conecta profesionales de oficio con personas que necesitan hacer trabajos.
          </p>
          <p className="text-ink/70 leading-relaxed mb-8">
            Antes de lanzarla queremos conocer la opinión de quienes realmente trabajan en el rubro. Una pregunta por pantalla, unos 4 minutos.
          </p>
          <button
            type="button"
            onClick={() => ir(0)}
            className="bg-safety text-ink rounded px-6 py-3 font-medium hover:brightness-95 transition"
          >
            Empezar
          </button>
        </div>
      )}

      {/* ---- Pregunta ---- */}
      {pregunta && (
        <div key={pregunta.id} className={animacion}>
          {pregunta.nota && (
            <p className="border border-dashed border-ink/20 rounded-lg px-3 py-2.5 text-xs text-ink/60 leading-relaxed mb-4">
              {pregunta.nota}
            </p>
          )}
          <h2 className="font-display text-2xl text-ink leading-snug">{pregunta.titulo}</h2>
          {pregunta.ayuda && <p className="text-sm text-ink/60 mt-2 leading-relaxed">{pregunta.ayuda}</p>}

          {pregunta.tipo === "texto" ? (
            <>
              <textarea
                rows={5}
                maxLength={1500}
                className={`${campo} mt-5 resize-y`}
                placeholder="Escribí lo que quieras (opcional)"
                value={(resp[pregunta.id] as string | undefined) ?? ""}
                onChange={(e) => setResp((prev) => ({ ...prev, [pregunta.id]: e.target.value }))}
              />
              <div className="flex items-center gap-4 mt-4">
                <button
                  type="button"
                  onClick={() => ir(paso + 1)}
                  className="bg-safety text-ink rounded px-6 py-3 font-medium hover:brightness-95 transition"
                >
                  Continuar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setResp((prev) => ({ ...prev, [pregunta.id]: "" }));
                    ir(paso + 1);
                  }}
                  className="text-sm text-ink/60 underline underline-offset-4 hover:text-ink"
                >
                  Omitir
                </button>
              </div>
            </>
          ) : (
            <>
              <div
                className={`flex flex-col gap-2.5 mt-5 overflow-y-auto pr-0.5 pb-1 ${pregunta.tipo === "multi" ? "max-h-[44vh]" : "max-h-[58vh]"}`}
                role={pregunta.tipo === "multi" ? "group" : "radiogroup"}
              >
                {pregunta.opciones.map((opcion, idx) => {
                  const seleccionada =
                    pregunta.tipo === "multi"
                      ? ((resp[pregunta.id] as string[] | undefined) ?? []).includes(opcion)
                      : resp[pregunta.id] === opcion;
                  return (
                    <button
                      key={opcion}
                      type="button"
                      role={pregunta.tipo === "multi" ? "checkbox" : "radio"}
                      aria-checked={seleccionada}
                      onClick={() => (pregunta.tipo === "single" ? elegirUnica(pregunta, opcion) : alternar(pregunta, opcion))}
                      className={`flex items-center gap-3.5 text-left rounded-xl border px-4 py-3.5 text-[15px] font-medium leading-snug transition-colors ${
                        seleccionada
                          ? "border-copper bg-copper/10 text-ink"
                          : "border-ink/15 bg-surface text-ink hover:border-copper/60"
                      }`}
                    >
                      <span
                        className={`shrink-0 w-6 h-6 rounded-[5px] border flex items-center justify-center font-mono text-[11px] ${
                          seleccionada ? "bg-copper border-copper text-paper" : "border-ink/20 text-ink/60"
                        }`}
                      >
                        {idx < 9 ? idx + 1 : ""}
                      </span>
                      <span>{opcion}</span>
                    </button>
                  );
                })}
              </div>

              {pregunta.tipo === "multi" && (
                <>
                  <input
                    type="text"
                    maxLength={120}
                    className={`${campo} mt-3`}
                    placeholder={`${pregunta.otro} (opcional)`}
                    value={otros[pregunta.id] ?? ""}
                    onChange={(e) => setOtros((prev) => ({ ...prev, [pregunta.id]: e.target.value }))}
                  />
                  {pregunta.max && (
                    <p className="font-mono text-xs text-ink/60 mt-2.5">
                      {((resp[pregunta.id] as string[] | undefined) ?? []).length} de {pregunta.max} elegidas
                    </p>
                  )}
                  <div className="flex items-center gap-4 mt-4">
                    <button
                      type="button"
                      disabled={!multiValida(pregunta)}
                      onClick={() => ir(paso + 1)}
                      className="bg-safety text-ink rounded px-6 py-3 font-medium hover:brightness-95 transition disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Continuar
                    </button>
                    {!pregunta.obligatoria && (
                      <button
                        type="button"
                        onClick={() => {
                          setResp((prev) => ({ ...prev, [pregunta.id]: [] }));
                          ir(paso + 1);
                        }}
                        className="text-sm text-ink/60 underline underline-offset-4 hover:text-ink"
                      >
                        Omitir
                      </button>
                    )}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      )}

      {/* ---- Contacto (obligatorio para todos, también para quien no quiere probar la app) ---- */}
      {paso === PASO_CONTACTO && (
        <form
          key="contacto"
          className={animacion}
          onSubmit={(e) => {
            e.preventDefault();
            enviar();
          }}
        >
          {resp.interesProbar === NO_POR_AHORA ? (
            <>
              <h2 className="font-display text-2xl text-ink leading-snug">Dejanos tus datos por si más adelante querés saber más</h2>
              <p className="text-sm text-ink/60 mt-2 leading-relaxed">
                Te avisamos cuando Oficy esté disponible, sin compromiso. Usamos estos datos solo para eso.
              </p>
            </>
          ) : (
            <>
              <h2 className="font-display text-2xl text-ink leading-snug">Dejanos tus datos y te escribimos antes del lanzamiento</h2>
              <p className="text-sm text-ink/60 mt-2 leading-relaxed">
                Vas a ser de los primeros profesionales en formar parte de Oficy. Usamos estos datos solo para contactarte por esto.
              </p>
            </>
          )}
          <div className="flex flex-col gap-3 mt-5">
            <input type="text" maxLength={120} autoComplete="name" className={campo} placeholder="Nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} />
            <input type="tel" inputMode="tel" maxLength={25} autoComplete="tel" className={campo} placeholder="WhatsApp, con código de área" value={whatsApp} onChange={(e) => setWhatsApp(e.target.value)} />
            <input type="text" maxLength={120} className={campo} placeholder="Localidad" value={localidad} onChange={(e) => setLocalidad(e.target.value)} />
          </div>

          {/* Honeypot anti-bots: fuera de pantalla y sin foco; una persona nunca lo completa. */}
          <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
            <label>
              No completar este campo
              <input type="text" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
            </label>
          </div>

          {error && (
            <p role="alert" className="text-red-700 dark:text-red-400 text-sm mt-4">
              {error}
            </p>
          )}

          <div className="mt-5">
            <button
              type="submit"
              disabled={!contactoValido || enviando}
              className="bg-safety text-ink rounded px-6 py-3 font-medium hover:brightness-95 transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {enviando ? "Enviando..." : "Enviar respuestas"}
            </button>
          </div>
        </form>
      )}

      {/* ---- Gracias ---- */}
      {paso === PASO_GRACIAS && (
        <div key="gracias" className={animacion}>
          <span className="w-14 h-14 rounded-full bg-stamp flex items-center justify-center mb-5">
            <svg viewBox="0 0 24 24" className="w-7 h-7" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path className="enc-check" d="M5 12.5l4.5 4.5L19 7.5" />
            </svg>
          </span>
          <h1 className="font-display text-3xl text-ink mb-4">Gracias por ayudarnos</h1>
          <p className="text-ink/70 leading-relaxed mb-3">
            Estamos preparando el lanzamiento de Oficy y queremos arrancar con una comunidad de profesionales de confianza.
          </p>
          <p className="text-ink/70 leading-relaxed mb-6">
            {resp.interesProbar === NO_POR_AHORA
              ? "Te vamos a avisar por WhatsApp cuando Oficy esté disponible."
              : "Te vamos a escribir por WhatsApp antes del lanzamiento."}
          </p>
          <Link href="/" className="text-copper font-medium hover:underline">
            Conocer más sobre Oficy
          </Link>
        </div>
      )}
    </div>
  );
}
