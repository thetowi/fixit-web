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

export interface OrdenAgenda {
  id: string;
  categoriaNombre: string;
  clienteNombreCompleto: string;
  estado: string;
  fechaHoraProgramada: string | null;
  duracionMinutos: number | null;
}

export interface ProgramarTurnoRequest {
  fechaHora: string;
  duracionMinutos: number;
}

// Opciones de duración predefinidas para el selector del formulario de "Programar turno".
export const DURACIONES_PREDEFINIDAS_MINUTOS = [30, 60, 90, 120, 180, 240, 300, 360, 420, 480];

export function formatoDuracion(minutos: number): string {
  const horas = Math.floor(minutos / 60);
  const mins = minutos % 60;
  if (horas === 0) return `${mins} min`;
  if (mins === 0) return `${horas}h`;
  return `${horas}h ${mins}min`;
}