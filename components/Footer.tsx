"use client";

import { ThemeToggleFooter } from "@/components/ThemeToggle";

// Pie de página simple: además de los links legales (Términos, Privacidad) y "Quiénes somos",
// acá vive el toggle de modo oscuro/claro — reemplazó al viejo botón flotante fijo, que en mobile
// tapaba el botón "Enviar" del chat (ver ThemeToggleFooter en ThemeToggle.tsx).
export default function Footer() {
  return (
    <footer className="mt-auto border-t border-ink/10 py-4 px-6 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-ink/40">
      <span>© {new Date().getFullYear()} FixIt</span>
      <a href="/quienes-somos" className="hover:text-copper hover:underline">Quiénes somos</a>
      <a href="/terminos" className="hover:text-copper hover:underline">Términos y Condiciones</a>
      <a href="/privacidad" className="hover:text-copper hover:underline">Política de Privacidad</a>
      <ThemeToggleFooter />
    </footer>
  );
}
