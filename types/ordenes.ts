export interface CrearOrdenRequest {
  prestadorId: string;
  categoriaId: number;
  montoTotal: number;
}
export interface Orden {
  id: string;
  prestadorId: string;
  prestadorNombreCompleto: string;
  clienteId: string;
  clienteNombreCompleto: string;
  categoriaId: number;
  categoriaNombre: string;
  descripcion: string;
  estado: string;
  montoTotal: number;
  comisionPlataforma: number;
  creadoEn: string;
  // Agregados 24/09 para el aviso de "Hoy" en el Inicio del Cliente.
  fechaHoraProgramada?: string | null;
  duracionMinutos?: number | null;
  yaCalificada: boolean;
  yaCalificadaComoCliente: boolean; // 28/09 — el prestador ya calificó al cliente de esta orden
  conversacionId: string;

  // Modelo de retención (23/09, ver backend OrdenResponse.cs) — el backend ya los mandaba,
  // faltaba que el frontend los tipara para poder mostrarlos/usarlos en el panel de Admin.
  pagoEstado?: string | null;
  montoATransferirPrestador?: number;
  transferenciaPrestadorConfirmadaEn?: string | null;
  motivoReembolso?: string | null;

  // Inasistencia del cliente reportada por el prestador (28/09, ver backend OrdenResponse.cs).
  inasistenciaClienteReportadaEn?: string | null;
  inasistenciaClienteComentario?: string | null;
  inasistenciaResueltaEn?: string | null;
  inasistenciaResolucion?: string | null;
}

// "Trabajo en curso" (24/09): espejo de FixIt.Application.DTOs.Ordenes.OrdenEnCursoResponse.
export interface OrdenEnCurso {
  ordenId: string;
  categoriaNombre: string;
  categoriaIcono: string | null;
  descripcion: string;
  clienteId: string;
  clienteNombreCompleto: string;
  prestadorId: string;
  prestadorNombreCompleto: string;
  iniciadoEn: string;
}