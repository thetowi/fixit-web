export type EstadoVerificacion = "SinEnviar" | "Pendiente" | "Aprobado" | "Rechazado";

export interface VerificacionEstado {
  estado: EstadoVerificacion;
  motivoRechazo: string | null;
  enviadaEn: string | null;
  tieneDni: boolean;
  tieneAntecedentes: boolean;
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
