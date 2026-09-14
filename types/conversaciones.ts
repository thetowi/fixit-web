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
  ultimoMensaje: string | null;
  ultimoMensajeEn: string | null;
  mensajesNoLeidos: number;
}

export interface IniciarConversacionRequest {
  prestadorId: string;
  categoriaId: number;
}