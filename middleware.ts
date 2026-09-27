import { NextRequest, NextResponse } from "next/server";

// Separación en dos dominios (27/09, a pedido del usuario: "se le puede poner al dominio
// app.oficy en vez de /app?"): el sitio de marketing/público (oficy.ar) y todo lo que requiere
// sesión (app.oficy.ar) son la MISMA app de Next.js — no hay dos deployments — así que la
// separación se resuelve acá, mirando el header Host de cada pedido.
//
// Por qué se mueven también login/registro (y no solo el dashboard de "/app"): la sesión se
// guarda en localStorage (ver lib/auth.ts), que es por origen — si el login quedara en oficy.ar y
// el dashboard en app.oficy.ar, el token que guarda el login no se vería del otro lado y la
// persona quedaría "deslogueada" al entrar al dashboard. Por eso login, registro y el resto del
// flujo de autenticación viven en el mismo origen que el resto de la app.
//
// Esto solo actúa contra el dominio real de producción (oficy.ar) — en localhost, en un preview
// de Vercel, o en cualquier otro host, esta función no hace nada y todo sigue sirviéndose en un
// solo origen como hasta ahora (no hace falta configurar un subdominio local para desarrollar).
const DOMINIO_PRINCIPAL = "oficy.ar";
const SUBDOMINIO_APP = `app.${DOMINIO_PRINCIPAL}`;

// Todo lo que requiere sesión, más el flujo de login/registro (ver nota de arriba). Las páginas
// públicas — "/", /buscar, /explorar, /prestador/[id] (el perfil público), /quienes-somos,
// /privacidad, /terminos — se quedan en el dominio principal a propósito, para que sigan siendo
// indexables/compartibles ahí.
const RUTAS_APP = [
  "/app",
  "/ordenes",
  "/cuenta",
  "/mensajes",
  "/conversaciones",
  "/admin",
  "/prestador/agenda",
  "/login",
  "/registro",
  "/recuperar-password",
  "/restablecer-password",
  "/confirmar-email",
];

function esRutaDeApp(pathname: string): boolean {
  return RUTAS_APP.some((ruta) => pathname === ruta || pathname.startsWith(`${ruta}/`));
}

export function middleware(request: NextRequest) {
  const host = request.headers.get("host") ?? "";

  if (host !== DOMINIO_PRINCIPAL && host !== SUBDOMINIO_APP) {
    return NextResponse.next();
  }

  const enSubdominioApp = host === SUBDOMINIO_APP;
  const { pathname } = request.nextUrl;

  // app.oficy.ar/ (la raíz) muestra el dashboard — sigue siendo la misma página /app de siempre,
  // solo que ahora no hace falta escribir "/app" en la URL.
  if (enSubdominioApp && pathname === "/") {
    return NextResponse.rewrite(new URL("/app", request.url));
  }

  // Una ruta de marketing/pública pedida por el subdominio de la app: la mandamos al dominio
  // principal, para no tener el mismo contenido navegable bajo dos hosts distintos.
  if (enSubdominioApp && pathname !== "/app" && !esRutaDeApp(pathname)) {
    const destino = new URL(request.url);
    destino.host = DOMINIO_PRINCIPAL;
    return NextResponse.redirect(destino);
  }

  // Una ruta de la app (o del login) pedida por el dominio principal: la mandamos al subdominio,
  // así el token que guarda el login queda en el mismo origen que el resto de la app. Esto es lo
  // que hace que un link viejo a oficy.ar/app, o cualquier router.push("/app") desde una página
  // de marketing, siga funcionando sin tener que tocar ese código.
  if (!enSubdominioApp && esRutaDeApp(pathname)) {
    const destino = new URL(request.url);
    destino.host = SUBDOMINIO_APP;
    return NextResponse.redirect(destino);
  }

  return NextResponse.next();
}

export const config = {
  // Todo menos archivos estáticos/internos de Next — el patrón recomendado por Next.js.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|ico|webp|js|css|map)$).*)"],
};

