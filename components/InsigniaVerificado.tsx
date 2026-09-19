import Image from "next/image";

// Insignia de "prestador verificado": el logo que mandó el usuario (un engranaje con un check),
// en reemplazo del "✓" de texto que se usaba antes en /buscar, /explorar, el perfil público del
// prestador, "Mi cuenta" y los destacados de la home. Un solo componente para que un cambio de
// diseño futuro (otro ícono, otro tamaño) se haga en un solo lugar.
export default function InsigniaVerificado({
  size = 16,
  conTexto = false,
  className = "",
}: {
  size?: number;
  conTexto?: boolean;
  className?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-1 align-middle ${className}`}>
      <Image
        src="/insignia-verificado.png"
        alt="Verificado"
        width={size}
        height={size}
        className="inline-block shrink-0"
      />
      {conTexto && <span className="text-stamp text-sm">Verificado</span>}
    </span>
  );
}
