// Nuevo sistema de cobros (26/10): el front pregunta al backend en qué modo está
// (GET /api/publico/config) para mostrar "Aceptar oferta" (Directo: el cliente le paga directo
// al profesional) o "Pagar con Mercado Pago" (Retenido: el modelo anterior). Se pide una sola vez
// por carga de página y se comparte entre todos los componentes.
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { ConfigPublica } from "@/types/cobros";

let pedido: Promise<ConfigPublica | null> | null = null;

export function obtenerConfigCobros(): Promise<ConfigPublica | null> {
  if (!pedido) {
    pedido = apiFetch<ConfigPublica>("/api/publico/config").catch(() => {
      pedido = null; // si falló, que el próximo intente de nuevo
      return null;
    });
  }
  return pedido;
}

// null mientras carga (o si el backend todavía no tiene el endpoint): los componentes no muestran
// ni "Aceptar" ni "Pagar" hasta saberlo, para no ofrecer una acción equivocada.
export function useConfigCobros(): ConfigPublica | null {
  const [config, setConfig] = useState<ConfigPublica | null>(null);
  useEffect(() => {
    let activo = true;
    obtenerConfigCobros().then((c) => {
      if (activo) setConfig(c);
    });
    return () => {
      activo = false;
    };
  }, []);
  return config;
}

export function pesos(monto: number): string {
  return `$${Math.round(monto).toLocaleString("es-AR")}`;
}

// "2026-11" -> "noviembre 2026"
export function nombrePeriodo(periodo: string): string {
  const [anio, mes] = periodo.split("-").map(Number);
  return new Date(anio, mes - 1, 1).toLocaleDateString("es-AR", { month: "long", year: "numeric" });
}
