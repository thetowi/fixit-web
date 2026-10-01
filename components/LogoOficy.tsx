import Image from "next/image";

// Wordmark de Oficy (26/09, reemplazado por la versión nueva que mandó el usuario): antes esto
// mostraba el ícono de la mano con la llave (public/logo-icon.png) al lado del wordmark, porque
// el wordmark viejo era solo texto. El wordmark nuevo ya trae su propio símbolo integrado (el
// círculo con la llave inglesa, a modo de "O" de "OFICY"), así que mostrar el ícono de la mano al
// lado duplicaba la llave inglesa dos veces seguidas — por eso ahora el logo es solo esta imagen.
export default function LogoOficy({
  className = "",
}: {
  className?: string;
}) {
  return (
    <span className={`inline-flex items-center ${className}`}>
      <Image
        src="/oficy-wordmark.png"
        alt="Oficy"
        width={190}
        height={75}
        // 01/10: se agrega "sizes" porque sin ella next/image asume que la imagen no es
        // responsive y solo genera variantes de 1x/2x (256w/384w) — en pantallas de 3x
        // (la mayoria de celulares modernos) esas dos quedaban cortas y el navegador
        // terminaba agrandando la de 2x, por eso se veia borroso. Con "sizes" declarado,
        // next/image genera el srcset completo (incluida la variante de 3x) y elige la
        // mejor segun el ancho real renderizado (~97px en mobile, ~108px desde sm:).
        // Tambien se sube la calidad de 75 (default) a 90, para que el texto fino del
        // wordmark no pierda nitidez por la compresion.
        sizes="(min-width: 640px) 108px, 97px"
        quality={90}
        className="h-9 sm:h-10 w-auto object-contain"
        priority
      />
    </span>
  );
}
