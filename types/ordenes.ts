export interface CrearOrdenRequest {
  prestadorId: string;
  categoriaId: number;
  montoTotal: number;
}

export interface Orden {
  id: string;
  prestadorId: string;
  prestadorNombreCompleto: string;
  categoriaId: number;
  categoriaNombre: string;
  estado: string;
  montoTotal: number;
  comisionPlataforma: number;
  creadoEn: string;
}