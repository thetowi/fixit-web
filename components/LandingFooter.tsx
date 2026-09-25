import Link from "next/link";
import { Categoria } from "@/types/categorias";

// Footer propio de la landing publicitaria (25/09, a pedido del usuario, al estilo del footer
// completo de tegu.ar) — se muestra SOLO en "/" (app/page.tsx), arriba del Footer.tsx global
// chico que ya usan todas las páginas operativas. No lo reemplaza: las páginas de adentro de la
// app (mensajes, órdenes, cuenta, etc.) siguen viendo únicamente el Footer.tsx de siempre.
export default function LandingFooter({ categorias }: { categorias: Categoria[] }) {
  return (
    <div className="w-full bg-ink text-paper/80">
      <div className="max-w-5xl mx-auto px-6 py-14 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
        <div>
          <p className="font-display text-lg text-paper mb-2">Oficy</p>
          <p className="text-sm text-paper/60 leading-relaxed mb-3">
            Conectamos clientes con profesionales de oficios verificados, cerca tuyo.
          </p>
          <p className="font-mono text-xs tracking-widest text-copper uppercase">
            Desde Paraná, hacia toda Argentina
          </p>
        </div>

        <div>
          <p className="font-mono text-xs tracking-widest text-paper/50 uppercase mb-3">Rubros</p>
          <ul className="flex flex-col gap-2 text-sm">
            {categorias.slice(0, 6).map((c) => (
              <li key={c.id}>
                <Link href={`/explorar/${c.id}`} className="hover:text-safety transition-colors">
                  {c.nombre}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="font-mono text-xs tracking-widest text-paper/50 uppercase mb-3">Oficy</p>
          <ul className="flex flex-col gap-2 text-sm">
            <li><Link href="/explorar" className="hover:text-safety transition-colors">Explorar rubros</Link></li>
            <li><Link href="/registro?rol=prestador" className="hover:text-safety transition-colors">Sumate como profesional</Link></li>
            <li><Link href="/quienes-somos" className="hover:text-safety transition-colors">Quiénes somos</Link></li>
          </ul>
        </div>

        <div>
          <p className="font-mono text-xs tracking-widest text-paper/50 uppercase mb-3">Legal</p>
          <ul className="flex flex-col gap-2 text-sm">
            <li><Link href="/terminos" className="hover:text-safety transition-colors">Términos y Condiciones</Link></li>
            <li><Link href="/privacidad" className="hover:text-safety transition-colors">Política de Privacidad</Link></li>
          </ul>
        </div>
      </div>

      <div className="border-t border-paper/10 px-6 py-4 text-center text-xs text-paper/40">
        © {new Date().getFullYear()} Oficy — Todos los derechos reservados
      </div>
    </div>
  );
}
