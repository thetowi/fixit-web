// "Repostear" fotos de reseña (27/09) — espejo de los DTOs en FixIt.Application.DTOs.Repostos.
export interface RepostoPendiente {
  calificacionFotoId: string;
  url: string;
  prestadorId: string;
  prestadorNombreCompleto: string;
  prestadorFotoPerfilUrl: string | null;
  categoriaNombre: string;
  comentarioCalificacion: string | null;
  solicitadoEn: string;
}
