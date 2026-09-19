"use client";

import { useEffect, useState } from "react";
import { aplicarTema, obtenerTemaActual, Tema } from "@/lib/theme";

// Ícono sol/luna animado (máscara SVG para el "mordisco" que forma la luna), reusado por la fila
// del menú mobile (ver ThemeToggleMenuMovil) y por el toggle del Footer (ver ThemeToggleFooter).
function IconoSolLuna({ esOscuro, size = 30 }: { esOscuro: boolean; size?: number }) {
  // Sin color propio: toma "currentColor" del elemento que lo envuelve (el botón), para que el
  // hover de color se pueda controlar desde afuera en vez de quedar fijo acá adentro.
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className="transition-colors duration-200">
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
  );
}

function useTemaToggle() {
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

  return { tema, alternar };
}

// Fila para el menú mobile (drawer del Navbar): en pantallas angostas el botón flotante de abajo
// a la derecha quedaba tapando el botón "Enviar" del chat, así que en mobile el control de tema
// vive acá adentro en vez de flotar (ver Navbar.tsx) — en escritorio sigue siendo el flotante de
// más abajo.
export function ThemeToggleMenuMovil() {
  const { tema, alternar } = useTemaToggle();
  if (tema === null) return null;
  const esOscuro = tema === "oscuro";

  return (
    <button
      type="button"
      onClick={alternar}
      className="py-3 flex items-center gap-2.5 text-left text-on-nav/90 hover:text-safety transition-colors"
    >
      <IconoSolLuna esOscuro={esOscuro} size={18} />
      {esOscuro ? "Modo claro" : "Modo oscuro"}
    </button>
  );
}

// Toggle para el Footer (ver Footer.tsx): reemplaza al viejo botón flotante fijo abajo a la
// derecha, que en mobile terminaba tapando el botón "Enviar" del chat. Al vivir en el flujo
// normal del documento (no fixed), el Footer no tapa nada en ninguna pantalla — pero en mobile
// el menú hamburguesa YA tiene su propio toggle (ThemeToggleMenuMovil, arriba), así que mostrar
// también este acá duplicaba el botón. Por eso es "hidden md:flex": en mobile queda solo el del
// menú, y en escritorio (donde el Navbar no tiene ningún toggle propio) sigue viviendo acá.
export function ThemeToggleFooter() {
  const { tema, alternar } = useTemaToggle();
  if (tema === null) return null;
  const esOscuro = tema === "oscuro";

  return (
    <button
      type="button"
      onClick={alternar}
      aria-label={esOscuro ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
      className="hidden md:flex items-center gap-1.5 hover:text-copper transition-colors"
    >
      <IconoSolLuna esOscuro={esOscuro} size={14} />
      {esOscuro ? "Modo claro" : "Modo oscuro"}
    </button>
  );
}
