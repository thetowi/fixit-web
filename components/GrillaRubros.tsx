"use client";

import { useEffect, useRef, useState } from "react";
import { Categoria } from "@/types/categorias";
import IconoLucide from "@/components/IconoLucide";

// Grilla de "Rubros disponibles" de la landing (26/09, a pedido del usuario: "tenemos que sacar
// las tarjetas desordenadas" — reemplaza la animación anterior tipo "rompecabezas" con piezas
// dispersas/rotadas atadas al scroll). Ahora es el enfoque simple que pasó el usuario: cada tarjeta
// arranca invisible y corrida hacia abajo (`translateY`), y cuando la grilla entra en pantalla se
// activan todas en cadena, una por una, con un `setTimeout` escalonado (180ms entre cada una) —
// un solo IntersectionObserver sobre el contenedor completo, no uno por tarjeta, y se dispara una
// única vez (se desconecta apenas entra en pantalla, no vuelve a animar si se hace scroll de nuevo).
// Solo corre en mobile (`esMobil`, breakpoint 767px) — en desktop las tarjetas están directo en su
// posición final, sin nada de esto.
const BREAKPOINT_MOBILE = "(max-width: 767px)";
const DISTANCIA_INICIAL_PX = 60; // cuánto más abajo arranca cada tarjeta (ver nota del usuario: "si preferís algo más sutil, usá 60px" en vez de 100vh)
const DEMORA_ENTRE_ITEMS_MS = 180;
const UMBRAL_INTERSECCION = 0.2;

export default function GrillaRubros({ categorias }: { categorias: Categoria[] }) {
  const [esMobil, setEsMobil] = useState<boolean | null>(null);
  const [visibles, setVisibles] = useState<boolean[]>([]);
  const contenedorRef = useRef<HTMLDivElement>(null);
  const yaAnimoRef = useRef(false);

  useEffect(() => {
    const mq = window.matchMedia(BREAKPOINT_MOBILE);
    setEsMobil(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setEsMobil(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  // En desktop (o mientras no sabemos el tamaño de pantalla) todas las tarjetas quedan visibles
  // de entrada, sin animación.
  useEffect(() => {
    if (esMobil === false) {
      setVisibles(categorias.map(() => true));
    } else if (esMobil === true && !yaAnimoRef.current) {
      setVisibles(categorias.map(() => false));
    }
  }, [esMobil, categorias]);

  useEffect(() => {
    if (!esMobil || yaAnimoRef.current) return;
    const nodo = contenedorRef.current;
    if (!nodo || categorias.length === 0) return;

    const timeouts: ReturnType<typeof setTimeout>[] = [];

    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        yaAnimoRef.current = true;
        categorias.forEach((_, i) => {
          const t = setTimeout(() => {
            setVisibles((prev) => {
              const siguiente = [...prev];
              siguiente[i] = true;
              return siguiente;
            });
          }, i * DEMORA_ENTRE_ITEMS_MS);
          timeouts.push(t);
        });
        io.disconnect();
      },
      { threshold: UMBRAL_INTERSECCION }
    );

    io.observe(nodo);
    return () => {
      io.disconnect();
      timeouts.forEach(clearTimeout);
    };
  }, [esMobil, categorias]);

  return (
    <div ref={contenedorRef} className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
      {categorias.map((c, i) => {
        const activo = visibles[i] ?? !esMobil;

        return (
          <div
            key={c.id}
            style={{
              opacity: activo ? 1 : 0,
              transform: activo ? "none" : `translateY(${DISTANCIA_INICIAL_PX}px)`,
              transition: "transform 0.7s cubic-bezier(.22,1,.36,1), opacity 0.5s ease",
            }}
            className="group relative overflow-hidden bg-surface border border-ink/10 rounded-lg p-5 flex flex-col items-center gap-2 cursor-default transition-colors hover:border-copper"
          >
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-copper origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300 ease-[cubic-bezier(.65,0,.35,1)]"
            />
            <IconoLucide
              nombre={c.icono}
              size={26}
              strokeWidth={1.75}
              className="relative z-10 text-copper transition-transform duration-300 group-hover:scale-110 group-hover:text-paper"
            />
            <span className="relative z-10 font-medium text-ink text-sm text-center transition-colors duration-300 group-hover:text-paper">
              {c.nombre}
            </span>
          </div>
        );
      })}
    </div>
  );
}
