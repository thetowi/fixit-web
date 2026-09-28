// Color estable por rubro para los chips/franjas de la agenda (mismo rubro => siempre el mismo
// color, sin necesidad de guardar un color por categoría en la base). No tiene relación con
// ESTADO_COLOR de OrdenTicket, que es por estado de la orden, no por rubro.
const PALETA = ["#B5651D", "#177762", "#F0A202"];

export function colorCategoria(nombreCategoria: string): string {
  let hash = 0;
  for (let i = 0; i < nombreCategoria.length; i++) {
    hash = (hash * 31 + nombreCategoria.charCodeAt(i)) >>> 0;
  }
  return PALETA[hash % PALETA.length];
}

// Etiqueta de rubro "suave" (28/09, del rediseño de la vista semanal de la agenda): en vez del
// borde/punto sólido de colorCategoria(), una píldora de texto chica con fondo tenue derivado del
// mismo color — se usa tanto en CalendarioSemanal como en el perfil del cliente, para que el rubro
// se vea consistente en toda la app sin repetir esta lógica en cada componente.
function hexARgb(hex: string): { r: number; g: number; b: number } {
  const limpio = hex.replace("#", "");
  const bigint = parseInt(limpio, 16);
  return { r: (bigint >> 16) & 255, g: (bigint >> 8) & 255, b: bigint & 255 };
}

export function estiloEtiquetaCategoria(nombreCategoria: string): { background: string; color: string } {
  const base = colorCategoria(nombreCategoria);
  const { r, g, b } = hexARgb(base);
  return { background: `rgba(${r}, ${g}, ${b}, 0.12)`, color: base };
}
