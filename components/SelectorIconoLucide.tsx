"use client";

import { useMemo, useState } from "react";
import { ICONOS_CATEGORIA, NOMBRES_ICONOS_LUCIDE } from "@/lib/iconosCategoria";
import IconoLucide from "@/components/IconoLucide";

interface Props {
  valor: string;
  onChange: (clave: string) => void;
}

const LIMITE_RESULTADOS = 60;

// Selector de ícono para el panel de Admin (crear/editar categoría). Antes solo dejaba elegir entre
// 36 íconos curados a mano, sin ninguna forma de buscar — a pedido del usuario, ahora también se
// puede BUSCAR por nombre entre TODO el catálogo de Lucide (~1500 íconos) o pegar directo el código
// exacto del ícono tal como aparece en https://lucide.dev/icons (ej. "flask-conical"). Importante:
// los nombres de Lucide están en inglés, así que buscar "gota" no encuentra nada — hay que buscar
// "droplet". Sin escribir nada en el buscador, se ven los 36 sugeridos de siempre como acceso
// rápido a los rubros más comunes.
export default function SelectorIconoLucide({ valor, onChange }: Props) {
  const [busqueda, setBusqueda] = useState("");

  const resultados = useMemo(() => {
    const termino = busqueda.trim().toLowerCase();
    if (!termino) return ICONOS_CATEGORIA.map((o) => o.clave);
    return NOMBRES_ICONOS_LUCIDE.filter((n) => n.includes(termino)).slice(0, LIMITE_RESULTADOS);
  }, [busqueda]);

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <input
          type="text"
          placeholder="Buscar ícono (en inglés, ej. 'droplet') o pegar el código exacto..."
          className="border border-ink/20 rounded p-2 text-sm flex-1 bg-paper"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
        <span className="flex items-center gap-1.5 text-xs text-ink/50 shrink-0 font-mono">
          <IconoLucide nombre={valor} size={16} />
          {valor}
        </span>
      </div>

      {busqueda.trim() && resultados.length === 0 && (
        <p className="text-xs text-ink/40 mb-2">
          Sin resultados — los nombres de Lucide están en inglés, probá con otra palabra, o pegá el
          código exacto tal como aparece en lucide.dev/icons.
        </p>
      )}

      <div className="grid grid-cols-6 sm:grid-cols-9 gap-1.5 max-h-56 overflow-y-auto p-0.5">
        {resultados.map((clave) => (
          <button
            key={clave}
            type="button"
            onClick={() => onChange(clave)}
            title={clave}
            aria-label={clave}
            className={`aspect-square rounded-lg border flex items-center justify-center transition-colors ${
              valor === clave
                ? "border-copper bg-copper/10 text-copper"
                : "border-ink/15 text-ink/60 hover:border-ink/30 hover:text-ink"
            }`}
          >
            <IconoLucide nombre={clave} size={18} />
          </button>
        ))}
      </div>

      {!busqueda.trim() && (
        <p className="text-xs text-ink/40 mt-2">
          Sugeridos — escribí arriba para buscar entre los {NOMBRES_ICONOS_LUCIDE.length} íconos de Lucide.
        </p>
      )}
      {busqueda.trim() && resultados.length === LIMITE_RESULTADOS && (
        <p className="text-xs text-ink/40 mt-2">Mostrando los primeros {LIMITE_RESULTADOS} resultados — afiná la búsqueda si no está el que buscás.</p>
      )}
    </div>
  );
}
