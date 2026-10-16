import type { Metadata } from "next";

// Título propio para /encuesta (16/10): es lo que se ve en la pestaña y en la vista previa del
// link cuando se comparte por WhatsApp o Instagram. La página es un componente cliente y no puede
// exportar metadata, por eso va en este layout. Sin mencionar la marca, a pedido del usuario.
export const metadata: Metadata = {
  title: "Encuesta para profesionales de oficio",
  description: "¿Sos profesional de oficio en Paraná? Contanos tu opinión en 4 minutos.",
};

export default function EncuestaLayout({ children }: { children: React.ReactNode }) {
  return children;
}
