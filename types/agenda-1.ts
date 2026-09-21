// Espejo de fixit-web/types/agenda.ts. Por ahora solo lo que usa "Horarios" en Mi cuenta —
// OrdenAgenda/ProgramarTurnoRequest y las funciones de formato de distancia/duración se agregan
// cuando se construya la Agenda del prestador en mobile.

export interface BloqueDisponibilidad {
  id: number;
  diaSemana: number; // 0 = Domingo, 1 = Lunes, ... 6 = Sábado (igual que DayOfWeek de .NET)
  horaInicio: string; // "09:00:00"
  horaFin: string;
}

export interface AgregarBloqueRequest {
  diaSemana: number;
  horaInicio: string;
  horaFin: string;
}
