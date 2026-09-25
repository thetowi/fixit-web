import Image from "next/image";

// Wordmark de Oficy (25/09, actualizado el mismo día con los archivos finales que mandó el
// usuario): a la izquierda el ícono de la mano con la llave inglesa (el mismo PNG que se usa
// como favicon, public/logo-icon.png), y a la derecha la imagen del wordmark "OFICY" con su
// estilo final (fondo transparente, pensada para el fondo oscuro del Navbar). Antes esto era
// una recreación hecha con lucide-react + CSS; ahora usa directamente los dos assets reales.
export default function LogoOficy({
  className = "",
}: {
  className?: string;
}) {
  return (
    <span className={`inline-flex items-center ${className}`}>
      <Image
        src="/logo-icon.png"
        alt=""
        width={44}
        height={44}
        className="h-10 w-10 sm:h-11 sm:w-11 object-contain shrink-0"
        priority
      />
      <Image
        src="/oficy-wordmark.png"
        alt="Oficy"
        width={190}
        height={75}
        className="h-8 sm:h-9 w-auto object-contain"
        priority
      />
    </span>
  );
}
