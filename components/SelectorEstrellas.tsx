"use client";

export default function SelectorEstrellas({
  valor,
  onChange,
  tamaño = "text-xl",
}: {
  valor: number;
  onChange: (valor: number) => void;
  tamaño?: string;
}) {
  return (
    <div className={`flex gap-0.5 ${tamaño}`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className={`leading-none transition-colors ${n <= valor ? "text-copper" : "text-ink/20 hover:text-ink/40"}`}
          aria-label={`${n} de 5 estrellas`}
        >
          ★
        </button>
      ))}
    </div>
  );
}
