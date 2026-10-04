export interface Conversacion {
  id: string;
  clienteId: string;
  prestadorId: string;
  prestadorNombreCompleto: string;
  clienteNombreCompleto: string;
  prestadorFotoUrl: string | null;
  clienteFotoUrl: string | null;
  categoriaId: number;
  categoriaNombre: string;
  categoriaIcono: string | null;
  ultimoMensaje: string | null;
  ultimoMensajeEn: string | null;
  mensajesNoLeidos: number;
  // Aviso de "no pagues/cobres por fuera de la app" (28/09) — ya resuelto por el backend contra
  // el rol de quien lo pide, ver ConversacionService.
  avisoPagoVisto: boolean;
  // Trabajos sin comisión que le quedan al prestador (04/10). Solo viene cuando quien pide la
  // conversación es el prestador; para el cliente es null.
  trabajosGratisRestantes?: number | null;
}

export interface IniciarConversacionRequest {
  prestadorId: string;
  categoriaId: number;
}
