export interface PrestadorDestacado {
  id: string;
  nombre: string;
  apellido: string;
  verificado: boolean;
  fotoPerfilUrl: string | null;
  promedioCalificacion: number | null;
  cantidadCalificaciones: number;
  distanciaKm: number | null;
  categorias: string[];
}