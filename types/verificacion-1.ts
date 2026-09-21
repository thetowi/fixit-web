// Espejo de fixit-web/types/verificacion.ts.

export type EstadoVerificacion = "SinEnviar" | "Pendiente" | "Aprobado" | "Rechazado";

export interface VerificacionEstado {
  estado: EstadoVerificacion;
  motivoRechazo: string | null;
  enviadaEn: string | null;
  tieneDni: boolean;
  tieneAntecedentes: boolean;
  tieneMatricula: boolean;
}
