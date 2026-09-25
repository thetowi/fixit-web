"use client";

import { useEffect, useState } from "react";
import { Wrench, CircleDollarSign, CheckCircle2, CalendarCheck2 } from "lucide-react";

// Mockup de chat "en vivo" para el hero de la landing (25/09, a pedido del usuario: "que se vayan
// mandando mensajes... como medio en vivo"). Antes esto era una tarjeta estática que mostraba
// todo de una — ahora simula la secuencia completa de un pedido real: mensaje del cliente,
// respuesta + presupuesto del prestador, la oferta formal, el pago retenido (que además "pinta"
// la oferta de arriba como pagada, en verde) y el turno ya agendado, cada uno apareciendo con una
// pausa. Es 100% decorativo, no llama al backend. Al terminar hace una pausa y vuelve a arrancar
// en loop, mismo criterio que TrabajoEnCursoPreview.tsx.
//
// Importante (25/09, a pedido del usuario: "no tiene que modificar el tamaño del div"): los 5
// bloques están SIEMPRE montados en el DOM — nunca se agregan/sacan condicionalmente — y lo que
// cambia es su opacidad/posición. Así la tarjeta reserva desde el vamos el alto total que va a
// ocupar con todo visible, y no "salta" de tamaño a medida que van apareciendo los mensajes.
const DEMORAS_PASO = [600, 1500, 1500, 1200, 1300]; // ms entre cada paso que aparece
const PAUSA_FINAL = 3200; // ms que queda todo mostrado antes de reiniciar el loop

function claseAparecer(visible: boolean) {
  return `transition-all duration-300 ease-out ${
    visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 pointer-events-none"
  }`;
}

export default function ChatEnVivoPreview() {
  const [paso, setPaso] = useState(0);

  useEffect(() => {
    let cancelado = false;
    let timeoutId: ReturnType<typeof setTimeout>;

    function avanzar(pasoActual: number) {
      const demora = DEMORAS_PASO[pasoActual] ?? PAUSA_FINAL;
      timeoutId = setTimeout(() => {
        if (cancelado) return;
        const siguiente = pasoActual + 1;
        if (siguiente > DEMORAS_PASO.length) {
          setPaso(0);
          avanzar(0);
        } else {
          setPaso(siguiente);
          avanzar(siguiente);
        }
      }, demora);
    }

    avanzar(0);
    return () => {
      cancelado = true;
      clearTimeout(timeoutId);
    };
  }, []);

  const pagado = paso >= 4;

  return (
    <div className="bg-surface border border-ink/10 rounded-2xl shadow-xl shadow-ink/5 overflow-hidden">
      <div className="bg-ink px-4 py-3 flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-copper flex items-center justify-center text-paper shrink-0">
          <Wrench size={15} strokeWidth={2} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-paper text-sm font-medium leading-tight">Martín G.</p>
          <p className="text-paper/50 text-[11px] leading-tight">Plomería · Verificado</p>
        </div>
        <div className="flex items-center gap-1.5 bg-white/10 rounded-full py-1 pl-2 pr-2.5 shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[9px] font-semibold tracking-wider text-paper/85">EN VIVO</span>
        </div>
      </div>

      <div className="p-4 flex flex-col gap-2.5 bg-paper">
        <div className={`${claseAparecer(paso >= 1)} self-start max-w-[85%] bg-surface border border-ink/10 rounded-xl rounded-tl-sm px-3.5 py-2.5`}>
          <p className="text-sm text-ink">
            Hola! Se me rompió una canilla y pierde agua, ¿podés pasar mañana?
          </p>
        </div>

        <div className={`${claseAparecer(paso >= 2)} self-end max-w-[85%] bg-copper text-paper rounded-xl rounded-tr-sm px-3.5 py-2.5`}>
          <p className="text-sm">Sí, puedo pasar a las 17hs. Presupuesto: $8.000 con materiales incluidos.</p>
        </div>

        {/* Oferta del prestador: pasa a verde/"pagada" apenas aparece el pago retenido (paso 4),
            sin que la tarjeta cambie de alto — solo cambian colores e ícono. */}
        <div
          className={`${claseAparecer(paso >= 3)} self-center flex items-center gap-2 text-xs rounded-lg px-3 py-2 border transition-colors duration-300 ${
            pagado ? "bg-stamp/15 border-stamp/30 text-stamp" : "bg-safety/15 border-safety/30 text-ink"
          }`}
        >
          {pagado ? (
            <CheckCircle2 size={14} className="text-stamp shrink-0" />
          ) : (
            <CircleDollarSign size={14} className="text-copper shrink-0" />
          )}
          <span>
            {pagado ? "Oferta pagada" : "Oferta del prestador"}: <strong>$8.000</strong>
          </span>
        </div>

        <div className={`${claseAparecer(paso >= 4)} self-center bg-safety/20 text-ink/70 text-xs rounded-full px-3 py-1`}>
          Pago retenido hasta completar el trabajo
        </div>

        <div className={`${claseAparecer(paso >= 5)} self-stretch flex items-center gap-2.5 bg-surface border border-copper/30 rounded-xl px-3.5 py-2.5`}>
          <span className="w-8 h-8 rounded-lg bg-copper/10 flex items-center justify-center shrink-0">
            <CalendarCheck2 size={16} className="text-copper" strokeWidth={1.8} />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-ink">Turno agendado para mañana</p>
            <p className="text-[11px] text-ink/50">Arreglo canilla · 17:00hs</p>
          </div>
        </div>
      </div>
    </div>
  );
}
