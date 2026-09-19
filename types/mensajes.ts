export interface Mensaje {
  id: string;
  conversacionId: string;
  emisorId: string;
  emisorNombre: string;
  tipo: "Texto" | "Imagen" | "Oferta" | "Audio" | "Video";
  contenido: string | null;
  archivoUrl: string | null;
  duracionSegundos: number | null;
  montoOferta: number | null;
  descripcionOferta: string | null;
  ofertaVigente: boolean;
  ofertaExpiraEn: string | null;
  ofertaPagada: boolean;
  enviadoEn: string;
}