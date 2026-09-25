"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

export interface PreguntaFrecuente {
  pregunta: string;
  respuesta: string;
}

// Acordeón de preguntas frecuentes (25/09) — pensado para la landing publicitaria, genera
// confianza sin necesitar ningún dato nuevo del backend. Genérico a propósito (recibe las
// preguntas por props) por si más adelante se reusa en otro lado.
export default function FaqAcordeon({ preguntas }: { preguntas: PreguntaFrecuente[] }) {
  const [abiertaIdx, setAbiertaIdx] = useState<number | null>(0);

  return (
    <div className="flex flex-col gap-2">
      {preguntas.map((p, i) => {
        const abierta = abiertaIdx === i;
        return (
          <div key={i} className="bg-surface border border-ink/10 rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => setAbiertaIdx(abierta ? null : i)}
              aria-expanded={abierta}
              className="w-full flex items-center justify-between gap-4 text-left px-5 py-4 hover:bg-ink/[0.02] transition-colors"
            >
              <span className="font-medium text-ink text-sm">{p.pregunta}</span>
              <ChevronDown
                size={18}
                className={`shrink-0 text-ink/50 transition-transform duration-200 ${abierta ? "rotate-180" : ""}`}
              />
            </button>
            <div
              className={`grid transition-all duration-200 ease-in-out ${
                abierta ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
              }`}
            >
              <div className="overflow-hidden">
                <p className="px-5 pb-4 text-sm text-ink/65 leading-relaxed">{p.respuesta}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
