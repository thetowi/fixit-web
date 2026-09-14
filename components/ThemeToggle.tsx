"use client";

import { useEffect, useState } from "react";
import { aplicarTema, obtenerTemaActual, Tema } from "@/lib/theme";

// Sol/luna animado (ícono con máscara SVG para el "mordisco" que forma la luna).
// Vive suelto, fijo abajo a la derecha de la pantalla — no es parte del Navbar
// ni de ningún contenedor, así que se monta una sola vez en app/layout.tsx.
export default function ThemeToggle() {
  // Arranca en null para no renderizar nada hasta saber el tema real: como el tema
  // se decide con un script inline antes de que React monte, el server-render y el
  // primer render del cliente podrían no coincidir si asumimos un valor de entrada.
  const [tema, setTema] = useState<Tema | null>(null);

  useEffect(() => {
    setTema(obtenerTemaActual());
  }, []);

  function alternar() {
    const nuevo: Tema = tema === "oscuro" ? "claro" : "oscuro";
    aplicarTema(nuevo);
    setTema(nuevo);
  }

  if (tema === null) return null;

  const esOscuro = tema === "oscuro";

  return (
    <button
      type="button"
      onClick={alternar}
      aria-label={esOscuro ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
      title={esOscuro ? "Modo claro" : "Modo oscuro"}
      className="fixed bottom-5 right-5 z-50 border-0 bg-transparent p-0 m-0 cursor-pointer"
    >
      <svg
        width="30"
        height="30"
        viewBox="0 0 24 24"
        className={
          esOscuro
            ? "text-white/60 hover:text-white/80 transition-colors duration-200"
            : "text-safety hover:text-copper transition-colors duration-200"
        }
        style={{ filter: "drop-shadow(0 1px 3px rgb(0 0 0 / 0.35))" }}
      >
        <defs>
          <mask id="fixit-theme-toggle-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            <circle
              r="6"
              cx="24"
              cy="10"
              fill="black"
              style={{
                transform: esOscuro ? "translateX(-30%)" : "translateX(0)",
                transformBox: "fill-box",
                transformOrigin: "center",
                transition: esOscuro
                  ? "transform .5s cubic-bezier(0.21, 0.17, 0.43, 1.43)"
                  : "transform .5s cubic-bezier(0.54, -0.42, 0.29, 1.3)",
              }}
            />
          </mask>
        </defs>
        <circle r="6" cx="12" cy="12" fill="currentColor" mask="url(#fixit-theme-toggle-mask)" />
        <g
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          style={{
            opacity: esOscuro ? 0 : 1,
            transition: esOscuro ? "opacity .2s linear" : "opacity .2s linear .2s",
          }}
        >
          <line x1="12" x2="12" y1="3" y2="1" />
          <line x1="21" x2="23" y1="12" y2="12" />
          <line x1="12" x2="12" y1="21" y2="23" />
          <line x1="1" x2="3" y1="12" y2="12" />
        </g>
        <g
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          transform="rotate(45 12 12)"
          style={{
            opacity: esOscuro ? 0 : 1,
            transition: esOscuro ? "opacity .2s linear" : "opacity .2s linear .2s",
          }}
        >
          <line x1="12" x2="12" y1="3" y2="1" />
          <line x1="21" x2="23" y1="12" y2="12" />
          <line x1="12" x2="12" y1="21" y2="23" />
          <line x1="1" x2="3" y1="12" y2="12" />
        </g>
      </svg>
    </button>
  );
}
