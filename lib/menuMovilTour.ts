// Bus mínimo (eventos de window) para que el tutorial de onboarding (Joyride, en
// TourOnboarding.tsx) le pida al Navbar que abra o cierre su menú hamburguesa de mobile.
// En pantallas angostas, los links a los que apunta el tour (Buscar, Explorar, Mensajes, Mis
// órdenes, Mi cuenta, Agenda) viven escondidos dentro de ese menú — sin abrirlo primero, Joyride
// no tiene un elemento visible sobre el cual calcular dónde dibujar el spotlight y el tooltip.
const EVENTO_ABRIR = "fixit:tour-abrir-menu-movil";
const EVENTO_CERRAR = "fixit:tour-cerrar-menu-movil";

export function pedirAbrirMenuMovil() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(EVENTO_ABRIR));
}

export function pedirCerrarMenuMovil() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(EVENTO_CERRAR));
}

// Devuelve una función de limpieza, pensada para usarse directo como return de un useEffect.
export function suscribirseAMenuMovilTour(alAbrir: () => void, alCerrar: () => void): () => void {
  window.addEventListener(EVENTO_ABRIR, alAbrir);
  window.addEventListener(EVENTO_CERRAR, alCerrar);
  return () => {
    window.removeEventListener(EVENTO_ABRIR, alAbrir);
    window.removeEventListener(EVENTO_CERRAR, alCerrar);
  };
}
