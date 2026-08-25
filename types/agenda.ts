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
}