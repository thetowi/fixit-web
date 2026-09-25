"use client";

import { useEffect, useRef, useState } from "react";

// Contador animado (25/09, a pedido del usuario para la barra de estadísticas de la landing:
// "que tenga una animacion cuando llegas, que vaya de 0 hasta donde llegue el numero"). Usa
// IntersectionObserver para arrancar recién cuando la sección entra en pantalla (no al montar,
// que puede pasar fuera de vista) y requestAnimationFrame para animar el conteo de 0 al valor
// real con un ease-out, una sola vez.
export default function ContadorAnimado({
  valor,
  duracionMs = 1500,
  formatear = (n: number) => n.toLocaleString("es-AR"),
  className = "",
}: {
  valor: number;
  duracionMs?: number;
  formatear?: (n: number) => string;
  className?: string;
}) {
  const [mostrado, setMostrado] = useState(0);
  const contenedorRef = useRef<HTMLParagraphElement>(null);
  const yaAnimoRef = useRef(false);

  useEffect(() => {
    const nodo = contenedorRef.current;
    if (!nodo) return;

    const observador = new IntersectionObserver(
      ([entrada]) => {
        if (!entrada.isIntersecting || yaAnimoRef.current) return;
        yaAnimoRef.current = true;
        observador.disconnect();

        const inicio = performance.now();
        const desde = 0;
        const hasta = valor;

        function paso(ahora: number) {
          const progreso = Math.min((ahora - inicio) / duracionMs, 1);
          // Ease-out cúbico: arranca rápido y frena suave al llegar al número final.
          const suavizado = 1 - Math.pow(1 - progreso, 3);
          setMostrado(Math.round(desde + (hasta - desde) * suavizado));
          if (progreso < 1) requestAnimationFrame(paso);
        }

        requestAnimationFrame(paso);
      },
      { threshold: 0.3 }
    );

    observador.observe(nodo);
    return () => observador.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valor]);

  return (
    <p ref={contenedorRef} className={className}>
      {formatear(mostrado)}
    </p>
  );
}
