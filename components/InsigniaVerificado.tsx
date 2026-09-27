// Insignia de "prestador verificado" (27/09): cápsula sólida color cobre con el logo de Oficy
// adentro de un círculo y un brillo animado que la recorre — elegida por el usuario a partir de
// un mockup de 6 opciones (ver claude/backlog.md), pidiendo agregarle el brillo a la Opción 3
// ("insignia sólida"). Reemplaza el "✓" de texto que se usaba antes en /buscar, /explorar, el
// perfil público del prestador, "Mi cuenta" y los destacados de la home.
//
// Solo se arma como cápsula+brillo cuando se pide con texto (conTexto=true) — en los lugares
// donde se usa nada más el ícono chiquito pegado a un nombre en un listado denso (/buscar,
// /explorar, "Mi cuenta") se deja el ícono solo, sin cápsula, para no romper esos layouts.
//
// Usamos <img> en vez de next/image a propósito: el optimizador de next/image cachea por URL, y
// cuando este archivo se reemplazó por el logo nuevo (misma URL de siempre) siguió sirviendo los
// bytes viejos. Agregarle "?v=2" a la URL para forzar el refresco tampoco funciona: Next.js
// bloquea por seguridad las imágenes locales con query string en el optimizador salvo que se
// configure `images.localPatterns` en next.config (ver el error "using a query string which is
// not configured in images.localPatterns"). Con <img> nos salteamos ese optimizador por completo
// — no hace falta configurar nada, y un futuro cambio de este PNG se refleja directo.
const LOGO_SRC = "/insignia-verificado.png";

export default function InsigniaVerificado({
  size = 16,
  conTexto = false,
  className = "",
}: {
  size?: number;
  conTexto?: boolean;
  className?: string;
}) {
  if (!conTexto) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={LOGO_SRC}
        alt="Verificado"
        width={size}
        height={size}
        className={`inline-block shrink-0 align-middle ${className}`}
      />
    );
  }

  return (
    <span
      className={`relative inline-flex items-center gap-2 overflow-hidden rounded-full bg-gradient-to-br from-copper to-copper-dark pl-1 pr-3 py-1 align-middle ${className}`}
    >
      <span
        className="relative z-10 flex items-center justify-center rounded-full bg-paper shrink-0"
        style={{ width: size + 8, height: size + 8 }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={LOGO_SRC} alt="" width={size} height={size} />
      </span>
      <span className="relative z-10 font-display font-extrabold text-paper text-sm tracking-tight whitespace-nowrap">
        Verificado
      </span>

      {/* Brillo animado: una franja de luz que cruza la cápsula en loop cada ~2.6s.
          El @keyframes "insignia-shine" vive en globals.css. */}
      <span className="pointer-events-none absolute inset-0 z-20 overflow-hidden rounded-full" aria-hidden="true">
        <span className="absolute top-0 left-0 h-full w-1/4 bg-gradient-to-r from-transparent via-white/70 to-transparent animate-[insignia-shine_2.6s_ease-in-out_infinite]" />
      </span>
    </span>
  );
}
