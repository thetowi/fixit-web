export default function Estrellas({ valor, tamaño = "text-base" }: { valor: number; tamaño?: string }) {
  return (
    <span className={`text-yellow-500 ${tamaño}`}>
      {"★".repeat(Math.round(valor))}
      {"☆".repeat(5 - Math.round(valor))}
    </span>
  );
}