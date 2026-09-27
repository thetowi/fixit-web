// Helpers de navegación para el split de dominios oficy.ar / app.oficy.ar (27-28/09, ver
// middleware.ts para el resto del contexto).
const SUBDOMINIO_APP = "app.oficy.ar";
const DOMINIO_PRINCIPAL = "oficy.ar";

type RouterMinimo = {
  push: (href: string) => void;
  replace: (href: string) => void;
};

// Navega al dashboard operativo del usuario logueado, sea cual sea el host actual en el que
// estemos parados:
// - En app.oficy.ar (producción): el dashboard ya es "/" (hay un rewrite interno a "/app" en
//   middleware.ts), así que alcanza con un push/replace común, sin ensuciar la URL con "/app".
// - En oficy.ar (producción — ej. la landing detectando que ya hay una sesión iniciada): cruzar
//   de dominio con router.push/replace de Next ROMPE ("Redirect is not allowed for a preflight
//   request", ver middleware.ts) porque el fetch interno que arma el router para traer el RSC no
//   puede seguir una redirección a otro origen. Por eso acá hace falta una navegación de verdad
//   (cambiar window.location), no una del router.
// - En cualquier otro host (desarrollo local, previews de Vercel): no hay subdominios — el
//   middleware no actúa ahí — así que el dashboard sigue siendo la ruta "/app" de siempre.
export function irAlDashboard(router: RouterMinimo, modo: "push" | "replace" = "push") {
  if (typeof window === "undefined") return;
  const host = window.location.hostname;

  if (host === SUBDOMINIO_APP) {
    router[modo]("/");
    return;
  }

  if (host === DOMINIO_PRINCIPAL) {
    window.location.href = `https://${SUBDOMINIO_APP}/`;
    return;
  }

  router[modo]("/app");
}
