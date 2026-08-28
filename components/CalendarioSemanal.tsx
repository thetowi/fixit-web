import { BloqueDisponibilidad, OrdenAgenda } from "@/types/agenda";

const HORAS = Array.from({ length: 13 }, (_, i) => 8 + i); // 8:00 a 20:00
const DIAS_CORTOS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

function horaDelString(hora: string): number {
  return Number(hora.slice(0, 2));
}

export default function CalendarioSemanal({
  inicioSemana,
  bloques,
  ordenes,
}: {
  inicioSemana: Date;
  bloques: BloqueDisponibilidad[];
  ordenes: OrdenAgenda[];
}) {
  const dias = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(inicioSemana);
    d.setDate(d.getDate() + i);
    return d;
  });

  function estaDisponible(dia: Date, hora: number): boolean {
    return bloques.some(
      (b) =>
        b.diaSemana === dia.getDay() &&
        hora >= horaDelString(b.horaInicio) &&
        hora < horaDelString(b.horaFin)
    );
  }

  function ordenEnCelda(dia: Date, hora: number): OrdenAgenda | undefined {
    return ordenes.find((o) => {
      if (!o.fechaHoraProgramada) return false;
      const fecha = new Date(o.fechaHoraProgramada);
      return fecha.toDateString() === dia.toDateString() && fecha.getHours() === hora;
    });
  }

  return (
    <div className="overflow-x-auto">
      <div className="grid grid-cols-[50px_repeat(7,minmax(90px,1fr))] min-w-[700px]">
        {/* Encabezado */}
        <div />
        {dias.map((d, i) => (
          <div key={i} className="text-center pb-2 border-b border-ink/10">
            <p className="text-xs text-ink/50">{DIAS_CORTOS[d.getDay()]}</p>
            <p className="font-mono text-sm text-ink">{d.getDate()}</p>
          </div>
        ))}

        {/* Filas de horas */}
        {HORAS.map((hora) => (
          <div key={hora} className="contents">
            <div className="text-right pr-2 py-2 text-xs text-ink/40 font-mono">
              {hora}:00
            </div>
            {dias.map((dia, i) => {
              const disponible = estaDisponible(dia, hora);
              const orden = ordenEnCelda(dia, hora);
              return (
                <div
                  key={i}
                  className={`border-t border-ink/5 min-h-[44px] p-0.5 ${
                    disponible ? "bg-stamp/5" : "bg-transparent"
                  }`}
                >
                  {orden && (
                    <div className="bg-copper text-paper text-[10px] rounded px-1.5 py-1 h-full flex flex-col justify-center leading-tight">
                      <span className="font-medium truncate">{orden.categoriaNombre}</span>
                      <span className="truncate opacity-80">{orden.clienteNombreCompleto}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <div className="flex items-center gap-4 mt-3 text-xs text-ink/50">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-stamp/5 border border-ink/10 inline-block" /> Disponible
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-copper inline-block" /> Turno agendado
        </span>
      </div>
    </div>
  );
}