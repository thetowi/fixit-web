// Espejo de FixIt.Application.DTOs.Calificaciones.TrabajoDestacadoResponse — solo para la landing
// publicitaria en "/" (24/09), ver claude/backlog-landing-publicitaria-24-09.md.
export interface TrabajoDestacado {
  categoriaNombre: string;
  categoriaIcono: string | null;
  descripcion: string;
  prestadorNombre: string;
  promedio: number;
  comentario: string;
}

// Espejo de FixIt.Application.DTOs.Calificaciones.EstadisticasPublicasResponse (25/09) — barra de
// números reales debajo del hero de la landing.
export interface EstadisticasPublicas {
  trabajosCompletados: number;
  prestadoresVerificados: number;
  rubrosDisponibles: number;
}
