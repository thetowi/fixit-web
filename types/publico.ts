// Espejo de FixIt.Application.DTOs.Calificaciones.TrabajoDestacadoResponse — solo para la landing
// publicitaria en "/" (24/09), ver claude/backlog-landing-publicitaria-24-09.md.
// Desde el 27/09 muestra la identidad completa del prestador (antes solo nombre + inicial): su
// perfil ya es público de todos modos, y mostrarlo acá genera confianza y linkea a su perfil.
export interface TrabajoDestacado {
  categoriaNombre: string;
  categoriaIcono: string | null;
  descripcion: string;
  prestadorId: string;
  prestadorNombreCompleto: string;
  prestadorFotoPerfilUrl: string | null;
  prestadorPromedioGeneral: number | null;
  prestadorCantidadCalificaciones: number;
  promedio: number;
  comentario: string;
  fotosResena: string[];
}

// Espejo de FixIt.Application.DTOs.Calificaciones.EstadisticasPublicasResponse (25/09) — barra de
// números reales debajo del hero de la landing.
export interface EstadisticasPublicas {
  trabajosCompletados: number;
  prestadoresVerificados: number;
  rubrosDisponibles: number;
}
