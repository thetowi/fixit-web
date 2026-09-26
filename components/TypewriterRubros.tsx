"use client";

import { useEffect, useState } from "react";

// Efecto "máquina de escribir" para el eyebrow del hero de la landing (26/09, a pedido del
// usuario, inspirado en un ejemplo de CSS puro con @keyframes que escriben letra por letra).
// Ese ejemplo hardcodea el contenido de cada frame ("d", "de", "dev"...) en CSS — funciona para
// una lista de palabras fija, pero acá los rubros vienen del backend (categorias.map), así que en
// vez de calcular a mano los % de cada keyframe se hace lo mismo en JS: se tipea letra por letra,
// se hace una pausa con la palabra completa, se borra letra por letra, y se pasa a la siguiente
// palabra — en loop infinito. El cursor que titila si es CSS puro (ver <style jsx>).
//
// Accesibilidad: el texto que se anima tiene aria-hidden (cambia letra a letra, no tiene sentido
// para un lector de pantalla) y al lado hay un <span> "sr-only" con la lista completa de una vez.
// Respeta prefers-reduced-motion: ahí se desactiva el tipeo y el cursor, y en cambio se muestra
// cada palabra completa un rato antes de pasar a la siguiente (mismo criterio que el ejemplo de
// referencia con su @media (prefers-reduced-motion: reduce)).
const PALABRAS_POR_DEFECTO = ["Plomería", "Electricidad", "Gas", "Jardinería", "y más"];

const VELOCIDAD_ESCRITURA = 75; // ms por letra al escribir
const VELOCIDAD_BORRADO = 35; // ms por letra al borrar
const PAUSA_PALABRA_COMPLETA = 1300; // ms que queda la palabra entera antes de empezar a borrar
const PAUSA_ENTRE_PALABRAS = 350; // ms con el cursor vacío antes de arrancar la siguiente
const PAUSA_MOVIMIENTO_REDUCIDO = 2200; // ms por palabra cuando prefers-reduced-motion está activo

export default function TypewriterRubros({
  palabras = PALABRAS_POR_DEFECTO,
  className = "",
}: {
  palabras?: string[];
  className?: string;
}) {
  const listaPalabras = palabras.length > 0 ? palabras : PALABRAS_POR_DEFECTO;

  const [indice, setIndice] = useState(0);
  const [texto, setTexto] = useState("");
  const [borrando, setBorrando] = useState(false);
  const [reducirMovimiento, setReducirMovimiento] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducirMovimiento(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReducirMovimiento(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  // Si cambia la lista de rubros (por ejemplo, pasa de la lista por defecto a la real que llegó
  // del backend) reiniciamos desde la primera palabra para no quedar con un índice inválido.
  useEffect(() => {
    setIndice(0);
    setTexto("");
    setBorrando(false);
  }, [listaPalabras.join("|")]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (reducirMovimiento) {
      // Con movimiento reducido: nada de tipeo ni cursor, solo cambia la palabra completa cada
      // tanto.
      setTexto(listaPalabras[indice % listaPalabras.length] ?? "");
      const timeoutId = setTimeout(() => {
        setIndice((i) => (i + 1) % listaPalabras.length);
      }, PAUSA_MOVIMIENTO_REDUCIDO);
      return () => clearTimeout(timeoutId);
    }

    const palabraActual = listaPalabras[indice % listaPalabras.length] ?? "";
    let timeoutId: ReturnType<typeof setTimeout>;

    if (!borrando && texto.length < palabraActual.length) {
      timeoutId = setTimeout(() => setTexto(palabraActual.slice(0, texto.length + 1)), VELOCIDAD_ESCRITURA);
    } else if (!borrando && texto.length === palabraActual.length) {
      timeoutId = setTimeout(() => setBorrando(true), PAUSA_PALABRA_COMPLETA);
    } else if (borrando && texto.length > 0) {
      timeoutId = setTimeout(() => setTexto(palabraActual.slice(0, texto.length - 1)), VELOCIDAD_BORRADO);
    } else {
      timeoutId = setTimeout(() => {
        setBorrando(false);
        setIndice((i) => (i + 1) % listaPalabras.length);
      }, PAUSA_ENTRE_PALABRAS);
    }

    return () => clearTimeout(timeoutId);
  }, [texto, borrando, indice, listaPalabras, reducirMovimiento]);

  return (
    <span className={className}>
      <span className="sr-only">{listaPalabras.join(", ")}</span>
      <span aria-hidden="true">
        {texto}
        {!reducirMovimiento && (
          <span className="fixit-caret inline-block w-[1px] h-[0.9em] ml-0.5 -mb-[0.05em] bg-current align-middle" />
        )}
      </span>
      <style jsx>{`
        @keyframes fixitCaretBlink {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0;
          }
        }
        .fixit-caret {
          animation: fixitCaretBlink 0.9s step-end infinite;
        }
      `}</style>
    </span>
  );
}
