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
        className="h-9 sm:h-10 w-auto object-contain"
        priority
      />
    </span>
  );
}
