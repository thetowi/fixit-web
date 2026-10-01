export interface Mensaje {
  id: string;
  conversacionId: string;
  emisorId: string;
  emisorNombre: string;
  tipo: "Texto" | "Imagen" | "Oferta" | "Audio" | "Video" | "Turno" | "Visita";
  contenido: string | null;
  archivoUrl: string | null;
  duracionSegundos: number | null;
  montoOferta: number | null;
  descripcionOferta: string | null;
  ofertaVigente: boolean;
  ofertaExpiraEn: string | null;
  ofertaPagada: boolean;
  // Fecha en que se agendó/reprogramó el turno de la Orden de esta oferta (24/09) — ver
  // FixIt.Domain.Entities.Mensaje.OfertaAgendadaEn en el backend.
  ofertaAgendadaEn: string | null;
  // Turno agendado enviado al chat (22/09) — ver AgendaService.ProgramarTurnoAsync en el backend.
  turnoOrdenId: string | null;
  turnoFechaHora: string | null;
  turnoDuracionMinutos: number | null;
  turnoVigente: boolean;
  // Visita a domicilio para presupuestar (30/09) — paso opcional antes de la Oferta, ver
  // VisitaService.ProgramarAsync en el backend.
  visitaId: string | null;
  // Título corto puesto por el prestador al agendar (30/09, ej. "Presupuesto pintura living").
  visitaTitulo: string | null;
  visitaFechaHora: string | null;
  visitaDuracionMinutos: number | null;
  visitaVigente: boolean;
  // "Programada" | "Realizada" | "Cancelada" (30/09) — refleja el estado real de la Visita,
  // persistido en el mensaje (no depende de haber estado conectado en vivo al momento del cambio).
  visitaEstado: "Programada" | "Realizada" | "Cancelada" | null;
  enviadoEn: string;
}