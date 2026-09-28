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
// (28/09) La cápsula pasó de un degradé plano color cobre + franja diagonal blanca, a una "placa
// de bronce" multi-tono con 3 capas de luz orbitando (ver globals.css) — a pedido del usuario tras
// varias rondas de mockups descartados, hasta que pasó su propio código de referencia.
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
      className={`relative inline-flex items-center gap-2 overflow-hidden rounded-full insignia-placa-bronce pl-1 pr-3 py-1 align-middle ${className}`}
    >
      <span
        className="relative z-10 flex items-center justify-center rounded-full bg-paper shrink-0"
        style={{ width: size + 8, height: size + 8 }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={LOGO_SRC} alt="" width={size} height={size} />
      </span>
      <span
        className="relative z-10 font-display font-extrabold text-sm tracking-tight whitespace-nowrap"
        style={{ color: "#fff6df", textShadow: "0 1px 2px #2d0d02, 0 0 6px rgba(255,232,176,.3)" }}
      >
        Verificado
      </span>

      {/* Placa de bronce con brillo solar (28/09): 3 capas de luz orbitando alrededor del centro
          con contra-rotación (no giran sobre sí mismas, así se ven nítidas y no difusas), mezcladas
          con mix-blend-mode:screen — reemplaza la franja diagonal blanca de antes. Código de
          referencia provisto por el usuario, adaptado en tamaño y color a esta cápsula. Los
          @keyframes y clases viven en globals.css (.insignia-placa-bronce, .insignia-luz,
          .insignia-halo, .insignia-reflejo). */}
      <span className="insignia-luz" aria-hidden="true" />
      <span className="insignia-halo" aria-hidden="true" />
      <span className="insignia-reflejo" aria-hidden="true" />
    </span>
  );
}
