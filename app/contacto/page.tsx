export const metadata = {
  title: "Contacto | Oficy",
};

// Página de contacto (28/09), a pedido del usuario tras crear las casillas @oficy.ar reales
// (soporte, contacto, legal, pagos, admin). Cada fila es un mailto: directo — no hay formulario
// propio todavía (no hace falta backend para esto, y evita depender de que el envío de mails desde
// un form funcione bien antes de tener eso probado a fondo). "pagos@" y "admin@" son casillas
// internas (no se muestran acá): esta página es la cara pública, con las 3 que un usuario común
// puede necesitar según el motivo de su consulta.
const CASILLAS = [
  {
    email: "soporte@oficy.ar",
    titulo: "Soporte",
    descripcion:
      "Problemas con un pago, un trabajo, tu cuenta, o cualquier cosa que no esté funcionando como esperabas.",
  },
  {
    email: "contacto@oficy.ar",
    titulo: "Contacto general",
    descripcion:
      "Consultas comerciales, alianzas, prensa, o si no estás seguro/a a cuál de las otras dos escribir.",
  },
  {
    email: "legal@oficy.ar",
    titulo: "Legal y privacidad",
    descripcion:
      "Consultas sobre los Términos y Condiciones, la Política de Privacidad, o el tratamiento de tus datos personales.",
  },
];

export default function ContactoPage() {
  return (
    <div className="max-w-2xl mx-auto mt-16 p-6 w-full pb-24">
      <p className="font-mono text-xs tracking-widest text-copper uppercase mb-2">Contacto</p>
      <h1 className="font-display text-2xl text-ink mb-8">¿En qué te podemos ayudar?</h1>

      <div className="flex flex-col gap-4">
        {CASILLAS.map((c) => (
          <a
            key={c.email}
            href={`mailto:${c.email}`}
            className="block rounded-xl border border-ink/10 p-5 hover:border-copper/40 hover:bg-copper/5 transition-colors"
          >
            <p className="font-display font-bold text-ink">{c.titulo}</p>
            <p className="text-sm text-ink/60 leading-relaxed mt-1">{c.descripcion}</p>
            <p className="text-sm text-copper font-medium mt-2">{c.email}</p>
          </a>
        ))}
      </div>
    </div>
  );
}
