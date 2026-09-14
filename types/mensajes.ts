export interface Mensaje {
  id: string;
  conversacionId: string;
  emisorId: string;
  emisorNombre: string;
  tipo: "Texto" | "Imagen" | "Oferta";
  contenido: string | null;
  imagenUrl: string | null;
  montoOferta: number | null;
  ofertaVigente: boolean;
  enviadoEn: string;
}