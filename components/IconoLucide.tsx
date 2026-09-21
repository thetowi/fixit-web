"use client";

import { Suspense } from "react";
import { DynamicIcon } from "lucide-react/dynamic";
import { Wrench } from "lucide-react";
import { MAPA_ICONOS_ESTATICOS, normalizarClaveIcono, resolverClaveIconoValida } from "@/lib/iconosCategoria";

interface Props {
  nombre: string | null | undefined;
  size?: number;
  strokeWidth?: number;
  className?: string;
}

// Renderiza el ícono de una categoría a partir de la clave guardada en Categoria.Icono, sea uno de
// los 36 "sugeridos" (import estático — se ve al instante, sin parpadeo) o cualquiera de los ~1500
// íconos de Lucide que el Admin haya elegido con el buscador de SelectorIconoLucide.tsx (esos se
// cargan de forma diferida con lucide-react/dynamic, con un placeholder invisible del mismo tamaño
// mientras cargan). Si la clave no matchea ningún ícono real, cae en la llave inglesa — mismo
// comportamiento de siempre.
export default function IconoLucide({ nombre, size = 20, strokeWidth = 1.75, className }: Props) {
  const normalizada = normalizarClaveIcono(nombre);
  const IconoEstatico = MAPA_ICONOS_ESTATICOS[normalizada];

  if (IconoEstatico) {
    return <IconoEstatico size={size} strokeWidth={strokeWidth} className={className} />;
  }

  const claveValida = resolverClaveIconoValida(nombre);
  if (claveValida === "wrench") {
    return <Wrench size={size} strokeWidth={strokeWidth} className={className} />;
  }

  return (
    <Suspense fallback={<span style={{ display: "inline-block", width: size, height: size }} />}>
      <DynamicIcon name={claveValida as never} size={size} strokeWidth={strokeWidth} className={className} />
    </Suspense>
  );
}
