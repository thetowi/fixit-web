// Espejo de FixIt.Application.DTOs.Clientes.PerfilClienteResponse (28/09) — perfil del cliente
// visto por un prestador. Ver ClientesController/ClientePerfilService para la lógica de qué se
// expone y por qué (en particular, mostrarDireccion).
export interface PerfilCliente {
  id: string;
  nombre: string;
  apellido: string;
  fotoPerfilUrl: string | null;
  verificado: boolean;
  clienteDesde: string;
  telefono: string;
  mostrarDireccion: boolean;
  direccion: string | null;
  direccionVerificada: boolean;
  trabajosCompletadosConEstePrestador: number;
  trabajosCompletadosEnLaPlataforma: number;
  // Calificación del cliente por parte de prestadores (28/09) — en toda la plataforma. 0/0 si
  // todavía no lo calificó nadie (nunca null, la tarjeta siempre se muestra).
  calificacionComoClientePromedio: number;
  calificacionComoClienteCantidad: number;
  // Inasistencias del cliente (28/09) — ver comentario en el DTO del backend: cuenta en toda la
  // plataforma, no solo con este prestador, reportadas por prestadores (no necesariamente resueltas).
  inasistenciasUltimos3Meses: number;
  ultimaInasistenciaFecha: string | null;
  // "Lo que dicen otros prestadores" del mockup (28/09) — vacío si nadie comentó todavía.
  comentariosDeOtrosPrestadores: ComentarioCliente[];
  historialConEstePrestador: OrdenHistorialCliente[];
}

export interface ComentarioCliente {
  prestadorNombreCompleto: string;
  promedio: number;
  comentario: string;
  creadoEn: string;
}

export interface OrdenHistorialCliente {
  ordenId: string;
  fecha: string | null;
  categoriaNombre: string;
  descripcion: string;
  estado: string;
  inasistenciaReportada: boolean;
  // Reseña que el cliente dejó sobre este prestador para esta orden (28/09) — null si esa orden
  // todavía no fue calificada.
  resenaPromedio: number | null;
  resenaComentario: string | null;
  resenaCreadoEn: string | null;
}
