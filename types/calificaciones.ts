export interface Calificacion {
  id: string;
  clienteNombre: string;
  puntuacion: number;
  comentario: string | null;
  creadoEn: string;
}

export interface CrearCalificacionRequest {
  puntuacion: number;
  comentario?: string;
}