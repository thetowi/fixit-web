// Helpers de navegación para el split de dominios oficy.ar / app.oficy.ar (27-28/09, ver
// middleware.ts para el resto del contexto).
const SUBDOMINIO_APP = "app.oficy.ar";
const DOMINIO_PRINCIPAL = "oficy.ar";

type RouterMinimo = {
  push: (href: string) => void;
  replace: (href: string) => void;
};

// A qué ruta cae cada rol al loguearse (04/10, antes todos caían a "/app" sin importar el rol —
// un Admin tenía que escribir /admin a mano después de entrar). Devuelve la ruta "real" (la que
// existe como archivo bajo app/): para Admin y Tesorero es su panel propio, para el resto sigue
// siendo el dashboard de siempre.
function rutaDashboardPorRol(rol?: string): string {
  if (rol === "Admin") return "/admin";
  if (rol === "Tesorero") return "/tesoreria";
  return "/app";
}

// Navega al dashboard operativo del usuario logueado, sea cual sea el host actual en el que
// estemos parados:
// - En app.oficy.ar (producción): el dashboard de Cliente/Prestador ya es "/" (hay un rewrite
//   interno a "/app" en middleware.ts), así que para ESE caso alcanza con un push/replace a "/"
//   sin ensuciar la URL con "/app". Admin y Tesorero no tienen ese rewrite — van directo a su
//   ruta real (/admin, /tesoreria), que ya está en RUTAS_APP de middleware.ts.
// - En oficy.ar (producción — ej. la landing detectando que ya hay una sesión iniciada): cruzar
//   de dominio con router.push/replace de Next ROMPE ("Redirect is not allowed for a preflight
//   request", ver middleware.ts) porque el fetch interno que arma el router para traer el RSC no
//   puede seguir una redirección a otro origen. Por eso acá hace falta una navegación de verdad
//   (cambiar window.location), no una del router.
// - En cualquier otro host (desarrollo local, previews de Vercel): no hay subdominios — el
//   middleware no actúa ahí — así que se navega directo a la ruta real de cada rol.
export function irAlDashboard(router: RouterMinimo, rol?: string, modo: "push" | "replace" = "push") {
  if (typeof window === "undefined") return;
  const host = window.location.hostname;
  const ruta = rutaDashboardPorRol(rol);

  if (host === SUBDOMINIO_APP) {
    router[modo](ruta === "/app" ? "/" : ruta);
    return;
  }

  if (host === DOMINIO_PRINCIPAL) {
    window.location.href = `https://${SUBDOMINIO_APP}${ruta === "/app" ? "/" : ruta}`;
    return;
  }

  router[modo](ruta);
}

// La dirección inversa: mandar a la landing pública a alguien que no tiene sesión iniciada (ej.
// "/app" cuando detecta que no hay usuario logueado — ver app/app/page.tsx). Antes de este helper
// (28/09) ese caso hacía un router.replace("/") liso, que en app.oficy.ar es una navegación DENTRO
// del mismo origen — el middleware reescribe esa "/" de vuelta a "/app" (ver middleware.ts), así
// que la persona se quedaba mirando el mismo /app vacío en vez de la landing real. Mismo criterio
// que irAlDashboard: cruzar de app.oficy.ar a oficy.ar necesita una navegación de página completa
// (window.location), no una del router de Next.
export function irALandingPublica(router: RouterMinimo, modo: "push" | "replace" = "replace") {
  if (typeof window === "undefined") return;
  const host = window.location.hostname;

  if (host === SUBDOMINIO_APP) {
    window.location.href = `https://${DOMINIO_PRINCIPAL}/`;
    return;
  }

  router[modo]("/");
}
