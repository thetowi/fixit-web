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
  yaCalificada: boolean;
  conversacionId: string;

  // Modelo de retención (23/09, ver backend OrdenResponse.cs) — el backend ya los mandaba,
  // faltaba que el frontend los tipara para poder mostrarlos/usarlos en el panel de Admin.
  pagoEstado?: string | null;
  montoATransferirPrestador?: number;
  transferenciaPrestadorConfirmadaEn?: string | null;
  motivoReembolso?: string | null;
}