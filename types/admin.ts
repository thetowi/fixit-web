export interface CategoriaAdmin {
  id: number;
  nombre: string;
  icono: string | null;
  activa: boolean;
}

export interface CrearCategoriaRequest {
  nombre: string;
  icono?: string;
}

export interface EditarCategoriaRequest {
  nombre: string;
  icono?: string;
}

export interface UsuarioAdmin {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  rol: string;
  verificado: boolean;
  activo: boolean;
  creadoEn: string;
}

// Rol Tesorero (01/10) — lo crea un Admin a mano desde /admin, ver AdminController.CrearTesorero.
export interface CrearTesoreroRequest {
  email: string;
  password: string;
  nombre: string;
  apellido: string;
}

// Reportes mensuales (04/10) — ver ReporteMensualResponse en el backend.
export interface ValoracionPrestadorReporte {
  cantidad: number;
  promedioGeneral: number | null;
  puntualidad: number | null;
  calidad: number | null;
  precio: number | null;
  comunicacion: number | null;
  limpieza: number | null;
  garantia: number | null;
}

export interface ValoracionClienteReporte {
  cantidad: number;
  promedioGeneral: number | null;
  puntualidad: number | null;
  comunicacion: number | null;
  trato: number | null;
}

export interface ReporteMensual {
  anio: number;
  mes: number;
  usuariosNuevosTotal: number;
  usuariosNuevosClientes: number;
  usuariosNuevosPrestadores: number;
  crecimientoUsuariosPorcentaje: number | null;
  porcentajeUsuariosNuevosSobreTotal: number | null;
  ordenesCreadas: number;
  crecimientoOrdenesPorcentaje: number | null;
  ingresosTotales: number;
  comisionPlataforma: number;
  crecimientoIngresosPorcentaje: number | null;
  totalUsuarios: number;
  totalClientes: number;
  totalPrestadores: number;
  totalOrdenesCompletadasHistorico: number;
  valoracionesPrestador: ValoracionPrestadorReporte;
  valoracionesCliente: ValoracionClienteReporte;
}