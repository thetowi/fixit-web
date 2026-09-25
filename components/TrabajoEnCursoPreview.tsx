"use client";

import { useEffect, useState } from "react";
import { Wrench } from "lucide-react";

// Vista previa animada de la pantalla "Trabajo en curso" (25/09, a pedido del usuario: "que se
// vea como lo visualizaría un usuario") para la landing publicitaria — muestra el mismo look de
// TrabajoEnCursoOverlay.tsx (los anillos que pulsan, la herramienta que se mece, el timer en
// vivo) pero achicado a tamaño de tarjeta y con datos de ejemplo fijos, así alguien que todavía
// no se registró puede ver de entrada qué se siente tener un trabajo en curso, sin tener que
// explicarlo con texto. No usa datos reales ni llama al backend — es 100% decorativo.
function useTimerDemo() {
  // Arranca en 37s (no en 00:00) a propósito, para que se vea como un trabajo que ya está en
  // marcha desde hace un rato, no uno que recién empieza.
  const [segundos, setSegundos] = useState(37);
  useEffect(() => {
    const intervalo = setInterval(() => setSegundos((s) => s + 1), 1000);
    return () => clearInterval(intervalo);
  }, []);
  const minutos = Math.floor(segundos / 60).toString().padStart(2, "0");
  const restoSegundos = (segundos % 60).toString().padStart(2, "0");
  return `${minutos}:${restoSegundos}`;
}

export default function TrabajoEnCursoPreview() {
  const tiempo = useTimerDemo();

  return (
    <div className="w-full max-w-[280px] mx-auto rounded-[28px] border border-ink/10 bg-ink text-paper overflow-hidden shadow-xl shadow-ink/10">
      <style jsx>{`
        @keyframes fixitPulseRingDemo {
          0% {
            transform: scale(0.82);
            opacity: 0.55;
          }
          70% {
            transform: scale(1.45);
            opacity: 0;
          }
          100% {
            opacity: 0;
          }
        }
        @keyframes fixitRockToolDemo {
          0%,
          100% {
            transform: rotate(-14deg);
          }
          50% {
            transform: rotate(14deg);
          }
        }
        .fixit-ring-demo {
          animation: fixitPulseRingDemo 2.6s ease-out infinite;
        }
        .fixit-ring-demo-2 {
          animation-delay: 1.3s;
        }
        .fixit-tool-demo {
          animation: fixitRockToolDemo 2.4s ease-in-out infinite;
          transform-origin: 50% 50%;
        }
      `}</style>

      <div className="flex items-center justify-between px-4 pt-4">
        <div className="flex items-center gap-2 bg-white/10 rounded-full py-1 pl-2 pr-3">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[10px] font-semibold tracking-wider opacity-85">EN VIVO</span>
        </div>
        <span className="text-[10px] text-paper/40">Vista previa</span>
      </div>

      <div className="flex flex-col items-center gap-5 px-6 py-8">
        <div className="relative flex items-center justify-center" style={{ width: 108, height: 108 }}>
          <div className="fixit-ring-demo absolute inset-0 rounded-full border-2 border-[#C9703F]" />
          <div className="fixit-ring-demo fixit-ring-demo-2 absolute inset-0 rounded-full border-2 border-[#C9703F]" />
          <div
            className="relative rounded-full flex items-center justify-center"
            style={{ width: 68, height: 68, background: "linear-gradient(155deg, #D2824F 0%, #A85F35 100%)" }}
          >
            <Wrench className="fixit-tool-demo" size={30} color="#12151b" strokeWidth={1.8} />
          </div>
        </div>

        <div className="flex flex-col items-center gap-1 text-center">
          <p className="text-base font-bold">Trabajo en curso</p>
          <p className="text-xs text-paper/60">Plomería · con Martín G.</p>
        </div>

        <div className="flex flex-col items-center gap-0.5">
          <span className="font-mono text-3xl font-semibold tabular-nums">{tiempo}</span>
          <span className="text-[10px] tracking-wider text-paper/45 uppercase">Tiempo transcurrido</span>
        </div>
      </div>
    </div>
  );
}
