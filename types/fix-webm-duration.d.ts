// El paquete "fix-webm-duration" no trae sus propios tipos (no hay @types/fix-webm-duration en
// DefinitelyTyped), así que sin esto TypeScript tira "no se encontró declaración de tipos" y
// rompe el build. Solo declaramos la forma en la que lo usamos: blob + duración en ms + callback
// que recibe el blob ya con el header corregido.
declare module "fix-webm-duration" {
  export default function fixWebmDuration(
    blob: Blob,
    duration: number,
    callback: (fixedBlob: Blob) => void
  ): void;
}
