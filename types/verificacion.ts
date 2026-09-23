export type EstadoVerificacion = "SinEnviar" | "Pendiente" | "Aprobado" | "Rechazado";

// Identidad (DNI + antecedentes, una vez por cuenta) + un estado por cada rubro (matrícula, 22/09).
export interface VerificacionEstado {
  estado: EstadoVerificacion;
  motivoRechazo: string | null;
  enviadaEn: string | null;
  tieneDni: boolean;
  tieneAntecedentes: boolean;
  categorias: VerificacionCategoriaEstado[];
}

export interface VerificacionCategoriaEstado {
  prestadorCategoriaId: number;
  categoriaId: number;
  categoriaNombre: string;
  estado: EstadoVerificacion;
  motivoRechazo: string | null;
  enviadaEn: string | null;
  tieneMatricula: boolean;
}

export interface VerificacionAdmin {
  usuarioId: string;
  nombreCompleto: string;
  email: string;
  dniNumero: string | null;
  estado: EstadoVerificacion;
  enviadaEn: string | null;
}

// Cola de matrículas por rubro para el Admin (22/09) — separada de la de identidad de arriba.
export interface VerificacionCategoriaAdmin {
  prestadorCategoriaId: number;
  usuarioId: string;
  nombreCompleto: string;
  email: string;
  categoriaId: number;
  categoriaNombre: string;
  estado: EstadoVerificacion;
  enviadaEn: string | null;
}
