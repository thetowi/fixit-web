// Nuevo sistema de cobros (26/10, ver claude/diseno-nuevo-sistema-cobros-26-10.md en el proyecto).
// Espejo de FixIt.Application.DTOs.Cobros.

export type ModoCobro = "Directo" | "Retenido";

export interface TarifaVigente {
  montoPorTrabajo: number;
  topeMensual: number;
  vigenteDesde: string;
}

export interface ConfigPublica {
  modoCobro: ModoCobro;
  tarifa: TarifaVigente | null;
}

export type EstadoResumen = "Pendiente" | "Pagado" | "Vencido" | "Bonificado" | "SinCargo";

export interface ResumenMensual {
  id: string;
  periodo: string; // "2026-11"
  cantidadTrabajos: number;
  trabajosBonificados: number;
  subtotal: number;
  tope: number;
  total: number;
  ahorro: number;
  estado: EstadoResumen;
  venceEn: string;
  pagadoEn: string | null;
  medioPago: string | null;
  // Solo en el listado de Admin.
  prestadorId: string;
  prestadorNombreCompleto?: string | null;
  prestadorTelefono?: string | null;
  notaAdmin?: string | null;
}

export interface MiPlan {
  modoCobro: ModoCobro;
  tarifa: TarifaVigente | null;
  esFundador: boolean;
  fundadorHasta: string | null;
  ahorroFundadorTotal: number;
  periodoActual: string;
  trabajosMesActual: number;
  cargoMesActual: number;
  topeAlcanzado: boolean;
  suspendido: boolean;
  deudaTotal: number;
  resumenes: ResumenMensual[];
}

export interface Fundador {
  prestadorId: string;
  nombreCompleto: string;
  telefono: string | null;
  fundadorDesde: string | null;
  fundadorHasta: string | null;
  trabajosConfirmados: number;
}

export interface FundadoresRubro {
  categoriaId: number;
  categoriaNombre: string;
  cupo: number;
  fundadores: Fundador[];
  candidatos: Fundador[];
}

// Señales de fuga (fase 4): indicios para revisar a mano.
export interface ConversacionSospechosa {
  conversacionId: string;
  prestadorNombre: string;
  clienteNombre: string;
  categoriaNombre: string;
  intentosContacto: number;
  ultimoIntentoEn: string | null;
  tieneTrabajoAceptado: boolean;
}

export interface PrestadorSenales {
  prestadorId: string;
  nombre: string;
  telefono: string | null;
  conversaciones: number;
  trabajosAceptados: number;
  intentosContacto: number;
  completados: number;
  confirmadosAutomaticamente: number;
  checkInsLejos: number;
  alertas: string[];
}

export interface SenalesFuga {
  conversaciones: ConversacionSospechosa[];
  prestadores: PrestadorSenales[];
}

export const ESTADO_RESUMEN_LABEL: Record<EstadoResumen, string> = {
  Pendiente: "Pendiente",
  Pagado: "Pagado",
  Vencido: "Vencido",
  Bonificado: "Bonificado",
  SinCargo: "Sin cargo",
};

export const ESTADO_RESUMEN_COLOR: Record<EstadoResumen, string> = {
  Pendiente: "border-safety text-safety-text",
  Pagado: "border-stamp text-stamp",
  Vencido: "border-red-700 text-red-700 dark:border-red-400 dark:text-red-400",
  Bonificado: "border-copper text-copper-text",
  SinCargo: "border-ink/30 text-ink-muted",
};
