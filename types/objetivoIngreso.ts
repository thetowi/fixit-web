// "Sueldo pretendido" (28/09) — ver claude/aviso-pago-y-sueldo-pretendido-28-09.md.
export interface ObjetivoIngreso {
  tieneObjetivo: boolean;
  montoMensual: number | null;
  ticketPromedio: number;
  ticketEsManual: boolean;
  // Si es false, todavía no completó ningún trabajo y no cargó un ticket manual — no hay forma
  // de calcular el camino, hay que pedirle que complete el campo manual.
  ticketDisponible: boolean;
  gananciaDelMes: number;
  trabajosCompletadosDelMes: number;
  porcentajeProgreso: number;
  trabajosNecesariosTotal: number | null;
  trabajosFaltantes: number | null;
  cumplido: boolean;
}

export interface EstablecerObjetivoIngresoRequest {
  montoMensual: number;
  ticketPromedioManual?: number | null;
}
